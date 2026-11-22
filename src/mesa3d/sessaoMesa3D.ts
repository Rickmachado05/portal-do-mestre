/** Ferramentas de sessão compartilhadas com a Mesa 2D.
 * Nenhum estado de fichas ou cenário é copiado para uma segunda base. */
import { chaveEstadoCampanha } from '../hexatombe/campaignLibrary';
import {
  normalizarPaginasDiario,
  aplicarOperacaoDiario,
  type PaginaDiario,
  type OperacaoDiario,
} from '../hexatombe/registrosDiario';
import { alterarMesaCompartilhada } from './administracaoMesa3D';
import {
  alterarParticipanteIniciativa,
  normalizarParticipantesIniciativa,
  ordenarParticipantesIniciativa,
  turnoAposRetirada,
} from '../lib/iniciativaParticipantes';

type StorageApi = Pick<Storage, 'getItem' | 'setItem'>;
type UnidadeTurno = {
  id: string;
  iniciativa: number;
  condicoes?: { id: string; nome: string; turnos: number }[];
};
export type RegistroSessao3D = {
  id: string;
  hora: string;
  texto: string;
  tipo: 'dado' | 'evento' | 'sistema';
  visibilidade?: 'publica' | 'mestre';
};
export type SessaoMesa3D = {
  diario: string;
  paginasDiario: PaginaDiario[];
  registros: RegistroSessao3D[];
  combateAtivo: boolean;
  turnoId: string | null;
  rodada: number;
};
export type ExpressaoDado3D = {
  quantidade: number;
  faces: 4 | 6 | 8 | 10 | 12 | 20 | 100;
  modificador: number;
  formula: string;
};
const objeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const id = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sessao-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export function lerSessaoMesa3D(
  campanhaId: string,
  storage: StorageApi = localStorage,
): SessaoMesa3D {
  let raw: unknown;
  try {
    raw = JSON.parse(storage.getItem(chaveEstadoCampanha(campanhaId)) || 'null');
  } catch {
    raw = null;
  }
  const v = objeto(raw) ? raw : {};
  return {
    diario: typeof v.diario === 'string' ? v.diario : '',
    paginasDiario: normalizarPaginasDiario(v.paginasDiario, v.diario),
    registros: Array.isArray(v.registros)
      ? v.registros
          .filter(objeto)
          .map((r) => ({
            id: String(r.id || ''),
            hora: String(r.hora || ''),
            texto: String(r.texto || ''),
            tipo:
              r.tipo === 'dado'
                ? ('dado' as const)
                : r.tipo === 'sistema'
                  ? ('sistema' as const)
                  : ('evento' as const),
            visibilidade: r.visibilidade === 'mestre' ? ('mestre' as const) : ('publica' as const),
          }))
          .slice(-150)
      : [],
    combateAtivo: v.combateAtivo === true,
    turnoId: typeof v.turnoId === 'string' ? v.turnoId : null,
    rodada:
      typeof v.rodada === 'number' && Number.isInteger(v.rodada) && v.rodada >= 1 ? v.rodada : 1,
  };
}
/** Edita somente as páginas do diário no mesmo JSON usado pelas duas mesas. */
export function operarDiarioMesa3D(
  campanhaId: string,
  operacao: OperacaoDiario,
  storage?: StorageApi,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const anteriores = normalizarPaginasDiario(estado.paginasDiario, estado.diario);
      const seguintes = aplicarOperacaoDiario(anteriores, operacao);
      if (seguintes === anteriores) return false;
      estado.paginasDiario = seguintes;
      return true;
    },
    storage,
  );
}

export function salvarDiarioMesa3D(
  campanhaId: string,
  diario: string,
  storage?: StorageApi,
): boolean {
  if (diario.length > 100_000) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      estado.diario = diario;
      return true;
    },
    storage,
  );
}
export function lerExpressaoDado3D(valor: string): ExpressaoDado3D | null {
  const match = /^\s*(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?\s*$/i.exec(valor);
  if (!match) return null;
  const quantidade = Number(match[1]),
    faces = Number(match[2]) as ExpressaoDado3D['faces'],
    modificador = Number(match[3] || 0);
  if (
    quantidade < 1 ||
    quantidade > 12 ||
    !Number.isInteger(modificador) ||
    Math.abs(modificador) > 999
  )
    return null;
  return {
    quantidade,
    faces,
    modificador,
    formula: `${quantidade}d${faces}${modificador > 0 ? '+' + modificador : modificador < 0 ? modificador : ''}`,
  };
}
export function registrarRolagemMesa3D(
  campanhaId: string,
  autor: string,
  expressao: ExpressaoDado3D,
  valores: number[],
  storage?: StorageApi,
): boolean {
  if (
    valores.length !== expressao.quantidade ||
    valores.some((v) => !Number.isSafeInteger(v) || v < 1 || v > expressao.faces)
  )
    return false;
  const soma = valores.reduce((a, b) => a + b, 0) + expressao.modificador;
  const texto = `${autor.slice(0, 80)} rolou ${expressao.formula}: ${soma} (${valores.join(' + ')}${expressao.modificador > 0 ? ' + ' + expressao.modificador : expressao.modificador < 0 ? ' - ' + Math.abs(expressao.modificador) : ''}).`;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const registros = Array.isArray(estado.registros) ? estado.registros : [];
      estado.registros = [
        ...registros,
        { id: id(), hora: hora(), texto, tipo: 'dado', visibilidade: 'publica' },
      ].slice(-150);
      return true;
    },
    storage,
  );
}
export function alterarParticipacaoMesa3D(
  campanhaId: string,
  cenaId: string,
  unidadeId: string,
  incluir: boolean,
  storage?: StorageApi,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const unidades = (estado.unidades as unknown[]).filter(objeto) as UnidadeTurno[];
      if (!unidades.some((u) => u.id === unidadeId)) return false;
      const cena = (estado.cenas as unknown[]).find((v) => objeto(v) && v.id === cenaId);
      if (!objeto(cena)) return false;
      const anteriores = ordenarParticipantesIniciativa(unidades, cena.participantesIniciativa);
      const participantes = alterarParticipanteIniciativa(
        normalizarParticipantesIniciativa(cena.participantesIniciativa),
        unidadeId,
        incluir,
      );
      cena.participantesIniciativa = participantes;
      if (cenaId === estado.cenaAtivaId) {
        const ordem = ordenarParticipantesIniciativa(unidades, participantes);
        if (!ordem.length) {
          estado.combateAtivo = false;
          estado.turnoId = null;
          estado.rodada = 1;
        } else if (estado.combateAtivo === true && !ordem.some((u) => u.id === estado.turnoId))
          estado.turnoId = turnoAposRetirada(
            anteriores,
            ordem,
            typeof estado.turnoId === 'string' ? estado.turnoId : null,
            unidadeId,
          );
      }
      return true;
    },
    storage,
  );
}
/** Ação opcional do mestre: inclui de uma vez os personagens com token nesta cena. */
export function incluirTokensDaCenaNaIniciativa3D(
  campanhaId: string,
  cenaId: string,
  storage?: StorageApi,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = Array.isArray(estado.cenas)
        ? estado.cenas.find((v) => objeto(v) && v.id === cenaId)
        : null;
      if (!objeto(cena) || !objeto(cena.tokens) || !Array.isArray(estado.unidades)) return false;
      const idsDisponiveis = new Set(Object.keys(cena.tokens));
      const ids = estado.unidades
        .filter(objeto)
        .map((u) => u.id)
        .filter((id): id is string => typeof id === 'string' && idsDisponiveis.has(id));
      cena.participantesIniciativa = normalizarParticipantesIniciativa([
        ...normalizarParticipantesIniciativa(cena.participantesIniciativa),
        ...ids,
      ]);
      return true;
    },
    storage,
  );
}
export function alterarTurnoMesa3D(
  campanhaId: string,
  acao: 'iniciar' | 'avancar' | 'encerrar',
  usaImpeto: boolean,
  storage?: StorageApi,
): boolean {
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      if (acao === 'encerrar') {
        estado.combateAtivo = false;
        estado.turnoId = null;
        estado.rodada = 1;
        return true;
      }
      if (!Array.isArray(estado.unidades)) return false;
      const unidades = estado.unidades.filter(objeto) as UnidadeTurno[];
      const cena = Array.isArray(estado.cenas)
        ? estado.cenas.find((v) => objeto(v) && v.id === estado.cenaAtivaId)
        : null;
      const ordenados = ordenarParticipantesIniciativa(
        unidades,
        objeto(cena) ? cena.participantesIniciativa : [],
      );
      if (!ordenados.length) return false;
      if (acao === 'iniciar') {
        estado.combateAtivo = true;
        estado.turnoId = ordenados[0]?.id || null;
        estado.rodada = 1;
        return true;
      }
      if (estado.combateAtivo !== true) return false;
      const indice = ordenados.findIndex((u) => u.id === estado.turnoId);
      const proximo = (indice + 1) % ordenados.length;
      if (proximo === 0) estado.rodada = Math.max(1, Number(estado.rodada) || 1) + 1;
      if (usaImpeto && indice >= 0) {
        const atual = unidades.find((u) => u.id === estado.turnoId);
        if (atual && Array.isArray(atual.condicoes))
          atual.condicoes = atual.condicoes
            .map((c) => ({ ...c, turnos: c.turnos - 1 }))
            .filter((c) => c.turnos > 0);
      }
      estado.turnoId = ordenados[proximo].id;
      return true;
    },
    storage,
  );
}
