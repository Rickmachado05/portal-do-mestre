/** Enquadramento inicial da planta, independente do estado do editor.
 * A dimensão informada é a área jogável do mapa compartilhado, não a moldura.
 * Usa FOV vertical e razão da janela para evitar a escala inicial errada.
 */
export function distanciaInicialMapa3D(
  largura: number,
  profundidade: number,
  aspectoTela: number,
  anguloHorizontal = 0.4,
  elevacao = 0.82,
  campoVerticalGraus = 48,
): number {
  if (
    ![largura, profundidade, aspectoTela, anguloHorizontal, elevacao, campoVerticalGraus].every(
      Number.isFinite,
    )
  )
    return 18;
  const l = Math.max(4, Math.min(120, largura)),
    p = Math.max(4, Math.min(120, profundidade));
  const aspecto = Math.max(0.5, Math.min(4, aspectoTela));
  const sen = Math.abs(Math.sin(anguloHorizontal)),
    cos = Math.abs(Math.cos(anguloHorizontal));
  const meiaLargura = (l * cos + p * sen) / 2;
  const meiaAltura = ((l * sen + p * cos) * Math.abs(Math.sin(elevacao))) / 2;
  const tangente = Math.tan((Math.max(20, Math.min(80, campoVerticalGraus)) * Math.PI) / 360);
  // Margem para os tokens, para o contorno e para as barras da interface.
  const distancia = Math.max(
    (meiaAltura + 1.3) / tangente,
    (meiaLargura + 1.3) / (tangente * aspecto),
  );
  return Math.max(8, Math.min(160, Math.round(distancia * 1.12 * 100) / 100));
}
