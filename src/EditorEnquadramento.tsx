import { useRef, type CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ENQUADRAMENTO_PADRAO,
  normalizarEnquadramento,
  estiloEnquadramento,
  type EnquadramentoImagem,
} from './lib/enquadramentoToken';
import { normalizarAparenciaToken, corFundoToken, type AparenciaToken } from './lib/aparenciaToken';
import TokenIdle from './lib/TokenIdle';
import './lib/tokenIdle.css';
import './EditorEnquadramento.css';

type Props = {
  titulo: string;
  imagem?: string;
  tipo: 'retrato' | 'token';
  valor?: EnquadramentoImagem;
  aoAlterar: (valor: EnquadramentoImagem) => void;
  aparencia?: AparenciaToken;
  corPadrao?: string;
  aoAlterarAparencia?: (valor: AparenciaToken) => void;
  // Mesmos dados da peça na cena: a prévia deve mostrar o resultado da Mesa 2D.
  topview?: boolean;
  rotacao?: number;
  espelhadoX?: boolean;
  animado?: boolean;
  idlePausado?: boolean;
  idleVelocidade?: number;
};
/** A prévia usa o mesmo enquadramento CSS que o avatar e o círculo do token. */
export default function EditorEnquadramento({
  titulo,
  imagem,
  tipo,
  valor,
  aoAlterar,
  aparencia,
  corPadrao,
  aoAlterarAparencia,
  topview = true,
  rotacao = 0,
  espelhadoX = false,
  animado = false,
  idlePausado = false,
  idleVelocidade = 1,
}: Props) {
  const a = normalizarEnquadramento(valor);
  const visual = normalizarAparenciaToken(aparencia, corPadrao);
  const arrasto = useRef<{
    id: number;
    x: number;
    y: number;
    inicioX: number;
    inicioY: number;
  } | null>(null);
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
    aoAlterar(
      normalizarEnquadramento({
        ...a,
        x: d.inicioX + ((e.clientX - d.x) / w) * 100,
        y: d.inicioY + ((e.clientY - d.y) / h) * 100,
      }),
    );
  }
  function parar(e: ReactPointerEvent<HTMLDivElement>) {
    if (arrasto.current?.id === e.pointerId) arrasto.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <div className="editor-enquadramento" aria-label={`Enquadramento: ${titulo}`}>
      <strong>{titulo}</strong>
      <div className="editor-enquadramento-corpo">
        <div
          className={`editor-enquadramento-preview ${tipo === 'token' ? 'circular' : 'vertical'} ${tipo === 'token' && visual.fundo === 'transparente' ? 'fundo-transparente' : ''}`}
          style={tipo === 'retrato' ? estiloEnquadramento(a) : undefined}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={parar}
          onPointerCancel={parar}
          title="Arraste a imagem para ajustar o centro"
        >
          {tipo === 'token' ? (
            <span
              className={`token ${topview ? 'token-topview' : ''} editor-enquadramento-token`}
              style={
                {
                  '--tamanho-token': '112px',
                  '--cor-token': visual.corBorda,
                  '--fundo-token':
                    visual.fundo === 'transparente' ? 'transparent' : corFundoToken(visual),
                  '--rotacao-token': `${rotacao}deg`,
                  '--espelhamento-token': espelhadoX ? -1 : 1,
                } as CSSProperties
              }
            >
              <span className="token-rosto">
                <span className="token-arte" style={estiloEnquadramento(a)}>
                  {imagem ? (
                    <TokenIdle
                      src={imagem}
                      alt={`Prévia de ${titulo}`}
                      animado={animado}
                      pausado={idlePausado}
                      velocidade={idleVelocidade}
                    />
                  ) : (
                    <small>Importe uma imagem para visualizar.</small>
                  )}
                </span>
              </span>
            </span>
          ) : imagem ? (
            <img src={imagem} alt={`Prévia de ${titulo}`} draggable={false} />
          ) : (
            <small>Importe uma imagem para visualizar.</small>
          )}
        </div>
        <div className="editor-enquadramento-campos">
          <label>
            Zoom · {Math.round(a.zoom * 100)}%
            <input
              type="range"
              min="0.6"
              max="3"
              step="0.05"
              value={a.zoom}
              onChange={(e) => aoAlterar({ ...a, zoom: Number(e.target.value) })}
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
              onChange={(e) => aoAlterar({ ...a, x: Number(e.target.value) })}
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
              onChange={(e) => aoAlterar({ ...a, y: Number(e.target.value) })}
            />
          </label>
          <button type="button" onClick={() => aoAlterar({ ...ENQUADRAMENTO_PADRAO })}>
            Restaurar enquadramento
          </button>
        </div>
      </div>
      {tipo === 'token' && aoAlterarAparencia && (
        <div className="editor-aparencia-token" aria-label="Aparência do token no 2D e 3D">
          <strong>✦ Borda e fundo do token</strong>
          <label>
            Cor da borda
            <input
              type="color"
              aria-label="Cor da borda do token"
              value={visual.corBorda}
              onChange={(e) => aoAlterarAparencia({ ...visual, corBorda: e.target.value })}
            />
            <span>{visual.corBorda.toUpperCase()}</span>
          </label>
          <div className="editor-cores-rapidas" aria-label="Cores rápidas de borda">
            {[
              '#d9b279',
              '#e27171',
              '#77b8ec',
              '#84cc94',
              '#b998ec',
              '#f1e2bd',
              '#9299a4',
              '#26282f',
            ].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Usar borda ${c}`}
                title={c}
                className={visual.corBorda === c ? 'ativo' : ''}
                style={{ background: c }}
                onClick={() => aoAlterarAparencia({ ...visual, corBorda: c })}
              />
            ))}
          </div>
          <label>
            Fundo do círculo
            <select
              aria-label="Fundo do token"
              value={visual.fundo}
              onChange={(e) =>
                aoAlterarAparencia({ ...visual, fundo: e.target.value as AparenciaToken['fundo'] })
              }
            >
              <option value="escuro">Cinza / preto (padrão)</option>
              <option value="transparente">Transparente</option>
              <option value="personalizado">Cor personalizada</option>
            </select>
          </label>
          {visual.fundo === 'personalizado' && (
            <label>
              Cor do fundo
              <input
                type="color"
                aria-label="Cor personalizada de fundo do token"
                value={visual.corFundo}
                onChange={(e) => aoAlterarAparencia({ ...visual, corFundo: e.target.value })}
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => aoAlterarAparencia(normalizarAparenciaToken(undefined, corPadrao))}
          >
            Restaurar cores do token
          </button>
          <small>
            O fundo transparente revela o mapa; o fundo escuro conserva o estilo circular. Cor da
            borda e fundo são usados nas mesas 2D e 3D.
          </small>
        </div>
      )}
      <small>
        Arraste a prévia ou use os controles. Ajuste salvo automaticamente, sem cortar a imagem
        original.
      </small>
    </div>
  );
}
