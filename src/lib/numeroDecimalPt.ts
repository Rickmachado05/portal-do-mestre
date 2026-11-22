/** Converte coordenadas digitadas no padrão brasileiro ou internacional.
 * Não converte entradas incompletas em zero durante a digitação. */
export function interpretarPercentualDecimal(valor: string): number | null {
  const limpo = valor.trim().replace(/\s+/g, '');
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(limpo)) return null;
  const numero = Number(limpo.replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

export function formatarPercentualDecimal(valor: number): string {
  return Number(valor.toFixed(4)).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}
