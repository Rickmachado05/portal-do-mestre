/** Pacotes completos do Ateliê: armazenamento normalizado e transações atômicas em IndexedDB v2.
 * Projetado para migração posterior para uma API remota: objetos com IDs estáveis, timestamps e formato versionado.
 */
import {
  openDiceDatabase,
  DICE_STORE,
  DICE_COLLECTION_STORE,
  DICE_TYPE_LIST,
  validateDiceArt,
  announceChange,
  getActiveDiceMap,
  DICE_ACTIVE_KEY,
  setActiveDiceMany,
  type DiceArtPackage,
  type SavedDiceArt,
  type DiceSides,
} from './diceLibrary';

export const DICE_COLLECTION_FORMAT = 'hexatombe-dice-collection' as const;
export interface DiceCollectionExport {
  format: typeof DICE_COLLECTION_FORMAT;
  version: 1;
  name: string;
  dice: Partial<Record<string, DiceArtPackage>>;
}
export interface SavedDiceCollection {
  id: string;
  name: string;
  members: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
function uid() {
  return crypto.randomUUID?.() ?? `pack-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('Erro na biblioteca.'));
  });
}
export function validateDiceCollection(raw: unknown): DiceCollectionExport {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Pacote JSON inválido.');
  const data = raw as Partial<DiceCollectionExport>;
  if (data.format !== DICE_COLLECTION_FORMAT || data.version !== 1)
    throw Error('Formato de pacote não reconhecido.');
  if (
    !data.name ||
    typeof data.name !== 'string' ||
    data.name.trim().length < 1 ||
    data.name.length > 100
  )
    throw Error('Nome do pacote inválido.');
  if (!data.dice || typeof data.dice !== 'object' || Array.isArray(data.dice))
    throw Error('O pacote precisa conter dados.');
  const entries = Object.entries(data.dice);
  if (!entries.length || entries.length > DICE_TYPE_LIST.length)
    throw Error('O pacote deve incluir de 1 a 7 dados.');
  for (const [side, art] of entries) {
    if (!DICE_TYPE_LIST.includes(Number(side) as DiceSides))
      throw Error(`Dado D${side} não suportado.`);
    const valid = validateDiceArt(art);
    if (String(valid.type) !== side) throw Error(`O dado D${side} está com tipo incorreto.`);
  }
  if (JSON.stringify(data).length > 160 * 1024 * 1024) throw Error('Pacote acima de 160 MB.');
  return data as DiceCollectionExport;
}
export async function listDiceCollections(): Promise<SavedDiceCollection[]> {
  const db = await openDiceDatabase();
  try {
    return (
      (await wrapRequest(
        db.transaction(DICE_COLLECTION_STORE).objectStore(DICE_COLLECTION_STORE).getAll(),
      )) as SavedDiceCollection[]
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}
export async function getDiceCollection(id: string): Promise<SavedDiceCollection | undefined> {
  const db = await openDiceDatabase();
  try {
    return (await wrapRequest(
      db.transaction(DICE_COLLECTION_STORE).objectStore(DICE_COLLECTION_STORE).get(id),
    )) as SavedDiceCollection | undefined;
  } finally {
    db.close();
  }
}
export async function exportDiceCollection(id: string): Promise<DiceCollectionExport> {
  const collection = await getDiceCollection(id);
  if (!collection) throw Error('Pacote não encontrado.');
  const db = await openDiceDatabase();
  try {
    const tx = db.transaction(DICE_STORE, 'readonly');
    const store = tx.objectStore(DICE_STORE);
    const members = await Promise.all(
      Object.entries(collection.members).map(async ([side, memberId]) => {
        const item = (await wrapRequest(store.get(memberId))) as SavedDiceArt | undefined;
        return [side, item?.art] as const;
      }),
    );
    const dice: Record<string, DiceArtPackage> = {};
    for (const [side, art] of members) if (art) dice[side] = art;
    return { format: DICE_COLLECTION_FORMAT, version: 1, name: collection.name, dice };
  } finally {
    db.close();
  }
}
export async function saveDiceCollection(
  raw: unknown,
  existingId?: string,
): Promise<SavedDiceCollection> {
  const data = validateDiceCollection(raw);
  const previous = existingId ? await getDiceCollection(existingId) : undefined;
  if (existingId && !previous) throw Error('O pacote selecionado não está mais na biblioteca.');
  const now = new Date().toISOString();
  const result: SavedDiceCollection = {
    id: previous?.id ?? uid(),
    name: data.name.trim(),
    members: {},
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  const db = await openDiceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([DICE_STORE, DICE_COLLECTION_STORE], 'readwrite');
      const packs = tx.objectStore(DICE_STORE);
      for (const [side, art] of Object.entries(data.dice)) {
        const memberId = previous?.members[side] ?? uid();
        result.members[side] = memberId;
        const old = packs.get(memberId);
        old.onsuccess = () => {
          const oldItem = old.result as SavedDiceArt | undefined;
          packs.put({
            id: memberId,
            art: structuredClone(art),
            createdAt: oldItem?.createdAt ?? now,
            updatedAt: now,
            collectionId: result.id,
          });
        };
      }
      // Ao editar um pacote, remover somente os membros que foram retirados dele.
      for (const [side, memberId] of Object.entries(previous?.members ?? {})) {
        if (!(side in data.dice)) packs.delete(memberId);
      }
      tx.objectStore(DICE_COLLECTION_STORE).put(result);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? Error('Não foi possível salvar todos os dados.'));
      tx.onerror = () => reject(tx.error ?? Error('Não foi possível salvar todos os dados.'));
    });
  } finally {
    db.close();
  }
  announceChange();
  return result;
}
export async function removeDiceCollection(id: string): Promise<void> {
  const collection = await getDiceCollection(id);
  if (!collection) return;
  const db = await openDiceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([DICE_STORE, DICE_COLLECTION_STORE], 'readwrite');
      for (const memberId of Object.values(collection.members))
        tx.objectStore(DICE_STORE).delete(memberId);
      tx.objectStore(DICE_COLLECTION_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? Error('Não foi possível excluir o pacote.'));
      tx.onerror = () => reject(tx.error ?? Error('Não foi possível excluir o pacote.'));
    });
    // Não deixar a mesa apontando para dados removidos.
    const active = getActiveDiceMap();
    let changed = false;
    for (const [side, memberId] of Object.entries(collection.members)) {
      if (active[side]?.kind === 'custom' && active[side].id === memberId) {
        delete active[side];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(DICE_ACTIVE_KEY, JSON.stringify(active));
    announceChange();
  } finally {
    db.close();
  }
}
export function activateDiceCollection(collection: SavedDiceCollection): void {
  const entries: Record<string, { kind: 'custom'; id: string }> = {};
  for (const [side, id] of Object.entries(collection.members))
    entries[side] = { kind: 'custom', id };
  setActiveDiceMany(entries);
}
