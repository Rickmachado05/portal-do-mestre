/** Navegação entre a Mesa 3D e a biblioteca global, sempre na mesma aba. */
const CAMPANHA_SEGURA = /^[a-zA-Z0-9_-]{1,120}$/;
export function urlBibliotecaGlobalMiniaturas3D(campanhaId: string): string {
  return CAMPANHA_SEGURA.test(campanhaId)
    ? `/miniaturas/?campanhaRetorno=${encodeURIComponent(campanhaId)}`
    : '/miniaturas/';
}
export function urlVoltarMesa3D(search: string): string | null {
  const id = new URLSearchParams(search).get('campanhaRetorno');
  return id && CAMPANHA_SEGURA.test(id) ? `/mesa3d/?campanha=${encodeURIComponent(id)}` : null;
}
