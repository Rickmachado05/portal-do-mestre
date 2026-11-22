/** Janela manual do editor visual da HUD do turno.
 * A posição escolhida é independente da cor, da câmera e das ações da ficha.
 * Os limites apenas impedem que a janela fique perdida fora da viewport.
 */
export type PosicaoEditorArrastavel = { left: number; top: number };
export const CHAVE_POSICAO_EDITOR_HUD = 'portal-mestre-editor-hud-posicao-v13440';

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.max(minimo, Math.min(maximo, valor));

/** Tamanho externo máximo igual ao CSS do editor (que pode ocupar menos). */
export function tamanhoEditorHud(viewportLargura: number, viewportAltura: number) {
  return {
    width: Math.min(290, Math.max(0, viewportLargura - 16)),
    height: Math.min(430, Math.max(0, viewportAltura - 104)),
  };
}

export function limitarPosicaoEditorHud(
  posicao: PosicaoEditorArrastavel,
  larguraViewport: number,
  alturaViewport: number,
  larguraEditor = tamanhoEditorHud(larguraViewport, alturaViewport).width,
  alturaEditor = tamanhoEditorHud(larguraViewport, alturaViewport).height,
): PosicaoEditorArrastavel {
  const largura = Math.max(0, larguraViewport),
    altura = Math.max(0, alturaViewport);
  const margem = 8;
  const minimoY = Math.min(80, Math.max(margem, altura - alturaEditor - margem));
  return {
    left: Math.round(
      limitar(
        Number.isFinite(posicao.left) ? posicao.left : margem,
        margem,
        Math.max(margem, largura - larguraEditor - margem),
      ),
    ),
    top: Math.round(
      limitar(
        Number.isFinite(posicao.top) ? posicao.top : minimoY,
        minimoY,
        Math.max(minimoY, altura - alturaEditor - margem),
      ),
    ),
  };
}

/** Local previsível na primeira abertura; depois a pessoa escolhe arrastando. */
export function posicaoInicialEditorHud(
  larguraViewport: number,
  alturaViewport: number,
): PosicaoEditorArrastavel {
  return limitarPosicaoEditorHud(
    {
      left: larguraViewport >= 1200 ? 258 : larguraViewport >= 850 ? 158 : 12,
      top:
        larguraViewport >= 1200 && alturaViewport >= 720 ? 225 : alturaViewport >= 700 ? 145 : 82,
    },
    larguraViewport,
    alturaViewport,
  );
}

export function sanitizarPosicaoEditorHud(valor: unknown): PosicaoEditorArrastavel | null {
  if (!valor || typeof valor !== 'object') return null;
  const p = valor as Record<string, unknown>;
  if (
    typeof p.left !== 'number' ||
    typeof p.top !== 'number' ||
    !Number.isFinite(p.left) ||
    !Number.isFinite(p.top)
  )
    return null;
  return { left: p.left, top: p.top };
}

function mapaSalvo(): Record<string, unknown> {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CHAVE_POSICAO_EDITOR_HUD) || '{}');
    return valor && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
export function lerPosicaoEditorHud(personagemId: string): PosicaoEditorArrastavel | null {
  if (!personagemId) return null;
  return sanitizarPosicaoEditorHud(mapaSalvo()[personagemId]);
}
export function salvarPosicaoEditorHud(
  personagemId: string,
  posicao: PosicaoEditorArrastavel,
): void {
  if (!personagemId) return;
  const posicaoValida = sanitizarPosicaoEditorHud(posicao);
  if (!posicaoValida) return;
  try {
    localStorage.setItem(
      CHAVE_POSICAO_EDITOR_HUD,
      JSON.stringify({ ...mapaSalvo(), [personagemId]: posicaoValida }),
    );
  } catch {
    /* localStorage indisponível: posição continua nesta sessão. */
  }
}
export function restaurarPosicaoEditorHud(personagemId: string): void {
  try {
    const mapa = mapaSalvo();
    delete mapa[personagemId];
    localStorage.setItem(CHAVE_POSICAO_EDITOR_HUD, JSON.stringify(mapa));
  } catch {
    /* localStorage indisponível */
  }
}
