import {
  aplicarOperacaoDiario,
  normalizarPaginasDiario,
  type OperacaoDiario,
  type PaginaDiario,
} from '../hexatombe/registrosDiario';

const BANCO = 'portal-diarios-privados-convidados-v1';
const STORE = 'diarios';
/** Identidade local estável pelo nome da campanha + apelido usado no mesmo navegador.
 * O código da sala muda a cada reinício; usá-lo perderia a continuidade das anotações. */
export function chaveDiarioJogador(
  campanha: string,
  apelido: string,
  personagemId?: string,
): string {
  const base = `${campanha.trim().normalize('NFC').toLocaleLowerCase('pt-BR')}:${apelido.trim().normalize('NFC').toLocaleLowerCase('pt-BR')}`;
  return personagemId ? `${base}:personagem:${personagemId}` : base;
}
export function atualizarDiarioJogador(
  paginas: PaginaDiario[],
  operacao: OperacaoDiario,
): PaginaDiario[] {
  // O próprio jogador escolhe permissões, mas nunca aceita decisões do destinatário
  // no seu acervo privado. As alterações remotas passam pelo servidor com autorização.
  return aplicarOperacaoDiario(paginas, operacao);
}
function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BANCO, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'chave' });
    };
    request.onerror = () => reject(request.error || new Error('Banco do diário indisponível.'));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function carregarDiarioJogador(chave: string): Promise<PaginaDiario[]> {
  const db = await abrirDb();
  try {
    return await new Promise<PaginaDiario[]>((resolve, reject) => {
      const tr = db.transaction(STORE, 'readonly');
      const req = tr.objectStore(STORE).get(chave);
      req.onsuccess = () => resolve(normalizarPaginasDiario(req.result?.paginas));
      req.onerror = () => reject(req.error || new Error('Falha ao carregar anotações.'));
    });
  } finally {
    db.close();
  }
}
export async function guardarDiarioJogador(chave: string, paginas: PaginaDiario[]): Promise<void> {
  const db = await abrirDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tr = db.transaction(STORE, 'readwrite');
      tr.objectStore(STORE).put({ chave, paginas: normalizarPaginasDiario(paginas) });
      tr.oncomplete = () => resolve();
      tr.onerror = () => reject(tr.error || new Error('Falha ao salvar anotações.'));
      tr.onabort = () => reject(tr.error || new Error('Armazenamento de anotações cancelado.'));
    });
  } finally {
    db.close();
  }
}

/** Migra UMA vez o acervo anterior (campanha+apelido) para o personagem atribuído.
 * Uma troca de personagem não copia as notas privadas para o próximo personagem. */
export async function carregarDiarioJogadorPorPersonagem(
  chave: string,
  legada: string,
): Promise<PaginaDiario[]> {
  if (chave === legada) return carregarDiarioJogador(chave);
  const atual = await carregarDiarioJogador(chave);
  if (atual.length) return atual;
  const marcador = `portal-diario-personagem-migracao:${legada}`;
  try {
    if (localStorage.getItem(marcador)) return atual;
  } catch {
    /* modo restrito */
  }
  const anteriores = await carregarDiarioJogador(legada);
  if (anteriores.length) await guardarDiarioJogador(chave, anteriores);
  try {
    localStorage.setItem(marcador, '1');
  } catch {
    /* dados já migrados para IndexedDB */
  }
  return anteriores;
}
