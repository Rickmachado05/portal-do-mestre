/** Grade de cena opcional. Coordenadas da mesa são percentuais (0 a 100). */
export type GradeMapa = {
  visivel: boolean;
  encaixarTokens: boolean;
  colunas: number;
  linhas: number;
};

export const GRADE_PADRAO: GradeMapa = {
  visivel: false,
  encaixarTokens: false,
  colunas: 20,
  linhas: 12,
};

const limitarDivisoes = (numero: unknown, padrao: number): number =>
  typeof numero === 'number' && Number.isFinite(numero)
    ? Math.max(4, Math.min(60, Math.round(numero)))
    : padrao;

export function normalizarGrade(grade?: Partial<GradeMapa> | null): GradeMapa {
  return {
    visivel: grade?.visivel === true,
    encaixarTokens: grade?.encaixarTokens === true,
    colunas: limitarDivisoes(grade?.colunas, GRADE_PADRAO.colunas),
    linhas: limitarDivisoes(grade?.linhas, GRADE_PADRAO.linhas),
  };
}

/** Centraliza o token na célula mais próxima; não depende do zoom ou pan. */
export function encaixarNaGrade(ponto: { x: number; y: number }, grade: GradeMapa) {
  const x = Math.max(0, Math.min(grade.colunas - 1, Math.floor((ponto.x * grade.colunas) / 100)));
  const y = Math.max(0, Math.min(grade.linhas - 1, Math.floor((ponto.y * grade.linhas) / 100)));
  return {
    x: ((x + 0.5) * 100) / grade.colunas,
    y: ((y + 0.5) * 100) / grade.linhas,
  };
}
