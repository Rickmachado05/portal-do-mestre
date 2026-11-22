/** Enquadramento visual por imagem, sem cortar ou modificar o PNG/JPG original. */
import type { CSSProperties } from 'react';
import {
  TOKEN_ORIGINAL,
  skinAtiva,
  skinsValidas,
  type UnidadeComSkins,
  type TokenComSkin,
} from './tokenSkins';

export type EnquadramentoImagem = { x: number; y: number; zoom: number };
export const ENQUADRAMENTO_PADRAO: EnquadramentoImagem = { x: 0, y: 0, zoom: 1 };
export function normalizarEnquadramento(
  dados?: Partial<EnquadramentoImagem> | null,
): EnquadramentoImagem {
  const clamp = (value: unknown, min: number, max: number, padrao: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : padrao;
  return {
    x: clamp(dados?.x, -100, 100, 0),
    y: clamp(dados?.y, -100, 100, 0),
    zoom: clamp(dados?.zoom, 0.6, 3, 1),
  };
}
export type UnidadeComEnquadramentos = UnidadeComSkins & {
  retratoEnquadramento?: EnquadramentoImagem;
  tokenEnquadramento?: EnquadramentoImagem;
};
export function enquadramentoTokenAtivo(
  unidade: UnidadeComEnquadramentos,
  token?: TokenComSkin,
): EnquadramentoImagem {
  const skinId = skinAtiva(unidade, token);
  if (skinId !== TOKEN_ORIGINAL) {
    const skin = skinsValidas(unidade).find((s) => s.id === skinId);
    return normalizarEnquadramento(skin?.enquadramento);
  }
  return normalizarEnquadramento(unidade.tokenEnquadramento);
}
export function estiloEnquadramento(dados?: Partial<EnquadramentoImagem> | null): CSSProperties {
  const a = normalizarEnquadramento(dados);
  return {
    '--ajuste-x': `${a.x}%`,
    '--ajuste-y': `${a.y}%`,
    '--ajuste-zoom': a.zoom,
  } as CSSProperties;
}
