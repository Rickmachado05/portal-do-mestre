import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { listarCampanhas } from '../hexatombe/campaignLibrary';
import {
  listarMiniaturas3D,
  localizarUsoMiniatura3D,
  classificarModelosParaExclusao3D,
  excluirMiniaturaDaBiblioteca3D,
  renomearMiniaturaDaBiblioteca3D,
  validarMiniaturaGLB,
  importarMiniatura3D,
  formatarMB,
  LIMITE_BIBLIOTECA,
  LIMITE_TOTAL_BIBLIOTECA_BYTES,
  type Miniatura3DRegistro,
  type AnaliseMiniatura3D,
} from '../lib/bibliotecaMiniaturas3D';
import { urlVoltarMesa3D } from '../lib/navegacaoBibliotecaMiniaturas';
import './BibliotecaModelos3D.css';

// O visualizador WebGL é carregado apenas quando o mestre escolhe um modelo.
const PreviewMiniatura3D = lazy(() => import('../mesa3d/PreviewMiniatura3D'));

export default function BibliotecaModelos3D() {
  const voltarMesa = urlVoltarMesa3D(window.location.search);
  const [modelos, setModelos] = useState<Miniatura3DRegistro[]>(listarMiniaturas3D);
  const [selecionado, setSelecionado] = useState('');
  const [filtro, setFiltro] = useState('');
  const [aba, setAba] = useState<'biblioteca' | 'importar'>('biblioteca');
  const [avancado, setAvancado] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<AnaliseMiniatura3D | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [editarNome, setEditarNome] = useState(false);
  const [nome, setNome] = useState('');
  const [multiselecao, setMultiselecao] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const atualizar = useCallback(() => setModelos(listarMiniaturas3D()), []);
  useEffect(() => {
    window.addEventListener('focus', atualizar);
    window.addEventListener('storage', atualizar);
    window.addEventListener('portal-miniaturas-biblioteca-alterada', atualizar);
    return () => {
      window.removeEventListener('focus', atualizar);
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('portal-miniaturas-biblioteca-alterada', atualizar);
    };
  }, [atualizar]);
  const modelo = modelos.find((m) => m.id === selecionado) || null;
  const usos = useMemo(() => (modelo ? localizarUsoMiniatura3D(modelo.id) : []), [modelo, modelos]);
  const campanhas = useMemo(() => {
    try {
      return listarCampanhas();
    } catch {
      return [];
    }
  }, [modelos]);
  const modelosFiltrados = modelos.filter((m) =>
    m.nome.toLocaleLowerCase('pt-BR').includes(filtro.trim().toLocaleLowerCase('pt-BR')),
  );
  const selecionadosValidos = selecionados.filter((id) => modelos.some((m) => m.id === id));
  const selecionarModelo = (id: string) =>
    setSelecionados((anteriores) =>
      anteriores.includes(id) ? anteriores.filter((outro) => outro !== id) : [...anteriores, id],
    );
  const selecionarVisiveis = () =>
    setSelecionados((anteriores) => [
      ...new Set([...anteriores, ...modelosFiltrados.map((m) => m.id)]),
    ]);
  const desligarMultiselecao = () => {
    setMultiselecao(false);
    setSelecionados([]);
  };
  const total = modelos.reduce((n, m) => n + m.bytes, 0);
  const mostrarErro = (e: unknown) =>
    setAviso(e instanceof Error ? e.message : 'A operação não foi concluída.');
  const analisar = async (file: File | null) => {
    setArquivo(null);
    setAnalise(null);
    if (!file) return;
    setOcupado(true);
    setAviso('Verificando o GLB...');
    try {
      const resultado = await validarMiniaturaGLB(file, { modoAvancado: avancado });
      setArquivo(file);
      setAnalise(resultado);
      setAviso('Análise concluída. Confirme a importação abaixo.');
    } catch (e) {
      mostrarErro(e);
    } finally {
      setOcupado(false);
    }
  };
  const importar = async (file: File) => {
    setOcupado(true);
    setAviso('Salvando o modelo...');
    try {
      const registro = await importarMiniatura3D(file, { modoAvancado: avancado });
      atualizar();
      setSelecionado(registro.id);
      setAba('biblioteca');
      setArquivo(null);
      setAnalise(null);
      setAviso(`${registro.nome} disponível em todas as campanhas deste perfil.`);
    } catch (e) {
      mostrarErro(e);
    } finally {
      setOcupado(false);
    }
  };
  const apagar = async () => {
    if (!modelo || ocupado) return;
    if (usos.length) {
      setAviso(
        `O modelo ainda está em ${usos.length} cena(s). Remova as instâncias nas mesas antes de excluir o arquivo.`,
      );
      return;
    }
    if (
      !window.confirm(
        `Excluir definitivamente “${modelo.nome}” da biblioteca? O GLB deixará de fazer parte dos próximos backups. Essa ação não pode ser desfeita.`,
      )
    )
      return;
    setOcupado(true);
    try {
      await excluirMiniaturaDaBiblioteca3D(modelo.id);
      atualizar();
      setSelecionado('');
      setAviso('Modelo excluído da biblioteca universal do mestre.');
    } catch (e) {
      mostrarErro(e);
    } finally {
      setOcupado(false);
    }
  };
  const apagarSelecionados = async () => {
    if (ocupado || !selecionadosValidos.length) return;
    // Os GLBs vinculados a cenas nunca entram na exclusão, mesmo se foram selecionados.
    let livres: string[], protegidos: string[];
    try {
      ({ livres, protegidos } = classificarModelosParaExclusao3D(selecionadosValidos));
    } catch (e) {
      mostrarErro(e);
      return;
    }
    if (!livres.length) {
      setAviso(
        `${protegidos.length} modelo(s) em uso. Remova as instâncias nas cenas para liberar a exclusão.`,
      );
      return;
    }
    const resumo = `Excluir definitivamente ${livres.length} modelo(s) da biblioteca?\n\n${livres
      .slice(0, 8)
      .map((id) => `• ${modelos.find((m) => m.id === id)?.nome || id}`)
      .join(
        '\n',
      )}${livres.length > 8 ? `\n... e outros ${livres.length - 8}` : ''}${protegidos.length ? `\n\n${protegidos.length} modelo(s) em uso serão preservados.` : ''}\n\nOs GLBs excluídos deixam de fazer parte dos backups futuros. Esta ação não pode ser desfeita.`;
    if (!window.confirm(resumo)) return;
    setOcupado(true);
    const removidos: string[] = [];
    const falhas: string[] = [];
    try {
      for (const id of livres) {
        try {
          await excluirMiniaturaDaBiblioteca3D(id);
          removidos.push(id);
        } catch (e) {
          falhas.push(
            `${modelos.find((m) => m.id === id)?.nome || id}: ${e instanceof Error ? e.message : 'erro ao excluir'}`,
          );
        }
      }
      atualizar();
      setSelecionados((anteriores) => anteriores.filter((id) => !removidos.includes(id)));
      if (removidos.includes(selecionado)) {
        setSelecionado('');
        setEditarNome(false);
      }
      setAviso(
        `${removidos.length} modelo(s) excluído(s).${protegidos.length ? ` ${protegidos.length} preservado(s) por estarem em uso.` : ''}${falhas.length ? ` ${falhas.length} não puderam ser excluídos: ${falhas.slice(0, 2).join('; ')}` : ''}`,
      );
    } finally {
      setOcupado(false);
    }
  };
  const renomear = () => {
    if (!modelo) return;
    const novo = nome.trim().slice(0, 70);
    if (!novo) {
      setAviso('Informe um nome para o modelo.');
      return;
    }
    try {
      renomearMiniaturaDaBiblioteca3D(modelo.id, novo);
      atualizar();
      setEditarNome(false);
      setAviso(
        'Nome atualizado na biblioteca. As miniaturas já colocadas mantêm seus nomes de cena.',
      );
    } catch (e) {
      mostrarErro(e);
    }
  };
  return (
    <section className="gm-modelos-3d" aria-label="Biblioteca geral de Miniaturas 3D">
      {voltarMesa && (
        <nav className="gm-modelos-navegacao" aria-label="Retorno à campanha">
          <a href={voltarMesa}>← Voltar à Mesa 3D</a>
          <span>Biblioteca compartilhada entre campanhas</span>
        </nav>
      )}
      <div className="gm-modelos-resumo">
        <div>
          <strong>
            {modelos.length} / {LIMITE_BIBLIOTECA}
          </strong>
          <small>Modelos na biblioteca</small>
        </div>
        <div>
          <strong>{formatarMB(total)}</strong>
          <small>Espaço utilizado</small>
        </div>
        <div>
          <strong>{formatarMB(LIMITE_TOTAL_BIBLIOTECA_BYTES)}</strong>
          <small>Limite lógico da biblioteca</small>
        </div>
      </div>
      <div className="gm-modelos-abas" role="tablist" aria-label="Seções da biblioteca">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'biblioteca'}
          className={aba === 'biblioteca' ? 'ativo' : ''}
          onClick={() => setAba('biblioteca')}
        >
          ♟ Modelos salvos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'importar'}
          className={aba === 'importar' ? 'ativo' : ''}
          onClick={() => setAba('importar')}
        >
          ＋ Importar GLB
        </button>
      </div>
      {aba === 'biblioteca' && (
        <div className="gm-modelos-layout" role="tabpanel">
          <div className="gm-modelos-catalogo">
            <div className="gm-modelos-cabecalho">
              <strong>Modelos disponíveis</strong>
              <small>Compartilhados entre campanhas</small>
            </div>
            <input
              type="search"
              aria-label="Buscar modelos 3D"
              placeholder="Buscar por nome..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <div className="gm-modelos-multiselect" aria-label="Ações da biblioteca">
              <button
                type="button"
                className={multiselecao ? 'ativo' : ''}
                aria-pressed={multiselecao}
                disabled={ocupado}
                onClick={() => (multiselecao ? desligarMultiselecao() : setMultiselecao(true))}
              >
                {multiselecao ? 'Cancelar seleção' : '☑ Selecionar vários'}
              </button>
              {multiselecao && (
                <>
                  <button
                    type="button"
                    disabled={ocupado || modelosFiltrados.length === 0}
                    onClick={selecionarVisiveis}
                  >
                    Selecionar visíveis
                  </button>
                  <button
                    type="button"
                    disabled={ocupado || !selecionadosValidos.length}
                    onClick={() => setSelecionados([])}
                  >
                    Limpar seleção
                  </button>
                </>
              )}
            </div>
            {multiselecao && (
              <div className="gm-modelos-multiselect-status" aria-live="polite">
                <span>{selecionadosValidos.length} selecionado(s)</span>
                <button
                  type="button"
                  className="excluir"
                  disabled={ocupado || !selecionadosValidos.length}
                  onClick={() => void apagarSelecionados()}
                >
                  {ocupado
                    ? 'Excluindo...'
                    : `Excluir selecionados (${selecionadosValidos.length})`}
                </button>
              </div>
            )}
            <div className="gm-modelos-lista">
              {modelosFiltrados.map((m) => (
                <div
                  key={m.id}
                  className={`gm-modelos-item-row ${selecionado === m.id ? 'ativo' : ''} ${multiselecao && selecionadosValidos.includes(m.id) ? 'marcado' : ''}`}
                >
                  {multiselecao && (
                    <label className="gm-modelos-check" title={`Selecionar ${m.nome}`}>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${m.nome}`}
                        checked={selecionadosValidos.includes(m.id)}
                        disabled={ocupado}
                        onChange={() => selecionarModelo(m.id)}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="gm-modelos-item"
                    aria-pressed={selecionado === m.id}
                    onClick={() => {
                      setSelecionado(m.id);
                      setEditarNome(false);
                      setNome(m.nome);
                      setAviso('');
                    }}
                  >
                    <span aria-hidden="true" className="gm-modelos-icone">
                      ♟
                    </span>
                    <span>
                      <strong>{m.nome}</strong>
                      <small>
                        {formatarMB(m.bytes)} · {m.triangulos.toLocaleString('pt-BR')} triângulos
                        {m.animacoes ? ` · ${m.animacoes} anim.` : ''}
                      </small>
                    </span>
                    {selecionado === m.id && <b aria-label="Modelo em prévia">✓</b>}
                  </button>
                </div>
              ))}
              {modelosFiltrados.length === 0 && (
                <p className="gm-modelos-vazio">
                  {modelos.length
                    ? 'Nenhum modelo encontrado.'
                    : 'Sua biblioteca está vazia. Importe um GLB para começar.'}
                </p>
              )}
            </div>
          </div>
          <div className="gm-modelos-detalhes">
            {modelo ? (
              <>
                <div className="gm-modelos-cabecalho">
                  <div>
                    <small>MODELO SELECIONADO</small>
                    <h2>{modelo.nome}</h2>
                  </div>
                  <span className="gm-modelos-tipo">{modelo.classificacao || 'GLB'}</span>
                </div>
                <Suspense
                  fallback={<p className="gm-modelos-vazio">Preparando pré-visualização...</p>}
                >
                  <PreviewMiniatura3D key={modelo.id} modeloId={modelo.id} />
                </Suspense>
                <p className="gm-modelos-dica">
                  Arraste sobre a miniatura para girá-la. O modelo não será modificado.
                </p>
                <div className="gm-modelos-fatos">
                  <span>
                    <strong>{formatarMB(modelo.bytes)}</strong>Arquivo
                  </span>
                  <span>
                    <strong>{modelo.triangulos.toLocaleString('pt-BR')}</strong>Triângulos
                  </span>
                  <span>
                    <strong>{modelo.animacoes || 0}</strong>Animações
                  </span>
                </div>
                <div className="gm-modelos-acoes">
                  {editarNome ? (
                    <div className="gm-modelos-renomear">
                      <label>
                        Novo nome
                        <input
                          value={nome}
                          maxLength={70}
                          onChange={(e) => setNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renomear();
                          }}
                        />
                      </label>
                      <button type="button" onClick={renomear}>
                        Salvar nome
                      </button>
                      <button
                        type="button"
                        className="secundario"
                        onClick={() => setEditarNome(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditarNome(true);
                        setNome(modelo.nome);
                      }}
                    >
                      ✎ Renomear
                    </button>
                  )}
                  <button
                    type="button"
                    className="excluir"
                    disabled={ocupado || usos.length > 0}
                    onClick={() => void apagar()}
                  >
                    Excluir modelo
                  </button>
                </div>
                {usos.length > 0 && (
                  <div className="gm-modelos-uso" role="note">
                    <strong>Modelo em uso em {usos.length} cena(s).</strong>
                    <p>
                      Remova as miniaturas dessas cenas antes de apagar o arquivo da biblioteca:
                    </p>
                    <ul>
                      {usos.slice(0, 6).map((u, i) => (
                        <li key={`${u.campanhaId}-${u.cenaId}-${i}`}>
                          {campanhas.find((c) => c.id === u.campanhaId)?.titulo || 'Campanha'} ·
                          cena {u.cenaId.slice(0, 22)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="gm-modelos-dica">
                  Para posicionar ou vincular o modelo a um personagem, abra{' '}
                  <strong>Miniaturas 3D</strong> na mesa da campanha desejada.
                </p>
              </>
            ) : (
              <div className="gm-modelos-placeholder">
                <span>♟</span>
                <strong>Selecione um modelo</strong>
                <p>
                  Veja o GLB em 3D, renomeie e gerencie arquivos reutilizáveis entre todas as
                  campanhas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {aba === 'importar' && (
        <div className="gm-modelos-importacao" role="tabpanel">
          <div className="gm-modelos-cabecalho">
            <div>
              <small>NOVO MODELO</small>
              <h2>Importar miniatura GLB</h2>
            </div>
          </div>
          <p>
            Importe arquivos GLB com texturas incorporadas. Eles ficam disponíveis em qualquer
            campanha do perfil e são incluídos no backup completo.
          </p>
          <label className="gm-modelos-toggle">
            <input
              type="checkbox"
              checked={avancado}
              disabled={ocupado}
              onChange={(e) => {
                setAvancado(e.target.checked);
                setArquivo(null);
                setAnalise(null);
              }}
            />
            <span>
              <strong>Permitir modelos maiores</strong>
              <small>
                {avancado ? 'Modo avançado · até 100 MB por GLB' : 'Padrão · até 50 MB por GLB'}
              </small>
            </span>
          </label>
          <label className="gm-modelos-arquivo">
            Escolher arquivo .glb
            <input
              type="file"
              accept=".glb,model/gltf-binary"
              disabled={ocupado}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                e.target.value = '';
                void analisar(file);
              }}
            />
          </label>
          {analise && arquivo && (
            <div className="gm-modelos-relatorio">
              <strong>Análise de {arquivo.name}</strong>
              <p>
                {formatarMB(analise.bytes)} · {analise.triangulos.toLocaleString('pt-BR')}{' '}
                triângulos · {analise.texturas} texturas · {analise.animacoes} animações ·{' '}
                {analise.classificacao}
              </p>
              {analise.avisos.length > 0 && (
                <ul>
                  {analise.avisos.map((aviso, i) => (
                    <li key={i}>{aviso}</li>
                  ))}
                </ul>
              )}
              <div className="gm-modelos-acoes">
                <button type="button" disabled={ocupado} onClick={() => void importar(arquivo)}>
                  Confirmar importação
                </button>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => {
                    setArquivo(null);
                    setAnalise(null);
                    setAviso('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          <small>
            O limite real depende do armazenamento do navegador. Modelos em uso não poderão ser
            excluídos até serem removidos das cenas.
          </small>
        </div>
      )}
      {aviso && (
        <p className="gm-modelos-feedback" role="status">
          {aviso}
          <button type="button" onClick={() => setAviso('')} aria-label="Dispensar aviso">
            ×
          </button>
        </p>
      )}
    </section>
  );
}
