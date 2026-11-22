import type { FichaDados } from './fichasLibrary';
import { categoriaDaHabilidade, type CategoriaAcao } from './logicaAcoesDaFicha';
import { custoPC, custoPX, custoPassiva } from '../impeto/custos';
import {
  energiaDaAtiva,
  energiaDaExploracao,
  formulaAtiva,
  tipoAtiva,
} from '../impeto/integracaoPortal';

/** Mesmo catálogo para ficha compacta (2D e 3D) e câmera imersiva (3D). */
export type AcaoDaFicha = {
  id: string;
  titulo: string;
  tipo: string;
  categoria: CategoriaAcao;
  descricao?: string;
  restricoes?: string;
  valor?: string;
  custo?: number;
  icone?: string;
  fonte?: 'a01' | 'legado' | 'manual';
  ativacao?: 'principal' | 'buff' | 'reacao' | 'exploracao' | 'passiva';
  pc?: number;
  px?: number;
  enIndefinida?: boolean;
  exigeCA?: boolean;
  alvos?: number;
  gatilho?: string;
};
/** Apenas técnicas explicitamente rotuladas como Exploração mudam de grupo.
 * Nenhuma habilidade legada é reclassificada automaticamente por sua descrição.
 */
export function ehExploracaoManual(tipo?: string): boolean {
  return (tipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .startsWith('exploracao');
}
function categoriaA01(efeito: string): CategoriaAcao {
  if (efeito === 'dano') return 'ofensiva';
  if (efeito === 'cura') return 'cura';
  if (efeito === 'escudo' || efeito === 'mitigacao') return 'defesa';
  if (efeito === 'buffCa1' || efeito === 'buffCa2') return 'buff';
  if (['empurrao', 'imobilizacao', 'atordoamento'].includes(efeito)) return 'controle';
  return 'utilidade';
}
export function listarAcoesDaFicha(ficha?: FichaDados): AcaoDaFicha[] {
  if (!ficha) return [];
  if (ficha.impeto) {
    const f = ficha.impeto;
    return [
      {
        id: 'ataque',
        titulo: f.ataqueBasico.nome || 'Ataque básico',
        tipo: 'Ataque básico',
        categoria: 'basico',
        descricao: f.ataqueBasico.descricao,
        icone: ficha.basicIcon,
        valor: `${f.estatisticas.ataqueBasicoDados}d6+${f.estatisticas.ataqueBasicoFixo}`,
        custo: 0,
        fonte: 'a01',
        ativacao: 'principal',
        exigeCA: true,
      },
      ...f.ativas.flatMap((a, i): AcaoDaFicha[] =>
        a.nome.trim() || a.efeito !== 'nenhum'
          ? [
              {
                id: `skill-${i}`,
                titulo: a.nome || `Habilidade ${i + 1}`,
                tipo: tipoAtiva(a),
                categoria: categoriaA01(a.efeito),
                descricao: a.descricao,
                restricoes: [a.gatilho ? `Gatilho: ${a.gatilho}` : '', a.limites]
                  .filter(Boolean)
                  .join(' · '),
                valor:
                  formulaAtiva(a) ||
                  (
                    {
                      empurrao: 'Empurrão',
                      imobilizacao: 'Imobilização',
                      atordoamento: 'Atordoamento C02',
                      buffCa1: '+1 CA Efetiva',
                      buffCa2: '+2 CA Efetiva',
                    } as Record<string, string>
                  )[a.efeito] ||
                  '',
                custo: energiaDaAtiva(a) ?? undefined,
                enIndefinida: energiaDaAtiva(a) === null,
                pc: custoPC(a),
                icone: ficha.skills?.[i]?.icon,
                fonte: 'a01',
                ativacao: a.ativacao,
                exigeCA:
                  a.efeito === 'dano' || a.efeito === 'empurrao' || a.efeito === 'imobilizacao',
                alvos: a.alvos,
                gatilho: a.gatilho,
              },
            ]
          : [],
      ),
      ...(f.passiva.nome
        ? [
            {
              id: 'passiva',
              titulo: f.passiva.nome,
              tipo: 'Passiva H04.1',
              categoria: 'passiva' as const,
              descricao: f.passiva.descricao,
              restricoes: f.passiva.limites,
              valor:
                f.passiva.efeito === 'nenhum'
                  ? ''
                  : `${f.passiva.quantidade}d${f.passiva.dado}${f.passiva.fixo ? `+${f.passiva.fixo}` : ''}`,
              pc: custoPassiva(f.passiva),
              icone: ficha.passiveIcon,
              fonte: 'a01' as const,
              ativacao: 'passiva' as const,
            },
          ]
        : []),
      ...f.exploracao.map((e, i): AcaoDaFicha => ({
        id: `exploracao-${i}`,
        titulo: e.nome || `Exploração ${i + 1}`,
        tipo: `Exploração · ${e.classe}`,
        categoria: 'utilidade',
        descricao: e.descricao,
        restricoes: [e.teste ? `Teste: ${e.teste}` : '', e.limites].filter(Boolean).join(' · '),
        custo: energiaDaExploracao(e) ?? undefined,
        px: custoPX(e),
        enIndefinida: energiaDaExploracao(e) === null,
        fonte: 'a01',
        ativacao: 'exploracao',
        alvos: e.alvos,
      })),
    ];
  }
  const fonteManual =
    ficha.papel && ficha.papel !== 'jogador' ? ('manual' as const) : ('legado' as const);
  const ataque =
    ficha.basicName?.trim() || ficha.editorOriginal?.ataqueBasico.nome?.trim() || 'Ataque básico';
  const nomePassiva = ficha.passiveName?.trim() || ficha.editorOriginal?.passiva.nome?.trim();
  const temAtaqueManual =
    fonteManual !== 'manual' || Boolean(ficha.basicName?.trim() || ficha.basicDamage?.trim());
  return [
    ...(temAtaqueManual
      ? [
          {
            id: 'ataque',
            titulo: ataque,
            tipo: 'Ataque básico',
            categoria: 'basico' as const,
            descricao: ficha.basicDescription || ficha.editorOriginal?.ataqueBasico.descricao,
            icone: ficha.basicIcon || ficha.editorOriginal?.ataqueBasico.icone,
            valor: ficha.basicDamage,
            fonte: fonteManual,
          },
        ]
      : []),
    ...(ficha.skills || []).flatMap((h, i): AcaoDaFicha[] =>
      h.name?.trim()
        ? [
            {
              id: `skill-${i}`,
              titulo: h.name,
              tipo: h.type || 'Habilidade',
              categoria: categoriaDaHabilidade(h.type),
              custo: h.cost,
              valor: h.damage,
              descricao: h.effect,
              restricoes: h.limits,
              icone: h.icon,
              fonte: fonteManual,
              ativacao: ehExploracaoManual(h.type) ? 'exploracao' : undefined,
            },
          ]
        : [],
    ),
    ...(nomePassiva
      ? [
          {
            id: 'passiva',
            titulo: nomePassiva,
            tipo: 'Passiva',
            categoria: 'passiva' as const,
            descricao: ficha.passiveEffect || ficha.editorOriginal?.passiva.descricao,
            icone: ficha.passiveIcon || ficha.editorOriginal?.passiva.icone,
            fonte: fonteManual,
          },
        ]
      : []),
  ];
}
