/** Editor de cenários 3D do mestre — dados locais, isolados do estado da mesa 2D.
 * O prefixo portal-mestre- garante inclusão no backup completo do perfil.
 */
import { colisaoSala, RAIO_AVATAR, type Posicao } from './roomLogic';
import type { AjusteImagemPiso3D } from './pisoConstruicao3D';
import type { PeriodoDia3D } from './ambientes3D';
import { normalizarMiniaturasCena3D, type InstanciaMiniatura3D } from './miniaturasCena3D';

export type TipoObjeto3D =
  | 'parede'
  | 'porta'
  | 'mesa'
  | 'estante'
  | 'caixa'
  | 'barril'
  | 'coluna'
  | 'tapete'
  | 'luz'
  | 'cadeira'
  | 'balcao'
  | 'vaso';
export type BaseCena3D = 'arquivos' | 'vazia';
export type PisoCena3D = 'madeira' | 'pedra' | 'grama' | 'imagem';
export const TIPOS_PISO_3D: readonly PisoCena3D[] = ['madeira', 'pedra', 'grama', 'imagem'];
export const LARGURA_TERRENO_PADRAO_3D = 18;
export const PROFUNDIDADE_TERRENO_PADRAO_3D = 17;
/** A proporção inicial vem da própria planta. É apenas o tamanho físico inicial;
 * a imagem continua intacta e pode ser expandida pelo mestre. */
export function dimensoesTerrenoDaPlanta3D(largura: number, altura: number) {
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura <= 0 || altura <= 0)
    return { largura: LARGURA_TERRENO_PADRAO_3D, profundidade: PROFUNDIDADE_TERRENO_PADRAO_3D };
  const ladoMaior = 22;
  return {
    largura: Math.max(4, Math.round(((ladoMaior * largura) / Math.max(largura, altura)) * 4) / 4),
    profundidade: Math.max(
      4,
      Math.round(((ladoMaior * altura) / Math.max(largura, altura)) * 4) / 4,
    ),
  };
}
export function dimensoesTerreno3D(
  cenario: Pick<Cenario3D, 'larguraTerreno' | 'profundidadeTerreno'>,
) {
  const largura = Math.max(4, Math.min(120, cenario.larguraTerreno ?? LARGURA_TERRENO_PADRAO_3D));
  const profundidade = Math.max(
    4,
    Math.min(120, cenario.profundidadeTerreno ?? PROFUNDIDADE_TERRENO_PADRAO_3D),
  );
  return {
    largura,
    profundidade,
    minX: -largura / 2,
    maxX: largura / 2,
    minZ: -profundidade / 2,
    maxZ: profundidade / 2,
  };
}
/** Corrige proporção de mapas compartilhados que herdaram dimensões antigas
 * do palco 3D. As coordenadas dos tokens e das barreiras já são percentuais,
 * e peças legadas mantêm sua posição relativa ao mapa.
 * Não modifica cenas sem imagem nem converte mapas antigos por conta própria. */
export function ajustarProporcaoMapaCompartilhado3D(
  cenario: Cenario3D,
  aspectoImagem: number,
): Cenario3D {
  if (
    cenario.mapaUnico !== true ||
    cenario.piso !== 'imagem' ||
    !Number.isFinite(aspectoImagem) ||
    aspectoImagem <= 0
  )
    return cenario;
  const atual = dimensoesTerreno3D(cenario);
  const aspectoAtual = atual.largura / atual.profundidade;
  const aspecto = Math.max(0.05, Math.min(20, aspectoImagem));
  const diferenca = Math.abs(aspectoAtual / aspecto - 1);
  if (diferenca < 0.008) {
    return Math.abs((cenario.aspectoPlanta ?? 0) - aspecto) < 0.008
      ? cenario
      : { ...cenario, aspectoPlanta: aspecto };
  }
  // A dimensão maior permanece estável. Só ajustamos o eixo distorcido.
  const maior = Math.max(atual.largura, atual.profundidade);
  const largura = aspecto >= 1 ? maior : maior * aspecto;
  const profundidade = aspecto >= 1 ? maior / aspecto : maior;
  const destinoW = Math.max(4, Math.min(120, Math.round(largura * 100) / 100));
  const destinoH = Math.max(4, Math.min(120, Math.round(profundidade * 100) / 100));
  // Uma imagem extremamente estreita pode esbarrar no mínimo de 4 m;
  // nesse caso evita repetir a correção sem progresso a cada carregamento.
  if (destinoW === atual.largura && destinoH === atual.profundidade) {
    return Math.abs((cenario.aspectoPlanta ?? 0) - aspecto) < 0.008
      ? cenario
      : { ...cenario, aspectoPlanta: aspecto };
  }
  const escalaX = destinoW / atual.largura,
    escalaZ = destinoH / atual.profundidade;
  return {
    ...cenario,
    aspectoPlanta: aspecto,
    larguraTerreno: destinoW,
    profundidadeTerreno: destinoH,
    larguraPlanta: destinoW,
    profundidadePlanta: destinoH,
    ajusteLivrePlanta: true,
    objetos: cenario.objetos.map((o) => ({ ...o, x: o.x * escalaX, z: o.z * escalaZ })),
    miniaturas: (cenario.miniaturas ?? []).map((m) => ({
      ...m,
      x: m.x * escalaX,
      z: m.z * escalaZ,
    })),
  };
}
export function medidasObjeto3D(obj: ObjetoCena3D) {
  const padrao = ESPECIFICACOES_3D[obj.tipo];
  return {
    largura:
      obj.tipo === 'parede' ? (obj.comprimento ?? padrao.largura) : (obj.largura ?? padrao.largura),
    profundidade: obj.profundidade ?? padrao.profundidade,
    altura: obj.altura ?? padrao.altura,
  };
}
export const tamanhoGrade3D = (v: unknown): number => (v === 0.25 || v === 1 ? v : 0.5);
/** Alinha a colocação no chão, sem alterar a posição dos personagens. */
export function alinharNoChao3D(
  x: number,
  z: number,
  encaixar = true,
  passo = 0.5,
  cenario: Cenario3D = CENARIO_INICIAL_3D,
): Posicao {
  const area = dimensoesTerreno3D(cenario);
  const n = tamanhoGrade3D(passo);
  const valido = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, encaixar ? Math.round(v / n) * n : v));
  return {
    x: valido(x, area.minX + 0.06, area.maxX - 0.06),
    z: valido(z, area.minZ + 0.06, area.maxZ - 0.06),
  };
}

export type ObjetoCena3D = {
  id: string;
  tipo: TipoObjeto3D;
  nome: string;
  x: number;
  z: number;
  rotacao: number;
  estilo?: 'pixel';
  comprimento?: number;
  largura?: number;
  profundidade?: number;
  altura?: number;
  oculto?: boolean;
};
export type Cenario3D = {
  versao: 1;
  base: BaseCena3D;
  objetos: ObjetoCena3D[];
  miniaturas?: InstanciaMiniatura3D[];
  piso?: PisoCena3D;
  ajusteMapa?: AjusteImagemPiso3D;
  escalaMapa?: number;
  deslocamentoMapaX?: number;
  deslocamentoMapaZ?: number;
  opacidadePlanta?: number;
  mostrarGrade?: boolean;
  encaixarGrade?: boolean;
  passoGrade?: number;
  larguraTerreno?: number;
  profundidadeTerreno?: number;
  larguraPlanta?: number;
  profundidadePlanta?: number;
  ajusteLivrePlanta?: boolean;
  aspectoPlanta?: number;
  periodoDia?: PeriodoDia3D;
  mapaUnico?: boolean;
};
export const TIPOS_OBJETO_3D: readonly TipoObjeto3D[] = [
  'parede',
  'porta',
  'mesa',
  'estante',
  'caixa',
  'barril',
  'coluna',
  'tapete',
  'luz',
  'cadeira',
  'balcao',
  'vaso',
];
export const ESPECIFICACOES_3D: Record<
  TipoObjeto3D,
  { nome: string; largura: number; profundidade: number; altura: number; bloqueia: boolean }
> = {
  parede: { nome: 'Parede', largura: 3, profundidade: 0.24, altura: 3.6, bloqueia: true },
  porta: { nome: 'Porta fechada', largura: 1.3, profundidade: 0.24, altura: 3.1, bloqueia: true },
  mesa: { nome: 'Mesa', largura: 2.2, profundidade: 1.3, altura: 1.05, bloqueia: true },
  estante: { nome: 'Estante', largura: 1.8, profundidade: 0.6, altura: 2.6, bloqueia: true },
  caixa: { nome: 'Caixote', largura: 0.85, profundidade: 0.85, altura: 0.85, bloqueia: true },
  barril: { nome: 'Barril', largura: 0.8, profundidade: 0.8, altura: 1.05, bloqueia: true },
  coluna: { nome: 'Coluna', largura: 0.85, profundidade: 0.85, altura: 3.4, bloqueia: true },
  tapete: { nome: 'Tapete', largura: 3.5, profundidade: 2.5, altura: 0.025, bloqueia: false },
  luz: { nome: 'Luz quente', largura: 0.3, profundidade: 0.3, altura: 2.5, bloqueia: false },
  cadeira: {
    nome: 'Cadeira 2.5D',
    largura: 0.85,
    profundidade: 0.85,
    altura: 1.35,
    bloqueia: true,
  },
  balcao: {
    nome: 'Balcão de madeira',
    largura: 3.2,
    profundidade: 1.05,
    altura: 1.2,
    bloqueia: true,
  },
  vaso: {
    nome: 'Vaso de folhas 2.5D',
    largura: 0.7,
    profundidade: 0.7,
    altura: 1.35,
    bloqueia: true,
  },
};
export const CENARIO_INICIAL_3D: Cenario3D = {
  versao: 1,
  base: 'vazia',
  mapaUnico: true,
  objetos: [],
};
export const chaveCena3D = (campanhaId: string, cenaId: string) =>
  `portal-mestre-cenario3d-v1:${campanhaId}:${cenaId}`;
const numero = (v: unknown, alternativa: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : alternativa;
const valido = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
/** Nunca deixa coordenadas, IDs ou arrays de um backup antigo escaparem sem validação. */
export function normalizarCenario3D(raw: unknown): Cenario3D {
  if (!valido(raw)) return { ...CENARIO_INICIAL_3D, objetos: [] };
  const areaBackup = dimensoesTerreno3D({
    larguraTerreno:
      typeof raw.larguraTerreno === 'number' && Number.isFinite(raw.larguraTerreno)
        ? raw.larguraTerreno
        : undefined,
    profundidadeTerreno:
      typeof raw.profundidadeTerreno === 'number' && Number.isFinite(raw.profundidadeTerreno)
        ? raw.profundidadeTerreno
        : undefined,
  });
  const vistos = new Set<string>();
  const objetos: ObjetoCena3D[] = [];
  for (const v of Array.isArray(raw.objetos) ? raw.objetos.slice(0, 140) : []) {
    if (!valido(v) || !TIPOS_OBJETO_3D.includes(v.tipo as TipoObjeto3D)) continue;
    if (typeof v.id !== 'string' || !/^obj-[\w-]{1,80}$/.test(v.id) || vistos.has(v.id)) continue;
    vistos.add(v.id);
    const tipo = v.tipo as TipoObjeto3D;
    const obj: ObjetoCena3D = {
      id: v.id,
      tipo,
      nome:
        typeof v.nome === 'string' && v.nome.trim()
          ? v.nome.trim().slice(0, 65)
          : ESPECIFICACOES_3D[tipo].nome,
      x: numero(v.x, 0, areaBackup.minX + 0.06, areaBackup.maxX - 0.06),
      z: numero(v.z, 0, areaBackup.minZ + 0.06, areaBackup.maxZ - 0.06),
      rotacao: numero(v.rotacao, 0, -Math.PI * 2, Math.PI * 2),
    };
    if (v.estilo === 'pixel') obj.estilo = 'pixel';
    if (v.oculto === true) obj.oculto = true;
    if (tipo === 'parede' && typeof v.comprimento === 'number')
      obj.comprimento = numero(v.comprimento, 3, 0.25, 120);
    for (const chave of ['largura', 'profundidade', 'altura'] as const)
      if (typeof v[chave] === 'number')
        obj[chave] = numero(v[chave], ESPECIFICACOES_3D[tipo][chave], 0.1, 120);
    objetos.push(obj);
  }
  const cenario: Cenario3D = {
    versao: 1,
    base: raw.base === 'arquivos' ? 'arquivos' : 'vazia',
    objetos,
    miniaturas: normalizarMiniaturasCena3D(
      raw.miniaturas,
      areaBackup.largura / 2,
      areaBackup.profundidade / 2,
    ),
  };
  if (raw.mapaUnico === true) cenario.mapaUnico = true;
  if (typeof raw.larguraTerreno === 'number')
    cenario.larguraTerreno = numero(raw.larguraTerreno, 18, 4, 120);
  if (typeof raw.profundidadeTerreno === 'number')
    cenario.profundidadeTerreno = numero(raw.profundidadeTerreno, 17, 4, 120);
  if (typeof raw.larguraPlanta === 'number')
    cenario.larguraPlanta = numero(raw.larguraPlanta, 18, 4, 120);
  if (typeof raw.profundidadePlanta === 'number')
    cenario.profundidadePlanta = numero(raw.profundidadePlanta, 17, 4, 120);
  if (typeof raw.ajusteLivrePlanta === 'boolean') cenario.ajusteLivrePlanta = raw.ajusteLivrePlanta;
  if (typeof raw.aspectoPlanta === 'number')
    cenario.aspectoPlanta = numero(raw.aspectoPlanta, 1, 0.05, 20);
  if (raw.periodoDia === 'dia' || raw.periodoDia === 'entardecer' || raw.periodoDia === 'noite')
    cenario.periodoDia = raw.periodoDia;
  if (TIPOS_PISO_3D.includes(raw.piso as PisoCena3D)) cenario.piso = raw.piso as PisoCena3D;
  if (raw.ajusteMapa === 'conter' || raw.ajusteMapa === 'cobrir')
    cenario.ajusteMapa = raw.ajusteMapa;
  if (typeof raw.escalaMapa === 'number') cenario.escalaMapa = numero(raw.escalaMapa, 1, 0.5, 2);
  if (typeof raw.deslocamentoMapaX === 'number')
    cenario.deslocamentoMapaX = numero(raw.deslocamentoMapaX, 0, -0.5, 0.5);
  if (typeof raw.deslocamentoMapaZ === 'number')
    cenario.deslocamentoMapaZ = numero(raw.deslocamentoMapaZ, 0, -0.5, 0.5);
  if (typeof raw.opacidadePlanta === 'number')
    cenario.opacidadePlanta = numero(raw.opacidadePlanta, 0.55, 0.15, 1);
  if (typeof raw.mostrarGrade === 'boolean') cenario.mostrarGrade = raw.mostrarGrade;
  if (typeof raw.encaixarGrade === 'boolean') cenario.encaixarGrade = raw.encaixarGrade;
  if (raw.passoGrade === 0.25 || raw.passoGrade === 0.5 || raw.passoGrade === 1)
    cenario.passoGrade = raw.passoGrade;
  return cenario;
}
export function novoObjeto3D(
  tipo: TipoObjeto3D,
  origem: Posicao = { x: 0, z: 0 },
  cenario: Cenario3D = CENARIO_INICIAL_3D,
): ObjetoCena3D {
  const area = dimensoesTerreno3D(cenario);
  return {
    id: `obj-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    tipo,
    nome: ESPECIFICACOES_3D[tipo].nome,
    x: numero(origem.x, 0, area.minX, area.maxX),
    z: numero(origem.z, 0, area.minZ, area.maxZ),
    rotacao: 0,
  };
}
/** Circulo do personagem contra caixas orientadas; ignora itens apenas decorativos. */
export function tocaObjeto3D(p: Posicao, o: ObjetoCena3D, raio = RAIO_AVATAR): boolean {
  const esp = ESPECIFICACOES_3D[o.tipo];
  if (!esp.bloqueia) return false;
  const medidas = medidasObjeto3D(o);
  const dx = p.x - o.x,
    dz = p.z - o.z,
    c = Math.cos(o.rotacao),
    s = Math.sin(o.rotacao);
  const rx = dx * c + dz * s,
    rz = -dx * s + dz * c;
  const largura = medidas.largura;
  const px = Math.max(-largura / 2, Math.min(largura / 2, rx));
  const pz = Math.max(-medidas.profundidade / 2, Math.min(medidas.profundidade / 2, rz));
  return Math.hypot(rx - px, rz - pz) < raio;
}
export function colisaoCenario3D(p: Posicao, cenario: Cenario3D, raio = RAIO_AVATAR): boolean {
  const area = dimensoesTerreno3D(cenario);
  if (
    p.x - raio < area.minX ||
    p.x + raio > area.maxX ||
    p.z - raio < area.minZ ||
    p.z + raio > area.maxZ
  )
    return true;
  if (cenario.base === 'arquivos' && colisaoSala(p, raio)) return true;
  return cenario.objetos.some((o) => tocaObjeto3D(p, o, raio));
}
export function moverNoCenario3D(inicio: Posicao, delta: Posicao, cenario: Cenario3D): Posicao {
  const distancia = Math.hypot(delta.x, delta.z);
  if (!Number.isFinite(distancia) || !distancia) return { ...inicio };
  const passos = Math.min(1200, Math.max(1, Math.ceil(distancia / 0.1)));
  const dx = delta.x / passos,
    dz = delta.z / passos;
  let p = { ...inicio };
  for (let i = 0; i < passos; i++) {
    const px = { x: p.x + dx, z: p.z };
    if (!colisaoCenario3D(px, cenario)) p = px;
    const pz = { x: p.x, z: p.z + dz };
    if (!colisaoCenario3D(pz, cenario)) p = pz;
  }
  return p;
}
export function posicaoLivre3D(
  cenario: Cenario3D,
  preferida: Posicao = { x: 0, z: 3.65 },
): Posicao {
  const opcoes = [
    preferida,
    { x: 0, z: 3.65 },
    { x: 0, z: 0 },
    { x: 3, z: 4 },
    { x: -3, z: 4 },
    { x: 0, z: 6 },
    { x: 4, z: 6 },
    { x: -4, z: 6 },
  ];
  return opcoes.find((p) => !colisaoCenario3D(p, cenario)) ?? { x: 0, z: 3.65 };
}
export function carregarCenario3D(campanhaId: string, cenaId: string): Cenario3D {
  try {
    const s = localStorage.getItem(chaveCena3D(campanhaId, cenaId));
    // Novas cenas são uma mesa plana desde o primeiro acesso. As cenas salvas
    // continuam com suas medidas e objetos legados, sem migração silenciosa.
    return s
      ? normalizarCenario3D(JSON.parse(s))
      : normalizarCenario3D({
          versao: 1,
          base: 'vazia',
          piso: 'madeira',
          mapaUnico: true,
          larguraTerreno: 22,
          profundidadeTerreno: 13.75,
          objetos: [],
        });
  } catch {
    return normalizarCenario3D(null);
  }
}
export function salvarCenario3D(campanhaId: string, cenaId: string, valor: Cenario3D): Cenario3D {
  const validado = normalizarCenario3D(valor);
  localStorage.setItem(chaveCena3D(campanhaId, cenaId), JSON.stringify(validado));
  // O evento storage não dispara na mesma aba que gravou o cenário.
  // O publicador multiplayer precisa receber alterações de luz/céu sem polling.
  if (typeof window !== 'undefined')
    window.dispatchEvent(
      new CustomEvent('portal-mestre-cenario3d-atualizado', {
        detail: { campanhaId, cenaId },
      }),
    );
  return validado;
}
