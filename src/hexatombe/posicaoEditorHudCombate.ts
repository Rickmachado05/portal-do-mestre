/** Posiciona o editor fora da HUD e da silhueta do token.
 * Em telas pequenas, recolhe as colunas auxiliares durante a edição; se nem a
 * HUD principal couber junto do editor, usa a vista dedicada de configurações.
 * Não altera a posição nem a persistência das ações de combate.
 */
import type { LayoutLateralMenuCombate, PontoMenuCombate } from './posicaoMenuCombate';

export type ModoEditorHud = 'completo' | 'sem-secundarios' | 'exclusivo';
export type PosicaoEditorHud = { left: number; top: number; modo: ModoEditorHud };
type Retangulo = { left: number; top: number; width: number; height: number };
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
function cruza(a: Retangulo, b: Retangulo, padding = 10): boolean {
  return (
    a.left < b.left + b.width + padding &&
    a.left + a.width + padding > b.left &&
    a.top < b.top + b.height + padding &&
    a.top + a.height + padding > b.top
  );
}
export function calcularPosicaoEditorHudCombate(
  layout: LayoutLateralMenuCombate,
  largura: number,
  altura: number,
  ancora?: PontoMenuCombate,
  detalhesAbertos = false,
): PosicaoEditorHud {
  const w = Math.max(280, largura),
    h = Math.max(300, altura);
  const escala = layout.escala;
  const leftSafe = w > 1150 ? 252 : w > 850 ? 158 : 12;
  const rightSafe = w > 1150 ? 132 : w > 850 ? 92 : 12;
  const topSafe = w > 1150 && h > 700 ? 218 : h > 700 ? 142 : 77;
  const bottomSafe = h > 700 ? 93 : 14;
  const ew = Math.min(290, Math.max(200, w - leftSafe - rightSafe - 16));
  const eh = Math.min(430, Math.max(250, h - topSafe - bottomSafe));
  const minX = leftSafe,
    maxX = Math.max(minX, w - rightSafe - ew);
  const minY = topSafe,
    maxY = Math.max(minY, h - bottomSafe - eh);
  const principal: Retangulo = {
    left: layout.principal.left,
    top: layout.principal.top,
    width: layout.larguraPrincipal * escala,
    height: Math.min(300, 282 * escala),
  };
  const lista: Retangulo = {
    left: layout.lista.left,
    top: layout.lista.top,
    width: layout.lista.width * escala,
    height: layout.lista.maxHeight * escala,
  };
  const detalhe: Retangulo = {
    left: layout.detalhe.left,
    top: layout.detalhe.top,
    width: layout.detalhe.width * escala,
    height: layout.detalhe.maxHeight * escala,
  };
  // Área visível do personagem, que se estende acima da origem do token no chão.
  const token: Retangulo | undefined = ancora?.visivel
    ? {
        left: ancora.x - 87,
        top: ancora.y - 245,
        width: 174,
        height: 285,
      }
    : undefined;
  const ranges = [
    {
      modo: 'completo' as const,
      ocupados: detalhesAbertos ? [principal, lista, detalhe] : [principal, lista],
    },
    { modo: 'sem-secundarios' as const, ocupados: [principal] },
  ];
  const xs = [
    minX,
    maxX,
    principal.left - ew - 18,
    principal.left + principal.width + 18,
    lista.left - ew - 18,
    lista.left + lista.width + 18,
  ];
  const ys = [
    minY,
    limitar(principal.top - 50, minY, maxY),
    maxY,
    limitar(principal.top + principal.height + 16, minY, maxY),
  ];
  for (const group of ranges) {
    const candidatos: { retangulo: Retangulo; score: number }[] = [];
    for (const rawX of xs)
      for (const rawY of ys) {
        const x = limitar(rawX, minX, maxX),
          y = limitar(rawY, minY, maxY);
        const retangulo = { left: x, top: y, width: ew, height: eh };
        if (
          group.ocupados.some((outro) => cruza(retangulo, outro, 12)) ||
          (token && cruza(retangulo, token, 8))
        )
          continue;
        // Prefira uma área perto da HUD sem bloquear a região central da mesa.
        const dist = Math.abs(x - principal.left) + Math.abs(y - principal.top) * 0.25;
        const centro = w * 0.5;
        const penalidadeCentro = x < centro && x + ew > centro ? 150 : 0;
        candidatos.push({ retangulo, score: dist + penalidadeCentro });
      }
    candidatos.sort((a, b) => a.score - b.score);
    if (candidatos.length)
      return {
        left: Math.round(candidatos[0].retangulo.left),
        top: Math.round(candidatos[0].retangulo.top),
        modo: group.modo,
      };
  }
  // Espaço insuficiente: o editor ocupa uma área própria (sem sobreposição).
  return {
    left: Math.round(limitar((minX + maxX) / 2, minX, maxX)),
    top: Math.round(minY),
    modo: 'exclusivo',
  };
}
