/** Catálogo extensível de sistemas. A v1.3.5 registra apenas Ímpeto RPG. */
export const SISTEMA_IMPETO = 'impeto';
export type SistemaRpg = {
  id: string;
  nome: string;
  descricao: string;
  geradorDisponivel: boolean;
};
export const SISTEMAS_RPG: readonly SistemaRpg[] = [
  {
    id: SISTEMA_IMPETO,
    nome: 'Ímpeto RPG',
    descricao: 'Sistema autoral universal',
    geradorDisponivel: true,
  },
];
export function nomeDoSistema(id?: string | null): string {
  if (!id) return 'Sem sistema definido';
  return SISTEMAS_RPG.find((s) => s.id === id)?.nome || id;
}
/** O formato antigo das fichas provém integralmente do editor que hoje se chama Ímpeto. */
export function sistemaDaFicha(dados: { sistemaId?: string }): string {
  return dados.sistemaId || SISTEMA_IMPETO;
}
/** Migração interpretativa: não regrava os dados antigos nem classifica D&D como Ímpeto. */
export function sistemaDaCampanha(meta: {
  id?: string;
  sistemaId?: string;
  sistema?: string;
  fichaIds?: string[];
}): string | null {
  if (typeof meta.sistemaId === 'string') return meta.sistemaId || null;
  const legado = (meta.sistema || '').trim().toLocaleLowerCase('pt-BR');
  if (
    legado === 'ímpeto' ||
    legado === 'ímpeto rpg' ||
    legado === 'impeto' ||
    legado === 'impeto rpg' ||
    legado === 'hexatombe: avatar' ||
    legado === 'hexatombe'
  )
    return SISTEMA_IMPETO;
  // Campanhas antigas com fichas ligadas e sem sistema explícito eram do editor original.
  if (!legado && (meta.id === 'principal' || (meta.fichaIds?.length || 0) > 0))
    return SISTEMA_IMPETO;
  return null;
}
export function fichaCompativel(
  ficha: { dados: { sistemaId?: string } },
  campanha: { id?: string; sistemaId?: string; sistema?: string; fichaIds?: string[] },
): boolean {
  const id = sistemaDaCampanha(campanha);
  return Boolean(id && id === sistemaDaFicha(ficha.dados));
}

/** Nome para cards: mantém visíveis nomes de sistemas legados ainda não registrados. */
export function rotuloSistemaCampanha(meta: {
  id?: string;
  sistemaId?: string;
  sistema?: string;
  fichaIds?: string[];
}): string {
  const id = sistemaDaCampanha(meta);
  if (id) return nomeDoSistema(id);
  const legado = meta.sistema?.trim();
  return legado ? `${legado} (não cadastrado)` : 'Sem sistema definido';
}
