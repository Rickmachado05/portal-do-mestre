/** Preferências de aparência e movimento para o Dice Box oficial.
 * Não determina ou modifica resultados. Todos os valores são visuais/físicos. */
export const CHAVE_EDITOR_DADOS = 'hexatombe-mesa-atelie-dados-v1';
export const CHAVE_PERFIS_DADOS = 'hexatombe-mesa-perfis-dados-v1';
export const TIPOS_DADOS = [4, 6, 8, 10, 12, 20, 100] as const;
export type TipoDado = (typeof TIPOS_DADOS)[number];

export type ConfigDados = {
  corAtiva: boolean;
  cor: string;
  coresPorTipo: boolean;
  cores: Record<TipoDado, string>;
  escala: number;
  iluminacao: number;
  sombras: boolean;
  sombraTransparencia: number;
  gravidade: number;
  atrito: number;
  quique: number;
  giro: number;
  forca: number;
  altura: number;
  amortecimentoAngular: number;
};
export type PerfilDados = { id: string; nome: string; config: ConfigDados };

export const CORES_PADRAO: Record<TipoDado, string> = {
  4: '#ab729d',
  6: '#7e85d6',
  8: '#439a8c',
  10: '#bc886a',
  12: '#9a7eb8',
  20: '#80639a',
  100: '#6a88a0',
};
export const PADRAO_DADOS: ConfigDados = {
  corAtiva: false,
  cor: '#80639a',
  coresPorTipo: false,
  cores: { ...CORES_PADRAO },
  escala: 5,
  iluminacao: 1,
  sombras: true,
  sombraTransparencia: 0.8,
  gravidade: 1,
  atrito: 0.8,
  quique: 0,
  giro: 4,
  forca: 6,
  altura: 8,
  amortecimentoAngular: 0.4,
};

const normalizarCor = (v: unknown, fallback: string): string =>
  typeof v === 'string' && /^#[\da-fA-F]{6}$/.test(v) ? v : fallback;
const num = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function normalizarConfigDados(v: unknown): ConfigDados {
  const entrada = v && typeof v === 'object' ? (v as Partial<ConfigDados>) : {};
  const cores =
    entrada.cores && typeof entrada.cores === 'object'
      ? entrada.cores
      : ({} as Record<TipoDado, string>);
  return {
    corAtiva: entrada.corAtiva === true,
    cor: normalizarCor(entrada.cor, PADRAO_DADOS.cor),
    coresPorTipo: entrada.coresPorTipo === true,
    cores: Object.fromEntries(
      TIPOS_DADOS.map((tipo) => [tipo, normalizarCor(cores[tipo], CORES_PADRAO[tipo])]),
    ) as Record<TipoDado, string>,
    escala: num(entrada.escala, 5, 2, 9),
    iluminacao: num(entrada.iluminacao, 1, 0.35, 2),
    sombras: entrada.sombras !== false,
    sombraTransparencia: num(entrada.sombraTransparencia, 0.8, 0.15, 1),
    gravidade: num(entrada.gravidade, 1, 0.6, 1.7),
    atrito: num(entrada.atrito, 0.8, 0.2, 1.3),
    quique: num(entrada.quique, 0, 0, 0.6),
    giro: num(entrada.giro, 4, 1, 8),
    forca: num(entrada.forca, 6, 2, 10),
    altura: num(entrada.altura, 8, 5, 11),
    amortecimentoAngular: num(entrada.amortecimentoAngular, 0.4, 0.15, 0.8),
  };
}

export function carregarConfigDados(): ConfigDados {
  try {
    return normalizarConfigDados(JSON.parse(localStorage.getItem(CHAVE_EDITOR_DADOS) || 'null'));
  } catch {
    return normalizarConfigDados(null);
  }
}
export function salvarConfigDados(config: ConfigDados): ConfigDados {
  const segura = normalizarConfigDados(config);
  localStorage.setItem(CHAVE_EDITOR_DADOS, JSON.stringify(segura));
  return segura;
}
export function carregarPerfisDados(): PerfilDados[] {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE_PERFIS_DADOS) || '[]') as unknown;
    if (!Array.isArray(valor)) return [];
    return valor
      .filter(
        (p): p is PerfilDados =>
          p !== null &&
          typeof p === 'object' &&
          typeof p.id === 'string' &&
          typeof p.nome === 'string',
      )
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        nome: p.nome.slice(0, 40),
        config: normalizarConfigDados(p.config),
      }));
  } catch {
    return [];
  }
}
export function salvarPerfisDados(perfis: PerfilDados[]) {
  localStorage.setItem(CHAVE_PERFIS_DADOS, JSON.stringify(perfis.slice(0, 20)));
}

/** Aplicado apenas antes de lançar; preserva o resultado calculado pelo motor. */
export function opcoesDiceBox(config: ConfigDados, faces: number, corAntiga: string) {
  const cor = config.coresPorTipo
    ? (config.cores[faces as TipoDado] ?? config.cor)
    : config.corAtiva
      ? config.cor
      : corAntiga;
  return {
    themeColor: cor,
    scale: config.escala,
    lightIntensity: config.iluminacao,
    enableShadows: config.sombras,
    shadowTransparency: config.sombraTransparencia,
    gravity: config.gravidade,
    friction: config.atrito,
    restitution: config.quique,
    spinForce: config.giro,
    throwForce: config.forca,
    startingHeight: config.altura,
    angularDamping: config.amortecimentoAngular,
  };
}
