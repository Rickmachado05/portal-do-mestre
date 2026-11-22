/** Dimensões visuais independentes do standee 3D, em porcentagem.
 * 100% preserva exatamente a aparência anterior do personagem.
 * Não interfere na posição 2D, tamanho do token 2D nem na colisão do cenário.
 */
export const TAMANHO_TOKEN_3D_PADRAO = 100;
export const TAMANHO_TOKEN_3D_MIN = 40;
export const TAMANHO_TOKEN_3D_MAX = 300;
export type DimensoesToken3D = { largura3D: number; altura3D: number };
export function normalizarDimensaoToken3D(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? Math.max(TAMANHO_TOKEN_3D_MIN, Math.min(TAMANHO_TOKEN_3D_MAX, valor))
    : TAMANHO_TOKEN_3D_PADRAO;
}
export function dimensoesToken3D(
  token: { largura3D?: number; altura3D?: number } | null | undefined,
): DimensoesToken3D {
  return {
    largura3D: normalizarDimensaoToken3D(token?.largura3D),
    altura3D: normalizarDimensaoToken3D(token?.altura3D),
  };
}
export function escalaVisualToken3D(
  larguraNatural: number,
  token: { largura3D?: number; altura3D?: number } | null | undefined,
  espelhado = false,
) {
  const d = dimensoesToken3D(token);
  const x = (Math.max(0.1, larguraNatural) / 1.35) * (d.largura3D / 100) * (espelhado ? -1 : 1);
  const y = d.altura3D / 100;
  // Chão sempre na mesma altura, mesmo aumentando/diminuindo a miniatura.
  return { x, y, centroY: 0.055 + (1.95 * y) / 2 };
}
