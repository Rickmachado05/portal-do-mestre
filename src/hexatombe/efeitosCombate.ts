/** Apresentação dos efeitos existentes da campanha. Não altera regras de combate. */
export type TipoEfeitoCombate = 'buff' | 'debuff' | 'condicao';
export type EfeitoCombate = {
  id: string;
  nome: string;
  turnos: number;
  tipo?: TipoEfeitoCombate; // opcional para compatibilidade com campanhas anteriores
  origem?: string;
};
export function tipoEfeitoCombate(efeito: Pick<EfeitoCombate, 'tipo'>): TipoEfeitoCombate {
  return efeito.tipo === 'buff' || efeito.tipo === 'debuff' ? efeito.tipo : 'condicao';
}
export const ROTULOS_EFEITO: Record<TipoEfeitoCombate, string> = {
  buff: 'Bônus',
  debuff: 'Penalidade',
  condicao: 'Condição',
};
export const SIMBOLOS_EFEITO: Record<TipoEfeitoCombate, string> = {
  buff: '✦',
  debuff: '▼',
  condicao: '◆',
};
export function alterarDuracaoEfeito(
  efeitos: EfeitoCombate[],
  efeitoId: string,
  variacao: number,
): EfeitoCombate[] {
  return efeitos.map((efeito) =>
    efeito.id === efeitoId
      ? { ...efeito, turnos: Math.max(1, Math.min(99, Math.round(efeito.turnos + variacao))) }
      : efeito,
  );
}
