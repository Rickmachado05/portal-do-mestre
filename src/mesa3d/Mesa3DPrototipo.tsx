import { tokenOcultoParaJogador } from '../lib/visibilidadeTokensMestre';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { urlBibliotecaGlobalMiniaturas3D } from '../lib/navegacaoBibliotecaMiniaturas';
import * as THREE from 'three';
import {
  chaveArquivoCampanha,
  obterCampanha,
  resolverCampanhaId,
  urlMesaCampanha,
  atualizarCampanha,
} from '../hexatombe/campaignLibrary';
import {
  listarFichas,
  papelDaFicha,
  ROTULOS_PAPEL,
  type FichaRegistro,
  type PapelFicha,
} from '../hexatombe/fichasLibrary';
import { fichaCompativel } from '../hexatombe/sistemasRpg';
import { carregarArquivo, carregarArquivos, salvarArquivo, excluirArquivo } from '../lib/storage';
import { dimensoesToken3D } from '../lib/dimensoesToken3D';
import { chaveImagemSkin, skinAtiva, parametrosIdleAtivos, skinsValidas } from '../lib/tokenSkins';
import { copiarTokenDaFicha } from '../lib/bibliotecaTokens';
import { aparenciaTokenAtiva } from '../lib/aparenciaToken';
import {
  carregarMesaCompartilhada,
  ajustarRecurso3D,
  aplicarDano3D,
  concederEscudo3D,
  adicionarItem3D,
  definirQuantidadeItem3D,
  retirarItem3D,
  entregarItem3D,
  alterarMesaCompartilhada as alterarMesaCompartilhadaBruta,
} from './administracaoMesa3D';
import InventarioMesa from '../hexatombe/InventarioMesa';
import ChatMesa from '../hexatombe/ChatMesaPainel';
import DiarioMestreMultiplayer from '../multiplayer/DiarioMestreMultiplayer';
import { publicarItemDoDiario } from '../hexatombe/itemDoDiario';
import type { OperacaoDiario } from '../hexatombe/registrosDiario';
import Dados3D from '../Dados3D';
import { publicarRolagemMestre } from '../multiplayer/publicarRolagemMestre';
import { publicarVideoRolagemMestre } from '../multiplayer/publicarVideoRolagemMestre';
import { iniciarDadosAoVivo, encerrarDadosAoVivo } from '../multiplayer/dadosAoVivo';
import MultiplayerMestre from '../multiplayer/MultiplayerMestre';
import { chaveMestre, lerCredencial } from '../multiplayer/api';
import FaixasEfeitos from '../hexatombe/FaixasEfeitos';
import {
  limitarDeslocamentoHud3D,
  lerDeslocamentoHud3D,
  salvarDeslocamentoHud3D,
  type DeslocamentoHud3D,
} from './hudEfeitos3D';
import EditorDados from '../EditorDados';
import MusicaMesa from '../MusicaMesa';
import {
  lerSessaoMesa3D,
  operarDiarioMesa3D,
  lerExpressaoDado3D,
  registrarRolagemMesa3D,
  alterarTurnoMesa3D,
  alterarParticipacaoMesa3D,
  incluirTokensDaCenaNaIniciativa3D,
  type ExpressaoDado3D,
} from './sessaoMesa3D';
import {
  idsParaEnquadrarCombate,
  ordenarParticipantesIniciativa,
} from '../lib/iniciativaParticipantes';
import { normalizarClima, TIPOS_CLIMA, type ConfigClima } from '../lib/weather';
import { criarClimaCena3D, type ControleClima3D } from './climaCena3D';
import { usePausaClimaLocal } from '../lib/pausaClimaLocal';
import {
  analisarValorItem,
  consumirItem,
  concederEscudo,
  type ItemInventario,
} from '../hexatombe/itensLibrary';
import { sistemaDaCampanha } from '../hexatombe/sistemasRpg';
import { criarSala3D, type Sala3D } from './roomScene';
import { PERIODOS_DIA_3D, AMBIENTES_3D, periodoDia3DValido } from './ambientes3D';
import { direcaoCamera, PONTO_INICIAL } from './roomLogic';
import { CAMERA_TERCEIRA_3D, posicionarCameraTerceira3D } from './cameraTerceiraCompartilhada';
import {
  ESPECIFICACOES_3D,
  TIPOS_OBJETO_3D,
  ajustarProporcaoMapaCompartilhado3D,
  dimensoesTerreno3D,
  dimensoesTerrenoDaPlanta3D,
  medidasObjeto3D,
  alinharNoChao3D,
  carregarCenario3D,
  colisaoCenario3D,
  moverNoCenario3D,
  novoObjeto3D,
  posicaoLivre3D,
  salvarCenario3D as salvarCenario3DBruto,
  tocaObjeto3D,
  type PisoCena3D,
  type Cenario3D,
  type ObjetoCena3D,
  type TipoObjeto3D,
} from './editorCena3D';
import { CHAVE_PISO_3D, CHAVE_MAPA_2D, prepararImagemPiso3D } from './pisoConstruicao3D';
import {
  percentualParaChao3D,
  chaoParaPercentual3D,
  posicaoPermitidaNaMesa3D,
  moverTokenCompartilhado3D,
  removerTokenDaCenaCompartilhada3D,
  espelharTokenCompartilhado3D,
  deslocarAlvoCamera,
} from './mesaLivre3D';
import {
  criarBarreiraCompartilhada3D as criarBarreiraCompartilhada3DBruto,
  editarBarreiraCompartilhada3D as editarBarreiraCompartilhada3DBruto,
  excluirBarreiraCompartilhada3D as excluirBarreiraCompartilhada3DBruto,
  bloqueiaMovimentoCompartilhado3D,
  ponto3DParaMapa,
} from './mapaCompartilhado3D';
import { distanciaInicialMapa3D } from './enquadramentoMesa3D';
import ImagemRetrato, { normalizarAjusteRetrato } from '../lib/retratoResponsivo';
import { intervaloHud3D, mudouFovCamera3D, mudouPosicaoHud3D } from '../lib/estabilidadeMesa3D';
import {
  calcularEnquadramentoCinematico,
  girarCameraTatica,
  girarCameraPersonagem,
  zoomCameraPersonagem,
  selecionarPontosTaticos,
  type ModoCameraCinematica,
} from './cameraCinematica';
import {
  alterarTipoBarreira,
  barreiraBloqueiaMovimento,
  barreiraBloqueiaVisao,
  NOMES_BARREIRA,
  type BarreiraMapa,
} from '../lib/lighting';
import {
  acrescentarExploracaoFog,
  celulasVisiveisFog,
  validarMemoriaFog,
  type TracoFog,
} from '../lib/fogExploracao';
import { poligonoDoObservador } from '../lib/visaoIndividual';
import {
  normalizarDesenhos,
  fonteLuzPadrao,
  luz3DParaFonte,
  type TracoDesenho,
  type FonteLuzMesa,
} from '../lib/anotacoesMesa';
import {
  extrairEdicaoCena,
  registrarEdicao,
  passoEdicao,
  aplicarEdicaoCena,
} from '../lib/historicoEdicaoMesa';
import {
  listarMiniaturas3D,
  importarMiniatura3D,
  validarMiniaturaGLB,
  formatarMB,
  LIMITE_TOTAL_BIBLIOTECA_BYTES,
  excluirMiniaturaDaBiblioteca3D,
  localizarUsoMiniatura3D,
  listarNomesAnimacoesMiniatura3D,
  type Miniatura3DRegistro,
  type AnaliseMiniatura3D,
} from '../lib/bibliotecaMiniaturas3D';
import {
  criarInstanciaMiniatura3D,
  vincularModeloAoPersonagem3D,
  desvincularMiniatura3D,
  type InstanciaMiniatura3D,
} from './miniaturasCena3D';
import PreviewMiniatura3D from './PreviewMiniatura3D';
import '../App.css';
import './Mesa3DPrototipo.css';
import './visualizadorEmbutido.css';

const campanhaId = resolverCampanhaId(new URLSearchParams(window.location.search).get('campanha'));
const buscarCampanha = () => carregarMesaCompartilhada(campanhaId);
const estadoInicial = buscarCampanha();
const cenaInicial =
  estadoInicial.cenas.find((c) => c.id === estadoInicial.cenaAtivaId) || estadoInicial.cenas[0];
const exemplo = {
  id: '__demo__',
  nome: 'Aventureiro de teste',
  cor: '#8c9dbe',
  skins: [],
  skinPadraoId: undefined,
  temToken: false,
  temRetrato: false,
  temPdf: false,
  tipo: 'jogador' as const,
  hp: 0,
  hpMax: 0,
  mana: 0,
  manaMax: 0,
  escudo: 0,
  ca: 0,
  iniciativa: 0,
  condicoes: [],
  itens: [],
  elemento: '',
};
const cameraInicial = CAMERA_TERCEIRA_3D.anguloInicial;
const EMBUTIDO_3D = new URLSearchParams(window.location.search).get('embed') === '1';
type AbaEditor3D = 'mapa' | 'construcao';
const ABAS_EDITOR_3D: { id: AbaEditor3D; rotulo: string; simbolo: string }[] = [
  { id: 'mapa', rotulo: 'Mapa', simbolo: '▧' },
  // Antiga aba de objetos 2.5D aposentada: a edição principal agora é do mapa.
];
type PainelMesa3D =
  | 'anotacoes'
  | 'fichas'
  | 'pdf'
  | 'cenas'
  | 'elenco'
  | 'combate'
  | 'inventario'
  | 'iniciativa'
  | 'diario'
  | 'rolagens'
  | 'historico'
  | 'musica'
  | 'clima'
  | 'iluminacao'
  | 'construcao'
  | 'mesa'
  | 'camera'
  | 'miniaturas';
const atalhosMesa3D: { id: PainelMesa3D; rotulo: string; simbolo: string }[] = [
  { id: 'cenas', rotulo: 'Cenas', simbolo: '▧' },
  { id: 'elenco', rotulo: 'Elenco / NPCs', simbolo: '♟' },
  { id: 'iniciativa', rotulo: 'Iniciativa', simbolo: '☷' },
  { id: 'combate', rotulo: 'HP / Mana / Escudo', simbolo: '♥' },
  { id: 'inventario', rotulo: 'Inventário', simbolo: '⚔' },
  { id: 'rolagens', rotulo: 'Rolagens', simbolo: '◈' },
  { id: 'pdf', rotulo: 'Ficha PDF', simbolo: '▥' },
  { id: 'historico', rotulo: 'Histórico', simbolo: '≡' },
  { id: 'musica', rotulo: 'Música', simbolo: '♫' },
  { id: 'iluminacao', rotulo: 'Iluminação', simbolo: '☼' },
  { id: 'anotacoes', rotulo: 'Marcadores / Desenhos', simbolo: '✎' },
  { id: 'clima', rotulo: 'Clima', simbolo: '☁' },
  { id: 'construcao', rotulo: 'Terreno 3D', simbolo: '▧' },
  { id: 'miniaturas', rotulo: 'Miniaturas 3D', simbolo: '♙' },
  { id: 'mesa', rotulo: 'Mesa Livre', simbolo: '◎' },
  { id: 'camera', rotulo: 'Câmera', simbolo: '◉' },
];

function campoDeFormulario(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('button,input,select,textarea,a,[contenteditable="true"]') !== null
  );
}

export default function Mesa3DPrototipo() {
  // Registra somente os campos gráficos, mesmo quando a escrita compartilhada
  // contém mudanças de inventário, atributos ou iniciativa.
  function alterarMesaCompartilhada(
    idCampanha: string,
    acao: (estado: Record<string, unknown>) => boolean,
  ): boolean {
    const antes = carregarMesaCompartilhada(idCampanha);
    const cenaRegistro = leituraCenaId.current;
    const ok = alterarMesaCompartilhadaBruta(idCampanha, acao);
    if (ok) {
      const depois = carregarMesaCompartilhada(idCampanha);
      registrarEdicao(
        idCampanha,
        cenaRegistro,
        'cena',
        extrairEdicaoCena(antes.cenas.find((c) => c.id === cenaRegistro)),
        extrairEdicaoCena(depois.cenas.find((c) => c.id === cenaRegistro)),
      );
    }
    return ok;
  }
  function salvarCenario3D(idCampanha: string, cena: string, valor: Cenario3D): Cenario3D {
    const antes = carregarCenario3D(idCampanha, cena);
    const depois = salvarCenario3DBruto(idCampanha, cena, valor);
    registrarEdicao(idCampanha, cena, 'cenario3d', antes, depois);
    return depois;
  }
  const registrarBarreira3D = (camp: string, cena: string, antes: unknown) => {
    registrarEdicao(
      camp,
      cena,
      'cena',
      extrairEdicaoCena(antes),
      extrairEdicaoCena(carregarMesaCompartilhada(camp).cenas.find((v) => v.id === cena)),
    );
  };
  function criarBarreiraCompartilhada3D(
    ...args: Parameters<typeof criarBarreiraCompartilhada3DBruto>
  ) {
    const [camp, cena] = args,
      antes = carregarMesaCompartilhada(camp).cenas.find((v) => v.id === cena);
    const ok = criarBarreiraCompartilhada3DBruto(...args);
    if (ok) registrarBarreira3D(camp, cena, antes);
    return ok;
  }
  function editarBarreiraCompartilhada3D(
    ...args: Parameters<typeof editarBarreiraCompartilhada3DBruto>
  ) {
    const [camp, cena] = args,
      antes = carregarMesaCompartilhada(camp).cenas.find((v) => v.id === cena);
    const ok = editarBarreiraCompartilhada3DBruto(...args);
    if (ok) registrarBarreira3D(camp, cena, antes);
    return ok;
  }
  function excluirBarreiraCompartilhada3D(
    ...args: Parameters<typeof excluirBarreiraCompartilhada3DBruto>
  ) {
    const [camp, cena] = args,
      antes = carregarMesaCompartilhada(camp).cenas.find((v) => v.id === cena);
    const ok = excluirBarreiraCompartilhada3DBruto(...args);
    if (ok) registrarBarreira3D(camp, cena, antes);
    return ok;
  }
  function navegarHistorico3D(direcao: 'desfazer' | 'refazer') {
    if (!modoMestreRef.current || visaoIndividualRef.current) {
      setAvisoEdicao('O histórico só pode ser usado no modo mestre.');
      return;
    }
    const cena = leituraCenaId.current,
      passo = passoEdicao(campanhaId, cena, direcao);
    if (!passo) {
      setAvisoEdicao(
        'Nenhuma alteração para ' + (direcao === 'desfazer' ? 'desfazer.' : 'refazer.'),
      );
      return;
    }
    if (passo.tipo === 'cenario3d') {
      const novo = salvarCenario3DBruto(campanhaId, cena, passo.valor as Cenario3D);
      cenarioRef.current = novo;
      setCenario(novo);
    } else {
      alterarMesaCompartilhadaBruta(campanhaId, (raw) => {
        const atual = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cena);
        if (!atual) return false;
        Object.assign(
          atual,
          aplicarEdicaoCena(atual, passo.valor as ReturnType<typeof extrairEdicaoCena>),
        );
        return true;
      });
    }
    const atualizado = buscarCampanha();
    estadoRef.current = atualizado;
    setEstado(atualizado);
    setAnotacaoSelecionada(null);
    anotacaoSelecionadaRef.current = null;
    barreiraSelecionadaRef.current = null;
    setBarreiraSelecionada(null);
    limparSelecoes3D();
    setAvisoEdicao(direcao === 'desfazer' ? 'Alteração desfeita.' : 'Alteração refeita.');
  }

  const [estado, setEstado] = useState(buscarCampanha);
  const personagens = estado.unidades.length ? estado.unidades : [exemplo];
  const [id, setId] = useState(estadoInicial.unidades[0]?.id || exemplo.id);
  const [painelAtivo, setPainelAtivo] = useState<PainelMesa3D>('cenas');
  const [bibliotecaMiniaturas, setBibliotecaMiniaturas] =
    useState<Miniatura3DRegistro[]>(listarMiniaturas3D);
  useEffect(() => {
    const atualizar = () => setBibliotecaMiniaturas(listarMiniaturas3D());
    window.addEventListener('focus', atualizar);
    window.addEventListener('storage', atualizar);
    window.addEventListener('portal-miniaturas-biblioteca-alterada', atualizar);
    return () => {
      window.removeEventListener('focus', atualizar);
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('portal-miniaturas-biblioteca-alterada', atualizar);
    };
  }, []);
  const [modeloMiniaturaId, setModeloMiniaturaId] = useState('');
  const [abaMiniaturas, setAbaMiniaturas] = useState<'biblioteca' | 'cena' | 'importar'>(
    'biblioteca',
  );
  const [buscaMiniaturas, setBuscaMiniaturas] = useState('');
  const [buscaMiniaturasCena, setBuscaMiniaturasCena] = useState('');
  const modeloMiniaturaRef = useRef('');
  const [miniaturaSelecionadaId, setMiniaturaSelecionadaId] = useState<string | null>(null);
  const [nomesAnimacoesLegadas, setNomesAnimacoesLegadas] = useState<Record<string, string[]>>({});
  const [personagemParaMiniatura, setPersonagemParaMiniatura] = useState('');
  const [colocandoMiniatura, setColocandoMiniatura] = useState(false);
  const colocandoMiniaturaRef = useRef(false);
  const [importandoMiniatura, setImportandoMiniatura] = useState(false);
  const [analisandoMiniatura, setAnalisandoMiniatura] = useState(false);
  const [modoImportacaoAvancado, setModoImportacaoAvancado] = useState(false);
  const [arquivoMiniaturaPendente, setArquivoMiniaturaPendente] = useState<File | null>(null);
  const [analiseMiniaturaPendente, setAnaliseMiniaturaPendente] =
    useState<AnaliseMiniatura3D | null>(null);
  const [avisoMiniatura, setAvisoMiniatura] = useState('');
  modeloMiniaturaRef.current = modeloMiniaturaId;
  colocandoMiniaturaRef.current = colocandoMiniatura;
  const [painelVisivel, setPainelVisivel] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [janelaMinimizada, setJanelaMinimizada] = useState(false);
  const [janelaPos, setJanelaPos] = useState<{ x: number; y: number } | null>(null);
  const arrastoJanelaRef = useRef<{
    inicioX: number;
    inicioY: number;
    x: number;
    y: number;
  } | null>(null);
  // Preferência visual local: painel de efeitos pode ser reposicionado sem alterar a campanha.
  const [deslocamentoHudEfeitos, setDeslocamentoHudEfeitos] = useState<DeslocamentoHud3D>(() =>
    lerDeslocamentoHud3D(),
  );
  const deslocamentoHudRef = useRef(deslocamentoHudEfeitos);
  const hudEfeitosElementoRef = useRef<HTMLElement | null>(null);
  const hudEfeitosArrastoRef = useRef<{
    ponteiro: number;
    inicioX: number;
    inicioY: number;
    inicial: DeslocamentoHud3D;
    atual: DeslocamentoHud3D;
    base: { left: number; top: number; width: number; height: number };
    palco: { left: number; top: number; right: number; bottom: number };
  } | null>(null);
  const atualizarDeslocamentoHudEfeitos = (pos: DeslocamentoHud3D) => {
    deslocamentoHudRef.current = pos;
    setDeslocamentoHudEfeitos(pos);
  };
  const iniciarArrastoHudEfeitos = (ev: ReactPointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0 || (ev.target instanceof HTMLElement && ev.target.closest('button')))
      return;
    const painel = hudEfeitosElementoRef.current,
      palco = stageRef.current;
    if (!painel || !palco) return;
    const rect = painel.getBoundingClientRect(),
      bounds = palco.getBoundingClientRect(),
      anterior = deslocamentoHudRef.current;
    hudEfeitosArrastoRef.current = {
      ponteiro: ev.pointerId,
      inicioX: ev.clientX,
      inicioY: ev.clientY,
      inicial: anterior,
      atual: anterior,
      base: {
        left: rect.left - anterior.x,
        top: rect.top - anterior.y,
        width: rect.width,
        height: rect.height,
      },
      palco: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  };
  const moverHudEfeitos = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = hudEfeitosArrastoRef.current;
    if (!drag || drag.ponteiro !== ev.pointerId) return;
    const desejado = {
      x: drag.inicial.x + ev.clientX - drag.inicioX,
      y: drag.inicial.y + ev.clientY - drag.inicioY,
    };
    const pos = limitarDeslocamentoHud3D(desejado, drag.base, drag.palco);
    drag.atual = pos;
    atualizarDeslocamentoHudEfeitos(pos);
  };
  const terminarArrastoHudEfeitos = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = hudEfeitosArrastoRef.current;
    if (!drag || drag.ponteiro !== ev.pointerId) return;
    salvarDeslocamentoHud3D(drag.atual);
    hudEfeitosArrastoRef.current = null;
    if (ev.currentTarget.hasPointerCapture(ev.pointerId))
      ev.currentTarget.releasePointerCapture(ev.pointerId);
  };
  const reiniciarPosicaoHudEfeitos = () => {
    atualizarDeslocamentoHudEfeitos({ x: 0, y: 0 });
    salvarDeslocamentoHud3D(null);
  };
  useEffect(() => {
    const ajustar = () => {
      const painel = hudEfeitosElementoRef.current,
        palco = stageRef.current;
      if (!painel || !palco) return;
      const r = painel.getBoundingClientRect(),
        b = palco.getBoundingClientRect(),
        d = deslocamentoHudRef.current;
      const proximo = limitarDeslocamentoHud3D(
        d,
        { left: r.left - d.x, top: r.top - d.y, width: r.width, height: r.height },
        b,
      );
      if (proximo.x !== d.x || proximo.y !== d.y) {
        atualizarDeslocamentoHudEfeitos(proximo);
        salvarDeslocamentoHud3D(proximo);
      }
    };
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);
  const [menuOrganizar, setMenuOrganizar] = useState(false);
  const [modalPersonagem, setModalPersonagem] = useState(false);
  const [fichasBiblioteca, setFichasBiblioteca] = useState<FichaRegistro[]>([]);
  const [papelBiblioteca, setPapelBiblioteca] = useState<PapelFicha | 'todos'>('todos');
  const [nomeNovo, setNomeNovo] = useState('');
  const [tipoNovoPersonagem, setTipoNovoPersonagem] = useState<'jogador' | 'npc' | 'inimigo'>(
    'jogador',
  );
  const [retratos, setRetratos] = useState<Record<string, string>>({});
  const [arquivoPdf, setArquivoPdf] = useState<string | null>(null);
  const inputPdfRef = useRef<HTMLInputElement>(null);
  const [movimentoMesaWASD, setMovimentoMesaWASD] = useState(false);
  const moverMesaRef = useRef(false);
  const [formulaDado, setFormulaDado] = useState('1d20');
  const [rolagemFisica, setRolagemFisica] = useState<ExpressaoDado3D | null>(null);
  const idVideoRolagemRef = useRef('');
  const [sessao, setSessao] = useState(() => lerSessaoMesa3D(campanhaId));
  const [paginasDiario3D, setPaginasDiario3D] = useState(
    () => lerSessaoMesa3D(campanhaId).paginasDiario,
  );
  useEffect(() => {
    if (!painelVisivel || painelAtivo !== 'fichas') return;
    let ativo = true;
    void listarFichas()
      .then((fichas) => {
        if (ativo) setFichasBiblioteca(fichas);
      })
      .catch(() => {
        if (ativo) setMensagemMesa('Não foi possível abrir a biblioteca de fichas.');
      });
    return () => {
      ativo = false;
    };
  }, [painelVisivel, painelAtivo]);
  const abrirPainel = (alvo: PainelMesa3D) => {
    // Abrir as configurações do terreno NÃO inicia Construção nem muda a câmera.
    // Somente o botão explícito «Editar mapa» deve ativar a edição visual.
    if (alvo === 'construcao') {
      setModoEdicao(false);
      modoEdicaoRef.current = false;
      setFerramenta(null);
      ferramentaRef.current = null;
      setAbaEditor('mapa');
    }
    setPainelVisivel((anterior) => (painelAtivo === alvo ? !anterior : true));
    setPainelAtivo(alvo);
    setJanelaMinimizada(false);
    setMenuOrganizar(false);
  };
  const abrirCriacao = (tipo: 'jogador' | 'npc' | 'inimigo' = 'jogador') => {
    setTipoNovoPersonagem(tipo);
    setNomeNovo('');
    setModalPersonagem(true);
    setMenuOrganizar(false);
  };
  const [valorDano, setValorDano] = useState(1);
  const [valorEscudo, setValorEscudo] = useState(1);
  const [mensagemMesa, setMensagemMesa] = useState('');
  const usaImpeto = sistemaDaCampanha(obterCampanha(campanhaId) || { id: campanhaId }) === 'impeto';
  const [cenaId, setCenaId] = useState(cenaInicial?.id || 'cena-original');
  const [cenario, setCenario] = useState<Cenario3D>(() =>
    carregarCenario3D(campanhaId, cenaInicial?.id || 'cena-original'),
  );
  // Rascunhos independentes: digitar um valor novo não trava ao apagar o anterior.
  const [rascunhoLarguraPlanta, setRascunhoLarguraPlanta] = useState(() =>
    String(cenario.larguraPlanta ?? dimensoesTerreno3D(cenario).largura),
  );
  const [rascunhoProfundidadePlanta, setRascunhoProfundidadePlanta] = useState(() =>
    String(cenario.profundidadePlanta ?? dimensoesTerreno3D(cenario).profundidade),
  );
  const [rascunhoLarguraTerreno, setRascunhoLarguraTerreno] = useState(() =>
    String(dimensoesTerreno3D(cenario).largura),
  );
  const [rascunhoProfundidadeTerreno, setRascunhoProfundidadeTerreno] = useState(() =>
    String(dimensoesTerreno3D(cenario).profundidade),
  );
  useEffect(() => {
    setRascunhoLarguraPlanta(String(cenario.larguraPlanta ?? dimensoesTerreno3D(cenario).largura));
  }, [cenario.larguraPlanta, cenario.larguraTerreno]);
  useEffect(() => {
    setRascunhoProfundidadePlanta(
      String(cenario.profundidadePlanta ?? dimensoesTerreno3D(cenario).profundidade),
    );
  }, [cenario.profundidadePlanta, cenario.profundidadeTerreno]);
  useEffect(() => {
    setRascunhoLarguraTerreno(String(dimensoesTerreno3D(cenario).largura));
    setRascunhoProfundidadeTerreno(String(dimensoesTerreno3D(cenario).profundidade));
  }, [cenario.larguraTerreno, cenario.profundidadeTerreno]);
  const [abaEditor, setAbaEditor] = useState<AbaEditor3D>('mapa');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modoMestre, setModoMestre] = useState(true);
  const [itemMesaSelecionado, setItemMesaSelecionado] = useState<'token' | 'objeto' | null>(null);
  const [avisoMesaLivre, setAvisoMesaLivre] = useState(
    'Selecione um token ou móvel. Clique direito no token: flip; arraste o direito: orbitar.',
  );
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [barreiraSelecionada, setBarreiraSelecionada] = useState<string | null>(null);
  // Uma seleção visual local não é enviada ao servidor, nem dá visibilidade ao jogador.
  const [buscaElenco3D, setBuscaElenco3D] = useState('');
  const [selecionadosElenco3D, setSelecionadosElenco3D] = useState<string[]>([]);
  const [elencoRecolhido3D, setElencoRecolhido3D] = useState<
    Record<'jogador' | 'npc' | 'inimigo', boolean>
  >({ jogador: false, npc: false, inimigo: false });
  const chaveBuscaElenco3D = (nome: string) =>
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const elencoVisivel3D = estado.unidades.filter((u) =>
    chaveBuscaElenco3D(u.nome).includes(chaveBuscaElenco3D(buscaElenco3D.trim())),
  );
  const alternarElenco3D = (uid: string) =>
    setSelecionadosElenco3D((ids) =>
      ids.includes(uid) ? ids.filter((v) => v !== uid) : [...ids, uid],
    );
  const [anotacaoSelecionada, setAnotacaoSelecionada] = useState<{
    tipo: 'luz' | 'marcador' | 'desenho';
    id: string;
  } | null>(null);
  const anotacaoSelecionadaRef = useRef<{
    tipo: 'luz' | 'marcador' | 'desenho';
    id: string;
  } | null>(null);
  const alterarLuz3D = (luzId: string, dados: Partial<FonteLuzMesa>) => {
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find(
        (c) => c.id === leituraCenaId.current,
      );
      if (!cena) return false;
      const luzes = (cena.fontesLuz || []) as FonteLuzMesa[];
      if (!luzes.some((l) => l.id === luzId)) return false;
      cena.fontesLuz = luzes.map((l) => (l.id === luzId ? { ...l, ...dados } : l));
      return true;
    });
    if (ok) {
      estadoRef.current = buscarCampanha();
      setEstado(estadoRef.current);
    }
  };
  const abrirEdicaoLuz3D = (luzId: string) => {
    // A edição não usa mais o formulário longo no painel de Iluminação.
    // Um clique no elenco de luzes seleciona a fonte no chão.
    const atual = buscarCampanha();
    const cena = atual.cenas.find((c) => c.id === leituraCenaId.current);
    if (!cena?.fontesLuz.some((l) => l.id === luzId)) return;
    estadoRef.current = atual;
    setEstado(atual);
    setModoMestre(true);
    modoMestreRef.current = true;
    setModoEdicao(false);
    modoEdicaoRef.current = false;
    setFerramenta(null);
    ferramentaRef.current = null;
    selecionarAnotacao3D('luz', luzId);
    setPainelVisivel(false);
  };
  const selecionarAnotacao3D = (tipo: 'luz' | 'marcador' | 'desenho' | null, id: string | null) => {
    const valor = tipo && id ? { tipo, id } : null;
    anotacaoSelecionadaRef.current = valor;
    setAnotacaoSelecionada(valor);
    salaRef.current?.selecionarAnotacaoVisual(tipo, id);
    barreiraSelecionadaRef.current = null;
    setBarreiraSelecionada(null);
    selecionadoRef.current = null;
    setSelecionado(null);
    selecionarTokenNoChao(null);
  };
  const [selecoes3D, setSelecoes3D] = useState<string[]>([]);
  const selecoes3DRef = useRef<string[]>([]);
  const alternarSelecao3D = (
    tipo: 'token' | 'barreira' | 'objeto' | 'luz' | 'marcador' | 'desenho',
    uid: string,
  ) => {
    const chave = `${tipo}:${uid}`;
    const novas = selecoes3DRef.current.includes(chave)
      ? selecoes3DRef.current.filter((x) => x !== chave)
      : [...selecoes3DRef.current, chave];
    selecoes3DRef.current = novas;
    setSelecoes3D(novas);
  };
  const limparSelecoes3D = () => {
    selecoes3DRef.current = [];
    setSelecoes3D([]);
  };
  useEffect(() => {
    if (EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'selecao-multipla-3d', valor: selecoes3D.length },
        window.location.origin,
      );
  }, [selecoes3D.length]);
  const barreiraSelecionadaRef = useRef<string | null>(null);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const [avisoEdicao, setAvisoEdicao] = useState('');
  const [tipoNovo, setTipoNovo] = useState<TipoObjeto3D>('parede');
  const [ferramenta, setFerramenta] = useState<TipoObjeto3D | null>(null);
  const [anotacao, setAnotacao] = useState<'marcador' | 'desenhar' | null>(null);
  const anotacaoRef = useRef<'marcador' | 'desenhar' | null>(null);
  const [corDesenho3D, setCorDesenho3D] = useState('#ffce85');
  const [espessuraDesenho3D, setEspessuraDesenho3D] = useState(3);
  const corDesenho3DRef = useRef('#ffce85');
  const espessuraDesenho3DRef = useRef(3);
  const ativarAnotacao = (tipo: 'marcador' | 'desenhar' | null) => {
    ferramentaFogRef.current = null;
    setFerramentaFog(null);
    setFerramenta(null);
    ferramentaRef.current = null;
    modoEdicaoRef.current = false;
    setModoEdicao(false);
    anotacaoRef.current = tipo;
    setAnotacao(tipo);
    setModoMestre(true);
    modoMestreRef.current = true;
  };
  const [imagemPiso, setImagemPiso] = useState(false);
  const [versaoPiso, setVersaoPiso] = useState(0);
  const [enviandoPiso, setEnviandoPiso] = useState(false);
  const [erro, setErro] = useState('');
  const [salaPronta, setSalaPronta] = useState(false);
  // Além das IDs, acompanha alterações no próprio arquivo de uma skin já cadastrada.
  const [revisaoImagens, setRevisaoImagens] = useState(0);
  const [mapaPronto, setMapaPronto] = useState(false);
  const ultimoElenco3D = useRef('');
  const [aviso, setAviso] = useState('');
  const [detalhes, setDetalhes] = useState(false);
  const detalhesRef = useRef(detalhes);
  detalhesRef.current = detalhes;
  const [fps, setFps] = useState(0);
  const [posicao, setPosicao] = useState(() => posicaoLivre3D(cenario, PONTO_INICIAL));
  const [zoom, setZoom] = useState<number>(CAMERA_TERCEIRA_3D.distanciaInicial);
  const [angulo, setAngulo] = useState(cameraInicial);
  const painelEditorRef = useRef<HTMLElement>(null);
  const detalhesTerrenoRef = useRef<HTMLDetailsElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const salaRef = useRef<Sala3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const climaCena3DRef = useRef<ControleClima3D | null>(null);
  // Pausa é uma preferência local do navegador; não altera o clima salvo na cena.
  const [pausarClima3D, setPausarClima3D] = usePausaClimaLocal();
  const tecladoRef = useRef(new Set<string>());
  const posicaoRef = useRef(posicaoLivre3D(cenario, PONTO_INICIAL));
  const anguloRef = useRef(cameraInicial);
  const zoomRef = useRef<number>(CAMERA_TERCEIRA_3D.distanciaInicial);
  const cenarioRef = useRef(cenario);
  const leituraCenaId = useRef(cenaId);
  const modoEdicaoRef = useRef(modoEdicao);
  const modoMestreRef = useRef(modoMestre);
  // A apresentação usa uma terceira câmera temporária; não sobrescreve
  // as posições/configurações das câmeras livre e de terceira pessoa.
  const cinematicaRef = useRef<{
    personagemId: string;
    alvoId?: string;
    modo: ModoCameraCinematica;
  } | null>(null);
  const iniciarTransicaoCinematicaRef = useRef(false);
  // Ativado somente ao clicar Reenquadrar combate; ignora o raio local da tática.
  const enquadrarTodosCombateRef = useRef(false);
  // Deslocamento manual independente da rotação e do zoom táticos.
  // O centro é recalculado a cada quadro; guardamos apenas o deslocamento.
  const deslocamentoTaticoRef = useRef({ x: 0, z: 0 });
  const centroTaticoBaseRef = useRef({ x: 0, z: 0 });
  const distanciaTaticaRef = useRef(26);
  // A orientação tática é independente da câmera de personagem e da Visão de Mesa.
  // Ao reenquadrar, recalculamos o centro e a distância, mas preservamos a rotação escolhida.
  const yawTaticoRef = useRef(0.65);
  const pitchTaticoRef = useRef(1.04);
  // Perspectiva de interpretação: órbita e zoom independentes de todos os demais modos.
  const yawPersonagemRef = useRef(0.65);
  const pitchPersonagemRef = useRef(0.3);
  const distanciaPersonagemRef = useRef(5.2);
  const voltarDaCinematicaRef = useRef(false);
  // Zoom específico da câmera tática; não altera terceira pessoa nem visão livre.
  const zoomTaticoRef = useRef<number>(
    (() => {
      try {
        const valor = Number(localStorage.getItem('portal-mestre-zoom-tatico-v1'));
        return valor >= 65 && valor <= 200 ? valor : 100;
      } catch {
        return 100;
      }
    })(),
  );
  const definirZoomTatico = (percentual: number, avisarPai = false) => {
    if (!Number.isFinite(percentual)) return;
    const proximo = Math.max(65, Math.min(200, Math.round(percentual)));
    zoomTaticoRef.current = proximo;
    try {
      localStorage.setItem('portal-mestre-zoom-tatico-v1', String(proximo));
    } catch {
      /* Preferência opcional. */
    }
    if (avisarPai && EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'cinematica-zoom-atualizado', valor: proximo },
        window.location.origin,
      );
  };
  const idRef = useRef(id);
  const estadoRef = useRef(estado);
  const centroLivreRef = useRef({ x: 0, z: 0 });
  const yawLivreRef = useRef(0.4);
  const pitchLivreRef = useRef(0.82);
  const distanciaLivreRef = useRef(18);
  const enquadramentosIniciaisRef = useRef(new Set<string>());
  const [distanciaLivre, setDistanciaLivre] = useState(18);
  const ferramentaRef = useRef<TipoObjeto3D | null>(null);
  const inputPisoRef = useRef<HTMLInputElement>(null);
  const selecionadoRef = useRef<string | null>(null);
  // Seleção do token no chão, independente do personagem acompanhado pela câmera.
  const tokenSelecionadoRef = useRef<string | null>(null);
  const [tokenSelecionadoId, setTokenSelecionadoId] = useState<string | null>(null);
  // Prévia do mestre, somente local: não altera a visibilidade permanente da cena.
  const [visaoIndividualId, setVisaoIndividualId] = useState<string | null>(null);
  const visaoIndividualRef = useRef<string | null>(null);
  const [fogGrupo, setFogGrupo] = useState(false);
  const [ferramentaFog, setFerramentaFog] = useState<'revelar' | 'ocultar' | null>(null);
  const ferramentaFogRef = useRef<'revelar' | 'ocultar' | null>(null);
  const [raioFog, setRaioFog] = useState(4);
  const raioFogRef = useRef(4);
  const iniciarEdicaoTerreno = () => {
    if (cinematicaRef.current) {
      voltarDaCinematicaRef.current = true;
      cinematicaRef.current = null;
      iniciarTransicaoCinematicaRef.current = false;
      if (EMBUTIDO_3D && window.parent !== window)
        window.parent.postMessage(
          { canal: 'portal-mestre-3d', tipo: 'cinematica-encerrada' },
          window.location.origin,
        );
    }
    setModoMestre(true);
    modoMestreRef.current = true;
    setModoEdicao(true);
    modoEdicaoRef.current = true;
    if (EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'camera-modo-atualizado', valor: 'mestre' },
        window.location.origin,
      );
  };
  const usarFerramentaFog = (tipo: 'revelar' | 'ocultar' | null) => {
    ativarVisaoIndividual(null);
    setModoMestre(true);
    modoMestreRef.current = true;
    setModoEdicao(false);
    modoEdicaoRef.current = false;
    setFerramenta(null);
    ferramentaRef.current = null;
    ferramentaFogRef.current = tipo;
    setFerramentaFog(tipo);
  };
  const ativarVisaoIndividual = (alvo: string | null) => {
    const cena = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
    const valido = alvo && cena?.tokens[alvo] ? alvo : null;
    visaoIndividualRef.current = valido;
    setVisaoIndividualId(valido);
    if (valido) {
      setModoEdicao(false);
      modoEdicaoRef.current = false;
      setFerramenta(null);
      ferramentaRef.current = null;
      ferramentaFogRef.current = null;
      setFerramentaFog(null);
      setPainelVisivel(false);
      selecionarTokenNoChao(null);
      setItemMesaSelecionado(null);
      barreiraSelecionadaRef.current = null;
      setBarreiraSelecionada(null);
      selecionadoRef.current = null;
      setSelecionado(null);
      tecladoRef.current.clear();
    }
  };
  const selecionarTokenNoChao = (tokenId: string | null) => {
    tokenSelecionadoRef.current = tokenId;
    setTokenSelecionadoId(tokenId);
    if (EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'token-selecionado-na-mesa', valor: tokenId },
        window.location.origin,
      );
  };

  const excluirTokenSelecionadoNo3D = () => {
    const tokenId = tokenSelecionadoRef.current;
    if (!modoMestreRef.current || modoEdicaoRef.current || !tokenId) return false;
    const cena = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
    const registro = cena?.tokens?.[tokenId];
    if (!registro) {
      selecionarTokenNoChao(null);
      setItemMesaSelecionado(null);
      return false;
    }
    if (registro.travado) {
      setAvisoMesaLivre('Token bloqueado. Desbloqueie-o antes de retirar da cena.');
      return false;
    }
    const nome = estadoRef.current.unidades.find((u) => u.id === tokenId)?.nome || 'Token';
    if (!removerTokenDaCenaCompartilhada3D(campanhaId, leituraCenaId.current, tokenId)) {
      setAvisoMesaLivre('Não foi possível retirar o token da cena.');
      return false;
    }
    selecionarTokenNoChao(null);
    setItemMesaSelecionado(null);
    const atualizado = buscarCampanha();
    estadoRef.current = atualizado;
    setEstado(atualizado);
    if (idRef.current === tokenId) {
      const outra = atualizado.unidades.find((u) =>
        Boolean(atualizado.cenas.find((c) => c.id === leituraCenaId.current)?.tokens?.[u.id]),
      );
      if (outra) {
        idRef.current = outra.id;
        setId(outra.id);
      }
    }
    setAvisoMesaLivre(
      `${nome}: token retirado apenas desta cena (Delete). A ficha foi preservada.`,
    );
    return true;
  };
  const excluirElenco3D = () => {
    const ids = selecionadosElenco3D.filter((uid) =>
      estadoRef.current.unidades.some((u) => u.id === uid),
    );
    if (!ids.length) return;
    const nomes = estadoRef.current.unidades.filter((u) => ids.includes(u.id)).map((u) => u.nome);
    if (
      !window.confirm(
        `Excluir ${ids.length} personagem(ns) da CAMPANHA e de TODAS as cenas?\n\n${nomes.slice(0, 10).join(', ')}${nomes.length > 10 ? ' ...' : ''}\n\nOs arquivos locais das fichas, retratos e tokens também serão removidos. Faça backup antes.`,
      )
    )
      return;
    const escolhidos = new Set(ids);
    const anteriores = estadoRef.current.unidades.filter((u) => escolhidos.has(u.id));
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      raw.unidades = (raw.unidades as Record<string, unknown>[]).filter(
        (u) => !escolhidos.has(String(u.id)),
      );
      const cenas = raw.cenas as Record<string, unknown>[];
      for (const cena of cenas) {
        const tokens = { ...((cena.tokens || {}) as Record<string, unknown>) };
        ids.forEach((uid) => delete tokens[uid]);
        cena.tokens = tokens;
        if (Array.isArray(cena.participantesIniciativa))
          cena.participantesIniciativa = (cena.participantesIniciativa as string[]).filter(
            (uid) => !escolhidos.has(uid),
          );
      }
      const cenaAtiva = cenas.find((c) => c.id === raw.cenaAtivaId) || cenas[0];
      const participantes = (cenaAtiva?.participantesIniciativa || []) as string[];
      const restantes = raw.unidades as Record<string, unknown>[];
      const validos = participantes.filter((uid) => restantes.some((u) => u.id === uid));
      if (typeof raw.turnoId === 'string' && escolhidos.has(raw.turnoId))
        raw.turnoId = validos[0] || null;
      if (raw.combateAtivo === true && !validos.length) raw.combateAtivo = false;
      return true;
    });
    if (!ok) {
      setMensagemMesa('Não foi possível excluir o elenco. Faça backup e tente novamente.');
      return;
    }
    for (const u of anteriores) {
      const arquivos = [
        `ficha:${u.id}`,
        `retrato:${u.id}`,
        `token:${u.id}`,
        ...skinsValidas(u).map((s) => chaveImagemSkin(u.id, s.id)),
      ];
      arquivos.forEach(
        (chave) =>
          void excluirArquivo(chaveArquivoCampanha(campanhaId, chave)).catch(() => undefined),
      );
    }
    const atualizado = buscarCampanha();
    estadoRef.current = atualizado;
    setEstado(atualizado);
    if (escolhidos.has(idRef.current)) {
      const proximo = atualizado.unidades[0]?.id || exemplo.id;
      idRef.current = proximo;
      setId(proximo);
    }
    setSelecionadosElenco3D([]);
    setMensagemMesa(`${ids.length} personagem(ns) excluídos do elenco e de todas as cenas.`);
  };
  const apagarSelecoes3D = () => {
    const itens = selecoes3DRef.current;
    if (!modoMestreRef.current || visaoIndividualRef.current || !itens.length) return;
    const dados = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
    const tokenIds = new Set(
      itens
        .filter((v) => v.startsWith('token:'))
        .map((v) => v.slice(6))
        .filter((uid) => dados?.tokens[uid] && !dados.tokens[uid].travado),
    );
    const bloqueados = itens.filter(
      (v) => v.startsWith('token:') && dados?.tokens[v.slice(6)]?.travado,
    ).length;
    const barreiraIds = new Set(
      itens.filter((v) => v.startsWith('barreira:')).map((v) => v.slice(9)),
    );
    const objetoIds = new Set(itens.filter((v) => v.startsWith('objeto:')).map((v) => v.slice(7)));
    const luzIds = new Set(itens.filter((v) => v.startsWith('luz:')).map((v) => v.slice(4)));
    const marcadorIds = new Set(
      itens.filter((v) => v.startsWith('marcador:')).map((v) => v.slice(9)),
    );
    const desenhoIds = new Set(
      itens.filter((v) => v.startsWith('desenho:')).map((v) => v.slice(8)),
    );
    const qtd =
      tokenIds.size +
      barreiraIds.size +
      objetoIds.size +
      luzIds.size +
      marcadorIds.size +
      desenhoIds.size;
    if (!qtd) {
      setAvisoEdicao('Nenhum item removível. Desbloqueie os tokens antes de retirar da cena.');
      return;
    }
    if (
      !window.confirm(
        `Retirar ${qtd} item(ns) desta cena?\n\n${tokenIds.size} token(s), ${barreiraIds.size} barreira(s), ${objetoIds.size} objeto(s), ${luzIds.size} luz(es), ${marcadorIds.size} marcação(ões), ${desenhoIds.size} desenho(s).\n\nAs fichas e personagens serão preservados.`,
      )
    )
      return;
    const compartilhados =
      tokenIds.size + barreiraIds.size + luzIds.size + marcadorIds.size + desenhoIds.size;
    if (compartilhados) {
      const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
        const cena = (raw.cenas as Record<string, unknown>[]).find(
          (c) => c.id === leituraCenaId.current,
        );
        if (!cena) return false;
        const tokens = { ...((cena.tokens as Record<string, unknown>) || {}) };
        tokenIds.forEach((uid) => delete tokens[uid]);
        cena.tokens = tokens;
        cena.barreiras = ((cena.barreiras || []) as BarreiraMapa[]).filter(
          (b) => !barreiraIds.has(b.id),
        );
        cena.fontesLuz = ((cena.fontesLuz || []) as { id: string }[]).filter(
          (x) => !luzIds.has(x.id),
        );
        cena.marcadores = ((cena.marcadores || []) as { id: string }[]).filter(
          (x) => !marcadorIds.has(x.id),
        );
        cena.desenhos = ((cena.desenhos || []) as { id: string }[]).filter(
          (x) => !desenhoIds.has(x.id),
        );
        return true;
      });
      if (!ok) {
        setAvisoEdicao(
          'Falha ao remover tokens e barreiras. Nenhuma exclusão de objetos foi realizada.',
        );
        return;
      }
    }
    if (objetoIds.size) {
      mudarCenario({
        ...cenarioRef.current,
        objetos: cenarioRef.current.objetos.filter((o) => !objetoIds.has(o.id)),
      });
    }
    if (tokenSelecionadoRef.current && tokenIds.has(tokenSelecionadoRef.current))
      selecionarTokenNoChao(null);
    if (barreiraSelecionadaRef.current && barreiraIds.has(barreiraSelecionadaRef.current)) {
      barreiraSelecionadaRef.current = null;
      setBarreiraSelecionada(null);
    }
    if (selecionadoRef.current && objetoIds.has(selecionadoRef.current)) {
      selecionadoRef.current = null;
      setSelecionado(null);
    }
    const atualizado = buscarCampanha();
    estadoRef.current = atualizado;
    setEstado(atualizado);
    if (tokenIds.has(idRef.current)) {
      const outro = atualizado.unidades.find((u) =>
        Boolean(atualizado.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[u.id]),
      );
      if (outro) {
        idRef.current = outro.id;
        setId(outro.id);
      }
    }
    limparSelecoes3D();
    setItemMesaSelecionado(null);
    anotacaoSelecionadaRef.current = null;
    setAnotacaoSelecionada(null);
    setAvisoEdicao(
      `${qtd} item(ns) retirado(s) da cena.${bloqueados ? ` ${bloqueados} token(s) bloqueado(s) preservado(s).` : ''}`,
    );
  };
  const excluirAnotacao3D = (tipo: 'luz' | 'marcador' | 'desenho', id: string) => {
    if (!modoMestreRef.current || visaoIndividualRef.current) return;
    const campo = tipo === 'luz' ? 'fontesLuz' : tipo === 'desenho' ? 'desenhos' : 'marcadores';
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find(
        (c) => c.id === leituraCenaId.current,
      );
      if (!cena) return false;
      cena[campo] = ((cena[campo] || []) as { id: string }[]).filter((v) => v.id !== id);
      return true;
    });
    if (ok) {
      anotacaoSelecionadaRef.current = null;
      setAnotacaoSelecionada(null);
      estadoRef.current = buscarCampanha();
      setEstado(estadoRef.current);
      setAvisoEdicao('Elemento removido da cena compartilhada.');
    }
  };
  const renomearMarcador3D = (id: string) => {
    const m = estadoRef.current.cenas
      .find((c) => c.id === leituraCenaId.current)
      ?.marcadores.find((v) => v.id === id);
    if (!m) return;
    if (EMBUTIDO_3D && window.parent !== window) {
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'marcador-editar', valor: id },
        window.location.origin,
      );
      return;
    }
    const texto = window.prompt('Nome da marcação:', m.texto)?.trim();
    if (!texto) return;
    if (
      alterarMesaCompartilhada(campanhaId, (raw) => {
        const cena = (raw.cenas as Record<string, unknown>[]).find(
          (c) => c.id === leituraCenaId.current,
        );
        if (!cena) return false;
        cena.marcadores = ((cena.marcadores || []) as (typeof m)[]).map((v) =>
          v.id === id ? { ...v, texto: texto.slice(0, 90) } : v,
        );
        return true;
      })
    ) {
      estadoRef.current = buscarCampanha();
      setEstado(estadoRef.current);
    }
  };
  const cenaAtual = estado.cenas.find((c) => c.id === cenaId) || cenaInicial;
  const luzSelecionadaNoChao =
    anotacaoSelecionada?.tipo === 'luz'
      ? (cenaAtual?.fontesLuz ?? []).find((l) => l.id === anotacaoSelecionada.id)
      : null;
  const tokenDaCenaSelecionado = tokenSelecionadoId
    ? cenaAtual?.tokens[tokenSelecionadoId]
    : undefined;
  const alternarTokenOculto3D = (uid: string) => {
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find(
        (c) => c.id === leituraCenaId.current,
      );
      const tokens = cena?.tokens as Record<string, Record<string, unknown>> | undefined;
      const token = tokens?.[uid];
      if (!token) return false;
      cena!.tokens = { ...tokens, [uid]: { ...token, oculto: token.oculto !== true } };
      return true;
    });
    if (ok) {
      const atualizado = buscarCampanha();
      estadoRef.current = atualizado;
      setEstado(atualizado);
    } else setMensagemMesa('Não foi possível alterar a ocultação do token.');
  };
  const alternarGrupoOculto3D = (tipo: 'jogador' | 'npc' | 'inimigo') => {
    const chave = tipo === 'jogador' ? 'jogadores' : tipo === 'npc' ? 'npcs' : 'inimigos';
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find(
        (c) => c.id === leituraCenaId.current,
      );
      if (!cena) return false;
      const camadas = (cena.camadas || {}) as Record<string, unknown>;
      cena.camadas = { ...camadas, [chave]: camadas[chave] === false };
      return true;
    });
    if (ok) {
      const atualizado = buscarCampanha();
      estadoRef.current = atualizado;
      setEstado(atualizado);
    } else setMensagemMesa('Não foi possível alterar a visibilidade do grupo.');
  };
  const unidadeTokenSelecionada = estado.unidades.find((u) => u.id === tokenSelecionadoId);
  const inverterTokenSelecionadoNo3D = (alvoIndicado?: string) => {
    const alvo = alvoIndicado ?? tokenSelecionadoRef.current;
    if (!modoMestreRef.current || modoEdicaoRef.current || !alvo) return;
    const registro = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
      alvo
    ];
    if (!registro) return;
    if (registro.travado) {
      setAvisoMesaLivre('Token bloqueado. Desbloqueie antes de inverter.');
      return;
    }
    if (!espelharTokenCompartilhado3D(campanhaId, leituraCenaId.current, alvo)) {
      setAvisoMesaLivre('Não foi possível inverter a imagem do token.');
      return;
    }
    const proximo = buscarCampanha();
    estadoRef.current = proximo;
    setEstado(proximo);
    const espelhado = Boolean(
      proximo.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[alvo]?.espelhadoX,
    );
    salaRef.current?.orientarToken(alvo, espelhado);
    setAvisoMesaLivre(
      `${proximo.unidades.find((u) => u.id === alvo)?.nome || 'Token'}: ${espelhado ? 'imagem invertida' : 'orientação original'} nesta cena.`,
    );
  };
  const selecionadoObjeto = cenario.objetos.find((o) => o.id === selecionado);
  const miniaturasCena = cenario.miniaturas ?? [];
  const miniaturaSelecionada = miniaturasCena.find((m) => m.id === miniaturaSelecionadaId);
  const metadadosAnimacaoSelecionada = bibliotecaMiniaturas.find(
    (m) => m.id === miniaturaSelecionada?.modeloId,
  );
  const nomesAnimacoesSelecionadas =
    metadadosAnimacaoSelecionada?.nomesAnimacoes ??
    nomesAnimacoesLegadas[miniaturaSelecionada?.modeloId ?? ''] ??
    [];
  // Modelos anteriores à v29.15.3 guardavam só a quantidade de clipes.
  // Recuperamos nomes lendo apenas o JSON do GLB, sem instanciar outro WebGL.
  useEffect(() => {
    const modelo = miniaturaSelecionada?.modeloId;
    if (!modelo) return;
    const registro = bibliotecaMiniaturas.find((m) => m.id === modelo);
    if (
      !registro ||
      registro.nomesAnimacoes ||
      !registro.animacoes ||
      nomesAnimacoesLegadas[modelo]
    )
      return;
    let ativo = true;
    void listarNomesAnimacoesMiniatura3D(modelo).then((nomes) => {
      if (ativo)
        setNomesAnimacoesLegadas((anterior) =>
          anterior[modelo] ? anterior : { ...anterior, [modelo]: nomes },
        );
    });
    return () => {
      ativo = false;
    };
  }, [miniaturaSelecionada?.modeloId, bibliotecaMiniaturas]);
  const salvarMiniaturaNoPonto = (ponto: { x: number; z: number }) => {
    if (!modoMestreRef.current || visaoIndividualRef.current) return;
    const modelo = bibliotecaMiniaturasRef.current.find((m) => m.id === modeloMiniaturaRef.current);
    if (!modelo) {
      setAvisoMiniatura('Escolha um GLB da biblioteca antes de colocar.');
      return;
    }
    if ((cenarioRef.current.miniaturas ?? []).length >= 40) {
      setAvisoMiniatura('Limite inicial: 40 miniaturas por cena.');
      return;
    }
    const nova = criarInstanciaMiniatura3D(modelo.id, modelo.nome, ponto);
    mudarCenario({
      ...cenarioRef.current,
      miniaturas: [...(cenarioRef.current.miniaturas ?? []), nova],
    });
    setMiniaturaSelecionadaId(nova.id);
    setAbaMiniaturas('cena');
    setColocandoMiniatura(false);
    colocandoMiniaturaRef.current = false;
    setAvisoMiniatura('Miniatura colocada na cena. Você pode ajustar ou arrastá-la.');
  };
  const vincularModeloSelecionado = () => {
    const modelo = bibliotecaMiniaturasRef.current.find((m) => m.id === modeloMiniaturaRef.current);
    const personagem = estadoRef.current.unidades.find((u) => u.id === personagemParaMiniatura);
    const token = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
      personagemParaMiniatura
    ];
    if (!modelo || !personagem || !token) {
      setAvisoMiniatura('Selecione um modelo e um personagem que esteja nesta cena.');
      return;
    }
    const ponto = percentualParaChao3D(token, cenarioRef.current);
    try {
      const proximas = vincularModeloAoPersonagem3D(
        cenarioRef.current.miniaturas ?? [],
        modelo.id,
        modelo.nome,
        personagem.id,
        ponto,
      );
      mudarCenario({ ...cenarioRef.current, miniaturas: proximas });
      setMiniaturaSelecionadaId(proximas.find((m) => m.personagemId === personagem.id)?.id ?? null);
      setAbaMiniaturas('cena');
      setColocandoMiniatura(false);
      colocandoMiniaturaRef.current = false;
      setAvisoMiniatura(
        `${modelo.nome} agora representa ${personagem.nome} na Mesa 3D. A ficha e o token 2D permanecem os mesmos.`,
      );
    } catch (e) {
      setAvisoMiniatura(e instanceof Error ? e.message : 'Não foi possível vincular a miniatura.');
    }
  };
  const alterarMiniatura = (id: string, alteracao: Partial<InstanciaMiniatura3D>) => {
    const anterior = (cenarioRef.current.miniaturas ?? []).find((m) => m.id === id);
    if (!anterior) return;
    // O modelo fica vinculado ao token, sem posição ou ficha duplicada.
    // Se for solto do personagem, manter a última posição no chão.
    const anteriorToken = anterior.personagemId
      ? estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
          anterior.personagemId
        ]
      : undefined;
    const novoVinculo = Object.prototype.hasOwnProperty.call(alteracao, 'personagemId');
    const pontoLivre = anteriorToken
      ? percentualParaChao3D(anteriorToken, cenarioRef.current)
      : { x: anterior.x, z: anterior.z };
    const base =
      novoVinculo && !alteracao.personagemId
        ? desvincularMiniatura3D(anterior, pontoLivre)
        : anterior;
    const nova = { ...base, ...alteracao, id: anterior.id, modeloId: anterior.modeloId };
    if (novoVinculo && !alteracao.personagemId) delete nova.personagemId;
    if (alteracao.personagemId) {
      if (
        (cenarioRef.current.miniaturas ?? []).some(
          (m) => m.id !== id && m.personagemId === alteracao.personagemId,
        )
      ) {
        setAvisoMiniatura('Esse personagem já está vinculado a outra miniatura nesta cena.');
        return;
      }
    }
    mudarCenario({
      ...cenarioRef.current,
      miniaturas: (cenarioRef.current.miniaturas ?? []).map((m) => (m.id === id ? nova : m)),
    });
  };
  const bibliotecaMiniaturasRef = useRef(bibliotecaMiniaturas);
  bibliotecaMiniaturasRef.current = bibliotecaMiniaturas;
  const analisarGLB = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setArquivoMiniaturaPendente(null);
    setAnaliseMiniaturaPendente(null);
    setAnalisandoMiniatura(true);
    setAvisoMiniatura('Analisando geometria, texturas e animações...');
    try {
      if (!arquivo.name.toLowerCase().endsWith('.glb')) throw Error('Selecione um arquivo .glb.');
      const analise = await validarMiniaturaGLB(arquivo, { modoAvancado: modoImportacaoAvancado });
      setArquivoMiniaturaPendente(arquivo);
      setAnaliseMiniaturaPendente(analise);
      setAvisoMiniatura('Modelo analisado. Confira o relatório e confirme a importação.');
    } catch (e) {
      setAvisoMiniatura(e instanceof Error ? e.message : 'Não foi possível analisar o GLB.');
    } finally {
      setAnalisandoMiniatura(false);
    }
  };
  const excluirModeloSelecionado = async () => {
    const modelo = bibliotecaMiniaturas.find((m) => m.id === modeloMiniaturaId);
    if (!modelo) return;
    try {
      const usos = localizarUsoMiniatura3D(modelo.id);
      if (usos.length) {
        setAvisoMiniatura(
          `Não é possível apagar ${modelo.nome}: está em ${usos.length} cena(s). Remova primeiro essas instâncias em “Na cena”.`,
        );
        return;
      }
      if (
        !window.confirm(
          `Excluir “${modelo.nome}” da biblioteca de todas as campanhas? O arquivo GLB será removido deste dispositivo e dos próximos backups.`,
        )
      )
        return;
      await excluirMiniaturaDaBiblioteca3D(modelo.id);
      setBibliotecaMiniaturas(listarMiniaturas3D());
      setModeloMiniaturaId('');
      setAvisoMiniatura(`Modelo “${modelo.nome}” excluído da biblioteca do mestre.`);
    } catch (e) {
      setAvisoMiniatura(e instanceof Error ? e.message : 'Não foi possível excluir o modelo.');
    }
  };
  const importarGLB = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setImportandoMiniatura(true);
    setAvisoMiniatura('Salvando modelo na biblioteca...');
    try {
      const registro = await importarMiniatura3D(arquivo, { modoAvancado: modoImportacaoAvancado });
      setBibliotecaMiniaturas(listarMiniaturas3D());
      setModeloMiniaturaId(registro.id);
      setAbaMiniaturas('biblioteca');
      setArquivoMiniaturaPendente(null);
      setAnaliseMiniaturaPendente(null);
      setAvisoMiniatura(
        `${registro.nome} disponível na biblioteca (${registro.triangulos.toLocaleString('pt-BR')} triângulos).`,
      );
    } catch (e) {
      setAvisoMiniatura(e instanceof Error ? e.message : 'Falha ao importar GLB.');
    } finally {
      setImportandoMiniatura(false);
    }
  };

  const barreirasCena: BarreiraMapa[] = cenaAtual?.barreiras ?? [];
  // O movimento de tokens não exige reconstruir todas as linhas a cada salvamento.
  const assinaturaBarreiras = JSON.stringify(barreirasCena);
  useEffect(() => {
    limparSelecoes3D();
    anotacaoSelecionadaRef.current = null;
    setAnotacaoSelecionada(null);
  }, [cenaId]);
  const barreiraAtual = barreirasCena.find((b) => b.id === barreiraSelecionada);
  const mudarCenario = (proximo: Cenario3D) => {
    try {
      const salvo = salvarCenario3D(campanhaId, cenaId, proximo);
      cenarioRef.current = salvo;
      setCenario(salvo);
      setAvisoEdicao('Alterações salvas no backup local da campanha.');
      if (colisaoCenario3D(posicaoRef.current, salvo)) {
        posicaoRef.current = posicaoLivre3D(salvo, PONTO_INICIAL);
        salaRef.current?.avatar.position.set(posicaoRef.current.x, 0, posicaoRef.current.z);
      }
    } catch {
      setAvisoEdicao(
        'Não foi possível salvar o cenário. Verifique o espaço do navegador e faça um backup.',
      );
    }
  };
  const atualizarObjeto = (idObjeto: string, alteracao: Partial<ObjetoCena3D>) => {
    const orig = cenarioRef.current.objetos.find((o) => o.id === idObjeto);
    if (!orig) return;
    const outro = { ...orig, ...alteracao, id: orig.id, tipo: orig.tipo };
    if (!Number.isFinite(outro.x) || !Number.isFinite(outro.z) || !Number.isFinite(outro.rotacao))
      return;
    if (tocaObjeto3D(posicaoRef.current, outro)) {
      setAvisoEdicao('Este objeto bloquearia o personagem. Escolha outra posição.');
      return;
    }
    mudarCenario({
      ...cenarioRef.current,
      objetos: cenarioRef.current.objetos.map((o) => (o.id === idObjeto ? outro : o)),
    });
  };
  const apagarObjetoSelecionado = () => {
    const objetoId = selecionadoRef.current;
    if (!objetoId) return;
    if (!cenarioRef.current.objetos.some((o) => o.id === objetoId)) return;
    mudarCenario({
      ...cenarioRef.current,
      objetos: cenarioRef.current.objetos.filter((o) => o.id !== objetoId),
    });
    selecionadoRef.current = null;
    setSelecionado(null);
    setItemMesaSelecionado(null);
    setAvisoEdicao('Objeto removido do cenário 3D. A imagem da Mesa 2D continua intacta.');
  };
  const incluirObjeto = () => {
    if (tipoNovo === 'luz') {
      const pt = ponto3DParaMapa(posicaoRef.current, cenarioRef.current);
      const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
        const cena = (raw.cenas as Record<string, unknown>[]).find(
          (c) => c.id === leituraCenaId.current,
        );
        if (!cena) return false;
        cena.fontesLuz = [
          ...(Array.isArray(cena.fontesLuz) ? cena.fontesLuz : []),
          fonteLuzPadrao(`luz-${Date.now()}`, pt),
        ];
        return true;
      });
      if (ok) {
        estadoRef.current = buscarCampanha();
        setEstado(estadoRef.current);
        setAvisoEdicao('Luz compartilhada adicionada. Abra Iluminação para editar ou remover.');
      }
      return;
    }
    if (cenarioRef.current.objetos.length >= 140) {
      setAvisoEdicao('Limite de 140 objetos por cenário.');
      return;
    }
    const pontos = [
      { x: posicaoRef.current.x + 1.5, z: posicaoRef.current.z - 1.5 },
      { x: 2, z: 2 },
      { x: -2, z: 2 },
      { x: 0, z: -2 },
    ];
    const origem = pontos.find((p) => !colisaoCenario3D(p, cenarioRef.current)) || pontos[0];
    const objeto = novoObjeto3D(tipoNovo, origem, cenarioRef.current);
    mudarCenario({ ...cenarioRef.current, objetos: [...cenarioRef.current.objetos, objeto] });
    selecionadoRef.current = objeto.id;
    setSelecionado(objeto.id);
  };
  const alterarCena = (novoId: string, salvarAtiva = true) => {
    if (salvarAtiva)
      alterarMesaCompartilhada(campanhaId, (raw) => {
        if (!(raw.cenas as Record<string, unknown>[]).some((c) => c.id === novoId)) return false;
        raw.cenaAtivaId = novoId;
        raw.combateAtivo = false;
        raw.turnoId = null;
        raw.rodada = 1;
        return true;
      });
    estadoRef.current = buscarCampanha();
    setEstado(estadoRef.current);
    const proximo = carregarCenario3D(campanhaId, novoId);
    cenarioRef.current = proximo;
    leituraCenaId.current = novoId;
    setCenario(proximo);
    setCenaId(novoId);
    ativarVisaoIndividual(null);
    cinematicaRef.current = null;
    enquadrarTodosCombateRef.current = false;
    deslocamentoTaticoRef.current = { x: 0, z: 0 };
    iniciarTransicaoCinematicaRef.current = false;
    voltarDaCinematicaRef.current = false;
    ferramentaFogRef.current = null;
    setFerramentaFog(null);
    selecionarTokenNoChao(null);
    setItemMesaSelecionado(null);
    setSelecionado(null);
    selecionadoRef.current = null;
    barreiraSelecionadaRef.current = null;
    setBarreiraSelecionada(null);
    setMiniaturaSelecionadaId(null);
    setColocandoMiniatura(false);
    colocandoMiniaturaRef.current = false;
    setConfirmarLimpeza(false);
    setFerramenta(null);
    ferramentaRef.current = null;
    setImagemPiso(false);
    const token = estadoRef.current.cenas.find((c) => c.id === novoId)?.tokens[idRef.current];
    posicaoRef.current = token
      ? percentualParaChao3D(token, cenarioRef.current)
      : posicaoLivre3D(proximo, PONTO_INICIAL);
    centroLivreRef.current = { ...posicaoRef.current };
    salaRef.current?.avatar.position.set(posicaoRef.current.x, 0, posicaoRef.current.z);
    setAvisoEdicao('Cenário 3D desta cena carregado.');
  };
  const nomeSelecionado = useMemo(
    () => personagens.find((p) => p.id === id) || personagens[0],
    [id, estado],
  );
  const personagensNaCena = estado.unidades.filter((u) => Boolean(cenaAtual?.tokens?.[u.id]));
  const atualizarDados = () => {
    setEstado(buscarCampanha());
    setSessao(lerSessaoMesa3D(campanhaId));
  };
  const mudarIluminacao = (ambiente: number) => {
    const valor = Math.max(0, Math.min(100, Math.round(ambiente)));
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (!cena) return false;
      const atual = (cena.iluminacao || {}) as Record<string, unknown>;
      cena.iluminacao = { ...atual, ativa: true, ambiente: valor };
      return true;
    });
    if (ok) {
      atualizarDados();
      setMensagemMesa('Luz ambiente salva na cena para as duas mesas.');
    }
  };
  const mudarClima = (alteracao: Partial<ConfigClima>) => {
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (!cena) return false;
      cena.clima = normalizarClima({ ...normalizarClima(cena.clima), ...alteracao });
      return true;
    });
    if (ok) {
      atualizarDados();
      setMensagemMesa('Clima da cena atualizado nos dados compartilhados.');
    }
  };
  const iniciarRolagem = () => {
    const expressao = lerExpressaoDado3D(formulaDado);
    if (!expressao) {
      setMensagemMesa('Use de 1 a 12 dados, como 1d20, 2d6+3 ou 1d100.');
      abrirPainel('rolagens');
      return;
    }
    idVideoRolagemRef.current = crypto.randomUUID();
    setRolagemFisica(expressao);
  };
  const concluirRolagem = (valores: number[]) => {
    if (!rolagemFisica) return;
    const total = valores.reduce((a, b) => a + b, 0) + rolagemFisica.modificador;
    const ok = registrarRolagemMesa3D(campanhaId, 'Mestre', rolagemFisica, valores);
    if (ok)
      void publicarRolagemMestre(
        campanhaId,
        idVideoRolagemRef.current,
        rolagemFisica.formula,
        valores,
        'Mestre',
        'publica',
      ).catch((falha) => console.warn('[Portal/Multiplayer 3D] Falha ao compartilhar:', falha));
    setRolagemFisica(null);
    atualizarDados();
    setMensagemMesa(
      ok
        ? `${rolagemFisica.formula} → ${total}. Nenhum dano foi aplicado automaticamente.`
        : 'Não foi possível salvar a rolagem.',
    );
  };
  const comandarTurno = (acao: 'iniciar' | 'avancar' | 'encerrar') => {
    if (alterarTurnoMesa3D(campanhaId, acao, usaImpeto)) atualizarDados();
    else setMensagemMesa('Não foi possível alterar a ordem de turnos.');
  };
  const editarDiario3D = (operacao: OperacaoDiario) => {
    const ok = operarDiarioMesa3D(campanhaId, operacao);
    if (ok) setPaginasDiario3D(lerSessaoMesa3D(campanhaId).paginasDiario);
    else setMensagemMesa('Não foi possível salvar esta página do diário.');
  };
  const aplicarEdicao = (ok: boolean) => {
    if (ok) {
      atualizarDados();
      setMensagemMesa('Alteração salva na campanha e disponível na Mesa 2D.');
    } else setMensagemMesa('Não foi possível salvar essa alteração. Confira os dados e o backup.');
  };
  const alterarCampo = (campo: 'hp' | 'mana' | 'ca' | 'escudo' | 'iniciativa', valor: number) => {
    if (usaImpeto && id !== exemplo.id)
      aplicarEdicao(ajustarRecurso3D(campanhaId, id, campo, valor));
  };
  const rolarItem = (item: ItemInventario) => {
    if (id === exemplo.id) return;
    const valor = item.efeito === 'nenhum' ? null : analisarValorItem(item.valor);
    if (item.efeito !== 'nenhum' && !valor) {
      setMensagemMesa('Este item não possui uma fórmula válida.');
      return;
    }
    let resultado = 0;
    if (valor?.tipo === 'fixo') resultado = valor.valor;
    if (valor?.tipo === 'dados') {
      const partes = /^(\d+)d(\d+)([+-]\d+)?$/.exec(valor.formula);
      if (partes) {
        for (let i = 0; i < Number(partes[1]); i++)
          resultado += 1 + Math.floor(Math.random() * Number(partes[2]));
        resultado += Number(partes[3] || 0);
        resultado = Math.max(0, resultado);
      }
    }
    const aplicado = alterarMesaCompartilhada(campanhaId, (estado) => {
      const unidade = (estado.unidades as Record<string, unknown>[]).find((u) => u.id === id);
      if (!unidade || !Array.isArray(unidade.itens)) return false;
      const pilha = (unidade.itens as ItemInventario[]).find(
        (i) => i.id === item.id && i.quantidade > 0,
      );
      if (!pilha) return false;
      if (usaImpeto) {
        if (item.efeito === 'cura')
          unidade.hp = Math.min(Number(unidade.hpMax) || 0, (Number(unidade.hp) || 0) + resultado);
        if (item.efeito === 'mana') unidade.mana = (Number(unidade.mana) || 0) + resultado;
        if (item.efeito === 'escudo')
          unidade.escudo = concederEscudo(Number(unidade.escudo) || 0, resultado);
      }
      // Dano não atinge inimigos automaticamente. A aplicação do dano é manual.
      if (item.consumivel) unidade.itens = consumirItem(unidade.itens as ItemInventario[], item.id);
      const registros = Array.isArray(estado.registros)
        ? (estado.registros as Record<string, unknown>[])
        : [];
      estado.registros = [
        ...registros,
        {
          id: crypto.randomUUID?.() || `item-${Date.now()}`,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          texto: `${nomeSelecionado.nome} usou ${item.nome}${valor ? ` (${resultado})` : ''}.`,
          tipo: 'evento',
          visibilidade: 'publica',
        },
      ].slice(-150);
      return true;
    });
    if (aplicado) {
      atualizarDados();
      setMensagemMesa(
        item.efeito === 'dano'
          ? `Rolagem de dano: ${resultado}. Escolha o alvo e aplique manualmente na ficha.`
          : `${item.nome}: ${valor ? resultado + ' ponto(s) calculado(s)' : 'uso narrativo'}.`,
      );
    } else setMensagemMesa('Não foi possível usar o item.');
  };
  useEffect(() => {
    const recarregar = () => {
      setEstado(buscarCampanha());
      const sessaoAtual = lerSessaoMesa3D(campanhaId);
      setSessao(sessaoAtual);
      setPaginasDiario3D(sessaoAtual.paginasDiario);
    };
    window.addEventListener('focus', recarregar);
    window.addEventListener('storage', recarregar);
    window.addEventListener('portal-mestre-mesa-compartilhada', recarregar);
    return () => {
      window.removeEventListener('focus', recarregar);
      window.removeEventListener('storage', recarregar);
      window.removeEventListener('portal-mestre-mesa-compartilhada', recarregar);
    };
  }, []);

  useEffect(() => {
    if (!EMBUTIDO_3D) return;
    const receber = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.canal !== 'portal-mestre-3d'
      )
        return;
      const { tipo, valor } = event.data;
      if (tipo === 'historico-edicao' && (valor === 'desfazer' || valor === 'refazer')) {
        navegarHistorico3D(valor);
        return;
      }
      if (tipo === 'miniaturas') {
        if (valor === 'fechar') {
          setPainelVisivel(false);
          setColocandoMiniatura(false);
          colocandoMiniaturaRef.current = false;
        } else {
          setModoMestre(true);
          modoMestreRef.current = true;
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          if (cinematicaRef.current) {
            cinematicaRef.current = null;
            voltarDaCinematicaRef.current = true;
            window.parent.postMessage(
              { canal: 'portal-mestre-3d', tipo: 'cinematica-encerrada' },
              window.location.origin,
            );
          }
          window.parent.postMessage(
            { canal: 'portal-mestre-3d', tipo: 'camera-modo-atualizado', valor: 'mestre' },
            window.location.origin,
          );
          setFerramenta(null);
          ferramentaRef.current = null;
          setPainelAtivo('miniaturas');
          setPainelVisivel(true);
          setJanelaMinimizada(false);
        }
        return;
      }

      if (tipo === 'visao-individual') {
        const alvo = typeof valor === 'string' && valor ? valor : null;
        ativarVisaoIndividual(alvo);
      }
      if (tipo === 'fog-grupo') {
        setFogGrupo(valor === 'grupo');
      }
      if (tipo === 'fog-raio' && typeof valor === 'number' && Number.isFinite(valor)) {
        raioFogRef.current = Math.max(1, Math.min(15, valor));
        setRaioFog(raioFogRef.current);
      }
      if (tipo === 'clima-atualizado') {
        // A Mesa 2D atualiza o armazenamento da campanha; a iframe usa os mesmos dados.
        const atual = buscarCampanha();
        estadoRef.current = atual;
        setEstado(atual);
      }
      if (tipo === 'skins-atualizadas') {
        // Mensagem enviada DEPOIS da gravação pela interface principal.
        // Não recria o palco nem move tokens, apenas atualiza imagens e metadados.
        setEstado(buscarCampanha());
        setRevisaoImagens((v) => v + 1);
      }
      if (tipo === 'camera-personagem-restaurar') {
        yawPersonagemRef.current = 0.65;
        pitchPersonagemRef.current = 0.3;
        distanciaPersonagemRef.current = 5.2;
      }
      if (tipo === 'cinematica-zoom' && typeof valor === 'number') definirZoomTatico(valor);
      if (tipo === 'cinematica-reenquadrar') {
        definirZoomTatico(100);
        enquadrarTodosCombateRef.current = true;
        deslocamentoTaticoRef.current = { x: 0, z: 0 };
      }
      if (tipo === 'cinematica-encerrar') {
        if (cinematicaRef.current) voltarDaCinematicaRef.current = true;
        cinematicaRef.current = null;
        iniciarTransicaoCinematicaRef.current = false;
        tecladoRef.current.clear();
      }
      if (
        tipo === 'cinematica-iniciar' &&
        valor &&
        typeof valor === 'object' &&
        !Array.isArray(valor)
      ) {
        const pedido = valor as Record<string, unknown>;
        const atual = buscarCampanha();
        const cena = atual.cenas.find((c) => c.id === leituraCenaId.current);
        if (
          pedido.cenaId === leituraCenaId.current &&
          typeof pedido.personagemId === 'string' &&
          cena?.tokens?.[pedido.personagemId]
        ) {
          const modo: ModoCameraCinematica = pedido.modo === 'tatica' ? 'tatica' : 'personagem';
          const alvoId =
            typeof pedido.alvoId === 'string' &&
            cena.tokens[pedido.alvoId] &&
            pedido.alvoId !== pedido.personagemId
              ? pedido.alvoId
              : undefined;
          if (!cinematicaRef.current) iniciarTransicaoCinematicaRef.current = true;
          if (modo === 'personagem' && cinematicaRef.current?.modo !== 'personagem') {
            yawPersonagemRef.current = 0.65;
            pitchPersonagemRef.current = 0.3;
            distanciaPersonagemRef.current = 5.2;
          }
          // Câmeras cinematográficas não são modo de edição: esconda as alças
          // do token, inclusive se a pessoa o selecionou antes de trocar a câmera.
          selecionarTokenNoChao(null);
          setItemMesaSelecionado(null);
          selecionadoRef.current = null;
          setSelecionado(null);
          barreiraSelecionadaRef.current = null;
          setBarreiraSelecionada(null);
          salaRef.current?.selecionarToken(null);
          salaRef.current?.selecionarObjeto(null);
          voltarDaCinematicaRef.current = false;
          cinematicaRef.current = { personagemId: pedido.personagemId, alvoId, modo };
          enquadrarTodosCombateRef.current = false;
          deslocamentoTaticoRef.current = { x: 0, z: 0 };
          tecladoRef.current.clear();
        }
      }
      if (tipo === 'camera' && (valor === 'mestre' || valor === 'terceira')) {
        if (cinematicaRef.current) voltarDaCinematicaRef.current = true;
        cinematicaRef.current = null;
        iniciarTransicaoCinematicaRef.current = false;
        setModoMestre(valor === 'mestre');
        modoMestreRef.current = valor === 'mestre';
        if (valor === 'terceira') {
          selecionarTokenNoChao(null);
          setItemMesaSelecionado(null);
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          setPainelVisivel(false);
          tecladoRef.current.clear();
        }
      }
      if (tipo === 'editor' && (valor === 'abrir' || valor === 'fechar' || valor === 'editar')) {
        // O editor abre como painel de configuração: manter câmera, luz e opacidade.
        // Ativação da edição do chão é separada e explícita.
        if (valor === 'abrir') {
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          setPainelAtivo('construcao');
          setAbaEditor('mapa');
          setPainelVisivel(true);
          setJanelaMinimizada(false);
          setJanelaPos(null);
        } else if (valor === 'editar') {
          setPainelAtivo('construcao');
          setAbaEditor('mapa');
          setPainelVisivel(true);
          setJanelaMinimizada(false);
          setJanelaPos(null);
          iniciarEdicaoTerreno();
        } else {
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          setPainelVisivel(false);
        }
      }
      if (tipo === 'selecionar-luz' && typeof valor === 'string') {
        const atual = buscarCampanha();
        const cena = atual.cenas.find((c) => c.id === leituraCenaId.current);
        if (cena?.fontesLuz.some((l) => l.id === valor)) {
          estadoRef.current = atual;
          setEstado(atual);
          setModoMestre(true);
          modoMestreRef.current = true;
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          anotacaoRef.current = null;
          setAnotacao(null);
          selecionarAnotacao3D('luz', valor);
          setPainelVisivel(false);
        }
      }
      if (tipo === 'selecionar-barreira' && typeof valor === 'string') {
        const atual = buscarCampanha();
        const cena = atual.cenas.find((c) => c.id === leituraCenaId.current);
        if (cena?.barreiras.some((b) => b.id === valor)) {
          setEstado(atual);
          setModoMestre(true);
          modoMestreRef.current = true;
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          selecionadoRef.current = null;
          setSelecionado(null);
          setItemMesaSelecionado(null);
          barreiraSelecionadaRef.current = valor;
          setBarreiraSelecionada(valor);
        }
      }
      if (tipo === 'selecionar' && typeof valor === 'string') {
        const atual = buscarCampanha();
        const cena = atual.cenas.find((c) => c.id === leituraCenaId.current);
        if (
          atual.unidades.some((u) => u.id === valor) &&
          (modoMestreRef.current || Boolean(cena?.tokens?.[valor]))
        ) {
          // Escolher outro personagem pela câmera/ficha não seleciona um token para excluir.
          if (tokenSelecionadoRef.current && tokenSelecionadoRef.current !== valor) {
            selecionarTokenNoChao(null);
            setItemMesaSelecionado(null);
          }
          idRef.current = valor;
          setId(valor);
        }
      }
      if (tipo === 'cena' && typeof valor === 'string' && valor !== leituraCenaId.current) {
        const atual = buscarCampanha();
        if (atual.cenas.some((c) => c.id === valor)) alterarCena(valor, false);
      }
      if (tipo === 'atmosfera' && periodoDia3DValido(valor)) {
        // A janela Iluminação é dona do horário; carregamos o cenário já salvo
        // para não sobrescrever alterações recentes de portas, móveis ou paredes.
        const atualizado = carregarCenario3D(campanhaId, leituraCenaId.current);
        if (atualizado.periodoDia === valor) {
          cenarioRef.current = atualizado;
          setCenario(atualizado);
        }
      }
      if (tipo === 'remover-selecoes') {
        apagarSelecoes3D();
      }
      if (tipo === 'limpar-selecoes') {
        limparSelecoes3D();
      }
      if (tipo === 'desenho-cor' && typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor)) {
        corDesenho3DRef.current = valor;
        setCorDesenho3D(valor);
      }
      if (tipo === 'desenho-espessura' && typeof valor === 'number' && valor >= 1 && valor <= 12) {
        espessuraDesenho3DRef.current = valor;
        setEspessuraDesenho3D(valor);
      }
      if (tipo === 'ferramenta') {
        if (cinematicaRef.current && EMBUTIDO_3D && window.parent !== window)
          window.parent.postMessage(
            { canal: 'portal-mestre-3d', tipo: 'cinematica-encerrada' },
            window.location.origin,
          );
        if (cinematicaRef.current) voltarDaCinematicaRef.current = true;
        cinematicaRef.current = null;
        if (valor === 'mover') {
          anotacaoRef.current = null;
          setAnotacao(null);
          ferramentaFogRef.current = null;
          setFerramentaFog(null);
          setModoEdicao(false);
          modoEdicaoRef.current = false;
          setFerramenta(null);
          ferramentaRef.current = null;
          setPainelVisivel(false);
        } else if (valor === 'marcador' || valor === 'desenhar') {
          ativarAnotacao(valor);
        } else if (
          (valor === 'revelar' || valor === 'ocultar') &&
          ['nevoa', 'nevoa_visao', 'exploracao'].includes(
            estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.visibilidade || '',
          )
        ) {
          usarFerramentaFog(valor);
        } else if (valor === 'parede' || valor === 'porta' || valor === 'luz') {
          anotacaoRef.current = null;
          setAnotacao(null);
          ferramentaFogRef.current = null;
          setFerramentaFog(null);
          selecionarTokenNoChao(null);
          setItemMesaSelecionado(null);
          setModoMestre(true);
          modoMestreRef.current = true;
          setModoEdicao(true);
          modoEdicaoRef.current = true;
          setFerramenta(valor);
          ferramentaRef.current = valor;
          setTipoNovo(valor);
          setAbaEditor('mapa');
          setPainelAtivo('construcao');
          setPainelVisivel(false); // Ferramentas compartilhadas permanecem disponíveis diretamente na mesa
        }
      }
      if (tipo === 'zoom' && typeof valor === 'number') {
        if (valor === 0) {
          distanciaLivreRef.current = 18;
          setDistanciaLivre(18);
          centroLivreRef.current = { x: 0, z: 0 };
          setZoom(5.2);
        } else if (modoMestreRef.current) {
          const distancia = Math.max(5, Math.min(160, distanciaLivreRef.current + valor * 2));
          distanciaLivreRef.current = distancia;
          setDistanciaLivre(distancia);
        } else setZoom((v) => Math.max(3, Math.min(7.8, v + valor * 0.3)));
      }
    };
    window.addEventListener('message', receber);
    return () => window.removeEventListener('message', receber);
  }, []);
  useEffect(() => {
    if (EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        { canal: 'portal-mestre-3d', tipo: 'pronto' },
        window.location.origin,
      );
  }, []);
  useEffect(() => {
    if (EMBUTIDO_3D && window.parent !== window)
      window.parent.postMessage(
        {
          canal: 'portal-mestre-3d',
          tipo: 'editor-status',
          valor: painelVisivel && painelAtivo === 'construcao',
        },
        window.location.origin,
      );
  }, [painelVisivel, painelAtivo]);
  useEffect(() => {
    if (!EMBUTIDO_3D) return;
    const atual = buscarCampanha();
    if (atual.cenaAtivaId && atual.cenaAtivaId !== leituraCenaId.current)
      alterarCena(atual.cenaAtivaId, false);
  }, [estado.cenaAtivaId]);
  useEffect(() => {
    if (!EMBUTIDO_3D || !window.parent || window.parent === window) return;
    window.parent.postMessage(
      { canal: 'portal-mestre-3d', tipo: 'selecionar-personagem', valor: id },
      window.location.origin,
    );
  }, [id]);
  useEffect(() => {
    idRef.current = id;
  }, [id]);
  // Ao mudar de cena, não seguir um token que ficou na cena anterior.
  useEffect(() => {
    if (modoMestre || !personagensNaCena.length) return;
    if (!personagensNaCena.some((u) => u.id === id)) setId(personagensNaCena[0].id);
  }, [cenaId, modoMestre, id, estado.unidades, estado.cenas]);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);
  useEffect(() => {
    modoMestreRef.current = modoMestre;
    tecladoRef.current.clear();
  }, [modoMestre]);
  useEffect(() => {
    moverMesaRef.current = movimentoMesaWASD;
    tecladoRef.current.clear();
  }, [movimentoMesaWASD]);
  // A galeria de retratos usa os MESMOS arquivos do elenco da Mesa 2D.
  const identidadeRetratos = estado.unidades.map((u) => `${u.id}:${u.temRetrato}`).join('|');
  useEffect(() => {
    let ativo = true;
    const urls: string[] = [];
    const comRetrato = estado.unidades.filter((u) => u.temRetrato);
    void carregarArquivos(
      comRetrato.map((u) => chaveArquivoCampanha(campanhaId, `retrato:${u.id}`)),
    )
      .then((blobs) => {
        if (!ativo) return;
        const novos: Record<string, string> = {};
        blobs.forEach((blob, i) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          novos[comRetrato[i].id] = url;
        });
        setRetratos(novos);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // Atualizar imagens só se mudar o elenco, não por alteração de HP/Mana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identidadeRetratos]);
  useEffect(() => {
    let ativo = true;
    let url: string | null = null;
    setArquivoPdf(null);
    const unidade = estado.unidades.find((u) => u.id === id);
    if (unidade?.temPdf)
      void carregarArquivo(chaveArquivoCampanha(campanhaId, `ficha:${id}`))
        .then((blob) => {
          if (!blob || !ativo) return;
          url = URL.createObjectURL(blob);
          setArquivoPdf(url);
        })
        .catch(() => {});
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, estado.unidades.find((u) => u.id === id)?.temPdf]);
  const colocarFichaDaBiblioteca3D = (registro: FichaRegistro) => {
    const campanhaMeta = obterCampanha(campanhaId);
    if (!campanhaMeta || !fichaCompativel(registro, campanhaMeta)) {
      setMensagemMesa('Ficha incompatível com o sistema desta campanha.');
      return;
    }
    const papel = papelDaFicha(registro.dados);
    const existente =
      papel === 'jogador' ? estado.unidades.find((u) => u.fichaId === registro.id) : undefined;
    if (existente) {
      setId(existente.id);
      setPainelAtivo('elenco');
      setMensagemMesa('Este jogador já está na mesa. Selecione-o para continuar.');
      return;
    }
    const dados = registro.dados,
      novoId = crypto.randomUUID();
    const tipo = papel === 'jogador' ? 'jogador' : papel === 'npc' ? 'npc' : 'inimigo';
    const cores = { jogador: '#6b96c5', npc: '#c1ab70', inimigo: '#c77a70' };
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      if (!Array.isArray(raw.unidades) || !Array.isArray(raw.cenas)) return false;
      const unidade = {
        id: novoId,
        nome: dados.name,
        tipo,
        chefe: papel === 'chefe',
        fichaId: registro.id,
        elemento: dados.element,
        hp: dados.hpMax,
        hpMax: dados.hpMax,
        mana: dados.manaMax,
        manaMax: dados.manaMax,
        escudo: 0,
        ca: dados.ca,
        iniciativa: 0,
        condicoes: [],
        itens: [],
        cor: cores[tipo],
        x: 50,
        y: 50,
        temPdf: false,
        temToken: false,
        temRetrato: false,
        retratoEnquadramento: normalizarAjusteRetrato(dados.retratoAjuste),
      };
      (raw.unidades as Record<string, unknown>[]).push(unidade);
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (cena) {
        const tokens = (cena.tokens as Record<string, unknown>) || {};
        cena.tokens = {
          ...tokens,
          [novoId]: { x: 50, y: 50, tamanho: 70, rotacao: 0, oculto: false, visao: 18 },
        };
      }
      return true;
    });
    if (!ok) {
      setMensagemMesa('Não foi possível inserir a ficha na cena.');
      return;
    }
    try {
      if (!campanhaMeta.fichaIds.includes(registro.id))
        atualizarCampanha(campanhaId, { fichaIds: [...campanhaMeta.fichaIds, registro.id] });
    } catch {
      setMensagemMesa('Personagem inserido. Não foi possível atualizar o vínculo da biblioteca.');
    }
    if (dados.photo) {
      void fetch(dados.photo)
        .then((r) => r.blob())
        .then((blob) => salvarArquivo(chaveArquivoCampanha(campanhaId, `retrato:${novoId}`), blob))
        .then(() => {
          alterarMesaCompartilhada(campanhaId, (raw) => {
            const u = (raw.unidades as Record<string, unknown>[]).find(
              (unidade) => unidade.id === novoId,
            );
            if (!u) return false;
            u.temRetrato = true;
            return true;
          });
          atualizarDados();
        })
        .catch(() => setMensagemMesa('Ficha inserida, mas o retrato não pôde ser copiado.'));
    }
    if (dados.temTokenPadrao) {
      void copiarTokenDaFicha(
        registro.id,
        novoId,
        chaveArquivoCampanha(campanhaId, `token:${novoId}`),
      )
        .then((blob) => {
          if (!blob) return;
          alterarMesaCompartilhada(campanhaId, (raw) => {
            const u = (raw.unidades as Record<string, unknown>[]).find(
              (unidade) => unidade.id === novoId,
            );
            if (!u) return false;
            u.temToken = true;
            u.tokenIdleGif = blob.type === 'image/gif';
            return true;
          });
          atualizarDados();
        })
        .catch(() => setMensagemMesa('Ficha inserida, mas o token padrão não pôde ser copiado.'));
    }
    atualizarDados();
    setId(novoId);
    setPainelAtivo('elenco');
    setPainelVisivel(true);
    setMensagemMesa(`${ROTULOS_PAPEL[papel]} ${dados.name} inserido(a) na cena.`);
  };
  const criarPersonagem = () => {
    const nome = nomeNovo.trim().slice(0, 60);
    if (!nome) {
      setMensagemMesa('Informe o nome do personagem.');
      return;
    }
    const novoId = crypto.randomUUID();
    const cores = { jogador: '#6b96c5', npc: '#c1ab70', inimigo: '#c77a70' };
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      if (!Array.isArray(raw.unidades) || !Array.isArray(raw.cenas)) return false;
      const novo = {
        id: novoId,
        nome,
        tipo: tipoNovoPersonagem,
        elemento: '',
        hp: usaImpeto ? 135 : 0,
        hpMax: usaImpeto ? 135 : 0,
        mana: usaImpeto ? 130 : 0,
        manaMax: usaImpeto ? 130 : 0,
        escudo: 0,
        ca: usaImpeto ? 10 : 0,
        iniciativa: 0,
        condicoes: [],
        itens: [],
        cor: cores[tipoNovoPersonagem],
        x: 50,
        y: 50,
        temPdf: false,
        temToken: false,
        temRetrato: false,
      };
      (raw.unidades as Record<string, unknown>[]).push(novo);
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (cena) {
        const tokens = (cena.tokens as Record<string, unknown>) || {};
        cena.tokens = {
          ...tokens,
          [novoId]: { x: 50, y: 50, tamanho: 70, rotacao: 0, oculto: false, visao: 18 },
        };
      }
      return true;
    });
    if (ok) {
      setModalPersonagem(false);
      setId(novoId);
      atualizarDados();
      setMensagemMesa(`${nome} foi adicionado à campanha.`);
      setPainelAtivo('elenco');
      setPainelVisivel(true);
    } else setMensagemMesa('Não foi possível adicionar o personagem.');
  };
  const atualizarPdf = async (file?: File) => {
    if (!file || id === exemplo.id) return;
    if (file.type !== 'application/pdf' || file.size > 15 * 1024 * 1024) {
      setMensagemMesa('Escolha um PDF de até 15 MB.');
      return;
    }
    try {
      await salvarArquivo(chaveArquivoCampanha(campanhaId, `ficha:${id}`), file);
      alterarMesaCompartilhada(campanhaId, (raw) => {
        const u = (raw.unidades as Record<string, unknown>[]).find((u) => u.id === id);
        if (!u) return false;
        u.temPdf = true;
        return true;
      });
      atualizarDados();
      setMensagemMesa('Ficha PDF adicionada ao personagem.');
    } catch {
      setMensagemMesa('Não foi possível armazenar o PDF.');
    }
    if (inputPdfRef.current) inputPdfRef.current.value = '';
  };
  // Na visão do mestre, até grupos ocultos precisam existir para mostrar o fantasma.
  // A marca efetiva de ocultação (token + grupo) só é usada para render e visão individual,
  // sem modificar o salvamento do token nem transmitir segredos aos convidados.
  const unidadesPorId = new Map(estado.unidades.map((u) => [u.id, u]));
  const tokensNasCamadas = Object.fromEntries(
    Object.entries(cenaAtual?.tokens || {})
      .filter(([uid]) => unidadesPorId.has(uid))
      .map(([uid, token]) => {
        const unidade = unidadesPorId.get(uid)!;
        return [
          uid,
          { ...token, oculto: tokenOcultoParaJogador(unidade.tipo, token, cenaAtual?.camadas) },
        ];
      }),
  );
  // Recria figuras somente quando elenco/skins mudam. Movimento, HP e turnos não
  // devem descartar texturas nem reconstruir geometria a cada atualização.
  const visuaisCena = JSON.stringify({
    id,
    cenaId,
    unidades: estado.unidades.map((u) => ({
      id: u.id,
      nome: u.nome,
      cor: u.cor,
      skins: u.skinPadraoId,
      temToken: u.temToken,
    })),
    tokens: Object.entries(tokensNasCamadas).map(([k, v]) => ({
      id: k,
      skinId: v.skinId,
      oculto: v.oculto,
    })),
  });
  useEffect(() => {
    const token = estado.cenas.find((c) => c.id === cenaId)?.tokens[id];
    posicaoRef.current = token
      ? percentualParaChao3D(token, cenarioRef.current)
      : posicaoLivre3D(cenarioRef.current, PONTO_INICIAL);
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    if (ultimoElenco3D.current !== visuaisCena) {
      sala.configurarParticipantes(estado.unidades, tokensNasCamadas, id);
      ultimoElenco3D.current = visuaisCena;
    } else {
      for (const [tokenId, local] of Object.entries(tokensNasCamadas)) {
        const p = percentualParaChao3D(local, cenarioRef.current);
        sala.visualizarToken(tokenId, p.x, p.z);
      }
    }
    for (const [tokenId, registro] of Object.entries(tokensNasCamadas)) {
      sala.orientarToken(tokenId, Boolean(registro.espelhadoX));
      sala.dimensionarToken(tokenId, dimensoesToken3D(registro));
    }
  }, [
    id,
    cenaId,
    estado,
    salaPronta,
    visuaisCena,
    cenario.larguraTerreno,
    cenario.profundidadeTerreno,
  ]);
  // Muda aro e fundo sem reconstruir os standees: preserva skins e câmera.
  const aparenciasCena = JSON.stringify(
    estado.unidades
      .filter((u) => Boolean(cenaAtual?.tokens[u.id]))
      .map((u) => ({ id: u.id, aparencia: aparenciaTokenAtiva(u, cenaAtual?.tokens[u.id]) })),
  );
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    for (const u of estado.unidades) {
      const token = cenaAtual?.tokens[u.id];
      if (token) sala.definirAparenciaToken(u.id, aparenciaTokenAtiva(u, token));
    }
  }, [aparenciasCena, visuaisCena, salaPronta]);
  // Aparência e modo fantasma são independentes do envio ao jogador.
  useEffect(() => {
    salaRef.current?.configurarOcultacaoTokens(tokensNasCamadas, modoMestre && !visaoIndividualId);
  }, [visuaisCena, estado, modoMestre, visaoIndividualId, salaPronta, aparenciasCena]);
  // Seleção no chão é independente do personagem acompanhado pela câmera.
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala) return;
    const liberado = modoMestre && !visaoIndividualId;
    const tokens = liberado
      ? selecoes3D.filter((v) => v.startsWith('token:')).map((v) => v.slice(6))
      : [];
    if (tokens.length) sala.selecionarTokens(tokens);
    else
      sala.selecionarToken(
        liberado && !modoEdicao && !cinematicaRef.current ? tokenSelecionadoId : null,
      );
  }, [
    selecoes3D,
    tokenSelecionadoId,
    selecionado,
    modoMestre,
    modoEdicao,
    visaoIndividualId,
    visuaisCena,
    salaPronta,
    cenario,
  ]);
  // Preferências de idle não requerem reconstruir o standee nem recarregar a textura.
  const assinaturaIdles = JSON.stringify(
    estado.unidades
      .filter((u) => Boolean(cenaAtual?.tokens[u.id]))
      .map((u) => ({ id: u.id, ...parametrosIdleAtivos(u, cenaAtual?.tokens[u.id]) })),
  );
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    for (const u of estado.unidades) {
      if (!cenaAtual?.tokens[u.id]) continue;
      const config = parametrosIdleAtivos(u, cenaAtual.tokens[u.id]);
      sala.configurarIdleToken(u.id, config.pausado, config.velocidade);
    }
  }, [assinaturaIdles, salaPronta, visuaisCena]);
  // As imagens extras seguem a galeria existente. Nenhum token ganha uma ficha duplicada.
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    let ativo = true;
    const tokens = tokensNasCamadas;
    const restantes = estado.unidades.filter((u) => u.id !== id && tokens[u.id]);
    // Carrega em grupos pequenos: deixa o mapa e os controles responsivos enquanto
    // os GIFs são decodificados fora da thread principal.
    void (async () => {
      for (let i = 0; i < restantes.length && ativo; i += 2) {
        await Promise.all(
          restantes.slice(i, i + 2).map(async (u) => {
            try {
              const chave = (nome: string) => chaveArquivoCampanha(campanhaId, nome);
              const skin = skinAtiva(u, tokens[u.id]);
              const tentativas = [
                ...(skin !== 'original' ? [chave(chaveImagemSkin(u.id, skin))] : []),
                chave(`token:${u.id}`),
                ...(u.temRetrato ? [chave(`retrato:${u.id}`)] : []),
              ];
              const blobs = await carregarArquivos(tentativas);
              const blob = blobs.find(Boolean) ?? null;
              if (ativo)
                await sala.carregarImagemParticipante(
                  u.id,
                  blob,
                  () => ativo && salaRef.current === sala,
                );
            } catch {
              /* Standee com cor e nome quando não houver retrato. */
            }
          }),
        );
      }
    })();
    return () => {
      ativo = false;
    };
  }, [visuaisCena, salaPronta, revisaoImagens]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    anguloRef.current = angulo;
  }, [angulo]);
  useEffect(() => {
    modoEdicaoRef.current = modoEdicao;
    tecladoRef.current.clear();
    if (!modoEdicao) {
      setFerramenta(null);
      ferramentaRef.current = null;
    }
  }, [modoEdicao]);
  useEffect(() => {
    anotacaoRef.current = anotacao;
  }, [anotacao]);
  useEffect(() => {
    ferramentaRef.current = ferramenta;
  }, [ferramenta]);
  useEffect(() => {
    if (EMBUTIDO_3D && window.parent !== window) {
      window.parent.postMessage(
        {
          canal: 'portal-mestre-3d',
          tipo: 'ferramenta-atual',
          valor: anotacao || ferramentaFog || (modoEdicao && ferramenta ? ferramenta : 'mover'),
        },
        window.location.origin,
      );
    }
  }, [modoEdicao, ferramenta, ferramentaFog, anotacao]);
  useEffect(() => {
    if (painelAtivo === 'construcao' && painelVisivel && modoEdicao && painelEditorRef.current)
      painelEditorRef.current.scrollTop = 0;
  }, [painelAtivo, painelVisivel, modoEdicao]);
  useEffect(() => {
    const sala = salaRef.current;
    if (sala) {
      sala.configurarCenario(cenario);
      sala.selecionarObjeto(modoMestre ? selecionado : null);
      sala.configurarConstrucao(modoEdicao, cenario);
    }
  }, [cenario, selecionado, modoEdicao, modoMestre, salaPronta]);
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala) return;
    const objetos =
      modoMestre && !visaoIndividualId
        ? selecoes3D.filter((v) => v.startsWith('objeto:')).map((v) => v.slice(7))
        : [];
    if (objetos.length) sala.selecionarObjetos(objetos);
    else sala.selecionarObjeto(modoMestre ? selecionado : null);
  }, [selecoes3D, cenario, selecionado, modoMestre, visaoIndividualId, salaPronta]);
  useEffect(() => {
    salaRef.current?.configurarVisibilidadeObjetos(cenaAtual?.camadas?.objetos !== false);
  }, [cenaAtual?.camadas?.objetos, cenaId, cenario, salaPronta]);
  // A camada GLB pertence ao cenário, não ao tipo de câmera.
  // Visão de Mesa, Terceira Pessoa e as câmeras cinematográficas (Personagem/Tática)
  // devem usar as mesmas miniaturas; o filtro de Observar/Fog é aplicado na sala.
  // Nunca utilizar modoMestre como argumento `mostrar`, pois a Terceira Pessoa
  // o define como false e desliga todas as miniaturas vinculadas.
  useEffect(() => {
    salaRef.current?.configurarMiniaturas(
      cenario.miniaturas ?? [],
      cenario,
      cenaAtual?.tokens ?? {},
      true,
    );
  }, [cenario, visuaisCena, salaPronta, cenaId]);
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala) return;
    if (miniaturaSelecionadaId) sala.selecionarMiniatura(miniaturaSelecionadaId);
    else sala.selecionarToken(tokenSelecionadoId);
  }, [miniaturaSelecionadaId, tokenSelecionadoId, cenario, salaPronta]);
  useEffect(() => {
    salaRef.current?.configurarBarreiras(
      barreirasCena,
      cenario,
      modoMestre && !visaoIndividualId,
      visaoIndividualId ? null : barreiraSelecionada,
      selecoes3D.filter((v) => v.startsWith('barreira:')).map((v) => v.slice(9)),
    );
  }, [
    assinaturaBarreiras,
    cenaId,
    cenario,
    modoMestre,
    barreiraSelecionada,
    visaoIndividualId,
    salaPronta,
    selecoes3D,
  ]);
  const assinaturaLuzes = JSON.stringify(cenaAtual?.fontesLuz ?? []);
  const assinaturaAnotacoes = JSON.stringify([
    cenaAtual?.marcadores ?? [],
    cenaAtual?.desenhos ?? [],
  ]);
  useEffect(() => {
    salaRef.current?.configurarFontesLuz(cenaAtual?.fontesLuz ?? [], cenario, modoMestre);
  }, [assinaturaLuzes, cenario, cenaId, modoMestre, salaPronta]);
  useEffect(() => {
    salaRef.current?.configurarAnotacoes(
      cenaAtual?.marcadores ?? [],
      cenaAtual?.desenhos ?? [],
      cenario,
      modoMestre && cenaAtual?.camadas?.marcadores !== false,
    );
  }, [
    assinaturaAnotacoes,
    cenaId,
    cenario,
    modoMestre,
    cenaAtual?.camadas?.marcadores,
    salaPronta,
  ]);
  useEffect(() => {
    salaRef.current?.selecionarAnotacaoVisual(
      anotacaoSelecionada?.tipo ?? null,
      anotacaoSelecionada?.id ?? null,
      selecoes3D,
    );
  }, [assinaturaAnotacoes, assinaturaLuzes, anotacaoSelecionada, selecoes3D, salaPronta]);
  // Migra lâmpadas 3D antigas somente após salvar as correspondentes fontes
  // no estado compartilhado. IDs determinísticos impedem duplicação no reload.
  useEffect(() => {
    const antigas = cenario.objetos.filter((o) => o.tipo === 'luz');
    if (!antigas.length) return;
    const area = dimensoesTerreno3D(cenario);
    const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (!cena) return false;
      const existentes = Array.isArray(cena.fontesLuz) ? (cena.fontesLuz as { id: string }[]) : [];
      const ids = new Set(existentes.map((f) => f.id));
      cena.fontesLuz = [
        ...existentes,
        ...antigas.map((o) => luz3DParaFonte(o, area)).filter((f) => !ids.has(f.id)),
      ];
      return true;
    });
    if (!ok) return;
    try {
      const novo = salvarCenario3D(campanhaId, cenaId, {
        ...cenario,
        objetos: cenario.objetos.filter((o) => o.tipo !== 'luz'),
      });
      cenarioRef.current = novo;
      setCenario(novo);
      const atualizado = buscarCampanha();
      estadoRef.current = atualizado;
      setEstado(atualizado);
    } catch {
      setAvisoEdicao(
        'Luzes migradas. Não foi possível retirar as lâmpadas antigas do cenário; tente novamente após salvar.',
      );
    }
  }, [cenario, cenaId]);
  // Atualiza a máscara espacial e os NPCs visíveis na mesma cena compartilhada.
  // A posição local torna o campo responsivo durante o movimento em WASD.
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    const cena = estado.cenas.find((c) => c.id === cenaId);
    const observador =
      visaoIndividualId && cena?.tokens[visaoIndividualId] ? visaoIndividualId : null;
    const posicaoAtual =
      observador === id ? chaoParaPercentual3D(posicaoRef.current, cenario) : undefined;
    sala.configurarVisaoIndividual(
      observador,
      tokensNasCamadas,
      cena?.barreiras || [],
      cenario,
      posicaoAtual,
      {
        ativo: cena?.visibilidade === 'exploracao' || cena?.visibilidade === 'nevoa',
        manualSomente: cena?.visibilidade === 'nevoa',
        memoria: cena?.exploracaoPorToken || {},
        pinceis: cena?.nevoa || [],
        grupo: fogGrupo,
        idsGrupo: estado.unidades
          .filter((u) => u.tipo === 'jogador' && cena?.tokens[u.id])
          .map((u) => u.id),
      },
    );
  }, [
    visaoIndividualId,
    estado,
    salaPronta,
    mapaPronto,
    cenaId,
    cenario,
    visuaisCena,
    posicao.x,
    posicao.z,
    id,
    fogGrupo,
  ]);
  // Todos os tokens da cena recebem memória independente. A gravação só ocorre
  // quando o polígono alcança uma nova célula, sem reabrir texturas nem reconstruir skins.
  const assinaturaExploradores = Object.entries(cenaAtual?.tokens || {})
    .map(([uid, t]) => `${uid}:${t.x}:${t.y}:${t.visao}`)
    .join('|');
  useEffect(() => {
    const atual = estadoRef.current.cenas.find((c) => c.id === cenaId);
    if (atual?.visibilidade !== 'exploracao') return;
    const dimensoes = dimensoesTerreno3D(cenarioRef.current),
      dim = { largura: dimensoes.largura, altura: dimensoes.profundidade };
    const memoria = { ...validarMemoriaFog(atual.exploracaoPorToken) };
    let alterou = false;
    for (const [uid, token] of Object.entries(atual.tokens)) {
      const posicao =
        uid === idRef.current
          ? chaoParaPercentual3D(posicaoRef.current, cenarioRef.current)
          : token;
      const poligono = poligonoDoObservador({ ...token, ...posicao }, atual.barreiras, dim);
      const visiveis = celulasVisiveisFog([poligono], dim);
      const proxima = acrescentarExploracaoFog(memoria[uid], visiveis);
      if (memoria[uid] !== proxima) {
        memoria[uid] = proxima;
        alterou = true;
      }
    }
    if (!alterou) return;
    alterarMesaCompartilhada(campanhaId, (raw) => {
      const cena = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
      if (!cena || cena.visibilidade !== 'exploracao') return false;
      cena.exploracaoPorToken = { ...validarMemoriaFog(cena.exploracaoPorToken), ...memoria };
      return true;
    });
  }, [cenaId, cenario, assinaturaExploradores, posicao.x, posicao.z, estado]);
  useEffect(() => {
    salaRef.current?.configurarIluminacao(
      cenaAtual?.iluminacao.ambiente ?? 40,
      cenaAtual?.iluminacao.ativa ?? false,
    );
  }, [cenaId, estado, salaPronta]);
  // Atualiza apenas as geometrias/visibilidade do clima, sem recriar a cena, tokens ou skins.
  useEffect(() => {
    climaCena3DRef.current?.configurar(normalizarClima(cenaAtual?.clima), pausarClima3D);
  }, [
    cenaId,
    cenaAtual?.clima?.tipo,
    cenaAtual?.clima?.intensidade,
    cenaAtual?.clima?.vento,
    cenaAtual?.clima?.direcao,
    pausarClima3D,
    salaPronta,
  ]);
  // O mapa compartilhado da campanha é a fonte principal. A imagem e suas
  // dimensões são resolvidas ANTES de expor o palco; abrir o editor não deve
  // ser necessário para corrigir o tamanho do mapa.
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    let ativo = true;
    const idCena = cenaId;
    setMapaPronto(false);
    const carregarMapa = async () => {
      try {
        const [primario, antigo] = await Promise.all([
          carregarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(idCena))),
          carregarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(idCena))),
        ]);
        if (!ativo || salaRef.current !== sala || leituraCenaId.current !== idCena) return;
        // Um piso legado só é exibido quando a cena ainda o utiliza. Evita
        // ressuscitar uma imagem já removida do mapa compartilhado.
        const blob = primario || (cenarioRef.current.piso === 'imagem' ? antigo : null);
        let atual = cenarioRef.current;
        let ajustado = atual;
        if (primario) {
          const bitmap = await createImageBitmap(primario);
          const d = dimensoesTerrenoDaPlanta3D(bitmap.width, bitmap.height);
          const aspecto = bitmap.width / bitmap.height;
          bitmap.close();
          if (!ativo || salaRef.current !== sala || leituraCenaId.current !== idCena) return;
          if (atual.piso !== 'imagem' && atual.objetos.length === 0) {
            ajustado = {
              ...atual,
              piso: 'imagem',
              base: 'vazia',
              mapaUnico: true,
              larguraTerreno: d.largura,
              profundidadeTerreno: d.profundidade,
              larguraPlanta: d.largura,
              profundidadePlanta: d.profundidade,
              aspectoPlanta: aspecto,
              ajusteLivrePlanta: true,
              escalaMapa: 1,
              deslocamentoMapaX: 0,
              deslocamentoMapaZ: 0,
            };
          } else if (atual.mapaUnico && atual.piso === 'imagem') {
            ajustado = ajustarProporcaoMapaCompartilhado3D(atual, aspecto);
          }
        }
        if (
          blob &&
          ajustado.piso === 'imagem' &&
          (!ajustado.larguraTerreno ||
            !ajustado.profundidadeTerreno ||
            !ajustado.larguraPlanta ||
            !ajustado.aspectoPlanta)
        ) {
          const bitmap = await createImageBitmap(blob);
          const d = dimensoesTerrenoDaPlanta3D(bitmap.width, bitmap.height);
          const aspecto = bitmap.width / bitmap.height;
          bitmap.close();
          if (!ativo || salaRef.current !== sala || leituraCenaId.current !== idCena) return;
          ajustado = {
            ...ajustado,
            larguraTerreno: ajustado.larguraTerreno ?? d.largura,
            profundidadeTerreno: ajustado.profundidadeTerreno ?? d.profundidade,
            larguraPlanta: ajustado.larguraPlanta ?? d.largura,
            profundidadePlanta: ajustado.profundidadePlanta ?? d.profundidade,
            aspectoPlanta: ajustado.aspectoPlanta ?? aspecto,
          };
        }
        if (ajustado !== atual) {
          // Atualiza o renderizador SINCRONAMENTE. setCenario sozinho só se reflete
          // em outro render React, causando o enquadramento provisório do bug.
          mudarCenario(ajustado);
          atual = cenarioRef.current;
          sala.configurarCenario(atual);
          sala.configurarConstrucao(modoEdicaoRef.current, atual);
          const token = estadoRef.current.cenas.find((c) => c.id === idCena)?.tokens[idRef.current];
          if (token) {
            posicaoRef.current = percentualParaChao3D(token, atual);
            sala.avatar.position.set(posicaoRef.current.x, 0, posicaoRef.current.z);
          }
        }
        // Recalcula o campo da câmera UMA vez por cena, depois de conhecer a
        // proporção real da imagem. Não altera o zoom que o mestre ajustou depois.
        if (!enquadramentosIniciaisRef.current.has(idCena)) {
          const d = dimensoesTerreno3D(atual);
          const root = stageRef.current;
          const aspectoTela = root
            ? Math.max(1, root.clientWidth) / Math.max(1, root.clientHeight)
            : 16 / 9;
          const distancia = distanciaInicialMapa3D(
            d.largura,
            d.profundidade,
            aspectoTela,
            yawLivreRef.current,
            pitchLivreRef.current,
          );
          distanciaLivreRef.current = distancia;
          setDistanciaLivre(distancia);
          centroLivreRef.current = { x: 0, z: 0 };
          enquadramentosIniciaisRef.current.add(idCena);
        }
        // Só agora aplica a textura: ela já recebe as dimensões definitivas.
        await sala.aplicarPiso(
          blob ? 'imagem' : atual.piso === 'imagem' ? 'madeira' : atual.piso || 'madeira',
          blob,
        );
        if (!ativo || salaRef.current !== sala || leituraCenaId.current !== idCena) return;
        setImagemPiso(!!blob);
        setMapaPronto(true);
      } catch {
        if (!ativo || salaRef.current !== sala || leituraCenaId.current !== idCena) return;
        try {
          await sala.aplicarPiso('madeira');
        } catch {
          /* evita travar a cena sem imagem */
        }
        setImagemPiso(false);
        setMapaPronto(true);
        setAvisoEdicao(
          'Não foi possível carregar a imagem da planta. Confira o arquivo salvo da cena.',
        );
      }
    };
    void carregarMapa();
    return () => {
      ativo = false;
    };
  }, [cenaId, salaPronta, cenario.piso, versaoPiso]);
  const importarPiso = async (arquivo?: File) => {
    if (!arquivo) return;
    if (!cenarioRef.current.mapaUnico && cenarioRef.current.objetos.length) {
      setAvisoEdicao(
        'Esta cena tem construções do formato antigo. Use primeiro “Unificar este mapa com a Mesa 2D” para preservar seus objetos.',
      );
      if (inputPisoRef.current) inputPisoRef.current.value = '';
      return;
    }
    setEnviandoPiso(true);
    setAvisoEdicao('Preparando imagem de piso...');
    const idCena = cenaId;
    try {
      const bitmap = await createImageBitmap(arquivo);
      const dimensoes = dimensoesTerrenoDaPlanta3D(bitmap.width, bitmap.height);
      const aspectoPlanta = bitmap.width / bitmap.height;
      bitmap.close();
      const blob = await prepararImagemPiso3D(arquivo);
      await salvarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(idCena)), blob);
      // Uma importação vale para as duas modalidades: salvamos o original na campanha.
      await salvarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(idCena)), arquivo);
      alterarMesaCompartilhada(campanhaId, (raw) => {
        const atual = (raw.cenas as Record<string, unknown>[]).find((c) => c.id === idCena);
        if (!atual) return false;
        atual.temMapa = true;
        return true;
      });
      setEstado(buscarCampanha());
      setImagemPiso(true);
      setVersaoPiso((v) => v + 1);
      if (leituraCenaId.current === idCena) {
        distanciaLivreRef.current = Math.max(
          18,
          Math.max(dimensoes.largura, dimensoes.profundidade) * 1.05,
        );
        setDistanciaLivre(distanciaLivreRef.current);
        mudarCenario({
          ...cenarioRef.current,
          piso: 'imagem',
          base: 'vazia',
          mapaUnico: true,
          larguraTerreno: dimensoes.largura,
          profundidadeTerreno: dimensoes.profundidade,
          larguraPlanta: dimensoes.largura,
          profundidadePlanta: dimensoes.profundidade,
          aspectoPlanta,
          ajusteLivrePlanta: true,
          escalaMapa: 1,
          deslocamentoMapaX: 0,
          deslocamentoMapaZ: 0,
        });
      }
      setAvisoEdicao('Piso importado e salvo com o backup da campanha.');
    } catch (e) {
      setAvisoEdicao(e instanceof Error ? e.message : 'Não foi possível importar a imagem.');
    } finally {
      setEnviandoPiso(false);
      if (inputPisoRef.current) inputPisoRef.current.value = '';
    }
  };
  /** Copia o mapa da Mesa 2D desta cena sem movê-lo ou substituí-lo. */
  const usarMapaDaMesa2D = async () => {
    if (!cenarioRef.current.mapaUnico && cenarioRef.current.objetos.length) {
      setAvisoEdicao(
        'Há construções antigas nesta cena. Converta primeiro o mapa para preservar paredes e móveis.',
      );
      return;
    }
    const idCena = cenaId;
    setEnviandoPiso(true);
    setAvisoEdicao('Carregando o mapa desta cena da Mesa 2D...');
    try {
      const original = await carregarArquivo(
        chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(idCena)),
      );
      if (!original) throw Error('Esta cena ainda não tem mapa na Mesa 2D. Importe-o lá primeiro.');
      const bitmap = await createImageBitmap(original);
      const dimensoes = dimensoesTerrenoDaPlanta3D(bitmap.width, bitmap.height);
      const aspectoPlanta = bitmap.width / bitmap.height;
      bitmap.close();
      const blob = await prepararImagemPiso3D(original);
      await salvarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(idCena)), blob);
      if (leituraCenaId.current !== idCena) return;
      setImagemPiso(true);
      setVersaoPiso((v) => v + 1);
      distanciaLivreRef.current = Math.max(
        18,
        Math.max(dimensoes.largura, dimensoes.profundidade) * 1.05,
      );
      setDistanciaLivre(distanciaLivreRef.current);
      mudarCenario({
        ...cenarioRef.current,
        base: 'vazia',
        piso: 'imagem',
        mapaUnico: true,
        ajusteMapa: 'conter',
        larguraTerreno: dimensoes.largura,
        profundidadeTerreno: dimensoes.profundidade,
        larguraPlanta: dimensoes.largura,
        profundidadePlanta: dimensoes.profundidade,
        aspectoPlanta,
        ajusteLivrePlanta: true,
        escalaMapa: 1,
        deslocamentoMapaX: 0,
        deslocamentoMapaZ: 0,
      });
      setAvisoEdicao(
        'Mapa da Mesa 2D copiado como chão. Agora desenhe as paredes por cima; o mapa original não foi alterado.',
      );
    } catch (e) {
      setAvisoEdicao(
        e instanceof Error ? e.message : 'Não foi possível carregar o mapa da Mesa 2D.',
      );
    } finally {
      setEnviandoPiso(false);
    }
  };
  /** Migração opt-in de cenas legadas. Uma vez convertidas, paredes/portas viram
   * barreiras percentuais da Mesa 2D e não mais caixas 3D opacas. As outras peças
   * conservam suas posições relativas à imagem e continuam no backup. */
  const unificarMapaLegado = async () => {
    const idCena = leituraCenaId.current,
      antigo = cenarioRef.current;
    if (antigo.mapaUnico) return;
    setEnviandoPiso(true);
    setAvisoEdicao('Preparando a unificação do mapa da cena...');
    try {
      const principal = await carregarArquivo(
        chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(idCena)),
      );
      const legado = await carregarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(idCena)));
      const imagem = principal || legado;
      let medida: { largura: number; profundidade: number } = dimensoesTerreno3D(antigo);
      let aspecto = medida.largura / medida.profundidade;
      if (imagem) {
        const bmp = await createImageBitmap(imagem);
        medida = dimensoesTerrenoDaPlanta3D(bmp.width, bmp.height);
        aspecto = bmp.width / bmp.height;
        bmp.close();
      }
      const novo: Cenario3D = {
        ...antigo,
        base: 'vazia',
        mapaUnico: true,
        piso: imagem ? 'imagem' : antigo.piso || 'madeira',
        larguraTerreno: medida.largura,
        profundidadeTerreno: medida.profundidade,
        larguraPlanta: medida.largura,
        profundidadePlanta: medida.profundidade,
        aspectoPlanta: aspecto,
        escalaMapa: 1,
        ajusteLivrePlanta: true,
        deslocamentoMapaX: 0,
        deslocamentoMapaZ: 0,
      };
      const converter = (p: { x: number; z: number }) => chaoParaPercentual3D(p, antigo);
      const outros: ObjetoCena3D[] = [];
      const convertidas: BarreiraMapa[] = [];
      for (const obj of antigo.objetos) {
        const mid = converter({ x: obj.x, z: obj.z });
        if (obj.tipo !== 'parede' && obj.tipo !== 'porta') {
          const ponto = percentualParaChao3D(mid, novo);
          outros.push({ ...obj, x: ponto.x, z: ponto.z });
          continue;
        }
        const comprimento = medidasObjeto3D(obj).largura;
        const dx = (Math.cos(obj.rotacao) * comprimento) / 2,
          dz = (Math.sin(obj.rotacao) * comprimento) / 2;
        const inicio = converter({ x: obj.x - dx, z: obj.z - dz });
        const fim = converter({ x: obj.x + dx, z: obj.z + dz });
        convertidas.push({
          id: `barreira-${obj.id}`,
          tipo: obj.tipo,
          x1: inicio.x,
          y1: inicio.y,
          x2: fim.x,
          y2: fim.y,
          aberta: false,
          trancada: false,
        });
      }
      const salvo = alterarMesaCompartilhada(campanhaId, (estado) => {
        const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c.id === idCena);
        if (!cena) return false;
        const existentes = Array.isArray(cena.barreiras) ? (cena.barreiras as BarreiraMapa[]) : [];
        const novas = convertidas.filter((b) => !existentes.some((a) => a.id === b.id));
        cena.barreiras = [...existentes, ...novas];
        if (imagem) cena.temMapa = true;
        return true;
      });
      if (!salvo) throw Error('Não foi possível salvar as barreiras compartilhadas.');
      if (imagem && !principal)
        await salvarArquivo(chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(idCena)), imagem);
      mudarCenario({ ...novo, objetos: outros });
      estadoRef.current = buscarCampanha();
      setEstado(estadoRef.current);
      setVersaoPiso((v) => v + 1);
      setAvisoEdicao(
        `Mapa unificado: ${convertidas.length} parede(s)/porta(s) convertida(s). Revise as posições dos objetos na cena.`,
      );
    } catch (e) {
      setAvisoEdicao(e instanceof Error ? e.message : 'Não foi possível unificar a cena antiga.');
    } finally {
      setEnviandoPiso(false);
    }
  };
  /** Redimensiona a própria planta, por eixo. Mantém o mapa 2D original intocado.
   * O terreno expande apenas se necessário; nunca encolhe e não move peças existentes. */
  const redimensionarPlanta = (eixo: 'largura' | 'profundidade', valor: number) => {
    const atual = cenarioRef.current;
    const escala = Math.max(0.5, Math.min(2, atual.escalaMapa ?? 1));
    const maximo = 120 / escala;
    if (!Number.isFinite(valor) || valor < 4 || valor > maximo) return;
    const largura =
      eixo === 'largura' ? valor : (atual.larguraPlanta ?? dimensoesTerreno3D(atual).largura);
    const profundidade =
      eixo === 'profundidade'
        ? valor
        : (atual.profundidadePlanta ?? dimensoesTerreno3D(atual).profundidade);
    mudarCenario({
      ...atual,
      ajusteLivrePlanta: true,
      larguraPlanta: largura,
      profundidadePlanta: profundidade,
      larguraTerreno: Math.min(120, Math.max(dimensoesTerreno3D(atual).largura, largura * escala)),
      profundidadeTerreno: Math.min(
        120,
        Math.max(dimensoesTerreno3D(atual).profundidade, profundidade * escala),
      ),
    });
  };
  const confirmarRascunhoPlanta = (eixo: 'largura' | 'profundidade', texto: string) => {
    const numero = Number(texto.trim().replace(',', '.'));
    const anterior =
      eixo === 'largura'
        ? (cenarioRef.current.larguraPlanta ?? dimensoesTerreno3D(cenarioRef.current).largura)
        : (cenarioRef.current.profundidadePlanta ??
          dimensoesTerreno3D(cenarioRef.current).profundidade);
    const maximo = 120 / Math.max(0.5, Math.min(2, cenarioRef.current.escalaMapa ?? 1));
    if (!texto.trim() || !Number.isFinite(numero) || numero < 4 || numero > maximo) {
      setAvisoEdicao(
        `Informe um número entre 4 e ${maximo.toFixed(1)} m para a ${eixo === 'largura' ? 'largura' : 'profundidade'}.`,
      );
      if (eixo === 'largura') setRascunhoLarguraPlanta(String(anterior));
      else setRascunhoProfundidadePlanta(String(anterior));
      return;
    }
    redimensionarPlanta(eixo, numero);
    if (eixo === 'largura') setRascunhoLarguraPlanta(String(numero));
    else setRascunhoProfundidadePlanta(String(numero));
  };
  const confirmarRascunhoTerreno = (eixo: 'largura' | 'profundidade', texto: string) => {
    const numero = Number(texto.trim().replace(',', '.'));
    const atual = cenarioRef.current;
    const dims = dimensoesTerreno3D(atual);
    const anterior = eixo === 'largura' ? dims.largura : dims.profundidade;
    const restaurar = () => {
      if (eixo === 'largura') setRascunhoLarguraTerreno(String(anterior));
      else setRascunhoProfundidadeTerreno(String(anterior));
    };
    if (!texto.trim() || !Number.isFinite(numero) || numero < 4 || numero > 120) {
      setAvisoEdicao('Informe uma medida válida entre 4 e 120 metros.');
      restaurar();
      return;
    }
    const escala = Math.max(0.5, Math.min(2, atual.escalaMapa ?? 1));
    const medidaPlanta = eixo === 'largura' ? atual.larguraPlanta : atual.profundidadePlanta;
    if (atual.piso === 'imagem' && medidaPlanta && numero < medidaPlanta * escala - 0.01) {
      setAvisoEdicao(
        'O terreno não pode ficar menor que a imagem da planta. Ajuste primeiro a planta.',
      );
      restaurar();
      return;
    }
    if (
      atual.objetos.some((o) => {
        const m = medidasObjeto3D(o),
          cos = Math.abs(Math.cos(o.rotacao)),
          sin = Math.abs(Math.sin(o.rotacao));
        const limite =
          eixo === 'largura'
            ? Math.abs(o.x) + (m.largura * cos + m.profundidade * sin) / 2
            : Math.abs(o.z) + (m.largura * sin + m.profundidade * cos) / 2;
        return limite > numero / 2 - 0.1;
      })
    ) {
      setAvisoEdicao('Existem objetos fora dessa medida. Mova-os antes de diminuir o terreno.');
      restaurar();
      return;
    }
    mudarCenario({
      ...atual,
      [eixo === 'largura' ? 'larguraTerreno' : 'profundidadeTerreno']: numero,
    });
  };
  const [confirmarRemocaoMapa, setConfirmarRemocaoMapa] = useState(false);
  const removerPiso = async () => {
    try {
      await excluirArquivo(chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(cenaId)));
      if (cenarioRef.current.mapaUnico) {
        await excluirArquivo(chaveArquivoCampanha(campanhaId, CHAVE_MAPA_2D(cenaId)));
        alterarMesaCompartilhada(campanhaId, (estado) => {
          const c = (estado.cenas as Record<string, unknown>[]).find((c) => c.id === cenaId);
          if (!c) return false;
          c.temMapa = false;
          return true;
        });
        setEstado(buscarCampanha());
      }
      setImagemPiso(false);
      setVersaoPiso((v) => v + 1);
      mudarCenario({ ...cenarioRef.current, piso: 'madeira' });
      setConfirmarRemocaoMapa(false);
      setAvisoEdicao('Imagem removida desta cena conforme a opção escolhida.');
    } catch {
      setAvisoEdicao('Não foi possível remover a imagem do piso.');
    }
  };

  // Carrega exclusivamente a aparência visual da biblioteca. A posição e os dados do personagem não são modificados.
  useEffect(() => {
    const sala = salaRef.current;
    if (!sala || !salaPronta) return;
    let ativo = true;
    const escolhido = nomeSelecionado;
    const carregar = async () => {
      let blob: Blob | null = null;
      const token = cenaAtual?.tokens[escolhido.id];
      const skin = skinAtiva(escolhido, token);
      const chave = (nome: string) => chaveArquivoCampanha(campanhaId, nome);
      try {
        if (skin !== 'original')
          blob = await carregarArquivo(chave(chaveImagemSkin(escolhido.id, skin)));
        blob = blob || (await carregarArquivo(chave(`token:${escolhido.id}`)));
        if (!blob && escolhido.temRetrato)
          blob = await carregarArquivo(chave(`retrato:${escolhido.id}`));
      } catch {
        /* Usa o standee ilustrativo quando não há IndexedDB disponível. */
      }
      if (ativo) {
        try {
          await sala.trocarAparencia(
            blob,
            escolhido.nome,
            escolhido.cor,
            () => ativo && salaRef.current === sala,
          );
          setAviso(
            blob
              ? 'Imagem do personagem carregada da campanha.'
              : 'Sem imagem cadastrada: usando standee ilustrativo.',
          );
        } catch {
          if (ativo) {
            await sala.trocarAparencia(
              null,
              escolhido.nome,
              escolhido.cor,
              () => ativo && salaRef.current === sala,
            );
            setAviso('Imagem indisponível: usando standee ilustrativo.');
          }
        }
      }
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, [
    id,
    nomeSelecionado.skinPadraoId,
    cenaAtual?.tokens[id]?.skinId,
    nomeSelecionado.temToken,
    nomeSelecionado.temRetrato,
    nomeSelecionado.nome,
    nomeSelecionado.cor,
    salaPronta,
    cenaId,
    revisaoImagens,
  ]);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setErro(
        'Não foi possível iniciar a Mesa 3D. Ative a aceleração de hardware e confira o suporte WebGL do navegador.',
      );
      return;
    }
    setErro('');
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.domElement.className = 'm3d-canvas';
    renderer.domElement.setAttribute(
      'aria-label',
      'Sala tridimensional com personagem em sprite 2D',
    );
    renderer.domElement.tabIndex = 0;
    root.appendChild(renderer.domElement);
    const sala = criarSala3D(nomeSelecionado.nome, nomeSelecionado.cor);
    sala.configurarCenario(cenarioRef.current);
    sala.configurarConstrucao(modoEdicaoRef.current, cenarioRef.current);
    salaRef.current = sala;
    setSalaPronta(true);
    const climaCena3D = criarClimaCena3D(sala.cena);
    climaCena3DRef.current = climaCena3D;
    const climaInicial = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.clima;
    climaCena3D.configurar(normalizarClima(climaInicial), false);
    // near=0.25 aumenta a precisão do depth buffer nas três perspectivas,
    // especialmente quando a câmera tática precisa se afastar do mapa.
    // Todas as distâncias operacionais das câmeras são maiores que esse valor.
    const camera = new THREE.PerspectiveCamera(62, 1, 0.25, 450);
    // Só existem duas câmeras: a livre do mestre (também usada para construir)
    // e a câmera que acompanha o personagem em terceira pessoa.
    const cameraMestre = new THREE.PerspectiveCamera(48, 1, 0.25, 450);
    const cameraCinematica = new THREE.PerspectiveCamera(52, 1, 0.25, 450);
    const focoCinematico = new THREE.Vector3();
    const foco = new THREE.Vector3(posicaoRef.current.x, 1.1, posicaoRef.current.z);
    // ResizeObserver também pode disparar sem mudança real de dimensões.
    // Evita realocar o framebuffer WebGL e recalcular as três câmeras nesses casos.
    let tamanhoAnterior = { largura: 0, altura: 0 };
    const resize = () => {
      const w = Math.max(280, root.clientWidth),
        h = Math.max(300, root.clientHeight);
      if (w === tamanhoAnterior.largura && h === tamanhoAnterior.altura) return;
      tamanhoAnterior = { largura: w, altura: h };
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      cameraMestre.aspect = w / h;
      cameraMestre.updateProjectionMatrix();
      cameraCinematica.aspect = w / h;
      cameraCinematica.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    const teclas = tecladoRef.current;
    const chaves = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ]);
    const down = (ev: KeyboardEvent) => {
      if (campoDeFormulario(ev.target)) return;
      if (
        !ev.repeat &&
        (ev.ctrlKey || ev.metaKey) &&
        !ev.altKey &&
        ['z', 'y'].includes(ev.key.toLowerCase())
      ) {
        ev.preventDefault();
        navegarHistorico3D(ev.key.toLowerCase() === 'y' || ev.shiftKey ? 'refazer' : 'desfazer');
        return;
      }
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      if (cinematicaRef.current) {
        if (ev.code === 'Escape') {
          ev.preventDefault();
          cinematicaRef.current = null;
          iniciarTransicaoCinematicaRef.current = false;
          voltarDaCinematicaRef.current = true;
          if (EMBUTIDO_3D && window.parent !== window)
            window.parent.postMessage(
              { canal: 'portal-mestre-3d', tipo: 'cinematica-encerrada' },
              window.location.origin,
            );
        }
        return;
      }
      if (visaoIndividualRef.current && (ev.code === 'Delete' || ev.code === 'Backspace')) return;
      if (modoMestreRef.current && ev.code === 'Escape' && selecoes3DRef.current.length) {
        ev.preventDefault();
        limparSelecoes3D();
        return;
      }
      if (
        modoMestreRef.current &&
        !ev.repeat &&
        (ev.code === 'Delete' || ev.code === 'Backspace') &&
        selecoes3DRef.current.length
      ) {
        ev.preventDefault();
        apagarSelecoes3D();
        return;
      }
      if (
        modoMestreRef.current &&
        !ev.repeat &&
        (ev.code === 'Delete' || ev.code === 'Backspace') &&
        anotacaoSelecionadaRef.current
      ) {
        ev.preventDefault();
        const a = anotacaoSelecionadaRef.current;
        excluirAnotacao3D(a.tipo, a.id);
        return;
      }
      if (modoMestreRef.current && ev.code === 'Escape' && anotacaoSelecionadaRef.current) {
        ev.preventDefault();
        selecionarAnotacao3D(null, null);
        return;
      }
      if (
        modoMestreRef.current &&
        (ev.code === 'Delete' || ev.code === 'Backspace') &&
        barreiraSelecionadaRef.current
      ) {
        ev.preventDefault();
        const alvo = barreiraSelecionadaRef.current;
        if (excluirBarreiraCompartilhada3D(campanhaId, leituraCenaId.current, alvo)) {
          barreiraSelecionadaRef.current = null;
          setBarreiraSelecionada(null);
          estadoRef.current = buscarCampanha();
          setEstado(estadoRef.current);
          setAvisoEdicao('Barreira compartilhada removida das Mesas 2D e 3D.');
        }
        return;
      }
      if (
        modoMestreRef.current &&
        (ev.code === 'Delete' || ev.code === 'Backspace') &&
        selecionadoRef.current
      ) {
        ev.preventDefault();
        const objetoId = selecionadoRef.current;
        const anterior = cenarioRef.current;
        if (anterior.objetos.some((o) => o.id === objetoId)) {
          gravarCanvas({ ...anterior, objetos: anterior.objetos.filter((o) => o.id !== objetoId) });
          selecionadoRef.current = null;
          setSelecionado(null);
          setItemMesaSelecionado(null);
          setAvisoEdicao('Objeto excluído com Delete.');
        }
        return;
      }
      if (
        modoMestreRef.current &&
        !modoEdicaoRef.current &&
        (ev.code === 'Delete' || ev.code === 'Backspace') &&
        tokenSelecionadoRef.current
      ) {
        if (
          ev.repeat ||
          ev.ctrlKey ||
          ev.altKey ||
          ev.metaKey ||
          document.querySelector('[role="dialog"][aria-modal="true"]')
        )
          return;
        ev.preventDefault();
        excluirTokenSelecionadoNo3D();
        return;
      }
      if (
        chaves.has(ev.code) &&
        !modoEdicaoRef.current &&
        (!modoMestreRef.current || moverMesaRef.current)
      ) {
        ev.preventDefault();
        teclas.add(ev.code);
      }
    };
    const up = (ev: KeyboardEvent) => {
      teclas.delete(ev.code);
      if (
        (!modoMestreRef.current || moverMesaRef.current) &&
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(ev.code)
      ) {
        const atual = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
          idRef.current
        ];
        if (atual && !atual.travado)
          moverTokenCompartilhado3D(
            campanhaId,
            leituraCenaId.current,
            idRef.current,
            posicaoRef.current,
            undefined,
            cenarioRef.current,
          );
      }
    };
    const limpar = () => teclas.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', limpar);
    document.addEventListener('visibilitychange', limpar);
    const raycaster = new THREE.Raycaster();
    const coordenadasMouse = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          (-(ev.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        cinematicaRef.current ? cameraCinematica : modoMestreRef.current ? cameraMestre : camera,
      );
      const alvo = new THREE.Vector3();
      const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      return raycaster.ray.intersectPlane(plano, alvo) ? { x: alvo.x, z: alvo.z } : null;
    };
    const encaixar = (x: number, z: number) => {
      const c = cenarioRef.current;
      return alinharNoChao3D(x, z, c.encaixarGrade !== false, c.passoGrade || 0.5, c);
    };
    const gravarCanvas = (proximo: Cenario3D) => {
      try {
        const salvo = salvarCenario3D(campanhaId, leituraCenaId.current, proximo);
        cenarioRef.current = salvo;
        setCenario(salvo);
        setAvisoEdicao('Cenário salvo automaticamente.');
        if (colisaoCenario3D(posicaoRef.current, salvo)) {
          posicaoRef.current = posicaoLivre3D(salvo, PONTO_INICIAL);
          sala.avatar.position.set(posicaoRef.current.x, 0, posicaoRef.current.z);
        }
      } catch {
        setAvisoEdicao('Falha ao salvar. Confira o espaço do navegador.');
        sala.configurarCenario(cenarioRef.current);
      }
    };
    let arrastando = false,
      botaoMouse = 0,
      ultimoX = 0,
      ultimoY = 0,
      inicioX = 0,
      inicioY = 0,
      arrastou = false;
    let itemArrastado: string | null = null,
      preview: { x: number; z: number } | null = null,
      areaSelecionada: string | null = null;
    let miniaturaArrastada: string | null = null,
      previewMiniatura: { x: number; z: number } | null = null,
      deslocamentoMiniatura = { x: 0, z: 0 };
    let tokenArrastado: string | null = null;
    let previewToken: { x: number; z: number } | null = null;
    let tokenSobCliqueDireito: string | null = null;
    let desenhoFog: TracoFog | null = null;
    let desenhoLivre: TracoDesenho | null = null;
    let anotacaoArrastada: {
      tipo: 'marcador' | 'luz';
      id: string;
      inicio: { x: number; y: number };
      fim: { x: number; y: number };
      offset: { x: number; y: number };
    } | null = null;

    let deslocamentoObjeto = { x: 0, z: 0 };
    let barreiraArrastada: BarreiraMapa | null = null,
      pontaBarreira: 1 | 2 | null = null,
      origemBarreira: { x: number; z: number } | null = null;
    let previewBarreira: BarreiraMapa | null = null;
    let origemParede: { x: number; z: number } | null = null;
    let alcaArrastada: 'largura' | 'profundidade' | 'rotacao' | null = null;
    let previewEdicao: ObjetoCena3D | null = null;
    const dentroTerreno = (p: { x: number; z: number }) => {
      const a = dimensoesTerreno3D(cenarioRef.current);
      return p.x >= a.minX && p.x <= a.maxX && p.z >= a.minZ && p.z <= a.maxZ;
    };
    const linhaParede = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xf8cb71, depthTest: false }),
    );
    linhaParede.renderOrder = 12;
    linhaParede.visible = false;
    sala.cena.add(linhaParede);
    const mostrarLinha = (a: { x: number; z: number }, b: { x: number; z: number }) => {
      linhaParede.geometry.dispose();
      linhaParede.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a.x, 0.25, a.z),
        new THREE.Vector3(b.x, 0.25, b.z),
      ]);
      linhaParede.visible = true;
    };
    // Uma única lógica de arrasto garante que a Tática e a Visão de Mesa
    // validem colisões, bloqueios e salvem a posição na mesma cena 2D/3D.
    let ultimaPreviaPublicada = 0;
    const enviarPreviaToken = (id: string, p: { x: number; z: number }, final = false) => {
      if (!EMBUTIDO_3D || window.parent === window) return;
      const agora = performance.now();
      if (!final && agora - ultimaPreviaPublicada < 32) return;
      const cena = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
      const tipo = estadoRef.current.unidades.find((u) => u.id === id)?.tipo;
      if (
        !['total', 'nevoa', 'visao', 'nevoa_visao', 'exploracao'].includes(
          cena?.visibilidade || '',
        ) ||
        cena?.tokens[id]?.oculto ||
        !['jogador', 'npc', 'inimigo'].includes(tipo || '')
      )
        return;
      const ponto = chaoParaPercentual3D(p, cenarioRef.current);
      if (!Number.isFinite(ponto.x) || !Number.isFinite(ponto.y)) return;
      ultimaPreviaPublicada = agora;
      window.parent.postMessage(
        {
          canal: 'portal-mestre-3d',
          tipo: 'previa-token-3d',
          valor: { cenaId: leituraCenaId.current, id, x: ponto.x, y: ponto.y, final },
        },
        window.location.origin,
      );
    };
    // A imagem do token/GLB move a cada quadro; a névoa do próprio mestre
    // deve acompanhar a posição visual sem esperar o React ou o salvamento
    // periódico da campanha (WASD e arrasto compartilham esta rotina).
    let ultimaPreviaFogLocal = 0;
    const atualizarFogDuranteMovimento = (
      uid: string,
      p: { x: number; z: number },
      forcar = false,
    ) => {
      if (visaoIndividualRef.current !== uid) return;
      const agora = performance.now();
      if (!forcar && agora - ultimaPreviaFogLocal < 40) return;
      const cena = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
      if (!cena?.tokens[uid]) return;
      const c = cenarioRef.current;
      const tokensSeguros = Object.fromEntries(
        Object.entries(cena.tokens).map(([tokenId, token]) => {
          const tipo = estadoRef.current.unidades.find((u) => u.id === tokenId)?.tipo || 'npc';
          return [tokenId, { ...token, oculto: tokenOcultoParaJogador(tipo, token, cena.camadas) }];
        }),
      );
      sala.configurarVisaoIndividual(
        uid,
        tokensSeguros,
        cena.barreiras || [],
        c,
        chaoParaPercentual3D(p, c),
        {
          ativo: cena.visibilidade === 'exploracao' || cena.visibilidade === 'nevoa',
          manualSomente: cena.visibilidade === 'nevoa',
          memoria: cena.exploracaoPorToken || {},
          pinceis: cena.nevoa || [],
          grupo: fogGrupo,
          idsGrupo: estadoRef.current.unidades
            .filter((u) => u.tipo === 'jogador' && cena.tokens[u.id])
            .map((u) => u.id),
        },
      );
      ultimaPreviaFogLocal = agora;
    };
    const previsualizarMovimentoToken = (ev: PointerEvent) => {
      if (!tokenArrastado) return;
      const ponto = coordenadasMouse(ev);
      if (!ponto) return;
      const c = cenarioRef.current;
      const cena = estadoRef.current.cenas.find((v) => v.id === leituraCenaId.current);
      if (cena?.tokens[tokenArrastado]?.travado) return;
      const outras = Object.entries(cena?.tokens || {})
        .filter(([k]) => k !== tokenArrastado)
        .map(([, v]) => percentualParaChao3D(v, c));
      if (posicaoPermitidaNaMesa3D(ponto, c, outras, cena?.barreiras ?? [])) {
        previewToken = ponto;
        sala.visualizarToken(tokenArrastado, ponto.x, ponto.z);
        enviarPreviaToken(tokenArrastado, ponto);
        atualizarFogDuranteMovimento(tokenArrastado, ponto);
      }
    };
    const concluirMovimentoToken = () => {
      if (!tokenArrastado || !previewToken || !arrastou) return;
      const nome = estadoRef.current.unidades.find((u) => u.id === tokenArrastado)?.nome || 'Token';
      const ok = moverTokenCompartilhado3D(
        campanhaId,
        leituraCenaId.current,
        tokenArrastado,
        previewToken,
        undefined,
        cenarioRef.current,
      );
      if (ok) {
        enviarPreviaToken(tokenArrastado, previewToken, true);
        atualizarFogDuranteMovimento(tokenArrastado, previewToken, true);
        const atualizado = buscarCampanha();
        estadoRef.current = atualizado;
        setEstado(atualizado);
        setAvisoMesaLivre(`${nome} movido na campanha. A posição também aparece na Mesa 2D.`);
      } else {
        setAvisoMesaLivre(
          'Não foi possível mover o token. Verifique o bloqueio ou os dados da campanha.',
        );
        const antigo = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
          tokenArrastado
        ];
        if (antigo) {
          const ponto = percentualParaChao3D(antigo, cenarioRef.current);
          sala.visualizarToken(tokenArrastado, ponto.x, ponto.z);
        }
      }
    };
    const pointerDown = (ev: PointerEvent) => {
      if (
        ev.button === 0 &&
        colocandoMiniaturaRef.current &&
        modoMestreRef.current &&
        !visaoIndividualRef.current
      ) {
        ev.preventDefault();
        const pos = coordenadasMouse(ev);
        if (pos && dentroTerreno(pos)) salvarMiniaturaNoPonto(pos);
        else setAvisoMiniatura('Clique em uma posição válida do terreno.');
        return;
      }

      // As anotações usam raycast do chão e coordenadas percentuais do mesmo mapa 2D.
      if (
        ev.button === 0 &&
        modoMestreRef.current &&
        anotacaoRef.current &&
        !visaoIndividualRef.current
      ) {
        const pos = coordenadasMouse(ev);
        if (!pos || !dentroTerreno(pos)) return;
        const pt = ponto3DParaMapa(pos, cenarioRef.current);
        if (anotacaoRef.current === 'marcador') {
          if (EMBUTIDO_3D && window.parent !== window) {
            window.parent.postMessage(
              { canal: 'portal-mestre-3d', tipo: 'marcador-novo', valor: pt },
              window.location.origin,
            );
          } else {
            const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
              const c = (raw.cenas as Record<string, unknown>[]).find(
                (c) => c.id === leituraCenaId.current,
              );
              if (!c) return false;
              const atuais = Array.isArray(c.marcadores) ? c.marcadores : [];
              c.marcadores = [
                ...atuais,
                {
                  ...pt,
                  id: `marcador-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  texto: `Marcação ${atuais.length + 1}`,
                },
              ];
              return true;
            });
            if (ok) {
              estadoRef.current = buscarCampanha();
              setEstado(estadoRef.current);
            }
          }
          return;
        }
        desenhoLivre = {
          id: `desenho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          pontos: [pt],
          cor: corDesenho3DRef.current,
          espessura: espessuraDesenho3DRef.current,
        };
        arrastando = true;
        botaoMouse = 0;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        arrastou = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      // Ctrl+clique: multisseleção no mestre; Shift+arrastar segue livre para
      // deslocar a câmera. Não ativa arrasto nem altera fichas / visibilidade.
      if (
        ev.button === 0 &&
        (ev.ctrlKey || ev.metaKey) &&
        modoMestreRef.current &&
        !visaoIndividualRef.current &&
        !ferramentaRef.current &&
        !ferramentaFogRef.current &&
        (!cinematicaRef.current || cinematicaRef.current.modo === 'tatica')
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        coordenadasMouse(ev);
        const marc = sala.marcadorAtingido(raycaster);
        const luz = !marc ? sala.luzAtingida(raycaster) : null;
        const desenho = !marc && !luz ? sala.desenhoAtingido(raycaster) : null;
        const tok =
          !marc && !luz && !desenho && !modoEdicaoRef.current
            ? sala.tokenAtingido(raycaster)
            : null;
        const barreira =
          !tok && !marc && !luz && !desenho ? sala.barreiraAtingida(raycaster) : null;
        const obj =
          !tok && !barreira && !marc && !luz && !desenho ? sala.objetoAtingido(raycaster) : null;
        if (marc) alternarSelecao3D('marcador', marc);
        else if (luz) alternarSelecao3D('luz', luz);
        else if (desenho) alternarSelecao3D('desenho', desenho);
        else if (tok) alternarSelecao3D('token', tok);
        else if (barreira) alternarSelecao3D('barreira', barreira.id);
        else if (obj) alternarSelecao3D('objeto', obj);
        return;
      }
      // Igual ao 2D: botão direito curto num token faz flip. Arrastar o direito
      // continua orbitando a câmera; não interfere com edição, névoa ou personagem.
      tokenSobCliqueDireito = null;
      if (
        ev.button === 2 &&
        modoMestreRef.current &&
        !modoEdicaoRef.current &&
        (!cinematicaRef.current || cinematicaRef.current.modo === 'tatica') &&
        !ferramentaRef.current &&
        !ferramentaFogRef.current &&
        !visaoIndividualRef.current
      ) {
        coordenadasMouse(ev);
        tokenSobCliqueDireito = sala.tokenAtingido(raycaster);
      }
      // Tática: botão direito orbita; botão do meio ou Shift+esquerdo desloca.
      // O esquerdo normal SELECIONA e MOVE apenas tokens, sem editar o cenário.
      if (cinematicaRef.current?.modo === 'personagem' && ev.button === 2) {
        ev.preventDefault();
        renderer.domElement.focus({ preventScroll: true });
        arrastando = true;
        botaoMouse = 2;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        arrastou = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      if (
        cinematicaRef.current?.modo === 'tatica' &&
        (ev.button === 2 || ev.button === 1 || (ev.button === 0 && ev.shiftKey))
      ) {
        ev.preventDefault();
        renderer.domElement.focus({ preventScroll: true });
        arrastando = true;
        botaoMouse = ev.button === 0 ? 1 : ev.button;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        arrastou = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      if (cinematicaRef.current?.modo === 'tatica' && ev.button === 0 && !ev.shiftKey) {
        ev.preventDefault();
        // O modo tático mantém as ferramentas do mestre, mas não deixa
        // arrastar paredes, objetos nem pintar Fog of War por acidente.
        if (modoEdicaoRef.current || ferramentaFogRef.current) return;
        renderer.domElement.focus({ preventScroll: true });
        coordenadasMouse(ev); // raycaster usa a câmera cinematográfica ativa.
        const token = sala.tokenAtingido(raycaster);
        tokenArrastado = null;
        previewToken = null;
        itemArrastado = null;
        preview = null;
        if (token) {
          selecionadoRef.current = null;
          setSelecionado(null);
          barreiraSelecionadaRef.current = null;
          setBarreiraSelecionada(null);
          sala.selecionarObjeto(null);
          selecionarTokenNoChao(token);
          setItemMesaSelecionado('token');
          const registro = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)
            ?.tokens[token];
          if (registro?.travado)
            setAvisoMesaLivre('Token bloqueado. Desbloqueie na Mesa 2D para movê-lo.');
          else if (registro) tokenArrastado = token;
        } else {
          selecionarTokenNoChao(null);
          setItemMesaSelecionado(null);
        }
        arrastando = true;
        botaoMouse = 0;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        arrastou = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      if (
        visaoIndividualRef.current &&
        (Boolean(cinematicaRef.current) || !modoMestreRef.current) &&
        ev.button === 0
      ) {
        // A visão individual também pode ser testada nas câmeras de personagem.
        // Somente miniaturas que estejam realmente visíveis aceitam o arrasto.
        ev.preventDefault();
        renderer.domElement.focus({ preventScroll: true });
        coordenadasMouse(ev);
        const token = sala.tokenAtingido(raycaster);
        const registro = token
          ? estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[token]
          : undefined;
        if (!token || !registro) return;
        if (registro.travado) {
          setAvisoMesaLivre('Token bloqueado. Desbloqueie na Mesa 2D para movê-lo.');
          return;
        }
        selecionarTokenNoChao(token);
        setItemMesaSelecionado('token');
        tokenArrastado = token;
        previewToken = null;
        arrastando = true;
        arrastou = false;
        botaoMouse = 0;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      if (cinematicaRef.current) {
        ev.preventDefault();
        return;
      }
      // A prévia individual continua interativa: é permitido mover tokens visíveis.
      // Obstáculos e o cenário permanecem protegidos enquanto ela está ativa.
      if (
        ev.button !== 0 &&
        !(modoEdicaoRef.current && ev.button === 2) &&
        !(modoMestreRef.current && ev.button === 1) &&
        !(modoMestreRef.current && ev.button === 2)
      )
        return;
      renderer.domElement.focus({ preventScroll: true });
      if (ev.button === 0 && ferramentaFogRef.current) {
        const c = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
        const pos = coordenadasMouse(ev);
        if (c?.visibilidade !== 'exploracao' || !pos || !dentroTerreno(pos)) return;
        desenhoFog = {
          acao: ferramentaFogRef.current,
          pontos: [ponto3DParaMapa(pos, cenarioRef.current)],
          raio: raioFogRef.current,
        };
        arrastando = true;
        botaoMouse = 0;
        ultimoX = inicioX = ev.clientX;
        ultimoY = inicioY = ev.clientY;
        arrastou = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        renderer.domElement.classList.add('arrastando');
        return;
      }
      arrastando = true;
      botaoMouse = ev.button;
      ultimoX = inicioX = ev.clientX;
      ultimoY = inicioY = ev.clientY;
      arrastou = false;
      miniaturaArrastada = null;
      previewMiniatura = null;
      itemArrastado = null;
      preview = null;
      areaSelecionada = null;
      tokenArrastado = null;
      previewToken = null;
      alcaArrastada = null;
      previewEdicao = null;
      deslocamentoObjeto = { x: 0, z: 0 };
      barreiraArrastada = null;
      pontaBarreira = null;
      previewBarreira = null;
      origemBarreira = null;
      if (ev.button === 0 && modoMestreRef.current) selecionarTokenNoChao(null);
      if (
        modoMestreRef.current &&
        ev.button === 0 &&
        !ferramentaRef.current &&
        !visaoIndividualRef.current
      ) {
        coordenadasMouse(ev);
        const alca = sala.alcaAtingida(raycaster);
        if (alca && selecionadoRef.current) {
          alcaArrastada = alca;
          itemArrastado = selecionadoRef.current;
          setItemMesaSelecionado('objeto');
          renderer.domElement.setPointerCapture(ev.pointerId);
          renderer.domElement.classList.add('arrastando');
          return;
        }
      }
      if (modoMestreRef.current && !modoEdicaoRef.current && ev.button === 0) {
        coordenadasMouse(ev);
        const marcador = sala.marcadorAtingido(raycaster);
        const luz = !marcador ? sala.luzAtingida(raycaster) : null;
        const desenho = !marcador && !luz ? sala.desenhoAtingido(raycaster) : null;
        if (marcador || luz || desenho) {
          const tipo = marcador ? 'marcador' : luz ? 'luz' : 'desenho',
            uid = (marcador || luz || desenho)!;
          selecionarAnotacao3D(tipo, uid);
          const fonte = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current);
          const ponto =
            tipo === 'marcador'
              ? fonte?.marcadores.find((m) => m.id === uid)
              : fonte?.fontesLuz?.find((m) => m.id === uid);
          const ptMouse = coordenadasMouse(ev);
          const ptMapa = ptMouse
            ? ponto3DParaMapa(ptMouse, cenarioRef.current)
            : { x: ponto?.x ?? 0, y: ponto?.y ?? 0 };
          anotacaoArrastada =
            tipo === 'desenho' || !ponto
              ? null
              : {
                  tipo: tipo as 'marcador' | 'luz',
                  id: uid,
                  inicio: { x: ponto.x, y: ponto.y },
                  fim: { x: ponto.x, y: ponto.y },
                  offset: { x: ponto.x - ptMapa.x, y: ponto.y - ptMapa.y },
                };
          arrastando = true;
          botaoMouse = 0;
          ultimoX = inicioX = ev.clientX;
          ultimoY = inicioY = ev.clientY;
          arrastou = false;
          renderer.domElement.setPointerCapture(ev.pointerId);
          renderer.domElement.classList.add('arrastando');
          return;
        }
        const modeloNoChao = sala.miniaturaAtingida(raycaster);
        if (
          modeloNoChao &&
          !cenarioRef.current.miniaturas?.find((m) => m.id === modeloNoChao)?.personagemId
        ) {
          setMiniaturaSelecionadaId(modeloNoChao);
          setAbaMiniaturas('cena');
          setPainelAtivo('miniaturas');
          setPainelVisivel(true);
          miniaturaArrastada = modeloNoChao;
          const mouse = coordenadasMouse(ev),
            modelo = cenarioRef.current.miniaturas?.find((m) => m.id === modeloNoChao);
          if (mouse && modelo)
            deslocamentoMiniatura = { x: modelo.x - mouse.x, z: modelo.z - mouse.z };
          renderer.domElement.setPointerCapture(ev.pointerId);
          renderer.domElement.classList.add('arrastando');
          return;
        }
        const token = sala.tokenAtingido(raycaster);
        if (token) {
          selecionarAnotacao3D(null, null);
          // Selecionar um token não deve manter um móvel anterior elegível ao Delete.
          selecionadoRef.current = null;
          setSelecionado(null);
          barreiraSelecionadaRef.current = null;
          setBarreiraSelecionada(null);
          sala.selecionarObjeto(null);
          selecionarTokenNoChao(token);
          // A escolha no chão NÃO altera o personagem da câmera: isso reconstruía
          // o elenco e restaurava temporariamente a arte genérica de outros tokens.
          setItemMesaSelecionado('token');
          const registro = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)
            ?.tokens[token];
          if (registro?.travado) {
            setAvisoMesaLivre('Token bloqueado. Desbloqueie na Mesa 2D para movê-lo.');
          } else tokenArrastado = token;
        } else if (visaoIndividualRef.current) {
          // Durante o teste, somente tokens são interativos; as peças invisíveis
          // e as paredes não podem ser selecionadas através da neblina.
          setItemMesaSelecionado(null);
        } else {
          const barreira = sala.barreiraAtingida(raycaster);
          if (barreira) {
            selecionarAnotacao3D(null, null);
            const registro = (
              estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.barreiras ?? []
            ).find((b) => b.id === barreira.id);
            if (registro) {
              barreiraArrastada = { ...registro };
              pontaBarreira = barreira.ponta;
              origemBarreira = coordenadasMouse(ev);
              barreiraSelecionadaRef.current = barreira.id;
              setBarreiraSelecionada(barreira.id);
              selecionadoRef.current = null;
              setSelecionado(null);
              sala.selecionarObjeto(null);
              setItemMesaSelecionado(null);
              renderer.domElement.setPointerCapture(ev.pointerId);
              renderer.domElement.classList.add('arrastando');
              return;
            }
          }
          const obj = sala.objetoAtingido(raycaster);
          if (obj) {
            selecionarAnotacao3D(null, null);
            barreiraSelecionadaRef.current = null;
            setBarreiraSelecionada(null);
            itemArrastado = obj;
            selecionadoRef.current = obj;
            setSelecionado(obj);
            setItemMesaSelecionado('objeto');
            sala.selecionarObjeto(obj);
            const mouse = coordenadasMouse(ev),
              registro = cenarioRef.current.objetos.find((o) => o.id === obj);
            if (mouse && registro)
              deslocamentoObjeto = { x: registro.x - mouse.x, z: registro.z - mouse.z };
          } else {
            selecionarAnotacao3D(null, null);
            setItemMesaSelecionado(null);
            setSelecionado(null);
            selecionadoRef.current = null;
            barreiraSelecionadaRef.current = null;
            setBarreiraSelecionada(null);
            sala.selecionarObjeto(null);
          }
        }
      }
      if (modoEdicaoRef.current && ev.button === 0) {
        const inicio = coordenadasMouse(ev);
        if (!ferramentaRef.current) {
          const acertada = sala.barreiraAtingida(raycaster);
          if (acertada) {
            const b = (
              estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.barreiras ?? []
            ).find((l) => l.id === acertada.id);
            if (b) {
              barreiraArrastada = { ...b };
              pontaBarreira = acertada.ponta;
              origemBarreira = inicio;
              barreiraSelecionadaRef.current = b.id;
              setBarreiraSelecionada(b.id);
              renderer.domElement.setPointerCapture(ev.pointerId);
              renderer.domElement.classList.add('arrastando');
              return;
            }
          }
        }
        const idObj = sala.objetoAtingido(raycaster);
        if ((ferramentaRef.current === 'parede' || ferramentaRef.current === 'porta') && inicio)
          origemParede = encaixar(inicio.x, inicio.z);
        if (idObj && !ferramentaRef.current) {
          itemArrastado = idObj;
          areaSelecionada = idObj;
          selecionadoRef.current = idObj;
          setSelecionado(idObj);
          sala.selecionarObjeto(idObj);
          setItemMesaSelecionado('objeto');
          const registro = cenarioRef.current.objetos.find((o) => o.id === idObj);
          if (inicio && registro)
            deslocamentoObjeto = { x: registro.x - inicio.x, z: registro.z - inicio.z };
        }
      }
      renderer.domElement.setPointerCapture(ev.pointerId);
      renderer.domElement.classList.add('arrastando');
    };
    const pointerMove = (ev: PointerEvent) => {
      if (!arrastando) return;
      const dx = ev.clientX - ultimoX,
        dy = ev.clientY - ultimoY;
      ultimoX = ev.clientX;
      ultimoY = ev.clientY;
      if (Math.hypot(ev.clientX - inicioX, ev.clientY - inicioY) > 5) arrastou = true;
      if (desenhoLivre) {
        const pos = coordenadasMouse(ev);
        if (!pos || !dentroTerreno(pos)) return;
        const pt = ponto3DParaMapa(pos, cenarioRef.current);
        const ultimo = desenhoLivre.pontos[desenhoLivre.pontos.length - 1];
        if (
          Math.hypot(pt.x - ultimo.x, pt.y - ultimo.y) > 0.2 &&
          desenhoLivre.pontos.length < 500
        ) {
          desenhoLivre.pontos.push(pt);
          if (desenhoLivre.pontos.length % 3 === 0)
            sala.previsualizarDesenho(desenhoLivre, cenarioRef.current);
        }
        return;
      }
      if (desenhoFog) {
        const pos = coordenadasMouse(ev);
        if (!pos || !dentroTerreno(pos)) return;
        const pt = ponto3DParaMapa(pos, cenarioRef.current);
        const ultimo = desenhoFog.pontos[desenhoFog.pontos.length - 1];
        if (Math.hypot(pt.x - ultimo.x, pt.y - ultimo.y) > 0.35 && desenhoFog.pontos.length < 750)
          desenhoFog.pontos.push(pt);
        return;
      }
      if (!arrastou) return;
      if (miniaturaArrastada && botaoMouse === 0) {
        const ponto = coordenadasMouse(ev);
        if (!ponto) return;
        const destino = {
          x: ponto.x + deslocamentoMiniatura.x,
          z: ponto.z + deslocamentoMiniatura.z,
        };
        if (!dentroTerreno(destino)) return;
        previewMiniatura = destino;
        sala.visualizarMiniatura(miniaturaArrastada, destino.x, destino.z);
        return;
      }
      if (anotacaoArrastada && botaoMouse === 0) {
        const p = coordenadasMouse(ev);
        if (!p || !dentroTerreno(p)) return;
        const origem = ponto3DParaMapa(p, cenarioRef.current),
          ponto = {
            x: Math.max(0, Math.min(100, origem.x + anotacaoArrastada.offset.x)),
            y: Math.max(0, Math.min(100, origem.y + anotacaoArrastada.offset.y)),
          };
        anotacaoArrastada.fim = ponto;
        if (anotacaoArrastada.tipo === 'marcador')
          sala.moverMarcadorVisual(anotacaoArrastada.id, ponto, cenarioRef.current);
        else sala.moverLuzVisual(anotacaoArrastada.id, ponto, cenarioRef.current);
        return;
      }
      if (visaoIndividualRef.current && botaoMouse === 0 && tokenArrastado) {
        previsualizarMovimentoToken(ev);
        return;
      }
      if (cinematicaRef.current?.modo === 'personagem' && botaoMouse === 2) {
        const proxima = girarCameraPersonagem(
          yawPersonagemRef.current,
          pitchPersonagemRef.current,
          dx,
          dy,
        );
        yawPersonagemRef.current = proxima.angulo;
        pitchPersonagemRef.current = proxima.elevacao;
        return;
      }
      if (cinematicaRef.current?.modo === 'tatica' && (botaoMouse === 2 || botaoMouse === 1)) {
        if (botaoMouse === 2) {
          const proxima = girarCameraTatica(yawTaticoRef.current, pitchTaticoRef.current, dx, dy);
          yawTaticoRef.current = proxima.angulo;
          pitchTaticoRef.current = proxima.elevacao;
        } else {
          const base = centroTaticoBaseRef.current,
            offset = deslocamentoTaticoRef.current;
          const proximo = deslocarAlvoCamera(
            { x: base.x + offset.x, z: base.z + offset.z },
            dx,
            dy,
            yawTaticoRef.current,
            distanciaTaticaRef.current,
            cenarioRef.current,
          );
          deslocamentoTaticoRef.current = { x: proximo.x - base.x, z: proximo.z - base.z };
        }
        return;
      }
      if (cinematicaRef.current?.modo === 'tatica' && botaoMouse === 0) {
        previsualizarMovimentoToken(ev);
        return; // Não arrastar paredes, móveis ou Fog no modo Tática.
      }
      if (barreiraArrastada && origemBarreira && botaoMouse === 0) {
        const pt = coordenadasMouse(ev);
        if (!pt) return;
        const v = ponto3DParaMapa(pt, cenarioRef.current);
        const origem = ponto3DParaMapa(origemBarreira, cenarioRef.current);
        const dx = v.x - origem.x,
          dy = v.y - origem.y;
        previewBarreira =
          pontaBarreira === 1
            ? { ...barreiraArrastada, x1: v.x, y1: v.y }
            : pontaBarreira === 2
              ? { ...barreiraArrastada, x2: v.x, y2: v.y }
              : {
                  ...barreiraArrastada,
                  x1: Math.max(0, Math.min(100, barreiraArrastada.x1 + dx)),
                  y1: Math.max(0, Math.min(100, barreiraArrastada.y1 + dy)),
                  x2: Math.max(0, Math.min(100, barreiraArrastada.x2 + dx)),
                  y2: Math.max(0, Math.min(100, barreiraArrastada.y2 + dy)),
                };
        const barreiras =
          estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.barreiras ?? [];
        sala.configurarBarreiras(
          barreiras.map((b) => (b.id === barreiraArrastada!.id ? previewBarreira! : b)),
          cenarioRef.current,
          true,
          barreiraArrastada.id,
        );
        return;
      }
      if (alcaArrastada && itemArrastado) {
        const ponto = coordenadasMouse(ev);
        const obj = cenarioRef.current.objetos.find((o) => o.id === itemArrastado);
        if (!ponto || !obj) return;
        const deltaX = ponto.x - obj.x,
          deltaZ = ponto.z - obj.z,
          c = Math.cos(obj.rotacao),
          sn = Math.sin(obj.rotacao);
        const localX = deltaX * c + deltaZ * sn,
          localZ = -deltaX * sn + deltaZ * c;
        const tamanho = medidasObjeto3D(obj);
        let edicao: ObjetoCena3D = { ...obj };
        if (alcaArrastada === 'largura') {
          const tamanhoNovo = Math.max(
            0.25,
            Math.min(120, Math.round(Math.abs(localX) * 2 * 4) / 4),
          );
          if (obj.tipo === 'parede') edicao.comprimento = tamanhoNovo;
          else edicao.largura = tamanhoNovo;
        } else if (alcaArrastada === 'profundidade') {
          edicao.profundidade = Math.max(
            0.15,
            Math.min(120, Math.round(Math.abs(localZ) * 2 * 4) / 4),
          );
        } else {
          const angAlca = Math.atan2(-tamanho.profundidade / 2 - 0.55, -tamanho.largura / 2 - 0.58);
          edicao.rotacao = Math.atan2(deltaZ, deltaX) - angAlca;
        }
        previewEdicao = edicao;
        sala.visualizarEdicaoObjeto(edicao);
        return;
      }
      if (modoMestreRef.current && !modoEdicaoRef.current) {
        if (botaoMouse === 2) {
          yawLivreRef.current += dx * 0.007;
          pitchLivreRef.current = Math.max(
            0.25,
            Math.min(1.48, pitchLivreRef.current - dy * 0.006),
          );
        } else if (botaoMouse === 1) {
          centroLivreRef.current = deslocarAlvoCamera(
            centroLivreRef.current,
            dx,
            dy,
            yawLivreRef.current,
            distanciaLivreRef.current,
            cenarioRef.current,
          );
        } else if (tokenArrastado) {
          previsualizarMovimentoToken(ev);
        } else if (itemArrastado) {
          const cursor = coordenadasMouse(ev);
          if (!cursor) return;
          const ponto = { x: cursor.x + deslocamentoObjeto.x, z: cursor.z + deslocamentoObjeto.z };
          if (!dentroTerreno(ponto)) return;
          const c = cenarioRef.current,
            orig = c.objetos.find((o) => o.id === itemArrastado);
          if (!orig) return;
          const todos = Object.values(
            estadoRef.current.cenas.find((v) => v.id === leituraCenaId.current)?.tokens || {},
          ).map((v) => percentualParaChao3D(v, cenarioRef.current));
          if (!todos.some((t) => tocaObjeto3D(t, { ...orig, x: ponto.x, z: ponto.z }))) {
            preview = ponto;
            sala.visualizarObjeto(itemArrastado, ponto.x, ponto.z);
          }
        }
      } else if (modoEdicaoRef.current) {
        // A edição usa exatamente a MESMA câmera da Visão de Mesa.
        if (botaoMouse === 2) {
          yawLivreRef.current += dx * 0.007;
          pitchLivreRef.current = Math.max(
            0.25,
            Math.min(1.48, pitchLivreRef.current - dy * 0.006),
          );
        } else if (botaoMouse === 1) {
          centroLivreRef.current = deslocarAlvoCamera(
            centroLivreRef.current,
            dx,
            dy,
            yawLivreRef.current,
            distanciaLivreRef.current,
            cenarioRef.current,
          );
        } else if (itemArrastado) {
          const cursor = coordenadasMouse(ev);
          if (!cursor) return;
          const ponto = { x: cursor.x + deslocamentoObjeto.x, z: cursor.z + deslocamentoObjeto.z };
          if (!dentroTerreno(ponto)) return;
          const alvo = encaixar(ponto.x, ponto.z);
          preview = alvo;
          sala.visualizarObjeto(itemArrastado, alvo.x, alvo.z);
        } else if (origemParede) {
          const fim = coordenadasMouse(ev);
          if (fim) mostrarLinha(origemParede, encaixar(fim.x, fim.z));
        }
      } else {
        anguloRef.current += dx * 0.007;
        elevacaoCamera = Math.max(0.37, Math.min(1.24, elevacaoCamera + dy * 0.0045));
        setAngulo(anguloRef.current);
      }
    };
    const pointerUp = (ev: PointerEvent) => {
      if (!arrastando) return;
      const clique = !arrastou && botaoMouse === 0;
      arrastando = false;
      renderer.domElement.classList.remove('arrastando');
      if (renderer.domElement.hasPointerCapture(ev.pointerId))
        renderer.domElement.releasePointerCapture(ev.pointerId);
      linhaParede.visible = false;
      const alvoFlip = tokenSobCliqueDireito;
      tokenSobCliqueDireito = null;
      if (
        botaoMouse === 2 &&
        !arrastou &&
        ev.type === 'pointerup' &&
        alvoFlip &&
        modoMestreRef.current &&
        !modoEdicaoRef.current
      ) {
        selecionadoRef.current = null;
        setSelecionado(null);
        barreiraSelecionadaRef.current = null;
        setBarreiraSelecionada(null);
        sala.selecionarObjeto(null);
        selecionarTokenNoChao(alvoFlip);
        setItemMesaSelecionado('token');
        inverterTokenSelecionadoNo3D(alvoFlip);
        return;
      }
      if (miniaturaArrastada) {
        const item = (cenarioRef.current.miniaturas ?? []).find((m) => m.id === miniaturaArrastada);
        if (item && previewMiniatura && arrastou) alterarMiniatura(item.id, previewMiniatura);
        else if (item) sala.visualizarMiniatura(item.id, item.x, item.z);
        miniaturaArrastada = null;
        previewMiniatura = null;
        return;
      }
      if (visaoIndividualRef.current && botaoMouse === 0 && tokenArrastado) {
        concluirMovimentoToken();
        tokenArrastado = null;
        previewToken = null;
        return;
      }
      // Órbita/pan apenas da câmera; clique esquerdo normal confirma tokens.
      if (cinematicaRef.current?.modo === 'tatica') {
        if (botaoMouse === 0) concluirMovimentoToken();
        tokenArrastado = null;
        previewToken = null;
        return;
      }
      // Personagem só permite girar o enquadramento; nunca edita o cenário.
      if (cinematicaRef.current?.modo === 'personagem') return;
      if (anotacaoArrastada) {
        const drag = anotacaoArrastada;
        anotacaoArrastada = null;
        if (arrastou && Math.hypot(drag.fim.x - drag.inicio.x, drag.fim.y - drag.inicio.y) > 0.02) {
          const campo = drag.tipo === 'marcador' ? 'marcadores' : 'fontesLuz';
          const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
            const cena = (raw.cenas as Record<string, unknown>[]).find(
              (c) => c.id === leituraCenaId.current,
            );
            if (!cena) return false;
            cena[campo] = ((cena[campo] || []) as { id: string; x: number; y: number }[]).map(
              (m) => (m.id === drag.id ? { ...m, ...drag.fim } : m),
            );
            return true;
          });
          if (ok) {
            estadoRef.current = buscarCampanha();
            setEstado(estadoRef.current);
            setAvisoEdicao('Posição salva nas Mesas 2D e 3D.');
          }
        } else {
          if (drag.tipo === 'marcador')
            sala.moverMarcadorVisual(drag.id, drag.inicio, cenarioRef.current);
          else sala.moverLuzVisual(drag.id, drag.inicio, cenarioRef.current);
        }
        return;
      }
      if (desenhoLivre) {
        const traco = { ...desenhoLivre, pontos: desenhoLivre.pontos.slice() };
        desenhoLivre = null;
        sala.previsualizarDesenho(null, cenarioRef.current);
        const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
          const cena = (raw.cenas as Record<string, unknown>[]).find(
            (c) => c.id === leituraCenaId.current,
          );
          if (!cena) return false;
          cena.desenhos = [...normalizarDesenhos(cena.desenhos).slice(-199), traco];
          return true;
        });
        if (ok) {
          estadoRef.current = buscarCampanha();
          setEstado(estadoRef.current);
          setAvisoMesaLivre('Desenho salvo nas duas mesas.');
        }
        return;
      }
      if (desenhoFog) {
        const traco = desenhoFog;
        desenhoFog = null;
        const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
          const cena = (raw.cenas as Record<string, unknown>[]).find(
            (c) => c.id === leituraCenaId.current,
          );
          if (!cena || cena.visibilidade !== 'exploracao') return false;
          const anteriores = Array.isArray(cena.nevoa) ? (cena.nevoa as TracoFog[]) : [];
          cena.nevoa = [
            ...anteriores.slice(-449),
            { ...traco, pontos: traco.pontos.slice(0, 750) },
          ];
          return true;
        });
        if (ok) {
          estadoRef.current = buscarCampanha();
          setEstado(estadoRef.current);
          setAvisoMesaLivre(
            traco.acao === 'revelar' ? 'Área revelada no 2D e 3D.' : 'Área coberta no 2D e 3D.',
          );
        }
        return;
      }
      if (barreiraArrastada) {
        if (
          previewBarreira &&
          arrastou &&
          editarBarreiraCompartilhada3D(campanhaId, leituraCenaId.current, previewBarreira)
        ) {
          estadoRef.current = buscarCampanha();
          setEstado(estadoRef.current);
          setAvisoEdicao('Parede/porta salva nas duas mesas.');
        } else {
          sala.configurarBarreiras(
            estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.barreiras ?? [],
            cenarioRef.current,
            true,
            barreiraSelecionadaRef.current,
          );
        }
        barreiraArrastada = null;
        previewBarreira = null;
        return;
      }
      if (alcaArrastada && itemArrastado) {
        const antigo = cenarioRef.current.objetos.find((o) => o.id === itemArrastado);
        if (antigo && previewEdicao && arrastou) {
          gravarCanvas({
            ...cenarioRef.current,
            objetos: cenarioRef.current.objetos.map((o) =>
              o.id === itemArrastado ? previewEdicao! : o,
            ),
          });
          setAvisoEdicao('Dimensões e rotação do objeto atualizadas.');
        } else if (antigo) sala.visualizarEdicaoObjeto(antigo);
        alcaArrastada = null;
        previewEdicao = null;
        itemArrastado = null;
        return;
      }
      if (modoMestreRef.current && !modoEdicaoRef.current) {
        if (botaoMouse === 0) {
          if (tokenArrastado) concluirMovimentoToken();
          if (itemArrastado && preview && arrastou) {
            const antigo = cenarioRef.current.objetos.find((o) => o.id === itemArrastado);
            if (antigo) {
              const proximo = { ...antigo, ...preview };
              const objetos = cenarioRef.current.objetos.map((o) =>
                o.id === itemArrastado ? proximo : o,
              );
              if (
                posicaoPermitidaNaMesa3D(
                  preview,
                  {
                    ...cenarioRef.current,
                    objetos: cenarioRef.current.objetos.filter((o) => o.id !== itemArrastado),
                  },
                  [],
                )
              ) {
                gravarCanvas({ ...cenarioRef.current, objetos });
                setAvisoMesaLivre('Objeto reposicionado e salvo no cenário 3D.');
              } else {
                sala.visualizarObjeto(itemArrastado, antigo.x, antigo.z);
                setAvisoMesaLivre('Esse local está bloqueado.');
              }
            }
          }
        }
        return;
      }
      if (!modoEdicaoRef.current || botaoMouse !== 0) {
        origemParede = null;
        return;
      }
      if (itemArrastado) {
        if (arrastou && preview) {
          const id = itemArrastado;
          const origem = cenarioRef.current.objetos.find((o) => o.id === id);
          if (origem) {
            const novo = { ...origem, ...preview };
            const a = dimensoesTerreno3D(cenarioRef.current);
            const dentro =
              a.minX <= novo.x && novo.x <= a.maxX && a.minZ <= novo.z && novo.z <= a.maxZ;
            if (dentro)
              gravarCanvas({
                ...cenarioRef.current,
                objetos: cenarioRef.current.objetos.map((o) => (o.id === id ? novo : o)),
              });
            else {
              setAvisoEdicao('Objeto fora da área construível.');
              sala.visualizarObjeto(id, origem.x, origem.z);
            }
          }
        }
        itemArrastado = null;
        preview = null;
        return;
      }
      const ponto = coordenadasMouse(ev);
      if (!ponto) return;
      const { x, z } = encaixar(ponto.x, ponto.z);
      if (
        origemParede &&
        arrastou &&
        (ferramentaRef.current === 'parede' || ferramentaRef.current === 'porta')
      ) {
        const valido = criarBarreiraCompartilhada3D(
          campanhaId,
          leituraCenaId.current,
          ferramentaRef.current,
          origemParede,
          { x, z },
          cenarioRef.current,
        );
        origemParede = null;
        if (valido) {
          estadoRef.current = buscarCampanha();
          setEstado(estadoRef.current);
          setAvisoEdicao('Barreira invisível criada nas Mesas 2D e 3D.');
        } else setAvisoEdicao('Arraste para traçar uma parede ou porta no mapa.');
        return;
      }
      origemParede = null;
      if (!clique) return;
      const a = dimensoesTerreno3D(cenarioRef.current);
      if (x < a.minX || x > a.maxX || z < a.minZ || z > a.maxZ) {
        setAvisoEdicao('Escolha uma posição dentro do cenário.');
        return;
      }
      if (ferramentaRef.current) {
        if (ferramentaRef.current === 'luz') {
          const pt = ponto3DParaMapa({ x, z }, cenarioRef.current);
          const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
            const cena = (raw.cenas as Record<string, unknown>[]).find(
              (c) => c.id === leituraCenaId.current,
            );
            if (!cena) return false;
            const anteriores = Array.isArray(cena.fontesLuz) ? cena.fontesLuz : [];
            if (anteriores.length >= 90) return false;
            cena.fontesLuz = [
              ...anteriores,
              fonteLuzPadrao(`luz-${Date.now()}-${Math.random().toString(36).slice(2)}`, pt),
            ];
            return true;
          });
          if (ok) {
            estadoRef.current = buscarCampanha();
            setEstado(estadoRef.current);
            setAvisoEdicao('Luz quente criada na janela Iluminação, compartilhada com o mapa 2D.');
          }
          return;
        }
        if (ferramentaRef.current === 'parede' || ferramentaRef.current === 'porta') {
          setAvisoEdicao('Clique e arraste para traçar uma barreira no mapa.');
          return;
        }
        if (cenarioRef.current.objetos.length >= 140) {
          setAvisoEdicao('Limite de 140 objetos por cenário.');
          return;
        }
        const novo = novoObjeto3D(ferramentaRef.current, { x, z }, cenarioRef.current);
        gravarCanvas({ ...cenarioRef.current, objetos: [...cenarioRef.current.objetos, novo] });
        selecionadoRef.current = novo.id;
        setSelecionado(novo.id);
        return;
      }
      if (!areaSelecionada) {
        setSelecionado(null);
        selecionadoRef.current = null;
        sala.selecionarObjeto(null);
      }
    };
    const contextMenu = (ev: MouseEvent) => {
      if (cinematicaRef.current || modoEdicaoRef.current || modoMestreRef.current)
        ev.preventDefault();
    };
    const wheel = (ev: WheelEvent) => {
      if (cinematicaRef.current) {
        ev.preventDefault();
        if (cinematicaRef.current.modo === 'tatica')
          definirZoomTatico(zoomTaticoRef.current + (ev.deltaY > 0 ? 10 : -10), true);
        else
          distanciaPersonagemRef.current = zoomCameraPersonagem(
            distanciaPersonagemRef.current,
            ev.deltaY,
          );
        return;
      }
      ev.preventDefault();
      if (modoMestreRef.current) {
        const proximo = Math.max(
          5,
          Math.min(160, distanciaLivreRef.current + Math.sign(ev.deltaY) * 1.2),
        );
        distanciaLivreRef.current = proximo;
        setDistanciaLivre(proximo);
      } else {
        const proximo = Math.max(3.0, Math.min(7.8, zoomRef.current + Math.sign(ev.deltaY) * 0.35));
        zoomRef.current = proximo;
        setZoom(proximo);
      }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', contextMenu);
    let elevacaoCamera: number = CAMERA_TERCEIRA_3D.elevacaoInicial; // mesma inclinação da câmera do convidado
    let anim = 0,
      prev = performance.now(),
      cont = 0,
      frames = 0,
      ultimoPainel = 0,
      ultimaProjecaoMenu = 0,
      ultimaGravacaoWASD = 0;
    let ultimoIdle = 0;
    const frame = (tempo: number) => {
      anim = 0;
      // A aba pode ficar oculta antes do evento de visibilitychange. Não renderizar
      // nem atualizar texturas/câmeras em segundo plano; a sessão continua persistida.
      if (document.hidden) return;
      const dt = Math.min(0.05, Math.max(0, (tempo - prev) / 1000));
      prev = tempo;
      if (tempo - ultimoIdle >= 80) {
        ultimoIdle = tempo;
        sala.atualizarIdle(tempo);
      }
      sala.atualizarAnimacoesMiniaturas(dt);
      const frente =
        Number(teclas.has('KeyW') || teclas.has('ArrowUp')) -
        Number(teclas.has('KeyS') || teclas.has('ArrowDown'));
      const lateral =
        Number(teclas.has('KeyD') || teclas.has('ArrowRight')) -
        Number(teclas.has('KeyA') || teclas.has('ArrowLeft'));
      const move = direcaoCamera(
        frente,
        lateral,
        modoMestreRef.current ? yawLivreRef.current : anguloRef.current,
      );
      if (
        !cinematicaRef.current &&
        !modoEdicaoRef.current &&
        (move.x || move.z) &&
        (!modoMestreRef.current || moverMesaRef.current)
      ) {
        const velo = teclas.has('ShiftLeft') || teclas.has('ShiftRight') ? 5.25 : 3.05;
        const anterior = { ...posicaoRef.current };
        const candidato = moverNoCenario3D(
          anterior,
          { x: move.x * velo * dt, z: move.z * velo * dt },
          cenarioRef.current,
        );
        const barreiras =
          estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.barreiras ?? [];
        const token = estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
          idRef.current
        ];
        const outros = Object.entries(
          estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens || {},
        )
          .filter(([ch]) => ch !== idRef.current)
          .map(([, v]) => percentualParaChao3D(v, cenarioRef.current));
        if (
          token &&
          !token.travado &&
          !bloqueiaMovimentoCompartilhado3D(anterior, candidato, barreiras, cenarioRef.current) &&
          posicaoPermitidaNaMesa3D(candidato, cenarioRef.current, outros, barreiras)
        ) {
          posicaoRef.current = candidato;
          sala.avatar.position.set(candidato.x, 0, candidato.z);
          sala.visualizarToken(idRef.current, candidato.x, candidato.z);
          atualizarFogDuranteMovimento(idRef.current, candidato);
          enviarPreviaToken(idRef.current, candidato); // Fog acompanha o WASD sem esperar gravações de 180 ms.
          // As duas câmeras movem o MESMO token; gravações limitadas para não sobrecarregar o navegador.
          if (tempo - ultimaGravacaoWASD > 180) {
            ultimaGravacaoWASD = tempo;
            if (
              moverTokenCompartilhado3D(
                campanhaId,
                leituraCenaId.current,
                idRef.current,
                candidato,
                undefined,
                cenarioRef.current,
              )
            ) {
              estadoRef.current = buscarCampanha();
            }
          }
        } else if (idRef.current === '__demo__' && !modoMestreRef.current) {
          posicaoRef.current = candidato;
          sala.avatar.position.set(candidato.x, 0, candidato.z);
        }
      }
      const yaw = anguloRef.current,
        dist = zoomRef.current;
      const t = new THREE.Vector3(posicaoRef.current.x, 1.14, posicaoRef.current.z);
      foco.lerp(t, 1 - Math.exp(-dt * 9));
      // Ferramentas de construção não alteram a câmera nem escondem personagens.
      sala.avatar.visible =
        (idRef.current === '__demo__' ||
          Boolean(
            estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)?.tokens[
              idRef.current
            ],
          )) &&
        sala.tokenEstaVisivel(idRef.current);
      const apresentacao = cinematicaRef.current;
      const tokensAtuais = estadoRef.current.cenas.find(
        (c) => c.id === leituraCenaId.current,
      )?.tokens;
      const tokenCine = apresentacao && tokensAtuais?.[apresentacao.personagemId];
      if (apresentacao && !tokenCine) {
        cinematicaRef.current = null;
        voltarDaCinematicaRef.current = true;
        if (EMBUTIDO_3D && window.parent !== window)
          window.parent.postMessage(
            { canal: 'portal-mestre-3d', tipo: 'cinematica-encerrada' },
            window.location.origin,
          );
      }
      if (apresentacao && tokenCine) {
        const posAtor = percentualParaChao3D(tokenCine, cenarioRef.current);
        const tokenAlvo = apresentacao.alvoId ? tokensAtuais?.[apresentacao.alvoId] : undefined;
        const posAlvo = tokenAlvo ? percentualParaChao3D(tokenAlvo, cenarioRef.current) : undefined;
        // Autoenquadramento tático: inclui todas as peças próximas do foco,
        // não apenas o personagem selecionado. Nunca move os tokens.
        const enquadrarTodos = apresentacao.modo === 'tatica' && enquadrarTodosCombateRef.current;
        const unidadesDoCombate =
          estadoRef.current.cenas.find((c) => c.id === leituraCenaId.current)
            ?.participantesIniciativa ?? [];
        const idsEnquadrados = enquadrarTodos
          ? idsParaEnquadrarCombate(unidadesDoCombate, Object.keys(tokensAtuais ?? {}))
          : [];
        const pontosEnquadrados = enquadrarTodos
          ? idsEnquadrados.flatMap((id) => {
              const token = tokensAtuais?.[id];
              return token ? [percentualParaChao3D(token, cenarioRef.current)] : [];
            })
          : [];
        const outrosTaticos =
          apresentacao.modo === 'tatica' && !enquadrarTodos
            ? selecionarPontosTaticos(
                posAtor,
                Object.entries(tokensAtuais ?? {})
                  .filter(
                    ([unidadeId]) =>
                      unidadeId !== apresentacao.personagemId && unidadeId !== apresentacao.alvoId,
                  )
                  .map(([, token]) => percentualParaChao3D(token, cenarioRef.current)),
                32,
                18,
              )
            : [];
        // No reenquadramento total, não forçar o protagonista para dentro do quadro
        // se ele não estiver na iniciativa: o centro é calculado sobre os envolvidos.
        const posBase = enquadrarTodos && pontosEnquadrados.length ? pontosEnquadrados[0] : posAtor;
        const plano = calcularEnquadramentoCinematico(
          posBase,
          enquadrarTodos ? undefined : posAlvo,
          apresentacao.modo,
          cameraCinematica.aspect,
          enquadrarTodos ? pontosEnquadrados.slice(1) : outrosTaticos,
          zoomTaticoRef.current / 100,
          enquadrarTodos ? 300 : 100,
        );
        centroTaticoBaseRef.current = { ...plano.centro };
        distanciaTaticaRef.current = plano.distancia;
        const deslocamento =
          apresentacao.modo === 'tatica' ? deslocamentoTaticoRef.current : { x: 0, z: 0 };
        const centro = new THREE.Vector3(
          plano.centro.x + deslocamento.x,
          apresentacao.modo === 'personagem' ? 1.4 : 0.85,
          plano.centro.z + deslocamento.z,
        );
        const ang =
          apresentacao.modo === 'tatica' ? yawTaticoRef.current : yawPersonagemRef.current;
        const el =
          apresentacao.modo === 'tatica' ? pitchTaticoRef.current : pitchPersonagemRef.current;
        const r = apresentacao.modo === 'tatica' ? plano.distancia : distanciaPersonagemRef.current;
        const destino = new THREE.Vector3(
          centro.x + Math.sin(ang) * Math.cos(el) * r,
          Math.max(2, Math.sin(el) * r),
          centro.z + Math.cos(ang) * Math.cos(el) * r,
        );
        if (iniciarTransicaoCinematicaRef.current) {
          const anterior = modoMestreRef.current ? cameraMestre : camera;
          cameraCinematica.position.copy(anterior.position);
          focoCinematico.set(
            modoMestreRef.current ? centroLivreRef.current.x : foco.x,
            modoMestreRef.current ? 0.45 : foco.y,
            modoMestreRef.current ? centroLivreRef.current.z : foco.z,
          );
          iniciarTransicaoCinematicaRef.current = false;
        }
        const t = 1 - Math.exp(-dt * 3.5);
        cameraCinematica.position.lerp(destino, t);
        focoCinematico.lerp(centro, t);
        const fovDesejado = apresentacao.modo === 'personagem' ? 47 : 52;
        if (Math.abs(cameraCinematica.fov - fovDesejado) > 0.01) {
          cameraCinematica.fov += (fovDesejado - cameraCinematica.fov) * t;
          cameraCinematica.updateProjectionMatrix();
        }
        cameraCinematica.lookAt(focoCinematico);
        // Envia somente a posição projetada da miniatura para a HUD do documento pai.
        // O menu nunca interfere no canvas, na posição dos tokens ou na iniciativa.
        if (
          EMBUTIDO_3D &&
          window.parent !== window &&
          apresentacao.modo === 'personagem' &&
          tempo - ultimaProjecaoMenu > 130
        ) {
          ultimaProjecaoMenu = tempo;
          cameraCinematica.updateMatrixWorld();
          const projetado = new THREE.Vector3(posAtor.x, 1.26, posAtor.z).project(cameraCinematica);
          const visivel =
            projetado.z >= -1 &&
            projetado.z <= 1 &&
            Math.abs(projetado.x) <= 1 &&
            Math.abs(projetado.y) <= 1;
          window.parent.postMessage(
            {
              canal: 'portal-mestre-3d',
              tipo: 'posicao-personagem-tela',
              valor: {
                personagemId: apresentacao.personagemId,
                x: (projetado.x + 1) / 2,
                y: (1 - projetado.y) / 2,
                visivel,
              },
            },
            window.location.origin,
          );
        }
        climaCena3D.atualizar(
          dt,
          { x: centro.x, z: centro.z },
          r,
          dimensoesTerreno3D(cenarioRef.current),
        );
        sala.girarParaCamera(cameraCinematica);
        renderer.render(sala.cena, cameraCinematica);
      } else if (modoMestreRef.current) {
        const ang = yawLivreRef.current,
          el = pitchLivreRef.current,
          r = distanciaLivreRef.current;
        const centro = centroLivreRef.current;
        cameraMestre.position.set(
          centro.x + Math.sin(ang) * Math.cos(el) * r,
          Math.max(0.9, Math.sin(el) * r),
          centro.z + Math.cos(ang) * Math.cos(el) * r,
        );
        cameraMestre.lookAt(centro.x, 0.45, centro.z);
        climaCena3D.atualizar(dt, centro, r, dimensoesTerreno3D(cenarioRef.current));
        if (voltarDaCinematicaRef.current) {
          const t = 1 - Math.exp(-dt * 5);
          cameraCinematica.position.lerp(cameraMestre.position, t);
          focoCinematico.lerp(new THREE.Vector3(centro.x, 0.45, centro.z), t);
          cameraCinematica.fov += (cameraMestre.fov - cameraCinematica.fov) * t;
          cameraCinematica.updateProjectionMatrix();
          cameraCinematica.lookAt(focoCinematico);
          if (cameraCinematica.position.distanceTo(cameraMestre.position) < 0.12)
            voltarDaCinematicaRef.current = false;
          sala.girarParaCamera(cameraCinematica);
          renderer.render(sala.cena, cameraCinematica);
        } else {
          if (mudouFovCamera3D(cameraCinematica.fov, 52)) {
            cameraCinematica.fov = 52;
            cameraCinematica.updateProjectionMatrix();
          }
          sala.girarParaCamera(cameraMestre);
          renderer.render(sala.cena, cameraMestre);
        }
      } else {
        // Mesma câmera de Terceira Pessoa usada pelo convidado; mudam só permissões.
        posicionarCameraTerceira3D(camera, foco, yaw, dist, elevacaoCamera);
        climaCena3D.atualizar(
          dt,
          { x: foco.x, z: foco.z },
          dist,
          dimensoesTerreno3D(cenarioRef.current),
        );
        if (voltarDaCinematicaRef.current) {
          const t = 1 - Math.exp(-dt * 5);
          cameraCinematica.position.lerp(camera.position, t);
          focoCinematico.lerp(new THREE.Vector3(foco.x, foco.y - 0.22, foco.z), t);
          cameraCinematica.fov += (camera.fov - cameraCinematica.fov) * t;
          cameraCinematica.updateProjectionMatrix();
          cameraCinematica.lookAt(focoCinematico);
          if (cameraCinematica.position.distanceTo(camera.position) < 0.12)
            voltarDaCinematicaRef.current = false;
          sala.girarParaCamera(cameraCinematica);
          renderer.render(sala.cena, cameraCinematica);
        } else {
          if (mudouFovCamera3D(cameraCinematica.fov, 52)) {
            cameraCinematica.fov = 52;
            cameraCinematica.updateProjectionMatrix();
          }
          sala.girarParaCamera(camera);
          renderer.render(sala.cena, camera);
        }
      }
      frames++;
      cont += dt;
      // O contador de FPS só precisa atualizar o React com detalhes abertos.
      if (cont > 1) {
        if (detalhesRef.current) setFps(Math.round(frames / cont));
        cont = 0;
        frames = 0;
      }
      // Não renderizar toda a interface React 5 vezes por segundo quando o
      // personagem está parado: o WebGL continua animando os GIFs normalmente.
      const movendo = Boolean(move.x || move.z);
      if (tempo - ultimoPainel > intervaloHud3D(movendo)) {
        ultimoPainel = tempo;
        const atual = posicaoRef.current;
        setPosicao((anterior) =>
          mudouPosicaoHud3D(anterior, atual) ? { x: atual.x, z: atual.z } : anterior,
        );
      }
      anim = requestAnimationFrame(frame);
    };
    // Não deixar um canvas WebGL 3D consumindo GPU em abas ocultas.
    // Quando o usuário retorna, o relógio é reiniciado para evitar saltos de câmera.
    const gerenciarVisibilidade = () => {
      if (document.hidden) {
        cancelAnimationFrame(anim);
        anim = 0;
        limpar();
        return;
      }
      prev = performance.now();
      cont = 0;
      frames = 0;
      if (!anim) anim = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', gerenciarVisibilidade);
    if (!document.hidden) anim = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(anim);
      document.removeEventListener('visibilitychange', gerenciarVisibilidade);
      observer.disconnect();
      limpar();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', limpar);
      document.removeEventListener('visibilitychange', limpar);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('contextmenu', contextMenu);
      sala.cena.remove(linhaParede);
      linhaParede.geometry.dispose();
      (linhaParede.material as THREE.Material).dispose();
      salaRef.current = null;
      rendererRef.current = null;
      climaCena3D.dispose();
      climaCena3DRef.current = null;
      sala.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Renderizador compartilhado. Os tokens e os objetos permanecem nas respectivas cenas da campanha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className={`mesa-app m3d-app m3d-paridade ${EMBUTIDO_3D ? 'm3d-embutido' : ''} ${EMBUTIDO_3D && painelVisivel && (painelAtivo === 'construcao' || painelAtivo === 'miniaturas') ? 'm3d-embutido-construcao' : ''}`}
    >
      <div className="mesa-fundo" aria-hidden="true" />
      <EditorDados origem="mesa3d" />
      <header className="cabecalho-mesa">
        <div className="identidade-mesa">
          <span className="sigilo-mesa">✥</span>
          <div>
            <strong>
              MESA <em>DO MESTRE</em>
            </strong>
            <small>PORTAL DE CAMPANHAS</small>
          </div>
        </div>
        <div className="cabecalho-centro">
          <span className="estado-sessao">
            ● {obterCampanha(campanhaId)?.titulo || estado.titulo || 'Campanha'} · MESA LOCAL
          </span>
          <span className="divisor-vertical" />
          <strong>{cenaAtual?.nome || 'Cena 1'}</strong>
        </div>
        <nav className="cabecalho-acoes" aria-label="Navegação da mesa">
          {!EMBUTIDO_3D && (
            <MultiplayerMestre
              campanhaId={campanhaId}
              campanha={obterCampanha(campanhaId)?.titulo || estado.titulo || 'Campanha'}
            />
          )}
          <a className="hx-voltar-portal" href="/mesas/">
            ← Minhas mesas
          </a>
          <a className="hx-voltar-portal hx-exploracao-link" href={urlMesaCampanha(campanhaId)}>
            ▧ Mesa 2D
          </a>
          <button type="button" onClick={() => abrirPainel('fichas')}>
            ✧ Fichas
          </button>
          <button type="button" onClick={() => abrirPainel('cenas')}>
            ▧ Cenas
          </button>
          <button type="button" className="botao-primario" onClick={() => abrirCriacao()}>
            ＋ Personagem
          </button>
          <button
            type="button"
            className="hx-mesa-organizar"
            aria-expanded={menuOrganizar}
            onClick={() => setMenuOrganizar((v) => !v)}
          >
            ☷ Organizar
          </button>
        </nav>
      </header>
      {menuOrganizar && (
        <div className="m3d-organizador" role="group" aria-label="Organizar a mesa">
          <div className="m3d-organizador-titulo">
            <strong>Organizar a mesa</strong>
            <button type="button" onClick={() => setMenuOrganizar(false)} aria-label="Fechar menu">
              ×
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPainelVisivel(false);
              setMenuOrganizar(false);
            }}
          >
            ◫ Fechar painéis abertos
          </button>
          <button
            type="button"
            onClick={() => {
              setJanelaPos(null);
              setJanelaMinimizada(false);
              setMenuOrganizar(false);
            }}
          >
            ▦ Reorganizar janelas
          </button>
          <button
            type="button"
            onClick={() => {
              setModoEdicao(false);
              setModoMestre(true);
              setMenuOrganizar(false);
            }}
          >
            ♟ Visão de Mesa
          </button>
          <button
            type="button"
            onClick={() => {
              setModoEdicao(false);
              setModoMestre(false);
              setMenuOrganizar(false);
            }}
          >
            ◉ Terceira Pessoa
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaEditor('mapa');
              abrirPainel('construcao');
            }}
          >
            ▧ Ajustar terreno
          </button>
        </div>
      )}
      <div className="m3d-workspace">
        <nav className="m3d-side-tools atalhos-direita" aria-label="Ferramentas do mestre">
          {atalhosMesa3D
            .filter((atalho) => !['historico', 'mesa', 'camera'].includes(atalho.id))
            .map((atalho) => (
              <button
                key={atalho.id}
                type="button"
                className={painelVisivel && painelAtivo === atalho.id ? 'ativo' : ''}
                aria-expanded={painelVisivel && painelAtivo === atalho.id}
                onClick={() => abrirPainel(atalho.id)}
              >
                <span aria-hidden="true">{atalho.simbolo}</span>
                <strong>{atalho.rotulo}</strong>
              </button>
            ))}
        </nav>
        <aside
          className="galeria-personagens m3d-galeria"
          aria-label="Fichas do grupo de jogadores"
        >
          <span className="galeria-titulo">
            GRUPO <strong>{estado.unidades.filter((u) => u.tipo === 'jogador').length}</strong>
          </span>
          <div className="galeria-rolagem">
            {estado.unidades
              .filter((u) => u.tipo === 'jogador')
              .map((u) => (
                <button
                  type="button"
                  className={`cartao-retrato ${id === u.id ? 'selecionado' : ''}`}
                  key={u.id}
                  onClick={() => {
                    setId(u.id);
                    abrirPainel('combate');
                  }}
                  title={`Abrir ficha de ${u.nome}`}
                >
                  <span
                    className="borda-retrato"
                    style={{ '--cor-unidade': u.cor } as CSSProperties}
                  >
                    {retratos[u.id] ? (
                      <ImagemRetrato src={retratos[u.id]} alt="" ajuste={u.retratoEnquadramento} />
                    ) : (
                      <span className="retrato-inicial">
                        {u.nome.slice(0, 1).toUpperCase()}
                        <small>✧</small>
                      </span>
                    )}
                  </span>
                  <span className="cartao-nome">{u.nome}</span>
                  <span className="cartao-status">
                    <i style={{ background: u.cor }} />
                    {usaImpeto
                      ? `${u.hp}/${u.hpMax} HP${u.escudo > 0 ? ` · 🛡${u.escudo}` : ''}`
                      : 'Personagem'}
                  </span>
                </button>
              ))}
            <button
              type="button"
              className="adicionar-retrato"
              onClick={() => abrirCriacao('jogador')}
              title="Adicionar jogador ao grupo"
            >
              ＋
            </button>
          </div>
        </aside>
        <nav className="atalhos-esquerda m3d-atalhos-esquerda" aria-label="Acessos rápidos">
          {!EMBUTIDO_3D && (
            <button
              type="button"
              aria-expanded={chatAberto}
              onClick={() => setChatAberto((v) => !v)}
            >
              ◉ Chat
            </button>
          )}
          <button type="button" onClick={() => abrirPainel('diario')}>
            ▤ Diário
          </button>
        </nav>
        {!EMBUTIDO_3D && chatAberto && (
          <aside className="m3d-chat-local" aria-label="Chat da Mesa 3D">
            <div className="m3d-chat-local-topo">
              <strong>Chat da campanha</strong>
              <button type="button" onClick={() => setChatAberto(false)} aria-label="Fechar chat">
                ×
              </button>
            </div>
            <ChatMesa
              campanhaId={campanhaId}
              personagens={estado.unidades.map((u) => ({
                id: u.id,
                nome: u.nome,
                tipo: u.tipo,
                foto: retratos[u.id],
                cor: u.cor,
                enquadramento: u.retratoEnquadramento,
              }))}
              cenaNome={cenaAtual?.nome || 'Cena'}
            />
          </aside>
        )}
        <div
          className={`m3d-view ${!mapaPronto && !erro ? 'm3d-mapa-carregando' : ''}`}
          ref={stageRef}
        >
          {!mapaPronto && !erro && (
            <div className="m3d-carregando-mapa" role="status">
              Preparando mapa da cena…
            </div>
          )}
          {erro && (
            <p role="alert" className="m3d-error">
              {erro}
            </p>
          )}
          <div className="m3d-scene-info">
            <span>
              {modoEdicao
                ? 'VISÃO DE MESA · AJUSTE DE TERRENO'
                : modoMestre
                  ? 'VISÃO DE MESA · CÂMERA LIVRE'
                  : 'TERCEIRA PESSOA · WASD'}
            </span>
            <h1>{cenaAtual?.nome || 'Cena'}</h1>
            <p>Mapa e terreno da campanha · edição local</p>
          </div>
          <div className="m3d-hud">
            <span className="m3d-live">
              ● {modoEdicao ? 'AJUSTAR TERRENO' : modoMestre ? 'MESA LIVRE' : 'TERCEIRA PESSOA'}
            </span>
            <span>◉ {nomeSelecionado.nome}</span>
            <span>
              {Math.round(posicao.x * 10) / 10} · {Math.round(posicao.z * 10) / 10}
            </span>
          </div>
          {!EMBUTIDO_3D &&
            usaImpeto &&
            sessao.combateAtivo &&
            (() => {
              const personagemEmTurno = estado.unidades.find(
                (unidade) => unidade.id === sessao.turnoId,
              );
              if (!personagemEmTurno?.condicoes?.length) return null;
              return (
                <aside
                  ref={hudEfeitosElementoRef}
                  className="m3d-efeitos-em-cena"
                  aria-label={`Efeitos ativos de ${personagemEmTurno.nome}`}
                  style={{
                    transform: `translate(${deslocamentoHudEfeitos.x}px, ${deslocamentoHudEfeitos.y}px)`,
                  }}
                >
                  <div
                    className="m3d-efeitos-titulo"
                    title="Arraste para mover este painel"
                    onPointerDown={iniciarArrastoHudEfeitos}
                    onPointerMove={moverHudEfeitos}
                    onPointerUp={terminarArrastoHudEfeitos}
                    onPointerCancel={terminarArrastoHudEfeitos}
                  >
                    <strong>✦ EFEITOS ATIVOS</strong>
                    <span>{personagemEmTurno.nome}</span>
                    <button
                      type="button"
                      onClick={reiniciarPosicaoHudEfeitos}
                      title="Restaurar posição do painel"
                      aria-label="Restaurar posição da HUD de efeitos"
                    >
                      ↺
                    </button>
                  </div>
                  <FaixasEfeitos efeitos={personagemEmTurno.condicoes} compacto />
                </aside>
              );
            })()}
          {!EMBUTIDO_3D && (
            <div className="m3d-mode-switch" role="group" aria-label="Câmera da Mesa 3D">
              <span>VISUALIZAÇÃO 3D</span>
              <button
                type="button"
                className={modoMestre ? 'ativo' : ''}
                aria-pressed={modoMestre}
                onClick={() => {
                  setModoMestre(true);
                  const p = estadoRef.current.cenas.find((c) => c.id === cenaId)?.tokens[id];
                  centroLivreRef.current = p
                    ? percentualParaChao3D(p, cenarioRef.current)
                    : { ...posicaoRef.current };
                }}
              >
                ♟ Visão de Mesa
              </button>
              <button
                type="button"
                className={!modoMestre ? 'ativo' : ''}
                aria-pressed={!modoMestre}
                onClick={() => {
                  setModoEdicao(false);
                  setModoMestre(false);
                  if (!cenaAtual?.tokens?.[id] && personagensNaCena.length)
                    setId(personagensNaCena[0].id);
                }}
              >
                ◉ Terceira Pessoa
              </button>
              {!modoMestre && personagensNaCena.length > 0 && (
                <label className="m3d-camera-personagem" htmlFor="m3d-personagem-camera">
                  Personagem acompanhado
                  <select
                    id="m3d-personagem-camera"
                    aria-label="Escolher personagem para a Terceira Pessoa"
                    value={
                      personagensNaCena.some((u) => u.id === id)
                        ? id
                        : (personagensNaCena[0]?.id ?? '')
                    }
                    onChange={(e) => setId(e.target.value)}
                  >
                    {personagensNaCena.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ·{' '}
                        {u.tipo === 'jogador' ? 'Jogador' : u.tipo === 'npc' ? 'NPC' : 'Inimigo'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {modoMestre && (
            <div
              className="m3d-map-tools barra-ferramentas-mapa"
              role="toolbar"
              aria-label="Ferramentas de cenário 3D"
            >
              <button
                type="button"
                className={cenaAtual?.visibilidade === 'exploracao' ? 'ativo' : ''}
                title="Alternar Fog of War exploratório na cena, compartilhado com a Mesa 2D"
                onClick={() => {
                  const proximo = cenaAtual?.visibilidade === 'exploracao' ? 'total' : 'exploracao';
                  if (
                    alterarMesaCompartilhada(campanhaId, (raw) => {
                      const cena = (raw.cenas as Record<string, unknown>[]).find(
                        (c) => c.id === cenaId,
                      );
                      if (!cena) return false;
                      cena.visibilidade = proximo;
                      return true;
                    })
                  ) {
                    estadoRef.current = buscarCampanha();
                    setEstado(estadoRef.current);
                    if (proximo === 'total') {
                      ferramentaFogRef.current = null;
                      setFerramentaFog(null);
                    }
                    setAvisoMesaLivre(
                      proximo === 'exploracao'
                        ? 'Fog of War exploratório ativado nas duas mesas.'
                        : 'Visão completa restaurada.',
                    );
                  }
                }}
              >
                ◍{' '}
                <span>{cenaAtual?.visibilidade === 'exploracao' ? 'Fog ativo' : 'Ativar Fog'}</span>
              </button>
              {!EMBUTIDO_3D && (
                <>
                  <button
                    type="button"
                    title="Desfazer alteração (Ctrl+Z)"
                    onClick={() => navegarHistorico3D('desfazer')}
                  >
                    ↶ <span>Desfazer</span>
                  </button>
                  <button
                    type="button"
                    title="Refazer alteração (Ctrl+Y)"
                    onClick={() => navegarHistorico3D('refazer')}
                  >
                    ↷ <span>Refazer</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className={!modoEdicao && !ferramentaFog ? 'ativo' : ''}
                onClick={() => {
                  anotacaoRef.current = null;
                  setAnotacao(null);
                  ferramentaFogRef.current = null;
                  setFerramentaFog(null);
                  setModoEdicao(false);
                  setFerramenta(null);
                }}
              >
                ⌖ <span>Mover</span>
              </button>
              <button
                type="button"
                disabled={
                  !['nevoa', 'nevoa_visao', 'exploracao'].includes(cenaAtual?.visibilidade || '')
                }
                className={ferramentaFog === 'revelar' ? 'ativo' : ''}
                onClick={() => usarFerramentaFog(ferramentaFog === 'revelar' ? null : 'revelar')}
              >
                ◌ <span>Revelar</span>
              </button>
              <button
                type="button"
                disabled={
                  !['nevoa', 'nevoa_visao', 'exploracao'].includes(cenaAtual?.visibilidade || '')
                }
                className={ferramentaFog === 'ocultar' ? 'ativo' : ''}
                onClick={() => usarFerramentaFog(ferramentaFog === 'ocultar' ? null : 'ocultar')}
              >
                ◉ <span>Cobrir</span>
              </button>
              {['nevoa', 'nevoa_visao', 'exploracao'].includes(cenaAtual?.visibilidade || '') &&
                !EMBUTIDO_3D && (
                  <>
                    <label className="m3d-fog-option">
                      Pincel{' '}
                      <input
                        aria-label="Tamanho do pincel da névoa 3D"
                        type="range"
                        min={1}
                        max={15}
                        value={raioFog}
                        onChange={(e) => {
                          raioFogRef.current = Number(e.target.value);
                          setRaioFog(raioFogRef.current);
                        }}
                      />
                    </label>
                    {cenaAtual?.visibilidade === 'exploracao' && (
                      <label className="m3d-fog-option">
                        Exploração{' '}
                        <select
                          aria-label="Exploração individual ou em grupo na Mesa 3D"
                          value={fogGrupo ? 'grupo' : 'individual'}
                          onChange={(e) => setFogGrupo(e.target.value === 'grupo')}
                        >
                          <option value="individual">Individual</option>
                          <option value="grupo">Grupo</option>
                        </select>
                      </label>
                    )}
                  </>
                )}
              <button
                type="button"
                className={anotacao === 'marcador' ? 'ativo' : ''}
                onClick={() => ativarAnotacao(anotacao === 'marcador' ? null : 'marcador')}
              >
                ✦ <span>Marcar</span>
              </button>
              <button
                type="button"
                className={anotacao === 'desenhar' ? 'ativo' : ''}
                onClick={() => ativarAnotacao(anotacao === 'desenhar' ? null : 'desenhar')}
              >
                ✎ <span>Desenhar</span>
              </button>
              {anotacao === 'desenhar' && (
                <label className="hx-desenho-controles">
                  Cor{' '}
                  <input
                    aria-label="Cor do traço 3D"
                    type="color"
                    value={corDesenho3D}
                    onChange={(e) => {
                      corDesenho3DRef.current = e.target.value;
                      setCorDesenho3D(e.target.value);
                    }}
                  />{' '}
                  Esp.{' '}
                  <input
                    aria-label="Espessura do traço 3D"
                    type="range"
                    min="1"
                    max="12"
                    value={espessuraDesenho3D}
                    onChange={(e) => {
                      espessuraDesenho3DRef.current = Number(e.target.value);
                      setEspessuraDesenho3D(Number(e.target.value));
                    }}
                  />
                </label>
              )}
              {(['parede', 'porta', 'luz'] as TipoObjeto3D[]).map((tipo) => (
                <button
                  type="button"
                  key={tipo}
                  className={modoEdicao && ferramenta === tipo ? 'ativo' : ''}
                  onClick={() => {
                    anotacaoRef.current = null;
                    setAnotacao(null);
                    setModoMestre(true);
                    setModoEdicao(true);
                    setFerramenta(tipo);
                    ferramentaRef.current = tipo;
                    setTipoNovo(tipo);
                    setPainelAtivo('construcao');
                    setPainelVisivel(true);
                  }}
                >
                  {tipo === 'parede' ? '▥' : tipo === 'porta' ? '🚪' : '☼'}{' '}
                  <span>{ESPECIFICACOES_3D[tipo].nome}</span>
                </button>
              ))}
              {!visaoIndividualId &&
                !modoEdicao &&
                !ferramenta &&
                !ferramentaFog &&
                tokenDaCenaSelecionado &&
                unidadeTokenSelecionada && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(tokenDaCenaSelecionado.travado)}
                      onClick={() => inverterTokenSelecionadoNo3D()}
                      title={`Inverter horizontalmente ${unidadeTokenSelecionada.nome} na cena`}
                    >
                      ⇄{' '}
                      <span>
                        {tokenDaCenaSelecionado.espelhadoX ? 'Desfazer flip' : 'Flip token'}
                      </span>
                    </button>
                  </>
                )}
              <button
                type="button"
                className={visaoIndividualId ? 'ativo' : ''}
                title="Prévia de visão individual na Mesa 3D, respeitando barreiras. Não altera a cena."
                onClick={() => {
                  if (visaoIndividualId) {
                    ativarVisaoIndividual(null);
                    return;
                  }
                  const alvo =
                    tokenSelecionadoId && cenaAtual?.tokens[tokenSelecionadoId]
                      ? tokenSelecionadoId
                      : cenaAtual?.tokens[id]
                        ? id
                        : personagensNaCena[0]?.id;
                  if (!alvo) {
                    setAvisoMesaLivre('Coloque um token na cena antes de testar sua visão.');
                    return;
                  }
                  ativarVisaoIndividual(alvo);
                }}
              >
                ◐ <span>{visaoIndividualId ? 'Sair da visão' : 'Testar visão do token'}</span>
              </button>
            </div>
          )}
          {visaoIndividualId && (
            <div className="m3d-vision-preview" role="status">
              <strong>◐ PRÉVIA DA VISÃO INDIVIDUAL</strong>
              <span>
                {estado.unidades.find((u) => u.id === visaoIndividualId)?.nome || 'Personagem'} ·
                respeita paredes e portas fechadas
              </span>
              {!EMBUTIDO_3D && (
                <>
                  <label>
                    Observar{' '}
                    <select
                      aria-label="Personagem observado na visão individual"
                      value={visaoIndividualId}
                      onChange={(e) => ativarVisaoIndividual(e.target.value)}
                    >
                      {personagensNaCena.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => ativarVisaoIndividual(null)}>
                    Sair da prévia
                  </button>
                </>
              )}
            </div>
          )}
          {modoEdicao && (
            <div className="m3d-build-hud">
              <strong>◫ Construção</strong>
              <span>Câmera livre do mestre</span>
              <span>
                {ferramenta
                  ? `Inserindo: ${ESPECIFICACOES_3D[ferramenta].nome}`
                  : 'Selecione ou arraste objetos'}
              </span>
              <button type="button" onClick={() => setModoEdicao(false)}>
                ✓ Fechar edição
              </button>
            </div>
          )}
          {modoMestre && !visaoIndividualId && anotacaoSelecionada && !ferramenta && !anotacao && (
            <div
              className="m3d-selection-hud m3d-barreira-editor298"
              role="group"
              aria-label="Editar elemento da cena"
            >
              <div className="m3d-editor298-title">
                <strong>
                  {anotacaoSelecionada.tipo === 'marcador'
                    ? '✦ Marcação'
                    : anotacaoSelecionada.tipo === 'luz'
                      ? '☼ Fonte de luz'
                      : '✎ Desenho'}
                </strong>
                <button
                  type="button"
                  title="Fechar seleção"
                  onClick={() => selecionarAnotacao3D(null, null)}
                >
                  ×
                </button>
              </div>
              {anotacaoSelecionada.tipo === 'marcador' && (
                <button type="button" onClick={() => renomearMarcador3D(anotacaoSelecionada.id)}>
                  ✎ Renomear
                </button>
              )}
              {luzSelecionadaNoChao && (
                <div
                  className="m3d-luz-editor298"
                  role="group"
                  aria-label={`Editar fonte de luz ${luzSelecionadaNoChao.nome}`}
                >
                  <label className="m3d-luz-campo-nome">
                    Nome{' '}
                    <input
                      type="text"
                      maxLength={65}
                      value={luzSelecionadaNoChao.nome || ''}
                      aria-label="Nome da fonte de luz"
                      onChange={(e) =>
                        alterarLuz3D(luzSelecionadaNoChao.id, { nome: e.target.value })
                      }
                    />
                  </label>
                  <div className="m3d-luz-editor-linha">
                    <label>
                      <input
                        type="checkbox"
                        checked={luzSelecionadaNoChao.ativa}
                        onChange={(e) =>
                          alterarLuz3D(luzSelecionadaNoChao.id, { ativa: e.target.checked })
                        }
                      />{' '}
                      Luz acesa
                    </label>
                    <label className="m3d-luz-cor">
                      Cor{' '}
                      <input
                        type="color"
                        aria-label="Cor da fonte de luz"
                        value={luzSelecionadaNoChao.cor}
                        onChange={(e) =>
                          alterarLuz3D(luzSelecionadaNoChao.id, { cor: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="m3d-luz-campo-alcance">
                    Alcance {luzSelecionadaNoChao.alcance}%{' '}
                    <input
                      type="range"
                      min={2}
                      max={70}
                      value={luzSelecionadaNoChao.alcance}
                      onChange={(e) =>
                        alterarLuz3D(luzSelecionadaNoChao.id, { alcance: Number(e.target.value) })
                      }
                    />
                  </label>
                  <details className="m3d-luz-posicao">
                    <summary>Posição precisa</summary>
                    <label>
                      X: {Number(luzSelecionadaNoChao.x.toFixed(2)).toLocaleString('pt-BR')}%
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={luzSelecionadaNoChao.x}
                        onChange={(e) =>
                          alterarLuz3D(luzSelecionadaNoChao.id, { x: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Y: {Number(luzSelecionadaNoChao.y.toFixed(2)).toLocaleString('pt-BR')}%
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={luzSelecionadaNoChao.y}
                        onChange={(e) =>
                          alterarLuz3D(luzSelecionadaNoChao.id, { y: Number(e.target.value) })
                        }
                      />
                    </label>
                  </details>
                </div>
              )}
              <small>
                {anotacaoSelecionada.tipo === 'desenho'
                  ? 'Clique no traço · Delete remove'
                  : 'Arraste para reposicionar · Delete remove'}
              </small>
              <button
                type="button"
                className="m3d-delete-selected"
                onClick={() => excluirAnotacao3D(anotacaoSelecionada.tipo, anotacaoSelecionada.id)}
              >
                ✕ Excluir
              </button>
            </div>
          )}
          {modoMestre && !visaoIndividualId && barreiraAtual && !ferramenta && (
            <div
              className="m3d-selection-hud m3d-barreira-hud m3d-barreira-editor298"
              role="group"
              aria-label="Editar barreira compartilhada"
            >
              <div className="m3d-editor298-title">
                <strong>⌖ Editar barreira</strong>
                <button
                  type="button"
                  title="Fechar seleção"
                  onClick={() => {
                    barreiraSelecionadaRef.current = null;
                    setBarreiraSelecionada(null);
                  }}
                >
                  ×
                </button>
              </div>
              <label>
                Tipo{' '}
                <select
                  aria-label="Tipo de barreira"
                  value={barreiraAtual.tipo}
                  onChange={(e) => {
                    if (
                      editarBarreiraCompartilhada3D(
                        campanhaId,
                        cenaId,
                        alterarTipoBarreira(barreiraAtual, e.target.value as BarreiraMapa['tipo']),
                      )
                    ) {
                      estadoRef.current = buscarCampanha();
                      setEstado(estadoRef.current);
                    }
                  }}
                >
                  {(Object.entries(NOMES_BARREIRA) as [BarreiraMapa['tipo'], string][]).map(
                    ([tipo, nome]) => (
                      <option key={tipo} value={tipo}>
                        {nome}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={barreiraBloqueiaMovimento(barreiraAtual)}
                  disabled={barreiraAtual.tipo === 'porta' && barreiraAtual.aberta}
                  onChange={(e) => {
                    if (
                      editarBarreiraCompartilhada3D(campanhaId, cenaId, {
                        ...barreiraAtual,
                        bloqueiaMovimento: e.target.checked,
                      })
                    ) {
                      estadoRef.current = buscarCampanha();
                      setEstado(estadoRef.current);
                    }
                  }}
                />{' '}
                Bloquear movimento
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={barreiraBloqueiaVisao(barreiraAtual)}
                  disabled={barreiraAtual.tipo === 'porta' && barreiraAtual.aberta}
                  onChange={(e) => {
                    if (
                      editarBarreiraCompartilhada3D(campanhaId, cenaId, {
                        ...barreiraAtual,
                        bloqueiaVisao: e.target.checked,
                      })
                    ) {
                      estadoRef.current = buscarCampanha();
                      setEstado(estadoRef.current);
                    }
                  }}
                />{' '}
                Bloquear visão
              </label>
              {barreiraAtual.tipo === 'porta' && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      editarBarreiraCompartilhada3D(campanhaId, cenaId, {
                        ...barreiraAtual,
                        aberta: !barreiraAtual.aberta,
                        trancada: false,
                      })
                    ) {
                      estadoRef.current = buscarCampanha();
                      setEstado(estadoRef.current);
                    }
                  }}
                >
                  {barreiraAtual.aberta ? 'Fechar porta' : 'Abrir porta'}
                </button>
              )}
              <button
                type="button"
                className="m3d-delete-selected"
                onClick={() => {
                  if (excluirBarreiraCompartilhada3D(campanhaId, cenaId, barreiraAtual.id)) {
                    barreiraSelecionadaRef.current = null;
                    setBarreiraSelecionada(null);
                    estadoRef.current = buscarCampanha();
                    setEstado(estadoRef.current);
                  }
                }}
              >
                ✕ Excluir
              </button>
              <small>Arraste a linha ou as pontas · Delete para excluir</small>
            </div>
          )}
          {modoMestre && !visaoIndividualId && selecionadoObjeto && !ferramenta && (
            <div
              className="m3d-selection-hud"
              role="group"
              aria-label="Editar objeto selecionado no cenário"
            >
              <span>
                <strong>{selecionadoObjeto.nome}</strong>
                <small>Arraste o objeto ou as alças dourada, azul e lilás para ajustar</small>
              </span>
              <button
                type="button"
                onClick={() =>
                  atualizarObjeto(selecionadoObjeto.id, {
                    rotacao: selecionadoObjeto.rotacao - Math.PI / 12,
                  })
                }
                title="Girar 15° à esquerda"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() =>
                  atualizarObjeto(selecionadoObjeto.id, {
                    rotacao: selecionadoObjeto.rotacao + Math.PI / 12,
                  })
                }
                title="Girar 15° à direita"
              >
                ↷
              </button>
              <button
                type="button"
                onClick={() =>
                  atualizarObjeto(selecionadoObjeto.id, { oculto: !selecionadoObjeto.oculto })
                }
              >
                {selecionadoObjeto.oculto ? '◉ Revelar' : '◯ Ocultar'}
              </button>
              <button
                type="button"
                className="m3d-delete-selected"
                onClick={apagarObjetoSelecionado}
                title="Excluir objeto (Delete)"
              >
                ✕ Excluir
              </button>
            </div>
          )}
          {!EMBUTIDO_3D &&
            modoMestre &&
            !visaoIndividualId &&
            !modoEdicao &&
            tokenDaCenaSelecionado &&
            unidadeTokenSelecionada &&
            selecoes3D.length === 0 && (
              <div
                className="m3d-token-oculto-hud"
                role="group"
                aria-label="Visibilidade do personagem selecionado"
              >
                <strong>{unidadeTokenSelecionada.nome}</strong>
                <button
                  type="button"
                  onClick={() => alternarTokenOculto3D(unidadeTokenSelecionada.id)}
                >
                  {tokenDaCenaSelecionado.oculto
                    ? '◉ Revelar aos jogadores'
                    : '◌ Ocultar dos jogadores'}
                </button>
              </div>
            )}
          {!EMBUTIDO_3D && modoMestre && !visaoIndividualId && selecoes3D.length > 0 && (
            <div className="m3d-multi-hud" role="group" aria-label="Seleção múltipla da mesa 3D">
              <strong>☑ {selecoes3D.length} selecionados</strong>
              <button type="button" onClick={apagarSelecoes3D}>
                ✕ Retirar da cena
              </button>
              <button type="button" onClick={limparSelecoes3D}>
                Limpar seleção
              </button>
            </div>
          )}
          <div className="m3d-controls-hint">
            <span>
              {modoEdicao
                ? 'CLIQUE PARA POSICIONAR · ARRASTE PARA MOVER'
                : modoMestre
                  ? 'ESQUERDO: SELECIONAR/MOVER · DIREITO NO TOKEN: FLIP'
                  : 'ARRASTE PARA GIRAR A CÂMERA'}
            </span>
            <span>
              {modoEdicao
                ? 'CTRL+CLIQUE: MULTISSELEÇÃO · DIREITO: DESLOCAR · SCROLL: ZOOM'
                : modoMestre
                  ? 'DIREITO + ARRASTAR: ORBITAR · MEIO: DESLOCAR · SCROLL: ZOOM'
                  : 'SCROLL PARA ZOOM'}
            </span>
          </div>
          {modoMestre && !modoEdicao && (
            <label className="m3d-table-wasd">
              <input
                type="checkbox"
                checked={movimentoMesaWASD}
                onChange={(e) => setMovimentoMesaWASD(e.target.checked)}
              />{' '}
              WASD na visão de mesa <small>(move o token selecionado)</small>
            </label>
          )}
          <div className="m3d-dice-bar barra-dados" aria-label="Barra de dados">
            <strong className="barra-dados-titulo">◈ DADOS</strong>
            <label htmlFor="m3d-dice-formula">Rolagem</label>
            <input
              id="m3d-dice-formula"
              aria-label="Fórmula dos dados"
              value={formulaDado}
              onChange={(e) => setFormulaDado(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') iniciarRolagem();
              }}
            />
            {[4, 6, 8, 10, 12, 20, 100].map((f) => (
              <button type="button" key={f} onClick={() => setFormulaDado(`1d${f}`)}>
                d{f}
              </button>
            ))}
            <button
              type="button"
              className="m3d-roll-button"
              disabled={!!rolagemFisica}
              onClick={iniciarRolagem}
            >
              ROLAR
            </button>
            <button
              type="button"
              className="historico-atalho"
              title="Histórico de rolagens"
              onClick={() => abrirPainel('historico')}
            >
              ☷
            </button>
          </div>
          <div className="m3d-zoom-actions navegacao-mapa" aria-label="Zoom da Mesa 3D">
            <button
              type="button"
              onClick={() => {
                if (modoMestre) {
                  distanciaLivreRef.current = Math.max(5, distanciaLivreRef.current - 2);
                  setDistanciaLivre(distanciaLivreRef.current);
                } else setZoom((v) => Math.max(3, v - 0.3));
              }}
              title="Aproximar"
            >
              ＋
            </button>
            <span>
              {modoMestre
                ? `${Math.round((18 / distanciaLivre) * 100)}%`
                : `${Math.round((5.2 / zoom) * 100)}%`}
            </span>
            <button
              type="button"
              onClick={() => {
                if (modoMestre) {
                  distanciaLivreRef.current = Math.min(160, distanciaLivreRef.current + 2);
                  setDistanciaLivre(distanciaLivreRef.current);
                } else setZoom((v) => Math.min(7.8, v + 0.3));
              }}
              title="Afastar"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                if (modoMestre) {
                  centroLivreRef.current = { x: 0, z: 0 };
                  distanciaLivreRef.current = 18;
                  setDistanciaLivre(18);
                } else setZoom(5.2);
              }}
              title="Redefinir enquadramento"
            >
              ⤢
            </button>
          </div>
          {rolagemFisica && (
            <div className="m3d-dice-host">
              <Dados3D
                faces={rolagemFisica.faces}
                valores={Array(rolagemFisica.quantidade).fill(0)}
                tempoAssentamentoMs={4200}
                onResultado={concluirRolagem}
                onErro={(mensagem) => {
                  setRolagemFisica(null);
                  setMensagemMesa(`Falha na rolagem 3D: ${mensagem}`);
                }}
                onGravacao={
                  lerCredencial(chaveMestre(campanhaId))
                    ? (video) =>
                        publicarVideoRolagemMestre(campanhaId, idVideoRolagemRef.current, video)
                    : undefined
                }
                onStream={
                  lerCredencial(chaveMestre(campanhaId))
                    ? (stream) => {
                        const c = lerCredencial(chaveMestre(campanhaId));
                        return c
                          ? iniciarDadosAoVivo(c, idVideoRolagemRef.current, stream, 'publica')
                          : undefined;
                      }
                    : undefined
                }
                onFimStream={() => {
                  const c = lerCredencial(chaveMestre(campanhaId));
                  if (c) encerrarDadosAoVivo(c, idVideoRolagemRef.current);
                }}
              />
            </div>
          )}
        </div>
        {painelVisivel && (
          <aside
            ref={painelEditorRef}
            className={`m3d-sidebar ${janelaMinimizada ? 'm3d-minimizada' : ''}`}
            aria-label="Painel da Mesa 3D"
            style={janelaPos ? { top: janelaPos.y, left: janelaPos.x, right: 'auto' } : undefined}
          >
            <div
              className="m3d-sidebar-heading"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                const r = e.currentTarget.parentElement?.getBoundingClientRect();
                if (!r) return;
                arrastoJanelaRef.current = {
                  inicioX: e.clientX,
                  inicioY: e.clientY,
                  x: r.left,
                  y: r.top,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const a = arrastoJanelaRef.current;
                if (!a) return;
                setJanelaPos({
                  x: Math.max(4, Math.min(window.innerWidth - 160, a.x + e.clientX - a.inicioX)),
                  y: Math.max(65, Math.min(window.innerHeight - 50, a.y + e.clientY - a.inicioY)),
                });
              }}
              onPointerUp={(e) => {
                arrastoJanelaRef.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                arrastoJanelaRef.current = null;
              }}
            >
              <strong>
                {atalhosMesa3D.find((a) => a.id === painelAtivo)?.rotulo || 'Ferramentas'}
              </strong>
              <div className="m3d-janela-actions">
                <button
                  type="button"
                  onClick={() => setJanelaMinimizada((v) => !v)}
                  title={janelaMinimizada ? 'Expandir painel' : 'Minimizar painel'}
                  aria-label={janelaMinimizada ? 'Expandir painel' : 'Minimizar painel'}
                >
                  {janelaMinimizada ? '＋' : '−'}
                </button>
                <button
                  type="button"
                  onClick={() => setPainelVisivel(false)}
                  aria-label="Fechar painel"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="m3d-sidebar-body" hidden={janelaMinimizada}>
              {painelAtivo === 'fichas' && (
                <div className="m3d-panel m3d-biblioteca-mestre">
                  <div className="m3d-kicker">FICHAS · BIBLIOTECA COMPARTILHADA</div>
                  <p>
                    Insira jogadores, NPCs, inimigos e chefes salvos na Biblioteca. NPCs e
                    adversários podem ser usados várias vezes.
                  </p>
                  <label>
                    Categoria
                    <select
                      value={papelBiblioteca}
                      onChange={(e) => setPapelBiblioteca(e.target.value as PapelFicha | 'todos')}
                    >
                      <option value="todos">Todas</option>
                      <option value="jogador">Jogadores</option>
                      <option value="npc">NPCs</option>
                      <option value="inimigo">Inimigos</option>
                      <option value="chefe">Chefes</option>
                    </select>
                  </label>
                  <div className="m3d-biblioteca-lista">
                    {fichasBiblioteca
                      .filter(
                        (f) =>
                          (papelBiblioteca === 'todos' ||
                            papelDaFicha(f.dados) === papelBiblioteca) &&
                          Boolean(
                            obterCampanha(campanhaId) &&
                            fichaCompativel(f, obterCampanha(campanhaId)!),
                          ),
                      )
                      .map((f) => (
                        <article key={f.id} className="m3d-biblioteca-registro">
                          <div>
                            <strong>{f.nome}</strong>
                            <small>
                              {ROTULOS_PAPEL[papelDaFicha(f.dados)]} · HP {f.dados.hpMax} · EN{' '}
                              {f.dados.manaMax} · CA {f.dados.ca}
                            </small>
                          </div>
                          <button type="button" onClick={() => colocarFichaDaBiblioteca3D(f)}>
                            {papelDaFicha(f.dados) === 'jogador'
                              ? 'Selecionar / inserir'
                              : '＋ Inserir'}
                          </button>
                        </article>
                      ))}
                    {!fichasBiblioteca.some(
                      (f) =>
                        (papelBiblioteca === 'todos' ||
                          papelDaFicha(f.dados) === papelBiblioteca) &&
                        Boolean(
                          obterCampanha(campanhaId) &&
                          fichaCompativel(f, obterCampanha(campanhaId)!),
                        ),
                    ) && <p>Nenhuma ficha compatível nesta categoria.</p>}
                  </div>
                  <a className="m3d-link" href="/personagens/">
                    ✧ Criar ou editar na Biblioteca
                  </a>
                  <button
                    type="button"
                    className="m3d-button-subtle"
                    onClick={() => abrirPainel('elenco')}
                  >
                    Ver elenco desta campanha
                  </button>
                </div>
              )}
              {painelAtivo === 'pdf' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">FICHA PDF · {nomeSelecionado.nome}</div>
                  <input
                    ref={inputPdfRef}
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(e) => void atualizarPdf(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="m3d-editor-toggle"
                    onClick={() => inputPdfRef.current?.click()}
                    disabled={id === exemplo.id}
                  >
                    ↥ {nomeSelecionado.temPdf ? 'Trocar PDF' : 'Importar PDF'}
                  </button>
                  {arquivoPdf ? (
                    <iframe
                      className="m3d-pdf-frame"
                      title={`Ficha PDF de ${nomeSelecionado.nome}`}
                      src={arquivoPdf}
                    />
                  ) : (
                    <p>Este personagem não tem um PDF disponível nesta campanha.</p>
                  )}
                </div>
              )}
              {painelAtivo === 'cenas' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">CENAS · MESMA CAMPANHA</div>
                  <p>
                    Uma só campanha. No Modo Mestre, selecione e mova tokens pelo mouse; os móveis
                    também podem ser reposicionados sem abrir o editor.
                  </p>
                  <label htmlFor="m3d-scene-select">Cena da campanha</label>
                  <select
                    id="m3d-scene-select"
                    value={cenaId}
                    onChange={(e) => alterarCena(e.target.value)}
                  >
                    {(estado.cenas.length
                      ? estado.cenas
                      : [{ id: 'cena-original', nome: 'Cena inicial' }]
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(['elenco', 'combate', 'inventario'] as PainelMesa3D[]).includes(painelAtivo) && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">PERSONAGENS E FICHAS DA CAMPANHA</div>
                  <h2>{obterCampanha(campanhaId)?.titulo || estado.titulo || 'Laboratório'}</h2>
                  <p>
                    Escolha quem controlar. Os recursos e inventários editados aqui também são
                    usados na Mesa 2D.
                  </p>
                  <label htmlFor="m3d-char-select">Personagem</label>
                  <select id="m3d-char-select" value={id} onChange={(e) => setId(e.target.value)}>
                    {personagens.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                  <p className="m3d-feedback" role="status">
                    {mensagemMesa || aviso || 'Selecione um personagem para carregar sua skin.'}
                  </p>
                  <small>
                    Tokens presentes na cena aparecem em pé; clique neles no Modo Mestre para
                    selecionar. As fichas e skins usam a mesma biblioteca de personagens em qualquer
                    modalidade.
                  </small>
                </div>
              )}
              {(['elenco', 'combate', 'inventario'] as PainelMesa3D[]).includes(painelAtivo) && (
                <div className="m3d-panel m3d-admin">
                  <div className="m3d-kicker">ADMINISTRAÇÃO DA MESA</div>
                  <div className="m3d-admin-tabs" role="group" aria-label="Ferramentas do mestre">
                    <button
                      type="button"
                      className={painelAtivo === 'elenco' ? 'ativo' : ''}
                      onClick={() => setPainelAtivo('elenco')}
                    >
                      Elenco
                    </button>
                    <button
                      type="button"
                      className={painelAtivo === 'combate' ? 'ativo' : ''}
                      onClick={() => setPainelAtivo('combate')}
                    >
                      Combate
                    </button>
                    <button
                      type="button"
                      className={painelAtivo === 'inventario' ? 'ativo' : ''}
                      onClick={() => setPainelAtivo('inventario')}
                    >
                      Inventário
                    </button>
                  </div>
                  {painelAtivo === 'elenco' && (
                    <div className="m3d-admin-elenco">
                      <p className="m3d-elenco-ajuda">
                        Recolha categorias, oculte um personagem pelo botão da linha ou o grupo
                        inteiro. Ocultos ficam transparentes para o mestre e invisíveis aos
                        jogadores. A exclusão em lote continua independente.
                      </p>
                      <label className="m3d-elenco-pesquisa">
                        Pesquisar personagem
                        <input
                          type="search"
                          value={buscaElenco3D}
                          onChange={(e) => setBuscaElenco3D(e.target.value)}
                          placeholder="Buscar jogadores, NPCs, inimigos..."
                        />
                      </label>
                      <div className="m3d-elenco-acoes">
                        <button
                          type="button"
                          onClick={() =>
                            setSelecionadosElenco3D((v) =>
                              Array.from(new Set([...v, ...elencoVisivel3D.map((u) => u.id)])),
                            )
                          }
                          disabled={!elencoVisivel3D.length}
                        >
                          Selecionar resultados ({elencoVisivel3D.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelecionadosElenco3D([])}
                          disabled={!selecionadosElenco3D.length}
                        >
                          Desmarcar
                        </button>
                        <button
                          type="button"
                          className="m3d-elenco-excluir"
                          onClick={excluirElenco3D}
                          disabled={!selecionadosElenco3D.length}
                        >
                          Excluir ({selecionadosElenco3D.length})
                        </button>
                      </div>
                      {(['jogador', 'npc', 'inimigo'] as const).map((tipo) => (
                        <section className="m3d-elenco-grupo" key={tipo}>
                          <div className="m3d-elenco-grupo-cabecalho">
                            <button
                              type="button"
                              aria-expanded={
                                !elencoRecolhido3D[tipo] || Boolean(buscaElenco3D.trim())
                              }
                              aria-controls={`m3d-elenco-${tipo}`}
                              onClick={() =>
                                setElencoRecolhido3D((v) => ({ ...v, [tipo]: !v[tipo] }))
                              }
                            >
                              {elencoRecolhido3D[tipo] && !buscaElenco3D.trim() ? '▸' : '▾'}{' '}
                              {tipo === 'jogador'
                                ? 'Jogadores'
                                : tipo === 'npc'
                                  ? 'NPCs'
                                  : 'Inimigos'}{' '}
                              ({elencoVisivel3D.filter((u) => u.tipo === tipo).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => alternarGrupoOculto3D(tipo)}
                              title={`Ocultar/revelar grupo de ${tipo} para jogadores`}
                            >
                              {cenaAtual?.camadas?.[
                                tipo === 'jogador'
                                  ? 'jogadores'
                                  : tipo === 'npc'
                                    ? 'npcs'
                                    : 'inimigos'
                              ] === false
                                ? '◌ Oculto'
                                : '◉ Visível'}
                            </button>
                          </div>
                          {(!elencoRecolhido3D[tipo] || Boolean(buscaElenco3D.trim())) && (
                            <div id={`m3d-elenco-${tipo}`} className="m3d-elenco-grupo-corpo">
                              {elencoVisivel3D
                                .filter((u) => u.tipo === tipo)
                                .map((u) => (
                                  <div className="m3d-elenco-linha" key={u.id}>
                                    <label title={`Selecionar ${u.nome} para exclusão em lote`}>
                                      <input
                                        type="checkbox"
                                        checked={selecionadosElenco3D.includes(u.id)}
                                        onChange={() => alternarElenco3D(u.id)}
                                        aria-label={`Marcar ${u.nome}`}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className={id === u.id ? 'ativo' : ''}
                                      onClick={(e) => {
                                        if (e.shiftKey) {
                                          alternarElenco3D(u.id);
                                          return;
                                        }
                                        setId(u.id);
                                        setMensagemMesa('');
                                      }}
                                    >
                                      <span style={{ background: u.cor }} className="m3d-swatch" />
                                      <strong>{u.nome}</strong>
                                      <small>
                                        {u.chefe
                                          ? 'Chefe'
                                          : u.tipo === 'jogador'
                                            ? 'Jogador'
                                            : u.tipo === 'npc'
                                              ? 'NPC'
                                              : 'Inimigo'}
                                      </small>
                                    </button>
                                    {cenaAtual?.tokens[u.id] && (
                                      <button
                                        type="button"
                                        className="m3d-elenco-token-oculto"
                                        title={
                                          cenaAtual.tokens[u.id].oculto
                                            ? `Revelar ${u.nome}`
                                            : `Ocultar ${u.nome} dos jogadores`
                                        }
                                        onClick={() => alternarTokenOculto3D(u.id)}
                                      >
                                        {cenaAtual.tokens[u.id].oculto ? '◉ Revelar' : '◌ Ocultar'}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              {!elencoVisivel3D.some((u) => u.tipo === tipo) && (
                                <p className="m3d-elenco-vazio">
                                  {buscaElenco3D
                                    ? 'Sem resultados nesta categoria.'
                                    : 'Nenhum personagem nesta categoria.'}
                                </p>
                              )}
                            </div>
                          )}
                        </section>
                      ))}
                      <button
                        type="button"
                        className="m3d-button-subtle"
                        onClick={() => abrirCriacao()}
                      >
                        ＋ Adicionar personagem nesta campanha
                      </button>
                    </div>
                  )}
                  {painelAtivo === 'combate' &&
                    (!usaImpeto ? (
                      <p>
                        Esta campanha não utiliza Ímpeto. A ficha de combate é opcional e não será
                        imposta a outro sistema.
                      </p>
                    ) : id === exemplo.id ? (
                      <p>Selecione um personagem da campanha para editar a ficha.</p>
                    ) : (
                      <div className="m3d-admin-combate">
                        <h3>{nomeSelecionado.nome}</h3>
                        <div className="m3d-admin-stats">
                          <label>
                            HP{' '}
                            <input
                              type="number"
                              min="0"
                              max={nomeSelecionado.hpMax}
                              value={nomeSelecionado.hp}
                              onChange={(e) => alterarCampo('hp', Number(e.target.value))}
                            />
                            <small>Máximo {nomeSelecionado.hpMax}</small>
                          </label>
                          <label>
                            Mana/Foco{' '}
                            <input
                              type="number"
                              min="0"
                              value={nomeSelecionado.mana}
                              onChange={(e) => alterarCampo('mana', Number(e.target.value))}
                            />
                          </label>
                          <label>
                            CA{' '}
                            <input
                              type="number"
                              min="0"
                              value={nomeSelecionado.ca}
                              onChange={(e) => alterarCampo('ca', Number(e.target.value))}
                            />
                          </label>
                          <label>
                            Escudo{' '}
                            <input
                              type="number"
                              min="0"
                              value={nomeSelecionado.escudo}
                              onChange={(e) => alterarCampo('escudo', Number(e.target.value))}
                            />
                          </label>
                          <label>
                            Iniciativa{' '}
                            <input
                              type="number"
                              value={nomeSelecionado.iniciativa}
                              onChange={(e) => alterarCampo('iniciativa', Number(e.target.value))}
                            />
                          </label>
                        </div>
                        <div className="m3d-admin-actions">
                          <label>
                            Dano manual{' '}
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={valorDano}
                              onChange={(e) =>
                                setValorDano(Math.max(1, Math.trunc(Number(e.target.value)) || 1))
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => aplicarEdicao(aplicarDano3D(campanhaId, id, valorDano))}
                          >
                            Aplicar dano (escudo primeiro)
                          </button>
                        </div>
                        <div className="m3d-admin-actions">
                          <label>
                            Conceder escudo{' '}
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={valorEscudo}
                              onChange={(e) =>
                                setValorEscudo(Math.max(1, Math.trunc(Number(e.target.value)) || 1))
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              aplicarEdicao(concederEscudo3D(campanhaId, id, valorEscudo))
                            }
                          >
                            Conceder (mantém maior)
                          </button>
                        </div>
                        <div className="m3d-admin-efeitos">
                          <strong>Buffs, debuffs e condições</strong>
                          <FaixasEfeitos efeitos={nomeSelecionado.condicoes} compacto />
                          <small>Gerencie os efeitos e a duração pela ficha de combate.</small>
                        </div>
                      </div>
                    ))}
                  {painelAtivo === 'inventario' &&
                    (id === exemplo.id ? (
                      <p>Selecione um personagem cadastrado para administrar itens.</p>
                    ) : (
                      <InventarioMesa
                        nome={nomeSelecionado.nome}
                        itens={nomeSelecionado.itens}
                        usaRegrasImpeto={usaImpeto}
                        onAdicionar={(item, q) =>
                          aplicarEdicao(adicionarItem3D(campanhaId, id, item, q))
                        }
                        onQuantidade={(itemId, q) =>
                          aplicarEdicao(definirQuantidadeItem3D(campanhaId, id, itemId, q))
                        }
                        onRemover={(itemId) => aplicarEdicao(retirarItem3D(campanhaId, id, itemId))}
                        onUsar={rolarItem}
                        destinatarios={estado.unidades
                          .filter((u) => u.id !== id && u.tipo === 'jogador')
                          .map((u) => ({ id: u.id, nome: u.nome }))}
                        onTransferir={(itemId, destino, q) => {
                          const ok = entregarItem3D(campanhaId, id, destino, itemId, q);
                          aplicarEdicao(ok);
                          return ok;
                        }}
                      />
                    ))}
                </div>
              )}
              {painelAtivo === 'iniciativa' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">ORDEM DE TURNOS · CAMPANHA</div>
                  <p>
                    {sessao.combateAtivo ? `Rodada ${sessao.rodada}` : 'Turnos não iniciados'}. A
                    mesma ordem aparece na Mesa 2D.
                  </p>
                  {ordenarParticipantesIniciativa(
                    estado.unidades,
                    cenaAtual?.participantesIniciativa,
                  ).map((u, i) => (
                    <div className="m3d-initiative-row" key={u.id}>
                      <button type="button" onClick={() => setId(u.id)}>
                        <span>{i + 1}.</span> {u.nome}
                        {sessao.combateAtivo && sessao.turnoId === u.id ? ' ← turno atual' : ''}
                      </button>
                      <input
                        type="number"
                        aria-label={`Iniciativa de ${u.nome}`}
                        value={u.iniciativa}
                        onChange={(e) =>
                          aplicarEdicao(
                            ajustarRecurso3D(
                              campanhaId,
                              u.id,
                              'iniciativa',
                              Number(e.target.value),
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        title={`Retirar ${u.nome} da iniciativa`}
                        onClick={() =>
                          aplicarEdicao(alterarParticipacaoMesa3D(campanhaId, cenaId, u.id, false))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="m3d-initiative-actions">
                    {!sessao.combateAtivo ? (
                      <button
                        disabled={
                          !ordenarParticipantesIniciativa(
                            estado.unidades,
                            cenaAtual?.participantesIniciativa,
                          ).length
                        }
                        type="button"
                        onClick={() => comandarTurno('iniciar')}
                      >
                        Iniciar turnos
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => comandarTurno('avancar')}>
                          Próximo turno
                        </button>
                        <button type="button" onClick={() => comandarTurno('encerrar')}>
                          Encerrar
                        </button>
                      </>
                    )}
                  </div>
                  <div className="m3d-initiative-actions">
                    <strong>Adicionar à iniciativa</strong>
                    <button
                      type="button"
                      onClick={() =>
                        aplicarEdicao(incluirTokensDaCenaNaIniciativa3D(campanhaId, cenaId))
                      }
                    >
                      Todos com token
                    </button>
                  </div>
                  {estado.unidades
                    .filter((u) => !(cenaAtual?.participantesIniciativa ?? []).includes(u.id))
                    .map((u) => (
                      <div key={u.id} className="m3d-initiative-row">
                        <span>
                          {u.nome} · {u.tipo}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            aplicarEdicao(alterarParticipacaoMesa3D(campanhaId, cenaId, u.id, true))
                          }
                        >
                          ＋ Adicionar
                        </button>
                      </div>
                    ))}
                </div>
              )}
              {painelAtivo === 'diario' && (
                <div className="m3d-panel m3d-diario-painel">
                  <DiarioMestreMultiplayer
                    campanhaId={campanhaId}
                    compacto
                    paginas={paginasDiario3D}
                    nomeCampanha={obterCampanha(campanhaId)?.titulo || 'Campanha'}
                    personagens={estado.unidades
                      .filter((u) => u.tipo === 'jogador')
                      .map((u) => ({ id: u.id, nome: u.nome, foto: retratos[u.id], cor: u.cor }))}
                    onOperacao={editarDiario3D}
                    onCriarItem={(pagina, destinatarioId) => {
                      const atual = lerSessaoMesa3D(campanhaId).paginasDiario.find(
                        (p) => p.id === pagina.id,
                      );
                      if (!atual || atual.tipo === 'pasta')
                        throw new Error('Este documento não está mais disponível no Diário.');
                      if (
                        destinatarioId &&
                        !estado.unidades.some(
                          (u) => u.id === destinatarioId && u.tipo === 'jogador',
                        )
                      )
                        throw new Error('Destinatário inválido para entrega.');
                      const item = publicarItemDoDiario(atual, campanhaId);
                      if (destinatarioId) {
                        if (!adicionarItem3D(campanhaId, destinatarioId, item, 1))
                          throw new Error('Não foi possível entregar o item na campanha.');
                        atualizarDados();
                      }
                      return item.nome;
                    }}
                  />
                </div>
              )}
              {painelAtivo === 'rolagens' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">ROLAGENS · DADOS FÍSICOS</div>
                  <p>
                    Use a barra inferior para rolar os mesmos dados 3D personalizados do Portal.
                  </p>
                  <label htmlFor="m3d-roll-panel">Fórmula (ex.: 2d6+3)</label>
                  <input
                    id="m3d-roll-panel"
                    className="m3d-input"
                    value={formulaDado}
                    onChange={(e) => setFormulaDado(e.target.value)}
                  />
                  <button
                    type="button"
                    className="m3d-editor-toggle"
                    disabled={!!rolagemFisica}
                    onClick={iniciarRolagem}
                  >
                    ⚄ Rolar dados
                  </button>
                  <p>
                    Os resultados entram no histórico da campanha. Dano nunca é aplicado
                    automaticamente.
                  </p>
                </div>
              )}
              {painelAtivo === 'historico' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">HISTÓRICO DA MESA</div>
                  {[...sessao.registros]
                    .reverse()
                    .slice(0, 35)
                    .map((r, i) => (
                      <div className="m3d-log-row" key={r.id || i}>
                        <small>
                          {r.hora} · {r.tipo === 'dado' ? 'Rolagem' : 'Evento'}
                        </small>
                        <p>{r.texto}</p>
                      </div>
                    ))}
                  {!sessao.registros.length && <p>Ainda não há eventos registrados.</p>}
                </div>
              )}
              {painelAtivo === 'musica' && (
                <div className="m3d-panel m3d-music-panel">
                  <div className="m3d-kicker">MÚSICA · BIBLIOTECA DA CAMPANHA</div>
                  <MusicaMesa campanhaId={campanhaId} cenaId={cenaId} />
                </div>
              )}
              {painelAtivo === 'anotacoes' && (
                <div className="m3d-build-group">
                  <h3>✎ Desenhos e marcações</h3>
                  <label
                    className="checkbox-token"
                    title="Bloqueia ou libera os desenhos de convidados nesta cena, tanto em 2D quanto em 3D."
                  >
                    <input
                      type="checkbox"
                      checked={cenaAtual?.permitirDesenhoJogadores !== false}
                      onChange={(e) => {
                        const permitido = e.target.checked;
                        const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
                          const atual = (raw.cenas as Record<string, unknown>[]).find(
                            (c) => c.id === cenaId,
                          );
                          if (!atual) return false;
                          atual.permitirDesenhoJogadores = permitido;
                          return true;
                        });
                        if (ok) {
                          const atualizado = buscarCampanha();
                          estadoRef.current = atualizado;
                          setEstado(atualizado);
                        }
                      }}
                    />
                    Autorizar desenho dos jogadores (2D e 3D)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      ativarAnotacao('desenhar');
                      setPainelVisivel(false);
                    }}
                  >
                    ✎ Desenhar no chão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      ativarAnotacao('marcador');
                      setPainelVisivel(false);
                    }}
                  >
                    ✦ Marcar ponto
                  </button>
                  <p>Marcadores da cena (clique no marcador da mesa para editar):</p>
                  {(cenaAtual?.marcadores ?? []).map((m) => (
                    <div className="linha-token-cena" key={m.id}>
                      <span>{m.texto}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nome = window.prompt('Nome da marcação:', m.texto)?.trim();
                          if (!nome) return;
                          alterarMesaCompartilhada(campanhaId, (raw) => {
                            const c = (raw.cenas as Record<string, unknown>[]).find(
                              (c) => c.id === cenaId,
                            );
                            if (!c) return false;
                            c.marcadores = (c.marcadores as typeof cenaAtual.marcadores).map((v) =>
                              v.id === m.id ? { ...v, texto: nome } : v,
                            );
                            return true;
                          });
                          estadoRef.current = buscarCampanha();
                          setEstado(estadoRef.current);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Remover este marcador?')) return;
                          alterarMesaCompartilhada(campanhaId, (raw) => {
                            const c = (raw.cenas as Record<string, unknown>[]).find(
                              (c) => c.id === cenaId,
                            );
                            if (!c) return false;
                            c.marcadores = (c.marcadores as typeof cenaAtual.marcadores).filter(
                              (v) => v.id !== m.id,
                            );
                            return true;
                          });
                          estadoRef.current = buscarCampanha();
                          setEstado(estadoRef.current);
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  <p>Desenhos ({cenaAtual?.desenhos?.length ?? 0})</p>
                  {(cenaAtual?.desenhos ?? []).map((t, i) => (
                    <div className="linha-token-cena" key={t.id}>
                      <span>Traço {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          alterarMesaCompartilhada(campanhaId, (raw) => {
                            const c = (raw.cenas as Record<string, unknown>[]).find(
                              (c) => c.id === cenaId,
                            );
                            if (!c) return false;
                            c.desenhos = (c.desenhos as TracoDesenho[]).filter(
                              (v) => v.id !== t.id,
                            );
                            return true;
                          });
                          estadoRef.current = buscarCampanha();
                          setEstado(estadoRef.current);
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {painelAtivo === 'iluminacao' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">LUZ AMBIENTE DA CENA</div>
                  <p>Selecione uma fonte para editar com o menu compacto na própria mesa.</p>
                  <p>Fontes compartilhadas 2D e 3D ({cenaAtual?.fontesLuz?.length ?? 0}):</p>
                  {(cenaAtual?.fontesLuz ?? []).map((l, i) => (
                    <div key={l.id} className="linha-token-cena">
                      <span>☼ {l.nome || `Luz ${i + 1}`}</span>
                      <button type="button" onClick={() => abrirEdicaoLuz3D(l.id)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
                            const cena = (raw.cenas as Record<string, unknown>[]).find(
                              (c) => c.id === cenaId,
                            );
                            if (!cena) return false;
                            cena.fontesLuz = (cena.fontesLuz as { id: string }[]).map((v) =>
                              v.id === l.id ? { ...v, ativa: !l.ativa } : v,
                            );
                            return true;
                          });
                          if (ok) {
                            estadoRef.current = buscarCampanha();
                            setEstado(estadoRef.current);
                          }
                        }}
                      >
                        {l.ativa ? 'Apagar' : 'Acender'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ok = alterarMesaCompartilhada(campanhaId, (raw) => {
                            const cena = (raw.cenas as Record<string, unknown>[]).find(
                              (c) => c.id === cenaId,
                            );
                            if (!cena) return false;
                            cena.fontesLuz = (cena.fontesLuz as { id: string }[]).filter(
                              (v) => v.id !== l.id,
                            );
                            return true;
                          });
                          if (ok) {
                            estadoRef.current = buscarCampanha();
                            setEstado(estadoRef.current);
                          }
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  {!EMBUTIDO_3D && (
                    <>
                      <p>Horário do céu desta cena 3D:</p>
                      <div className="m3d-palette" role="group" aria-label="Horário da cena 3D">
                        {PERIODOS_DIA_3D.map((periodo) => (
                          <button
                            type="button"
                            key={periodo}
                            className={(cenario.periodoDia || 'dia') === periodo ? 'ativo' : ''}
                            aria-pressed={(cenario.periodoDia || 'dia') === periodo}
                            onClick={() =>
                              mudarCenario({ ...cenarioRef.current, periodoDia: periodo })
                            }
                          >
                            {periodo === 'dia' ? '☀' : periodo === 'entardecer' ? '◑' : '☾'}{' '}
                            {AMBIENTES_3D[periodo].nome}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p>
                    Controla a luminosidade compartilhada com a Mesa 2D. A Mesa 3D aplica a
                    intensidade às luzes gerais do cenário.
                  </p>
                  <label htmlFor="m3d-light-slider">
                    Intensidade: {cenaAtual?.iluminacao.ambiente ?? 40}%
                  </label>
                  <input
                    id="m3d-light-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cenaAtual?.iluminacao.ambiente ?? 40}
                    onChange={(e) => mudarIluminacao(Number(e.target.value))}
                  />
                </div>
              )}
              {painelAtivo === 'clima' && (
                <div className="m3d-panel m3d-weather-panel">
                  <div className="m3d-kicker">CLIMA DA CENA · 2D E 3D</div>
                  <p>
                    Chuva, neve, neblina, cinzas, areia e folhas são renderizadas diretamente no
                    cenário 3D. As opções abaixo são compartilhadas com a Mesa 2D.
                  </p>
                  <label htmlFor="m3d-weather-type">Condição climática</label>
                  <select
                    id="m3d-weather-type"
                    value={cenaAtual?.clima.tipo || 'nenhum'}
                    onChange={(e) => mudarClima({ tipo: e.target.value as ConfigClima['tipo'] })}
                  >
                    {TIPOS_CLIMA.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.simbolo} {t.nome}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="m3d-weather-intensity">
                    Intensidade / cobertura: {cenaAtual?.clima.intensidade ?? 45}%
                  </label>
                  <input
                    type="range"
                    id="m3d-weather-intensity"
                    min="0"
                    max="100"
                    step="5"
                    disabled={cenaAtual?.clima.tipo === 'nenhum'}
                    value={cenaAtual?.clima.intensidade ?? 45}
                    onChange={(e) => mudarClima({ intensidade: Number(e.target.value) })}
                  />
                  <label htmlFor="m3d-weather-wind">
                    Força do vento: {cenaAtual?.clima.vento ?? 35}%
                  </label>
                  <input
                    type="range"
                    id="m3d-weather-wind"
                    min="0"
                    max="100"
                    step="5"
                    disabled={cenaAtual?.clima.tipo === 'nenhum'}
                    value={cenaAtual?.clima.vento ?? 35}
                    onChange={(e) => mudarClima({ vento: Number(e.target.value) })}
                  />
                  <label htmlFor="m3d-weather-direction">
                    Direção do vento: {cenaAtual?.clima.direcao ?? 0}°
                  </label>
                  <input
                    type="range"
                    id="m3d-weather-direction"
                    min="0"
                    max="359"
                    step="1"
                    disabled={cenaAtual?.clima.tipo === 'nenhum'}
                    value={cenaAtual?.clima.direcao ?? 0}
                    onChange={(e) => mudarClima({ direcao: Number(e.target.value) })}
                  />
                  <p className="m3d-weather-help">
                    0° direita · 90° baixo · 180° esquerda · 270° cima (eixos do mapa).
                  </p>
                  <label className="m3d-weather-pause">
                    <input
                      type="checkbox"
                      checked={pausarClima3D}
                      onChange={(e) => setPausarClima3D(e.target.checked)}
                    />{' '}
                    Pausar clima neste navegador
                  </label>
                  <button
                    type="button"
                    disabled={cenaAtual?.clima.tipo === 'nenhum'}
                    onClick={() => mudarClima({ tipo: 'nenhum' })}
                  >
                    ☀ Remover clima da cena
                  </button>
                  <p className="m3d-weather-help">
                    O clima é visual, salvo por cena, e não altera a visão individual, o Fog of War,
                    colisões ou combate. A pausa não é compartilhada.
                  </p>
                </div>
              )}
              {painelAtivo === 'construcao' && (
                <div className="m3d-panel m3d-editor m3d-editor-reformado">
                  <header className="m3d-terreno-heading">
                    <span className="m3d-kicker">TERRENO 3D</span>
                    <strong>{cenaAtual?.nome || 'Cena atual'}</strong>
                  </header>
                  <section className="m3d-terreno-bloco" aria-label="Controles do terreno">
                    <span className="m3d-terreno-titulo">CONTROLES DO TERRENO</span>
                    <div className="m3d-terreno-botoes">
                      <button
                        type="button"
                        onClick={() => {
                          centroLivreRef.current = { x: 0, z: 0 };
                          distanciaLivreRef.current = Math.max(
                            18,
                            Math.max(
                              dimensoesTerreno3D(cenarioRef.current).largura,
                              dimensoesTerreno3D(cenarioRef.current).profundidade,
                            ) * 1.05,
                          );
                          setDistanciaLivre(distanciaLivreRef.current);
                        }}
                      >
                        ⌖ Centralizar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAbaEditor('mapa');
                          detalhesTerrenoRef.current?.setAttribute('open', '');
                          iniciarEdicaoTerreno();
                        }}
                      >
                        ⚙ Ferramentas
                      </button>
                    </div>
                  </section>
                  <section className="m3d-terreno-bloco" aria-label="Mapa da cena">
                    <span className="m3d-terreno-titulo">MAPA DA CENA</span>
                    <button
                      type="button"
                      className="m3d-terreno-primario"
                      onClick={() => {
                        setAbaEditor('mapa');
                        detalhesTerrenoRef.current?.setAttribute('open', '');
                        iniciarEdicaoTerreno();
                      }}
                    >
                      ▧ Editar mapa
                    </button>
                    <div className="m3d-terreno-botoes">
                      <button
                        type="button"
                        disabled={enviandoPiso}
                        onClick={() => void usarMapaDaMesa2D()}
                      >
                        ↻ Sincronizar
                      </button>
                      <button
                        type="button"
                        disabled={enviandoPiso}
                        onClick={() => inputPisoRef.current?.click()}
                      >
                        ↥ Importar
                      </button>
                    </div>
                    <p className="m3d-terreno-compartilhado">✓ Mapa compartilhado entre 2D e 3D</p>
                  </section>
                  {!cenario.mapaUnico && (
                    <div className="m3d-pilot-card">
                      <strong>Mapa de versão antiga</strong>
                      <p>
                        Esta cena ainda utiliza planta e terreno separados. A conversão unifica os
                        mapas sem apagar tokens e objetos. Faça backup antes.
                      </p>
                      <button
                        type="button"
                        disabled={enviandoPiso}
                        onClick={() => void unificarMapaLegado()}
                      >
                        {enviandoPiso ? 'Convertendo...' : 'Unificar mapa 2D e 3D'}
                      </button>
                    </div>
                  )}
                  <details className="m3d-terreno-avancado" ref={detalhesTerrenoRef}>
                    <summary>
                      ⚙ Configurações avançadas <span aria-hidden="true">▾</span>
                    </summary>
                    <p className="m3d-terreno-ajuda">
                      Enquadramento, dimensões, material e ajustes precisos do mapa. Clima e
                      iluminação ficam no menu Ambiente.
                    </p>
                    <nav
                      className="m3d-editor-tabs"
                      role="tablist"
                      aria-label="Seções do Terreno 3D"
                    >
                      {ABAS_EDITOR_3D.map((aba) => (
                        <button
                          key={aba.id}
                          type="button"
                          role="tab"
                          id={`m3d-tab-${aba.id}`}
                          aria-controls={`m3d-conteudo-${aba.id}`}
                          aria-selected={abaEditor === aba.id}
                          className={abaEditor === aba.id ? 'ativo' : ''}
                          onClick={() => {
                            setAbaEditor(aba.id);
                            setConfirmarLimpeza(false);
                            if (aba.id === 'construcao') iniciarEdicaoTerreno();
                          }}
                        >
                          <span aria-hidden="true">{aba.simbolo}</span> {aba.rotulo}
                        </button>
                      ))}
                    </nav>
                    {!modoEdicao && (
                      <button
                        type="button"
                        className="m3d-editor-toggle"
                        onClick={iniciarEdicaoTerreno}
                      >
                        Abrir ferramentas do terreno
                      </button>
                    )}
                    {(modoEdicao || abaEditor === 'mapa') && (
                      <>
                        {abaEditor === 'mapa' && (
                          <section
                            id="m3d-conteudo-mapa"
                            role="tabpanel"
                            aria-labelledby="m3d-tab-mapa"
                            className="m3d-editor-tab-content"
                          >
                            <p className="m3d-editor-intro">
                              Um mapa compartilhado entre 2D e 3D. Importe a mesma imagem para as
                              duas mesas ou use um chão vazio.
                            </p>
                            {cenario.piso === 'imagem' && imagemPiso && !cenario.mapaUnico && (
                              <div
                                className="m3d-plant-size-controls m3d-plant-size-quick"
                                role="group"
                                aria-label="Redimensionar a imagem da planta"
                              >
                                <div className="m3d-build-heading">
                                  AJUSTE RÁPIDO · TAMANHO DA PLANTA
                                </div>
                                <p>
                                  Use os botões, a barra ou digite o tamanho. Você pode mudar um
                                  eixo sem alterar o outro. O chão cresce automaticamente se
                                  necessário.
                                </p>
                                <div className="m3d-coords">
                                  <div className="m3d-plant-axis">
                                    <label htmlFor="m3d-plant-width">
                                      Largura da planta (horizontal, m)
                                    </label>
                                    <input
                                      id="m3d-plant-width"
                                      aria-label="Largura da planta 3D"
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      value={rascunhoLarguraPlanta}
                                      onChange={(e) => setRascunhoLarguraPlanta(e.target.value)}
                                      onBlur={() =>
                                        confirmarRascunhoPlanta('largura', rascunhoLarguraPlanta)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                      }}
                                    />
                                    <div className="m3d-plant-axis-actions">
                                      <button
                                        type="button"
                                        aria-label="Diminuir largura da planta"
                                        onClick={() =>
                                          redimensionarPlanta(
                                            'largura',
                                            Math.max(
                                              4,
                                              (cenarioRef.current.larguraPlanta ??
                                                dimensoesTerreno3D(cenarioRef.current).largura) - 1,
                                            ),
                                          )
                                        }
                                      >
                                        − 1 m
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Aumentar largura da planta"
                                        onClick={() =>
                                          redimensionarPlanta(
                                            'largura',
                                            Math.min(
                                              120 /
                                                Math.max(
                                                  0.5,
                                                  Math.min(2, cenarioRef.current.escalaMapa ?? 1),
                                                ),
                                              (cenarioRef.current.larguraPlanta ??
                                                dimensoesTerreno3D(cenarioRef.current).largura) + 1,
                                            ),
                                          )
                                        }
                                      >
                                        ＋ 1 m
                                      </button>
                                    </div>
                                    <input
                                      aria-label="Ajustar largura da planta com o mouse"
                                      type="range"
                                      min="4"
                                      max={
                                        120 / Math.max(0.5, Math.min(2, cenario.escalaMapa ?? 1))
                                      }
                                      step="0.5"
                                      value={
                                        cenario.larguraPlanta ?? dimensoesTerreno3D(cenario).largura
                                      }
                                      onChange={(e) =>
                                        redimensionarPlanta('largura', Number(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div className="m3d-plant-axis">
                                    <label htmlFor="m3d-plant-depth">
                                      Profundidade da planta (vertical, m)
                                    </label>
                                    <input
                                      id="m3d-plant-depth"
                                      aria-label="Profundidade da planta 3D"
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      value={rascunhoProfundidadePlanta}
                                      onChange={(e) =>
                                        setRascunhoProfundidadePlanta(e.target.value)
                                      }
                                      onBlur={() =>
                                        confirmarRascunhoPlanta(
                                          'profundidade',
                                          rascunhoProfundidadePlanta,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                      }}
                                    />
                                    <div className="m3d-plant-axis-actions">
                                      <button
                                        type="button"
                                        aria-label="Diminuir profundidade da planta"
                                        onClick={() =>
                                          redimensionarPlanta(
                                            'profundidade',
                                            Math.max(
                                              4,
                                              (cenarioRef.current.profundidadePlanta ??
                                                dimensoesTerreno3D(cenarioRef.current)
                                                  .profundidade) - 1,
                                            ),
                                          )
                                        }
                                      >
                                        − 1 m
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Aumentar profundidade da planta"
                                        onClick={() =>
                                          redimensionarPlanta(
                                            'profundidade',
                                            Math.min(
                                              120 /
                                                Math.max(
                                                  0.5,
                                                  Math.min(2, cenarioRef.current.escalaMapa ?? 1),
                                                ),
                                              (cenarioRef.current.profundidadePlanta ??
                                                dimensoesTerreno3D(cenarioRef.current)
                                                  .profundidade) + 1,
                                            ),
                                          )
                                        }
                                      >
                                        ＋ 1 m
                                      </button>
                                    </div>
                                    <input
                                      aria-label="Ajustar profundidade da planta com o mouse"
                                      type="range"
                                      min="4"
                                      max={
                                        120 / Math.max(0.5, Math.min(2, cenario.escalaMapa ?? 1))
                                      }
                                      step="0.5"
                                      value={
                                        cenario.profundidadePlanta ??
                                        dimensoesTerreno3D(cenario).profundidade
                                      }
                                      onChange={(e) =>
                                        redimensionarPlanta('profundidade', Number(e.target.value))
                                      }
                                    />
                                  </div>
                                </div>
                                <small>
                                  Pressione Enter ou clique fora para aplicar um número. As barras e
                                  os botões salvam imediatamente.
                                </small>
                                <div className="m3d-terrain-actions">
                                  <button
                                    type="button"
                                    className="m3d-button-subtle"
                                    disabled={!cenario.ajusteLivrePlanta}
                                    onClick={() =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        ajusteLivrePlanta: false,
                                      })
                                    }
                                  >
                                    Manter proporção original
                                  </button>
                                  <button
                                    type="button"
                                    className="m3d-button-subtle"
                                    disabled={!cenario.aspectoPlanta}
                                    onClick={() => {
                                      const d = dimensoesTerrenoDaPlanta3D(
                                        cenarioRef.current.aspectoPlanta ?? 1,
                                        1,
                                      );
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        larguraPlanta: d.largura,
                                        profundidadePlanta: d.profundidade,
                                        ajusteLivrePlanta: false,
                                        escalaMapa: 1,
                                      });
                                    }}
                                  >
                                    Restaurar tamanho inicial da planta
                                  </button>
                                  {cenario.ajusteLivrePlanta && (
                                    <small>
                                      Ajuste livre ativo: a planta usa exatamente as medidas
                                      definidas, com a escala geral aplicada igualmente aos dois
                                      eixos.
                                    </small>
                                  )}
                                </div>
                              </div>
                            )}
                            {cenario.piso !== 'imagem' && !cenario.mapaUnico && (
                              <div className="m3d-plant-size-controls m3d-plant-size-quick">
                                <strong>AJUSTE DA PLANTA ANTIGA</strong>
                                <p>
                                  Você pode importar uma imagem ou converter o cenário para o mapa
                                  compartilhado.
                                </p>
                              </div>
                            )}
                            {cenario.piso === 'imagem' && !imagemPiso && (
                              <div className="m3d-plant-size-controls m3d-plant-size-quick">
                                <strong>PLANTA AINDA NÃO DISPONÍVEL</strong>
                                <p>
                                  O editor está procurando a imagem desta cena. Se ela não aparecer,
                                  importe uma imagem ou copie uma planta existente, se desejar.
                                </p>
                              </div>
                            )}
                            <div className="m3d-build-group">
                              <div className="m3d-build-heading">Imagem do mapa</div>
                              <p>
                                A imagem do mapa é a mesma nas duas mesas. Seus tokens e paredes
                                usam coordenadas compartilhadas.
                              </p>
                              <button
                                type="button"
                                className="m3d-editor-toggle"
                                disabled={enviandoPiso}
                                onClick={() => void usarMapaDaMesa2D()}
                              >
                                ↥ Sincronizar mapa desta cena
                              </button>
                              {!cenario.mapaUnico && (
                                <>
                                  <label htmlFor="m3d-fit-mode">Enquadramento do mapa</label>
                                  <select
                                    id="m3d-fit-mode"
                                    value={cenario.ajusteMapa || 'conter'}
                                    disabled={cenario.ajusteLivrePlanta === true}
                                    onChange={(e) =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        ajusteMapa: e.target.value as 'conter' | 'cobrir',
                                      })
                                    }
                                  >
                                    <option value="conter">
                                      Mostrar mapa inteiro, sem deformar (recomendado)
                                    </option>
                                    <option value="cobrir">
                                      Preencher o chão (bordas podem ficar fora)
                                    </option>
                                  </select>
                                </>
                              )}
                              <input
                                ref={inputPisoRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                aria-label="Imagem do piso"
                                className="m3d-file-input"
                                onChange={(e) => void importarPiso(e.target.files?.[0])}
                              />
                              <button
                                type="button"
                                className="m3d-button-subtle"
                                disabled={enviandoPiso}
                                onClick={() => inputPisoRef.current?.click()}
                              >
                                {enviandoPiso
                                  ? 'Preparando...'
                                  : '▧ Importar mapa para as duas mesas'}
                              </button>
                              {imagemPiso && (
                                <button
                                  type="button"
                                  className="m3d-button-subtle"
                                  onClick={() => setConfirmarRemocaoMapa((v) => !v)}
                                >
                                  {cenario.mapaUnico
                                    ? 'Remover mapa compartilhado'
                                    : 'Remover imagem 3D antiga'}
                                </button>
                              )}
                              {imagemPiso && confirmarRemocaoMapa && (
                                <div
                                  className="m3d-confirm"
                                  role="group"
                                  aria-label="Confirmar remoção do mapa"
                                >
                                  <p>
                                    {cenario.mapaUnico
                                      ? 'Atenção: a imagem deste mapa será removida das duas visualizações. Paredes e tokens serão preservados. Faça backup antes.'
                                      : 'A imagem legada 3D será removida; o mapa da Mesa 2D será preservado.'}
                                  </p>
                                  <button type="button" onClick={() => void removerPiso()}>
                                    Sim, remover imagem
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmarRemocaoMapa(false)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                              {cenario.piso === 'imagem' && imagemPiso && !cenario.mapaUnico && (
                                <div className="m3d-map-calibration">
                                  <label htmlFor="m3d-map-scale">
                                    Tamanho da planta: {Math.round((cenario.escalaMapa ?? 1) * 100)}
                                    %
                                  </label>
                                  <input
                                    id="m3d-map-scale"
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.05"
                                    value={cenario.escalaMapa ?? 1}
                                    onChange={(e) =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        escalaMapa: Number(e.target.value),
                                      })
                                    }
                                  />
                                  <label htmlFor="m3d-map-x">
                                    Deslocamento horizontal:{' '}
                                    {Math.round((cenario.deslocamentoMapaX ?? 0) * 100)}%
                                  </label>
                                  <input
                                    id="m3d-map-x"
                                    type="range"
                                    min="-0.5"
                                    max="0.5"
                                    step="0.01"
                                    value={cenario.deslocamentoMapaX ?? 0}
                                    onChange={(e) =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        deslocamentoMapaX: Number(e.target.value),
                                      })
                                    }
                                  />
                                  <label htmlFor="m3d-map-z">
                                    Deslocamento vertical:{' '}
                                    {Math.round((cenario.deslocamentoMapaZ ?? 0) * 100)}%
                                  </label>
                                  <input
                                    id="m3d-map-z"
                                    type="range"
                                    min="-0.5"
                                    max="0.5"
                                    step="0.01"
                                    value={cenario.deslocamentoMapaZ ?? 0}
                                    onChange={(e) =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        deslocamentoMapaZ: Number(e.target.value),
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="m3d-button-subtle"
                                    onClick={() =>
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        ajusteMapa: 'conter',
                                        escalaMapa: 1,
                                        deslocamentoMapaX: 0,
                                        deslocamentoMapaZ: 0,
                                        ajusteLivrePlanta: false,
                                      })
                                    }
                                  >
                                    Restaurar enquadramento
                                  </button>
                                  <small>
                                    A imagem do chão mantém as cores originais, mesmo ao construir
                                    paredes, portas ou luzes.
                                  </small>
                                </div>
                              )}
                              <small>
                                PNG, JPG ou WebP · até 12 MB · o mesmo mapa e as mesmas barreiras
                                nas duas mesas
                              </small>
                            </div>
                          </section>
                        )}
                        {abaEditor === 'mapa' && (
                          <section className="m3d-editor-tab-content m3d-editor-mapa-config">
                            <p className="m3d-editor-intro">
                              Configure o material de mapas sem imagem e o tamanho físico do mapa
                              compartilhado.
                            </p>
                            {cenario.base === 'arquivos' && (
                              <div className="m3d-pilot-card">
                                <p>
                                  Esta cena veio de um modelo antigo. Você pode retirar a decoração
                                  inicial sem apagar seu mapa, tokens ou objetos personalizados.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        'Remover apenas a sala de demonstração antiga desta cena?',
                                      )
                                    )
                                      mudarCenario({ ...cenarioRef.current, base: 'vazia' });
                                  }}
                                >
                                  Retirar cenário inicial antigo
                                </button>
                              </div>
                            )}
                            <label htmlFor="m3d-terreno-material">Material do chão</label>
                            <select
                              id="m3d-terreno-material"
                              disabled={cenario.mapaUnico && imagemPiso}
                              value={cenario.piso || 'madeira'}
                              onChange={(e) =>
                                mudarCenario({
                                  ...cenarioRef.current,
                                  piso: e.target.value as PisoCena3D,
                                })
                              }
                            >
                              <option value="madeira">Tábuas de madeira</option>
                              <option value="pedra">Pedra</option>
                              <option value="grama">Grama</option>
                              <option value="imagem" disabled={!imagemPiso}>
                                Imagem importada {imagemPiso ? '' : '(importe primeiro)'}
                              </option>
                            </select>
                            {!cenario.mapaUnico && (
                              <div className="m3d-build-group m3d-terreno-size">
                                <div className="m3d-build-heading">Tamanho da área jogável</div>
                                <p>
                                  Largura e profundidade independentes da imagem. Não diminua o piso
                                  sobre paredes ou móveis existentes.
                                </p>
                                <div className="m3d-coords">
                                  <label>
                                    Largura do terreno (m)
                                    <input
                                      aria-label="Largura do terreno 3D"
                                      type="text"
                                      inputMode="decimal"
                                      value={rascunhoLarguraTerreno}
                                      onChange={(e) => setRascunhoLarguraTerreno(e.target.value)}
                                      onBlur={() =>
                                        confirmarRascunhoTerreno('largura', rascunhoLarguraTerreno)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                      }}
                                    />
                                  </label>
                                  <label>
                                    Profundidade (m)
                                    <input
                                      aria-label="Profundidade do terreno 3D"
                                      type="text"
                                      inputMode="decimal"
                                      value={rascunhoProfundidadeTerreno}
                                      onChange={(e) =>
                                        setRascunhoProfundidadeTerreno(e.target.value)
                                      }
                                      onBlur={() =>
                                        confirmarRascunhoTerreno(
                                          'profundidade',
                                          rascunhoProfundidadeTerreno,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                      }}
                                    />
                                  </label>
                                </div>
                                <div className="m3d-terrain-actions">
                                  <button
                                    type="button"
                                    className="m3d-button-subtle"
                                    onClick={() => {
                                      const d = dimensoesTerreno3D(cenarioRef.current);
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        larguraTerreno: Math.min(120, d.largura + 4),
                                        profundidadeTerreno: Math.min(120, d.profundidade + 4),
                                      });
                                    }}
                                  >
                                    ＋ Expandir terreno
                                  </button>
                                  <button
                                    type="button"
                                    className="m3d-button-subtle"
                                    disabled={!cenario.larguraPlanta || !cenario.profundidadePlanta}
                                    onClick={() => {
                                      const escala = Math.max(
                                        0.5,
                                        Math.min(2, cenarioRef.current.escalaMapa ?? 1),
                                      );
                                      const w = (cenarioRef.current.larguraPlanta ?? 0) * escala,
                                        h = (cenarioRef.current.profundidadePlanta ?? 0) * escala;
                                      if (!w || !h) return;
                                      const fora = cenarioRef.current.objetos.some((o) => {
                                        const medida = medidasObjeto3D(o),
                                          cos = Math.abs(Math.cos(o.rotacao)),
                                          sin = Math.abs(Math.sin(o.rotacao));
                                        const margemX =
                                          (medida.largura * cos + medida.profundidade * sin) / 2;
                                        const margemZ =
                                          (medida.largura * sin + medida.profundidade * cos) / 2;
                                        return (
                                          Math.abs(o.x) + margemX > w / 2 - 0.1 ||
                                          Math.abs(o.z) + margemZ > h / 2 - 0.1
                                        );
                                      });
                                      if (fora) {
                                        setAvisoEdicao(
                                          'Existem peças nas áreas externas. Mova-as para a planta antes de reduzir o terreno.',
                                        );
                                        return;
                                      }
                                      mudarCenario({
                                        ...cenarioRef.current,
                                        larguraTerreno: w,
                                        profundidadeTerreno: h,
                                      });
                                      distanciaLivreRef.current = Math.max(
                                        18,
                                        Math.max(w, h) * 1.05,
                                      );
                                      setDistanciaLivre(distanciaLivreRef.current);
                                      setAvisoEdicao(
                                        'Terreno ajustado à planta original, sem apagar paredes ou objetos.',
                                      );
                                    }}
                                  >
                                    ⤢ Ajustar à planta
                                  </button>
                                </div>
                              </div>
                            )}
                            {!cenario.mapaUnico && (
                              <small>
                                Edite os valores diretamente ou use Expandir terreno. Seus objetos
                                permanecem independentes das dimensões do piso.
                              </small>
                            )}
                            {cenario.mapaUnico && (
                              <div className="m3d-build-group">
                                <div className="m3d-build-heading">
                                  Tamanho do mapa compartilhado
                                </div>
                                <p>
                                  Uma única superfície nas duas mesas. As posições são percentuais,
                                  e a proporção da imagem é preservada.
                                </p>
                                <strong>
                                  {dimensoesTerreno3D(cenario).largura.toFixed(1)} ×{' '}
                                  {dimensoesTerreno3D(cenario).profundidade.toFixed(1)} m no espaço
                                  3D
                                </strong>
                                <label htmlFor="m3d-mapa-escala">
                                  Escala física da mesa:{' '}
                                  {Math.round(dimensoesTerreno3D(cenario).largura)} m na largura
                                </label>
                                <input
                                  id="m3d-mapa-escala"
                                  type="range"
                                  min="8"
                                  max="100"
                                  step="1"
                                  value={dimensoesTerreno3D(cenario).largura}
                                  onChange={(e) => {
                                    const w = Number(e.target.value),
                                      ratio =
                                        cenarioRef.current.aspectoPlanta ||
                                        dimensoesTerreno3D(cenarioRef.current).largura /
                                          dimensoesTerreno3D(cenarioRef.current).profundidade;
                                    const h = Math.max(4, Math.min(120, w / ratio));
                                    mudarCenario({
                                      ...cenarioRef.current,
                                      larguraTerreno: w,
                                      profundidadeTerreno: h,
                                      larguraPlanta: w,
                                      profundidadePlanta: h,
                                      ajusteLivrePlanta: true,
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </section>
                        )}
                        {abaEditor === 'construcao' && (
                          <section
                            id="m3d-conteudo-construcao"
                            role="tabpanel"
                            aria-labelledby="m3d-tab-construcao"
                            className="m3d-editor-tab-content"
                          >
                            <div className="m3d-build-group">
                              <div className="m3d-build-heading">02 · Grade e precisão</div>
                              <label className="m3d-check">
                                <input
                                  type="checkbox"
                                  checked={cenario.mostrarGrade !== false}
                                  onChange={(e) =>
                                    mudarCenario({
                                      ...cenarioRef.current,
                                      mostrarGrade: e.target.checked,
                                    })
                                  }
                                />{' '}
                                Exibir grade durante a edição
                              </label>
                              <label className="m3d-check">
                                <input
                                  type="checkbox"
                                  checked={cenario.encaixarGrade !== false}
                                  onChange={(e) =>
                                    mudarCenario({
                                      ...cenarioRef.current,
                                      encaixarGrade: e.target.checked,
                                    })
                                  }
                                />{' '}
                                Encaixar objetos automaticamente
                              </label>
                              <label htmlFor="m3d-grade-step">Tamanho da divisão</label>
                              <select
                                id="m3d-grade-step"
                                value={cenario.passoGrade || 0.5}
                                onChange={(e) =>
                                  mudarCenario({
                                    ...cenarioRef.current,
                                    passoGrade: Number(e.target.value),
                                  })
                                }
                              >
                                <option value={0.25}>0,25 m (fino)</option>
                                <option value={0.5}>0,5 m (padrão)</option>
                                <option value={1}>1 m (amplo)</option>
                              </select>
                              <label htmlFor="m3d-build-zoom">
                                Distância da câmera do mestre: {distanciaLivre.toFixed(0)} m
                              </label>
                              <input
                                id="m3d-build-zoom"
                                type="range"
                                min="5"
                                max="160"
                                step="1"
                                value={distanciaLivre}
                                onChange={(e) => {
                                  distanciaLivreRef.current = Number(e.target.value);
                                  setDistanciaLivre(Number(e.target.value));
                                }}
                              />
                            </div>
                            <div className="m3d-build-group">
                              <div className="m3d-build-heading">
                                03 · Construir diretamente na Visão de Mesa
                              </div>
                              <p>
                                Selecione uma peça e clique no chão para colocá-la. Para paredes,
                                você também pode clicar e arrastar para traçar o comprimento.
                                Arraste objetos existentes para movê-los. Botão direito: girar
                                câmera; botão do meio: deslocar; rolagem: zoom.
                              </p>
                              <div className="m3d-editor-row">
                                <select
                                  aria-label="Tipo de objeto"
                                  value={tipoNovo}
                                  onChange={(e) => {
                                    setTipoNovo(e.target.value as TipoObjeto3D);
                                    if (ferramenta) setFerramenta(e.target.value as TipoObjeto3D);
                                  }}
                                >
                                  {TIPOS_OBJETO_3D.map((t) => (
                                    <option key={t} value={t}>
                                      {ESPECIFICACOES_3D[t].nome}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className={ferramenta ? 'm3d-tool-on' : ''}
                                  onClick={() => setFerramenta(ferramenta ? null : tipoNovo)}
                                >
                                  {ferramenta ? '✓ Posicionando' : '＋ Construir'}
                                </button>
                              </div>
                              {ferramenta && (
                                <button
                                  type="button"
                                  className="m3d-button-subtle"
                                  onClick={() => setFerramenta(null)}
                                >
                                  Finalizar colocação · Selecionar objetos
                                </button>
                              )}
                              <div className="m3d-palette">
                                {TIPOS_OBJETO_3D.map((tipo) => (
                                  <button
                                    key={tipo}
                                    type="button"
                                    className={ferramenta === tipo ? 'ativo' : ''}
                                    aria-pressed={ferramenta === tipo}
                                    onClick={() => {
                                      setTipoNovo(tipo);
                                      setFerramenta(ferramenta === tipo ? null : tipo);
                                    }}
                                  >
                                    {ESPECIFICACOES_3D[tipo].nome}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                className="m3d-button-subtle"
                                onClick={() => {
                                  setFerramenta(null);
                                  incluirObjeto();
                                }}
                              >
                                ＋ Adicionar perto do personagem
                              </button>
                            </div>
                            <div className="m3d-build-heading">04 · Ajustar objeto selecionado</div>
                            <label htmlFor="m3d-objects">
                              Objetos da cena ({cenario.objetos.length})
                            </label>
                            <select
                              id="m3d-objects"
                              value={selecionado || ''}
                              onChange={(e) => {
                                selecionadoRef.current = e.target.value || null;
                                setSelecionado(e.target.value || null);
                              }}
                            >
                              <option value="">Selecione um objeto</option>
                              {cenario.objetos.map((o) => (
                                <option value={o.id} key={o.id}>
                                  {o.nome} ({o.x.toFixed(1)}, {o.z.toFixed(1)})
                                </option>
                              ))}
                            </select>
                            {selecionadoObjeto && (
                              <div className="m3d-object-edit">
                                <label>
                                  Nome
                                  <input
                                    maxLength={65}
                                    value={selecionadoObjeto.nome}
                                    onChange={(e) =>
                                      atualizarObjeto(selecionadoObjeto.id, {
                                        nome: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <div className="m3d-coords">
                                  <label>
                                    Posição X
                                    <input
                                      type="number"
                                      step=".25"
                                      min={-dimensoesTerreno3D(cenario).largura / 2}
                                      max={dimensoesTerreno3D(cenario).largura / 2}
                                      value={selecionadoObjeto.x}
                                      onChange={(e) =>
                                        atualizarObjeto(selecionadoObjeto.id, {
                                          x: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    Posição Z
                                    <input
                                      type="number"
                                      step=".25"
                                      min={-dimensoesTerreno3D(cenario).profundidade / 2}
                                      max={dimensoesTerreno3D(cenario).profundidade / 2}
                                      value={selecionadoObjeto.z}
                                      onChange={(e) =>
                                        atualizarObjeto(selecionadoObjeto.id, {
                                          z: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                                {selecionadoObjeto.tipo === 'parede' && (
                                  <label>
                                    Comprimento da parede (m)
                                    <input
                                      type="number"
                                      min="0.25"
                                      max="120"
                                      step="0.25"
                                      value={selecionadoObjeto.comprimento || 3}
                                      onChange={(e) =>
                                        atualizarObjeto(selecionadoObjeto.id, {
                                          comprimento: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </label>
                                )}
                                {selecionadoObjeto.tipo !== 'parede' && (
                                  <label>
                                    Largura (m)
                                    <input
                                      type="number"
                                      min="0.25"
                                      max="120"
                                      step="0.25"
                                      value={medidasObjeto3D(selecionadoObjeto).largura}
                                      onChange={(e) =>
                                        atualizarObjeto(selecionadoObjeto.id, {
                                          largura: Number(e.target.value),
                                        })
                                      }
                                    />
                                  </label>
                                )}
                                <label>
                                  Profundidade (m)
                                  <input
                                    type="number"
                                    min="0.15"
                                    max="120"
                                    step="0.25"
                                    value={medidasObjeto3D(selecionadoObjeto).profundidade}
                                    onChange={(e) =>
                                      atualizarObjeto(selecionadoObjeto.id, {
                                        profundidade: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Altura (m)
                                  <input
                                    type="number"
                                    min="0.1"
                                    max="120"
                                    step="0.25"
                                    value={medidasObjeto3D(selecionadoObjeto).altura}
                                    onChange={(e) =>
                                      atualizarObjeto(selecionadoObjeto.id, {
                                        altura: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Rotação —{' '}
                                  {Math.round((selecionadoObjeto.rotacao * 180) / Math.PI)}°
                                  <input
                                    type="range"
                                    min="0"
                                    max="6.283185"
                                    step=".261799"
                                    value={
                                      (selecionadoObjeto.rotacao + Math.PI * 2) % (Math.PI * 2)
                                    }
                                    onChange={(e) =>
                                      atualizarObjeto(selecionadoObjeto.id, {
                                        rotacao: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="m3d-button-subtle"
                                  onClick={() => {
                                    if (cenarioRef.current.objetos.length >= 140) return;
                                    const copia = novoObjeto3D(
                                      selecionadoObjeto.tipo,
                                      { x: selecionadoObjeto.x + 1, z: selecionadoObjeto.z + 1 },
                                      cenarioRef.current,
                                    );
                                    copia.nome = selecionadoObjeto.nome + ' (cópia)';
                                    copia.rotacao = selecionadoObjeto.rotacao;
                                    copia.comprimento = selecionadoObjeto.comprimento;
                                    copia.largura = selecionadoObjeto.largura;
                                    copia.profundidade = selecionadoObjeto.profundidade;
                                    copia.altura = selecionadoObjeto.altura;
                                    copia.estilo = selecionadoObjeto.estilo;
                                    mudarCenario({
                                      ...cenarioRef.current,
                                      objetos: [...cenarioRef.current.objetos, copia],
                                    });
                                    setSelecionado(copia.id);
                                    selecionadoRef.current = copia.id;
                                  }}
                                >
                                  Duplicar objeto
                                </button>
                                <button
                                  type="button"
                                  className="m3d-delete"
                                  onClick={apagarObjetoSelecionado}
                                >
                                  Remover objeto selecionado
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              className="m3d-button-subtle"
                              onClick={() => setConfirmarLimpeza((v) => !v)}
                            >
                              Limpar personalizações desta cena
                            </button>
                            {confirmarLimpeza && (
                              <div className="m3d-confirm">
                                <p>
                                  Isso apagará os objetos personalizados deste cenário 3D. A Mesa 2D
                                  não será alterada.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    mudarCenario({ ...cenarioRef.current, objetos: [] });
                                    setSelecionado(null);
                                    selecionadoRef.current = null;
                                    setConfirmarLimpeza(false);
                                  }}
                                >
                                  Sim, limpar
                                </button>
                                <button type="button" onClick={() => setConfirmarLimpeza(false)}>
                                  Cancelar
                                </button>
                              </div>
                            )}
                            <small>
                              Salvamento automático por campanha e cena. Incluído no backup do
                              mestre.
                            </small>
                          </section>
                        )}
                        {avisoEdicao && (
                          <p className="m3d-editor-status" role="status">
                            {avisoEdicao}
                          </p>
                        )}
                      </>
                    )}
                  </details>
                </div>
              )}
              {modoMestre && painelAtivo === 'miniaturas' && (
                <div className="m3d-panel m3d-miniaturas-panel">
                  <div className="m3d-mini-header">
                    <div>
                      <div className="m3d-kicker">MINIATURAS 3D</div>
                      <strong>Modelos e cena</strong>
                    </div>
                    <div className="m3d-mini-header-counts" aria-label="Resumo da biblioteca">
                      <span>{bibliotecaMiniaturas.length} modelos</span>
                      <span>{miniaturasCena.length} na cena</span>
                    </div>
                  </div>
                  <a
                    className="m3d-mini-portal-link"
                    href={urlBibliotecaGlobalMiniaturas3D(campanhaId)}
                    target="_top"
                    title="Gerenciar a biblioteca global nesta mesma aba; depois é possível voltar à mesa"
                  >
                    ♟ Gerenciar biblioteca geral <span aria-hidden="true">→</span>
                  </a>
                  <div className="m3d-mini-tabs" role="tablist" aria-label="Seções de miniaturas">
                    {(
                      [
                        ['biblioteca', 'Biblioteca'],
                        ['cena', 'Na cena'],
                        ['importar', 'Importar'],
                      ] as const
                    ).map(([chave, nome]) => (
                      <button
                        key={chave}
                        type="button"
                        role="tab"
                        aria-selected={abaMiniaturas === chave}
                        className={abaMiniaturas === chave ? 'ativo' : ''}
                        onClick={() => {
                          if (chave !== 'biblioteca') {
                            setColocandoMiniatura(false);
                            colocandoMiniaturaRef.current = false;
                          }
                          setAbaMiniaturas(chave);
                        }}
                      >
                        {nome}
                      </button>
                    ))}
                  </div>
                  {abaMiniaturas === 'biblioteca' && (
                    <div className="m3d-mini-secao" role="tabpanel">
                      <div className="m3d-mini-secao-titulo">
                        <strong>Escolha um modelo</strong>
                        <button
                          type="button"
                          className="m3d-mini-link"
                          onClick={() => setAbaMiniaturas('importar')}
                        >
                          ＋ Novo GLB
                        </button>
                      </div>
                      <input
                        type="search"
                        aria-label="Buscar modelos 3D"
                        placeholder="Buscar na biblioteca..."
                        value={buscaMiniaturas}
                        onChange={(e) => setBuscaMiniaturas(e.target.value)}
                      />
                      <div className="m3d-mini-lista" aria-label="Modelos da biblioteca">
                        {bibliotecaMiniaturas
                          .filter((modelo) =>
                            modelo.nome
                              .toLocaleLowerCase('pt-BR')
                              .includes(buscaMiniaturas.trim().toLocaleLowerCase('pt-BR')),
                          )
                          .map((modelo) => (
                            <button
                              type="button"
                              key={modelo.id}
                              className={`m3d-mini-list-item ${modeloMiniaturaId === modelo.id ? 'ativo' : ''}`}
                              aria-pressed={modeloMiniaturaId === modelo.id}
                              onClick={() => {
                                setModeloMiniaturaId(modelo.id);
                                setColocandoMiniatura(false);
                                colocandoMiniaturaRef.current = false;
                              }}
                            >
                              <span className="m3d-mini-list-icon" aria-hidden="true">
                                ♙
                              </span>
                              <span className="m3d-mini-list-text">
                                <strong>{modelo.nome}</strong>
                                <small>
                                  {formatarMB(modelo.bytes)} ·{' '}
                                  {modelo.triangulos.toLocaleString('pt-BR')} triângulos
                                  {modelo.animacoes ? ` · ${modelo.animacoes} anim.` : ''}
                                </small>
                              </span>
                              {modeloMiniaturaId === modelo.id && (
                                <span className="m3d-mini-check" aria-label="Selecionado">
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        {bibliotecaMiniaturas.length === 0 && (
                          <div className="m3d-mini-vazio">
                            Nenhum modelo instalado. Importe um GLB ou experimente o modelo de
                            demonstração.
                          </div>
                        )}
                        {bibliotecaMiniaturas.length > 0 &&
                          !bibliotecaMiniaturas.some((m) =>
                            m.nome
                              .toLocaleLowerCase('pt-BR')
                              .includes(buscaMiniaturas.trim().toLocaleLowerCase('pt-BR')),
                          ) && (
                            <div className="m3d-mini-vazio">
                              Nenhum modelo corresponde à pesquisa.
                            </div>
                          )}
                      </div>
                      {modeloMiniaturaId &&
                        bibliotecaMiniaturas.some((m) => m.id === modeloMiniaturaId) && (
                          <div className="m3d-mini-modelo-selecionado">
                            <strong>
                              {bibliotecaMiniaturas.find((m) => m.id === modeloMiniaturaId)?.nome}
                            </strong>
                            <PreviewMiniatura3D modeloId={modeloMiniaturaId} />
                            <div className="m3d-mini-acoes">
                              <button
                                type="button"
                                className={colocandoMiniatura ? 'm3d-tool-on' : ''}
                                onClick={() => {
                                  const ativar = !colocandoMiniatura;
                                  setColocandoMiniatura(ativar);
                                  colocandoMiniaturaRef.current = ativar;
                                  setModoMestre(true);
                                  modoMestreRef.current = true;
                                  setModoEdicao(false);
                                  modoEdicaoRef.current = false;
                                  setFerramenta(null);
                                  ferramentaRef.current = null;
                                }}
                              >
                                {colocandoMiniatura
                                  ? 'Cancelar colocação'
                                  : '＋ Posicionar no mapa'}
                              </button>
                              <button
                                type="button"
                                className="m3d-button-subtle"
                                onClick={() => {
                                  salvarMiniaturaNoPonto({
                                    x: posicaoRef.current.x + 1,
                                    z: posicaoRef.current.z + 1,
                                  });
                                  setAbaMiniaturas('cena');
                                }}
                              >
                                ＋ Perto do personagem
                              </button>
                            </div>
                            <button
                              type="button"
                              className="m3d-mini-excluir"
                              onClick={() => void excluirModeloSelecionado()}
                            >
                              Excluir GLB da biblioteca
                            </button>
                            {colocandoMiniatura && (
                              <p className="m3d-mini-instrucao" role="status">
                                Clique no terreno para posicionar esta miniatura. Para cancelar,
                                clique novamente no botão acima.
                              </p>
                            )}
                            <details className="m3d-mini-details">
                              <summary>Usar como personagem na Mesa 3D</summary>
                              <p className="m3d-mini-muted">
                                O modelo representa a ficha e o token existentes; no 2D continua a
                                imagem original.
                              </p>
                              <label>
                                Personagem presente na cena
                                <select
                                  value={personagemParaMiniatura}
                                  onChange={(e) => setPersonagemParaMiniatura(e.target.value)}
                                >
                                  <option value="">Escolha um personagem...</option>
                                  {estado.unidades
                                    .filter((u) => Boolean(cenaAtual?.tokens[u.id]))
                                    .map((u) => (
                                      <option value={u.id} key={u.id}>
                                        {u.nome}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                disabled={!personagemParaMiniatura}
                                onClick={vincularModeloSelecionado}
                              >
                                ♙ Vincular ou substituir miniatura do personagem
                              </button>
                            </details>
                          </div>
                        )}
                    </div>
                  )}
                  {abaMiniaturas === 'cena' && (
                    <div className="m3d-mini-secao" role="tabpanel">
                      <div className="m3d-mini-secao-titulo">
                        <strong>Miniaturas nesta cena ({miniaturasCena.length})</strong>
                        <button
                          type="button"
                          className="m3d-mini-link"
                          onClick={() => setAbaMiniaturas('biblioteca')}
                        >
                          ＋ Adicionar
                        </button>
                      </div>
                      {(() => {
                        const estimativa = miniaturasCena.reduce(
                          (total, m) =>
                            total +
                            (bibliotecaMiniaturas.find((b) => b.id === m.modeloId)?.triangulos ??
                              0),
                          0,
                        );
                        return (
                          <p className="m3d-mini-muted" role="status">
                            Geometria estimada: {estimativa.toLocaleString('pt-BR')} triângulos.
                            {estimativa > 300000
                              ? ' ⚠ Cena pesada: considere modelos mais leves.'
                              : ''}
                          </p>
                        );
                      })()}
                      <input
                        type="search"
                        aria-label="Buscar miniaturas nesta cena"
                        placeholder="Buscar miniatura ou personagem..."
                        value={buscaMiniaturasCena}
                        onChange={(e) => setBuscaMiniaturasCena(e.target.value)}
                      />
                      <div className="m3d-mini-lista" aria-label="Miniaturas colocadas na cena">
                        {miniaturasCena
                          .filter((m) => {
                            const nomePersonagem =
                              estado.unidades.find((u) => u.id === m.personagemId)?.nome ?? '';
                            return `${m.nome} ${nomePersonagem}`
                              .toLocaleLowerCase('pt-BR')
                              .includes(buscaMiniaturasCena.trim().toLocaleLowerCase('pt-BR'));
                          })
                          .map((m) => (
                            <button
                              type="button"
                              key={m.id}
                              className={`m3d-mini-list-item ${miniaturaSelecionadaId === m.id ? 'ativo' : ''}`}
                              aria-pressed={miniaturaSelecionadaId === m.id}
                              onClick={() => setMiniaturaSelecionadaId(m.id)}
                            >
                              <span className="m3d-mini-list-icon" aria-hidden="true">
                                ♙
                              </span>
                              <span className="m3d-mini-list-text">
                                <strong>{m.nome}</strong>
                                <small>
                                  {m.personagemId
                                    ? `Personagem: ${estado.unidades.find((u) => u.id === m.personagemId)?.nome ?? 'Vinculado'}`
                                    : 'Objeto independente'}
                                  {m.oculto ? ' · Oculta' : ''}
                                </small>
                              </span>
                              {miniaturaSelecionadaId === m.id && (
                                <span className="m3d-mini-check" aria-label="Selecionado">
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        {!miniaturasCena.length && (
                          <div className="m3d-mini-vazio">
                            Esta cena ainda não tem miniaturas. Escolha uma na Biblioteca.
                          </div>
                        )}
                        {miniaturasCena.length > 0 &&
                          !miniaturasCena.some((m) =>
                            `${m.nome} ${estado.unidades.find((u) => u.id === m.personagemId)?.nome ?? ''}`
                              .toLocaleLowerCase('pt-BR')
                              .includes(buscaMiniaturasCena.trim().toLocaleLowerCase('pt-BR')),
                          ) && (
                            <div className="m3d-mini-vazio">
                              Nenhuma miniatura corresponde à pesquisa.
                            </div>
                          )}
                      </div>
                      {miniaturaSelecionada && (
                        <div className="m3d-mini-card" aria-label="Editor da miniatura selecionada">
                          <div className="m3d-mini-secao-titulo">
                            <strong>Editar miniatura</strong>
                            <span className="m3d-mini-status-chip">
                              {miniaturaSelecionada.personagemId ? 'Personagem' : 'Objeto'}
                            </span>
                          </div>
                          <label>
                            Nome
                            <input
                              value={miniaturaSelecionada.nome}
                              maxLength={70}
                              onChange={(e) =>
                                alterarMiniatura(miniaturaSelecionada.id, { nome: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Representação
                            <select
                              value={miniaturaSelecionada.personagemId || ''}
                              onChange={(e) =>
                                alterarMiniatura(miniaturaSelecionada.id, {
                                  personagemId: e.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Objeto independente</option>
                              {estado.unidades
                                .filter((u) => Boolean(cenaAtual?.tokens[u.id]))
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.nome} · token da cena
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="m3d-mini-checkline">
                            <input
                              type="checkbox"
                              checked={Boolean(miniaturaSelecionada.oculto)}
                              onChange={(e) =>
                                alterarMiniatura(miniaturaSelecionada.id, {
                                  oculto: e.target.checked,
                                })
                              }
                            />{' '}
                            Ocultar miniatura nesta cena
                          </label>
                          <details className="m3d-mini-details" open>
                            <summary>Posição, tamanho e rotação</summary>
                            <div className="m3d-mini-grid">
                              <label>
                                X (m)
                                <input
                                  type="number"
                                  step=".25"
                                  value={miniaturaSelecionada.x}
                                  disabled={Boolean(miniaturaSelecionada.personagemId)}
                                  onChange={(e) =>
                                    alterarMiniatura(miniaturaSelecionada.id, {
                                      x: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Z (m)
                                <input
                                  type="number"
                                  step=".25"
                                  value={miniaturaSelecionada.z}
                                  disabled={Boolean(miniaturaSelecionada.personagemId)}
                                  onChange={(e) =>
                                    alterarMiniatura(miniaturaSelecionada.id, {
                                      z: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Altura (m)
                                <input
                                  type="number"
                                  step=".05"
                                  min="0"
                                  max="25"
                                  value={miniaturaSelecionada.altura}
                                  onChange={(e) =>
                                    alterarMiniatura(miniaturaSelecionada.id, {
                                      altura: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Escala
                                <input
                                  type="number"
                                  step=".1"
                                  min=".1"
                                  max="8"
                                  value={miniaturaSelecionada.escala}
                                  onChange={(e) =>
                                    alterarMiniatura(miniaturaSelecionada.id, {
                                      escala: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                            </div>
                            <label>
                              Rotação ({Math.round((miniaturaSelecionada.rotacao * 180) / Math.PI)}
                              °)
                              <input
                                type="range"
                                min="-3.14159"
                                max="3.14159"
                                step=".0523599"
                                value={miniaturaSelecionada.rotacao}
                                onChange={(e) =>
                                  alterarMiniatura(miniaturaSelecionada.id, {
                                    rotacao: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                          </details>
                          <details className="m3d-mini-details">
                            <summary>Animação idle (opcional)</summary>
                            <label>
                              Reprodução
                              <select
                                value={miniaturaSelecionada.animacaoModo ?? 'automatico'}
                                onChange={(e) =>
                                  alterarMiniatura(miniaturaSelecionada.id, {
                                    animacaoModo: e.target.value as
                                      'automatico' | 'desligado' | 'clip',
                                  })
                                }
                              >
                                <option value="automatico">Automático (idle reconhecido)</option>
                                <option value="desligado">Desligado · miniatura estática</option>
                                <option value="clip" disabled={!nomesAnimacoesSelecionadas.length}>
                                  Escolher animação do GLB
                                </option>
                              </select>
                            </label>
                            {miniaturaSelecionada.animacaoModo === 'clip' && (
                              <label>
                                Clipe incorporado
                                <select
                                  value={miniaturaSelecionada.animacaoIndice ?? 0}
                                  onChange={(e) =>
                                    alterarMiniatura(miniaturaSelecionada.id, {
                                      animacaoIndice: Number(e.target.value),
                                    })
                                  }
                                >
                                  {nomesAnimacoesSelecionadas.map((nome, i) => (
                                    <option key={i} value={i}>
                                      {i + 1}. {nome}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {miniaturaSelecionada.animacaoModo !== 'desligado' &&
                              nomesAnimacoesSelecionadas.length > 0 && (
                                <label>
                                  Velocidade:{' '}
                                  {(miniaturaSelecionada.animacaoVelocidade ?? 1).toFixed(2)}×
                                  <input
                                    type="range"
                                    min="0.25"
                                    max="2"
                                    step="0.05"
                                    value={miniaturaSelecionada.animacaoVelocidade ?? 1}
                                    onChange={(e) =>
                                      alterarMiniatura(miniaturaSelecionada.id, {
                                        animacaoVelocidade: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                              )}
                            <p className="m3d-mini-muted">
                              {nomesAnimacoesSelecionadas.length
                                ? `${nomesAnimacoesSelecionadas.length} clipe(s) encontrados no GLB.`
                                : 'Este GLB não possui clipes de animação identificados.'}
                            </p>
                          </details>
                          <button
                            type="button"
                            className="m3d-delete"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remover ${miniaturaSelecionada.nome} desta cena? O GLB permanece na biblioteca.`,
                                )
                              )
                                return;
                              mudarCenario({
                                ...cenarioRef.current,
                                miniaturas: (cenarioRef.current.miniaturas ?? []).filter(
                                  (m) => m.id !== miniaturaSelecionada.id,
                                ),
                              });
                              setMiniaturaSelecionadaId(null);
                            }}
                          >
                            Remover miniatura da cena
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {abaMiniaturas === 'importar' && (
                    <div className="m3d-mini-secao" role="tabpanel">
                      <strong>Adicionar modelo à biblioteca</strong>
                      <p className="m3d-mini-muted">
                        Modelos importados ficam disponíveis em todas as campanhas e no backup.
                      </p>
                      <label className="m3d-mini-toggle">
                        <input
                          type="checkbox"
                          checked={modoImportacaoAvancado}
                          disabled={analisandoMiniatura || importandoMiniatura}
                          onChange={(e) => {
                            setModoImportacaoAvancado(e.target.checked);
                            setArquivoMiniaturaPendente(null);
                            setAnaliseMiniaturaPendente(null);
                            setAvisoMiniatura('');
                          }}
                        />
                        <span>
                          <strong>Permitir arquivos maiores</strong>
                          <small>
                            {modoImportacaoAvancado
                              ? 'Modo avançado ativo · até 100 MB por GLB'
                              : 'Até 50 MB por GLB · ative para permitir até 100 MB'}
                          </small>
                        </span>
                      </label>
                      <label className="m3d-mini-upload">
                        Selecionar modelo GLB (até {modoImportacaoAvancado ? '100' : '50'} MB)
                        <input
                          type="file"
                          accept=".glb,model/gltf-binary"
                          disabled={analisandoMiniatura || importandoMiniatura}
                          onChange={(e) => {
                            const arquivo = e.target.files?.[0];
                            e.target.value = '';
                            void analisarGLB(arquivo);
                          }}
                        />
                        <small>
                          Até 1 milhão de triângulos por modelo · avisos acima de 150 mil · 40
                          miniaturas por cena
                        </small>
                      </label>
                      {analiseMiniaturaPendente && arquivoMiniaturaPendente && (
                        <div
                          className="m3d-mini-card"
                          aria-label="Análise do modelo 3D antes da importação"
                        >
                          <div className="m3d-build-heading">
                            Análise · {arquivoMiniaturaPendente.name}
                          </div>
                          <p className="m3d-mini-muted">
                            <strong>Complexidade: {analiseMiniaturaPendente.classificacao}</strong>{' '}
                            · {formatarMB(analiseMiniaturaPendente.bytes)} ·{' '}
                            {analiseMiniaturaPendente.triangulos.toLocaleString('pt-BR')} triângulos
                            · {analiseMiniaturaPendente.malhas} malha(s)
                          </p>
                          <p className="m3d-mini-muted">
                            {analiseMiniaturaPendente.texturas} textura(s) ·{' '}
                            {analiseMiniaturaPendente.animacoes} animação(ões) para idle opcional
                          </p>
                          {analiseMiniaturaPendente.resolucoesTexturas.length > 0 && (
                            <details className="m3d-mini-details">
                              <summary>Texturas incorporadas</summary>
                              <ul>
                                {analiseMiniaturaPendente.resolucoesTexturas
                                  .slice(0, 12)
                                  .map((tex, i) => (
                                    <li key={i}>
                                      {tex.formato.replace('image/', '')} ·{' '}
                                      {tex.largura && tex.altura
                                        ? `${tex.largura} × ${tex.altura} px`
                                        : 'resolução não identificada'}{' '}
                                      · {formatarMB(tex.bytes)}
                                    </li>
                                  ))}
                              </ul>
                            </details>
                          )}
                          {analiseMiniaturaPendente.avisos.length > 0 && (
                            <div className="m3d-mini-muted" role="status">
                              <strong>Alertas de desempenho:</strong>
                              <ul>
                                {analiseMiniaturaPendente.avisos.map((aviso, i) => (
                                  <li key={i}>{aviso}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="m3d-mini-grid">
                            <button
                              type="button"
                              disabled={importandoMiniatura}
                              onClick={() => void importarGLB(arquivoMiniaturaPendente)}
                            >
                              Confirmar importação
                            </button>
                            <button
                              type="button"
                              className="m3d-button-subtle"
                              disabled={importandoMiniatura}
                              onClick={() => {
                                setArquivoMiniaturaPendente(null);
                                setAnaliseMiniaturaPendente(null);
                                setAvisoMiniatura('Importação cancelada.');
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="m3d-button-subtle"
                        disabled={importandoMiniatura}
                        onClick={() =>
                          void (async () => {
                            try {
                              const resposta = await fetch('/models/guardiao_jade_demo.glb');
                              if (!resposta.ok) throw Error('Modelo de demonstração indisponível.');
                              const exemplo = new File(
                                [await resposta.blob()],
                                'Guardião de Jade.glb',
                                { type: 'model/gltf-binary' },
                              );
                              await importarGLB(exemplo);
                            } catch (e) {
                              setAvisoMiniatura(
                                e instanceof Error
                                  ? e.message
                                  : 'Não foi possível instalar o exemplo.',
                              );
                            }
                          })()
                        }
                      >
                        ♙ Instalar miniatura de exemplo (21 KB)
                      </button>
                      <div className="m3d-mini-capacidade">
                        <strong>Armazenamento usado</strong>
                        <span>
                          {formatarMB(
                            bibliotecaMiniaturas.reduce((total, m) => total + m.bytes, 0),
                          )}{' '}
                          / {formatarMB(LIMITE_TOTAL_BIBLIOTECA_BYTES)}
                        </span>
                      </div>
                      <details className="m3d-mini-details">
                        <summary>Sobre o armazenamento e backup</summary>
                        <p>
                          Os arquivos permanecem neste navegador, sujeitos ao espaço disponível. O
                          backup completo v29.15.4 suporta arquivos de até 2 GB nos navegadores
                          compatíveis; nos demais, o download convencional é limitado a 180 MB.
                        </p>
                      </details>
                    </div>
                  )}
                  {avisoMiniatura && (
                    <div className="m3d-mini-status" role="status">
                      {avisoMiniatura}
                    </div>
                  )}
                  <details className="m3d-mini-details m3d-mini-ajuda">
                    <summary>Ajuda e disponibilidade</summary>
                    <p className="m3d-mini-muted">
                      Os modelos 3D funcionam na mesa do mestre. A exibição multiplayer será
                      integrada em outra etapa.
                    </p>
                  </details>
                </div>
              )}
              {modoMestre && painelAtivo === 'mesa' && (
                <div className="m3d-panel m3d-livre-panel">
                  <div className="m3d-kicker">MESA LIVRE · CONTROLES DO MESTRE</div>
                  <p>
                    Clique em um token e pressione Delete para retirá-lo apenas desta cena (se não
                    estiver bloqueado). Arraste tokens para reposicioná-los na Mesa 2D e 3D. Arraste
                    móveis para ajustar o cenário 3D. Paredes e móveis com colisão continuam
                    bloqueando passagem.
                  </p>
                  <p className="m3d-feedback" role="status">
                    {avisoMesaLivre}
                  </p>
                  <p>
                    <strong>Selecionado:</strong>{' '}
                    {itemMesaSelecionado === 'token'
                      ? nomeSelecionado.nome
                      : itemMesaSelecionado === 'objeto'
                        ? selecionadoObjeto?.nome || 'Objeto'
                        : 'Nenhum'}
                  </p>
                  {itemMesaSelecionado === 'objeto' && selecionadoObjeto && (
                    <div className="m3d-object-quick-actions">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarObjeto(selecionadoObjeto.id, {
                            rotacao: selecionadoObjeto.rotacao - Math.PI / 12,
                          })
                        }
                      >
                        ↶ Girar −15°
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          atualizarObjeto(selecionadoObjeto.id, {
                            rotacao: selecionadoObjeto.rotacao + Math.PI / 12,
                          })
                        }
                      >
                        ↷ Girar +15°
                      </button>
                    </div>
                  )}
                  <label htmlFor="m3d-master-zoom">
                    Distância da câmera: {distanciaLivre.toFixed(0)} m
                  </label>
                  <input
                    id="m3d-master-zoom"
                    type="range"
                    min="5"
                    max="160"
                    step="1"
                    value={distanciaLivre}
                    onChange={(e) => {
                      distanciaLivreRef.current = Number(e.target.value);
                      setDistanciaLivre(Number(e.target.value));
                    }}
                  />
                  <button
                    type="button"
                    className="m3d-button-subtle"
                    onClick={() => {
                      centroLivreRef.current = { x: 0, z: 0 };
                      yawLivreRef.current = 0.4;
                      pitchLivreRef.current = 1.05;
                      distanciaLivreRef.current = 18;
                      setDistanciaLivre(18);
                    }}
                  >
                    Centralizar visão da mesa
                  </button>
                </div>
              )}
              {painelAtivo === 'camera' && (
                <div className="m3d-panel">
                  <div className="m3d-kicker">MOVIMENTAÇÃO & CÂMERA</div>
                  {!modoEdicao && !modoMestre && (
                    <div className="m3d-keys">
                      <div>
                        <kbd>W</kbd>
                        <div>
                          <kbd>A</kbd>
                          <kbd>S</kbd>
                          <kbd>D</kbd>
                        </div>
                      </div>
                      <span>
                        Mover o personagem
                        <br />
                        <small>Shift: correr</small>
                      </span>
                    </div>
                  )}
                  {!modoEdicao && !modoMestre && (
                    <>
                      <div className="m3d-zoom-line">
                        <span>Distância da câmera</span>
                        <strong>{zoom.toFixed(1)} m</strong>
                      </div>
                      <input
                        aria-label="Distância da câmera"
                        type="range"
                        min="3"
                        max="7.8"
                        step=".2"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                      />
                      <div className="m3d-angle-line">
                        <span>Ângulo de visão</span>
                        <strong>
                          {Math.round(
                            ((((angulo % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180) /
                              Math.PI,
                          )}
                          °
                        </strong>
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    className="m3d-button-subtle"
                    onClick={() => setDetalhes((v) => !v)}
                    aria-expanded={detalhes}
                  >
                    {detalhes ? '− Ocultar' : '＋ Ver'} detalhes técnicos
                  </button>
                  {detalhes && (
                    <div className="m3d-details">
                      <p>WebGL · {fps} FPS (estimativa)</p>
                      <p>Colisões com paredes e objetos colocados pelo mestre.</p>
                      <p>
                        Pisos e objetos são salvos por cena. O backup inclui as imagens importadas.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {painelAtivo !== 'construcao' && painelAtivo !== 'miniaturas' && (
                <div className="m3d-note">
                  <strong>MESA 2D E 3D · DADOS COMPARTILHADOS</strong>
                  <p>
                    Campanha, fichas, inventários, turnos, diário e rolagens compartilham os dados
                    da Mesa 2D. O editor utiliza a câmera livre do mestre. A iluminação, as
                    barreiras e o clima visual são configurados por cena.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      {modalPersonagem && (
        <div
          className="m3d-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalPersonagem(false);
          }}
        >
          <div
            className="m3d-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="m3d-modal-titulo"
          >
            <div className="m3d-modal-header">
              <div>
                <small>PORTAL DO MESTRE</small>
                <h2 id="m3d-modal-titulo">Adicionar personagem</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalPersonagem(false)}
                aria-label="Fechar janela"
              >
                ×
              </button>
            </div>
            <label>
              Nome
              <input
                autoFocus
                maxLength={60}
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') criarPersonagem();
                }}
                placeholder="Nome do personagem"
              />
            </label>
            <label>
              Tipo
              <select
                value={tipoNovoPersonagem}
                onChange={(e) =>
                  setTipoNovoPersonagem(e.target.value as 'jogador' | 'npc' | 'inimigo')
                }
              >
                <option value="jogador">Jogador</option>
                <option value="npc">NPC</option>
                <option value="inimigo">Inimigo</option>
              </select>
            </label>
            <p>
              O personagem será criado nesta campanha. Seus atributos poderão ser editados no painel
              de combate.
            </p>
            <div className="m3d-modal-actions">
              <button type="button" onClick={() => setModalPersonagem(false)}>
                Cancelar
              </button>
              <button type="button" className="botao-primario" onClick={criarPersonagem}>
                Adicionar personagem
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="m3d-footer">
        <span>✧ Mesa do Mestre · visualizações 2D e 3D com dados compartilhados</span>
        <span>Visão de Mesa · Terceira Pessoa · Editor de cenário</span>
      </footer>
    </main>
  );
}
