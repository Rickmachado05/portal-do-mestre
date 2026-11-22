/** Edição geométrica de barreiras 2D em coordenadas percentuais. */
import type { BarreiraMapa, Ponto } from './lighting';
const limite = (n: number) => Math.max(0, Math.min(100, n));
export type ParteBarreira = 'corpo' | 'inicio' | 'fim';
/** Mantém o comprimento e os ângulos ao deslocar uma linha inteira, mesmo nas bordas. */
export function arrastarBarreira(
  original: BarreiraMapa,
  origem: Ponto,
  atual: Ponto,
  parte: ParteBarreira,
): BarreiraMapa {
  if (parte === 'inicio') return { ...original, x1: limite(atual.x), y1: limite(atual.y) };
  if (parte === 'fim') return { ...original, x2: limite(atual.x), y2: limite(atual.y) };
  const dx = Math.max(
    -Math.min(original.x1, original.x2),
    Math.min(100 - Math.max(original.x1, original.x2), atual.x - origem.x),
  );
  const dy = Math.max(
    -Math.min(original.y1, original.y2),
    Math.min(100 - Math.max(original.y1, original.y2), atual.y - origem.y),
  );
  return {
    ...original,
    x1: original.x1 + dx,
    x2: original.x2 + dx,
    y1: original.y1 + dy,
    y2: original.y2 + dy,
  };
}
