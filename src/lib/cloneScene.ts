/** Duplica metadados de uma cena sem compartilhar referências mutáveis. */
export function duplicarDadosDaCena<T extends { id: string; nome: string }>(
  cena: T,
  novoId: string,
): T {
  return {
    ...(JSON.parse(JSON.stringify(cena)) as T),
    id: novoId,
    nome: `${cena.nome} (cópia)`,
  };
}
