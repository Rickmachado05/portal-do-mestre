import { useEffect, useRef } from 'react';
import { climaAtivo, type ConfigClima, type TipoClima } from './lib/weather';

/** Clima procedural independente da extensão Owlbear, sem imagens, rede ou dependências adicionais. */
type Particula = {
  x: number;
  y: number;
  tamanho: number;
  velocidade: number;
  fase: number;
  alfa: number;
  rotacao: number;
};
const aleatorio = (min: number, max: number): number => min + Math.random() * (max - min);

function desenhar(
  ctx: CanvasRenderingContext2D,
  tipo: TipoClima,
  particulas: Particula[],
  largura: number,
  altura: number,
  intensidade: number,
  vento: number,
  direcao: number,
  delta: number,
  tempo: number,
  movimentar: boolean,
) {
  ctx.clearRect(0, 0, largura, altura);
  const forca = intensidade / 100;
  const angulo = (direcao * Math.PI) / 180;
  const vx = (Math.cos(angulo) * vento) / 100;
  const vy = (Math.sin(angulo) * vento) / 100;

  if (tipo === 'neblina') {
    // Bruma ambiental, totalmente diferente da névoa de exploração que oculta o mapa.
    ctx.fillStyle = `rgba(175,196,200,${(forca * 0.085).toFixed(3)})`;
    ctx.fillRect(0, 0, largura, altura);
    const raio = Math.max(largura, altura) * 0.53;
    for (const p of particulas) {
      if (movimentar) {
        p.x += vx * delta * (5 + p.velocidade * 6);
        p.y += vy * delta * (4 + p.velocidade * 4);
        if (p.x > largura + raio) p.x = -raio;
        if (p.x < -raio) p.x = largura + raio;
        if (p.y > altura + raio) p.y = -raio;
        if (p.y < -raio) p.y = altura + raio;
      }
      const pulso = 0.86 + 0.14 * Math.sin(tempo * 0.0002 + p.fase);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1.7, 0.4);
      const gradiente = ctx.createRadialGradient(0, 0, 0, 0, 0, raio * p.tamanho);
      gradiente.addColorStop(
        0,
        `rgba(195,211,221,${Math.min(0.26, forca * 0.18 * pulso).toFixed(3)})`,
      );
      gradiente.addColorStop(1, 'rgba(195,211,221,0)');
      ctx.fillStyle = gradiente;
      ctx.beginPath();
      ctx.arc(0, 0, raio * p.tamanho, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  if (tipo === 'areia') {
    ctx.fillStyle = `rgba(170,125,72,${(forca * 0.095).toFixed(3)})`;
    ctx.fillRect(0, 0, largura, altura);
  }
  ctx.lineCap = 'round';
  for (const p of particulas) {
    let dx = vx * vento * 0.85;
    let dy =
      tipo === 'chuva'
        ? 180 + p.velocidade * 170
        : tipo === 'neve'
          ? 24 + p.velocidade * 26
          : tipo === 'cinzas'
            ? -6 - p.velocidade * 17
            : tipo === 'areia'
              ? 13 + p.velocidade * 17
              : 12 + p.velocidade * 28;
    if (tipo === 'chuva') {
      dx += vx * 110;
      dy += Math.max(0, vy) * 55;
    } else if (tipo === 'areia') {
      dx += Math.sign(vx || 1) * (50 + p.velocidade * 85);
      dy += vy * 35;
    } else {
      dx += vx * 38;
      dy += vy * 18;
    }
    if (movimentar) {
      p.x += dx * delta;
      p.y += dy * delta;
      p.fase += delta * (tipo === 'folhas' ? 1.7 : 0.8);
      if (p.x > largura + 25) p.x = -25;
      if (p.x < -25) p.x = largura + 25;
      if (p.y > altura + 25) p.y = -25;
      if (p.y < -25) p.y = altura + 25;
    }
    const alfa = Math.min(0.85, p.alfa * (0.25 + forca * 0.75));
    ctx.globalAlpha = alfa;
    ctx.beginPath();
    if (tipo === 'chuva') {
      ctx.strokeStyle = '#c3deeb';
      ctx.lineWidth = Math.max(0.65, p.tamanho * 0.55);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - dx * 0.055, p.y - (dy + 35) * 0.055);
      ctx.stroke();
    } else if (tipo === 'neve') {
      ctx.fillStyle = '#f3f8ff';
      const x = p.x + Math.sin(p.fase) * 4;
      ctx.arc(x, p.y, p.tamanho * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (tipo === 'cinzas') {
      ctx.fillStyle = p.rotacao > 3 ? '#f6ac69' : '#c5bbb0';
      ctx.arc(p.x + Math.sin(p.fase) * 2, p.y, p.tamanho * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (tipo === 'areia') {
      ctx.strokeStyle = '#dfc49a';
      ctx.lineWidth = Math.max(0.6, p.tamanho * 0.38);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - dx * 0.045, p.y - dy * 0.045);
      ctx.stroke();
    } else if (tipo === 'folhas') {
      ctx.fillStyle = p.rotacao > 3 ? '#d39a54' : '#a4a96d';
      ctx.save();
      ctx.translate(p.x + Math.sin(p.fase) * 3, p.y);
      ctx.rotate(p.fase + p.rotacao);
      ctx.ellipse(0, 0, p.tamanho * 2, p.tamanho * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

export default function WeatherLayer({
  config,
  pausado = false,
}: {
  config: ConfigClima;
  pausado?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { tipo, intensidade, vento, direcao } = config;
  useEffect(() => {
    const elemento = canvas.current;
    if (!elemento || !climaAtivo(config, pausado)) return;
    const ctx = elemento.getContext('2d', { alpha: true });
    if (!ctx) return;
    let largura = 0,
      altura = 0,
      animacao = 0,
      ultimoQuadro = 0;
    let particulas: Particula[] = [];
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gerar = () => {
      const area = largura * altura;
      const quantidade =
        tipo === 'neblina'
          ? 8
          : Math.min(
              340,
              Math.max(
                4,
                Math.round((area / 5100) * (intensidade / 100) * (tipo === 'chuva' ? 1.6 : 1)),
              ),
            );
      particulas = Array.from({ length: quantidade }, () => ({
        x: aleatorio(0, largura),
        y: aleatorio(0, altura),
        tamanho: aleatorio(0.8, 3),
        velocidade: aleatorio(0.25, 1),
        fase: aleatorio(0, Math.PI * 2),
        alfa: aleatorio(0.35, 0.85),
        rotacao: aleatorio(0, Math.PI * 2),
      }));
    };
    const tamanho = () => {
      // clientWidth/Height não incluem o zoom por transform aplicado ao palco.
      largura = Math.max(1, elemento.clientWidth);
      altura = Math.max(1, elemento.clientHeight);
      const fator = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / largura, 1200 / altura);
      elemento.width = Math.max(1, Math.round(largura * fator));
      elemento.height = Math.max(1, Math.round(altura * fator));
      ctx.setTransform(elemento.width / largura, 0, 0, elemento.height / altura, 0, 0);
      gerar();
      desenhar(ctx, tipo, particulas, largura, altura, intensidade, vento, direcao, 0, 0, false);
    };
    const atualizar = (agora: number) => {
      if (!document.hidden && !reduzirMovimento.matches) {
        // Até 30 FPS para poupar CPU; interrompe a animação quando a aba não está visível.
        if (!ultimoQuadro || agora - ultimoQuadro >= 32) {
          const delta = ultimoQuadro ? Math.min(0.05, (agora - ultimoQuadro) / 1000) : 0;
          desenhar(
            ctx,
            tipo,
            particulas,
            largura,
            altura,
            intensidade,
            vento,
            direcao,
            delta,
            agora,
            true,
          );
          ultimoQuadro = agora;
        }
      } else ultimoQuadro = 0;
      animacao = requestAnimationFrame(atualizar);
    };
    const observador = new ResizeObserver(tamanho);
    observador.observe(elemento);
    tamanho();
    if (!reduzirMovimento.matches) animacao = requestAnimationFrame(atualizar);
    // Mudança da preferência de acessibilidade requer parar/reiniciar o efeito.
    const preferencia = () => {
      cancelAnimationFrame(animacao);
      animacao = 0;
      ultimoQuadro = 0;
      if (!reduzirMovimento.matches) animacao = requestAnimationFrame(atualizar);
      else
        desenhar(ctx, tipo, particulas, largura, altura, intensidade, vento, direcao, 0, 0, false);
    };
    reduzirMovimento.addEventListener('change', preferencia);
    return () => {
      cancelAnimationFrame(animacao);
      observador.disconnect();
      reduzirMovimento.removeEventListener('change', preferencia);
    };
  }, [tipo, intensidade, vento, direcao, pausado]);
  if (!climaAtivo(config, pausado)) return null;
  return <canvas ref={canvas} className="clima-camada" aria-hidden="true" />;
}
