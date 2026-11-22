/** Visibilidade geométrica em coordenadas de mapa (%). Sem dependências extras. */
export type Ponto = { x: number; y: number };
export type BarreiraMapa = {
  id: string;
  tipo: 'parede' | 'porta' | 'janela' | 'mureta';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  aberta: boolean;
  trancada: boolean;
  /** Omissos em cenas antigas preservam as regras tradicionais de parede/porta. */
  bloqueiaMovimento?: boolean;
  bloqueiaVisao?: boolean;
};

type Segmento = { a: Ponto; b: Ponto };
const cruz = (a: Ponto, b: Ponto) => a.x * b.y - a.y * b.x;
const sub = (a: Ponto, b: Ponto): Ponto => ({ x: a.x - b.x, y: a.y - b.y });
export const TIPOS_BARREIRA = ['parede', 'janela', 'mureta', 'porta'] as const;
export const NOMES_BARREIRA: Record<BarreiraMapa['tipo'], string> = {
  parede: 'Parede sólida',
  janela: 'Janela',
  mureta: 'Mureta',
  porta: 'Porta',
};
/** Abertura de porta sempre libera passagem e visão, mesmo com ajustes anteriores. */
export function barreiraBloqueiaVisao(b: BarreiraMapa): boolean {
  if (b.tipo === 'porta' && b.aberta) return false;
  return b.bloqueiaVisao ?? (b.tipo === 'parede' || b.tipo === 'porta');
}
export function barreiraBloqueiaMovimento(b: BarreiraMapa): boolean {
  if (b.tipo === 'porta' && b.aberta) return false;
  return b.bloqueiaMovimento ?? true;
}
export function alterarTipoBarreira(b: BarreiraMapa, tipo: BarreiraMapa['tipo']): BarreiraMapa {
  return {
    ...b,
    tipo,
    aberta: false,
    trancada: false,
    bloqueiaMovimento: true,
    bloqueiaVisao: tipo === 'parede' || tipo === 'porta',
  };
}
const segmentosAtivos = (
  barreiras: readonly BarreiraMapa[],
  largura: number,
  altura: number,
  bloqueia: (b: BarreiraMapa) => boolean,
): Segmento[] =>
  barreiras
    .filter(bloqueia)
    .map((b) => ({
      a: { x: (b.x1 * largura) / 100, y: (b.y1 * altura) / 100 },
      b: { x: (b.x2 * largura) / 100, y: (b.y2 * altura) / 100 },
    }));

/** Retorna distância ao obstáculo (ou null) num raio t >= 0, u em [0,1]. */
function intersecaoRaio(origem: Ponto, dir: Ponto, seg: Segmento): number | null {
  const v = sub(seg.b, seg.a),
    q = sub(seg.a, origem),
    den = cruz(dir, v);
  if (Math.abs(den) < 1e-9) return null;
  const t = cruz(q, v) / den,
    u = cruz(q, dir) / den;
  return t >= 0 && u >= 0 && u <= 1 ? t : null;
}

/**
 * Polígono de visão/luz limitado pelo raio circular, bordas e obstáculos.
 * Rays uniformes + rays adjacentes a cada extremidade evitam cortes grosseiros.
 * Coordenadas resultantes em pixels do palco, sem distorcer mapas retangulares.
 */
export function calcularPoligonoVisao(
  posX: number,
  posY: number,
  raioPercentual: number,
  barreiras: BarreiraMapa[],
  largura: number,
  altura: number,
): Ponto[] {
  if (largura <= 0 || altura <= 0 || raioPercentual <= 0) return [];
  const origem = { x: (posX * largura) / 100, y: (posY * altura) / 100 };
  const raio = (raioPercentual * largura) / 100;
  const segmentos = segmentosAtivos(barreiras, largura, altura, barreiraBloqueiaVisao);
  segmentos.push(
    { a: { x: 0, y: 0 }, b: { x: largura, y: 0 } },
    { a: { x: largura, y: 0 }, b: { x: largura, y: altura } },
    { a: { x: largura, y: altura }, b: { x: 0, y: altura } },
    { a: { x: 0, y: altura }, b: { x: 0, y: 0 } },
  );
  const angulos: number[] = [];
  // Arco suficientemente suave sem gerar milhares de raios em cada movimento.
  for (let i = 0; i < 128; i++) angulos.push((i / 128) * Math.PI * 2);
  for (const seg of segmentos) {
    for (const p of [seg.a, seg.b]) {
      const a = Math.atan2(p.y - origem.y, p.x - origem.x);
      const normal = (v: number) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      angulos.push(normal(a - 0.00012), normal(a), normal(a + 0.00012));
    }
  }
  angulos.sort((a, b) => a - b);
  return angulos.map((a) => {
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    let dist = raio;
    for (const seg of segmentos) {
      const t = intersecaoRaio(origem, dir, seg);
      if (t !== null && t < dist) dist = t;
    }
    return {
      x: Math.max(0, Math.min(largura, origem.x + dir.x * dist)),
      y: Math.max(0, Math.min(altura, origem.y + dir.y * dist)),
    };
  });
}

/** Bloqueio de um deslocamento de centro a centro. Permite atravessar portas abertas. */
export function bloqueiaPassagem(
  inicio: Ponto,
  fim: Ponto,
  barreiras: BarreiraMapa[],
  largura: number,
  altura: number,
): boolean {
  const a = { x: (inicio.x * largura) / 100, y: (inicio.y * altura) / 100 };
  const b = { x: (fim.x * largura) / 100, y: (fim.y * altura) / 100 };
  const r = sub(b, a);
  if (Math.hypot(r.x, r.y) < 0.001) return false;
  for (const s of segmentosAtivos(barreiras, largura, altura, barreiraBloqueiaMovimento)) {
    const v = sub(s.b, s.a),
      q = sub(s.a, a),
      den = cruz(r, v);
    if (Math.abs(den) < 1e-9) continue;
    const t = cruz(q, v) / den,
      u = cruz(q, r) / den;
    if (t > 1e-6 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}
export function pontoString(pontos: Ponto[]): string {
  return pontos.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
