import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  assinarPresenca,
  autorizar,
  solicitar,
  urlSala,
  type CredencialSala,
  type PaginaDiarioCompartilhada,
  type RetratoGrupoPublico,
} from './api';
import { limparHtmlDiario } from '../hexatombe/htmlDiario';
import DiarioCampanha from '../hexatombe/DiarioCampanha';
import {
  type PaginaDiario,
  type OperacaoDiario,
  type PermissaoDiario,
} from '../hexatombe/registrosDiario';
import {
  atualizarDiarioJogador,
  carregarDiarioJogadorPorPersonagem,
  chaveDiarioJogador,
  guardarDiarioJogador,
} from './diarioLocalJogador';
import '../hexatombe/DiarioCampanha.css';
import './DiarioConvidado.css';

type Props = {
  paginas: PaginaDiarioCompartilhada[];
  atribuido: boolean;
  personagemId: string | null;
  personagens: RetratoGrupoPublico[];
  ativo: boolean;
  apelido: string;
  nomeCampanha: string;
  credencial: CredencialSala;
};
const tipoIcone = (tipo: string) => (tipo === 'pasta' ? '▣' : tipo === 'imagem' ? '▧' : '▤');
const dataPt = (valor: string) =>
  Number.isFinite(Date.parse(valor)) ? new Date(valor).toLocaleDateString('pt-BR') : '—';

/** Diário do personagem: acervo privado, compartilhamento por permissão e documentos recebidos. */
export default function DiarioConvidado({
  paginas,
  atribuido,
  personagemId,
  personagens,
  ativo,
  apelido,
  nomeCampanha,
  credencial,
}: Props) {
  const [secao, setSecao] = useState<'meus' | 'compartilhados'>('meus');
  const [minhas, setMinhas] = useState<PaginaDiario[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erroLocal, setErroLocal] = useState('');
  const paginasRef = useRef<PaginaDiario[]>([]);
  const filaRef = useRef<Promise<void>>(Promise.resolve());
  const publicados = useRef<Map<string, string>>(new Map());
  const [erroCompartilhar, setErroCompartilhar] = useState('');
  const [modoExterno, setModoExterno] = useState<'visualizar' | 'editar'>('visualizar');
  const [rascunhoExterno, setRascunhoExterno] = useState({
    titulo: '',
    conteudo: '',
    formato: 'texto' as 'texto' | 'html',
  });
  const [salvandoExterno, setSalvandoExterno] = useState(false);

  const chaveLegada = nomeCampanha.trim() ? chaveDiarioJogador(nomeCampanha, apelido) : '';
  const chave = chaveLegada
    ? chaveDiarioJogador(nomeCampanha, apelido, personagemId || undefined)
    : '';
  useEffect(() => {
    let valido = true;
    setCarregado(false);
    setErroLocal('');
    paginasRef.current = [];
    if (!chave)
      return () => {
        valido = false;
      };
    void (async () => {
      const local = await carregarDiarioJogadorPorPersonagem(chave, chaveLegada);
      if (!valido) return;
      // Recuperar o conteúdo editado por um destinatário durante a sessão atual.
      if (atribuido && personagemId) {
        try {
          const resposta = await solicitar<{ proprios: PaginaDiario[] }>(
            `${urlSala(credencial.codigo)}/diario-personagem`,
            { headers: autorizar(credencial.token) },
          );
          for (const remoto of resposta.proprios) {
            const i = local.findIndex((p) => p.id === remoto.id);
            if (i >= 0 && Date.parse(remoto.atualizadaEm) > Date.parse(local[i].atualizadaEm)) {
              local[i] = {
                ...local[i],
                titulo: remoto.titulo,
                conteudo: remoto.conteudo,
                imagem: remoto.imagem,
                formato: remoto.formato,
                atualizadaEm: remoto.atualizadaEm,
              };
            }
          }
          await guardarDiarioJogador(chave, local);
        } catch {
          /* A biblioteca local continua disponível mesmo com servidor desconectado. */
        }
      }
      if (valido) {
        paginasRef.current = local;
        setMinhas([...local]);
        setCarregado(true);
      }
    })().catch(() => {
      if (valido) {
        setErroLocal(
          'Não foi possível carregar as notas locais. Exporte suas anotações para manter uma cópia.',
        );
        setCarregado(true);
      }
    });
    return () => {
      valido = false;
    };
  }, [chave, chaveLegada, credencial.codigo, credencial.token, atribuido, personagemId]);
  function alterarMeuDiario(operacao: OperacaoDiario) {
    if (!carregado || !chave) return;
    const atual = atualizarDiarioJogador(paginasRef.current, operacao);
    paginasRef.current = atual;
    setMinhas(atual);
    filaRef.current = filaRef.current
      .catch(() => undefined)
      .then(() => guardarDiarioJogador(chave, atual))
      .then(() => setErroLocal(''))
      .catch(() =>
        setErroLocal(
          'Não foi possível salvar no navegador. Exporte seu diário em Markdown para não perder as alterações.',
        ),
      );
  }

  // Sincronização incremental: publica apenas documentos com destinatários.
  // Pastas concedem acesso aos filhos, como no Diário do mestre.
  useEffect(() => {
    publicados.current.clear();
  }, [credencial.codigo, personagemId]);
  useEffect(() => {
    if (!carregado || !atribuido || !personagemId) return;
    const timer = window.setTimeout(() => {
      const desejados = new Map<
        string,
        { pagina: PaginaDiario; compartilhadoCom: Record<string, PermissaoDiario> }
      >();
      for (const pagina of minhas) {
        const pasta = minhas.find((p) => p.id === pagina.pastaId && p.tipo === 'pasta');
        const compartilhadoCom = {
          ...(pasta?.compartilhadoCom || {}),
          ...(pagina.compartilhadoCom || {}),
        };
        if (Object.keys(compartilhadoCom).length)
          desejados.set(pagina.id, { pagina, compartilhadoCom });
      }
      const anteriores = publicados.current;
      const fila: Array<() => Promise<unknown>> = [];
      for (const [id, { pagina, compartilhadoCom }] of desejados) {
        const assinatura = JSON.stringify({ pagina, compartilhadoCom, personagemId });
        if (anteriores.get(id) === assinatura) continue;
        fila.push(async () => {
          await solicitar(`${urlSala(credencial.codigo)}/diario-personagem`, {
            method: 'POST',
            headers: autorizar(credencial.token),
            body: assinatura,
          });
          anteriores.set(id, assinatura);
        });
      }
      for (const id of anteriores.keys())
        if (!desejados.has(id))
          fila.push(async () => {
            await solicitar(`${urlSala(credencial.codigo)}/diario-personagem`, {
              method: 'DELETE',
              headers: autorizar(credencial.token),
              body: JSON.stringify({ id, personagemId }),
            });
            anteriores.delete(id);
          });
      filaRef.current = filaRef.current
        .catch(() => undefined)
        .then(async () => {
          for (const passo of fila)
            try {
              await passo();
              setErroCompartilhar('');
            } catch (e) {
              setErroCompartilhar(
                e instanceof Error
                  ? e.message
                  : 'Não foi possível sincronizar o Diário compartilhado.',
              );
            }
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [minhas, carregado, atribuido, personagemId, credencial.codigo, credencial.token]);
  useEffect(() => {
    if (!carregado || !atribuido || !personagemId) return;
    const desassinar = assinarPresenca(
      credencial,
      (evento) => {
        if (evento.tipo !== 'diario-pessoal-editado') return;
        const atual = paginasRef.current.find((p) => p.id === evento.paginaId);
        if (!atual) return;
        const { atualizadaEm, ...campos } = evento.campos;
        const proximas = atualizarDiarioJogador(paginasRef.current, {
          tipo: 'alterar',
          id: atual.id,
          campos,
          data: atualizadaEm,
        });
        paginasRef.current = proximas;
        setMinhas(proximas);
        filaRef.current = filaRef.current
          .catch(() => undefined)
          .then(() => guardarDiarioJogador(chave, proximas));
      },
      () => {},
    );
    return () => desassinar();
  }, [carregado, atribuido, personagemId, credencial.codigo, credencial.token, chave]);
  const destinatarios = [
    { id: 'mestre', nome: 'Mestre', cor: '#c9a873' },
    ...personagens
      .filter((p) => p.id !== personagemId)
      .map((p) => ({ id: p.id, nome: p.nome, cor: p.cor, foto: p.imagem })),
  ];
  async function editarCompartilhado() {
    const externa = paginas.find((p) => p.id === abertoId);
    if (!externa || externa.permissao !== 'editar' || externa.origem !== 'personagem') return;
    setSalvandoExterno(true);
    try {
      await solicitar(`${urlSala(credencial.codigo)}/diario-personagem`, {
        method: 'PATCH',
        headers: autorizar(credencial.token),
        body: JSON.stringify({ id: externa.id.replace(/^externo:/, ''), campos: rascunhoExterno }),
      });
      setModoExterno('visualizar');
      setErroCompartilhar('');
    } catch (e) {
      setErroCompartilhar(e instanceof Error ? e.message : 'Não foi possível salvar a edição.');
    } finally {
      setSalvandoExterno(false);
    }
  }
  const [busca, setBusca] = useState('');
  const [pastaId, setPastaId] = useState('');
  const [abertoId, setAbertoId] = useState('');
  const lista = useMemo(() => {
    const texto = busca.trim().toLocaleLowerCase('pt-BR');
    return paginas
      .filter((p) => {
        if (texto)
          return `${p.titulo} ${p.conteudo.replace(/<[^>]*>/g, ' ')}`
            .toLocaleLowerCase('pt-BR')
            .includes(texto);
        return (p.pastaId || '') === pastaId || (!pastaId && p.tipo === 'pasta');
      })
      .sort(
        (a, b) =>
          Number(b.fixada) - Number(a.fixada) || b.atualizadaEm.localeCompare(a.atualizadaEm),
      );
  }, [paginas, busca, pastaId]);
  const ativa = paginas.find((p) => p.id === abertoId && p.tipo !== 'pasta');
  useEffect(() => {
    setModoExterno('visualizar');
    if (ativa)
      setRascunhoExterno({
        titulo: ativa.titulo,
        conteudo: ativa.conteudo,
        formato: ativa.formato,
      });
  }, [abertoId]);
  const pastaAtual = paginas.find((p) => p.id === pastaId && p.tipo === 'pasta');
  useEffect(() => {
    if (abertoId && !paginas.some((p) => p.id === abertoId)) setAbertoId('');
    if (pastaId && !paginas.some((p) => p.id === pastaId && p.tipo === 'pasta')) setPastaId('');
  }, [paginas, pastaId, abertoId]);
  useEffect(() => {
    if (!ativo) setAbertoId('');
  }, [ativo]);
  useEffect(() => {
    if (!ativa) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbertoId('');
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ativa]);
  return (
    <section className="pm-bib pm-bib-compacto pm-bib-jogador" aria-label="Diário do personagem">
      <div className="pm-bib-pestanas" role="tablist" aria-label="Acervo do diário">
        <button
          type="button"
          role="tab"
          aria-selected={secao === 'meus'}
          className={secao === 'meus' ? 'ativo' : ''}
          onClick={() => {
            setSecao('meus');
            setAbertoId('');
          }}
        >
          ◈ Meu conteúdo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={secao === 'compartilhados'}
          className={secao === 'compartilhados' ? 'ativo' : ''}
          onClick={() => {
            setSecao('compartilhados');
            setAbertoId('');
          }}
        >
          ⇄ Compartilhado comigo
        </button>
      </div>
      {secao === 'meus' ? (
        <>
          {erroLocal && (
            <p role="alert" className="pm-bib-aviso">
              {erroLocal}
            </p>
          )}
          {erroCompartilhar && (
            <p role="alert" className="pm-bib-aviso">
              {erroCompartilhar}
            </p>
          )}
          {!carregado ? (
            <p className="pm-bib-vazio">Carregando suas anotações…</p>
          ) : ativo ? (
            <DiarioCampanha
              pessoalJogador
              compacto
              paginas={minhas}
              onOperacao={alterarMeuDiario}
              personagens={destinatarios}
              nomeCampanha={`${nomeCampanha} · minhas anotações`}
            />
          ) : null}
          <small className="pm-bib-local">
            Seu Diário fica salvo neste navegador. Abra Compartilhar para escolher quem pode
            Visualizar ou Editar cada nota, imagem ou pasta. Exporte (.md) para manter uma cópia.
          </small>
        </>
      ) : (
        <>
          <p className="pm-bib-intro-jogador">
            Conteúdos compartilhados pelo mestre ou por outros personagens com você.
          </p>
          {erroCompartilhar && (
            <p className="pm-bib-aviso" role="alert">
              {erroCompartilhar}
            </p>
          )}
          {!atribuido ? (
            <p className="pm-bib-vazio">Aguarde o mestre atribuir um personagem.</p>
          ) : (
            <>
              <div className="pm-bib-pesquisa">
                <input
                  type="search"
                  aria-label="Buscar no diário"
                  placeholder="Buscar documentos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="pm-bib-caminho">
                <button
                  type="button"
                  onClick={() => {
                    setPastaId('');
                    setBusca('');
                  }}
                >
                  ▣ Diário
                </button>
                {pastaAtual && (
                  <>
                    <span>›</span>
                    <strong>{pastaAtual.titulo}</strong>
                  </>
                )}
              </div>
              <div className="pm-bib-lista" aria-label="Documentos compartilhados">
                {lista.map((p) => (
                  <div
                    className={`pm-bib-linha ${p.tipo === 'pasta' ? 'pm-bib-linha-pasta' : ''}`}
                    key={p.id}
                  >
                    <button
                      type="button"
                      className="pm-bib-abrir"
                      onClick={() => {
                        if (p.tipo === 'pasta') {
                          setPastaId(p.id);
                          setBusca('');
                        } else setAbertoId(p.id);
                      }}
                    >
                      <span className="pm-bib-linha-icone">{tipoIcone(p.tipo)}</span>
                      <span className="pm-bib-linha-texto">
                        <b>
                          {p.fixada ? '★ ' : ''}
                          {p.titulo || 'Sem título'}
                        </b>
                        <small>
                          {p.tipo === 'pasta' ? 'Pasta' : p.tipo === 'imagem' ? 'Imagem' : 'Nota'} ·{' '}
                          {dataPt(p.atualizadaEm)}
                        </small>
                      </span>
                      <span className="pm-bib-chevron">›</span>
                    </button>
                  </div>
                ))}
                {!lista.length && (
                  <p className="pm-bib-vazio">
                    {paginas.length
                      ? 'Nenhum documento nesta pasta ou busca.'
                      : 'Nenhum documento foi compartilhado com seu personagem.'}
                  </p>
                )}
              </div>
              <div className="pm-bib-rodape">
                <span>
                  {paginas.filter((p) => p.tipo !== 'pasta').length} documento(s) compartilhado(s)
                </span>
                <small>Conforme permissões</small>
              </div>
            </>
          )}
        </>
      )}
      {secao === 'compartilhados' &&
        ativa &&
        createPortal(
          <div
            className="pm-jogo-diario-sobreposicao"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAbertoId('');
            }}
          >
            <section
              className="pm-bib-documento pm-jogo-diario-documento"
              role="dialog"
              aria-modal="true"
              aria-label={`Documento: ${ativa.titulo}`}
            >
              <div className="pm-bib-documento-barra">
                <span>{tipoIcone(ativa.tipo)}</span>
                <strong>{ativa.titulo || 'Sem título'}</strong>
                <button
                  type="button"
                  title="Fechar documento"
                  aria-label="Fechar documento"
                  onClick={() => setAbertoId('')}
                >
                  ×
                </button>
              </div>
              <div className="pm-bib-documento-tabs">
                <button
                  type="button"
                  className={modoExterno === 'visualizar' ? 'ativo' : ''}
                  onClick={() => setModoExterno('visualizar')}
                >
                  ◉ Visualizar
                </button>
                {ativa.permissao === 'editar' && ativa.origem === 'personagem' && (
                  <button
                    type="button"
                    className={modoExterno === 'editar' ? 'ativo' : ''}
                    onClick={() => setModoExterno('editar')}
                  >
                    ✎ Editar
                  </button>
                )}
              </div>
              <div className="pm-bib-documento-conteudo">
                {modoExterno === 'editar' &&
                ativa.permissao === 'editar' &&
                ativa.origem === 'personagem' ? (
                  <div className="pm-bib-edicao">
                    <label>
                      Título
                      <input
                        value={rascunhoExterno.titulo}
                        onChange={(e) =>
                          setRascunhoExterno((p) => ({ ...p, titulo: e.target.value }))
                        }
                        maxLength={110}
                      />
                    </label>
                    <label>
                      Conteúdo
                      <textarea
                        rows={12}
                        value={rascunhoExterno.conteudo}
                        onChange={(e) =>
                          setRascunhoExterno((p) => ({ ...p, conteudo: e.target.value }))
                        }
                        maxLength={40000}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={salvandoExterno}
                      onClick={() => void editarCompartilhado()}
                    >
                      {salvandoExterno ? 'Salvando…' : 'Salvar edição'}
                    </button>
                  </div>
                ) : (
                  <div className="pm-bib-leitura">
                    {ativa.imagem && (
                      <img
                        className="pm-bib-imagem-leitura"
                        src={ativa.imagem}
                        alt={ativa.titulo}
                      />
                    )}
                    {ativa.conteudo ? (
                      <article
                        className="pm-bib-texto-rico"
                        {...(ativa.formato === 'html'
                          ? {
                              dangerouslySetInnerHTML: { __html: limparHtmlDiario(ativa.conteudo) },
                            }
                          : {
                              children: ativa.conteudo,
                              style: { whiteSpace: 'pre-wrap' as const },
                            })}
                      />
                    ) : (
                      !ativa.imagem && <p className="pm-bib-vazio">Documento sem conteúdo.</p>
                    )}
                    <small>Atualizado em {dataPt(ativa.atualizadaEm)}</small>
                  </div>
                )}
              </div>
              <div className="pm-bib-documento-rodape">
                <span>
                  {ativa.proprietario || 'Mestre'} ·{' '}
                  {ativa.permissao === 'editar' ? 'Edição autorizada' : 'Somente leitura'}
                </span>
                <button type="button" onClick={() => setAbertoId('')}>
                  Fechar
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}
