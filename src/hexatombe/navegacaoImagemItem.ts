/** Geometria pura do visualizador: zoom ao redor do cursor e pan limitado à imagem. */
export type PontoImagem = { x: number; y: number };
export type DimensaoImagem = { largura: number; altura: number };
export type VisaoImagem = PontoImagem & { zoom: number };

export const VISAO_IMAGEM_INICIAL: Readonly<VisaoImagem> = { zoom: 100, x: 0, y: 0 };
export const ZOOM_MINIMO_ITEM = 50;
export const ZOOM_MAXIMO_ITEM = 400;

export function limitarZoomImagem(zoom: number): number {
  return Number.isFinite(zoom)
    ? Math.max(ZOOM_MINIMO_ITEM, Math.min(ZOOM_MAXIMO_ITEM, Math.round(zoom)))
    : 100;
}

/** Se a imagem couber inteira no visor, mantém o centro no eixo correspondente. */
export function limitarPanImagem(
  pan: PontoImagem,
  zoom: number,
  visor: DimensaoImagem,
  imagem: DimensaoImagem,
): PontoImagem {
  const escala = limitarZoomImagem(zoom) / 100;
  const limiteX = Math.max(0, (imagem.largura * escala - visor.largura) / 2);
  const limiteY = Math.max(0, (imagem.altura * escala - visor.altura) / 2);
  return {
    x:
      limiteX === 0 ? 0 : Math.max(-limiteX, Math.min(limiteX, Number.isFinite(pan.x) ? pan.x : 0)),
    y:
      limiteY === 0 ? 0 : Math.max(-limiteY, Math.min(limiteY, Number.isFinite(pan.y) ? pan.y : 0)),
  };
}

/** O ponto sob o cursor permanece no mesmo lugar ao ampliar, salvo nos limites do visor. */
export function zoomImagemNoCursor(
  anterior: VisaoImagem,
  zoom: number,
  cursor: PontoImagem,
  visor: DimensaoImagem,
  imagem: DimensaoImagem,
): VisaoImagem {
  const novoZoom = limitarZoomImagem(zoom);
  const fator = novoZoom / limitarZoomImagem(anterior.zoom);
  const pan = limitarPanImagem(
    {
      x: cursor.x - (cursor.x - anterior.x) * fator,
      y: cursor.y - (cursor.y - anterior.y) * fator,
    },
    novoZoom,
    visor,
    imagem,
  );
  return { zoom: novoZoom, ...pan };
}

export function arrastarImagem(
  anterior: VisaoImagem,
  delta: PontoImagem,
  visor: DimensaoImagem,
  imagem: DimensaoImagem,
): VisaoImagem {
  return {
    ...anterior,
    ...limitarPanImagem(
      { x: anterior.x + delta.x, y: anterior.y + delta.y },
      anterior.zoom,
      visor,
      imagem,
    ),
  };
}
