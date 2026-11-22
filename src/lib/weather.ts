/** Clima visual opcional por cena. Não altera deslocamento, visão ou combate. */
export const TIPOS_CLIMA = [
  { id: 'nenhum', nome: 'Sem clima', simbolo: '☀', descricao: 'Nenhum efeito sobre o mapa.' },
  { id: 'chuva', nome: 'Chuva', simbolo: '☔', descricao: 'Gotas caindo com o vento.' },
  { id: 'neve', nome: 'Neve', simbolo: '❄', descricao: 'Flocos suaves atravessando a cena.' },
  {
    id: 'neblina',
    nome: 'Neblina',
    simbolo: '☁',
    descricao: 'Brumas em movimento — não confundir com a névoa que esconde o mapa.',
  },
  {
    id: 'cinzas',
    nome: 'Cinzas',
    simbolo: '✧',
    descricao: 'Pequenas partículas flutuantes de cinzas.',
  },
  {
    id: 'areia',
    nome: 'Areia',
    simbolo: '≋',
    descricao: 'Vento carregando poeira e grãos de areia.',
  },
  { id: 'folhas', nome: 'Folhas', simbolo: '❧', descricao: 'Folhagem passando pelo cenário.' },
] as const;
export type TipoClima = (typeof TIPOS_CLIMA)[number]['id'];
export type ConfigClima = {
  tipo: TipoClima;
  intensidade: number; // 0–100: cobertura e densidade da precipitação
  vento: number; // 0–100: influência da velocidade do vento
  direcao: number; // 0–359°: 0 direita, 90 baixo, 180 esquerda, 270 cima
};
export const CLIMA_PADRAO: ConfigClima = Object.freeze({
  tipo: 'nenhum',
  intensidade: 45,
  vento: 35,
  direcao: 0,
});
const limitar = (valor: unknown, minimo: number, maximo: number, padrao: number): number => {
  // Evitar que campos nulos/vazios virem zero ao abrir cenas de versões antigas.
  const numero = typeof valor === 'number' ? valor : Number.NaN;
  return Number.isFinite(numero) ? Math.max(minimo, Math.min(maximo, Math.round(numero))) : padrao;
};
export function normalizarClima(valor: unknown): ConfigClima {
  if (!valor || typeof valor !== 'object') return { ...CLIMA_PADRAO };
  const clima = valor as Partial<ConfigClima>;
  return {
    tipo: TIPOS_CLIMA.some((tipo) => tipo.id === clima.tipo) ? clima.tipo! : 'nenhum',
    intensidade: limitar(clima.intensidade, 0, 100, CLIMA_PADRAO.intensidade),
    vento: limitar(clima.vento, 0, 100, CLIMA_PADRAO.vento),
    direcao: limitar(clima.direcao, 0, 359, CLIMA_PADRAO.direcao),
  };
}
export function climaAtivo(config: ConfigClima, pausado = false): boolean {
  return !pausado && config.tipo !== 'nenhum' && config.intensidade > 0;
}
