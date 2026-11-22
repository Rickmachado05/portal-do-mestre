/** Pixel art original e procedural, sem importar arte de outros jogos.
 * Renderizada como plano transparente no espaço 3D com escala nearest-neighbor.
 */
import * as THREE from 'three';
export type MovelPixel25D = 'cadeira' | 'barril' | 'vaso';

export function criarTexturaMovel25D(tipo: MovelPixel25D): THREE.CanvasTexture {
  const tela = document.createElement('canvas');
  tela.width = 48;
  tela.height = 64;
  const c = tela.getContext('2d');
  if (!c) throw new Error('Canvas 2D indisponível.');
  c.imageSmoothingEnabled = false;
  const r = (x: number, y: number, w: number, h: number, cor: string) => {
    c.fillStyle = cor;
    c.fillRect(x, y, w, h);
  };
  const contorno = '#242331',
    madeira = '#654332',
    luz = '#bd8850',
    sombra = '#49302c';
  if (tipo === 'cadeira') {
    r(12, 9, 25, 42, contorno);
    r(15, 12, 19, 27, madeira);
    r(18, 15, 13, 4, luz);
    r(18, 23, 13, 3, '#86583d');
    r(9, 35, 31, 12, contorno);
    r(12, 38, 25, 7, '#9c6742');
    r(13, 47, 6, 13, contorno);
    r(30, 47, 6, 13, contorno);
    r(15, 49, 3, 9, sombra);
    r(32, 49, 3, 9, sombra);
  } else if (tipo === 'barril') {
    r(10, 12, 28, 42, contorno);
    r(14, 9, 20, 5, contorno);
    r(13, 14, 22, 37, madeira);
    r(16, 14, 4, 37, '#936b43');
    r(27, 14, 4, 37, sombra);
    for (const y of [17, 42]) {
      r(11, y, 26, 5, contorno);
      r(13, y + 1, 22, 2, '#97908a');
    }
    r(15, 52, 19, 4, contorno);
    r(19, 25, 3, 12, luz);
  } else {
    r(21, 5, 6, 35, contorno);
    r(22, 8, 4, 29, '#477554');
    for (const [x, y, w, h, tom] of [
      [8, 20, 16, 12, '#345a48'],
      [25, 17, 16, 12, '#4d845b'],
      [14, 7, 19, 14, '#5b9364'],
      [5, 31, 17, 10, '#466a52'],
      [30, 30, 14, 9, '#365a46'],
    ] as const) {
      r(x, y, w, h, contorno);
      r(x + 2, y + 2, w - 4, h - 4, tom);
    }
    r(14, 38, 22, 21, contorno);
    r(17, 41, 16, 14, '#a16a4b');
    r(18, 44, 4, 9, '#cb956b');
    r(19, 57, 12, 3, contorno);
  }
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.generateMipmaps = false;
  return textura;
}
