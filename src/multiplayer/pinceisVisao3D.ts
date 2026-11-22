/**
 * Regra ÚNICA do pincel de visão (mestre Observar e publicação do jogador).
 * Recebe coordenadas em pixels da imagem de referência e pincéis percentuais.
 * A publicação não compartilha barreiras nem a própria imagem integral.
 */
export type PincelVisao3D = {
  acao: 'revelar' | 'ocultar';
  pontos: readonly { x: number; y: number }[];
  raio: number;
};
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const distanciaSegmento = (
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    den = dx * dx + dy * dy;
  const t = den ? limitar(((p.x - a.x) * dx + (p.y - a.y) * dy) / den, 0, 1) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
export function liberadoPelosPinceis(
  p: { x: number; y: number },
  pinceis: readonly PincelVisao3D[],
  largura: number,
  altura: number,
  inicial = true,
): boolean {
  if (!(largura > 0 && altura > 0)) return false;
  const normalizado = { x: (p.x / largura) * 100, y: (p.y / altura) * 100 };
  let liberado = inicial;
  for (const pincel of pinceis) {
    const pontos = pincel.pontos.filter((a) => Number.isFinite(a.x) && Number.isFinite(a.y));
    const afeta = pontos.some(
      (a, i) =>
        distanciaSegmento(normalizado, a, pontos[Math.max(0, i - 1)]) <=
        limitar(pincel.raio, 0, 100),
    );
    if (afeta) liberado = pincel.acao !== 'ocultar';
  }
  return liberado;
}
