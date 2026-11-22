/** O menu de ações da câmera de Personagem é exclusivo da vez do personagem em foco.
 * Não decide turnos, não altera a iniciativa e não é controle de permissões multiplayer.
 */
export function mostrarMenuNoTurno({
  combateAtivo,
  modoCamera,
  personagemFocoId,
  turnoId,
  tokenPresente,
}: {
  combateAtivo: boolean;
  modoCamera?: string;
  personagemFocoId?: string | null;
  turnoId?: string | null;
  tokenPresente: boolean;
}): boolean {
  return (
    combateAtivo &&
    modoCamera === 'personagem' &&
    Boolean(personagemFocoId) &&
    personagemFocoId === turnoId &&
    tokenPresente
  );
}

export type SecaoMenuCombate = 'ataque' | 'habilidades' | 'itens' | 'status';
export const SECOES_MENU_COMBATE: { id: SecaoMenuCombate; nome: string; icone: string }[] = [
  { id: 'ataque', nome: 'Ataque', icone: '⚔' },
  { id: 'habilidades', nome: 'Habilidades', icone: '✦' },
  { id: 'status', nome: 'Status', icone: '◆' },
  { id: 'itens', nome: 'Itens', icone: '▣' },
];
