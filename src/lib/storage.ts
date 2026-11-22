/** Arquivos grandes ficam no IndexedDB, sem consumir a cota minúscula do localStorage. */
const DB_NAME = 'hexatombe-mesa-arquivos';
const STORE = 'arquivos';

// Reaproveitar a conexão evita dezenas de opens simultâneos ao alternar 2D/3D.
// Cada janela/iframe tem sua própria conexão; versionchange continua seguro.
let conexao: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (conexao) return conexao;
  conexao = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        conexao = null;
      };
      db.onclose = () => {
        conexao = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      conexao = null;
      reject(request.error);
    };
    request.onblocked = () => {
      /* aguarda outra janela liberar o upgrade */
    };
  });
  return conexao;
}

/** Busca muitas imagens numa única transação; preserva a ordem das chaves. */
export async function carregarArquivos(chaves: readonly string[]): Promise<(Blob | null)[]> {
  if (!chaves.length) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const resultado: (Blob | null)[] = Array(chaves.length).fill(null);
    chaves.forEach((chave, i) => {
      const req = tx.objectStore(STORE).get(chave);
      req.onsuccess = () => {
        resultado[i] = req.result instanceof Blob ? req.result : null;
      };
    });
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function salvarArquivo(chave: string, arquivo: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(arquivo, chave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    // Conexão é compartilhada e fechada somente no versionchange.
  }
}

export async function carregarArquivo(chave: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(chave);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    // Conexão é compartilhada e fechada somente no versionchange.
  }
}

export async function excluirArquivo(chave: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(chave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    // Conexão é compartilhada e fechada somente no versionchange.
  }
}

/** Remove anexos de uma campanha criada na v1.1. Não toca nos dados de outras mesas. */
export async function excluirArquivosPorPrefixo(prefixo: string): Promise<number> {
  if (!prefixo || !prefixo.startsWith('campanha:')) throw Error('Prefixo inválido.');
  const db = await openDb();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let removed = 0;
      const req = store.openCursor(IDBKeyRange.bound(prefixo, `${prefixo}\uffff`));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        cursor.delete();
        removed++;
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    /* conexão compartilhada */
  }
}
