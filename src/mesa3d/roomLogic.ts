/** Colisão do laboratório 3D. Uma sala de testes independente dos mapas e tokens da Mesa 2D. */
export type Posicao = { x: number; z: number };
export type ObstaculoSala = Posicao & { largura: number; profundidade: number };
export const RAIO_AVATAR = 0.34;
export const SALA = { minX: -8.4, maxX: 8.4, minZ: -7.32, maxZ: 7.2 } as const;
export const MOBILIARIO: readonly ObstaculoSala[] = [
  { x: -6.3, z: -6.75, largura: 2.75, profundidade: 1.35 }, // estante
  { x: 6.35, z: -6.75, largura: 2.8, profundidade: 1.35 },
  { x: 2.65, z: -2.15, largura: 3.3, profundidade: 1.8 }, // mesa
  { x: 2.65, z: 0.0, largura: 1.0, profundidade: 1.05 }, // cadeira
  { x: -4.0, z: -2.65, largura: 2.75, profundidade: 1.6 }, // sofá
  { x: -3.65, z: -0.3, largura: 1.65, profundidade: 1.15 }, // mesa baixa
  { x: 0, z: -6.25, largura: 1.75, profundidade: 1.35 }, // pedestal
  { x: 7.35, z: 2.1, largura: 1.25, profundidade: 1.25 }, // planta
  { x: -7.4, z: 3.5, largura: 1.15, profundidade: 1.15 },
];
export function colisaoSala(p: Posicao, raio = RAIO_AVATAR): boolean {
  if (
    p.x - raio < SALA.minX ||
    p.x + raio > SALA.maxX ||
    p.z - raio < SALA.minZ ||
    p.z + raio > SALA.maxZ
  )
    return true;
  return MOBILIARIO.some((o) => {
    const px = Math.max(o.x - o.largura / 2, Math.min(o.x + o.largura / 2, p.x));
    const pz = Math.max(o.z - o.profundidade / 2, Math.min(o.z + o.profundidade / 2, p.z));
    return Math.hypot(p.x - px, p.z - pz) < raio;
  });
}
/** Passos curtos e eixos separados impedem atravessar móveis em diagonais e preservam o deslize na parede. */
export function moverNaSala(inicio: Posicao, delta: Posicao): Posicao {
  const distancia = Math.hypot(delta.x, delta.z);
  if (!Number.isFinite(distancia) || distancia === 0) return { ...inicio };
  const passos = Math.max(1, Math.ceil(distancia / 0.12));
  const dx = delta.x / passos,
    dz = delta.z / passos;
  let p = { ...inicio };
  for (let i = 0; i < passos; i++) {
    const horizontal = { x: p.x + dx, z: p.z };
    if (!colisaoSala(horizontal)) p = horizontal;
    const vertical = { x: p.x, z: p.z + dz };
    if (!colisaoSala(vertical)) p = vertical;
  }
  return p;
}
/** W avança na direção da câmera, D move para a direita, e combinações diagonais não aceleram. */
export function direcaoCamera(frente: number, lateral: number, angulo: number): Posicao {
  const f = Math.max(-1, Math.min(1, frente)),
    l = Math.max(-1, Math.min(1, lateral));
  const x = -Math.sin(angulo) * f + Math.cos(angulo) * l;
  const z = -Math.cos(angulo) * f - Math.sin(angulo) * l;
  const comprimento = Math.hypot(x, z);
  return comprimento > 0
    ? { x: Math.abs(x) < 1e-12 ? 0 : x / comprimento, z: Math.abs(z) < 1e-12 ? 0 : z / comprimento }
    : { x: 0, z: 0 };
}
export const PONTO_INICIAL: Posicao = { x: 0, z: 3.65 };
