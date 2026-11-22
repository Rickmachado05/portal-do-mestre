/** Backup v2: ZIP STORED com leitura e gravação progressivas.
 * Sem compactação deliberadamente: preserva GLBs, GIFs e vídeos já compactados
 * sem exigir múltiplas cópias de até 1 GB na memória do navegador.
 * O v1 continua importável (ambos geram ZIPs STORED).
 */
import {
  BACKUP_FORMAT,
  PROFILE_KEY,
  calcularResumo,
  capturar,
  validarEstrutura,
  type BackupPreparado,
  type ManifestoBackup,
  type PerfilMestre,
  type Snapshot,
} from './backupMestre';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // ZIP32: limite da soma de arquivos, não a cota do navegador
const MAX_ITEMS = 12000;
const MAX_METADATA = 64 * 1024 * 1024;
const FALLBACK_MAX = 180 * 1024 * 1024;
const CHUNK = 1024 * 1024;
type SaveHandle = {
  createWritable: () => Promise<{
    write: (data: Uint8Array) => Promise<void>;
    close: () => Promise<void>;
    abort: () => Promise<void>;
  }>;
};
export type StatusBackup = (label: string, progress?: number) => void;
type Entry = { name: string; crc: number; size: number; offset: number; dataOffset?: number };
type ArquivoBinario = { name: string; blob: Blob };

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const safeText = (s: string) => encoder.encode(s);
const u16 = (v: DataView, p: number, n: number) => v.setUint16(p, n, true);
const u32 = (v: DataView, p: number, n: number) => v.setUint32(p, n >>> 0, true);
const r16 = (v: DataView, p: number) => v.getUint16(p, true);
const r32 = (v: DataView, p: number) => v.getUint32(p, true);
const error = (s: string): never => {
  throw Error(s);
};
let crcTable: Uint32Array | undefined;
function crc32(buf: Uint8Array, crc = 0xffffffff): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  for (const x of buf) crc = crcTable[(crc ^ x) & 255] ^ (crc >>> 8);
  return crc >>> 0;
}
const finishCrc = (v: number) => (v ^ 0xffffffff) >>> 0;

function nomeBackup(perfil: PerfilMestre) {
  const slug =
    perfil.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40) || 'mestre';
  return `portal-do-mestre-${slug}-${new Date().toISOString().slice(0, 10)}.zip`;
}
export function nomeArquivoBackup(perfil: PerfilMestre) {
  return nomeBackup(perfil);
}

async function prepararDados(
  perfil: PerfilMestre,
): Promise<{ manifesto: ManifestoBackup; metadata: Uint8Array; binarios: ArquivoBinario[] }> {
  const snapshot = await capturar();
  const manifesto: ManifestoBackup = {
    format: BACKUP_FORMAT,
    version: 2,
    exportadoEm: new Date().toISOString(),
    perfil,
    resumo: calcularResumo(snapshot),
  };
  const binarios: ArquivoBinario[] = [];
  let count = 0;
  const ancestry = new WeakSet<object>();
  async function encode(value: unknown): Promise<unknown> {
    if (value instanceof Blob) {
      const name = `files/${String(++count).padStart(6, '0')}.bin`;
      if (count > MAX_ITEMS - 2) error('O backup ultrapassa o limite de arquivos.');
      binarios.push({ name, blob: value });
      return {
        __pm_blob: name,
        mime: value.type || 'application/octet-stream',
        name: value instanceof File ? value.name : null,
      };
    }
    if (value instanceof Date) return { __pm_date: value.toISOString() };
    if (value instanceof ArrayBuffer) {
      const name = `files/${String(++count).padStart(6, '0')}.bin`;
      if (count > MAX_ITEMS - 2) error('O backup ultrapassa o limite de arquivos.');
      binarios.push({ name, blob: new Blob([value]) });
      return { __pm_buffer: name };
    }
    if (ArrayBuffer.isView(value)) {
      const name = `files/${String(++count).padStart(6, '0')}.bin`;
      if (count > MAX_ITEMS - 2) error('O backup ultrapassa o limite de arquivos.');
      const view = value as ArrayBufferView;
      binarios.push({
        name,
        blob: new Blob([
          view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer,
        ]),
      });
      return { __pm_bytes: name };
    }
    if (value && typeof value === 'object') {
      if (ancestry.has(value))
        error('Não é possível fazer backup: há uma referência circular nos dados.');
      ancestry.add(value);
      try {
        if (Array.isArray(value)) {
          const result = [];
          for (const item of value) result.push(await encode(item));
          return result;
        }
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) result[k] = await encode(v);
        return result;
      } finally {
        ancestry.delete(value);
      }
    }
    if (['function', 'symbol', 'bigint'].includes(typeof value))
      error('Existe um tipo de dado não suportado no backup.');
    return value;
  }
  const metadata = encoder.encode(JSON.stringify(await encode(snapshot)));
  if (metadata.byteLength > MAX_METADATA)
    error('Os metadados da campanha são muito grandes para um backup seguro.');
  const estimated = metadata.byteLength + binarios.reduce((n, x) => n + x.blob.size, 0);
  if (estimated > MAX_BYTES)
    error('Este backup excede 2 GB. Separe arquivos de mídia antes de exportar.');
  return { manifesto, metadata, binarios };
}

/** Escritor ZIP32 STORED: apenas partes de 1 MB em memória, CRC verificado na importação. */
class ZipStoreWriter {
  offset = 0;
  entries: Entry[] = [];
  constructor(
    private readonly sink: (bytes: Uint8Array) => Promise<void>,
    private readonly tick?: StatusBackup,
  ) {}
  async write(bytes: Uint8Array) {
    await this.sink(bytes);
    this.offset += bytes.byteLength;
    if (this.offset > 0xffffffff) error('ZIP excedeu 4 GB.');
  }
  async add(name: string, source: Blob, processed: { current: number; total: number }) {
    if (this.entries.length >= MAX_ITEMS) error('Número máximo de arquivos atingido.');
    if (source.size > 0xffffffff) error('Um dos recursos excede 4 GB.');
    const raw = safeText(name),
      head = new Uint8Array(30 + raw.byteLength),
      v = new DataView(head.buffer),
      offset = this.offset;
    u32(v, 0, 0x04034b50);
    u16(v, 4, 20);
    u16(v, 6, 0x0808);
    u16(v, 8, 0);
    u16(v, 26, raw.length);
    head.set(raw, 30);
    await this.write(head);
    let crc = 0xffffffff,
      wrote = 0;
    for (let at = 0; at < source.size; at += CHUNK) {
      const piece = new Uint8Array(
        await source.slice(at, Math.min(at + CHUNK, source.size)).arrayBuffer(),
      );
      wrote += piece.byteLength;
      crc = crc32(piece, crc);
      await this.write(piece);
      processed.current += piece.byteLength;
      if (processed.total)
        this.tick?.(
          'Gravando arquivos do backup…',
          Math.min(99, Math.round((processed.current / processed.total) * 100)),
        );
    }
    crc = finishCrc(crc);
    const dd = new Uint8Array(16),
      dv = new DataView(dd.buffer);
    u32(dv, 0, 0x08074b50);
    u32(dv, 4, crc);
    u32(dv, 8, wrote);
    u32(dv, 12, wrote);
    await this.write(dd);
    this.entries.push({ name, crc, size: wrote, offset });
  }
  async finish() {
    const centralOffset = this.offset;
    for (const entry of this.entries) {
      const raw = safeText(entry.name),
        b = new Uint8Array(46 + raw.length),
        d = new DataView(b.buffer);
      u32(d, 0, 0x02014b50);
      u16(d, 4, 20);
      u16(d, 6, 20);
      u16(d, 8, 0x0808);
      u16(d, 10, 0);
      u32(d, 16, entry.crc);
      u32(d, 20, entry.size);
      u32(d, 24, entry.size);
      u16(d, 28, raw.length);
      u32(d, 42, entry.offset);
      b.set(raw, 46);
      await this.write(b);
    }
    const size = this.offset - centralOffset;
    if (this.entries.length > 65535) error('Muitos arquivos para ZIP32.');
    const e = new Uint8Array(22),
      v = new DataView(e.buffer);
    u32(v, 0, 0x06054b50);
    u16(v, 8, this.entries.length);
    u16(v, 10, this.entries.length);
    u32(v, 12, size);
    u32(v, 16, centralOffset);
    await this.write(e);
  }
}

/** Abre o seletor antes de iniciar as operações assíncronas para preservar a ativação do clique. */
export function escolherDestinoBackup(perfil: PerfilMestre): Promise<SaveHandle | null> {
  const provider = globalThis as typeof globalThis & {
    showSaveFilePicker?: (opts: unknown) => Promise<SaveHandle>;
  };
  if (!provider.showSaveFilePicker) return Promise.resolve(null);
  return provider.showSaveFilePicker({
    suggestedName: nomeBackup(perfil),
    types: [{ description: 'Backup do Portal do Mestre', accept: { 'application/zip': ['.zip'] } }],
  });
}
export async function salvarBackupStreaming(
  perfil: PerfilMestre,
  destino: Promise<SaveHandle | null>,
  tick?: StatusBackup,
): Promise<ManifestoBackup> {
  // Aguarda a confirmação do destino antes de ler dados locais ou reservar recursos.
  const handle = await destino;
  tick?.('Lendo campanhas, fichas e bibliotecas…');
  const { metadata, binarios, manifesto } = await prepararDados(perfil);
  const manifestBytes = encoder.encode(JSON.stringify(manifesto));
  const total =
    metadata.length + manifestBytes.length + binarios.reduce((n, x) => n + x.blob.size, 0);
  let writable: Awaited<ReturnType<SaveHandle['createWritable']>> | undefined;
  const buffers: Uint8Array[] = [];
  let buffered = 0;
  try {
    if (handle) writable = await handle.createWritable();
    else if (total > FALLBACK_MAX)
      error(
        'Backup acima de 180 MB: use Chrome ou Edge atualizado para salvar diretamente no disco, sem consumir toda a memória.',
      );
    const sink = async (bytes: Uint8Array) => {
      if (writable) await writable.write(bytes);
      else {
        buffered += bytes.length;
        if (buffered > FALLBACK_MAX)
          error('Backup muito grande para o modo de download do navegador.');
        buffers.push(bytes);
      }
    };
    const progress = { current: 0, total };
    const writer = new ZipStoreWriter(sink, tick);
    await writer.add('manifest.json', new Blob([manifestBytes]), progress);
    await writer.add('snapshot.json', new Blob([metadata]), progress);
    for (const { name, blob } of binarios) await writer.add(name, blob, progress);
    await writer.finish();
    if (writable) {
      await writable.close();
      writable = undefined;
    } else {
      const archive = new Blob(buffers as BlobPart[], { type: 'application/zip' }),
        url = URL.createObjectURL(archive),
        link = document.createElement('a');
      link.href = url;
      link.download = nomeBackup(perfil);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    }
    tick?.('Backup gerado. Confira o arquivo salvo no computador.', 100);
    return manifesto;
  } catch (e) {
    if (writable) await writable.abort().catch(() => {});
    throw e;
  }
}

async function readEntryBytes(file: File, entry: Entry, limit: number): Promise<Uint8Array> {
  if (entry.size > limit || entry.dataOffset === undefined)
    error(`Arquivo ${entry.name} excede o limite de metadados.`);
  return new Uint8Array(
    await file.slice(entry.dataOffset, entry.dataOffset + entry.size).arrayBuffer(),
  );
}
function zipEntriesFromCatalog(file: File, cd: Uint8Array, count: number): Entry[] {
  const d = new DataView(cd.buffer, cd.byteOffset, cd.byteLength),
    entries: Entry[] = [];
  let pos = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (pos + 46 > cd.length || r32(d, pos) !== 0x02014b50) error('Catálogo ZIP inválido.');
    const flags = r16(d, pos + 8),
      method = r16(d, pos + 10),
      crc = r32(d, pos + 16),
      comp = r32(d, pos + 20),
      size = r32(d, pos + 24);
    const nlen = r16(d, pos + 28),
      extra = r16(d, pos + 30),
      comment = r16(d, pos + 32),
      offset = r32(d, pos + 42);
    if (method !== 0 || comp !== size || (flags & 1) !== 0)
      error('O backup contém arquivos compactados ou criptografados não suportados.');
    if (pos + 46 + nlen + extra + comment > cd.length) error('Catálogo ZIP truncado.');
    const name = decoder.decode(cd.subarray(pos + 46, pos + 46 + nlen));
    if (!/^(manifest\.json|snapshot\.json|files\/[0-9]{6}\.bin)$/.test(name) || names.has(name))
      error('Nome de arquivo inesperado ou duplicado no backup.');
    names.add(name);
    entries.push({ name, crc, size, offset });
    pos += 46 + nlen + extra + comment;
  }
  if (pos !== cd.length) error('Catálogo ZIP com dados adicionais inesperados.');
  if (entries.reduce((n, x) => n + x.size, 0) > MAX_BYTES)
    error('Conteúdo do backup maior do que 2 GB.');
  for (const e of entries)
    if (e.offset + 30 + e.size > file.size) error('Entrada ZIP fora dos limites do arquivo.');
  return entries;
}
async function indexZip(file: File): Promise<Map<string, Entry>> {
  if (file.size > MAX_BYTES + 4 * 1024 * 1024) error('Arquivo de backup excede 2 GB.');
  const endStart = Math.max(0, file.size - 65557),
    tail = new Uint8Array(await file.slice(endStart).arrayBuffer());
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let pos = -1;
  for (let i = tail.length - 22; i >= 0; i--)
    if (r32(view, i) === 0x06054b50 && i + 22 + r16(view, i + 20) === tail.length) {
      pos = i;
      break;
    }
  if (pos < 0) error('O arquivo não é um ZIP completo válido.');
  if (
    r16(view, pos + 4) !== 0 ||
    r16(view, pos + 6) !== 0 ||
    r16(view, pos + 8) !== r16(view, pos + 10)
  )
    error('ZIP em múltiplos discos não é suportado.');
  const count = r16(view, pos + 10),
    length = r32(view, pos + 12),
    start = r32(view, pos + 16);
  if (count > MAX_ITEMS || length > 8 * 1024 * 1024 || start + length > endStart + pos)
    error('Catálogo do backup inválido.');
  const central = new Uint8Array(await file.slice(start, start + length).arrayBuffer());
  const entries = zipEntriesFromCatalog(file, central, count);
  for (const e of entries) {
    const local = new Uint8Array(await file.slice(e.offset, e.offset + 30).arrayBuffer());
    if (local.length !== 30) error('Cabeçalho ZIP incompleto.');
    const d = new DataView(local.buffer);
    if (r32(d, 0) !== 0x04034b50 || r16(d, 8) !== 0) error('Entrada ZIP inválida.');
    e.dataOffset = e.offset + 30 + r16(d, 26) + r16(d, 28);
    if (e.dataOffset + e.size > start) error('Entrada ZIP invade o catálogo do arquivo.');
  }
  return new Map(entries.map((e) => [e.name, e]));
}
async function verificarEntry(file: File, e: Entry): Promise<void> {
  let state = 0xffffffff;
  for (let at = 0; at < e.size; at += CHUNK) {
    const chunk = new Uint8Array(
      await file
        .slice(e.dataOffset! + at, e.dataOffset! + Math.min(e.size, at + CHUNK))
        .arrayBuffer(),
    );
    state = crc32(chunk, state);
  }
  if (finishCrc(state) !== e.crc)
    error(`Arquivo corrompido no backup: ${e.name}. Nenhum dado foi restaurado.`);
}
/** Importação v1/v2. Não escreve dados locais antes de validar TODAS as entradas. */
export async function prepararBackupStreaming(
  file: File,
  tick?: StatusBackup,
): Promise<BackupPreparado> {
  tick?.('Inspecionando o ZIP…');
  const entries = await indexZip(file);
  const manifestoEntry = entries.get('manifest.json'),
    snapshotEntry = entries.get('snapshot.json');
  if (!manifestoEntry || !snapshotEntry)
    error('Arquivo não é um backup completo do Portal do Mestre.');
  await verificarEntry(file, manifestoEntry);
  await verificarEntry(file, snapshotEntry);
  const manifestoValue = JSON.parse(
    decoder.decode(await readEntryBytes(file, manifestoEntry, 1024 * 1024)),
  ) as unknown;
  if (
    !obj(manifestoValue) ||
    manifestoValue.format !== BACKUP_FORMAT ||
    ![1, 2].includes(Number(manifestoValue.version)) ||
    !obj(manifestoValue.perfil)
  )
    error('Versão de backup não suportada.');
  const p = manifestoValue['perfil'] as Record<string, unknown>;
  if (typeof p.nome !== 'string' || typeof p.id !== 'string' || typeof p.criadoEm !== 'string')
    error('Perfil inválido no backup.');
  const manifesto = manifestoValue as ManifestoBackup;
  const metadata = JSON.parse(
    decoder.decode(await readEntryBytes(file, snapshotEntry, MAX_METADATA)),
  ) as unknown;
  let checked = 0;
  const resources = [...entries.values()].filter((e) => e.name.startsWith('files/'));
  for (const e of resources) {
    await verificarEntry(file, e);
    checked++;
    if (checked % 5 === 0 || checked === resources.length)
      tick?.(
        'Verificando integridade dos recursos…',
        Math.round((checked / resources.length) * 100),
      );
  }
  const used = new Set<string>();
  function decode(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(decode);
    if (!obj(value)) return value;
    if (typeof value.__pm_date === 'string') return new Date(value.__pm_date);
    const path =
      typeof value.__pm_blob === 'string'
        ? value.__pm_blob
        : typeof value.__pm_buffer === 'string'
          ? value.__pm_buffer
          : typeof value.__pm_bytes === 'string'
            ? value.__pm_bytes
            : null;
    if (path) {
      const e = entries.get(path);
      if (!e || !path.startsWith('files/')) error('O backup está sem um recurso necessário.');
      used.add(path);
      const raw = file.slice(e.dataOffset!, e.dataOffset! + e.size);
      if (typeof value.__pm_blob === 'string') {
        const type = typeof value.mime === 'string' ? value.mime : 'application/octet-stream';
        return typeof value.name === 'string'
          ? new File([raw], value.name, { type })
          : new Blob([raw], { type });
      }
      if (e.size > MAX_METADATA)
        error('Há um objeto de bytes muito grande que precisa ser convertido em arquivo de mídia.');
      // ArrayBuffer/Uint8Array são geralmente configurações pequenas; nunca expanda GLBs em arrays.
      return raw
        .arrayBuffer()
        .then((b) => (typeof value.__pm_buffer === 'string' ? b : new Uint8Array(b)));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = decode(v);
    return out;
  }
  async function resolveDeep(value: unknown): Promise<unknown> {
    const awaited = await value;
    if (Array.isArray(awaited)) return Promise.all(awaited.map(resolveDeep));
    if (
      obj(awaited) &&
      !(awaited instanceof Blob) &&
      !(awaited instanceof Date) &&
      !(awaited instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(awaited)
    ) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(awaited)) result[k] = await resolveDeep(v);
      return result;
    }
    return awaited;
  }
  const snapshot = validarEstrutura(await resolveDeep(decode(metadata)));
  if (typeof snapshot.local[PROFILE_KEY] === 'string') {
    const stored = JSON.parse(snapshot.local[PROFILE_KEY]) as { id?: unknown };
    if (stored?.id !== p.id) error('Identidade do perfil não corresponde ao backup.');
  }
  const calculated = calcularResumo(snapshot);
  if (
    !obj(manifesto.resumo) ||
    Object.entries(calculated).some(
      ([k, v]) => manifesto.resumo[k as keyof typeof calculated] !== v,
    )
  )
    error('O resumo não corresponde aos dados do backup.');
  if (used.size !== resources.length) error('O backup contém recursos não referenciados.');
  tick?.('ZIP validado; pronto para restaurar.', 100);
  return { manifesto, snapshot };
}
