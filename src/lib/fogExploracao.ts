/** Fog of War exploratório da v1.3.40.12. A grade usa coordenadas percentuais
 * da cena, portanto seu histórico é idêntico nas mesas 2D e 3D.
 * O histórico é uma string hexadecimal compacta de bits por personagem.
 */
import { pontoDentroDoPoligono } from './visaoIndividual';
import type { Ponto } from './lighting';

export const COLUNAS_FOG = 48;
export const LINHAS_FOG = 48;
export const TOTAL_FOG = COLUNAS_FOG * LINHAS_FOG;
const BYTES = TOTAL_FOG / 8;
export type MemoriaFog = Record<string, string>;
export type TracoFog = {
  acao: 'revelar' | 'ocultar';
  pontos: { x: number; y: number }[];
  raio: number;
};
export type DimFog = { largura: number; altura: number };
const zeros = () => new Uint8Array(BYTES);
export function decodificarFog(hex: unknown): Uint8Array {
  const bits = zeros();
  if (typeof hex !== 'string' || hex.length !== BYTES * 2 || !/^[0-9a-f]+$/i.test(hex)) return bits;
  for (let i = 0; i < BYTES; i++) bits[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bits;
}
export function codificarFog(bits: Uint8Array): string {
  return Array.from(bits, (x) => x.toString(16).padStart(2, '0')).join('');
}
export function validarMemoriaFog(raw: unknown): MemoriaFog {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: MemoriaFog = {};
  for (const [id, v] of Object.entries(raw)) {
    if (
      id.length < 150 &&
      typeof v === 'string' &&
      v.length === BYTES * 2 &&
      /^[0-9a-f]+$/i.test(v)
    )
      out[id] = v.toLowerCase();
  }
  return out;
}
const pertence = (bits: Uint8Array, n: number) => Boolean(bits[n >> 3] & (1 << (n & 7)));
const marcar = (bits: Uint8Array, n: number) => {
  bits[n >> 3] |= 1 << (n & 7);
};
export function celulaFog(x: number, y: number): number {
  return (
    Math.min(COLUNAS_FOG - 1, Math.max(0, Math.floor((x / 100) * COLUNAS_FOG))) +
    COLUNAS_FOG * Math.min(LINHAS_FOG - 1, Math.max(0, Math.floor((y / 100) * LINHAS_FOG)))
  );
}
export function pontoCelulaFog(n: number): { x: number; y: number } {
  return {
    x: (((n % COLUNAS_FOG) + 0.5) * 100) / COLUNAS_FOG,
    y: ((Math.floor(n / COLUNAS_FOG) + 0.5) * 100) / LINHAS_FOG,
  };
}
export function celulasVisiveisFog(
  poligonos: readonly (readonly Ponto[])[],
  dim: DimFog,
): Uint8Array {
  const resultado = new Uint8Array(TOTAL_FOG);
  if (dim.largura <= 0 || dim.altura <= 0) return resultado;
  for (let n = 0; n < TOTAL_FOG; n++) {
    const p = pontoCelulaFog(n),
      px = { x: (p.x * dim.largura) / 100, y: (p.y * dim.altura) / 100 };
    if (poligonos.some((pol) => pontoDentroDoPoligono(px, pol))) resultado[n] = 1;
  }
  return resultado;
}
export function acrescentarExploracaoFog(
  anterior: string | undefined,
  visiveis: Uint8Array,
): string {
  const bits = decodificarFog(anterior);
  let mudou = false;
  for (let n = 0; n < TOTAL_FOG; n++)
    if (visiveis[n] && !pertence(bits, n)) {
      marcar(bits, n);
      mudou = true;
    }
  return mudou ? codificarFog(bits) : anterior || codificarFog(bits);
}
export function mesmoHistoricoFog(a: MemoriaFog, b: MemoriaFog): boolean {
  const chaves = Object.keys(a);
  return chaves.length === Object.keys(b).length && chaves.every((k) => a[k] === b[k]);
}
const distanciaSegmento = (
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
};
/** 0 = nunca explorado; 1 = visto anteriormente; 2 = visível agora.
 * O pincel manual, aplicado por último, prevalece sobre todos os observadores.
 */
export function mapaEstadosFog(
  memoria: MemoriaFog,
  ids: readonly string[],
  visiveis: Uint8Array,
  pinceis: readonly TracoFog[],
): Uint8Array {
  const mapa = new Uint8Array(TOTAL_FOG);
  const partes = ids.map((id) => decodificarFog(memoria[id]));
  for (let n = 0; n < TOTAL_FOG; n++) {
    mapa[n] = visiveis[n] ? 2 : partes.some((bits) => pertence(bits, n)) ? 1 : 0;
  }
  // Rasterizacao limitada ao retangulo de cada segmento: evita verificar
  // milhares de pontos para todos os pincéis históricos a cada movimento.
  for (const traco of pinceis) {
    if (!traco.pontos?.length || !Number.isFinite(traco.raio) || traco.raio <= 0) continue;
    const pontos = traco.pontos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    const destino = traco.acao === 'ocultar' ? 0 : 2;
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[Math.max(0, i - 1)],
        b = pontos[i],
        r = traco.raio;
      const x0 = Math.max(0, Math.floor(((Math.min(a.x, b.x) - r) * COLUNAS_FOG) / 100));
      const x1 = Math.min(
        COLUNAS_FOG - 1,
        Math.ceil(((Math.max(a.x, b.x) + r) * COLUNAS_FOG) / 100),
      );
      const y0 = Math.max(0, Math.floor(((Math.min(a.y, b.y) - r) * LINHAS_FOG) / 100));
      const y1 = Math.min(LINHAS_FOG - 1, Math.ceil(((Math.max(a.y, b.y) + r) * LINHAS_FOG) / 100));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const n = y * COLUNAS_FOG + x,
            pt = pontoCelulaFog(n);
          if (distanciaSegmento(pt.x, pt.y, a, b) <= r) mapa[n] = destino;
        }
    }
  }
  return mapa;
}
/** Caminhos SVG agrupados por estado, em um viewBox de 0..1000. */
export function caminhosFog(mapa: Uint8Array): { oculto: string; explorado: string } {
  const caminho = ['', ''];
  const w = 1000 / COLUNAS_FOG,
    h = 1000 / LINHAS_FOG;
  for (let n = 0; n < TOTAL_FOG; n++) {
    if (mapa[n] === 2) continue;
    const x = +((n % COLUNAS_FOG) * w).toFixed(3),
      y = +(Math.floor(n / COLUNAS_FOG) * h).toFixed(3);
    caminho[mapa[n] === 0 ? 0 : 1] += `M${x} ${y}h${w}v${h}h-${w}z`;
  }
  return { oculto: caminho[0], explorado: caminho[1] };
}
