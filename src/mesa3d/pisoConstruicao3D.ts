/** Mapas-base 2D da cena híbrida. O arquivo original é mantido em IndexedDB;
 * nenhuma ferramenta altera a imagem que pertence à Mesa 2D.
 */
export const MAX_ARQUIVO_PISO_3D = 12 * 1024 * 1024;
export const CHAVE_PISO_3D = (cenaId: string) => `piso3d:${cenaId}`;
export const CHAVE_MAPA_2D = (cenaId: string) =>
  cenaId === 'cena-original' ? 'mapa' : `mapa:${cenaId}`;
export type AjusteImagemPiso3D = 'cobrir' | 'conter';

export function dimensoesImagemPiso3D(
  largura: number,
  altura: number,
  modo: AjusteImagemPiso3D = 'conter',
  w = 2048,
  h = 1934,
) {
  if (!(largura > 0 && altura > 0 && w > 0 && h > 0)) throw Error('Imagem de piso inválida.');
  const escala =
    modo === 'cobrir' ? Math.max(w / largura, h / altura) : Math.min(w / largura, h / altura);
  const dw = largura * escala,
    dh = altura * escala;
  return { x: (w - dw) / 2, y: (h - dh) / 2, largura: dw, altura: dh };
}
/** Calcula o encaixe do mapa sem distorcer as proporções originais. */
export function calcularProjecaoMapa3D(
  largura: number,
  altura: number,
  w = 2048,
  h = 1934,
  modo: AjusteImagemPiso3D = 'conter',
  escala = 1,
  deslocamentoX = 0,
  deslocamentoY = 0,
) {
  const original = dimensoesImagemPiso3D(largura, altura, modo, w, h);
  const s = Math.max(0.5, Math.min(2, Number.isFinite(escala) ? escala : 1));
  const dx = Math.max(-0.5, Math.min(0.5, Number.isFinite(deslocamentoX) ? deslocamentoX : 0));
  const dy = Math.max(-0.5, Math.min(0.5, Number.isFinite(deslocamentoY) ? deslocamentoY : 0));
  const dw = original.largura * s,
    dh = original.altura * s;
  return { x: (w - dw) / 2 + dx * w, y: (h - dh) / 2 + dy * h, largura: dw, altura: dh };
}
/** Dimensões realmente desenhadas no chão. O ajuste livre deforma somente a
 * superfície 3D, mantendo o arquivo original intocado. */
export function calcularTamanhoVisualPlanta3D(
  larguraImagem: number,
  alturaImagem: number,
  larguraArea: number,
  profundidadeArea: number,
  larguraPlanta: number,
  profundidadePlanta: number,
  modo: AjusteImagemPiso3D = 'conter',
  escala = 1,
  ajusteLivre = false,
) {
  if (ajusteLivre) {
    if (!(larguraPlanta > 0 && profundidadePlanta > 0))
      throw Error('Dimensões de planta inválidas.');
    const s = Math.max(0.5, Math.min(2, Number.isFinite(escala) ? escala : 1));
    return { largura: larguraPlanta * s, altura: profundidadePlanta * s };
  }
  const r = calcularProjecaoMapa3D(
    larguraImagem,
    alturaImagem,
    larguraArea,
    profundidadeArea,
    modo,
    escala,
  );
  return { largura: r.largura, altura: r.altura };
}
/** Reduz a resolução mantendo a proporção. Não recorta nem desenha margens no arquivo;
 * escala, enquadramento e transparência são controles NÃO destrutivos no renderizador.
 */
export async function prepararImagemPiso3D(
  arquivo: Blob,
  _modo: AjusteImagemPiso3D = 'conter',
): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type))
    throw Error('Use uma imagem PNG, JPG ou WebP.');
  if (arquivo.size > MAX_ARQUIVO_PISO_3D) throw Error('A imagem precisa ter no máximo 12 MB.');
  const bitmap = await createImageBitmap(arquivo);
  try {
    const fator = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * fator));
    canvas.height = Math.max(1, Math.round(bitmap.height * fator));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Não foi possível preparar o piso.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(Error('Falha ao salvar a imagem do piso.'))),
        'image/jpeg',
        0.86,
      ),
    );
  } finally {
    bitmap.close();
  }
}
