import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CATEGORIAS,
  EFEITOS,
  excluirItem,
  listarItens,
  salvarItem,
  type CategoriaItem,
  type EfeitoItem,
  type ModeloItem,
} from '../hexatombe/itensLibrary';
import ImagemItem from '../hexatombe/ImagemItem';
import VisualizadorItem from '../hexatombe/VisualizadorItem';
import { processarImagemItem, processarImagemConteudoItem } from '../hexatombe/imagensItens';
import './GestaoItens.css';

type Rascunho = Pick<
  ModeloItem,
  | 'nome'
  | 'categoria'
  | 'efeito'
  | 'valor'
  | 'descricao'
  | 'consumivel'
  | 'imagem'
  | 'conteudo'
  | 'imagemConteudo'
>;
const vazio: Rascunho = {
  nome: '',
  categoria: 'outro',
  efeito: 'nenhum',
  valor: '',
  descricao: '',
  consumivel: false,
  imagem: undefined,
  conteudo: '',
  imagemConteudo: undefined,
};
const exemplos: ({ rotulo: string } & Rascunho)[] = [
  {
    rotulo: 'Faca / adaga',
    nome: 'Faca',
    categoria: 'arma',
    efeito: 'dano',
    valor: '',
    descricao: 'Defina o dano e as propriedades da arma conforme as regras da mesa.',
    consumivel: false,
  },
  {
    rotulo: 'Poção de cura',
    nome: 'Poção de cura',
    categoria: 'consumivel',
    efeito: 'cura',
    valor: '',
    descricao: 'Defina a recuperação de HP antes de utilizar.',
    consumivel: true,
  },
  {
    rotulo: 'Poção de Mana',
    nome: 'Poção de Mana',
    categoria: 'consumivel',
    efeito: 'mana',
    valor: '',
    descricao: 'Defina a recuperação de Mana/Foco antes de utilizar.',
    consumivel: true,
  },
  {
    rotulo: 'Amuleto protetor',
    nome: 'Amuleto protetor',
    categoria: 'equipamento',
    efeito: 'escudo',
    valor: '',
    descricao: 'Defina a proteção temporária concedida pelo item.',
    consumivel: false,
  },
  {
    rotulo: 'Comida',
    nome: 'Ração de viagem',
    categoria: 'comida',
    efeito: 'nenhum',
    valor: '',
    descricao: 'Alimento para viagens e descanso; efeito narrativo definido pelo mestre.',
    consumivel: true,
  },
  {
    rotulo: 'Barraca',
    nome: 'Barraca de viagem',
    categoria: 'acampamento',
    efeito: 'nenhum',
    valor: '',
    descricao: 'Equipamento de acampamento reutilizável.',
    consumivel: false,
  },
  {
    rotulo: 'Carta / documento',
    nome: 'Carta selada',
    categoria: 'documento',
    efeito: 'nenhum',
    valor: '',
    descricao: 'Uma carta encontrada na aventura.',
    consumivel: false,
    conteudo: 'Escreva aqui o conteúdo completo da carta.',
  },
];
const VISUAL_KEY = 'portal-mestre-itens-visualizacao-v1';
type Modo = 'grade' | 'lista';
const modoInicial = (): Modo => {
  try {
    return localStorage.getItem(VISUAL_KEY) === 'lista' ? 'lista' : 'grade';
  } catch {
    return 'grade';
  }
};

export default function GestaoItens() {
  const [itens, setItens] = useState<ModeloItem[]>(listarItens);
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [processando, setProcessando] = useState(false);
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [visualizando, setVisualizando] = useState<ModeloItem | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const arquivoConteudoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const atualizar = () => setItens(listarItens());
    window.addEventListener('storage', atualizar);
    window.addEventListener('portal-mestre-itens-alterados', atualizar);
    return () => {
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('portal-mestre-itens-alterados', atualizar);
    };
  }, []);
  const encontrados = useMemo(
    () =>
      itens.filter(
        (item) =>
          (categoria === 'todas' || item.categoria === categoria) &&
          [item.nome, item.descricao, CATEGORIAS[item.categoria]]
            .join(' ')
            .toLowerCase()
            .includes(filtro.toLowerCase()),
      ),
    [itens, categoria, filtro],
  );
  function mudar<K extends keyof Rascunho>(chave: K, valor: Rascunho[K]) {
    setRascunho((x) => ({ ...x, [chave]: valor }));
    setMensagem('');
  }
  function limpar() {
    setRascunho({ ...vazio });
    setEditando(null);
    setExcluindo(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
    if (arquivoConteudoRef.current) arquivoConteudoRef.current.value = '';
  }
  function definirModo(proximo: Modo) {
    setModo(proximo);
    try {
      localStorage.setItem(VISUAL_KEY, proximo);
    } catch {
      /* preferências visuais não são obrigatórias */
    }
  }
  async function carregarImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setProcessando(true);
    setMensagem('Preparando imagem…');
    try {
      const imagem = await processarImagemItem(arquivo);
      setRascunho((x) => ({ ...x, imagem }));
      setMensagem('Imagem otimizada. Salve o item para guardar a alteração.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível preparar a imagem.');
    } finally {
      setProcessando(false);
      event.target.value = '';
    }
  }
  async function carregarConteudoImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    setProcessando(true);
    setMensagem('Preparando imagem de leitura…');
    try {
      const imagemConteudo = await processarImagemConteudoItem(arquivo);
      setRascunho((x) => ({ ...x, imagemConteudo }));
      setMensagem('Imagem de leitura pronta. Salve o item para confirmar.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível preparar a imagem.');
    } finally {
      setProcessando(false);
      event.target.value = '';
    }
  }
  function salvar(event: FormEvent) {
    event.preventDefault();
    if (processando) return;
    try {
      const salvo = salvarItem(rascunho, editando || undefined);
      setMensagem(`${salvo.nome} ${editando ? 'atualizado' : 'adicionado'} na biblioteca.`);
      limpar();
      setItens(listarItens());
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível salvar o item.');
    }
  }
  function editar(item: ModeloItem) {
    const {
      nome,
      categoria,
      efeito,
      valor,
      descricao,
      consumivel,
      imagem,
      conteudo,
      imagemConteudo,
    } = item;
    setRascunho({
      nome,
      categoria,
      efeito,
      valor,
      descricao,
      consumivel,
      imagem,
      conteudo,
      imagemConteudo,
    });
    setEditando(item.id);
    setMensagem('');
    if (arquivoRef.current) arquivoRef.current.value = '';
    if (arquivoConteudoRef.current) arquivoConteudoRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <div className="pm-itens-page">
      <section className="hp-page-intro">
        <span className="hp-eyebrow">INVENTÁRIO · BIBLIOTECA DO MESTRE</span>
        <h1>
          Arsenal e <em>suprimentos.</em>
        </h1>
        <p>
          Crie armas, alimentos, barracas, poções e documentos visualizáveis com texto e imagens.
          Depois distribua-os aos personagens na janela <strong>Inventário</strong> de cada mesa.
        </p>
      </section>
      <div className="pm-itens-grid">
        <section className="pm-itens-editor" aria-labelledby="itens-editor-title">
          <div className="pm-itens-section-header">
            <span className="hp-eyebrow">CATÁLOGO PESSOAL</span>
            <h2 id="itens-editor-title">{editando ? 'Editar item' : 'Criar item'}</h2>
          </div>
          <form onSubmit={salvar}>
            <label>
              Nome do item
              <input
                required
                maxLength={80}
                value={rascunho.nome}
                placeholder="Ex.: Faca da Morgana"
                onChange={(e) => mudar('nome', e.target.value)}
              />
            </label>
            <div className="pm-itens-dupla">
              <label>
                Categoria
                <select
                  value={rascunho.categoria}
                  onChange={(e) => {
                    const cat = e.target.value as CategoriaItem;
                    setRascunho((atual) => ({
                      ...atual,
                      categoria: cat,
                      ...(cat === 'documento'
                        ? { efeito: 'nenhum' as const, valor: '', consumivel: false }
                        : {}),
                    }));
                  }}
                >
                  {(Object.keys(CATEGORIAS) as CategoriaItem[]).map((key) => (
                    <option value={key} key={key}>
                      {CATEGORIAS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Efeito na mesa
                <select
                  disabled={rascunho.categoria === 'documento'}
                  value={rascunho.efeito}
                  onChange={(e) => mudar('efeito', e.target.value as EfeitoItem)}
                >
                  {(Object.keys(EFEITOS) as EfeitoItem[]).map((key) => (
                    <option value={key} key={key}>
                      {EFEITOS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {rascunho.efeito !== 'nenhum' && (
              <label>
                Valor ou dados
                <input
                  maxLength={32}
                  value={rascunho.valor}
                  placeholder="Ex.: 5 ou 1d6+2"
                  onChange={(e) => mudar('valor', e.target.value)}
                />
                <small>
                  Defina um número ou fórmula de dados. Um item sem valor ainda não produz efeito
                  automático.
                </small>
              </label>
            )}
            <div className="pm-itens-imagem-editor">
              <ImagemItem
                imagem={rascunho.imagem}
                categoria={rascunho.categoria}
                nome={rascunho.nome || 'novo item'}
                className="pm-item-thumb-editor"
              />
              <div className="pm-itens-imagem-campos">
                <label htmlFor="pm-item-arquivo">Imagem do item (opcional)</label>
                <input
                  id="pm-item-arquivo"
                  ref={arquivoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={carregarImagem}
                  disabled={processando}
                />
                <small>
                  PNG, JPG ou WebP, até 8 MB. A imagem será reduzida e comprimida no navegador.
                </small>
                {rascunho.imagem && (
                  <button
                    type="button"
                    className="pm-itens-remover-imagem"
                    disabled={processando}
                    onClick={() => {
                      mudar('imagem', undefined);
                      if (arquivoRef.current) arquivoRef.current.value = '';
                    }}
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>
            {rascunho.categoria === 'documento' && (
              <section
                className="pm-documento-editor"
                aria-label="Conteúdo visualizável do documento"
              >
                <strong>📜 Conteúdo do documento</strong>
                <p>
                  Esse conteúdo poderá ser lido no inventário. Abrir um documento não consome o
                  item.
                </p>
                <label>
                  Texto completo
                  <textarea
                    rows={9}
                    maxLength={18000}
                    value={rascunho.conteudo || ''}
                    placeholder="Escreva o texto da carta, livro, pergaminho ou pista…"
                    onChange={(e) => mudar('conteudo', e.target.value)}
                  />
                </label>
                <label>
                  Imagem para leitura ampliada (opcional)
                  <input
                    ref={arquivoConteudoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    onChange={carregarConteudoImagem}
                    disabled={processando}
                  />
                </label>
                <small>
                  PNG, JPG ou WebP. Até 8 MB no arquivo original; a imagem será otimizada para
                  leitura e backup.
                </small>
                {rascunho.imagemConteudo && (
                  <div className="pm-documento-editor-previa">
                    <img src={rascunho.imagemConteudo} alt="Prévia da página do documento" />
                    <button
                      type="button"
                      onClick={() => mudar('imagemConteudo', undefined)}
                      disabled={processando}
                    >
                      Remover página
                    </button>
                  </div>
                )}
              </section>
            )}
            <label>
              Descrição, propriedades e regras
              <textarea
                rows={4}
                maxLength={650}
                value={rascunho.descricao}
                placeholder="Anotações, condições de uso, alcance, raridade..."
                onChange={(e) => mudar('descricao', e.target.value)}
              />
            </label>
            <label className="pm-itens-checkbox">
              <input
                type="checkbox"
                disabled={rascunho.categoria === 'documento'}
                checked={rascunho.consumivel}
                onChange={(e) => mudar('consumivel', e.target.checked)}
              />{' '}
              Consumir uma unidade quando utilizado
            </label>
            <div className="pm-itens-actions">
              <button type="submit" disabled={processando} className="pm-itens-primary">
                {processando
                  ? 'Preparando imagem…'
                  : editando
                    ? 'Salvar alterações'
                    : '+ Adicionar ao catálogo'}
              </button>
              {editando && (
                <button type="button" disabled={processando} onClick={limpar}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
          {mensagem && (
            <p className="pm-itens-message" role="status">
              {mensagem}
            </p>
          )}
          <div className="pm-itens-presets">
            <strong>Começar por um modelo</strong>
            <p>Os modelos não impõem valores de dano ou cura: configure-os para o seu sistema.</p>
            <div>
              {exemplos.map(({ rotulo, ...item }) => (
                <button
                  key={rotulo}
                  type="button"
                  disabled={processando}
                  onClick={() => {
                    setRascunho(item);
                    setEditando(null);
                    setMensagem('');
                    if (arquivoRef.current) arquivoRef.current.value = '';
                  }}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="pm-itens-catalogo" aria-labelledby="itens-catalog-title">
          <div className="pm-itens-section-header">
            <span className="hp-eyebrow">{itens.length} ITEM(NS) CADASTRADO(S)</span>
            <h2 id="itens-catalog-title">Biblioteca de itens</h2>
          </div>
          <div className="pm-itens-search">
            <input
              aria-label="Buscar itens"
              placeholder="Buscar pelo nome ou descrição"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <select
              aria-label="Filtrar categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="todas">Todas as categorias</option>
              {(Object.keys(CATEGORIAS) as CategoriaItem[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORIAS[key]}
                </option>
              ))}
            </select>
          </div>
          <div
            className="pm-itens-view-switch"
            role="group"
            aria-label="Modo de exibição da biblioteca"
          >
            <button
              type="button"
              aria-pressed={modo === 'grade'}
              className={modo === 'grade' ? 'ativo' : ''}
              onClick={() => definirModo('grade')}
            >
              ▦ Grade
            </button>
            <button
              type="button"
              aria-pressed={modo === 'lista'}
              className={modo === 'lista' ? 'ativo' : ''}
              onClick={() => definirModo('lista')}
            >
              ☷ Lista
            </button>
          </div>
          {encontrados.length ? (
            <div className={`pm-itens-results modo-${modo}`}>
              {encontrados.map((item) => (
                <article className="pm-itens-card" key={item.id}>
                  <div className="pm-itens-card-top">
                    <ImagemItem
                      imagem={item.imagem}
                      categoria={item.categoria}
                      nome={item.nome}
                      className="pm-item-thumb-catalogo"
                    />
                    <div className="pm-itens-card-info">
                      <div className="pm-itens-card-head">
                        <strong>{item.nome}</strong>
                        <span>{CATEGORIAS[item.categoria]}</span>
                      </div>
                      <small>
                        {EFEITOS[item.efeito]}
                        {item.valor ? ` · ${item.valor}` : ''}
                        {item.consumivel ? ' · Consome ao usar' : ''}
                      </small>
                    </div>
                  </div>
                  {item.descricao && <p>{item.descricao}</p>}
                  <div className="pm-itens-actions">
                    <button type="button" onClick={() => setVisualizando(item)}>
                      ▣ Ver
                    </button>
                    <button type="button" onClick={() => editar(item)}>
                      Editar
                    </button>
                    {excluindo === item.id ? (
                      <>
                        <button
                          type="button"
                          className="pm-itens-danger"
                          onClick={() => {
                            excluirItem(item.id);
                            setItens(listarItens());
                            setExcluindo(null);
                            if (editando === item.id) limpar();
                            setMensagem(
                              'Item excluído do catálogo. Inventários existentes foram preservados.',
                            );
                          }}
                        >
                          Confirmar exclusão
                        </button>
                        <button type="button" onClick={() => setExcluindo(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setExcluindo(item.id)}>
                        Excluir
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="pm-itens-empty">
              Nenhum item encontrado. Crie seu primeiro item ou escolha um modelo ao lado.
            </p>
          )}
          <div className="pm-itens-note">
            <strong>Como funciona o inventário?</strong>
            <p>
              O catálogo é compartilhado pelo mestre. Ao entregar um item a um personagem, uma
              cópia, incluindo sua imagem, é salva na campanha. Alterar ou remover o original não
              apaga itens já distribuídos. O backup completo do mestre inclui as imagens.
            </p>
          </div>
        </section>
      </div>
      {visualizando && (
        <VisualizadorItem item={visualizando} onFechar={() => setVisualizando(null)} />
      )}
    </div>
  );
}
