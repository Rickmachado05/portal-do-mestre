/**
 * v29.13 — Pré-renderização segura da visão individual no COMPUTADOR DO MESTRE.
 * Nunca envie o mapa original a um convidado em uma cena restrita: as imagens
 * resultantes já têm os pixels fora da visão substituídos por fundo opaco.
 */
import { calcularPoligonoVisao, type BarreiraMapa, type Ponto } from '../lib/lighting';
import { pontoDentroDoPoligono } from '../lib/visaoIndividual';
import { liberadoPelosPinceis } from './pinceisVisao3D';
import { filtrarIdsMiniaturasVisaoIndividual3D } from './miniaturasVisaoIndividual3D';
import {
  decodificarFog,
  COLUNAS_FOG,
  LINHAS_FOG,
  TOTAL_FOG,
  celulasVisiveisFog,
  mapaEstadosFog,
} from '../lib/fogExploracao';
import type { AmbientePublicado } from './ambientePublicado';

export type TokenVisao = { id: string; x: number; y: number; tipo: 'jogador' | 'npc' | 'inimigo' };
export type ObservadorPublicacao = { id: string; x: number; y: number; raio: number };
export type PincelPublicacao = {
  acao: 'revelar' | 'ocultar';
  pontos: { x: number; y: number }[];
  raio: number;
};
export type PontoCena3DPublicavel = { id: string; x: number; y: number; personagemId?: string };
export type VistaPublicacao = {
  personagemId: string;
  imagem: string | null;
  idsVisiveis: string[];
  // A matriz só contém estados 0=oculto, 1=explorado, 2=visível: nunca geometria de paredes.
  mascara3D: string;
  poligono3D?: { x: number; y: number }[];
  objetos3DVisiveis: string[];
  miniaturas3DVisiveis: string[];
};

const MAX_LADO = 850;
// O servidor aceita no máximo 320 KB por recorte. Um cenário detalhado não
// pode simplesmente ficar sem imagem por ultrapassar esse limite.
export const LIMITE_RECORTE_BASE64 = 320_000;
/** Tenta preservar nitidez; só reduz a imagem JÁ CENSURADA quando necessário. */
export function serializarRecorteSeguro(canvas: HTMLCanvasElement): string | null {
  let atual = canvas;
  const escalas = [1, 0.82, 0.68, 0.54, 0.42, 0.32];
  for (const escala of escalas) {
    if (escala !== 1) {
      const reduzido = document.createElement('canvas');
      reduzido.width = Math.max(1, Math.round(canvas.width * escala));
      reduzido.height = Math.max(1, Math.round(canvas.height * escala));
      const ctx = reduzido.getContext('2d', { alpha: false });
      if (!ctx) continue;
      ctx.drawImage(canvas, 0, 0, reduzido.width, reduzido.height);
      atual = reduzido;
    }
    for (const qualidade of [0.67, 0.52, 0.38]) {
      try {
        const texto = atual.toDataURL('image/webp', qualidade);
        if (
          /^data:image\/(?:webp|png|jpeg);base64,/.test(texto) &&
          texto.length <= LIMITE_RECORTE_BASE64
        )
          return texto;
      } catch {
        /* O canvas pode falhar por limitação do navegador. */
      }
    }
  }
  return null;
}
// Cache limitado: movimentos de NPCs não devem redecodificar o mapa nem
// recalcular o bitmap de visão de seis jogadores parados a cada atualização.
let fonteDoCache: string | null = null;
let imagemDoCache: HTMLImageElement | null = null;
const recortesCache = new Map<string, string | null>();
const manterRecorte = (chave: string, valor: string | null) => {
  recortesCache.delete(chave);
  recortesCache.set(chave, valor);
  if (recortesCache.size > 24) recortesCache.delete(recortesCache.keys().next().value!);
};
const limite = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
function desenharPinceis(
  ctx: CanvasRenderingContext2D,
  pinceis: readonly PincelPublicacao[],
  largura: number,
  altura: number,
  manualPuro = false,
) {
  ctx.save();
  // A escala percentual é a mesma usada pelos testes de hit e pela grade 48x48.
  ctx.scale(largura / 100, altura / 100);
  for (const pincel of pinceis) {
    const pontos = pincel.pontos.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!pontos.length) continue;
    ctx.globalCompositeOperation = manualPuro
      ? pincel.acao === 'revelar'
        ? 'source-over'
        : 'destination-out'
      : pincel.acao === 'ocultar'
        ? 'source-over'
        : 'destination-out';
    ctx.strokeStyle = manualPuro ? '#fff' : '#050913';
    ctx.fillStyle = manualPuro ? '#fff' : '#050913';
    ctx.lineWidth = limite(pincel.raio, 0, 100) * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pontos.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    if (pontos.length === 1) {
      ctx.beginPath();
      ctx.arc(pontos[0].x, pontos[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
function caminhoPoligono(ctx: CanvasRenderingContext2D, poligono: Ponto[]) {
  ctx.beginPath();
  poligono.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}
let assinaturaCamadaLuz = '';
let ultimoBitmapLuz: HTMLCanvasElement | null = null;
function camadaLuzDaCena(
  ambiente: AmbientePublicado,
  largura: number,
  altura: number,
  barreiras: BarreiraMapa[],
): HTMLCanvasElement | null {
  if (!ambiente.iluminacao?.ativa) return null;
  const opacidade = Math.max(
    0,
    Math.min(0.95, (0.95 * (100 - ambiente.iluminacao.ambiente)) / 100),
  );
  if (opacidade <= 0) return null;
  const chave = JSON.stringify({ largura, altura, opacidade, luzes: ambiente.luzes, barreiras });
  if (chave === assinaturaCamadaLuz && ultimoBitmapLuz) return ultimoBitmapLuz;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = `rgba(0,3,16,${opacidade})`;
  ctx.fillRect(0, 0, largura, altura);
  for (const emissor of ambiente.luzes || []) {
    if (!emissor.ativa) continue;
    const x = (emissor.x * largura) / 100,
      y = (emissor.y * altura) / 100;
    const raio = Math.max(1, (emissor.alcance * largura) / 100);
    const poligono = calcularPoligonoVisao(
      emissor.x,
      emissor.y,
      emissor.alcance,
      barreiras,
      largura,
      altura,
    );
    if (poligono.length < 3) continue;
    ctx.save();
    caminhoPoligono(ctx, poligono);
    ctx.clip();
    ctx.globalCompositeOperation = 'destination-out';
    const transparencia = ctx.createRadialGradient(x, y, 0, x, y, raio);
    transparencia.addColorStop(0, 'rgba(0,0,0,1)');
    transparencia.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = transparencia;
    ctx.fillRect(x - raio, y - raio, 2 * raio, 2 * raio);
    ctx.globalCompositeOperation = 'source-over';
    const brilho = ctx.createRadialGradient(x, y, 0, x, y, raio);
    const hex = /^#[0-9a-f]{6}$/i.test(emissor.cor) ? emissor.cor : '#ffd48b';
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    brilho.addColorStop(0, `rgba(${r},${g},${b},.16)`);
    brilho.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = brilho;
    ctx.fillRect(x - raio, y - raio, 2 * raio, 2 * raio);
    ctx.restore();
  }
  assinaturaCamadaLuz = chave;
  ultimoBitmapLuz = canvas;
  return canvas;
}

/** Ambiente desenhado ANTES do corte de visão: nada fora do polígono
 * é enviado ao convidado, inclusive nomes de marcações ou focos de luz.
 */
function desenharAmbienteDentroDaVisao(
  ctx: CanvasRenderingContext2D,
  ambiente: AmbientePublicado | undefined,
  largura: number,
  altura: number,
  barreiras: BarreiraMapa[],
  visao: Ponto[],
  pinceis: readonly PincelPublicacao[],
  liberadoInicial = true,
) {
  if (!ambiente) return;
  // Desenhos: coordenadas percentuais do terreno, sem comandos interativos.
  for (const traco of ambiente.desenhos || []) {
    if (!traco.pontos.length) continue;
    ctx.beginPath();
    ctx.strokeStyle = traco.cor;
    ctx.lineWidth = Math.max(0.6, Math.min(12, traco.espessura));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traco.pontos.forEach((p, i) => {
      const x = (p.x * largura) / 100,
        y = (p.y * altura) / 100;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  for (const marcador of ambiente.marcadores || []) {
    const x = (marcador.x * largura) / 100,
      y = (marcador.y * altura) / 100;
    // Não mostrar nem fragmentos de nomes de marcadores que estejam fora da
    // visão: o texto pode ultrapassar a borda do polígono com seu tamanho.
    if (
      !pontoDentroDoPoligono({ x, y }, visao) ||
      !liberadoPelosPinceis({ x, y }, pinceis, largura, altura, liberadoInicial)
    )
      continue;
    ctx.save();
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#f0bf73';
    ctx.strokeStyle = '#4c321e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#151515';
    ctx.lineWidth = 3;
    ctx.strokeText(marcador.texto, x + 8, y);
    ctx.fillStyle = '#f4d9a4';
    ctx.fillText(marcador.texto, x + 8, y);
    ctx.restore();
  }
  // A camada luminosa depende apenas das fontes e das paredes, não do
  // observador: reaproveitar a mesma rasterização para vários convidados.
  const camada = camadaLuzDaCena(ambiente, largura, altura, barreiras);
  if (camada) ctx.drawImage(camada, 0, 0);
}

/** A máscara não é apenas CSS: o bitmap entregue ao jogador já está filtrado. */
export async function gerarVistasIndividuais(args: {
  imagem: string | null;
  aspecto: number;
  barreiras: BarreiraMapa[];
  observadores: ObservadorPublicacao[];
  tokens: TokenVisao[];
  modo: 'nevoa' | 'visao' | 'nevoa_visao' | 'exploracao';
  pinceis?: PincelPublicacao[];
  exploracaoPorToken?: Record<string, string>;
  ambiente?: AmbientePublicado;
  objetos3D?: PontoCena3DPublicavel[];
  miniaturas3D?: PontoCena3DPublicavel[];
  modo3D?: boolean;
  dimensoesVisao3D?: { largura: number; altura: number };
}): Promise<VistaPublicacao[]> {
  let imagem: HTMLImageElement | null = null;
  if (args.imagem && args.imagem === fonteDoCache) imagem = imagemDoCache;
  else if (args.imagem) {
    fonteDoCache = args.imagem;
    imagemDoCache = null;
    recortesCache.clear();
    try {
      const atual = new Image();
      await new Promise<void>((resolve, reject) => {
        atual.onload = () => resolve();
        atual.onerror = () => reject(new Error('Imagem do mapa não disponível'));
        atual.src = args.imagem!;
      });
      imagem = atual;
      imagemDoCache = atual;
    } catch {
      imagem = null;
    }
  }
  const aspecto =
    Number.isFinite(args.aspecto) && args.aspecto > 0.3 && args.aspecto < 4 ? args.aspecto : 1.6;
  const largura = imagem
    ? Math.min(MAX_LADO, imagem.naturalWidth)
    : Math.min(MAX_LADO, Math.round(650 * aspecto));
  const altura = imagem
    ? Math.max(1, Math.round((largura * imagem.naturalHeight) / Math.max(1, imagem.naturalWidth)))
    : Math.round(largura / aspecto);
  const pinceis = args.modo === 'visao' ? [] : args.pinceis || [];
  const saida: VistaPublicacao[] = [];
  for (const observador of args.observadores) {
    const manualPuro = args.modo === 'nevoa';
    // Névoa exclusivamente manual: o mestre revela com o pincel, sem raio
    // automático. Nos outros modos a linha de visão continua obrigatória.
    // O mestre calcula o raio usando a razão real do TERRENO 3D, não a
    // razão da foto do mapa. Fazemos a mesma conta e só depois convertemos
    // para pixels do recorte, mantendo a mesma silhueta nas duas mesas.
    const dim3D =
      args.modo3D && args.dimensoesVisao3D?.largura && args.dimensoesVisao3D?.altura
        ? args.dimensoesVisao3D
        : { largura, altura };
    const poligonoMundo = manualPuro
      ? [
          { x: 0, y: 0 },
          { x: dim3D.largura, y: 0 },
          { x: dim3D.largura, y: dim3D.altura },
          { x: 0, y: dim3D.altura },
        ]
      : calcularPoligonoVisao(
          observador.x,
          observador.y,
          limite(observador.raio, 2, 50),
          args.barreiras,
          dim3D.largura,
          dim3D.altura,
        );
    const poligono = poligonoMundo.map((p) => ({
      x: (p.x / dim3D.largura) * largura,
      y: (p.y / dim3D.altura) * altura,
    }));
    const idsVisiveis = args.tokens
      .filter(
        (t) =>
          t.id === observador.id ||
          (pontoDentroDoPoligono({ x: (t.x * largura) / 100, y: (t.y * altura) / 100 }, poligono) &&
            liberadoPelosPinceis(
              { x: (t.x * largura) / 100, y: (t.y * altura) / 100 },
              pinceis,
              largura,
              altura,
              !manualPuro,
            )),
      )
      .map((t) => t.id);
    // Mesma linha de visão e mesma memória exploratória da Mesa 2D.
    // O recorte do piso já é censurado no mestre; a máscara protege também
    // os materiais do chão e elimina a possibilidade de ver por cima dos muros.
    const dim = { largura, altura };
    const campo = manualPuro ? new Uint8Array(TOTAL_FOG) : celulasVisiveisFog([poligono], dim);
    const estados = mapaEstadosFog(
      args.modo === 'exploracao'
        ? { [observador.id]: args.exploracaoPorToken?.[observador.id] ?? '' }
        : {},
      args.modo === 'exploracao' ? [observador.id] : [],
      campo,
      pinceis,
    );
    // Nunca aceitar que uma revelação manual mostre conteúdo por trás de uma parede:
    // fora do polígono, um pincel não transforma uma célula em visível.
    if (!manualPuro)
      for (let i = 0; i < TOTAL_FOG; i++) if (!campo[i] && estados[i] === 2) estados[i] = 0;
    const mascara3D = Array.from(estados).join('');
    // O mestre desenha a visão simples como polígono contínuo, não como
    // células do Fog. Compartilhar apenas a SILHUETA visível deste jogador
    // permite que a borda seja exatamente a mesma, sem enviar as paredes.
    const poligono3D =
      (args.modo === 'visao' || args.modo === 'nevoa_visao') && poligono.length >= 3
        ? poligono.map((p) => ({
            x: Math.max(0, Math.min(100, (p.x / largura) * 100)),
            y: Math.max(0, Math.min(100, (p.y / altura) * 100)),
          }))
        : undefined;
    const emVisao = (p: PontoCena3DPublicavel) =>
      p.id.length > 0 &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      p.x >= 0 &&
      p.x <= 100 &&
      p.y >= 0 &&
      p.y <= 100 &&
      pontoDentroDoPoligono({ x: (p.x * largura) / 100, y: (p.y * altura) / 100 }, poligono) &&
      liberadoPelosPinceis(
        { x: (p.x * largura) / 100, y: (p.y * altura) / 100 },
        pinceis,
        largura,
        altura,
        !manualPuro,
      );
    const objetos3DVisiveis = (args.objetos3D || []).filter(emVisao).map((p) => p.id);
    const miniaturas3DVisiveis = filtrarIdsMiniaturasVisaoIndividual3D(
      args.miniaturas3D || [],
      new Set(idsVisiveis),
      emVisao,
      observador.id,
    );
    const chaveRecorte = JSON.stringify({
      id: observador.id,
      x: observador.x,
      y: observador.y,
      raio: observador.raio,
      modo: args.modo,
      barreiras: args.barreiras,
      pinceis,
      memoria: args.exploracaoPorToken?.[observador.id],
      dim3D,
      ambiente: {
        iluminacao: args.ambiente?.iluminacao,
        luzes: args.ambiente?.luzes,
        marcadores: args.ambiente?.marcadores,
        desenhos: args.ambiente?.desenhos,
      },
      largura,
      altura,
    });
    let data: string | null = recortesCache.get(chaveRecorte) ?? null;
    if (!recortesCache.has(chaveRecorte) && imagem && poligono.length >= 3) {
      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#050913';
        ctx.fillRect(0, 0, largura, altura);
        if (manualPuro) {
          // O bitmap transmitido é sempre censurado na origem. O fundo começa
          // preto; só os pixels que o mestre realmente revelou recebem arte.
          const mascara = document.createElement('canvas');
          mascara.width = largura;
          mascara.height = altura;
          const ctxMascara = mascara.getContext('2d');
          if (ctxMascara) {
            desenharPinceis(ctxMascara, pinceis, largura, altura, true);
            const conteudo = document.createElement('canvas');
            conteudo.width = largura;
            conteudo.height = altura;
            const ctxConteudo = conteudo.getContext('2d');
            if (ctxConteudo) {
              ctxConteudo.drawImage(imagem, 0, 0, largura, altura);
              desenharAmbienteDentroDaVisao(
                ctxConteudo,
                args.ambiente,
                largura,
                altura,
                args.barreiras,
                poligono,
                pinceis,
                false,
              );
              ctxConteudo.globalCompositeOperation = 'destination-in';
              ctxConteudo.drawImage(mascara, 0, 0);
              ctx.drawImage(conteudo, 0, 0);
            }
          }
        } else if (args.modo === 'exploracao') {
          // A memória individual fica visível escurecida; nunca compartilhamos
          // descobertas de outros personagens. A área atual recebe luz normal.
          const bits = decodificarFog(args.exploracaoPorToken?.[observador.id]);
          ctx.save();
          ctx.beginPath();
          const cw = largura / COLUNAS_FOG,
            ch = altura / LINHAS_FOG;
          for (let n = 0; n < COLUNAS_FOG * LINHAS_FOG; n++) {
            if (bits[n >> 3] & (1 << (n & 7)))
              ctx.rect((n % COLUNAS_FOG) * cw, Math.floor(n / COLUNAS_FOG) * ch, cw, ch);
          }
          ctx.clip();
          // O bitmap censurado é agora a ÚNICA camada de Fog no jogador 3D.
          // Pintar a memória com opacidade baixa preserva o cinza explorado,
          // sem precisar de uma película 3D sujeita a z-fighting.
          ctx.globalAlpha = 0.27;
          ctx.drawImage(imagem, 0, 0, largura, altura);
          ctx.restore();
        }
        if (!manualPuro) {
          ctx.save();
          caminhoPoligono(ctx, poligono);
          ctx.clip();
          ctx.drawImage(imagem, 0, 0, largura, altura);
          desenharAmbienteDentroDaVisao(
            ctx,
            args.ambiente,
            largura,
            altura,
            args.barreiras,
            poligono,
            pinceis,
          );
          ctx.restore();
        }
        // Pincéis ocultam também áreas da memória explorada, sem revelar nada
        // fora do polígono de visão corrente. A revelação apaga apenas um
        // pincel anterior, e não a máscara de linha de visão.
        if (pinceis.length && !manualPuro) {
          const camada = document.createElement('canvas');
          camada.width = largura;
          camada.height = altura;
          const pincelCtx = camada.getContext('2d');
          if (pincelCtx) {
            desenharPinceis(pincelCtx, pinceis, largura, altura);
            ctx.drawImage(camada, 0, 0);
          }
        }
        data = serializarRecorteSeguro(canvas); // Nunca usar imagem original como fallback.
        manterRecorte(chaveRecorte, data);
      }
    }
    saida.push({
      personagemId: observador.id,
      imagem: data,
      idsVisiveis,
      mascara3D,
      poligono3D,
      objetos3DVisiveis,
      miniaturas3DVisiveis,
    });
  }
  return saida;
}
