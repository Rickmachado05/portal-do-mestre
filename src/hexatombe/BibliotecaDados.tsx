import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activeForDie,
  BUILTIN_DICE_THEMES,
  DICE_SYNC_EVENT,
  DICE_SYNC_KEY,
  DICE_TYPE_LIST,
  listSavedDice,
  removeSavedDice,
  saveDiceArt,
  setActiveDice,
  type DiceArtPackage,
  type DiceSides,
  type SavedDiceArt,
} from './diceLibrary';
import {
  activateDiceCollection,
  exportDiceCollection,
  listDiceCollections,
  removeDiceCollection,
  saveDiceCollection,
  type SavedDiceCollection,
} from './diceCollections';
import CaixaTestesDados from './CaixaTestesDados';
import './BibliotecaDados.css';

export interface BibliotecaDadosProps {
  atelieUrl?: string;
  onSelecionar?: (type: DiceSides, art: DiceArtPackage | null) => void;
  /** Deixa o laboratório suspenso quando a janela estiver recolhida ou fechada. */
  aberto?: boolean;
}

type AbaBiblioteca = 'conjuntos' | 'individuais' | 'laboratorio';
type SortDice = 'recentes' | 'nome';
type DeleteChoice =
  { kind: 'collection'; item: SavedDiceCollection } | { kind: 'dice'; item: SavedDiceArt };
function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Data indisponível'
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        parsed,
      );
}
const COLLECTIONS_PER_PAGE = 6;
const DICE_PER_PAGE = 9;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
function simplify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
function Pagination({
  page,
  count,
  size,
  onChange,
}: {
  page: number;
  count: number;
  size: number;
  onChange: (page: number) => void;
}) {
  const total = Math.max(1, Math.ceil(count / size));
  if (total === 1) return null;
  return (
    <nav className="hx-dice-pagination" aria-label="Páginas da biblioteca">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Página anterior"
      >
        ‹ Anterior
      </button>
      <span>
        Página <strong>{Math.min(page, total)}</strong> de <strong>{total}</strong>
      </span>
      <button
        type="button"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        aria-label="Próxima página"
      >
        Próxima ›
      </button>
    </nav>
  );
}
export function BibliotecaDados({
  atelieUrl = '/atelie-de-dados.html',
  onSelecionar,
  aberto = true,
}: BibliotecaDadosProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const [packs, setPacks] = useState<SavedDiceArt[]>([]);
  const [collections, setCollections] = useState<SavedDiceCollection[]>([]);
  const [tab, setTab] = useState<AbaBiblioteca>('conjuntos');
  const [typeFilter, setTypeFilter] = useState<DiceSides | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortDice>('recentes');
  const [deleteChoice, setDeleteChoice] = useState<DeleteChoice | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [page, setPage] = useState(1);
  const [showMembers, setShowMembers] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [dice, sets] = await Promise.all([listSavedDice(), listDiceCollections()]);
      setPacks(dice);
      setCollections(sets);
    } catch (error) {
      setStatus((error as Error).message || 'Falha ao carregar os dados.');
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener(DICE_SYNC_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === DICE_SYNC_KEY) void refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DICE_SYNC_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);
  useEffect(() => {
    setPage(1);
  }, [tab, search, typeFilter, showMembers, sort]);
  useEffect(() => {
    if (!deleteChoice) return;
    deleteInputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setDeleteChoice(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteChoice, busy]);
  function requestDelete(choice: DeleteChoice) {
    setDeleteChoice(choice);
    setDeleteText('');
  }
  async function confirmDelete() {
    if (!deleteChoice || deleteText.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR') return;
    setBusy(true);
    try {
      if (deleteChoice.kind === 'collection') {
        await removeDiceCollection(deleteChoice.item.id);
        setStatus(`Conjunto “${deleteChoice.item.name}” excluído.`);
      } else {
        await removeSavedDice(deleteChoice.item.id);
        setStatus(`Dado “${deleteChoice.item.art.name}” excluído.`);
      }
      setDeleteChoice(null);
      setDeleteText('');
      await refresh();
    } catch (error) {
      setStatus('Não foi possível excluir: ' + (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 160 * 1024 * 1024) {
      setStatus('Arquivo acima de 160 MB.');
      return;
    }
    setBusy(true);
    try {
      const art = JSON.parse(await file.text());
      if (art?.format === 'hexatombe-dice-collection') {
        const item = await saveDiceCollection(art);
        setStatus(`✓ Conjunto “${item.name}” importado. Selecione “Usar conjunto” para ativá-lo.`);
        setTab('conjuntos');
      } else {
        const item = await saveDiceArt(art);
        setStatus(`✓ D${item.art.type} “${item.art.name}” importado.`);
        setTab('individuais');
      }
      await refresh();
    } catch (error) {
      setStatus('Erro ao importar: ' + (error as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  async function select(item: SavedDiceArt) {
    setActiveDice(item.art.type, { kind: 'custom', id: item.id });
    setStatus(
      `✓ D${item.art.type} “${item.art.name}” selecionado. Teste na Caixa de testes ou na próxima rolagem da mesa.`,
    );
    onSelecionar?.(item.art.type, item.art);
    await refresh();
  }
  function remove(item: SavedDiceArt) {
    requestDelete({ kind: 'dice', item });
  }
  function selectCollection(item: SavedDiceCollection) {
    activateDiceCollection(item);
    setStatus(
      `✓ Conjunto “${item.name}” ativado. Seus dados foram selecionados para as próximas rolagens.`,
    );
    void refresh();
  }
  function deleteCollection(item: SavedDiceCollection) {
    requestDelete({ kind: 'collection', item });
  }
  async function downloadCollection(item: SavedDiceCollection) {
    try {
      const data = await exportDiceCollection(item.id);
      download(
        `${item.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 50)}-conjunto.json`,
        JSON.stringify(data),
      );
      setStatus(`Backup completo de “${item.name}” exportado.`);
    } catch (error) {
      setStatus('Erro ao exportar: ' + (error as Error).message);
    }
  }
  function selectBuiltin(id: (typeof BUILTIN_DICE_THEMES)[number]) {
    if (typeFilter === 'todos') {
      setStatus('Selecione primeiro um D4, D6, D8, D10, D12, D20 ou D100.');
      return;
    }
    setActiveDice(typeFilter, { kind: 'preset', id });
    setStatus(`✓ Tema ${id} selecionado para D${typeFilter}.`);
    onSelecionar?.(typeFilter, null);
    void refresh();
  }
  const needle = simplify(search.trim());
  const matches = (...values: string[]) => values.some((value) => simplify(value).includes(needle));
  const compareItems = (
    a: { name: string; updatedAt: string },
    b: { name: string; updatedAt: string },
  ) =>
    sort === 'nome'
      ? a.name.localeCompare(b.name, 'pt-BR')
      : b.updatedAt.localeCompare(a.updatedAt);
  const filteredCollections = collections
    .filter((item) => matches(item.name, ...Object.keys(item.members).map((s) => `D${s}`)))
    .sort(compareItems);
  // Evita mostrar novamente os sete dados de cada conjunto; quem quiser edita os membros pode revelar.
  const filteredDice = packs
    .filter(
      (item) =>
        (showMembers || !item.collectionId) &&
        (typeFilter === 'todos' || item.art.type === typeFilter) &&
        matches(item.art.name, `D${item.art.type}`, item.art.material),
    )
    .sort((a, b) =>
      compareItems(
        { name: a.art.name, updatedAt: a.updatedAt },
        { name: b.art.name, updatedAt: b.updatedAt },
      ),
    );
  const collectionPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredCollections.length / COLLECTIONS_PER_PAGE)),
  );
  const dicePage = Math.min(page, Math.max(1, Math.ceil(filteredDice.length / DICE_PER_PAGE)));
  const visibleCollections = filteredCollections.slice(
    (collectionPage - 1) * COLLECTIONS_PER_PAGE,
    collectionPage * COLLECTIONS_PER_PAGE,
  );
  const visibleDice = filteredDice.slice((dicePage - 1) * DICE_PER_PAGE, dicePage * DICE_PER_PAGE);
  const individualCount = packs.filter((item) => !item.collectionId).length;
  // O Ateliê pode ser aberto pela mesa: preserva origem e campanha ao editar um conjunto ou dado.
  function linkParaEditar(campo: 'collection' | 'edit', identificador: string) {
    const destino = new URL(atelieUrl, window.location.origin);
    destino.searchParams.set(campo, identificador);
    return `${destino.pathname}${destino.search}`;
  }

  return (
    <section className="hx-dice-library" aria-label="Meus dados personalizados">
      <div className="hx-dice-quickbar">
        <nav className="hx-dice-main-tabs" aria-label="Áreas da biblioteca">
          <button
            type="button"
            className={tab === 'conjuntos' ? 'active' : ''}
            aria-pressed={tab === 'conjuntos'}
            onClick={() => setTab('conjuntos')}
          >
            ◈ Conjuntos <small>{collections.length}</small>
          </button>
          <button
            type="button"
            className={tab === 'individuais' ? 'active' : ''}
            aria-pressed={tab === 'individuais'}
            onClick={() => setTab('individuais')}
          >
            ⚄ Dados <small>{individualCount}</small>
          </button>
          <button
            type="button"
            className={tab === 'laboratorio' ? 'active' : ''}
            aria-pressed={tab === 'laboratorio'}
            onClick={() => setTab('laboratorio')}
          >
            ▣ Caixa de testes
          </button>
        </nav>
        <div className="hx-dice-heading-actions">
          <a className="hx-dice-btn hx-dice-primary" href={atelieUrl}>
            ✧ Abrir Ateliê
          </a>
          <button
            type="button"
            className="hx-dice-btn"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            ↑ Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".json,application/json"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {tab !== 'laboratorio' && (
        <div className="hx-dice-searchbar">
          <label className="hx-dice-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === 'conjuntos' ? 'Pesquisar conjuntos…' : 'Pesquisar dados, materiais…'
              }
              aria-label="Pesquisar na biblioteca"
            />
          </label>
          <div className="hx-dice-sort-tools">
            <label htmlFor="hx-sort-dice">Ordenar</label>
            <select
              id="hx-sort-dice"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortDice)}
            >
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome (A–Z)</option>
            </select>
            <span className="hx-dice-result-count">
              {tab === 'conjuntos'
                ? `${filteredCollections.length} conjunto(s)`
                : `${filteredDice.length} dado(s)`}
            </span>
          </div>
        </div>
      )}
      {status && (
        <p className="hx-dice-status" role="status">
          {status}
          <button type="button" aria-label="Limpar aviso" onClick={() => setStatus('')}>
            ×
          </button>
        </p>
      )}

      {tab === 'conjuntos' && (
        <div className="hx-dice-tab-content">
          <div className="hx-dice-tab-title">
            <div>
              <h3>Conjuntos completos</h3>
              <p>
                Ative todos os tipos juntos. Cada conjunto ocupa uma única linha, mesmo com sete
                dados.
              </p>
            </div>
          </div>
          {filteredCollections.length === 0 ? (
            <div className="hx-dice-empty">
              {needle
                ? 'Nenhum conjunto corresponde à pesquisa.'
                : 'Você ainda não tem conjuntos. Crie um no Ateliê e escolha “Salvar conjunto na biblioteca”.'}
            </div>
          ) : (
            <div className="hx-dice-collections-grid">
              {visibleCollections.map((item) => {
                const n = Object.keys(item.members).length;
                const active =
                  n > 0 &&
                  Object.entries(item.members).every(([side, id]) => {
                    const a = activeForDie(Number(side) as DiceSides);
                    return a.kind === 'custom' && a.id === id;
                  });
                return (
                  <article
                    key={item.id}
                    className={`hx-dice-collection ${active ? 'selected' : ''}`}
                  >
                    <span className="hx-dice-collection-icon" aria-hidden="true">
                      ◈
                    </span>
                    <div className="hx-dice-collection-body">
                      <div className="hx-dice-collection-line">
                        <strong title={item.name}>{item.name}</strong>
                        {active && <span className="hx-dice-active-tag">✓ Ativo</span>}
                      </div>
                      <small>
                        {n} {n === 1 ? 'dado' : 'dados'} · Atualizado em{' '}
                        {formatDate(item.updatedAt)}
                      </small>
                      <div className="hx-dice-mini-set" aria-label="Dados contidos no conjunto">
                        {Object.entries(item.members)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([side, id]) => {
                            const member = packs.find((p) => p.id === id)?.art;
                            return (
                              <span
                                key={side}
                                title={`D${side} · ${member?.name ?? 'Dado'}`}
                                style={{
                                  background: member?.baseColor || '#344352',
                                  borderColor: member?.border?.color || '#8595a0',
                                }}
                              >
                                D{side}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                    <div className="hx-dice-item-actions hx-dice-collection-actions">
                      <button
                        type="button"
                        className="hx-dice-action-primary"
                        onClick={() => selectCollection(item)}
                        disabled={active}
                      >
                        {active ? 'Selecionado' : 'Usar conjunto'}
                      </button>
                      <a href={linkParaEditar('collection', item.id)}>Editar</a>
                      <button type="button" onClick={() => void downloadCollection(item)}>
                        JSON
                      </button>
                      <button
                        type="button"
                        className="hx-dice-danger"
                        onClick={() => void deleteCollection(item)}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <Pagination
            count={filteredCollections.length}
            size={COLLECTIONS_PER_PAGE}
            page={collectionPage}
            onChange={setPage}
          />
        </div>
      )}

      {tab === 'individuais' && (
        <div className="hx-dice-tab-content">
          <div className="hx-dice-filter" role="group" aria-label="Filtrar por tipo de dado">
            {(['todos', ...DICE_TYPE_LIST] as Array<'todos' | DiceSides>).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTypeFilter(t)}
                aria-pressed={typeFilter === t}
              >
                {t === 'todos' ? 'Todos' : `D${t}`}
              </button>
            ))}
          </div>
          <details className="hx-dice-presets" open={false}>
            <summary>
              ✦ Temas padrão <span>Mármore · Obsidiana · Jade · Oceano · Brasa</span>
            </summary>
            <div className="hx-dice-builtins-heading">
              {typeFilter === 'todos'
                ? 'Escolha um tipo de dado acima para aplicar um tema.'
                : `Aplicar tema padrão ao D${typeFilter}`}
            </div>
            <div className="hx-dice-builtins-grid">
              {BUILTIN_DICE_THEMES.map((theme) => {
                const selected = typeFilter !== 'todos' && activeForDie(typeFilter);
                const isSelected = selected && selected.kind === 'preset' && selected.id === theme;
                const names: Record<string, string> = {
                  marmore: 'Mármore',
                  obsidiana: 'Obsidiana',
                  jade: 'Jade',
                  oceano: 'Oceano',
                  brasa: 'Brasa',
                };
                return (
                  <button
                    type="button"
                    key={theme}
                    className={`hx-dice-preset hx-preset-${theme}`}
                    disabled={typeFilter === 'todos'}
                    aria-pressed={!!isSelected}
                    onClick={() => selectBuiltin(theme)}
                  >
                    <span className="hx-dice-preset-symbol" aria-hidden="true">
                      20
                    </span>
                    <span>{names[theme]}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </details>
          <label className="hx-dice-members-toggle">
            <input
              type="checkbox"
              checked={showMembers}
              onChange={(e) => setShowMembers(e.target.checked)}
            />{' '}
            Mostrar também os dados que pertencem a conjuntos{' '}
            <small>({packs.length - individualCount})</small>
          </label>
          <div className="hx-dice-tab-title">
            <div>
              <h3>Dados individuais</h3>
              <p>Escolha um dado específico para substituir apenas aquele tipo na mesa.</p>
            </div>
          </div>
          {filteredDice.length === 0 ? (
            <div className="hx-dice-empty">
              {needle
                ? 'Nenhum dado corresponde à pesquisa.'
                : 'Nenhum dado individual nesse filtro. Importe um JSON ou marque a opção para mostrar dados de conjuntos.'}
            </div>
          ) : (
            <div className="hx-dice-grid">
              {visibleDice.map((item) => {
                const selected = activeForDie(item.art.type),
                  isSelected = selected.kind === 'custom' && selected.id === item.id;
                const image = item.art.artworkPNG?.['1'],
                  label = item.art.faceLabels?.[0] ?? '1';
                return (
                  <article key={item.id} className={`hx-dice-item ${isSelected ? 'selected' : ''}`}>
                    <div
                      className="hx-dice-face"
                      style={{
                        backgroundColor: item.art.baseColor,
                        borderColor: item.art.border?.color || '#c6a779',
                      }}
                    >
                      {image && <img src={image} alt="Pintura da primeira face" loading="lazy" />}
                      {item.art.showNumbers !== false && (
                        <span style={{ color: item.art.numbering?.color || '#ffe5b5' }}>
                          {label}
                        </span>
                      )}
                    </div>
                    <div className="hx-dice-details">
                      <strong title={item.art.name}>{item.art.name}</strong>
                      <small>
                        D{item.art.type} · {item.art.material}
                        {item.collectionId ? ' · Conjunto' : ''}
                        {isSelected ? ' · ✓ Selecionado' : ''} · {formatDate(item.updatedAt)}
                      </small>
                      <div className="hx-dice-item-actions">
                        <button
                          type="button"
                          onClick={() => void select(item)}
                          disabled={isSelected}
                          className="hx-dice-action-primary"
                        >
                          {isSelected ? 'Ativo' : 'Usar'}
                        </button>
                        <a href={linkParaEditar('edit', item.id)}>Editar</a>
                        <button
                          type="button"
                          onClick={() =>
                            download(
                              `${item.art.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 40)}-d${item.art.type}.json`,
                              JSON.stringify(item.art),
                            )
                          }
                        >
                          JSON
                        </button>
                        <button
                          type="button"
                          className="hx-dice-danger"
                          onClick={() => void remove(item)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <Pagination
            count={filteredDice.length}
            size={DICE_PER_PAGE}
            page={dicePage}
            onChange={setPage}
          />
        </div>
      )}

      {/* Mantemos o canvas montado, mesmo ao trocar de aba, para não criar vários contextos WebGL. */}
      <CaixaTestesDados aberto={aberto && tab === 'laboratorio'} />
      {deleteChoice && (
        <div
          className="hx-dice-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setDeleteChoice(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="hx-dice-delete-title"
            aria-describedby="hx-dice-delete-description"
            className="hx-dice-modal"
          >
            <div className="hx-dice-modal-top">
              <span className="hx-dice-modal-icon" aria-hidden="true">
                !
              </span>
              <h3 id="hx-dice-delete-title">
                Excluir {deleteChoice.kind === 'collection' ? 'conjunto' : 'dado'}?
              </h3>
              <button
                type="button"
                aria-label="Fechar confirmação"
                disabled={busy}
                onClick={() => setDeleteChoice(null)}
              >
                ×
              </button>
            </div>
            <p id="hx-dice-delete-description">
              Você está prestes a excluir{' '}
              <strong>
                “
                {deleteChoice.kind === 'collection'
                  ? deleteChoice.item.name
                  : deleteChoice.item.art.name}
                ”
              </strong>{' '}
              da biblioteca local.{' '}
              {deleteChoice.kind === 'collection'
                ? 'Os dados integrantes desse conjunto também serão removidos.'
                : 'Os demais dados e conjuntos não serão afetados.'}{' '}
              Essa ação não pode ser desfeita.
            </p>
            <label htmlFor="hx-confirm-delete-text">
              Digite <strong>EXCLUIR</strong> para confirmar
            </label>
            <input
              id="hx-confirm-delete-text"
              ref={deleteInputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="EXCLUIR"
              disabled={busy}
            />
            <div className="hx-dice-modal-buttons">
              <button type="button" disabled={busy} onClick={() => setDeleteChoice(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="hx-dice-modal-danger"
                disabled={busy || deleteText.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR'}
                onClick={() => void confirmDelete()}
              >
                {busy ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </section>
        </div>
      )}
      {tab !== 'laboratorio' && (
        <p className="hx-dice-footnote">
          Dados e conjuntos continuam guardados no IndexedDB deste navegador. Exporte o JSON para
          fazer backup. A caixa de testes usa a mesma aparência e física, mas não afeta a campanha.
        </p>
      )}
    </section>
  );
}
export default BibliotecaDados;
