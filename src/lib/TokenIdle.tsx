import { useEffect, useRef, useState } from 'react';
import { decodificarBlobGifIdle, quadroNoTempo, type AnimacaoGifIdle } from './tokenIdleGif.mjs';

/** Relógio único para todas as miniaturas idle 2D. O navegador pode suspender RAF
 * em segundo plano; quando volta, o quadro é calculado pelo tempo atual. */
type Atualizador = (agora: number) => void;
const observadores = new Set<Atualizador>();
let quadroPendente = 0;
let ultimoTique = 0;
function atualizar(agora: number) {
  quadroPendente = 0;
  if (document.visibilityState !== 'hidden' && agora - ultimoTique >= 80) {
    ultimoTique = agora;
    for (const atualizarToken of observadores) atualizarToken(agora);
  }
  if (observadores.size) quadroPendente = requestAnimationFrame(atualizar);
}
function acompanhar(funcao: Atualizador) {
  observadores.add(funcao);
  if (!quadroPendente) quadroPendente = requestAnimationFrame(atualizar);
  return () => {
    observadores.delete(funcao);
    if (!observadores.size && quadroPendente) {
      cancelAnimationFrame(quadroPendente);
      quadroPendente = 0;
      ultimoTique = 0;
    }
  };
}
const cache = new Map<string, Promise<AnimacaoGifIdle>>();
function carregar(src: string) {
  const anterior = cache.get(src);
  if (anterior) return anterior;
  const pedido = fetch(src)
    .then((res) => {
      if (!res.ok) throw Error('GIF indisponível.');
      return res.blob();
    })
    .then(decodificarBlobGifIdle);
  cache.set(src, pedido);
  if (cache.size > 5) cache.delete(cache.keys().next().value!);
  pedido.catch(() => cache.delete(src));
  return pedido;
}

type Props = {
  src: string;
  alt?: string;
  animado: boolean;
  pausado?: boolean;
  velocidade?: number;
  className?: string;
};
export default function TokenIdle({
  src,
  alt = '',
  animado,
  pausado = false,
  velocidade = 1,
  className,
}: Props) {
  const tela = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLSpanElement>(null);
  const [visivel, setVisivel] = useState(typeof IntersectionObserver === 'undefined');
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (!animado) return;
    const el = area.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => setVisivel(Boolean(entries[0]?.isIntersecting)),
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animado]);
  useEffect(() => {
    if (!animado || !visivel) {
      return;
    }
    let ativo = true,
      parar: undefined | (() => void);
    setPronto(false);
    void carregar(src)
      .then((animacao) => {
        if (!ativo || !tela.current) return;
        const canvas = tela.current,
          ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        canvas.width = animacao.largura;
        canvas.height = animacao.altura;
        let ultimo = -1;
        const desenhar = (tempo: number) => {
          const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
          const index = reduzir || pausado ? 0 : quadroNoTempo(animacao, tempo * velocidade);
          if (index === ultimo) return;
          ultimo = index;
          const pixels = new ImageData(
            animacao.quadros[index].pixels,
            animacao.largura,
            animacao.altura,
          );
          ctx.putImageData(pixels, 0, 0);
        };
        desenhar(performance.now());
        setPronto(true);
        // Um idle pausado não precisa permanecer inscrito no relógio global.
        if (!pausado && !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
          parar = acompanhar(desenhar);
      })
      .catch(() => {
        if (ativo) setPronto(false);
      });
    return () => {
      ativo = false;
      parar?.();
    };
  }, [src, animado, pausado, velocidade, visivel]);
  // A imagem serve de fallback para navegadores que não conseguirem decodificar.
  if (!animado)
    return (
      <img
        className={className}
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    );
  return (
    <span ref={area} className="token-idle-area">
      {!pronto && (
        <img
          className={className}
          src={src}
          alt={alt}
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      )}
      <canvas
        ref={tela}
        className={className ? `${className} token-idle-canvas` : 'token-idle-canvas'}
        aria-hidden="true"
        style={!pronto ? { visibility: 'hidden' } : undefined}
      />
    </span>
  );
}
