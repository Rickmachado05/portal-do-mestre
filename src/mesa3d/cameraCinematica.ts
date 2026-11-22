/** Perspectivas narrativas e enquadramento tático compartilhado entre os modos 3D.
 * Cálculos puros: não alteram tokens, câmera livre, regras ou iniciativa.
 */
export type ModoCameraCinematica = 'personagem' | 'tatica';
export type PontoCameraCinematica = { x: number; z: number };
export type EnquadramentoCinematico = {
  centro: PontoCameraCinematica;
  distancia: number;
  angulo: number;
  elevacao: number;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Órbita manual da câmera tática, sem alterar a Visão de Mesa nem tokens.
 * Mesmo sentido/sensibilidade do arrasto direito da câmera livre.
 */
export function girarCameraTatica(
  angulo: number,
  elevacao: number,
  dx: number,
  dy: number,
): { angulo: number; elevacao: number } {
  const proximoAngulo = angulo + dx * 0.007;
  return {
    angulo: Math.atan2(Math.sin(proximoAngulo), Math.cos(proximoAngulo)),
    elevacao: clamp(elevacao - dy * 0.006, 0.25, 1.48),
  };
}

/** Enquadramento narrativo: ajustes manuais da órbita individual. Não altera
 * a terceira pessoa, o personagem no cenário nem os valores do combate. */
export function girarCameraPersonagem(
  angulo: number,
  elevacao: number,
  dx: number,
  dy: number,
): { angulo: number; elevacao: number } {
  const proximoAngulo = angulo + dx * 0.007;
  return {
    angulo: Math.atan2(Math.sin(proximoAngulo), Math.cos(proximoAngulo)),
    elevacao: clamp(elevacao - dy * 0.005, 0.12, 0.9),
  };
}
export function zoomCameraPersonagem(distancia: number, direcao: number): number {
  if (!Number.isFinite(distancia)) return 5.2;
  return clamp(distancia + (direcao > 0 ? 0.55 : -0.55), 3.8, 10.5);
}

const pontoValido = (p: PontoCameraCinematica | undefined): p is PontoCameraCinematica =>
  Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.z));

/** Escolhe peças próximas do personagem em foco, sem puxar a câmera para
 * personagens do outro lado de mapas grandes. Inclui jogadores, NPCs e inimigos.
 * A ordenação por distância evita comportamento instável quando há muitos tokens.
 */
export function selecionarPontosTaticos(
  foco: PontoCameraCinematica,
  outros: readonly PontoCameraCinematica[],
  raio = 32,
  limite = 18,
): PontoCameraCinematica[] {
  if (!pontoValido(foco)) return [];
  const alcance = clamp(Number.isFinite(raio) ? raio : 32, 1, 120);
  const quantidade = Math.round(clamp(Number.isFinite(limite) ? limite : 18, 0, 40));
  return outros
    .filter(pontoValido)
    .map((p) => ({ p, dist: Math.hypot(p.x - foco.x, p.z - foco.z) }))
    .filter(({ dist }) => dist > 0.05 && dist <= alcance)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, quantidade)
    .map(({ p }) => ({ x: p.x, z: p.z }));
}

/**
 * A câmera de personagem mantém o destaque individual original.
 * A tática é mais afastada por padrão e ajusta centro/distância a partir da
 * área ocupada pelas miniaturas próximas, com margem para enxergar o terreno.
 * `escalaTatica` é uma preferência VISUAL local (1 = 100% de abertura).
 */
export function calcularEnquadramentoCinematico(
  personagem: PontoCameraCinematica,
  alvo: PontoCameraCinematica | undefined,
  modo: ModoCameraCinematica,
  proporcao = 16 / 9,
  pontosTaticos: readonly PontoCameraCinematica[] = [],
  escalaTatica = 1,
  distanciaMaxima = 100,
): EnquadramentoCinematico {
  const outro = pontoValido(alvo) ? alvo : undefined;
  if (modo === 'personagem')
    return {
      centro: { ...personagem },
      distancia: 5.2,
      angulo: outro ? Math.atan2(outro.x - personagem.x, outro.z - personagem.z) + 0.42 : 0.65,
      elevacao: 0.3,
    };
  const pontos = [personagem, ...(outro ? [outro] : []), ...pontosTaticos.filter(pontoValido)];
  const minX = Math.min(...pontos.map((p) => p.x));
  const maxX = Math.max(...pontos.map((p) => p.x));
  const minZ = Math.min(...pontos.map((p) => p.z));
  const maxZ = Math.max(...pontos.map((p) => p.z));
  const centro = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  const raioMax = Math.max(...pontos.map((p) => Math.hypot(p.x - centro.x, p.z - centro.z)));
  // 26 é a abertura padrão mais ampla; a área ocupada pelo grupo pode
  // aumentá-la. Telas estreitas exigem mais distância para caberem as peças.
  const fatorTela = clamp(1.3 / Math.max(0.4, proporcao), 1, 1.85);
  const abertura = clamp(Number.isFinite(escalaTatica) ? escalaTatica : 1, 0.65, 2);
  const distancia = clamp(
    Math.max(26, (raioMax + 3) * 2.9) * fatorTela * abertura,
    8,
    Math.max(100, distanciaMaxima),
  );
  return {
    centro,
    distancia,
    // Mantém o ângulo inclinado que já foi aprovado; só abre o campo de visão.
    angulo: 0.65,
    elevacao: 1.04,
  };
}
