import type { AcaoDaFicha } from './acoesFichaDados';
import type { SecaoMenuCombate } from './menuCombateTurno';

/** Separa consulta de combate das ações rápidas e narrativas do Ímpeto.
 * Compatível com fichas antigas que só possuem categoria "buff".
 * Não altera custos, efeitos, turnos ou a ordem real das ações.
 */
export function secaoDaAcao(acao: AcaoDaFicha): Exclude<SecaoMenuCombate, 'itens'> {
  if (acao.categoria === 'basico') return 'ataque';
  if (
    acao.ativacao === 'buff' ||
    acao.ativacao === 'exploracao' ||
    acao.ativacao === 'passiva' ||
    acao.categoria === 'buff' ||
    acao.categoria === 'passiva'
  )
    return 'status';
  return 'habilidades';
}
export function grupoStatusDaAcao(acao: AcaoDaFicha): 'Buffs' | 'Exploração' | 'Passivas' {
  if (acao.ativacao === 'exploracao') return 'Exploração';
  if (acao.ativacao === 'passiva' || acao.categoria === 'passiva') return 'Passivas';
  return 'Buffs';
}
export function acoesDaSecaoMenu(acoes: AcaoDaFicha[], secao: SecaoMenuCombate): AcaoDaFicha[] {
  if (secao === 'itens') return [];
  const lista = acoes.filter((acao) => secaoDaAcao(acao) === secao);
  if (secao !== 'status') return lista;
  const ordem: Record<ReturnType<typeof grupoStatusDaAcao>, number> = {
    Buffs: 0,
    Exploração: 1,
    Passivas: 2,
  };
  return [...lista].sort((a, b) => ordem[grupoStatusDaAcao(a)] - ordem[grupoStatusDaAcao(b)]);
}
