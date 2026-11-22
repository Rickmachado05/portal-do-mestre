import { useEffect, useRef, useState } from 'react';

/**
 * Recompõe a transparência que não sobrevive ao WebRTC/MediaRecorder:
 * o vídeo recebido contém RGB sobre preto na metade esquerda e máscara alfa
 * em escala de cinza na metade direita. Nenhum chroma key/color key é usado.
 * Isto é apenas a apresentação do lançamento ORIGINAL, sem outra física.
 */
type Props = {
  stream?: MediaStream;
  src?: string;
  onPrimeiroFrame?: () => void;
  onParou?: () => void;
  onFim?: () => void;
  descricao: string;
};

const VERTEX = `
  attribute vec2 posicao;
  varying vec2 uv;
  void main(){uv=(posicao+1.0)*0.5;gl_Position=vec4(posicao,0.0,1.0);}
`;
const FRAGMENT = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D imagem;
  void main(){
    // O vídeo é composto por dois painéis iguais: RGB + alfa.
    vec3 rgbPremultiplicado=texture2D(imagem,vec2(uv.x*0.5,uv.y)).rgb;
    vec3 mascara=texture2D(imagem,vec2(0.5+uv.x*0.5,uv.y)).rgb;
    float alfa=clamp(dot(mascara,vec3(0.299,0.587,0.114)),0.0,1.0);
    // A metade RGB JÁ está pré-multiplicada pela transparência original,
    // pois foi desenhada sobre preto na captura. NÃO dividi-la pelo alfa:
    // codecs de vídeo arredondam o alfa e a divisão amplifica fortemente o
    // ruído em arestas, criando manchas coloridas e detalhes piscando.
    // A saída WebGL também é pré-multiplicada (premultipliedAlpha:true).
    // Suprimir APENAS resíduos praticamente invisíveis de compressão;
    // preservar o alfa de bordas e sombras reais acima de ~8%.
    float limpeza=smoothstep(0.012,0.085,alfa);
    // O codec pode gerar RGB ligeiramente maior que o alfa nas bordas.
    // Impedir cores impossíveis para o formato pré-multiplicado.
    gl_FragColor=vec4(min(rgbPremultiplicado,vec3(alfa))*limpeza,alfa*limpeza);
  }
`;

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const shader = gl.createShader(tipo);
  if (!shader) throw new Error('Shader de vídeo indisponível.');
  gl.shaderSource(shader, fonte);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const mensagem = gl.getShaderInfoLog(shader) || 'Erro na composição do vídeo.';
    gl.deleteShader(shader);
    throw new Error(mensagem);
  }
  return shader;
}

export default function VideoDadosSemFundo({
  stream,
  src,
  onPrimeiroFrame,
  onParou,
  onFim,
  descricao,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbacks = useRef({ onPrimeiroFrame, onParou, onFim });
  callbacks.current = { onPrimeiroFrame, onParou, onFim };
  const [modo2d, setModo2d] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.removeAttribute('src');
      video.srcObject = stream;
    } else {
      video.srcObject = null;
      if (src) video.src = src;
    }
    void video.play().catch(() => undefined);
    return () => {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [stream, src]);

  useEffect(() => {
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || !canvas) return;

    const iniciarModo2d = () => {
      // Um contexto WebGL não pode ser convertido em 2D no mesmo canvas.
      // O key abaixo garante um canvas novo quando mudamos de modo.
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.warn('[Portal/Dados] Reprodução transparente indisponível.');
        return;
      }
      const buffer = document.createElement('canvas');
      const bctx = buffer.getContext('2d', { willReadFrequently: true });
      if (!bctx) {
        console.warn('[Portal/Dados] Compositor 2D indisponível.');
        return;
      }
      let frame = 0,
        ativo = true,
        primeiro = false,
        ultimo = 0;
      const desenhar = (tempo: number) => {
        if (!ativo) return;
        frame = requestAnimationFrame(desenhar);
        if (tempo - ultimo < 30) return;
        ultimo = tempo;
        if (
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          !video.videoWidth ||
          !video.videoHeight
        )
          return;
        const wVideo = Math.floor(video.videoWidth / 2);
        const escala = Math.min(1, 960 / Math.max(1, wVideo), 540 / video.videoHeight);
        const w = Math.max(1, Math.round(wVideo * escala));
        const h = Math.max(1, Math.round(video.videoHeight * escala));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        try {
          // Ler as duas metades com um canvas temporário para extrair a máscara.
          if (buffer.width !== w * 2 || buffer.height !== h) {
            buffer.width = w * 2;
            buffer.height = h;
          }
          bctx.drawImage(video, 0, 0, w * 2, h);
          const dados = bctx.getImageData(0, 0, w * 2, h).data;
          const saida = ctx.createImageData(w, h);
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              const a = (y * w * 2 + x) * 4;
              const m = (y * w * 2 + x + w) * 4;
              const o = (y * w + x) * 4;
              const alfa = Math.max(
                0,
                Math.min(1, (0.299 * dados[m] + 0.587 * dados[m + 1] + 0.114 * dados[m + 2]) / 255),
              );
              // Canvas 2D recebe cor NÃO pré-multiplicada; compensar sem
              // amplificar resíduos nas regiões quase transparentes.
              const limpeza =
                alfa <= 0.012
                  ? 0
                  : alfa >= 0.085
                    ? 1
                    : ((alfa - 0.012) / (0.085 - 0.012)) ** 2 *
                      (3 - 2 * ((alfa - 0.012) / (0.085 - 0.012)));
              const divisor = Math.max(alfa, 0.12);
              saida.data[o] = Math.min(255, Math.round(dados[a] / divisor));
              saida.data[o + 1] = Math.min(255, Math.round(dados[a + 1] / divisor));
              saida.data[o + 2] = Math.min(255, Math.round(dados[a + 2] / divisor));
              saida.data[o + 3] = Math.round(alfa * limpeza * 255);
            }
          ctx.putImageData(saida, 0, 0);
          if (!primeiro) {
            primeiro = true;
            callbacks.current.onPrimeiroFrame?.();
          }
        } catch (e) {
          console.warn('[Portal/Dados] Falha no compositor de vídeo 2D:', e);
        }
      };
      frame = requestAnimationFrame(desenhar);
      return () => {
        ativo = false;
        cancelAnimationFrame(frame);
      };
    };
    if (modo2d) return iniciarModo2d();

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });
    if (!gl) {
      setModo2d(true);
      return;
    }
    let vert: WebGLShader | undefined,
      frag: WebGLShader | undefined,
      prog: WebGLProgram | null = null,
      buffer: WebGLBuffer | null = null,
      textura: WebGLTexture | null = null;
    let frame = 0,
      primeiro = false,
      ativo = true,
      ultimoQuadro = 0;
    try {
      vert = compilar(gl, gl.VERTEX_SHADER, VERTEX);
      frag = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      prog = gl.createProgram();
      if (!prog) throw Error('Não foi possível compor a imagem dos dados.');
      gl.attachShader(prog, vert);
      gl.attachShader(prog, frag);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(prog) || 'Shader não conectado.');
      gl.useProgram(prog);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(prog, 'posicao');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      textura = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.uniform1i(gl.getUniformLocation(prog, 'imagem'), 0);
      gl.clearColor(0, 0, 0, 0);
      gl.disable(gl.DEPTH_TEST);
    } catch (e) {
      console.warn('[Portal/Dados] Compositor WebGL indisponível, usando Canvas 2D:', e);
      if (textura) gl.deleteTexture(textura);
      if (buffer) gl.deleteBuffer(buffer);
      if (prog) gl.deleteProgram(prog);
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      setModo2d(true);
      return;
    }
    const desenhar = (tempo: number) => {
      if (!ativo) return;
      if (tempo - ultimoQuadro < 30) {
        frame = window.requestAnimationFrame(desenhar);
        return;
      }
      ultimoQuadro = tempo;
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth >= 2 &&
        video.videoHeight > 0
      ) {
        const largura = Math.max(1, Math.floor(video.videoWidth / 2));
        const altura = video.videoHeight;
        if (canvas.width !== largura || canvas.height !== altura) {
          canvas.width = largura;
          canvas.height = altura;
          gl.viewport(0, 0, largura, altura);
        }
        try {
          gl.bindTexture(gl.TEXTURE_2D, textura);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (!primeiro) {
            primeiro = true;
            callbacks.current.onPrimeiroFrame?.();
          }
        } catch (e) {
          console.warn('[Portal/Dados] Falha na composição do vídeo, usando Canvas 2D:', e);
          ativo = false;
          setModo2d(true);
          return;
        }
      }
      frame = window.requestAnimationFrame(desenhar);
    };
    frame = window.requestAnimationFrame(desenhar);
    return () => {
      ativo = false;
      window.cancelAnimationFrame(frame);
      if (textura) gl.deleteTexture(textura);
      if (buffer) gl.deleteBuffer(buffer);
      if (prog) gl.deleteProgram(prog);
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
    };
  }, [modo2d]);

  return (
    <>
      <video
        ref={videoRef}
        className="pm-mp-video-source"
        autoPlay
        muted
        playsInline
        onStalled={() => callbacks.current.onParou?.()}
        onEnded={() => callbacks.current.onFim?.()}
        aria-label={descricao}
      />
      <canvas
        key={modo2d ? 'compositor-2d' : 'compositor-webgl'}
        ref={canvasRef}
        className="pm-mp-video-original pm-mp-video-composited"
        aria-hidden="true"
      />
    </>
  );
}
