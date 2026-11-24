/** Integração de dados do Criador Hexatombe: Avatar A01 à Biblioteca Única do Portal.
 * Não é uma conversão universal de sistema: o identificador Ímpeto permanece estável.
 */
import { importarFichaHexatombe } from './importador';
import { converterUniversal, reconhecerUniversal } from './universal.mjs';
import { custoPC, custoEN, custoPassiva, custoPX, custoENPX } from './custos';
import type { FichaPortalImpeto, Ativa, Exploracao } from './contrato';

export type CamposBibliotecaA01 = {
  sistemaId: 'impeto';
  name: string;
  element: string;
  class: string;
  hpMax: number;
  hpCurrent: number;
  manaMax: number;
  manaCurrent: number;
  ca: number;
  photo: string;
  story: string;
  regen: string;
  basicName: string;
  basicDamage: string;
  basicDescription: string;
  skills: Array<{
    name: string;
    type: string;
    cost: number;
    damage: string;
    effect: string;
    limits: string;
  }>;
  passiveName: string;
  passiveEffect: string;
  impeto: FichaPortalImpeto;
};
export const energiaDaAtiva = (ativa: Ativa) => custoEN(custoPC(ativa), ativa);
export const energiaDaExploracao = (e: Exploracao) => custoENPX(custoPX(e), e.automatica);
export function tipoAtiva(ativa: Ativa): string {
  switch (ativa.efeito) {
    case 'dano':
      return 'Ofensiva';
    case 'cura':
      return 'Cura';
    case 'escudo':
    case 'mitigacao':
      return 'Defesa';
    case 'buffCa1':
    case 'buffCa2':
      return 'Buff';
    case 'empurrao':
    case 'imobilizacao':
    case 'atordoamento':
      return 'Controle';
    default:
      return 'Utilidade';
  }
}
export function formulaAtiva(a: Ativa): string {
  if (!['dano', 'cura', 'escudo', 'mitigacao'].includes(a.efeito)) return '';
  return `${a.quantidade}d${a.dado}${a.fixo ? `+${a.fixo}` : ''}`;
}
export const resumirCustoEN = (custo: number | null) =>
  custo === null ? 'EN a definir' : `${custo} EN`;
export function converterFichaParaBiblioteca(fonte: unknown): CamposBibliotecaA01 {
  if (reconhecerUniversal(fonte)) return converterUniversal(fonte) as CamposBibliotecaA01;
  const impeto = importarFichaHexatombe(fonte);
  const { estatisticas: e } = impeto;
  const skills = impeto.ativas.map((a) => ({
    name: a.nome,
    type: tipoAtiva(a),
    cost: energiaDaAtiva(a) ?? 0,
    damage: formulaAtiva(a),
    effect: a.descricao,
    limits: a.limites,
  }));
  return {
    sistemaId: 'impeto',
    name: impeto.nome,
    element: impeto.elemento,
    class: impeto.arquetipo || 'Ímpeto A01',
    hpMax: e.hpMax,
    hpCurrent: e.hpAtual,
    manaMax: e.energiaReferencia,
    manaCurrent: e.energiaAtual,
    ca: e.caBase,
    photo: impeto.foto,
    story: impeto.historia,
    regen: String(e.regeneracao),
    basicName: impeto.ataqueBasico.nome || 'Ataque básico',
    basicDamage: `${e.ataqueBasicoDados}d6+${e.ataqueBasicoFixo}`,
    basicDescription: impeto.ataqueBasico.descricao,
    skills,
    passiveName: impeto.passiva.nome,
    passiveEffect: impeto.passiva.descricao || `Passiva H04.1 · ${custoPassiva(impeto.passiva)} PC`,
    impeto,
  };
}
export function reconhecerFichaCriador(fonte: unknown): boolean {
  if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte)) return false;
  if (reconhecerUniversal(fonte)) return true;
  const objeto = fonte as Record<string, unknown>;
  const dados =
    objeto.ficha && typeof objeto.ficha === 'object' && !Array.isArray(objeto.ficha)
      ? (objeto.ficha as Record<string, unknown>)
      : objeto;
  return (
    (objeto.formato === 'hexatombe-avatar-ficha' && objeto.versaoFormato === 1) ||
    (dados.versao === 1 &&
      typeof dados.nome === 'string' &&
      typeof dados.elemento === 'string' &&
      ('ativasImpeto' in dados || 'atributosImpeto' in dados))
  );
}
export function exportarOrigemCriador(impeto: FichaPortalImpeto): void {
  const origem = impeto.origem;
  const pacote = impeto.escala === 'universal-v1' ? origem :
    origem &&
    typeof origem === 'object' &&
    !Array.isArray(origem) &&
    (origem as Record<string, unknown>).formato === 'hexatombe-avatar-ficha'
      ? origem
      : { formato: 'hexatombe-avatar-ficha', versaoFormato: 1, ficha: origem };
  const blob = new Blob([JSON.stringify(pacote, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${impeto.escala === 'universal-v1' ? 'Impeto' : 'Avatar_A01'}_${
    impeto.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .slice(0, 50) || 'personagem'
  }.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
