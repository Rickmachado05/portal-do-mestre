/**
 * Composição equivalente à cena do convidado: o piso recebe a arte original
 * e a máscara autorizada no MESMO referencial percentual da textura.
 * Não projeta um segundo plano 3D; a máscara já vem do compositor único.
 * O Canvas de destino fica opaco para não revelar acidentalmente o chão abaixo.
 */
export function comporRecorteFogComoJogador3D(ctx, imagem, mascara, largura, altura, opacidade = 1) {
  if (!ctx || !imagem || !mascara || !Number.isFinite(largura) ||
      !Number.isFinite(altura) || largura < 1 || altura < 1) return false;
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, largura, altura);
    ctx.drawImage(imagem, 0, 0, largura, altura);
    // Estados 0/1/2 e polígono são os MESMOS do renderizador da Mesa 3D.
    // A imagem fica visível só onde a máscara permite, sem segundo overlay.
    // A edição do mestre mantém a névoa parcialmente transparente;
    // a prévia Observar utiliza a cobertura completa do jogador.
    ctx.globalAlpha = Math.min(1, Math.max(0, opacidade));
    ctx.drawImage(mascara, 0, 0, largura, altura);
    return true;
  } finally { ctx.restore(); }
}
