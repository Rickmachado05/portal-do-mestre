/** Ajustes visuais e de organização das cenas, sem alterar regras de combate. */
export const OPACIDADE_NEVOA_MESTRE_PADRAO = 53;

/** Escala 15–90% na visão do mestre; o jogador mantém névoa opaca. */
export function normalizarOpacidadeNevoaMestre(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return OPACIDADE_NEVOA_MESTRE_PADRAO;
  return Math.max(15, Math.min(90, Math.round(valor)));
}

export const PRESETS_ILUMINACAO = [
  { id: 'dia', nome: 'Dia claro', ambiente: 85 },
  { id: 'entardecer', nome: 'Entardecer', ambiente: 55 },
  { id: 'noite', nome: 'Noite', ambiente: 20 },
  { id: 'apagar', nome: 'Escuridão', ambiente: 0 },
] as const;
export type PresetIluminacaoId = (typeof PRESETS_ILUMINACAO)[number]['id'];

/** Aplica uma iluminação predefinida sem alterar colisão, luzes e obstáculos. */
export function aplicarPresetIluminacao<
  T extends { ativa: boolean; ambiente: number; colisao: boolean },
>(configuracao: T, presetId: PresetIluminacaoId): T {
  const preset = PRESETS_ILUMINACAO.find((p) => p.id === presetId);
  return preset ? { ...configuracao, ativa: true, ambiente: preset.ambiente } : configuracao;
}

/** Reordena cenas sem trocar a cena ativa nem modificar seus conteúdos. */
export function moverCena<T extends { id: string }>(
  cenas: T[],
  cenaId: string,
  direcao: -1 | 1,
): T[] {
  const origem = cenas.findIndex((c) => c.id === cenaId);
  const destino = origem + direcao;
  if (origem < 0 || destino < 0 || destino >= cenas.length) return cenas;
  const resultado = [...cenas];
  [resultado[origem], resultado[destino]] = [resultado[destino], resultado[origem]];
  return resultado;
}
