import { useEffect, useRef, useState } from 'react';
import type { CampanhaMeta } from '../hexatombe/campaignLibrary';
import {
  type Caderno,
  type SessaoCaderno,
  type CenaCaderno,
  type NpcCaderno,
  lerCaderno,
  gravarCaderno,
  novaSessao,
  novoIdCaderno,
  validarCaderno,
  exportarCaderno,
} from './cadernoMestreData';
import './CadernoMestre.css';

type Aba = 'roteiro' | 'cenas' | 'npcs' | 'tarefas';
const abas: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'roteiro', rotulo: 'Roteiro', icone: '✎' },
  { id: 'cenas', rotulo: 'Cenas', icone: '▦' },
  { id: 'npcs', rotulo: 'NPCs e segredos', icone: '♙' },
  { id: 'tarefas', rotulo: 'Checklist', icone: '☑' },
];
const statusLabel: Record<SessaoCaderno['status'], string> = {
  preparando: 'Em preparação',
  pronta: 'Pronta para jogar',
  concluida: 'Concluída',
};
const dia = (valor: string) => {
  if (!valor) return 'Data não definida';
  const [y, m, d] = valor.split('-');
  return `${d}/${m}/${y}`;
};
const criarCena = (): CenaCaderno => ({
  id: novoIdCaderno(),
  titulo: '',
  local: '',
  detalhes: '',
  estado: 'planejada',
});
const criarNpc = (): NpcCaderno => ({ id: novoIdCaderno(), nome: '', papel: '', segredo: '' });
const arquivoAceito = '.json,application/json';

export default function PreparacaoSessao({
  campanhas,
  pagina = false,
}: {
  campanhas: CampanhaMeta[];
  pagina?: boolean;
}) {
  const ativas = campanhas.filter((c) => !c.arquivada);
  const paramsCaderno = new URLSearchParams(location.search);
  const idUrl = paramsCaderno.get('campanha') ?? paramsCaderno.get('preparar');
  const [campanhaId, setCampanhaId] = useState(() =>
    idUrl && ativas.some((c) => c.id === idUrl) ? idUrl : (ativas[0]?.id ?? ''),
  );
  const [caderno, setCaderno] = useState<Caderno>(() =>
    lerCaderno(idUrl && ativas.some((c) => c.id === idUrl) ? idUrl : (ativas[0]?.id ?? '')),
  );
  const [aberto, setAberto] = useState(() => Boolean(idUrl && ativas.some((c) => c.id === idUrl)));
  const [aba, setAba] = useState<Aba>('roteiro');
  const [rascunhoTarefa, setRascunhoTarefa] = useState('');
  const [statusSalvo, setStatusSalvo] = useState('Alterações salvas automaticamente');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [importacao, setImportacao] = useState<Caderno | null>(null);
  const [erroImportacao, setErroImportacao] = useState('');
  const [textoImportacao, setTextoImportacao] = useState('');
  const inputArquivo = useRef<HTMLInputElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const retornoFoco = useRef<HTMLElement | null>(null);
  const campanha = ativas.find((c) => c.id === campanhaId);
  const atual = caderno.sessoes.find((s) => s.id === caderno.sessaoAtivaId) ?? caderno.sessoes[0];
  const concluidas = atual?.tarefas.filter((t) => t.concluida).length ?? 0;
  const total = atual?.tarefas.length ?? 0;
  const progresso = total ? Math.round((concluidas / total) * 100) : 0;

  useEffect(() => {
    if (campanhaId && !ativas.some((c) => c.id === campanhaId)) {
      const next = ativas[0]?.id ?? '';
      setCampanhaId(next);
      setCaderno(lerCaderno(next));
      if (!pagina) setAberto(false);
    } else if (!campanhaId && ativas.length) {
      setCampanhaId(ativas[0].id);
      setCaderno(lerCaderno(ativas[0].id));
    }
  }, [campanhaId, campanhas]);
  useEffect(() => {
    if (!aberto || pagina) return;
    retornoFoco.current = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botaoFechar.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      retornoFoco.current?.focus?.();
    };
  }, [aberto, pagina]);
  useEffect(() => {
    if (!pagina && !aberto) return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmarExclusao) {
          setConfirmarExclusao(false);
          setTextoConfirmacao('');
        } else if (importacao) {
          setImportacao(null);
          setTextoImportacao('');
        } else if (!pagina) setAberto(false);
      }
      if (e.key === 'Tab' && (!pagina || confirmarExclusao || importacao)) {
        const activeDialog = document.querySelector<HTMLElement>(
          confirmarExclusao || importacao ? '.gm-notebook-confirm' : '.gm-notebook-window',
        );
        const elements = Array.from(
          activeDialog?.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])',
          ) ?? [],
        ).filter((el) => el.getClientRects().length > 0);
        if (!elements.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || !activeDialog?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || !activeDialog?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', teclas);
    return () => document.removeEventListener('keydown', teclas);
  }, [aberto, pagina, confirmarExclusao, importacao]);
  useEffect(() => {
    if (idUrl && !pagina)
      document.getElementById('preparacao')?.scrollIntoView({ block: 'nearest' });
  }, [idUrl, pagina]);
  useEffect(() => {
    if (pagina && campanhaId && ativas.some((c) => c.id === campanhaId))
      window.history.replaceState(
        window.history.state,
        '',
        `/caderno/?campanha=${encodeURIComponent(campanhaId)}`,
      );
  }, [pagina, campanhaId, campanhas]);
  useEffect(() => {
    if (conteudoRef.current) conteudoRef.current.scrollTop = 0;
  }, [aba, caderno.sessaoAtivaId]);

  function selecionarCampanha(id: string) {
    setCampanhaId(id);
    setCaderno(lerCaderno(id));
    setStatusSalvo('Caderno carregado');
    setRascunhoTarefa('');
    setAba('roteiro');
    setConfirmarExclusao(false);
    setImportacao(null);
  }
  function salvar(next: Caderno) {
    const ok = gravarCaderno(campanhaId, next);
    if (ok) {
      setCaderno(next);
      setStatusSalvo('Salvo neste navegador');
    } else setStatusSalvo('Falha ao salvar: confira o espaço do navegador');
    return ok;
  }
  function editar(patch: Partial<SessaoCaderno>) {
    if (!atual) return;
    salvar({
      ...caderno,
      sessoes: caderno.sessoes.map((s) =>
        s.id === atual.id ? { ...s, ...patch, atualizadaEm: new Date().toISOString() } : s,
      ),
    });
  }
  function escolherSessao(id: string) {
    if (!caderno.sessoes.some((s) => s.id === id)) return;
    salvar({ ...caderno, sessaoAtivaId: id });
    setAba('roteiro');
    setRascunhoTarefa('');
  }
  function adicionarSessao() {
    if (caderno.sessoes.length >= 60) return;
    const next = novaSessao(caderno.sessoes.length + 1);
    if (salvar({ ...caderno, sessaoAtivaId: next.id, sessoes: [...caderno.sessoes, next] })) {
      setAba('roteiro');
      setRascunhoTarefa('');
    }
  }
  function duplicarSessao() {
    if (!atual || caderno.sessoes.length >= 60) return;
    const agora = new Date().toISOString();
    const copiada: SessaoCaderno = {
      ...atual,
      id: novoIdCaderno(),
      titulo: `${atual.titulo || 'Sessão'} (cópia)`.slice(0, 90),
      status: 'preparando',
      cenas: atual.cenas.map((c) => ({ ...c, id: novoIdCaderno(), estado: 'planejada' })),
      npcs: atual.npcs.map((n) => ({ ...n, id: novoIdCaderno() })),
      tarefas: atual.tarefas.map((t) => ({ ...t, id: novoIdCaderno(), concluida: false })),
      criadaEm: agora,
      atualizadaEm: agora,
    };
    salvar({ ...caderno, sessaoAtivaId: copiada.id, sessoes: [...caderno.sessoes, copiada] });
    setAba('roteiro');
  }
  function excluirSessao() {
    if (
      textoConfirmacao.toUpperCase().trim() !== 'EXCLUIR' ||
      !atual ||
      caderno.sessoes.length <= 1
    )
      return;
    const sessoes = caderno.sessoes.filter((s) => s.id !== atual.id);
    if (salvar({ ...caderno, sessoes, sessaoAtivaId: sessoes[sessoes.length - 1].id })) {
      setConfirmarExclusao(false);
      setTextoConfirmacao('');
      setAba('roteiro');
    }
  }
  function adicionarTarefa() {
    const texto = rascunhoTarefa.trim().slice(0, 180);
    if (!texto || !atual || atual.tarefas.length >= 60) return;
    editar({ tarefas: [...atual.tarefas, { id: novoIdCaderno(), texto, concluida: false }] });
    setRascunhoTarefa('');
  }
  async function importarArquivo(file?: File) {
    if (!file) return;
    setErroImportacao('');
    if (file.size > 3_000_000) {
      setErroImportacao('O arquivo é grande demais (limite de 3 MB).');
      return;
    }
    try {
      const raw: unknown = JSON.parse(await file.text());
      const validado = validarCaderno(raw);
      if (!validado) {
        setErroImportacao(
          'Arquivo incompatível. Escolha um JSON exportado pelo Caderno do Mestre.',
        );
        return;
      }
      setImportacao(validado);
      setTextoImportacao('');
    } catch {
      setErroImportacao('Não foi possível ler este arquivo JSON.');
    }
  }
  function confirmarImportacao() {
    if (!importacao || textoImportacao.toUpperCase().trim() !== 'SUBSTITUIR') return;
    if (salvar(importacao)) {
      setImportacao(null);
      setTextoImportacao('');
      setAba('roteiro');
      setRascunhoTarefa('');
    }
  }

  return (
    <section
      className={pagina ? 'gm-notebook-page' : 'gm-prep gm-notebook-card'}
      aria-label="Caderno do Mestre"
      id="preparacao"
    >
      {!pagina && (
        <>
          <div className="gm-panel-heading">
            <div>
              <span className="hp-eyebrow">CADERNO DO MESTRE</span>
              <h2>Preparar a próxima sessão</h2>
            </div>
            <span className="gm-notebook-icon" aria-hidden="true">
              ✎
            </span>
          </div>
          {!ativas.length ? (
            <div className="gm-prep-empty">
              <p>Crie uma campanha para começar a organizar seu roteiro, cenas e anotações.</p>
              <a className="hp-button hp-button-outline" href="/mesas/">
                Ir para minhas mesas
              </a>
            </div>
          ) : (
            <div className="gm-notebook-preview">
              <label className="gm-field">
                Campanha
                <select value={campanhaId} onChange={(e) => selecionarCampanha(e.target.value)}>
                  {ativas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </label>
              <div className="gm-notebook-summary">
                <span className="gm-notebook-kicker">
                  SESSÃO SELECIONADA{' '}
                  <span>
                    · {caderno.sessoes.length}{' '}
                    {caderno.sessoes.length === 1 ? 'registro' : 'registros'}
                  </span>
                </span>
                <strong>{atual?.titulo || 'Sessão sem título'}</strong>
                <div className="gm-notebook-meta">
                  <span>{dia(atual?.data || '')}</span>
                  <span
                    className={`gm-notebook-status gm-notebook-status-${atual?.status || 'preparando'}`}
                  >
                    {statusLabel[atual?.status || 'preparando']}
                  </span>
                </div>
              </div>
              <div className="gm-notebook-progress">
                <div>
                  <span>Lista de preparação</span>
                  <strong>
                    {concluidas}/{total}
                  </strong>
                </div>
                <div className="gm-notebook-track">
                  <span style={{ width: `${progresso}%` }} />
                </div>
              </div>
              <div className="gm-notebook-counts">
                <span>▦ {atual?.cenas.length ?? 0} cenas</span>
                <span>♙ {atual?.npcs.length ?? 0} NPCs</span>
                <span>☑ {total} tarefas</span>
              </div>
              <a
                className="gm-notebook-open"
                href={`/caderno/?campanha=${encodeURIComponent(campanhaId)}`}
              >
                Abrir Caderno do Mestre <span aria-hidden="true">→</span>
              </a>
              <p className="gm-disclaimer">
                Anotações locais deste navegador. Exporte um backup antes de trocar de dispositivo.
              </p>
            </div>
          )}
        </>
      )}
      {pagina && ativas.length > 0 && (
        <div className="gm-notebook-page-toolbar">
          <label className="gm-notebook-campaign-picker">
            <span>Campanha</span>
            <select value={campanhaId} onChange={(e) => selecionarCampanha(e.target.value)}>
              {ativas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
          <span className="gm-notebook-toolbar-hint">
            Cada campanha tem seu próprio caderno · Salvamento automático
          </span>
        </div>
      )}
      {pagina && !ativas.length && (
        <div className="gm-notebook-page-empty">
          <strong>Seu caderno está pronto para começar.</strong>
          <p>Crie uma campanha para organizar o roteiro, as cenas e as anotações de cada sessão.</p>
          <a className="hp-button hp-button-primary" href="/mesas/">
            Criar campanha →
          </a>
        </div>
      )}
      {(pagina || aberto) && campanha && atual && (
        <div
          className={`gm-notebook-backdrop ${pagina ? 'is-page' : ''}`}
          onMouseDown={(e) => {
            if (!pagina && e.target === e.currentTarget && !confirmarExclusao && !importacao)
              setAberto(false);
          }}
        >
          <div
            className={`gm-notebook-window ${pagina ? 'is-page' : ''}`}
            role={pagina ? 'region' : 'dialog'}
            aria-modal={pagina ? undefined : true}
            aria-labelledby="gm-notebook-title"
          >
            <header className="gm-notebook-head">
              <div className="gm-notebook-head-title">
                <span className="hp-eyebrow">PORTAL DO MESTRE · PLANEJAMENTO</span>
                <h2 id="gm-notebook-title">Caderno do Mestre</h2>
                <small>
                  {campanha.titulo} · {caderno.sessoes.length}{' '}
                  {caderno.sessoes.length === 1 ? 'sessão' : 'sessões'}
                </small>
              </div>
              <div className="gm-notebook-head-actions">
                <span className="gm-notebook-save" role="status">
                  {statusSalvo}
                </span>
                {pagina ? (
                  <a className="gm-notebook-page-back" href="/mesas/">
                    Ver campanhas →
                  </a>
                ) : (
                  <button
                    type="button"
                    className="gm-notebook-close"
                    aria-label="Fechar caderno"
                    onClick={() => setAberto(false)}
                    ref={botaoFechar}
                  >
                    ×
                  </button>
                )}
              </div>
            </header>
            <div className="gm-notebook-layout">
              <aside className="gm-notebook-sidebar" aria-label="Sessões da campanha">
                <div className="gm-notebook-sidebar-heading">
                  <strong>SESSÕES</strong>
                  <button
                    type="button"
                    onClick={adicionarSessao}
                    disabled={caderno.sessoes.length >= 60}
                    title="Criar outra sessão"
                  >
                    ＋ Nova
                  </button>
                </div>
                <div className="gm-notebook-session-list">
                  {caderno.sessoes.map((s, i) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`gm-notebook-session ${s.id === atual.id ? 'is-active' : ''}`}
                      onClick={() => escolherSessao(s.id)}
                      aria-current={s.id === atual.id ? 'true' : undefined}
                    >
                      <span className="gm-notebook-session-no">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{s.titulo || 'Sem título'}</strong>
                        <small>{s.data ? dia(s.data) : statusLabel[s.status]}</small>
                      </span>
                      {s.status === 'concluida' && (
                        <span aria-label="Concluída" title="Concluída">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="gm-notebook-sidebar-actions">
                  <button type="button" onClick={() => exportarCaderno(campanha.titulo, caderno)}>
                    ↓ Exportar JSON
                  </button>
                  <button type="button" onClick={() => inputArquivo.current?.click()}>
                    ↑ Importar JSON
                  </button>
                  <input
                    type="file"
                    ref={inputArquivo}
                    accept={arquivoAceito}
                    hidden
                    onChange={(e) => {
                      void importarArquivo(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
                {erroImportacao && (
                  <p className="gm-notebook-error" role="alert">
                    {erroImportacao}
                  </p>
                )}
                <p className="gm-notebook-side-hint">
                  O caderno é exclusivo desta campanha. A equipe não recebe estas notas
                  automaticamente.
                </p>
              </aside>
              <div className="gm-notebook-main">
                <div className="gm-notebook-topline">
                  <div>
                    <span className="hp-eyebrow">PLANEJAMENTO DA SESSÃO</span>
                    <h3>{atual.titulo || 'Sem título'}</h3>
                  </div>
                  <div className="gm-notebook-session-tools">
                    <button
                      type="button"
                      onClick={duplicarSessao}
                      disabled={caderno.sessoes.length >= 60}
                      title="Duplicar esta sessão"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="is-danger-outline"
                      onClick={() => {
                        setConfirmarExclusao(true);
                        setTextoConfirmacao('');
                      }}
                      disabled={caderno.sessoes.length === 1}
                      title={
                        caderno.sessoes.length === 1
                          ? 'Mantenha ao menos uma sessão'
                          : 'Excluir esta sessão'
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                <div className="gm-notebook-settings">
                  <label className="gm-field">
                    Título da sessão
                    <input
                      maxLength={90}
                      value={atual.titulo}
                      placeholder="Ex.: O conselho se reúne"
                      onChange={(e) => editar({ titulo: e.target.value })}
                    />
                  </label>
                  <label className="gm-field">
                    Data prevista
                    <input
                      type="date"
                      value={atual.data}
                      onChange={(e) => editar({ data: e.target.value })}
                    />
                  </label>
                  <label className="gm-field">
                    Estado
                    <select
                      value={atual.status}
                      onChange={(e) =>
                        editar({ status: e.target.value as SessaoCaderno['status'] })
                      }
                    >
                      <option value="preparando">Em preparação</option>
                      <option value="pronta">Pronta para jogar</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </label>
                </div>
                <nav className="gm-notebook-tabs" aria-label="Seções do caderno">
                  {abas.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={aba === t.id ? 'is-active' : ''}
                      aria-current={aba === t.id ? 'page' : undefined}
                      onClick={() => setAba(t.id)}
                    >
                      <span aria-hidden="true">{t.icone}</span>
                      {t.rotulo}
                      {t.id === 'cenas' && atual.cenas.length > 0 ? (
                        <small>{atual.cenas.length}</small>
                      ) : t.id === 'tarefas' && total > 0 ? (
                        <small>
                          {concluidas}/{total}
                        </small>
                      ) : null}
                    </button>
                  ))}
                </nav>
                <div className="gm-notebook-content" ref={conteudoRef}>
                  {aba === 'roteiro' && (
                    <div className="gm-notebook-stack">
                      <div className="gm-notebook-intro">
                        <strong>O fio da história</strong>
                        <p>
                          Organize os acontecimentos e possibilidades. O roteiro orienta a sessão,
                          mas não limita as decisões dos jogadores.
                        </p>
                      </div>
                      <label className="gm-field">
                        O que aconteceu antes?
                        <textarea
                          rows={3}
                          maxLength={3500}
                          placeholder="Resumo, consequências e decisões da sessão anterior..."
                          value={atual.resumoAnterior}
                          onChange={(e) => editar({ resumoAnterior: e.target.value })}
                        />
                      </label>
                      <label className="gm-field">
                        Objetivos e acontecimentos importantes
                        <textarea
                          rows={4}
                          maxLength={3500}
                          placeholder="Questões a desenvolver, revelações e desafios possíveis..."
                          value={atual.objetivos}
                          onChange={(e) => editar({ objetivos: e.target.value })}
                        />
                      </label>
                      <label className="gm-field">
                        Gancho ou encerramento
                        <textarea
                          rows={3}
                          maxLength={2200}
                          placeholder="Um mistério, dilema ou consequência para a próxima sessão..."
                          value={atual.gancho}
                          onChange={(e) => editar({ gancho: e.target.value })}
                        />
                      </label>
                      <label className="gm-field">
                        Anotações livres do mestre
                        <textarea
                          rows={5}
                          maxLength={8000}
                          placeholder="Improvisos, caminhos alternativos, ideias e lembretes..."
                          value={atual.anotacoes}
                          onChange={(e) => editar({ anotacoes: e.target.value })}
                        />
                      </label>
                    </div>
                  )}
                  {aba === 'cenas' && (
                    <div className="gm-notebook-stack">
                      <div className="gm-notebook-intro">
                        <strong>Quadro de cenas</strong>
                        <p>
                          Planeje lugares e eventos importantes. Marque o que foi jogado, ignorado
                          ou ficou para depois.
                        </p>
                      </div>
                      {atual.cenas.length === 0 && (
                        <div className="gm-notebook-blank">
                          Nenhuma cena planejada. Adicione a primeira para começar o roteiro.
                        </div>
                      )}
                      {atual.cenas.map((c, i) => (
                        <article className="gm-notebook-entry" key={c.id}>
                          <div className="gm-notebook-entry-head">
                            <span>CENA {String(i + 1).padStart(2, '0')}</span>
                            <select
                              aria-label={`Estado da cena ${i + 1}`}
                              value={c.estado}
                              onChange={(e) =>
                                editar({
                                  cenas: atual.cenas.map((x) =>
                                    x.id === c.id
                                      ? { ...x, estado: e.target.value as CenaCaderno['estado'] }
                                      : x,
                                  ),
                                })
                              }
                            >
                              <option value="planejada">Planejada</option>
                              <option value="jogada">Jogada</option>
                              <option value="ignorada">Não utilizada</option>
                            </select>
                            <button
                              type="button"
                              className="is-danger-outline"
                              onClick={() =>
                                editar({ cenas: atual.cenas.filter((x) => x.id !== c.id) })
                              }
                              aria-label={`Remover cena ${i + 1}`}
                            >
                              ×
                            </button>
                          </div>
                          <div className="gm-notebook-two">
                            <label className="gm-field">
                              Título
                              <input
                                maxLength={90}
                                placeholder="Ex.: Emboscada no porto"
                                value={c.titulo}
                                onChange={(e) =>
                                  editar({
                                    cenas: atual.cenas.map((x) =>
                                      x.id === c.id ? { ...x, titulo: e.target.value } : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label className="gm-field">
                              Local / contexto
                              <input
                                maxLength={100}
                                placeholder="Onde acontece?"
                                value={c.local}
                                onChange={(e) =>
                                  editar({
                                    cenas: atual.cenas.map((x) =>
                                      x.id === c.id ? { ...x, local: e.target.value } : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                          </div>
                          <label className="gm-field">
                            O que pode acontecer
                            <textarea
                              rows={3}
                              maxLength={1700}
                              placeholder="Pistas, opções, obstáculos, resultados possíveis..."
                              value={c.detalhes}
                              onChange={(e) =>
                                editar({
                                  cenas: atual.cenas.map((x) =>
                                    x.id === c.id ? { ...x, detalhes: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                          </label>
                        </article>
                      ))}
                      <button
                        type="button"
                        className="gm-notebook-add"
                        disabled={atual.cenas.length >= 35}
                        onClick={() => editar({ cenas: [...atual.cenas, criarCena()] })}
                      >
                        ＋ Adicionar cena
                      </button>
                    </div>
                  )}
                  {aba === 'npcs' && (
                    <div className="gm-notebook-stack">
                      <div className="gm-notebook-intro">
                        <strong>NPCs, pistas e segredos</strong>
                        <p>
                          Registre personagens importantes, seus interesses e o que os jogadores
                          ainda não sabem.
                        </p>
                      </div>
                      {!atual.npcs.length && (
                        <div className="gm-notebook-blank">
                          Nenhum NPC anotado para esta sessão.
                        </div>
                      )}
                      {atual.npcs.map((n, i) => (
                        <article className="gm-notebook-entry" key={n.id}>
                          <div className="gm-notebook-entry-head">
                            <span>PERSONAGEM {String(i + 1).padStart(2, '0')}</span>
                            <button
                              type="button"
                              className="is-danger-outline"
                              onClick={() =>
                                editar({ npcs: atual.npcs.filter((x) => x.id !== n.id) })
                              }
                              aria-label={`Remover personagem ${i + 1}`}
                            >
                              ×
                            </button>
                          </div>
                          <div className="gm-notebook-two">
                            <label className="gm-field">
                              Nome
                              <input
                                value={n.nome}
                                maxLength={90}
                                placeholder="Nome ou apelido"
                                onChange={(e) =>
                                  editar({
                                    npcs: atual.npcs.map((x) =>
                                      x.id === n.id ? { ...x, nome: e.target.value } : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label className="gm-field">
                              Papel na história
                              <input
                                value={n.papel}
                                maxLength={110}
                                placeholder="Aliado, rival, informante..."
                                onChange={(e) =>
                                  editar({
                                    npcs: atual.npcs.map((x) =>
                                      x.id === n.id ? { ...x, papel: e.target.value } : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                          </div>
                          <label className="gm-field">
                            Intenções, pistas e segredos
                            <textarea
                              rows={3}
                              maxLength={1300}
                              placeholder="O que deseja? O que esconde? Como pode reagir?"
                              value={n.segredo}
                              onChange={(e) =>
                                editar({
                                  npcs: atual.npcs.map((x) =>
                                    x.id === n.id ? { ...x, segredo: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                          </label>
                        </article>
                      ))}
                      <button
                        type="button"
                        className="gm-notebook-add"
                        disabled={atual.npcs.length >= 35}
                        onClick={() => editar({ npcs: [...atual.npcs, criarNpc()] })}
                      >
                        ＋ Adicionar NPC
                      </button>
                    </div>
                  )}
                  {aba === 'tarefas' && (
                    <div className="gm-notebook-stack">
                      <div className="gm-notebook-intro">
                        <strong>Checklist da preparação</strong>
                        <p>
                          Mapas, imagens, músicas, encontros e tudo que você precisa deixar pronto
                          antes da sessão.
                        </p>
                      </div>
                      <div className="gm-notebook-task-summary">
                        <div>
                          <strong>
                            {concluidas} de {total}
                          </strong>{' '}
                          tarefas concluídas
                        </div>
                        <div className="gm-notebook-track">
                          <span style={{ width: `${progresso}%` }} />
                        </div>
                      </div>
                      <div className="gm-task-add">
                        <input
                          aria-label="Nova tarefa"
                          value={rascunhoTarefa}
                          maxLength={180}
                          placeholder="Ex.: Preparar mapa da taverna"
                          onChange={(e) => setRascunhoTarefa(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              adicionarTarefa();
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={!rascunhoTarefa.trim() || total >= 60}
                          onClick={adicionarTarefa}
                        >
                          Adicionar
                        </button>
                      </div>
                      {total === 0 && (
                        <div className="gm-notebook-blank">
                          Seu checklist está vazio. Adicione as primeiras tarefas.
                        </div>
                      )}
                      {atual.tarefas.map((t) => (
                        <div className="gm-task gm-notebook-task" key={t.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={t.concluida}
                              onChange={(e) =>
                                editar({
                                  tarefas: atual.tarefas.map((x) =>
                                    x.id === t.id ? { ...x, concluida: e.target.checked } : x,
                                  ),
                                })
                              }
                            />
                            <span className={t.concluida ? 'done' : ''}>{t.texto}</span>
                          </label>
                          <button
                            type="button"
                            aria-label={`Remover tarefa ${t.texto}`}
                            onClick={() =>
                              editar({ tarefas: atual.tarefas.filter((x) => x.id !== t.id) })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="gm-notebook-bottom">
                  <span>Dados guardados neste navegador · Sem sincronização online</span>
                  <a href={`/mesa/?campanha=${encodeURIComponent(campanha.id)}`}>
                    Entrar na mesa da campanha →
                  </a>
                </div>
              </div>
            </div>
            {(confirmarExclusao || importacao) && (
              <div className="gm-notebook-confirm-backdrop">
                <div
                  className="gm-notebook-confirm"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="gm-confirm-title"
                >
                  <span className="hp-eyebrow">CONFIRMAÇÃO</span>
                  <h3 id="gm-confirm-title">
                    {confirmarExclusao ? 'Excluir esta sessão?' : 'Importar caderno?'}
                  </h3>
                  <p>
                    {confirmarExclusao
                      ? `Você apagará o planejamento de “${atual.titulo || 'Sem título'}”. As outras sessões e a campanha continuarão intactas.`
                      : `O arquivo contém ${importacao?.sessoes.length} sessões e substituirá todo o caderno desta campanha. Exporte um backup antes de continuar.`}
                  </p>
                  <label className="gm-field">
                    Digite <strong>{confirmarExclusao ? 'EXCLUIR' : 'SUBSTITUIR'}</strong> para
                    confirmar
                    <input
                      autoFocus
                      value={confirmarExclusao ? textoConfirmacao : textoImportacao}
                      placeholder={confirmarExclusao ? 'EXCLUIR' : 'SUBSTITUIR'}
                      onChange={(e) =>
                        confirmarExclusao
                          ? setTextoConfirmacao(e.target.value)
                          : setTextoImportacao(e.target.value)
                      }
                    />
                  </label>
                  <div className="gm-notebook-confirm-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmarExclusao(false);
                        setImportacao(null);
                        setTextoConfirmacao('');
                        setTextoImportacao('');
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      disabled={
                        confirmarExclusao
                          ? textoConfirmacao.trim().toUpperCase() !== 'EXCLUIR'
                          : textoImportacao.trim().toUpperCase() !== 'SUBSTITUIR'
                      }
                      onClick={confirmarExclusao ? excluirSessao : confirmarImportacao}
                    >
                      {confirmarExclusao ? 'Excluir sessão' : 'Substituir caderno'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
