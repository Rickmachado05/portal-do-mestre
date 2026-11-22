/**
 * Hexatombe: Avatar — Biblioteca de dados, etapa 1.
 * Compatível com o formato JSON exportado pelo Ateliê v0.5, v0.5.1 e v0.5.2.
 * Armazena a arte em IndexedDB (localStorage costuma ser pequeno demais para PNGs).
 * Não altera DiceBox nem o resultado matemático das rolagens.
 */
export type DiceSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;
/** D100 é o dado de dezenas do sistema percentual, com dez faces físicas. */
export const diceFaceCount = (sides: DiceSides): number => (sides === 100 ? 10 : sides);
export const diceFaceValue = (sides: DiceSides, face: number): number =>
  sides === 100 ? (face === 10 ? 0 : face * 10) : face;

export interface DiceArtPackage {
  format: 'hexatombe-dice-art';
  version: 1 | 2 | 3;
  name: string;
  type: DiceSides;
  material: string;
  baseColor: string;
  border?: { style?: string; color?: string; width?: number };
  brushColor?: string;
  showNumbers?: boolean;
  numbering?: {
    style?: string;
    font?: string;
    color?: string;
    size?: number;
    realValueHint?: boolean;
    overrides?: Record<string, string>;
  };
  faceValues?: number[];
  faceLabels?: string[];
  artworkPNG: Record<string, string>;
  [key: string]: unknown;
}

export interface SavedDiceArt {
  id: string;
  art: DiceArtPackage;
  createdAt: string;
  updatedAt: string;
  collectionId?: string;
}

export const DICE_DB_NAME = 'hexatombe-avatar-dados';
export const DICE_STORE = 'packs';
export const DICE_COLLECTION_STORE = 'collections';
export const DICE_DB_VERSION = 2;
export const DICE_ACTIVE_KEY = 'hexatombe-dice-active-v1';
export const DICE_SYNC_KEY = 'hexatombe-dice-sync-v1';
export const DICE_SYNC_EVENT = 'hexatombe-dice-library-changed';
export const DICE_TYPE_LIST: DiceSides[] = [4, 6, 8, 10, 12, 20, 100];

// São os visuais existentes na mesa; esta etapa NÃO os substitui.
export const BUILTIN_DICE_THEMES = ['marmore', 'obsidiana', 'jade', 'oceano', 'brasa'] as const;
export type BuiltinDiceTheme = (typeof BUILTIN_DICE_THEMES)[number];

const MAX_JSON_SIZE = 30 * 1024 * 1024;
const HEX = /^#[0-9a-f]{6}$/i;
const PNG_DATA = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export function validateDiceArt(raw: unknown): DiceArtPackage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('JSON inválido.');
  const p = raw as Partial<DiceArtPackage>;
  if (p.format !== 'hexatombe-dice-art' || ![1, 2, 3].includes(Number(p.version))) {
    throw Error('Este JSON não é um conjunto de dados do Ateliê (v0.5–v0.5.2).');
  }
  if (!DICE_TYPE_LIST.includes(p.type as DiceSides)) throw Error('Tipo de dado não suportado.');
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) {
    throw Error('O conjunto precisa ter um nome válido.');
  }
  if (!HEX.test(String(p.baseColor ?? ''))) throw Error('Cor de base inválida.');
  if (typeof p.material !== 'string') throw Error('Material inválido.');
  if (!p.artworkPNG || typeof p.artworkPNG !== 'object' || Array.isArray(p.artworkPNG)) {
    throw Error('As artes das faces estão ausentes.');
  }
  for (const [key, image] of Object.entries(p.artworkPNG)) {
    const index = Number(key);
    if (
      !Number.isInteger(index) ||
      index < 1 ||
      index > diceFaceCount(p.type as DiceSides) ||
      typeof image !== 'string' ||
      image.length > 2_400_000 ||
      !PNG_DATA.test(image)
    ) {
      throw Error(`Imagem da face ${key} inválida ou grande demais.`);
    }
  }
  const size = JSON.stringify(raw).length;
  if (size > MAX_JSON_SIZE) throw Error('Conjunto maior que 30 MB.');
  return p as DiceArtPackage;
}

function requestDone<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('Falha no armazenamento.'));
  });
}

export function openDiceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(Error('Este navegador não oferece IndexedDB.'));
    const request = indexedDB.open(DICE_DB_NAME, DICE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DICE_STORE))
        db.createObjectStore(DICE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DICE_COLLECTION_STORE))
        db.createObjectStore(DICE_COLLECTION_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('Não foi possível abrir a biblioteca.'));
    request.onblocked = () => reject(Error('Feche outras abas com a versão antiga da biblioteca.'));
  });
}

async function read<T>(operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDiceDatabase();
  try {
    const tx = db.transaction(DICE_STORE, 'readonly');
    return await requestDone(operation(tx.objectStore(DICE_STORE)));
  } finally {
    db.close();
  }
}

async function write<T>(operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDiceDatabase();
  try {
    const tx = db.transaction(DICE_STORE, 'readwrite');
    const request = operation(tx.objectStore(DICE_STORE));
    // Aguardar a transação inteira, não apenas o request: dados grandes podem falhar no commit.
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? Error('A operação foi cancelada.'));
      tx.onerror = () => reject(tx.error ?? Error('Falha ao gravar os dados.'));
    });
    const result = await requestDone(request);
    await completed;
    announceChange();
    return result;
  } finally {
    db.close();
  }
}

export function announceChange(): void {
  window.dispatchEvent(new Event(DICE_SYNC_EVENT));
  try {
    localStorage.setItem(DICE_SYNC_KEY, String(Date.now()));
  } catch {
    /* modo privado */
  }
}

export async function listSavedDice(): Promise<SavedDiceArt[]> {
  const all = await read<SavedDiceArt[]>((store) => store.getAll());
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSavedDice(id: string): Promise<SavedDiceArt | undefined> {
  return read<SavedDiceArt | undefined>((store) => store.get(id));
}

export async function saveDiceArt(raw: unknown, existingId?: string): Promise<SavedDiceArt> {
  const art = validateDiceArt(raw);
  const previous = existingId ? await getSavedDice(existingId) : undefined;
  const now = new Date().toISOString();
  const item: SavedDiceArt = {
    id:
      previous?.id ??
      (crypto.randomUUID
        ? crypto.randomUUID()
        : `dado-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    art: structuredClone(art),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  await write((store) => store.put(item));
  return item;
}

/** Exclui a arte isolada e remove referências em coleções no mesmo commit. */
async function deleteDiceWithCollectionReferences(id: string): Promise<void> {
  const db = await openDiceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([DICE_STORE, DICE_COLLECTION_STORE], 'readwrite');
      tx.objectStore(DICE_STORE).delete(id);
      const collections = tx.objectStore(DICE_COLLECTION_STORE);
      const scan = collections.getAll();
      scan.onsuccess = () => {
        for (const collection of scan.result as Array<{
          id: string;
          members: Record<string, string>;
          updatedAt: string;
        }>) {
          const next = { ...collection.members };
          let changed = false;
          for (const [type, memberId] of Object.entries(next)) {
            if (memberId === id) {
              delete next[type];
              changed = true;
            }
          }
          if (changed)
            collections.put({ ...collection, members: next, updatedAt: new Date().toISOString() });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? Error('Falha ao remover dado.'));
      tx.onerror = () => reject(tx.error ?? Error('Falha ao remover dado.'));
    });
    announceChange();
  } finally {
    db.close();
  }
}

export async function removeSavedDice(id: string): Promise<void> {
  await deleteDiceWithCollectionReferences(id);
  const active = getActiveDiceMap();
  let changed = false;
  for (const die of DICE_TYPE_LIST) {
    const key = String(die);
    if (active[key]?.kind === 'custom' && active[key].id === id) {
      delete active[key];
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(DICE_ACTIVE_KEY, JSON.stringify(active));
    announceChange();
  }
}

export type ActiveDice = { kind: 'custom'; id: string } | { kind: 'preset'; id: BuiltinDiceTheme };
export type ActiveDiceMap = Partial<Record<string, ActiveDice>>;

export function getActiveDiceMap(): ActiveDiceMap {
  try {
    const value = JSON.parse(localStorage.getItem(DICE_ACTIVE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as ActiveDiceMap)
      : {};
  } catch {
    return {};
  }
}
export function activeForDie(type: DiceSides): ActiveDice {
  const entry = getActiveDiceMap()[String(type)];
  if (entry?.kind === 'custom' && typeof entry.id === 'string') return entry;
  if (entry?.kind === 'preset' && BUILTIN_DICE_THEMES.includes(entry.id)) return entry;
  return { kind: 'preset', id: 'marmore' };
}
export function setActiveDice(type: DiceSides, value: ActiveDice): void {
  if (!DICE_TYPE_LIST.includes(type)) throw Error('Tipo de dado inválido.');
  if (value.kind === 'preset' && !BUILTIN_DICE_THEMES.includes(value.id))
    throw Error('Tema padrão inválido.');
  const map = getActiveDiceMap();
  map[String(type)] = value;
  localStorage.setItem(DICE_ACTIVE_KEY, JSON.stringify(map));
  announceChange();
}

export async function activeArtForDie(type: DiceSides): Promise<DiceArtPackage | null> {
  const sel = activeForDie(type);
  if (sel.kind === 'preset') return null;
  const pack = await getSavedDice(sel.id);
  return pack?.art.type === type ? pack.art : null;
}

/** Ativa todos os membros de um pacote em uma única atualização. */
export function setActiveDiceMany(choices: Partial<Record<string, ActiveDice>>): void {
  const map = getActiveDiceMap();
  for (const [type, choice] of Object.entries(choices)) {
    if (!DICE_TYPE_LIST.includes(Number(type) as DiceSides) || !choice) continue;
    if (choice.kind === 'preset' && !BUILTIN_DICE_THEMES.includes(choice.id)) continue;
    map[type] = choice;
  }
  localStorage.setItem(DICE_ACTIVE_KEY, JSON.stringify(map));
  announceChange();
}
