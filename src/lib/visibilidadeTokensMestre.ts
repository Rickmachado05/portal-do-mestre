/** Regras compartilhadas de ocultação 2D/3D: o mestre vê fantasmas;
 * jogadores não recebem/exibem os tokens ocultos. Não modifica o registro salvo.
 */
export type TipoTokenCena = 'jogador' | 'npc' | 'inimigo';
export type CamadasPersonagens = {
  tokens?: boolean;
  jogadores?: boolean;
  npcs?: boolean;
  inimigos?: boolean;
};
export function tokenOcultoParaJogador(
  tipo: TipoTokenCena,
  token: { oculto?: boolean } | undefined,
  camadas: CamadasPersonagens | undefined,
): boolean {
  if (!token) return true;
  if (token.oculto === true || camadas?.tokens === false) return true;
  return tipo === 'jogador'
    ? camadas?.jogadores === false
    : tipo === 'npc'
      ? camadas?.npcs === false
      : camadas?.inimigos === false;
}
