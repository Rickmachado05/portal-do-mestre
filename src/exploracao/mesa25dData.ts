/** Ponte de leitura/posicionamento da mesa 2D para sua projeção 2.5D.
 * O mesmo registro de campanha é utilizado pelos dois modos. */
import { bloqueiaPassagem, type BarreiraMapa } from '../lib/lighting';
import { normalizarClima, type ConfigClima } from '../lib/weather';
import { chaveEstadoCampanha } from '../hexatombe/campaignLibrary';
import { skinAtiva, type TokenSkin } from '../lib/tokenSkins';

export type PontoPct = { x: number; y: number };
export type Token25D = PontoPct & {
  tamanho: number;
  rotacao: number;
  oculto: boolean;
  travado: boolean;
  ocultarNome: boolean;
  skinId?: string;
  visao: number;
  emiteLuz: boolean;
  alcanceLuz: number;
  corLuz: string;
};
export type Unidade25D = {
  id: string;
  nome: string;
  tipo: 'jogador' | 'npc' | 'inimigo';
  cor: string;
  temToken: boolean;
  temRetrato: boolean;
  skins?: TokenSkin[];
  skinPadraoId?: string;
};
export type Traco25D = {
  id: string;
  acao: 'revelar' | 'ocultar';
  pontos: PontoPct[];
  raio: number;
};
export type Fonte25D = PontoPct & { id: string; cor: string; alcance: number; ativa: boolean };
export type Cena25D = {
  id: string;
  nome: string;
  temMapa: boolean;
  camadas: { fundo: boolean; tokens: boolean };
  visibilidade: 'total' | 'nevoa' | 'visao' | 'nevoa_visao';
  nevoa: Traco25D[];
  barreiras: BarreiraMapa[];
  fontesLuz: Fonte25D[];
  iluminacao: { ativa: boolean; ambiente: number; colisao: boolean };
  clima: ConfigClima;
  tokens: Record<string, Token25D>;
};
export type Estado25D = {
  titulo: string;
  cenaAtivaId: string;
  cenas: Cena25D[];
  unidades: Unidade25D[];
};
export type Dimensoes25D = { largura: number; altura: number };
const entre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const numero = (value: unknown, def: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : def;
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const tipoUnidade = (v: unknown): Unidade25D['tipo'] =>
  v === 'npc' || v === 'inimigo' ? v : 'jogador';
export function normalizarEstadoMesa25D(raw: unknown): Estado25D {
  const data = obj(raw);
  const unidades = lista(data.unidades)
    .filter((v) => typeof obj(v).id === 'string')
    .map((v) => {
      const u = obj(v);
      const cor = typeof u.cor === 'string' && /^#[0-9a-f]{6}$/i.test(u.cor) ? u.cor : '#7198a2';
      return {
        id: String(u.id),
        nome: String(u.nome || 'Personagem').slice(0, 90),
        tipo: tipoUnidade(u.tipo),
        cor,
        temToken: Boolean(u.temToken),
        temRetrato: Boolean(u.temRetrato),
        skins: Array.isArray(u.skins) ? (u.skins as TokenSkin[]) : [],
        skinPadraoId: typeof u.skinPadraoId === 'string' ? u.skinPadraoId : undefined,
      };
    });
  const cenas = lista(data.cenas)
    .filter((v) => typeof obj(v).id === 'string')
    .map((v) => {
      const c = obj(v),
        tokens = obj(c.tokens),
        light = obj(c.iluminacao),
        layers = obj(c.camadas);
      const visibilidade = ['total', 'nevoa', 'visao', 'nevoa_visao'].includes(
        String(c.visibilidade),
      )
        ? (c.visibilidade as Cena25D['visibilidade'])
        : 'total';
      const map: Record<string, Token25D> = {};
      for (const [id, rawToken] of Object.entries(tokens)) {
        const t = obj(rawToken);
        map[id] = {
          x: entre(numero(t.x, 50), 0, 100),
          y: entre(numero(t.y, 50), 0, 100),
          tamanho: entre(numero(t.tamanho, 70), 18, 300),
          rotacao: numero(t.rotacao, 0),
          oculto: Boolean(t.oculto),
          travado: Boolean(t.travado),
          ocultarNome: Boolean(t.ocultarNome),
          skinId: typeof t.skinId === 'string' ? t.skinId : undefined,
          visao: entre(numero(t.visao, 18), 2, 50),
          emiteLuz: Boolean(t.emiteLuz),
          alcanceLuz: entre(numero(t.alcanceLuz, 15), 2, 70),
          corLuz: typeof t.corLuz === 'string' ? t.corLuz : '#ffcd86',
        };
      }
      const barreiras = lista(c.barreiras)
        .filter((b) => ['parede', 'porta'].includes(String(obj(b).tipo)))
        .map((b) => {
          const p = obj(b);
          return {
            id: String(p.id || ''),
            tipo: p.tipo as BarreiraMapa['tipo'],
            x1: numero(p.x1, 0),
            y1: numero(p.y1, 0),
            x2: numero(p.x2, 0),
            y2: numero(p.y2, 0),
            aberta: Boolean(p.aberta),
            trancada: Boolean(p.trancada),
          };
        });
      const fontesLuz = lista(c.fontesLuz).map((f) => {
        const p = obj(f);
        return {
          id: String(p.id || ''),
          x: numero(p.x, 0),
          y: numero(p.y, 0),
          cor: String(p.cor || '#ffd18e'),
          alcance: entre(numero(p.alcance, 15), 2, 70),
          ativa: p.ativa !== false,
        };
      });
      const nevoa = lista(c.nevoa).map((t) => {
        const p = obj(t);
        return {
          id: String(p.id || ''),
          acao: p.acao === 'revelar' ? ('revelar' as const) : ('ocultar' as const),
          raio: entre(numero(p.raio, 4), 0.2, 50),
          pontos: lista(p.pontos).map((q) => ({ x: numero(obj(q).x, 0), y: numero(obj(q).y, 0) })),
        };
      });
      return {
        id: String(c.id),
        nome: String(c.nome || 'Cena').slice(0, 100),
        temMapa: Boolean(c.temMapa),
        camadas: { fundo: layers.fundo !== false, tokens: layers.tokens !== false },
        visibilidade,
        nevoa,
        barreiras,
        fontesLuz,
        iluminacao: {
          ativa: Boolean(light.ativa),
          ambiente: entre(numero(light.ambiente, 40), 0, 100),
          colisao: Boolean(light.colisao),
        },
        clima: normalizarClima(c.clima),
        tokens: map,
      };
    });
  return {
    titulo: String(data.titulo || 'Mesa do Mestre'),
    cenaAtivaId: String(data.cenaAtivaId || cenas[0]?.id || ''),
    cenas,
    unidades,
  };
}
export function posicaoMundo(p: PontoPct, dim: Dimensoes25D): { x: number; z: number } {
  return { x: (p.x / 100 - 0.5) * dim.largura, z: (p.y / 100 - 0.5) * dim.altura };
}
export function posicaoPct(p: { x: number; z: number }, dim: Dimensoes25D): PontoPct {
  return {
    x: entre((p.x / dim.largura + 0.5) * 100, 0, 100),
    y: entre((p.z / dim.altura + 0.5) * 100, 0, 100),
  };
}
export function dimensoesMapa(larguraPx: number, alturaPx: number): Dimensoes25D {
  // Preserva a proporção natural do arquivo, inclusive em mapas altos ou estreitos.
  return { largura: 28, altura: (28 * Math.max(1, alturaPx)) / Math.max(1, larguraPx) };
}
/** Colisão contra limites e segmentos de parede/porta (aberta deixa passar). */
export function moverTokenMesa25D(
  atual: PontoPct,
  deltaX: number,
  deltaY: number,
  cena: Pick<Cena25D, 'barreiras'>,
  dim: Dimensoes25D,
): PontoPct {
  const mx = dim.largura,
    my = dim.altura;
  const raioPctX = (0.33 / mx) * 100,
    raioPctY = (0.33 / my) * 100;
  const valida = (a: PontoPct, b: PontoPct) =>
    b.x >= raioPctX &&
    b.x <= 100 - raioPctX &&
    b.y >= raioPctY &&
    b.y <= 100 - raioPctY &&
    !bloqueiaPassagem(a, b, cena.barreiras, mx, my);
  const nx = { x: atual.x + (deltaX / mx) * 100, y: atual.y };
  const x = valida(atual, nx) ? nx : atual;
  const ny = { x: x.x, y: x.y + (deltaY / my) * 100 };
  return valida(x, ny) ? ny : x;
}
export function skinDoToken25D(u: Unidade25D, t: Token25D): string {
  return skinAtiva(u, t);
}
/** Não altera fichas, inventários, cenas adjacentes ou outras posições.
 * Verifica novamente a cena/token no armazenamento antes de gravar. */
export function salvarPosicaoToken25D(
  campanhaId: string,
  cenaId: string,
  tokenId: string,
  p: PontoPct,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): boolean {
  const key = chaveEstadoCampanha(campanhaId);
  const original = storage.getItem(key);
  if (!original) return false;
  try {
    const state = JSON.parse(original) as Record<string, unknown>;
    if (!Array.isArray(state.cenas)) return false;
    const cena = state.cenas.find((v: unknown) => obj(v).id === cenaId);
    if (!cena || !cena.tokens || !obj(cena.tokens)[tokenId]) return false;
    const token = obj(cena.tokens[tokenId]);
    if (token.travado) return false;
    cena.tokens[tokenId] = { ...token, x: entre(p.x, 0, 100), y: entre(p.y, 0, 100) };
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function nevoaReveladaNoPonto(cena: Cena25D, p: PontoPct): boolean {
  if (cena.visibilidade !== 'nevoa' && cena.visibilidade !== 'nevoa_visao') return true;
  let revelada = false;
  for (const t of cena.nevoa) {
    for (let i = 0; i < t.pontos.length; i++) {
      const a = t.pontos[i],
        b = t.pontos[Math.min(i + 1, t.pontos.length - 1)];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        k = dx * dx + dy * dy;
      const h = k > 0 ? entre(((p.x - a.x) * dx + (p.y - a.y) * dy) / k, 0, 1) : 0;
      if (Math.hypot(p.x - a.x - h * dx, p.y - a.y - h * dy) <= t.raio) {
        revelada = t.acao === 'revelar';
        break;
      }
    }
  }
  return revelada;
}
export function dentroPoligono(p: PontoPct, poly: PontoPct[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
