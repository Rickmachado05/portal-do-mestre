import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  CATEGORIAS,
  EFEITOS,
  salvarItem,
  type CategoriaItem,
  type EfeitoItem,
  type ModeloItem,
} from './itensLibrary';
import { processarImagemItem, processarImagemConteudoItem } from './imagensItens';
import ImagemItem from './ImagemItem';
import './ModalCriarItem.css';

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
const inicial: Rascunho = {
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

type Props = {
  personagemNome: string;
  onCriado: (item: ModeloItem, quantidade: number) => void;
  onFechar: () => void;
};

/** Editor em portal: não é recortado nem comprimido pela janela de inventário. */
export default function ModalCriarItem({ personagemNome, onCriado, onFechar }: Props) {
  const tituloId = useId();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [rascunho, setRascunho] = useState<Rascunho>({ ...inicial });
  const [quantidade, setQuantidade] = useState(1);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  function mudar<K extends keyof Rascunho>(chave: K, valor: Rascunho[K]) {
    setRascunho((atual) => ({ ...atual, [chave]: valor }));
    setErro('');
  }
  useEffect(() => {
    nomeRef.current?.focus();
    const teclado = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        if (!processando) onFechar();
      }
    };
    window.addEventListener('keydown', teclado, true);
    return () => window.removeEventListener('keydown', teclado, true);
  }, [onFechar, processando]);

  async function escolherImagem(
    event: ChangeEvent<HTMLInputElement>,
    tipo: 'imagem' | 'imagemConteudo',
  ) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setErro('');
    setProcessando(true);
    try {
      const imagem =
        tipo === 'imagem'
          ? await processarImagemItem(arquivo)
          : await processarImagemConteudoItem(arquivo);
      setRascunho((atual) => ({ ...atual, [tipo]: imagem }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível preparar a imagem.');
    } finally {
      setProcessando(false);
    }
  }
  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processando) return;
    try {
      const item = salvarItem({
        ...rascunho,
        nome: rascunho.nome.trim(),
        efeito: rascunho.categoria === 'documento' ? 'nenhum' : rascunho.efeito,
        valor: rascunho.categoria === 'documento' ? '' : rascunho.valor.trim(),
        consumivel: rascunho.categoria === 'documento' ? false : rascunho.consumivel,
      });
      // Entrega ocorre somente depois de salvar com sucesso no catálogo.
      onCriado(item, quantidade);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o item.');
    }
  }
  return createPortal(
    <div
      className="imp-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !processando) onFechar();
      }}
    >
      <section
        className="imp-modal-item"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="imp-modal-cabecalho">
          <div>
            <span>PORTAL DO MESTRE · INVENTÁRIO</span>
            <h2 id={tituloId}>Criar item</h2>
            <p>Cadastre um item para o catálogo e entregue ao personagem sem sair da mesa.</p>
          </div>
          <button
            type="button"
            aria-label="Fechar criação de item"
            disabled={processando}
            onClick={onFechar}
          >
            ×
          </button>
        </header>
        <form className="imp-modal-form" onSubmit={salvar}>
          <div className="imp-modal-campos">
            <label>
              Nome do item
              <input
                ref={nomeRef}
                required
                maxLength={80}
                value={rascunho.nome}
                placeholder="Ex.: Carta selada"
                onChange={(e) => mudar('nome', e.target.value)}
              />
            </label>
            <div className="imp-modal-dupla">
              <label>
                Categoria
                <select
                  value={rascunho.categoria}
                  onChange={(e) => {
                    const categoria = e.target.value as CategoriaItem;
                    setRascunho((atual) => ({
                      ...atual,
                      categoria,
                      ...(categoria === 'documento'
                        ? { efeito: 'nenhum' as const, valor: '', consumivel: false }
                        : {}),
                    }));
                  }}
                >
                  {(Object.keys(CATEGORIAS) as CategoriaItem[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIAS[c]}
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
                  {(Object.keys(EFEITOS) as EfeitoItem[]).map((eff) => (
                    <option key={eff} value={eff}>
                      {EFEITOS[eff]}
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
                  placeholder="Ex.: 5 ou 2d6+3"
                  onChange={(e) => mudar('valor', e.target.value)}
                />
                <small>Use um valor fixo ou uma fórmula de até 8 dados.</small>
              </label>
            )}
            <label>
              Descrição e propriedades
              <textarea
                rows={3}
                maxLength={650}
                value={rascunho.descricao}
                placeholder="Regras, alcance, condições de uso..."
                onChange={(e) => mudar('descricao', e.target.value)}
              />
            </label>
            {rascunho.categoria === 'documento' && (
              <div className="imp-modal-documento">
                <strong>Conteúdo para leitura</strong>
                <p>O texto e a imagem de leitura aparecerão no visualizador do inventário.</p>
                <label>
                  Texto completo
                  <textarea
                    rows={5}
                    maxLength={18000}
                    value={rascunho.conteudo || ''}
                    onChange={(e) => mudar('conteudo', e.target.value)}
                  />
                </label>
                <label>
                  Imagem da página (opcional)
                  <input
                    type="file"
                    disabled={processando}
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => void escolherImagem(e, 'imagemConteudo')}
                  />
                </label>
                {rascunho.imagemConteudo && (
                  <div className="imp-modal-page-preview">
                    <img src={rascunho.imagemConteudo} alt="Imagem da página do documento" />
                    <button
                      type="button"
                      disabled={processando}
                      onClick={() => mudar('imagemConteudo', undefined)}
                    >
                      Remover imagem da página
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="imp-modal-dupla imp-modal-rodape-campos">
              <label>
                Quantidade para {personagemNome}
                <input
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  value={quantidade}
                  onChange={(e) =>
                    setQuantidade(
                      Math.min(999, Math.max(1, Math.trunc(Number(e.target.value)) || 1)),
                    )
                  }
                />
              </label>
              <label className="imp-modal-check">
                <input
                  type="checkbox"
                  disabled={rascunho.categoria === 'documento'}
                  checked={rascunho.consumivel}
                  onChange={(e) => mudar('consumivel', e.target.checked)}
                />{' '}
                Consumir uma unidade ao usar
              </label>
            </div>
          </div>
          <aside className="imp-modal-visual">
            <span>APARÊNCIA</span>
            <ImagemItem
              imagem={rascunho.imagem}
              categoria={rascunho.categoria}
              nome={rascunho.nome || 'Novo item'}
            />
            <label>
              Imagem do item
              <input
                type="file"
                disabled={processando}
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={(e) => void escolherImagem(e, 'imagem')}
              />
            </label>
            <small>PNG, JPG ou WebP, até 8 MB. A imagem é otimizada localmente.</small>
            {rascunho.imagem && (
              <button
                type="button"
                disabled={processando}
                onClick={() => mudar('imagem', undefined)}
              >
                Remover imagem
              </button>
            )}
          </aside>
          {erro && (
            <p className="imp-modal-erro" role="alert">
              {erro}
            </p>
          )}
          <footer className="imp-modal-acoes">
            <span>
              {processando
                ? 'Preparando imagem…'
                : 'O item será salvo também na biblioteca do mestre.'}
            </span>
            <button type="button" disabled={processando} onClick={onFechar}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={processando || !rascunho.nome.trim()}
              className="imp-modal-confirmar"
            >
              ＋ Salvar e entregar
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
