/** Aparência não destrutiva do aro/fundo do token. Independente para cada skin. */
import {
  TOKEN_ORIGINAL,
  skinAtiva,
  skinsValidas,
  type UnidadeComSkins,
  type TokenComSkin,
} from './tokenSkins';

export type FundoToken = 'escuro' | 'transparente' | 'personalizado';
export type AparenciaToken = { corBorda: string; fundo: FundoToken; corFundo: string };
export type UnidadeComAparencia = UnidadeComSkins & {
  cor: string;
  tokenAparencia?: Partial<AparenciaToken>;
};
export const COR_FUNDO_PADRAO = '#22252d';
export function corHex(valor: unknown, padrao: string): string {
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)
    ? valor.toLowerCase()
    : padrao;
}
export function normalizarAparenciaToken(
  raw?: Partial<AparenciaToken> | null,
  corPadrao = '#b99570',
): AparenciaToken {
  return {
    corBorda: corHex(raw?.corBorda, corHex(corPadrao, '#b99570')),
    fundo: raw?.fundo === 'transparente' || raw?.fundo === 'personalizado' ? raw.fundo : 'escuro',
    corFundo: corHex(raw?.corFundo, COR_FUNDO_PADRAO),
  };
}
/** A skin escolhida herda a cor do personagem, mas nunca sobrescreve outra skin. */
export function aparenciaTokenAtiva(
  unidade: UnidadeComAparencia,
  token?: TokenComSkin,
): AparenciaToken {
  const ativa = skinAtiva(unidade, token);
  if (ativa !== TOKEN_ORIGINAL) {
    const skin = skinsValidas(unidade).find((s) => s.id === ativa);
    return normalizarAparenciaToken(skin?.aparencia, unidade.cor);
  }
  return normalizarAparenciaToken(unidade.tokenAparencia, unidade.cor);
}
export function corFundoToken(aparencia: AparenciaToken): string {
  return aparencia.fundo === 'personalizado' ? aparencia.corFundo : COR_FUNDO_PADRAO;
}
