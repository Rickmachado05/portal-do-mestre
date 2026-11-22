/** Regras pequenas para clipes GLB: não fabricamos animação onde não há skeleton/clipes. */
export type ModoAnimacaoMiniatura = 'automatico' | 'desligado' | 'clip';
export const normalizarModoAnimacaoMiniatura = (valor: unknown): ModoAnimacaoMiniatura =>
  valor === 'desligado' || valor === 'clip' ? valor : 'automatico';
export const normalizarVelocidadeAnimacao = (valor: unknown): number =>
  typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0.25, Math.min(2, valor)) : 1;
export const normalizarIndiceAnimacao = (valor: unknown): number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < 128 ? valor : 0;
const NOME_IDLE =
  /(?:^|[\s._-])(idle|breath(?:ing)?|respira(?:ndo|cao|ção)?|stand(?:ing)?|hover|float|rest|loop)(?:$|[\s._-]|\d)/i;
/** Automático só reproduz idle reconhecível; animações de ataque não devem tocar sozinhas. */
export function escolherIndiceIdle(
  nomes: readonly string[],
  modo: ModoAnimacaoMiniatura,
  indice = 0,
): number {
  if (modo === 'desligado' || !nomes.length) return -1;
  if (modo === 'clip')
    return Number.isInteger(indice) && indice >= 0 && indice < nomes.length ? indice : -1;
  return nomes.findIndex((nome) => NOME_IDLE.test(nome));
}
