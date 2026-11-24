import { useEffect, useMemo, useRef, useState } from 'react';
import { carregarArquivo, salvarArquivo, excluirArquivo } from '../lib/storage';
import { chaveTokenFicha, validarTokenArquivo } from '../lib/bibliotecaTokens';
import TokenPadraoFicha from '../lib/TokenPadraoFicha';
import { lerArquivoRetrato, RETRATO_ACEITOS } from '../lib/retratoFicha';
import ImagemRetrato, {
  AJUSTE_RETRATO_PADRAO,
  normalizarAjusteRetrato,
  type AjusteRetrato,
} from '../lib/retratoResponsivo';
import EditorRetrato from '../EditorRetrato';
import type { FormEvent } from 'react';
import {
  excluirFicha,
  exportarFicha,
  salvarFicha,
  salvarOuAtualizarFicha,
  papelDaFicha,
  ROTULOS_PAPEL,
  type FichaRegistro,
  type FichaDados,
  type PapelFicha,
} from '../hexatombe/fichasLibrary';
import EditorPersonagemMestre from './EditorPersonagemMestre';
import './EditorPersonagemMestre.css';
import {
  converterFichaParaBiblioteca,
  exportarOrigemCriador,
  reconhecerFichaCriador,
} from '../impeto/integracaoPortal';
import FichaImpetoDetalhes from '../hexatombe/FichaImpetoDetalhes';
import { ehExploracaoManual } from '../hexatombe/acoesFichaDados';
import { atualizarCampanha, type CampanhaMeta } from '../hexatombe/campaignLibrary';
import {
  fichaCompativel,
  nomeDoSistema,
  sistemaDaFicha,
  sistemaDaCampanha,
  SISTEMAS_RPG,
} from '../hexatombe/sistemasRpg';

/** A biblioteca central usa as mesmas fichas IndexedDB que o Criador original e a mesa. */
type Props = {
  fichas: FichaRegistro[];
  campanhas: CampanhaMeta[];
  onChange: () => void | Promise<void>;
};
type Filtro = 'todos' | 'vinculados' | 'livres';
type PapelFiltro = PapelFicha | 'todos';
type AbaDetalhes =
  'resumo' | 'atributos' | 'pericias' | 'escolhas' | 'tecnicas' | 'token' | 'vinculos';
const POR_PAGINA = 9;
function descricaoElemento(v: string) {
  return (
    (
      {
        fogo: 'Fogo',
        agua: 'Água',
        terra: 'Terra',
        ar: 'Ar',
        nao: 'Não dobrador',
        neutro: 'Não dobrador',
      } as Record<string, string>
    )[v] || v
  );
}
function descricaoClasse(v: string) {
  return (
    (
      { lutador: 'Lutador', frente: 'Linha de Frente', conjurador: 'Conjurador' } as Record<
        string,
        string
      >
    )[v] || v
  );
}
function dataCurta(v: string) {
  const data = new Date(v);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}
function skillLabel(f: FichaRegistro, i: number) {
  return (
    f.dados.editorOriginal?.habilidades[i]?.nome || f.dados.skills?.[i]?.name || `Técnica ${i + 1}`
  );
}
function skillDesc(f: FichaRegistro, i: number) {
  return f.dados.editorOriginal?.habilidades[i]?.efeito || f.dados.skills?.[i]?.effect || '';
}
function campanhasDoPersonagem(campanhas: CampanhaMeta[], id: string) {
  return campanhas.filter((c) => c.fichaIds.includes(id));
}

export default function GestaoPersonagens({ fichas, campanhas, onChange }: Props) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [sistemaFiltro, setSistemaFiltro] = useState('todos');
  const [papelFiltro, setPapelFiltro] = useState<PapelFiltro>('todos');
  const [editorMestre, setEditorMestre] = useState<{
    papel: PapelFicha;
    registro?: FichaRegistro;
  } | null>(null);
  const [pagina, setPagina] = useState(1);
  const [selecionada, setSelecionada] = useState<FichaRegistro | null>(null);
  const [abaDetalhes, setAbaDetalhes] = useState<AbaDetalhes>('resumo');
  const [revisaoTokenFicha, setRevisaoTokenFicha] = useState(0);
  const [erroRetrato, setErroRetrato] = useState('');
  const [ajustandoRetrato, setAjustandoRetrato] = useState(false);
  const [rascunhoAjusteRetrato, setRascunhoAjusteRetrato] = useState<AjusteRetrato>({
    ...AJUSTE_RETRATO_PADRAO,
  });
  const [abaTecnicasManuais, setAbaTecnicasManuais] = useState<'combate' | 'exploracao'>('combate');
  const [excluindo, setExcluindo] = useState<FichaRegistro | null>(null);
  const [confirmacao, setConfirmacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [feedback, setFeedback] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);
  const retratoRef = useRef<HTMLInputElement>(null);
  const confirmarRef = useRef<HTMLInputElement>(null);
  const filtradas = useMemo(
    () =>
      fichas.filter((f) => {
        const texto =
          `${f.nome} ${descricaoElemento(f.dados.element)} ${descricaoClasse(f.dados.class)} ${f.dados.story || ''}`.toLocaleLowerCase(
            'pt-BR',
          );
        const associada = campanhas.some((c) => c.fichaIds.includes(f.id));
        return (
          texto.includes(busca.trim().toLocaleLowerCase('pt-BR')) &&
          (papelFiltro === 'todos' || papelDaFicha(f.dados) === papelFiltro) &&
          (sistemaFiltro === 'todos' || sistemaDaFicha(f.dados) === sistemaFiltro) &&
          (filtro === 'todos' || (filtro === 'vinculados' ? associada : !associada))
        );
      }),
    [busca, campanhas, fichas, filtro, sistemaFiltro, papelFiltro],
  );
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  useEffect(() => setPagina(1), [busca, filtro, sistemaFiltro, papelFiltro]);
  useEffect(() => setAbaTecnicasManuais('combate'), [selecionada?.id]);
  useEffect(() => {
    if (excluindo) {
      confirmarRef.current?.focus();
    }
  }, [excluindo]);
  useEffect(() => {
    if (!selecionada && !excluindo && !editorMestre) return;
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processando) {
        setSelecionada(null);
        setExcluindo(null);
        setEditorMestre(null);
        setConfirmacao('');
      }
    };
    window.addEventListener('keydown', teclado);
    return () => window.removeEventListener('keydown', teclado);
  }, [selecionada, excluindo, editorMestre, processando]);
  async function importar(arquivo?: File) {
    if (!arquivo) return;
    setProcessando(true);
    try {
      if (arquivo.size > 8_000_000) throw Error('O JSON deve ter até 8 MB.');
      const raw: unknown = JSON.parse(await arquivo.text());
      const obj =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { dados?: unknown }) : {};
      const novo = reconhecerFichaCriador(raw)
        ? converterFichaParaBiblioteca(raw)
        : (obj.dados ?? raw);
      // O JSON contém regras, não o Blob binário do token. A biblioteca do mestre permite reaplicá-lo.
      if (novo && typeof novo === 'object')
        Object.assign(novo, { temTokenPadrao: false, tokenPadraoAnimado: false });
      const f = await salvarFicha(novo);
      setFeedback(
        f.dados.impeto
          ? `Ficha Ímpeto A01 de ${f.nome} importada com habilidades e recursos atualizados.`
          : `Ficha legada de ${f.nome} importada.`,
      );
      await onChange();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível importar o JSON.');
    } finally {
      setProcessando(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  }
  /** Troca de retrato sem alterar atributos, classe, habilidades ou token padrão.
   * Compatível com fichas A01 que mantêm as regras editáveis no Criador Avatar. */
  async function alterarRetratoFicha(f: FichaRegistro, retrato: string) {
    if (processando) return;
    setErroRetrato('');
    setProcessando(true);
    try {
      const nova = await salvarOuAtualizarFicha(
        { ...f.dados, photo: retrato, retratoAjuste: { ...AJUSTE_RETRATO_PADRAO } },
        f.id,
      );
      setSelecionada(nova);
      setAjustandoRetrato(false);
      setFeedback(retrato ? `Retrato de ${f.nome} atualizado.` : `Retrato de ${f.nome} removido.`);
      await onChange();
    } catch (erro) {
      setErroRetrato(erro instanceof Error ? erro.message : 'Não foi possível salvar o retrato.');
    } finally {
      setProcessando(false);
    }
  }
  function abrirAjusteRetrato(f: FichaRegistro) {
    setRascunhoAjusteRetrato(normalizarAjusteRetrato(f.dados.retratoAjuste));
    setAjustandoRetrato(true);
    setErroRetrato('');
  }
  async function salvarAjusteRetratoFicha(f: FichaRegistro) {
    if (processando) return;
    setProcessando(true);
    setErroRetrato('');
    try {
      const nova = await salvarOuAtualizarFicha(
        { ...f.dados, retratoAjuste: normalizarAjusteRetrato(rascunhoAjusteRetrato) },
        f.id,
      );
      setSelecionada(nova);
      setAjustandoRetrato(false);
      setFeedback(
        `Enquadramento de ${f.nome} salvo na biblioteca. As mesas já iniciadas mantêm seus próprios ajustes.`,
      );
      await onChange();
    } catch (erro) {
      setErroRetrato(
        erro instanceof Error ? erro.message : 'Não foi possível salvar o enquadramento.',
      );
    } finally {
      setProcessando(false);
    }
  }
  async function selecionarRetratoFicha(f: FichaRegistro, arquivo?: File) {
    if (!arquivo) return;
    try {
      await alterarRetratoFicha(f, await lerArquivoRetrato(arquivo));
    } catch (erro) {
      setErroRetrato(erro instanceof Error ? erro.message : 'Retrato inválido.');
    }
  }
  async function persistirTokenFicha(
    f: FichaRegistro,
    arquivo: Blob | null,
  ): Promise<FichaRegistro> {
    if (arquivo) {
      await validarTokenArquivo(arquivo);
      await salvarArquivo(chaveTokenFicha(f.id), arquivo);
    } else await excluirArquivo(chaveTokenFicha(f.id));
    return salvarOuAtualizarFicha(
      { ...f.dados, temTokenPadrao: !!arquivo, tokenPadraoAnimado: arquivo?.type === 'image/gif' },
      f.id,
    );
  }
  async function alterarTokenFicha(f: FichaRegistro, arquivo: Blob | null) {
    setProcessando(true);
    try {
      const nova = await persistirTokenFicha(f, arquivo);
      setSelecionada(nova);
      setRevisaoTokenFicha((r) => r + 1);
      setFeedback(
        arquivo
          ? `Token padrão de ${nova.nome} configurado para as duas mesas.`
          : 'Token padrão removido da ficha.',
      );
      await onChange();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível salvar o token padrão.');
      throw e;
    } finally {
      setProcessando(false);
    }
  }
  async function salvarNoAcervo(dados: FichaDados, id?: string, tokenPadrao?: Blob | null) {
    if (dados.impeto) {
      setFeedback(
        'Fichas Ímpeto A01 só podem alterar a categoria aqui. Edite regras no Criador Avatar.',
      );
      return;
    }
    setProcessando(true);
    try {
      let ficha = await salvarOuAtualizarFicha(dados, id);
      if (tokenPadrao !== undefined) ficha = await persistirTokenFicha(ficha, tokenPadrao);
      setFeedback(
        `${ROTULOS_PAPEL[papelDaFicha(ficha.dados)]} ${id ? 'atualizado' : 'criado'}: ${ficha.nome}.`,
      );
      setEditorMestre(null);
      setPapelFiltro(papelDaFicha(ficha.dados));
      await onChange();
      if (id) setSelecionada(ficha);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível salvar a ficha.');
    } finally {
      setProcessando(false);
    }
  }
  async function alterarCategoria(f: FichaRegistro, papel: PapelFicha) {
    if (papelDaFicha(f.dados) === papel) return;
    setProcessando(true);
    try {
      const atualizada = await salvarOuAtualizarFicha({ ...f.dados, papel }, f.id);
      setSelecionada(atualizada);
      setFeedback(`A ficha ${f.nome} foi movida para ${ROTULOS_PAPEL[papel]}.`);
      await onChange();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível mudar a categoria.');
    } finally {
      setProcessando(false);
    }
  }
  async function duplicar(f: FichaRegistro) {
    setProcessando(true);
    try {
      const nome = `${f.nome} (cópia)`.slice(0, 80);
      const original = f.dados.editorOriginal;
      let dados = {
        ...f.dados,
        name: nome,
        editorOriginal: original ? { ...original, nome } : undefined,
      };
      if (f.dados.impeto) {
        const fonte = f.dados.impeto.origem;
        const originalPacote = fonte as Record<string, unknown>;
        const fichaInterna =
          originalPacote.formato === 'hexatombe-avatar-ficha'
            ? (originalPacote.ficha as Record<string, unknown>)
            : originalPacote;
        const pacote = {
          formato: 'hexatombe-avatar-ficha',
          versaoFormato: 1,
          ficha: { ...fichaInterna, nome },
        };
        const convertida = converterFichaParaBiblioteca(pacote);
        dados = {
          ...dados,
          ...convertida,
          skills: convertida.skills.map((h, i) => ({ ...h, icon: f.dados.skills?.[i]?.icon })),
          basicIcon: f.dados.basicIcon,
          passiveIcon: f.dados.passiveIcon,
        };
      }
      let nova = await salvarFicha({ ...dados, temTokenPadrao: false, tokenPadraoAnimado: false });
      if (f.dados.temTokenPadrao) {
        const token = await carregarArquivo(chaveTokenFicha(f.id));
        if (token) nova = await persistirTokenFicha(nova, token);
      }
      setFeedback(`Cópia criada: ${nova.nome}. As técnicas e a passiva foram preservadas.`);
      await onChange();
      setSelecionada(null);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao duplicar ficha.');
    } finally {
      setProcessando(false);
    }
  }
  async function vincular(f: FichaRegistro, c: CampanhaMeta) {
    setProcessando(true);
    try {
      const vinculada = c.fichaIds.includes(f.id);
      if (!vinculada && !fichaCompativel(f, c))
        throw new Error(
          'Esta ficha pertence a outro sistema e não pode ser vinculada a esta campanha.',
        );
      const fichaIds = vinculada ? c.fichaIds.filter((id) => id !== f.id) : [...c.fichaIds, f.id];
      atualizarCampanha(c.id, { fichaIds });
      setFeedback(
        vinculada
          ? `${f.nome} desvinculado(a) de ${c.titulo}.`
          : `${f.nome} vinculado(a) a ${c.titulo}.`,
      );
      await onChange();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível atualizar a campanha.');
    } finally {
      setProcessando(false);
    }
  }
  async function excluir(e: FormEvent) {
    e.preventDefault();
    if (!excluindo || confirmacao.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR' || processando)
      return;
    setProcessando(true);
    try {
      // A ficha da biblioteca é independente dos personagens já colocados em combate.
      await excluirFicha(excluindo.id);
      await excluirArquivo(chaveTokenFicha(excluindo.id)).catch(() => undefined);
      const afetadas = campanhasDoPersonagem(campanhas, excluindo.id);
      const erros: string[] = [];
      for (const campanha of afetadas) {
        try {
          atualizarCampanha(campanha.id, {
            fichaIds: campanha.fichaIds.filter((id) => id !== excluindo.id),
          });
        } catch {
          erros.push(campanha.titulo);
        }
      }
      setFeedback(
        erros.length
          ? `Ficha excluída, mas não foi possível atualizar os vínculos de: ${erros.join(', ')}.`
          : `Ficha de ${excluindo.nome} excluída da biblioteca. Os personagens já colocados nas mesas permanecem.`,
      );
      setSelecionada(null);
      setExcluindo(null);
      setConfirmacao('');
      await onChange();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível excluir a ficha.');
    } finally {
      setProcessando(false);
    }
  }
  function fechar() {
    if (!processando) {
      setAjustandoRetrato(false);
      setErroRetrato('');
      setSelecionada(null);
      setExcluindo(null);
      setConfirmacao('');
      setAbaDetalhes('resumo');
      setAbaTecnicasManuais('combate');
    }
  }
  return (
    <section
      className="hp-library-panel hx-character-library"
      aria-label="Biblioteca de personagens"
    >
      <div className="hp-library-head">
        <div>
          <h2>Biblioteca de personagens</h2>
          <span>{fichas.length} registro(s) · Jogadores, NPCs, Inimigos e Chefes</span>
        </div>
        <div className="hp-row-actions">
          <div className="hx-mestre-criar-acoes" aria-label="Criar personagens do mestre">
            <button
              className="hp-button hp-button-outline"
              type="button"
              disabled={processando}
              onClick={() => setEditorMestre({ papel: 'npc' })}
            >
              ＋ NPC
            </button>
            <button
              className="hp-button hp-button-outline"
              type="button"
              disabled={processando}
              onClick={() => setEditorMestre({ papel: 'inimigo' })}
            >
              ＋ Inimigo
            </button>
            <button
              className="hp-button hp-button-outline"
              type="button"
              disabled={processando}
              onClick={() => setEditorMestre({ papel: 'chefe' })}
            >
              ＋ Chefe
            </button>
          </div>
          <a
            className="hp-button hp-button-primary"
            href="https://hexatombe-avatar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ＋ Personagem A01
          </a>
          <a className="hp-button hp-button-primary" href="/criador-impeto/">
            ＋ Personagem Ímpeto
          </a>
          <button
            className="hp-button hp-button-outline"
            type="button"
            disabled={processando}
            onClick={() => arquivoRef.current?.click()}
          >
            ↥ Importar JSON
          </button>
          <input
            type="file"
            hidden
            ref={arquivoRef}
            accept=".json,application/json"
            onChange={(e) => void importar(e.target.files?.[0])}
          />
        </div>
      </div>
      <p className="gm-module-hint" role="note">
        Biblioteca única por sistema, organizada por função. Cadastre NPCs, inimigos e chefes aqui
        ou importe uma ficha do{' '}
        <a href="https://hexatombe-avatar.vercel.app/" target="_blank" rel="noopener noreferrer">
          Criador Hexatombe: Avatar
        </a>
        . O <a href="/criador-impeto/">Criador Ímpeto universal</a> tem edição e exportação próprias nesta primeira versão. As fichas A01 mantêm a edição das regras no Criador; os demais registros podem ser
        editados neste Portal.
      </p>
      <nav className="hx-mestre-categorias" role="group" aria-label="Categorias da biblioteca">
        {(['todos', 'jogador', 'npc', 'inimigo', 'chefe'] as const).map((p) => (
          <button
            type="button"
            key={p}
            aria-pressed={papelFiltro === p}
            onClick={() => setPapelFiltro(p)}
          >
            <span>
              {p === 'todos'
                ? 'Todas'
                : p === 'jogador'
                  ? 'Jogadores'
                  : p === 'npc'
                    ? 'NPCs'
                    : p === 'inimigo'
                      ? 'Inimigos'
                      : 'Chefes'}
            </span>
            <strong>
              {p === 'todos'
                ? fichas.length
                : fichas.filter((f) => papelDaFicha(f.dados) === p).length}
            </strong>
          </button>
        ))}
      </nav>
      <div className="hx-character-filters">
        <label className="hp-search-label">
          Buscar ficha
          <input
            type="search"
            placeholder="Nome, elemento, função ou história…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <label className="hp-search-label">
          Sistema
          <select value={sistemaFiltro} onChange={(e) => setSistemaFiltro(e.target.value)}>
            <option value="todos">Todos os sistemas</option>
            {SISTEMAS_RPG.map((s) => (
              <option value={s.id} key={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <div className="hx-character-tabs" role="group" aria-label="Filtrar fichas">
          <button aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos
          </button>
          <button aria-pressed={filtro === 'vinculados'} onClick={() => setFiltro('vinculados')}>
            Em campanhas
          </button>
          <button aria-pressed={filtro === 'livres'} onClick={() => setFiltro('livres')}>
            Sem campanha
          </button>
        </div>
      </div>
      {feedback && (
        <div className="hp-feedback" role="status">
          {feedback}
          <button onClick={() => setFeedback('')} type="button" aria-label="Dispensar mensagem">
            ×
          </button>
        </div>
      )}
      {visiveis.length ? (
        <div className="hp-characters">
          {visiveis.map((f) => {
            const associadas = campanhasDoPersonagem(campanhas, f.id);
            return (
              <article className="hp-character hx-character-card" key={f.id}>
                <div className="hp-character-top">
                  <span className="hp-portrait">
                    {f.dados.photo ? (
                      <ImagemRetrato
                        src={f.dados.photo}
                        ajuste={f.dados.retratoAjuste}
                        alt={`Retrato de ${f.nome}`}
                      />
                    ) : (
                      <span>✧</span>
                    )}
                  </span>
                  <div>
                    <span className="hp-character-element">
                      {nomeDoSistema(sistemaDaFicha(f.dados))} ·{' '}
                      <b className={`hx-mestre-tipo hx-mestre-${papelDaFicha(f.dados)}`}>
                        {ROTULOS_PAPEL[papelDaFicha(f.dados)]}
                      </b>
                    </span>
                    <h3>{f.nome}</h3>
                    <p>{descricaoClasse(f.dados.class)}</p>
                  </div>
                </div>
                <div className="hp-character-stats">
                  <span>
                    ♥ HP <b>{f.dados.hpMax}</b>
                  </span>
                  <span>
                    ✦ {f.dados.impeto ? 'EN' : 'Mana'} <b>{f.dados.manaMax}</b>
                  </span>
                  <span>
                    ◈ CA <b>{f.dados.ca}</b>
                  </span>
                </div>
                <div className="hx-character-mini">
                  <span>✧ {f.dados.skills?.filter((s) => s.name).length || 0} técnicas</span>
                  <span>◈ {f.dados.passiveName ? 'Passiva' : 'Sem passiva'}</span>
                </div>
                <div className="hx-character-campaigns">
                  {associadas.length ? (
                    associadas.slice(0, 2).map((c) => <span key={c.id}>{c.titulo}</span>)
                  ) : (
                    <span className="hx-unlinked">Sem campanha</span>
                  )}
                  {associadas.length > 2 && <span>+{associadas.length - 2}</span>}
                </div>
                <div className="hp-character-actions">
                  {papelDaFicha(f.dados) !== 'jogador' && !f.dados.impeto && (
                    <button
                      type="button"
                      className="hp-button hp-button-primary"
                      onClick={() => setEditorMestre({ papel: papelDaFicha(f.dados), registro: f })}
                    >
                      Editar
                    </button>
                  )}
                  {papelDaFicha(f.dados) === 'jogador' &&
                    sistemaDaFicha(f.dados) === 'impeto' &&
                    !f.dados.impeto && (
                      <a
                        className="hp-button hp-button-primary"
                        href={`/criador/?ficha=${encodeURIComponent(f.id)}`}
                      >
                        Editar
                      </a>
                    )}
                  <button
                    onClick={() => {
                      setSelecionada(f);
                      setAjustandoRetrato(false);
                      setErroRetrato('');
                      setAbaDetalhes('resumo');
                    }}
                    type="button"
                  >
                    Abrir ficha
                  </button>
                  <button
                    onClick={() => exportarFicha(f)}
                    type="button"
                    title="Baixar JSON de backup"
                  >
                    JSON ↓
                  </button>
                  <button
                    className="hp-danger"
                    onClick={() => {
                      setConfirmacao('');
                      setExcluindo(f);
                    }}
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="hp-blank">
          <span>♙</span>
          <h3>
            {fichas.length ? 'Nenhuma ficha nesta seleção' : 'Sua biblioteca ainda está vazia'}
          </h3>
          <p>Crie um NPC, Inimigo ou Chefe no formulário acima, ou importe uma ficha existente.</p>
          {!fichas.length && (
            <a
              className="hp-button hp-button-primary"
              href="https://hexatombe-avatar.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Criar ficha Avatar A01
            </a>
          )}
        </div>
      )}
      {filtradas.length > POR_PAGINA && (
        <div className="hp-pagination">
          <button disabled={paginaAtual <= 1} onClick={() => setPagina((n) => Math.max(1, n - 1))}>
            ← Anterior
          </button>
          <span>
            {paginaAtual} de {totalPaginas}
          </span>
          <button
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}
          >
            Próxima →
          </button>
        </div>
      )}
      <p className="hp-caption">
        Suas fichas e fotos continuam no IndexedDB deste navegador. Exporte JSONs como backup antes
        de limpar o navegador ou trocar de computador. Editar uma ficha não altera o HP atual nem as
        condições dos personagens em combate.
      </p>
      {selecionada && (
        <div
          className="hx-character-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <section
            className="hx-character-dialog hx-character-dialog-v2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hx-character-detail-title"
          >
            <header className="hx-character-modalhead">
              <span className="hp-eyebrow">
                ✦ {ROTULOS_PAPEL[papelDaFicha(selecionada.dados)].toUpperCase()} ·{' '}
                {nomeDoSistema(sistemaDaFicha(selecionada.dados))}
              </span>
              <button type="button" aria-label="Fechar ficha" onClick={fechar}>
                ×
              </button>
            </header>
            <div className="hx-character-dialog-scroll">
              <div className="hx-character-hero">
                <div className="hx-character-retrato-edicao">
                  <div className="hx-character-portrait-grande">
                    {selecionada.dados.photo ? (
                      <ImagemRetrato
                        src={selecionada.dados.photo}
                        ajuste={
                          ajustandoRetrato ? rascunhoAjusteRetrato : selecionada.dados.retratoAjuste
                        }
                        alt={`Retrato de ${selecionada.nome}`}
                      />
                    ) : (
                      <span aria-hidden="true">✦</span>
                    )}
                  </div>
                  {selecionada.dados.photo && (
                    <button
                      type="button"
                      disabled={processando}
                      onClick={() =>
                        ajustandoRetrato
                          ? setAjustandoRetrato(false)
                          : abrirAjusteRetrato(selecionada)
                      }
                    >
                      {ajustandoRetrato ? 'Fechar ajuste' : 'Ajustar retrato'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="hx-character-trocar-retrato"
                    disabled={processando}
                    onClick={() => retratoRef.current?.click()}
                  >
                    Trocar retrato
                  </button>
                  <input
                    ref={retratoRef}
                    type="file"
                    hidden
                    accept={RETRATO_ACEITOS}
                    aria-label="Escolher retrato da ficha"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      e.target.value = '';
                      void selecionarRetratoFicha(selecionada, arquivo);
                    }}
                  />
                  {selecionada.dados.photo && (
                    <button
                      type="button"
                      className="hx-character-remover-retrato"
                      disabled={processando}
                      onClick={() => void alterarRetratoFicha(selecionada, '')}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="hx-character-hero-texto">
                  <span className="hx-character-sobretitulo">REGISTRO ESPIRITUAL</span>
                  <h2 id="hx-character-detail-title">{selecionada.nome}</h2>
                  <div className="hx-character-hero-chips">
                    <span>{ROTULOS_PAPEL[papelDaFicha(selecionada.dados)]}</span>
                    <span>{descricaoElemento(selecionada.dados.element)}</span>
                    <span>{descricaoClasse(selecionada.dados.class)}</span>
                    {selecionada.dados.impeto && <span>Avatar A01 · Playtest</span>}
                  </div>
                  <small>Atualizada em {dataCurta(selecionada.atualizadoEm)}</small>
                  <small className="hx-character-retrato-ajuda">
                    Retrato: PNG, JPG, WebP ou GIF em loop. Token padrão configurado separadamente
                    na aba Token.
                  </small>
                  {erroRetrato && (
                    <p role="alert" className="hx-character-retrato-erro">
                      {erroRetrato}
                    </p>
                  )}
                </div>
              </div>
              {ajustandoRetrato && selecionada.dados.photo && (
                <div className="hx-character-ajuste-retrato">
                  <EditorRetrato
                    titulo="Ajuste do retrato da biblioteca"
                    imagem={selecionada.dados.photo}
                    valor={rascunhoAjusteRetrato}
                    aoAlterar={setRascunhoAjusteRetrato}
                  />
                  <div className="hx-character-ajuste-acoes">
                    <button
                      type="button"
                      disabled={processando}
                      onClick={() => void salvarAjusteRetratoFicha(selecionada)}
                    >
                      Salvar enquadramento
                    </button>
                    <button
                      type="button"
                      disabled={processando}
                      onClick={() => setAjustandoRetrato(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <div
                className="hx-character-resource-grid"
                aria-label="Recursos de referência da ficha"
              >
                <div className="hx-character-resource hp">
                  <span>♥ HP MÁXIMO</span>
                  <strong>{selecionada.dados.hpMax}</strong>
                </div>
                <div className="hx-character-resource energia">
                  <span>◆ {selecionada.dados.impeto ? 'EN · REFERÊNCIA' : 'MANA'}</span>
                  <strong>{selecionada.dados.manaMax}</strong>
                </div>
                <div className="hx-character-resource ca">
                  <span>⬡ CA BASE</span>
                  <strong>{selecionada.dados.ca}</strong>
                </div>
                {selecionada.dados.impeto && (
                  <div className="hx-character-resource regeneracao">
                    <span>↺ REGENERAÇÃO</span>
                    <strong>
                      +{selecionada.dados.impeto.estatisticas.regeneracao}
                      <small>/rod.</small>
                    </strong>
                  </div>
                )}
              </div>
              <nav className="hx-character-detail-tabs" aria-label="Seções da ficha" role="tablist">
                {(
                  [
                    ['resumo', 'Visão geral'],
                    ['atributos', 'Atributos'],
                    ['pericias', 'Perícias'],
                    ['escolhas', 'Construção'],
                    ['tecnicas', 'Técnicas'],
                    ['token', 'Token'],
                    ['vinculos', 'Campanhas'],
                  ] as const
                )
                  .filter(
                    ([aba]) =>
                      Boolean(selecionada.dados.impeto) || !['atributos', 'pericias'].includes(aba),
                  )
                  .map(([aba, rotulo]) => (
                    <button
                      key={aba}
                      type="button"
                      role="tab"
                      aria-selected={abaDetalhes === aba}
                      onClick={() => setAbaDetalhes(aba)}
                    >
                      {rotulo}
                    </button>
                  ))}
              </nav>
              <div className="hx-character-detail-content" role="tabpanel">
                {abaDetalhes === 'token' && (
                  <TokenPadraoFicha
                    fichaId={selecionada.id}
                    temToken={selecionada.dados.temTokenPadrao === true}
                    revisao={revisaoTokenFicha}
                    desabilitado={processando}
                    onAlterar={(arquivo) => alterarTokenFicha(selecionada, arquivo)}
                  />
                )}
                {abaDetalhes === 'resumo' && (
                  <>
                    <section className="hx-character-story hx-character-story-v2">
                      <h3>História e descrição</h3>
                      <p>{selecionada.dados.story || 'História ainda não informada.'}</p>
                    </section>
                    {papelDaFicha(selecionada.dados) !== 'jogador' && (
                      <div className="hx-mestre-detalhes-narrativos">
                        {selecionada.dados.objetivo && (
                          <article>
                            <b>Objetivo</b>
                            <p>{selecionada.dados.objetivo}</p>
                          </article>
                        )}
                        {selecionada.dados.comportamento && (
                          <article>
                            <b>Comportamento</b>
                            <p>{selecionada.dados.comportamento}</p>
                          </article>
                        )}
                        {selecionada.dados.notasMestre && (
                          <article>
                            <b>Notas de preparação</b>
                            <p>{selecionada.dados.notasMestre}</p>
                          </article>
                        )}
                        {papelDaFicha(selecionada.dados) === 'chefe' &&
                          selecionada.dados.fasesChefe && (
                            <article>
                              <b>Fases do chefe</b>
                              <p>{selecionada.dados.fasesChefe}</p>
                            </article>
                          )}
                        {papelDaFicha(selecionada.dados) === 'chefe' &&
                          selecionada.dados.planoEncontro && (
                            <article>
                              <b>Reforços e objetivo</b>
                              <p>{selecionada.dados.planoEncontro}</p>
                            </article>
                          )}
                      </div>
                    )}
                    {selecionada.dados.impeto ? (
                      <>
                        <div className="hx-character-resumo-a01">
                          <span>32 PA</span>
                          <span>20 PR</span>
                          <span>6 PT</span>
                          <span>100 PC</span>
                          <span>35 PX</span>
                        </div>
                        <p className="hx-character-nota">
                          HP e CA são máximos/base da ficha. Energia é uma referência, não um teto:
                          durante a sessão ela pode acumular acima desse valor.
                        </p>
                      </>
                    ) : (
                      <p className="hx-character-nota">
                        {papelDaFicha(selecionada.dados) === 'jogador'
                          ? 'Ficha legada do Ímpeto.'
                          : 'Registro manual do mestre — números e técnicas definidos conforme a campanha.'}
                      </p>
                    )}
                  </>
                )}
                {abaDetalhes === 'atributos' && (
                  <>
                    {selecionada.dados.impeto ? (
                      <FichaImpetoDetalhes
                        ficha={selecionada.dados.impeto}
                        secoes={['atributos']}
                      />
                    ) : (
                      <div className="hx-character-legado">
                        <h3>Recursos de referência</h3>
                        <p>
                          HP {selecionada.dados.hpMax} · Energia {selecionada.dados.manaMax} · CA{' '}
                          {selecionada.dados.ca}
                        </p>
                        <p>Esta ficha manual não possui compra de atributos A01.</p>
                      </div>
                    )}
                  </>
                )}
                {abaDetalhes === 'pericias' && (
                  <>
                    {selecionada.dados.impeto ? (
                      <FichaImpetoDetalhes ficha={selecionada.dados.impeto} secoes={['pericias']} />
                    ) : (
                      <div className="hx-character-legado">
                        <h3>Perícias</h3>
                        <p>
                          Fichas manuais não têm bônus de treinamento definidos. Consulte o mestre
                          ou utilize uma ficha oficial A01.
                        </p>
                      </div>
                    )}
                  </>
                )}
                {abaDetalhes === 'escolhas' && (
                  <>
                    {selecionada.dados.impeto ? (
                      <FichaImpetoDetalhes ficha={selecionada.dados.impeto} secoes={['escolhas']} />
                    ) : (
                      <div className="hx-character-legado">
                        <h3>Perfil do mestre</h3>
                        <p>
                          Função: {selecionada.dados.class} · Elemento: {selecionada.dados.element}
                        </p>
                        <p>
                          Este registro manual não adiciona bônus T02/V01/D01 automaticamente. O
                          mestre decide seus efeitos.
                        </p>
                      </div>
                    )}
                  </>
                )}
                {abaDetalhes === 'tecnicas' && (
                  <>
                    {selecionada.dados.impeto ? (
                      <FichaImpetoDetalhes
                        ficha={selecionada.dados.impeto}
                        secoes={['tecnicas', 'exploracao']}
                      />
                    ) : (
                      <>
                        <nav
                          className="impeto-a01-subtabs"
                          role="tablist"
                          aria-label="Tipos de técnicas"
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={abaTecnicasManuais === 'combate'}
                            onClick={() => setAbaTecnicasManuais('combate')}
                          >
                            ⚔ Combate
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={abaTecnicasManuais === 'exploracao'}
                            onClick={() => setAbaTecnicasManuais('exploracao')}
                          >
                            ✧ Exploração
                          </button>
                        </nav>
                        <div role="tabpanel">
                          {abaTecnicasManuais === 'combate' ? (
                            <>
                              <div className="hx-character-skills">
                                <h3>Habilidades de combate</h3>
                                {(selecionada.dados.skills || [])
                                  .map((h, i) => ({ h, i }))
                                  .filter(({ h }) => !ehExploracaoManual(h.type))
                                  .map(({ h, i }) => (
                                    <div key={i}>
                                      <strong>
                                        {i + 1}. {skillLabel(selecionada, i)}
                                      </strong>
                                      <small>
                                        {' '}
                                        · {h.cost ?? 0} EN · {h.damage || 'Sem dado'}
                                      </small>
                                      <p>
                                        {skillDesc(selecionada, i) || 'Sem descrição preenchida.'}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                              <div className="hx-character-story">
                                <h3>Passiva · {selecionada.dados.passiveName || 'Sem nome'}</h3>
                                <p>{selecionada.dados.passiveEffect || 'Sem efeito preenchido.'}</p>
                              </div>
                            </>
                          ) : (
                            <div className="hx-character-skills">
                              <h3>Técnicas de exploração</h3>
                              {(selecionada.dados.skills || [])
                                .map((h, i) => ({ h, i }))
                                .filter(({ h }) => ehExploracaoManual(h.type))
                                .map(({ h, i }) => (
                                  <div key={i}>
                                    <strong>
                                      {i + 1}. {skillLabel(selecionada, i)}
                                    </strong>
                                    <small> · {h.cost ?? 0} EN</small>
                                    <p>
                                      {skillDesc(selecionada, i) || 'Sem descrição preenchida.'}
                                    </p>
                                  </div>
                                ))}
                              {!(selecionada.dados.skills || []).some((h) =>
                                ehExploracaoManual(h.type),
                              ) && (
                                <p>
                                  Nenhuma técnica de exploração cadastrada. No editor do mestre,
                                  defina o tipo como “Exploração” para agrupá-la aqui.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
                {abaDetalhes === 'vinculos' && (
                  <fieldset className="hx-character-associations">
                    <legend>Campanhas vinculadas</legend>
                    <p>
                      Vincule a ficha às campanhas do mesmo sistema. Isso não coloca automaticamente
                      o personagem no mapa.
                    </p>
                    {campanhas.length ? (
                      <div className="hx-character-checklist">
                        {campanhas.map((c) => {
                          const comp = fichaCompativel(selecionada, c);
                          const ligado = c.fichaIds.includes(selecionada.id);
                          return (
                            <label
                              key={c.id}
                              title={!comp ? 'Sistema incompatível com este personagem' : undefined}
                            >
                              <input
                                type="checkbox"
                                disabled={processando || (!comp && !ligado)}
                                checked={ligado}
                                onChange={() => void vincular(selecionada, c)}
                              />
                              <span>
                                {c.titulo} · {nomeDoSistema(sistemaDaCampanha(c))}
                                {c.arquivada ? ' (arquivada)' : ''}
                                {!comp ? ' — incompatível' : ''}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p>
                        Crie uma campanha em <a href="/mesas/">Minhas mesas</a> para vincular esta
                        ficha.
                      </p>
                    )}
                  </fieldset>
                )}
              </div>
            </div>
            <footer className="hx-character-modalactions">
              <label className="hx-mestre-mudar-papel">
                Categoria
                <select
                  aria-label="Categoria desta ficha"
                  disabled={processando}
                  value={papelDaFicha(selecionada.dados)}
                  onChange={(e) => void alterarCategoria(selecionada, e.target.value as PapelFicha)}
                >
                  <option value="jogador">Personagem</option>
                  <option value="npc">NPC</option>
                  <option value="inimigo">Inimigo</option>
                  <option value="chefe">Chefe</option>
                </select>
              </label>
              {papelDaFicha(selecionada.dados) !== 'jogador' && !selecionada.dados.impeto && (
                <button
                  type="button"
                  disabled={processando}
                  onClick={() => {
                    setEditorMestre({
                      papel: papelDaFicha(selecionada.dados),
                      registro: selecionada,
                    });
                    setSelecionada(null);
                  }}
                >
                  Editar ficha
                </button>
              )}
              <button
                type="button"
                disabled={processando}
                onClick={() => void duplicar(selecionada)}
              >
                Duplicar ficha
              </button>
              <button type="button" onClick={() => exportarFicha(selecionada)}>
                Exportar JSON
              </button>
              {selecionada.dados.impeto && (
                <button
                  type="button"
                  className="hx-character-exportar-origem"
                  onClick={() => exportarOrigemCriador(selecionada.dados.impeto!)}
                >
                  ↓ JSON para o Criador Avatar
                </button>
              )}
              {sistemaDaFicha(selecionada.dados) === 'impeto' && !selecionada.dados.impeto && (
                <a
                  className="hp-button hp-button-primary"
                  href={`/criador/?ficha=${encodeURIComponent(selecionada.id)}`}
                >
                  Abrir no Gerador Ímpeto
                </a>
              )}
            </footer>
          </section>
        </div>
      )}
      {editorMestre && (
        <EditorPersonagemMestre
          key={editorMestre.registro?.id || editorMestre.papel}
          papelInicial={editorMestre.papel}
          registro={editorMestre.registro}
          salvando={processando}
          onCancelar={() => {
            if (!processando) setEditorMestre(null);
          }}
          onSalvar={(dados, id, token) => void salvarNoAcervo(dados, id, token)}
        />
      )}
      {excluindo && (
        <div
          className="hx-character-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <form
            className="hx-character-delete"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hx-character-delete-title"
            onSubmit={(e) => void excluir(e)}
          >
            <div className="hx-character-modalhead">
              <span className="hp-eyebrow">CONFIRMAÇÃO DE EXCLUSÃO</span>
              <button
                aria-label="Cancelar exclusão"
                type="button"
                disabled={processando}
                onClick={fechar}
              >
                ×
              </button>
            </div>
            <h2 id="hx-character-delete-title">Excluir ficha?</h2>
            <p className="hx-character-deleted-name">{excluindo.nome}</p>
            <p>
              Esta ficha será excluída da biblioteca e desvinculada das campanhas. Personagens já
              colocados nas mesas continuarão com seus atributos de combate.
            </p>
            <label>
              Digite <strong>EXCLUIR</strong> para confirmar
              <input
                ref={confirmarRef}
                autoComplete="off"
                spellCheck={false}
                placeholder="EXCLUIR"
                value={confirmacao}
                disabled={processando}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </label>
            <div className="hx-character-modalactions">
              <button type="button" disabled={processando} onClick={fechar}>
                Cancelar
              </button>
              <button
                type="submit"
                className="hx-character-delete-confirm"
                disabled={
                  processando || confirmacao.trim().toLocaleUpperCase('pt-BR') !== 'EXCLUIR'
                }
              >
                {processando ? 'Excluindo…' : 'Excluir ficha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
