/**
 * Skins de token são recursos visuais locais de cada personagem da campanha.
 * A imagem original continua na chave legada token:<unidadeId>; skins extras
 * ficam em token-skin:<unidadeId>:<skinId>, no mesmo IndexedDB do backup.
 */
export const TOKEN_ORIGINAL = 'original' as const;
import type { EnquadramentoImagem } from './enquadramentoToken';
import type { AparenciaToken } from './aparenciaToken';
export type TokenSkin = {
  id: string;
  nome: string;
  idleGif?: boolean;
  idlePausado?: boolean;
  idleVelocidade?: number;
  enquadramento?: EnquadramentoImagem;
  aparencia?: AparenciaToken;
};
export type UnidadeComSkins = {
  skins?: TokenSkin[];
  skinPadraoId?: string;
  tokenIdleGif?: boolean;
  tokenIdlePausado?: boolean;
  tokenIdleVelocidade?: number;
};
export type TokenComSkin = { skinId?: string };

/** Indica se a arte selecionada é uma animação idle, sem alterar a skin do token. */
export function tokenIdleAtivo(unidade: UnidadeComSkins, token?: TokenComSkin): boolean {
  const id = skinAtiva(unidade, token);
  return id === TOKEN_ORIGINAL
    ? unidade.tokenIdleGif === true
    : skinsValidas(unidade).some((s) => s.id === id && s.idleGif === true);
}
/** Preferências de reprodução pertencem à aparência, não à cena nem ao combate. */
export function velocidadeIdle(valor: unknown): number {
  const v = Number(valor);
  return [0.5, 1, 1.5, 2].includes(v) ? v : 1;
}
export function parametrosIdleAtivos(
  unidade: UnidadeComSkins,
  token?: TokenComSkin,
): { pausado: boolean; velocidade: number } {
  const id = skinAtiva(unidade, token);
  if (id === TOKEN_ORIGINAL)
    return {
      pausado: unidade.tokenIdlePausado === true,
      velocidade: velocidadeIdle(unidade.tokenIdleVelocidade),
    };
  const fonte = skinsValidas(unidade).find((s) => s.id === id);
  return {
    pausado: fonte?.idlePausado === true,
    velocidade: velocidadeIdle(fonte?.idleVelocidade),
  };
}
export const chaveImagemSkin = (unidadeId: string, skinId: string): string =>
  `token-skin:${unidadeId}:${skinId}`;

export function skinsValidas(unidade: UnidadeComSkins): TokenSkin[] {
  if (!Array.isArray(unidade.skins)) return [];
  const vistos = new Set<string>();
  return unidade.skins.filter((s) => {
    if (
      !s ||
      typeof s.id !== 'string' ||
      !s.id.trim() ||
      s.id === TOKEN_ORIGINAL ||
      typeof s.nome !== 'string' ||
      !s.nome.trim() ||
      vistos.has(s.id)
    )
      return false;
    vistos.add(s.id);
    return true;
  });
}

/** Um token sem skin selecionada segue a skin padrão do personagem. */
export function skinAtiva(unidade: UnidadeComSkins, token?: TokenComSkin): string {
  const validos = new Set(skinsValidas(unidade).map((s) => s.id));
  const escolhida = token?.skinId;
  if (escolhida === TOKEN_ORIGINAL) return TOKEN_ORIGINAL;
  if (escolhida && validos.has(escolhida)) return escolhida;
  const padrao = unidade.skinPadraoId;
  return padrao && validos.has(padrao) ? padrao : TOKEN_ORIGINAL;
}

export function nomeSkinPadrao(unidade: UnidadeComSkins): string {
  const escolha = skinAtiva(unidade);
  return skinsValidas(unidade).find((s) => s.id === escolha)?.nome || 'Original';
}

export function removerSkinUnidade<T extends UnidadeComSkins>(unidade: T, skinId: string): T {
  return {
    ...unidade,
    skins: skinsValidas(unidade).filter((s) => s.id !== skinId),
    skinPadraoId: unidade.skinPadraoId === skinId ? TOKEN_ORIGINAL : unidade.skinPadraoId,
  };
}

/** Remove somente a referência à skin apagada; demais dados do token não mudam. */
export function limparSkinNoToken<T extends TokenComSkin>(token: T, skinId: string): T {
  if (token.skinId !== skinId) return token;
  const copia = { ...token };
  delete copia.skinId;
  return copia;
}

export function validarImagemSkin(arquivo: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(arquivo.type))
    return 'Escolha uma imagem PNG, JPG, WebP ou GIF idle.';
  if (arquivo.type === 'image/gif' && arquivo.size > 4 * 1024 * 1024)
    return 'O GIF idle deve ter até 4 MB, 512 px de lado e 40 quadros.';
  if (arquivo.size <= 0 || arquivo.size > 8 * 1024 * 1024) return 'A imagem precisa ter até 8 MB.';
  return null;
}

/** Redimensiona sem cortar o desenho e preserva transparência. */
export async function otimizarImagemSkin(arquivo: File): Promise<Blob> {
  // Nunca rasterizar GIF em WebP estático: perderia os quadros da animação.
  if (arquivo.type === 'image/gif') return arquivo;
  if (typeof createImageBitmap !== 'function') return arquivo;
  let imagem: ImageBitmap | null = null;
  try {
    imagem = await createImageBitmap(arquivo);
    const maior = Math.max(imagem.width, imagem.height);
    const escala = Math.min(1, 1024 / Math.max(1, maior));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.width * escala));
    canvas.height = Math.max(1, Math.round(imagem.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return arquivo;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const comprimida = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.93),
    );
    return comprimida && comprimida.size > 0 && comprimida.size < arquivo.size
      ? comprimida
      : arquivo;
  } catch {
    return arquivo;
  } finally {
    imagem?.close();
  }
}
