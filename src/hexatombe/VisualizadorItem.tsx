import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIAS, type ModeloItem } from './itensLibrary';
import { imagemConteudoValida, imagemItemValida } from './imagensItens';
import {
  VISAO_IMAGEM_INICIAL,
  ZOOM_MAXIMO_ITEM,
  ZOOM_MINIMO_ITEM,
  arrastarImagem,
  limitarPanImagem,
  limitarZoomImagem,
  zoomImagemNoCursor,
  type DimensaoImagem,
  type VisaoImagem,
} from './navegacaoImagemItem';
import './VisualizadorItem.css';

type ItemVisivel = Pick<
  ModeloItem,
  'nome' | 'categoria' | 'descricao' | 'imagem' | 'conteudo' | 'imagemConteudo'
>;
type Props = { item: ItemVisivel; onFechar: () => void };
type Medidas = { visor: DimensaoImagem; imagem: DimensaoImagem };

/** Leitura/inspeção não aplica efeitos, não altera inventário nem consome itens. */
export default function VisualizadorItem({ item, onFechar }: Props) {
  const [visao, setVisao] = useState<VisaoImagem>({ ...VISAO_IMAGEM_INICIAL });
  const [arrastando, setArrastando] = useState(false);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const visorRef = useRef<HTMLDivElement>(null);
  const imagemRef = useRef<HTMLImageElement>(null);
  const gestoRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const imagem = imagemConteudoValida(item.imagemConteudo)
    ? item.imagemConteudo
    : imagemItemValida(item.imagem)
      ? item.imagem
      : null;
  const conteudo = item.conteudo?.trim() || '';

  function medir(): Medidas | null {
    const visor = visorRef.current,
      foto = imagemRef.current;
    if (
      !visor ||
      !foto ||
      !foto.complete ||
      !foto.naturalWidth ||
      !visor.clientWidth ||
      !visor.clientHeight
    )
      return null;
    return {
      visor: { largura: visor.clientWidth, altura: visor.clientHeight },
      imagem: { largura: foto.offsetWidth, altura: foto.offsetHeight },
    };
  }
  function alterarZoom(delta: number) {
    const medidas = medir();
    setVisao((anterior) =>
      medidas
        ? zoomImagemNoCursor(
            anterior,
            anterior.zoom + delta,
            { x: 0, y: 0 },
            medidas.visor,
            medidas.imagem,
          )
        : { ...VISAO_IMAGEM_INICIAL, zoom: limitarZoomImagem(anterior.zoom + delta) },
    );
  }
  function iniciarArrasto(ev: ReactPointerEvent<HTMLDivElement>) {
    if (!ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault();
    gestoRef.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setArrastando(true);
  }
  function moverImagem(ev: ReactPointerEvent<HTMLDivElement>) {
    const gesto = gestoRef.current;
    if (!gesto || gesto.id !== ev.pointerId) return;
    const delta = { x: ev.clientX - gesto.x, y: ev.clientY - gesto.y };
    gesto.x = ev.clientX;
    gesto.y = ev.clientY;
    const medidas = medir();
    if (medidas)
      setVisao((anterior) => arrastarImagem(anterior, delta, medidas.visor, medidas.imagem));
  }
  function terminarArrasto(ev: ReactPointerEvent<HTMLDivElement>) {
    if (gestoRef.current?.id !== ev.pointerId) return;
    gestoRef.current = null;
    if (ev.currentTarget.hasPointerCapture(ev.pointerId))
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    setArrastando(false);
  }

  useEffect(() => {
    botaoFechar.current?.focus();
  }, []);
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        onFechar();
      }
    };
    document.addEventListener('keydown', tecla, true);
    return () => document.removeEventListener('keydown', tecla, true);
  }, [onFechar]);
  useEffect(() => {
    gestoRef.current = null;
    setArrastando(false);
    setVisao({ ...VISAO_IMAGEM_INICIAL });
  }, [imagem]);
  // Listener nativo não passivo: a roda faz zoom no documento sem rolar a página ou a Mesa 3D.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !imagem) return;
    const aoRolar = (ev: WheelEvent) => {
      if (!ev.deltaY) return;
      ev.preventDefault();
      ev.stopPropagation();
      const medidas = medir();
      if (!medidas) return;
      const rect = visor.getBoundingClientRect();
      const cursor = {
        x: ev.clientX - (rect.left + rect.width / 2),
        y: ev.clientY - (rect.top + rect.height / 2),
      };
      const fator = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      setVisao((anterior) =>
        zoomImagemNoCursor(anterior, anterior.zoom * fator, cursor, medidas.visor, medidas.imagem),
      );
    };
    visor.addEventListener('wheel', aoRolar, { passive: false });
    return () => visor.removeEventListener('wheel', aoRolar);
  }, [imagem]);
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !imagem || typeof ResizeObserver === 'undefined') return;
    const ajustar = () => {
      const medidas = medir();
      if (medidas)
        setVisao((anterior) => ({
          ...anterior,
          ...limitarPanImagem(anterior, anterior.zoom, medidas.visor, medidas.imagem),
        }));
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(visor);
    return () => observador.disconnect();
  }, [imagem]);

  return createPortal(
    <div
      className="pm-visualizar-sobreposicao"
      onPointerDown={(ev) => {
        if (ev.target === ev.currentTarget) onFechar();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Visualizar ${item.nome}`}
        className="pm-visualizar-janela"
      >
        <header className="pm-visualizar-cabecalho">
          <div>
            <small>◈ {CATEGORIAS[item.categoria]} · INSPECIONAR ITEM</small>
            <h2>{item.nome}</h2>
          </div>
          <button
            ref={botaoFechar}
            type="button"
            onClick={onFechar}
            aria-label="Fechar visualização"
          >
            ×
          </button>
        </header>
        <div className="pm-visualizar-barra">
          <span>{imagem ? 'Imagem e conteúdo' : 'Conteúdo do item'}</span>
          {imagem && (
            <div className="pm-visualizar-zoom">
              <button
                type="button"
                disabled={visao.zoom <= ZOOM_MINIMO_ITEM}
                onClick={() => alterarZoom(-25)}
                aria-label="Reduzir zoom"
              >
                −
              </button>
              <output aria-label="Zoom">{visao.zoom}%</output>
              <button
                type="button"
                disabled={visao.zoom >= ZOOM_MAXIMO_ITEM}
                onClick={() => alterarZoom(25)}
                aria-label="Aumentar zoom"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setVisao({ ...VISAO_IMAGEM_INICIAL })}
                aria-label="Restaurar zoom e posição"
              >
                ↺
              </button>
            </div>
          )}
        </div>
        <div className="pm-visualizar-corpo">
          {imagem && (
            <>
              <div
                ref={visorRef}
                className={`pm-visualizar-imagem-area${arrastando ? ' arrastando' : ''}`}
                aria-label="Imagem do item: use a roda para ampliar e arraste para mover"
                onPointerDown={iniciarArrasto}
                onPointerMove={moverImagem}
                onPointerUp={terminarArrasto}
                onPointerCancel={terminarArrasto}
                onLostPointerCapture={terminarArrasto}
              >
                <img
                  ref={imagemRef}
                  src={imagem}
                  alt={`Conteúdo visual de ${item.nome}`}
                  draggable={false}
                  onLoad={() => {
                    const m = medir();
                    if (m)
                      setVisao((v) => ({
                        ...v,
                        ...limitarPanImagem(v, v.zoom, m.visor, m.imagem),
                      }));
                  }}
                  style={{
                    transform: `translate(calc(-50% + ${visao.x}px), calc(-50% + ${visao.y}px)) scale(${visao.zoom / 100})`,
                  }}
                />
              </div>
              <small className="pm-visualizar-instrucao">
                Roda do mouse: ampliar ou reduzir · Clique e arraste: mover a imagem
              </small>
            </>
          )}
          {conteudo && (
            <div className="pm-visualizar-texto">
              <h3>Conteúdo</h3>
              <p>{conteudo}</p>
            </div>
          )}
          {item.descricao && (
            <div className="pm-visualizar-descricao">
              <h3>Descrição</h3>
              <p>{item.descricao}</p>
            </div>
          )}
          {!imagem && !conteudo && !item.descricao && (
            <p className="pm-visualizar-vazio">
              Este item ainda não possui imagem ou conteúdo para visualizar.
            </p>
          )}
        </div>
        <footer className="pm-visualizar-rodape">
          <small>Somente leitura · Abrir não consome nem utiliza o item</small>
          <button type="button" onClick={onFechar}>
            Fechar
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
