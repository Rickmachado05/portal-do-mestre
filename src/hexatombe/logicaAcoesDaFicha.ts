/** O tipo da técnica vem do Criador; nunca deduzir regra a partir de prosa. */
export type CategoriaAcao =
  'basico' | 'ofensiva' | 'buff' | 'cura' | 'controle' | 'defesa' | 'utilidade' | 'passiva';
export type FiltroAcao = 'todos' | CategoriaAcao;
export const CATEGORIAS_ACAO: { id: FiltroAcao; nome: string }[] = [
  { id: 'todos', nome: 'Todas' },
  { id: 'basico', nome: 'Ataque básico' },
  { id: 'ofensiva', nome: 'Ofensivas' },
  { id: 'buff', nome: 'Buffs' },
  { id: 'cura', nome: 'Cura' },
  { id: 'controle', nome: 'Controle / condições' },
  { id: 'defesa', nome: 'Defesa' },
  { id: 'utilidade', nome: 'Utilidade' },
  { id: 'passiva', nome: 'Passivas' },
];
export function categoriaDaHabilidade(tipo?: string): CategoriaAcao {
  const s = (tipo || '').trim().toLowerCase();
  if (s === 'ofensiva' || s === 'ofensiva em área') return 'ofensiva';
  if (s === 'buff') return 'buff';
  if (s === 'cura') return 'cura';
  if (s === 'controle' || s === 'condição') return 'controle';
  if (s === 'defesa') return 'defesa';
  return 'utilidade';
}
export function precisaTesteContraCA(categoria: CategoriaAcao): boolean {
  return categoria === 'basico' || categoria === 'ofensiva' || categoria === 'controle';
}
/** Evita rolar o dano futuro de uma arma que está apenas sendo preparada. */
export function permiteRolarEfeito(categoria: CategoriaAcao): boolean {
  return ['basico', 'ofensiva', 'controle', 'cura', 'defesa'].includes(categoria);
}
export function resumoDaHabilidade(texto?: string, resumo?: string): string {
  if (resumo?.trim()) return resumo.trim();
  if (!texto?.trim()) return '';
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= 115) return limpo;
  const frase = limpo.slice(0, 116);
  const corte = Math.max(frase.lastIndexOf('. '), frase.lastIndexOf('; '));
  return ((corte > 35 ? frase.slice(0, corte + 1) : frase.slice(0, 111).trimEnd()) + '…').slice(
    0,
    119,
  );
}
