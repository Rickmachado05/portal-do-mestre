/** Prévia de visão individual: regras geométricas compartilhadas entre as mesas.
 * A privacidade real de jogadores remotos dependerá da futura camada de servidor.
 */
import { calcularPoligonoVisao, type BarreiraMapa, type Ponto } from './lighting';

export type ObservadorVisao = { x: number; y: number; visao?: number };
export type DimensoesVisao = { largura: number; altura: number };
const limitar = (n: number, limiteInferior: number, limiteSuperior: number) =>
  Math.max(limiteInferior, Math.min(limiteSuperior, n));
export function poligonoDoObservador(
  token: ObservadorVisao | null,
  barreiras: readonly BarreiraMapa[],
  dim: DimensoesVisao,
): Ponto[] {
  if (
    !token ||
    !Number.isFinite(token.x) ||
    !Number.isFinite(token.y) ||
    dim.largura <= 0 ||
    dim.altura <= 0
  )
    return [];
  return calcularPoligonoVisao(
    token.x,
    token.y,
    limitar(token.visao ?? 18, 2, 50),
    [...barreiras],
    dim.largura,
    dim.altura,
  );
}
/** Testa o centro do token, sem considerar sua imagem/skin como obstáculo. */
export function pontoDentroDoPoligono(p: Ponto, poligono: readonly Ponto[]): boolean {
  if (poligono.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i],
      b = poligono[j];
    const cruz = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cruz) < 1e-6 &&
      p.x >= Math.min(a.x, b.x) - 1e-6 &&
      p.x <= Math.max(a.x, b.x) + 1e-6 &&
      p.y >= Math.min(a.y, b.y) - 1e-6 &&
      p.y <= Math.max(a.y, b.y) + 1e-6
    )
      return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      dentro = !dentro;
  }
  return dentro;
}
export function tokenVisivelParaObservador(
  alvo: ObservadorVisao,
  observador: ObservadorVisao | null,
  poligono: readonly Ponto[],
  dim: DimensoesVisao,
): boolean {
  if (!observador) return true;
  if (alvo.x === observador.x && alvo.y === observador.y) return true;
  return pontoDentroDoPoligono(
    { x: (alvo.x * dim.largura) / 100, y: (alvo.y * dim.altura) / 100 },
    poligono,
  );
}
