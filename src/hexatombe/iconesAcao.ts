/** Ícones opcionais para habilidades: símbolos prontos ou miniaturas locais PNG/JPEG/WebP. */
export const ICONES_PRONTOS = [
  { valor: '', nome: 'Sem ícone' },
  { valor: '⚔️', nome: 'Ataque' },
  { valor: '💧', nome: 'Água' },
  { valor: '🔥', nome: 'Fogo' },
  { valor: '🪨', nome: 'Terra' },
  { valor: '🌪️', nome: 'Ar' },
  { valor: '✨', nome: 'Magia' },
  { valor: '🩹', nome: 'Cura' },
  { valor: '🛡️', nome: 'Defesa' },
  { valor: '🎯', nome: 'Precisão' },
  { valor: '⚡', nome: 'Velocidade' },
  { valor: '💚', nome: 'Suporte' },
  { valor: '👁️', nome: 'Percepção' },
  { valor: '📜', nome: 'Ritual' },
] as const;
/** Uma imagem reduzida é armazenada na própria ficha; nunca aceitar URLs externas nem SVG. */
export function normalizarIconeAcao(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (value.startsWith('data:'))
    return /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) &&
      value.length <= 20_000
      ? value
      : '';
  const simbolo = value.trim();
  return simbolo.length <= 12 && !/[<>]/.test(simbolo) ? simbolo : '';
}
export function iconeAcaoEhImagem(icon: string): boolean {
  return icon.startsWith('data:image/');
}
