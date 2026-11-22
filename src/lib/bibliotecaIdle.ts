/** Biblioteca global de GIFs idle do Mestre: índice local e imagens no IndexedDB.
 * As skins aplicadas recebem cópias independentes para sobreviver à exclusão do original. */
import { carregarArquivo, salvarArquivo, excluirArquivo } from './storage';
import { decodificarGifIdle } from './tokenIdleGif.mjs';

export const CHAVE_BIBLIOTECA_IDLE = 'portal-mestre-biblioteca-idles-v1';
export const MAX_IDLES_BIBLIOTECA = 40;
export type IdleBiblioteca = { id: string; nome: string; adicionadoEm: string; tamanho: number };
export const chaveIdleBiblioteca = (id: string) => `biblioteca-token-idle:${id}`;
const nomeLimpo = (s: string) => s.trim().slice(0, 64) || 'Idle sem nome';
const idValido = (s: string) => /^idle-[a-z0-9-]{6,80}$/i.test(s);

export function lerBibliotecaIdle(
  storage: Pick<Storage, 'getItem'> = localStorage,
): IdleBiblioteca[] {
  try {
    const valor = JSON.parse(storage.getItem(CHAVE_BIBLIOTECA_IDLE) || '[]') as unknown;
    if (!Array.isArray(valor)) return [];
    const ids = new Set<string>();
    return valor
      .filter(
        (v): v is IdleBiblioteca =>
          !!v &&
          typeof v === 'object' &&
          typeof v.id === 'string' &&
          idValido(v.id) &&
          typeof v.nome === 'string' &&
          typeof v.adicionadoEm === 'string' &&
          typeof v.tamanho === 'number' &&
          v.tamanho > 0 &&
          !ids.has(v.id) &&
          Boolean(ids.add(v.id)),
      )
      .slice(0, MAX_IDLES_BIBLIOTECA)
      .map((v) => ({ ...v, nome: nomeLimpo(v.nome) }));
  } catch {
    return [];
  }
}
export function criarRegistroIdle(nome: string, tamanho: number, id?: string): IdleBiblioteca {
  const gerado =
    id || `idle-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  if (!idValido(gerado) || !Number.isFinite(tamanho) || tamanho <= 0)
    throw Error('Registro idle inválido.');
  return { id: gerado, nome: nomeLimpo(nome), adicionadoEm: new Date().toISOString(), tamanho };
}
export function acrescentarRegistroIdle(
  atuais: IdleBiblioteca[],
  novo: IdleBiblioteca,
): IdleBiblioteca[] {
  if (atuais.length >= MAX_IDLES_BIBLIOTECA)
    throw Error(`A biblioteca aceita até ${MAX_IDLES_BIBLIOTECA} idles.`);
  return [novo, ...atuais.filter((a) => a.id !== novo.id)];
}
export async function adicionarIdleBiblioteca(
  arquivo: Blob,
  nome: string,
): Promise<IdleBiblioteca> {
  if (arquivo.type !== 'image/gif') throw Error('A biblioteca de idle aceita arquivos GIF.');
  // Mesmos limites e verificação usados na importação das skins.
  decodificarGifIdle(await arquivo.arrayBuffer());
  const atuais = lerBibliotecaIdle();
  const novo = criarRegistroIdle(nome, arquivo.size);
  const proximo = acrescentarRegistroIdle(atuais, novo);
  await salvarArquivo(chaveIdleBiblioteca(novo.id), arquivo);
  try {
    localStorage.setItem(CHAVE_BIBLIOTECA_IDLE, JSON.stringify(proximo));
  } catch (erro) {
    await excluirArquivo(chaveIdleBiblioteca(novo.id));
    throw erro;
  }
  return novo;
}
export async function carregarIdleBiblioteca(id: string): Promise<Blob> {
  if (!idValido(id)) throw Error('Idle inválido.');
  const blob = await carregarArquivo(chaveIdleBiblioteca(id));
  if (!blob || blob.type !== 'image/gif')
    throw Error('Arquivo idle não encontrado. Confira seu backup.');
  return blob;
}
export async function removerIdleBiblioteca(id: string): Promise<void> {
  const atuais = lerBibliotecaIdle();
  if (!atuais.some((i) => i.id === id)) return;
  // Remove o índice primeiro: se o Blob não puder ser apagado, a skin aplicada continua preservada.
  localStorage.setItem(CHAVE_BIBLIOTECA_IDLE, JSON.stringify(atuais.filter((i) => i.id !== id)));
  await excluirArquivo(chaveIdleBiblioteca(id));
}
