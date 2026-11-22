/** Funções puras de densidade e vento do clima 3D; mesmas direções do clima 2D. */
import type { TipoClima } from './weather';
export const LIMITE_PARTICULAS_CLIMA_3D = 460;
export const DENSIDADE_NEBLINA_PADRAO_3D = 0.0025;
export const DISTANCIA_MAXIMA_CLIMA_3D = 76;
export function quantidadeParticulasClima3D(tipo: TipoClima, intensidade: number): number {
  if (tipo === 'nenhum' || tipo === 'neblina' || intensidade <= 0) return 0;
  const escala =
    tipo === 'chuva'
      ? 1
      : tipo === 'areia'
        ? 0.72
        : tipo === 'folhas'
          ? 0.3
          : tipo === 'cinzas'
            ? 0.96
            : 0.57;
  return Math.max(1, Math.min(LIMITE_PARTICULAS_CLIMA_3D, Math.round(intensidade * 5.1 * escala)));
}
/** 0° direita; 90° baixo; 180° esquerda; 270° cima nos eixos do mapa. */
export function vetorVentoClima3D(direcao: number, vento: number): { x: number; z: number } {
  const radianos = ((direcao % 360) * Math.PI) / 180;
  const velocidade = Math.max(0, Math.min(100, vento)) / 100;
  return { x: Math.cos(radianos) * velocidade, z: Math.sin(radianos) * velocidade };
}
