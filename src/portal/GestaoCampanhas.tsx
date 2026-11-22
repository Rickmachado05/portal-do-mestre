import { useEffect, useMemo, useRef, useState } from 'react';
import MultiplayerMestre from '../multiplayer/MultiplayerMestre';
import type { ChangeEvent, FormEvent } from 'react';
import type { FichaRegistro } from '../hexatombe/fichasLibrary';
import type { SavedDiceCollection } from '../hexatombe/diceCollections';
import {
  SISTEMAS_RPG,
  sistemaDaCampanha,
  rotuloSistemaCampanha,
  sistemaDaFicha,
} from '../hexatombe/sistemasRpg';
import { excluirArquivo, excluirArquivosPorPrefixo } from '../lib/storage';
import {
  atualizarCampanha,
  chaveEstadoCampanha,
  criarCampanha,
  listarCampanhas,
  removerCampanha,
  urlMesaPreferidaCampanha,
  type CampanhaEntrada,
  type CampanhaMeta,
  type ElementoCampanha,
} from '../hexatombe/campaignLibrary';

const ELEMENTOS: Record<ElementoCampanha, string> = {
  fogo: 'Brasas',
  agua: 'Marés',
  terra: 'Natureza',
  ar: 'Ventos',
  espiritual: 'Arcano',
};
const TEMAS = Object.entries(ELEMENTOS) as [ElementoCampanha, string][];
const DEFAULT: CampanhaEntrada = {
  titulo: '',
  descricao: '',
  tema: 'espiritual',
  sistemaId: 'impeto',
  escalaImpeto: 'livro-m042',
  cenario: '',
  modoMesa: '2d',
  fichaIds: [],
  capa: undefined,
  colecaoId: undefined,
};
const PAGESIZE = 6;
const dataHora = (value?: string) => {
  if (!value) return 'Ainda não iniciada';
  const d = new Date(value);
  return Number.isNaN(+d)
    ? 'Sem data'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};
function detalhesCampanha(m: CampanhaMeta) {
  try {
    const raw = localStorage.getItem(chaveEstadoCampanha(m.id));
    if (raw) {
      const state: unknown = JSON.parse(raw);
      if (state && typeof state === 'object' && 'cenas' in state && 'unidades' in state) {
        const s = state as { cenas?: unknown; unidades?: unknown };
        return {
          cenas: Array.isArray(s.cenas) ? s.cenas.length : 0,
          personagens: Array.isArray(s.unidades) ? s.unidades.length : 0,
        };
      }
    }
  } catch {
    /* resumo indisponível */
  }
  return { cenas: 0, personagens: 0 };
}
async function coverFromFile(file: File): Promise<string> {
  if (file.size > 6_000_000) throw Error('A imagem deve ter até 6 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('Escolha JPG, PNG ou WebP.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const escala = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(image.naturalWidth * escala));
    c.height = Math.max(1, Math.round(image.naturalHeight * escala));
    const ctx = c.getContext('2d');
    if (!ctx) throw Error('Seu navegador não suporta processamento de imagem.');
    ctx.fillStyle = '#182634';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(image, 0, 0, c.width, c.height);
    const output = c.toDataURL('image/jpeg', 0.72);
    if (output.length > 520_000) throw Error('Imagem muito grande. Escolha uma capa mais simples.');
    return output;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function limparAnexos(m: CampanhaMeta) {
  if (m.id !== 'principal') {
    await excluirArquivosPorPrefixo(`campanha:${m.id}:`);
    return;
  }
  // Compatibilidade: o legado usa chaves sem prefixo. Exclui SOMENTE anexos
  // relacionados às unidades e cenas conhecidas da própria mesa original.
  let idsUnidades: string[] = [];
  let idsCenas: string[] = [];
  try {
    const raw = localStorage.getItem(chaveEstadoCampanha(m.id));
    const s = JSON.parse(raw || 'null') as {
      unidades?: { id: string }[];
      cenas?: { id: string }[];
    } | null;
    idsUnidades = (s?.unidades || []).map((u) => u.id).filter(Boolean);
    idsCenas = (s?.cenas || []).map((c) => c.id).filter(Boolean);
  } catch {
    /* não apagar chaves desconhecidas */
  }
  let audioIds: string[] = [];
  try {
    const tracks: unknown = JSON.parse(localStorage.getItem('hexatombe-mesa-musicas-v031') || '[]');
    if (Array.isArray(tracks))
      audioIds = tracks
        .filter((t): t is { id: string; origem: string } =>
          Boolean(t && typeof t.id === 'string' && t.origem === 'arquivo'),
        )
        .map((t) => t.id);
  } catch {
    /* sem lista de áudio */
  }
  const keys = [
    ...idsUnidades.flatMap((id) => [`retrato:${id}`, `token:${id}`, `ficha:${id}`]),
    ...idsCenas.map((id) => (id === 'cena-original' ? 'mapa' : `mapa:${id}`)),
    ...audioIds.map((id) => `audio:${id}`),
  ];
  await Promise.all([...new Set(keys)].map((key) => excluirArquivo(key)));
}
export default function GestaoCampanhas({
  fichas,
  colecoes,
  onChange,
}: {
  fichas: FichaRegistro[];
  colecoes: SavedDiceCollection[];
  onChange: () => void;
}) {
  const [lista, setLista] = useState<CampanhaMeta[]>(() => {
    try {
      return listarCampanhas();
    } catch {
      return [];
    }
  });
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'ativas' | 'arquivadas'>('ativas');
  const [pagina, setPagina] = useState(1);
  const [edicao, setEdicao] = useState<CampanhaMeta | null | false>(false);
  const [form, setForm] = useState<CampanhaEntrada>(DEFAULT);
  const [salvando, setSalvando] = useState(false);
  const fichasDoSistema = fichas.filter(
    (f) => Boolean(form.sistemaId) && sistemaDaFicha(f.dados) === form.sistemaId,
  );
  const [campanhaParaExcluir, setCampanhaParaExcluir] = useState<CampanhaMeta | null>(null);
  const [textoExclusao, setTextoExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const confirmacaoInput = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  function atualizar() {
    try {
      setLista(listarCampanhas());
      onChange();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir campanhas.');
    }
  }
  useEffect(() => {
    const onStorage = () => atualizar();
    window.addEventListener('storage', onStorage);
    window.addEventListener('hexatombe-campaigns-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hexatombe-campaigns-changed', onStorage);
    };
  }, []);
  useEffect(() => {
    setPagina(1);
  }, [busca, filtro]);
  useEffect(() => {
    if (!campanhaParaExcluir) return;
    confirmacaoInput.current?.focus();
  }, [campanhaParaExcluir]);
  useEffect(() => {
    if (!campanhaParaExcluir) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!excluindo) fecharExclusao();
      }
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [campanhaParaExcluir, excluindo]);
  const filtradas = useMemo(
    () =>
      lista
        .filter(
          (m) =>
            m.arquivada === (filtro === 'arquivadas') &&
            `${m.titulo} ${m.descricao} ${m.cenario || ''} ${rotuloSistemaCampanha(m)} ${m.sistema || ''} ${ELEMENTOS[m.tema]}`
              .toLocaleLowerCase('pt-BR')
              .includes(busca.toLocaleLowerCase('pt-BR')),
        )
        .sort((a, b) =>
          (b.acessadaEm || b.atualizadaEm).localeCompare(a.acessadaEm || a.atualizadaEm),
        ),
    [lista, busca, filtro],
  );
  const pages = Math.max(1, Math.ceil(filtradas.length / PAGESIZE));
  const visiveis = filtradas.slice(
    (Math.min(pagina, pages) - 1) * PAGESIZE,
    Math.min(pagina, pages) * PAGESIZE,
  );
  function abrir(m?: CampanhaMeta) {
    setErro('');
    setEdicao(m ?? null);
    setForm(
      m
        ? {
            titulo: m.titulo,
            descricao: m.descricao,
            tema: m.tema,
            sistemaId: sistemaDaCampanha(m) || '',
            escalaImpeto: m.escalaImpeto ?? 'livro-m042',
            cenario: m.cenario || (m.sistema === 'Hexatombe: Avatar' ? m.sistema : ''),
            modoMesa: m.modoMesa || '2d',
            sistema: m.sistema,
            capa: m.capa,
            colecaoId: m.colecaoId,
            fichaIds: m.fichaIds,
          }
        : { ...DEFAULT, fichaIds: [] },
    );
  }
  async function lerCapa(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const capa = await coverFromFile(file);
      setForm((s) => ({ ...s, capa }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar a capa.');
    } finally {
      e.target.value = '';
    }
  }
  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return setErro('Escolha um nome para a campanha.');
    setSalvando(true);
    try {
      const dadosValidados = {
        ...form,
        fichaIds: form.fichaIds.filter((id) => fichasDoSistema.some((f) => f.id === id)),
      };
      if (edicao) atualizarCampanha(edicao.id, dadosValidados);
      else criarCampanha(dadosValidados);
      setEdicao(false);
      atualizar();
      setErro('');
    } catch (ex) {
      setErro(ex instanceof Error ? ex.message : 'Não foi possível salvar a campanha.');
    } finally {
      setSalvando(false);
    }
  }
  function arquivar(m: CampanhaMeta) {
    try {
      atualizarCampanha(m.id, { arquivada: !m.arquivada });
      atualizar();
    } catch (ex) {
      setErro(ex instanceof Error ? ex.message : 'Falha ao atualizar campanha.');
    }
  }
  function solicitarExclusao(m: CampanhaMeta) {
    setTextoExclusao('');
    setErroExclusao('');
    setCampanhaParaExcluir(m);
  }
  function fecharExclusao() {
    if (excluindo) return;
    setCampanhaParaExcluir(null);
    setTextoExclusao('');
    setErroExclusao('');
  }
  async function confirmarExclusao(e: FormEvent) {
    e.preventDefault();
    if (
      !campanhaParaExcluir ||
      excluindo ||
      textoExclusao.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR'
    )
      return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      // Apaga binários antes do índice: se falhar, não perde a referência à campanha.
      await limparAnexos(campanhaParaExcluir);
      removerCampanha(campanhaParaExcluir.id);
      setCampanhaParaExcluir(null);
      setTextoExclusao('');
      atualizar();
      setErro('Campanha excluída.');
    } catch (ex) {
      setErroExclusao(ex instanceof Error ? ex.message : 'Falha ao excluir a campanha.');
    } finally {
      setExcluindo(false);
    }
  }
  return (
    <section className="hp-campaign-library" aria-label="Biblioteca de campanhas">
      <div className="hp-campaign-controls">
        <label className="hp-search-label">
          Buscar campanha
          <input
            type="search"
            value={busca}
            placeholder="Nome, sistema ou descrição…"
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <div className="hp-campaign-filters" role="group" aria-label="Status das campanhas">
          <button
            type="button"
            aria-pressed={filtro === 'ativas'}
            onClick={() => setFiltro('ativas')}
          >
            Ativas ({lista.filter((m) => !m.arquivada).length})
          </button>
          <button
            type="button"
            aria-pressed={filtro === 'arquivadas'}
            onClick={() => setFiltro('arquivadas')}
          >
            Arquivadas ({lista.filter((m) => m.arquivada).length})
          </button>
        </div>
        <button className="hp-button hp-button-primary" type="button" onClick={() => abrir()}>
          ＋ Nova campanha
        </button>
      </div>
      {erro && (
        <div className="hp-feedback" role="status">
          {erro}
          <button type="button" aria-label="Fechar aviso" onClick={() => setErro('')}>
            ×
          </button>
        </div>
      )}
      {visiveis.length ? (
        <div className="hp-campaign-grid">
          {visiveis.map((m) => {
            const counts = detalhesCampanha(m);
            return (
              <article className={`hp-campaign-card hp-campaign-${m.tema}`} key={m.id}>
                <div
                  className="hp-campaign-cover"
                  style={
                    m.capa
                      ? {
                          backgroundImage: `linear-gradient(to top,#111923d9,transparent),url(${m.capa})`,
                        }
                      : undefined
                  }
                >
                  <span className="hp-campaign-element">{rotuloSistemaCampanha(m)}</span>
                  <span className="hp-campaign-icon" aria-hidden="true">
                    {m.tema === 'fogo'
                      ? '✦'
                      : m.tema === 'agua'
                        ? '◇'
                        : m.tema === 'terra'
                          ? '◆'
                          : m.tema === 'ar'
                            ? '✧'
                            : '✺'}
                  </span>
                </div>
                <div className="hp-campaign-content">
                  <h2>{m.titulo}</h2>
                  <span className="hp-modo-cartao">
                    {m.modoMesa === '3d' ? '▦ Campanha 3D' : '▧ Campanha 2D'}
                  </span>
                  {m.cenario && (
                    <small className="gm-campaign-scenario">Cenário: {m.cenario}</small>
                  )}
                  {sistemaDaCampanha(m) === 'impeto' && (
                    <small className="gm-campaign-scenario">
                      {m.escalaImpeto === 'piloto-a01'
                        ? 'Escala Avatar A01'
                        : 'Escala do livro M04.2'}
                    </small>
                  )}
                  <p>{m.descricao || 'Uma história esperando para acontecer.'}</p>
                  <div className="hp-campaign-stats">
                    <span>◈ {ELEMENTOS[m.tema]}</span>
                    <span>
                      ▧ {counts.cenas} {counts.cenas === 1 ? 'cena' : 'cenas'}
                    </span>
                    <span>♙ {counts.personagens} na mesa</span>
                    <span>
                      ✧ {m.fichaIds.length}{' '}
                      {m.fichaIds.length === 1 ? 'personagem vinculado' : 'personagens vinculados'}
                    </span>
                  </div>
                  <small className="hp-campaign-date">
                    {m.acessadaEm ? 'Acessada em' : 'Criada em'}{' '}
                    {dataHora(m.acessadaEm || m.criadaEm)}
                  </small>
                  <div className="hp-campaign-actions">
                    {!m.arquivada && (
                      <>
                        <a
                          className="hp-button hp-button-primary"
                          href={urlMesaPreferidaCampanha(m)}
                        >
                          Entrar na mesa
                        </a>
                        <MultiplayerMestre campanhaId={m.id} campanha={m.titulo} modo="cartao" />
                      </>
                    )}
                    <a
                      className="gm-prepare-link"
                      href={`/caderno/?campanha=${encodeURIComponent(m.id)}`}
                    >
                      Preparar sessão
                    </a>
                    <button type="button" onClick={() => abrir(m)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => arquivar(m)}>
                      {m.arquivada ? 'Restaurar' : 'Arquivar'}
                    </button>
                    <button
                      type="button"
                      className="hp-danger"
                      onClick={() => solicitarExclusao(m)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="hp-blank">
          <span>✥</span>
          <h3>
            {busca
              ? 'Nenhuma campanha encontrada'
              : filtro === 'arquivadas'
                ? 'Nenhuma campanha arquivada'
                : 'Sua primeira aventura começa aqui'}
          </h3>
          <p>
            {filtro === 'ativas' && !busca
              ? 'Crie sua campanha, escolha um nome e entre na mesa com um estado independente.'
              : 'Altere o filtro ou a busca para encontrar uma campanha.'}
          </p>
          {filtro === 'ativas' && !busca && (
            <button className="hp-button hp-button-primary" type="button" onClick={() => abrir()}>
              Criar campanha
            </button>
          )}
        </div>
      )}
      {filtradas.length > PAGESIZE && (
        <div className="hp-pagination">
          <button disabled={pagina <= 1} onClick={() => setPagina((n) => Math.max(1, n - 1))}>
            ← Anterior
          </button>
          <span>
            {Math.min(pagina, pages)} de {pages}
          </span>
          <button
            disabled={pagina >= pages}
            onClick={() => setPagina((n) => Math.min(pages, n + 1))}
          >
            Próxima →
          </button>
        </div>
      )}
      <p className="hp-caption">
        Cada mesa tem cenas, tokens, imagens, histórico e recursos próprios. As bibliotecas de
        personagens e dados continuam compartilhadas. Tudo permanece salvo neste navegador.
      </p>
      {campanhaParaExcluir && (
        <div
          className="hp-campaign-overlay hp-campaign-delete-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharExclusao();
          }}
        >
          <form
            className="hp-campaign-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hp-delete-title"
            aria-describedby="hp-delete-description"
            onSubmit={(e) => void confirmarExclusao(e)}
          >
            <div className="hp-campaign-delete-head">
              <span className="hp-campaign-delete-mark" aria-hidden="true">
                !
              </span>
              <button
                type="button"
                aria-label="Fechar confirmação"
                onClick={fecharExclusao}
                disabled={excluindo}
              >
                ×
              </button>
            </div>
            <span className="hp-eyebrow">CONFIRMAÇÃO DE EXCLUSÃO</span>
            <h2 id="hp-delete-title">Excluir campanha?</h2>
            <p className="hp-campaign-delete-name">{campanhaParaExcluir.titulo}</p>
            <p id="hp-delete-description">
              Isso apagará cenas, mapas, tokens e histórico desta campanha. Suas fichas e seus dados
              salvos na biblioteca geral serão preservados.
            </p>
            <label htmlFor="hp-delete-input">
              Digite <strong>EXCLUIR</strong> para confirmar
            </label>
            <input
              id="hp-delete-input"
              ref={confirmacaoInput}
              type="text"
              value={textoExclusao}
              onChange={(e) => setTextoExclusao(e.target.value)}
              disabled={excluindo}
              autoComplete="off"
              spellCheck={false}
              placeholder="EXCLUIR"
            />
            {erroExclusao && (
              <p className="hp-campaign-delete-error" role="alert">
                {erroExclusao}
              </p>
            )}
            <div className="hp-campaign-delete-actions">
              <button
                type="button"
                className="hp-button hp-button-outline"
                onClick={fecharExclusao}
                disabled={excluindo}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="hp-campaign-delete-submit"
                disabled={
                  excluindo || textoExclusao.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR'
                }
              >
                {excluindo ? 'Excluindo…' : 'Excluir campanha'}
              </button>
            </div>
          </form>
        </div>
      )}
      {edicao !== false && (
        <div
          className="hp-campaign-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEdicao(false);
          }}
        >
          <form
            className="hp-campaign-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hp-campaign-modal-title"
            onSubmit={salvar}
          >
            <div className="hp-campaign-modal-head">
              <span className="hp-eyebrow">REGISTRO DA AVENTURA</span>
              <button type="button" onClick={() => setEdicao(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            <h2 id="hp-campaign-modal-title">{edicao ? 'Editar campanha' : 'Nova campanha'}</h2>
            <label>
              Nome da campanha
              <input
                required
                maxLength={80}
                value={form.titulo}
                placeholder="Ex.: O Legado das Quatro Nações"
                onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
              />
            </label>
            <div className="hp-campaign-modal-row">
              <label>
                Sistema de RPG
                <select
                  value={form.sistemaId ?? ''}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      sistemaId: e.target.value,
                      fichaIds: s.fichaIds.filter((id) =>
                        fichas.some(
                          (f) => f.id === id && sistemaDaFicha(f.dados) === e.target.value,
                        ),
                      ),
                    }))
                  }
                >
                  <option value="">Não definido</option>
                  {SISTEMAS_RPG.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cenário da campanha <span className="gm-optional">(opcional)</span>
                <input
                  maxLength={100}
                  value={form.cenario ?? ''}
                  placeholder="Ex.: Avatar, fantasia, cenário autoral..."
                  onChange={(e) => setForm((s) => ({ ...s, cenario: e.target.value }))}
                />
              </label>
            </div>
            {form.sistemaId === 'impeto' && (
              <label>
                Configuração Ímpeto para a campanha
                <select
                  value={form.escalaImpeto ?? 'livro-m042'}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      escalaImpeto: e.target.value as 'livro-m042' | 'piloto-a01',
                    }))
                  }
                >
                  <option value="livro-m042">
                    Ímpeto RPG 1.0 · livro M04.2 (40 HP / 30 EN · 80 PC / 25 PX)
                  </option>
                  <option value="piloto-a01">
                    Hexatombe: Avatar A01 · experientes (130 HP / 120 EN · 100 PC / 35 PX)
                  </option>
                </select>
                <small>
                  A escolha identifica a escala de referência. Não converte fichas, não substitui
                  valores investidos e não altera a mesa automaticamente.
                </small>
              </label>
            )}
            {form.sistemaId === 'impeto' &&
              form.escalaImpeto === 'livro-m042' &&
              form.fichaIds.some((id) => fichas.some((f) => f.id === id && f.dados.impeto)) && (
                <p className="gm-campaign-system-hint">
                  Atenção: esta campanha usa a referência do livro, mas contém fichas Avatar A01. A
                  compatibilidade de sistema permite o vínculo; o mestre deve revisar a escala antes
                  de jogar.
                </p>
              )}
            {edicao && edicao.sistema && !sistemaDaCampanha(edicao) && (
              <p className="gm-campaign-system-hint">
                Sistema anterior registrado como <strong>{edicao.sistema}</strong>. Ele permanece
                salvo, mas ainda não foi cadastrado no catálogo de sistemas.
              </p>
            )}
            <p className="gm-campaign-system-hint">
              O sistema define quais fichas podem participar. Por enquanto, Ímpeto RPG é o único
              sistema cadastrado. Futuramente será possível adicionar outros sistemas.
            </p>
            <fieldset className="hp-modo-mesa">
              <legend>Formato principal da campanha</legend>
              <p>
                Escolha como prefere mestrar. As duas mesas são independentes: uma campanha 3D não
                precisa de mapas 2D e vice-versa.
              </p>
              <div
                className="hp-modo-opcoes"
                role="radiogroup"
                aria-label="Formato principal da campanha"
              >
                <label className={`hp-modo-opcao ${form.modoMesa !== '3d' ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="modoMesa"
                    value="2d"
                    checked={form.modoMesa !== '3d'}
                    onChange={() => setForm((s) => ({ ...s, modoMesa: '2d' }))}
                  />
                  <span className="hp-modo-icone">▧</span>
                  <strong>Mesa 2D</strong>
                  <small>Mapas tradicionais, tokens e ferramentas clássicas.</small>
                </label>
                <label className={`hp-modo-opcao ${form.modoMesa === '3d' ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="modoMesa"
                    value="3d"
                    checked={form.modoMesa === '3d'}
                    onChange={() => setForm((s) => ({ ...s, modoMesa: '3d' }))}
                  />
                  <span className="hp-modo-icone">▦</span>
                  <strong>Mesa 3D</strong>
                  <small>Chão construível, cenários e exploração em terceira pessoa.</small>
                </label>
              </div>
              <small>
                “Entrar na mesa” abre a modalidade escolhida. Você poderá trocar essa preferência
                depois, sem excluir suas cenas, fichas ou construções.
              </small>
            </fieldset>
            <label>
              Sinopse ou descrição
              <textarea
                rows={3}
                maxLength={700}
                value={form.descricao}
                placeholder="Que história será contada nesta mesa?"
                onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))}
              />
            </label>
            <div className="hp-campaign-modal-row">
              <label>
                Estilo visual da campanha
                <select
                  value={form.tema}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, tema: e.target.value as ElementoCampanha }))
                  }
                >
                  {TEMAS.map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Conjunto de dados ao entrar na mesa
                <select
                  value={form.colecaoId ?? ''}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, colecaoId: e.target.value || undefined }))
                  }
                >
                  <option value="">Sem preferência</option>
                  {colecoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="hp-campaign-photo">
              <strong>Capa da campanha</strong>
              <div className="hp-campaign-photo-actions">
                <input
                  ref={upload}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void lerCapa(e)}
                />
                <button
                  className="hp-button hp-button-outline"
                  type="button"
                  onClick={() => upload.current?.click()}
                >
                  Escolher imagem
                </button>
                {form.capa && (
                  <button type="button" onClick={() => setForm((s) => ({ ...s, capa: undefined }))}>
                    Remover capa
                  </button>
                )}
              </div>
              {form.capa && <img src={form.capa} alt="Prévia da capa" />}
            </div>
            <fieldset className="hp-campaign-characters">
              <legend>Personagens vinculados ({form.fichaIds.length})</legend>
              <p>
                Aqui aparecem somente personagens compatíveis com o sistema escolhido. A biblioteca
                geral permanece compartilhada entre campanhas.
              </p>
              {fichasDoSistema.length ? (
                <div className="hp-campaign-checkboxes">
                  {fichasDoSistema.map((f) => (
                    <label key={f.id}>
                      <input
                        type="checkbox"
                        checked={form.fichaIds.includes(f.id)}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            fichaIds: e.target.checked
                              ? [...s.fichaIds, f.id]
                              : s.fichaIds.filter((id) => id !== f.id),
                          }))
                        }
                      />
                      <span>{f.nome}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p>
                  {form.sistemaId
                    ? 'Nenhum personagem compatível salvo.'
                    : 'Selecione um sistema para vincular personagens.'}{' '}
                  <a href="/personagens/">Abrir Meus Personagens</a>
                </p>
              )}
            </fieldset>
            <div className="hp-campaign-modal-actions">
              <button
                type="button"
                className="hp-button hp-button-outline"
                onClick={() => setEdicao(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="hp-button hp-button-primary" disabled={salvando}>
                {salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Criar campanha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
