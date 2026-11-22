import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import FaixasEfeitos from './FaixasEfeitos';
import type { EfeitoCombate } from './efeitosCombate';
import {
  lerPosicaoHudEfeitos,
  limitarPosicaoHudEfeitos,
  posicaoInicialHudEfeitos,
  salvarPosicaoHudEfeitos,
  type PosicaoHudEfeitos,
} from './posicaoHudEfeitos';
import './HudEfeitosMesa.css';

type Props = { nome: string; efeitos: EfeitoCombate[] };
const tela = () => ({ largura: window.innerWidth, altura: window.innerHeight });
const dimensoes = (el: HTMLElement | null) => ({
  largura: el?.offsetWidth || 286,
  altura: el?.offsetHeight || 165,
});

/** HUD no Portal pai: o 3D não fica mais aprisionado no iframe WebGL. */
export default function HudEfeitosMesa({ nome, efeitos }: Props) {
  const painelRef = useRef<HTMLElement | null>(null);
  const arrastoRef = useRef<{
    ponteiro: number;
    origemX: number;
    origemY: number;
    posicao: PosicaoHudEfeitos;
  } | null>(null);
  const posicaoRef = useRef<PosicaoHudEfeitos>({ x: 0, y: 0 });
  const [posicao, setPosicao] = useState<PosicaoHudEfeitos>(() => {
    const salvo = lerPosicaoHudEfeitos();
    const inicial = salvo ?? posicaoInicialHudEfeitos(tela());
    const p = limitarPosicaoHudEfeitos(inicial, { largura: 286, altura: 165 }, tela());
    posicaoRef.current = p;
    return p;
  });
  const definir = (p: PosicaoHudEfeitos) => {
    posicaoRef.current = p;
    setPosicao(p);
  };
  const resetar = () => {
    const p = posicaoInicialHudEfeitos(tela(), dimensoes(painelRef.current));
    definir(p);
    salvarPosicaoHudEfeitos(null);
  };

  useEffect(() => {
    const ajustar = () => {
      const p = limitarPosicaoHudEfeitos(posicaoRef.current, dimensoes(painelRef.current), tela());
      definir(p);
    };
    // Ajusta para a altura real quando alternamos entre poucos e muitos efeitos.
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [efeitos.length]);

  useEffect(() => {
    const mover = (ev: PointerEvent) => {
      const a = arrastoRef.current;
      if (!a || ev.pointerId !== a.ponteiro) return;
      const p = limitarPosicaoHudEfeitos(
        { x: a.posicao.x + ev.clientX - a.origemX, y: a.posicao.y + ev.clientY - a.origemY },
        dimensoes(painelRef.current),
        tela(),
      );
      definir(p);
      ev.preventDefault();
    };
    const parar = (ev: PointerEvent) => {
      if (!arrastoRef.current || ev.pointerId !== arrastoRef.current.ponteiro) return;
      arrastoRef.current = null;
      salvarPosicaoHudEfeitos(posicaoRef.current);
    };
    const perderFoco = () => {
      if (arrastoRef.current) {
        arrastoRef.current = null;
        salvarPosicaoHudEfeitos(posicaoRef.current);
      }
    };
    // Eventos globais: continua arrastando mesmo fora do título ou sobre a área 3D.
    window.addEventListener('pointermove', mover, true);
    window.addEventListener('pointerup', parar, true);
    window.addEventListener('pointercancel', parar, true);
    window.addEventListener('blur', perderFoco);
    return () => {
      window.removeEventListener('pointermove', mover, true);
      window.removeEventListener('pointerup', parar, true);
      window.removeEventListener('pointercancel', parar, true);
      window.removeEventListener('blur', perderFoco);
    };
  }, []);
  const iniciar = (ev: ReactPointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0 || (ev.target instanceof Element && ev.target.closest('button'))) return;
    arrastoRef.current = {
      ponteiro: ev.pointerId,
      origemX: ev.clientX,
      origemY: ev.clientY,
      posicao: posicaoRef.current,
    };
    // Captura o ponteiro no Portal pai, inclusive quando ele cruza o iframe 3D.
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  };
  return (
    <aside
      ref={painelRef}
      className="hx-hud-efeitos-mesa"
      aria-label={`Efeitos ativos de ${nome}`}
      style={{ left: posicao.x, top: posicao.y }}
    >
      <div
        className="hx-hud-efeitos-titulo"
        onPointerDown={iniciar}
        title="Segure e arraste para mover a HUD de efeitos"
      >
        <strong>✦ EFEITOS ATIVOS</strong>
        <span className="hx-hud-efeitos-nome" title={nome}>
          {nome}
        </span>
        <span className="hx-hud-efeitos-dica" aria-hidden="true">
          ↔ mover
        </span>
        <button
          type="button"
          title="Restaurar posição da HUD"
          aria-label="Restaurar posição da HUD de efeitos"
          onClick={resetar}
        >
          ↺
        </button>
      </div>
      <div className="hx-hud-efeitos-conteudo">
        <FaixasEfeitos efeitos={efeitos} compacto />
      </div>
    </aside>
  );
}
