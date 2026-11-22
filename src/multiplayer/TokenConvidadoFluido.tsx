import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { registrarPosicao, amostrarPosicao, ATRASO_VISUAL_MS } from './interpolacaoRemota.mjs';
import type { AmostraPosicao } from './interpolacaoRemota.mjs';
import { assinarArrasto } from './arrastoRemoto.mjs';
import type { ArrastoRemoto } from './arrastoRemoto.mjs';
import type { TokenPublico } from './api';
import { CorpoTokenCena2D } from '../lib/CenaVisual2D';
import '../lib/tokenIdle.css';

type Props = {
  cenaId: string;
  token: TokenPublico;
  proprio: boolean;
  controlavel: boolean;
  arrasto: { x: number; y: number } | null;
  midiaUrl?: string;
  onTokenDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onTokenMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onTokenUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
};

/**
 * O mouse serve apenas para solicitar movimento. Paredes são privadas e
 * validadas no mestre: uma prévia SSE não pode deslocar o token, local ou
 * remoto, antes da posição correspondente ser publicada como autorizada.
 * As posições confirmadas continuam recebendo interpolação curta.
 */
function previewInvalida(evento: ArrastoRemoto, sequenciaAnterior?: number) {
  return (
    !Number.isFinite(evento.x) ||
    !Number.isFinite(evento.y) ||
    (sequenciaAnterior !== undefined && evento.sequencia <= sequenciaAnterior)
  );
}

export default function TokenConvidadoFluido({
  cenaId,
  token,
  proprio,
  controlavel,
  arrasto,
  midiaUrl,
  onTokenDown,
  onTokenMove,
  onTokenUp,
}: Props) {
  const elemento = useRef<HTMLDivElement | null>(null);
  const animacao = useRef<number | null>(null);
  const estado = useRef<{
    cenaId: string;
    amostras: AmostraPosicao[];
    ultimo: { x: number; y: number };
    arrastando: boolean;
  } | null>(null);
  const previaRemota = useRef<{
    sequencia: number;
    ultimoEm: number;
    x: number;
    y: number;
    final: boolean;
  } | null>(null);
  const timeoutPrevia = useRef<number | null>(null);
  const oficial = useRef({ x: token.x, y: token.y });
  oficial.current = { x: token.x, y: token.y };
  useLayoutEffect(() => {
    if (proprio) return;
    const desenhar = (x: number, y: number) => {
      const el = elemento.current;
      if (!el) return;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
    };
    const limparTimer = () => {
      if (timeoutPrevia.current !== null) window.clearTimeout(timeoutPrevia.current);
      timeoutPrevia.current = null;
    };
    const desassinar = assinarArrasto(cenaId, token.id, (evento: ArrastoRemoto) => {
      if (previewInvalida(evento, previaRemota.current?.sequencia)) return;
      // Os eventos de arrasto são emitidos pelo servidor ANTES da validação
      // de paredes. Só é seguro desenhar os que já coincidem com a posição
      // oficial atual: evita que observadores vejam atravessar e voltar.
      if (Math.hypot(evento.x - oficial.current.x, evento.y - oficial.current.y) > 0.01) return;
      const agora = performance.now();
      previaRemota.current = {
        sequencia: evento.sequencia,
        ultimoEm: agora,
        x: evento.x,
        y: evento.y,
        final: evento.final,
      };
      if (animacao.current !== null) cancelAnimationFrame(animacao.current);
      animacao.current = null;
      // O navegador observador usa diretamente o mesmo gesto do ponteiro:
      // não interpola entre pontos nem cria uma trajetória atrasada.
      desenhar(evento.x, evento.y);
      estado.current = {
        cenaId,
        amostras: [{ x: evento.x, y: evento.y, t: agora }],
        ultimo: { x: evento.x, y: evento.y },
        arrastando: false,
      };
      limparTimer();
      // Se a mensagem final foi recebida, aguardar brevemente o mestre validar
      // a posição. Sem confirmação, prevalece o estado oficial.
      timeoutPrevia.current = window.setTimeout(
        () => {
          const previa = previaRemota.current;
          if (!previa || previa.sequencia !== evento.sequencia) return;
          previaRemota.current = null;
          const destino = oficial.current;
          estado.current = {
            cenaId,
            amostras: [{ x: destino.x, y: destino.y, t: performance.now() }],
            ultimo: destino,
            arrastando: false,
          };
          // Correções administrativas ou colisões só devem ajustar o fim do
          // movimento. Evita um 'teleporte' ao soltar o ponteiro.
          const inicio = performance.now(),
            origem = { x: previa.x, y: previa.y };
          if (Math.hypot(destino.x - origem.x, destino.y - origem.y) < 0.08) {
            desenhar(destino.x, destino.y);
            return;
          }
          const corrigir = (tempo: number) => {
            const t = Math.min(1, (tempo - inicio) / 125),
              f = t * t * (3 - 2 * t);
            desenhar(origem.x + (destino.x - origem.x) * f, origem.y + (destino.y - origem.y) * f);
            animacao.current = t < 1 ? requestAnimationFrame(corrigir) : null;
          };
          animacao.current = requestAnimationFrame(corrigir);
        },
        evento.final ? 900 : 900,
      );
    });
    return () => {
      desassinar();
      limparTimer();
      previaRemota.current = null;
    };
  }, [cenaId, token.id, proprio]);
  useLayoutEffect(() => {
    const el = elemento.current;
    if (!el) return;
    const agora = performance.now();
    const posicao = arrasto || { x: token.x, y: token.y };
    const desenhar = (x: number, y: number) => {
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
    };
    const cancelar = () => {
      if (animacao.current !== null) cancelAnimationFrame(animacao.current);
      animacao.current = null;
    };
    // Nova cena / novo token: entrar diretamente no lugar correto.
    if (!estado.current || estado.current.cenaId !== cenaId) {
      cancelar();
      estado.current = {
        cenaId,
        amostras: [{ ...posicao, t: agora }],
        ultimo: posicao,
        arrastando: Boolean(arrasto),
      };
      desenhar(posicao.x, posicao.y);
      return;
    }
    const atual = estado.current;
    // A publicação oficial pode chegar alguns quadros ATRÁS da prévia direta.
    // Não fazer o token recuar enquanto outra pessoa ainda está arrastando.
    if (!proprio && previaRemota.current) {
      const previa = previaRemota.current;
      if (Math.hypot(token.x - previa.x, token.y - previa.y) < 0.16 && previa.final) {
        previaRemota.current = null;
        if (timeoutPrevia.current !== null) window.clearTimeout(timeoutPrevia.current);
        timeoutPrevia.current = null;
        cancelar();
        atual.amostras = [{ ...posicao, t: agora }];
        atual.ultimo = posicao;
        desenhar(posicao.x, posicao.y);
      }
      return;
    }
    // Respeitar a preferência do sistema sem alterar a posição publicada.
    const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (arrasto || reduzirMovimento) {
      cancelar();
      atual.amostras = [{ ...posicao, t: agora }];
      atual.ultimo = posicao;
      atual.arrastando = Boolean(arrasto);
      desenhar(posicao.x, posicao.y);
      return;
    }
    if (atual.arrastando) {
      atual.arrastando = false;
      atual.amostras = [{ ...atual.ultimo, t: agora - ATRASO_VISUAL_MS }];
    }
    const anteriores = atual.amostras;
    atual.amostras = registrarPosicao(anteriores, token.x, token.y, agora);
    if (atual.amostras.length === 1 && anteriores !== atual.amostras) {
      cancelar();
      atual.ultimo = { x: token.x, y: token.y };
      desenhar(token.x, token.y);
      return;
    }
    if (animacao.current !== null) return;
    const quadro = (tempo: number) => {
      animacao.current = null;
      const presente = estado.current;
      if (!presente || presente.cenaId !== cenaId || presente.arrastando) return;
      const p = amostrarPosicao(presente.amostras, tempo);
      if (!p) return;
      presente.ultimo = p;
      desenhar(p.x, p.y);
      const maisNova = presente.amostras[presente.amostras.length - 1];
      if (
        tempo < maisNova.t + ATRASO_VISUAL_MS ||
        Math.hypot(p.x - maisNova.x, p.y - maisNova.y) > 0.005
      ) {
        animacao.current = requestAnimationFrame(quadro);
      } else {
        // Guardar apenas a última posição para não consumir memória em sessões longas.
        presente.amostras = [maisNova];
      }
    };
    animacao.current = requestAnimationFrame(quadro);
  }, [cenaId, token.x, token.y, arrasto?.x, arrasto?.y, Boolean(arrasto)]);
  useLayoutEffect(
    () => () => {
      if (animacao.current !== null) cancelAnimationFrame(animacao.current);
      animacao.current = null;
      estado.current = null;
    },
    [],
  );
  // Replica a estrutura .token > .token-rosto > .token-arte da Mesa do Mestre;
  // movimento/interpolacao permanecem neste componente, sem mudar a rede.
  const temArte = Boolean(midiaUrl || token.imagem);
  const topview = temArte && token.topview === true;
  return (
    <div
      ref={elemento}
      className={`pm-mp-token pm-jogo-token token ${topview ? 'token-topview' : ''} ${proprio ? 'meu' : ''} ${proprio && controlavel ? 'pm-mp-token-controlavel' : ''} ${proprio && arrasto ? 'pm-jogo-token-arrastando' : ''} ${token.tipo !== 'jogador' ? 'pm-jogo-token-npc' : ''}`}
      style={
        {
          '--cor-token': token.cor,
          '--fundo-token': token.fundo || '#22252d',
          '--tamanho-token': `${token.tamanho ?? 70}px`,
          '--rotacao-token': `${token.rotacao ?? 0}deg`,
          '--espelhamento-token': token.espelhadoX ? -1 : 1,
        } as CSSProperties
      }
      title={
        proprio
          ? controlavel
            ? 'Arraste seu personagem para mover'
            : 'Seu token está bloqueado para movimento'
          : token.nome
      }
      onPointerDown={(e) => onTokenDown(e, token.id)}
      onPointerMove={onTokenMove}
      onPointerUp={onTokenUp}
      onPointerCancel={onTokenUp}
    >
      <CorpoTokenCena2D
        nome={token.nome}
        imagem={midiaUrl || token.imagem}
        enquadramento={token.enquadramento}
        animado={Boolean(midiaUrl)}
        pausado={token.idlePausado === true}
        velocidade={token.idleVelocidade ?? 1}
        ocultarNome={token.ocultarNome}
      />
    </div>
  );
}
