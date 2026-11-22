/**
 * Compositor único da visão da Mesa 3D: mestre e convidado usam exatamente
 * as mesmas cores, opacidades e coordenadas (mundo -> canvas).
 * O convidado NUNCA calcula paredes; recebe somente a máscara/autorização já
 * censurada para o próprio personagem.
 */
import { COLUNAS_FOG, LINHAS_FOG } from '../lib/fogExploracao';
export type PontoVisao3D = { x: number; y: number };
export type DesenhoVisao3D = {
  estados?: ArrayLike<number> | string | null;
  poligono?: readonly PontoVisao3D[] | null;
  larguraMundo?: number;
  alturaMundo?: number;
};
export function desenharVisaoCompartilhada3D(
  ctx: CanvasRenderingContext2D,
  opcoes: DesenhoVisao3D,
): void {
  const { width: w, height: h } = ctx.canvas;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  if (opcoes.estados && opcoes.estados.length === COLUNAS_FOG * LINHAS_FOG) {
    const cw = w / COLUNAS_FOG,
      ch = h / LINHAS_FOG;
    for (let n = 0; n < opcoes.estados.length; n++) {
      const estado = Number(opcoes.estados[n]);
      if (estado === 2) continue;
      ctx.fillStyle = estado === 1 ? 'rgba(8,14,24,0.73)' : '#050913';
      ctx.fillRect((n % COLUNAS_FOG) * cw, Math.floor(n / COLUNAS_FOG) * ch, cw + 0.5, ch + 0.5);
    }
  } else {
    ctx.fillStyle = '#050913';
    ctx.fillRect(0, 0, w, h);
    if (opcoes.poligono && opcoes.poligono.length >= 3) {
      const largura = opcoes.larguraMundo || 100,
        altura = opcoes.alturaMundo || 100;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      opcoes.poligono.forEach((p, i) => {
        const x = (p.x / largura) * w,
          y = (p.y / altura) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}
