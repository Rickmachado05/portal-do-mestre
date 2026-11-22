/**
 * Captura com cor e alfa em dois painéis do MESMO vídeo.
 *
 * Os codecs WebRTC/MediaRecorder não conservam o canal alfa do canvas WebGL.
 * Chroma key verde introduzia manchas verdes/roxas, sobretudo em dados com
 * sombras, reflexos e pinturas personalizadas. Em vez de usar uma cor-chave,
 * enviamos a imagem sobre preto à esquerda e sua máscara alfa à direita.
 *
 * Só captura a rolagem física original: NÃO altera o Dice Box ou sorteia faces.
 * O receptor recompõe RGB + alfa em VideoDadosSemFundo.tsx.
 */
export function capturarDadosComAlfaSeparado(
  origem: HTMLCanvasElement,
  fps = 30,
): {
  stream: MediaStream;
  parar: () => void;
} {
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d', { alpha: false });
  if (!contexto) throw new Error('Canvas de composição indisponível.');
  const mascara = document.createElement('canvas');
  const contextoMascara = mascara.getContext('2d', { alpha: true });
  if (!contextoMascara) throw new Error('Canvas de alfa indisponível.');

  // Dois painéis de 960×540 cabem em um quadro de 1920×540. O segundo painel
  // é praticamente preto/branco e comprime bem, sem contaminar a cor do dado.
  // Definir dimensões antes de criar a faixa WebRTC: alguns navegadores fixam
  // a resolução no primeiro quadro capturado.
  const escalaInicial = Math.min(
    1,
    960 / Math.max(1, origem.width),
    540 / Math.max(1, origem.height),
  );
  const larguraInicial = Math.max(1, Math.round(origem.width * escalaInicial));
  const alturaInicial = Math.max(1, Math.round(origem.height * escalaInicial));
  canvas.width = larguraInicial * 2;
  canvas.height = alturaInicial;
  mascara.width = larguraInicial;
  mascara.height = alturaInicial;
  let ativo = true;
  let quadro = 0;
  let ultimo = -Infinity;
  const desenhar = (tempo: number) => {
    if (!ativo) return;
    quadro = requestAnimationFrame(desenhar);
    if (tempo - ultimo < 1000 / fps) return;
    ultimo = tempo;
    const escala = Math.min(1, 960 / Math.max(1, origem.width), 540 / Math.max(1, origem.height));
    const w = Math.max(1, Math.round(origem.width * escala));
    const h = Math.max(1, Math.round(origem.height * escala));
    if (canvas.width !== w * 2 || canvas.height !== h) {
      canvas.width = w * 2;
      canvas.height = h;
    }
    if (mascara.width !== w || mascara.height !== h) {
      mascara.width = w;
      mascara.height = h;
    }
    // O fundo opaco preto só existe nos quadros transmitidos, não no Dice Box.
    contexto.fillStyle = '#000000';
    contexto.fillRect(0, 0, w * 2, h);
    try {
      // Esquerda: RGB premultiplicado sobre preto (sem verde artificial).
      contexto.drawImage(origem, 0, 0, w, h);
      // Direita: máscara branca mantendo a transparência do canvas original.
      contextoMascara.clearRect(0, 0, w, h);
      contextoMascara.globalCompositeOperation = 'source-over';
      contextoMascara.drawImage(origem, 0, 0, w, h);
      contextoMascara.globalCompositeOperation = 'source-in';
      contextoMascara.fillStyle = '#ffffff';
      contextoMascara.fillRect(0, 0, w, h);
      contextoMascara.globalCompositeOperation = 'source-over';
      contexto.drawImage(mascara, w, 0, w, h);
    } catch (e) {
      console.warn('[Portal/Dados] Quadro de vídeo temporariamente indisponível:', e);
    }
  };
  desenhar(performance.now());
  const stream = canvas.captureStream(fps);
  return {
    stream,
    parar: () => {
      ativo = false;
      cancelAnimationFrame(quadro);
    },
  };
}
