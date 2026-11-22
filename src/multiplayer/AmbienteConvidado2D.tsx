import WeatherLayer from '../WeatherLayer';
import { IluminacaoCena2D } from '../lib/CenaVisual2D';
import { CLIMA_PADRAO } from '../lib/weather';
import type { AmbientePublicado } from './ambientePublicado';
import './AmbienteConvidado2D.css';
/** Camadas não interativas na mesma posição percentual do mapa do mestre. */
export default function AmbienteConvidado2D({
  ambiente,
  individual = false,
  pausado = false,
  largura,
  altura,
}: {
  ambiente?: AmbientePublicado;
  individual?: boolean;
  pausado?: boolean;
  largura: number;
  altura: number;
}) {
  if (!ambiente) return null;
  // Em visão individual, apenas a animação do clima chega separadamente;
  // a geometria está na imagem filtrada enviada pelo mestre.
  const luzes = !individual ? ambiente.luzes?.filter((l) => l.ativa) || [] : [];
  // Iluminação é independente do modo de visão da cena: "Tudo visível"
  // desliga a ocultação geométrica, não a escuridão ambiental.
  // Na visão individual, a sombra JÁ foi incorporada à imagem filtrada.
  const sombra = !individual && Boolean(ambiente.iluminacao?.ativa);
  return (
    <>
      {!individual && Boolean(ambiente.desenhos?.length) && (
        <svg
          className="pm-jogo-ambiente-desenhos"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {ambiente.desenhos?.map((t) => (
            <polyline
              key={t.id}
              points={t.pontos.map((p) => `${p.x},${p.y}`).join(' ')}
              stroke={t.cor}
              strokeWidth={t.espessura}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      )}
      {!individual &&
        ambiente.marcadores?.map((m) => (
          <span
            key={m.id}
            className="pm-jogo-ambiente-marcador"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            aria-label={`Marcação: ${m.texto}`}
          >
            <b aria-hidden="true">✦</b>
            <small>{m.texto}</small>
          </span>
        ))}
      {sombra && (
        <IluminacaoCena2D
          ativa={ambiente.iluminacao?.ativa}
          ambiente={ambiente.iluminacao?.ambiente}
          largura={largura}
          altura={altura}
          luzes={luzes.map((l, i) => ({
            ...l,
            id: `luz-publica-${i}`,
            pontos: l.pontos?.map((p) => ({ x: (p.x * largura) / 100, y: (p.y * altura) / 100 })),
          }))}
        />
      )}
      <WeatherLayer config={ambiente.clima || CLIMA_PADRAO} pausado={pausado} />
    </>
  );
}
