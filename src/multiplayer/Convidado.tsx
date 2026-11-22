import { capturarAparenciaDados } from './aparenciaDados';
import { enviarVideoRolagem, aguardarVideoRolagem } from './videoRolagem';
import {
  assinarDadosAoVivo,
  iniciarDadosAoVivo,
  encerrarDadosAoVivo,
  receberEventoDadosAoVivo,
  type DadosAoVivoRecebidos,
} from './dadosAoVivo';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  assinarPresenca,
  autorizar,
  chaveConvidado,
  credencialRevogada,
  limparCredencial,
  lerCredencial,
  salvarCredencial,
  solicitar,
  urlSala,
  type ConviteSala,
  type CredencialSala,
  type ResumoSala,
  type MesaPublica,
  type FichaCompartilhada,
  type RolagemCompartilhada,
  type InventarioCompartilhado,
  type PaginaDiarioCompartilhada,
} from './api';
import MesaConvidado2D from './MesaConvidado2D';
import { publicarArrasto } from './arrastoRemoto.mjs';
import './Multiplayer.css';

const codigoInicial =
  new URLSearchParams(window.location.search).get('sala')?.toUpperCase().trim() || '';
export default function Convidado() {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [apelido, setApelido] = useState('');
  const [convite, setConvite] = useState<ConviteSala | null>(null);
  const [credencial, setCredencial] = useState<CredencialSala | null>(() =>
    lerCredencial(chaveConvidado(codigoInicial)),
  );
  const [sala, setSala] = useState<ResumoSala | null>(null);
  const [mesa, setMesa] = useState<MesaPublica | null>(null);
  const mesaAtualRef = useRef<MesaPublica | null>(null);
  mesaAtualRef.current = mesa;
  const [desenhosConfirmados, setDesenhosConfirmados] = useState<string[]>([]);
  const [ficha, setFicha] = useState<FichaCompartilhada | null>(null);
  const [inventario, setInventario] = useState<InventarioCompartilhado | null>(null);
  const [paginasDiario, setPaginasDiario] = useState<PaginaDiarioCompartilhada[]>([]);
  const [pedidoPendente, setPedidoPendente] = useState<string | null>(null);
  const [mensagemItem, setMensagemItem] = useState('');
  const [rolagens, setRolagens] = useState<RolagemCompartilhada[]>([]);
  const [ultimaAnimacao, setUltimaAnimacao] = useState<RolagemCompartilhada | null>(null);
  const [videoAtual, setVideoAtual] = useState<{ rolagemId: string; url: string } | null>(null);
  const [aoVivo, setAoVivo] = useState<DadosAoVivoRecebidos | null>(null);
  const [resultadoAoVivo, setResultadoAoVivo] = useState<RolagemCompartilhada | null>(null);
  const assistidasAoVivo = useRef(new Set<string>());
  const rolagensRef = useRef<RolagemCompartilhada[]>([]);
  const videoRef = useRef<string | null>(null);
  const [visibilidadeRolagem, setVisibilidadeRolagem] = useState<'publica' | 'mestre'>('publica');
  const [formulaLivre, setFormulaLivre] = useState('1d20');
  const [rolando, setRolando] = useState(false);
  const [rolagemFisica, setRolagemFisica] = useState<{
    id: string;
    formula: string;
    faces: number;
    quantidade: number;
    modificador: number;
    acaoNome: string;
    resultado?: RolagemCompartilhada;
  } | null>(null);
  const [status, setStatus] = useState('Desconectado');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const mapaRef = useRef<HTMLDivElement | null>(null);
  const arrastoRef = useRef<{
    pointerId: number;
    id: string;
    gestoId: string;
    alvo: HTMLDivElement;
    inicioX: number;
    inicioY: number;
    ponteiroX: number;
    ponteiroY: number;
    ultimaEmissao: number;
    ultimoX: number;
    ultimoY: number;
  } | null>(null);
  const gestoArrastoRef = useRef<string | null>(null);
  const [arrastoBloqueado, setArrastoBloqueado] = useState<{
    gestoId: string;
    sequencia: number;
  } | null>(null);
  const sequenciaBloqueioRef = useRef(0);
  function iniciarGestoArrasto() {
    const gestoId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    gestoArrastoRef.current = gestoId;
    return gestoId;
  }
  function encerrarGestoArrasto(gestoId: string) {
    if (gestoArrastoRef.current === gestoId) gestoArrastoRef.current = null;
  }
  function interromperGestoNaParede(gestoId: string, cenaId: string) {
    if (gestoArrastoRef.current !== gestoId || mesaAtualRef.current?.cenaId !== cenaId) return;
    // Desativar o arrasto de verdade, sem apenas congelar a representação.
    gestoArrastoRef.current = null;
    if (movimentoMaisRecente.current?.gestoId === gestoId) movimentoMaisRecente.current = null;
    const arrasto = arrastoRef.current;
    if (arrasto?.gestoId === gestoId) {
      arrastoRef.current = null;
      if (arrasto.alvo.hasPointerCapture(arrasto.pointerId))
        arrasto.alvo.releasePointerCapture(arrasto.pointerId);
    }
    setArrastoBloqueado({ gestoId, sequencia: ++sequenciaBloqueioRef.current });
  }
  // Fila de tamanho 1: acompanha o mouse sem acumular requisições antigas.
  const movimentoMaisRecente = useRef<{
    cenaId: string;
    x: number;
    y: number;
    final: boolean;
    gestoId?: string;
  } | null>(null);
  const enviandoMovimento = useRef(false);
  const instanteUltimoEnvio = useRef(0);
  const temporizadorMovimento = useRef<number | null>(null);
  const ultimoPersonagemRef = useRef<string | null>(null);
  const geracaoDiarioRef = useRef(0);
  const meuPersonagem =
    sala?.participantes.find((p) => p.id === credencial?.id)?.personagemId || null;
  const tokenProprio = mesa?.tokens.find((t) => t.id === meuPersonagem);
  const podeMover = Boolean(
    credencial &&
    meuPersonagem &&
    tokenProprio &&
    !tokenProprio.travado &&
    (mesa?.visibilidade === 'total' || mesa?.visibilidade === 'individual') &&
    sala?.mesaControlada &&
    status === 'Conectado',
  );
  // A imagem do token usa exclusivamente a posição validada pelo mestre.
  // A posição do mouse continua servindo para solicitar movimento, mas não
  // aparece como se atravessasse paredes antes da resposta oficial.
  useEffect(() => {
    if (!/^[A-Z2-9]{8}$/.test(codigo)) {
      setConvite(null);
      return;
    }
    let ativo = true;
    void solicitar<ConviteSala>(urlSala(codigo))
      .then((info) => {
        if (ativo) {
          setConvite(info);
          setErro('');
        }
      })
      .catch((e) => {
        if (ativo) {
          setConvite(null);
          setErro(e instanceof Error ? e.message : 'Sala indisponível.');
        }
      });
    return () => {
      ativo = false;
    };
  }, [codigo]);
  useEffect(() => {
    if (!credencial) return;
    let ativo = true;
    void solicitar(`${urlSala(credencial.codigo)}/eu`, {
      headers: autorizar(credencial.token),
    }).catch((e: unknown) => {
      if (!ativo) return;
      if (credencialRevogada(e)) {
        limparCredencial(chaveConvidado(credencial.codigo));
        setCredencial(null);
        setSala(null);
        setMesa(null);
        setFicha(null);
        setInventario(null);
        setPaginasDiario([]);
        setPedidoPendente(null);
        setRolagens([]);
        setErro('Sua sessão não está mais disponível. Entre novamente.');
      } else setStatus('Reconectando…');
    });
    return () => {
      ativo = false;
    };
  }, [credencial?.codigo, credencial?.token]);
  useEffect(() => {
    if (!credencial) return;
    setStatus('Conectando…');
    void solicitar<{ mesa: MesaPublica | null }>(`${urlSala(credencial.codigo)}/mesa`, {
      headers: autorizar(credencial.token),
    })
      .then((res) =>
        setMesa((atual) =>
          atual?.cenaId === res.mesa?.cenaId && (atual.revisao || 0) > (res.mesa?.revisao || 0)
            ? atual
            : res.mesa,
        ),
      )
      .catch(() => undefined);
    let ativo = true;
    void solicitar<{ rolagens: RolagemCompartilhada[] }>(`${urlSala(credencial.codigo)}/rolagens`, {
      headers: autorizar(credencial.token),
    })
      .then((res) => {
        if (ativo)
          setRolagens((anterior) =>
            [...new Map([...res.rolagens, ...anterior].map((x) => [x.id, x])).values()].slice(-80),
          );
      })
      .catch(() => undefined);
    void solicitar<{ ficha: FichaCompartilhada | null }>(`${urlSala(credencial.codigo)}/ficha`, {
      headers: autorizar(credencial.token),
    })
      .then((res) => {
        if (ativo) setFicha(res.ficha);
      })
      .catch(() => undefined);
    void solicitar<{ inventario: InventarioCompartilhado | null }>(
      `${urlSala(credencial.codigo)}/inventario`,
      { headers: autorizar(credencial.token) },
    )
      .then((res) => {
        if (ativo) setInventario(res.inventario);
      })
      .catch(() => undefined);
    const geracaoInicialDiario = geracaoDiarioRef.current;
    void solicitar<{ paginas: PaginaDiarioCompartilhada[] }>(
      `${urlSala(credencial.codigo)}/diario`,
      { headers: autorizar(credencial.token) },
    )
      .then((res) => {
        if (ativo && geracaoDiarioRef.current === geracaoInicialDiario)
          setPaginasDiario(res.paginas);
      })
      .catch(() => undefined);
    const desassinarAoVivo = assinarDadosAoVivo(credencial, (estado, encerradaId) => {
      setAoVivo((atual) => estado || (atual?.id === encerradaId ? null : atual));
      if (estado) setResultadoAoVivo(null);
    });
    const desassinar = assinarPresenca(
      credencial,
      (evento) => {
        if (evento.tipo === 'dados-ao-vivo') {
          receberEventoDadosAoVivo(credencial, evento);
          return;
        }
        if (evento.tipo === 'encerrada') {
          limparCredencial(chaveConvidado(credencial.codigo));
          setCredencial(null);
          setSala(null);
          setMesa(null);
          setFicha(null);
          setInventario(null);
          setPaginasDiario([]);
          setPedidoPendente(null);
          setRolagens([]);
          setErro('O mestre encerrou esta sala.');
          setStatus('Encerrada');
          return;
        }
        if (evento.tipo === 'mesa') {
          setMesa((atual) =>
            atual?.cenaId === evento.mesa.cenaId &&
            (atual.revisao || 0) > (evento.mesa.revisao || 0)
              ? atual
              : evento.mesa,
          );
          return;
        }
        if (evento.tipo === 'ambiente-mesa') {
          setMesa((atual) => {
            if (!atual || atual.cenaId !== evento.cenaId) return atual;
            const cenario =
              evento.periodoDia3D && atual.cenario3D
                ? { ...atual.cenario3D, periodoDia: evento.periodoDia3D }
                : atual.cenario3D;
            return {
              ...atual,
              ambiente: evento.ambiente,
              ...(cenario ? { cenario3D: cenario } : {}),
            };
          });
          return;
        }
        if (evento.tipo === 'arrasto-bloqueado') {
          interromperGestoNaParede(evento.gestoId, evento.cenaId);
          return;
        }
        if (evento.tipo === 'arrasto-token') {
          // Atualização visual direta: não re-renderizar a mesa inteira a cada
          // movimento do mouse. Confirme também a lista de tokens já revelados.
          const atual = mesaAtualRef.current;
          if (
            atual?.cenaId === evento.cenaId &&
            atual.visibilidade === 'total' &&
            atual.tokens.some((token) => token.id === evento.id)
          ) {
            publicarArrasto(evento);
          }
          return;
        }
        if (evento.tipo === 'posicoes-tokens') {
          // Dados leves: não trazem imagens nem identidades ocultas. O servidor
          // só publica IDs que já fazem parte da cena totalmente visível.
          setMesa((atual) => {
            if (
              !atual ||
              atual.cenaId !== evento.cenaId ||
              atual.visibilidade !== 'total' ||
              (atual.revisao || 0) > evento.revisao
            )
              return atual;
            const posicoes = new Map(evento.posicoes.map((p) => [p.id, p]));
            let alterou = false;
            const tokens = atual.tokens.map((token) => {
              const pos = posicoes.get(token.id);
              if (!pos || (pos.x === token.x && pos.y === token.y)) return token;
              alterou = true;
              return { ...token, x: pos.x, y: pos.y };
            });
            return alterou || evento.revisao !== (atual.revisao || 0)
              ? { ...atual, tokens, revisao: evento.revisao }
              : atual;
          });
          return;
        }
        if (evento.tipo === 'desenho-confirmado') {
          setDesenhosConfirmados((ids) =>
            [...new Set([...ids, `${evento.cenaId}:${evento.id}`])].slice(-150),
          );
          return;
        }
        if (evento.tipo === 'ficha') {
          setFicha(evento.ficha);
          return;
        }
        if (evento.tipo === 'inventario') {
          setInventario(evento.inventario);
          return;
        }
        if (evento.tipo === 'diario') {
          geracaoDiarioRef.current++;
          setPaginasDiario(evento.paginas);
          return;
        }
        if (evento.tipo === 'resultado-item') {
          setPedidoPendente(null);
          setMensagemItem(`${evento.resultado.ok ? '✓' : '✕'} ${evento.resultado.mensagem}`);
          return;
        }
        if (evento.tipo === 'rolagem') {
          rolagensRef.current = [
            ...rolagensRef.current.filter((r) => r.id !== evento.rolagem.id),
            evento.rolagem,
          ].slice(-80);
          setRolagens((anterior) =>
            anterior.some((r) => r.id === evento.rolagem.id)
              ? anterior
              : [...anterior, evento.rolagem].slice(-80),
          );
          // O autor já está vendo sua rolagem no Dice Box real. Não lance
          // novamente a física na mesma tela com outros números.
          if (assistidasAoVivo.current.has(evento.rolagem.origemId || evento.rolagem.id)) {
            setResultadoAoVivo(evento.rolagem);
          } else if (evento.rolagem.participanteId !== credencial.id) {
            setUltimaAnimacao(evento.rolagem);
          }
          return;
        }
        if (evento.tipo === 'presenca') {
          setSala(evento.sala);
          const idAtual =
            evento.sala.participantes.find((p) => p.id === credencial.id)?.personagemId || null;
          setFicha((anterior) => (anterior?.id === idAtual ? anterior : null));
          setInventario((anterior) => (anterior?.id === idAtual ? anterior : null));
          if (ultimoPersonagemRef.current !== idAtual) {
            ultimoPersonagemRef.current = idAtual;
            const geracao = ++geracaoDiarioRef.current;
            setPaginasDiario([]); // revogação imediata ao trocar de personagem
            void solicitar<{ paginas: PaginaDiarioCompartilhada[] }>(
              `${urlSala(credencial.codigo)}/diario`,
              { headers: autorizar(credencial.token) },
            )
              .then((res) => {
                if (geracaoDiarioRef.current === geracao && ultimoPersonagemRef.current === idAtual)
                  setPaginasDiario(res.paginas);
              })
              .catch(() => undefined);
          }
          if (!idAtual) setPedidoPendente(null);
        }
      },
      (conexao) => setStatus(conexao === 'conectado' ? 'Conectado' : 'Reconectando…'),
    );
    return () => {
      ativo = false;
      desassinar();
      desassinarAoVivo();
    };
  }, [credencial?.codigo, credencial?.token]);
  useEffect(() => {
    if (!ultimaAnimacao || videoAtual?.rolagemId === ultimaAnimacao.id) return;
    const tempo = window.setTimeout(
      () => setUltimaAnimacao((atual) => (atual?.id === ultimaAnimacao.id ? null : atual)),
      17500,
    );
    return () => window.clearTimeout(tempo);
  }, [ultimaAnimacao?.id, videoAtual?.rolagemId]);
  // O servidor registra a rolagem antes de receber a captura. O cliente busca
  // pelo ID definitivo do histórico, aguardando o upload do vídeo original.
  // Não depende do evento extra de gravação (que pode se perder na reconexão).
  useEffect(() => {
    if (
      !credencial ||
      !ultimaAnimacao ||
      ultimaAnimacao.participanteId === credencial.id ||
      videoAtual?.rolagemId === ultimaAnimacao.id
    )
      return;
    let ativo = true;
    const controller = new AbortController();
    const id = ultimaAnimacao.id;
    void aguardarVideoRolagem(credencial, id, controller.signal)
      .then((url) => {
        if (!ativo) {
          URL.revokeObjectURL(url);
          return;
        }
        if (videoRef.current) URL.revokeObjectURL(videoRef.current);
        videoRef.current = url;
        setVideoAtual({ rolagemId: id, url });
      })
      .catch((e) => {
        if (ativo) console.warn('[Portal/Dados] Gravação compartilhada não recebida:', e);
      });
    return () => {
      ativo = false;
      controller.abort();
    };
  }, [credencial?.codigo, credencial?.token, ultimaAnimacao?.id, videoAtual?.rolagemId]);
  useEffect(
    () => () => {
      if (videoRef.current) URL.revokeObjectURL(videoRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!pedidoPendente) return;
    const t = window.setTimeout(() => {
      setPedidoPendente(null);
      setMensagemItem('O pedido demorou demais. Verifique a conexão do mestre antes de repetir.');
    }, 320_000);
    return () => window.clearTimeout(t);
  }, [pedidoPendente]);
  async function solicitarItem(body: {
    tipo: 'usar' | 'transferir';
    itemId: string;
    quantidade?: number;
    destinatarioId?: string;
  }) {
    if (!credencial || pedidoPendente) return;
    setMensagemItem('');
    setErro('');
    setPedidoPendente('enviando');
    try {
      const resp = await solicitar<{ pedidoId: string }>(`${urlSala(credencial.codigo)}/item`, {
        method: 'POST',
        headers: autorizar(credencial.token),
        body: JSON.stringify(body),
      });
      setPedidoPendente((anterior) => (anterior === 'enviando' ? resp.pedidoId : anterior));
    } catch (e) {
      setPedidoPendente(null);
      setErro(e instanceof Error ? e.message : 'Pedido de item recusado.');
    }
  }
  async function rolar(body: object) {
    if (!credencial || rolando) return;
    setErro('');
    setRolando(true);
    setRolagemFisica(null);
    try {
      const comando = body as { formula?: string; modalidade?: string; acaoId?: string };
      const formula = String(
        comando.formula ||
          (comando.modalidade === 'teste'
            ? '1d20'
            : ficha?.acoes.find((a) => a.id === comando.acaoId)?.valor || ''),
      );
      const aparencia = await capturarAparenciaDados(formula).catch(() => undefined);
      const resposta = await solicitar<{
        preparacao: {
          id: string;
          formula: string;
          faces: number;
          quantidade: number;
          modificador: number;
          acaoNome: string;
        };
      }>(`${urlSala(credencial.codigo)}/rolar`, {
        method: 'POST',
        headers: autorizar(credencial.token),
        body: JSON.stringify({
          tipo: 'preparar',
          comando: body,
          visibilidade: visibilidadeRolagem,
          aparencia,
        }),
      });
      // O resultado ainda NÃO existe: o próprio Dice Box do jogador vai rolar.
      // O servidor já validou a fórmula e a identidade antes de abrir a física.
      setRolagemFisica(resposta.preparacao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Rolagem recusada.');
      setRolando(false);
    }
  }
  async function concluirFisica(valores: number[]) {
    if (!credencial || !rolagemFisica || rolagemFisica.resultado) return;
    const id = rolagemFisica.id;
    try {
      const resposta = await solicitar<{ rolagem: RolagemCompartilhada }>(
        `${urlSala(credencial.codigo)}/rolar`,
        {
          method: 'POST',
          headers: autorizar(credencial.token),
          body: JSON.stringify({ tipo: 'concluir', id, dados: valores }),
        },
      );
      setRolagemFisica((atual) =>
        atual?.id === id ? { ...atual, resultado: resposta.rolagem } : atual,
      );
      window.setTimeout(() => setRolagemFisica((atual) => (atual?.id === id ? null : atual)), 1800);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao registrar rolagem física.');
      setRolagemFisica(null);
    } finally {
      setRolando(false);
    }
  }
  function erroFisica(mensagem: string) {
    if (credencial && rolagemFisica && !rolagemFisica.resultado) {
      void solicitar(`${urlSala(credencial.codigo)}/rolar`, {
        method: 'POST',
        headers: autorizar(credencial.token),
        body: JSON.stringify({ tipo: 'cancelar', id: rolagemFisica.id }),
      }).catch(() => undefined);
    }
    setErro(mensagem);
    setRolagemFisica(null);
    setRolando(false);
  }
  async function enviarDesenho(pedido: {
    cenaId: string;
    pontos: { x: number; y: number }[];
    cor: string;
    espessura: number;
  }) {
    if (!credencial || !mesa || pedido.cenaId !== mesa.cenaId) throw Error('Cena indisponível.');
    try {
      const resp = await solicitar<{ id: string }>(`${urlSala(credencial.codigo)}/desenho`, {
        method: 'POST',
        headers: autorizar(credencial.token),
        body: JSON.stringify({ ...pedido, acao: 'adicionar' }),
      });
      return resp.id;
    } catch (e) {
      if (e instanceof Error && /rota inexistente|404/i.test(e.message))
        throw Error(
          'Servidor multiplayer antigo: feche os terminais anteriores e reinicie com npm run dev:multiplayer desta versão. Depois, reabra a sala.',
        );
      throw e;
    }
  }
  async function apagarMeuDesenho(cenaId: string, id: string) {
    if (!credencial || mesa?.cenaId !== cenaId) throw Error('Cena indisponível.');
    await solicitar(`${urlSala(credencial.codigo)}/desenho`, {
      method: 'POST',
      headers: autorizar(credencial.token),
      body: JSON.stringify({ acao: 'remover', cenaId, id }),
    });
  }
  function despacharMovimento() {
    if (enviandoMovimento.current || !movimentoMaisRecente.current || !credencial) return;
    const aguardar = Math.max(0, 16 - (Date.now() - instanteUltimoEnvio.current));
    if (aguardar > 0) {
      if (temporizadorMovimento.current === null)
        temporizadorMovimento.current = window.setTimeout(() => {
          temporizadorMovimento.current = null;
          despacharMovimento();
        }, aguardar);
      return;
    }
    if (temporizadorMovimento.current !== null) {
      window.clearTimeout(temporizadorMovimento.current);
      temporizadorMovimento.current = null;
    }
    const atual = movimentoMaisRecente.current;
    movimentoMaisRecente.current = null;
    enviandoMovimento.current = true;
    instanteUltimoEnvio.current = Date.now();
    // Enquanto a requisição atual está em voo, guardar apenas o último ponto.
    void solicitar(`${urlSala(credencial.codigo)}/mover`, {
      method: 'POST',
      headers: autorizar(credencial.token),
      body: JSON.stringify(atual),
    })
      .then((resposta: { bloqueado?: boolean }) => {
        // Se o evento SSE se perder, a resposta HTTP também encerra o gesto.
        if (resposta?.bloqueado && atual.gestoId)
          interromperGestoNaParede(atual.gestoId, atual.cenaId);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Movimento recusado pela mesa.'))
      .finally(() => {
        enviandoMovimento.current = false;
        despacharMovimento();
      });
  }
  function enviarMovimento(x: number, y: number, final = false) {
    if (!credencial || !mesa || !meuPersonagem) return;
    movimentoMaisRecente.current = {
      cenaId: mesa.cenaId,
      x,
      y,
      final,
      ...(gestoArrastoRef.current ? { gestoId: gestoArrastoRef.current } : {}),
    };
    despacharMovimento();
  }
  useEffect(
    () => () => {
      movimentoMaisRecente.current = null;
      if (temporizadorMovimento.current !== null) {
        window.clearTimeout(temporizadorMovimento.current);
        temporizadorMovimento.current = null;
      }
    },
    [credencial?.codigo, credencial?.token],
  );
  function iniciarArrasto(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (e.button !== 0 || !podeMover || id !== meuPersonagem || !tokenProprio) return;
    e.preventDefault();
    e.stopPropagation();
    setErro('');
    arrastoRef.current = {
      pointerId: e.pointerId,
      id,
      gestoId: iniciarGestoArrasto(),
      alvo: e.currentTarget,
      inicioX: tokenProprio.x,
      inicioY: tokenProprio.y,
      ponteiroX: e.clientX,
      ponteiroY: e.clientY,
      ultimaEmissao: 0,
      ultimoX: tokenProprio.x,
      ultimoY: tokenProprio.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function posicaoPonteiro(e: ReactPointerEvent<HTMLDivElement>) {
    const a = arrastoRef.current,
      r = mapaRef.current?.getBoundingClientRect();
    if (!a || !r || r.width < 1 || r.height < 1) return null;
    const x = Math.max(1, Math.min(99, a.inicioX + ((e.clientX - a.ponteiroX) / r.width) * 100));
    const y = Math.max(1, Math.min(99, a.inicioY + ((e.clientY - a.ponteiroY) / r.height) * 100));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  function moverArrasto(e: ReactPointerEvent<HTMLDivElement>) {
    const a = arrastoRef.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const p = posicaoPonteiro(e);
    if (!p || !podeMover) return;
    if (Math.abs(p.x - a.ultimoX) + Math.abs(p.y - a.ultimoY) < 0.025) return;
    a.ultimaEmissao = Date.now();
    a.ultimoX = p.x;
    a.ultimoY = p.y;
    enviarMovimento(p.x, p.y);
  }
  function terminarArrasto(e: ReactPointerEvent<HTMLDivElement>) {
    const a = arrastoRef.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const p = posicaoPonteiro(e);
    arrastoRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (p && podeMover && Math.abs(p.x - a.inicioX) + Math.abs(p.y - a.inicioY) > 0.05) {
      // Final ainda pertence ao mesmo gesto para o mestre poder vetá-lo.
      enviarMovimento(p.x, p.y, true);
    }
    encerrarGestoArrasto(a.gestoId);
  }
  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const resp = await solicitar<{
        codigo: string;
        token: string;
        id: string;
        apelido: string;
        sala: ResumoSala;
      }>(`${urlSala(codigo)}/entrar`, {
        method: 'POST',
        body: JSON.stringify({ apelido }),
      });
      const nova: CredencialSala = {
        codigo: resp.codigo,
        token: resp.token,
        id: resp.id,
        apelido: resp.apelido,
        papel: 'convidado',
      };
      salvarCredencial(chaveConvidado(resp.codigo), nova);
      setCredencial(nova);
      setSala(resp.sala);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar na sala.');
    } finally {
      setCarregando(false);
    }
  }
  async function sair() {
    if (!credencial) return;
    try {
      await solicitar(`${urlSala(credencial.codigo)}/sair`, {
        method: 'POST',
        headers: autorizar(credencial.token),
      });
    } catch (e) {
      // Sair offline apenas no navegador criaria um convidado fantasma ainda
      // dono do personagem no servidor. Requer confirmação ou sessão revogada.
      if (!credencialRevogada(e)) {
        setErro(
          'Não foi possível sair com a conexão indisponível. Aguarde a reconexão e tente novamente.',
        );
        return;
      }
    }
    limparCredencial(chaveConvidado(credencial.codigo));
    setCredencial(null);
    setSala(null);
    setMesa(null);
    setFicha(null);
    setInventario(null);
    setPaginasDiario([]);
    setPedidoPendente(null);
    setRolagens([]);
    setUltimaAnimacao(null);
    setAoVivo(null);
    setResultadoAoVivo(null);
    assistidasAoVivo.current.clear();
    setRolagemFisica(null);
    setRolando(false);
    setStatus('Desconectado');
  }
  if (credencial) {
    return (
      <MesaConvidado2D
        credencial={credencial}
        sala={sala}
        status={status}
        mesa={mesa}
        meuPersonagem={meuPersonagem}
        ficha={ficha}
        inventario={inventario}
        paginasDiario={paginasDiario}
        pedidoPendente={Boolean(pedidoPendente)}
        mensagemItem={mensagemItem}
        rolagens={rolagens}
        formulaLivre={formulaLivre}
        onFormulaLivre={setFormulaLivre}
        rolando={rolando}
        erro={erro}
        aoVivo={aoVivo}
        resultadoAoVivo={resultadoAoVivo}
        onFecharAoVivo={() => setAoVivo(null)}
        onPrimeiroFrameAoVivo={() => {
          if (aoVivo) {
            assistidasAoVivo.current.add(aoVivo.id);
            setUltimaAnimacao(null);
          }
        }}
        visibilidadeRolagem={visibilidadeRolagem}
        onVisibilidadeRolagem={setVisibilidadeRolagem}
        ultimaAnimacao={ultimaAnimacao}
        onFecharAnimacao={() => {
          setUltimaAnimacao(null);
          setVideoAtual(null);
          if (videoRef.current) {
            URL.revokeObjectURL(videoRef.current);
            videoRef.current = null;
          }
        }}
        rolagemFisica={rolagemFisica}
        onResultadoFisico={(valores) => void concluirFisica(valores)}
        onErroFisico={erroFisica}
        onVideoFisico={(video) => {
          if (credencial && rolagemFisica)
            void enviarVideoRolagem(credencial, rolagemFisica.id, video).catch((e) =>
              console.warn('[Portal/Dados] Falha no envio da gravação:', e),
            );
        }}
        onStreamFisico={(stream) =>
          credencial && rolagemFisica
            ? iniciarDadosAoVivo(credencial, rolagemFisica.id, stream, visibilidadeRolagem)
            : undefined
        }
        onFimStreamFisico={() => {
          if (credencial && rolagemFisica) encerrarDadosAoVivo(credencial, rolagemFisica.id);
        }}
        videoRolagemUrl={
          videoAtual && ultimaAnimacao && videoAtual.rolagemId === ultimaAnimacao.id
            ? videoAtual.url
            : undefined
        }
        podeMover={podeMover}
        mapaRef={mapaRef}
        dragVisual={null}
        onTokenDown={iniciarArrasto}
        onTokenMove={moverArrasto}
        onTokenUp={terminarArrasto}
        onMoverPonto={(x, y, final = true) => {
          if (podeMover) enviarMovimento(x, y, final);
        }}
        onIniciarArrasto3D={iniciarGestoArrasto}
        onEncerrarArrasto3D={encerrarGestoArrasto}
        arrastoBloqueado={arrastoBloqueado}
        onEnviarDesenho={enviarDesenho}
        onApagarMeuDesenho={apagarMeuDesenho}
        desenhosConfirmados={desenhosConfirmados}
        onRolarAcao={(acaoId, modalidade) => void rolar({ tipo: 'acao', acaoId, modalidade })}
        onRolarLivre={() => void rolar({ tipo: 'livre', formula: formulaLivre })}
        onRolarFormula={(formula) => void rolar({ tipo: 'livre', formula })}
        onSolicitarItem={(pedido) => void solicitarItem(pedido)}
        onSair={() => void sair()}
      />
    );
  }
  return (
    <main className="pm-mp-convidado">
      <a className="pm-mp-marca" href="/">
        ✥ <span>PORTAL DO MESTRE</span>
      </a>
      <section className="pm-mp-entrada">
        <small>ACESSO TEMPORÁRIO · SEM CADASTRO</small>
        <h1>Entrar na aventura</h1>
        <>
          <p>
            Escolha um apelido para entrar diretamente na Mesa do Jogador. Você não precisa criar
            uma conta.
          </p>
          <label className="pm-mp-link">
            Código da sala
            <input
              value={codigo}
              onChange={(e) => {
                setCodigo(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z2-9]/g, '')
                    .slice(0, 8),
                );
                setErro('');
              }}
              placeholder="Código de 8 caracteres"
              maxLength={8}
            />
          </label>
          {convite && (
            <div className="pm-mp-resumo">
              <b>{convite.campanha}</b>
              <small>
                {convite.hostOnline ? 'Mestre conectado' : 'Aguardando o mestre se conectar'} ·{' '}
                {convite.quantidadeConvidados} convidados
              </small>
            </div>
          )}
          <form onSubmit={(e) => void entrar(e)} className="pm-mp-form">
            <label className="pm-mp-link">
              Seu apelido
              <input
                required
                minLength={2}
                maxLength={24}
                autoComplete="nickname"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Como quer aparecer na mesa?"
              />
            </label>
            <button type="submit" disabled={!convite || carregando}>
              {carregando ? 'Entrando…' : 'Entrar na sala'}
            </button>
          </form>
        </>
        {erro && (
          <p role="alert" className="pm-mp-erro">
            {erro}
          </p>
        )}
      </section>
    </main>
  );
}
