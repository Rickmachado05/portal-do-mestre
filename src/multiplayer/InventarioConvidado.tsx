import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORIAS,
  EFEITOS,
  type CategoriaItem,
  type EfeitoItem,
} from '../hexatombe/itensLibrary';
import type { InventarioCompartilhado, ItemCompartilhado } from './api';
import ImagemItem from '../hexatombe/ImagemItem';
import VisualizadorItem from '../hexatombe/VisualizadorItem';
import '../hexatombe/InventarioMesa.css';

type Pedido = {
  tipo: 'usar' | 'transferir';
  itemId: string;
  quantidade?: number;
  destinatarioId?: string;
};
type Props = {
  inventario: InventarioCompartilhado | null;
  atribuido: boolean;
  pendente: boolean;
  online: boolean;
  onSolicitar: (pedido: Pedido) => void;
  mensagem: string;
};
export default function InventarioConvidado({
  inventario,
  atribuido,
  pendente,
  online,
  onSolicitar,
  mensagem,
}: Props) {
  const [filtro, setFiltro] = useState('todas');
  const [visualizando, setVisualizando] = useState<ItemCompartilhado | null>(null);
  const [transferindo, setTransferindo] = useState<string | null>(null);
  const [destino, setDestino] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  useEffect(() => {
    setTransferindo(null);
    setDestino('');
    setQuantidade(1);
    setVisualizando(null);
  }, [inventario?.id]);
  const itens = useMemo(
    () => inventario?.itens.filter((item) => filtro === 'todas' || item.categoria === filtro) || [],
    [inventario, filtro],
  );
  const habilitado = online && !pendente;
  function iniciarTransferencia(item: ItemCompartilhado) {
    if (transferindo === item.id) {
      setTransferindo(null);
      return;
    }
    setTransferindo(item.id);
    setDestino('');
    setQuantidade(1);
  }
  return (
    <section className="pm-mp-inventario imp-inventario" aria-label="Meu inventário">
      <div className="imp-inventario-intro">
        <strong>Inventário de {inventario?.nome || 'meu personagem'}</strong>
        <p>
          Itens salvos neste personagem e nesta campanha. Usos e transferências dependem da
          aprovação do mestre.
        </p>
      </div>
      {!atribuido ? (
        <p className="pm-mp-nota">
          Aguarde o mestre atribuir seu personagem para consultar o inventário.
        </p>
      ) : !inventario ? (
        <p className="pm-mp-nota">Aguardando o mestre publicar o inventário da campanha.</p>
      ) : (
        <>
          <div className="pm-mp-inventario-filtro imp-inventario-filtros">
            <label htmlFor="pm-filtro-jogador">Filtrar inventário por categoria</label>
            <select
              id="pm-filtro-jogador"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todas">Todas as categorias</option>
              {(Object.keys(CATEGORIAS) as CategoriaItem[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIAS[cat]}
                </option>
              ))}
            </select>
            <small>
              {itens.length} tipo(s) de item exibido(s) ·{' '}
              {itens.reduce((total, item) => total + item.quantidade, 0)} unidade(s)
            </small>
          </div>
          {itens.length === 0 ? (
            <p className="pm-mp-nota">
              {inventario.itens.length
                ? 'Nenhum item nesta categoria.'
                : 'Seu personagem ainda não possui itens.'}
            </p>
          ) : (
            <div className="pm-mp-itens imp-itens-lista">
              {itens.map((item) => (
                <article key={item.id} className="pm-mp-item imp-item-cartao">
                  <div className="pm-mp-item-cabecalho imp-item-cabecalho-visual">
                    <ImagemItem
                      imagem={item.imagem}
                      categoria={item.categoria as CategoriaItem}
                      nome={item.nome}
                    />
                    <div className="imp-item-texto">
                      <div className="imp-item-titulo">
                        <strong>{item.nome}</strong>
                        <span>{CATEGORIAS[item.categoria as CategoriaItem] || item.categoria}</span>
                      </div>
                      <small>
                        {EFEITOS[item.efeito as EfeitoItem] || item.efeito}
                        {item.valor ? ` · ${item.valor}` : ''}
                        {item.consumivel ? ' · Consome 1 ao usar' : ''}
                      </small>
                      {item.descricao && <p>{item.descricao}</p>}
                    </div>
                    <b className="pm-mp-item-quantidade">×{item.quantidade}</b>
                  </div>
                  {(item.conteudo || item.imagemConteudo) && (
                    <details className="pm-mp-item-documento">
                      <summary>▣ Visualizar documento</summary>
                      {item.imagemConteudo && (
                        <img src={item.imagemConteudo} alt={`Documento: ${item.nome}`} />
                      )}
                      {item.conteudo && <p>{item.conteudo}</p>}
                    </details>
                  )}
                  <div className="pm-mp-item-acoes imp-item-controles">
                    <button
                      type="button"
                      className="imp-item-ver"
                      onClick={() => setVisualizando(item)}
                    >
                      ▣ Ver
                    </button>
                    {item.categoria !== 'documento' && (
                      <button
                        type="button"
                        disabled={!habilitado || item.quantidade < 1}
                        onClick={() => onSolicitar({ tipo: 'usar', itemId: item.id })}
                      >
                        Usar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!habilitado || !inventario.destinatarios?.length}
                      onClick={() => iniciarTransferencia(item)}
                    >
                      ↗ Dar
                    </button>
                  </div>
                  {transferindo === item.id && (
                    <div className="pm-mp-item-transferencia imp-item-transferencia">
                      <label>
                        Personagem destinatário
                        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
                          <option value="">Escolha um jogador…</option>
                          {(inventario.destinatarios || []).map((outro) => (
                            <option key={outro.id} value={outro.id}>
                              {outro.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Quantidade
                        <input
                          type="number"
                          min="1"
                          max={item.quantidade}
                          step="1"
                          value={quantidade}
                          onChange={(e) =>
                            setQuantidade(
                              Math.min(
                                item.quantidade,
                                Math.max(1, Math.trunc(Number(e.target.value)) || 1),
                              ),
                            )
                          }
                        />
                      </label>
                      <div className="pm-mp-item-acoes">
                        <button
                          type="button"
                          disabled={!habilitado || !destino || quantidade > item.quantidade}
                          onClick={() =>
                            onSolicitar({
                              tipo: 'transferir',
                              itemId: item.id,
                              destinatarioId: destino,
                              quantidade,
                            })
                          }
                        >
                          Confirmar entrega
                        </button>
                        <button type="button" onClick={() => setTransferindo(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {!online && atribuido && (
        <p className="pm-mp-nota">
          A mesa do mestre precisa estar aberta e conectada para usar ou transferir itens.
        </p>
      )}
      {pendente && (
        <p className="pm-mp-nota" role="status">
          Aguardando a confirmação do mestre…
        </p>
      )}
      {mensagem && (
        <p className="pm-mp-item-resultado" role="status">
          {mensagem}
        </p>
      )}
      {visualizando && (
        <VisualizadorItem
          item={{
            nome: visualizando.nome,
            categoria: visualizando.categoria as CategoriaItem,
            descricao: visualizando.descricao,
            imagem: visualizando.imagem,
            conteudo: visualizando.conteudo,
            imagemConteudo: visualizando.imagemConteudo,
          }}
          onFechar={() => setVisualizando(null)}
        />
      )}
      <p className="imp-item-nota">
        Itens e documentos só são utilizados após aprovação do mestre. Ações de dano não escolhem
        alvos automaticamente.
      </p>
    </section>
  );
}
