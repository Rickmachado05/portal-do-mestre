import { encaixarNaGrade, normalizarGrade, type GradeMapa } from './mapGrid.ts';

/** Ferramentas visuais. Não interferem nas regras do sistema de RPG. */
export type TipoFiltroToken = 'todos' | 'jogador' | 'npc' | 'inimigo';
export type TokenEditavel = {
  x: number;
  y: number;
  tamanho: number;
  rotacao: number;
  oculto: boolean;
  travado?: boolean;
  ocultarNome?: boolean;
};

export function tokenPassaFiltro(tipo: string, filtro: TipoFiltroToken): boolean {
  return filtro === 'todos' || tipo === filtro;
}

/** A cópia fica próxima, sem mover o token de origem nem herdar seu bloqueio. */
export function copiarTokenNaCena<T extends TokenEditavel>(origem: T, grade?: GradeMapa): T {
  const config = normalizarGrade(grade);
  // Com encaixe ligado, desloca exatamente uma casa; no modo livre usa 6% do mapa.
  const distanciaX = config.encaixarTokens ? 100 / config.colunas : 6;
  const distanciaY = config.encaixarTokens ? 100 / config.linhas : 6;
  const x = origem.x + distanciaX > 98 ? origem.x - distanciaX : origem.x + distanciaX;
  const y = origem.y + distanciaY > 98 ? origem.y - distanciaY : origem.y + distanciaY;
  const ponto = { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
  return {
    ...origem,
    ...(config.encaixarTokens ? encaixarNaGrade(ponto, config) : ponto),
    travado: false,
  };
}

/** Delta aplicado ao pan atual para centralizar um token, independentemente do zoom. */
export function deslocamentoParaCentralizarToken(
  token: Pick<TokenEditavel, 'x' | 'y'>,
  palco: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  viewport: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
) {
  return {
    x: viewport.left + viewport.width / 2 - (palco.left + (palco.width * token.x) / 100),
    y: viewport.top + viewport.height / 2 - (palco.top + (palco.height * token.y) / 100),
  };
}
