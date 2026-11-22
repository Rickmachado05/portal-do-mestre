/** Backup portátil do PERFIL DO MESTRE v1.3.9.
 * Salva as bibliotecas locais conhecidas, inclusive Blobs originais do IndexedDB.
 * Não cria contas de jogador, servidor ou sincronização online.
 */
import { unzipSync, zipSync } from 'fflate';

export const PROFILE_KEY = 'portal-mestre-perfil-v1';
export const BACKUP_FORMAT = 'portal-do-mestre/backup-completo' as const;
const VERSION = 1;
const MAX_BYTES = 420 * 1024 * 1024;
const MAX_ENTRIES = 12000;
const MAX_ITEMS = 50000;
const STORES = [
  { name: 'hexatombe-mesa-arquivos', version: 1, stores: [{ name: 'arquivos', keyPath: null }] },
  {
    name: 'hexatombe-avatar-dados',
    version: 2,
    stores: [
      { name: 'packs', keyPath: 'id' },
      { name: 'collections', keyPath: 'id' },
    ],
  },
  { name: 'hexatombe-fichas-v1', version: 1, stores: [{ name: 'fichas', keyPath: 'id' }] },
  {
    name: 'portal-mestre-rascunhos-fichas-v1',
    version: 1,
    stores: [{ name: 'rascunhos', keyPath: 'chave' }],
  },
] as const;

export type PerfilMestre = { id: string; nome: string; criadoEm: string };
export type Item = { key: string | number; value: unknown };
export type Dump = { name: string; stores: Record<string, Item[]> };
export type Snapshot = { local: Record<string, string>; databases: Dump[] };
export type ResumoBackup = {
  campanhas: number;
  fichas: number;
  dados: number;
  colecoes: number;
  arquivos: number;
  cadernos: number;
};
export type ManifestoBackup = {
  format: typeof BACKUP_FORMAT;
  version: 1 | 2;
  exportadoEm: string;
  perfil: PerfilMestre;
  resumo: ResumoBackup;
};
export type BackupPreparado = {
  manifesto: ManifestoBackup;
  snapshot: Snapshot;
  files?: Record<string, Uint8Array>;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const tracked = (key: string) => /^(hexatombe-|portal-mestre-|rpg-painel-mestre-)/.test(key);
function fail(message: string): never {
  throw new Error(message);
}
function makeId() {
  return crypto.randomUUID?.() || `mestre-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function lerPerfilMestre(): PerfilMestre {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') as unknown;
    if (
      isObject(raw) &&
      typeof raw.id === 'string' &&
      raw.id.length < 100 &&
      typeof raw.nome === 'string' &&
      typeof raw.criadoEm === 'string'
    )
      return { id: raw.id, nome: raw.nome.slice(0, 70), criadoEm: raw.criadoEm };
  } catch {
    /* perfil ainda não criado */
  }
  const perfil = { id: makeId(), nome: 'Meu perfil de mestre', criadoEm: new Date().toISOString() };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(perfil));
  return perfil;
}
export function renomearPerfilMestre(nome: string): PerfilMestre {
  const trimmed = nome.trim().slice(0, 70);
  if (!trimmed) fail('Informe um nome para o perfil.');
  const perfil = { ...lerPerfilMestre(), nome: trimmed };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(perfil));
  return perfil;
}
function openDb(spec: (typeof STORES)[number]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(spec.name, spec.version);
    req.onupgradeneeded = () => {
      for (const s of spec.stores)
        if (!req.result.objectStoreNames.contains(s.name)) {
          if (s.keyPath) req.result.createObjectStore(s.name, { keyPath: s.keyPath });
          else req.result.createObjectStore(s.name);
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || Error(`Não foi possível acessar ${spec.name}.`));
    req.onblocked = () =>
      reject(Error(`Feche outras abas do Portal do Mestre para acessar ${spec.name}.`));
  });
}
function getRows(db: IDBDatabase, storeName: string): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const rows: Item[] = [];
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (typeof cursor.key !== 'string' && typeof cursor.key !== 'number') {
        try {
          tx.abort();
        } catch {
          /* encerrada */
        }
        reject(Error(`Chave não suportada em ${storeName}.`));
        return;
      }
      rows.push({ key: cursor.key, value: cursor.value as unknown });
      if (rows.length > MAX_ITEMS) {
        tx.abort();
        reject(Error(`Muitos registros em ${storeName}.`));
        return;
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve(rows);
    tx.onerror = () => reject(tx.error || Error(`Falha ao ler ${storeName}.`));
    tx.onabort = () => reject(tx.error || Error(`Leitura interrompida em ${storeName}.`));
  });
}
export async function capturar(): Promise<Snapshot> {
  const local: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && tracked(key)) local[key] = localStorage.getItem(key) || '';
  }
  const databases: Dump[] = [];
  for (const spec of STORES) {
    const db = await openDb(spec);
    try {
      const stores: Record<string, Item[]> = {};
      for (const store of spec.stores) stores[store.name] = await getRows(db, store.name);
      databases.push({ name: spec.name, stores });
    } finally {
      db.close();
    }
  }
  return { local, databases };
}
export function calcularResumo(snapshot: Snapshot): ResumoBackup {
  let campanhas = 0;
  try {
    const registro = JSON.parse(snapshot.local['hexatombe-campanhas-v1'] || '{}') as {
      items?: unknown[];
    };
    campanhas = Array.isArray(registro.items) ? registro.items.length : 0;
  } catch {
    /* backup ainda possível */
  }
  const db = (name: string, store: string) =>
    snapshot.databases.find((d) => d.name === name)?.stores[store]?.length || 0;
  return {
    campanhas,
    fichas: db('hexatombe-fichas-v1', 'fichas'),
    dados: db('hexatombe-avatar-dados', 'packs'),
    colecoes: db('hexatombe-avatar-dados', 'collections'),
    arquivos: db('hexatombe-mesa-arquivos', 'arquivos'),
    cadernos: Object.keys(snapshot.local).filter((k) =>
      k.startsWith('rpg-painel-mestre-caderno-v2:'),
    ).length,
  };
}
function assertCap(bytes: number) {
  if (bytes > MAX_BYTES)
    fail(
      'Os dados excedem o limite de 420 MB por backup. Divida os recursos locais antes de exportar.',
    );
}
async function serializar(snapshot: Snapshot): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
  let contador = 0,
    total = 0;
  const ancestry = new WeakSet<object>();
  async function encode(value: unknown): Promise<unknown> {
    if (value instanceof Blob) {
      const path = `files/${String(++contador).padStart(6, '0')}.bin`;
      if (contador > MAX_ENTRIES) fail('Número de anexos excede o limite do backup.');
      const binary = new Uint8Array(await value.arrayBuffer());
      total += binary.length;
      assertCap(total);
      files[path] = binary;
      return {
        __pm_blob: path,
        mime: value.type || 'application/octet-stream',
        name: value instanceof File ? value.name : null,
      };
    }
    if (value instanceof Date) return { __pm_date: value.toISOString() };
    if (value instanceof ArrayBuffer) {
      const path = `files/${String(++contador).padStart(6, '0')}.bin`;
      const binary = new Uint8Array(value);
      total += binary.length;
      assertCap(total);
      files[path] = binary;
      return { __pm_buffer: path };
    }
    if (value instanceof Uint8Array) {
      const path = `files/${String(++contador).padStart(6, '0')}.bin`;
      const binary = new Uint8Array(value);
      total += binary.length;
      assertCap(total);
      files[path] = binary;
      return { __pm_bytes: path };
    }
    if (value && typeof value === 'object') {
      if (ancestry.has(value)) fail('Os dados contêm referência circular não exportável.');
      ancestry.add(value);
      try {
        if (Array.isArray(value)) return await Promise.all(value.map((x) => encode(x)));
        const out: Record<string, unknown> = {};
        for (const [key, v] of Object.entries(value)) out[key] = await encode(v);
        return out;
      } finally {
        ancestry.delete(value);
      }
    }
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      fail('Tipo de dado não exportável.');
    return value;
  }
  const encoded = await encode(snapshot);
  const json = encoder.encode(JSON.stringify(encoded));
  total += json.length;
  assertCap(total);
  files['snapshot.json'] = json;
  return files;
}
function conferirResumo(v: unknown): v is ResumoBackup {
  if (!isObject(v)) return false;
  return ['campanhas', 'fichas', 'dados', 'colecoes', 'arquivos', 'cadernos'].every(
    (k) => Number.isSafeInteger(v[k]) && (v[k] as number) >= 0,
  );
}
export function validarEstrutura(value: unknown): Snapshot {
  if (!isObject(value) || !isObject(value.local) || !Array.isArray(value.databases))
    fail('Estrutura de dados incompatível.');
  const local: Record<string, string> = {};
  for (const [key, val] of Object.entries(value.local)) {
    if (!tracked(key) || typeof val !== 'string')
      fail('Chave de armazenamento não reconhecida no backup.');
    local[key] = val;
  }
  const databases: Dump[] = [];
  if (value.databases.length !== STORES.length)
    fail('Backup incompleto: bibliotecas de dados ausentes.');
  for (const spec of STORES) {
    const item = value.databases.find((d: unknown) => isObject(d) && d.name === spec.name);
    if (
      !isObject(item) ||
      !isObject(item.stores) ||
      Object.keys(item.stores).length !== spec.stores.length
    )
      fail(`Biblioteca inválida: ${spec.name}.`);
    const stores: Record<string, Item[]> = {};
    for (const store of spec.stores) {
      const rows = item.stores[store.name];
      if (!Array.isArray(rows) || rows.length > MAX_ITEMS)
        fail(`Registros inválidos em ${spec.name}/${store.name}.`);
      stores[store.name] = rows.map((r: unknown) => {
        if (
          !isObject(r) ||
          (typeof r.key !== 'string' && typeof r.key !== 'number') ||
          !('value' in r)
        )
          fail('Registro inválido no backup.');
        return { key: r.key, value: r.value };
      });
    }
    databases.push({ name: spec.name, stores });
  }
  return { local, databases };
}
async function desserializar(raw: unknown, files: Record<string, Uint8Array>): Promise<Snapshot> {
  async function decode(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) return Promise.all(value.map((x) => decode(x)));
    if (!isObject(value)) return value;
    if (typeof value.__pm_blob === 'string') {
      const bytes = files[value.__pm_blob];
      if (!bytes) fail('O backup está sem um arquivo de recurso.');
      const blob = new Blob([new Uint8Array(bytes)], {
        type: typeof value.mime === 'string' ? value.mime : '',
      });
      return typeof value.name === 'string'
        ? new File([blob], value.name, { type: blob.type })
        : blob;
    }
    if (typeof value.__pm_date === 'string') return new Date(value.__pm_date);
    if (typeof value.__pm_bytes === 'string') {
      const bytes = files[value.__pm_bytes];
      if (!bytes) fail('Recurso de dados ausente.');
      return new Uint8Array(bytes);
    }
    if (typeof value.__pm_buffer === 'string') {
      const bytes = files[value.__pm_buffer];
      if (!bytes) fail('Recurso binário ausente.');
      return new Uint8Array(bytes).buffer;
    }
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = await decode(v);
    return out;
  }
  return validarEstrutura(await decode(raw));
}
/** Faz uma checagem do catálogo ZIP ANTES de inflar arquivos importados (protege contra ZIPs-bomba). */
function validarZipBytes(bytes: Uint8Array): void {
  if (bytes.length > MAX_BYTES) fail('Arquivo de backup muito grande.');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail('ZIP inválido.');
  const n = dv.getUint16(eocd + 10, true),
    offset = dv.getUint32(eocd + 16, true),
    size = dv.getUint32(eocd + 12, true);
  if (n > MAX_ENTRIES || offset + size > eocd) fail('Catálogo ZIP inválido ou muito grande.');
  let pos = offset,
    sum = 0;
  for (let i = 0; i < n; i++) {
    if (pos + 46 > bytes.length || dv.getUint32(pos, true) !== 0x02014b50)
      fail('Arquivo ZIP inconsistente.');
    const method = dv.getUint16(pos + 10, true),
      csize = dv.getUint32(pos + 20, true),
      usize = dv.getUint32(pos + 24, true);
    if (method !== 0 || csize !== usize)
      fail('O Portal aceita apenas o ZIP de backup sem compressão gerado por ele.');
    sum += usize;
    assertCap(sum);
    pos +=
      46 +
      dv.getUint16(pos + 28, true) +
      dv.getUint16(pos + 30, true) +
      dv.getUint16(pos + 32, true);
  }
  if (pos !== offset + size) fail('Catálogo ZIP incompleto.');
}
export async function gerarBackupCompleto(
  perfil: PerfilMestre,
): Promise<{ arquivo: Blob; manifesto: ManifestoBackup }> {
  const snapshot = await capturar();
  const manifesto: ManifestoBackup = {
    format: BACKUP_FORMAT,
    version: VERSION,
    exportadoEm: new Date().toISOString(),
    perfil,
    resumo: calcularResumo(snapshot),
  };
  const files = await serializar(snapshot);
  files['manifest.json'] = encoder.encode(JSON.stringify(manifesto));
  // A opção level:0 evita congelamentos e produz um ZIP compatível com Windows.
  const zip = zipSync(files, { level: 0 });
  assertCap(zip.length);
  return { arquivo: new Blob([new Uint8Array(zip)], { type: 'application/zip' }), manifesto };
}
export function baixarArquivoBackup(blob: Blob, perfil: PerfilMestre) {
  const date = new Date().toISOString().slice(0, 10);
  const clean =
    perfil.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40) || 'mestre';
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = `portal-do-mestre-${clean}-${date}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function prepararBackup(file: File): Promise<BackupPreparado> {
  if (file.size > MAX_BYTES) fail('Backup muito grande (limite: 420 MB).');
  const bytes = new Uint8Array(await file.arrayBuffer());
  validarZipBytes(bytes);
  const files = unzipSync(bytes);
  if (!files['manifest.json'] || !files['snapshot.json'])
    fail('Arquivo não é um backup completo do Portal do Mestre.');
  const manifesto = JSON.parse(decoder.decode(files['manifest.json'])) as unknown;
  if (
    !isObject(manifesto) ||
    manifesto.format !== BACKUP_FORMAT ||
    manifesto.version !== VERSION ||
    !isObject(manifesto.perfil) ||
    !conferirResumo(manifesto.resumo)
  )
    fail('Formato ou versão de backup incompatível.');
  const p = manifesto.perfil;
  if (typeof p.nome !== 'string' || typeof p.id !== 'string' || typeof p.criadoEm !== 'string')
    fail('Perfil do arquivo inválido.');
  const snapshot = await desserializar(
    JSON.parse(decoder.decode(files['snapshot.json'])) as unknown,
    files,
  );
  const perfil: PerfilMestre = { id: p.id, nome: p.nome, criadoEm: p.criadoEm };
  if (snapshot.local[PROFILE_KEY]) {
    const stored = JSON.parse(snapshot.local[PROFILE_KEY]) as PerfilMestre;
    if (stored.id !== perfil.id) fail('Identidade do perfil não corresponde ao backup.');
  }
  const actual = calcularResumo(snapshot);
  for (const k of Object.keys(actual) as (keyof ResumoBackup)[])
    if (actual[k] !== manifesto.resumo[k]) fail('O resumo não corresponde ao conteúdo do backup.');
  return {
    manifesto: {
      format: BACKUP_FORMAT,
      version: 1,
      exportadoEm: String(manifesto.exportadoEm || ''),
      perfil,
      resumo: actual,
    },
    snapshot,
    files,
  };
}
async function escreverDb(spec: (typeof STORES)[number], data: Dump): Promise<void> {
  const db = await openDb(spec);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        spec.stores.map((s) => s.name),
        'readwrite',
      );
      for (const store of spec.stores) {
        const target = tx.objectStore(store.name);
        target.clear();
        for (const row of data.stores[store.name]) {
          if (store.keyPath) {
            if (!isObject(row.value) || row.value[store.keyPath] !== row.key) {
              try {
                tx.abort();
              } catch {
                /* tx encerrada */
              }
              reject(Error(`Registro sem chave válida em ${spec.name}.`));
              return;
            }
            target.put(row.value);
          } else target.put(row.value, row.key);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || Error(`Não foi possível restaurar ${spec.name}.`));
      tx.onabort = () => reject(tx.error || Error(`Transação cancelada em ${spec.name}.`));
    });
  } finally {
    db.close();
  }
}
function escreverLocal(local: Record<string, string>): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && tracked(key)) keys.push(key);
  }
  for (const key of keys) if (!(key in local)) localStorage.removeItem(key);
  for (const [key, v] of Object.entries(local)) localStorage.setItem(key, v);
}
async function aplicar(snapshot: Snapshot): Promise<void> {
  for (const spec of STORES) {
    const dump = snapshot.databases.find((x) => x.name === spec.name);
    if (!dump) fail(`Dados ausentes para ${spec.name}.`);
    await escreverDb(spec, dump);
  }
  escreverLocal(snapshot.local);
}
export async function restaurarBackup(prepared: BackupPreparado): Promise<void> {
  // Novo snapshot antes da mudança: usado para tentativa de rollback em caso de falha.
  const original = await capturar();
  try {
    await aplicar(prepared.snapshot);
  } catch (error) {
    try {
      await aplicar(original);
    } catch (e) {
      throw Error(
        `Restauração incompleta e falha ao reverter os dados: ${String(e)}. Guarde o backup original e não continue usando o portal até recuperar os dados.`,
      );
    }
    throw Error(
      `A restauração foi cancelada e os dados anteriores foram recuperados: ${String(error)}`,
    );
  }
}
