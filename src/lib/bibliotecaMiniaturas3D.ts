/** Biblioteca local de GLBs. Metadados no localStorage, bytes no IndexedDB (incluídos no backup). */
import { carregarArquivo, excluirArquivo, salvarArquivo } from './storage';

export const CHAVE_BIBLIOTECA_MINIATURAS = 'portal-mestre-biblioteca-miniaturas3d-v1';
export const LIMITE_GLB_BYTES = 50 * 1024 * 1024;
export const LIMITE_GLB_AVANCADO_BYTES = 100 * 1024 * 1024;
export const LIMITE_BIBLIOTECA = 60;
/** Limite lógico; a cota efetiva do IndexedDB depende do navegador e do espaço livre. */
export const LIMITE_TOTAL_BIBLIOTECA_BYTES = 1024 * 1024 * 1024;
/** Proteção contra modelos capazes de travar a renderização. Acima de 150 mil há aviso, não bloqueio. */
export const LIMITE_TRIANGULOS_GLB = 1_000_000;
export type PesoMiniatura3D = 'leve' | 'moderado' | 'pesado';
export type TexturaMiniatura3D = {
  formato: string;
  largura?: number;
  altura?: number;
  bytes: number;
};
export type AnaliseMiniatura3D = {
  bytes: number;
  triangulos: number;
  malhas: number;
  texturas: number;
  resolucoesTexturas: TexturaMiniatura3D[];
  animacoes: number;
  nomesAnimacoes: string[];
  classificacao: PesoMiniatura3D;
  avisos: string[];
};
export type Miniatura3DRegistro = {
  id: string;
  nome: string;
  bytes: number;
  importadoEm: string;
  triangulos: number;
  sha256?: string;
  malhas?: number;
  texturas?: number;
  resolucoesTexturas?: TexturaMiniatura3D[];
  animacoes?: number;
  nomesAnimacoes?: string[];
  classificacao?: PesoMiniatura3D;
  avisos?: string[];
};
export const chaveModelo3D = (id: string) => `portal-mestre-miniatura3d:${id}`;
const modeloIdValido = (id: unknown): id is string =>
  typeof id === 'string' && /^mini-[a-z0-9-]{6,90}$/i.test(id);
export const formatarMB = (bytes: number) =>
  (bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';

export function listarMiniaturas3D(): Miniatura3DRegistro[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAVE_BIBLIOTECA_MINIATURAS) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((v): v is Miniatura3DRegistro =>
        Boolean(
          v &&
          typeof v === 'object' &&
          modeloIdValido((v as Miniatura3DRegistro).id) &&
          typeof (v as Miniatura3DRegistro).nome === 'string' &&
          typeof (v as Miniatura3DRegistro).bytes === 'number',
        ),
      )
      .slice(0, LIMITE_BIBLIOTECA)
      .map((v) => ({ ...v, nome: v.nome.slice(0, 70) }));
  } catch {
    return [];
  }
}

/** Lê apenas o cabeçalho de uma textura incorporada; não decodifica a imagem inteira. */
function dimensoesImagem(
  buffer: ArrayBuffer,
  formato: string,
): { largura?: number; altura?: number } {
  const v = new DataView(buffer),
    n = v.byteLength;
  if (n < 16) return {};
  // PNG: largura e altura no IHDR.
  if (n >= 24 && v.getUint32(0) === 0x89504e47 && v.getUint32(4) === 0x0d0a1a0a)
    return { largura: v.getUint32(16), altura: v.getUint32(20) };
  // JPEG: varrer os marcadores SOF, sem realizar decodificação de pixels.
  if (v.getUint16(0) === 0xffd8) {
    let p = 2;
    while (p + 4 < n) {
      if (v.getUint8(p) !== 0xff) {
        p++;
        continue;
      }
      while (p < n && v.getUint8(p) === 0xff) p++;
      if (p >= n) break;
      const marcador = v.getUint8(p++);
      if (marcador === 0xd9 || marcador === 0xda) break;
      if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) continue;
      if (p + 2 > n) break;
      const comprimento = v.getUint16(p);
      if (comprimento < 2 || p + comprimento > n) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marcador,
        ) &&
        comprimento >= 7
      )
        return { largura: v.getUint16(p + 5), altura: v.getUint16(p + 3) };
      p += comprimento;
    }
  }
  // WEBP: variantes VP8X, VP8L e VP8.
  if (n >= 30 && v.getUint32(0) === 0x52494646 && v.getUint32(8) === 0x57454250) {
    const tag = v.getUint32(12);
    if (tag === 0x56503858)
      return {
        largura: 1 + v.getUint8(24) + (v.getUint8(25) << 8) + (v.getUint8(26) << 16),
        altura: 1 + v.getUint8(27) + (v.getUint8(28) << 8) + (v.getUint8(29) << 16),
      };
    if (tag === 0x5650384c && n >= 25)
      return {
        largura: 1 + (((v.getUint8(22) & 0x3f) << 8) | v.getUint8(21)),
        altura: 1 + ((v.getUint8(24) & 0x0f) << 10) + (v.getUint8(23) << 2) + (v.getUint8(22) >> 6),
      };
    if (tag === 0x56503820 && n >= 30)
      return { largura: v.getUint16(26, true) & 0x3fff, altura: v.getUint16(28, true) & 0x3fff };
  }
  // KTX2 (pode exigir configuração extra do renderizador para ser exibido).
  if (formato.includes('ktx2') && n >= 28 && v.getUint32(0) === 0xab4b5458)
    return { largura: v.getUint32(20, true), altura: v.getUint32(24, true) };
  return {};
}

export type OpcoesImportacaoGLB = { modoAvancado?: boolean };
/** Validação/inspeção sem carregar o GLB inteiro na memória nem executar animações. */
export async function validarMiniaturaGLB(
  blob: Blob,
  { modoAvancado = false }: OpcoesImportacaoGLB = {},
): Promise<AnaliseMiniatura3D> {
  const limite = modoAvancado ? LIMITE_GLB_AVANCADO_BYTES : LIMITE_GLB_BYTES;
  if (blob.size < 32) throw Error('Arquivo GLB 2.0 inválido.');
  if (blob.size > limite)
    throw Error(
      `O GLB deve ter até ${modoAvancado ? 100 : 50} MB${modoAvancado ? ' (modo avançado)' : ' (ative o modo avançado para até 100 MB)'}.`,
    );
  const header = await blob.slice(0, 20).arrayBuffer();
  const dv = new DataView(header);
  if (
    dv.getUint32(0, true) !== 0x46546c67 ||
    dv.getUint32(4, true) !== 2 ||
    dv.getUint32(8, true) !== blob.size
  )
    throw Error('Arquivo GLB 2.0 inválido.');
  const tamanhoJSON = dv.getUint32(12, true);
  if (
    dv.getUint32(16, true) !== 0x4e4f534a ||
    tamanhoJSON < 2 ||
    tamanhoJSON > 8_000_000 ||
    20 + tamanhoJSON > blob.size
  )
    throw Error('Bloco JSON do GLB inválido.');
  let gltf: Record<string, unknown>;
  try {
    gltf = JSON.parse(
      new TextDecoder('utf-8', { fatal: true })
        .decode(await blob.slice(20, 20 + tamanhoJSON).arrayBuffer())
        .trim(),
    ) as Record<string, unknown>;
  } catch {
    throw Error('Estrutura JSON do GLB inválida.');
  }
  if (!Array.isArray(gltf.meshes) || !gltf.meshes.length || !Array.isArray(gltf.nodes))
    throw Error('O modelo precisa conter uma malha 3D.');
  const buffers = Array.isArray(gltf.buffers) ? (gltf.buffers as Record<string, unknown>[]) : [];
  if (buffers.some((b) => typeof b.uri === 'string'))
    throw Error('Use GLB com texturas e geometria incorporadas, sem arquivos externos.');
  const images = Array.isArray(gltf.images) ? (gltf.images as Record<string, unknown>[]) : [];
  if (images.some((i) => typeof i.uri === 'string'))
    throw Error('Imagens externas não são permitidas. Incorpore as texturas no GLB.');
  const used = Array.isArray(gltf.extensionsUsed) ? gltf.extensionsUsed : [];
  if (used.includes('KHR_draco_mesh_compression') || used.includes('EXT_meshopt_compression'))
    throw Error('Este GLB usa compressão que exige um decodificador externo. Exporte GLB padrão.');
  const acessores = Array.isArray(gltf.accessors) ? (gltf.accessors as { count?: number }[]) : [];
  let triangulos = 0;
  for (const malha of gltf.meshes as {
    primitives?: { indices?: number; attributes?: Record<string, number>; mode?: number }[];
  }[])
    for (const prim of malha.primitives || []) {
      if (prim.mode !== undefined && prim.mode !== 4) continue;
      const indices =
        typeof prim.indices === 'number'
          ? acessores[prim.indices]?.count
          : acessores[prim.attributes?.POSITION ?? -1]?.count;
      const quantidade = Math.floor(Math.max(0, Number(indices) || 0) / 3);
      triangulos += quantidade;
    }
  if (!triangulos) throw Error('O GLB não possui triângulos renderizáveis.');
  if (triangulos > LIMITE_TRIANGULOS_GLB)
    throw Error(
      'Modelo com mais de 1 milhão de triângulos. Reduza a geometria para proteger o desempenho.',
    );
  const views = Array.isArray(gltf.bufferViews)
    ? (gltf.bufferViews as { buffer?: number; byteOffset?: number; byteLength?: number }[])
    : [];
  const binHeaderPos = 20 + tamanhoJSON;
  let binInicio = 0,
    binBytes = 0;
  if (binHeaderPos + 8 <= blob.size) {
    const binHeader = new DataView(await blob.slice(binHeaderPos, binHeaderPos + 8).arrayBuffer());
    if (binHeader.getUint32(4, true) === 0x004e4942) {
      binInicio = binHeaderPos + 8;
      binBytes = binHeader.getUint32(0, true);
    }
  }
  const texturas: TexturaMiniatura3D[] = [];
  for (const imagem of images) {
    const formato = typeof imagem.mimeType === 'string' ? imagem.mimeType : 'desconhecido';
    const indice = typeof imagem.bufferView === 'number' ? imagem.bufferView : -1;
    const view = views[indice];
    const bytes = Number(view?.byteLength) || 0;
    if (
      !view ||
      view.buffer !== 0 ||
      !Number.isSafeInteger(bytes) ||
      bytes <= 0 ||
      !Number.isSafeInteger(view.byteOffset ?? 0) ||
      (view.byteOffset ?? 0) < 0 ||
      !binInicio ||
      (view.byteOffset ?? 0) + bytes > binBytes ||
      binInicio + (view.byteOffset ?? 0) + bytes > blob.size
    )
      throw Error('Textura incorporada ao GLB possui dados inválidos.');
    const inicio = binInicio + (view.byteOffset ?? 0);
    const tamanho = Math.min(bytes, 256 * 1024);
    const cabecalho = await blob.slice(inicio, inicio + tamanho).arrayBuffer();
    texturas.push({ formato, bytes, ...dimensoesImagem(cabecalho, formato) });
  }
  const nomesAnimacoes = Array.isArray(gltf.animations)
    ? (gltf.animations as Record<string, unknown>[])
        .slice(0, 128)
        .map((clip, i) =>
          typeof clip?.name === 'string' && clip.name.trim()
            ? clip.name.trim().slice(0, 90)
            : `Animação ${i + 1}`,
        )
    : [];
  const animacoes = nomesAnimacoes.length;
  const maiorDim = Math.max(0, ...texturas.map((t) => Math.max(t.largura ?? 0, t.altura ?? 0)));
  const classificacao: PesoMiniatura3D =
    triangulos <= 50_000 &&
    texturas.length <= 4 &&
    maiorDim <= 2048 &&
    blob.size <= 25 * 1024 * 1024
      ? 'leve'
      : triangulos <= 200_000 &&
          texturas.length <= 8 &&
          maiorDim <= 4096 &&
          blob.size <= 50 * 1024 * 1024
        ? 'moderado'
        : 'pesado';
  const avisos: string[] = [];
  if (blob.size > 25 * 1024 * 1024)
    avisos.push('Arquivo acima de 25 MB: carregamento e backup podem demorar.');
  if (triangulos > 150_000)
    avisos.push(
      'Geometria acima de 150 mil triângulos: avalie reduzir a malha para várias miniaturas em cena.',
    );
  if (texturas.length > 8)
    avisos.push('Muitas texturas: o consumo de memória gráfica pode ser elevado.');
  if (maiorDim > 4096) avisos.push('Textura acima de 4096 px: verifique o uso de VRAM.');
  if (texturas.some((t) => t.largura === undefined || t.altura === undefined))
    avisos.push('Não foi possível determinar a resolução de todas as texturas.');
  if (used.includes('KHR_texture_basisu'))
    avisos.push('Texturas KTX2 podem exigir um decodificador não configurado nesta versão.');
  if (animacoes > 0)
    avisos.push(
      `${animacoes} animação(ões) incorporada(s): idle opcional disponível na Mesa 3D. Reproduza apenas clipes apropriados.`,
    );
  return {
    bytes: blob.size,
    triangulos,
    malhas: gltf.meshes.length,
    texturas: texturas.length,
    resolucoesTexturas: texturas,
    animacoes,
    nomesAnimacoes,
    classificacao,
    avisos,
  };
}

export async function importarMiniatura3D(
  arquivo: File,
  opcoes: OpcoesImportacaoGLB = {},
): Promise<Miniatura3DRegistro> {
  if (!arquivo.name.toLowerCase().endsWith('.glb')) throw Error('Selecione um modelo GLB.');
  const analise = await validarMiniaturaGLB(arquivo, opcoes);
  const atuais = listarMiniaturas3D();
  // Arquivos idênticos dividem os mesmos bytes em IndexedDB, inclusive em backups.
  let sha256: string | undefined;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer()));
    sha256 = Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
    const existente = atuais.find((m) => m.sha256 === sha256);
    if (existente) return existente;
  }
  if (atuais.length >= LIMITE_BIBLIOTECA) throw Error('A biblioteca atingiu 60 modelos.');
  const ocupacao = atuais.reduce((total, m) => total + m.bytes, 0);
  if (ocupacao + arquivo.size > LIMITE_TOTAL_BIBLIOTECA_BYTES)
    throw Error(
      'A biblioteca atingiu 1 GB. Remova modelos não utilizados antes de importar outros.',
    );
  const id = `mini-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const {
    bytes,
    triangulos,
    malhas,
    texturas,
    resolucoesTexturas,
    animacoes,
    nomesAnimacoes,
    classificacao,
    avisos,
  } = analise;
  const registro: Miniatura3DRegistro = {
    id,
    nome: arquivo.name.replace(/\.glb$/i, '').slice(0, 70) || 'Miniatura',
    bytes,
    importadoEm: new Date().toISOString(),
    triangulos,
    malhas,
    texturas,
    resolucoesTexturas,
    animacoes,
    nomesAnimacoes,
    classificacao,
    avisos,
    ...(sha256 ? { sha256 } : {}),
  };
  try {
    await salvarArquivo(chaveModelo3D(id), new Blob([arquivo], { type: 'model/gltf-binary' }));
  } catch {
    throw Error(
      'Sem espaço para salvar o GLB. O limite de 1 GB depende da cota real de armazenamento do navegador. Faça backup ou libere espaço.',
    );
  }
  try {
    localStorage.setItem(CHAVE_BIBLIOTECA_MINIATURAS, JSON.stringify([...atuais, registro]));
  } catch {
    await excluirArquivo(chaveModelo3D(id)).catch(() => {});
    throw Error('Não foi possível salvar a biblioteca. Verifique o armazenamento do navegador.');
  }
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('portal-miniaturas-biblioteca-alterada'));
  return registro;
}

/** A biblioteca e os arquivos pertencem ao perfil, não à campanha aberta.
 * Nunca excluir um GLB enquanto uma cena, inclusive arquivada, ainda o referencia. */
export type ReferenciaModelo3D = { campanhaId: string; cenaId: string };
export function localizarUsoMiniatura3D(
  id: string,
  storage: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage,
): ReferenciaModelo3D[] {
  if (!modeloIdValido(id)) return [];
  const prefixo = 'portal-mestre-cenario3d-v1:';
  const encontrados: ReferenciaModelo3D[] = [];
  for (let i = 0; i < storage.length; i++) {
    const chave = storage.key(i);
    if (!chave?.startsWith(prefixo)) continue;
    const valor = storage.getItem(chave);
    if (!valor || !valor.includes(id)) continue;
    let cena: { miniaturas?: { modeloId?: string }[] };
    try {
      cena = JSON.parse(valor) as typeof cena;
    } catch {
      throw Error(
        'Existe uma cena 3D com dados ilegíveis. Faça um backup e revise a cena antes de excluir modelos.',
      );
    }
    if (!Array.isArray(cena?.miniaturas) || !cena.miniaturas.some((m) => m?.modeloId === id))
      continue;
    const resto = chave.slice(prefixo.length),
      separador = resto.indexOf(':');
    if (separador < 1)
      throw Error(
        'Referência de cena 3D não identificada. A exclusão foi bloqueada por segurança.',
      );
    encontrados.push({ campanhaId: resto.slice(0, separador), cenaId: resto.slice(separador + 1) });
  }
  return encontrados;
}

/** Planeja exclusões em lote sem permitir apagar GLBs ainda referenciados por cenas. */
export function classificarModelosParaExclusao3D(ids: readonly string[]): {
  livres: string[];
  protegidos: string[];
} {
  const existentes = new Set(listarMiniaturas3D().map((m) => m.id));
  const livres: string[] = [],
    protegidos: string[] = [];
  for (const id of new Set(ids)) {
    if (!existentes.has(id)) continue;
    if (localizarUsoMiniatura3D(id).length) protegidos.push(id);
    else livres.push(id);
  }
  return { livres, protegidos };
}

export function renomearMiniaturaDaBiblioteca3D(id: string, novoNome: string): void {
  if (!modeloIdValido(id)) throw Error('Modelo inválido.');
  const nome = novoNome.trim().slice(0, 70);
  if (!nome) throw Error('Informe um nome para o modelo.');
  const atuais = listarMiniaturas3D();
  if (!atuais.some((m) => m.id === id)) throw Error('Modelo não encontrado.');
  localStorage.setItem(
    CHAVE_BIBLIOTECA_MINIATURAS,
    JSON.stringify(atuais.map((m) => (m.id === id ? { ...m, nome } : m))),
  );
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('portal-miniaturas-biblioteca-alterada'));
}

export async function excluirMiniaturaDaBiblioteca3D(id: string): Promise<void> {
  if (!modeloIdValido(id)) throw Error('Modelo inválido.');
  const atuais = listarMiniaturas3D();
  if (!atuais.some((m) => m.id === id)) throw Error('Modelo não encontrado na biblioteca.');
  const usos = localizarUsoMiniatura3D(id);
  if (usos.length)
    throw Error(
      `O modelo está em ${usos.length} cena(s). Remova as miniaturas dessas cenas antes de excluir o arquivo da biblioteca.`,
    );
  const anterior = localStorage.getItem(CHAVE_BIBLIOTECA_MINIATURAS);
  localStorage.setItem(
    CHAVE_BIBLIOTECA_MINIATURAS,
    JSON.stringify(atuais.filter((m) => m.id !== id)),
  );
  try {
    await excluirArquivo(chaveModelo3D(id));
  } catch {
    if (anterior !== null) localStorage.setItem(CHAVE_BIBLIOTECA_MINIATURAS, anterior);
    throw Error('Falha ao remover o GLB. O registro da biblioteca foi preservado.');
  }
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('portal-miniaturas-biblioteca-alterada'));
}
export const carregarMiniatura3D = (id: string): Promise<Blob | null> =>
  modeloIdValido(id) ? carregarArquivo(chaveModelo3D(id)) : Promise.resolve(null);

/** Fallback para arquivos importados antes da v29.15.3, sem metadados dos nomes. */
export async function listarNomesAnimacoesMiniatura3D(modeloId: string): Promise<string[]> {
  const blob = await carregarMiniatura3D(modeloId);
  if (!blob || blob.size < 24) return [];
  const cabecalho = new DataView(await blob.slice(0, 20).arrayBuffer());
  if (
    cabecalho.getUint32(0, true) !== 0x46546c67 ||
    cabecalho.getUint32(4, true) !== 2 ||
    cabecalho.getUint32(16, true) !== 0x4e4f534a
  )
    return [];
  const tamanho = cabecalho.getUint32(12, true);
  if (tamanho < 2 || tamanho > 8_000_000 || 20 + tamanho > blob.size) return [];
  try {
    const dados = JSON.parse(
      new TextDecoder().decode(await blob.slice(20, 20 + tamanho).arrayBuffer()),
    ) as { animations?: { name?: string }[] };
    return Array.isArray(dados.animations)
      ? dados.animations.slice(0, 128).map((a, i) => a.name?.slice(0, 90) || `Animação ${i + 1}`)
      : [];
  } catch {
    return [];
  }
}
