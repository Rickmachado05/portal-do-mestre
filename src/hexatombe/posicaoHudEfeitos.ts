/** Posição visual compartilhada da HUD de efeitos, sem alterar fichas/cenas. */
export type PosicaoHudEfeitos = { x: number; y: number };
export type MedidasHudEfeitos = { largura: number; altura: number };
const CHAVE = 'portal-mestre-efeitos-hud-mesa-v13430';
const minimo = (n: number, a: number, b: number) => Math.min(Math.max(n, a), Math.max(a, b));
export function limitarPosicaoHudEfeitos(
  pos: PosicaoHudEfeitos,
  hud: MedidasHudEfeitos,
  tela: MedidasHudEfeitos,
): PosicaoHudEfeitos {
  const w = Number.isFinite(tela.largura) ? Math.max(1, tela.largura) : 900;
  const h = Number.isFinite(tela.altura) ? Math.max(1, tela.altura) : 600;
  const maxX = Math.max(8, w - Math.max(1, hud.largura) - 8);
  const maxY = Math.max(66, h - Math.max(1, hud.altura) - 8);
  return {
    x: minimo(Number.isFinite(pos.x) ? pos.x : 8, 8, maxX),
    y: minimo(Number.isFinite(pos.y) ? pos.y : 66, 66, maxY),
  };
}
export function posicaoInicialHudEfeitos(
  tela: MedidasHudEfeitos = { largura: 1200, altura: 800 },
  hud: MedidasHudEfeitos = { largura: 286, altura: 165 },
): PosicaoHudEfeitos {
  return limitarPosicaoHudEfeitos(
    { x: tela.largura - hud.largura - 136, y: Math.max(90, tela.altura - hud.altura - 108) },
    hud,
    tela,
  );
}
export function lerPosicaoHudEfeitos(storage?: Pick<Storage, 'getItem'>): PosicaoHudEfeitos | null {
  try {
    const api = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const valor = JSON.parse(api?.getItem(CHAVE) || 'null');
    if (
      valor &&
      typeof valor.x === 'number' &&
      typeof valor.y === 'number' &&
      Number.isFinite(valor.x) &&
      Number.isFinite(valor.y) &&
      Math.abs(valor.x) < 20000 &&
      Math.abs(valor.y) < 20000
    )
      return { x: valor.x, y: valor.y };
  } catch {
    /* Preferência opcional. */
  }
  return null;
}
export function salvarPosicaoHudEfeitos(
  pos: PosicaoHudEfeitos | null,
  storage?: Pick<Storage, 'setItem' | 'removeItem'>,
): void {
  try {
    const api = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!api) return;
    if (pos) api.setItem(CHAVE, JSON.stringify(pos));
    else api.removeItem(CHAVE);
  } catch {
    /* Armazenamento indisponível não impede o arrasto. */
  }
}
