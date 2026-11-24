/** Projeção mínima da ficha para o jogador autorizado.
 * Nunca enviar a ficha integral do Criador, inventário, história, retrato ou notas.
 */
import type { FichaDados } from '../hexatombe/fichasLibrary';
import { identidadeCombate } from '../hexatombe/identidadeCombate';
import { listarAcoesDaFicha } from '../hexatombe/acoesFichaDados';
import type { FichaCompartilhada } from './api';
import { NOMES_ATRIBUTOS, NOMES_PERICIAS } from '../impeto/contrato';

type UnidadeResumo = {
  id: string;
  nome: string;
  tipo: string;
  elemento: string;
  hp: number;
  hpMax: number;
  mana: number;
  manaMax: number;
  ca: number;
  escudo?: number;
  fichaId?: string;
  condicoes?: Array<{
    id: string;
    nome: string;
    turnos: number;
    tipo?: 'buff' | 'debuff' | 'condicao';
    origem?: string;
  }>;
};
const valor = (n: number, limite: number) =>
  Math.max(0, Math.min(limite, Math.round(Number.isFinite(n) ? n : 0)));
export function montarFichasCompartilhadas(
  unidades: UnidadeResumo[],
  fichas: Array<{ id: string; dados: FichaDados }>,
): FichaCompartilhada[] {
  const porId = new Map(fichas.map((f) => [f.id, f.dados]));
  return unidades
    .filter((u) => u.tipo === 'jogador')
    .map((u) => {
      const ficha = u.fichaId ? porId.get(u.fichaId) : undefined;
      const identidade = identidadeCombate(u.elemento, ficha);
      const [elemento = '', classe = ''] = identidade.split(' · ');
      return {
        id: u.id,
        nome: u.nome,
        elemento,
        classe,
        hp: valor(u.hp, ficha?.impeto?.escala==='universal-v1'?Number.MAX_SAFE_INTEGER:99999),
        hpMax: valor(u.hpMax, ficha?.impeto?.escala==='universal-v1'?Number.MAX_SAFE_INTEGER:99999),
        mana: valor(u.mana, ficha?.impeto?.escala==='universal-v1'?Number.MAX_SAFE_INTEGER:99999),
        manaMax: valor(u.manaMax, ficha?.impeto?.escala==='universal-v1'?Number.MAX_SAFE_INTEGER:99999),
        ca: valor(u.ca, 999),
        escudo: valor(u.escudo ?? 0, 99999),
        temFicha: Boolean(ficha),
        acoes: fichaAcoes(ficha),
        ...(ficha?.impeto
          ? {
              impeto: {
                escala: ficha.impeto.escala,
                atributos: NOMES_ATRIBUTOS.map((nome) => ({
                  nome,
                  valor: ficha.impeto!.atributos[nome],
                })),
                pericias: NOMES_PERICIAS.map((nome) => ({
                  nome,
                  bonus: ficha.impeto!.pericias[nome] * 2,
                })),
                arquetipo: ficha.impeto.arquetipo,
                talento: ficha.impeto.talento,
                vantagem: ficha.impeto.vantagem,
                derivacao: {
                  tipo: ficha.impeto.derivacao.tipo,
                  atributo: ficha.impeto.derivacao.atributo,
                  justificativa: ficha.impeto.derivacao.justificativa,
                },
                investimento: { ...ficha.impeto.recursosPR },
              },
            }
          : {}),
        ...(u.condicoes
          ? {
              condicoes: u.condicoes.map((c) => ({
                id: c.id,
                nome: c.nome,
                turnos: c.turnos,
                tipo: c.tipo || 'condicao',
                ...(c.origem ? { origem: c.origem } : {}),
              })),
            }
          : {}),
      };
    });
}
function fichaAcoes(ficha?: FichaDados): FichaCompartilhada['acoes'] {
  return listarAcoesDaFicha(ficha)
    .slice(0, ficha?.impeto?.escala==='universal-v1'?Infinity:12)
    .map((a) => ({
      id: a.id,
      nome: a.titulo,
      tipo: a.tipo,
      categoria: a.categoria,
      ...(a.custo !== undefined ? { custo: a.custo } : {}),
      ...(a.valor ? { valor: a.valor } : {}),
      ...(a.descricao ? { descricao: a.descricao } : {}),
      ...(a.restricoes ? { restricoes: a.restricoes } : {}),
      ...(a.fonte ? { fonte: a.fonte } : {}),
      ...(a.ativacao ? { ativacao: a.ativacao } : {}),
      ...(a.pc !== undefined ? { pc: a.pc } : {}),
      ...(a.px !== undefined ? { px: a.px } : {}),
      ...(a.enIndefinida !== undefined ? { enIndefinida: a.enIndefinida } : {}),
      ...(a.exigeCA !== undefined ? { exigeCA: a.exigeCA } : {}),
    }));
}
