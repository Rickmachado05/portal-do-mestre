/** v1.3.40: mesma geometria da planta e das barreiras para 2D e 3D.
 * A origem da verdade das paredes é `cenas[].barreiras` (estado da Mesa 2D).
 * Todas as coordenadas persistidas são percentuais: nunca dependem da resolução
 * do canvas, do zoom, da câmera ou de metros específicos do terreno 3D.
 */
import { barreiraBloqueiaMovimento, bloqueiaPassagem, type BarreiraMapa } from '../lib/lighting';
import { alterarMesaCompartilhada } from './administracaoMesa3D';
import { dimensoesTerreno3D, type Cenario3D } from './editorCena3D';
import type { Posicao } from './roomLogic';

const limitar = (v: number) => Math.max(0, Math.min(100, v));
export const barreiraAtiva3D = (b: BarreiraMapa) => barreiraBloqueiaMovimento(b);
export function pontoMapaPara3D(p: { x: number; y: number }, cenario: Cenario3D): Posicao {
  const a = dimensoesTerreno3D(cenario);
  return {
    x: a.minX + (a.largura * limitar(p.x)) / 100,
    z: a.minZ + (a.profundidade * limitar(p.y)) / 100,
  };
}
export function ponto3DParaMapa(p: Posicao, cenario: Cenario3D) {
  const a = dimensoesTerreno3D(cenario);
  return {
    x: limitar(((p.x - a.minX) / a.largura) * 100),
    y: limitar(((p.z - a.minZ) / a.profundidade) * 100),
  };
}
export function parede3DDistancia(p: Posicao, b: BarreiraMapa, cenario: Cenario3D): number {
  const a = pontoMapaPara3D({ x: b.x1, y: b.y1 }, cenario),
    c = pontoMapaPara3D({ x: b.x2, y: b.y2 }, cenario);
  const dx = c.x - a.x,
    dz = c.z - a.z,
    div = dx * dx + dz * dz;
  const t = div > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / div)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
/** Impede atravessar paredes, inclusive no WASD rápido e nas portas fechadas.
 * Se um token legado nasceu sobre a linha, deixamos sair dela. */
export function bloqueiaMovimentoCompartilhado3D(
  inicio: Posicao,
  fim: Posicao,
  barreiras: readonly BarreiraMapa[],
  cenario: Cenario3D,
  raio = 0.26,
): boolean {
  const a = ponto3DParaMapa(inicio, cenario),
    b = ponto3DParaMapa(fim, cenario);
  const ativas = barreiras.filter(barreiraAtiva3D);
  if (bloqueiaPassagem(a, b, ativas, 100, 100)) return true;
  return ativas.some(
    (linha) =>
      parede3DDistancia(fim, linha, cenario) < raio &&
      parede3DDistancia(inicio, linha, cenario) >= raio,
  );
}
export function pontoBloqueadoPorBarreira3D(
  p: Posicao,
  barreiras: readonly BarreiraMapa[],
  cenario: Cenario3D,
  raio = 0.26,
): boolean {
  return barreiras.some((b) => barreiraAtiva3D(b) && parede3DDistancia(p, b, cenario) < raio);
}
export function criarBarreiraCompartilhada3D(
  campanhaId: string,
  cenaId: string,
  tipo: 'parede' | 'porta',
  inicio: Posicao,
  fim: Posicao,
  cenario: Cenario3D,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (Math.hypot(fim.x - inicio.x, fim.z - inicio.z) < 0.15) return false;
  const a = ponto3DParaMapa(inicio, cenario),
    b = ponto3DParaMapa(fim, cenario);
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena) return false;
      const anteriores = Array.isArray(cena.barreiras) ? (cena.barreiras as BarreiraMapa[]) : [];
      if (anteriores.length >= 600) return false;
      const id = `barreira-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
      cena.barreiras = [
        ...anteriores,
        { id, tipo, x1: a.x, y1: a.y, x2: b.x, y2: b.y, aberta: false, trancada: false },
      ];
      return true;
    },
    storage,
  );
}
export function editarBarreiraCompartilhada3D(
  campanhaId: string,
  cenaId: string,
  barreira: BarreiraMapa,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena || !Array.isArray(cena.barreiras)) return false;
      const anteriores = cena.barreiras as BarreiraMapa[];
      if (!anteriores.some((b) => b.id === barreira.id)) return false;
      const numeros = [barreira.x1, barreira.x2, barreira.y1, barreira.y2];
      if (!numeros.every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return false;
      cena.barreiras = anteriores.map((b) => (b.id === barreira.id ? { ...b, ...barreira } : b));
      return true;
    },
    storage,
  );
}
export function excluirBarreiraCompartilhada3D(
  campanhaId: string,
  cenaId: string,
  id: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena || !Array.isArray(cena.barreiras)) return false;
      const restantes = (cena.barreiras as BarreiraMapa[]).filter((b) => b.id !== id);
      if (restantes.length === (cena.barreiras as BarreiraMapa[]).length) return false;
      cena.barreiras = restantes;
      return true;
    },
    storage,
  );
}
