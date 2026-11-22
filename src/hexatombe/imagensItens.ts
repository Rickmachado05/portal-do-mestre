/** Imagens opcionais de itens. Pequenas imagens inline são armazenadas com o
 * catálogo/inventário e seguem automaticamente no backup local do mestre.
 * Não aceita SVG, GIF, URLs externas nem arquivos excessivamente grandes.
 */
export const MAX_ARQUIVO_ITEM = 8 * 1024 * 1024;
export const MAX_IMAGEM_ITEM_CHARS = 190_000; // ~140 KB de dados base64 por miniatura
const TIPOS = new Set(['image/png', 'image/jpeg', 'image/webp']);
const DATA_URI = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function imagemItemValida(imagem: unknown): imagem is string {
  if (typeof imagem !== 'string' || imagem.length > MAX_IMAGEM_ITEM_CHARS || imagem.length < 32)
    return false;
  const match = DATA_URI.exec(imagem);
  return !!match && match[1].length % 4 === 0;
}

async function abrirImagem(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      imagem.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Redimensiona e comprime no navegador; não envia nenhum dado a servidores. */
export async function processarImagemItem(file: File): Promise<string> {
  if (!TIPOS.has(file.type)) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
  if (file.size > MAX_ARQUIVO_ITEM) throw new Error('A imagem deve ter no máximo 8 MB.');
  if (!file.size) throw new Error('O arquivo de imagem está vazio.');
  const imagem = await abrirImagem(file);
  if (
    !imagem.naturalWidth ||
    !imagem.naturalHeight ||
    imagem.naturalWidth > 8192 ||
    imagem.naturalHeight > 8192
  )
    throw new Error('Dimensões de imagem inválidas ou muito grandes.');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não suporta processamento de imagens.');
  for (const tamanho of [360, 320, 256, 192, 144, 112]) {
    const escala = Math.min(1, tamanho / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    for (const qualidade of [0.84, 0.72, 0.57]) {
      const webp = canvas.toDataURL('image/webp', qualidade);
      const suportouWebp = webp.startsWith('data:image/webp');
      if (imagemItemValida(webp)) return webp;
      // Navegadores sem suporte WebP retornam data:image/png mesmo quando solicitado.
      if (!suportouWebp) {
        const png = canvas.toDataURL('image/png');
        if (imagemItemValida(png)) return png;
        break;
      }
    }
  }
  throw new Error(
    'Não foi possível compactar a imagem para o armazenamento local. Tente outra imagem.',
  );
}

/** Uma página de documento mantém resolução maior que a miniatura, mas continua
 * portátil no inventário e no backup. Somente PNG/JPEG/WebP inline. */
export const MAX_IMAGEM_CONTEUDO_CHARS = 650_000;
export function imagemConteudoValida(imagem: unknown): imagem is string {
  if (typeof imagem !== 'string' || imagem.length > MAX_IMAGEM_CONTEUDO_CHARS || imagem.length < 32)
    return false;
  const match = DATA_URI.exec(imagem);
  return !!match && match[1].length % 4 === 0;
}

export async function processarImagemConteudoItem(file: File): Promise<string> {
  if (!TIPOS.has(file.type)) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
  if (!file.size || file.size > MAX_ARQUIVO_ITEM)
    throw new Error('A imagem deve ter no máximo 8 MB.');
  const imagem = await abrirImagem(file);
  if (
    !imagem.naturalWidth ||
    !imagem.naturalHeight ||
    imagem.naturalWidth > 8192 ||
    imagem.naturalHeight > 8192
  )
    throw new Error('Dimensões de imagem inválidas ou muito grandes.');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não suporta processamento de imagens.');
  for (const tamanho of [1400, 1200, 1000, 800, 640, 480]) {
    const escala = Math.min(1, tamanho / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    for (const qualidade of [0.87, 0.76, 0.62, 0.48]) {
      const webp = canvas.toDataURL('image/webp', qualidade);
      if (imagemConteudoValida(webp)) return webp;
      if (!webp.startsWith('data:image/webp')) {
        const png = canvas.toDataURL('image/png');
        if (imagemConteudoValida(png)) return png;
        break;
      }
    }
  }
  throw new Error('Esta imagem é grande demais para o conteúdo local. Tente um arquivo menor.');
}
