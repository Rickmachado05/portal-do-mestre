/** Lógica independente do protótipo 2.5D. Não modifica a campanha nem a mesa 2D. */
export type PontoXZ = { x: number; z: number };
export type Obstaculo = { x: number; z: number; largura: number; profundidade: number };
export type Interacao = PontoXZ & {
  id: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
};

export const LIMITES = { minX: -13.4, maxX: 13.4, minZ: -9.3, maxZ: 9.3 };
export const RAIO_PERSONAGEM = 0.43;
export const VELOCIDADE_NORMAL = 4.25;
export const VELOCIDADE_CORRIDA = 6.7;

// Obstáculos acompanham as peças fixas do cenário de demonstração.
export const OBSTACULOS: Obstaculo[] = [
  { x: -8.1, z: -5.0, largura: 3.2, profundidade: 1.45 },
  { x: 8.3, z: -5.0, largura: 3.2, profundidade: 1.45 },
  { x: 0, z: -5.4, largura: 4.6, profundidade: 2.0 },
  { x: -8.6, z: 4.4, largura: 2.3, profundidade: 2.4 },
  { x: 8.1, z: 3.3, largura: 2.5, profundidade: 2.0 },
  { x: -11.7, z: -0.2, largura: 1.4, profundidade: 1.4 },
  { x: 11.7, z: -0.2, largura: 1.4, profundidade: 1.4 },
];

export const INTERACOES: Interacao[] = [
  {
    id: 'altar',
    x: 0,
    z: -3.1,
    titulo: 'Altar das Constelações',
    subtitulo: 'Um eco de uma história esquecida',
    descricao:
      'Inscrições antigas percorrem a superfície da pedra. Neste primeiro protótipo, a interação é apenas narrativa: futuramente poderemos abrir diálogos, documentos e eventos da campanha.',
  },
  {
    id: 'bau',
    x: 8.1,
    z: 5.2,
    titulo: 'Baú de Viagem',
    subtitulo: 'Objetos e recompensas',
    descricao:
      'O baú permanece fechado. Aqui poderemos testar uma futura interação com itens, mas nada é adicionado ao inventário e nenhum dado da campanha é alterado.',
  },
  {
    id: 'arquivo',
    x: -8.7,
    z: 6.4,
    titulo: 'Arquivo do Observatório',
    subtitulo: 'Notas e pistas do cenário',
    descricao:
      'Páginas amareladas descrevem uma expedição sob o luar. Um dia, poderemos vincular este ponto de interesse a anotações do Caderno do Mestre.',
  },
];

export function colideComObstaculo(
  x: number,
  z: number,
  obstaculos: readonly Obstaculo[] = OBSTACULOS,
  raio = RAIO_PERSONAGEM,
): boolean {
  if (
    x - raio < LIMITES.minX ||
    x + raio > LIMITES.maxX ||
    z - raio < LIMITES.minZ ||
    z + raio > LIMITES.maxZ
  )
    return true;
  return obstaculos.some((o) => {
    const px = Math.max(o.x - o.largura / 2, Math.min(x, o.x + o.largura / 2));
    const pz = Math.max(o.z - o.profundidade / 2, Math.min(z, o.z + o.profundidade / 2));
    return (x - px) ** 2 + (z - pz) ** 2 < raio ** 2;
  });
}

/** Movimento por eixo separado: desliza ao longo de paredes, sem atravessá-las. */
export function moverPersonagem(
  pos: PontoXZ,
  dx: number,
  dz: number,
  obstaculos: readonly Obstaculo[] = OBSTACULOS,
): PontoXZ {
  const novoX = colideComObstaculo(pos.x + dx, pos.z, obstaculos) ? pos.x : pos.x + dx;
  const novoZ = colideComObstaculo(novoX, pos.z + dz, obstaculos) ? pos.z : pos.z + dz;
  return { x: novoX, z: novoZ };
}

/** WASD relativo à projeção da câmera: W sempre segue para cima na tela. */
export function vetorMovimento(t: number, l: number, frente: PontoXZ, direita: PontoXZ): PontoXZ {
  const x = frente.x * t + direita.x * l;
  const z = frente.z * t + direita.z * l;
  const tamanho = Math.hypot(x, z);
  return tamanho > 0 ? { x: x / tamanho, z: z / tamanho } : { x: 0, z: 0 };
}

export function interacaoProxima(pos: PontoXZ, raio = 2.5): Interacao | null {
  let melhor: Interacao | null = null;
  let distancia = raio;
  for (const item of INTERACOES) {
    const atual = Math.hypot(pos.x - item.x, pos.z - item.z);
    if (atual < distancia) {
      distancia = atual;
      melhor = item;
    }
  }
  return melhor;
}

export function urlExploracao(campanhaId: string): string {
  return `/exploracao/?campanha=${encodeURIComponent(campanhaId)}`;
}
