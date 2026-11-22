/** Ajuste visual compartilhado entre biblioteca, mesas 2D/3D e multiplayer.
 * Este módulo não depende do React nem modifica arquivos originais.
 */
export type ModoRetrato = 'automatico' | 'preencher' | 'conter';
export type AjusteRetrato = {
  modo: ModoRetrato;
  largura: number;
  altura: number;
  x: number;
  y: number;
  zoom: number;
};
export const AJUSTE_RETRATO_PADRAO: AjusteRetrato = {
  modo: 'automatico',
  largura: 100,
  altura: 100,
  x: 0,
  y: 0,
  zoom: 1,
};
export function normalizarAjusteRetrato(valor?: Partial<AjusteRetrato> | null): AjusteRetrato {
  const numero = (n: unknown, min: number, max: number, padrao: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  return {
    modo: valor?.modo === 'preencher' || valor?.modo === 'conter' ? valor.modo : 'automatico',
    largura: numero(valor?.largura, 40, 250, 100),
    altura: numero(valor?.altura, 40, 250, 100),
    x: numero(valor?.x, -100, 100, 0),
    y: numero(valor?.y, -100, 100, 0),
    zoom: numero(valor?.zoom, 0.5, 3, 1),
  };
}
/** Usa 'conter' para divergências grandes, evitando cortar a cabeça em retratos verticais. */
export function encaixeAutomatico(
  larguraImagem: number,
  alturaImagem: number,
  larguraArea: number,
  alturaArea: number,
): 'cover' | 'contain' {
  if (!(larguraImagem > 0 && alturaImagem > 0 && larguraArea > 0 && alturaArea > 0)) return 'cover';
  const proporcaoImagem = larguraImagem / alturaImagem,
    proporcaoArea = larguraArea / alturaArea;
  return Math.max(proporcaoImagem / proporcaoArea, proporcaoArea / proporcaoImagem) > 1.3
    ? 'contain'
    : 'cover';
}
