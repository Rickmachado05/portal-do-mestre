/** Rascunhos locais do Criador original. Isolados das fichas publicadas e das campanhas. */
const BANCO = 'portal-mestre-rascunhos-fichas-v1';
const LOJA = 'rascunhos';

export type EstadoRascunhoFicha = {
  elemento: 'agua' | 'terra' | 'fogo' | 'ar' | 'neutro';
  nome: string;
  classe: 'Lutador' | 'Linha de Frente' | 'Conjurador';
  historia: string;
  foto: string;
  ataqueBasico: { nome: string; descricao: string; resumo?: string; icone?: string };
  habilidades: Array<{
    nome: string;
    modelo: string;
    alvos: 1 | 2;
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
export type RascunhoFicha = {
  chave: string;
  atualizadoEm: string;
  formato: 'portal-mestre-rascunho-ficha-v1';
  estado: EstadoRascunhoFicha;
};

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(BANCO, 1);
    requisicao.onupgradeneeded = () => {
      if (!requisicao.result.objectStoreNames.contains(LOJA)) {
        requisicao.result.createObjectStore(LOJA, { keyPath: 'chave' });
      }
    };
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () =>
      reject(requisicao.error || Error('Não foi possível abrir os rascunhos.'));
  });
}
async function operar<T>(
  modo: IDBTransactionMode,
  agir: (
    loja: IDBObjectStore,
    resolver: (valor: T) => void,
    rejeitar: (erro: unknown) => void,
  ) => void,
): Promise<T> {
  const banco = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transacao = banco.transaction(LOJA, modo);
      const loja = transacao.objectStore(LOJA);
      let valor: T;
      let pronto = false;
      agir(
        loja,
        (v) => {
          valor = v;
          pronto = true;
        },
        reject,
      );
      transacao.oncomplete = () =>
        pronto ? resolve(valor) : reject(Error('Operação incompleta.'));
      transacao.onerror = () => reject(transacao.error);
      transacao.onabort = () => reject(transacao.error);
    });
  } finally {
    banco.close();
  }
}
export function chaveRascunhoFicha(id?: string | null) {
  return id ? `ficha:${id}` : 'nova';
}
export async function buscarRascunhoFicha(chave: string): Promise<RascunhoFicha | undefined> {
  return operar<RascunhoFicha | undefined>('readonly', (loja, ok, erro) => {
    const req = loja.get(chave);
    req.onsuccess = () => ok(req.result as RascunhoFicha | undefined);
    req.onerror = () => erro(req.error);
  });
}
export async function guardarRascunhoFicha(
  chave: string,
  estado: EstadoRascunhoFicha,
): Promise<void> {
  const registro: RascunhoFicha = {
    chave,
    atualizadoEm: new Date().toISOString(),
    formato: 'portal-mestre-rascunho-ficha-v1',
    estado,
  };
  await operar<void>('readwrite', (loja, ok, erro) => {
    const req = loja.put(registro);
    req.onsuccess = () => ok();
    req.onerror = () => erro(req.error);
  });
}
export async function descartarRascunhoFicha(chave: string): Promise<void> {
  await operar<void>('readwrite', (loja, ok, erro) => {
    const req = loja.delete(chave);
    req.onsuccess = () => ok();
    req.onerror = () => erro(req.error);
  });
}
