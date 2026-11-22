/** Biblioteca de tokens do mestre, estáticos e GIF idle, compatível com a v28.
 * Os idles legados permanecem acessíveis sem migração destrutiva. */
import { carregarArquivo, salvarArquivo, excluirArquivo } from './storage';
import {
  lerBibliotecaIdle,
  carregarIdleBiblioteca,
  removerIdleBiblioteca,
  MAX_IDLES_BIBLIOTECA,
} from './bibliotecaIdle';
import { validarImagemSkin, otimizarImagemSkin } from './tokenSkins';
import { decodificarGifIdle } from './tokenIdleGif.mjs';

export const CHAVE_BIBLIOTECA_TOKENS = 'portal-mestre-biblioteca-tokens-v1';
export const MAX_TOKENS_BIBLIOTECA = 120;
export const MAX_BYTES_BIBLIOTECA_TOKENS = 160 * 1024 * 1024;
export type TokenBiblioteca = {
  id: string;
  nome: string;
  adicionadoEm: string;
  tamanho: number;
  mime: string;
  animado: boolean;
  legado?: boolean;
};
const idValido = (id: string) => /^token-[a-z0-9-]{6,80}$/i.test(id);
export const chaveTokenBiblioteca = (id: string) => `biblioteca-token:${id}`;
export const chaveTokenFicha = (id: string) => `ficha-token:${id}`;
const mimeValido = (mime: string) =>
  ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime);
function normalizarIndice(raw: unknown): TokenBiblioteca[] {
  if (!Array.isArray(raw)) return [];
  const vistos = new Set<string>();
  return raw
    .filter(
      (r): r is TokenBiblioteca =>
        r &&
        typeof r === 'object' &&
        typeof r.id === 'string' &&
        idValido(r.id) &&
        !vistos.has(r.id) &&
        Boolean(vistos.add(r.id)) &&
        typeof r.nome === 'string' &&
        typeof r.adicionadoEm === 'string' &&
        typeof r.tamanho === 'number' &&
        r.tamanho > 0 &&
        typeof r.mime === 'string' &&
        mimeValido(r.mime) &&
        r.animado === (r.mime === 'image/gif'),
    )
    .slice(0, MAX_TOKENS_BIBLIOTECA)
    .map((r) => ({ ...r, nome: r.nome.trim().slice(0, 64) || 'Token sem nome', legado: false }));
}
export function lerTokensNovos(
  storage: Pick<Storage, 'getItem'> = localStorage,
): TokenBiblioteca[] {
  try {
    return normalizarIndice(JSON.parse(storage.getItem(CHAVE_BIBLIOTECA_TOKENS) || '[]'));
  } catch {
    return [];
  }
}
/** Combina a biblioteca nova com os idles existentes, sem duplicar os arquivos antigos. */
export function lerBibliotecaTokens(
  storage: Pick<Storage, 'getItem'> = localStorage,
): TokenBiblioteca[] {
  const novos = lerTokensNovos(storage);
  const antigos = lerBibliotecaIdle(storage).map((r) => ({
    ...r,
    mime: 'image/gif',
    animado: true,
    legado: true,
  }));
  return [...novos, ...antigos].sort((a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm));
}
export async function validarTokenArquivo(blob: Blob): Promise<void> {
  const aviso = validarImagemSkin(blob as File);
  if (aviso) throw Error(aviso);
  if (blob.type === 'image/gif') {
    decodificarGifIdle(await blob.arrayBuffer());
    return;
  }
  if (typeof createImageBitmap === 'function') {
    let imagem: ImageBitmap | null = null;
    try {
      imagem = await createImageBitmap(blob);
      if (!imagem.width || !imagem.height || Math.max(imagem.width, imagem.height) > 4096)
        throw Error('A imagem deve ter até 4096 pixels de lado.');
    } catch (e) {
      throw e instanceof Error ? e : Error('Imagem inválida ou danificada.');
    } finally {
      imagem?.close();
    }
  }
}
export async function adicionarTokenBiblioteca(
  arquivo: File,
  nome: string,
): Promise<TokenBiblioteca> {
  const atuais = lerTokensNovos(),
    total = lerBibliotecaTokens().length;
  if (total >= MAX_TOKENS_BIBLIOTECA)
    throw Error(`Biblioteca cheia: até ${MAX_TOKENS_BIBLIOTECA} tokens.`);
  await validarTokenArquivo(arquivo);
  const blob = await otimizarImagemSkin(arquivo);
  const usados = lerBibliotecaTokens().reduce((s, t) => s + t.tamanho, 0);
  if (usados + blob.size > MAX_BYTES_BIBLIOTECA_TOKENS)
    throw Error(
      'A biblioteca de tokens atingiu 160 MB. Remova arquivos não usados para preservar os backups.',
    );
  const registro: TokenBiblioteca = {
    id: `token-${crypto.randomUUID()}`,
    nome: (nome.trim() || arquivo.name.replace(/\.[^.]+$/, '') || 'Token').slice(0, 64),
    mime: blob.type || arquivo.type,
    animado: arquivo.type === 'image/gif',
    tamanho: blob.size,
    adicionadoEm: new Date().toISOString(),
  };
  await salvarArquivo(chaveTokenBiblioteca(registro.id), blob);
  try {
    localStorage.setItem(CHAVE_BIBLIOTECA_TOKENS, JSON.stringify([registro, ...atuais]));
  } catch (erro) {
    await excluirArquivo(chaveTokenBiblioteca(registro.id));
    throw erro;
  }
  return registro;
}
export async function carregarTokenBiblioteca(token: TokenBiblioteca | string): Promise<Blob> {
  const id = typeof token === 'string' ? token : token.id;
  if (id.startsWith('idle-')) return carregarIdleBiblioteca(id);
  if (!idValido(id)) throw Error('Identificador de token inválido.');
  const blob = await carregarArquivo(chaveTokenBiblioteca(id));
  if (!blob || !mimeValido(blob.type))
    throw Error('Arquivo de token indisponível. Confira o backup.');
  return blob;
}
export async function removerTokenBiblioteca(id: string): Promise<void> {
  if (id.startsWith('idle-')) return removerIdleBiblioteca(id);
  const atuais = lerTokensNovos();
  if (!atuais.some((t) => t.id === id)) return;
  localStorage.setItem(CHAVE_BIBLIOTECA_TOKENS, JSON.stringify(atuais.filter((t) => t.id !== id)));
  await excluirArquivo(chaveTokenBiblioteca(id));
}
/** Cópia autônoma: a ficha e a unidade não dependem da permanência do token no acervo. */
export async function copiarTokenDaFicha(
  fichaId: string,
  unidadeId: string,
  destino?: string,
): Promise<Blob | null> {
  const blob = await carregarArquivo(chaveTokenFicha(fichaId));
  if (!blob) return null;
  await salvarArquivo(destino || `token:${unidadeId}`, blob);
  return blob;
}
export const MAX_IDLES_LEGADOS = MAX_IDLES_BIBLIOTECA;
