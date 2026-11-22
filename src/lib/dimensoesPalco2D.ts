/**
 * Referência única do enquadramento 2D para mestre e convidados.
 * As medidas de entrada são do viewport do mapa, sem o cabeçalho.
 * Em zoom 100%, ambos veem a mesma fração do mapa na mesma resolução.
 */
export function dimensoesPalco2D(
  viewport: { largura: number; altura: number },
  proporcaoNatural: number,
  escalaCena: number,
): { largura: number; altura: number } {
  const proporcao =
    Number.isFinite(proporcaoNatural) && proporcaoNatural > 0 ? proporcaoNatural : 1.6;
  const escala = Number.isFinite(escalaCena) ? Math.max(1, Math.min(5, escalaCena)) : 1;
  const areaUtilLargura = Math.max(210, viewport.largura - (viewport.largura > 820 ? 230 : 80));
  const areaUtilAltura = Math.max(190, viewport.altura - (viewport.altura > 580 ? 100 : 50));
  const larguraBase = Math.max(1, Math.min(areaUtilLargura, areaUtilAltura * proporcao));
  const alturaBase = larguraBase / proporcao;
  return { largura: Math.round(larguraBase * escala), altura: Math.round(alturaBase * escala) };
}
