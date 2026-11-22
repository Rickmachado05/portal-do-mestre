/** Coordenadas percentuais compartilhadas entre as mesas 2D e 3D. */
export type PontoAnotacao = { x: number; y: number };
export type TracoDesenho = { id: string; pontos: PontoAnotacao[]; cor: string; espessura: number };
export type MarcadorMapa = PontoAnotacao & { id: string; texto: string };
export type FonteLuzMesa = PontoAnotacao & {
  id: string;
  nome?: string;
  cor: string;
  alcance: number;
  ativa: boolean;
};
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const ponto = (p: unknown): PontoAnotacao | null => {
  if (!p || typeof p !== 'object') return null;
  const v = p as Record<string, unknown>;
  if (
    typeof v.x !== 'number' ||
    typeof v.y !== 'number' ||
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y)
  )
    return null;
  return { x: limitar(v.x, 0, 100), y: limitar(v.y, 0, 100) };
};
const hexadecimal = (c: unknown, padrao = '#f1bb78') =>
  typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : padrao;
export function normalizarDesenhos(value: unknown): TracoDesenho[] {
  if (!Array.isArray(value)) return [];
  const usados = new Set<string>();
  return value.slice(-200).flatMap((v) => {
    if (!v || typeof v !== 'object') return [];
    const t = v as Record<string, unknown>;
    if (typeof t.id !== 'string' || t.id.length > 100 || !t.id || usados.has(t.id)) return [];
    usados.add(t.id);
    const pontos = (Array.isArray(t.pontos) ? t.pontos : [])
      .slice(0, 500)
      .map(ponto)
      .filter((p): p is PontoAnotacao => !!p);
    if (!pontos.length) return [];
    return [
      {
        id: t.id,
        pontos,
        cor: hexadecimal(t.cor),
        espessura:
          typeof t.espessura === 'number' && Number.isFinite(t.espessura)
            ? limitar(t.espessura, 0.5, 16)
            : 3,
      },
    ];
  });
}
export function normalizarMarcadores(value: unknown): MarcadorMapa[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 300).flatMap((v) => {
    const p = ponto(v);
    if (!p || !v || typeof v !== 'object') return [];
    const r = v as Record<string, unknown>;
    return typeof r.id === 'string' && r.id.length <= 100
      ? [{ ...p, id: r.id, texto: String(r.texto || 'Ponto de interesse').slice(0, 90) }]
      : [];
  });
}
/** Os novos focos 3D e as lâmpadas do 2D passam a usar uma única coleção. */
export function fonteLuzPadrao(id: string, p: PontoAnotacao, nome = 'Luz quente'): FonteLuzMesa {
  return { ...p, id, nome, cor: '#ffd48b', alcance: 17, ativa: true };
}
export function luz3DParaFonte(
  o: { id: string; nome: string; x: number; z: number },
  limites: { minX: number; minZ: number; largura: number; profundidade: number },
): FonteLuzMesa {
  return fonteLuzPadrao(
    `luz3d-${o.id}`,
    {
      x: limitar(((o.x - limites.minX) / limites.largura) * 100, 0, 100),
      y: limitar(((o.z - limites.minZ) / limites.profundidade) * 100, 0, 100),
    },
    o.nome || 'Luz quente',
  );
}
