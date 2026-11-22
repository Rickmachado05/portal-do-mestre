import type { ItemInventario } from '../hexatombe/itensLibrary';
import type { EfeitoCombate } from '../hexatombe/efeitosCombate';
/** Leitura compatível de dados compartilhados da Mesa 2D e da Mesa 3D.
 * O mesmo registro de campanha é utilizado pelos dois modos. */
import type { BarreiraMapa } from './lighting';
import { normalizarClima, type ConfigClima } from '../lib/weather';
import type { TokenSkin } from './tokenSkins';
import { dimensoesToken3D } from './dimensoesToken3D';
import { normalizarAjusteRetrato, type AjusteRetrato } from './retratoAjuste';
import { normalizarAparenciaToken, type AparenciaToken } from './aparenciaToken';
import { validarMemoriaFog, type MemoriaFog } from './fogExploracao';
import { normalizarParticipantesIniciativa } from './iniciativaParticipantes';
import {
  normalizarDesenhos,
  normalizarMarcadores,
  type TracoDesenho,
  type MarcadorMapa,
} from './anotacoesMesa';

export type PontoMesa = { x: number; y: number };
export type TokenMesa = PontoMesa & {
  tamanho: number;
  largura3D?: number;
  altura3D?: number;
  rotacao: number;
  oculto: boolean;
  travado: boolean;
  ocultarNome: boolean;
  espelhadoX?: boolean;
  skinId?: string;
  visao: number;
  emiteLuz: boolean;
  alcanceLuz: number;
  corLuz: string;
};
export type UnidadeMesa = {
  id: string;
  nome: string;
  tipo: 'jogador' | 'npc' | 'inimigo';
  fichaId?: string;
  chefe?: boolean;
  cor: string;
  temToken: boolean;
  temRetrato: boolean;
  temPdf: boolean;
  skins?: TokenSkin[];
  skinPadraoId?: string;
  tokenIdleGif?: boolean;
  tokenIdlePausado?: boolean;
  tokenIdleVelocidade?: number;
  tokenAparencia?: AparenciaToken;
  retratoEnquadramento?: AjusteRetrato;
  hp: number;
  hpMax: number;
  mana: number;
  manaMax: number;
  escudo: number;
  ca: number;
  iniciativa: number;
  condicoes: EfeitoCombate[];
  itens: ItemInventario[];
  elemento: string;
};
export type TracoMesa = {
  id: string;
  acao: 'revelar' | 'ocultar';
  pontos: PontoMesa[];
  raio: number;
};
export type FonteMesa = PontoMesa & {
  id: string;
  nome?: string;
  cor: string;
  alcance: number;
  ativa: boolean;
};
export type CenaMesa = {
  permitirDesenhoJogadores: boolean;
  desenhos: TracoDesenho[];
  marcadores: MarcadorMapa[];
  id: string;
  nome: string;
  temMapa: boolean;
  participantesIniciativa: string[];
  camadas: {
    fundo: boolean;
    tokens: boolean;
    marcadores: boolean;
    jogadores: boolean;
    npcs: boolean;
    inimigos: boolean;
    objetos: boolean;
  };
  visibilidade: 'total' | 'nevoa' | 'visao' | 'nevoa_visao' | 'exploracao';
  nevoa: TracoMesa[];
  exploracaoPorToken: MemoriaFog;
  barreiras: BarreiraMapa[];
  fontesLuz: FonteMesa[];
  iluminacao: { ativa: boolean; ambiente: number; colisao: boolean };
  clima: ConfigClima;
  tokens: Record<string, TokenMesa>;
};
export type EstadoMesa = {
  titulo: string;
  cenaAtivaId: string;
  cenas: CenaMesa[];
  unidades: UnidadeMesa[];
};
export type DimensoesMesa = { largura: number; altura: number };
const entre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const numero = (value: unknown, def: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : def;
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const tipoUnidade = (v: unknown): UnidadeMesa['tipo'] =>
  v === 'npc' || v === 'inimigo' ? v : 'jogador';
export function normalizarEstadoCompartilhado(raw: unknown): EstadoMesa {
  const data = obj(raw);
  const unidades = lista(data.unidades)
    .filter((v) => typeof obj(v).id === 'string')
    .map((v) => {
      const u = obj(v);
      const cor = typeof u.cor === 'string' && /^#[0-9a-f]{6}$/i.test(u.cor) ? u.cor : '#7198a2';
      return {
        id: String(u.id),
        nome: String(u.nome || 'Personagem').slice(0, 90),
        tipo: tipoUnidade(u.tipo),
        fichaId:
          typeof u.fichaId === 'string' && u.fichaId.trim() ? u.fichaId.slice(0, 140) : undefined,
        chefe: u.chefe === true,
        cor,
        temToken: Boolean(u.temToken),
        temRetrato: Boolean(u.temRetrato),
        temPdf: Boolean(u.temPdf),
        skins: Array.isArray(u.skins) ? (u.skins as TokenSkin[]) : [],
        skinPadraoId: typeof u.skinPadraoId === 'string' ? u.skinPadraoId : undefined,
        tokenIdleGif: u.tokenIdleGif === true,
        tokenIdlePausado: u.tokenIdlePausado === true,
        tokenIdleVelocidade: typeof u.tokenIdleVelocidade === 'number' ? u.tokenIdleVelocidade : 1,
        tokenAparencia: normalizarAparenciaToken(
          u.tokenAparencia as Partial<AparenciaToken> | undefined,
          cor,
        ),
        ...(u.retratoEnquadramento && typeof u.retratoEnquadramento === 'object'
          ? {
              retratoEnquadramento: normalizarAjusteRetrato(
                u.retratoEnquadramento as Partial<AjusteRetrato>,
              ),
            }
          : {}),
        hp: Math.max(0, numero(u.hp, 0)),
        hpMax: Math.max(0, numero(u.hpMax, 0)),
        mana: Math.max(0, numero(u.mana, 0)),
        manaMax: Math.max(0, numero(u.manaMax, 0)),
        escudo: Math.max(0, numero(u.escudo, 0)),
        ca: Math.max(0, numero(u.ca, 0)),
        iniciativa: numero(u.iniciativa, 0),
        // Preserve a categoria e a origem do efeito da ficha original.
        // Campanhas antigas sem `tipo` continuam sendo tratadas como Condição.
        condicoes: lista(u.condicoes)
          .filter((x) => typeof obj(x).id === 'string')
          .map((x) => {
            const efeito = obj(x);
            const tipo =
              efeito.tipo === 'buff' || efeito.tipo === 'debuff' || efeito.tipo === 'condicao'
                ? efeito.tipo
                : undefined;
            const origem =
              typeof efeito.origem === 'string' && efeito.origem.trim()
                ? efeito.origem.trim().slice(0, 75)
                : undefined;
            return {
              id: String(efeito.id),
              nome: String(efeito.nome || ''),
              turnos: numero(efeito.turnos, 0),
              ...(tipo ? { tipo } : {}),
              ...(origem ? { origem } : {}),
            };
          }),
        itens: lista(u.itens) as ItemInventario[],
        elemento: String(u.elemento || ''),
      };
    });
  const cenas = lista(data.cenas)
    .filter((v) => typeof obj(v).id === 'string')
    .map((v) => {
      const c = obj(v),
        tokens = obj(c.tokens),
        light = obj(c.iluminacao),
        layers = obj(c.camadas);
      const visibilidade = ['total', 'nevoa', 'visao', 'nevoa_visao', 'exploracao'].includes(
        String(c.visibilidade),
      )
        ? (c.visibilidade as CenaMesa['visibilidade'])
        : 'total';
      const map: Record<string, TokenMesa> = {};
      for (const [id, rawToken] of Object.entries(tokens)) {
        const t = obj(rawToken);
        map[id] = {
          x: entre(numero(t.x, 50), 0, 100),
          y: entre(numero(t.y, 50), 0, 100),
          tamanho: entre(numero(t.tamanho, 70), 18, 300),
          ...dimensoesToken3D(t as { largura3D?: number; altura3D?: number }),
          rotacao: numero(t.rotacao, 0),
          oculto: Boolean(t.oculto),
          travado: Boolean(t.travado),
          ocultarNome: Boolean(t.ocultarNome),
          espelhadoX: Boolean(t.espelhadoX),
          skinId: typeof t.skinId === 'string' ? t.skinId : undefined,
          visao: entre(numero(t.visao, 18), 2, 50),
          emiteLuz: Boolean(t.emiteLuz),
          alcanceLuz: entre(numero(t.alcanceLuz, 15), 2, 70),
          corLuz: typeof t.corLuz === 'string' ? t.corLuz : '#ffcd86',
        };
      }
      const barreiras = lista(c.barreiras)
        .filter((b) => ['parede', 'porta', 'janela', 'mureta'].includes(String(obj(b).tipo)))
        .map((b) => {
          const p = obj(b);
          return {
            id: String(p.id || ''),
            tipo: p.tipo as BarreiraMapa['tipo'],
            x1: numero(p.x1, 0),
            y1: numero(p.y1, 0),
            x2: numero(p.x2, 0),
            y2: numero(p.y2, 0),
            aberta: Boolean(p.aberta),
            trancada: Boolean(p.trancada),
            bloqueiaMovimento:
              typeof p.bloqueiaMovimento === 'boolean' ? p.bloqueiaMovimento : undefined,
            bloqueiaVisao: typeof p.bloqueiaVisao === 'boolean' ? p.bloqueiaVisao : undefined,
          };
        });
      const fontesLuz = lista(c.fontesLuz).map((f) => {
        const p = obj(f);
        return {
          id: String(p.id || ''),
          nome: typeof p.nome === 'string' ? p.nome.slice(0, 65) : 'Luz',
          x: numero(p.x, 0),
          y: numero(p.y, 0),
          cor: String(p.cor || '#ffd18e'),
          alcance: entre(numero(p.alcance, 15), 2, 70),
          ativa: p.ativa !== false,
        };
      });
      const nevoa = lista(c.nevoa).map((t) => {
        const p = obj(t);
        return {
          id: String(p.id || ''),
          acao: p.acao === 'revelar' ? ('revelar' as const) : ('ocultar' as const),
          raio: entre(numero(p.raio, 4), 0.2, 50),
          pontos: lista(p.pontos).map((q) => ({ x: numero(obj(q).x, 0), y: numero(obj(q).y, 0) })),
        };
      });
      return {
        id: String(c.id),
        nome: String(c.nome || 'Cena').slice(0, 100),
        temMapa: Boolean(c.temMapa),
        participantesIniciativa: normalizarParticipantesIniciativa(c.participantesIniciativa),
        exploracaoPorToken: validarMemoriaFog(c.exploracaoPorToken),
        camadas: {
          fundo: layers.fundo !== false,
          tokens: layers.tokens !== false,
          marcadores: layers.marcadores !== false,
          jogadores: layers.jogadores !== false,
          npcs: layers.npcs !== false,
          inimigos: layers.inimigos !== false,
          objetos: layers.objetos !== false,
        },
        visibilidade,
        nevoa,
        barreiras,
        fontesLuz,
        permitirDesenhoJogadores: c.permitirDesenhoJogadores !== false,
        desenhos: normalizarDesenhos(c.desenhos),
        marcadores: normalizarMarcadores(c.marcadores),
        iluminacao: {
          ativa: Boolean(light.ativa),
          ambiente: entre(numero(light.ambiente, 40), 0, 100),
          colisao: Boolean(light.colisao),
        },
        clima: normalizarClima(c.clima),
        tokens: map,
      };
    });
  return {
    titulo: String(data.titulo || 'Mesa do Mestre'),
    cenaAtivaId: String(data.cenaAtivaId || cenas[0]?.id || ''),
    cenas,
    unidades,
  };
}
