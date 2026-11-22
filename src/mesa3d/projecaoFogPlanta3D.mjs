/**
 * Projeta o canvas de visão (coordenadas do mundo) na imagem REAL da planta 3D.
 * A planta pode ocupar só uma parte do terreno, ter proporção livre e deslocamento.
 * A origem de Z do canvas corresponde ao topo da textura do piso (Z mínimo).
 */
export function projetarFogNaPlanta3D(planta, visao, larguraImagem, alturaImagem) {
  const numeros = [planta.x, planta.z, planta.largura, planta.altura,
    visao.minX, visao.minZ, visao.largura, visao.altura, larguraImagem, alturaImagem];
  if (numeros.some(valor => !Number.isFinite(valor)) ||
      planta.largura <= 0 || planta.altura <= 0 ||
      visao.largura <= 0 || visao.altura <= 0 ||
      larguraImagem <= 0 || alturaImagem <= 0) return null;
  const esquerda = planta.x - planta.largura / 2;
  const topo = planta.z - planta.altura / 2;
  return {
    x: (visao.minX - esquerda) / planta.largura * larguraImagem,
    y: (visao.minZ - topo) / planta.altura * alturaImagem,
    largura: visao.largura / planta.largura * larguraImagem,
    altura: visao.altura / planta.altura * alturaImagem,
  };
}

/**
 * Desenha a névoa somente sobre a imagem correspondente às coordenadas de visão.
 * Regiões da planta fora da área calculada ficam cobertas em vez de expor mapa.
 * O recorte é visual/local do mestre; não publica dados para convidados.
 */
export function comporFogNaPlanta3D(ctx, origem, mascara, projecao, largura, altura) {
  if (!projecao) return false;
  const {x, y, largura: pw, altura: ph} = projecao;
  const direita = x + pw, baixo = y + ph;
  const esquerdaVisivel = Math.max(0, Math.min(largura, x));
  const direitaVisivel = Math.max(0, Math.min(largura, direita));
  const topoVisivel = Math.max(0, Math.min(altura, y));
  const baixoVisivel = Math.max(0, Math.min(altura, baixo));
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(origem, 0, 0, largura, altura);
    ctx.fillStyle = '#050913';
    // Quatro faixas externas ao retângulo de visão, inclusive quando a imagem
    // da planta excede a área de terreno utilizada pelos tokens.
    ctx.fillRect(0, 0, largura, topoVisivel);
    ctx.fillRect(0, baixoVisivel, largura, altura - baixoVisivel);
    if (baixoVisivel > topoVisivel) {
      ctx.fillRect(0, topoVisivel, esquerdaVisivel, baixoVisivel - topoVisivel);
      ctx.fillRect(direitaVisivel, topoVisivel, largura - direitaVisivel, baixoVisivel - topoVisivel);
    }
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(x, y, pw, ph);
      ctx.clip();
      ctx.drawImage(mascara, x, y, pw, ph);
    } finally { ctx.restore(); }
    return true;
  } finally { ctx.restore(); }
}

/**
 * Camada de névoa independente: transparente no campo de visão, opaca fora.
 * Diferentemente de comporFogNaPlanta3D, NÃO redesenha a textura do mapa.
 * Isso impede que a alternância Observar troque materiais do piso ou gere
 * uma imagem preta intermediária ao atualizar o canvas/GLB.
 */
export function comporCamadaFogNaPlanta3D(ctx, mascara, projecao, largura, altura) {
  if (!projecao) return false;
  const {x, y, largura: pw, altura: ph} = projecao;
  if (![x,y,pw,ph].every(Number.isFinite) || pw <= 0 || ph <= 0) return false;
  const direita = x + pw, baixo = y + ph;
  const esquerdaVisivel = Math.max(0, Math.min(largura, x));
  const direitaVisivel = Math.max(0, Math.min(largura, direita));
  const topoVisivel = Math.max(0, Math.min(altura, y));
  const baixoVisivel = Math.max(0, Math.min(altura, baixo));
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, largura, altura);
    ctx.fillStyle = '#050913';
    // Faixas fora da referência: devem continuar encobertas.
    ctx.fillRect(0, 0, largura, topoVisivel);
    ctx.fillRect(0, baixoVisivel, largura, altura - baixoVisivel);
    if (baixoVisivel > topoVisivel) {
      ctx.fillRect(0, topoVisivel, esquerdaVisivel, baixoVisivel - topoVisivel);
      ctx.fillRect(direitaVisivel, topoVisivel, largura-direitaVisivel, baixoVisivel-topoVisivel);
    }
    ctx.save();
    try {
      ctx.beginPath();ctx.rect(x, y, pw, ph);ctx.clip();
      ctx.drawImage(mascara, x, y, pw, ph);
    } finally {ctx.restore();}
    return true;
  } finally {ctx.restore();}
}
