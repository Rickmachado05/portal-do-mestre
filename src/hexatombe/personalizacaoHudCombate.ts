/** Personalização local e visual da HUD do combate, por personagem.
 * Não altera ficha, iniciativa, dano, Mana, HP nem dados compartilhados da mesa.
 */
import type { LadoPreferidoHud } from './posicaoMenuCombate';

export type EstiloHudCombate =
  'original' | 'agua' | 'fogo' | 'terra' | 'ar' | 'espiritual' | 'customizado';
export type PersonalizacaoHudCombate = {
  tema: EstiloHudCombate;
  cor: string;
  escala: number;
  distancia: number;
  lado: LadoPreferidoHud;
  intensidade: number;
};
export const CHAVE_HUD_COMBATE = 'portal-mestre-hud-personagem-v13438';
export const TEMAS_HUD_COMBATE: { id: EstiloHudCombate; nome: string; cor: string }[] = [
  { id: 'original', nome: 'Original', cor: '#ba344b' },
  { id: 'agua', nome: 'Água', cor: '#378ed2' },
  { id: 'fogo', nome: 'Fogo', cor: '#e56b3a' },
  { id: 'terra', nome: 'Terra', cor: '#608e58' },
  { id: 'ar', nome: 'Ar', cor: '#74b9b2' },
  { id: 'espiritual', nome: 'Espiritual', cor: '#9867cf' },
  { id: 'customizado', nome: 'Personalizado', cor: '#ba344b' },
];
export const PADRAO_HUD_COMBATE: PersonalizacaoHudCombate = {
  tema: 'original',
  cor: '#ba344b',
  escala: 1,
  distancia: 100,
  lado: 'auto',
  intensidade: 65,
};
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function sanitizarPersonalizacaoHud(input: unknown): PersonalizacaoHudCombate {
  if (!input || typeof input !== 'object') return { ...PADRAO_HUD_COMBATE };
  const value = input as Record<string, unknown>;
  const tema = TEMAS_HUD_COMBATE.some((t) => t.id === value.tema)
    ? (value.tema as EstiloHudCombate)
    : 'original';
  const preset = TEMAS_HUD_COMBATE.find((t) => t.id === tema)!;
  const cor =
    typeof value.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.cor) ? value.cor : preset.cor;
  const escala =
    typeof value.escala === 'number' && Number.isFinite(value.escala)
      ? limitar(value.escala, 0.8, 1.2)
      : 1;
  const distancia =
    typeof value.distancia === 'number' && Number.isFinite(value.distancia)
      ? limitar(value.distancia, 75, 210)
      : 100;
  const intensidade =
    typeof value.intensidade === 'number' && Number.isFinite(value.intensidade)
      ? limitar(value.intensidade, 0, 100)
      : 65;
  const lado: LadoPreferidoHud =
    value.lado === 'direita' || value.lado === 'esquerda' ? value.lado : 'auto';
  return { tema, cor, escala, distancia, intensidade, lado };
}
export function lerPersonalizacaoHud(personagemId: string): PersonalizacaoHudCombate {
  try {
    const mapa = JSON.parse(localStorage.getItem(CHAVE_HUD_COMBATE) || '{}') as Record<
      string,
      unknown
    >;
    return sanitizarPersonalizacaoHud(mapa?.[personagemId]);
  } catch {
    return { ...PADRAO_HUD_COMBATE };
  }
}
export function salvarPersonalizacaoHud(
  personagemId: string,
  personalizacao: PersonalizacaoHudCombate,
): void {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAVE_HUD_COMBATE) || '{}');
    const mapa = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    localStorage.setItem(
      CHAVE_HUD_COMBATE,
      JSON.stringify({ ...mapa, [personagemId]: sanitizarPersonalizacaoHud(personalizacao) }),
    );
  } catch {
    /* Navegação privada/armazenamento desabilitado: mantém o estilo na sessão. */
  }
}
export function escolherTemaHud(
  atual: PersonalizacaoHudCombate,
  tema: EstiloHudCombate,
): PersonalizacaoHudCombate {
  return {
    ...atual,
    tema,
    cor: tema === 'customizado' ? atual.cor : TEMAS_HUD_COMBATE.find((t) => t.id === tema)!.cor,
  };
}

/** Contraste WCAG para componentes preenchidos pela cor do personagem.
 * Branco, amarelo ou cores claras recebem texto escuro; tons escuros recebem claro.
 * A cor escolhida continua intacta, sem restringir o seletor RGB/hex.
 */
export function luminanciaHud(cor: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) return 0;
  const rgb = [1, 3, 5]
    .map((i) => parseInt(cor.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function textoContrasteHud(cor: string): string {
  return luminanciaHud(cor) > 0.179 ? '#141820' : '#fff6ed';
}
