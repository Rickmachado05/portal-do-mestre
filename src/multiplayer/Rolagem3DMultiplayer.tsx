import type { RolagemCompartilhada } from './api';
import VideoDadosSemFundo from './VideoDadosSemFundo';
import './Rolagem3DMultiplayer.css';

/**
 * Visualização segura da rolagem recebida: os números exibidos são os
 * resultados físicos do autor. Não repetir uma nova física neste navegador:
 * o Dice Box 1.1.4 não reproduz faces predeterminadas e geraria contradição.
 */
export default function Rolagem3DMultiplayer({
  rolagem,
  onFechar,
  videoUrl,
}: {
  rolagem: RolagemCompartilhada;
  onFechar: () => void;
  usarMinhaAparencia?: boolean;
  videoUrl?: string;
}) {
  return (
    <div
      className="rolagem-sobre-mapa pm-mp-rolagem-3d"
      role="status"
      aria-label={`Rolagem de ${rolagem.personagem}: resultado ${rolagem.total}`}
    >
      {videoUrl && (
        <VideoDadosSemFundo
          key={videoUrl}
          src={videoUrl}
          onFim={onFechar}
          descricao="Vídeo do lançamento físico original"
        />
      )}
      <div className="rolagem-placar pm-mp-rolagem-placar">
        <div className="rolagem-autor">
          {rolagem.visibilidade === 'mestre' ? '🔒 SÓ MESTRE' : '🌐 PÚBLICA'} · {rolagem.personagem}
        </div>
        <strong className="rolagem-numero">{rolagem.total}</strong>
        <div className="rolagem-formula">
          {rolagem.acaoNome} · {rolagem.formula} [{rolagem.dados.join(', ')}]
          {rolagem.modificador
            ? ` ${rolagem.modificador > 0 ? '+' : ''}${rolagem.modificador}`
            : ''}
        </div>
        <div
          className="pm-mp-faces-compartilhadas"
          aria-label="Faces reais recebidas de quem rolou"
        >
          {rolagem.dados.map((valor, i) => {
            const arte = rolagem.aparencia?.tipo === 'custom' ? rolagem.aparencia.arte : undefined;
            const figura = arte?.artworkPNG?.[String(valor)];
            return (
              <span
                className="pm-mp-face-real"
                key={`${rolagem.id}-${i}`}
                style={arte ? { backgroundColor: arte.baseColor } : undefined}
              >
                {figura ? <img src={figura} alt={`Face ${valor}`} /> : <b>{valor}</b>}
                {figura && <small>{valor}</small>}
              </span>
            );
          })}
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar resultado da rolagem">
          ×
        </button>
      </div>
    </div>
  );
}
