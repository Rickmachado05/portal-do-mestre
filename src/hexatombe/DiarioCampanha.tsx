import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CATEGORIAS_DIARIO,
  criarPaginaDiario,
  exportarDiarioMarkdown,
  filtrarPaginasDiario,
  conteudosCompartilhadosDiario,
  permissaoEfetivaDiario,
  MAX_IMAGEM_DIARIO,
  MAX_PAGINAS_DIARIO,
  MAX_TEXTO_PAGINA,
  MAX_TITULO_PAGINA,
  type CategoriaDiario,
  type CamposDiario,
  type OperacaoDiario,
  type PaginaDiario,
  type PermissaoDiario,
  type TipoEntradaDiario,
} from './registrosDiario';
import { limparHtmlDiario, textoLegadoParaHtml } from './htmlDiario';
import './DiarioCampanha.css';

type PersonagemDiario = { id: string; nome: string; foto?: string; cor?: string };
export type PaginaExternaDiario = PaginaDiario & {
  permissao: 'ver' | 'editar';
  proprietario: string;
};
type Props = {
  paginas: PaginaDiario[];
  nomeCampanha: string;
  onOperacao: (op: OperacaoDiario) => void;
  onCriarItem?: (pagina: PaginaDiario, destinatarioId?: string) => string;
  compacto?: boolean;
  personagens?: PersonagemDiario[];
  pessoalJogador?: boolean;
  paginasExternas?: PaginaExternaDiario[];
  onEditarExterno?: (id: string, campos: CamposDiario) => Promise<void>;
};
type ModoNota = 'visualizar' | 'editar' | 'compartilhar' | 'item';
type Secao = 'meus' | 'compartilhados';
const dataPt = (data: string) =>
  new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const escopo = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const iconeTipo = (tipo?: TipoEntradaDiario) =>
  tipo === 'pasta' ? '▣' : tipo === 'imagem' ? '▧' : '▤';
const nomeTipo = (tipo?: TipoEntradaDiario) =>
  tipo === 'pasta' ? 'Pasta' : tipo === 'imagem' ? 'Imagem' : 'Nota';
const dataImagem = (base64: string) => /^data:image\/(png|jpeg|webp);base64,/.test(base64);

function EditorFormatado({
  pagina,
  onAlterar,
}: {
  pagina: PaginaDiario;
  onAlterar: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onAlterarRef = useRef(onAlterar);
  onAlterarRef.current = onAlterar;
  useEffect(() => {
    if (ref.current)
      ref.current.innerHTML =
        pagina.formato === 'html'
          ? limparHtmlDiario(pagina.conteudo)
          : textoLegadoParaHtml(pagina.conteudo);
  }, [pagina.id]);
  const acao = (comando: string, valor?: string) => {
    ref.current?.focus();
    // Comandos nativos do contenteditable são amplamente suportados nos navegadores desktop.
    document.execCommand(comando, false, valor);
    if (ref.current) onAlterarRef.current(limparHtmlDiario(ref.current.innerHTML));
  };
  return (
    <div className="pm-bib-editor-completo">
      <div className="pm-bib-formatar" role="toolbar" aria-label="Formatação da nota">
        <button
          type="button"
          title="Negrito"
          aria-label="Negrito"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('bold')}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          title="Itálico"
          aria-label="Itálico"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          title="Sublinhado"
          aria-label="Sublinhado"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('underline')}
        >
          <u>U</u>
        </button>
        <span aria-hidden="true" className="pm-bib-separador" />
        <button
          type="button"
          title="Título"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('formatBlock', 'h2')}
        >
          H2
        </button>
        <button
          type="button"
          title="Parágrafo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('formatBlock', 'p')}
        >
          ¶
        </button>
        <button
          type="button"
          title="Lista com pontos"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('insertUnorderedList')}
        >
          ☷
        </button>
        <button
          type="button"
          title="Lista numerada"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('insertOrderedList')}
        >
          1.
        </button>
        <button
          type="button"
          title="Remover formatação"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => acao('removeFormat')}
        >
          Tx
        </button>
      </div>
      <div
        ref={ref}
        className="pm-bib-conteudo-editavel pm-bib-texto-rico"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Texto formatado da nota"
        aria-multiline="true"
        spellCheck
        onInput={(e) => onAlterarRef.current(limparHtmlDiario(e.currentTarget.innerHTML))}
        onPaste={(e) => {
          e.preventDefault();
          const texto = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, texto);
        }}
        data-placeholder="Escreva a história, descrição ou pistas deste conteúdo…"
      />
      <small className="pm-bib-salvamento">
        Salvamento automático · títulos, negrito, listas e parágrafos
      </small>
    </div>
  );
}

async function prepararImagem(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml')
    throw Error('Selecione uma imagem PNG, JPEG ou WebP.');
  if (file.size > 12 * 1024 * 1024)
    throw Error('Imagem muito grande. Escolha um arquivo de até 12 MB.');
  const imagem = await createImageBitmap(file);
  try {
    const escala = Math.min(1, 1100 / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.width * escala));
    canvas.height = Math.max(1, Math.round(imagem.height * escala));
    canvas.getContext('2d')?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    for (const qualidade of [0.8, 0.68, 0.54, 0.4]) {
      const data = canvas.toDataURL('image/webp', qualidade);
      if (dataImagem(data) && data.length <= MAX_IMAGEM_DIARIO) return data;
    }
    throw Error('Esta imagem não coube no armazenamento local. Use uma imagem menor.');
  } finally {
    imagem.close();
  }
}

export default function DiarioCampanha({
  paginas,
  nomeCampanha,
  onOperacao,
  onCriarItem,
  compacto = false,
  personagens = [],
  pessoalJogador = false,
  paginasExternas,
  onEditarExterno,
}: Props) {
  const [secao, setSecao] = useState<Secao>('meus');
  const [personagemId, setPersonagemId] = useState('');
  const [pastaId, setPastaId] = useState('');
  const [busca, setBusca] = useState('');
  const [ativaId, setAtivaId] = useState('');
  const [modo, setModo] = useState<ModoNota>('visualizar');
  const [destinoItemId, setDestinoItemId] = useState('');
  const [resultadoItem, setResultadoItem] = useState('');
  const [excluirId, setExcluirId] = useState('');
  const [aviso, setAviso] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; mouseX: number; mouseY: number } | null>(
    null,
  );
  const inputImagem = useRef<HTMLInputElement>(null);
  const selecionadoPersonagem = personagens.find((p) => p.id === personagemId) || personagens[0];
  const dono = secao === 'meus';
  const listaBase =
    secao === 'meus'
      ? paginas
      : (paginasExternas ??
        conteudosCompartilhadosDiario(paginas, selecionadoPersonagem?.id || ''));
  const ativa = (dono ? paginas : listaBase).find((p) => p.id === ativaId) || null;
  const acesso =
    !dono && ativa
      ? paginasExternas
        ? (ativa as PaginaExternaDiario).permissao
        : selecionadoPersonagem
          ? permissaoEfetivaDiario(ativa, paginas, selecionadoPersonagem.id)
          : null
      : null;
  const podeEditar = !!ativa && (dono || (acesso === 'editar' && !!onEditarExterno));
  const lista = useMemo(() => {
    const achados = filtrarPaginasDiario(listaBase, busca, 'todas');
    if (busca.trim()) return achados;
    return achados.filter(
      (p) =>
        (p.pastaId || '') === pastaId ||
        (!pastaId && p.tipo === 'pasta') ||
        (secao === 'compartilhados' &&
          !pastaId &&
          !!p.pastaId &&
          !listaBase.some((pasta) => pasta.id === p.pastaId && pasta.tipo === 'pasta')),
    );
  }, [listaBase, busca, pastaId, secao]);
  const pastaAtual = listaBase.find((p) => p.id === pastaId && p.tipo === 'pasta');
  const numeroCompartilhado = paginas.filter(
    (p) => Object.keys(p.compartilhadoCom || {}).length > 0,
  ).length;
  const mudar = (operacao: OperacaoDiario) => {
    onOperacao(operacao);
    setAviso(pessoalJogador ? 'Anotação salva neste navegador.' : 'Salvo na campanha.');
  };
  function editar(campos: CamposDiario) {
    if (!ativa || !podeEditar) return;
    if (dono) mudar({ tipo: 'alterar', id: ativa.id, campos });
    else if (onEditarExterno)
      void onEditarExterno(ativa.id, campos)
        .then(() => setAviso('Edição compartilhada salva.'))
        .catch((e) =>
          setAviso(e instanceof Error ? e.message : 'Falha ao editar o conteúdo compartilhado.'),
        );
  }
  function criar(tipo: TipoEntradaDiario) {
    if (paginas.length >= MAX_PAGINAS_DIARIO) {
      setAviso(`Limite de ${MAX_PAGINAS_DIARIO} conteúdos atingido.`);
      return;
    }
    const novo = {
      ...criarPaginaDiario(
        tipo === 'pasta' ? 'Nova pasta' : tipo === 'imagem' ? 'Nova imagem' : 'Nova nota',
      ),
      tipo,
      pastaId: tipo === 'pasta' ? '' : pastaId,
    };
    mudar({ tipo: 'criar', pagina: novo });
    setSecao('meus');
    setBusca('');
    if (tipo === 'pasta') {
      setPastaId(novo.id);
      setAtivaId('');
    } else {
      setAtivaId(novo.id);
      setModo('editar');
      setExcluirId('');
      setPos(null);
      setDestinoItemId('');
      setResultadoItem('');
    }
  }
  function abrir(p: PaginaDiario) {
    if (p.tipo === 'pasta') {
      setPastaId(p.id);
      setBusca('');
      return;
    }
    setAtivaId(p.id);
    setModo('visualizar');
    setExcluirId('');
    setPos(null);
    setDestinoItemId('');
    setResultadoItem('');
  }
  function duplicar() {
    if (!ativa || !dono || paginas.length >= MAX_PAGINAS_DIARIO) return;
    const novo = {
      ...criarPaginaDiario(`${ativa.titulo} (cópia)`, ativa.categoria),
      conteudo: ativa.conteudo,
      formato: ativa.formato,
      tipo: ativa.tipo,
      pastaId: ativa.pastaId,
      imagem: ativa.imagem,
      compartilhadoCom: {},
    };
    mudar({ tipo: 'duplicar', id: ativa.id, pagina: novo });
    setAtivaId(novo.id);
    setModo('editar');
    setExcluirId('');
  }
  function apagar() {
    if (!ativa || !dono || excluirId !== ativa.id) return;
    mudar({ tipo: 'excluir', id: ativa.id });
    setAtivaId('');
    setExcluirId('');
  }
  function apagarPasta(p: PaginaDiario) {
    if (!dono || excluirId !== p.id) return;
    mudar({ tipo: 'excluir', id: p.id });
    setPastaId('');
    setExcluirId('');
    setAviso('Pasta removida. As notas foram preservadas na raiz.');
  }
  function baixar() {
    const original = exportarDiarioMarkdown(paginas, nomeCampanha);
    const markdown = pessoalJogador
      ? original.replaceAll(
          '[Imagem anexada — disponível no backup completo da campanha]',
          '[Imagem anexada ao diário pessoal]',
        ) +
        '\n\n' +
        paginas
          .filter((p) => p.imagem)
          .map(
            (p) => `### Imagem: ${p.titulo}\n\n![${p.titulo.replaceAll(']', '')}](${p.imagem})\n`,
          )
          .join('\n')
      : original;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `diario-${(nomeCampanha || 'campanha')
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 55)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importarImagem(file?: File) {
    if (!file || !ativa || !podeEditar) return;
    const idPagina = ativa.id;
    try {
      const imagem = await prepararImagem(file);
      mudar({ tipo: 'alterar', id: idPagina, campos: { tipo: 'imagem', imagem } });
      setAviso(
        pessoalJogador
          ? 'Imagem salva neste navegador.'
          : 'Imagem incorporada ao backup da campanha.',
      );
    } catch (erro) {
      setAviso(erro instanceof Error ? erro.message : 'Não foi possível importar a imagem.');
    }
    if (inputImagem.current) inputImagem.current.value = '';
  }
  function criarItemDaPagina() {
    if (!ativa || !dono || ativa.tipo === 'pasta' || !onCriarItem) return;
    setResultadoItem('');
    try {
      const nome = onCriarItem(ativa, destinoItemId || undefined);
      const destino = personagens.find((p) => p.id === destinoItemId);
      setResultadoItem(
        destino
          ? `✓ ${nome} salvo no catálogo e entregue a ${destino.nome}.`
          : `✓ ${nome} salvo no catálogo de itens.`,
      );
    } catch (erro) {
      setResultadoItem(erro instanceof Error ? erro.message : 'Não foi possível criar o item.');
    }
  }
  function alterarPermissao(id: string, permissaovalor: string) {
    if (!ativa || !dono) return;
    const novas = { ...(ativa.compartilhadoCom || {}) };
    if (permissaovalor === 'ver' || permissaovalor === 'editar')
      novas[id] = permissaovalor as PermissaoDiario;
    else delete novas[id];
    editar({ compartilhadoCom: novas });
  }
  function iniciarArrasto(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const janela = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!janela) return;
    drag.current = {
      id: e.pointerId,
      x: janela.left,
      y: janela.top,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function moverArrasto(e: ReactPointerEvent<HTMLDivElement>) {
    const a = drag.current;
    if (!a || a.id !== e.pointerId) return;
    setPos({
      x: escopo(a.x + e.clientX - a.mouseX, 8, Math.max(8, window.innerWidth - 170)),
      y: escopo(a.y + e.clientY - a.mouseY, 62, Math.max(62, window.innerHeight - 100)),
    });
  }
  function pararArrasto() {
    drag.current = null;
  }
  function escolherSecao(valor: Secao) {
    setSecao(valor);
    setPastaId('');
    setBusca('');
    setAtivaId('');
    setExcluirId('');
  }
  const modalPos = pos || {
    x: escopo(Math.min(window.innerWidth - 520, 420), 8, Math.max(8, window.innerWidth - 170)),
    y: escopo(175, 62, Math.max(62, window.innerHeight - 120)),
  };
  const mostrarModal = ativa && (dono || !!acesso);
  const conteudoRico = ativa?.formato === 'html';
  return (
    <section
      className={`pm-bib ${compacto ? 'pm-bib-compacto' : ''}`}
      aria-label="Biblioteca do diário da campanha"
    >
      {!pessoalJogador && (
        <div className="pm-bib-pestanas" role="tablist" aria-label="Acesso ao diário">
          <button
            role="tab"
            aria-selected={secao === 'meus'}
            className={secao === 'meus' ? 'ativo' : ''}
            type="button"
            onClick={() => escolherSecao('meus')}
          >
            ◈ Meu conteúdo
          </button>
          <button
            role="tab"
            aria-selected={secao === 'compartilhados'}
            className={secao === 'compartilhados' ? 'ativo' : ''}
            type="button"
            onClick={() => escolherSecao('compartilhados')}
          >
            ⇄ Compartilhado comigo
          </button>
        </div>
      )}
      {secao === 'compartilhados' && !paginasExternas && (
        <div className="pm-bib-como">
          <label htmlFor="pm-bib-ver-como">Visualizar como</label>
          <select
            id="pm-bib-ver-como"
            value={selecionadoPersonagem?.id || ''}
            onChange={(e) => {
              setPersonagemId(e.target.value);
              setPastaId('');
              setAtivaId('');
            }}
          >
            {!personagens.length && <option value="">Nenhum personagem cadastrado</option>}
            {personagens.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="pm-bib-pesquisa">
        <input
          type="search"
          aria-label="Buscar no diário"
          placeholder="Buscar conteúdo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {pastaId && (
          <button
            type="button"
            onClick={() => {
              setPastaId('');
              setBusca('');
            }}
            title="Voltar às pastas"
          >
            ↶
          </button>
        )}
      </div>
      <div className="pm-bib-caminho">
        <button type="button" onClick={() => setPastaId('')}>
          ▣ Diário
        </button>
        {pastaAtual && (
          <>
            <span>›</span>
            <strong>{pastaAtual.titulo}</strong>
          </>
        )}
      </div>
      <div className="pm-bib-lista" aria-label="Conteúdos do diário">
        {lista.map((p) => (
          <div
            className={`pm-bib-linha ${p.tipo === 'pasta' ? 'pm-bib-linha-pasta' : ''}`}
            key={p.id}
          >
            <button
              type="button"
              className="pm-bib-abrir"
              onClick={() => abrir(p)}
              title={p.tipo === 'pasta' ? 'Abrir pasta' : 'Visualizar documento'}
            >
              <span className="pm-bib-linha-icone">{iconeTipo(p.tipo)}</span>
              <span className="pm-bib-linha-texto">
                <b>
                  {p.fixada ? '★ ' : ''}
                  {p.titulo || 'Sem título'}
                </b>
                <small>
                  {nomeTipo(p.tipo)} · {dataPt(p.atualizadaEm)}
                  {Object.keys(p.compartilhadoCom || {}).length ? ' · ⇄' : ''}
                </small>
              </span>
              <span className="pm-bib-chevron">›</span>
            </button>
            {dono && p.tipo === 'pasta' && (
              <>
                <button
                  type="button"
                  className="pm-bib-linha-opcoes"
                  title={'Editar e compartilhar pasta'}
                  aria-label={`Editar e compartilhar pasta ${p.titulo}`}
                  onClick={() => {
                    setAtivaId(p.id);
                    setModo('compartilhar');
                    setExcluirId('');
                    setPos(null);
                  }}
                >
                  ⚙
                </button>
                <button
                  type="button"
                  className="pm-bib-linha-excluir"
                  title="Remover pasta (conteúdo preservado)"
                  onClick={() => setExcluirId(p.id)}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
        {!lista.length && (
          <p className="pm-bib-vazio">
            {secao === 'compartilhados'
              ? 'Nenhum conteúdo compartilhado com você.'
              : paginas.length
                ? 'Nenhum item aqui. Crie uma nota ou abra outra pasta.'
                : 'Seu diário está vazio. Crie uma nota para começar.'}
          </p>
        )}
        {excluirId &&
          ativa?.id !== excluirId &&
          paginas.some((p) => p.id === excluirId && p.tipo === 'pasta') && (
            <div className="pm-bib-confirmacao">
              <span>Excluir a pasta? As notas nela serão movidas para a raiz.</span>
              <button type="button" onClick={() => setExcluirId('')}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => apagarPasta(paginas.find((p) => p.id === excluirId)!)}
              >
                Excluir
              </button>
            </div>
          )}
      </div>
      {secao === 'meus' && (
        <div className="pm-bib-adicionar">
          <button
            type="button"
            onClick={() => criar('nota')}
            disabled={paginas.length >= MAX_PAGINAS_DIARIO}
          >
            ＋ Nota
          </button>
          <button
            type="button"
            onClick={() => criar('imagem')}
            disabled={paginas.length >= MAX_PAGINAS_DIARIO}
          >
            ▧ Imagem
          </button>
          <button
            type="button"
            onClick={() => criar('pasta')}
            disabled={paginas.length >= MAX_PAGINAS_DIARIO}
          >
            ▣ Pasta
          </button>
        </div>
      )}
      <div className="pm-bib-rodape">
        <span>
          {(dono ? paginas : listaBase).filter((p) => p.tipo !== 'pasta').length} itens
          {!dono
            ? ' · compartilhados comigo'
            : pessoalJogador
              ? ' · privados neste navegador'
              : ` · ${numeroCompartilhado} compartilhados`}
        </span>
        <button
          type="button"
          onClick={baixar}
          disabled={!paginas.length}
          title="Exportar notas em Markdown"
        >
          ↓ Exportar
        </button>
      </div>
      {aviso && (
        <p className="pm-bib-aviso" role="status">
          {aviso}
        </p>
      )}
      {secao === 'compartilhados' && (
        <small className="pm-bib-local">
          A visualização respeita o personagem selecionado; conteúdos compartilhados ficam
          disponíveis na mesa multiplayer.
        </small>
      )}
      {mostrarModal &&
        createPortal(
          <section
            className="pm-bib-documento"
            role="dialog"
            aria-label={`Documento ${ativa.titulo}`}
            style={{ left: modalPos.x, top: modalPos.y }}
          >
            <div
              className="pm-bib-documento-barra"
              onPointerDown={iniciarArrasto}
              onPointerMove={moverArrasto}
              onPointerUp={pararArrasto}
              onPointerCancel={pararArrasto}
            >
              <span>{iconeTipo(ativa.tipo)}</span>
              <strong title={ativa.titulo}>{ativa.titulo || 'Sem título'}</strong>
              <small>ARRASTE PARA MOVER</small>
              <button
                type="button"
                title="Fechar documento"
                aria-label="Fechar documento"
                onClick={() => {
                  setAtivaId('');
                  setExcluirId('');
                }}
              >
                ×
              </button>
            </div>
            <div className="pm-bib-documento-tabs" role="tablist" aria-label="Documento">
              <button
                type="button"
                role="tab"
                aria-selected={modo === 'visualizar'}
                className={modo === 'visualizar' ? 'ativo' : ''}
                onClick={() => setModo('visualizar')}
              >
                ◉ Visualizar
              </button>
              {podeEditar && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'editar'}
                  className={modo === 'editar' ? 'ativo' : ''}
                  onClick={() => setModo('editar')}
                >
                  ✎ Editar
                </button>
              )}
              {dono && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'compartilhar'}
                  className={modo === 'compartilhar' ? 'ativo' : ''}
                  onClick={() => setModo('compartilhar')}
                >
                  ⇄ Compartilhar
                </button>
              )}
              {dono && ativa.tipo !== 'pasta' && onCriarItem && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'item'}
                  className={modo === 'item' ? 'ativo' : ''}
                  onClick={() => {
                    setModo('item');
                    setResultadoItem('');
                  }}
                >
                  ▣ Criar item
                </button>
              )}
            </div>
            <div className="pm-bib-documento-conteudo" key={`${ativa.id}-${modo}`}>
              {modo === 'visualizar' && (
                <div className="pm-bib-leitura">
                  {ativa.imagem && (
                    <img className="pm-bib-imagem-leitura" src={ativa.imagem} alt={ativa.titulo} />
                  )}
                  {ativa.tipo === 'pasta' && (
                    <p className="pm-bib-aviso">
                      Esta pasta contém {paginas.filter((p) => p.pastaId === ativa.id).length}{' '}
                      conteúdo(s). Abra Compartilhar para definir acesso à pasta e aos itens dela.
                    </p>
                  )}
                  {ativa.conteudo ? (
                    <article
                      className="pm-bib-texto-rico"
                      {...(conteudoRico
                        ? { dangerouslySetInnerHTML: { __html: limparHtmlDiario(ativa.conteudo) } }
                        : { children: ativa.conteudo, style: { whiteSpace: 'pre-wrap' as const } })}
                    />
                  ) : (
                    !ativa.imagem && (
                      <p className="pm-bib-vazio">Este documento ainda não tem conteúdo.</p>
                    )
                  )}
                  {!dono && paginasExternas && (
                    <small>
                      Compartilhado por {(ativa as PaginaExternaDiario).proprietario} · permissão:{' '}
                      {acesso === 'editar' ? 'editar' : 'visualizar'}
                    </small>
                  )}
                  <small>
                    Atualizado em {new Date(ativa.atualizadaEm).toLocaleString('pt-BR')}
                  </small>
                </div>
              )}
              {modo === 'editar' && podeEditar && (
                <div className="pm-bib-edicao">
                  <label>
                    Título
                    <input
                      aria-label="Título do documento"
                      value={ativa.titulo}
                      maxLength={MAX_TITULO_PAGINA}
                      onChange={(e) => editar({ titulo: e.target.value })}
                    />
                  </label>
                  {dono && (
                    <div className="pm-bib-edicao-meta">
                      <label>
                        Categoria
                        <select
                          value={ativa.categoria}
                          aria-label="Categoria do documento"
                          onChange={(e) => editar({ categoria: e.target.value as CategoriaDiario })}
                        >
                          {CATEGORIAS_DIARIO.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.rotulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Pasta
                        <select
                          value={ativa.pastaId || ''}
                          aria-label="Mover documento para pasta"
                          onChange={(e) => editar({ pastaId: e.target.value })}
                        >
                          <option value="">Raiz do Diário</option>
                          {paginas
                            .filter((p) => p.tipo === 'pasta')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.titulo}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {ativa.tipo === 'imagem' && (
                    <div className="pm-bib-imagem-editar">
                      {ativa.imagem && <img src={ativa.imagem} alt="Prévia da imagem" />}
                      <input
                        ref={inputImagem}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="Escolher imagem do documento"
                        onChange={(e) => void importarImagem(e.target.files?.[0])}
                      />
                      <small>PNG, JPEG ou WebP. A imagem é compactada para o backup local.</small>
                    </div>
                  )}
                  <EditorFormatado
                    key={ativa.id}
                    pagina={ativa}
                    onAlterar={(html) =>
                      editar({ conteudo: html.slice(0, MAX_TEXTO_PAGINA), formato: 'html' })
                    }
                  />
                  <div className="pm-bib-edicao-acoes">
                    <span>
                      {ativa.conteudo.length.toLocaleString('pt-BR')}/
                      {MAX_TEXTO_PAGINA.toLocaleString('pt-BR')} · salvamento automático
                    </span>
                    <button type="button" onClick={() => setModo('visualizar')}>
                      Concluir
                    </button>
                  </div>
                </div>
              )}
              {modo === 'item' && dono && ativa.tipo !== 'pasta' && onCriarItem && (
                <div className="pm-bib-criar-item">
                  <div className="pm-bib-item-previa">
                    <span aria-hidden="true">▧</span>
                    <div>
                      <strong>{ativa.titulo || 'Documento sem título'}</strong>
                      <small>
                        Categoria: Documento ·{' '}
                        {ativa.imagem ? 'imagem disponível' : 'somente texto'} ·{' '}
                        {ativa.conteudo ? 'com texto' : 'sem texto'}
                      </small>
                    </div>
                  </div>
                  <p>
                    Crie um item visualizável com o texto e a imagem deste documento, sem apagá-lo
                    do Diário. A leitura pelo inventário permite zoom e arrasto.
                  </p>
                  <label>
                    Entregar para
                    <select
                      value={destinoItemId}
                      onChange={(e) => {
                        setDestinoItemId(e.target.value);
                        setResultadoItem('');
                      }}
                      aria-label="Destinatário do item do Diário"
                    >
                      <option value="">Somente salvar no catálogo de itens</option>
                      {personagens.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="pm-bib-criar-item-acao"
                    onClick={criarItemDaPagina}
                  >
                    {destinoItemId ? '▣ Salvar e entregar item' : '▣ Salvar no catálogo'}
                  </button>
                  {resultadoItem && (
                    <p className="pm-bib-criar-item-resultado" role="status">
                      {resultadoItem}
                    </p>
                  )}
                  <small>
                    Exportar novamente atualiza o item do catálogo. Exemplares já entregues mantêm o
                    conteúdo de quando foram recebidos, sem alterações automáticas.
                  </small>
                </div>
              )}
              {modo === 'compartilhar' && dono && (
                <div className="pm-bib-compartilhar">
                  <p>
                    Escolha quem poderá ver ou editar. Ao compartilhar uma pasta, o acesso também
                    alcança os documentos dentro dela. O multiplayer aplica estas permissões na
                    publicação remota.
                  </p>
                  {personagens.map((p) => (
                    <div key={p.id} className="pm-bib-personagem">
                      <span className="pm-bib-avatar" style={{ borderColor: p.cor || '#a58b63' }}>
                        {p.foto ? <img src={p.foto} alt="" /> : p.nome.slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{p.nome}</strong>
                      <select
                        aria-label={`Permissão de ${p.nome}`}
                        value={ativa.compartilhadoCom?.[p.id] || 'nenhum'}
                        onChange={(e) => alterarPermissao(p.id, e.target.value)}
                      >
                        <option value="nenhum">Não compartilhar</option>
                        <option value="ver">Visualizar</option>
                        <option value="editar">Editar</option>
                      </select>
                    </div>
                  ))}
                  {!personagens.length && (
                    <p className="pm-bib-vazio">
                      Adicione personagens à campanha para compartilhar.
                    </p>
                  )}
                  <small>
                    Visualizar permite leitura; Editar permite alterações. Não compartilhar revoga o
                    acesso na sala multiplayer. O Diário pessoal continua salvo neste navegador.
                  </small>
                </div>
              )}
            </div>
            <div className="pm-bib-documento-rodape">
              <span role={aviso ? 'status' : undefined}>
                {aviso ||
                  (pessoalJogador
                    ? 'Meu conteúdo · privado'
                    : dono
                      ? 'Meu conteúdo'
                      : paginasExternas
                        ? `Compartilhado comigo`
                        : `Visualizando como ${selecionadoPersonagem?.nome || 'personagem'}`)}
              </span>
              <div>
                {dono && (
                  <>
                    <button
                      type="button"
                      onClick={duplicar}
                      disabled={paginas.length >= MAX_PAGINAS_DIARIO}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="pm-bib-perigo"
                      onClick={() => setExcluirId(ativa.id)}
                    >
                      Excluir
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setAtivaId('')}>
                  Fechar
                </button>
              </div>
            </div>
            {excluirId === ativa.id && (
              <div className="pm-bib-confirmacao">
                <span>Excluir este documento definitivamente?</span>
                <button type="button" onClick={() => setExcluirId('')}>
                  Cancelar
                </button>
                <button type="button" onClick={apagar}>
                  Sim, excluir
                </button>
              </div>
            )}
          </section>,
          document.body,
        )}
    </section>
  );
}
