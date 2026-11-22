import type { FichaPortalImpeto, EstatisticasImpeto } from './contrato';

/** Núcleo de combate sem React, DOM ou multiplayer.
 * A UI da Mesa 2D/3D deve chamá-lo explicitamente, sem automatizar ações do mestre.
 */
export type TipoAcao = 'principal' | 'buff' | 'reacao';
export type AtordoamentoC02 = {
  ativo: boolean;
  ativacoesAfetadas: 0 | 1 | 2;
  escapePendente: boolean;
  imunidadeAteRodada: number;
};
export type EstadoTurnoImpeto = {
  id: string;
  rodada: number;
  ativacao: number;
  acaoPrincipalGasta: boolean;
  buffRapidoGasto: boolean;
  reacaoGasta: boolean;
  regenAplicadaNaRodada: number;
  atordoamento: AtordoamentoC02;
  perdasC02NaRodada: number;
  /** Valores atuais ao vivo. CA Base não é alterada. */
  estatisticas: EstatisticasImpeto;
};
export const limitar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export function caEfetiva(s: EstatisticasImpeto): number {
  return s.caBase + limitar(s.bonusCaTemporario, 0, 2) - limitar(s.penalidadeCaTemporaria, 0, 2);
}
export function criarEstadoTurno(id: string, ficha: FichaPortalImpeto): EstadoTurnoImpeto {
  return {
    id,
    rodada: 0,
    ativacao: 0,
    acaoPrincipalGasta: false,
    buffRapidoGasto: false,
    reacaoGasta: false,
    regenAplicadaNaRodada: 0,
    perdasC02NaRodada: 0,
    atordoamento: {
      ativo: false,
      ativacoesAfetadas: 0,
      escapePendente: false,
      imunidadeAteRodada: 0,
    },
    estatisticas: { ...ficha.estatisticas },
  };
}
export function receberDano(s: EstadoTurnoImpeto, dano: number): EstadoTurnoImpeto {
  if (!Number.isFinite(dano) || dano < 0) throw new Error('Dano inválido.');
  const hp = Math.max(0, s.estatisticas.hpAtual - dano);
  return { ...s, estatisticas: { ...s.estatisticas, hpAtual: hp } };
}
export function curarHP(s: EstadoTurnoImpeto, cura: number): EstadoTurnoImpeto {
  if (!Number.isFinite(cura) || cura < 0) throw new Error('Cura inválida.');
  const hp = limitar(s.estatisticas.hpAtual + cura, 0, s.estatisticas.hpMax);
  return { ...s, estatisticas: { ...s.estatisticas, hpAtual: hp } };
}
export function alterarEnergia(s: EstadoTurnoImpeto, delta: number): EstadoTurnoImpeto {
  if (!Number.isFinite(delta)) throw new Error('Energia inválida.');
  if (s.estatisticas.energiaAtual + delta < 0) throw new Error('Energia insuficiente.');
  return {
    ...s,
    estatisticas: { ...s.estatisticas, energiaAtual: s.estatisticas.energiaAtual + delta },
  };
}
/** R02: regeneração ocorre uma única vez por rodada, nunca por iniciativa extra. */
export function iniciarRodada(s: EstadoTurnoImpeto, novaRodada: number): EstadoTurnoImpeto {
  if (!Number.isInteger(novaRodada) || novaRodada <= s.rodada)
    throw new Error('Rodada precisa avançar.');
  const hpAtual = s.estatisticas.hpAtual;
  const regen = hpAtual === 0 ? 0 : s.estatisticas.regeneracao;
  return {
    ...s,
    rodada: novaRodada,
    ativacao: 0,
    reacaoGasta: false,
    perdasC02NaRodada: 0,
    regenAplicadaNaRodada: novaRodada,
    estatisticas: { ...s.estatisticas, energiaAtual: s.estatisticas.energiaAtual + regen },
  };
}
/** Ação principal/buff renovam por ativação; reação não renova até próxima rodada.
 * Se um chefe for atordoado, ele perde no máximo uma ativação em cada rodada.
 */
export function iniciarAtivacao(s: EstadoTurnoImpeto, chefe = false): EstadoTurnoImpeto {
  if (s.rodada < 1) throw new Error('Inicie primeiro uma rodada.');
  if (s.atordoamento.escapePendente) throw new Error('Resolva o escape C02 da ativação anterior.');
  const podePerder = s.atordoamento.ativo && (!chefe || s.perdasC02NaRodada === 0);
  return {
    ...s,
    ativacao: s.ativacao + 1,
    acaoPrincipalGasta: podePerder,
    buffRapidoGasto: podePerder,
    perdasC02NaRodada: s.perdasC02NaRodada + (podePerder ? 1 : 0),
    atordoamento: podePerder ? { ...s.atordoamento, escapePendente: true } : s.atordoamento,
  };
}
/** Teste inicial de resistência (ou CA), feito pelo mestre, não é duplicado automaticamente. */
export function aplicarAtordoamentoC02(
  s: EstadoTurnoImpeto,
  defesaInicialFalhou: boolean,
): EstadoTurnoImpeto {
  if (!defesaInicialFalhou || s.atordoamento.ativo || s.rodada <= s.atordoamento.imunidadeAteRodada)
    return s;
  return {
    ...s,
    atordoamento: {
      ativo: true,
      ativacoesAfetadas: 0,
      escapePendente: false,
      imunidadeAteRodada: s.atordoamento.imunidadeAteRodada,
    },
  };
}
/** Escape ocorre ao fim de uma ativação afetada; uma falha admite outra ativação afetada. */
export function resolverEscapeC02(s: EstadoTurnoImpeto, escapou: boolean): EstadoTurnoImpeto {
  if (!s.atordoamento.escapePendente) throw new Error('Não há escape C02 pendente.');
  const perdidas = Math.min(2, s.atordoamento.ativacoesAfetadas + 1) as 1 | 2;
  const encerra = escapou || perdidas === 2;
  return {
    ...s,
    atordoamento: {
      ativo: !encerra,
      ativacoesAfetadas: perdidas,
      escapePendente: false,
      imunidadeAteRodada: encerra ? s.rodada + 1 : s.atordoamento.imunidadeAteRodada,
    },
  };
}
export function gastarAcao(s: EstadoTurnoImpeto, tipo: TipoAcao): EstadoTurnoImpeto {
  if (s.rodada < 1 || s.ativacao < 1) throw new Error('Nenhuma ativação em andamento.');
  if (s.estatisticas.hpAtual <= 0) throw new Error('Incapacitado: não pode agir.');
  if (tipo === 'principal') {
    if (s.acaoPrincipalGasta) throw new Error('Ação principal indisponível.');
    return { ...s, acaoPrincipalGasta: true };
  }
  if (tipo === 'buff') {
    if (s.buffRapidoGasto) throw new Error('Buff rápido indisponível.');
    return { ...s, buffRapidoGasto: true };
  }
  if (s.reacaoGasta) throw new Error('Reação já utilizada nesta rodada.');
  return { ...s, reacaoGasta: true };
}
export function usarTecnica(
  s: EstadoTurnoImpeto,
  tipo: TipoAcao,
  custoEN: number,
): EstadoTurnoImpeto {
  if (!Number.isInteger(custoEN) || custoEN < 0) throw new Error('Custo EN inválido.');
  if (s.estatisticas.energiaAtual < custoEN) throw new Error('Energia insuficiente.');
  return alterarEnergia(gastarAcao(s, tipo), -custoEN);
}
/** O Portal informa o d20; a regra não soma um atributo inteiro ao acerto. */
export function acertouCA(rolagemD20: number, ca: number, bonusExplicito = 0): boolean {
  if (!Number.isInteger(rolagemD20) || rolagemD20 < 1 || rolagemD20 > 20)
    throw new Error('Rolagem d20 inválida.');
  return rolagemD20 + bonusExplicito >= ca;
}
/** Retorna fórmula de dano de crítico: +1 dado, bônus fixos não duplicados. */
export function formulaDano(dados: number, faces: number, fixo: number, critico: boolean): string {
  if (
    !Number.isInteger(dados) ||
    dados < 1 ||
    ![4, 6, 8, 10, 12].includes(faces) ||
    !Number.isFinite(fixo)
  )
    throw new Error('Dados de dano inválidos.');
  return `${dados + (critico ? 1 : 0)}d${faces}${fixo >= 0 ? '+' : ''}${fixo}`;
}
/** Número de posições na iniciativa do chefe. O mestre pode substituir por configuração de campanha. */
export const iniciativasChefe = (jogadores: number) => Math.max(1, Math.round(jogadores / 2));
