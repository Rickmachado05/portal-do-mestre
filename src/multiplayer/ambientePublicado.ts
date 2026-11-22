/** v29.14 — Projeção de ambiente autorizada para a Mesa 2D do convidado.
 * Cenas individuais NÃO recebem coordenadas de luzes, desenhos ou marcadores:
 * eles são incorporados ao recorte de visão no computador do mestre.
 */
import type { Ponto } from '../lib/lighting';
import { normalizarClima, type ConfigClima } from '../lib/weather';
import {
  normalizarDesenhos,
  normalizarMarcadores,
  type TracoDesenho,
  type MarcadorMapa,
} from '../lib/anotacoesMesa';
export type LuzPublicada = {
  x: number;
  y: number;
  cor: string;
  alcance: number;
  ativa: boolean;
  pontos?: Ponto[];
};
export type AmbientePublicado = {
  clima: ConfigClima;
  iluminacao?: { ativa: boolean; ambiente: number };
  luzes?: LuzPublicada[];
  desenhos?: TracoDesenho[];
  marcadores?: MarcadorMapa[];
};
const limitar = (valor: number, min: number, max: number) => Math.max(min, Math.min(max, valor));
const corValida = (cor: string) => /^#[0-9a-fA-F]{6}$/.test(cor);
export function prepararAmbientePublicado(
  cena: {
    clima?: unknown;
    iluminacao?: { ativa?: boolean; ambiente?: number };
    fontesLuz?: Array<{ x: number; y: number; cor: string; alcance: number; ativa: boolean }>;
    desenhos?: unknown;
    marcadores?: unknown;
    camadas?: { marcadores?: boolean };
  },
  luzesDeTokens: LuzPublicada[] = [],
): AmbientePublicado {
  const numero = (n: number, min: number, max: number, padrao: number) =>
    Number.isFinite(n) ? limitar(n, min, max) : padrao;
  const luzes = [...(cena.fontesLuz || []), ...luzesDeTokens]
    .slice(0, 45)
    .flatMap((l) =>
      l && Number.isFinite(l.x) && Number.isFinite(l.y)
        ? [
            {
              x: numero(l.x, 0, 100, 0),
              y: numero(l.y, 0, 100, 0),
              cor: corValida(l.cor) ? l.cor : '#ffd48b',
              alcance: numero(l.alcance, 2, 70, 17),
              ativa: l.ativa !== false,
            },
          ]
        : [],
    );
  return {
    clima: normalizarClima(cena.clima),
    iluminacao: {
      ativa: Boolean(cena.iluminacao?.ativa),
      ambiente: numero(cena.iluminacao?.ambiente ?? 40, 0, 100, 40),
    },
    luzes,
    // Limites para que a publicação não envie centenas de KB a cada movimento.
    desenhos: normalizarDesenhos(cena.desenhos)
      .slice(-80)
      .map((t) => ({
        ...t,
        pontos:
          t.pontos.length > 150
            ? t.pontos.filter(
                (_, i) => i % Math.ceil(t.pontos.length / 150) === 0 || i === t.pontos.length - 1,
              )
            : t.pontos,
      })),
    marcadores:
      cena.camadas?.marcadores === false ? [] : normalizarMarcadores(cena.marcadores).slice(0, 100),
  };
}
