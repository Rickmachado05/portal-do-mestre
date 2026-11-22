/** Dados de horário por cena. Este módulo não depende de Three.js. */
export type PeriodoDia3D = 'dia' | 'entardecer' | 'noite';
export const PERIODOS_DIA_3D: readonly PeriodoDia3D[] = ['dia', 'entardecer', 'noite'];
export const periodoDia3DValido = (valor: unknown): valor is PeriodoDia3D =>
  typeof valor === 'string' && PERIODOS_DIA_3D.some((periodo) => periodo === valor);

export const AMBIENTES_3D = {
  dia: {
    nome: 'Dia',
    topo: '#4d96cb',
    horizonte: '#bedce5',
    abaixo: '#97af9d',
    chao: '#526f5e',
    nevoa: '#a8cbd0',
    hemisferio: '#d8e9fa',
    sol: '#ffeacb',
    intensidadeHemi: 1,
    intensidadeSol: 2.25,
    solX: -3,
    solY: 9,
    solZ: 5,
  },
  entardecer: {
    nome: 'Entardecer',
    topo: '#4c639b',
    horizonte: '#e9a47c',
    abaixo: '#aa8175',
    chao: '#806858',
    nevoa: '#c59c8b',
    hemisferio: '#d3b6ac',
    sol: '#ffbc8e',
    intensidadeHemi: 0.77,
    intensidadeSol: 1.35,
    solX: -8,
    solY: 4,
    solZ: 4,
  },
  noite: {
    nome: 'Noite',
    topo: '#0a1835',
    horizonte: '#34496d',
    abaixo: '#26374d',
    chao: '#2c4146',
    nevoa: '#2c3e57',
    hemisferio: '#839bc8',
    sol: '#9eb9f1',
    intensidadeHemi: 0.43,
    intensidadeSol: 0.26,
    solX: -3,
    solY: 9,
    solZ: 5,
  },
} as const;
