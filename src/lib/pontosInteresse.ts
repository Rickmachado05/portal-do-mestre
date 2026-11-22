/** Marcadores persistentes por cena: permite editar nome e coordenadas do mapa. */
export type PontoInteresse = { id: string; texto: string; x: number; y: number };

const limitarPercentual = (valor: number) =>
  Number.isFinite(valor) ? Math.max(0, Math.min(100, valor)) : 50;

export function atualizarPontosInteresse(
  marcadores: PontoInteresse[],
  dados: PontoInteresse,
  editarId?: string,
): PontoInteresse[] {
  const texto = dados.texto.trim().slice(0, 65);
  if (!texto) return marcadores;
  if (editarId) {
    return marcadores.map((marcador) =>
      marcador.id === editarId
        ? { ...marcador, texto, x: limitarPercentual(dados.x), y: limitarPercentual(dados.y) }
        : marcador,
    );
  }
  return [
    ...marcadores,
    { ...dados, texto, x: limitarPercentual(dados.x), y: limitarPercentual(dados.y) },
  ];
}
