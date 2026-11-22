/** Projeção pública das miniaturas: GLB vinculado acompanha o token atual.
 * Não usa posições antigas gravadas na instância como substitutas do personagem.
 */
import type { InstanciaMiniatura3D } from '../mesa3d/miniaturasCena3D';
import type { Cenario3D } from '../mesa3d/editorCena3D';
import { chaoParaPercentual3D } from '../mesa3d/mesaLivre3D';

type PosicaoTokenPublica = { x: number; y: number; oculto?: boolean };
export function miniaturasParaVisaoIndividual3D(
  miniaturas: readonly InstanciaMiniatura3D[],
  modelosProntos: ReadonlySet<string>,
  tokens: Record<string, PosicaoTokenPublica>,
  cenario: Cenario3D,
) {
  return miniaturas.flatMap((m) => {
    if (m.oculto || !modelosProntos.has(m.modeloId)) return [];
    // Miniatura vinculada não pode sobreviver ao ocultamento/remoção do token.
    const vinculado = m.personagemId ? tokens[m.personagemId] : undefined;
    if ((m.personagemId && !vinculado) || vinculado?.oculto) return [];
    const pos = vinculado
      ? { x: vinculado.x, y: vinculado.y }
      : chaoParaPercentual3D({ x: m.x, z: m.z }, cenario);
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return [];
    return [{ id: m.id, personagemId: m.personagemId, ...pos }];
  });
}

/**
 * Mesmo filtro por ID de instância empregado na publicação do convidado.
 * A miniatura independente não depende de possuir um personagem vinculado;
 * a vinculada respeita TAMBÉM a visibilidade do seu personagem.
 */
export function filtrarIdsMiniaturasVisaoIndividual3D<
  T extends {
    id: string;
    personagemId?: string;
    x: number;
    y: number;
  },
>(
  miniaturas: readonly T[],
  idsTokensVisiveis: ReadonlySet<string>,
  emVisao: (m: T) => boolean,
  observadorId?: string,
): string[] {
  return miniaturas
    .filter(
      (m) =>
        m.id.length > 0 &&
        Number.isFinite(m.x) &&
        Number.isFinite(m.y) &&
        m.x >= 0 &&
        m.x <= 100 &&
        m.y >= 0 &&
        m.y <= 100 &&
        // O próprio personagem está sempre na visão dele (mesma regra já
        // aplicada ao ID do token). Na borda do polígono o ray casting pode
        // considerar o ponto de origem como externo por precisão numérica.
        ((observadorId !== undefined && m.personagemId === observadorId) || emVisao(m)) &&
        (!m.personagemId || idsTokensVisiveis.has(m.personagemId)),
    )
    .map((m) => m.id);
}
