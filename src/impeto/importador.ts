import { custoPC, custoPassiva, custoPX, validaExploracao } from './custos';
import {
  ESCALA_AVATAR_A01,
  NOMES_ATRIBUTOS,
  NOMES_PERICIAS,
  SISTEMA_IMPETO,
  atributosBase,
  periciasBase,
  recursosBase,
  derivacaoVazia,
  ativaVazia,
  passivaVazia,
  type FichaAvatar,
  type FichaPortalImpeto,
  type RecursosPR,
  type Derivacao,
  type Atributos,
  type Pericias,
  type Ativa,
  type Passiva,
  type Exploracao,
  type ConfiguracaoCampanhaImpeto,
} from './contrato';

type Objeto = Record<string, unknown>;
const obj = (x: unknown): x is Objeto => x !== null && typeof x === 'object' && !Array.isArray(x);
const texto = (x: unknown): x is string => typeof x === 'string';
const inteiro = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const PR_CA = [0, 1, 3, 6, 10, 15] as const;
const PR_ATAQUE = [0, 5, 13] as const;
const PR_REGEN = [0, 3, 9] as const;
const EFEITOS = [
  'nenhum',
  'dano',
  'cura',
  'escudo',
  'mitigacao',
  'empurrao',
  'imobilizacao',
  'atordoamento',
  'buffCa1',
  'buffCa2',
];
const ELEMENTOS = ['agua', 'terra', 'fogo', 'ar', 'neutro'];
export class ImportacaoImpetoErro extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ImportacaoImpetoErro';
  }
}
function exigir(ok: boolean, mensagem: string): asserts ok {
  if (!ok) throw new ImportacaoImpetoErro(mensagem);
}
export const pontosRecursos = (r: RecursosPR) =>
  r.hp + r.energia + PR_CA[r.ca - 8] + PR_ATAQUE[r.ataqueDados] + PR_REGEN[r.regeneracao];
export const pontosAtributos = (a: Atributos) =>
  NOMES_ATRIBUTOS.reduce((s, n) => {
    for (let v = 9; v <= a[n]; v++) s += v <= 12 ? 1 : 2;
    return s;
  }, 0);
export const pontosPericias = (p: Pericias) => NOMES_PERICIAS.reduce((s, n) => s + p[n], 0);
export function calcularRecursosCampanha(
  r: RecursosPR,
  d: Derivacao,
  escala: ConfiguracaoCampanhaImpeto,
) {
  const okD01 = escala.habilitarD01 !== false && d.tipo !== '';
  return {
    hpMax: escala.hpBase + 3 * r.hp + (okD01 && d.tipo === 'resistencia' ? 3 : 0),
    energiaReferencia: escala.energiaBase + 5 * r.energia + (okD01 && d.tipo === 'reserva' ? 5 : 0),
    caBase: r.ca,
    regeneracao: escala.regeneracaoBase + r.regeneracao,
    ataqueBasicoDados: escala.ataqueBaseDados + r.ataqueDados,
    ataqueBasicoFixo: escala.ataqueBaseFixo + (okD01 && d.tipo === 'potencia' ? 1 : 0),
  };
}
export const calcularBaseA01 = (r: RecursosPR, d: Derivacao) =>
  calcularRecursosCampanha(r, d, ESCALA_AVATAR_A01);
function atributosValidos(x: unknown): x is Atributos {
  return (
    obj(x) &&
    NOMES_ATRIBUTOS.every((n) => inteiro(x[n]) && x[n] >= 8 && x[n] <= 14) &&
    pontosAtributos(x as Atributos) <= ESCALA_AVATAR_A01.pa
  );
}
function periciasValidas(x: unknown): x is Pericias {
  return (
    obj(x) &&
    NOMES_PERICIAS.every((n) => [0, 1, 2].includes(x[n] as number)) &&
    pontosPericias(x as Pericias) <= ESCALA_AVATAR_A01.pt
  );
}
function recursosValidos(x: unknown): x is RecursosPR {
  return (
    obj(x) &&
    inteiro(x.hp) &&
    x.hp >= 0 &&
    inteiro(x.energia) &&
    x.energia >= 0 &&
    inteiro(x.ca) &&
    x.ca >= 8 &&
    x.ca <= 13 &&
    inteiro(x.ataqueDados) &&
    x.ataqueDados >= 0 &&
    x.ataqueDados <= 2 &&
    inteiro(x.regeneracao) &&
    x.regeneracao >= 0 &&
    x.regeneracao <= 2 &&
    pontosRecursos(x as RecursosPR) <= ESCALA_AVATAR_A01.pr
  );
}
function derivacaoValida(d: unknown, atr: Atributos): d is Derivacao {
  if (!obj(d) || !texto(d.justificativa) || !texto(d.tipo) || !texto(d.atributo)) return false;
  if (d.tipo === '') return d.atributo === '';
  return (
    ['resistencia', 'reserva', 'potencia'].includes(d.tipo) &&
    NOMES_ATRIBUTOS.some((n) => n === d.atributo && atr[n] >= 12)
  );
}
function ativaValida(x: unknown): x is Ativa {
  if (!obj(x)) return false;
  return (
    texto(x.nome) &&
    EFEITOS.includes(x.efeito as string) &&
    [4, 6, 8, 10, 12].includes(x.dado as number) &&
    inteiro(x.quantidade) &&
    x.quantidade >= 1 &&
    x.quantidade <= 10 &&
    inteiro(x.fixo) &&
    x.fixo >= 0 &&
    x.fixo <= 20 &&
    typeof x.empurraoAdicional === 'boolean' &&
    ['principal', 'buff', 'reacao'].includes(x.ativacao as string) &&
    [1, 2, 3].includes(x.alvos as number) &&
    typeof x.distante === 'boolean' &&
    inteiro(x.rodadasExtras) &&
    x.rodadasExtras >= 0 &&
    x.rodadasExtras <= 3 &&
    texto(x.gatilho) &&
    texto(x.descricao) &&
    texto(x.limites) &&
    (!x.empurraoAdicional || x.efeito === 'dano') &&
    (x.ativacao !== 'reacao' || ['escudo', 'mitigacao'].includes(x.efeito as string)) &&
    (x.ativacao !== 'buff' || ['buffCa1', 'buffCa2'].includes(x.efeito as string))
  );
}
function passivaValida(x: unknown): x is Passiva {
  return (
    obj(x) &&
    texto(x.nome) &&
    ['nenhum', 'dano', 'escudo', 'mitigacao'].includes(x.efeito as string) &&
    [4, 6, 8, 10, 12].includes(x.dado as number) &&
    inteiro(x.quantidade) &&
    x.quantidade >= 1 &&
    x.quantidade <= 10 &&
    inteiro(x.fixo) &&
    x.fixo >= 0 &&
    x.fixo <= 20 &&
    [1, 2, 3].includes(x.usos as number) &&
    texto(x.gatilho) &&
    texto(x.descricao) &&
    texto(x.limites)
  );
}
/** Importa wrapper do criador ou JSON de rascunho bruto.
 * Não depende de `localStorage`, versão do React ou da estrutura de banco do Portal.
 */
export function importarFichaHexatombe(arquivo: unknown): FichaPortalImpeto {
  exigir(obj(arquivo), 'JSON precisa ser um objeto.');
  const envelope = arquivo as Objeto;
  const comWrapper = envelope.formato === 'hexatombe-avatar-ficha';
  if (comWrapper)
    exigir(envelope.versaoFormato === 1, 'Formato de exportação ainda não suportado.');
  const raw = comWrapper ? envelope.ficha : arquivo;
  exigir(obj(raw), 'O JSON não contém uma ficha válida.');
  const f = raw as Objeto;
  exigir(f.versao === 1, 'Versão da ficha incompatível.');
  exigir(
    texto(f.nome) && texto(f.historia) && texto(f.foto) && ELEMENTOS.includes(f.elemento as string),
    'Identidade do personagem inválida.',
  );
  if (f.escalaAvatar !== undefined)
    exigir(f.escalaAvatar === 'piloto-a01', 'Escala Avatar desconhecida.');
  const alertas: string[] = [];
  if (!f.escalaAvatar)
    alertas.push('Ficha anterior à A01: HP e Energia serão recalculados na base 130/120.');
  const atr = f.atributosImpeto === undefined ? atributosBase() : f.atributosImpeto;
  exigir(atributosValidos(atr), 'Atributos inválidos ou orçamento de 32 PA excedido.');
  if (f.atributosImpeto === undefined)
    alertas.push('Sem atributos Ímpeto modernos: aplicada base 8, revisão necessária.');
  const per = f.periciasImpeto === undefined ? periciasBase() : f.periciasImpeto;
  exigir(periciasValidas(per), 'Perícias inválidas ou orçamento de 6 PT excedido.');
  if (f.periciasImpeto === undefined)
    alertas.push('Perícias não presentes: definidas como não treinadas.');
  const pr = f.recursosImpeto === undefined ? recursosBase() : f.recursosImpeto;
  exigir(recursosValidos(pr), 'PR inválidos: confira CA, ataque, regeneração e saldo de 20 PR.');
  if (f.recursosImpeto === undefined)
    alertas.push('Sem investimentos modernos de PR: base A01 aplicada.');
  const d = f.derivacaoD01 === undefined ? derivacaoVazia() : f.derivacaoD01;
  exigir(derivacaoValida(d, atr), 'Derivação D01 inválida: requer atributo de apoio com 12+.');
  const base = calcularBaseA01(pr, d);
  let ativas: Ativa[];
  if (Array.isArray(f.ativasImpeto)) {
    exigir(
      f.ativasImpeto.length === 5 && f.ativasImpeto.every(ativaValida),
      'As cinco habilidades H06 precisam conter uma estrutura válida.',
    );
    ativas = f.ativasImpeto as Ativa[];
  } else {
    alertas.push(
      'Habilidades antigas migradas como descrições; reconstruir os efeitos e custos H06.',
    );
    const antigas = Array.isArray(f.habilidades) ? f.habilidades : [];
    ativas = Array.from({ length: 5 }, (_, i) => {
      const a = obj(antigas[i]) ? antigas[i] : {};
      return {
        ...ativaVazia(),
        nome: texto(a.nome) ? a.nome : '',
        descricao: texto(a.efeito) ? a.efeito : '',
        limites: texto(a.limitacoes) ? a.limitacoes : '',
      };
    });
  }
  let passiva: Passiva;
  if (f.passivaImpeto !== undefined) {
    exigir(passivaValida(f.passivaImpeto), 'Passiva Ímpeto inválida.');
    passiva = f.passivaImpeto;
  } else {
    alertas.push('Passiva antiga precisa de revisão H04.1.');
    const ant = obj(f.passiva) ? f.passiva : {};
    passiva = {
      ...passivaVazia(),
      nome: texto(ant.nome) ? ant.nome : '',
      descricao: texto(ant.descricao) ? ant.descricao : '',
    };
  }
  const px: Exploracao[] =
    f.exploracaoImpeto === undefined ? [] : (f.exploracaoImpeto as Exploracao[]);
  exigir(
    Array.isArray(px) && px.length <= 3 && px.every(validaExploracao),
    'Técnicas de exploração inválidas ou mais de três técnicas.',
  );
  const custoCombate = ativas.reduce((s, a) => s + custoPC(a), 0) + custoPassiva(passiva);
  const custoExploracao = px.reduce((s, a) => s + custoPX(a), 0);
  exigir(
    ativas.every((a) => custoPC(a) <= 28) &&
      custoPassiva(passiva) <= 20 &&
      custoCombate <= ESCALA_AVATAR_A01.pc,
    'Custos PC acima da configuração Avatar A01.',
  );
  exigir(
    px.every((a) => custoPX(a) <= 16) && custoExploracao <= ESCALA_AVATAR_A01.px,
    'Custos PX acima da configuração Avatar A01.',
  );
  const ataque = obj(f.ataqueBasico) ? f.ataqueBasico : {};
  const ficha: FichaPortalImpeto = {
    contrato: 1,
    sistema: SISTEMA_IMPETO,
    escala: 'avatar-a01',
    nome: f.nome as string,
    foto: f.foto as string,
    historia: f.historia as string,
    elemento: f.elemento as FichaAvatar['elemento'],
    atributos: atr,
    pericias: per,
    recursosPR: pr,
    arquetipo: texto(f.arquetipoImpeto) ? f.arquetipoImpeto : '',
    talento: texto(f.talentoArquetipo) ? f.talentoArquetipo : '',
    vantagem: texto(f.vantagemUniversal) ? f.vantagemUniversal : '',
    derivacao: d,
    ataqueBasico: {
      nome: texto(ataque.nome) ? ataque.nome : '',
      descricao: texto(ataque.descricao) ? ataque.descricao : '',
    },
    ativas,
    passiva,
    exploracao: px,
    estatisticas: {
      ...base,
      hpAtual: base.hpMax,
      energiaAtual: base.energiaReferencia,
      bonusCaTemporario: 0,
      penalidadeCaTemporaria: 0,
    },
    requerRevisao: alertas.length > 0,
    avisos: alertas,
    origem: arquivo,
  };
  return ficha;
}
