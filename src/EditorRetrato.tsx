import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import ImagemRetrato, {
  AJUSTE_RETRATO_PADRAO,
  normalizarAjusteRetrato,
  type AjusteRetrato,
} from './lib/retratoResponsivo';
import './EditorRetrato.css';

type Props = {
  imagem?: string;
  valor?: Partial<AjusteRetrato> | null;
  aoAlterar: (novo: AjusteRetrato) => void;
  titulo?: string;
};
export default function EditorRetrato({
  imagem,
  valor,
  aoAlterar,
  titulo = 'Ajustar retrato',
}: Props) {
  const a = normalizarAjusteRetrato(valor);
  const arrasto = useRef<{
    id: number;
    x: number;
    y: number;
    inicioX: number;
    inicioY: number;
  } | null>(null);
  const mudar = (delta: Partial<AjusteRetrato>) =>
    aoAlterar(normalizarAjusteRetrato({ ...a, ...delta }));
  function iniciar(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !imagem) return;
    arrasto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, inicioX: a.x, inicioY: a.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function mover(e: ReactPointerEvent<HTMLDivElement>) {
    const d = arrasto.current;
    if (!d || d.id !== e.pointerId) return;
    const w = Math.max(1, e.currentTarget.clientWidth),
      h = Math.max(1, e.currentTarget.clientHeight);
    mudar({
      x: d.inicioX + ((e.clientX - d.x) / w) * 100,
      y: d.inicioY + ((e.clientY - d.y) / h) * 100,
    });
  }
  function parar(e: ReactPointerEvent<HTMLDivElement>) {
    if (arrasto.current?.id === e.pointerId) arrasto.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <section className="hx-editor-retrato" aria-label={titulo}>
      <strong>{titulo}</strong>
      <p>
        O ajuste é visual: preserva a imagem/GIF original. Arraste a prévia ou informe as dimensões.
      </p>
      <div className="hx-editor-retrato-layout">
        <div className="hx-editor-retrato-previas">
          <div>
            <div
              className="hx-retrato-previa hx-retrato-previa-ficha"
              onPointerDown={iniciar}
              onPointerMove={mover}
              onPointerUp={parar}
              onPointerCancel={parar}
              title="Arraste para posicionar o retrato"
            >
              {imagem ? (
                <ImagemRetrato
                  src={imagem}
                  ajuste={a}
                  alt="Prévia do retrato na ficha"
                  draggable={false}
                />
              ) : (
                <span>✦</span>
              )}
            </div>
            <small>Ficha</small>
          </div>
          <div>
            <div
              className="hx-retrato-previa hx-retrato-previa-mesa"
              onPointerDown={iniciar}
              onPointerMove={mover}
              onPointerUp={parar}
              onPointerCancel={parar}
              title="Arraste para posicionar o retrato"
            >
              {imagem ? (
                <ImagemRetrato
                  src={imagem}
                  ajuste={a}
                  alt="Prévia do retrato na mesa"
                  draggable={false}
                />
              ) : (
                <span>✦</span>
              )}
            </div>
            <small>Mesa</small>
          </div>
        </div>
        <div className="hx-editor-retrato-campos">
          <label className="hx-retrato-campo-inteiro">
            Adaptação automática
            <select
              value={a.modo}
              onChange={(e) => mudar({ modo: e.target.value as AjusteRetrato['modo'] })}
            >
              <option value="automatico">Automático (conforme o espaço)</option>
              <option value="preencher">Preencher (aceita corte)</option>
              <option value="conter">Conter (imagem inteira)</option>
            </select>
          </label>
          {(
            [
              ['largura', 'Largura', 40, 250],
              ['altura', 'Altura', 40, 250],
            ] as const
          ).map(([campo, rotulo, min, max]) => (
            <label key={campo}>
              {rotulo} (%)
              <input
                type="number"
                min={min}
                max={max}
                step="5"
                value={a[campo]}
                onChange={(e) =>
                  mudar({ [campo]: Number(e.target.value) } as Partial<AjusteRetrato>)
                }
              />
              <input
                type="range"
                min={min}
                max={max}
                step="5"
                value={a[campo]}
                aria-label={`${rotulo} do retrato`}
                onChange={(e) =>
                  mudar({ [campo]: Number(e.target.value) } as Partial<AjusteRetrato>)
                }
              />
            </label>
          ))}
          <label>
            Zoom · {Math.round(a.zoom * 100)}%
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={a.zoom}
              onChange={(e) => mudar({ zoom: Number(e.target.value) })}
            />
          </label>
          <label>
            Horizontal · {Math.round(a.x)}%
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={a.x}
              onChange={(e) => mudar({ x: Number(e.target.value) })}
            />
          </label>
          <label>
            Vertical · {Math.round(a.y)}%
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={a.y}
              onChange={(e) => mudar({ y: Number(e.target.value) })}
            />
          </label>
          <button
            type="button"
            className="hx-retrato-restaurar"
            onClick={() => aoAlterar({ ...AJUSTE_RETRATO_PADRAO })}
          >
            ↺ Restaurar automático
          </button>
        </div>
      </div>
    </section>
  );
}
