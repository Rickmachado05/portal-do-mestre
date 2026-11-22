/** Preferências locais de posição da HUD 3D. Não alteram o estado da campanha. */
export type DeslocamentoHud3D = { x: number; y: number };
export type RetanguloHud3D = { left: number; top: number; width: number; height: number };
export type AreaHud3D = { left: number; top: number; right: number; bottom: number };
const CHAVE = 'portal-mestre-hud-efeitos-3d-v1';
const seguro = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
const limitar = (valor: number, min: number, max: number) => Math.max(min, Math.min(max, valor));
export function limitarDeslocamentoHud3D(
  deslocamento: DeslocamentoHud3D,
  base: RetanguloHud3D,
  palco: AreaHud3D,
  margem = 8,
): DeslocamentoHud3D {
  const maxX = palco.right - margem - base.width - base.left;
  const minX = palco.left + margem - base.left;
  const maxY = palco.bottom - margem - base.height - base.top;
  const minY = palco.top + margem - base.top;
  return {
    x: limitar(deslocamento.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: limitar(deslocamento.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  };
}
export function lerDeslocamentoHud3D(storage?: Pick<Storage, 'getItem'>): DeslocamentoHud3D {
  try {
    const api = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!api) return { x: 0, y: 0 };
    const valor = JSON.parse(api.getItem(CHAVE) || 'null') as Partial<DeslocamentoHud3D> | null;
    if (
      valor &&
      seguro(valor.x) &&
      seguro(valor.y) &&
      Math.abs(valor.x as number) < 10000 &&
      Math.abs(valor.y as number) < 10000
    )
      return { x: valor.x as number, y: valor.y as number };
  } catch {
    /* Armazenamento opcional. */
  }
  return { x: 0, y: 0 };
}
export function salvarDeslocamentoHud3D(
  valor: DeslocamentoHud3D | null,
  storage?: Pick<Storage, 'setItem' | 'removeItem'>,
): void {
  try {
    const api = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!api) return;
    if (valor) api.setItem(CHAVE, JSON.stringify(valor));
    else api.removeItem(CHAVE);
  } catch {
    /* Sem espaço ou modo privado: posição vale até fechar a página. */
  }
}
