import { useState } from 'react';
import type { RolagemCompartilhada } from './api';
import VideoDadosSemFundo from './VideoDadosSemFundo';
import './Rolagem3DMultiplayer.css';

/** Imagem vinda do canvas físico do lançador, via WebRTC, sem outro Dice Box. */
export default function DadosAoVivoOverlay({
  stream,
  resultado,
  onPrimeiroFrame,
  onFechar,
}: {
  stream: MediaStream;
  resultado?: RolagemCompartilhada | null;
  onPrimeiroFrame?: () => void;
  onFechar: () => void;
}) {
  const [tocando, setTocando] = useState(false);
  return (
    <div
      className="rolagem-sobre-mapa pm-mp-rolagem-3d pm-mp-dados-ao-vivo"
      role="status"
      aria-label="Transmissão ao vivo da rolagem"
    >
      <VideoDadosSemFundo
        stream={stream}
        onPrimeiroFrame={() => {
          setTocando(true);
          onPrimeiroFrame?.();
        }}
        onParou={() => setTocando(false)}
        descricao="Dados físicos ao vivo do lançador"
      />
      <div className="rolagem-placar pm-mp-rolagem-placar">
        <div className="rolagem-autor">
          ⚄ DICE BOX ORIGINAL · {tocando ? 'AO VIVO' : 'CONECTANDO'}
        </div>
        <strong className="rolagem-numero">{resultado?.total ?? '⚄'}</strong>
        <div className="rolagem-formula">
          {resultado
            ? `${resultado.formula} [${resultado.dados.join(', ')}]`
            : 'Acompanhando os dados do participante…'}
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar transmissão ao vivo">
          ×
        </button>
      </div>
    </div>
  );
}
