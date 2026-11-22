import { useEffect, useId, useMemo, useState } from 'react';
import {
  CATEGORIAS,
  EFEITOS,
  listarItens,
  type CategoriaItem,
  type ItemInventario,
  type ModeloItem,
} from './itensLibrary';
import ImagemItem from './ImagemItem';
import VisualizadorItem from './VisualizadorItem';
import ModalCriarItem from './ModalCriarItem';
import './InventarioMesa.css';

type Props = {
  nome: string;
  itens: ItemInventario[];
  usaRegrasImpeto: boolean;
  onAdicionar: (item: ModeloItem, quantidade: number) => void;
  onQuantidade: (id: string, quantidade: number) => void;
  destinatarios: { id: string; nome: string }[];
  onTransferir: (itemId: string, destinatarioId: string, quantidade: number) => boolean;
  onUsar: (item: ItemInventario) => void;
  onRemover: (id: string) => void;
};
export default function InventarioMesa({
  nome,
  itens,
  usaRegrasImpeto,
  onAdicionar,
  onQuantidade,
  destinatarios,
  onTransferir,
  onUsar,
  onRemover,
}: Props) {
  const idUnico = useId();
  const [catalogo, setCatalogo] = useState<ModeloItem[]>(listarItens);
  const [catalogoId, setCatalogoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaItem | 'todas'>('todas');
  const [itemEmTransferencia, setItemEmTransferencia] = useState<string | null>(null);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [qtdTransferir, setQtdTransferir] = useState(1);
  const [novoRapido, setNovoRapido] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const itemVisualizado = itens.find((item) => item.id === visualizandoId) || null;
  const itensFiltrados = useMemo(
    () =>
      categoriaFiltro === 'todas'
        ? itens
        : itens.filter((item) => item.categoria === categoriaFiltro),
    [itens, categoriaFiltro],
  );
  function abrirTransferencia(itemId: string) {
    setItemEmTransferencia(itemId);
    setDestinatarioId('');
    setQtdTransferir(1);
    setConfirmar(null);
  }
  function concluirTransferencia(item: ItemInventario) {
    if (!destinatarioId) return;
    if (onTransferir(item.id, destinatarioId, qtdTransferir)) {
      setItemEmTransferencia(null);
      setDestinatarioId('');
      setQtdTransferir(1);
    }
  }
  useEffect(() => {
    const refresh = () => setCatalogo(listarItens());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('portal-mestre-itens-alterados', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('portal-mestre-itens-alterados', refresh);
    };
  }, []);
  const selecionado = useMemo(
    () => catalogo.find((x) => x.id === catalogoId),
    [catalogo, catalogoId],
  );
  return (
    <div className="imp-inventario">
      <div className="imp-inventario-intro">
        <strong>Inventário de {nome}</strong>
        <p>
          Itens salvos neste personagem e nesta campanha. Os efeitos do Ímpeto são aplicados somente
          quando você usa o item.
        </p>
      </div>
      <div className="imp-inventario-add">
        <label htmlFor={`${idUnico}-imp-item-catalogo`}>Entregar item do catálogo</label>
        <select
          id={`${idUnico}-imp-item-catalogo`}
          value={catalogoId}
          onChange={(e) => setCatalogoId(e.target.value)}
        >
          <option value="">Selecione um item…</option>
          {catalogo.map((x) => (
            <option value={x.id} key={x.id}>
              {x.nome} · {CATEGORIAS[x.categoria]}
            </option>
          ))}
        </select>
        {selecionado && (
          <div className="imp-item-previsualizacao">
            <ImagemItem
              imagem={selecionado.imagem}
              categoria={selecionado.categoria}
              nome={selecionado.nome}
            />
            <div>
              <strong>{selecionado.nome}</strong>
              <small>
                {CATEGORIAS[selecionado.categoria]} · {EFEITOS[selecionado.efeito]}
              </small>
            </div>
          </div>
        )}
        <div>
          <label>
            Qtd.{' '}
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              value={quantidade}
              onChange={(e) =>
                setQuantidade(Math.min(999, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))
              }
            />
          </label>
          <button
            type="button"
            className="imp-item-add-button"
            disabled={!selecionado}
            onClick={() => {
              if (selecionado) onAdicionar(selecionado, quantidade);
            }}
          >
            ＋ Entregar
          </button>
        </div>
        <button
          type="button"
          className="imp-item-criacao-atalho"
          onClick={() => setNovoRapido(true)}
        >
          ＋ Criar item
        </button>
        <a href="/itens/" target="_self">
          ⚒ Biblioteca completa de itens
        </a>
      </div>
      <div className="imp-inventario-filtros">
        <label htmlFor={`${idUnico}-imp-filtro-categoria`}>Filtrar inventário por categoria</label>
        <select
          id={`${idUnico}-imp-filtro-categoria`}
          value={categoriaFiltro}
          onChange={(e) => {
            setCategoriaFiltro(e.target.value as CategoriaItem | 'todas');
            setItemEmTransferencia(null);
          }}
        >
          <option value="todas">Todas as categorias</option>
          {(Object.keys(CATEGORIAS) as CategoriaItem[]).map((c) => (
            <option value={c} key={c}>
              {CATEGORIAS[c]}
            </option>
          ))}
        </select>
        <small>
          {itensFiltrados.length} tipo(s) de item exibido(s) ·{' '}
          {itensFiltrados.reduce((total, item) => total + item.quantidade, 0)} unidade(s)
        </small>
      </div>
      {itensFiltrados.length ? (
        <div className="imp-itens-lista">
          {itensFiltrados.map((item) => (
            <article key={item.id} className="imp-item-cartao">
              <div className="imp-item-cabecalho-visual">
                <ImagemItem imagem={item.imagem} categoria={item.categoria} nome={item.nome} />
                <div className="imp-item-texto">
                  <div className="imp-item-titulo">
                    <strong>{item.nome}</strong>
                    <span>{CATEGORIAS[item.categoria]}</span>
                  </div>
                  <small>
                    {EFEITOS[item.efeito]}
                    {item.valor ? ` · ${item.valor}` : ''}
                    {item.consumivel ? ' · Consome 1 ao usar' : ''}
                  </small>
                  {item.descricao && <p>{item.descricao}</p>}
                </div>
              </div>
              <div className="imp-item-controles">
                <button
                  type="button"
                  className="imp-item-ver"
                  onClick={() => setVisualizandoId(item.id)}
                  title={`Visualizar ${item.nome} sem consumir`}
                >
                  ▣ Ver
                </button>
                <label>
                  Qtd.{' '}
                  <input
                    aria-label={`Quantidade de ${item.nome}`}
                    type="number"
                    min={1}
                    max={9999}
                    step={1}
                    value={item.quantidade}
                    onChange={(e) => onQuantidade(item.id, Number(e.target.value))}
                  />
                </label>
                {item.categoria !== 'documento' && (
                  <button
                    type="button"
                    onClick={() => onUsar(item)}
                    disabled={
                      item.quantidade <= 0 ||
                      (usaRegrasImpeto && item.efeito !== 'nenhum' && !item.valor)
                    }
                    title={
                      item.efeito === 'dano'
                        ? 'Rolar dano (sem escolher alvo automaticamente)'
                        : 'Usar item'
                    }
                  >
                    {item.efeito === 'dano' ? '⚄ Rolar' : 'Usar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    itemEmTransferencia === item.id
                      ? setItemEmTransferencia(null)
                      : abrirTransferencia(item.id)
                  }
                  disabled={!destinatarios.length}
                  title={
                    destinatarios.length
                      ? 'Transferir item para outro personagem de jogador'
                      : 'Adicione outro personagem de jogador à campanha para transferir'
                  }
                >
                  ↗ Dar
                </button>
                {confirmar === item.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onRemover(item.id);
                        setConfirmar(null);
                      }}
                    >
                      Retirar mesmo
                    </button>
                    <button type="button" onClick={() => setConfirmar(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmar(item.id)}
                    title="Retirar todas as unidades do inventário"
                  >
                    ×
                  </button>
                )}
              </div>
              {itemEmTransferencia === item.id && (
                <div className="imp-item-transferencia" aria-label={`Transferir ${item.nome}`}>
                  <strong>Dar {item.nome} para outro personagem</strong>
                  <div className="imp-item-transferencia-campos">
                    <label>
                      Destinatário
                      <select
                        aria-label={`Destinatário de ${item.nome}`}
                        value={destinatarioId}
                        onChange={(e) => setDestinatarioId(e.target.value)}
                      >
                        <option value="">Selecione um personagem…</option>
                        {destinatarios.map((d) => (
                          <option value={d.id} key={d.id}>
                            {d.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quantidade
                      <input
                        aria-label={`Quantidade para transferir de ${item.nome}`}
                        type="number"
                        min={1}
                        max={item.quantidade}
                        step={1}
                        value={qtdTransferir}
                        onChange={(e) =>
                          setQtdTransferir(
                            Math.min(
                              item.quantidade,
                              Math.max(1, Math.trunc(Number(e.target.value)) || 1),
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <p>
                    Transfere somente a quantidade escolhida. Nenhum efeito de cura, dano ou Mana é
                    aplicado.
                  </p>
                  <div className="imp-item-transferencia-acoes">
                    <button
                      type="button"
                      disabled={
                        !destinatarioId || qtdTransferir < 1 || qtdTransferir > item.quantidade
                      }
                      onClick={() => concluirTransferencia(item)}
                    >
                      Confirmar entrega
                    </button>
                    <button type="button" onClick={() => setItemEmTransferencia(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="imp-inventario-vazio">
          {itens.length
            ? 'Nenhum item corresponde a esta categoria. Escolha outra no filtro.'
            : `Nenhum item com ${nome}. Escolha um item do catálogo para começar.`}
        </p>
      )}
      {novoRapido && (
        <ModalCriarItem
          personagemNome={nome}
          onCriado={(item, quantidade) => {
            setCatalogo(listarItens());
            setCatalogoId(item.id);
            onAdicionar(item, quantidade);
          }}
          onFechar={() => setNovoRapido(false)}
        />
      )}
      {itemVisualizado && (
        <VisualizadorItem item={itemVisualizado} onFechar={() => setVisualizandoId(null)} />
      )}
      <p className="imp-item-nota">
        Armas rolam dano, mas não atingem automaticamente outro personagem. Escudos não acumulam:
        mantém-se o maior. Consumíveis só são descontados após um uso válido. Fora do Ímpeto, os
        efeitos são apenas narrativos.
      </p>
    </div>
  );
}
