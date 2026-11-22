/**
 * v29.15.30.12 — Um recorte 3D censurado pelo mestre já contém o Fog.
 * A máscara plana só pode existir enquanto nenhum bitmap censurado estiver
 * aplicado; dois planos paralelos no WebGL disputam o depth buffer em ângulo.
 * Entrada "tudo oculto" exige limpeza real do bitmap anterior (ou fallback
 * opaco caso não exista canvas de recorte reutilizável).
 */
export function modoFogPublicado3D(mascara, recorteConfirmado, canvasRecorteReutilizavel) {
  if (typeof mascara !== 'string' || !/^[012]{2304}$/.test(mascara)) return 'desativado';
  if (!recorteConfirmado) return 'pelicula';
  if (mascara.includes('1') || mascara.includes('2')) return 'imagem';
  return canvasRecorteReutilizavel ? 'ocultar-piso' : 'pelicula';
}
