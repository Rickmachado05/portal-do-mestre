import {
  normalizarModoAnimacaoMiniatura,
  normalizarVelocidadeAnimacao,
  normalizarIndiceAnimacao,
  type ModoAnimacaoMiniatura,
} from './animacoesMiniaturas3D';
/** Instâncias de miniaturas 3D persistidas no cenário; separadas dos tokens tradicionais. */
export type InstanciaMiniatura3D = {
  id: string;
  modeloId: string;
  nome: string;
  x: number;
  z: number;
  altura: number;
  escala: number;
  rotacao: number;
  personagemId?: string;
  oculto?: boolean;
  /** Reprodução exclusivamente local dos clipes embutidos no GLB. */
  animacaoModo?: ModoAnimacaoMiniatura;
  animacaoIndice?: number;
  animacaoVelocidade?: number;
};
const numero = (x: unknown, p: number, min: number, max: number) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : p;
export function normalizarMiniaturasCena3D(
  raw: unknown,
  limiteX = 60,
  limiteZ = 60,
): InstanciaMiniatura3D[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const personagens = new Set<string>();
  const resultado: InstanciaMiniatura3D[] = [];
  for (const valor of raw.slice(0, 40)) {
    if (!valor || typeof valor !== 'object') continue;
    const v = valor as Record<string, unknown>;
    if (typeof v.id !== 'string' || !/^inst-[\w-]{6,90}$/.test(v.id) || ids.has(v.id)) continue;
    if (typeof v.modeloId !== 'string' || !/^mini-[\w-]{6,90}$/.test(v.modeloId)) continue;
    const personagemId =
      typeof v.personagemId === 'string' && v.personagemId.length <= 90
        ? v.personagemId
        : undefined;
    if (personagemId && personagens.has(personagemId)) continue;
    ids.add(v.id);
    if (personagemId) personagens.add(personagemId);
    resultado.push({
      id: v.id,
      modeloId: v.modeloId,
      nome: typeof v.nome === 'string' ? v.nome.slice(0, 70) : 'Miniatura',
      x: numero(v.x, 0, -limiteX, limiteX),
      z: numero(v.z, 0, -limiteZ, limiteZ),
      altura: numero(v.altura, 0, 0, 25),
      escala: numero(v.escala, 1, 0.1, 8),
      rotacao: numero(v.rotacao, 0, -Math.PI * 2, Math.PI * 2),
      ...(personagemId ? { personagemId } : {}),
      ...(v.oculto === true ? { oculto: true } : {}),
      animacaoModo: normalizarModoAnimacaoMiniatura(v.animacaoModo),
      animacaoIndice: normalizarIndiceAnimacao(v.animacaoIndice),
      animacaoVelocidade: normalizarVelocidadeAnimacao(v.animacaoVelocidade),
    });
  }
  return resultado;
}
export function criarInstanciaMiniatura3D(
  modeloId: string,
  nome: string,
  origem: { x: number; z: number },
): InstanciaMiniatura3D {
  return {
    id: `inst-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    modeloId,
    nome,
    x: origem.x,
    z: origem.z,
    altura: 0,
    escala: 1,
    rotacao: 0,
    animacaoModo: 'automatico',
    animacaoIndice: 0,
    animacaoVelocidade: 1,
  };
}

/** Uma miniatura vinculada representa o próprio token: não cria segundo personagem. */
export function vincularModeloAoPersonagem3D(
  lista: readonly InstanciaMiniatura3D[],
  modeloId: string,
  nomeModelo: string,
  personagemId: string,
  posicao: { x: number; z: number },
): InstanciaMiniatura3D[] {
  if (!personagemId || !modeloId || !nomeModelo)
    throw Error('Modelo e personagem são obrigatórios.');
  const existente = lista.find((m) => m.personagemId === personagemId);
  if (existente)
    return lista.map((m) =>
      m.id === existente.id
        ? {
            ...m,
            modeloId,
            nome: nomeModelo.slice(0, 70),
            oculto: false,
            ...(m.modeloId !== modeloId
              ? { animacaoModo: 'automatico' as const, animacaoIndice: 0 }
              : {}),
          }
        : m,
    );
  if (lista.length >= 40) throw Error('Limite de 40 miniaturas por cena.');
  return [...lista, { ...criarInstanciaMiniatura3D(modeloId, nomeModelo, posicao), personagemId }];
}
/** Ao desvincular, fixa no mapa a última posição efetiva do token, evitando saltos. */
export function desvincularMiniatura3D(
  instancia: InstanciaMiniatura3D,
  posicao: { x: number; z: number },
): InstanciaMiniatura3D {
  const { personagemId: _, ...livre } = instancia;
  return { ...livre, x: posicao.x, z: posicao.z };
}
