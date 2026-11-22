import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  urlSala,
  type CredencialSala,
  type FichaCompartilhada,
  type InventarioCompartilhado,
  type MesaPublica,
  type ResumoSala,
  type RolagemCompartilhada,
  type PaginaDiarioCompartilhada,
} from './api';
import FichaConvidado from './FichaConvidado';
import CombateConvidado from './CombateConvidado';
import HudTurnoConvidado, { habilitarHudTurnoJogador } from './HudTurnoConvidado';
import type { PontoMenuCombate } from '../hexatombe/posicaoMenuCombate';
import InventarioConvidado from './InventarioConvidado';
import HistoricoRolagens from './HistoricoRolagens';
import EditorDados from '../EditorDados';
import Rolagem3DMultiplayer from './Rolagem3DMultiplayer';
import Dados3D from '../Dados3D';
import DiarioConvidado from './DiarioConvidado';
import ChatMesa from '../hexatombe/ChatMesaPainel';
import ImagemRetrato from '../lib/retratoResponsivo';
import MesaConvidado3D from './MesaConvidado3D';
import MusicaConvidado from './MusicaConvidado';
import { usePausaClimaLocal } from '../lib/pausaClimaLocal';
import { TIPOS_CLIMA, CLIMA_PADRAO } from '../lib/weather';
import MascaraVisaoConvidado2D from './MascaraVisaoConvidado2D';
import TokenConvidadoFluido from './TokenConvidadoFluido';
import AmbienteConvidado2D from './AmbienteConvidado2D';
import type { TracoDesenho } from '../lib/anotacoesMesa';
import { dimensoesPalco2D } from '../lib/dimensoesPalco2D';
import { FundoCena2D } from '../lib/CenaVisual2D';
// O estilo das janelas, galeria e barra é o mesmo usado na mesa do mestre.
import '../App.css';
import DadosAoVivoOverlay from './DadosAoVivoOverlay';
import type { DadosAoVivoRecebidos } from './dadosAoVivo';
import '../menuDireita.css';
import './MesaConvidado2D.css';
import './MesaConvidado2DParity.css';
import '../mesa3d/mesaEspelhada.css';

type Painel = 'ficha' | 'inventario' | 'dados' | 'chat' | 'diario' | 'combate' | 'musica' | 'clima';
type GrupoDireita = 'sessao' | 'apoio';
type Posicao = { x: number; y: number };
type Janela = { aberta: boolean; minimizada: boolean; posicao: Posicao; z: number };
const MENU: Record<Painel, { rotulo: string; icone: string }> = {
  combate: { rotulo: 'Iniciativa', icone: '⚔' },
  ficha: { rotulo: 'Ficha / Recursos', icone: '♥' },
  inventario: { rotulo: 'Inventário', icone: '⚔' },
  dados: { rotulo: 'Rolagens', icone: '⚄' },
  chat: { rotulo: 'Chat', icone: '◉' },
  diario: { rotulo: 'Diário', icone: '▤' },
  musica: { rotulo: 'Música', icone: '♫' },
  clima: { rotulo: 'Clima', icone: '☁' },
};
const posicoes: Record<Painel, Posicao> = {
  combate: { x: 250, y: 110 },
  ficha: { x: 225, y: 80 },
  inventario: { x: 370, y: 160 },
  dados: { x: 620, y: 255 },
  chat: { x: 265, y: 155 },
  diario: { x: 475, y: 155 },
  musica: { x: 440, y: 126 },
  clima: { x: 490, y: 200 },
};

type Props = {
  credencial: CredencialSala;
  sala: ResumoSala | null;
  status: string;
  mesa: MesaPublica | null;
  meuPersonagem: string | null;
  ficha: FichaCompartilhada | null;
  inventario: InventarioCompartilhado | null;
  paginasDiario: PaginaDiarioCompartilhada[];
  pedidoPendente: boolean;
  mensagemItem: string;
  rolagens: RolagemCompartilhada[];
  visibilidadeRolagem: 'publica' | 'mestre';
  onVisibilidadeRolagem: (v: 'publica' | 'mestre') => void;
  ultimaAnimacao: RolagemCompartilhada | null;
  onFecharAnimacao: () => void;
  rolagemFisica: {
    id: string;
    formula: string;
    faces: number;
    quantidade: number;
    modificador: number;
    acaoNome: string;
    resultado?: RolagemCompartilhada;
  } | null;
  onVideoFisico: (video: Blob) => void;
  onStreamFisico: (stream: MediaStream) => Promise<void> | void;
  onFimStreamFisico: () => void;
  aoVivo: DadosAoVivoRecebidos | null;
  resultadoAoVivo: RolagemCompartilhada | null;
  onFecharAoVivo: () => void;
  onPrimeiroFrameAoVivo: () => void;
  videoRolagemUrl?: string;
  onResultadoFisico: (valores: number[]) => void;
  onErroFisico: (mensagem: string) => void;
  formulaLivre: string;
  onFormulaLivre: (texto: string) => void;
  rolando: boolean;
  erro: string;
  podeMover: boolean;
  mapaRef: RefObject<HTMLDivElement | null>;
  dragVisual: { x: number; y: number } | null;
  onTokenDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onTokenMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onTokenUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onMoverPonto: (x: number, y: number, final?: boolean) => void;
  onIniciarArrasto3D: () => string;
  onEncerrarArrasto3D: (gestoId: string) => void;
  arrastoBloqueado: { gestoId: string; sequencia: number } | null;
  onEnviarDesenho: (pedido: {
    cenaId: string;
    pontos: { x: number; y: number }[];
    cor: string;
    espessura: number;
  }) => Promise<string>;
  onApagarMeuDesenho: (cenaId: string, id: string) => Promise<void>;
  desenhosConfirmados: string[];
  onRolarAcao: (id: string, modalidade: 'teste' | 'valor') => void;
  onRolarLivre: () => void;
  onRolarFormula: (formula: string) => void;
  onSolicitarItem: (pedido: {
    tipo: 'usar' | 'transferir';
    itemId: string;
    quantidade?: number;
    destinatarioId?: string;
  }) => void;
  onSair: () => void;
};

export default function MesaConvidado2D(props: Props) {
  const {
    credencial,
    sala,
    status,
    mesa,
    meuPersonagem,
    ficha,
    inventario,
    paginasDiario,
    pedidoPendente,
    mensagemItem,
    rolagens,
    formulaLivre,
    onFormulaLivre,
    rolando,
    erro,
    podeMover,
    mapaRef,
    dragVisual,
    visibilidadeRolagem,
    onVisibilidadeRolagem,
    ultimaAnimacao,
    onFecharAnimacao,
    rolagemFisica,
    onResultadoFisico,
    onErroFisico,
    onVideoFisico,
    onStreamFisico,
    onFimStreamFisico,
    aoVivo,
    resultadoAoVivo,
    onFecharAoVivo,
    onPrimeiroFrameAoVivo,
    videoRolagemUrl,
    onTokenDown,
    onTokenMove,
    onTokenUp,
    onMoverPonto,
    onIniciarArrasto3D,
    onEncerrarArrasto3D,
    arrastoBloqueado,
    onEnviarDesenho,
    onApagarMeuDesenho,
    desenhosConfirmados,
    onRolarAcao,
    onRolarLivre,
    onRolarFormula,
    onSolicitarItem,
    onSair,
  } = props;
  const [janelas, setJanelas] = useState<Record<Painel, Janela>>(() => ({
    diario: { aberta: false, minimizada: false, posicao: posicoes.diario, z: 7 },
    combate: { aberta: false, minimizada: false, posicao: posicoes.combate, z: 8 },
    ficha: { aberta: false, minimizada: false, posicao: posicoes.ficha, z: 3 },
    inventario: { aberta: false, minimizada: false, posicao: posicoes.inventario, z: 4 },
    dados: { aberta: false, minimizada: false, posicao: posicoes.dados, z: 5 },
    chat: { aberta: false, minimizada: false, posicao: posicoes.chat, z: 6 },
    musica: { aberta: false, minimizada: false, posicao: posicoes.musica, z: 9 },
    clima: { aberta: false, minimizada: false, posicao: posicoes.clima, z: 10 },
  }));
  const [gruposDireita, setGruposDireita] = useState<Record<GrupoDireita, boolean>>({
    sessao: true,
    apoio: true,
  });
  const proximoZ = useRef(11);
  const [pausarClima, setPausarClima] = usePausaClimaLocal();
  const climaAtual = mesa?.ambiente?.clima || CLIMA_PADRAO;
  // Janelas continuam no viewport mesmo quando o navegador é redimensionado
  // para duas mesas lado a lado. Coordenadas antigas nunca ficam fora da tela.
  const [tamanhoViewport, setTamanhoViewport] = useState(() => ({
    largura: window.innerWidth,
    altura: window.innerHeight,
  }));
  useEffect(() => {
    const atualizar = () =>
      setTamanhoViewport({ largura: window.innerWidth, altura: window.innerHeight });
    window.addEventListener('resize', atualizar);
    window.addEventListener('orientationchange', atualizar);
    return () => {
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('orientationchange', atualizar);
    };
  }, []);
  function posicaoJanelaVisivel(id: Painel, p: Posicao): Posicao {
    const largura = Math.min(
      tamanhoViewport.largura - 20,
      id === 'combate'
        ? 340
        : id === 'inventario'
          ? 550
          : id === 'dados'
            ? 525
            : id === 'diario'
              ? 520
              : id === 'chat'
                ? 415
                : id === 'musica'
                  ? 365
                  : id === 'clima'
                    ? 355
                    : 366,
    );
    const x = Math.max(8, Math.min(p.x, tamanhoViewport.largura - Math.max(40, largura) - 8));
    const y = Math.max(70, Math.min(p.y, tamanhoViewport.altura - 120));
    return { x, y };
  }
  const arrastoJanela = useRef<{
    id: Painel;
    pointerId: number;
    x: number;
    y: number;
    anterior: Posicao;
  } | null>(null);
  const combateAntes = useRef(false);
  useEffect(() => {
    const ativo = mesa?.combate?.ativo === true;
    if (ativo && !combateAntes.current) {
      setJanelas((anteriores) => ({
        ...anteriores,
        combate: { ...anteriores.combate, aberta: true, minimizada: false },
      }));
    }
    combateAntes.current = ativo;
  }, [mesa?.combate?.ativo, mesa?.cenaId]);
  const [zoom, setZoom] = useState(1);
  const [visualizacao, setVisualizacao] = useState<'2d' | '3d'>('2d');
  const [cameraJogador3D, setCameraJogador3D] = useState<
    'mesa' | 'terceira' | 'personagem' | 'tatica'
  >('mesa');
  const [ancoraPersonagem3D, setAncoraPersonagem3D] = useState<PontoMenuCombate | undefined>(
    undefined,
  );
  const [zoomTatico3D, setZoomTatico3D] = useState(100);
  const [reenquadrar3D, setReenquadrar3D] = useState(0);
  const [restaurarCamera3D, setRestaurarCamera3D] = useState(0);
  useEffect(() => {
    setCameraJogador3D('mesa');
    setZoomTatico3D(100);
    setAncoraPersonagem3D(undefined);
  }, [mesa?.cenaId]);
  useEffect(() => {
    if ((!meuPersonagem || !podeMover) && cameraJogador3D === 'terceira')
      setCameraJogador3D('mesa');
    if (!meuPersonagem && cameraJogador3D === 'personagem') setCameraJogador3D('mesa');
  }, [meuPersonagem, podeMover, cameraJogador3D]);
  const modoMestre = mesa?.modoMesa || '2d';
  // A troca de visibilidade (Fog/Visão) não muda a câmera escolhida pelo jogador.
  // Apenas uma mudança real de cena ou de dimensão proposta pelo mestre altera a aba.
  useEffect(() => {
    setVisualizacao(modoMestre === '3d' ? '3d' : '2d');
  }, [mesa?.cenaId]);
  const [pan, setPan] = useState<Posicao>({ x: 0, y: 0 });
  const [seguirToken, setSeguirToken] = useState(false);
  const [ferramentaDesenho, setFerramentaDesenho] = useState(false);
  const [corDesenho, setCorDesenho] = useState('#f0bf73');
  const [espessuraDesenho, setEspessuraDesenho] = useState(3);
  const [previaDesenho, setPreviaDesenho] = useState<TracoDesenho | null>(null);
  type PendenteDesenho = {
    idLocal: string;
    cenaId: string;
    traco: TracoDesenho;
    estado: 'enviando' | 'aguardando' | 'erro';
    idRemoto?: string;
  };
  const [pendentesDesenho, setPendentesDesenho] = useState<PendenteDesenho[]>([]);
  const desenhoPonteiro = useRef<{ pointerId: number; traco: TracoDesenho } | null>(null);
  const [meusDesenhos, setMeusDesenhos] = useState<{ cenaId: string; id: string }[]>([]);
  const [mensagemDesenho, setMensagemDesenho] = useState('');
  const desenhandoPermitido =
    Boolean(mesa) &&
    mesa?.permitirDesenhoJogadores !== false &&
    status === 'Conectado' &&
    (visualizacao === '3d'
      ? (mesa?.visibilidade === 'total' ||
          (mesa?.visibilidade === 'individual' &&
            Boolean(mesa.mascara3D) &&
            Boolean(meuPersonagem))) &&
        Boolean(mesa?.cenario3D)
      : Boolean(mesa?.imagem) &&
        (mesa?.visibilidade === 'total' ||
          (mesa?.visibilidade === 'individual' && Boolean(meuPersonagem))));
  useEffect(() => {
    if (ferramentaDesenho && !desenhandoPermitido) setFerramentaDesenho(false);
  }, [ferramentaDesenho, desenhandoPermitido]);
  useEffect(() => {
    setFerramentaDesenho(false);
    setPreviaDesenho(null);
    desenhoPonteiro.current = null;
    setMensagemDesenho('');
  }, [mesa?.cenaId]);
  // O traço só sai da pré-visualização quando a mesa publicada ou o servidor
  // confirma que o mestre o incorporou. Erros preservam o desenho para reenvio.
  const idsPublicados = mesa?.ambiente?.desenhos?.map((t) => `${mesa.cenaId}:${t.id}`) || [];
  useEffect(() => {
    const confirmados = new Set([...desenhosConfirmados, ...idsPublicados]);
    setPendentesDesenho((anteriores) => {
      const restantes = anteriores.filter(
        (t) => !(t.idRemoto && confirmados.has(`${t.cenaId}:${t.idRemoto}`)),
      );
      return restantes.length === anteriores.length ? anteriores : restantes;
    });
  }, [desenhosConfirmados, mesa?.cenaId, mesa?.ambiente?.desenhos, pendentesDesenho]);
  const tabuleiroRef = useRef<HTMLElement | null>(null);
  // Mesma area util que .mapa-viewport do mestre: zoom 100% representa
  // exatamente o mesmo tamanho relativo, nao um segundo algoritmo de CSS.
  const [medidasMapa, setMedidasMapa] = useState({ largura: 1200, altura: 700 });
  useEffect(() => {
    const palco = tabuleiroRef.current;
    if (!palco) return;
    const medir = () => {
      const largura = palco.clientWidth,
        altura = palco.clientHeight;
      setMedidasMapa((atual) =>
        atual.largura === largura && atual.altura === altura ? atual : { largura, altura },
      );
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(palco);
    return () => observador.disconnect();
  }, []);
  const inicioPan = useRef<{ pointerId: number; x: number; y: number; anterior: Posicao } | null>(
    null,
  );
  const podeMostrarMapa = mesa?.visibilidade === 'total' || mesa?.visibilidade === 'individual';
  const normalizarZoom = (valor: number) =>
    Math.max(0.6, Math.min(3, Math.round(valor * 100) / 100));

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSeguirToken(false);
  }, [mesa?.cenaId]);
  const tokenMeu = mesa?.tokens.find((t) => t.id === meuPersonagem);
  function calcularCentroToken(token: { x: number; y: number }, z = zoom): Posicao | null {
    const mapa = mapaRef.current;
    if (!mapa || !mapa.offsetWidth || !mapa.offsetHeight) return null;
    return {
      x: -((token.x - 50) / 100) * mapa.offsetWidth * z,
      y: -((token.y - 50) / 100) * mapa.offsetHeight * z,
    };
  }
  function centralizarNoPersonagem() {
    if (!tokenMeu || visualizacao !== '2d') return;
    const centro = calcularCentroToken(tokenMeu);
    if (centro) setPan(centro);
  }
  useEffect(() => {
    if (!seguirToken || visualizacao !== '2d' || !tokenMeu) return;
    const centro = calcularCentroToken(tokenMeu);
    if (centro)
      setPan((anterior) =>
        Math.abs(anterior.x - centro.x) < 0.5 && Math.abs(anterior.y - centro.y) < 0.5
          ? anterior
          : centro,
      );
  }, [seguirToken, visualizacao, tokenMeu?.x, tokenMeu?.y, zoom, mesa?.cenaId]);
  // Escuta nativa não-passiva: evita zoom da página e mantém o ponto sob o cursor.
  useEffect(() => {
    const palco = tabuleiroRef.current;
    if (!palco || visualizacao !== '2d') return;
    const roda = (event: WheelEvent) => {
      if ((event.target as HTMLElement)?.closest('.pm-jogo-janela')) return;
      event.preventDefault();
      const novo = normalizarZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1));
      if (novo === zoom) return;
      const rect = palco.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2,
        py = event.clientY - rect.top - rect.height / 2;
      setPan({ x: px - ((px - pan.x) * novo) / zoom, y: py - ((py - pan.y) * novo) / zoom });
      setZoom(novo);
      setSeguirToken(false);
    };
    palco.addEventListener('wheel', roda, { passive: false });
    return () => palco.removeEventListener('wheel', roda);
  }, [visualizacao, zoom, pan.x, pan.y]);
  function atualizarJanela(id: Painel, atualizador: (antiga: Janela) => Janela) {
    setJanelas((anteriores) => ({ ...anteriores, [id]: atualizador(anteriores[id]) }));
  }
  function focar(id: Painel) {
    const z = ++proximoZ.current;
    atualizarJanela(id, (p) => ({ ...p, z }));
  }
  function abrir(id: Painel) {
    const z = ++proximoZ.current;
    atualizarJanela(id, (p) => ({ ...p, aberta: !p.aberta, minimizada: false, z }));
  }
  function mostrar(id: Painel) {
    const z = ++proximoZ.current;
    atualizarJanela(id, (p) => ({ ...p, aberta: true, minimizada: false, z }));
  }
  function iniciarArrastoJanela(e: ReactPointerEvent<HTMLElement>, id: Painel) {
    if (e.button !== 0 || !e.target || (e.target as HTMLElement).closest('button')) return;
    const anterior = janelas[id].posicao;
    arrastoJanela.current = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, anterior };
    e.currentTarget.setPointerCapture(e.pointerId);
    focar(id);
    e.preventDefault();
  }
  function moverJanela(e: ReactPointerEvent<HTMLElement>) {
    const a = arrastoJanela.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const proxima = posicaoJanelaVisivel(a.id, {
      x: a.anterior.x + e.clientX - a.x,
      y: a.anterior.y + e.clientY - a.y,
    });
    atualizarJanela(a.id, (p) => ({ ...p, posicao: proxima }));
  }
  function pararArrastoJanela(e: ReactPointerEvent<HTMLElement>) {
    const a = arrastoJanela.current;
    if (!a || e.pointerId !== a.pointerId) return;
    arrastoJanela.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function pontoDesenho(e: ReactPointerEvent<HTMLElement>) {
    const r = mapaRef.current?.getBoundingClientRect();
    if (!r || r.width < 1 || r.height < 1) return null;
    const x = ((e.clientX - r.left) / r.width) * 100,
      y = ((e.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  function iniciarDesenho(e: ReactPointerEvent<HTMLElement>) {
    if (
      !ferramentaDesenho ||
      !desenhandoPermitido ||
      e.button !== 0 ||
      !(e.target as HTMLElement).closest('.pm-jogo-palco')
    )
      return;
    const ponto = pontoDesenho(e);
    if (!ponto) return;
    e.preventDefault();
    e.stopPropagation();
    const traco: TracoDesenho = {
      id: `previsualizacao-${Date.now()}`,
      pontos: [ponto],
      cor: corDesenho,
      espessura: espessuraDesenho,
    };
    desenhoPonteiro.current = { pointerId: e.pointerId, traco };
    setPreviaDesenho(traco);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverDesenho(e: ReactPointerEvent<HTMLElement>) {
    const atual = desenhoPonteiro.current;
    if (!atual || atual.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const ponto = pontoDesenho(e),
      ultimo = atual.traco.pontos.at(-1);
    if (
      !ponto ||
      !ultimo ||
      Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < 0.25 ||
      atual.traco.pontos.length >= 180
    )
      return;
    atual.traco = { ...atual.traco, pontos: [...atual.traco.pontos, ponto] };
    setPreviaDesenho(atual.traco);
  }
  function terminarDesenho(e: ReactPointerEvent<HTMLElement>) {
    const atual = desenhoPonteiro.current;
    if (!atual || atual.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    desenhoPonteiro.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const cenaId = mesa?.cenaId,
      final = atual.traco;
    setPreviaDesenho(null);
    if (!cenaId) return;
    const idLocal = final.id;
    setPendentesDesenho((anteriores) =>
      [...anteriores, { idLocal, cenaId, traco: final, estado: 'enviando' }].slice(-30),
    );
    void transmitirDesenho({ idLocal, cenaId, traco: final, estado: 'enviando' });
  }
  async function transmitirDesenho(item: PendenteDesenho) {
    setMensagemDesenho('');
    try {
      const id = await onEnviarDesenho({
        cenaId: item.cenaId,
        pontos: item.traco.pontos,
        cor: item.traco.cor,
        espessura: item.traco.espessura,
      });
      setMeusDesenhos((anteriores) => [...anteriores, { cenaId: item.cenaId, id }].slice(-40));
      // A resposta 201 confirma recepção pelo servidor, não salvamento na cena.
      setPendentesDesenho((anteriores) =>
        anteriores.map((p) =>
          p.idLocal === item.idLocal ? { ...p, idRemoto: id, estado: 'aguardando' } : p,
        ),
      );
      // O traço permanece na mesa até ser confirmado; sem banner desnecessário.
    } catch (e) {
      setPendentesDesenho((anteriores) =>
        anteriores.map((p) => (p.idLocal === item.idLocal ? { ...p, estado: 'erro' } : p)),
      );
      setMensagemDesenho(
        e instanceof Error ? e.message : 'Falha ao enviar o desenho. Você pode tentar novamente.',
      );
    }
  }
  function concluirDesenho3D(traco: TracoDesenho) {
    if (!desenhandoPermitido || !mesa || mesa.visibilidade === 'restrita') return;
    const pendente: PendenteDesenho = {
      idLocal: traco.id,
      cenaId: mesa.cenaId,
      traco,
      estado: 'enviando',
    };
    setPendentesDesenho((anteriores) => [...anteriores, pendente].slice(-30));
    void transmitirDesenho(pendente);
  }
  function reenviarDesenho(item: PendenteDesenho) {
    setPendentesDesenho((anteriores) =>
      anteriores.map((p) => (p.idLocal === item.idLocal ? { ...p, estado: 'enviando' } : p)),
    );
    void transmitirDesenho({ ...item, estado: 'enviando' });
  }
  function apagarUltimoDesenho() {
    const ultimo = [...meusDesenhos].reverse().find((d) => d.cenaId === mesa?.cenaId);
    if (!ultimo) return;
    void onApagarMeuDesenho(ultimo.cenaId, ultimo.id)
      .then(() => {
        setMeusDesenhos((a) => a.filter((d) => d.id !== ultimo.id));
        setPendentesDesenho((a) => a.filter((d) => d.idRemoto !== ultimo.id));
        setMensagemDesenho('');
      })
      .catch((err) =>
        setMensagemDesenho(err instanceof Error ? err.message : 'Falha ao apagar desenho.'),
      );
  }
  function iniciarPan(e: ReactPointerEvent<HTMLElement>) {
    // A câmera Three.js captura seus próprios ponteiros no modo 3D.
    if (visualizacao === '3d' || ferramentaDesenho) return;
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest('.pm-mp-token')) return;
    setSeguirToken(false);
    inicioPan.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, anterior: pan };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.button === 1) e.preventDefault();
  }
  function moverPan(e: ReactPointerEvent<HTMLElement>) {
    if (visualizacao === '3d') return;
    const inicio = inicioPan.current;
    if (!inicio || inicio.pointerId !== e.pointerId) return;
    setPan({
      x: inicio.anterior.x + e.clientX - inicio.x,
      y: inicio.anterior.y + e.clientY - inicio.y,
    });
  }
  function terminarPan(e: ReactPointerEvent<HTMLElement>) {
    if (inicioPan.current?.pointerId !== e.pointerId) return;
    inicioPan.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const aspectoMapa = mesa?.aspecto || 1.6;
  const escalaCena = mesa?.escalaMapa || 1;
  const { largura: palcoLargura, altura: palcoAltura } = dimensoesPalco2D(
    medidasMapa,
    aspectoMapa,
    escalaCena,
  );
  const mapaStyle = {
    width: `${palcoLargura}px`,
    height: `${palcoAltura}px`,
    '--pm-aspecto': String(aspectoMapa),
    '--pm-zoom': String(zoom),
    '--pm-pan-x': `${pan.x}px`,
    '--pm-pan-y': `${pan.y}px`,
    '--pm-escala-cena': String(escalaCena),
  } as CSSProperties;
  const listaParticipantes = sala?.participantes.filter((p) => p.papel === 'convidado') || [];
  // A galeria utiliza exclusivamente retratos da ficha, nunca as imagens dos tokens.
  // Cenas restritas não enviam coordenadas ocultas pelos dados do grupo.
  const grupo = mesa?.grupo || [];
  const meuRetrato = grupo.find((p) => p.id === meuPersonagem);
  const retratoProprio = meuRetrato?.imagem;
  const participantePorPersonagem = new Map(
    listaParticipantes.filter((p) => p.personagemId).map((p) => [p.personagemId!, p]),
  );
  const conteudoDados = (
    <section className="pm-jogo-historico" aria-label="Histórico de rolagens">
      <p className="aviso-pequeno">
        🌐 Rolagens da sala compartilhadas entre os participantes. Novas rolagens são feitas na
        barra de dados inferior.
      </p>
      <HistoricoRolagens rolagens={rolagens} />
    </section>
  );
  return (
    <main
      className={`pm-jogo ${visualizacao === '2d' ? 'pm-jogo--modo2d' : 'pm-jogo--modo3d'} ${ferramentaDesenho ? 'pm-jogo--desenhando' : ''}`}
      aria-label="Mesa do jogador"
    >
      {/* Exatamente a mesma textura de fundo CSS da mesa do mestre (App.css). */}
      <div className="mesa-fundo pm-jogo-fundo" aria-hidden="true" />

      <EditorDados origem="convidado" codigoSala={credencial.codigo} />
      <header className="cabecalho-mesa pm-jogo-cabecalho">
        <div className="identidade-mesa pm-jogo-marca">
          <span className="sigilo-mesa pm-jogo-sigilo">✥</span>
          <div>
            <strong>
              MESA <em>DO JOGADOR</em>
            </strong>
            <small>PORTAL DE CAMPANHAS</small>
          </div>
        </div>
        <div className="cabecalho-centro pm-jogo-centro">
          <span className="estado-sessao">● {sala?.campanha || 'Campanha'}</span>
          <span className="divisor-vertical" />
          <b>{mesa?.cenaNome || 'Aguardando cena'}</b>
        </div>
        <div className="cabecalho-acoes pm-jogo-superior-acoes">
          <span className={`pm-jogo-conexao ${status === 'Conectado' ? 'online' : ''}`}>
            ● {status}
          </span>
          <button
            type="button"
            className="pm-jogo-trocar-visao-unica"
            onClick={() => setVisualizacao((atual) => (atual === '2d' ? '3d' : '2d'))}
            disabled={
              visualizacao === '2d' &&
              (!mesa?.cenario3D ||
                (mesa.visibilidade !== 'total' && mesa.visibilidade !== 'individual'))
            }
            aria-label={visualizacao === '2d' ? 'Ir para a Mesa 3D' : 'Ir para a Mesa 2D'}
            title={visualizacao === '2d' ? 'Mudar para a Mesa 3D' : 'Mudar para a Mesa 2D'}
          >
            {visualizacao === '2d' ? '▣ Mesa 3D' : '▧ Mesa 2D'}
          </button>
          <button type="button" onClick={onSair} className="pm-jogo-sair">
            Sair da sala
          </button>
        </div>
      </header>
      <aside
        id="pm-jogo-galeria"
        className="galeria-personagens pm-jogo-personagens"
        aria-label="Fichas do grupo de jogadores"
      >
        <span className="galeria-titulo">
          GRUPO <strong>{grupo.length}</strong>
        </span>
        <div className="galeria-rolagem">
          {grupo.map((personagem) => {
            const participante = participantePorPersonagem.get(personagem.id);
            const proprio = personagem.id === meuPersonagem;
            return (
              <button
                key={personagem.id}
                className={`cartao-retrato ${proprio ? 'selecionado' : ''}`}
                type="button"
                style={{ '--cor-unidade': personagem.cor } as CSSProperties}
                title={`${personagem.nome}${participante ? ` · ${participante.apelido}${participante.conectado ? ' (online)' : ' (offline)'}` : ''}`}
                onClick={() => {
                  if (proprio) mostrar('ficha');
                }}
                aria-disabled={!proprio}
              >
                <span
                  className="borda-retrato"
                  style={{ '--cor-unidade': personagem.cor } as CSSProperties}
                >
                  {personagem.imagem ? (
                    <ImagemRetrato
                      src={
                        personagem.animacao
                          ? `${urlSala(credencial.codigo)}/midias/${personagem.animacao}?token=${encodeURIComponent(credencial.token)}`
                          : personagem.imagem
                      }
                      alt=""
                      ajuste={personagem.enquadramento}
                      onError={(e) => {
                        if (personagem.animacao && e.currentTarget.src !== personagem.imagem)
                          e.currentTarget.src = personagem.imagem!;
                      }}
                    />
                  ) : (
                    <span className="retrato-inicial">
                      {personagem.nome.slice(0, 1).toUpperCase()}
                      <small>✧</small>
                    </span>
                  )}
                </span>
                <span className="cartao-nome">{personagem.nome}</span>
                <span className="cartao-status">
                  <i style={{ background: participante?.conectado ? '#78caa3' : personagem.cor }} />
                  {proprio
                    ? 'Seu personagem'
                    : participante?.conectado
                      ? 'Online'
                      : participante
                        ? 'Offline'
                        : 'Sem jogador'}
                </span>
              </button>
            );
          })}
          {!grupo.length && <span className="pm-jogo-aguardo">Aguardando personagens</span>}
        </div>
      </aside>
      {!meuPersonagem && (
        <p className="pm-jogo-atribuicao" role="status">
          Aguardando o mestre atribuir seu personagem.
        </p>
      )}
      <section
        className="pm-jogo-tabuleiro"
        ref={tabuleiroRef}
        aria-label="Cenário compartilhado"
        onPointerDownCapture={iniciarDesenho}
        onPointerMoveCapture={moverDesenho}
        onPointerUpCapture={terminarDesenho}
        onPointerCancelCapture={terminarDesenho}
        onPointerDown={iniciarPan}
        onPointerMove={moverPan}
        onPointerUp={terminarPan}
        onPointerCancel={terminarPan}
      >
        {mesa && visualizacao === '3d' && Boolean(mesa.cenario3D) ? (
          <MesaConvidado3D
            key={mesa.cenaId}
            mesa={mesa}
            credencial={credencial}
            meuPersonagem={meuPersonagem}
            podeMover={podeMover}
            onSolicitarMovimento={onMoverPonto}
            onIniciarArrasto={onIniciarArrasto3D}
            onEncerrarArrasto={onEncerrarArrasto3D}
            arrastoBloqueado={arrastoBloqueado}
            desenhoAtivo={ferramentaDesenho && desenhandoPermitido}
            corDesenho={corDesenho}
            espessuraDesenho={espessuraDesenho}
            desenhosPendentes={pendentesDesenho
              .filter((t) => t.cenaId === mesa.cenaId)
              .map((t) => t.traco)}
            onConcluirDesenho={concluirDesenho3D}
            onProjecaoPersonagem={setAncoraPersonagem3D}
            camera={cameraJogador3D}
            zoomTatico={zoomTatico3D}
            onZoomTatico={setZoomTatico3D}
            reenquadrar={reenquadrar3D}
            restaurar={restaurarCamera3D}
            pausarClima={pausarClima}
          />
        ) : mesa ? (
          <>
            <div
              className="pm-jogo-palco pm-cena2d-palco"
              style={mapaStyle}
              ref={mapaRef}
              role="group"
              aria-label={`Mapa ${mesa.cenaNome}`}
            >
              <FundoCena2D imagem={podeMostrarMapa ? mesa.imagem : null} />
              {mesa.visibilidade === 'individual' && Boolean(mesa.mascara3D) && (
                <MascaraVisaoConvidado2D mascara={mesa.mascara3D} poligono={mesa.poligono3D} />
              )}
              {podeMostrarMapa && mesa.imagem && (
                <AmbienteConvidado2D
                  ambiente={mesa.ambiente}
                  individual={mesa.visibilidade === 'individual'}
                  pausado={pausarClima}
                  largura={palcoLargura}
                  altura={palcoAltura}
                />
              )}
              {(previaDesenho || pendentesDesenho.some((p) => p.cenaId === mesa.cenaId)) && (
                <svg
                  className="pm-jogo-desenho-preview"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {[
                    ...pendentesDesenho.filter((p) => p.cenaId === mesa.cenaId).map((p) => p.traco),
                    ...(previaDesenho ? [previaDesenho] : []),
                  ].map((traco) => (
                    <polyline
                      key={traco.id}
                      points={traco.pontos.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={traco.cor}
                      strokeWidth={traco.espessura}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
              )}
              {(!podeMostrarMapa || (mesa.visibilidade === 'individual' && !mesa.imagem)) && (
                <div className="pm-jogo-oculto">
                  <strong>◐ VISÃO LIMITADA</strong>
                  <p>
                    {mesa.visibilidade === 'individual'
                      ? 'Aguardando o recorte de visão do seu personagem.'
                      : 'O mestre ainda não publicou a visão desta cena.'}
                  </p>
                </div>
              )}
              {mesa.tokens.map((token) => (
                <TokenConvidadoFluido
                  key={`${mesa.cenaId}:${token.id}`}
                  cenaId={mesa.cenaId}
                  token={token}
                  proprio={token.id === meuPersonagem}
                  controlavel={podeMover}
                  arrasto={token.id === meuPersonagem ? dragVisual : null}
                  midiaUrl={
                    token.animacao
                      ? `${urlSala(credencial.codigo)}/midias/${token.animacao}?token=${encodeURIComponent(credencial.token)}`
                      : undefined
                  }
                  onTokenDown={onTokenDown}
                  onTokenMove={onTokenMove}
                  onTokenUp={onTokenUp}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="pm-jogo-sem-cena">
            Aguardando o mestre abrir a Mesa 2D e publicar a cena.
          </div>
        )}
        {erro && (
          <div className="pm-jogo-erro" role="alert">
            {erro}
          </div>
        )}
      </section>
      {habilitarHudTurnoJogador(mesa, meuPersonagem, cameraJogador3D, visualizacao) &&
        meuPersonagem &&
        mesa && (
          <HudTurnoConvidado
            mesa={mesa}
            personagemId={meuPersonagem}
            ficha={ficha}
            inventario={inventario}
            ancora={ancoraPersonagem3D}
            rolando={rolando}
            onRolarAcao={onRolarAcao}
            onSolicitarItem={onSolicitarItem}
            onAbrirFicha={() => mostrar('ficha')}
            onAbrirInventario={() => mostrar('inventario')}
          />
        )}
      <nav
        id="pm-jogo-atalhos"
        className="atalhos-esquerda pm-jogo-atalhos-esquerda"
        aria-label="Acessos rápidos"
      >
        <button
          type="button"
          aria-expanded={janelas.chat.aberta && !janelas.chat.minimizada}
          onClick={() => abrir('chat')}
        >
          ◉ Chat{' '}
          <small>{janelas.chat.aberta && !janelas.chat.minimizada ? 'aberto' : 'online'}</small>
        </button>
        <button
          type="button"
          aria-expanded={janelas.diario.aberta && !janelas.diario.minimizada}
          onClick={() => abrir('diario')}
        >
          ▤ Diário
        </button>
        {visualizacao === '3d' && Boolean(mesa?.cenario3D) && (
          <div className="hx-camera-mesa3d" role="group" aria-label="Câmera da Mesa 3D">
            <span className="hx-camera-titulo">VISUALIZAÇÃO 3D</span>
            <button
              type="button"
              className={cameraJogador3D === 'mesa' ? 'ativo' : ''}
              aria-pressed={cameraJogador3D === 'mesa'}
              onClick={() => setCameraJogador3D('mesa')}
            >
              ♟ Visão de Mesa
            </button>
            <button
              type="button"
              className={cameraJogador3D === 'terceira' ? 'ativo' : ''}
              aria-pressed={cameraJogador3D === 'terceira'}
              onClick={() => setCameraJogador3D('terceira')}
              disabled={!meuPersonagem || !podeMover}
              title="Acompanhe seu personagem e movimente-o com WASD, quando permitido"
            >
              ◉ Terceira Pessoa
            </button>
            <button
              type="button"
              className={cameraJogador3D === 'personagem' ? 'ativo' : ''}
              aria-pressed={cameraJogador3D === 'personagem'}
              onClick={() => setCameraJogador3D('personagem')}
              disabled={!meuPersonagem}
              title="Câmera narrativa focada exclusivamente no seu personagem"
            >
              ◈ Personagem
            </button>
            <button
              type="button"
              className={cameraJogador3D === 'tatica' ? 'ativo' : ''}
              aria-pressed={cameraJogador3D === 'tatica'}
              onClick={() => setCameraJogador3D('tatica')}
              title="Visão tática do cenário público"
            >
              ▤ Tática
            </button>
            {cameraJogador3D === 'tatica' && (
              <div className="hx-camera-zoom-tatico" aria-label="Abertura da câmera tática">
                <div className="hx-camera-zoom-tatico-topo">
                  <span>Abertura tática</span>
                  <strong>{zoomTatico3D}%</strong>
                </div>
                <div className="hx-camera-zoom-tatico-controles">
                  <button
                    type="button"
                    aria-label="Aproximar câmera tática"
                    onClick={() => setZoomTatico3D((v) => Math.max(65, v - 10))}
                  >
                    −
                  </button>
                  <input
                    aria-label="Abertura tática"
                    type="range"
                    min="65"
                    max="200"
                    step="5"
                    value={zoomTatico3D}
                    onChange={(e) => setZoomTatico3D(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    aria-label="Afastar câmera tática"
                    onClick={() => setZoomTatico3D((v) => Math.min(200, v + 10))}
                  >
                    ＋
                  </button>
                </div>
                <button
                  className="hx-camera-reenquadrar"
                  type="button"
                  onClick={() => setReenquadrar3D((v) => v + 1)}
                >
                  ⤢ Reenquadrar cena
                </button>
                <small>
                  Clique no seu token para selecionar; arraste para mover (com permissão). Botão
                  direito: girar câmera.
                </small>
              </div>
            )}
            {cameraJogador3D === 'personagem' && (
              <div className="hx-camera-personagem-dica">
                <small>Arraste para girar a câmera · Roda para aproximar ou afastar.</small>
                <button type="button" onClick={() => setRestaurarCamera3D((v) => v + 1)}>
                  ↺ Restaurar enquadramento
                </button>
              </div>
            )}
            {cameraJogador3D === 'terceira' && (
              <div className="hx-camera-personagem-dica">
                <small>
                  Mesma câmera do mestre · WASD: mover seu personagem. Arraste para girar; roda para
                  zoom.
                </small>
              </div>
            )}
          </div>
        )}
      </nav>
      <nav
        id="pm-jogo-ferramentas"
        className="atalhos-direita pm-jogo-lateral"
        aria-label="Ferramentas do jogador"
      >
        <section className="hx-dock-grupo" aria-label="Ferramentas da sessão">
          <button
            type="button"
            className="hx-dock-cabecalho"
            aria-expanded={gruposDireita.sessao}
            onClick={() => setGruposDireita((g) => ({ ...g, sessao: !g.sessao }))}
          >
            <span>SESSÃO</span>
            <span aria-hidden="true">{gruposDireita.sessao ? '⌃' : '⌄'}</span>
          </button>
          {gruposDireita.sessao && (
            <div className="hx-dock-itens">
              {(['combate', 'ficha', 'inventario', 'dados'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={janelas[id].aberta && !janelas[id].minimizada}
                  className={janelas[id].aberta && !janelas[id].minimizada ? 'ativo' : ''}
                  onClick={() => abrir(id)}
                  title={MENU[id].rotulo}
                >
                  <span aria-hidden="true">{MENU[id].icone}</span>
                  <strong>{MENU[id].rotulo}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="hx-dock-grupo" aria-label="Ferramentas de apoio do jogador">
          <button
            type="button"
            className="hx-dock-cabecalho"
            aria-expanded={gruposDireita.apoio}
            onClick={() => setGruposDireita((g) => ({ ...g, apoio: !g.apoio }))}
          >
            <span>APOIO</span>
            <span aria-hidden="true">{gruposDireita.apoio ? '⌃' : '⌄'}</span>
          </button>
          {gruposDireita.apoio && (
            <div className="hx-dock-itens">
              <button
                type="button"
                aria-pressed={janelas.musica.aberta && !janelas.musica.minimizada}
                className={janelas.musica.aberta && !janelas.musica.minimizada ? 'ativo' : ''}
                onClick={() => abrir('musica')}
                title="Música da sessão e volume individual"
              >
                <span aria-hidden="true">♫</span>
                <strong>Música</strong>
              </button>
            </div>
          )}
        </section>
        <section className="hx-dock-grupo" aria-label="Ferramentas de ambiente do jogador">
          <div className="hx-dock-cabecalho">
            <span>AMBIENTE</span>
          </div>
          <div className="hx-dock-itens">
            <button
              type="button"
              aria-pressed={janelas.clima.aberta && !janelas.clima.minimizada}
              className={janelas.clima.aberta && !janelas.clima.minimizada ? 'ativo' : ''}
              onClick={() => abrir('clima')}
              title="Clima da sessão: pausar apenas neste navegador"
            >
              <span aria-hidden="true">☁</span>
              <strong>Clima</strong>
            </button>
            <button
              type="button"
              disabled={!desenhandoPermitido}
              className={ferramentaDesenho ? 'ativo' : ''}
              aria-pressed={ferramentaDesenho}
              title={
                mesa?.permitirDesenhoJogadores === false
                  ? 'O mestre bloqueou os desenhos nesta cena'
                  : 'Desenhar no cenário 2D ou sobre o terreno 3D'
              }
              onClick={() => {
                if (
                  visualizacao === '3d' &&
                  !ferramentaDesenho &&
                  cameraJogador3D !== 'mesa' &&
                  cameraJogador3D !== 'tatica'
                )
                  setCameraJogador3D('mesa');
                setFerramentaDesenho((v) => !v);
                setSeguirToken(false);
              }}
            >
              <span aria-hidden="true">✎</span>
              <strong>Desenhar</strong>
            </button>
          </div>
        </section>
      </nav>
      {ferramentaDesenho && (
        <div className="pm-jogo-desenho-barra" role="group" aria-label="Desenhos do jogador">
          <strong>
            ✎ {visualizacao === '3d' ? 'Desenhar no terreno 3D' : 'Desenhar no mapa 2D'}
          </strong>
          <label>
            Cor{' '}
            <input
              type="color"
              aria-label="Cor do desenho"
              value={corDesenho}
              onChange={(e) => setCorDesenho(e.target.value)}
            />
          </label>
          <label>
            Esp.{' '}
            <input
              type="range"
              min="1"
              max="12"
              aria-label="Espessura do desenho"
              value={espessuraDesenho}
              onChange={(e) => setEspessuraDesenho(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={!meusDesenhos.some((d) => d.cenaId === mesa?.cenaId)}
            onClick={apagarUltimoDesenho}
            title="Remover o último traço feito por você nesta cena"
          >
            ↶ Meu último traço
          </button>
          {mensagemDesenho && <small role="status">{mensagemDesenho}</small>}
          {pendentesDesenho
            .filter((p) => p.cenaId === mesa?.cenaId && p.estado === 'erro')
            .slice(-1)
            .map((p) => (
              <span key={p.idLocal} className="pm-jogo-desenho-reenvio">
                <button type="button" onClick={() => reenviarDesenho(p)}>
                  ↻ Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPendentesDesenho((anteriores) =>
                      anteriores.filter((t) => t.idLocal !== p.idLocal),
                    )
                  }
                >
                  Descartar
                </button>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setFerramentaDesenho(false)}
            title="Fechar ferramenta de desenho"
          >
            ✕
          </button>
        </div>
      )}
      {visualizacao === '2d' && (
        <div className="pm-jogo-comandos-2d" aria-label="Controles do mapa 2D">
          <span>
            {podeMover
              ? 'Arraste o mapa para explorar · Arraste seu token para mover · Roda do mouse: zoom'
              : 'Arraste o mapa para explorar · Roda do mouse: zoom'}
          </span>
          {!podeMover && (
            <span>
              {!meuPersonagem
                ? 'Aguardando personagem'
                : !sala?.mesaControlada
                  ? 'Aguardando mesa do mestre'
                  : !tokenMeu
                    ? 'Token indisponível'
                    : tokenMeu.travado
                      ? 'Movimento bloqueado pelo mestre'
                      : 'Movimento indisponível nesta cena'}
            </span>
          )}
        </div>
      )}
      {visualizacao === '2d' && (
        <div
          className="navegacao-mapa pm-jogo-zoom pm-jogo-camera"
          aria-label="Câmera e zoom do mapa"
        >
          <div className="pm-jogo-camera-acoes" role="group" aria-label="Câmera do personagem">
            <button
              type="button"
              className="pm-jogo-camera-acao"
              onClick={centralizarNoPersonagem}
              disabled={!tokenMeu}
              title="Centralizar a câmera no meu personagem"
              aria-label="Centralizar câmera no personagem"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2" />
                <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
              </svg>
              <span>Centralizar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!seguirToken) centralizarNoPersonagem();
                setSeguirToken(!seguirToken);
              }}
              disabled={!tokenMeu}
              className={`pm-jogo-camera-acao ${seguirToken ? 'pm-jogo-seguindo' : ''}`}
              aria-pressed={seguirToken}
              title={
                seguirToken
                  ? 'Desativar câmera que segue o personagem'
                  : 'Ativar câmera que segue o personagem'
              }
              aria-label={seguirToken ? 'Desativar seguir personagem' : 'Ativar seguir personagem'}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3" />
                <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                <path d="M3 8H1m22 0h-2" />
              </svg>
              <span>{seguirToken ? 'Seguindo' : 'Seguir'}</span>
            </button>
          </div>
          <div className="pm-jogo-camera-zoom" role="group" aria-label="Controle de zoom">
            <button
              type="button"
              onClick={() => setZoom((v) => normalizarZoom(v + 0.15))}
              title="Aproximar mapa"
              aria-label="Aumentar zoom"
            >
              ＋
            </button>
            <span aria-live="off">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((v) => normalizarZoom(v - 0.15))}
              title="Afastar mapa"
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                setSeguirToken(false);
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Restaurar enquadramento do mapa"
              aria-label="Enquadrar mapa"
            >
              ⤢
            </button>
          </div>
        </div>
      )}
      <div className="barra-dados pm-jogo-dados-barra" aria-label="Barra de dados">
        <span className="barra-dados-titulo">◈ DADOS</span>
        <label className="pm-jogo-visibilidade" title="Quem poderá ver o resultado desta rolagem">
          Rolagem
          <select
            value={visibilidadeRolagem}
            onChange={(e) => onVisibilidadeRolagem(e.target.value as 'publica' | 'mestre')}
            aria-label="Visibilidade da rolagem"
          >
            <option value="publica">🌐 Pública</option>
            <option value="mestre">🔒 Só mestre</option>
          </select>
        </label>
        {([4, 6, 8, 10, 12, 20, 100] as const).map((faces) => (
          <button
            type="button"
            key={faces}
            title={`Rolar 1d${faces}`}
            className={faces === 20 ? 'd20' : ''}
            disabled={!meuPersonagem || rolando}
            onClick={() => onRolarFormula(`1d${faces}`)}
          >
            <span>⚄</span>
            <strong>d{faces}</strong>
          </button>
        ))}
        <form
          className="dados-form"
          onSubmit={(e) => {
            e.preventDefault();
            onRolarLivre();
          }}
        >
          <input
            aria-label="Expressão de dados"
            placeholder="2d6+6"
            value={formulaLivre}
            onChange={(e) => onFormulaLivre(e.target.value)}
            maxLength={18}
            disabled={!meuPersonagem || rolando}
          />
          <button type="submit" disabled={!meuPersonagem || rolando}>
            ROLAR ↗
          </button>
        </form>
        <button
          type="button"
          className="historico-atalho"
          title="Histórico de rolagens"
          aria-label="Histórico de rolagens"
          onClick={() => abrir('dados')}
        >
          ☷
        </button>
      </div>
      {aoVivo && (
        <DadosAoVivoOverlay
          key={aoVivo.id}
          stream={aoVivo.stream}
          resultado={resultadoAoVivo}
          onPrimeiroFrame={onPrimeiroFrameAoVivo}
          onFechar={onFecharAoVivo}
        />
      )}
      {ultimaAnimacao && (
        <Rolagem3DMultiplayer
          key={ultimaAnimacao.id}
          rolagem={ultimaAnimacao}
          videoUrl={videoRolagemUrl}
          onFechar={onFecharAnimacao}
          usarMinhaAparencia={ultimaAnimacao.personagemId === meuPersonagem}
        />
      )}
      {rolagemFisica && (
        <div
          className="rolagem-sobre-mapa pm-mp-rolagem-3d"
          role="status"
          aria-label="Rolagem física do jogador"
        >
          <div className="dados-lancamento pm-mp-rolagem-motor">
            <Dados3D
              key={rolagemFisica.id}
              faces={rolagemFisica.faces}
              valores={Array(rolagemFisica.quantidade).fill(0)}
              onResultado={onResultadoFisico}
              onErro={onErroFisico}
              onGravacao={onVideoFisico}
              onStream={onStreamFisico}
              onFimStream={onFimStreamFisico}
            />
          </div>
          <div className="rolagem-placar pm-mp-rolagem-placar">
            <div className="rolagem-autor">DICE BOX ORIGINAL · {rolagemFisica.acaoNome}</div>
            <strong className="rolagem-numero">{rolagemFisica.resultado?.total ?? '⚄'}</strong>
            <div className="rolagem-formula">
              {rolagemFisica.formula}
              {rolagemFisica.resultado
                ? ` [${rolagemFisica.resultado.dados.join(', ')}]`
                : ' · lançamento em andamento…'}
            </div>
          </div>
        </div>
      )}
      {(Object.keys(MENU) as Painel[]).map((id) => {
        const janela = janelas[id];
        const conteudo =
          id === 'combate' ? (
            <CombateConvidado mesa={mesa} personagemId={meuPersonagem} />
          ) : id === 'ficha' ? (
            <FichaConvidado
              ficha={ficha?.id === meuPersonagem ? ficha : null}
              atribuido={Boolean(meuPersonagem)}
              onRolarAcao={onRolarAcao}
              onRolarFormula={onRolarFormula}
              rolando={rolando}
              retrato={retratoProprio}
              enquadramento={meuRetrato?.enquadramento}
              tokenImagem={mesa?.tokens.find((t) => t.id === meuPersonagem)?.imagem}
              onAbrirInventario={() => mostrar('inventario')}
            />
          ) : id === 'inventario' ? (
            <InventarioConvidado
              inventario={inventario?.id === meuPersonagem ? inventario : null}
              atribuido={Boolean(meuPersonagem)}
              pendente={pedidoPendente}
              online={status === 'Conectado' && Boolean(sala?.mesaControlada)}
              onSolicitar={onSolicitarItem}
              mensagem={mensagemItem}
            />
          ) : id === 'dados' ? (
            conteudoDados
          ) : id === 'musica' ? (
            <MusicaConvidado credencial={credencial} />
          ) : id === 'clima' ? (
            <div className="pm-jogo-clima-painel">
              <p className="aviso-pequeno">
                O mestre escolhe o clima para toda a cena. Você pode ocultar seus efeitos neste
                navegador, sem mudar a mesa dos outros.
              </p>
              <div className="pm-jogo-clima-tipo">
                <span>Clima atual</span>
                <strong>
                  {TIPOS_CLIMA.find((t) => t.id === climaAtual.tipo)?.simbolo}{' '}
                  {TIPOS_CLIMA.find((t) => t.id === climaAtual.tipo)?.nome || 'Sem clima'}
                </strong>
              </div>
              <p className="aviso-pequeno">
                Intensidade: {climaAtual.intensidade}% · Vento: {climaAtual.vento}%
              </p>
              <label className="checkbox-token pm-jogo-clima-pausar">
                <input
                  type="checkbox"
                  checked={pausarClima}
                  onChange={(e) => setPausarClima(e.target.checked)}
                />{' '}
                Pausar clima neste navegador (2D e 3D)
              </label>
              <button
                type="button"
                className="pm-jogo-clima-alternar"
                onClick={() => setPausarClima(!pausarClima)}
              >
                {pausarClima ? '☁ Reativar efeitos climáticos' : '⏸ Pausar efeitos climáticos'}
              </button>
              <p className="aviso-pequeno">
                Esta preferência fica salva apenas no seu navegador e não modifica a configuração do
                mestre.
              </p>
            </div>
          ) : id === 'diario' ? (
            <DiarioConvidado
              paginas={paginasDiario}
              atribuido={Boolean(meuPersonagem)}
              personagemId={meuPersonagem}
              personagens={mesa?.grupo || []}
              ativo={janela.aberta && !janela.minimizada}
              apelido={credencial.apelido}
              nomeCampanha={sala?.campanha || ''}
              credencial={credencial}
            />
          ) : (
            <ChatMesa
              credencial={credencial}
              campanhaId={credencial.codigo}
              personagens={[]}
              cenaNome={mesa?.cenaNome || 'Cena'}
              visivel={janela.aberta && !janela.minimizada}
            />
          );
        const tituloJanela =
          id === 'combate'
            ? 'Iniciativa · Leitura'
            : id === 'ficha'
              ? 'Ficha de combate · Ímpeto'
              : id === 'inventario'
                ? `Inventário · ${ficha?.nome || 'Personagem'}`
                : id === 'dados'
                  ? 'Histórico de rolagens'
                  : id === 'diario'
                    ? 'Diário do personagem'
                    : id === 'musica'
                      ? 'Música da sessão'
                      : id === 'clima'
                        ? 'Clima da sessão'
                        : 'Chat da campanha';
        const posicaoVisivel = posicaoJanelaVisivel(id, janela.posicao);
        const painel = (
          <section
            key={id}
            className={`janela-flutuante pm-jogo-janela ${id === 'combate' ? 'janela-iniciativa pm-jogo-janela-combate' : id === 'ficha' ? 'janela-recursos' : id === 'inventario' ? 'janela-inventario pm-jogo-janela-inventario' : id === 'chat' ? 'janela-chat pm-jogo-janela-chat' : id === 'diario' ? 'janela-diario pm-jogo-janela-diario' : id === 'musica' ? 'janela-musica pm-jogo-janela-musica' : id === 'clima' ? 'janela-clima pm-jogo-janela-clima' : 'janela-historico pm-jogo-janela-dados'} ${janela.minimizada ? 'minimizada' : ''}`}
            aria-label={tituloJanela}
            style={{
              left: posicaoVisivel.x,
              top: posicaoVisivel.y,
              zIndex: janela.z + 25,
              display: janela.aberta ? undefined : 'none',
            }}
            onPointerDown={() => focar(id)}
          >
            <header
              className="janela-barra"
              onPointerDown={(e) => iniciarArrastoJanela(e, id)}
              onPointerMove={moverJanela}
              onPointerUp={pararArrastoJanela}
              onPointerCancel={pararArrastoJanela}
            >
              <span className="janela-icone" aria-hidden="true">
                {MENU[id].icone}
              </span>
              <strong>{tituloJanela}</strong>
              <span className="janela-barra-ajuda">ARRASTE PARA MOVER</span>
              <button
                type="button"
                title={janela.minimizada ? 'Expandir' : 'Minimizar'}
                aria-label={janela.minimizada ? 'Expandir janela' : 'Minimizar janela'}
                onClick={() => atualizarJanela(id, (p) => ({ ...p, minimizada: !p.minimizada }))}
              >
                ─
              </button>
              <button
                type="button"
                title="Fechar janela"
                aria-label="Fechar janela"
                onClick={() => atualizarJanela(id, (p) => ({ ...p, aberta: false }))}
              >
                ×
              </button>
            </header>
            {(!janela.minimizada || id === 'chat' || id === 'musica') && (
              <div
                className="janela-conteudo pm-jogo-janela-corpo"
                style={janela.minimizada ? { display: 'none' } : undefined}
              >
                {conteudo}
              </div>
            )}
          </section>
        );
        // No Three.js o canvas tem contexto de empilhamento próprio. A iniciativa
        // fica em uma camada de janela acima do canvas, sem esconder a mesa.
        return id === 'combate' && typeof document !== 'undefined'
          ? createPortal(
              <div className="pm-jogo pm-jogo-overlay-portal" key={id}>
                {painel}
              </div>,
              document.body,
            )
          : painel;
      })}
    </main>
  );
}
