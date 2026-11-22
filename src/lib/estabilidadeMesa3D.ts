/**
 * v1.3.4.56.29.4 — decisões leves para o loop da Mesa 3D.
 * Funções puras para testar sem navegador/WebGL ou alterar a simulação.
 */
export type CoordenadaMesa3D = { x: number; z: number };
/** Somente movimentos perceptíveis devem re-renderizar toda a interface React. */
export function mudouPosicaoHud3D(
  anterior: CoordenadaMesa3D,
  atual: CoordenadaMesa3D,
  tolerancia = 0.01,
): boolean {
  return Math.abs(anterior.x - atual.x) > tolerancia || Math.abs(anterior.z - atual.z) > tolerancia;
}
/** O intervalo menor mantém leitura de deslocamento responsiva. */
export function intervaloHud3D(movendo: boolean): number {
  return movendo ? 180 : 500;
}
/** Atualizar a matriz de projeção somente quando o FOV realmente mudou. */
export function mudouFovCamera3D(fov: number, alvo: number): boolean {
  return Math.abs(fov - alvo) > 0.001;
}
