/** Camada compartilhada: a Mesa 3D escreve no MESMO registro da Mesa 2D.
 * Não regrava cenas, fichas ou inventários que não estejam sendo alterados.
 */
import { chaveEstadoCampanha } from '../hexatombe/campaignLibrary';
import {
  adicionarItemInventario,
  aplicarDanoComEscudo,
  concederEscudo,
  transferirItemInventario,
  type ModeloItem,
  type ItemInventario,
} from '../hexatombe/itensLibrary';
import { normalizarEstadoCompartilhado } from '../lib/mesaCompartilhada';

type Registro = Record<string, unknown>;
type StorageApi = Pick<Storage, 'getItem' | 'setItem'>;
const objeto = (x: unknown): x is Registro =>
  Boolean(x) && typeof x === 'object' && !Array.isArray(x);
export function carregarMesaCompartilhada(campanhaId: string, storage: StorageApi = localStorage) {
  const raw = storage.getItem(chaveEstadoCampanha(campanhaId));
  try {
    return normalizarEstadoCompartilhado(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizarEstadoCompartilhado(null);
  }
}
export function alterarMesaCompartilhada(
  campanhaId: string,
  acao: (estado: Registro) => boolean,
  storage: StorageApi = localStorage,
): boolean {
  const key = chaveEstadoCampanha(campanhaId),
    original = storage.getItem(key);
  if (!original) return false;
  let estado: unknown;
  try {
    estado = JSON.parse(original);
  } catch {
    return false;
  }
  if (!objeto(estado) || !Array.isArray(estado.unidades) || !Array.isArray(estado.cenas))
    return false;
  if (!acao(estado)) return false;
  storage.setItem(key, JSON.stringify(estado));
  if (typeof window !== 'undefined')
    window.dispatchEvent(
      new CustomEvent('portal-mestre-mesa-compartilhada', { detail: { campanhaId } }),
    );
  return true;
}
export type CampoRecurso3D = 'hp' | 'mana' | 'ca' | 'iniciativa' | 'escudo';
export function ajustarRecurso3D(
  campanhaId: string,
  unidadeId: string,
  campo: CampoRecurso3D,
  valor: number,
  storage?: StorageApi,
): boolean {
  if (!Number.isFinite(valor)) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (!objeto(unidade)) return false;
      let proximo = Math.trunc(valor);
      if (campo === 'hp') proximo = Math.max(0, Math.min(proximo, Number(unidade.hpMax) || 0));
      else if (campo === 'escudo' || campo === 'mana' || campo === 'ca')
        proximo = Math.max(0, proximo);
      unidade[campo] = proximo;
      return true;
    },
    storage,
  );
}
export function aplicarDano3D(
  campanhaId: string,
  unidadeId: string,
  dano: number,
  storage?: StorageApi,
): boolean {
  if (!Number.isSafeInteger(dano) || dano <= 0 || dano > 9999) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (!objeto(unidade)) return false;
      const resultado = aplicarDanoComEscudo(
        Number(unidade.hp) || 0,
        Number(unidade.escudo) || 0,
        dano,
      );
      unidade.hp = resultado.hp;
      unidade.escudo = resultado.escudo;
      return true;
    },
    storage,
  );
}
export function concederEscudo3D(
  campanhaId: string,
  unidadeId: string,
  quantidade: number,
  storage?: StorageApi,
): boolean {
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > 9999) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (!objeto(unidade)) return false;
      unidade.escudo = concederEscudo(Number(unidade.escudo) || 0, quantidade);
      return true;
    },
    storage,
  );
}
export function adicionarItem3D(
  campanhaId: string,
  unidadeId: string,
  item: ModeloItem,
  quantidade: number,
  storage?: StorageApi,
): boolean {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 999) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (!objeto(unidade)) return false;
      unidade.itens = adicionarItemInventario(
        Array.isArray(unidade.itens) ? (unidade.itens as ItemInventario[]) : [],
        item,
        quantidade,
      );
      return true;
    },
    storage,
  );
}
export function definirQuantidadeItem3D(
  campanhaId: string,
  unidadeId: string,
  itemId: string,
  quantidade: number,
  storage?: StorageApi,
): boolean {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 9999) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (
        !objeto(unidade) ||
        !Array.isArray(unidade.itens) ||
        !unidade.itens.some((i: unknown) => objeto(i) && i.id === itemId)
      )
        return false;
      unidade.itens = (unidade.itens as ItemInventario[]).map((i) =>
        i.id === itemId ? { ...i, quantidade } : i,
      );
      return true;
    },
    storage,
  );
}
export function retirarItem3D(
  campanhaId: string,
  unidadeId: string,
  itemId: string,
  storage?: StorageApi,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidade = (estado.unidades as unknown[]).find((u) => objeto(u) && u.id === unidadeId);
      if (
        !objeto(unidade) ||
        !Array.isArray(unidade.itens) ||
        !unidade.itens.some((i: unknown) => objeto(i) && i.id === itemId)
      )
        return false;
      unidade.itens = (unidade.itens as ItemInventario[]).filter((i) => i.id !== itemId);
      return true;
    },
    storage,
  );
}
export function entregarItem3D(
  campanhaId: string,
  origemId: string,
  destinoId: string,
  itemId: string,
  qtd: number,
  storage?: StorageApi,
): boolean {
  if (origemId === destinoId) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidades = estado.unidades as unknown[];
      const origem = unidades.find((u) => objeto(u) && u.id === origemId);
      const destino = unidades.find((u) => objeto(u) && u.id === destinoId);
      if (
        !objeto(origem) ||
        !objeto(destino) ||
        destino.tipo !== 'jogador' ||
        origem.tipo !== 'jogador'
      )
        return false;
      try {
        const resultado = transferirItemInventario(
          Array.isArray(origem.itens) ? (origem.itens as ItemInventario[]) : [],
          Array.isArray(destino.itens) ? (destino.itens as ItemInventario[]) : [],
          itemId,
          qtd,
        );
        origem.itens = resultado.origem;
        destino.itens = resultado.destino;
        return true;
      } catch {
        return false;
      }
    },
    storage,
  );
}
