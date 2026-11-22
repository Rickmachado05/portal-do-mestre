/** Parâmetros da Terceira Pessoa, idênticos nas Mesas 3D do mestre e do jogador.
 * A origem/posição do foco é interpolada pelo chamador para evitar o salto de câmera.
 */
import type * as THREE from 'three';

export const CAMERA_TERCEIRA_3D = {
  campoVisao: 62,
  anguloInicial: 0.16,
  elevacaoInicial: 0.75,
  distanciaInicial: 5.2,
  alturaDoFoco: 1.14,
  ajusteDaMira: 0.22,
  suavizacao: 9,
} as const;

/** Mesma posição e mesma mira para ambas as interfaces. */
export function posicionarCameraTerceira3D(
  camera: THREE.PerspectiveCamera,
  foco: { x: number; y: number; z: number },
  yaw: number,
  distancia: number,
  elevacao: number,
) {
  camera.position.set(
    foco.x + Math.sin(yaw) * distancia,
    foco.y + distancia * Math.tan(elevacao),
    foco.z + Math.cos(yaw) * distancia,
  );
  camera.lookAt(foco.x, foco.y - CAMERA_TERCEIRA_3D.ajusteDaMira, foco.z);
}
