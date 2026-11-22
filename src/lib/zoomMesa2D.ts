/** Zoom na mesa 2D mantendo a posição no cursor como âncora visual. */
export type PontoMesa2D = { x: number; y: number };
export type EstadoZoomMesa2D = { zoom: number; pan: PontoMesa2D };
export type EntradaZoomMesa2D = EstadoZoomMesa2D & {
  cursor: PontoMesa2D;
  viewport: { largura: number; altura: number };
  deltaY: number;
  deltaMode?: number;
};
export function zoomDaMesa2DNoCursor(entrada: EntradaZoomMesa2D): EstadoZoomMesa2D {
  const { zoom, pan, cursor, viewport } = entrada;
  if (
    !Number.isFinite(zoom) ||
    zoom <= 0 ||
    !Number.isFinite(entrada.deltaY) ||
    !Number.isFinite(cursor.x) ||
    !Number.isFinite(cursor.y)
  )
    return { zoom, pan };
  // WheelEvent.deltaMode 0=pixels, 1=linhas, 2=páginas.
  const unidade =
    entrada.deltaMode === 1 ? 16 : entrada.deltaMode === 2 ? Math.max(viewport.altura, 500) : 1;
  const movimento = Math.max(-240, Math.min(240, entrada.deltaY * unidade));
  const novoZoom = Math.max(
    0.35,
    Math.min(3.5, Math.round(zoom * Math.exp(-movimento * 0.0018) * 1000) / 1000),
  );
  if (novoZoom === zoom) return { zoom, pan };
  const x = cursor.x - viewport.largura / 2,
    y = cursor.y - viewport.altura / 2;
  const relacao = novoZoom / zoom;
  return { zoom: novoZoom, pan: { x: x - (x - pan.x) * relacao, y: y - (y - pan.y) * relacao } };
}
