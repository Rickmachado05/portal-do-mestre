/** Biblioteca local de campanhas v1.1.
 * O índice é pequeno (metadados e capas comprimidas); a mesa continua guardando
 * o estado no localStorage e as imagens grandes no IndexedDB de arquivos.
 * Uma migração lê o estado legado sem movê-lo ou apagá-lo.
 */
export type ElementoCampanha = 'fogo' | 'agua' | 'terra' | 'ar' | 'espiritual';
export type CampanhaMeta = {
  id: string;
  titulo: string;
  descricao: string;
  tema: ElementoCampanha;
  capa?: string;
  criadaEm: string;
  atualizadaEm: string;
  acessadaEm?: string;
  arquivada: boolean;
  fichaIds: string[];
  colecaoId?: string;
  /** Campo legado (antigo 'sistema ou cenário'); mantido para compatibilidade. */
  sistema?: string;
  /** Sistema registrado e cenário são campos separados. */
  sistemaId?: string;
  /** Escolha experimental Ímpeto: muda a referência da campanha, não reescreve fichas. */
  escalaImpeto?: 'livro-m042' | 'piloto-a01';
  cenario?: string;
  /** Preferência opcional do mestre: preserva 2D como padrão para campanhas antigas. */
  modoMesa?: '2d' | '3d';
};
export type CampanhaEntrada = Pick<CampanhaMeta, 'titulo' | 'descricao' | 'tema' | 'fichaIds'> & {
  capa?: string;
  colecaoId?: string;
  sistema?: string;
  sistemaId?: string;
  /** Escolha experimental Ímpeto: muda a referência da campanha, não reescreve fichas. */
  escalaImpeto?: 'livro-m042' | 'piloto-a01';
  cenario?: string;
  modoMesa?: '2d' | '3d';
};
const INDEX = 'hexatombe-campanhas-v1';
const LEGACY = 'hexatombe-mesa-v1';
const THEMES: ElementoCampanha[] = ['fogo', 'agua', 'terra', 'ar', 'espiritual'];
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `camp-${crypto.randomUUID()}`
    : `camp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const isRecord = (item: unknown): item is Record<string, unknown> =>
  Boolean(item) && typeof item === 'object' && !Array.isArray(item);
function sanitize(item: unknown): CampanhaMeta | null {
  if (
    !isRecord(item) ||
    typeof item.id !== 'string' ||
    !/^(principal|camp-[a-zA-Z0-9-]+)$/.test(item.id)
  )
    return null;
  const tema = THEMES.includes(item.tema as ElementoCampanha)
    ? (item.tema as ElementoCampanha)
    : 'espiritual';
  return {
    id: item.id,
    titulo: String(item.titulo || 'Campanha sem nome').slice(0, 80),
    descricao: String(item.descricao || '').slice(0, 700),
    tema,
    capa:
      typeof item.capa === 'string' &&
      /^data:image\/(jpeg|png|webp);base64,/.test(item.capa) &&
      item.capa.length < 700_000
        ? item.capa
        : undefined,
    criadaEm: typeof item.criadaEm === 'string' ? item.criadaEm : now(),
    atualizadaEm: typeof item.atualizadaEm === 'string' ? item.atualizadaEm : now(),
    acessadaEm: typeof item.acessadaEm === 'string' ? item.acessadaEm : undefined,
    arquivada: Boolean(item.arquivada),
    fichaIds: Array.isArray(item.fichaIds)
      ? item.fichaIds.filter((s): s is string => typeof s === 'string').slice(0, 100)
      : [],
    colecaoId: typeof item.colecaoId === 'string' ? item.colecaoId : undefined,
    sistema: typeof item.sistema === 'string' ? item.sistema.slice(0, 80) : undefined,
    sistemaId:
      typeof item.sistemaId === 'string' && /^[a-z0-9_-]{0,64}$/i.test(item.sistemaId)
        ? item.sistemaId
        : undefined,
    escalaImpeto:
      item.escalaImpeto === 'piloto-a01'
        ? 'piloto-a01'
        : item.escalaImpeto === 'livro-m042'
          ? 'livro-m042'
          : String(item.sistema || '')
                .toLowerCase()
                .includes('avatar')
            ? 'piloto-a01'
            : 'livro-m042',
    cenario: typeof item.cenario === 'string' ? item.cenario.slice(0, 100) : undefined,
    modoMesa: item.modoMesa === '3d' ? '3d' : '2d',
  };
}
function persist(items: CampanhaMeta[]) {
  // A gravação ocorre como uma operação única. Se a cota falhar, não atualiza a UI.
  localStorage.setItem(INDEX, JSON.stringify({ schemaVersion: 1, items }));
  window.dispatchEvent(new Event('hexatombe-campaigns-changed'));
}
/** Lê o índice; no primeiro uso reconhece automaticamente uma mesa existente. */
export function listarCampanhas(): CampanhaMeta[] {
  const previous = localStorage.getItem(INDEX);
  if (previous !== null) {
    try {
      const raw: unknown = JSON.parse(previous);
      if (isRecord(raw) && Array.isArray(raw.items))
        return raw.items.map(sanitize).filter((m): m is CampanhaMeta => m !== null);
    } catch {
      /* índice inválido: mantemos conteúdo para recuperação manual */
    }
    throw new Error('Biblioteca de campanhas inválida. Exporte um backup antes de continuar.');
  }
  let existing: unknown;
  try {
    existing = JSON.parse(localStorage.getItem(LEGACY) || 'null');
  } catch {
    existing = null;
  }
  if (isRecord(existing) && Array.isArray(existing.unidades) && Array.isArray(existing.registros)) {
    const initial: CampanhaMeta = {
      id: 'principal',
      titulo: String(existing.titulo || 'Minha mesa original').slice(0, 80),
      descricao: 'Campanha recuperada automaticamente da mesa anterior.',
      tema: 'espiritual',
      criadaEm: now(),
      atualizadaEm: now(),
      arquivada: false,
      fichaIds: [],
      sistema: 'Hexatombe: Avatar',
    };
    persist([initial]);
    return [initial];
  }
  return [];
}
export function obterCampanha(id: string): CampanhaMeta | undefined {
  return listarCampanhas().find((x) => x.id === id);
}
export function chaveEstadoCampanha(id: string): string {
  return id === 'principal' ? LEGACY : `hexatombe-mesa-v2:${id}`;
}
export function chaveArquivoCampanha(id: string, chave: string): string {
  return id === 'principal' ? chave : `campanha:${id}:${chave}`;
}
export function urlMesaCampanha(id: string): string {
  return `/mesa/?campanha=${encodeURIComponent(id)}`;
}
export function urlMesa3DCampanha(id: string): string {
  return `/mesa3d/?campanha=${encodeURIComponent(id)}`;
}
export function urlMesaPreferidaCampanha(campanha: Pick<CampanhaMeta, 'id' | 'modoMesa'>): string {
  return campanha.modoMesa === '3d' ? urlMesa3DCampanha(campanha.id) : urlMesaCampanha(campanha.id);
}
export function resolverCampanhaId(id: string | null): string {
  let all: CampanhaMeta[] = [];
  try {
    all = listarCampanhas();
  } catch {
    return 'principal';
  }
  if (id && all.some((m) => m.id === id)) return id;
  return all.find((m) => !m.arquivada)?.id || all[0]?.id || 'principal';
}
export function criarCampanha(value: CampanhaEntrada): CampanhaMeta {
  const items = listarCampanhas();
  const stamp = now();
  const registro: CampanhaMeta = {
    id: newId(),
    titulo: value.titulo.trim().slice(0, 80) || 'Nova campanha',
    descricao: value.descricao.trim().slice(0, 700),
    tema: value.tema,
    capa: value.capa,
    colecaoId: value.colecaoId,
    sistema: value.sistema?.trim().slice(0, 80) || undefined,
    sistemaId: value.sistemaId ?? 'impeto',
    escalaImpeto: value.escalaImpeto === 'piloto-a01' ? 'piloto-a01' : 'livro-m042',
    cenario: value.cenario?.trim().slice(0, 100) || undefined,
    modoMesa: value.modoMesa === '3d' ? '3d' : '2d',
    criadaEm: stamp,
    atualizadaEm: stamp,
    arquivada: false,
    fichaIds: [...new Set(value.fichaIds)].slice(0, 100),
  };
  persist([registro, ...items]);
  return registro;
}
export function atualizarCampanha(
  id: string,
  value: Partial<CampanhaEntrada & { arquivada: boolean }>,
): CampanhaMeta {
  const items = listarCampanhas();
  let found: CampanhaMeta | undefined;
  const updated = items.map((m) => {
    if (m.id !== id) return m;
    found = {
      ...m,
      titulo:
        typeof value.titulo === 'string' ? value.titulo.trim().slice(0, 80) || m.titulo : m.titulo,
      descricao:
        typeof value.descricao === 'string' ? value.descricao.trim().slice(0, 700) : m.descricao,
      tema: value.tema ?? m.tema,
      sistema: typeof value.sistema === 'string' ? value.sistema.trim().slice(0, 80) : m.sistema,
      sistemaId: typeof value.sistemaId === 'string' ? value.sistemaId : m.sistemaId,
      escalaImpeto:
        value.escalaImpeto === 'piloto-a01' || value.escalaImpeto === 'livro-m042'
          ? value.escalaImpeto
          : m.escalaImpeto,
      cenario: typeof value.cenario === 'string' ? value.cenario.trim().slice(0, 100) : m.cenario,
      modoMesa: value.modoMesa === '3d' ? '3d' : value.modoMesa === '2d' ? '2d' : m.modoMesa,
      capa: 'capa' in value ? value.capa : m.capa,
      colecaoId: 'colecaoId' in value ? value.colecaoId : m.colecaoId,
      fichaIds: Array.isArray(value.fichaIds)
        ? [...new Set(value.fichaIds)].slice(0, 100)
        : m.fichaIds,
      arquivada: typeof value.arquivada === 'boolean' ? value.arquivada : m.arquivada,
      atualizadaEm: now(),
    };
    return found;
  });
  if (!found) throw Error('Campanha não encontrada.');
  persist(updated);
  return found;
}
export function registrarAcessoCampanha(id: string): void {
  const items = listarCampanhas();
  if (!items.some((m) => m.id === id)) return;
  persist(items.map((m) => (m.id === id ? { ...m, acessadaEm: now() } : m)));
}
export function removerCampanha(id: string): void {
  const items = listarCampanhas();
  if (!items.some((m) => m.id === id)) throw Error('Campanha não encontrada.');
  // Primeiro remove do índice; em seguida, a aplicação apaga o estado e os anexos.
  persist(items.filter((m) => m.id !== id));
  localStorage.removeItem(chaveEstadoCampanha(id));
  if (id === 'principal') localStorage.removeItem('hexatombe-mesa-janelas-v2');
  else localStorage.removeItem(`hexatombe-mesa-janelas-v2:${id}`);
  localStorage.removeItem(
    id === 'principal' ? 'hexatombe-mesa-musicas-v031' : `hexatombe-mesa-musicas-v031:${id}`,
  );
  localStorage.removeItem(`rpg-painel-mestre-preparacao-v1:${id}`);
  localStorage.removeItem(`rpg-painel-mestre-caderno-v2:${id}`);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const chave = localStorage.key(i);
    if (chave?.startsWith(`portal-mestre-cenario3d-v1:${id}:`)) localStorage.removeItem(chave);
  }
}
