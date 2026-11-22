/** Lista explícita de participantes da iniciativa, independente do elenco e do mapa.
 * Cada cena tem sua própria lista; adicionar ou remover não altera os tokens.
 */
export type UnidadeIniciativa = { id: string; iniciativa: number };

export function normalizarParticipantesIniciativa(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

export function alterarParticipanteIniciativa(
  lista: readonly string[],
  id: string,
  incluir: boolean,
): string[] {
  const atuais = normalizarParticipantesIniciativa(lista);
  if (!id) return atuais;
  return incluir
    ? atuais.includes(id)
      ? atuais
      : [...atuais, id]
    : atuais.filter((atual) => atual !== id);
}

/** Somente personagens explicitamente adicionados podem agir na iniciativa. */
export function ordenarParticipantesIniciativa<T extends UnidadeIniciativa>(
  unidades: readonly T[],
  ids: unknown,
): T[] {
  const participantes = new Set(normalizarParticipantesIniciativa(ids));
  return unidades
    .filter((unidade) => participantes.has(unidade.id))
    .sort((a, b) => (Number(b.iniciativa) || 0) - (Number(a.iniciativa) || 0));
}

/** Para o botão Reenquadrar: se houver participantes marcados que estejam no mapa,
 * enquadra somente esses participantes. Sem ninguém marcado, usa todos os tokens.
 */
export function idsParaEnquadrarCombate(
  participantes: unknown,
  tokensNaCena: readonly string[],
): string[] {
  const disponiveis = new Set(tokensNaCena);
  const emCombate = normalizarParticipantesIniciativa(participantes).filter((id) =>
    disponiveis.has(id),
  );
  return emCombate.length ? emCombate : [...disponiveis];
}

/** Se o combatente da vez sair, continua com o próximo da ordem anterior,
 * evitando reiniciar a rodada artificialmente no personagem mais rápido.
 */
export function turnoAposRetirada<T extends UnidadeIniciativa>(
  ordemAnterior: readonly T[],
  novaOrdem: readonly T[],
  turnoAtual: string | null,
  removidoId: string,
): string | null {
  if (!novaOrdem.length) return null;
  if (turnoAtual !== removidoId && novaOrdem.some((u) => u.id === turnoAtual)) return turnoAtual;
  const indice = ordemAnterior.findIndex((u) => u.id === removidoId);
  if (indice >= 0) {
    const disponiveis = new Set(novaOrdem.map((u) => u.id));
    for (let n = 1; n <= ordemAnterior.length; n++) {
      const proximo = ordemAnterior[(indice + n) % ordemAnterior.length];
      if (disponiveis.has(proximo.id)) return proximo.id;
    }
  }
  return novaOrdem[0].id;
}
