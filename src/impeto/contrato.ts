/** Camada transportável Ímpeto RPG 1.0 / Avatar A01.
 * Não substitui os modelos e o estado existentes no Portal do Mestre.
 * Fonte de contrato: exportação `hexatombe-avatar-ficha` v1 do criador.
 */
/** Identificador estável do Portal (não migrar os IDs de campanhas/fichas antigas). */
export const SISTEMA_IMPETO = 'impeto' as const;
export const EDICAO_REGRAS = 'Impeto RPG 1.0 - Playtest Publico M04.2' as const;
export const ESCALA_AVATAR_A01 = {
  id: 'piloto-a01',
  hpBase: 130,
  energiaBase: 120,
  caBase: 8,
  ataqueBaseDados: 2,
  ataqueBaseFixo: 2,
  regeneracaoBase: 0,
  pa: 32,
  pr: 20,
  pt: 6,
  pc: 100,
  px: 35,
} as const;
/** Valores do livro M04.2: modo universal introdutório; todos ajustáveis pelo mestre.
 * Não confundir com o piloto Hexatombe: Avatar A01. */
export const ESCALA_LIVRO_IMPETO = {
  id: 'livro-m042',
  hpBase: 40,
  energiaBase: 30,
  caBase: 8,
  ataqueBaseDados: 2,
  ataqueBaseFixo: 2,
  regeneracaoBase: 0,
  pa: 28,
  pr: 20,
  pt: 4,
  pc: 80,
  px: 25,
} as const;
export type ConfiguracaoCampanhaImpeto = {
  id: string;
  hpBase: number;
  energiaBase: number;
  caBase: number;
  ataqueBaseDados: number;
  ataqueBaseFixo: number;
  regeneracaoBase: number;
  pa: number;
  pr: number;
  pt: number;
  pc: number;
  px: number;
  habilitarD01?: boolean;
  habilitarT02?: boolean;
  habilitarV01?: boolean;
};
export function copiarConfiguracaoCampanha(
  config: ConfiguracaoCampanhaImpeto,
): ConfiguracaoCampanhaImpeto {
  return { ...config };
}
export type Elemento = 'agua' | 'terra' | 'fogo' | 'ar' | 'neutro';
export const NOMES_ATRIBUTOS = [
  'Força',
  'Agilidade',
  'Destreza',
  'Vigor',
  'Intelecto',
  'Percepção',
  'Vontade',
  'Presença',
] as const;
export type NomeAtributo = (typeof NOMES_ATRIBUTOS)[number];
export const NOMES_PERICIAS = [
  'Atletismo',
  'Acrobacia',
  'Furtividade',
  'Precisão Manual',
  'Atenção',
  'Investigação',
  'Sobrevivência',
  'Condução',
  'Conhecimento',
  'Engenharia',
  'Medicina',
  'Persuasão',
  'Enganação',
  'Intimidação',
  'Empatia',
  'Liderança',
] as const;
export type NomePericia = (typeof NOMES_PERICIAS)[number];
export type Atributos = Record<NomeAtributo, number>;
export type Pericias = Record<NomePericia, 0 | 1 | 2>;
export type RecursosPR = {
  /** Pontos de recursos investidos na melhoria do HP */ hp: number;
  /** Pontos de recursos investidos na melhoria da Energia */ energia: number;
  /** CA Base comprada uma vez na criacao (8 a 13) */ ca: number;
  /** Dados d6 adicionados ao Ataque Basico (0..2) */ ataqueDados: number;
  /** Melhorias de regeneracao por rodada (0..2) */ regeneracao: number;
};
export type Derivacao = {
  tipo: '' | 'resistencia' | 'reserva' | 'potencia';
  atributo: NomeAtributo | '';
  justificativa: string;
};
export type Efeito =
  | 'nenhum'
  | 'dano'
  | 'cura'
  | 'escudo'
  | 'mitigacao'
  | 'empurrao'
  | 'imobilizacao'
  | 'atordoamento'
  | 'buffCa1'
  | 'buffCa2';
export type Ativa = {
  nome: string;
  efeito: Efeito;
  dado: 4 | 6 | 8 | 10 | 12;
  quantidade: number;
  fixo: number;
  empurraoAdicional: boolean;
  ativacao: 'principal' | 'buff' | 'reacao';
  alvos: 1 | 2 | 3;
  distante: boolean;
  rodadasExtras: number;
  gatilho: string;
  descricao: string;
  limites: string;
  referenciaAntiga?: string;
};
export type Passiva = {
  nome: string;
  efeito: 'nenhum' | 'dano' | 'escudo' | 'mitigacao';
  dado: 4 | 6 | 8 | 10 | 12;
  quantidade: number;
  fixo: number;
  usos: 1 | 2 | 3;
  gatilho: string;
  descricao: string;
  limites: string;
  referenciaAntiga?: string;
};
export type Exploracao = {
  nome: string;
  classe: 'nenhum' | 'pontual' | 'especializada' | 'complexa' | 'ampla' | 'extraordinaria';
  categoria: string;
  alvos: 1 | 2 | 6;
  alcance: 'proximo' | 'distante' | 'remoto';
  duracao: 'cena' | 'duasCenas' | 'dia';
  usos: 1 | 2 | 3;
  automatica: boolean;
  descricao: string;
  limites: string;
  teste: string;
};
export type FichaAvatar = {
  versao: 1;
  escalaAvatar?: 'piloto-a01';
  nome: string;
  historia: string;
  foto: string;
  elemento: Elemento;
  atributosImpeto?: Atributos;
  periciasImpeto?: Pericias;
  recursosImpeto?: RecursosPR;
  arquetipoImpeto?: string;
  talentoArquetipo?: string;
  vantagemUniversal?: string;
  derivacaoD01?: Derivacao;
  ataqueBasico?: { nome: string; descricao: string };
  ativasImpeto?: Ativa[];
  passivaImpeto?: Passiva;
  exploracaoImpeto?: Exploracao[];
  habilidades?: { nome: string; efeito: string; limitacoes: string; modelo: string }[];
  passiva?: { nome: string; descricao: string; modelo: string };
};
export type PacoteAvatar = {
  formato: 'hexatombe-avatar-ficha';
  versaoFormato: 1;
  exportadoEm?: string;
  ficha: FichaAvatar;
};
export type EstatisticasImpeto = {
  hpMax: number;
  hpAtual: number;
  energiaReferencia: number;
  energiaAtual: number;
  caBase: number;
  regeneracao: number;
  ataqueBasicoDados: number;
  ataqueBasicoFixo: number;
  /** A CA efetiva depende de buffs/debuffs da cena. Nao gravar como CA Base. */
  bonusCaTemporario: number;
  penalidadeCaTemporaria: number;
};
export type FichaPortalImpeto = {
  contrato: 1;
  sistema: typeof SISTEMA_IMPETO;
  escala: 'avatar-a01';
  nome: string;
  foto: string;
  historia: string;
  elemento: Elemento;
  atributos: Atributos;
  pericias: Pericias;
  recursosPR: RecursosPR;
  arquetipo: string;
  talento: string;
  vantagem: string;
  derivacao: Derivacao;
  ataqueBasico: { nome: string; descricao: string };
  ativas: Ativa[];
  passiva: Passiva;
  exploracao: Exploracao[];
  estatisticas: EstatisticasImpeto;
  /** Converter campos historicos exige revisao do mestre; nao inventar os efeitos H06. */
  requerRevisao: boolean;
  avisos: string[];
  /** Copia preservada do arquivo original para eventual retorno/reimportacao. */
  origem: unknown;
};
export const atributosBase = (): Atributos =>
  Object.fromEntries(NOMES_ATRIBUTOS.map((n) => [n, 8])) as Atributos;
export const periciasBase = (): Pericias =>
  Object.fromEntries(NOMES_PERICIAS.map((n) => [n, 0])) as Pericias;
export const recursosBase = (): RecursosPR => ({
  hp: 0,
  energia: 0,
  ca: 8,
  ataqueDados: 0,
  regeneracao: 0,
});
export const derivacaoVazia = (): Derivacao => ({ tipo: '', atributo: '', justificativa: '' });
export const ativaVazia = (): Ativa => ({
  nome: '',
  efeito: 'nenhum',
  dado: 8,
  quantidade: 1,
  fixo: 0,
  empurraoAdicional: false,
  ativacao: 'principal',
  alvos: 1,
  distante: false,
  rodadasExtras: 0,
  gatilho: '',
  descricao: '',
  limites: '',
});
export const passivaVazia = (): Passiva => ({
  nome: '',
  efeito: 'nenhum',
  dado: 4,
  quantidade: 1,
  fixo: 0,
  usos: 1,
  gatilho: '',
  descricao: '',
  limites: '',
});
