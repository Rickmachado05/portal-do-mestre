/**
 * Converte APENAS fórmulas explícitas em comandos do motor de dados da mesa.
 * Outros textos do criador de fichas (como +2 CA, +4 dano ou "movimento narrativo")
 * não são interpretados como rolagens: isso evita aplicar regras erradas.
 */
export function formulaRolavelDaFicha(valor?: string | null): string | null {
  if (typeof valor !== 'string') return null;
  const match =
    /^\s*(\d{1,2})\s*d\s*(4|6|8|10|12|20|100)\s*([+-]\s*\d{1,4})?\s*(?:(?:HP|pontos? de vida|pontos? de escudo|escudo|dano|cura))?\s*$/i.exec(
      valor,
    );
  if (!match) return null;
  const quantidade = Number(match[1]);
  const modificador = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0;
  if (
    quantidade < 1 ||
    quantidade > 8 ||
    !Number.isInteger(modificador) ||
    Math.abs(modificador) > 9999
  )
    return null;
  return `${quantidade}d${match[2]}${modificador > 0 ? '+' + modificador : modificador < 0 ? String(modificador) : ''}`;
}
