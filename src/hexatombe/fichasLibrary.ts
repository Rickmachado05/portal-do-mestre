import { normalizarIconeAcao } from './iconesAcao';
import { normalizarAjusteRetrato, type AjusteRetrato } from '../lib/retratoAjuste';
import { importarFichaHexatombe } from '../impeto/importador';
import type { FichaPortalImpeto } from '../impeto/contrato';
import { converterUniversal, reconhecerUniversal } from '../impeto/universal.mjs';

/** Categoria para organizar fichas na biblioteca única de todos os sistemas.
 * Registros antigos sem papel são personagens de jogador.
 * Chefes usam tipo de unidade 'inimigo', com flag 'chefe' na mesa.
 */
export type PapelFicha = 'jogador' | 'npc' | 'inimigo' | 'chefe';
export const PAPEIS_FICHA: readonly PapelFicha[] = ['jogador', 'npc', 'inimigo', 'chefe'];
export function papelDaFicha(dados: { papel?: string }): PapelFicha {
  return PAPEIS_FICHA.includes(dados.papel as PapelFicha) ? (dados.papel as PapelFicha) : 'jogador';
}
export const ROTULOS_PAPEL: Record<PapelFicha, string> = {
  jogador: 'Personagem',
  npc: 'NPC',
  inimigo: 'Inimigo',
  chefe: 'Chefe',
};

/** Biblioteca de fichas v0.9 — independente da campanha e dos dados 3D. */
export const FICHAS_DB_NAME = 'hexatombe-fichas-v1';
const STORE = 'fichas';
export type FichaDados = {
  /** Identificador estável do sistema de regras; legado sem campo pertence a Ímpeto. */
  impeto?: FichaPortalImpeto; // novo contrato Ímpeto, não substitui os campos legados
  sistemaId?: string;
  /** Não interfere no sistema de regras nem no cálculo de recursos. */
  papel?: PapelFicha;
  /** Token padrão salvo separadamente no IndexedDB (ficha-token:<id>). */
  temTokenPadrao?: boolean;
  tokenPadraoAnimado?: boolean;
  objetivo?: string;
  comportamento?: string;
  notasMestre?: string;
  fasesChefe?: string;
  planoEncontro?: string;
  version?: number;
  name: string;
  element: string;
  class: string;
  hpMax: number;
  hpCurrent: number;
  manaMax: number;
  manaCurrent: number;
  ca: number;
  photo?: string;
  retratoAjuste?: AjusteRetrato;
  story?: string;
  regen?: string;
  basicName?: string;
  basicDamage?: string;
  basicDescription?: string;
  basicShortDescription?: string;
  basicIcon?: string;
  skills?: Array<{
    name?: string;
    type?: string;
    cost?: number;
    damage?: string;
    effect?: string;
    limits?: string;
    shortDescription?: string;
    icon?: string;
  }>;
  passiveName?: string;
  passiveEffect?: string;
  passiveShortDescription?: string;
  passiveIcon?: string;
  /** Estado integral do editor React original (habilidades, modelos, efeitos, passiva e retrato). */
  editorOriginal?: {
    formato: 'hexatombe-avatar-original-v1';
    elemento: string;
    nome: string;
    classe: string;
    historia: string;
    foto: string;
    ataqueBasico: { nome: string; descricao: string; resumo?: string; icone?: string };
    habilidades: Array<{
      nome: string;
      modelo: string;
      alvos: number;
      efeito: string;
      limitacoes: string;
      nomeCondicao: string;
      nomeArma: string;
      resumo?: string;
      icone?: string;
    }>;
    passiva: {
      nome: string;
      modelo: string;
      descricao: string;
      habilidadeVinculada: number;
      resumo?: string;
      icone?: string;
    };
  };
};
export type FichaRegistro = {
  id: string;
  nome: string;
  criadoEm: string;
  atualizadoEm: string;
  dados: FichaDados;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FICHAS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir biblioteca de fichas.'));
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore, resolve: (v: T) => void, reject: (err: unknown) => void) => void,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const reqStore = tx.objectStore(STORE);
      let val: T;
      let got = false;
      handler(
        reqStore,
        (v) => {
          val = v;
          got = true;
        },
        reject,
      );
      tx.oncomplete = () => (got ? resolve(val) : reject(new Error('Operação sem resultado.')));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
/** Descarta JSON malformado/incompatível; limita o tamanho total e as listas. */
function validarEditorOriginal(input: unknown): FichaDados['editorOriginal'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const v = input as Record<string, unknown>;
  if (v.formato !== 'hexatombe-avatar-original-v1') return undefined;
  const str = (value: unknown, max: number) =>
    typeof value === 'string' ? value.slice(0, max) : '';
  const basico =
    v.ataqueBasico && typeof v.ataqueBasico === 'object'
      ? (v.ataqueBasico as Record<string, unknown>)
      : {};
  const p =
    v.passiva && typeof v.passiva === 'object' ? (v.passiva as Record<string, unknown>) : {};
  const habilidades = Array.isArray(v.habilidades) ? v.habilidades.slice(0, 5) : [];
  return {
    formato: 'hexatombe-avatar-original-v1',
    elemento: str(v.elemento, 40),
    nome: str(v.nome, 80),
    classe: str(v.classe, 40),
    historia: str(v.historia, 12000),
    foto:
      typeof v.foto === 'string' &&
      /^data:image\/(?:png|jpeg|webp);base64,/i.test(v.foto) &&
      v.foto.length < 5_500_000
        ? v.foto
        : '',
    ataqueBasico: {
      nome: str(basico.nome, 80),
      descricao: str(basico.descricao, 650),
      resumo: str(basico.resumo, 140),
      icone: normalizarIconeAcao(basico.icone),
    },
    habilidades: habilidades.map((raw) => {
      const h = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      return {
        nome: str(h.nome, 80),
        modelo: str(h.modelo, 40),
        alvos: Number(h.alvos) === 2 ? 2 : 1,
        efeito: str(h.efeito, 1800),
        limitacoes: str(h.limitacoes, 750),
        nomeCondicao: str(h.nomeCondicao, 80),
        nomeArma: str(h.nomeArma, 80),
        resumo: str(h.resumo, 140),
        icone: normalizarIconeAcao(h.icone),
      };
    }),
    passiva: {
      nome: str(p.nome, 80),
      modelo: str(p.modelo, 40),
      descricao: str(p.descricao, 1400),
      habilidadeVinculada: Math.max(0, Math.min(4, Number(p.habilidadeVinculada) || 0)),
      resumo: str(p.resumo, 140),
      icone: normalizarIconeAcao(p.icone),
    },
  };
}

export function validarFicha(input: unknown): FichaDados {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('O JSON precisa conter uma ficha de personagem.');
  const v = (reconhecerUniversal(input) ? converterUniversal(input) : input) as Record<string, unknown>;
  if (
    typeof v.name !== 'string' ||
    !v.name.trim() ||
    typeof v.element !== 'string' ||
    typeof v.class !== 'string'
  )
    throw new Error('Arquivo incompatível: faltam nome, elemento ou classe.');
  const n = (key: string, min: number, max: number) => {
    const num = Number(v[key]);
    if (!Number.isFinite(num) || num < min || num > max) throw new Error(`Valor inválido: ${key}.`);
    return Math.round(num);
  };
  // Uma ficha A01 carrega o JSON original; revalidar no contrato oficial antes de salvar.
  const impeto =
    v.impeto !== undefined
      ? (() => {
          if (!v.impeto || typeof v.impeto !== 'object' || Array.isArray(v.impeto))
            throw Error('Contrato Ímpeto inválido.');
          const dado = v.impeto as Record<string, unknown>;
          if (dado.escala === 'universal-v1') return converterUniversal(dado.origem).impeto;
          if (dado.escala !== 'avatar-a01' || dado.origem === undefined)
            throw Error('Escala do Ímpeto não reconhecida.');
          return importarFichaHexatombe(dado.origem);
        })()
      : undefined;
  const universal = impeto?.escala === 'universal-v1';
  const maxRecurso = universal ? Number.MAX_SAFE_INTEGER : 9999;
  const hpMax = n('hpMax', 1, maxRecurso),
    manaMax = n('manaMax', 0, maxRecurso);
  if(universal && impeto && (hpMax!==impeto.estatisticas.hpMax||manaMax!==impeto.estatisticas.energiaReferencia||n('ca',0,30)!==impeto.estatisticas.caBase))throw Error('Recursos de referência não correspondem à ficha universal. Edite no Criador Ímpeto.');
  const photo =
    typeof v.photo === 'string' &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(v.photo) &&
    v.photo.length < 5_500_000
      ? v.photo
      : '';
  return {
    version: 1,
    sistemaId:
      typeof v.sistemaId === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v.sistemaId)
        ? v.sistemaId
        : 'impeto',
    name: v.name.trim().slice(0, 80),
    element: v.element.slice(0, 40),
    class: v.class.slice(0, 40),
    papel: papelDaFicha(v as { papel?: string }),
    temTokenPadrao: v.temTokenPadrao === true,
    tokenPadraoAnimado: v.temTokenPadrao === true && v.tokenPadraoAnimado === true,
    objetivo: typeof v.objetivo === 'string' ? v.objetivo.slice(0, 1600) : '',
    comportamento: typeof v.comportamento === 'string' ? v.comportamento.slice(0, 1600) : '',
    notasMestre: typeof v.notasMestre === 'string' ? v.notasMestre.slice(0, 4000) : '',
    fasesChefe: typeof v.fasesChefe === 'string' ? v.fasesChefe.slice(0, 3000) : '',
    planoEncontro: typeof v.planoEncontro === 'string' ? v.planoEncontro.slice(0, 3000) : '',
    hpMax,
    hpCurrent: Math.min(n('hpCurrent', 0, maxRecurso), hpMax),
    manaMax,
    manaCurrent:
      impeto ||
      (papelDaFicha(v as { papel?: string }) !== 'jogador' &&
        (!v.sistemaId || v.sistemaId === 'impeto'))
        ? n('manaCurrent', 0, maxRecurso)
        : Math.min(n('manaCurrent', 0, maxRecurso), manaMax),
    ca: n('ca', 0, 30),
    photo,
    impeto,
    ...(v.retratoAjuste && typeof v.retratoAjuste === 'object' && !Array.isArray(v.retratoAjuste)
      ? { retratoAjuste: normalizarAjusteRetrato(v.retratoAjuste as Partial<AjusteRetrato>) }
      : {}),
    story: typeof v.story === 'string' ? v.story.slice(0, 12000) : '',
    regen: typeof v.regen === 'string' ? v.regen.slice(0, 40) : '',
    basicName: typeof v.basicName === 'string' ? v.basicName.slice(0, 80) : '',
    basicDamage: typeof v.basicDamage === 'string' ? v.basicDamage.slice(0, 80) : '',
    basicDescription:
      typeof v.basicDescription === 'string' ? v.basicDescription.slice(0, 650) : '',
    basicShortDescription:
      typeof v.basicShortDescription === 'string' ? v.basicShortDescription.slice(0, 140) : '',
    basicIcon: normalizarIconeAcao(v.basicIcon),
    skills: Array.isArray(v.skills)
      ? (universal ? v.skills : v.skills.slice(0, 5)).map((x) => {
          const y = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          const str = (k: string, max: number) =>
            typeof y[k] === 'string' ? (y[k] as string).slice(0, max) : '';
          return {
            name: str('name', 80),
            type: str('type', 40),
            damage: str('damage', 80),
            effect: str('effect', 1800),
            limits: str('limits', 750),
            cost: Math.min(maxRecurso, Math.max(0, Number(y.cost) || 0)),
            shortDescription: str('shortDescription', 140),
            icon: normalizarIconeAcao(y.icon),
          };
        })
      : [],
    passiveName: typeof v.passiveName === 'string' ? v.passiveName.slice(0, 80) : '',
    passiveEffect: typeof v.passiveEffect === 'string' ? v.passiveEffect.slice(0, 1400) : '',
    passiveShortDescription:
      typeof v.passiveShortDescription === 'string' ? v.passiveShortDescription.slice(0, 140) : '',
    passiveIcon: normalizarIconeAcao(v.passiveIcon),
    // Não tentar reinterpretar os modelos do editor original: preservá-los integralmente.
    editorOriginal: validarEditorOriginal(v.editorOriginal),
  };
}
export async function listarFichas(): Promise<FichaRegistro[]> {
  const all = await transact<FichaRegistro[]>('readonly', (store, set, fail) => {
    const req = store.getAll();
    req.onsuccess = () => set(req.result as FichaRegistro[]);
    req.onerror = () => fail(req.error);
  });
  return all.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}
export async function salvarFicha(dados: unknown): Promise<FichaRegistro> {
  const safe = validarFicha(dados);
  const agora = new Date().toISOString();
  const record: FichaRegistro = {
    id: crypto.randomUUID(),
    nome: safe.name,
    criadoEm: agora,
    atualizadoEm: agora,
    dados: safe,
  };
  await transact<void>('readwrite', (store, set, fail) => {
    const req = store.put(record);
    req.onsuccess = () => set();
    req.onerror = () => fail(req.error);
  });
  return record;
}
export async function excluirFicha(id: string): Promise<void> {
  await transact<void>('readwrite', (store, set, fail) => {
    const req = store.delete(id);
    req.onsuccess = () => set();
    req.onerror = () => fail(req.error);
  });
}
export function exportarFicha(ficha: FichaRegistro): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ ...ficha.dados, version: 1 }, null, 2)], {
      type: 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ficha.dados.impeto?.escala === 'universal-v1' ? 'impeto' : 'hexatombe'}_ficha_${
    ficha.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .toLowerCase()
      .slice(0, 45) || 'personagem'
  }.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reabre exatamente o registro escolhido; não duplica a ficha no banco. */
export async function buscarFicha(id: string): Promise<FichaRegistro | undefined> {
  if (!id || id.length > 140) return undefined;
  return transact<FichaRegistro | undefined>('readonly', (store, set, fail) => {
    const req = store.get(id);
    req.onsuccess = () => set(req.result as FichaRegistro | undefined);
    req.onerror = () => fail(req.error);
  });
}

export async function salvarOuAtualizarFicha(dados: unknown, id?: string): Promise<FichaRegistro> {
  const safe = validarFicha(dados);
  const agora = new Date().toISOString();
  const anterior = id ? await buscarFicha(id) : undefined;
  if (id && !anterior)
    throw new Error('Ficha não encontrada. Reabra pela biblioteca para salvar com segurança.');
  const record: FichaRegistro = {
    id: anterior?.id || crypto.randomUUID(),
    nome: safe.name,
    criadoEm: anterior?.criadoEm || agora,
    atualizadoEm: agora,
    dados: safe,
  };
  await transact<void>('readwrite', (store, set, fail) => {
    const req = store.put(record);
    req.onsuccess = () => set();
    req.onerror = () => fail(req.error);
  });
  return record;
}
