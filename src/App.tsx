import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  carregarArquivo as carregarArquivoBase,
  carregarArquivos as carregarArquivosBase,
  excluirArquivo as excluirArquivoBase,
  salvarArquivo as salvarArquivoBase,
} from './lib/storage';
import {
  atualizarCampanha,
  chaveArquivoCampanha,
  chaveEstadoCampanha,
  obterCampanha,
  registrarAcessoCampanha,
  resolverCampanhaId,
} from './hexatombe/campaignLibrary';
import {
  fichaCompativel,
  sistemaDaCampanha,
  nomeDoSistema,
  SISTEMA_IMPETO,
} from './hexatombe/sistemasRpg';
import { activateDiceCollection, getDiceCollection } from './hexatombe/diceCollections';
import {
  calcularPoligonoVisao,
  bloqueiaPassagem,
  pontoString,
  alterarTipoBarreira,
  NOMES_BARREIRA,
  barreiraBloqueiaMovimento,
  barreiraBloqueiaVisao,
  type BarreiraMapa,
} from './lib/lighting';
import { arrastarBarreira, type ParteBarreira } from './lib/barrierEditing';
import {
  acrescentarExploracaoFog,
  celulaFog,
  celulasVisiveisFog,
  caminhosFog,
  mapaEstadosFog,
  validarMemoriaFog,
  type MemoriaFog,
} from './lib/fogExploracao';
import { GRADE_PADRAO, encaixarNaGrade, normalizarGrade, type GradeMapa } from './lib/mapGrid';
import { duplicarDadosDaCena } from './lib/cloneScene';
import {
  alterarParticipanteIniciativa,
  normalizarParticipantesIniciativa,
  ordenarParticipantesIniciativa,
  turnoAposRetirada,
} from './lib/iniciativaParticipantes';
import { atualizarPontosInteresse } from './lib/pontosInteresse';
import { normalizarDesenhos, normalizarMarcadores, type TracoDesenho } from './lib/anotacoesMesa';
import { interpretarPercentualDecimal, formatarPercentualDecimal } from './lib/numeroDecimalPt';
import {
  extrairEdicaoCena,
  aplicarEdicaoCena,
  registrarEdicao,
  passoEdicao,
} from './lib/historicoEdicaoMesa';
import { carregarCenario3D, salvarCenario3D } from './mesa3d/editorCena3D';
import { percentualParaChao3D, posicaoPermitidaNaMesa3D } from './mesa3d/mesaLivre3D';
import { bloqueiaMovimentoCompartilhado3D } from './mesa3d/mapaCompartilhado3D';
import { CLIMA_PADRAO, normalizarClima, TIPOS_CLIMA, type ConfigClima } from './lib/weather';
import WeatherLayer from './WeatherLayer';
import { usePausaClimaLocal } from './lib/pausaClimaLocal';
import { FundoCena2D, IluminacaoCena2D, CorpoTokenCena2D } from './lib/CenaVisual2D';
import {
  aplicarPresetIluminacao,
  moverCena,
  normalizarOpacidadeNevoaMestre,
  OPACIDADE_NEVOA_MESTRE_PADRAO,
  PRESETS_ILUMINACAO,
} from './lib/sceneRefinements';
import {
  dimensoesToken3D,
  TAMANHO_TOKEN_3D_MIN,
  TAMANHO_TOKEN_3D_MAX,
} from './lib/dimensoesToken3D';
import { zoomDaMesa2DNoCursor } from './lib/zoomMesa2D';
import { dimensoesPalco2D } from './lib/dimensoesPalco2D';
import {
  TOKEN_ORIGINAL,
  chaveImagemSkin,
  limparSkinNoToken,
  nomeSkinPadrao,
  otimizarImagemSkin,
  removerSkinUnidade,
  skinAtiva,
  skinsValidas,
  validarImagemSkin,
  tokenIdleAtivo,
  parametrosIdleAtivos,
  velocidadeIdle,
  type TokenSkin,
} from './lib/tokenSkins';
import BibliotecaTokens from './lib/PainelBibliotecaTokens';
import { copiarTokenDaFicha } from './lib/bibliotecaTokens';
import {
  copiarTokenNaCena,
  deslocamentoParaCentralizarToken,
  tokenPassaFiltro,
  type TipoFiltroToken,
} from './lib/tokenTools';
import { tokenOcultoParaJogador } from './lib/visibilidadeTokensMestre';
import EditorEnquadramento from './EditorEnquadramento';
import TokenIdle from './lib/TokenIdle';
import { decodificarGifIdle } from './lib/tokenIdleGif.mjs';
import './lib/tokenIdle.css';
import {
  enquadramentoTokenAtivo,
  normalizarEnquadramento,
  type EnquadramentoImagem,
} from './lib/enquadramentoToken';
import ImagemRetrato, {
  normalizarAjusteRetrato,
  type AjusteRetrato,
} from './lib/retratoResponsivo';
import EditorRetrato from './EditorRetrato';
import {
  aparenciaTokenAtiva,
  corFundoToken,
  normalizarAparenciaToken,
  type AparenciaToken,
} from './lib/aparenciaToken';
import './App.css';
import FaixasEfeitos from './hexatombe/FaixasEfeitos';
import HudEfeitosMesa from './hexatombe/HudEfeitosMesa';
import ChatMesa from './hexatombe/ChatMesaPainel';
import MultiplayerMestre from './multiplayer/MultiplayerMestre';
import PublicadorMesa from './multiplayer/PublicadorMesa';
import MascaraVisaoCanvas from './lib/MascaraVisaoCanvas';
import { publicarRolagemMestre } from './multiplayer/publicarRolagemMestre';
import { publicarVideoRolagemMestre } from './multiplayer/publicarVideoRolagemMestre';
import { iniciarDadosAoVivo, encerrarDadosAoVivo } from './multiplayer/dadosAoVivo';
import { chaveMestre, lerCredencial } from './multiplayer/api';
import { incorporarRolagensMultiplayer } from './multiplayer/historicoCampanha.mjs';
import type { RolagemCompartilhada, PedidoItemCompartilhado } from './multiplayer/api';
import { alterarMesaCompartilhada } from './mesa3d/administracaoMesa3D';
import DiarioMestreMultiplayer from './multiplayer/DiarioMestreMultiplayer';
import {
  normalizarPaginasDiario,
  aplicarOperacaoDiario,
  type PaginaDiario,
  type OperacaoDiario,
} from './hexatombe/registrosDiario';
import { publicarItemDoDiario } from './hexatombe/itemDoDiario';
import {
  type EfeitoCombate,
  type TipoEfeitoCombate,
  ROTULOS_EFEITO,
} from './hexatombe/efeitosCombate';
import './fichaAbas.css';
import './mesa3d/mesaEspelhada.css';
import type { ModoCameraCinematica } from './mesa3d/cameraCinematica';
import './menuDireita.css';
import { PERIODOS_DIA_3D, AMBIENTES_3D, type PeriodoDia3D } from './mesa3d/ambientes3D';
import { periodoAtualCena3D, salvarPeriodoCena3D } from './mesa3d/controleAtmosferaCena3D';
import MusicaMesa from './MusicaMesa';
import Dados3D from './Dados3D';
import EditorDados from './EditorDados';
import {
  listarFichas,
  buscarFicha,
  salvarOuAtualizarFicha,
  papelDaFicha,
  ROTULOS_PAPEL,
  type FichaRegistro,
  type FichaDados,
  type PapelFicha,
} from './hexatombe/fichasLibrary';
import AcoesDaFicha from './hexatombe/AcoesDaFicha';
import ConsultaPersonagemImpeto, {
  dadosConsultaMestre,
} from './hexatombe/ConsultaPersonagemImpeto';
// O componente compartilhado também é usado na Mesa do Mestre; carregar seu tema explicitamente.
import './hexatombe/FichaImpetoDetalhes.css';
import TestesImpeto from './hexatombe/TestesImpeto';
import {
  criarEstadoTurno,
  iniciarRodada,
  iniciarAtivacao,
  caEfetiva,
  iniciativasChefe,
} from './impeto/combate';
import type { EstadoTurnoImpeto } from './impeto/combate';
import type { FichaPortalImpeto } from './impeto/contrato';
import MenuCombateImersivo from './hexatombe/MenuCombateImersivo';
import type { ProjecaoPersonagemTela } from './hexatombe/posicaoMenuCombate';
import { mostrarMenuNoTurno } from './hexatombe/menuCombateTurno';
import IconeDaAcao from './hexatombe/IconeDaAcao';
import { normalizarIconeAcao } from './hexatombe/iconesAcao';
import './hexatombe/AcoesDaFicha.css';
import './impeto/portalA01.css';
import InventarioMesa from './hexatombe/InventarioMesa';
import {
  adicionarItemInventario,
  analisarValorItem,
  aplicarDanoComEscudo,
  concederEscudo,
  consumirItem,
  transferirItemInventario,
  type ItemInventario,
  type ModeloItem,
} from './hexatombe/itensLibrary';

/** Cria um estado de turno novo sem alterar HP e EN que a mesa já possui. */
function prepararTurnoA01(
  id: string,
  u: { hp: number; mana: number; ca: number },
  ficha: FichaPortalImpeto,
): EstadoTurnoImpeto {
  const inicial = criarEstadoTurno(id, ficha);
  return {
    ...inicial,
    estatisticas: { ...inicial.estatisticas, hpAtual: u.hp, energiaAtual: u.mana, caBase: u.ca },
  };
}
function sincronizarRecursosTurno(
  s: EstadoTurnoImpeto,
  u: { hp: number; mana: number; ca: number },
): EstadoTurnoImpeto {
  return {
    ...s,
    estatisticas: { ...s.estatisticas, hpAtual: u.hp, energiaAtual: u.mana, caBase: u.ca },
  };
}

type TipoUnidade = 'jogador' | 'npc' | 'inimigo';
type Condicao = EfeitoCombate;
type Unidade = {
  id: string;
  nome: string;
  tipo: TipoUnidade;
  chefe?: boolean; // opcional: ativa limites C02 para chefes; inimigos comuns não são chefes
  elemento: string;
  hp: number;
  hpMax: number;
  escudo?: number; // Escudo temporário do Ímpeto, separado de HP/CA.
  mana: number;
  manaMax: number;
  ca: number;
  bonusCaTemporario?: number;
  penalidadeCaTemporaria?: number;
  turnoImpeto?: EstadoTurnoImpeto; // estado por personagem e combate, salvo na campanha
  iniciativa: number;
  condicoes: Condicao[];
  itens?: ItemInventario[]; // Inventário desta unidade, persistente na campanha.
  cor: string;
  x: number;
  y: number;
  temPdf: boolean;
  fichaId?: string; // vínculo opcional com a biblioteca de fichas
  temRetrato?: boolean;
  temToken?: boolean;
  tokenIdleGif?: boolean; // Animação idle do token original (PNG/JPG/WebP continuam estáticos).
  tokenIdlePausado?: boolean;
  tokenIdleVelocidade?: number;
  skins?: TokenSkin[]; // Skins extras: imagens armazenadas no IndexedDB da campanha.
  skinPadraoId?: string; // Skin que novas cenas utilizam por padrão.
  retratoEnquadramento?: AjusteRetrato; // Ajuste do retrato na mesa, independente da biblioteca.
  tokenEnquadramento?: EnquadramentoImagem; // Ajuste da arte original no círculo 2D.
  tokenAparencia?: AparenciaToken; // Borda e fundo do token original, sincronizados em 2D/3D.
};
type PontoMapa = { x: number; y: number };
type MarcaNevoa = { id: string; acao: 'revelar' | 'ocultar'; pontos: PontoMapa[]; raio: number };
type TokenCena = PontoMapa & {
  tamanho: number;
  largura3D?: number;
  altura3D?: number;
  rotacao: number;
  oculto: boolean;
  travado?: boolean;
  ocultarNome?: boolean;
  espelhadoX?: boolean;
  skinId?: string;
  visao?: number;
  emiteLuz?: boolean;
  alcanceLuz?: number;
  corLuz?: string;
};
type MarcadorCena = PontoMapa & { id: string; texto: string };
type FonteLuz = PontoMapa & {
  id: string;
  nome: string;
  alcance: number;
  cor: string;
  ativa: boolean;
};
type IluminacaoCena = { ativa: boolean; ambiente: number; colisao: boolean };
type Cena = {
  id: string;
  nome: string;
  temMapa: boolean;
  camadas: {
    fundo: boolean;
    tokens: boolean;
    marcadores: boolean;
    jogadores: boolean;
    npcs: boolean;
    inimigos: boolean;
    objetos: boolean;
  };
  visibilidade: 'total' | 'nevoa' | 'visao' | 'nevoa_visao' | 'exploracao';
  exploracaoPorToken?: MemoriaFog;
  participantesIniciativa?: string[]; // Somente estes IDs entram na iniciativa desta cena.
  largura: number; // 100 = largura original da tela; valores maiores criam mapas expansivos.
  altura: number;
  nevoa: MarcaNevoa[];
  opacidadeNevoaMestre?: number;
  tokens: Record<string, TokenCena>;
  marcadores: MarcadorCena[];
  desenhos?: TracoDesenho[];
  permitirDesenhoJogadores?: boolean; // Permissão por cena para convidados, mesas 2D e 3D.
  barreiras?: BarreiraMapa[];
  fontesLuz?: FonteLuz[];
  iluminacao?: IluminacaoCena;
  grade?: GradeMapa;
  clima?: ConfigClima; // Efeito puramente visual, independente da névoa de exploração.
};
type FerramentaMapa =
  'mover' | 'revelar' | 'ocultar' | 'marcador' | 'desenhar' | 'parede' | 'porta' | 'luz';
type VisibilidadeRolagem = 'publica' | 'mestre';
type Registro = {
  id: string;
  hora: string;
  texto: string;
  tipo: 'dado' | 'evento' | 'sistema';
  visibilidade?: VisibilidadeRolagem;
  iconeAcao?: string;
};
type ResultadoDados = {
  total: number;
  detalhes: string;
  faces: number;
  valores: number[];
  modificador: number;
};
type UsoItemPendente = { unidadeId: string; itemId: string };
type CameraDestaque = {
  personagemId: string;
  modo: ModoCameraCinematica;
  cenaId: string;
};
type ResultadoVisual = ResultadoDados & {
  id: string;
  formula: string;
  autor: string;
  visibilidade: VisibilidadeRolagem;
  pendente: boolean;
  iniciativaId?: string;
  usoItem?: UsoItemPendente;
  iconeAcao?: string;
};
type Campanha = {
  titulo: string;
  cena: string;
  diario: string; // campo legado: preservado para backups antigos
  paginasDiario: PaginaDiario[];
  unidades: Unidade[];
  combateAtivo: boolean;
  turnoId: string | null;
  rodada: number;
  registros: Registro[];
  temMapa: boolean; // Compatibilidade com o salvamento v1
  cenas: Cena[];
  cenaAtivaId: string;
};
type ChaveJanela =
  | 'chat'
  | 'clima'
  | 'cenas'
  | 'iniciativa'
  | 'recursos'
  | 'inventario'
  | 'diario'
  | 'personagens'
  | 'historico'
  | 'pdf'
  | 'iluminacao'
  | 'musica'
  | 'fichas';
type JanelaEstado = {
  aberta: boolean;
  minimizada: boolean;
  x: number;
  y: number;
  largura: number;
  z: number;
};
type Janelas = Record<ChaveJanela, JanelaEstado>;
// Cada página /mesa/?campanha=ID monta uma instância isolada da campanha.
// A mesa antiga mantém suas chaves originais e todos os seus anexos.
const CAMPAIGN_ID = resolverCampanhaId(new URLSearchParams(window.location.search).get('campanha'));
/** A MESMA interface (e estado) de RPG serve as duas visualizações. */
const MODO_3D = window.location.pathname.startsWith('/mesa3d/');
const WINDOWS_KEY =
  CAMPAIGN_ID === 'principal'
    ? 'hexatombe-mesa-janelas-v2'
    : `hexatombe-mesa-janelas-v2:${CAMPAIGN_ID}`;
const carregarArquivo = (chave: string) =>
  carregarArquivoBase(chaveArquivoCampanha(CAMPAIGN_ID, chave));
const carregarArquivos = (chaves: readonly string[]) =>
  carregarArquivosBase(chaves.map((chave) => chaveArquivoCampanha(CAMPAIGN_ID, chave)));
const salvarArquivo = (chave: string, arquivo: Blob) =>
  salvarArquivoBase(chaveArquivoCampanha(CAMPAIGN_ID, chave), arquivo);
const excluirArquivo = (chave: string) =>
  excluirArquivoBase(chaveArquivoCampanha(CAMPAIGN_ID, chave));
function janelasIniciais(carregarSalvo = true): Janelas {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const right = Math.max(185, w - 370);
  // A ficha de combate abre compacta, deixando o mapa livre (v1.3.40.21).
  const larguraFichaPadrao = Math.min(366, Math.max(280, w - 24));
  const xFichaPadrao = Math.max(12, Math.min(228, w - larguraFichaPadrao - 16));
  const defaults: Janelas = {
    chat: {
      aberta: false,
      minimizada: false,
      x: Math.min(270, Math.max(90, w - 470)),
      y: 155,
      largura: 385,
      z: 56,
    },
    cenas: { aberta: true, minimizada: false, x: right, y: 87, largura: 315, z: 42 },
    clima: { aberta: false, minimizada: false, x: right, y: 200, largura: 332, z: 53 },
    iniciativa: { aberta: false, minimizada: false, x: right, y: 350, largura: 324, z: 43 },
    recursos: {
      aberta: false,
      minimizada: false,
      x: xFichaPadrao,
      y: 78,
      largura: larguraFichaPadrao,
      z: 44,
    },
    inventario: {
      aberta: false,
      minimizada: false,
      x: Math.max(145, w - 630),
      y: 160,
      largura: 400,
      z: 52,
    },
    diario: {
      aberta: false,
      minimizada: false,
      x: Math.max(12, Math.min(155, w - 395)),
      y: 105,
      largura: Math.min(374, Math.max(320, w - 32)),
      z: 45,
    },
    personagens: { aberta: false, minimizada: false, x: 166, y: 175, largura: 372, z: 46 },
    historico: { aberta: false, minimizada: false, x: right, y: 255, largura: 340, z: 47 },
    pdf: {
      aberta: false,
      minimizada: false,
      x: Math.max(135, Math.round(w / 2 - 365)),
      y: 74,
      largura: 730,
      z: 48,
    },
    iluminacao: { aberta: false, minimizada: false, x: right, y: 175, largura: 366, z: 49 },
    musica: { aberta: false, minimizada: false, x: right, y: 170, largura: 358, z: 50 },
    fichas: {
      aberta: false,
      minimizada: false,
      x: Math.max(90, w - 710),
      y: 133,
      largura: 500,
      z: 51,
    },
  };
  try {
    const saved = (
      carregarSalvo ? JSON.parse(localStorage.getItem(WINDOWS_KEY) || '{}') : {}
    ) as Partial<Janelas>;
    for (const key of Object.keys(defaults) as ChaveJanela[]) {
      const item = saved[key];
      if (item && Number.isFinite(item.x) && Number.isFinite(item.y)) {
        // v1.3.40.21: migrar a ficha panorâmica antiga para o tamanho compacto
        // aprovado; as demais janelas e fichas já estreitas não são alteradas.
        const fichaPanoramicaAntiga = key === 'recursos' && (Number(item.largura) || 0) >= 600;
        const largura = fichaPanoramicaAntiga
          ? larguraFichaPadrao
          : Number(item.largura) || defaults[key].largura;
        defaults[key] = {
          ...defaults[key],
          ...item,
          largura,
          x: fichaPanoramicaAntiga
            ? xFichaPadrao
            : limite(item.x, 0, Math.max(12, w - largura - 16)),
          y: fichaPanoramicaAntiga
            ? defaults[key].y
            : limite(item.y, 0, Math.max(80, window.innerHeight - 70)),
          z: Number.isFinite(item.z) ? item.z : defaults[key].z,
        };
      }
    }
  } catch {
    /* layout padrão */
  }
  return defaults;
}
function JanelaFlutuante({
  titulo,
  icone,
  estado,
  onMover,
  onTrazerFrente,
  onMinimizar,
  onFechar,
  children,
  classe = '',
  manterMontado = false,
}: {
  titulo: string;
  icone: string;
  estado: JanelaEstado;
  onMover: (x: number, y: number) => void;
  onTrazerFrente: () => void;
  onMinimizar: () => void;
  onFechar: () => void;
  children: ReactNode;
  classe?: string;
  manterMontado?: boolean;
}) {
  const drag = useRef<{
    pointerId: number;
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
  } | null>(null);
  if (!estado.aberta && !manterMontado) return null;
  function down(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = {
      pointerId: e.pointerId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: estado.x,
      y: estado.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    onTrazerFrente();
    e.preventDefault();
  }
  function move(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    onMover(
      limite(d.x + e.clientX - d.mouseX, 0, Math.max(50, window.innerWidth - 92)),
      limite(d.y + e.clientY - d.mouseY, 0, Math.max(60, window.innerHeight - 70)),
    );
  }
  function up() {
    drag.current = null;
  }
  return (
    <section
      className={`janela-flutuante ${classe} ${estado.minimizada ? 'minimizada' : ''}`}
      style={{
        left: estado.x,
        top: estado.y,
        width: estado.largura,
        zIndex: estado.z,
        display: estado.aberta ? undefined : 'none',
      }}
      onPointerDown={onTrazerFrente}
      aria-label={titulo}
    >
      <div
        className="janela-barra"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className="janela-icone" aria-hidden="true">
          {icone}
        </span>
        <strong>{titulo}</strong>
        <span className="janela-barra-ajuda">ARRASTE PARA MOVER</span>
        <button
          type="button"
          title={estado.minimizada ? 'Restaurar' : 'Minimizar'}
          aria-label={estado.minimizada ? 'Restaurar janela' : 'Minimizar janela'}
          onClick={onMinimizar}
        >
          ─
        </button>
        <button type="button" title="Fechar" aria-label="Fechar janela" onClick={onFechar}>
          ×
        </button>
      </div>
      {(!estado.minimizada || manterMontado) && (
        <div
          className="janela-conteudo"
          style={estado.minimizada ? { display: 'none' } : undefined}
        >
          {children}
        </div>
      )}
    </section>
  );
}

const STORAGE_KEY = chaveEstadoCampanha(CAMPAIGN_ID); // 'principal' preserva a chave legada.
function criarCena(nome: string, unidades: Unidade[], antiga = false): Cena {
  return {
    id: antiga ? 'cena-original' : id(),
    nome,
    temMapa: antiga,
    camadas: {
      fundo: true,
      tokens: true,
      marcadores: true,
      jogadores: true,
      npcs: true,
      inimigos: true,
      objetos: true,
    },
    visibilidade: 'total',
    largura: 100,
    altura: 100,
    nevoa: [],
    exploracaoPorToken: {},
    participantesIniciativa: [],
    opacidadeNevoaMestre: OPACIDADE_NEVOA_MESTRE_PADRAO,
    marcadores: [],
    desenhos: [],
    permitirDesenhoJogadores: true,
    barreiras: [],
    fontesLuz: [],
    iluminacao: { ativa: false, ambiente: 40, colisao: false },
    grade: { ...GRADE_PADRAO },
    clima: { ...CLIMA_PADRAO },
    tokens: Object.fromEntries(
      unidades.map((u) => [
        u.id,
        {
          x: u.x,
          y: u.y,
          tamanho: 70,
          rotacao: 0,
          oculto: false,
          visao: 18,
        },
      ]),
    ),
  };
}
function normalizarCena(c: Cena): Cena {
  return {
    ...c,
    camadas: {
      fundo: c.camadas?.fundo ?? true,
      tokens: c.camadas?.tokens ?? true,
      marcadores: c.camadas?.marcadores ?? true,
      jogadores: c.camadas?.jogadores ?? true,
      npcs: c.camadas?.npcs ?? true,
      inimigos: c.camadas?.inimigos ?? true,
      objetos: c.camadas?.objetos ?? true,
    },
    visibilidade: ['total', 'nevoa', 'visao', 'nevoa_visao', 'exploracao'].includes(c.visibilidade)
      ? c.visibilidade
      : 'total',
    largura: Number.isFinite(c.largura) ? limite(c.largura, 100, 500) : 100,
    altura: Number.isFinite(c.altura) ? limite(c.altura, 100, 500) : 100,
    nevoa: Array.isArray(c.nevoa) ? c.nevoa : [],
    exploracaoPorToken: validarMemoriaFog(c.exploracaoPorToken),
    participantesIniciativa: normalizarParticipantesIniciativa(c.participantesIniciativa),
    opacidadeNevoaMestre: normalizarOpacidadeNevoaMestre(c.opacidadeNevoaMestre),
    marcadores: normalizarMarcadores(c.marcadores),
    desenhos: normalizarDesenhos(c.desenhos),
    permitirDesenhoJogadores: c.permitirDesenhoJogadores !== false,
    barreiras: Array.isArray(c.barreiras)
      ? c.barreiras
          .filter(
            (b) =>
              b &&
              Number.isFinite(b.x1) &&
              Number.isFinite(b.y1) &&
              Number.isFinite(b.x2) &&
              Number.isFinite(b.y2),
          )
          .map((b) => ({
            ...b,
            tipo: (['parede', 'porta', 'janela', 'mureta'] as string[]).includes(b.tipo)
              ? b.tipo
              : 'parede',
            aberta: Boolean(b.aberta),
            trancada: Boolean(b.trancada),
            bloqueiaMovimento:
              typeof b.bloqueiaMovimento === 'boolean' ? b.bloqueiaMovimento : undefined,
            bloqueiaVisao: typeof b.bloqueiaVisao === 'boolean' ? b.bloqueiaVisao : undefined,
          }))
      : [],
    fontesLuz: Array.isArray(c.fontesLuz)
      ? c.fontesLuz
          .filter((l) => l && Number.isFinite(l.x) && Number.isFinite(l.y))
          .map((l) => ({
            ...l,
            alcance: limite(Number(l.alcance) || 15, 2, 70),
            cor: l.cor || '#ffc675',
            ativa: l.ativa !== false,
          }))
      : [],
    iluminacao: {
      ativa: Boolean(c.iluminacao?.ativa),
      ambiente: limite(Number(c.iluminacao?.ambiente ?? 40), 0, 100),
      colisao: Boolean(c.iluminacao?.colisao),
    },
    grade: normalizarGrade(c.grade),
    clima: normalizarClima(c.clima),
    tokens: Object.fromEntries(
      Object.entries(c.tokens || {}).map(([key, value]) => [
        key,
        {
          ...value,
          ...dimensoesToken3D(value),
          visao: Number.isFinite(value.visao) ? limite(value.visao!, 2, 50) : 18,
        },
      ]),
    ),
  };
}
function chaveMapa(idCena: string) {
  return idCena === 'cena-original' ? 'mapa' : `mapa:${idCena}`;
}
const NOME_TIPOS: Record<TipoUnidade, string> = {
  jogador: 'Jogador',
  npc: 'NPC',
  inimigo: 'Inimigo',
};
const CORES: Record<TipoUnidade, string> = {
  jogador: '#6ca9ca',
  npc: '#cbb16f',
  inimigo: '#c56b68',
};
const CONDICOES = [
  'Queimadura',
  'Imobilizado',
  'Proteção',
  'Vulnerável',
  'Atordoado',
  'Sangramento',
  'Outra',
];
const id = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function CampoPercentualPt({
  valor,
  rotulo,
  aoConfirmar,
}: {
  valor: number;
  rotulo: string;
  aoConfirmar: (valor: number) => void;
}) {
  const [texto, setTexto] = useState(() => formatarPercentualDecimal(valor));
  useEffect(() => setTexto(formatarPercentualDecimal(valor)), [valor]);
  const confirmar = () => {
    const valido = interpretarPercentualDecimal(texto);
    if (valido === null) {
      setTexto(formatarPercentualDecimal(valor));
      return;
    }
    aoConfirmar(valido);
    setTexto(formatarPercentualDecimal(valido));
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={rotulo}
      title="Aceita decimais com vírgula ou ponto"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const limite = (n: number, minimo: number, maximo: number) => Math.max(minimo, Math.min(maximo, n));

function exemplo(): Campanha {
  const unidades: Unidade[] = [
    {
      id: 'kael',
      nome: 'Kael',
      tipo: 'jogador',
      elemento: 'Fogo · Lutador',
      hp: 135,
      hpMax: 135,
      mana: 130,
      manaMax: 130,
      ca: 10,
      iniciativa: 18,
      condicoes: [],
      cor: '#e48b60',
      x: 35,
      y: 51,
      temPdf: false,
    },
    {
      id: 'ashara',
      nome: 'Ashara',
      tipo: 'jogador',
      elemento: 'Água · Conjurador',
      hp: 130,
      hpMax: 130,
      mana: 180,
      manaMax: 180,
      ca: 10,
      iniciativa: 14,
      condicoes: [],
      cor: '#6baac9',
      x: 46,
      y: 60,
      temPdf: false,
    },
    {
      id: 'guardiao',
      nome: 'Guardião da Bruma',
      tipo: 'inimigo',
      elemento: 'Espírito',
      hp: 80,
      hpMax: 80,
      mana: 50,
      manaMax: 50,
      ca: 11,
      iniciativa: 9,
      condicoes: [],
      cor: '#ca6972',
      x: 70,
      y: 33,
      temPdf: false,
    },
  ];
  return {
    titulo: 'A Queda dos Espíritos',
    cena: 'O Santuário Esquecido',
    diario:
      'Sessão 01 — Preparação\n\nA névoa cobre o vale. Um antigo santuário ressurge entre as árvores.\n\n• O que os jogadores veem: lanternas apagadas e inscrições antigas.\n• Segredo do mestre: um guardião protege o local.',
    paginasDiario: normalizarPaginasDiario(
      undefined,
      'Sessão 01 — Preparação\n\nA névoa cobre o vale. Um antigo santuário ressurge entre as árvores.\n\n• O que os jogadores veem: lanternas apagadas e inscrições antigas.\n• Segredo do mestre: um guardião protege o local.',
    ),
    unidades,
    cenas: [{ ...criarCena('O Santuário Esquecido', unidades, false), id: 'cena-original' }],
    cenaAtivaId: 'cena-original',
    combateAtivo: false,
    turnoId: null,
    rodada: 1,
    registros: [
      {
        id: id(),
        hora: agora(),
        texto: 'Mesa de demonstração carregada. Todos os dados são locais.',
        tipo: 'sistema',
      },
    ],
    temMapa: false,
  };
}
function campanhaNova(nome: string): Campanha {
  const cena = criarCena('Cena 1', []);
  return {
    titulo: nome,
    cena: cena.nome,
    diario: 'Sessão 01 — Preparação\n\nEscreva aqui as primeiras anotações da aventura.',
    paginasDiario: normalizarPaginasDiario(
      undefined,
      'Sessão 01 — Preparação\n\nEscreva aqui as primeiras anotações da aventura.',
    ),
    unidades: [],
    combateAtivo: false,
    turnoId: null,
    rodada: 1,
    registros: [],
    temMapa: false,
    cenas: [cena],
    cenaAtivaId: cena.id,
  };
}
function estadoInicial(): Campanha {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Campanha;
      if (Array.isArray(value.unidades) && Array.isArray(value.registros)) {
        // Migração silenciosa da versão anterior: PDFs/retratos/mapa continuam no IndexedDB.
        const cenas =
          Array.isArray(value.cenas) && value.cenas.length
            ? value.cenas.map(normalizarCena)
            : [criarCena(value.cena || 'Cena original', value.unidades, Boolean(value.temMapa))];
        if (value.combateAtivo) {
          const ativa = cenas.find((c) => c.id === value.cenaAtivaId) ?? cenas[0];
          const antiga = (value.cenas || []).find((c) => c.id === ativa.id);
          if (!Array.isArray(antiga?.participantesIniciativa))
            ativa.participantesIniciativa = value.unidades.map((u) => u.id); // migração de combate antigo em andamento
        }
        return {
          ...value,
          paginasDiario: normalizarPaginasDiario(value.paginasDiario, value.diario),
          titulo: obterCampanha(CAMPAIGN_ID)?.titulo || value.titulo,
          cenas,
          cenaAtivaId: cenas.some((c) => c.id === value.cenaAtivaId)
            ? value.cenaAtivaId
            : cenas[0].id,
        };
      }
    }
  } catch {
    /* Fallback seguro */
  }
  return CAMPAIGN_ID === 'principal'
    ? exemplo()
    : campanhaNova(obterCampanha(CAMPAIGN_ID)?.titulo || 'Nova campanha');
}
// v0401-dicebox-integracao: a rolagem so recebe valor apos a animacao do Dice Box.
function rolar(formula: string): ResultadoDados {
  const normalizada = formula.replace(/\s+/g, '').toLowerCase();
  const match = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/.exec(normalizada);
  if (!match) throw new Error('Use uma expressao como 1d20, 2d6+6 ou 1d8-2.');
  const quantia = Number(match[1]);
  const faces = Number(match[2]);
  const modificador = Number(match[3] || '0');
  if (![4, 6, 8, 10, 12, 20, 100].includes(faces))
    throw new Error('Dados 3D disponiveis: d4, d6, d8, d10, d12, d20 e d100.');
  if (quantia < 1 || quantia > 8) throw new Error('Limite temporario: de 1 a 8 dados por rolagem.');
  return { total: 0, detalhes: 'Rolando...', faces, valores: Array(quantia).fill(0), modificador };
}

function App() {
  const metaFichasCampanha = obterCampanha(CAMPAIGN_ID);
  // Ímpeto é o único sistema com recursos de combate definidos até aqui.
  // A campanha principal legada continua sendo reconhecida como Ímpeto.
  const usaRegrasImpeto =
    sistemaDaCampanha(metaFichasCampanha ?? { id: CAMPAIGN_ID }) === SISTEMA_IMPETO;
  useEffect(() => {
    try {
      registrarAcessoCampanha(CAMPAIGN_ID);
    } catch {
      /* Não interrompe a mesa */
    }
    // Conjunto favorito é aplicado ao entrar; a biblioteca global continua a mesma.
    const favorito = obterCampanha(CAMPAIGN_ID)?.colecaoId;
    if (favorito)
      void getDiceCollection(favorito)
        .then((p) => {
          if (p) activateDiceCollection(p);
        })
        .catch(() => undefined);
  }, []);
  const [campanha, setCampanha] = useState<Campanha>(estadoInicial);
  const campanhaMovimentoRef = useRef(campanha);
  campanhaMovimentoRef.current = campanha;
  const [janelas, setJanelas] = useState<Janelas>(janelasIniciais);
  // Migração única: o antigo Diário tinha 740px. A nova biblioteca abre compacta,
  // sem impedir que o mestre a redimensione manualmente depois.
  useEffect(() => {
    try {
      const chave = `portal-diario-biblioteca-layout-v13445:${CAMPAIGN_ID}`;
      if (localStorage.getItem(chave) === '1') return;
      localStorage.setItem(chave, '1');
      setJanelas((j) =>
        j.diario.largura > 540 ? { ...j, diario: { ...j.diario, largura: 374 } } : j,
      );
    } catch {
      /* Sem persistência visual, sem interromper a mesa. */
    }
  }, []);
  const [chatNaoLidas, setChatNaoLidas] = useState(0);
  // Organização visual local: não faz parte dos dados nem das regras da campanha.
  const [modoFoco, setModoFoco] = useState(false);
  const [menuMesa, setMenuMesa] = useState(false);
  // Organização visual exclusiva do 3D: recolher grupos não fecha nenhuma ferramenta.
  const [gruposDireita, setGruposDireita] = useState({ sessao: true, apoio: true, ambiente: true });
  const [guiaAtalhos, setGuiaAtalhos] = useState(false);
  const zCounter = useRef(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomMesa2DAtualRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  useEffect(() => {
    zoomMesa2DAtualRef.current = { zoom, pan };
  }, [zoom, pan]);
  const panRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [ferramentaMapa, setFerramentaMapa] = useState<FerramentaMapa>('mover');
  // A câmera não é um modo de construção: Visão de Mesa e Terceira Pessoa são modos independentes.
  const [cameraMesa3D, setCameraMesa3D] = useState<'mestre' | 'terceira'>('mestre');
  // Abertura tática local e independente da câmera de exploração.
  const [zoomTatico, setZoomTatico] = useState<number>(() => {
    try {
      const salvo = Number(localStorage.getItem('portal-mestre-zoom-tatico-v1'));
      return salvo >= 65 && salvo <= 200 ? salvo : 100;
    } catch {
      return 100;
    }
  });
  const [editor3DAberto, setEditor3DAberto] = useState(false);
  // Destaque apenas visual, restrito à sessão local. Não modifica a campanha.
  const [cameraDestaque, setCameraDestaque] = useState<CameraDestaque | null>(null);
  const cameraDestaqueRef = useRef<CameraDestaque | null>(null);
  const [posicaoPersonagemTela, setPosicaoPersonagemTela] = useState<ProjecaoPersonagemTela | null>(
    null,
  );
  const [periodoDiaCena3D, setPeriodoDiaCena3D] = useState<PeriodoDia3D>(() =>
    periodoAtualCena3D(CAMPAIGN_ID, campanha.cenaAtivaId),
  );
  const [barreiraRascunho, setBarreiraRascunho] = useState<{
    inicio: PontoMapa;
    fim: PontoMapa;
    tipo: 'parede' | 'porta';
  } | null>(null);
  const barreiraRef = useRef<{
    pointerId: number;
    inicio: PontoMapa;
    fim: PontoMapa;
    tipo: 'parede' | 'porta';
  } | null>(null);
  const [barreiraSelecionadaId, setBarreiraSelecionadaId] = useState<string | null>(null);
  // Seleção temporária local: token/barreira/luz. Não altera backup ou sessão do jogador.
  const [selecoesMapa, setSelecoesMapa] = useState<string[]>([]);
  const [marcadorSelecionadoId, setMarcadorSelecionadoId] = useState<string | null>(null);
  const [desenhoSelecionadoId, setDesenhoSelecionadoId] = useState<string | null>(null);
  const [luzSelecionadaId, setLuzSelecionadaId] = useState<string | null>(null);
  const [marcadorPrevia, setMarcadorPrevia] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [luzPrevia, setLuzPrevia] = useState<{ id: string; x: number; y: number } | null>(null);
  const arrastoMarcadorRef = useRef<{
    id: string;
    pointerId: number;
    inicioX: number;
    inicioY: number;
    movido: boolean;
    offset: { x: number; y: number };
    fim: { x: number; y: number };
  } | null>(null);
  const arrastoLuzRef = useRef<{
    id: string;
    pointerId: number;
    inicioX: number;
    inicioY: number;
    movido: boolean;
    offset: { x: number; y: number };
    fim: { x: number; y: number };
  } | null>(null);

  const alternarSelecaoMapa = (
    tipo: 'token' | 'barreira' | 'luz' | 'marcador' | 'desenho',
    id: string,
  ) => {
    const chave = `${tipo}:${id}`;
    setSelecoesMapa((atual) =>
      atual.includes(chave) ? atual.filter((x) => x !== chave) : [...atual, chave],
    );
  };
  const removerSelecaoMapa = () => {
    if (!selecoesMapa.length) return;
    const tokens = new Set(
      selecoesMapa.filter((x) => x.startsWith('token:')).map((x) => x.slice(6)),
    );
    const barreirasIds = new Set(
      selecoesMapa.filter((x) => x.startsWith('barreira:')).map((x) => x.slice(9)),
    );
    const luzesIds = new Set(
      selecoesMapa.filter((x) => x.startsWith('luz:')).map((x) => x.slice(4)),
    );
    const marcadoresIds = new Set(
      selecoesMapa.filter((x) => x.startsWith('marcador:')).map((x) => x.slice(9)),
    );
    const desenhosIds = new Set(
      selecoesMapa.filter((x) => x.startsWith('desenho:')).map((x) => x.slice(8)),
    );
    const bloqueados = [...tokens].filter((uid) => cenaAtual.tokens[uid]?.travado);
    bloqueados.forEach((uid) => tokens.delete(uid));
    const n =
      tokens.size + barreirasIds.size + luzesIds.size + marcadoresIds.size + desenhosIds.size;
    if (!n) {
      setAlerta('Nenhum item pode ser retirado. Desbloqueie os tokens primeiro.');
      return;
    }
    if (
      !window.confirm(
        `Remover ${n} item(ns) da cena atual?\n\n${tokens.size} token(s), ${barreirasIds.size} barreira(s), ${luzesIds.size} luz(es), ${marcadoresIds.size} marcação(ões) e ${desenhosIds.size} desenho(s).\n\nOs personagens e suas fichas NÃO serão excluídos.`,
      )
    )
      return;
    atualizarCena((c) => {
      const novosTokens = { ...c.tokens };
      tokens.forEach((id) => delete novosTokens[id]);
      return {
        ...c,
        tokens: novosTokens,
        barreiras: (c.barreiras ?? []).filter((b) => !barreirasIds.has(b.id)),
        fontesLuz: (c.fontesLuz ?? []).filter((l) => !luzesIds.has(l.id)),
        marcadores: (c.marcadores ?? []).filter((m) => !marcadoresIds.has(m.id)),
        desenhos: (c.desenhos ?? []).filter((d) => !desenhosIds.has(d.id)),
      };
    });
    if (tokenEmEdicaoId && tokens.has(tokenEmEdicaoId)) setTokenEmEdicaoId(null);
    if (barreiraSelecionadaId && barreirasIds.has(barreiraSelecionadaId))
      setBarreiraSelecionadaId(null);
    setSelecoesMapa([]);
    setMarcadorSelecionadoId(null);
    setDesenhoSelecionadoId(null);
    setLuzSelecionadaId(null);
    setAlerta(
      `${n} item(ns) retirado(s) da cena.${bloqueados.length ? ` ${bloqueados.length} token(s) bloqueado(s) preservado(s).` : ''}`,
    );
  };
  const [barreiraPrevia, setBarreiraPrevia] = useState<BarreiraMapa | null>(null);
  const arrastoBarreiraRef = useRef<{
    pointerId: number;
    inicio: PontoMapa;
    original: BarreiraMapa;
    parte: ParteBarreira;
  } | null>(null);
  useEffect(() => {
    setBarreiraSelecionadaId(null);
    setBarreiraPrevia(null);
    arrastoBarreiraRef.current = null;
    setSelecoesMapa([]);
    setMarcadorSelecionadoId(null);
    setDesenhoSelecionadoId(null);
    setLuzSelecionadaId(null);
    setLuzEdicaoId(null);
  }, [campanha.cenaAtivaId]);
  const [raioPincel, setRaioPincel] = useState(4);
  const [preverJogador, setPreverJogador] = useState(false);
  const [observadorVisaoId, setObservadorVisaoId] = useState<string | null>(null);
  const [exploracaoGrupo, setExploracaoGrupo] = useState(false);
  const [pausarClima, setPausarClima] = usePausaClimaLocal(); // Uma única pausa local em 2D/3D; não modifica a cena nem o backup.
  const desenhoRef = useRef<{ pointerId: number; idTraco: string; ultimo: PontoMapa } | null>(null);
  const tracoLivreRef = useRef<{ pointerId: number; pontos: PontoMapa[]; id: string } | null>(null);
  const [tracoLivrePreview, setTracoLivrePreview] = useState<TracoDesenho | null>(null);
  const [multiSelecionado3D, setMultiSelecionado3D] = useState(0);
  const [corDesenho, setCorDesenho] = useState('#ffce85');
  const [espessuraDesenho, setEspessuraDesenho] = useState(3);
  useEffect(() => {
    if (MODO_3D) {
      enviar3D('desenho-cor', corDesenho);
      enviar3D('desenho-espessura', espessuraDesenho);
    }
  }, [corDesenho, espessuraDesenho]);
  const [revisaoToken, setRevisaoToken] = useState(0);
  const [urlTokens, setUrlTokens] = useState<Record<string, string>>({});
  const [urlSkins, setUrlSkins] = useState<Record<string, string>>({});
  const [nomeNovaSkin, setNomeNovaSkin] = useState('');
  const [skinParaExcluir, setSkinParaExcluir] = useState<string | null>(null);
  const [mostrarBibliotecaIdles, setMostrarBibliotecaIdles] = useState(false);
  const [mostrarDicas, setMostrarDicas] = useState(true);
  const [urlRetratos, setUrlRetratos] = useState<Record<string, string>>({});
  const inputRetrato = useRef<HTMLInputElement>(null);
  const inputToken = useRef<HTMLInputElement>(null);
  const inputNovaSkin = useRef<HTMLInputElement>(null);
  const [rolagemDestacada, setRolagemDestacada] = useState<ResultadoVisual | null>(null);
  const [filaRolagens, setFilaRolagens] = useState<ResultadoVisual[]>([]);
  const [visibilidadeRolagem, setVisibilidadeRolagem] = useState<VisibilidadeRolagem>('publica');
  const [ajusteHp, setAjusteHp] = useState('');
  const [ajusteMana, setAjusteMana] = useState('');
  const [ajusteEscudo, setAjusteEscudo] = useState('');
  const [variacaoHp, setVariacaoHp] = useState('');
  const [variacaoMana, setVariacaoMana] = useState('');
  // Medidas reais do viewport e do arquivo; o palco conserva a proporção do mapa.
  const [viewport, setViewport] = useState({ largura: 1200, altura: 700 });
  const [tamanhoImagem, setTamanhoImagem] = useState<{ largura: number; altura: number } | null>(
    null,
  );

  const [selecionadoId, setSelecionadoId] = useState<string>('kael');
  const estadoVisual3DRef = useRef({ cena: campanha.cenaAtivaId, selecionado: 'kael' });
  // Seleção explícita no mapa: não confundir com personagem aberto no painel de recursos.
  const [tokenEmEdicaoId, setTokenEmEdicaoId] = useState<string | null>(null);
  // Controle explícito: o painel precisa abrir no clique e permanecer aberto ao editar os sliders.
  const [filtroTipoToken, setFiltroTipoToken] = useState<TipoFiltroToken>('todos');
  const [buscaCena, setBuscaCena] = useState('');
  const [buscaElenco, setBuscaElenco] = useState('');
  const [selecionadosElenco, setSelecionadosElenco] = useState<string[]>([]);
  const [elencoRecolhido, setElencoRecolhido] = useState<Record<TipoUnidade, boolean>>({
    jogador: false,
    npc: false,
    inimigo: false,
  });
  const normalizarBusca = (nome: string) =>
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const elencoFiltrado = campanha.unidades.filter((u) =>
    normalizarBusca(u.nome).includes(normalizarBusca(buscaElenco.trim())),
  );
  const idsElencoVisiveis = elencoFiltrado.map((u) => u.id);
  const alternarSelecaoElenco = (idUnidade: string) =>
    setSelecionadosElenco((ids) =>
      ids.includes(idUnidade) ? ids.filter((x) => x !== idUnidade) : [...ids, idUnidade],
    );
  const [duplicandoToken, setDuplicandoToken] = useState(false);
  const duplicandoTokenRef = useRef(false);
  const [formula, setFormula] = useState('1d20');
  const [erro, setErro] = useState('');
  const [modal, setModal] = useState<'unidade' | 'condicao' | 'marcador' | 'cena' | null>(null);
  const [nomeMarcador, setNomeMarcador] = useState('Ponto de interesse');
  const [marcadorPendente, setMarcadorPendente] = useState<
    (PontoMapa & { cenaId: string; editarId?: string }) | null
  >(null);
  const [coordenadasMarcadorTexto, setCoordenadasMarcadorTexto] = useState({ x: '', y: '' });
  const [luzEdicaoId, setLuzEdicaoId] = useState<string | null>(null);
  const [nomeNovaCena, setNomeNovaCena] = useState('');
  const [nomeNovo, setNomeNovo] = useState('');
  const [tipoNovo, setTipoNovo] = useState<TipoUnidade>('jogador');
  const [chefeNovo, setChefeNovo] = useState(false);
  const [hpNovo, setHpNovo] = useState(135);
  const [manaNovo, setManaNovo] = useState(130);
  const [caNovo, setCaNovo] = useState(10);
  const [condicaoNova, setCondicaoNova] = useState('Queimadura');
  const [tipoEfeitoNovo, setTipoEfeitoNovo] = useState<TipoEfeitoCombate>('condicao');
  const [origemEfeitoNova, setOrigemEfeitoNova] = useState('');
  const [condicaoCustom, setCondicaoCustom] = useState('');
  const [turnosNovos, setTurnosNovos] = useState(1);
  const [urlPdf, setUrlPdf] = useState<string | null>(null);
  const [urlMapa, setUrlMapa] = useState<string | null>(null);
  const [revisaoMapa, setRevisaoMapa] = useState(0);
  const [alerta, setAlerta] = useState('');
  const [fichas, setFichas] = useState<FichaRegistro[]>([]);
  const filaIconesFicha = useRef<Promise<void>>(Promise.resolve());
  const [abaFicha, setAbaFicha] = useState<
    'atributos' | 'habilidades' | 'personagem' | 'inventario' | 'token'
  >('atributos');
  const [abaPersonagem, setAbaPersonagem] = useState<'atributos' | 'pericias' | 'escolhas'>(
    'atributos',
  );
  const [buscaFicha, setBuscaFicha] = useState('');
  const [filtroPapelFicha, setFiltroPapelFicha] = useState<PapelFicha | 'todos'>('todos');
  const [mostrarTodasFichas, setMostrarTodasFichas] = useState(false);
  const [paginaFicha, setPaginaFicha] = useState(0);
  const retratosChave = campanha.unidades
    .map((u) => `${u.id}:${u.temRetrato ? '1' : '0'}`)
    .join('|');
  const tokensChave = campanha.unidades.map((u) => `${u.id}:${u.temToken ? '1' : '0'}`).join('|');
  const skinsChave = campanha.unidades
    .map(
      (u) =>
        `${u.id}:${skinsValidas(u)
          .map((s) => s.id)
          .join(',')}`,
    )
    .join('|');
  // A página do Criador compartilha a biblioteca IndexedDB na mesma origem.
  async function atualizarBibliotecaFichas() {
    try {
      setFichas(await listarFichas());
      setPaginaFicha(0);
    } catch {
      setAlerta(
        'A biblioteca de fichas não pôde ser acessada. Verifique as permissões do navegador.',
      );
    }
  }
  /** Ícones opcionais editados na ficha de combate, persistidos na biblioteca do Criador. */
  function atualizarIconeAcaoDaFicha(
    fichaId: string,
    idAcao: string,
    icone: string,
  ): Promise<void> {
    const seguro = normalizarIconeAcao(icone);
    // Serializa edições rápidas; lê a ficha mais nova para não sobrescrever outro ícone.
    const gravar = async () => {
      const registro = await buscarFicha(fichaId);
      if (!registro) {
        setAlerta('Vincule uma ficha do Criador para editar o ícone.');
        return;
      }
      const dados: FichaDados = {
        ...registro.dados,
        skills: (registro.dados.skills || []).map((h) => ({ ...h })),
        editorOriginal: registro.dados.editorOriginal
          ? {
              ...registro.dados.editorOriginal,
              ataqueBasico: { ...registro.dados.editorOriginal.ataqueBasico },
              passiva: { ...registro.dados.editorOriginal.passiva },
              habilidades: registro.dados.editorOriginal.habilidades.map((h) => ({ ...h })),
            }
          : undefined,
      };
      if (idAcao === 'ataque') {
        dados.basicIcon = seguro;
        if (dados.editorOriginal) dados.editorOriginal.ataqueBasico.icone = seguro;
      } else if (idAcao === 'passiva') {
        dados.passiveIcon = seguro;
        if (dados.editorOriginal) dados.editorOriginal.passiva.icone = seguro;
      } else if (/^skill-\d+$/.test(idAcao)) {
        const indice = Number(idAcao.slice(6));
        if (!dados.skills?.[indice]) return;
        dados.skills[indice].icon = seguro;
        if (dados.editorOriginal?.habilidades[indice])
          dados.editorOriginal.habilidades[indice].icone = seguro;
      } else return;
      const atualizado = await salvarOuAtualizarFicha(dados, fichaId);
      setFichas((anteriores) => anteriores.map((f) => (f.id === fichaId ? atualizado : f)));
    };
    const proxima = filaIconesFicha.current.then(gravar, gravar);
    filaIconesFicha.current = proxima.catch(() => {
      setAlerta(
        'Não foi possível salvar o ícone na biblioteca. Confira o armazenamento do navegador.',
      );
    });
    return filaIconesFicha.current;
  }
  useEffect(() => {
    const refresh = () => {
      void atualizarBibliotecaFichas();
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  // Não transportar valores digitados para outro personagem ao trocar a seleção.
  useEffect(() => {
    setVariacaoHp('');
    setVariacaoMana('');
    setAjusteHp('');
    setAjusteMana('');
    setAjusteEscudo('');
  }, [selecionadoId]);
  useEffect(() => {
    setSkinParaExcluir(null);
    setNomeNovaSkin('');
  }, [selecionadoId]);
  function abrirJanela(key: ChaveJanela) {
    setJanelas((old) => ({
      ...old,
      [key]: { ...old[key], aberta: true, minimizada: false, z: ++zCounter.current },
    }));
  }
  function alternarJanela(key: ChaveJanela) {
    if (janelas[key].aberta && !janelas[key].minimizada) {
      setJanelas((old) => ({ ...old, [key]: { ...old[key], aberta: false } }));
    } else abrirJanela(key);
  }
  function mudarJanela(key: ChaveJanela, changes: Partial<JanelaEstado>) {
    setJanelas((old) => ({ ...old, [key]: { ...old[key], ...changes } }));
  }
  function focarJanela(key: ChaveJanela) {
    setJanelas((old) => ({ ...old, [key]: { ...old[key], z: ++zCounter.current } }));
  }

  useEffect(() => {
    estadoVisual3DRef.current.cena = campanha.cenaAtivaId;
    if (MODO_3D) {
      setPeriodoDiaCena3D(periodoAtualCena3D(CAMPAIGN_ID, campanha.cenaAtivaId));
      enviar3D('cena', campanha.cenaAtivaId);
    }
  }, [campanha.cenaAtivaId]);
  useEffect(() => {
    estadoVisual3DRef.current.selecionado = selecionadoId;
    if (MODO_3D) enviar3D('selecionar', selecionadoId);
  }, [selecionadoId]);
  function alternarModoFoco() {
    setModoFoco((ativo) => !ativo);
    setMenuMesa(false);
    // Um pincel de névoa ou parede escondido não deve continuar ativo.
    setFerramentaMapa('mover');
    setTokenEmEdicaoId(null);
  }
  function restaurarLayoutJanelas() {
    setJanelas(janelasIniciais(false));
    zCounter.current = 60;
    setMenuMesa(false);
  }
  function fecharJanelasVisuais() {
    setJanelas(
      (old) =>
        Object.fromEntries(
          (Object.keys(old) as ChaveJanela[]).map((key) => [key, { ...old[key], aberta: false }]),
        ) as Janelas,
    );
    window.dispatchEvent(new Event('hexatombe-mesa-fechar-paineis'));
    setMenuMesa(false);
  }
  useEffect(() => {
    const atalhos = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat)
        return;
      const elemento = event.target;
      const editando =
        elemento instanceof HTMLElement &&
        (elemento.isContentEditable ||
          Boolean(elemento.closest('input, textarea, select, [contenteditable="true"]')));
      if (event.key === 'Escape') {
        if (modal) {
          setModal(null);
          event.preventDefault();
        } else if (guiaAtalhos) {
          setGuiaAtalhos(false);
          event.preventDefault();
        } else if (menuMesa) {
          setMenuMesa(false);
          event.preventDefault();
        } else if (modoFoco && !modal) {
          setModoFoco(false);
          event.preventDefault();
        }
        return;
      }
      if (editando || modal) return;
      if (event.key.toLowerCase() === 'f') {
        alternarModoFoco();
        event.preventDefault();
      } else if (event.key === '?') {
        setGuiaAtalhos((v) => !v);
        setMenuMesa(false);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', atalhos);
    return () => window.removeEventListener('keydown', atalhos);
  }, [guiaAtalhos, menuMesa, modoFoco, modal]);

  const inputPdf = useRef<HTMLInputElement>(null);
  const inputMapa = useRef<HTMLInputElement>(null);
  const duplicandoCenaRef = useRef(false);
  const mapaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const visualizador3DRef = useRef<HTMLIFrameElement>(null);
  const cameraMesa3DRef = useRef(cameraMesa3D);
  const visaoIndividual3DRef = useRef<string | null>(null);
  const zoomTaticoAtualRef = useRef(zoomTatico);
  useEffect(() => {
    zoomTaticoAtualRef.current = zoomTatico;
  }, [zoomTatico]);
  useEffect(() => {
    cameraMesa3DRef.current = cameraMesa3D;
  }, [cameraMesa3D]);
  const sairCameraDestaque = () => {
    setCameraDestaque(null);
    enviar3D('cinematica-encerrar');
  };
  const enviarCameraDestaque = (acao: CameraDestaque) => {
    visualizador3DRef.current?.contentWindow?.postMessage(
      {
        canal: 'portal-mestre-3d',
        tipo: 'cinematica-iniciar',
        valor: {
          personagemId: acao.personagemId,
          modo: acao.modo,
          cenaId: acao.cenaId,
        },
      },
      window.location.origin,
    );
  };
  useEffect(() => {
    cameraDestaqueRef.current = cameraDestaque;
    if (!MODO_3D) return;
    if (cameraDestaque) enviarCameraDestaque(cameraDestaque);
    else enviar3D('cinematica-encerrar');
  }, [cameraDestaque]);
  const enviar3D = (tipo: string, valor?: string | number) => {
    visualizador3DRef.current?.contentWindow?.postMessage(
      { canal: 'portal-mestre-3d', tipo, valor },
      window.location.origin,
    );
  };
  useEffect(() => {
    try {
      localStorage.setItem('portal-mestre-zoom-tatico-v1', String(zoomTatico));
    } catch {
      /* Preferência local opcional. */
    }
    if (MODO_3D) enviar3D('cinematica-zoom', zoomTatico);
  }, [zoomTatico, MODO_3D]);
  const mudarZoomTatico = (valor: number) =>
    setZoomTatico(Math.max(65, Math.min(200, Math.round(valor))));
  const reenquadrarCombate = () => {
    mudarZoomTatico(100);
    enviar3D('cinematica-reenquadrar');
  };
  useEffect(() => {
    if (MODO_3D) {
      enviar3D('fog-grupo', exploracaoGrupo ? 'grupo' : 'individual');
      enviar3D('fog-raio', raioPincel);
    }
  }, [MODO_3D, exploracaoGrupo, raioPincel]);
  const escolherPeriodoDia3D = (periodo: PeriodoDia3D) => {
    if (!MODO_3D) return;
    try {
      salvarPeriodoCena3D(CAMPAIGN_ID, campanha.cenaAtivaId, periodo);
      setPeriodoDiaCena3D(periodo);
      enviar3D('atmosfera', periodo);
    } catch {
      setAlerta(
        'Não foi possível salvar o horário desta cena 3D. Verifique o armazenamento local.',
      );
    }
  };
  const escolherCameraMesa3D = (visao: 'mestre' | 'terceira') => {
    if (!MODO_3D) return;
    sairCameraDestaque();
    if (visao === 'terceira') {
      const cena = campanha.cenas.find((c) => c.id === campanha.cenaAtivaId);
      const disponiveis = campanha.unidades.filter((u) => Boolean(cena?.tokens?.[u.id]));
      // Sem token, mantém a câmera de teste disponível como nas versões anteriores.
      const alvo = disponiveis.find((u) => u.id === selecionadoId)?.id ?? disponiveis[0]?.id;
      if (alvo) {
        if (alvo !== selecionadoId) setSelecionadoId(alvo);
        enviar3D('selecionar', alvo);
      }
    }
    setCameraMesa3D(visao);
    if (visao === 'terceira') {
      setEditor3DAberto(false);
      // A edição pertence à Visão de Mesa; nunca fica ativa por trás da terceira pessoa.
      setFerramentaMapa('mover');
      enviar3D('ferramenta', 'mover');
    }
    enviar3D('camera', visao);
  };
  const usarFerramenta = (tool: FerramentaMapa) => {
    if (tool !== 'mover') {
      setBarreiraSelecionadaId(null);
      setBarreiraPrevia(null);
    }
    if (!MODO_3D) {
      setFerramentaMapa(tool);
      return;
    }
    if (
      tool === 'mover' ||
      tool === 'parede' ||
      tool === 'porta' ||
      tool === 'luz' ||
      tool === 'marcador' ||
      tool === 'desenhar' ||
      ((tool === 'revelar' || tool === 'ocultar') &&
        ['nevoa', 'nevoa_visao', 'exploracao'].includes(cenaAtual.visibilidade))
    ) {
      setFerramentaMapa(tool);
      enviar3D('ferramenta', tool);
    } else
      setAlerta(
        'Esta ferramenta ainda não possui representação espacial 3D. Ela continua disponível na Mesa 2D.',
      );
  };
  // Transformações no próprio mapa: o elemento capturador conserva o ponteiro
  // enquanto redimensionamos ou giramos, mesmo se a alça se mover com o token.
  const arrasto = useRef<{
    id: string;
    pointerId: number;
    inicioX: number;
    inicioY: number;
    ponteiroX: number;
    ponteiroY: number;
  } | null>(null);
  const transformacaoToken = useRef<{
    id: string;
    pointerId: number;
    modo: 'tamanho' | 'rotacao';
    centroX: number;
    centroY: number;
    escala: number;
    anguloInicial: number;
    rotacaoInicial: number;
  } | null>(null);
  const cenaAtual = campanha.cenas.find((c) => c.id === campanha.cenaAtivaId) || campanha.cenas[0];
  // Camadas ocultas permanecem acessíveis ao mestre como fantasmas.
  const mostrarTokens = !preverJogador || cenaAtual.camadas.tokens;
  // O mestre pode acompanhar qualquer token real da cena, seja jogador, NPC ou inimigo.
  const personagensCamera3D = campanha.unidades.filter((u) => Boolean(cenaAtual.tokens?.[u.id]));
  const alternarCameraDestaque = (modo: ModoCameraCinematica) => {
    if (!MODO_3D) return;
    if (cameraDestaque?.modo === modo) {
      sairCameraDestaque();
      return;
    }
    const personagemId = personagemCamera3DId;
    if (!personagemId) {
      setAlerta('Adicione um token à cena para usar a câmera.');
      return;
    }
    setCameraDestaque({ personagemId, modo, cenaId: cenaAtual.id });
  };
  useEffect(() => {
    setPosicaoPersonagemTela(null);
  }, [cameraDestaque?.modo, cameraDestaque?.personagemId, cenaAtual.id]);
  useEffect(() => {
    if (cameraDestaque && cameraDestaque.cenaId !== cenaAtual.id) setCameraDestaque(null);
  }, [cenaAtual.id, cameraDestaque]);
  const personagemCamera3DId = personagensCamera3D.some((u) => u.id === selecionadoId)
    ? selecionadoId
    : (personagensCamera3D[0]?.id ?? '');
  useEffect(() => {
    if (!MODO_3D || cameraMesa3D !== 'terceira' || !personagensCamera3D.length) return;
    // A ficha aberta pode ser de alguém fora da cena; nunca seguir um alvo ausente.
    if (!personagensCamera3D.some((u) => u.id === selecionadoId))
      setSelecionadoId(personagensCamera3D[0].id);
  }, [cameraMesa3D, selecionadoId, campanha.cenaAtivaId, campanha.unidades, cenaAtual.tokens]);
  const selectedId = campanha.unidades.some((u) => u.id === selecionadoId)
    ? selecionadoId
    : campanha.unidades[0]?.id || '';
  const selecionado = campanha.unidades.find((u) => u.id === selectedId);
  const participantesDaCena = normalizarParticipantesIniciativa(cenaAtual.participantesIniciativa);
  const ordenados = useMemo(
    () => ordenarParticipantesIniciativa(campanha.unidades, cenaAtual.participantesIniciativa),
    [campanha.unidades, cenaAtual.participantesIniciativa],
  );
  const disponiveisParaIniciativa = campanha.unidades.filter(
    (u) => !participantesDaCena.includes(u.id),
  );
  const atual = campanha.unidades.find((u) => u.id === campanha.turnoId);
  const fogExploracao = cenaAtual.visibilidade === 'exploracao';
  const fogManual =
    cenaAtual.visibilidade === 'nevoa' || cenaAtual.visibilidade === 'nevoa_visao' || fogExploracao;
  const fogVisao =
    preverJogador || cenaAtual.visibilidade === 'visao' || cenaAtual.visibilidade === 'nevoa_visao';
  const idObservador =
    observadorVisaoId && cenaAtual.tokens[observadorVisaoId]
      ? observadorVisaoId
      : cenaAtual.tokens[selectedId]
        ? selectedId
        : Object.keys(cenaAtual.tokens)[0] || selectedId;
  const tokenObservado = cenaAtual.tokens[idObservador];
  const nomeObservador = campanha.unidades.find((u) => u.id === idObservador)?.nome || 'personagem';
  const observadorNaCena = Boolean(cenaAtual.tokens[idObservador]);
  useEffect(() => {
    const observador = preverJogador && observadorNaCena ? idObservador : null;
    visaoIndividual3DRef.current = observador;
    if (MODO_3D) enviar3D('visao-individual', observador ?? '');
    // Posição e skins não acionam a ponte: atualizar a cada WASD reiniciaria o teclado do visualizador.
  }, [MODO_3D, preverJogador, idObservador, cenaAtual.id, observadorNaCena]);
  const raioVisao = limite(tokenObservado?.visao ?? 18, 2, 50); // percentual da largura do mapa
  // Zoom 100% significa "mapa inteiro ajustado", respeitando o tamanho natural do arquivo.
  const proporcaoNatural = tamanhoImagem
    ? tamanhoImagem.largura / Math.max(1, tamanhoImagem.altura)
    : 1.6;
  const escalaCena = limite(Math.max(cenaAtual.largura, cenaAtual.altura), 100, 500) / 100;
  const { largura: palcoLargura, altura: palcoAltura } = dimensoesPalco2D(
    viewport,
    proporcaoNatural,
    escalaCena,
  );
  const barreiras = cenaAtual.barreiras ?? [];
  const barreiraSelecionada = barreiras.find((b) => b.id === barreiraSelecionadaId) ?? null;
  const barreirasVisuais = barreiras.map((b) => (barreiraPrevia?.id === b.id ? barreiraPrevia : b));
  const fontesLuz = cenaAtual.fontesLuz ?? [];
  const configLuz = cenaAtual.iluminacao ?? { ativa: false, ambiente: 40, colisao: false };
  const opacidadeNevoaMestre = normalizarOpacidadeNevoaMestre(cenaAtual.opacidadeNevoaMestre);
  const gradeAtual = normalizarGrade(cenaAtual.grade);
  const climaAtual = normalizarClima(cenaAtual.clima);
  // A iframe não recebe o evento de storage da janela que escreveu no localStorage.
  // Comunicar somente a mudança climática, sem reiniciar a Mesa 3D nem as skins.
  useEffect(() => {
    if (MODO_3D) enviar3D('clima-atualizado');
  }, [
    MODO_3D,
    cenaAtual.id,
    climaAtual.tipo,
    climaAtual.intensidade,
    climaAtual.vento,
    climaAtual.direcao,
  ]);
  const visaoPoligono = useMemo(
    () =>
      tokenObservado
        ? calcularPoligonoVisao(
            tokenObservado.x,
            tokenObservado.y,
            raioVisao,
            barreiras,
            palcoLargura,
            palcoAltura,
          )
        : [],
    [tokenObservado?.x, tokenObservado?.y, raioVisao, barreiras, palcoLargura, palcoAltura],
  );
  // Exploracao persistente por personagem: poligonos em coordenadas da cena,
  // nunca em pixels da tela, zoom, câmera ou resolução de textura.
  const idsExploradores = campanha.unidades
    .filter((u) => u.tipo === 'jogador' && cenaAtual.tokens[u.id])
    .map((u) => u.id);
  const idsFogAtivos = exploracaoGrupo
    ? idsExploradores
    : cenaAtual.tokens[idObservador]
      ? [idObservador]
      : [];
  const poligonosFog = useMemo(
    () =>
      idsFogAtivos.map((uid) => {
        const t = cenaAtual.tokens[uid];
        return t
          ? calcularPoligonoVisao(t.x, t.y, t.visao ?? 18, barreiras, palcoLargura, palcoAltura)
          : [];
      }),
    [idsFogAtivos.join('|'), cenaAtual.tokens, barreiras, palcoLargura, palcoAltura],
  );
  const visiveisFog = useMemo(
    () => celulasVisiveisFog(poligonosFog, { largura: palcoLargura, altura: palcoAltura }),
    [poligonosFog, palcoLargura, palcoAltura],
  );
  const estadosFog = useMemo(
    () =>
      mapaEstadosFog(
        cenaAtual.exploracaoPorToken || {},
        idsFogAtivos,
        visiveisFog,
        cenaAtual.nevoa,
      ),
    [cenaAtual.exploracaoPorToken, idsFogAtivos.join('|'), visiveisFog, cenaAtual.nevoa],
  );
  const caminhosExploracao = useMemo(() => caminhosFog(estadosFog), [estadosFog]);
  // Grava somente quando uma nova célula é encontrada. Nenhuma gravação ocorre
  // nos outros modos de visibilidade ou para tokens que não estejam na cena.
  const assinaturaRastreamentoFog = idsExploradores
    .map((uid) => {
      const t = cenaAtual.tokens[uid];
      return `${uid}:${t.x}:${t.y}:${t.visao ?? 18}`;
    })
    .join('|');
  useEffect(() => {
    if (!fogExploracao || MODO_3D || !idsExploradores.length) return;
    const atual = campanha.cenas.find((c) => c.id === campanha.cenaAtivaId);
    if (!atual) return;
    const novos = { ...validarMemoriaFog(atual.exploracaoPorToken) };
    let mudou = false;
    for (const uid of idsExploradores) {
      const token = atual.tokens[uid];
      if (!token) continue;
      const poly = calcularPoligonoVisao(
        token.x,
        token.y,
        token.visao ?? 18,
        atual.barreiras || [],
        palcoLargura,
        palcoAltura,
      );
      const visivel = celulasVisiveisFog([poly], { largura: palcoLargura, altura: palcoAltura });
      const proximo = acrescentarExploracaoFog(novos[uid], visivel);
      if (proximo !== novos[uid]) {
        novos[uid] = proximo;
        mudou = true;
      }
    }
    if (mudou)
      setCampanha((c) => ({
        ...c,
        cenas: c.cenas.map((cena) =>
          cena.id === atual.id
            ? { ...cena, exploracaoPorToken: { ...cena.exploracaoPorToken, ...novos } }
            : cena,
        ),
      }));
    // Intencionalmente observa coordenadas e barreiras, não mudanças na memória.
  }, [
    fogExploracao,
    MODO_3D,
    campanha.cenaAtivaId,
    assinaturaRastreamentoFog,
    barreiras,
    palcoLargura,
    palcoAltura,
  ]);
  const emissores = useMemo(
    () =>
      [
        ...fontesLuz
          .filter((f) => f.ativa)
          .map((f) => ({ id: f.id, x: f.x, y: f.y, alcance: f.alcance, cor: f.cor })),
        ...Object.entries(cenaAtual.tokens)
          .filter(([, t]) => t.emiteLuz)
          .map(([uid, t]) => ({
            id: `token-${uid}`,
            x: t.x,
            y: t.y,
            alcance: limite(t.alcanceLuz ?? 15, 2, 70),
            cor: t.corLuz ?? '#ffcd86',
          })),
      ].map((f) => ({
        ...f,
        pontos: calcularPoligonoVisao(f.x, f.y, f.alcance, barreiras, palcoLargura, palcoAltura),
      })),
    [fontesLuz, cenaAtual.tokens, barreiras, palcoLargura, palcoAltura],
  );

  const registrosVisiveis = campanha.registros.filter(
    (r) => !preverJogador || r.visibilidade !== 'mestre',
  );

  useEffect(() => {
    try {
      localStorage.setItem(WINDOWS_KEY, JSON.stringify(janelas));
    } catch {
      /* visual não persistido */
    }
  }, [janelas]);
  useEffect(() => {
    const elemento = viewportRef.current;
    if (!elemento) return;
    const medir = () =>
      setViewport({ largura: elemento.clientWidth, altura: elemento.clientHeight });
    medir();
    // ResizeObserver mede o espaço real inclusive ao redimensionar a janela.
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  // A roda atua apenas sobre o mapa 2D, com listener não-passivo.
  // O ponto sob o cursor permanece no lugar durante a aproximação.
  useEffect(() => {
    const area = viewportRef.current;
    if (MODO_3D || !area) return;
    const aoRolar = (evento: WheelEvent) => {
      if (!Number.isFinite(evento.deltaY) || evento.deltaY === 0) return;
      evento.preventDefault();
      const rect = area.getBoundingClientRect();
      const atual = zoomMesa2DAtualRef.current;
      const proximo = zoomDaMesa2DNoCursor({
        zoom: atual.zoom,
        pan: atual.pan,
        cursor: { x: evento.clientX - rect.left, y: evento.clientY - rect.top },
        viewport: { largura: rect.width, altura: rect.height },
        deltaY: evento.deltaY,
        deltaMode: evento.deltaMode,
      });
      zoomMesa2DAtualRef.current = proximo;
      setPan(proximo.pan);
      setZoom(proximo.zoom);
    };
    area.addEventListener('wheel', aoRolar, { passive: false });
    return () => area.removeEventListener('wheel', aoRolar);
  }, []);
  // Cada biblioteca de imagens usa uma transação IndexedDB e um único setState.
  // A troca 2D/3D não dispara dezenas de conexões paralelas.
  useEffect(() => {
    let ativo = true;
    const criadas: string[] = [];
    const elenco = campanha.unidades.filter((u) => u.temRetrato);
    void carregarArquivos(elenco.map((u) => `retrato:${u.id}`))
      .then((blobs) => {
        if (!ativo) return;
        const urls: Record<string, string> = {};
        blobs.forEach((blob, i) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            criadas.push(url);
            urls[elenco[i].id] = url;
          }
        });
        setUrlRetratos(urls);
      })
      .catch(() => {
        if (ativo) setAlerta('Não foi possível carregar um dos retratos.');
      });
    return () => {
      ativo = false;
      criadas.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [retratosChave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let ativo = true;
    const criadas: string[] = [];
    const elenco = campanha.unidades.filter((u) => u.temToken);
    void carregarArquivos(elenco.map((u) => `token:${u.id}`))
      .then((blobs) => {
        if (!ativo) return;
        const urls: Record<string, string> = {};
        blobs.forEach((blob, i) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            criadas.push(url);
            urls[elenco[i].id] = url;
          }
        });
        setUrlTokens(urls);
      })
      .catch(() => {
        if (ativo) setAlerta('Não foi possível carregar um dos tokens.');
      });
    return () => {
      ativo = false;
      criadas.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tokensChave, revisaoToken]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let ativo = true;
    const criadas: string[] = [];
    const skins = campanha.unidades.flatMap((u) =>
      skinsValidas(u).map((skin) => ({ unidadeId: u.id, skinId: skin.id })),
    );
    void carregarArquivos(skins.map((s) => chaveImagemSkin(s.unidadeId, s.skinId)))
      .then((blobs) => {
        if (!ativo) return;
        const urls: Record<string, string> = {};
        blobs.forEach((blob, i) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            criadas.push(url);
            urls[`${skins[i].unidadeId}:${skins[i].skinId}`] = url;
          }
        });
        setUrlSkins(urls);
      })
      .catch(() => {
        if (ativo) setAlerta('Não foi possível carregar uma skin do token.');
      });
    return () => {
      ativo = false;
      criadas.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [skinsChave, revisaoToken]); // eslint-disable-line react-hooks/exhaustive-deps
  // Usa a skin da cena, senão a skin padrão do personagem, preservando o token original.
  function imagemTokenCena(u: Unidade, token?: TokenCena): string | undefined {
    const escolha = skinAtiva(u, token);
    return (
      (escolha !== TOKEN_ORIGINAL ? urlSkins[`${u.id}:${escolha}`] : undefined) || urlTokens[u.id]
    );
  }
  useEffect(() => {
    try {
      const atualizado = JSON.stringify(campanha);
      if (localStorage.getItem(STORAGE_KEY) !== atualizado)
        localStorage.setItem(STORAGE_KEY, atualizado);
    } catch {
      setAlerta('O armazenamento local está cheio ou indisponível. Faça um backup dos dados.');
    }
  }, [campanha]);
  // O visualizador roda dentro de um iframe. Avisamos explicitamente quando
  // uma skin muda ou quando o arquivo de imagem é substituído mantendo o mesmo ID.
  // O estado da campanha já foi salvo no efeito acima antes do postMessage.
  const assinaturaSkins3D = JSON.stringify({
    cena: campanha.cenaAtivaId,
    personagens: campanha.unidades.map((u) => ({
      id: u.id,
      skinPadraoId: u.skinPadraoId,
      tokenIdleGif: u.tokenIdleGif,
      tokenIdlePausado: u.tokenIdlePausado,
      tokenIdleVelocidade: u.tokenIdleVelocidade,
      skins: skinsValidas(u).map((s) => [s.id, s.idleGif, s.idlePausado, s.idleVelocidade]),
      temToken: u.temToken,
      temRetrato: u.temRetrato,
    })),
    tokens: Object.entries(cenaAtual.tokens).map(([id, token]) => ({ id, skinId: token.skinId })),
  });
  useEffect(() => {
    if (MODO_3D) enviar3D('skins-atualizadas');
  }, [assinaturaSkins3D, revisaoToken]);
  // A Mesa 2D e a Mesa 3D usam o mesmo registro. Sincronizar também entre
  // abas 2D/3D mantém páginas, tokens e fichas atualizados sem recarregar.
  useEffect(() => {
    const sincronizar = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const proximo = JSON.parse(e.newValue) as Campanha;
        if (proximo && Array.isArray(proximo.unidades) && Array.isArray(proximo.cenas))
          setCampanha((anterior) => (JSON.stringify(anterior) === e.newValue ? anterior : proximo));
      } catch {
        /* A origem mantém a versão válida até a próxima atualização. */
      }
    };
    const receberSelecao = (e: MessageEvent) => {
      if (!MODO_3D) return;
      if (
        e.origin !== window.location.origin ||
        e.source !== visualizador3DRef.current?.contentWindow ||
        !e.data ||
        e.data.canal !== 'portal-mestre-3d'
      )
        return;
      if (e.data.tipo === 'pronto') {
        enviar3D('cena', estadoVisual3DRef.current.cena);
        enviar3D('selecionar', estadoVisual3DRef.current.selecionado);
        enviar3D('camera', cameraMesa3DRef.current);
        enviar3D('skins-atualizadas');
        enviar3D('visao-individual', visaoIndividual3DRef.current ?? '');
        enviar3D('cinematica-zoom', zoomTaticoAtualRef.current);
        if (cameraDestaqueRef.current) enviarCameraDestaque(cameraDestaqueRef.current);
      }
      if (e.data.tipo === 'previa-token-3d') {
        const p = e.data.valor as
          { cenaId?: unknown; id?: unknown; x?: unknown; y?: unknown; final?: unknown } | undefined;
        if (
          !p ||
          p.cenaId !== estadoVisual3DRef.current.cena ||
          typeof p.id !== 'string' ||
          p.id.length > 120 ||
          typeof p.x !== 'number' ||
          typeof p.y !== 'number' ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > 100 ||
          p.y < 0 ||
          p.y > 100 ||
          typeof p.final !== 'boolean'
        )
          return;
        window.dispatchEvent(
          new CustomEvent('portal-mp-previa-token-3d', {
            detail: { cenaId: p.cenaId, id: p.id, x: p.x, y: p.y, final: p.final },
          }),
        );
        return;
      }
      if (e.data.tipo === 'posicao-personagem-tela') {
        const p = e.data.valor as Partial<ProjecaoPersonagemTela> | undefined;
        if (
          !p ||
          typeof p.personagemId !== 'string' ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          typeof p.visivel !== 'boolean'
        )
          return;
        if (
          cameraDestaqueRef.current?.modo !== 'personagem' ||
          cameraDestaqueRef.current.personagemId !== p.personagemId
        )
          return;
        const r = visualizador3DRef.current?.getBoundingClientRect();
        if (!r || !r.width || !r.height) return;
        const x = r.left + (p.x as number) * r.width,
          y = r.top + (p.y as number) * r.height;
        setPosicaoPersonagemTela((anterior) => {
          if (
            anterior !== null &&
            anterior.personagemId === p.personagemId &&
            anterior.visivel === p.visivel &&
            Math.abs(anterior.x - x) < 3 &&
            Math.abs(anterior.y - y) < 3
          )
            return anterior;
          return { personagemId: p.personagemId!, x, y, visivel: p.visivel! };
        });
      }
      if (e.data.tipo === 'cinematica-encerrada') setCameraDestaque(null);
      // Sincroniza a câmera do Portal quando o mestre escolhe editar o chão
      // dentro do painel 3D. Abrir o painel, por si só, nunca troca a câmera.
      if (e.data.tipo === 'camera-modo-atualizado' && e.data.valor === 'mestre') {
        cameraMesa3DRef.current = 'mestre';
        setCameraMesa3D('mestre');
      }
      if (e.data.tipo === 'cinematica-zoom-atualizado' && typeof e.data.valor === 'number')
        setZoomTatico(Math.max(65, Math.min(200, Math.round(e.data.valor))));
      if (e.data.tipo === 'selecionar-personagem' && typeof e.data.valor === 'string')
        setSelecionadoId(e.data.valor);
      if (
        e.data.tipo === 'token-selecionado-na-mesa' &&
        (e.data.valor === null || typeof e.data.valor === 'string')
      )
        setTokenEmEdicaoId(e.data.valor);
      if (e.data.tipo === 'selecao-multipla-3d' && Number.isInteger(e.data.valor))
        setMultiSelecionado3D(Math.max(0, e.data.valor));
      if (
        e.data.tipo === 'marcador-novo' &&
        e.data.valor &&
        typeof e.data.valor.x === 'number' &&
        typeof e.data.valor.y === 'number'
      ) {
        const x = limite(e.data.valor.x, 0, 100),
          y = limite(e.data.valor.y, 0, 100);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const marcadorId = id();
        setCampanha((atual) => ({
          ...atual,
          cenas: atual.cenas.map((cena) => {
            if (cena.id !== atual.cenaAtivaId) return cena;
            const nova = {
              ...cena,
              marcadores: [
                ...cena.marcadores,
                { id: marcadorId, texto: `Marcação ${cena.marcadores.length + 1}`, x, y },
              ],
            };
            registrarEdicao(
              CAMPAIGN_ID,
              cena.id,
              'cena',
              extrairEdicaoCena(cena),
              extrairEdicaoCena(nova),
            );
            return nova;
          }),
        }));
      }
      if (e.data.tipo === 'marcador-editar' && typeof e.data.valor === 'string') {
        const atual = JSON.parse(localStorage.getItem(chaveEstadoCampanha(CAMPAIGN_ID)) || '{}');
        const cena = atual.cenas?.find((v: { id: string }) => v.id === atual.cenaAtivaId);
        const marcador = cena?.marcadores?.find((v: { id: string }) => v.id === e.data.valor);
        if (marcador) {
          setMarcadorPendente({
            x: marcador.x,
            y: marcador.y,
            cenaId: cena.id,
            editarId: marcador.id,
          });
          setCoordenadasMarcadorTexto({
            x: formatarPercentualDecimal(marcador.x),
            y: formatarPercentualDecimal(marcador.y),
          });
          setNomeMarcador(marcador.texto);
          setModal('marcador');
        }
      }
      if (e.data.tipo === 'editar-luz' && typeof e.data.valor === 'string') {
        // A Mesa 3D é responsável pelo seu editor compacto no chão.
        // Não abrir novamente o formulário extenso da janela Iluminação.
        setJanelas((old) => ({ ...old, iluminacao: { ...old.iluminacao, aberta: false } }));
        enviar3D('selecionar-luz', e.data.valor);
      }
      if (e.data.tipo === 'pedir-visao-individual' && typeof e.data.valor === 'string') {
        setObservadorVisaoId(e.data.valor);
        setPreverJogador(true);
      }
      if (e.data.tipo === 'editor-status' && typeof e.data.valor === 'boolean')
        setEditor3DAberto(e.data.valor);
      if (
        e.data.tipo === 'ferramenta-atual' &&
        ['mover', 'parede', 'porta', 'luz', 'marcador', 'desenhar', 'revelar', 'ocultar'].includes(
          e.data.valor,
        )
      )
        setFerramentaMapa(e.data.valor as FerramentaMapa);
    };
    window.addEventListener('storage', sincronizar);
    window.addEventListener('message', receberSelecao);
    return () => {
      window.removeEventListener('storage', sincronizar);
      window.removeEventListener('message', receberSelecao);
    };
  }, []);
  // Uma rolagem por vez: protege a iniciativa de varios personagens.
  useEffect(() => {
    if (rolagemDestacada || !filaRolagens.length) return;
    setRolagemDestacada(filaRolagens[0]);
    setFilaRolagens((fila) => fila.slice(1));
  }, [rolagemDestacada, filaRolagens]);
  useEffect(() => {
    if (!rolagemDestacada || rolagemDestacada.pendente) return;
    const handle = window.setTimeout(
      () => setRolagemDestacada((atual) => (atual?.id === rolagemDestacada.id ? null : atual)),
      filaRolagens.length ? 1400 : 1800,
    );
    return () => window.clearTimeout(handle);
  }, [rolagemDestacada?.id, rolagemDestacada?.pendente, filaRolagens.length]);
  useEffect(() => {
    let valido = true;
    let criada: string | null = null;
    setUrlMapa(null);
    setTamanhoImagem(null);
    if (cenaAtual.temMapa) {
      carregarArquivo(chaveMapa(cenaAtual.id))
        .then((blob) => {
          if (!blob || !valido) return;
          criada = URL.createObjectURL(blob);
          const imagem = new Image();
          imagem.onload = () => {
            if (valido) {
              setTamanhoImagem({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
              setUrlMapa(criada);
            }
          };
          imagem.onerror = () => {
            if (valido) setAlerta('Não foi possível ler as dimensões da imagem do mapa.');
          };
          imagem.src = criada;
        })
        .catch(() => {
          if (valido) setAlerta('Não foi possível carregar a imagem do mapa.');
        });
    }
    return () => {
      valido = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [cenaAtual.id, cenaAtual.temMapa, revisaoMapa]);
  useEffect(() => {
    if (!janelas.pdf.aberta || !selecionado?.temPdf) {
      setUrlPdf(null);
      return;
    }
    let valido = true;
    let criada: string | null = null;
    carregarArquivo(`ficha:${selecionado.id}`)
      .then((blob) => {
        if (blob && valido) {
          criada = URL.createObjectURL(blob);
          setUrlPdf(criada);
        }
        if (!blob && valido)
          setAlerta('Arquivo PDF não encontrado neste navegador. Importe a ficha novamente.');
      })
      .catch(() => setAlerta('Não foi possível carregar a ficha PDF.'));
    return () => {
      valido = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [janelas.pdf.aberta, selecionado?.id, selecionado?.temPdf]);

  function atualizarUnidade(unidadeId: string, alterar: (u: Unidade) => Unidade) {
    setCampanha((c) => ({
      ...c,
      unidades: c.unidades.map((u) => (u.id === unidadeId ? alterar(u) : u)),
    }));
  }
  function atualizarCena(alterar: (c: Cena) => Cena) {
    const ativa = campanha.cenaAtivaId;
    setCampanha((c) => ({
      ...c,
      cenas: c.cenas.map((cena) => {
        if (cena.id !== ativa) return cena;
        const nova = alterar(cena);
        registrarEdicao(
          CAMPAIGN_ID,
          ativa,
          'cena',
          extrairEdicaoCena(cena),
          extrairEdicaoCena(nova),
        );
        return nova;
      }),
    }));
  }
  function navegarHistoricoEdicao(direcao: 'desfazer' | 'refazer') {
    if (preverJogador || modal) {
      setAlerta('Saia da prévia ou feche a janela antes de editar.');
      return;
    }
    if (MODO_3D) {
      enviar3D('historico-edicao', direcao);
      return;
    }
    const passo = passoEdicao(CAMPAIGN_ID, campanha.cenaAtivaId, direcao);
    if (!passo) {
      setAlerta('Nenhuma alteração disponível no histórico desta cena.');
      return;
    }
    if (passo.tipo === 'cenario3d') {
      // Uma edição do terreno 3D também pode ser desfeita depois de voltar ao 2D.
      salvarCenario3D(
        CAMPAIGN_ID,
        campanha.cenaAtivaId,
        passo.valor as ReturnType<typeof carregarCenario3D>,
      );
    } else {
      setCampanha((c) => ({
        ...c,
        cenas: c.cenas.map((cena) =>
          cena.id === c.cenaAtivaId
            ? aplicarEdicaoCena(cena, passo.valor as ReturnType<typeof extrairEdicaoCena>)
            : cena,
        ),
      }));
    }
    setMarcadorSelecionadoId(null);
    setDesenhoSelecionadoId(null);
    setLuzSelecionadaId(null);
    setSelecoesMapa([]);
    setBarreiraSelecionadaId(null);
    setAlerta(
      direcao === 'desfazer' ? 'Alteração da cena desfeita.' : 'Alteração da cena refeita.',
    );
  }
  // Multiplayer etapa 3: solicitações chegam autenticadas pelo servidor e são
  // aplicadas somente no estado do mestre. O mesmo salvamento alimenta 2D/3D.
  function validarMovimentoConvidado(
    atual: Campanha,
    pedido: { cenaId: string; personagemId: string; x: number; y: number },
  ) {
    if (atual.cenaAtivaId !== pedido.cenaId) return { aceito: false, estado: atual };
    const cena = atual.cenas.find((c) => c.id === pedido.cenaId);
    const unidade = atual.unidades.find((u) => u.id === pedido.personagemId);
    const token = cena?.tokens[pedido.personagemId];
    if (
      !cena ||
      !unidade ||
      unidade.tipo !== 'jogador' ||
      !token ||
      token.oculto ||
      token.travado ||
      !['total', 'visao', 'nevoa_visao', 'exploracao'].includes(cena.visibilidade) ||
      cena.camadas?.jogadores === false
    )
      return { aceito: false, estado: atual };
    if (!Number.isFinite(pedido.x) || !Number.isFinite(pedido.y))
      return { aceito: false, estado: atual };
    const destino = { x: limite(pedido.x, 1, 99), y: limite(pedido.y, 1, 99) };
    const grade = normalizarGrade(cena.grade);
    const final = grade.encaixarTokens ? encaixarNaGrade(destino, grade) : destino;
    // A visão e a passagem compartilham as paredes, mas são decisões distintas.
    // Para convidados, toda barreira marcada como bloqueadora de MOVIMENTO é
    // física, independentemente do modo (2D/3D) aberto pelo mestre e da opção
    // de atravessar paredes durante edições locais do mestre.
    // Coordenadas percentuais evitam que o zoom/câmera alterem a colisão.
    if (bloqueiaPassagem({ x: token.x, y: token.y }, final, cena.barreiras ?? [], 100, 100))
      return { aceito: false, estado: atual };
    if (MODO_3D) {
      const cenario3D = carregarCenario3D(CAMPAIGN_ID, cena.id);
      const anterior3D = percentualParaChao3D(token, cenario3D);
      const destino3D = percentualParaChao3D(final, cenario3D);
      const outros3D = Object.entries(cena.tokens)
        .filter(([id, t]) => id !== pedido.personagemId && !t.oculto)
        .map(([, t]) => percentualParaChao3D(t, cenario3D));
      if (
        bloqueiaMovimentoCompartilhado3D(anterior3D, destino3D, cena.barreiras ?? [], cenario3D) ||
        !posicaoPermitidaNaMesa3D(destino3D, cenario3D, outros3D, cena.barreiras ?? [])
      )
        return { aceito: false, estado: atual };
    }
    if (token.x === final.x && token.y === final.y) return { aceito: true, estado: atual };
    return {
      aceito: true,
      estado: {
        ...atual,
        cenas: atual.cenas.map((c) =>
          c.id === cena.id
            ? {
                ...c,
                tokens: { ...c.tokens, [pedido.personagemId]: { ...token, ...final } },
              }
            : c,
        ),
      },
    };
  }
  function moverTokenConvidado(pedido: {
    cenaId: string;
    personagemId: string;
    x: number;
    y: number;
    gestoId?: string;
  }): boolean {
    // O callback de colisão precisa de uma resposta imediata; não deve
    // depender de um efeito colateral dentro do updater assíncrono do React.
    const resultado = validarMovimentoConvidado(campanhaMovimentoRef.current, pedido);
    if (!resultado.aceito) return false;
    campanhaMovimentoRef.current = resultado.estado;
    if (resultado.estado !== campanha) {
      setCampanha((atual) => validarMovimentoConvidado(atual, pedido).estado);
    }
    return true;
  }
  function aplicarDesenhoConvidado(pedido: {
    acao: 'adicionar' | 'remover';
    cenaId: string;
    traco?: TracoDesenho;
    id?: string;
  }) {
    setCampanha((atual) => ({
      ...atual,
      cenas: atual.cenas.map((cena) => {
        if (cena.id !== pedido.cenaId) return cena;
        const anteriores = normalizarDesenhos(cena.desenhos);
        const novos =
          pedido.acao === 'remover'
            ? anteriores.filter((t) => t.id !== pedido.id)
            : pedido.traco && !anteriores.some((t) => t.id === pedido.traco?.id)
              ? [...anteriores, pedido.traco].slice(-200)
              : anteriores;
        if (novos === anteriores || JSON.stringify(novos) === JSON.stringify(anteriores))
          return cena;
        const nova = { ...cena, desenhos: novos };
        registrarEdicao(
          CAMPAIGN_ID,
          cena.id,
          'cena',
          extrairEdicaoCena(cena),
          extrairEdicaoCena(nova),
        );
        return nova;
      }),
    }));
  }
  function alterarToken(idUnidade: string, alterar: (p: TokenCena) => TokenCena) {
    atualizarCena((c) => ({
      ...c,
      tokens: {
        ...c.tokens,
        [idUnidade]: alterar(
          c.tokens[idUnidade] || {
            x: 50,
            y: 50,
            tamanho: 70,
            rotacao: 0,
            oculto: false,
            visao: 18,
          },
        ),
      },
    }));
  }
  // Delete retira apenas a miniatura da cena ativa. Personagem, PDF, retrato,
  // HP/Mana e tokens de outras cenas permanecem intocados.
  useEffect(() => {
    function teclaDoMapa(evento: KeyboardEvent) {
      const foco = evento.target;
      const digitando =
        foco instanceof HTMLElement &&
        (foco.isContentEditable ||
          Boolean(
            foco.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
          ));
      if (
        !digitando &&
        !evento.repeat &&
        (evento.ctrlKey || evento.metaKey) &&
        !evento.altKey &&
        ['z', 'y'].includes(evento.key.toLowerCase())
      ) {
        evento.preventDefault();
        navegarHistoricoEdicao(
          evento.key.toLowerCase() === 'y' || evento.shiftKey ? 'refazer' : 'desfazer',
        );
        return;
      }
      if (
        !MODO_3D &&
        !digitando &&
        !modal &&
        evento.key === 'Escape' &&
        (marcadorSelecionadoId || desenhoSelecionadoId || luzSelecionadaId)
      ) {
        setMarcadorSelecionadoId(null);
        setDesenhoSelecionadoId(null);
        setLuzSelecionadaId(null);
        evento.preventDefault();
        return;
      }
      if (!MODO_3D && !preverJogador && !modal && !digitando && selecoesMapa.length) {
        if (evento.key === 'Escape') {
          evento.preventDefault();
          setSelecoesMapa([]);
          return;
        }
        if (evento.key === 'Delete' && !evento.repeat) {
          evento.preventDefault();
          removerSelecaoMapa();
          return;
        }
      }
      if (
        !MODO_3D &&
        !preverJogador &&
        !digitando &&
        !modal &&
        !evento.repeat &&
        evento.key === 'Delete' &&
        ferramentaMapa === 'mover'
      ) {
        const tipo = marcadorSelecionadoId
          ? 'marcador'
          : desenhoSelecionadoId
            ? 'desenho'
            : luzSelecionadaId
              ? 'luz'
              : null;
        const itemId = marcadorSelecionadoId || desenhoSelecionadoId || luzSelecionadaId;
        if (tipo && itemId) {
          evento.preventDefault();
          excluirItemSelecionado2D(tipo, itemId);
          return;
        }
      }
      if (
        !MODO_3D &&
        evento.key === 'Delete' &&
        !evento.repeat &&
        barreiraSelecionadaId &&
        !modal &&
        ferramentaMapa === 'mover' &&
        !preverJogador
      ) {
        const alvo = evento.target;
        if (!(
          alvo instanceof HTMLElement &&
          (alvo.isContentEditable ||
            alvo.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
        )) {
          evento.preventDefault();
          excluirBarreiraSelecionada();
          return;
        }
      }
      if (
        evento.defaultPrevented ||
        evento.altKey ||
        evento.ctrlKey ||
        evento.metaKey ||
        (MODO_3D && (cameraMesa3D !== 'mestre' || editor3DAberto))
      )
        return;
      if (
        evento.key !== 'Delete' ||
        evento.repeat ||
        !tokenEmEdicaoId ||
        modal ||
        ferramentaMapa !== 'mover' ||
        preverJogador ||
        !cenaAtual.tokens[tokenEmEdicaoId] ||
        cenaAtual.tokens[tokenEmEdicaoId].travado
      )
        return;
      const alvo = evento.target;
      if (
        alvo instanceof HTMLElement &&
        (alvo.isContentEditable ||
          alvo.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
      )
        return;

      evento.preventDefault();
      const idToken = tokenEmEdicaoId;
      const nome = campanha.unidades.find((u) => u.id === idToken)?.nome || 'Token';
      setCampanha((atual) => ({
        ...atual,
        cenas: atual.cenas.map((cena) => {
          if (cena.id !== atual.cenaAtivaId || !cena.tokens[idToken]) return cena;
          const tokens = { ...cena.tokens };
          delete tokens[idToken];
          return { ...cena, tokens };
        }),
        registros: [
          ...atual.registros,
          {
            id: id(),
            hora: agora(),
            tipo: 'evento' as const,
            texto: `${nome}: token retirado da cena (Delete).`,
            visibilidade: 'mestre' as const,
          },
        ].slice(-150),
      }));
      setTokenEmEdicaoId(null);
      setAlerta(
        `${nome}: token retirado apenas desta cena. Para voltar, use “Colocar token nesta cena”.`,
      );
    }
    window.addEventListener('keydown', teclaDoMapa);
    return () => window.removeEventListener('keydown', teclaDoMapa);
  }, [
    tokenEmEdicaoId,
    barreiraSelecionadaId,
    selecoesMapa,
    marcadorSelecionadoId,
    desenhoSelecionadoId,
    luzSelecionadaId,
    modal,
    ferramentaMapa,
    preverJogador,
    cenaAtual.tokens,
    campanha.unidades,
    cameraMesa3D,
    editor3DAberto,
  ]);

  async function duplicarCena() {
    if (duplicandoCenaRef.current) return;
    duplicandoCenaRef.current = true;
    try {
      const original = cenaAtual;
      const copia = normalizarCena(duplicarDadosDaCena(original, id()));
      // Imagens do mapa vivem no IndexedDB, não no JSON da cena.
      // Copiar antes de adicionar a cena evita cópias com imagens ausentes.
      if (original.temMapa) {
        try {
          const arquivo = await carregarArquivo(chaveMapa(original.id));
          if (!arquivo) {
            setAlerta(
              'O mapa original não está disponível no armazenamento. Não foi possível duplicar a cena.',
            );
            return;
          }
          await salvarArquivo(chaveMapa(copia.id), arquivo);
        } catch {
          setAlerta('Não foi possível copiar a imagem do mapa; a cena original permanece intacta.');
          return;
        }
      }
      setCampanha((c) => ({
        ...c,
        cenas: [...c.cenas, copia],
        cenaAtivaId: copia.id,
        cena: copia.nome,
        combateAtivo: false,
        turnoId: null,
        rodada: 1,
        registros: [
          ...c.registros,
          {
            id: id(),
            hora: agora(),
            tipo: 'evento' as const,
            visibilidade: 'mestre' as const,
            texto: `Cena duplicada: ${original.nome}.`,
          },
        ].slice(-150),
      }));
      setFerramentaMapa('mover');
      setPreverJogador(false);
      setTokenEmEdicaoId(null);
      setBuscaCena('');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAlerta('Cena duplicada com mapa, tokens, névoa e iluminação.');
    } finally {
      duplicandoCenaRef.current = false;
    }
  }
  function reordenarCena(idCena: string, direcao: -1 | 1) {
    setCampanha((atual) => ({ ...atual, cenas: moverCena(atual.cenas, idCena, direcao) }));
  }
  function criarNovaCena() {
    setNomeNovaCena(`Cena ${campanha.cenas.length + 1}`);
    setModal('cena');
  }
  function salvarNovaCena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = nomeNovaCena.trim().slice(0, 65);
    if (!nome) return;
    const nova = criarCena(nome, []);
    setCampanha((c) => ({
      ...c,
      cenas: [...c.cenas, nova],
      cenaAtivaId: nova.id,
      cena: nova.nome,
      combateAtivo: false,
      turnoId: null,
      rodada: 1,
      registros: [
        ...c.registros,
        {
          id: id(),
          hora: agora(),
          texto: `Cena criada: ${nome}.`,
          tipo: 'evento' as const,
          visibilidade: 'mestre' as const,
        },
      ].slice(-150),
    }));
    setModal(null);
    setFerramentaMapa('mover');
    setPreverJogador(false);
    setTokenEmEdicaoId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBuscaCena('');
  }
  function abrirFormularioMarcador(
    ponto: PontoMapa,
    editarId?: string,
    nome = 'Ponto de interesse',
  ) {
    setMarcadorPendente({ ...ponto, cenaId: cenaAtual.id, editarId });
    setCoordenadasMarcadorTexto({
      x: formatarPercentualDecimal(ponto.x),
      y: formatarPercentualDecimal(ponto.y),
    });
    setNomeMarcador(nome);
    setModal('marcador');
  }
  // A criação é direta. Renomear / corrigir coordenadas é opcional ao selecionar.
  function adicionarMarcacaoRapida(ponto: PontoMapa) {
    const marcadorId = id();
    atualizarCena((c) => ({
      ...c,
      marcadores: [
        ...c.marcadores,
        {
          id: marcadorId,
          texto: `Marcação ${c.marcadores.length + 1}`,
          x: limite(ponto.x, 0, 100),
          y: limite(ponto.y, 0, 100),
        },
      ],
    }));
  }
  // A lista de iluminação apenas encontra a fonte. A edição usa o mesmo
  // editor flutuante da parede, diretamente sobre a mesa 2D ou 3D.
  function editarFonteLuz(luzId: string) {
    if (!fontesLuz.some((l) => l.id === luzId)) return;
    mudarJanela('iluminacao', { aberta: false });
    setFerramentaMapa('mover');
    if (MODO_3D) {
      setLuzEdicaoId(null);
      enviar3D('ferramenta', 'mover');
      enviar3D('selecionar-luz', luzId);
    } else {
      setLuzEdicaoId(luzId);
      setLuzSelecionadaId(luzId);
      setBarreiraSelecionadaId(null);
      setMarcadorSelecionadoId(null);
      setDesenhoSelecionadoId(null);
      setTokenEmEdicaoId(null);
    }
  }
  function alterarLuzSelecionada(luzId: string, dados: Partial<FonteLuz>) {
    atualizarCena((c) => ({
      ...c,
      fontesLuz: (c.fontesLuz ?? []).map((l) => (l.id === luzId ? { ...l, ...dados } : l)),
    }));
  }
  function removerLuzSelecionada(luzId: string) {
    if (!window.confirm('Remover esta fonte de luz da cena?')) return;
    atualizarCena((c) => ({ ...c, fontesLuz: (c.fontesLuz ?? []).filter((l) => l.id !== luzId) }));
    setLuzSelecionadaId(null);
    setLuzEdicaoId(null);
  }
  function salvarMarcador(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!marcadorPendente || !nomeMarcador.trim()) return;
    const { cenaId, editarId } = marcadorPendente;
    const x = interpretarPercentualDecimal(coordenadasMarcadorTexto.x);
    const y = interpretarPercentualDecimal(coordenadasMarcadorTexto.y);
    if (x === null || y === null) {
      setAlerta('Use coordenadas entre 0 e 100. Decimais podem ter vírgula ou ponto (ex.: 12,75).');
      return;
    }
    setCampanha((atual) => ({
      ...atual,
      cenas: atual.cenas.map((cena) =>
        cena.id === cenaId
          ? {
              ...cena,
              marcadores: atualizarPontosInteresse(
                cena.marcadores,
                { id: id(), texto: nomeMarcador, x, y },
                editarId,
              ),
            }
          : cena,
      ),
    }));
    setModal(null);
    setMarcadorPendente(null);
  }
  function selecionarCena(idCena: string) {
    const cena = campanha.cenas.find((c) => c.id === idCena);
    if (!cena) return;
    setCampanha((c) => ({
      ...c,
      cenaAtivaId: cena.id,
      cena: cena.nome,
      combateAtivo: false,
      turnoId: null,
      rodada: 1,
    }));
    setFerramentaMapa('mover');
    setPreverJogador(false);
    setTokenEmEdicaoId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  async function apagarCena() {
    if (campanha.cenas.length <= 1) {
      setAlerta('A mesa precisa ter pelo menos uma cena.');
      return;
    }
    if (
      !window.confirm(
        `Excluir a cena "${cenaAtual.nome}"? O mapa e a névoa desta cena também serão removidos.`,
      )
    )
      return;
    const idRemover = cenaAtual.id;
    const proxima = campanha.cenas.find((c) => c.id !== idRemover)!;
    setCampanha((c) => ({
      ...c,
      cenas: c.cenas.filter((cena) => cena.id !== idRemover),
      cenaAtivaId: proxima.id,
      cena: proxima.nome,
      combateAtivo: false,
      turnoId: null,
      rodada: 1,
    }));
    setFerramentaMapa('mover');
    setPreverJogador(false);
    setTokenEmEdicaoId(null);
    localStorage.removeItem(`portal-mestre-cenario3d-v1:${CAMPAIGN_ID}:${idRemover}`);
    await excluirArquivo(chaveMapa(idRemover)).catch(() => undefined);
  }
  function atualizarGrade(changes: Partial<GradeMapa>) {
    atualizarCena((c) => ({
      ...c,
      grade: normalizarGrade({ ...normalizarGrade(c.grade), ...changes }),
    }));
  }
  function alterarCamada(nome: keyof Cena['camadas']) {
    atualizarCena((c) => ({ ...c, camadas: { ...c.camadas, [nome]: !c.camadas[nome] } }));
  }
  function adicionarTokenNaCena(unidade: Unidade) {
    const ponto = gradeAtual.encaixarTokens
      ? encaixarNaGrade({ x: 50, y: 50 }, gradeAtual)
      : { x: 50, y: 50 };
    alterarToken(unidade.id, (p) => ({ ...p, ...ponto }));
  }
  function retirarTokenDaCena(idUnidade: string) {
    if (cenaAtual.tokens[idUnidade]?.travado) {
      setAlerta('Desbloqueie o token antes de retirá-lo da cena.');
      return;
    }
    if (tokenEmEdicaoId === idUnidade) setTokenEmEdicaoId(null);
    atualizarCena((c) => {
      const tokens = { ...c.tokens };
      delete tokens[idUnidade];
      return { ...c, tokens };
    });
  }

  function centralizarNoToken(unidadeId: string) {
    const token = cenaAtual.tokens[unidadeId];
    const palco = mapaRef.current?.getBoundingClientRect();
    const area = viewportRef.current?.getBoundingClientRect();
    if (!token || !palco || !area) {
      setAlerta('Coloque o token na cena para centralizar a câmera.');
      return;
    }
    const delta = deslocamentoParaCentralizarToken(token, palco, area);
    setPan((anterior) => ({ x: anterior.x + delta.x, y: anterior.y + delta.y }));
    setSelecionadoId(unidadeId);
    setTokenEmEdicaoId(unidadeId);
    setFerramentaMapa('mover');
  }

  // Um personagem corresponde a um token por cena. Duplicar cria uma nova unidade
  // independente para a mesa; não duplica ficha vinculada, PDF ou inventário.
  async function duplicarToken(unidade: Unidade) {
    const original = cenaAtual.tokens[unidade.id];
    const cenaOrigemId = cenaAtual.id;
    if (!original || duplicandoTokenRef.current) return;
    duplicandoTokenRef.current = true;
    setDuplicandoToken(true);
    const novoId = id();
    const copiaUnidade: Unidade = {
      ...unidade,
      id: novoId,
      nome: `${unidade.nome} (cópia)`,
      tipo: unidade.tipo === 'jogador' ? 'npc' : unidade.tipo,
      fichaId: undefined,
      temPdf: false,
      iniciativa: 0,
      escudo: 0,
      condicoes: [],
      itens: [],
      skins: skinsValidas(unidade).map((s) => ({ ...s })),
    };
    const imagens: { origem: string; destino: string }[] = [];
    if (unidade.temRetrato)
      imagens.push({ origem: `retrato:${unidade.id}`, destino: `retrato:${novoId}` });
    if (unidade.temToken)
      imagens.push({ origem: `token:${unidade.id}`, destino: `token:${novoId}` });
    for (const skin of skinsValidas(unidade))
      imagens.push({
        origem: chaveImagemSkin(unidade.id, skin.id),
        destino: chaveImagemSkin(novoId, skin.id),
      });
    const escritas: string[] = [];
    try {
      // Copiamos os blobs antes de criar a nova unidade, evitando skins quebradas.
      for (const arquivo of imagens) {
        const blob = await carregarArquivo(arquivo.origem);
        if (!blob) throw new Error('Imagem original ausente');
        await salvarArquivo(arquivo.destino, blob);
        escritas.push(arquivo.destino);
      }
      const tokenCopia = copiarTokenNaCena(original, gradeAtual);
      setCampanha((atual) => ({
        ...atual,
        unidades: [...atual.unidades, copiaUnidade],
        cenas: atual.cenas.map((c) =>
          c.id === cenaOrigemId ? { ...c, tokens: { ...c.tokens, [novoId]: tokenCopia } } : c,
        ),
        registros: [
          ...atual.registros,
          {
            id: id(),
            hora: agora(),
            tipo: 'evento' as const,
            visibilidade: 'mestre' as const,
            texto: `Token de ${unidade.nome} duplicado na cena.`,
          },
        ].slice(-150),
      }));
      setSelecionadoId(novoId);
      setTokenEmEdicaoId(novoId);
      setFiltroTipoToken('todos');
      setRevisaoToken((n) => n + 1);
      setAlerta(
        'Token duplicado. A cópia é uma unidade independente, sem ficha vinculada ou itens.',
      );
    } catch {
      await Promise.all(escritas.map((chave) => excluirArquivo(chave).catch(() => undefined)));
      setAlerta('Não foi possível copiar as imagens do token. Nenhuma unidade foi criada.');
    } finally {
      duplicandoTokenRef.current = false;
      setDuplicandoToken(false);
    }
  }
  function pontoNoMapa(e: ReactPointerEvent<Element>): PontoMapa | null {
    if (!mapaRef.current) return null;
    const r = mapaRef.current.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: limite(((e.clientX - r.left) / r.width) * 100, 0, 100),
      y: limite(((e.clientY - r.top) / r.height) * 100, 0, 100),
    };
  }
  function selecionarMarcador2D(e: ReactPointerEvent<HTMLButtonElement>, marcador: MarcadorCena) {
    if (preverJogador || ferramentaMapa !== 'mover' || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      alternarSelecaoMapa('marcador', marcador.id);
      return;
    }
    setMarcadorSelecionadoId(marcador.id);
    setDesenhoSelecionadoId(null);
    setLuzSelecionadaId(null);
    setBarreiraSelecionadaId(null);
    setTokenEmEdicaoId(null);
    const p = pontoNoMapa(e) || { x: marcador.x, y: marcador.y };
    arrastoMarcadorRef.current = {
      id: marcador.id,
      pointerId: e.pointerId,
      inicioX: e.clientX,
      inicioY: e.clientY,
      movido: false,
      offset: { x: marcador.x - p.x, y: marcador.y - p.y },
      fim: { x: marcador.x, y: marcador.y },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverMarcador2D(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = arrastoMarcadorRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = pontoNoMapa(e);
    if (!p) return;
    if (Math.hypot(e.clientX - d.inicioX, e.clientY - d.inicioY) > 3) d.movido = true;
    if (d.movido) {
      const destino = { x: limite(p.x + d.offset.x, 0, 100), y: limite(p.y + d.offset.y, 0, 100) };
      d.fim = destino;
      setMarcadorPrevia({ id: d.id, ...destino });
    }
    e.stopPropagation();
  }
  function encerrarMarcador2D(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = arrastoMarcadorRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    arrastoMarcadorRef.current = null;
    setMarcadorPrevia(null);
    e.stopPropagation();
    if (d.movido)
      atualizarCena((c) => ({
        ...c,
        marcadores: c.marcadores.map((m) => (m.id === d.id ? { ...m, ...d.fim } : m)),
      }));
  }
  function selecionarLuz2D(
    e: ReactPointerEvent<SVGGElement>,
    luz: { id: string; x: number; y: number },
  ) {
    if (preverJogador || ferramentaMapa !== 'mover' || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      alternarSelecaoMapa('luz', luz.id);
      return;
    }
    setLuzSelecionadaId(luz.id);
    setLuzEdicaoId(luz.id);
    setMarcadorSelecionadoId(null);
    setDesenhoSelecionadoId(null);
    setBarreiraSelecionadaId(null);
    setTokenEmEdicaoId(null);
    const p = pontoNoMapa(e) || { x: luz.x, y: luz.y };
    arrastoLuzRef.current = {
      id: luz.id,
      pointerId: e.pointerId,
      inicioX: e.clientX,
      inicioY: e.clientY,
      movido: false,
      offset: { x: luz.x - p.x, y: luz.y - p.y },
      fim: { x: luz.x, y: luz.y },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverLuz2D(e: ReactPointerEvent<SVGGElement>) {
    const d = arrastoLuzRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = pontoNoMapa(e);
    if (!p) return;
    if (Math.hypot(e.clientX - d.inicioX, e.clientY - d.inicioY) > 3) d.movido = true;
    if (d.movido) {
      const destino = { x: limite(p.x + d.offset.x, 0, 100), y: limite(p.y + d.offset.y, 0, 100) };
      d.fim = destino;
      setLuzPrevia({ id: d.id, ...destino });
    }
    e.stopPropagation();
  }
  function encerrarLuz2D(e: ReactPointerEvent<SVGGElement>) {
    const d = arrastoLuzRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    arrastoLuzRef.current = null;
    setLuzPrevia(null);
    e.stopPropagation();
    if (d.movido)
      atualizarCena((c) => ({
        ...c,
        fontesLuz: (c.fontesLuz ?? []).map((l) => (l.id === d.id ? { ...l, ...d.fim } : l)),
      }));
  }
  function excluirItemSelecionado2D(tipo: 'marcador' | 'desenho' | 'luz', itemId: string) {
    atualizarCena((c) => ({
      ...c,
      marcadores: tipo === 'marcador' ? c.marcadores.filter((x) => x.id !== itemId) : c.marcadores,
      desenhos: tipo === 'desenho' ? (c.desenhos ?? []).filter((x) => x.id !== itemId) : c.desenhos,
      fontesLuz: tipo === 'luz' ? (c.fontesLuz ?? []).filter((x) => x.id !== itemId) : c.fontesLuz,
    }));
    setMarcadorSelecionadoId(null);
    setDesenhoSelecionadoId(null);
    setLuzSelecionadaId(null);
  }
  function iniciarPincel(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.shiftKey) return;
    const p = pontoNoMapa(e);
    if (!p) return;
    if (ferramentaMapa === 'desenhar') {
      const idTraco = id();
      tracoLivreRef.current = { pointerId: e.pointerId, id: idTraco, pontos: [p] };
      setTracoLivrePreview({
        id: idTraco,
        pontos: [p],
        cor: corDesenho,
        espessura: espessuraDesenho,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (ferramentaMapa === 'marcador') {
      adicionarMarcacaoRapida(p);
      e.preventDefault();
      return;
    }
    if (ferramentaMapa === 'luz') {
      atualizarCena((c) => ({
        ...c,
        fontesLuz: [
          ...(c.fontesLuz ?? []),
          {
            id: id(),
            nome: `Luz ${(c.fontesLuz?.length ?? 0) + 1}`,
            x: p.x,
            y: p.y,
            alcance: 17,
            cor: '#ffd48b',
            ativa: true,
          },
        ],
      }));
      setAlerta('Luz colocada. Configure alcance e cor na janela Iluminação.');
      return;
    }
    if (ferramentaMapa === 'parede' || ferramentaMapa === 'porta') {
      barreiraRef.current = { pointerId: e.pointerId, inicio: p, fim: p, tipo: ferramentaMapa };
      setBarreiraRascunho({ inicio: p, fim: p, tipo: ferramentaMapa });
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (!fogManual || !['revelar', 'ocultar'].includes(ferramentaMapa)) return;
    const idTraco = id();
    desenhoRef.current = { pointerId: e.pointerId, idTraco, ultimo: p };
    e.currentTarget.setPointerCapture(e.pointerId);
    atualizarCena((c) => ({
      ...c,
      nevoa: [
        ...c.nevoa.slice(-450),
        {
          id: idTraco,
          acao: ferramentaMapa === 'revelar' ? 'revelar' : 'ocultar',
          pontos: [p],
          raio: raioPincel,
        },
      ],
    }));
    e.preventDefault();
  }
  function moverPincel(e: ReactPointerEvent<HTMLDivElement>) {
    const livre = tracoLivreRef.current;
    if (livre?.pointerId === e.pointerId) {
      const p = pontoNoMapa(e);
      const ultimo = livre.pontos[livre.pontos.length - 1];
      if (p && Math.hypot(p.x - ultimo.x, p.y - ultimo.y) > 0.25 && livre.pontos.length < 500) {
        livre.pontos.push(p);
        setTracoLivrePreview({
          id: livre.id,
          pontos: [...livre.pontos],
          cor: corDesenho,
          espessura: espessuraDesenho,
        });
      }
      return;
    }
    const b = barreiraRef.current;
    if (b?.pointerId === e.pointerId) {
      const p = pontoNoMapa(e);
      if (p) {
        b.fim = p;
        setBarreiraRascunho({ inicio: b.inicio, fim: p, tipo: b.tipo });
      }
      return;
    }
    const d = desenhoRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = pontoNoMapa(e);
    if (!p || Math.hypot(p.x - d.ultimo.x, p.y - d.ultimo.y) < 0.55) return;
    d.ultimo = p;
    atualizarCena((c) => ({
      ...c,
      nevoa: c.nevoa.map((t) =>
        t.id !== d.idTraco ? t : { ...t, pontos: [...t.pontos.slice(-750), p] },
      ),
    }));
  }
  function encerrarPincel() {
    const livre = tracoLivreRef.current;
    if (livre) {
      const pontos = livre.pontos.slice();
      atualizarCena((c) => ({
        ...c,
        desenhos: [
          ...normalizarDesenhos(c.desenhos).slice(-199),
          { id: livre.id, pontos, cor: corDesenho, espessura: espessuraDesenho },
        ],
      }));
      tracoLivreRef.current = null;
      setTracoLivrePreview(null);
      return;
    }
    const b = barreiraRef.current;
    if (b) {
      if (Math.hypot(b.fim.x - b.inicio.x, b.fim.y - b.inicio.y) > 0.7) {
        const novo: BarreiraMapa = {
          id: id(),
          tipo: b.tipo,
          x1: b.inicio.x,
          y1: b.inicio.y,
          x2: b.fim.x,
          y2: b.fim.y,
          aberta: false,
          trancada: false,
        };
        atualizarCena((c) => ({ ...c, barreiras: [...(c.barreiras ?? []), novo] }));
      }
      barreiraRef.current = null;
      setBarreiraRascunho(null);
    }
    desenhoRef.current = null;
  }
  // Manipulação direta de linhas no mapa 2D: o arrasto só é gravado ao soltar.
  function iniciarEdicaoBarreira(
    e: ReactPointerEvent<SVGElement>,
    barreira: BarreiraMapa,
    parte: ParteBarreira,
  ) {
    if (MODO_3D || preverJogador || ferramentaMapa !== 'mover' || e.button !== 0) return;
    if (e.shiftKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      alternarSelecaoMapa('barreira', barreira.id);
      return;
    }
    const inicio = pontoNoMapa(e);
    if (!inicio) return;
    e.stopPropagation();
    e.preventDefault();
    setTokenEmEdicaoId(null);
    setBarreiraSelecionadaId(barreira.id);
    setBarreiraPrevia(null);
    arrastoBarreiraRef.current = { pointerId: e.pointerId, inicio, original: barreira, parte };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverEdicaoBarreira(e: ReactPointerEvent<SVGElement>) {
    const drag = arrastoBarreiraRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const ponto = pontoNoMapa(e);
    if (!ponto) return;
    e.stopPropagation();
    setBarreiraPrevia(arrastarBarreira(drag.original, drag.inicio, ponto, drag.parte));
  }
  function concluirEdicaoBarreira(e: ReactPointerEvent<SVGElement>, salvar = true) {
    const drag = arrastoBarreiraRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const ponto = pontoNoMapa(e);
    if (salvar && ponto) {
      const proxima = arrastarBarreira(drag.original, drag.inicio, ponto, drag.parte);
      if (
        Math.abs(proxima.x1 - drag.original.x1) +
          Math.abs(proxima.y1 - drag.original.y1) +
          Math.abs(proxima.x2 - drag.original.x2) +
          Math.abs(proxima.y2 - drag.original.y2) >
        0.005
      )
        atualizarCena((c) => ({
          ...c,
          barreiras: (c.barreiras ?? []).map((b) => (b.id === proxima.id ? proxima : b)),
        }));
    }
    arrastoBarreiraRef.current = null;
    setBarreiraPrevia(null);
  }
  function alterarBarreiraSelecionada(alterar: (b: BarreiraMapa) => BarreiraMapa) {
    const idBarreira = barreiraSelecionadaId;
    if (!idBarreira) return;
    atualizarCena((c) => ({
      ...c,
      barreiras: (c.barreiras ?? []).map((b) => (b.id === idBarreira ? alterar(b) : b)),
    }));
  }
  function excluirBarreiraSelecionada() {
    if (!barreiraSelecionadaId) return;
    const idBarreira = barreiraSelecionadaId;
    atualizarCena((c) => ({
      ...c,
      barreiras: (c.barreiras ?? []).filter((b) => b.id !== idBarreira),
    }));
    arrastoBarreiraRef.current = null;
    setBarreiraPrevia(null);
    setBarreiraSelecionadaId(null);
  }
  async function validarGifImportado(arquivo: File): Promise<void> {
    // Rejeita GIFs pesados/truncados ANTES de substituir a arte anterior.
    if (arquivo.type === 'image/gif') decodificarGifIdle(await arquivo.arrayBuffer());
  }
  async function importarToken(arquivo?: File) {
    if (!selecionado || !arquivo) return;
    const aviso = validarImagemSkin(arquivo);
    if (aviso) {
      setAlerta(aviso);
      return;
    }
    try {
      if (arquivo.type === 'image/gif') await validarGifImportado(arquivo);
      await salvarArquivo(`token:${selecionado.id}`, await otimizarImagemSkin(arquivo));
      atualizarUnidade(selecionado.id, (u) => ({
        ...u,
        temToken: true,
        tokenIdleGif: arquivo.type === 'image/gif',
      }));
      setRevisaoToken((x) => x + 1);
      setAlerta(
        arquivo.type === 'image/gif'
          ? 'Idle do token original atualizado.'
          : 'Imagem original do token atualizada.',
      );
    } catch (erro) {
      setAlerta(
        erro instanceof Error ? erro.message : 'Não foi possível salvar a imagem do token.',
      );
    }
  }
  async function adicionarSkinToken(arquivo?: File, nomeForcado?: string) {
    if (!selecionado || !arquivo) return;
    const aviso = validarImagemSkin(arquivo);
    if (aviso) {
      setAlerta(aviso);
      if (nomeForcado) throw Error(aviso);
      return;
    }
    const unidadeId = selecionado.id;
    if (skinsValidas(selecionado).length >= 16) {
      setAlerta('Cada personagem pode ter até 16 skins extras.');
      if (nomeForcado) throw Error('Limite de 16 skins por personagem.');
      return;
    }
    const nome = (
      nomeForcado?.trim() ||
      nomeNovaSkin.trim() ||
      arquivo.name.replace(/\.[^.]+$/, '') ||
      'Skin alternativa'
    ).slice(0, 60);
    const novaSkin = { id: id(), nome, idleGif: arquivo.type === 'image/gif' };
    try {
      if (arquivo.type === 'image/gif') await validarGifImportado(arquivo);
      await salvarArquivo(
        chaveImagemSkin(unidadeId, novaSkin.id),
        await otimizarImagemSkin(arquivo),
      );
      setCampanha((c) => ({
        ...c,
        unidades: c.unidades.map((u) =>
          u.id === unidadeId ? { ...u, skins: [...skinsValidas(u), novaSkin] } : u,
        ),
        cenas: c.cenas.map((cena) =>
          cena.id === c.cenaAtivaId && cena.tokens[unidadeId]
            ? {
                ...cena,
                tokens: {
                  ...cena.tokens,
                  [unidadeId]: { ...cena.tokens[unidadeId], skinId: novaSkin.id },
                },
              }
            : cena,
        ),
      }));
      setRevisaoToken((v) => v + 1);
      setNomeNovaSkin('');
      setAlerta(`Skin “${nome}” adicionada ao personagem.`);
    } catch (erro) {
      setAlerta(
        erro instanceof Error
          ? erro.message
          : 'Não foi possível salvar esta skin. Verifique o armazenamento disponível.',
      );
      if (nomeForcado) throw erro;
    }
  }
  function definirPreferenciaIdle(
    unidadeId: string,
    skinId: string,
    propriedade: 'idlePausado' | 'idleVelocidade',
    valor: boolean | number,
  ) {
    atualizarUnidade(unidadeId, (u) =>
      skinId === TOKEN_ORIGINAL
        ? {
            ...u,
            [propriedade === 'idlePausado' ? 'tokenIdlePausado' : 'tokenIdleVelocidade']:
              propriedade === 'idleVelocidade' ? velocidadeIdle(valor) : valor,
          }
        : {
            ...u,
            skins: skinsValidas(u).map((s) =>
              s.id === skinId
                ? {
                    ...s,
                    [propriedade]: propriedade === 'idleVelocidade' ? velocidadeIdle(valor) : valor,
                  }
                : s,
            ),
          },
    );
  }
  async function arquivoTokenAtual(): Promise<{ nome: string; blob: Blob }> {
    if (!selecionado) throw Error('Selecione um personagem.');
    const ativo = skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]);
    const blob = await carregarArquivo(
      ativo === TOKEN_ORIGINAL ? `token:${selecionado.id}` : chaveImagemSkin(selecionado.id, ativo),
    );
    if (!blob) throw Error('Arquivo do token não encontrado no armazenamento.');
    return {
      nome:
        ativo === TOKEN_ORIGINAL
          ? `${selecionado.nome} · Original`
          : skinsValidas(selecionado).find((s) => s.id === ativo)?.nome || selecionado.nome,
      blob,
    };
  }
  function tornarSkinPadrao(unidadeId: string, skinId: string) {
    atualizarUnidade(unidadeId, (u) => ({ ...u, skinPadraoId: skinId }));
    setAlerta('Skin padrão atualizada para as cenas sem skin específica.');
  }
  async function excluirSkinToken(unidadeId: string, skinId: string) {
    const unidade = campanha.unidades.find((u) => u.id === unidadeId);
    if (!unidade || !skinsValidas(unidade).some((s) => s.id === skinId)) return;
    try {
      await excluirArquivo(chaveImagemSkin(unidadeId, skinId));
      setCampanha((c) => ({
        ...c,
        unidades: c.unidades.map((u) => (u.id === unidadeId ? removerSkinUnidade(u, skinId) : u)),
        cenas: c.cenas.map((cena) =>
          cena.tokens[unidadeId]
            ? {
                ...cena,
                tokens: {
                  ...cena.tokens,
                  [unidadeId]: limparSkinNoToken(cena.tokens[unidadeId], skinId),
                },
              }
            : cena,
        ),
      }));
      setSkinParaExcluir(null);
      setRevisaoToken((v) => v + 1);
      setAlerta('Skin excluída. Tokens que a utilizavam retornaram à skin padrão.');
    } catch {
      setAlerta('Não foi possível excluir a skin. Nenhuma referência foi alterada.');
    }
  }
  // Mesma lista persistente usada pela janela Rolagens e pelo histórico da Mesa 3D.
  // Cada sorteio do servidor é registrado apenas uma vez, inclusive após reconexões.
  function receberRolagensMultiplayer(rolagens: RolagemCompartilhada[]) {
    setCampanha((atual) => {
      const registros = incorporarRolagensMultiplayer(atual.registros, rolagens);
      return registros === atual.registros ? atual : { ...atual, registros };
    });
  }
  function adicionarRegistro(
    texto: string,
    tipo: Registro['tipo'] = 'evento',
    visibilidade: VisibilidadeRolagem = 'publica',
    iconeAcao?: string,
  ) {
    setCampanha((c) => ({
      ...c,
      registros: [
        ...c.registros,
        {
          id: id(),
          hora: agora(),
          texto,
          tipo,
          visibilidade,
          iconeAcao: normalizarIconeAcao(iconeAcao),
        },
      ].slice(-150),
    }));
  }
  function valorPermitido(unidade: Unidade, campo: 'hp' | 'mana', novo: number) {
    // HP não ultrapassa o máximo. Mana/Foco não tem teto no sistema Ímpeto.
    const valor = Number.isFinite(novo) ? Math.max(0, Math.trunc(novo)) : 0;
    return campo === 'hp' ? Math.min(valor, unidade.hpMax) : valor;
  }
  function alterarRecurso(campo: 'hp' | 'mana', quantidade: number) {
    if (!usaRegrasImpeto || !selecionado || !Number.isFinite(quantidade)) return;
    if (campo === 'hp' && quantidade < 0) {
      const resultado = aplicarDanoComEscudo(selecionado.hp, selecionado.escudo ?? 0, -quantidade);
      atualizarUnidade(selecionado.id, (u) => {
        const d = aplicarDanoComEscudo(u.hp, u.escudo ?? 0, -quantidade);
        return { ...u, hp: d.hp, escudo: d.escudo };
      });
      adicionarRegistro(
        `${selecionado.nome}: ${-quantidade} de dano; escudo absorveu ${resultado.absorvido}; HP perdeu ${resultado.danoHp}.`,
      );
    } else {
      atualizarUnidade(selecionado.id, (u) => ({
        ...u,
        [campo]: valorPermitido(u, campo, u[campo] + quantidade),
      }));
      adicionarRegistro(
        `${selecionado.nome}: ${campo === 'hp' ? 'HP' : fichas.some((f) => f.id === selecionado.fichaId && f.dados.impeto) ? 'Energia' : 'Mana/Foco'} ${quantidade > 0 ? '+' : ''}${quantidade}.`,
      );
    }
  }
  function aplicarVariacao(campo: 'hp' | 'mana', operacao: 'adicionar' | 'reduzir') {
    if (!usaRegrasImpeto || !selecionado) return;
    const texto = campo === 'hp' ? variacaoHp : variacaoMana;
    if (!/^\d+$/.test(texto.trim())) {
      setAlerta('Informe uma quantidade inteira válida para adicionar ou reduzir.');
      return;
    }
    const valor = Number(texto);
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      setAlerta('Informe uma quantidade inteira maior que zero.');
      return;
    }
    if (campo === 'hp' && operacao === 'reduzir') {
      const resultado = aplicarDanoComEscudo(selecionado.hp, selecionado.escudo ?? 0, valor);
      atualizarUnidade(selecionado.id, (u) => {
        const d = aplicarDanoComEscudo(u.hp, u.escudo ?? 0, valor);
        return { ...u, hp: d.hp, escudo: d.escudo };
      });
      adicionarRegistro(
        `${selecionado.nome}: ${valor} de dano · escudo absorveu ${resultado.absorvido} · HP ${selecionado.hp} → ${resultado.hp}.`,
      );
    } else {
      const anterior = selecionado[campo];
      const novo = valorPermitido(
        selecionado,
        campo,
        anterior + (operacao === 'adicionar' ? valor : -valor),
      );
      atualizarUnidade(selecionado.id, (u) => ({
        ...u,
        [campo]: valorPermitido(u, campo, u[campo] + (operacao === 'adicionar' ? valor : -valor)),
      }));
      const real = Math.abs(novo - anterior);
      adicionarRegistro(
        `${selecionado.nome}: ${campo === 'hp' ? 'HP' : fichas.some((f) => f.id === selecionado.fichaId && f.dados.impeto) ? 'Energia' : 'Mana/Foco'} ${operacao === 'adicionar' ? '+' : '−'}${real} (${anterior} → ${novo})${real !== valor ? ' · ajustado ao limite permitido' : ''}.`,
      );
    }
    if (campo === 'hp') setVariacaoHp('');
    else setVariacaoMana('');
    setAlerta('');
  }
  function definirRecurso(campo: 'hp' | 'mana') {
    if (!usaRegrasImpeto || !selecionado) return;
    const texto = campo === 'hp' ? ajusteHp : ajusteMana;
    if (!/^\d+$/.test(texto.trim())) {
      setAlerta('Digite um valor inteiro válido, igual ou maior que zero.');
      return;
    }
    const numero = Number(texto);
    if (!Number.isSafeInteger(numero)) {
      setAlerta('Digite um número inteiro representável com segurança.');
      return;
    }
    atualizarUnidade(selecionado.id, (u) => ({ ...u, [campo]: valorPermitido(u, campo, numero) }));
    adicionarRegistro(
      `${selecionado.nome}: ${campo === 'hp' ? 'HP' : fichas.some((f) => f.id === selecionado.fichaId && f.dados.impeto) ? 'Energia' : 'Mana/Foco'} definido para ${campo === 'hp' ? Math.min(numero, selecionado.hpMax) : numero}.`,
    );
    if (campo === 'hp') setAjusteHp('');
    else setAjusteMana('');
    setAlerta('');
  }
  function ajustarEscudo(modo: 'conceder' | 'definir' | 'zerar') {
    if (!usaRegrasImpeto || !selecionado) return;
    if (
      modo !== 'zerar' &&
      (!/^\d+$/.test(ajusteEscudo.trim()) ||
        !Number.isSafeInteger(Number(ajusteEscudo)) ||
        Number(ajusteEscudo) > 99999)
    ) {
      setAlerta('Informe um valor inteiro de escudo entre 0 e 99999.');
      return;
    }
    const valor = modo === 'zerar' ? 0 : Number(ajusteEscudo);
    const novo = modo === 'conceder' ? concederEscudo(selecionado.escudo ?? 0, valor) : valor;
    atualizarUnidade(selecionado.id, (u) => ({
      ...u,
      escudo: modo === 'conceder' ? concederEscudo(u.escudo ?? 0, valor) : valor,
    }));
    adicionarRegistro(
      `${selecionado.nome}: escudo ${modo === 'conceder' ? 'concedido (não acumula)' : 'definido'} para ${novo}.`,
    );
    setAjusteEscudo('');
    setAlerta('');
  }
  /** Publica uma nota/imagem no catálogo e opcionalmente entrega uma cópia ao personagem escolhido. */
  function criarItemDoDiario(pagina: PaginaDiario, destinatarioId?: string): string {
    const documento = campanha.paginasDiario.find((p) => p.id === pagina.id);
    if (!documento || documento.tipo === 'pasta')
      throw new Error('Este documento não está disponível no Diário da campanha.');
    const destinatario = destinatarioId
      ? campanha.unidades.find((u) => u.id === destinatarioId && u.tipo === 'jogador')
      : null;
    if (destinatarioId && !destinatario)
      throw new Error('O personagem escolhido não está disponível para receber itens.');
    const item = publicarItemDoDiario(documento, CAMPAIGN_ID);
    if (destinatario) {
      setCampanha((c) => ({
        ...c,
        unidades: c.unidades.map((u) =>
          u.id === destinatario.id
            ? { ...u, itens: adicionarItemInventario(u.itens || [], item, 1) }
            : u,
        ),
      }));
      adicionarRegistro(
        `${destinatario.nome} recebeu o documento ${item.nome} do Diário.`,
        'evento',
        'mestre',
      );
    }
    return item.nome;
  }
  function entregarItem(item: ModeloItem, quantidade: number) {
    if (!selecionado) return;
    atualizarUnidade(selecionado.id, (u) => ({
      ...u,
      itens: adicionarItemInventario(u.itens || [], item, quantidade),
    }));
    adicionarRegistro(
      `${selecionado.nome} recebeu ${quantidade} × ${item.nome}.`,
      'evento',
      'mestre',
    );
  }
  function mudarQuantidadeItem(itemId: string, quantidade: number) {
    if (!selecionado || !Number.isSafeInteger(quantidade)) return;
    const ajustada = Math.min(9999, Math.max(1, quantidade));
    atualizarUnidade(selecionado.id, (u) => ({
      ...u,
      itens: (u.itens || []).map((x) => (x.id === itemId ? { ...x, quantidade: ajustada } : x)),
    }));
  }
  function transferirItem(itemId: string, destinatarioId: string, quantidade: number): boolean {
    if (!selecionado || selecionado.id === destinatarioId) {
      setAlerta('Escolha outro personagem para receber o item.');
      return false;
    }
    const destino = campanha.unidades.find((u) => u.id === destinatarioId && u.tipo === 'jogador');
    if (!destino) {
      setAlerta('Selecione um personagem de jogador válido desta campanha.');
      return false;
    }
    try {
      const movimento = transferirItemInventario(
        selecionado.itens || [],
        destino.itens || [],
        itemId,
        quantidade,
      );
      // Atualização atômica: remover da origem e adicionar ao destino na mesma mudança.
      setCampanha((c) => ({
        ...c,
        unidades: c.unidades.map((u) =>
          u.id === selecionado.id
            ? { ...u, itens: movimento.origem }
            : u.id === destinatarioId
              ? { ...u, itens: movimento.destino }
              : u,
        ),
      }));
      adicionarRegistro(
        `${selecionado.nome} entregou ${quantidade} × ${movimento.item.nome} para ${destino.nome}.`,
        'evento',
        'mestre',
      );
      setAlerta('');
      return true;
    } catch (e) {
      setAlerta(e instanceof Error ? e.message : 'Não foi possível transferir o item.');
      return false;
    }
  }
  function removerItem(itemId: string) {
    if (!selecionado) return;
    const item = selecionado.itens?.find((x) => x.id === itemId);
    atualizarUnidade(selecionado.id, (u) => ({
      ...u,
      itens: (u.itens || []).filter((x) => x.id !== itemId),
    }));
    if (item)
      adicionarRegistro(
        `${selecionado.nome}: ${item.nome} retirado do inventário.`,
        'evento',
        'mestre',
      );
  }
  function concluirUsoItem(unidadeId: string, itemId: string, total: number) {
    const unidade = campanha.unidades.find((u) => u.id === unidadeId);
    const item = unidade?.itens?.find((x) => x.id === itemId);
    if (!unidade || !item || item.quantidade <= 0) return;
    const valor = Math.max(0, Math.trunc(total) || 0);
    let resultado = '';
    if (usaRegrasImpeto) {
      if (item.efeito === 'cura') {
        const ganho = Math.min(valor, Math.max(0, unidade.hpMax - unidade.hp));
        resultado = `recuperou ${ganho} HP`;
      } else if (item.efeito === 'mana') resultado = `recuperou ${valor} Mana/Foco`;
      else if (item.efeito === 'escudo')
        resultado = `recebeu escudo ${valor} (mantém o maior, sem acumular)`;
      else if (item.efeito === 'dano')
        resultado = `rolou ${valor} de dano (aplicar manualmente ao alvo)`;
      else resultado = 'utilizou um item narrativo';
    } else resultado = 'usou item narrativo (sem aplicar regras de combate)';
    atualizarUnidade(unidadeId, (u) => {
      const temItem = (u.itens || []).some((x) => x.id === itemId && x.quantidade > 0);
      if (!temItem) return u;
      const proximo = {
        ...u,
        itens: item.consumivel ? consumirItem(u.itens || [], itemId) : u.itens || [],
      };
      if (!usaRegrasImpeto) return proximo;
      if (item.efeito === 'cura') return { ...proximo, hp: valorPermitido(u, 'hp', u.hp + valor) };
      if (item.efeito === 'mana')
        return { ...proximo, mana: valorPermitido(u, 'mana', u.mana + valor) };
      if (item.efeito === 'escudo')
        return { ...proximo, escudo: concederEscudo(u.escudo ?? 0, valor) };
      return proximo;
    });
    adicionarRegistro(
      `${unidade.nome} usou ${item.nome}: ${resultado}.${item.consumivel ? ' 1 unidade consumida.' : ''}`,
    );
  }
  /** Usa a mesma regra do inventário, mas sempre no personagem indicado (não na ficha selecionada). */
  function usarItemDaUnidade(unidadeId: string, itemRecebido: ItemInventario) {
    const unidade = campanha.unidades.find((u) => u.id === unidadeId);
    const item = unidade?.itens?.find((x) => x.id === itemRecebido.id);
    if (!unidade || !item || item.quantidade <= 0) return;
    if (!usaRegrasImpeto || item.efeito === 'nenhum') {
      concluirUsoItem(unidadeId, item.id, 0);
      return;
    }
    const efeito = analisarValorItem(item.valor);
    if (!efeito) {
      setAlerta(
        'Configure o valor do item no catálogo e entregue a versão atualizada ao personagem.',
      );
      return;
    }
    if (efeito.tipo === 'fixo') concluirUsoItem(unidadeId, item.id, efeito.valor);
    else {
      try {
        exibirDado(
          efeito.formula,
          rolar(efeito.formula),
          `${unidade.nome} · ${item.nome}`,
          undefined,
          { unidadeId, itemId: item.id },
        );
        setAlerta('');
      } catch (e) {
        setAlerta(e instanceof Error ? e.message : 'Não foi possível rolar o item.');
      }
    }
  }
  function usarItem(item: ItemInventario) {
    if (selecionado) usarItemDaUnidade(selecionado.id, item);
  }
  /** Recebe solicitações autenticadas pelo servidor; o mestre valida o estoque REAL.
   * Uma alteração atômica no armazenamento compartilhado é a fonte de verdade.
   */
  async function atenderPedidoItemMultiplayer(
    pedido: PedidoItemCompartilhado,
  ): Promise<{ ok: boolean; mensagem: string }> {
    if (!['usar', 'transferir'].includes(pedido.operacao) || !pedido.pedidoId)
      return { ok: false, mensagem: 'Pedido inválido.' };
    let mensagem = 'Não foi possível processar o item.';
    try {
      const salvo = alterarMesaCompartilhada(CAMPAIGN_ID, (raw) => {
        const unidades = raw.unidades as Unidade[];
        const origem = unidades.find((u) => u.id === pedido.personagemId && u.tipo === 'jogador');
        if (!origem) {
          mensagem = 'Personagem não encontrado na campanha.';
          return false;
        }
        const item = (origem.itens || []).find((i) => i.id === pedido.itemId && i.quantidade > 0);
        if (!item) {
          mensagem = 'O item não está mais disponível.';
          return false;
        }
        const chaveRegistro = `mp-item-${pedido.pedidoId}`;
        const registros = Array.isArray(raw.registros) ? (raw.registros as Registro[]) : [];
        if (registros.some((r) => r.id === chaveRegistro)) {
          mensagem = 'Este pedido já foi processado.';
          return false;
        }
        let texto = '';
        let tipoRegistro: Registro['tipo'] = 'evento';
        if (pedido.operacao === 'transferir') {
          const destino = unidades.find(
            (u) => u.id === pedido.destinatarioId && u.tipo === 'jogador' && u.id !== origem.id,
          );
          if (!destino) {
            mensagem = 'Destinatário indisponível.';
            return false;
          }
          try {
            const movimento = transferirItemInventario(
              origem.itens || [],
              destino.itens || [],
              item.id,
              pedido.quantidade,
            );
            origem.itens = movimento.origem;
            destino.itens = movimento.destino;
            texto = `${origem.nome} entregou ${pedido.quantidade} × ${item.nome} para ${destino.nome} (multiplayer).`;
            mensagem = `${pedido.quantidade} × ${item.nome} transferido para ${destino.nome}.`;
          } catch (e) {
            mensagem = e instanceof Error ? e.message : 'Transferência recusada.';
            return false;
          }
        } else {
          if (item.categoria === 'documento') {
            mensagem = 'Documentos são para leitura e não podem ser consumidos.';
            return false;
          }
          const efeito = item.efeito !== 'nenhum' ? analisarValorItem(item.valor) : null;
          if (item.efeito !== 'nenhum' && !efeito) {
            mensagem = 'O valor do item está inválido no inventário do mestre.';
            return false;
          }
          let valor = 0,
            rolagem = '';
          if (efeito?.tipo === 'fixo') valor = efeito.valor;
          if (efeito?.tipo === 'dados') {
            const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(efeito.formula);
            if (!match) {
              mensagem = 'Fórmula inválida.';
              return false;
            }
            const quantidade = Number(match[1]),
              faces = Number(match[2]),
              modificador = Number(match[3] || 0);
            const valores: number[] = [];
            for (let i = 0; i < quantidade; i++) {
              // Sorteio no mestre, nunca com valores escolhidos pelo convidado.
              const limite = Math.floor(4294967296 / faces) * faces;
              let sorteio: number;
              do {
                sorteio = crypto.getRandomValues(new Uint32Array(1))[0];
              } while (sorteio >= limite);
              valores.push((sorteio % faces) + 1);
            }
            valor = Math.max(
              0,
              valores.reduce((a, b) => a + b, modificador),
            );
            rolagem = `${efeito.formula} [${valores.join(', ')}]${modificador ? ` ${modificador > 0 ? '+' : '−'} ${Math.abs(modificador)}` : ''} = ${valor}`;
            tipoRegistro = 'dado';
          }
          if (usaRegrasImpeto) {
            if (item.efeito === 'cura')
              origem.hp = Math.min(origem.hpMax, Math.max(0, origem.hp + valor));
            if (item.efeito === 'mana') origem.mana = Math.max(0, origem.mana + valor);
            if (item.efeito === 'escudo') origem.escudo = concederEscudo(origem.escudo || 0, valor);
          }
          if (item.consumivel) origem.itens = consumirItem(origem.itens || [], item.id);
          const resumo =
            item.efeito === 'dano'
              ? 'dano para aplicar manualmente'
              : item.efeito === 'nenhum'
                ? 'uso narrativo'
                : `efeito ${item.efeito}`;
          texto = `${origem.nome} usou ${item.nome} (${resumo})${rolagem ? ` · ${rolagem}` : valor ? ` · ${valor}` : ''}${item.consumivel ? ' · 1 consumido' : ''}.`;
          mensagem = `${item.nome} usado${rolagem ? ` · resultado ${valor}` : valor ? ` · valor ${valor}` : ''}.`;
        }
        raw.registros = [
          ...registros,
          {
            id: chaveRegistro,
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            texto,
            tipo: tipoRegistro,
            visibilidade: 'publica',
          },
        ].slice(-150);
        return true;
      });
      if (!salvo) return { ok: false, mensagem };
      // A aplicação também atualiza o painel local e o publicador das fichas/inventários.
      setCampanha(estadoInicial());
      setAlerta('');
      return { ok: true, mensagem };
    } catch (e) {
      return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha ao salvar o item.' };
    }
  }
  // v0401: solicita um lancamento; nao sorteia dados antes do motor 3D.
  function exibirDado(
    expressao: string,
    resultado: ResultadoDados,
    autor: string,
    iniciativaId?: string,
    usoItem?: UsoItemPendente,
    iconeAcao?: string,
  ) {
    const visibilidade = visibilidadeRolagem;
    setFilaRolagens((fila) => [
      ...fila,
      {
        id: id(),
        formula: expressao,
        ...resultado,
        autor,
        visibilidade,
        pendente: true,
        iniciativaId,
        usoItem,
        iconeAcao: normalizarIconeAcao(iconeAcao),
      },
    ]);
  }
  function concluirRolagemFisica(rolagemId: string, valores: number[]) {
    const atual = rolagemDestacada;
    if (!atual || atual.id !== rolagemId || !atual.pendente) return;
    if (valores.length !== atual.valores.length) {
      setErro('O motor 3D retornou uma quantidade inesperada de dados.');
      setRolagemDestacada(null);
      return;
    }
    if (valores.some((v) => !Number.isInteger(v) || v < 1 || v > atual.faces)) {
      setErro('O motor 3D retornou uma face invalida.');
      setRolagemDestacada(null);
      return;
    }
    const total = valores.reduce((soma, v) => soma + v, atual.modificador);
    // O resultado do Dice Box original é publicado, não re-sorteado no servidor.
    void publicarRolagemMestre(
      CAMPAIGN_ID,
      atual.id,
      atual.formula,
      valores,
      atual.autor,
      atual.visibilidade,
      atual.iniciativaId ? 'Iniciativa' : 'Rolagem livre',
    ).catch((falha) =>
      console.warn('[Portal/Multiplayer] Rolagem do mestre não sincronizada:', falha),
    );
    const modificador = atual.modificador;
    const parte = modificador
      ? ' ' + (modificador > 0 ? '+' : '−') + ' ' + Math.abs(modificador)
      : '';
    const detalhes = '[' + valores.join(', ') + ']' + parte;
    adicionarRegistro(
      atual.iniciativaId
        ? 'Iniciativa de ' +
            atual.autor +
            ': ' +
            total +
            (atual.visibilidade === 'mestre' ? ' (reservada ao mestre).' : ' (publica).')
        : atual.autor + ' rolou ' + atual.formula + ': ' + detalhes + ' = ' + total,
      'dado',
      atual.visibilidade,
      atual.iconeAcao,
    );
    if (atual.iniciativaId) {
      atualizarUnidade(atual.iniciativaId, (u) => ({ ...u, iniciativa: total }));
    }
    if (atual.usoItem) concluirUsoItem(atual.usoItem.unidadeId, atual.usoItem.itemId, total);
    setRolagemDestacada((antiga) =>
      antiga?.id === rolagemId
        ? {
            ...antiga,
            total,
            detalhes,
            valores,
            pendente: false,
          }
        : antiga,
    );
    setErro('');
  }
  function lancarDados(expressao = formula, nome?: string, iconeAcao?: string) {
    try {
      exibirDado(expressao, rolar(expressao), nome || 'Mestre', undefined, undefined, iconeAcao);
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Expressao invalida.');
    }
  }
  function rolarIniciativa(unidade: Unidade) {
    exibirDado('1d20', rolar('1d20'), unidade.nome, unidade.id);
  }
  function alterarEntradaIniciativa(unidadeId: string, incluir: boolean) {
    const unidade = campanha.unidades.find((u) => u.id === unidadeId);
    if (!unidade) return;
    setCampanha((c) => {
      const cena = c.cenas.find((cn) => cn.id === c.cenaAtivaId);
      const novasIds = alterarParticipanteIniciativa(
        cena?.participantesIniciativa ?? [],
        unidadeId,
        incluir,
      );
      const listaAnterior = ordenarParticipantesIniciativa(
        c.unidades,
        cena?.participantesIniciativa,
      );
      const listaNova = ordenarParticipantesIniciativa(c.unidades, novasIds);
      const mudouTurno = c.turnoId && !novasIds.includes(c.turnoId);
      return {
        ...c,
        cenas: c.cenas.map((cn) =>
          cn.id === c.cenaAtivaId ? { ...cn, participantesIniciativa: novasIds } : cn,
        ),
        turnoId:
          c.combateAtivo && mudouTurno
            ? turnoAposRetirada(listaAnterior, listaNova, c.turnoId, unidadeId)
            : c.turnoId,
        combateAtivo: c.combateAtivo && listaNova.length > 0,
        rodada: c.combateAtivo && !listaNova.length ? 1 : c.rodada,
      };
    });
    adicionarRegistro(
      `${unidade.nome} ${incluir ? 'entrou na iniciativa' : 'saiu da iniciativa'} da cena ${cenaAtual.nome}.`,
      'evento',
      'mestre',
    );
  }
  function adicionarTodosDaCenaNaIniciativa() {
    const ids = campanha.unidades.filter((u) => !!cenaAtual.tokens[u.id]).map((u) => u.id);
    atualizarCena((c) => ({
      ...c,
      participantesIniciativa: normalizarParticipantesIniciativa([
        ...(c.participantesIniciativa ?? []),
        ...ids,
      ]),
    }));
    adicionarRegistro(
      `${ids.length} token(s) da cena incluído(s) na iniciativa pelo mestre.`,
      'evento',
      'mestre',
    );
  }
  function iniciarCombate() {
    if (!ordenados.length) return;
    setCampanha((c) => {
      const primeiro =
        ordenarParticipantesIniciativa(
          c.unidades,
          c.cenas.find((cn) => cn.id === c.cenaAtivaId)?.participantesIniciativa,
        )[0]?.id ?? null;
      return {
        ...c,
        combateAtivo: true,
        rodada: 1,
        turnoId: primeiro,
        unidades: c.unidades.map((u) => {
          const ficha = fichas.find((f) => f.id === u.fichaId)?.dados.impeto;
          if (!usaRegrasImpeto || !ficha) return u;
          let turno = iniciarRodada(prepararTurnoA01(u.id, u, ficha), 1);
          if (u.id === primeiro) turno = iniciarAtivacao(turno, u.chefe === true);
          return { ...u, turnoImpeto: turno, mana: turno.estatisticas.energiaAtual };
        }),
      };
    });
    adicionarRegistro(
      usaRegrasImpeto ? 'Combate iniciado. Rodada 1.' : 'Ordem de turnos iniciada. Rodada 1.',
    );
  }
  function proximoTurno() {
    if (!campanha.combateAtivo || !ordenados.length) return;
    if (
      campanha.unidades.find((u) => u.id === campanha.turnoId)?.turnoImpeto?.atordoamento
        .escapePendente
    ) {
      setAlerta('Resolva o escape do atordoamento C02 na ficha antes de avançar o turno.');
      return;
    }
    const idx = ordenados.findIndex((u) => u.id === campanha.turnoId);
    const proximo = ordenados[(idx + 1) % ordenados.length];
    const viraRodada = idx === ordenados.length - 1;
    setCampanha((c) => ({
      ...c,
      turnoId: proximo.id,
      rodada: c.rodada + (viraRodada ? 1 : 0),
      unidades: !usaRegrasImpeto
        ? c.unidades
        : c.unidades.map((u) => {
            let proxima =
              u.id === c.turnoId
                ? {
                    ...u,
                    condicoes: u.condicoes
                      .map((cond) => ({ ...cond, turnos: cond.turnos - 1 }))
                      .filter((cond) => cond.turnos > 0),
                  }
                : u;
            const ficha = fichas.find((f) => f.id === u.fichaId)?.dados.impeto;
            if (!ficha) return proxima;
            try {
              let turno = sincronizarRecursosTurno(
                proxima.turnoImpeto ?? prepararTurnoA01(u.id, proxima, ficha),
                proxima,
              );
              if (viraRodada && turno.rodada < c.rodada + 1)
                turno = iniciarRodada(turno, c.rodada + 1);
              if (u.id === proximo.id) turno = iniciarAtivacao(turno, u.chefe === true);
              proxima = { ...proxima, turnoImpeto: turno, mana: turno.estatisticas.energiaAtual };
            } catch {
              /* Escape C02 pendente: mestre deve resolver antes de renovar a ativação. */
            }
            return proxima;
          }),
    }));
    adicionarRegistro(
      `Turno de ${proximo.nome}${viraRodada ? ` · rodada ${campanha.rodada + 1}` : ''}.`,
    );
  }
  function encerrarCombate() {
    setCampanha((c) => ({ ...c, combateAtivo: false, turnoId: null, rodada: 1 }));
    adicionarRegistro(usaRegrasImpeto ? 'Combate encerrado.' : 'Ordem de turnos encerrada.');
  }
  function corElemento(elemento: string) {
    return (
      (
        {
          fogo: '#dc8061',
          agua: '#5c9fc8',
          terra: '#91a46d',
          ar: '#a4c6bd',
          nao: '#b49acb',
        } as Record<string, string>
      )[elemento] || '#cbb16f'
    );
  }
  function descricaoFicha(f: FichaRegistro) {
    const nomes: Record<string, string> = {
      fogo: 'Fogo',
      agua: 'Água',
      terra: 'Terra',
      ar: 'Ar',
      nao: 'Não dobrador',
    };
    const classes: Record<string, string> = {
      lutador: 'Lutador',
      frente: 'Linha de Frente',
      conjurador: 'Conjurador',
    };
    return `${nomes[f.dados.element] || f.dados.element} · ${classes[f.dados.class] || f.dados.class}`;
  }
  async function retratoDaFicha(f: FichaRegistro, unidadeId: string) {
    if (!f.dados.photo) return;
    try {
      const bin = await fetch(f.dados.photo).then((r) => r.blob());
      await salvarArquivo(`retrato:${unidadeId}`, bin);
      atualizarUnidade(unidadeId, (u) => ({ ...u, temRetrato: true }));
    } catch {
      setAlerta('A ficha foi vinculada, mas o retrato não pôde ser importado.');
    }
  }
  async function aplicarTokenPadraoDaFicha(
    f: FichaRegistro,
    unidadeId: string,
    substituir = false,
  ) {
    if (!f.dados.temTokenPadrao) return;
    try {
      const blob = await copiarTokenDaFicha(
        f.id,
        unidadeId,
        chaveArquivoCampanha(CAMPAIGN_ID, `token:${unidadeId}`),
      );
      if (!blob) return;
      setCampanha((c) => ({
        ...c,
        unidades: c.unidades.map((u) =>
          u.id === unidadeId && (!u.temToken || substituir)
            ? { ...u, temToken: true, tokenIdleGif: blob.type === 'image/gif' }
            : u,
        ),
      }));
      setRevisaoToken((v) => v + 1);
    } catch {
      setAlerta(
        `A ficha de ${f.nome} entrou na mesa, mas não foi possível carregar seu token padrão.`,
      );
    }
  }
  function colocarFichaNaMesa(f: FichaRegistro) {
    const metaSistema = obterCampanha(CAMPAIGN_ID);
    if (!metaSistema || !fichaCompativel(f, metaSistema)) {
      setAlerta('A ficha pertence a um sistema diferente do selecionado nesta campanha.');
      return;
    }
    const vincular = () => {
      try {
        const meta = obterCampanha(CAMPAIGN_ID);
        if (meta && !meta.fichaIds.includes(f.id))
          atualizarCampanha(CAMPAIGN_ID, { fichaIds: [...meta.fichaIds, f.id] });
      } catch {
        setAlerta(
          'Não foi possível registrar o vínculo na campanha; a unidade ainda pode ser adicionada.',
        );
      }
    };
    const papel = papelDaFicha(f.dados);
    const tipoDaFicha: TipoUnidade =
      papel === 'jogador' ? 'jogador' : papel === 'npc' ? 'npc' : 'inimigo';
    const ligada =
      papel === 'jogador' ? campanha.unidades.find((u) => u.fichaId === f.id) : undefined;
    const dados = f.dados;
    // NPCs, guardas e chefes são MODELOS: o mestre pode colocar quantas instâncias
    // precisar, cada uma com HP, Energia e condições independentes na cena.
    if (ligada) {
      if (
        !window.confirm(
          `Atualizar os atributos de ${ligada.nome} com os valores da ficha? O HP atual será limitado ao novo máximo; a Energia A01 poderá continuar acima da referência.`,
        )
      )
        return;
      vincular();
      atualizarUnidade(ligada.id, (u) => ({
        ...u,
        nome: dados.name,
        elemento: descricaoFicha(f),
        hpMax: dados.hpMax,
        hp: Math.min(u.hp, dados.hpMax),
        manaMax: dados.manaMax,
        mana: dados.impeto ? u.mana : Math.min(u.mana, dados.manaMax),
        ca: dados.ca,
        turnoImpeto: undefined,
      }));
      void retratoDaFicha(f, ligada.id);
      if (!ligada.temToken) void aplicarTokenPadraoDaFicha(f, ligada.id);
      adicionarRegistro(`Ficha de ${dados.name} atualizada na mesa (HP ajustado e EN preservada).`);
      return;
    }
    vincular();
    const personagem: Unidade = {
      id: id(),
      nome: dados.name,
      tipo: tipoDaFicha,
      chefe: papel === 'chefe',
      elemento: descricaoFicha(f),
      hp: dados.hpMax,
      hpMax: dados.hpMax,
      mana: dados.manaMax,
      manaMax: dados.manaMax,
      ca: dados.ca,
      iniciativa: 0,
      condicoes: [],
      cor: papel === 'jogador' ? corElemento(dados.element) : CORES[tipoDaFicha],
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      temPdf: false,
      fichaId: f.id,
      temRetrato: false,
      retratoEnquadramento: normalizarAjusteRetrato(dados.retratoAjuste),
    };
    setCampanha((c) => ({
      ...c,
      unidades: [...c.unidades, personagem],
      cenas: c.cenas.map((cena) =>
        cena.id === c.cenaAtivaId
          ? {
              ...cena,
              tokens: {
                ...cena.tokens,
                [personagem.id]: {
                  x: personagem.x,
                  y: personagem.y,
                  tamanho: 70,
                  rotacao: 0,
                  oculto: false,
                  visao: 18,
                },
              },
            }
          : cena,
      ),
    }));
    setSelecionadoId(personagem.id);
    void retratoDaFicha(f, personagem.id);
    void aplicarTokenPadraoDaFicha(f, personagem.id);
    adicionarRegistro(
      `${ROTULOS_PAPEL[papel]} ${dados.name} adicionado(a) pela biblioteca${papel === 'chefe' ? ' com proteção C02 de chefe' : ''}.`,
    );
  }
  function adicionarUnidade(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = nomeNovo.trim();
    if (!nome) return;
    // Campos legados mantidos na estrutura para não exigir migração nem inventar regras de outros sistemas.
    const u: Unidade = {
      id: id(),
      nome,
      tipo: tipoNovo,
      chefe: tipoNovo === 'inimigo' && chefeNovo,
      elemento: '',
      hp: usaRegrasImpeto ? hpNovo : 0,
      hpMax: usaRegrasImpeto ? hpNovo : 0,
      mana: usaRegrasImpeto ? manaNovo : 0,
      manaMax: usaRegrasImpeto ? manaNovo : 0,
      ca: usaRegrasImpeto ? caNovo : 0,
      iniciativa: 0,
      condicoes: [],
      cor: CORES[tipoNovo],
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      temPdf: false,
    };
    setCampanha((c) => ({
      ...c,
      unidades: [...c.unidades, u],
      cenas: c.cenas.map((cena) =>
        cena.id === c.cenaAtivaId
          ? {
              ...cena,
              tokens: {
                ...cena.tokens,
                [u.id]: { x: u.x, y: u.y, tamanho: 70, rotacao: 0, oculto: false, visao: 18 },
              },
            }
          : cena,
      ),
    }));
    setSelecionadoId(u.id);
    setTokenEmEdicaoId(null);
    setNomeNovo('');
    setModal(null);
    adicionarRegistro(`${nome} foi adicionado à mesa.`);
  }
  function removerElencoSelecionado() {
    const ids = selecionadosElenco.filter((uid) => campanha.unidades.some((u) => u.id === uid));
    if (!ids.length) return;
    const nomes = campanha.unidades.filter((u) => ids.includes(u.id)).map((u) => u.nome);
    if (
      !window.confirm(
        `Excluir ${ids.length} personagem(ns) da CAMPANHA, incluindo fichas locais e tokens em TODAS as cenas?\n\n${nomes.slice(0, 10).join(', ')}${nomes.length > 10 ? ' ...' : ''}\n\nEsta ação não é desfeita. Recomendamos um backup antes.`,
      )
    )
      return;
    const excluirIds = new Set(ids);
    setCampanha((c) => {
      const unidades = c.unidades.filter((u) => !excluirIds.has(u.id));
      const cenas = c.cenas.map((cena) => {
        const tokens = { ...cena.tokens };
        ids.forEach((uid) => delete tokens[uid]);
        return {
          ...cena,
          tokens,
          participantesIniciativa: (cena.participantesIniciativa ?? []).filter(
            (uid) => !excluirIds.has(uid),
          ),
        };
      });
      const anterior = ordenarParticipantesIniciativa(
        c.unidades,
        c.cenas.find((cena) => cena.id === c.cenaAtivaId)?.participantesIniciativa,
      );
      const novaOrdem = ordenarParticipantesIniciativa(
        unidades,
        cenas.find((cena) => cena.id === c.cenaAtivaId)?.participantesIniciativa,
      );
      const turno = excluirIds.has(c.turnoId || '')
        ? anterior.find(
            (u, indice) =>
              !excluirIds.has(u.id) && indice > anterior.findIndex((v) => v.id === c.turnoId),
          )?.id ||
          novaOrdem[0]?.id ||
          null
        : c.turnoId;
      return {
        ...c,
        unidades,
        cenas,
        combateAtivo: c.combateAtivo && novaOrdem.length > 0,
        turnoId: turno,
      };
    });
    if (excluirIds.has(selectedId))
      setSelecionadoId(campanha.unidades.find((u) => !excluirIds.has(u.id))?.id || '');
    if (tokenEmEdicaoId && excluirIds.has(tokenEmEdicaoId)) setTokenEmEdicaoId(null);
    setSelecionadosElenco([]);
    for (const u of campanha.unidades.filter((u) => excluirIds.has(u.id))) {
      for (const chave of [
        `ficha:${u.id}`,
        `retrato:${u.id}`,
        `token:${u.id}`,
        ...skinsValidas(u).map((s) => chaveImagemSkin(u.id, s.id)),
      ]) {
        void excluirArquivo(chave).catch(() => undefined);
      }
    }
    setAlerta(`${ids.length} personagem(ns) removido(s) da campanha e das cenas.`);
  }
  function removerUnidade() {
    if (!selecionado || !window.confirm(`Remover ${selecionado.nome} da mesa?`)) return;
    const ref = selecionado.id;
    setCampanha((c) => {
      const unidades = c.unidades.filter((u) => u.id !== ref);
      const cenas = c.cenas.map((cena) => {
        const tokens = { ...cena.tokens };
        delete tokens[ref];
        return {
          ...cena,
          tokens,
          participantesIniciativa: (cena.participantesIniciativa ?? []).filter(
            (pid) => pid !== ref,
          ),
        };
      });
      const ordemAnterior = ordenarParticipantesIniciativa(
        c.unidades,
        c.cenas.find((cena) => cena.id === c.cenaAtivaId)?.participantesIniciativa,
      );
      const ordem = ordenarParticipantesIniciativa(
        unidades,
        cenas.find((cena) => cena.id === c.cenaAtivaId)?.participantesIniciativa,
      );
      return {
        ...c,
        unidades,
        cenas,
        combateAtivo: c.combateAtivo && ordem.length > 0,
        turnoId:
          c.turnoId === ref ? turnoAposRetirada(ordemAnterior, ordem, c.turnoId, ref) : c.turnoId,
      };
    });
    setSelecionadoId(campanha.unidades.find((u) => u.id !== ref)?.id || '');
    if (tokenEmEdicaoId === ref) setTokenEmEdicaoId(null);
    void excluirArquivo(`ficha:${ref}`).catch(() => undefined);
    void excluirArquivo(`retrato:${ref}`).catch(() => undefined);
    void excluirArquivo(`token:${ref}`).catch(() => undefined);
    for (const skin of skinsValidas(selecionado)) {
      void excluirArquivo(chaveImagemSkin(ref, skin.id)).catch(() => undefined);
    }
  }
  function adicionarCondicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usaRegrasImpeto || !selecionado) return;
    const nome = condicaoNova === 'Outra' ? condicaoCustom.trim() : condicaoNova;
    if (!nome) return;
    atualizarUnidade(selecionado.id, (u) => ({
      ...u,
      condicoes: [
        ...u.condicoes,
        {
          id: id(),
          nome,
          turnos: turnosNovos,
          tipo: tipoEfeitoNovo,
          ...(origemEfeitoNova.trim() ? { origem: origemEfeitoNova.trim().slice(0, 75) } : {}),
        },
      ],
    }));
    adicionarRegistro(
      `${selecionado.nome} recebeu ${ROTULOS_EFEITO[tipoEfeitoNovo].toLowerCase()} ${nome} (${turnosNovos} turno(s)).`,
    );
    setModal(null);
    setCondicaoCustom('');
    setOrigemEfeitoNova('');
  }
  async function importarPdf(arquivo?: File) {
    if (!selecionado || !arquivo) return;
    if (!(arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf'))) {
      setAlerta('Selecione um arquivo PDF.');
      return;
    }
    if (arquivo.size > 25 * 1024 * 1024) {
      setAlerta('O PDF deve ter no máximo 25 MB nesta versão.');
      return;
    }
    try {
      await salvarArquivo(`ficha:${selecionado.id}`, arquivo);
      atualizarUnidade(selecionado.id, (u) => ({ ...u, temPdf: true }));
      abrirJanela('pdf');
      setAlerta('');
      adicionarRegistro(`Ficha PDF de ${selecionado.nome} importada.`);
    } catch {
      setAlerta('Não foi possível salvar o PDF no navegador. Verifique o armazenamento.');
    }
  }
  async function importarMapa(arquivo?: File) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      setAlerta('Selecione uma imagem para o mapa.');
      return;
    }
    if (arquivo.size > 15 * 1024 * 1024) {
      setAlerta('A imagem deve ter no máximo 15 MB.');
      return;
    }
    try {
      const idDaCena = cenaAtual.id;
      await salvarArquivo(chaveMapa(idDaCena), arquivo);
      // Força o efeito a recarregar e revogar a URL antiga.
      setCampanha((c) => ({
        ...c,
        cenas: c.cenas.map((cena) => (cena.id === idDaCena ? { ...cena, temMapa: true } : cena)),
        temMapa: idDaCena === 'cena-original' ? true : c.temMapa,
      }));
      setRevisaoMapa((n) => n + 1);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAlerta('');
      adicionarRegistro('Mapa da cena atualizado.');
    } catch {
      setAlerta('Falha ao salvar o mapa no navegador.');
    }
  }
  function iniciarArrasto(e: ReactPointerEvent<HTMLButtonElement>, unidade: Unidade) {
    if (e.button !== 0 || e.shiftKey) return; // Shift + arrastar mantém o pan do mapa.
    const p = cenaAtual.tokens[unidade.id];
    if (!p || p.travado) return;
    e.preventDefault();
    e.stopPropagation();
    setSelecionadoId(unidade.id);
    setTokenEmEdicaoId(unidade.id);
    arrasto.current = {
      id: unidade.id,
      pointerId: e.pointerId,
      inicioX: p.x,
      inicioY: p.y,
      ponteiroX: e.clientX,
      ponteiroY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverToken(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = arrasto.current;
    if (!d || d.pointerId !== e.pointerId || !mapaRef.current || cenaAtual.tokens[d.id]?.travado)
      return;
    if (Math.hypot(e.clientX - d.ponteiroX, e.clientY - d.ponteiroY) < 4) return;
    const r = mapaRef.current.getBoundingClientRect();
    const destino = {
      x: limite(d.inicioX + ((e.clientX - d.ponteiroX) / Math.max(1, r.width)) * 100, 1, 99),
      y: limite(d.inicioY + ((e.clientY - d.ponteiroY) / Math.max(1, r.height)) * 100, 1, 99),
    };
    const destinoFinal = gradeAtual.encaixarTokens ? encaixarNaGrade(destino, gradeAtual) : destino;
    if (
      cenaAtual.tokens[d.id]?.x === destinoFinal.x &&
      cenaAtual.tokens[d.id]?.y === destinoFinal.y
    )
      return;
    if (
      configLuz.colisao &&
      bloqueiaPassagem(
        { x: d.inicioX, y: d.inicioY },
        destinoFinal,
        barreiras,
        palcoLargura,
        palcoAltura,
      )
    )
      return;
    alterarToken(d.id, (u) => ({ ...u, ...destinoFinal }));
  }
  function terminarArrasto() {
    arrasto.current = null;
  }

  function iniciarTransformacao(
    e: ReactPointerEvent<HTMLSpanElement>,
    idUnidade: string,
    modo: 'tamanho' | 'rotacao',
  ) {
    if (e.button !== 0 || !mapaRef.current) return;
    const token = cenaAtual.tokens[idUnidade];
    const moldura = e.currentTarget.closest('.token-rosto');
    if (!token || token.travado || !(moldura instanceof HTMLElement)) return;
    const r = moldura.getBoundingClientRect();
    const mapa = mapaRef.current.getBoundingClientRect();
    const escala = mapa.width / Math.max(1, palcoLargura);
    const centroX = r.left + r.width / 2;
    const centroY = r.top + r.height / 2;
    e.preventDefault();
    e.stopPropagation(); // impede que a alça inicie o arrasto do token.
    setSelecionadoId(idUnidade);
    setTokenEmEdicaoId(idUnidade);
    transformacaoToken.current = {
      id: idUnidade,
      pointerId: e.pointerId,
      modo,
      centroX,
      centroY,
      escala: Math.max(0.05, escala),
      rotacaoInicial: token.rotacao,
      anguloInicial: Math.atan2(e.clientY - centroY, e.clientX - centroX),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverTransformacao(e: ReactPointerEvent<HTMLSpanElement>) {
    const t = transformacaoToken.current;
    if (!t || t.pointerId !== e.pointerId || cenaAtual.tokens[t.id]?.travado) return;
    e.preventDefault();
    e.stopPropagation();
    if (t.modo === 'tamanho') {
      // Quatro cantos simétricos, como a moldura de seleção do Let's Role.
      const distancia = Math.max(Math.abs(e.clientX - t.centroX), Math.abs(e.clientY - t.centroY));
      const tamanho = Math.round(limite((distancia * 2) / t.escala, 28, 460));
      alterarToken(t.id, (p) => ({ ...p, tamanho }));
    } else {
      const angulo = Math.atan2(e.clientY - t.centroY, e.clientX - t.centroX);
      const graus = (t.rotacaoInicial + ((angulo - t.anguloInicial) * 180) / Math.PI) % 360;
      alterarToken(t.id, (p) => ({ ...p, rotacao: Math.round((graus + 360) % 360) }));
    }
  }
  function terminarTransformacao(e: ReactPointerEvent<HTMLSpanElement>) {
    if (transformacaoToken.current?.pointerId === e.pointerId) transformacaoToken.current = null;
    e.stopPropagation();
  }

  async function importarRetrato(arquivo?: File) {
    if (!selecionado || !arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      setAlerta('Selecione uma imagem de retrato.');
      return;
    }
    if (arquivo.size > 6 * 1024 * 1024) {
      setAlerta('Use um retrato de até 6 MB.');
      return;
    }
    try {
      await salvarArquivo(`retrato:${selecionado.id}`, arquivo);
      const target = selecionado.id;
      atualizarUnidade(target, (u) => ({ ...u, temRetrato: true }));
      // Caso o retrato já existisse, force a releitura sem apagar nenhum dado.
      const novo = URL.createObjectURL(arquivo);
      setUrlRetratos((old) => ({ ...old, [target]: novo }));
      setAlerta('');
    } catch {
      setAlerta('Não foi possível armazenar o retrato.');
    }
  }
  function iniciarPan(e: ReactPointerEvent<HTMLDivElement>) {
    if (!e.shiftKey && e.button !== 1) return;
    e.preventDefault();
    panRef.current = {
      pointerId: e.pointerId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: pan.x,
      y: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moverPan(e: ReactPointerEvent<HTMLDivElement>) {
    const d = panRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPan({ x: d.x + e.clientX - d.mouseX, y: d.y + e.clientY - d.mouseY });
  }
  function fimPan() {
    panRef.current = null;
  }
  const fichaSelecionadaA01 = fichas.find((f) => f.id === selecionado?.fichaId)?.dados.impeto;
  const abaFichaExibida =
    abaFicha === 'personagem' && !fichaSelecionadaA01 ? 'atributos' : abaFicha;
  const recurso = (
    rotulo: string,
    valor: number,
    maximo: number,
    tipo: 'hp' | 'mana',
    compacto = false,
  ) => (
    <section className={`recurso recurso-${tipo}`} aria-label={rotulo}>
      <div className="recurso-cabecalho">
        <span>
          {fichaSelecionadaA01
            ? tipo === 'hp'
              ? '♥ PONTOS DE VIDA'
              : '◆ ENERGIA'
            : compacto
              ? `Ajustar ${rotulo}`
              : rotulo}
        </span>
        {(!compacto || fichaSelecionadaA01) && (
          <strong>
            {valor} <small>{tipo === 'hp' ? `/ ${maximo}` : `· ref. ${maximo}`}</small>
          </strong>
        )}
      </div>
      {(!compacto || fichaSelecionadaA01) && (
        <div className="barra-recurso">
          <span style={{ width: `${maximo ? limite((valor / maximo) * 100, 0, 100) : 0}%` }} />
        </div>
      )}
      {tipo === 'mana' && (
        <div className="mana-regra">
          ♢{' '}
          {fichaSelecionadaA01
            ? 'Energia sem teto de acúmulo; a referência não é limite máximo.'
            : 'Mana/Foco acumulável, sem teto.'}{' '}
          {valor > maximo ? <strong>+{valor - maximo} acima da referência</strong> : null}
          {fichaSelecionadaA01 && (
            <small> · Regeneração +{fichaSelecionadaA01.estatisticas.regeneracao}/rodada</small>
          )}
        </div>
      )}
      {fichaSelecionadaA01 && tipo === 'hp' && (
        <small className="hx-recurso-regra-ajuda">
          A cura respeita o HP máximo. Dano desconta primeiro o escudo.
        </small>
      )}
      <form
        className="recurso-quantidade"
        onSubmit={(e) => {
          e.preventDefault();
          aplicarVariacao(tipo, 'reduzir');
        }}
      >
        <label htmlFor={`quantidade-${tipo}`}>Quantidade para adicionar ou reduzir</label>
        <div className="recurso-quantidade-acoes">
          <input
            id={`quantidade-${tipo}`}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Ex.: 17"
            value={tipo === 'hp' ? variacaoHp : variacaoMana}
            onChange={(e) =>
              tipo === 'hp' ? setVariacaoHp(e.target.value) : setVariacaoMana(e.target.value)
            }
          />
          <button
            type="submit"
            className="recurso-reduzir"
            title={
              tipo === 'hp'
                ? 'Aplicar dano'
                : fichaSelecionadaA01
                  ? 'Gastar Energia'
                  : 'Gastar Mana/Foco'
            }
          >
            − {tipo === 'hp' ? 'Dano' : 'Gastar'}
          </button>
          <button
            type="button"
            className="recurso-adicionar"
            onClick={() => aplicarVariacao(tipo, 'adicionar')}
            title={
              tipo === 'hp'
                ? 'Curar HP'
                : fichaSelecionadaA01
                  ? 'Ganhar Energia'
                  : 'Acumular Mana/Foco'
            }
          >
            ＋ {tipo === 'hp' ? 'Curar' : 'Ganhar'}
          </button>
        </div>
      </form>
      <details className="hx-recurso-detalhes">
        <summary>Atalhos rápidos e valor exato</summary>
        <div className="recurso-botoes" aria-label="Atalhos de ajuste rápido">
          <button onClick={() => alterarRecurso(tipo, -10)}>−10</button>
          <button onClick={() => alterarRecurso(tipo, -5)}>−5</button>
          <button onClick={() => alterarRecurso(tipo, -1)}>−1</button>
          <button onClick={() => alterarRecurso(tipo, 1)}>+1</button>
          <button onClick={() => alterarRecurso(tipo, 5)}>+5</button>
          <button onClick={() => alterarRecurso(tipo, 10)}>+10</button>
        </div>
        <form
          className="recurso-valor-exato"
          onSubmit={(e) => {
            e.preventDefault();
            definirRecurso(tipo);
          }}
        >
          <label htmlFor={`valor-${tipo}`}>Definir valor atual</label>
          <input
            id={`valor-${tipo}`}
            type="number"
            min="0"
            step="1"
            placeholder={String(valor)}
            value={tipo === 'hp' ? ajusteHp : ajusteMana}
            onChange={(e) =>
              tipo === 'hp' ? setAjusteHp(e.target.value) : setAjusteMana(e.target.value)
            }
          />
          <button type="submit">Aplicar</button>
        </form>
      </details>
    </section>
  );
  const propsJanela = (key: ChaveJanela) => ({
    estado: janelas[key],
    onMover: (x: number, y: number) => mudarJanela(key, { x, y }),
    onTrazerFrente: () => focarJanela(key),
    onMinimizar: () => mudarJanela(key, { minimizada: !janelas[key].minimizada }),
    onFechar: () => mudarJanela(key, { aberta: false }),
  });
  const botoesFerramenta: { key: ChaveJanela; icone: string; titulo: string }[] = [
    { key: 'cenas', icone: '▧', titulo: 'Cenas' },
    { key: 'personagens', icone: '♟', titulo: 'Elenco / NPCs' },
    { key: 'iniciativa', icone: '☷', titulo: 'Iniciativa' },
    {
      key: 'recursos',
      icone: usaRegrasImpeto ? '♥' : '♟',
      titulo: usaRegrasImpeto ? 'Ficha / Recursos' : 'Detalhes',
    },
    { key: 'inventario', icone: '⚔', titulo: 'Inventário' },
    { key: 'historico', icone: '◈', titulo: 'Rolagens' },
    { key: 'pdf', icone: '▥', titulo: 'Ficha PDF' },
    { key: 'musica', icone: '♫', titulo: 'Música' },
  ];
  const selecionarUnidade = (idUnidade: string) => {
    setSelecionadoId(idUnidade);
    setTokenEmEdicaoId(null);
    abrirJanela('recursos');
  };

  const idsFichasCampanha = metaFichasCampanha?.fichaIds ?? [];
  const fichasCompativeis = fichas.filter((f) =>
    Boolean(metaFichasCampanha && fichaCompativel(f, metaFichasCampanha)),
  );
  const fichasVisiveis = fichasCompativeis.filter(
    (f) =>
      (mostrarTodasFichas || idsFichasCampanha.includes(f.id)) &&
      (filtroPapelFicha === 'todos' || papelDaFicha(f.dados) === filtroPapelFicha) &&
      `${f.nome} ${descricaoFicha(f)} ${ROTULOS_PAPEL[papelDaFicha(f.dados)]}`
        .toLocaleLowerCase('pt-BR')
        .includes(buscaFicha.toLocaleLowerCase('pt-BR')),
  );
  return (
    <div className={`mesa-app ${modoFoco ? 'modo-foco' : ''} ${MODO_3D ? 'mesa-app-3d' : ''}`}>
      <PublicadorMesa
        modoMesa={MODO_3D ? '3d' : '2d'}
        campanhaId={CAMPAIGN_ID}
        combate={{
          ativo: campanha.combateAtivo,
          rodada: campanha.rodada,
          turnoId: campanha.turnoId,
          ordem: ordenados.map((u) => u.id),
        }}
        cena={cenaAtual}
        unidades={campanha.unidades}
        fichas={fichas}
        paginasDiario={campanha.paginasDiario}
        urlMapa={urlMapa}
        aspectoMapa={proporcaoNatural}
        imagensTokens={Object.fromEntries(
          campanha.unidades
            .filter(
              (u) =>
                cenaAtual.tokens[u.id] &&
                !cenaAtual.tokens[u.id].oculto &&
                (u.tipo === 'jogador' || u.tipo === 'npc' || u.tipo === 'inimigo'),
            )
            .map((u) => [u.id, imagemTokenCena(u, cenaAtual.tokens[u.id]) || urlRetratos[u.id]]),
        )}
        tokensTopview={Object.fromEntries(
          campanha.unidades
            .filter((u) => cenaAtual.tokens[u.id])
            .map((u) => [u.id, Boolean(imagemTokenCena(u, cenaAtual.tokens[u.id]))]),
        )}
        retratosGrupo={Object.fromEntries(
          campanha.unidades
            .filter((u) => u.tipo === 'jogador')
            .map((u) => [u.id, urlRetratos[u.id]]),
        )}
        onMoverTokenRemoto={moverTokenConvidado}
        onDesenhoRemoto={aplicarDesenhoConvidado}
        onRolagensMultiplayer={receberRolagensMultiplayer}
        onPedidoItemRemoto={atenderPedidoItemMultiplayer}
      />
      <EditorDados origem={MODO_3D ? 'mesa3d' : 'mesa'} />
      <div className="mesa-fundo" aria-hidden="true" />

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
          <span className="estado-sessao">● {campanha.titulo} · MESA LOCAL</span>
          <span className="divisor-vertical" />
          <strong>{cenaAtual.nome}</strong>
        </div>
        <div className="cabecalho-acoes">
          <MultiplayerMestre campanhaId={CAMPAIGN_ID} campanha={campanha.titulo} />
          <a className="hx-voltar-portal" href="/mesas/" title="Voltar a Minhas Mesas">
            ← Minhas mesas
          </a>
          <a
            className="hx-voltar-portal hx-exploracao-link"
            href={`${MODO_3D ? '/mesa/' : '/mesa3d/'}?campanha=${encodeURIComponent(CAMPAIGN_ID)}`}
            title={MODO_3D ? 'Voltar à Mesa 2D' : 'Abrir a Mesa 3D com a mesma campanha'}
          >
            {MODO_3D ? '▧ Mesa 2D' : '▣ Mesa 3D'}
          </a>
          <button
            onClick={() => abrirJanela('fichas')}
            title="Selecionar personagens compatíveis com a campanha"
          >
            ✧ <span>Fichas</span>
          </button>
          <button onClick={() => abrirJanela('cenas')} title="Cenas">
            ▧ <span>Cenas</span>
          </button>
          <button
            className="botao-primario"
            onClick={() => {
              setTipoNovo('jogador');
              setModal('unidade');
            }}
          >
            ＋ <span>Personagem</span>
          </button>
          <button
            className="hx-mesa-organizar"
            type="button"
            aria-expanded={menuMesa}
            aria-controls="hx-menu-mesa"
            onClick={() => setMenuMesa((v) => !v)}
            title="Organizar a interface e ver atalhos"
          >
            ☷ <span>Organizar</span>
          </button>
        </div>
      </header>

      {menuMesa && (
        <div
          className="hx-menu-mesa"
          id="hx-menu-mesa"
          role="group"
          aria-label="Organização da mesa"
        >
          <div className="hx-menu-mesa-topo">
            <div>
              <small>AMBIENTE DO MESTRE</small>
              <strong>Organizar a mesa</strong>
            </div>
            <button type="button" onClick={() => setMenuMesa(false)} aria-label="Fechar menu">
              ×
            </button>
          </div>
          <p>
            Esses ajustes mudam apenas a disposição da tela. Seus personagens, cenas e rolagens
            continuam salvos.
          </p>
          <button type="button" onClick={alternarModoFoco}>
            <span>⛶</span>
            <strong>Modo foco no mapa</strong>
            <kbd>F</kbd>
          </button>
          <button type="button" onClick={restaurarLayoutJanelas}>
            <span>▦</span>
            <strong>Reorganizar janelas</strong>
          </button>
          <button type="button" onClick={fecharJanelasVisuais}>
            <span>◫</span>
            <strong>Fechar painéis abertos</strong>
          </button>
          {MODO_3D && (
            <button
              type="button"
              onClick={() => {
                escolherCameraMesa3D('mestre');
                enviar3D('editor', 'editar');
                setMenuMesa(false);
              }}
            >
              <span>▦</span>
              <strong>Editar cenário na Visão de Mesa</strong>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuMesa(false);
              setGuiaAtalhos(true);
            }}
          >
            <span>⌨</span>
            <strong>Ver atalhos</strong>
            <kbd>?</kbd>
          </button>
          <a
            className="hx-menu-exploracao"
            href={`${MODO_3D ? '/mesa/' : '/mesa3d/'}?campanha=${encodeURIComponent(CAMPAIGN_ID)}`}
          >
            <span>▣</span>
            <strong>{MODO_3D ? 'Mesa 2D · Mapa tradicional' : 'Mesa 3D · Mesmo Portal'}</strong>
            <small>Mesmas janelas e fichas</small>
          </a>
        </div>
      )}
      {modoFoco && (
        <div className="hx-foco-comandos" aria-label="Controles de modo foco">
          <span>⛶ Modo foco · {cenaAtual.nome}</span>
          <button type="button" onClick={alternarModoFoco}>
            Sair do foco <kbd>F</kbd>
          </button>
        </div>
      )}
      {guiaAtalhos && (
        <div
          className="hx-atalhos-fundo"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGuiaAtalhos(false);
          }}
        >
          <section
            className="hx-atalhos-dialogo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hx-atalhos-titulo"
          >
            <div className="hx-atalhos-cabecalho">
              <div>
                <small>CONSULTA RÁPIDA</small>
                <h2 id="hx-atalhos-titulo">Atalhos da mesa</h2>
              </div>
              <button
                type="button"
                onClick={() => setGuiaAtalhos(false)}
                aria-label="Fechar atalhos"
              >
                ×
              </button>
            </div>
            <dl>
              <div>
                <dt>
                  <kbd>F</kbd>
                </dt>
                <dd>Ativar ou sair do modo foco no mapa</dd>
              </div>
              <div>
                <dt>
                  <kbd>?</kbd>
                </dt>
                <dd>Mostrar ou ocultar este guia</dd>
              </div>
              <div>
                <dt>
                  <kbd>Esc</kbd>
                </dt>
                <dd>Fechar o guia, menu ou modo foco</dd>
              </div>
              <div>
                <dt>
                  <kbd>Shift</kbd> + arrastar
                </dt>
                <dd>Mover o mapa sem alterar tokens</dd>
              </div>
              <div>
                <dt>
                  <kbd>Delete</kbd>
                </dt>
                <dd>Remover da cena o token selecionado</dd>
              </div>
            </dl>
            <p>Os atalhos não interferem quando você está digitando em um campo.</p>
            <button
              className="hx-atalhos-fechar"
              type="button"
              onClick={() => setGuiaAtalhos(false)}
            >
              Entendi
            </button>
          </section>
        </div>
      )}

      {alerta && (
        <div className="alerta-mesa" role="alert">
          ⚠ {alerta}
          <button onClick={() => setAlerta('')} aria-label="Fechar alerta">
            ×
          </button>
        </div>
      )}

      <aside className="galeria-personagens" aria-label="Fichas do grupo de jogadores">
        <span className="galeria-titulo">
          GRUPO <strong>{campanha.unidades.filter((u) => u.tipo === 'jogador').length}</strong>
        </span>
        <div className="galeria-rolagem">
          {campanha.unidades
            .filter((u) => u.tipo === 'jogador')
            .map((u) => (
              <button
                key={u.id}
                className={`cartao-retrato ${u.id === selectedId ? 'selecionado' : ''} ${u.tipo}`}
                onClick={() => selecionarUnidade(u.id)}
                title={`Abrir ficha de ${u.nome}`}
              >
                <span className="borda-retrato" style={{ '--cor-unidade': u.cor } as CSSProperties}>
                  {urlRetratos[u.id] ? (
                    <ImagemRetrato src={urlRetratos[u.id]} alt="" ajuste={u.retratoEnquadramento} />
                  ) : (
                    <span className="retrato-inicial">
                      {u.nome.slice(0, 1).toUpperCase()}
                      <small>✧</small>
                    </span>
                  )}
                  {u.id === campanha.turnoId && campanha.combateAtivo && (
                    <span className="selo-turno">➤</span>
                  )}
                </span>
                <span className="cartao-nome">{u.nome}</span>
                <span className="cartao-status">
                  <i style={{ background: u.cor }} />
                  {usaRegrasImpeto
                    ? `${u.hp}/${u.hpMax} HP${(u.escudo ?? 0) > 0 ? ` · 🛡${u.escudo}` : ''}`
                    : NOME_TIPOS[u.tipo]}
                </span>
              </button>
            ))}
          <button
            className="adicionar-retrato"
            onClick={() => {
              setTipoNovo('jogador');
              setModal('unidade');
            }}
            title="Adicionar jogador ao grupo"
          >
            ＋
          </button>
        </div>
      </aside>

      <nav className="atalhos-esquerda" aria-label="Acessos rápidos">
        <button
          type="button"
          aria-expanded={janelas.chat.aberta && !janelas.chat.minimizada}
          onClick={() => alternarJanela('chat')}
        >
          ◉ Chat{' '}
          <small>
            {chatNaoLidas > 0
              ? `${chatNaoLidas} nova${chatNaoLidas === 1 ? '' : 's'}`
              : janelas.chat.aberta
                ? 'aberto'
                : 'local'}
          </small>
        </button>
        <button onClick={() => alternarJanela('diario')}>▤ Diário</button>
        {MODO_3D && (
          <div className="hx-camera-mesa3d" role="group" aria-label="Câmera da Mesa 3D">
            <span className="hx-camera-titulo">VISUALIZAÇÃO 3D</span>
            <button
              type="button"
              aria-pressed={cameraMesa3D === 'mestre' && !cameraDestaque}
              className={cameraMesa3D === 'mestre' && !cameraDestaque ? 'ativo' : ''}
              onClick={() => escolherCameraMesa3D('mestre')}
              title="Câmera livre para administrar e construir na mesma visão"
            >
              ♟ Visão de Mesa
            </button>
            <button
              type="button"
              aria-pressed={cameraMesa3D === 'terceira' && !cameraDestaque}
              className={cameraMesa3D === 'terceira' && !cameraDestaque ? 'ativo' : ''}
              onClick={() => escolherCameraMesa3D('terceira')}
              title="Câmera acompanhando o personagem escolhido com WASD"
            >
              ◉ Terceira Pessoa
            </button>
            <button
              type="button"
              aria-pressed={Boolean(cameraDestaque?.modo === 'personagem')}
              className={cameraDestaque?.modo === 'personagem' ? 'ativo' : ''}
              onClick={() => alternarCameraDestaque('personagem')}
              title="Foco narrativo no token escolhido; clique novamente para voltar"
            >
              ◈ Personagem
            </button>
            <button
              type="button"
              aria-pressed={Boolean(cameraDestaque?.modo === 'tatica')}
              className={cameraDestaque?.modo === 'tatica' ? 'ativo' : ''}
              onClick={() => alternarCameraDestaque('tatica')}
              title="Visão tática inclinada do terreno e do posicionamento; clique novamente para voltar"
            >
              ▤ Tática
            </button>
            {cameraDestaque?.modo === 'tatica' && (
              <div className="hx-camera-zoom-tatico" aria-label="Abertura da câmera tática">
                <div className="hx-camera-zoom-tatico-topo">
                  <span>Abertura tática</span>
                  <strong>{zoomTatico}%</strong>
                </div>
                <div className="hx-camera-zoom-tatico-controles">
                  <button
                    type="button"
                    aria-label="Aproximar câmera tática"
                    title="Aproximar"
                    onClick={() => mudarZoomTatico(zoomTatico - 10)}
                  >
                    −
                  </button>
                  <input
                    aria-label="Abertura tática"
                    type="range"
                    min="65"
                    max="200"
                    step="5"
                    value={zoomTatico}
                    onChange={(e) => mudarZoomTatico(Number(e.target.value))}
                  />
                  <button
                    type="button"
                    aria-label="Afastar câmera tática"
                    title="Afastar"
                    onClick={() => mudarZoomTatico(zoomTatico + 10)}
                  >
                    ＋
                  </button>
                </div>
                <button
                  className="hx-camera-reenquadrar"
                  type="button"
                  title="Enquadra todos os participantes da iniciativa que estão no mapa; se não houver participantes, mostra os tokens da cena"
                  onClick={reenquadrarCombate}
                >
                  ⤢ Reenquadrar combate
                </button>
                <small>
                  Arraste tokens com botão esquerdo. Shift + botão esquerdo ou botão do meio: mover
                  câmera. Botão direito: girar. Roda: zoom.
                </small>
              </div>
            )}
            {cameraDestaque?.modo === 'personagem' && (
              <div
                className="hx-camera-personagem-dica"
                aria-label="Controles da câmera de personagem"
              >
                <small>
                  Botão direito + arrastar: girar a câmera · Roda: aproximar ou afastar.
                </small>
                <button
                  type="button"
                  title="Restaurar o ângulo e o zoom da câmera de personagem"
                  onClick={() => enviar3D('camera-personagem-restaurar')}
                >
                  ↺ Restaurar enquadramento
                </button>
              </div>
            )}
            {cameraDestaque && personagensCamera3D.length > 0 && (
              <label className="hx-camera-personagem" htmlFor="hx-foco-camera-3d">
                Personagem em foco
                <select
                  id="hx-foco-camera-3d"
                  aria-label="Escolher personagem para a câmera"
                  value={cameraDestaque.personagemId}
                  onChange={(e) =>
                    setCameraDestaque((atual) =>
                      atual ? { ...atual, personagemId: e.target.value } : atual,
                    )
                  }
                >
                  {personagensCamera3D.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} · {NOME_TIPOS[u.tipo]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {cameraMesa3D === 'terceira' && !cameraDestaque && personagensCamera3D.length > 0 && (
              <label className="hx-camera-personagem" htmlFor="hx-personagem-camera-3d">
                Personagem acompanhado
                <select
                  id="hx-personagem-camera-3d"
                  aria-label="Escolher personagem para a Terceira Pessoa"
                  value={personagemCamera3DId}
                  onChange={(e) => setSelecionadoId(e.target.value)}
                >
                  {personagensCamera3D.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} · {NOME_TIPOS[u.tipo]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </nav>

      {MODO_3D &&
        cameraDestaque?.modo === 'personagem' &&
        (() => {
          const foco = campanha.unidades.find((u) => u.id === cameraDestaque.personagemId);
          if (
            !foco ||
            !mostrarMenuNoTurno({
              combateAtivo: campanha.combateAtivo,
              modoCamera: cameraDestaque.modo,
              personagemFocoId: foco.id,
              turnoId: campanha.turnoId,
              tokenPresente: Boolean(cenaAtual.tokens[foco.id]),
            })
          )
            return null;
          return (
            <MenuCombateImersivo
              key={`${cenaAtual.id}:${foco.id}:${campanha.rodada}`}
              personagemId={foco.id}
              personagem={foco}
              rodada={campanha.rodada}
              ancora={
                posicaoPersonagemTela?.personagemId === foco.id ? posicaoPersonagemTela : undefined
              }
              ficha={fichas.find((f) => f.id === foco.fichaId)?.dados}
              onRolar={(expressao, nomeAcao, icone) =>
                lancarDados(expressao, `${foco.nome} · ${nomeAcao}`, icone)
              }
              onUsarItem={(item) => usarItemDaUnidade(foco.id, item)}
              onAbrirFicha={() => {
                setSelecionadoId(foco.id);
                setAbaFicha('habilidades');
                abrirJanela('recursos');
              }}
              onAbrirInventario={() => {
                setSelecionadoId(foco.id);
                setAbaFicha('inventario');
                abrirJanela('recursos');
              }}
            />
          );
        })()}

      <nav className="atalhos-direita" aria-label="Ferramentas do mestre">
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
              {botoesFerramenta
                .filter((b) =>
                  [
                    'cenas',
                    'personagens',
                    'iniciativa',
                    'recursos',
                    'inventario',
                    'historico',
                  ].includes(b.key),
                )
                .map((b) => (
                  <button
                    type="button"
                    key={b.key}
                    className={janelas[b.key].aberta ? 'ativo' : ''}
                    onClick={() => alternarJanela(b.key)}
                    title={b.titulo}
                  >
                    <span>{b.icone}</span>
                    <strong>{b.titulo}</strong>
                  </button>
                ))}
              {MODO_3D && (
                <button
                  type="button"
                  className={editor3DAberto ? 'ativo' : ''}
                  aria-pressed={editor3DAberto}
                  title="Configurar o terreno, mapa e objetos desta cena 3D"
                  onClick={() => enviar3D('editor', editor3DAberto ? 'fechar' : 'abrir')}
                >
                  <span>▦</span>
                  <strong>Terreno 3D</strong>
                </button>
              )}
              {MODO_3D && (
                <button
                  type="button"
                  title="Importar e posicionar miniaturas tridimensionais em GLB"
                  onClick={() => enviar3D('miniaturas', 'abrir')}
                >
                  <span>♙</span>
                  <strong>Miniaturas 3D</strong>
                </button>
              )}
            </div>
          )}
        </section>
        <section className="hx-dock-grupo" aria-label="Ferramentas de apoio">
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
              {botoesFerramenta
                .filter((b) => ['pdf', 'musica'].includes(b.key))
                .map((b) => (
                  <button
                    type="button"
                    key={b.key}
                    className={janelas[b.key].aberta ? 'ativo' : ''}
                    onClick={() => alternarJanela(b.key)}
                    title={b.titulo}
                  >
                    <span>{b.icone}</span>
                    <strong>{b.titulo}</strong>
                  </button>
                ))}
            </div>
          )}
        </section>
        <section className="hx-dock-grupo" aria-label="Ferramentas de ambiente">
          <button
            type="button"
            className="hx-dock-cabecalho"
            aria-expanded={gruposDireita.ambiente}
            onClick={() => setGruposDireita((g) => ({ ...g, ambiente: !g.ambiente }))}
          >
            <span>AMBIENTE</span>
            <span aria-hidden="true">{gruposDireita.ambiente ? '⌃' : '⌄'}</span>
          </button>
          {gruposDireita.ambiente && (
            <div className="hx-dock-itens">
              <button
                type="button"
                className={janelas.iluminacao.aberta ? 'ativo' : ''}
                title="Iluminação, paredes e portas"
                onClick={() => alternarJanela('iluminacao')}
              >
                <span>☼</span>
                <strong>Iluminação</strong>
              </button>
              <button
                type="button"
                className={ferramentaMapa === 'desenhar' ? 'ativo' : ''}
                title="Ativar pincel de desenho livre sobre o mapa 2D ou 3D"
                onClick={() => usarFerramenta('desenhar')}
              >
                <span>✎</span>
                <strong>Desenhar</strong>
              </button>
              <button
                type="button"
                className={janelas.clima.aberta ? 'ativo' : ''}
                title="Efeitos de clima da cena"
                onClick={() => alternarJanela('clima')}
              >
                <span>☁</span>
                <strong>Clima</strong>
              </button>
            </div>
          )}
        </section>
      </nav>
      {usaRegrasImpeto && campanha.combateAtivo && atual && atual.condicoes.length > 0 && (
        <HudEfeitosMesa nome={atual.nome} efeitos={atual.condicoes} />
      )}
      {MODO_3D ? (
        <div
          className="mapa-viewport mapa-viewport-3d"
          aria-label="Cenário tridimensional da campanha"
        >
          <iframe
            className="mesa-3d-visualizador"
            ref={visualizador3DRef}
            src={`/mesa3dviewer/?campanha=${encodeURIComponent(CAMPAIGN_ID)}&embed=1`}
            title="Mesa 3D — cenário e câmeras"
            onLoad={() => {
              enviar3D('cena', cenaAtual.id);
              enviar3D('selecionar', selecionadoId);
              enviar3D('camera', cameraMesa3DRef.current);
              enviar3D('fog-grupo', exploracaoGrupo ? 'grupo' : 'individual');
              enviar3D('fog-raio', raioPincel);
              if (cameraDestaque) enviarCameraDestaque(cameraDestaque);
              enviar3D('cinematica-zoom', zoomTaticoAtualRef.current);
            }}
          />
        </div>
      ) : (
        <div
          className="mapa-viewport"
          ref={viewportRef}
          onPointerDown={iniciarPan}
          onPointerMove={moverPan}
          onPointerUp={fimPan}
          onPointerCancel={fimPan}
        >
          <div
            className={`mapa-palco pm-cena2d-palco ${urlMapa && cenaAtual.camadas.fundo ? 'com-imagem' : 'sem-imagem'} ${!cenaAtual.camadas.fundo ? 'fundo-desativado' : ''}`}
            ref={mapaRef}
            style={{
              width: `${palcoLargura}px`,
              height: `${palcoAltura}px`,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setTokenEmEdicaoId(null);
                setBarreiraSelecionadaId(null);
                setSelecoesMapa([]);
                setMarcadorSelecionadoId(null);
                setDesenhoSelecionadoId(null);
                setLuzSelecionadaId(null);
              }
            }}
          >
            <FundoCena2D imagem={cenaAtual.camadas.fundo ? urlMapa : null} />
            {!urlMapa && cenaAtual.camadas.fundo && (
              <div className="mapa-demo" aria-hidden="true">
                <div className="mapa-runas">
                  <span>✦</span>
                  <span>⬡</span>
                  <span>✧</span>
                  <span>◈</span>
                </div>
                <div className="mapa-altar">
                  ✥<small>CENA SEM MAPA</small>
                </div>
                <div className="mapa-neblina" />
              </div>
            )}
            {gradeAtual.visivel && (
              <div
                className="mapa-grade"
                aria-hidden="true"
                style={{
                  backgroundSize: `${100 / gradeAtual.colunas}% ${100 / gradeAtual.linhas}%`,
                }}
              />
            )}
            {mostrarTokens &&
              campanha.unidades
                .filter(
                  (u) =>
                    cenaAtual.tokens[u.id] &&
                    (!preverJogador ||
                      !tokenOcultoParaJogador(u.tipo, cenaAtual.tokens[u.id], cenaAtual.camadas)) &&
                    (preverJogador || tokenPassaFiltro(u.tipo, filtroTipoToken)) &&
                    (!fogExploracao ||
                      !preverJogador ||
                      u.id === idObservador ||
                      estadosFog[celulaFog(cenaAtual.tokens[u.id].x, cenaAtual.tokens[u.id].y)] ===
                        2),
                )
                .map((u) => {
                  const p = cenaAtual.tokens[u.id];
                  const ocultoDoJogador = tokenOcultoParaJogador(u.tipo, p, cenaAtual.camadas);
                  return (
                    <button
                      key={u.id}
                      title={p.ocultarNome ? 'Token sem nome' : u.nome}
                      aria-label={
                        p.ocultarNome
                          ? 'Selecionar token sem nome'
                          : `Selecionar token de ${u.nome}`
                      }
                      className={`token ${imagemTokenCena(u, p) ? 'token-topview' : ''} ${tokenEmEdicaoId === u.id ? 'selecionado' : ''} ${selecoesMapa.includes(`token:${u.id}`) ? 'hx-multi-selecionado' : ''} ${p.travado ? 'token-travado' : ''} ${ocultoDoJogador && !preverJogador ? 'token-oculto' : ''} ${campanha.combateAtivo && campanha.turnoId === u.id ? 'turno-atual' : ''}`}
                      style={
                        {
                          left: `${p.x}%`,
                          top: `${p.y}%`,
                          '--cor-token': aparenciaTokenAtiva(u, p).corBorda,
                          '--fundo-token':
                            aparenciaTokenAtiva(u, p).fundo === 'transparente'
                              ? 'transparent'
                              : corFundoToken(aparenciaTokenAtiva(u, p)),
                          '--tamanho-token': `${p.tamanho}px`,
                          '--rotacao-token': `${p.rotacao}deg`,
                          '--espelhamento-token': p.espelhadoX ? -1 : 1,
                        } as CSSProperties
                      }
                      onPointerDown={(e) => {
                        if (e.shiftKey || e.ctrlKey) {
                          e.stopPropagation();
                          return;
                        }
                        setBarreiraSelecionadaId(null);
                        if (ferramentaMapa === 'mover' && !p.travado) iniciarArrasto(e, u);
                      }}
                      onPointerMove={moverToken}
                      onPointerUp={terminarArrasto}
                      onPointerCancel={terminarArrasto}
                      onClick={(e) => {
                        if (
                          (e.shiftKey || e.ctrlKey) &&
                          !preverJogador &&
                          ferramentaMapa === 'mover'
                        ) {
                          e.stopPropagation();
                          alternarSelecaoMapa('token', u.id);
                          return;
                        }
                        setSelecionadoId(u.id);
                        setTokenEmEdicaoId(u.id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (preverJogador || p.travado || ferramentaMapa !== 'mover') return;
                        setSelecionadoId(u.id);
                        setTokenEmEdicaoId(u.id);
                        alterarToken(u.id, (t) => ({ ...t, espelhadoX: !t.espelhadoX }));
                      }}
                    >
                      <CorpoTokenCena2D
                        nome={u.nome}
                        imagem={imagemTokenCena(u, p)}
                        imagemAlternativa={urlRetratos[u.id]}
                        enquadramento={enquadramentoTokenAtivo(u, p)}
                        animado={tokenIdleAtivo(u, p)}
                        {...parametrosIdleAtivos(u, p)}
                        ocultarNome={p.ocultarNome}
                        sufixoNome={ocultoDoJogador && !preverJogador ? ' · oculto' : ''}
                        controles={
                          tokenEmEdicaoId === u.id &&
                          ferramentaMapa === 'mover' &&
                          !preverJogador &&
                          !p.travado && (
                            <span className="token-transform-box" aria-hidden="true">
                              {(
                                [
                                  'superior-esquerda',
                                  'superior-direita',
                                  'inferior-esquerda',
                                  'inferior-direita',
                                ] as const
                              ).map((canto) => (
                                <span
                                  key={canto}
                                  title="Arraste para aumentar ou reduzir o token"
                                  className={`token-alca token-alca-${canto}`}
                                  onPointerDown={(e) => iniciarTransformacao(e, u.id, 'tamanho')}
                                  onPointerMove={moverTransformacao}
                                  onPointerUp={terminarTransformacao}
                                  onPointerCancel={terminarTransformacao}
                                  onLostPointerCapture={terminarTransformacao}
                                />
                              ))}
                              <span className="token-rotacao-cabo" />
                              <span
                                className="token-rotacao-alca"
                                title="Arraste para girar o token"
                                onPointerDown={(e) => iniciarTransformacao(e, u.id, 'rotacao')}
                                onPointerMove={moverTransformacao}
                                onPointerUp={terminarTransformacao}
                                onPointerCancel={terminarTransformacao}
                                onLostPointerCapture={terminarTransformacao}
                              />
                            </span>
                          )
                        }
                      />
                      {p.travado && !preverJogador && (
                        <span className="token-cadeado" aria-hidden="true">
                          🔒
                        </span>
                      )}
                    </button>
                  );
                })}
            <WeatherLayer config={climaAtual} pausado={pausarClima} />
            {cenaAtual.camadas.marcadores &&
              cenaAtual.marcadores.map((m) => (
                <div
                  key={m.id}
                  className={`marcador-mapa hx-marcador-editavel ${marcadorSelecionadoId === m.id || selecoesMapa.includes(`marcador:${m.id}`) ? 'hx-anotacao-selecionada' : ''}`}
                  style={{
                    left: `${marcadorPrevia?.id === m.id ? marcadorPrevia.x : m.x}%`,
                    top: `${marcadorPrevia?.id === m.id ? marcadorPrevia.y : m.y}%`,
                  }}
                >
                  <button
                    type="button"
                    className="hx-marcador-arrastar"
                    title={`Selecionar ou arrastar ${m.texto}. Ctrl/Shift+clique para multisseleção.`}
                    onPointerDown={(e) => selecionarMarcador2D(e, m)}
                    onPointerMove={moverMarcador2D}
                    onPointerUp={encerrarMarcador2D}
                    onPointerCancel={encerrarMarcador2D}
                  >
                    <span>✦</span>
                    <small>{m.texto}</small>
                  </button>
                  {marcadorSelecionadoId === m.id &&
                    ferramentaMapa === 'mover' &&
                    !preverJogador && (
                      <div className="hx-anotacao-acoes" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Renomear marcação"
                          onClick={() => abrirFormularioMarcador({ x: m.x, y: m.y }, m.id, m.texto)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Excluir marcação"
                          onClick={() => excluirItemSelecionado2D('marcador', m.id)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                </div>
              ))}
            {((cenaAtual.desenhos?.length ?? 0) > 0 || tracoLivrePreview) && (
              <svg
                className="hx-desenhos-mapa"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-label="Desenhos na cena"
              >
                {[
                  ...normalizarDesenhos(cenaAtual.desenhos),
                  ...(tracoLivrePreview ? [tracoLivrePreview] : []),
                ].map((t) => (
                  <g key={t.id}>
                    <polyline
                      points={t.pontos.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={
                        desenhoSelecionadoId === t.id || selecoesMapa.includes(`desenho:${t.id}`)
                          ? '#fff0ad'
                          : t.cor
                      }
                      strokeWidth={
                        t.espessura +
                        (desenhoSelecionadoId === t.id || selecoesMapa.includes(`desenho:${t.id}`)
                          ? 2
                          : 0)
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: 'none' }}
                    />
                    {!preverJogador &&
                      ferramentaMapa === 'mover' &&
                      t.id !== tracoLivrePreview?.id && (
                        <polyline
                          className="hx-traco-alvo"
                          aria-label="Selecionar desenho para apagar"
                          points={t.pontos.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={Math.max(14, t.espessura + 9)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.ctrlKey || e.shiftKey || e.metaKey)
                              alternarSelecaoMapa('desenho', t.id);
                            else {
                              setDesenhoSelecionadoId(t.id);
                              setMarcadorSelecionadoId(null);
                              setLuzSelecionadaId(null);
                              setBarreiraSelecionadaId(null);
                              setTokenEmEdicaoId(null);
                            }
                          }}
                        />
                      )}
                  </g>
                ))}
              </svg>
            )}
            {fogExploracao && (
              <svg
                className={`nevoa-svg nevoa-exploracao ${preverJogador ? 'nevoa-jogador' : 'nevoa-mestre'}`}
                style={{ opacity: preverJogador ? 1 : 0.4 }}
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d={caminhosExploracao.oculto} fill="#050710" />
                <path d={caminhosExploracao.explorado} fill="#0d1725" opacity="0.69" />
              </svg>
            )}
            {fogManual && !fogExploracao && (
              <svg
                className={`nevoa-svg ${preverJogador ? 'nevoa-jogador' : 'nevoa-mestre'}`}
                style={!preverJogador ? { opacity: opacidadeNevoaMestre / 100 } : undefined}
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <mask
                    id="mascara-nevoa-hexatombe"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="1000"
                    height="1000"
                  >
                    <rect x="0" y="0" width="1000" height="1000" fill="white" />
                    {cenaAtual.nevoa.map((traco) => (
                      <g
                        key={traco.id}
                        stroke={traco.acao === 'revelar' ? 'black' : 'white'}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {traco.pontos.length === 1 ? (
                          <circle
                            cx={traco.pontos[0].x * 10}
                            cy={traco.pontos[0].y * 10}
                            r={traco.raio * 10}
                            fill={traco.acao === 'revelar' ? 'black' : 'white'}
                            stroke="none"
                          />
                        ) : (
                          <polyline
                            points={traco.pontos.map((p) => `${p.x * 10},${p.y * 10}`).join(' ')}
                            strokeWidth={traco.raio * 20}
                          />
                        )}
                      </g>
                    ))}
                  </mask>
                </defs>
                <rect
                  width="1000"
                  height="1000"
                  fill="#070911"
                  mask="url(#mascara-nevoa-hexatombe)"
                />
              </svg>
            )}
            {fogVisao && !fogExploracao && (
              <MascaraVisaoCanvas
                className={`nevoa-svg nevoa-visao ${preverJogador ? 'nevoa-jogador' : 'nevoa-mestre'}`}
                poligono={visaoPoligono.map((p) => ({
                  x: (p.x / Math.max(1, palcoLargura)) * 100,
                  y: (p.y / Math.max(1, palcoAltura)) * 100,
                }))}
              />
            )}
            <IluminacaoCena2D
              ativa={configLuz.ativa}
              ambiente={configLuz.ambiente}
              luzes={emissores}
              largura={palcoLargura}
              altura={palcoAltura}
            />
            {!preverJogador && (
              <svg
                className="barreiras-svg"
                viewBox={`0 0 ${palcoLargura} ${palcoAltura}`}
                preserveAspectRatio="none"
                aria-label="Paredes, portas e pontos de luz da cena"
              >
                {barreirasVisuais.map((b) => (
                  <g
                    key={b.id}
                    className={`barreira-${b.tipo} ${b.aberta ? 'aberta' : ''} ${barreiraSelecionadaId === b.id ? 'barreira-selecionada' : ''} ${selecoesMapa.includes(`barreira:${b.id}`) ? 'hx-multi-selecionado' : ''}`}
                  >
                    <line
                      x1={(b.x1 * palcoLargura) / 100}
                      y1={(b.y1 * palcoAltura) / 100}
                      x2={(b.x2 * palcoLargura) / 100}
                      y2={(b.y2 * palcoAltura) / 100}
                    />
                    <title>
                      {NOMES_BARREIRA[b.tipo]} ·{' '}
                      {barreiraBloqueiaMovimento(b) ? 'bloqueia passagem' : 'passagem livre'} ·{' '}
                      {barreiraBloqueiaVisao(b) ? 'bloqueia visão' : 'visão livre'}
                    </title>
                    {ferramentaMapa === 'mover' && (
                      <line
                        className="barreira-alvo"
                        x1={(b.x1 * palcoLargura) / 100}
                        y1={(b.y1 * palcoAltura) / 100}
                        x2={(b.x2 * palcoLargura) / 100}
                        y2={(b.y2 * palcoAltura) / 100}
                        onPointerDown={(e) => iniciarEdicaoBarreira(e, b, 'corpo')}
                        onPointerMove={moverEdicaoBarreira}
                        onPointerUp={(e) => concluirEdicaoBarreira(e)}
                        onPointerCancel={(e) => concluirEdicaoBarreira(e, false)}
                      />
                    )}
                    {barreiraSelecionadaId === b.id &&
                      ferramentaMapa === 'mover' &&
                      (['inicio', 'fim'] as const).map((parte, i) => (
                        <circle
                          key={parte}
                          className="barreira-alca"
                          cx={((i === 0 ? b.x1 : b.x2) * palcoLargura) / 100}
                          cy={((i === 0 ? b.y1 : b.y2) * palcoAltura) / 100}
                          r={7}
                          onPointerDown={(e) => iniciarEdicaoBarreira(e, b, parte)}
                          onPointerMove={moverEdicaoBarreira}
                          onPointerUp={(e) => concluirEdicaoBarreira(e)}
                          onPointerCancel={(e) => concluirEdicaoBarreira(e, false)}
                        />
                      ))}
                  </g>
                ))}
                {barreiraRascunho && (
                  <line
                    className="barreira-rascunho"
                    x1={(barreiraRascunho.inicio.x * palcoLargura) / 100}
                    y1={(barreiraRascunho.inicio.y * palcoAltura) / 100}
                    x2={(barreiraRascunho.fim.x * palcoLargura) / 100}
                    y2={(barreiraRascunho.fim.y * palcoAltura) / 100}
                  />
                )}
                {fontesLuz.map((f) => (
                  <g
                    key={f.id}
                    className={`luz-ponto ${!f.ativa ? 'inativa' : ''} ${selecoesMapa.includes(`luz:${f.id}`) || luzSelecionadaId === f.id ? 'hx-multi-selecionado' : ''}`}
                    onPointerDown={(e) => selecionarLuz2D(e, f)}
                    onPointerMove={moverLuz2D}
                    onPointerUp={encerrarLuz2D}
                    onPointerCancel={encerrarLuz2D}
                    transform={`translate(${((luzPrevia?.id === f.id ? luzPrevia.x : f.x) * palcoLargura) / 100},${((luzPrevia?.id === f.id ? luzPrevia.y : f.y) * palcoAltura) / 100})`}
                  >
                    <circle r={10} />
                    <text y="4" textAnchor="middle">
                      ✦
                    </text>
                    <title>{f.nome}</title>
                  </g>
                ))}
              </svg>
            )}
            {ferramentaMapa !== 'mover' && (
              <div
                className="mapa-camada-ferramenta"
                title={
                  ferramentaMapa === 'marcador'
                    ? 'Clique para criar marcador'
                    : ferramentaMapa === 'desenhar'
                      ? 'Arraste para desenhar no mapa'
                      : ferramentaMapa === 'luz'
                        ? 'Clique para colocar uma fonte de luz'
                        : ferramentaMapa === 'parede' || ferramentaMapa === 'porta'
                          ? 'Clique e arraste para desenhar'
                          : 'Arraste para pintar a névoa'
                }
                onPointerDown={iniciarPincel}
                onPointerMove={moverPincel}
                onPointerUp={encerrarPincel}
                onPointerCancel={encerrarPincel}
              />
            )}
          </div>
          {desenhoSelecionadoId && ferramentaMapa === 'mover' && !preverJogador && (
            <div className="hx-anotacao-editor-flutuante">
              <strong>✎ Desenho selecionado</strong>
              <button
                type="button"
                onClick={() => excluirItemSelecionado2D('desenho', desenhoSelecionadoId)}
              >
                ✕ Excluir
              </button>
              <button type="button" onClick={() => setDesenhoSelecionadoId(null)}>
                Fechar
              </button>
            </div>
          )}
          {barreiraSelecionada && ferramentaMapa === 'mover' && !preverJogador && (
            <div className="barreira-editor-flutuante" onPointerDown={(e) => e.stopPropagation()}>
              <div className="barreira-editor-cabecalho">
                <strong>⌖ Editar barreira</strong>
                <button
                  type="button"
                  title="Fechar seleção"
                  onClick={() => setBarreiraSelecionadaId(null)}
                >
                  ×
                </button>
              </div>
              <label>
                Tipo
                <select
                  value={barreiraSelecionada.tipo}
                  onChange={(e) =>
                    alterarBarreiraSelecionada((b) =>
                      alterarTipoBarreira(b, e.target.value as BarreiraMapa['tipo']),
                    )
                  }
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
              <label className="checkbox-token">
                <input
                  type="checkbox"
                  checked={barreiraBloqueiaMovimento(barreiraSelecionada)}
                  onChange={(e) =>
                    alterarBarreiraSelecionada((b) => ({
                      ...b,
                      bloqueiaMovimento: e.target.checked,
                    }))
                  }
                  disabled={barreiraSelecionada.tipo === 'porta' && barreiraSelecionada.aberta}
                />{' '}
                Bloquear movimento
              </label>
              <label className="checkbox-token">
                <input
                  type="checkbox"
                  checked={barreiraBloqueiaVisao(barreiraSelecionada)}
                  onChange={(e) =>
                    alterarBarreiraSelecionada((b) => ({ ...b, bloqueiaVisao: e.target.checked }))
                  }
                  disabled={barreiraSelecionada.tipo === 'porta' && barreiraSelecionada.aberta}
                />{' '}
                Bloquear visão
              </label>
              {barreiraSelecionada.tipo === 'porta' && (
                <button
                  type="button"
                  onClick={() =>
                    alterarBarreiraSelecionada((b) => ({
                      ...b,
                      aberta: !b.aberta,
                      trancada: false,
                    }))
                  }
                >
                  {barreiraSelecionada.aberta ? 'Fechar porta' : 'Abrir porta'}
                </button>
              )}
              <div className="barreira-editor-rodape">
                <small>Arraste a linha ou as pontas · Delete para excluir</small>
                <button type="button" onClick={excluirBarreiraSelecionada}>
                  Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!MODO_3D &&
        !preverJogador &&
        ferramentaMapa === 'mover' &&
        luzEdicaoId === luzSelecionadaId &&
        fontesLuz
          .filter((f) => f.id === luzEdicaoId)
          .map((f) => (
            <div
              className="barreira-editor-flutuante hx-luz-editor-flutuante"
              key={f.id}
              role="group"
              aria-label={`Editar fonte de luz ${f.nome}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="barreira-editor-cabecalho">
                <strong>☼ Editar fonte de luz</strong>
                <button
                  type="button"
                  title="Fechar seleção"
                  onClick={() => {
                    setLuzSelecionadaId(null);
                    setLuzEdicaoId(null);
                  }}
                >
                  ×
                </button>
              </div>
              <label className="hx-luz-nome">
                Nome
                <input
                  type="text"
                  maxLength={65}
                  aria-label="Nome da fonte de luz"
                  value={f.nome || ''}
                  onChange={(e) => alterarLuzSelecionada(f.id, { nome: e.target.value })}
                />
              </label>
              <div className="hx-luz-editor-linha">
                <label>
                  <input
                    type="checkbox"
                    checked={f.ativa}
                    onChange={(e) => alterarLuzSelecionada(f.id, { ativa: e.target.checked })}
                  />{' '}
                  Luz acesa
                </label>
                <label className="hx-luz-cor">
                  Cor{' '}
                  <input
                    type="color"
                    value={f.cor}
                    aria-label="Cor da fonte de luz"
                    onChange={(e) => alterarLuzSelecionada(f.id, { cor: e.target.value })}
                  />
                </label>
              </div>
              <label className="hx-luz-alcance">
                Alcance <strong>{f.alcance}%</strong>
                <input
                  type="range"
                  min={2}
                  max={70}
                  step={1}
                  value={f.alcance}
                  aria-label="Alcance da fonte de luz"
                  onChange={(e) => alterarLuzSelecionada(f.id, { alcance: Number(e.target.value) })}
                />
              </label>
              <details className="hx-luz-coordenadas">
                <summary>Posição precisa</summary>
                <div className="duas-colunas hx-posicao-marcador">
                  <label>
                    X (%)
                    <CampoPercentualPt
                      valor={f.x}
                      rotulo={`Posição X da luz ${f.nome}`}
                      aoConfirmar={(x) => alterarLuzSelecionada(f.id, { x })}
                    />
                  </label>
                  <label>
                    Y (%)
                    <CampoPercentualPt
                      valor={f.y}
                      rotulo={`Posição Y da luz ${f.nome}`}
                      aoConfirmar={(y) => alterarLuzSelecionada(f.id, { y })}
                    />
                  </label>
                </div>
              </details>
              <div className="barreira-editor-rodape">
                <small>Arraste a luz para mover · Delete para excluir</small>
                <button type="button" onClick={() => removerLuzSelecionada(f.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}

      <div className="barra-ferramentas-mapa" aria-label="Ferramentas de exploração">
        {MODO_3D && multiSelecionado3D > 0 && !preverJogador && (
          <div className="hx-selecao-topo" role="group" aria-label="Seleção múltipla da Mesa 3D">
            <strong>☑ {multiSelecionado3D}</strong>
            <button type="button" onClick={() => enviar3D('remover-selecoes', true)}>
              ✕ Retirar
            </button>
            <button type="button" onClick={() => enviar3D('limpar-selecoes', true)}>
              Limpar
            </button>
          </div>
        )}
        {!MODO_3D && selecoesMapa.length > 0 && !preverJogador && (
          <div className="hx-selecao-topo" role="group" aria-label="Itens selecionados na mesa">
            <strong>☑ {selecoesMapa.length}</strong>
            <button type="button" onClick={removerSelecaoMapa}>
              ✕ Retirar
            </button>
            <button type="button" onClick={() => setSelecoesMapa([])}>
              Limpar
            </button>
          </div>
        )}
        {!preverJogador && tokenEmEdicaoId && cenaAtual.tokens[tokenEmEdicaoId] && (
          <div
            className="hx-selecao-topo"
            role="group"
            aria-label="Visibilidade do personagem selecionado"
          >
            <strong title={campanha.unidades.find((u) => u.id === tokenEmEdicaoId)?.nome || ''}>
              {campanha.unidades.find((u) => u.id === tokenEmEdicaoId)?.nome || 'Token'}
            </strong>
            <button
              type="button"
              onClick={() => alterarToken(tokenEmEdicaoId, (p) => ({ ...p, oculto: !p.oculto }))}
            >
              {cenaAtual.tokens[tokenEmEdicaoId].oculto ? '◉ Revelar' : '◌ Ocultar'}
            </button>
          </div>
        )}
        <button
          type="button"
          title="Desfazer edição da cena (Ctrl+Z)"
          onClick={() => navegarHistoricoEdicao('desfazer')}
        >
          ↶ <span>Desfazer</span>
        </button>
        <button
          type="button"
          title="Refazer edição da cena (Ctrl+Y ou Ctrl+Shift+Z)"
          onClick={() => navegarHistoricoEdicao('refazer')}
        >
          ↷ <span>Refazer</span>
        </button>
        <button
          title="Selecionar e mover. Shift/Ctrl+clique seleciona vários tokens ou paredes. Clique em uma luz para marcá-la."
          className={ferramentaMapa === 'mover' ? 'ativo' : ''}
          onClick={() => usarFerramenta('mover')}
        >
          ⌖ <span>Mover</span>
        </button>
        <button
          title="Revelar névoa com pincel"
          disabled={!fogManual || (MODO_3D && cameraMesa3D !== 'mestre')}
          className={ferramentaMapa === 'revelar' ? 'ativo' : ''}
          onClick={() => usarFerramenta('revelar')}
        >
          ◌ <span>Revelar</span>
        </button>
        <button
          title="Cobrir área com névoa"
          disabled={!fogManual || (MODO_3D && cameraMesa3D !== 'mestre')}
          className={ferramentaMapa === 'ocultar' ? 'ativo' : ''}
          onClick={() => usarFerramenta('ocultar')}
        >
          ◉ <span>Cobrir</span>
        </button>
        <button
          title="Criar ponto de interesse, editável ou removível pelo mapa e pelo painel da cena"
          disabled={MODO_3D && cameraMesa3D !== 'mestre'}
          className={ferramentaMapa === 'marcador' ? 'ativo' : ''}
          onClick={() => usarFerramenta('marcador')}
        >
          ✦ <span>Marcar</span>
        </button>
        <button
          title="Desenho livre compartilhado entre as Mesas 2D e 3D"
          disabled={MODO_3D && cameraMesa3D !== 'mestre'}
          className={ferramentaMapa === 'desenhar' ? 'ativo' : ''}
          onClick={() => usarFerramenta('desenhar')}
        >
          ✎ <span>Desenhar</span>
        </button>
        {ferramentaMapa === 'desenhar' && (
          <label className="hx-desenho-controles" title="Cor e espessura do traço">
            Cor{' '}
            <input
              type="color"
              aria-label="Cor do desenho"
              value={corDesenho}
              onChange={(e) => setCorDesenho(e.target.value)}
            />{' '}
            Esp.{' '}
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={espessuraDesenho}
              aria-label="Espessura do desenho"
              onChange={(e) => setEspessuraDesenho(Number(e.target.value))}
            />
            {espessuraDesenho}
          </label>
        )}
        <button
          title="Desenhar parede: clique e arraste"
          disabled={MODO_3D && cameraMesa3D !== 'mestre'}
          className={ferramentaMapa === 'parede' ? 'ativo' : ''}
          onClick={() => usarFerramenta('parede')}
        >
          ▥ <span>Parede</span>
        </button>
        <button
          title="Desenhar porta: clique e arraste"
          disabled={MODO_3D && cameraMesa3D !== 'mestre'}
          className={ferramentaMapa === 'porta' ? 'ativo' : ''}
          onClick={() => usarFerramenta('porta')}
        >
          🚪 <span>Porta</span>
        </button>
        <button
          title="Posicionar uma fonte de luz"
          disabled={MODO_3D && cameraMesa3D !== 'mestre'}
          className={ferramentaMapa === 'luz' ? 'ativo' : ''}
          onClick={() => usarFerramenta('luz')}
        >
          ☼ <span>Luz</span>
        </button>
        {!MODO_3D &&
          tokenEmEdicaoId &&
          cenaAtual.tokens[tokenEmEdicaoId] &&
          ferramentaMapa === 'mover' &&
          !preverJogador && (
            <button
              type="button"
              title="Espelhar horizontalmente o token selecionado, sem alterar a rotação ou a ficha"
              disabled={Boolean(cenaAtual.tokens[tokenEmEdicaoId].travado)}
              onClick={() =>
                alterarToken(tokenEmEdicaoId, (p) => ({ ...p, espelhadoX: !p.espelhadoX }))
              }
            >
              ⇄{' '}
              <span>
                {cenaAtual.tokens[tokenEmEdicaoId].espelhadoX ? 'Desfazer flip' : 'Flip token'}
              </span>
            </button>
          )}
        {MODO_3D &&
          cameraMesa3D === 'mestre' &&
          ferramentaMapa === 'mover' &&
          !preverJogador &&
          tokenEmEdicaoId &&
          cenaAtual.tokens[tokenEmEdicaoId] && (
            <>
              <button
                type="button"
                title={`Espelhar horizontalmente ${campanha.unidades.find((u) => u.id === tokenEmEdicaoId)?.nome || 'o token selecionado'} (mesma ação da Mesa 2D)`}
                disabled={Boolean(cenaAtual.tokens[tokenEmEdicaoId].travado)}
                onClick={() =>
                  alterarToken(tokenEmEdicaoId, (p) => ({ ...p, espelhadoX: !p.espelhadoX }))
                }
              >
                ⇄{' '}
                <span>
                  {cenaAtual.tokens[tokenEmEdicaoId].espelhadoX ? 'Desfazer flip' : 'Flip token'}
                </span>
              </button>
            </>
          )}
        {fogManual && (
          <label className="pincel-tamanho" title="Raio do pincel">
            Pincel{' '}
            <input
              type="range"
              min={1}
              max={15}
              value={raioPincel}
              onChange={(e) => setRaioPincel(Number(e.target.value))}
            />
            <small>{raioPincel}</small>
          </label>
        )}
        {fogExploracao && (
          <label className="selecionar-observador-visao">
            Exploração{' '}
            <select
              aria-label="Modo de exploração"
              value={exploracaoGrupo ? 'grupo' : 'individual'}
              onChange={(e) => {
                const grupo = e.target.value === 'grupo';
                setExploracaoGrupo(grupo);
                if (MODO_3D) enviar3D('fog-grupo', grupo ? 'grupo' : 'individual');
              }}
            >
              <option value="individual">Individual</option>
              <option value="grupo">Grupo</option>
            </select>
          </label>
        )}
        <button
          title="Prévia individual do campo de visão. Não modifica a visibilidade salva da cena."
          className={preverJogador ? 'ativo' : ''}
          onClick={() => {
            if (preverJogador) {
              setPreverJogador(false);
              return;
            }
            if (!tokenObservado) {
              setAlerta(
                'Selecione um personagem que tenha token nesta cena para testar sua visão.',
              );
              return;
            }
            setObservadorVisaoId(
              tokenEmEdicaoId && cenaAtual.tokens[tokenEmEdicaoId] ? tokenEmEdicaoId : idObservador,
            );
            setPreverJogador(true);
          }}
        >
          {preverJogador ? '👁' : '◐'}{' '}
          <span>{preverJogador ? `Prévia: ${nomeObservador}` : 'Testar visão do token'}</span>
        </button>
        {preverJogador && (
          <label className="selecionar-observador-visao">
            Observar
            <select
              aria-label="Selecionar personagem observado"
              value={idObservador}
              onChange={(e) => setObservadorVisaoId(e.target.value)}
            >
              {campanha.unidades
                .filter((u) => Boolean(cenaAtual.tokens[u.id]))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} · {NOME_TIPOS[u.tipo]}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      {mostrarDicas && (
        <div className="dicas-mapa">
          <span>✦</span> Clique no token para selecioná-lo · <strong>Botão direito</strong> faz flip
          · <strong>Delete</strong> retira só da cena · Arraste as alças para tamanho/rotação ·{' '}
          <strong>Shift + arrastar</strong> move o mapa · <strong>Roda do mouse</strong>{' '}
          aproxima/afasta{' '}
          <button onClick={() => setMostrarDicas(false)} aria-label="Ocultar instruções">
            ×
          </button>
        </div>
      )}

      <div className="navegacao-mapa">
        {MODO_3D ? (
          <>
            <button onClick={() => enviar3D('zoom', -1)} title="Aproximar câmera 3D">
              ＋
            </button>
            <span>3D</span>
            <button onClick={() => enviar3D('zoom', 1)} title="Afastar câmera 3D">
              −
            </button>
            <button onClick={() => enviar3D('zoom', 0)} title="Centralizar câmera 3D">
              ⤢
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setZoom((z) => limite(Math.round((z + 0.15) * 100) / 100, 0.35, 3.5))}
              title="Aproximar"
            >
              ＋
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => limite(Math.round((z - 0.15) * 100) / 100, 0.35, 3.5))}
              title="Afastar"
            >
              −
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Ajustar mapa inteiro à área da mesa"
            >
              ⤢
            </button>
          </>
        )}
      </div>

      <div className="barra-dados" aria-label="Barra de dados">
        <span className="barra-dados-titulo">◈ DADOS</span>
        <label className="dados-visibilidade" title="Visibilidade da próxima rolagem">
          <span>Rolagem</span>
          <select
            value={visibilidadeRolagem}
            onChange={(e) => setVisibilidadeRolagem(e.target.value as VisibilidadeRolagem)}
            aria-label="Visibilidade da rolagem"
          >
            <option value="publica">🌐 Pública</option>
            <option value="mestre">🔒 Só mestre</option>
          </select>
        </label>
        {([4, 6, 8, 10, 12, 20, 100] as const).map((faces) => (
          <button
            key={faces}
            onClick={() => lancarDados(`1d${faces}`)}
            title={`Rolar um d${faces}`}
            className={faces === 20 ? 'd20' : ''}
          >
            <span>⚄</span>
            <strong>d{faces}</strong>
          </button>
        ))}
        <form
          className="dados-form"
          onSubmit={(e) => {
            e.preventDefault();
            lancarDados();
          }}
        >
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            aria-label="Expressão de dados"
            placeholder="2d6+6"
          />
          <button type="submit" title="Rolar expressão">
            ROLAR ↗
          </button>
        </form>
        <button
          className="historico-atalho"
          onClick={() => abrirJanela('historico')}
          title="Histórico de rolagens"
        >
          ☷
        </button>
      </div>
      {erro && (
        <div className="erro-rolagem" role="alert">
          {erro}
          <button onClick={() => setErro('')}>×</button>
        </div>
      )}
      {rolagemDestacada && (
        <div
          className="rolagem-sobre-mapa"
          role="status"
          aria-live="polite"
          key={rolagemDestacada.id}
          style={
            preverJogador && rolagemDestacada.visibilidade === 'mestre'
              ? { opacity: 0, pointerEvents: 'none' }
              : undefined
          }
        >
          <div
            className="dados-lancamento"
            aria-label={`Dados rolados: ${rolagemDestacada.detalhes}`}
          >
            <Dados3D
              faces={rolagemDestacada.faces}
              valores={rolagemDestacada.valores}
              acabamento="classico"
              onResultado={(valores) => concluirRolagemFisica(rolagemDestacada.id, valores)}
              onGravacao={
                lerCredencial(chaveMestre(CAMPAIGN_ID))
                  ? (video) => publicarVideoRolagemMestre(CAMPAIGN_ID, rolagemDestacada.id, video)
                  : undefined
              }
              onStream={
                lerCredencial(chaveMestre(CAMPAIGN_ID))
                  ? (stream) => {
                      const c = lerCredencial(chaveMestre(CAMPAIGN_ID));
                      return c
                        ? iniciarDadosAoVivo(
                            c,
                            rolagemDestacada.id,
                            stream,
                            rolagemDestacada.visibilidade,
                          )
                        : undefined;
                    }
                  : undefined
              }
              onFimStream={() => {
                const c = lerCredencial(chaveMestre(CAMPAIGN_ID));
                if (c) encerrarDadosAoVivo(c, rolagemDestacada.id);
              }}
            />
          </div>
          <div className="rolagem-placar">
            <div className="rolagem-autor">
              <IconeDaAcao icone={rolagemDestacada.iconeAcao} />
              {rolagemDestacada.visibilidade === 'mestre' ? '🔒 SÓ MESTRE' : '🌐 PÚBLICA'} ·{' '}
              {rolagemDestacada.autor}
            </div>
            <strong className="rolagem-numero">
              {rolagemDestacada.pendente ? '⚄' : rolagemDestacada.total}
            </strong>
            <div className="rolagem-formula">
              {rolagemDestacada.formula}{' '}
              <small>
                {rolagemDestacada.detalhes}
                {rolagemDestacada.valores.length > 12
                  ? ` · ${rolagemDestacada.valores.length - 12} dados extras no total`
                  : ''}
              </small>
            </div>
            <button
              type="button"
              onClick={() => setRolagemDestacada(null)}
              aria-label="Fechar resultado"
              title="Fechar resultado"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <JanelaFlutuante
        {...propsJanela('cenas')}
        titulo="Navegador de cenas"
        icone="▧"
        classe="janela-cenas"
      >
        <div className="painel-cena-titulo">
          <div>
            <span className="mini-titulo">CENA ATIVA</span>
            <strong>{cenaAtual.nome}</strong>
            <small>{urlMapa ? 'Mapa importado' : 'Sem mapa importado'}</small>
          </div>
          <span className="marcador-visivel">
            ●{' '}
            {cenaAtual.visibilidade === 'total'
              ? 'Visível'
              : fogManual && fogVisao
                ? 'Névoa + visão'
                : fogVisao
                  ? 'Visão'
                  : 'Névoa'}
          </span>
        </div>
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">CENAS DA CAMPANHA</span>
          <button onClick={criarNovaCena}>＋ Nova cena</button>
        </div>
        <label className="rotulo-campo" htmlFor="busca-cena">
          Buscar cena
        </label>
        <input
          className="campo"
          id="busca-cena"
          type="search"
          placeholder="Pesquisar pelo nome…"
          value={buscaCena}
          onChange={(e) => setBuscaCena(e.target.value)}
        />
        <div className="lista-cenas">
          {campanha.cenas
            .map((c, indice) => ({ cena: c, indice }))
            .filter(({ cena }) =>
              cena.nome
                .toLocaleLowerCase('pt-BR')
                .includes(buscaCena.trim().toLocaleLowerCase('pt-BR')),
            )
            .map(({ cena: c, indice }) => (
              <div className="item-cena-linha" key={c.id}>
                <button
                  className={`item-cena ${c.id === cenaAtual.id ? 'ativa' : ''}`}
                  onClick={() => selecionarCena(c.id)}
                  title={`Abrir ${c.nome}`}
                >
                  <span>▧</span>
                  <strong>{c.nome}</strong>
                  <small>{c.id === cenaAtual.id ? '● ativa' : c.temMapa ? 'mapa' : 'vazia'}</small>
                </button>
                <button
                  type="button"
                  className="botao-ordem-cena"
                  aria-label={`Subir ${c.nome}`}
                  title="Mover cena para cima"
                  disabled={indice === 0 || Boolean(buscaCena.trim())}
                  onClick={() => reordenarCena(c.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="botao-ordem-cena"
                  aria-label={`Descer ${c.nome}`}
                  title="Mover cena para baixo"
                  disabled={indice === campanha.cenas.length - 1 || Boolean(buscaCena.trim())}
                  onClick={() => reordenarCena(c.id, 1)}
                >
                  ↓
                </button>
              </div>
            ))}
          {campanha.cenas.length > 0 &&
            !campanha.cenas.some((c) =>
              c.nome
                .toLocaleLowerCase('pt-BR')
                .includes(buscaCena.trim().toLocaleLowerCase('pt-BR')),
            ) && <p className="aviso-pequeno">Nenhuma cena encontrada.</p>}
        </div>
        <p className="aviso-pequeno">
          Use ↑ e ↓ para ordenar as cenas (limpe a busca para reordenar). A ordem é salva nesta
          campanha; nenhuma imagem ou token é alterado.
        </p>
        <div className="acoes-cena">
          <button
            type="button"
            title="Duplicar mapa, tokens, névoa, paredes e iluminação da cena ativa"
            onClick={() => {
              void duplicarCena();
            }}
          >
            ⧉ Duplicar cena ativa
          </button>
        </div>
        <label className="rotulo-campo" htmlFor="nome-cena">
          Nome desta cena
        </label>
        <input
          className="campo"
          id="nome-cena"
          value={cenaAtual.nome}
          onChange={(e) => {
            const nome = e.target.value;
            atualizarCena((c) => ({ ...c, nome }));
            setCampanha((c) => ({ ...c, cena: nome }));
          }}
        />
        <label className="rotulo-campo" htmlFor="visibilidade-cena">
          Visibilidade da cena
        </label>
        <select
          className="campo"
          id="visibilidade-cena"
          value={cenaAtual.visibilidade}
          onChange={(e) => {
            atualizarCena((c) => ({ ...c, visibilidade: e.target.value as Cena['visibilidade'] }));
            setFerramentaMapa('mover');
          }}
        >
          <option value="total">Tudo visível</option>
          <option value="nevoa">Névoa manual (pincéis)</option>
          <option value="exploracao">Exploração automática (Fog of War 2D/3D)</option>
          <option value="visao">Visão por personagem (com obstáculos)</option>
          <option value="nevoa_visao">Névoa manual + visão por personagem</option>
        </select>
        {fogExploracao && (
          <div className="mapa-fog-controles">
            <p className="aviso-pequeno">
              Áreas novas ficam escuras; áreas já vistas aparecem sombreadas. O histórico é
              individual por personagem e acompanha a cena entre 2D e 3D.
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Limpar as áreas exploradas desta cena? Os pincéis manuais permanecerão.',
                  )
                )
                  atualizarCena((c) => ({ ...c, exploracaoPorToken: {} }));
              }}
            >
              ↺ Reiniciar exploração
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Limpar as alterações manuais da névoa nesta cena?'))
                  atualizarCena((c) => ({ ...c, nevoa: [] }));
              }}
            >
              ✧ Limpar pincéis
            </button>
          </div>
        )}
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">DIMENSÕES DO MAPA</span>
          <button onClick={() => atualizarCena((c) => ({ ...c, largura: 100, altura: 100 }))}>
            Restaurar 100%
          </button>
        </div>
        <div className="mapa-tamanhos">
          <label>
            Escala do cenário <strong>{Math.max(cenaAtual.largura, cenaAtual.altura)}%</strong>
            <input
              type="range"
              min="100"
              max="500"
              step="25"
              value={Math.max(cenaAtual.largura, cenaAtual.altura)}
              onChange={(e) =>
                atualizarCena((c) => ({
                  ...c,
                  largura: Number(e.target.value),
                  altura: Number(e.target.value),
                }))
              }
            />
          </label>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Ajustar mapa ao enquadramento"
          >
            ⤢ Ajustar mapa
          </button>
        </div>
        <p className="aviso-pequeno">
          Mapa original:{' '}
          {tamanhoImagem ? `${tamanhoImagem.largura} × ${tamanhoImagem.altura} px` : 'sem imagem'} ·
          A proporção da imagem é preservada. A escala amplia a área navegável; o botão ⤢ reajusta o
          zoom.
        </p>
        <p className="aviso-pequeno">
          100% mantém o tamanho original que você aprovou. Expanda cada dimensão e use Shift +
          arrastar para explorar.
        </p>
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">GRADE OPCIONAL</span>
        </div>
        <div className="mapa-grade-config">
          <label className="checkbox-token">
            <input
              type="checkbox"
              checked={gradeAtual.visivel}
              onChange={(e) => atualizarGrade({ visivel: e.target.checked })}
            />{' '}
            Mostrar grade sobre o mapa
          </label>
          <label className="checkbox-token">
            <input
              type="checkbox"
              checked={gradeAtual.encaixarTokens}
              onChange={(e) => atualizarGrade({ encaixarTokens: e.target.checked })}
            />{' '}
            Encaixar tokens ao arrastar
          </label>
          <div className="mapa-grade-medidas">
            <label>
              Colunas
              <input
                className="campo"
                type="number"
                min={4}
                max={60}
                step={1}
                value={gradeAtual.colunas}
                onChange={(e) => {
                  if (e.target.value) atualizarGrade({ colunas: Number(e.target.value) });
                }}
              />
            </label>
            <label>
              Linhas
              <input
                className="campo"
                type="number"
                min={4}
                max={60}
                step={1}
                value={gradeAtual.linhas}
                onChange={(e) => {
                  if (e.target.value) atualizarGrade({ linhas: Number(e.target.value) });
                }}
              />
            </label>
          </div>
          <p className="aviso-pequeno">
            Opcional por cena. A grade não cria distância de movimento nem modifica as regras; o
            encaixe centraliza os tokens nas casas.
          </p>
        </div>
        <span className="aviso-pequeno">
          A visão individual respeita paredes e portas fechadas. Nesta versão local, a ocultação
          funciona como prévia; permissões seguras dependerão do multiplayer.
        </span>
        <div className="acoes-cena">
          <button type="button" onClick={() => abrirJanela('iluminacao')}>
            ☼ Iluminação
          </button>
          <button type="button" onClick={() => abrirJanela('clima')}>
            ☁ Clima visual
          </button>
        </div>
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">CAMADAS</span>
        </div>
        <div className="lista-camadas">
          <div className="linha-camada">
            <span>♟</span>
            <strong>Todos os tokens</strong>
            <button onClick={() => alterarCamada('tokens')}>
              {cenaAtual.camadas.tokens ? '◉ Visível' : '◯ Oculto'}
            </button>
          </div>
          {(
            [
              { chave: 'jogadores', nome: 'Jogadores', icone: '♙' },
              { chave: 'npcs', nome: 'NPCs', icone: '♟' },
              { chave: 'inimigos', nome: 'Inimigos', icone: '⚔' },
            ] as const
          ).map((camada) => (
            <div className="linha-camada" key={camada.chave}>
              <span>{camada.icone}</span>
              <strong>{camada.nome}</strong>
              <button type="button" onClick={() => alterarCamada(camada.chave)}>
                {cenaAtual.camadas[camada.chave] ? '◉ Visível' : '◯ Oculto'}
              </button>
            </div>
          ))}
          <div className="linha-camada">
            <span>✦</span>
            <strong>Marcadores</strong>
            <button onClick={() => alterarCamada('marcadores')}>
              {cenaAtual.camadas.marcadores ? '◉ Visível' : '◯ Oculto'}
            </button>
          </div>
          <div className="linha-camada">
            <span>▧</span>
            <strong>Fundo</strong>
            <button onClick={() => alterarCamada('fundo')}>
              {cenaAtual.camadas.fundo ? '◉ Visível' : '◯ Oculto'}
            </button>
          </div>
        </div>
        <div className="acoes-cena">
          <button className="botao-primario" onClick={() => inputMapa.current?.click()}>
            ↥ {cenaAtual.temMapa ? 'Trocar' : 'Enviar'} mapa
          </button>
          <button
            onClick={() => {
              const cid = cenaAtual.id;
              atualizarCena((c) => ({ ...c, temMapa: false }));
              void excluirArquivo(chaveMapa(cid));
            }}
          >
            Remover imagem
          </button>
        </div>
        <input
          type="file"
          ref={inputMapa}
          accept="image/*"
          hidden
          onChange={(e) => {
            void importarMapa(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {fogManual && (
          <>
            <div className="janela-linha-acoes titulo-exploracao">
              <span className="mini-titulo">NÉVOA MANUAL</span>
            </div>
            <label className="rotulo-campo">
              Opacidade da névoa para o mestre: {opacidadeNevoaMestre}%
              <input
                type="range"
                min={15}
                max={90}
                step={5}
                value={opacidadeNevoaMestre}
                onChange={(e) =>
                  atualizarCena((c) => ({
                    ...c,
                    opacidadeNevoaMestre: normalizarOpacidadeNevoaMestre(Number(e.target.value)),
                  }))
                }
              />
            </label>
            <p className="aviso-pequeno">
              A transparência afeta apenas a visão do mestre; a névoa do jogador permanece opaca. Na
              versão local, a prévia ainda não substitui o controle de acesso do servidor
              multiplayer.
            </p>
            <div className="acoes-cena">
              <button
                onClick={() => atualizarCena((c) => ({ ...c, nevoa: c.nevoa.slice(0, -1) }))}
                disabled={!cenaAtual.nevoa.length}
              >
                ↶ Desfazer pincel
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Apagar todos os traços? A cena ficará coberta pela névoa.'))
                    atualizarCena((c) => ({ ...c, nevoa: [] }));
                }}
              >
                Reiniciar névoa
              </button>
            </div>
            <p className="aviso-pequeno">
              Selecione Revelar/Cobrir na barra superior do mapa e pinte com o mouse.
            </p>
          </>
        )}
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">TOKENS NA CENA</span>
        </div>
        <label className="filtro-tipo-tokens">
          Filtrar mapa e lista por tipo
          <select
            className="campo"
            value={filtroTipoToken}
            onChange={(e) => {
              setFiltroTipoToken(e.target.value as TipoFiltroToken);
              setTokenEmEdicaoId(null);
            }}
          >
            <option value="todos">Todos os tipos</option>
            <option value="jogador">Jogadores</option>
            <option value="npc">NPCs</option>
            <option value="inimigo">Inimigos</option>
          </select>
        </label>
        <p className="aviso-pequeno">
          Ocultar um grupo esconde os personagens dos jogadores, mas mantém seus tokens
          transparentes para o mestre. O botão Ocultar em cada linha funciona individualmente e não
          apaga fichas.
        </p>
        <div className="tokens-em-cena">
          {campanha.unidades
            .filter((u) => tokenPassaFiltro(u.tipo, filtroTipoToken))
            .map((u) => (
              <div key={u.id} className="linha-token-cena">
                <span>
                  {u.nome}
                  {cenaAtual.tokens[u.id]?.travado ? ' 🔒' : ''}
                  {cenaAtual.tokens[u.id]?.oculto ? ' · oculto do jogador' : ''}
                </span>
                {cenaAtual.tokens[u.id] && (
                  <button
                    type="button"
                    onClick={() => alterarToken(u.id, (t) => ({ ...t, oculto: !t.oculto }))}
                  >
                    {cenaAtual.tokens[u.id].oculto ? '◉ Revelar' : '◯ Ocultar'}
                  </button>
                )}
                {cenaAtual.tokens[u.id] && (
                  <button
                    type="button"
                    disabled={Boolean(cenaAtual.tokens[u.id].travado)}
                    onClick={() => alterarToken(u.id, (t) => ({ ...t, espelhadoX: !t.espelhadoX }))}
                  >
                    ⇄ Flip
                  </button>
                )}
                {cenaAtual.tokens[u.id] ? (
                  <button
                    disabled={Boolean(cenaAtual.tokens[u.id].travado)}
                    title={
                      cenaAtual.tokens[u.id].travado
                        ? 'Desbloqueie na ficha de combate para retirar o token'
                        : 'Retirar da cena'
                    }
                    onClick={() => retirarTokenDaCena(u.id)}
                  >
                    Retirar da cena
                  </button>
                ) : (
                  <button onClick={() => adicionarTokenNaCena(u)}>＋ Colocar</button>
                )}
              </div>
            ))}
        </div>
        <div className="janela-linha-acoes titulo-exploracao">
          <strong>✎ DESENHOS ({cenaAtual.desenhos?.length ?? 0})</strong>
          <button
            type="button"
            onClick={() => {
              usarFerramenta('desenhar');
            }}
          >
            ✎ Desenhar
          </button>
        </div>
        <label
          className="checkbox-token"
          title="Permissão compartilhada para desenhar nas Mesas 2D e 3D; não limita o mestre."
        >
          <input
            type="checkbox"
            checked={cenaAtual.permitirDesenhoJogadores !== false}
            onChange={(e) =>
              atualizarCena((c) => ({ ...c, permitirDesenhoJogadores: e.target.checked }))
            }
          />
          Autorizar jogadores a desenhar nesta cena (2D e 3D)
        </label>
        <p className="aviso-pequeno">
          Desativar impede novos traços de convidados, sem apagar os anteriores. O mestre pode
          continuar desenhando.
        </p>
        <div className="lista-obstaculos">
          {normalizarDesenhos(cenaAtual.desenhos).map((t, i) => (
            <div className="linha-token-cena" key={t.id}>
              <span>
                Traço {i + 1} · {t.pontos.length} pontos
              </span>
              <input
                type="color"
                aria-label={`Cor do traço ${i + 1}`}
                value={t.cor}
                onChange={(e) =>
                  atualizarCena((c) => ({
                    ...c,
                    desenhos: (c.desenhos ?? []).map((v) =>
                      v.id === t.id ? { ...v, cor: e.target.value } : v,
                    ),
                  }))
                }
              />
              <input
                type="range"
                min="1"
                max="12"
                value={t.espessura}
                aria-label={`Espessura do traço ${i + 1}`}
                onChange={(e) =>
                  atualizarCena((c) => ({
                    ...c,
                    desenhos: (c.desenhos ?? []).map((v) =>
                      v.id === t.id ? { ...v, espessura: Number(e.target.value) } : v,
                    ),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  atualizarCena((c) => ({
                    ...c,
                    desenhos: (c.desenhos ?? []).filter((v) => v.id !== t.id),
                  }))
                }
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        {(cenaAtual.desenhos?.length ?? 0) > 0 && (
          <div className="acoes-cena">
            <button
              type="button"
              onClick={() =>
                atualizarCena((c) => ({ ...c, desenhos: (c.desenhos ?? []).slice(0, -1) }))
              }
            >
              ↶ Desfazer último traço
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apagar todos os desenhos da cena?'))
                  atualizarCena((c) => ({ ...c, desenhos: [] }));
              }}
            >
              Apagar desenhos
            </button>
          </div>
        )}
        {cenaAtual.marcadores.length > 0 && (
          <>
            <div className="janela-linha-acoes titulo-exploracao">
              <span className="mini-titulo">PONTOS DE INTERESSE</span>
            </div>
            {cenaAtual.marcadores.map((m) => (
              <div key={m.id} className="linha-token-cena">
                <span title={m.texto}>✦ {m.texto}</span>
                <div className="acoes-marcador">
                  <button
                    type="button"
                    title={`Editar ${m.texto}`}
                    onClick={() => abrirFormularioMarcador({ x: m.x, y: m.y }, m.id, m.texto)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    title={`Remover ${m.texto}`}
                    aria-label={`Remover ${m.texto}`}
                    onClick={() =>
                      atualizarCena((c) => ({
                        ...c,
                        marcadores: c.marcadores.filter((x) => x.id !== m.id),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        <button
          className="botao-perigo"
          onClick={() => {
            void apagarCena();
          }}
          disabled={campanha.cenas.length < 2}
        >
          Excluir esta cena
        </button>
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('personagens')}
        titulo="Elenco da mesa"
        icone="♟"
        classe="janela-personagens"
      >
        <div className="janela-linha-acoes">
          <span className="mini-titulo">ELENCO DA CAMPANHA</span>
          <button
            onClick={() => {
              setTipoNovo('jogador');
              setModal('unidade');
            }}
          >
            ＋ Jogador
          </button>
        </div>
        <p className="aviso-pequeno">
          Pesquise, recolha as categorias e oculte personagens individualmente para os jogadores.
          Excluir selecionados remove personagens da campanha e de todas as cenas; ocultar não
          exclui fichas nem tokens.
        </p>
        <label className="hx-elenco-pesquisa">
          Pesquisar no elenco
          <input
            className="campo"
            type="search"
            placeholder="Nome do jogador, NPC ou inimigo..."
            value={buscaElenco}
            onChange={(e) => setBuscaElenco(e.target.value)}
          />
        </label>
        <div className="hx-elenco-acoes">
          <button
            type="button"
            disabled={!idsElencoVisiveis.length}
            onClick={() =>
              setSelecionadosElenco((v) => Array.from(new Set([...v, ...idsElencoVisiveis])))
            }
          >
            Selecionar resultados ({idsElencoVisiveis.length})
          </button>
          <button
            type="button"
            disabled={!selecionadosElenco.length}
            onClick={() => setSelecionadosElenco([])}
          >
            Desmarcar
          </button>
          <button
            type="button"
            className="botao-perigo"
            disabled={!selecionadosElenco.length}
            onClick={removerElencoSelecionado}
          >
            Excluir selecionados ({selecionadosElenco.length})
          </button>
        </div>
        {(['jogador', 'npc', 'inimigo'] as TipoUnidade[]).map((tipo) => (
          <section className="elenco-grupo" key={tipo}>
            <div className="elenco-grupo-titulo">
              <button
                type="button"
                className="hx-elenco-recolher"
                aria-expanded={!elencoRecolhido[tipo] || Boolean(buscaElenco.trim())}
                aria-controls={`hx-elenco-${tipo}`}
                onClick={() => setElencoRecolhido((v) => ({ ...v, [tipo]: !v[tipo] }))}
                title={elencoRecolhido[tipo] ? 'Expandir categoria' : 'Recolher categoria'}
              >
                {elencoRecolhido[tipo] && !buscaElenco.trim() ? '▸' : '▾'}
              </button>
              <strong>
                {tipo === 'jogador' ? 'Grupo de jogadores' : tipo === 'npc' ? 'NPCs' : 'Inimigos'}
              </strong>
              <span>
                {elencoFiltrado.filter((u) => u.tipo === tipo).length}/
                {campanha.unidades.filter((u) => u.tipo === tipo).length}
              </span>
              <button
                type="button"
                className="hx-elenco-grupo-visibilidade"
                onClick={() =>
                  alterarCamada(
                    tipo === 'jogador' ? 'jogadores' : tipo === 'npc' ? 'npcs' : 'inimigos',
                  )
                }
                title={`Ocultar/revelar ${NOME_TIPOS[tipo]} para jogadores`}
              >
                {cenaAtual.camadas[
                  tipo === 'jogador' ? 'jogadores' : tipo === 'npc' ? 'npcs' : 'inimigos'
                ]
                  ? '◉ Grupo visível'
                  : '◌ Grupo oculto'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoNovo(tipo);
                  setModal('unidade');
                }}
                title={`Adicionar ${NOME_TIPOS[tipo]}`}
              >
                ＋
              </button>
            </div>
            {(!elencoRecolhido[tipo] || Boolean(buscaElenco.trim())) && (
              <div className="lista-personagens" id={`hx-elenco-${tipo}`}>
                {elencoFiltrado
                  .filter((u) => u.tipo === tipo)
                  .map((u) => (
                    <div className="hx-elenco-linha" key={u.id}>
                      <label
                        title={`Selecionar ${u.nome} para ações em lote`}
                        className="hx-elenco-check"
                      >
                        <input
                          type="checkbox"
                          checked={selecionadosElenco.includes(u.id)}
                          onChange={() => alternarSelecaoElenco(u.id)}
                          aria-label={`Marcar ${u.nome}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (e.shiftKey) {
                            alternarSelecaoElenco(u.id);
                            return;
                          }
                          selecionarUnidade(u.id);
                        }}
                        className={`linha-personagem ${u.id === selectedId ? 'ativo' : ''}`}
                      >
                        <span
                          className="mini-retrato"
                          style={{ '--cor-unidade': u.cor } as CSSProperties}
                        >
                          {urlRetratos[u.id] ? (
                            <ImagemRetrato
                              src={urlRetratos[u.id]}
                              alt=""
                              ajuste={u.retratoEnquadramento}
                            />
                          ) : imagemTokenCena(u, cenaAtual.tokens[u.id]) ? (
                            <img src={imagemTokenCena(u, cenaAtual.tokens[u.id])} alt="" />
                          ) : (
                            u.nome.slice(0, 1)
                          )}
                        </span>
                        <span>
                          <strong>{u.nome}</strong>
                          <small>
                            {u.chefe ? 'Chefe' : NOME_TIPOS[u.tipo]}
                            {usaRegrasImpeto && u.elemento ? ` · ${u.elemento}` : ''}
                          </small>
                        </span>
                        {usaRegrasImpeto && (
                          <em>
                            {u.hp}/{u.hpMax}
                          </em>
                        )}
                      </button>
                      {cenaAtual.tokens[u.id] && (
                        <button
                          type="button"
                          className="hx-elenco-ocultar"
                          title={
                            cenaAtual.tokens[u.id].oculto
                              ? `Revelar individualmente ${u.nome}`
                              : `Ocultar ${u.nome} para jogadores`
                          }
                          aria-label={
                            cenaAtual.tokens[u.id].oculto
                              ? `Revelar ${u.nome}`
                              : `Ocultar ${u.nome}`
                          }
                          onClick={() => alterarToken(u.id, (p) => ({ ...p, oculto: !p.oculto }))}
                        >
                          {cenaAtual.tokens[u.id].oculto ? '◉ Revelar' : '◌ Ocultar'}
                        </button>
                      )}
                    </div>
                  ))}
                {!elencoFiltrado.some((u) => u.tipo === tipo) && (
                  <span className="elenco-vazio">
                    {buscaElenco
                      ? 'Nenhum resultado nesta categoria.'
                      : `Nenhum ${tipo === 'jogador' ? 'jogador' : tipo === 'npc' ? 'NPC' : 'inimigo'} cadastrado.`}
                  </span>
                )}
              </div>
            )}
          </section>
        ))}
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('iniciativa')}
        titulo="Ordem de turnos"
        icone="☷"
        classe="janela-iniciativa"
      >
        <div className="janela-linha-acoes">
          <span className="mini-titulo">
            {campanha.combateAtivo ? `RODADA ${campanha.rodada}` : 'PARTICIPANTES DO COMBATE'}
          </span>
          <div className="iniciativa-acoes-cabecalho">
            <strong className="contador-participantes">{ordenados.length} na iniciativa</strong>
            {usaRegrasImpeto && (
              <button
                type="button"
                disabled={!ordenados.length}
                title="Rolar iniciativa somente para os participantes escolhidos"
                onClick={() => ordenados.forEach((u) => rolarIniciativa(u))}
              >
                ⚄ Todos
              </button>
            )}
          </div>
        </div>
        <p className="aviso-pequeno">
          Somente os personagens incluídos abaixo participam dos turnos desta cena. Retirá-los não
          remove tokens nem fichas. Chefes Ímpeto: referência de{' '}
          {iniciativasChefe(campanha.unidades.filter((u) => u.tipo === 'jogador').length)} posições
          para o grupo atual; crie as ativações extras conforme o encontro (a ordem atual ainda não
          as insere automaticamente).
        </p>
        <div className="lista-iniciativa">
          {ordenados.map((u, n) => (
            <div
              key={u.id}
              className={`linha-iniciativa ${u.id === campanha.turnoId && campanha.combateAtivo ? 'turno' : ''}`}
            >
              <button className="ini-selecionar" onClick={() => selecionarUnidade(u.id)}>
                <span className="ordem-num">{String(n + 1).padStart(2, '0')}</span>
                <span
                  className="iniciativa-retrato"
                  style={{ '--cor-unidade': u.cor } as CSSProperties}
                >
                  {urlRetratos[u.id] ? (
                    <ImagemRetrato src={urlRetratos[u.id]} alt="" ajuste={u.retratoEnquadramento} />
                  ) : imagemTokenCena(u, cenaAtual.tokens[u.id]) ? (
                    <img src={imagemTokenCena(u, cenaAtual.tokens[u.id])} alt="" />
                  ) : (
                    u.nome.slice(0, 1).toUpperCase()
                  )}
                </span>
                <strong>{u.nome}</strong>
              </button>
              <input
                type="number"
                value={u.iniciativa}
                aria-label={`Iniciativa de ${u.nome}`}
                onChange={(e) =>
                  atualizarUnidade(u.id, (old) => ({
                    ...old,
                    iniciativa: Number(e.target.value) || 0,
                  }))
                }
              />
              {usaRegrasImpeto && (
                <button onClick={() => rolarIniciativa(u)} title="Rolar iniciativa (Ímpeto)">
                  ⚄
                </button>
              )}
              {usaRegrasImpeto && u.tipo === 'inimigo' && (
                <label title="Marcar chefe aplica regras C02; não multiplica automaticamente a iniciativa">
                  <input
                    type="checkbox"
                    checked={u.chefe === true}
                    onChange={(e) =>
                      atualizarUnidade(u.id, (antigo) => ({ ...antigo, chefe: e.target.checked }))
                    }
                  />{' '}
                  Chefe
                </label>
              )}
              <button
                type="button"
                className="ini-retirar"
                title={`Retirar ${u.nome} da iniciativa sem retirar da cena`}
                aria-label={`Retirar ${u.nome} da iniciativa`}
                onClick={() => alterarEntradaIniciativa(u.id, false)}
              >
                ×
              </button>
            </div>
          ))}
          {!ordenados.length && (
            <p className="vazio">Ninguém na iniciativa. Adicione participantes do elenco abaixo.</p>
          )}
        </div>
        <div className="acoes-turnos">
          {!campanha.combateAtivo ? (
            <button
              className="botao-primario"
              onClick={iniciarCombate}
              disabled={!ordenados.length}
            >
              ▶ {usaRegrasImpeto ? 'Iniciar combate' : 'Iniciar turnos'}
            </button>
          ) : (
            <>
              <button className="botao-primario" onClick={proximoTurno}>
                Próximo turno →
              </button>
              <button onClick={encerrarCombate}>
                {usaRegrasImpeto ? 'Encerrar combate' : 'Encerrar turnos'}
              </button>
            </>
          )}
        </div>
        {campanha.combateAtivo && atual && (
          <p className="aviso-pequeno">
            Vez de <strong>{atual.nome}</strong> · rodada {campanha.rodada}.
            {usaRegrasImpeto ? ' Condições diminuem ao fim do turno de quem as possui.' : ''}
          </p>
        )}
        <div className="iniciativa-adicionar-cabecalho">
          <strong>＋ Adicionar participantes</strong>
          <button
            type="button"
            onClick={adicionarTodosDaCenaNaIniciativa}
            disabled={
              !campanha.unidades.some(
                (u) => cenaAtual.tokens[u.id] && !participantesDaCena.includes(u.id),
              )
            }
          >
            Todos com token na cena
          </button>
        </div>
        <div className="iniciativa-elenco-disponivel">
          {disponiveisParaIniciativa.map((u) => (
            <div className="iniciativa-disponivel" key={u.id}>
              <span className="marcador-personagem" style={{ background: u.cor }} />
              <span className="iniciativa-disponivel-nome">
                <strong>{u.nome}</strong>
                <small>
                  {u.chefe ? 'Chefe' : NOME_TIPOS[u.tipo]}
                  {!cenaAtual.tokens[u.id] ? ' · fora do mapa' : ''}
                </small>
              </span>
              <button
                type="button"
                onClick={() => alterarEntradaIniciativa(u.id, true)}
                aria-label={`Adicionar ${u.nome} à iniciativa`}
              >
                ＋ Adicionar
              </button>
            </div>
          ))}
          {!disponiveisParaIniciativa.length && (
            <p className="vazio">Todo o elenco já está na iniciativa.</p>
          )}
        </div>
        {!usaRegrasImpeto && (
          <p className="aviso-pequeno">
            Ordem opcional: defina os valores manualmente. Nenhuma rolagem é presumida.
          </p>
        )}
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('recursos')}
        titulo={usaRegrasImpeto ? 'Ficha de combate · Ímpeto' : 'Detalhes do personagem'}
        icone={usaRegrasImpeto ? '♥' : '♟'}
        classe="janela-recursos"
      >
        {selecionado ? (
          <>
            <div className="cabecalho-ficha">
              <span
                className="avatar-ficha"
                style={{ '--cor-unidade': selecionado.cor } as CSSProperties}
              >
                {urlRetratos[selecionado.id] ? (
                  <ImagemRetrato
                    src={urlRetratos[selecionado.id]}
                    alt=""
                    ajuste={selecionado.retratoEnquadramento}
                  />
                ) : (
                  selecionado.nome.slice(0, 1)
                )}
              </span>
              <div className="hx-ficha-identidade">
                <strong>{selecionado.nome}</strong>
                <small>
                  {usaRegrasImpeto
                    ? selecionado.elemento || NOME_TIPOS[selecionado.tipo]
                    : NOME_TIPOS[selecionado.tipo]}
                </small>
              </div>
              {usaRegrasImpeto && (
                <div
                  className={`hx-ficha-resumo ${fichaSelecionadaA01 ? 'hx-ficha-resumo-a01' : ''}`}
                  aria-label="Recursos atuais do personagem"
                >
                  <div
                    className="hx-resumo-recurso hx-resumo-hp"
                    title={`HP: ${selecionado.hp} de ${selecionado.hpMax}`}
                  >
                    <div className="hx-resumo-cabecalho">
                      <span>♥ HP</span>
                      <strong>
                        {selecionado.hp}
                        <small> / {selecionado.hpMax}</small>
                      </strong>
                    </div>
                    <div className="hx-resumo-barra">
                      <span
                        style={{
                          width: `${selecionado.hpMax ? limite((selecionado.hp / selecionado.hpMax) * 100, 0, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="hx-resumo-recurso hx-resumo-mana"
                    title={`Energia: ${selecionado.mana}, referência ${selecionado.manaMax}`}
                  >
                    <div className="hx-resumo-cabecalho">
                      <span>
                        ◆{' '}
                        {fichaSelecionadaA01
                          ? 'EN'
                          : selecionado.elemento.includes('Não Dobrador')
                            ? 'FOCO'
                            : 'MANA'}
                      </span>
                      <strong>
                        {selecionado.mana}
                        <small>
                          {fichaSelecionadaA01 ? ' / ref. ' : ' / '}
                          {selecionado.manaMax}
                        </small>
                      </strong>
                    </div>
                    <div className="hx-resumo-barra">
                      <span
                        style={{
                          width: `${selecionado.manaMax ? limite((selecionado.mana / selecionado.manaMax) * 100, 0, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  {fichaSelecionadaA01 && (
                    <div
                      className="hx-resumo-recurso hx-resumo-escudo"
                      title="Escudo temporário: absorve dano antes do HP e não se acumula"
                    >
                      <div className="hx-resumo-cabecalho">
                        <span>⬡ ESCUDO</span>
                        <strong>{selecionado.escudo ?? 0}</strong>
                      </div>
                      <div className="hx-resumo-barra">
                        <span style={{ width: (selecionado.escudo ?? 0) > 0 ? '100%' : '0%' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {usaRegrasImpeto && (
                <span
                  className="selo-ca"
                  title="CA Efetiva = CA Base + buffs - penalidades (máximo ±2)"
                >
                  CA{' '}
                  <b>
                    {fichas.some((f) => f.id === selecionado.fichaId && f.dados.impeto)
                      ? caEfetiva({
                          caBase: selecionado.ca,
                          bonusCaTemporario: selecionado.bonusCaTemporario ?? 0,
                          penalidadeCaTemporaria: selecionado.penalidadeCaTemporaria ?? 0,
                          hpMax: selecionado.hpMax,
                          hpAtual: selecionado.hp,
                          energiaReferencia: selecionado.manaMax,
                          energiaAtual: selecionado.mana,
                          regeneracao: 0,
                          ataqueBasicoDados: 2,
                          ataqueBasicoFixo: 2,
                        })
                      : selecionado.ca}
                  </b>
                </span>
              )}
            </div>
            <nav className="hx-ficha-abas" aria-label="Abas da ficha do personagem">
              {(
                [
                  ['atributos', '♥', 'Atributos'],
                  ['habilidades', '✦', 'Habilidades'],
                  ...(fichaSelecionadaA01 ? [['personagem', '☷', 'Personagem'] as const] : []),
                  ['inventario', '▣', 'Inventário'],
                  ['token', '♟', 'Token'],
                ] as const
              ).map(([id, simbolo, nome]) => (
                <button
                  key={id}
                  type="button"
                  className={abaFichaExibida === id ? 'ativa' : ''}
                  aria-current={abaFichaExibida === id ? 'page' : undefined}
                  onClick={() => setAbaFicha(id)}
                >
                  <span aria-hidden="true">{simbolo}</span> {nome}
                  {id === 'inventario' && selecionado.itens?.length ? (
                    <small>
                      {selecionado.itens.reduce((total, item) => total + item.quantidade, 0)}
                    </small>
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="hx-ficha-corpo" aria-live="off">
              {abaFichaExibida === 'atributos' && (
                <section
                  aria-label="Atributos e recursos"
                  className={`hx-ficha-painel ${usaRegrasImpeto ? 'hx-ficha-atributos' : ''}`}
                >
                  {usaRegrasImpeto ? (
                    <>
                      <div className="hx-ficha-ca-controle">
                        <label htmlFor="hx-ficha-ca-valor">
                          ⬡{' '}
                          {fichaSelecionadaA01
                            ? 'CA Base · ajuste do mestre'
                            : 'Classe de Armadura (CA)'}
                        </label>
                        <input
                          id="hx-ficha-ca-valor"
                          type="number"
                          min={0}
                          max={99}
                          step={1}
                          value={selecionado.ca}
                          onChange={(e) =>
                            atualizarUnidade(selecionado.id, (u) => ({
                              ...u,
                              ca: limite(Math.trunc(Number(e.target.value)) || 0, 0, 99),
                            }))
                          }
                        />
                      </div>
                      {recurso('HP', selecionado.hp, selecionado.hpMax, 'hp', true)}
                      <section className="imp-escudo" aria-label="Escudo temporário">
                        <div className="imp-escudo-cabecalho">
                          <span>⬡ ESCUDO TEMPORÁRIO</span>
                          <strong>
                            {selecionado.escudo ?? 0}
                            <small> pontos</small>
                          </strong>
                        </div>
                        <p>
                          Proteção absorvida <b>antes do HP</b>. Novos escudos não somam: mantém o
                          maior. Duração e expiração ficam sob controle do mestre.
                        </p>
                        <div className="imp-escudo-ajustes">
                          <input
                            aria-label="Valor do escudo"
                            type="number"
                            min={0}
                            max={99999}
                            step={1}
                            placeholder="Valor"
                            value={ajusteEscudo}
                            onChange={(e) => setAjusteEscudo(e.target.value)}
                          />
                          <button type="button" onClick={() => ajustarEscudo('conceder')}>
                            + Conceder
                          </button>
                          <button type="button" onClick={() => ajustarEscudo('definir')}>
                            Definir
                          </button>
                          <button type="button" onClick={() => ajustarEscudo('zerar')}>
                            Zerar
                          </button>
                        </div>
                      </section>
                      {recurso(
                        fichaSelecionadaA01
                          ? 'ENERGIA'
                          : selecionado.elemento.includes('Não Dobrador')
                            ? 'FOCO'
                            : 'MANA',
                        selecionado.mana,
                        selecionado.manaMax,
                        'mana',
                        true,
                      )}
                      <p className="imp-dano-info">
                        {fichaSelecionadaA01
                          ? 'EN não possui teto. Cura não ultrapassa HP máximo.'
                          : 'Os valores atuais seguem os limites da ficha.'}{' '}
                        O dano desconta o escudo primeiro.
                      </p>
                      <div className="janela-linha-acoes">
                        <strong>Buffs, debuffs e condições</strong>
                        <button onClick={() => setModal('condicao')}>＋ Adicionar efeito</button>
                      </div>
                      <div className="lista-condicoes">
                        <FaixasEfeitos
                          efeitos={selecionado.condicoes}
                          onAtualizar={(efeitos) =>
                            atualizarUnidade(selecionado.id, (u) => ({ ...u, condicoes: efeitos }))
                          }
                          onRemover={(efeitoId) =>
                            atualizarUnidade(selecionado.id, (u) => ({
                              ...u,
                              condicoes: u.condicoes.filter((efeito) => efeito.id !== efeitoId),
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <p className="aviso-pequeno">
                      Este sistema ainda não possui regras de combate configuradas no Portal do
                      Mestre. Use sua ficha em PDF e o token, sem campos de HP, Mana, CA ou
                      condições predefinidos.
                    </p>
                  )}
                  <div className="acoes-ficha">
                    {usaRegrasImpeto &&
                      selecionado.fichaId &&
                      fichas.some(
                        (f) =>
                          f.id === selecionado.fichaId &&
                          (!f.dados.impeto || f.dados.impeto.escala==='universal-v1') &&
                          papelDaFicha(f.dados) === 'jogador',
                      ) && (
                        <a
                          className="botao-abrir-criador"
                          href={`/criador/?ficha=${encodeURIComponent(selecionado.fichaId)}`}
                        >
                          ✧ Editar ficha completa
                        </a>
                      )}
                    <button
                      className="botao-primario"
                      onClick={() =>
                        selecionado.temPdf ? abrirJanela('pdf') : inputPdf.current?.click()
                      }
                    >
                      {selecionado.temPdf ? '▥ Abrir ficha PDF' : '↥ Importar ficha PDF'}
                    </button>
                    <button onClick={() => inputRetrato.current?.click()}>▣ Retrato</button>
                    {selecionado.temPdf && (
                      <button onClick={() => inputPdf.current?.click()}>Trocar PDF</button>
                    )}
                  </div>
                </section>
              )}
              {abaFichaExibida === 'habilidades' && (
                <section aria-label="Habilidades e ações" className="hx-ficha-painel">
                  {usaRegrasImpeto &&
                    fichas.find((f) => f.id === selecionado.fichaId)?.dados.impeto && (
                      <TestesImpeto
                        ficha={fichas.find((f) => f.id === selecionado.fichaId)!.dados.impeto!}
                        nome={selecionado.nome}
                        onRolar={(expressao, rotulo) => lancarDados(expressao, rotulo)}
                      />
                    )}
                  {usaRegrasImpeto ? (
                    <AcoesDaFicha
                      ficha={fichas.find((f) => f.id === selecionado.fichaId)?.dados}
                      nomePersonagem={selecionado.nome}
                      onRolar={(expressao, nomeAcao, iconeAcao) =>
                        lancarDados(expressao, `${selecionado.nome} · ${nomeAcao}`, iconeAcao)
                      }
                      onEditarIcone={
                        selecionado.fichaId
                          ? (idAcao, icone) =>
                              void atualizarIconeAcaoDaFicha(selecionado.fichaId!, idAcao, icone)
                          : undefined
                      }
                    />
                  ) : (
                    <p className="aviso-pequeno">
                      As habilidades são consultadas pela ficha PDF ou pelo sistema de regras
                      escolhido. Nenhuma regra de Ímpeto é imposta aqui.
                    </p>
                  )}
                  {usaRegrasImpeto &&
                    selecionado.fichaId &&
                    fichas.some(
                      (f) =>
                        f.id === selecionado.fichaId &&
                        (!f.dados.impeto || f.dados.impeto.escala==='universal-v1') &&
                        papelDaFicha(f.dados) === 'jogador',
                    ) && (
                      <a
                        className="botao-abrir-criador hx-ficha-criador-link"
                        href={`/criador/?ficha=${encodeURIComponent(selecionado.fichaId)}`}
                      >
                        ✧ Editar habilidades no Criador
                      </a>
                    )}
                </section>
              )}
              {abaFichaExibida === 'personagem' && fichaSelecionadaA01 && (
                <section
                  aria-label="Detalhes do personagem Ímpeto"
                  className="hx-ficha-painel hx-ficha-personagem impeto-a01-detalhes"
                >
                  <div className="hx-ficha-personagem-cabecalho">
                    <strong>Ficha do personagem</strong>
                    <small>Ímpeto · {fichaSelecionadaA01.escala==='universal-v1'?'Universal':'Avatar A01'}</small>
                  </div>
                  <nav
                    className="hx-ficha-personagem-abas"
                    aria-label="Detalhes da ficha"
                    role="tablist"
                  >
                    {(
                      [
                        ['atributos', 'Atributos'],
                        ['pericias', 'Perícias'],
                        ['escolhas', 'Construção'],
                      ] as const
                    ).map(([id, rotulo]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={abaPersonagem === id}
                        onClick={() => setAbaPersonagem(id)}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </nav>
                  <ConsultaPersonagemImpeto
                    dados={dadosConsultaMestre(fichaSelecionadaA01)}
                    aba={abaPersonagem}
                  />
                </section>
              )}
              {abaFichaExibida === 'inventario' && (
                <section aria-label="Inventário da ficha" className="hx-ficha-painel">
                  <InventarioMesa
                    key={`ficha-${selecionado.id}`}
                    nome={selecionado.nome}
                    itens={selecionado.itens || []}
                    usaRegrasImpeto={usaRegrasImpeto}
                    destinatarios={campanha.unidades
                      .filter((u) => u.id !== selecionado.id && u.tipo === 'jogador')
                      .map((u) => ({ id: u.id, nome: u.nome }))}
                    onAdicionar={entregarItem}
                    onQuantidade={mudarQuantidadeItem}
                    onTransferir={transferirItem}
                    onUsar={usarItem}
                    onRemover={removerItem}
                  />
                  <button
                    type="button"
                    className="hx-inventario-separado"
                    onClick={() => abrirJanela('inventario')}
                  >
                    ▣ Abrir também em janela separada
                  </button>
                </section>
              )}
              {abaFichaExibida === 'token' && (
                <section aria-label="Aparência e ferramentas do token" className="hx-ficha-painel">
                  <details className="token-opcoes-discretas editor-imagens-detalhes">
                    <summary>✦ Ajustar avatar e token antes de usar na mesa</summary>
                    <div className="editor-imagens-corpo">
                      <p className="aviso-pequeno">
                        O retrato e o token possuem enquadramentos independentes. Você pode preparar
                        estas imagens mesmo antes de colocar um token na cena. Cada skin guarda seu
                        próprio ajuste.
                      </p>
                      <EditorRetrato
                        titulo="Retrato da mesa (independente da biblioteca)"
                        imagem={urlRetratos[selecionado.id]}
                        valor={selecionado.retratoEnquadramento}
                        aoAlterar={(valor) =>
                          atualizarUnidade(selecionado.id, (u) => ({
                            ...u,
                            retratoEnquadramento: normalizarAjusteRetrato(valor),
                          }))
                        }
                      />
                      <EditorEnquadramento
                        titulo={`Token · ${skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]) === TOKEN_ORIGINAL ? 'Original' : skinsValidas(selecionado).find((sk) => sk.id === skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]))?.nome || 'Skin'}`}
                        tipo="token"
                        imagem={
                          imagemTokenCena(selecionado, cenaAtual.tokens[selecionado.id]) ||
                          urlRetratos[selecionado.id]
                        }
                        valor={enquadramentoTokenAtivo(
                          selecionado,
                          cenaAtual.tokens[selecionado.id],
                        )}
                        aparencia={aparenciaTokenAtiva(
                          selecionado,
                          cenaAtual.tokens[selecionado.id],
                        )}
                        corPadrao={selecionado.cor}
                        topview={Boolean(
                          imagemTokenCena(selecionado, cenaAtual.tokens[selecionado.id]),
                        )}
                        rotacao={cenaAtual.tokens[selecionado.id]?.rotacao ?? 0}
                        espelhadoX={Boolean(cenaAtual.tokens[selecionado.id]?.espelhadoX)}
                        animado={tokenIdleAtivo(selecionado, cenaAtual.tokens[selecionado.id])}
                        idlePausado={
                          parametrosIdleAtivos(selecionado, cenaAtual.tokens[selecionado.id])
                            .pausado
                        }
                        idleVelocidade={
                          parametrosIdleAtivos(selecionado, cenaAtual.tokens[selecionado.id])
                            .velocidade
                        }
                        aoAlterarAparencia={(valor) => {
                          const ativo = skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]);
                          atualizarUnidade(selecionado.id, (u) =>
                            ativo === TOKEN_ORIGINAL
                              ? { ...u, tokenAparencia: normalizarAparenciaToken(valor, u.cor) }
                              : {
                                  ...u,
                                  skins: skinsValidas(u).map((sk) =>
                                    sk.id === ativo
                                      ? { ...sk, aparencia: normalizarAparenciaToken(valor, u.cor) }
                                      : sk,
                                  ),
                                },
                          );
                        }}
                        aoAlterar={(valor) => {
                          const ativo = skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]);
                          atualizarUnidade(selecionado.id, (u) =>
                            ativo === TOKEN_ORIGINAL
                              ? { ...u, tokenEnquadramento: normalizarEnquadramento(valor) }
                              : {
                                  ...u,
                                  skins: skinsValidas(u).map((sk) =>
                                    sk.id === ativo
                                      ? { ...sk, enquadramento: normalizarEnquadramento(valor) }
                                      : sk,
                                  ),
                                },
                          );
                        }}
                      />
                      <button type="button" onClick={() => inputRetrato.current?.click()}>
                        ▣ Importar/trocar retrato
                      </button>
                      <button type="button" onClick={() => inputToken.current?.click()}>
                        ↥ Importar/trocar token original (imagem ou GIF idle)
                      </button>
                      <p className="aviso-pequeno">
                        Para ajustar outra skin, selecione-a na galeria logo abaixo. As imagens
                        originais ficam intactas.
                      </p>
                    </div>
                  </details>
                  <details className="token-opcoes-discretas galeria-skins-detalhes">
                    <summary>Galeria de skins do token</summary>
                    <div className="config-token">
                      <div className="janela-linha-acoes titulo-exploracao">
                        <strong>Aparências e skins</strong>
                        <button onClick={() => inputToken.current?.click()}>
                          ↥ {selecionado.temToken ? 'Trocar' : 'Importar'} original
                        </button>
                      </div>
                      {cenaAtual.tokens[selecionado.id] && (
                        <button
                          type="button"
                          className="flip-visivel-2d"
                          disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                          onClick={() =>
                            alterarToken(selecionado.id, (p) => ({
                              ...p,
                              espelhadoX: !p.espelhadoX,
                            }))
                          }
                        >
                          ⇄{' '}
                          {cenaAtual.tokens[selecionado.id].espelhadoX
                            ? 'Desfazer flip'
                            : 'Flip horizontal'}
                        </button>
                      )}
                      <p className="aviso-pequeno">
                        Adicione diferentes aparências para o mesmo personagem. Skins são locais
                        desta campanha. A skin padrão é usada nas cenas sem escolha específica.
                      </p>
                      <div className="token-skins-selecao">
                        <label htmlFor="skin-token-cena">Aparência nesta cena</label>
                        <select
                          className="campo"
                          id="skin-token-cena"
                          disabled={!cenaAtual.tokens[selecionado.id]}
                          value={cenaAtual.tokens[selecionado.id]?.skinId || ''}
                          onChange={(e) =>
                            alterarToken(selecionado.id, (p) => ({
                              ...p,
                              skinId: e.target.value || undefined,
                            }))
                          }
                        >
                          <option value="">Seguir padrão · {nomeSkinPadrao(selecionado)}</option>
                          <option value={TOKEN_ORIGINAL}>
                            Original {selecionado.tokenIdleGif ? '· GIF idle ' : ''}
                            {selecionado.temToken ? '(imagem importada)' : '(retrato ou inicial)'}
                          </option>
                          {skinsValidas(selecionado).map((skin) => (
                            <option key={skin.id} value={skin.id}>
                              {skin.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="token-skins-galeria" aria-label="Skins disponíveis">
                        <div className="token-skin-cartao">
                          <button
                            type="button"
                            className={`token-skin-miniatura ${cenaAtual.tokens[selecionado.id] && skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]) === TOKEN_ORIGINAL ? 'ativa' : ''}`}
                            disabled={!cenaAtual.tokens[selecionado.id]}
                            title="Selecionar imagem original nesta cena"
                            onClick={() =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                skinId: TOKEN_ORIGINAL,
                              }))
                            }
                          >
                            {urlTokens[selecionado.id] ? (
                              <TokenIdle
                                src={urlTokens[selecionado.id]}
                                alt="Skin original"
                                animado={selecionado.tokenIdleGif === true}
                                pausado={selecionado.tokenIdlePausado === true}
                                velocidade={velocidadeIdle(selecionado.tokenIdleVelocidade)}
                              />
                            ) : urlRetratos[selecionado.id] ? (
                              <img src={urlRetratos[selecionado.id]} alt="Retrato original" />
                            ) : (
                              <span className="token-skin-inicial">
                                {selecionado.nome.slice(0, 1)}
                              </span>
                            )}
                          </button>
                          <strong>
                            Original {selecionado.tokenIdleGif ? '· Idle animado' : ''}
                          </strong>
                          <button
                            type="button"
                            className="token-skin-acao"
                            disabled={skinAtiva(selecionado) === TOKEN_ORIGINAL}
                            onClick={() => tornarSkinPadrao(selecionado.id, TOKEN_ORIGINAL)}
                          >
                            {skinAtiva(selecionado) === TOKEN_ORIGINAL
                              ? '★ Padrão'
                              : 'Definir padrão'}
                          </button>
                        </div>
                        {skinsValidas(selecionado).map((skin) => (
                          <div className="token-skin-cartao" key={skin.id}>
                            <button
                              type="button"
                              className={`token-skin-miniatura ${cenaAtual.tokens[selecionado.id] && skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]) === skin.id ? 'ativa' : ''}`}
                              disabled={!cenaAtual.tokens[selecionado.id]}
                              title={`Usar ${skin.nome} nesta cena`}
                              onClick={() =>
                                alterarToken(selecionado.id, (p) => ({ ...p, skinId: skin.id }))
                              }
                            >
                              {urlSkins[`${selecionado.id}:${skin.id}`] ? (
                                <TokenIdle
                                  src={urlSkins[`${selecionado.id}:${skin.id}`]}
                                  alt={`Prévia da skin ${skin.nome}`}
                                  animado={skin.idleGif === true}
                                  pausado={skin.idlePausado === true}
                                  velocidade={velocidadeIdle(skin.idleVelocidade)}
                                />
                              ) : (
                                <span className="token-skin-inicial">◈</span>
                              )}
                            </button>
                            <strong title={skin.nome}>
                              {skin.nome}
                              {skin.idleGif ? ' · Idle animado' : ''}
                            </strong>
                            <button
                              type="button"
                              className="token-skin-acao"
                              disabled={skinAtiva(selecionado) === skin.id}
                              onClick={() => tornarSkinPadrao(selecionado.id, skin.id)}
                            >
                              {skinAtiva(selecionado) === skin.id ? '★ Padrão' : 'Definir padrão'}
                            </button>
                            {skinParaExcluir === skin.id ? (
                              <div className="token-skin-confirmacao">
                                <button
                                  className="token-skin-apagar"
                                  onClick={() => void excluirSkinToken(selecionado.id, skin.id)}
                                >
                                  Confirmar exclusão
                                </button>
                                <button onClick={() => setSkinParaExcluir(null)}>Cancelar</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="token-skin-apagar"
                                onClick={() => setSkinParaExcluir(skin.id)}
                              >
                                Excluir skin
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {tokenIdleAtivo(selecionado, cenaAtual.tokens[selecionado.id]) && (
                        <div className="token-idle-opcoes-reproducao">
                          <strong>Idle da aparência selecionada</strong>
                          <label>
                            <input
                              type="checkbox"
                              checked={
                                !parametrosIdleAtivos(selecionado, cenaAtual.tokens[selecionado.id])
                                  .pausado
                              }
                              onChange={(e) =>
                                definirPreferenciaIdle(
                                  selecionado.id,
                                  skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]),
                                  'idlePausado',
                                  !e.target.checked,
                                )
                              }
                            />{' '}
                            Reproduzir animação
                          </label>
                          <label>
                            Velocidade{' '}
                            <select
                              className="campo"
                              value={
                                parametrosIdleAtivos(selecionado, cenaAtual.tokens[selecionado.id])
                                  .velocidade
                              }
                              onChange={(e) =>
                                definirPreferenciaIdle(
                                  selecionado.id,
                                  skinAtiva(selecionado, cenaAtual.tokens[selecionado.id]),
                                  'idleVelocidade',
                                  Number(e.target.value),
                                )
                              }
                            >
                              <option value="0.5">Lenta · 0,5×</option>
                              <option value="1">Normal · 1×</option>
                              <option value="1.5">Rápida · 1,5×</option>
                              <option value="2">Muito rápida · 2×</option>
                            </select>
                          </label>
                          <small>
                            As preferências desta skin são mantidas ao trocar de cena e funcionam no
                            2D e no 3D.
                          </small>
                        </div>
                      )}
                      <div className="token-skins-adicionar">
                        <label htmlFor="skin-nome-novo">Nome da nova skin</label>
                        <input
                          id="skin-nome-novo"
                          className="campo"
                          maxLength={60}
                          placeholder="Ex.: Combate, Ferida, Alternativa"
                          value={nomeNovaSkin}
                          onChange={(e) => setNomeNovaSkin(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={skinsValidas(selecionado).length >= 16}
                          onClick={() => inputNovaSkin.current?.click()}
                        >
                          ＋ Adicionar skin (imagem ou GIF idle)
                        </button>
                      </div>
                      <button
                        type="button"
                        className="biblioteca-idle-abrir"
                        aria-expanded={mostrarBibliotecaIdles}
                        onClick={() => setMostrarBibliotecaIdles((a) => !a)}
                      >
                        {mostrarBibliotecaIdles
                          ? '▾ Fechar biblioteca de tokens'
                          : '▸ Abrir biblioteca de tokens do Mestre'}
                      </button>
                      {mostrarBibliotecaIdles && (
                        <BibliotecaTokens
                          onGuardarAtual={arquivoTokenAtual}
                          onAplicar={async (idle, blob) => {
                            const extensao =
                              blob.type === 'image/gif'
                                ? '.gif'
                                : blob.type === 'image/png'
                                  ? '.png'
                                  : blob.type === 'image/jpeg'
                                    ? '.jpg'
                                    : '.webp';
                            const file = new File([blob], `${idle.nome}${extensao}`, {
                              type: blob.type,
                            });
                            await adicionarSkinToken(file, idle.nome);
                          }}
                        />
                      )}
                      <p className="aviso-pequeno">
                        Clique numa miniatura para trocar a skin da cena atual, sem alterar posição,
                        tamanho ou rotação do token. Até 16 skins extras por personagem. A imagem
                        original também pode ser trocada acima.
                      </p>
                      <p className="aviso-pequeno">
                        GIF idle: até 4 MB, 512×512 px e 40 quadros. O Portal reproduz até 12
                        quadros por segundo no 2D e 3D; os GIFs estáticos e as skins antigas
                        continuam funcionando. Prefira fundo transparente. A animação é pausada
                        quando a aba não está visível.
                      </p>
                      <p className="aviso-pequeno">
                        Clique numa skin para usar nesta cena. A galeria pode ser fechada quando não
                        estiver em uso.
                      </p>
                    </div>
                  </details>
                  {cenaAtual.tokens[selecionado.id] && (
                    <details className="token-opcoes-discretas dimensoes-token-3d-detalhes">
                      <summary>↔ Dimensões na Mesa 3D</summary>
                      <div className="token-opcoes-conteudo token-dimensoes-3d">
                        <p className="aviso-pequeno">
                          Ajuste separadamente a largura e a altura da figura em pé. 100% mantém o
                          tamanho original; não altera a Mesa 2D. Ajuste exclusivo deste token nesta
                          cena.
                        </p>
                        <label>
                          Largura{' '}
                          <strong>
                            {dimensoesToken3D(cenaAtual.tokens[selecionado.id]).largura3D}%
                          </strong>
                          <input
                            aria-label="Largura do token na Mesa 3D"
                            type="range"
                            min={TAMANHO_TOKEN_3D_MIN}
                            max={TAMANHO_TOKEN_3D_MAX}
                            step={5}
                            disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                            value={dimensoesToken3D(cenaAtual.tokens[selecionado.id]).largura3D}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (t) => ({
                                ...t,
                                largura3D: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <label>
                          Altura{' '}
                          <strong>
                            {dimensoesToken3D(cenaAtual.tokens[selecionado.id]).altura3D}%
                          </strong>
                          <input
                            aria-label="Altura do token na Mesa 3D"
                            type="range"
                            min={TAMANHO_TOKEN_3D_MIN}
                            max={TAMANHO_TOKEN_3D_MAX}
                            step={5}
                            disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                            value={dimensoesToken3D(cenaAtual.tokens[selecionado.id]).altura3D}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (t) => ({
                                ...t,
                                altura3D: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                          onClick={() =>
                            alterarToken(selecionado.id, (t) => ({
                              ...t,
                              largura3D: 100,
                              altura3D: 100,
                            }))
                          }
                        >
                          ↶ Restaurar proporções (100%)
                        </button>
                      </div>
                    </details>
                  )}
                  {cenaAtual.tokens[selecionado.id] && (
                    <details className="token-opcoes-discretas ferramentas-token-detalhes">
                      <summary>Ferramentas do token</summary>
                      <div className="token-opcoes-conteudo">
                        <label className="checkbox-token">
                          <input
                            type="checkbox"
                            checked={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                travado: e.target.checked,
                              }))
                            }
                          />{' '}
                          🔒 Bloquear posição, tamanho e rotação
                        </label>
                        <label className="checkbox-token">
                          <input
                            type="checkbox"
                            checked={Boolean(cenaAtual.tokens[selecionado.id].ocultarNome)}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                ocultarNome: e.target.checked,
                              }))
                            }
                          />{' '}
                          Ocultar nome sobre o token
                        </label>
                        <div className="acoes-token-extras">
                          <button
                            type="button"
                            disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                            title="Espelhar somente a imagem do token nesta cena"
                            onClick={() =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                espelhadoX: !p.espelhadoX,
                              }))
                            }
                          >
                            ⇄{' '}
                            {cenaAtual.tokens[selecionado.id].espelhadoX
                              ? 'Desfazer flip'
                              : 'Flip horizontal'}
                          </button>
                          <button type="button" onClick={() => centralizarNoToken(selecionado.id)}>
                            ⌖ Centralizar no mapa
                          </button>
                          <button
                            type="button"
                            disabled={duplicandoToken}
                            onClick={() => void duplicarToken(selecionado)}
                          >
                            ⧉ {duplicandoToken ? 'Duplicando…' : 'Duplicar token'}
                          </button>
                        </div>
                        <p className="aviso-pequeno">
                          Duplicar cria uma nova unidade independente nesta cena, sem itens ou ficha
                          vinculada; se a origem for jogador, a cópia entra como NPC. Tokens
                          bloqueados não podem ser arrastados, transformados ou removidos pelo
                          Delete.
                        </p>
                      </div>
                    </details>
                  )}
                  {cenaAtual.tokens[selecionado.id] ? (
                    <details className="token-opcoes-discretas">
                      <summary>Visão e privacidade do token</summary>
                      <div className="token-opcoes-conteudo">
                        <label className="rotulo-campo">
                          Raio de visão: {cenaAtual.tokens[selecionado.id].visao ?? 18}% da largura
                          do mapa
                          <input
                            type="range"
                            min={2}
                            max={50}
                            step={1}
                            value={cenaAtual.tokens[selecionado.id].visao ?? 18}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                visao: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <label className="checkbox-token">
                          <input
                            type="checkbox"
                            checked={Boolean(cenaAtual.tokens[selecionado.id].emiteLuz)}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                emiteLuz: e.target.checked,
                              }))
                            }
                          />{' '}
                          Token emite luz
                        </label>
                        {cenaAtual.tokens[selecionado.id].emiteLuz && (
                          <>
                            <label className="rotulo-campo">
                              Alcance da luz: {cenaAtual.tokens[selecionado.id].alcanceLuz ?? 15}%
                              da largura do mapa
                              <input
                                type="range"
                                min={2}
                                max={70}
                                value={cenaAtual.tokens[selecionado.id].alcanceLuz ?? 15}
                                onChange={(e) =>
                                  alterarToken(selecionado.id, (p) => ({
                                    ...p,
                                    alcanceLuz: Number(e.target.value),
                                  }))
                                }
                              />
                            </label>
                            <label className="campo-cor-token">
                              Cor da luz{' '}
                              <input
                                type="color"
                                value={cenaAtual.tokens[selecionado.id].corLuz ?? '#ffcd86'}
                                onChange={(e) =>
                                  alterarToken(selecionado.id, (p) => ({
                                    ...p,
                                    corLuz: e.target.value,
                                  }))
                                }
                              />
                            </label>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setObservadorVisaoId(selecionado.id);
                            setPreverJogador(true);
                          }}
                        >
                          ◐ Mostrar visão de {selecionado.nome}
                        </button>
                        <label className="checkbox-token">
                          <input
                            type="checkbox"
                            checked={cenaAtual.tokens[selecionado.id].oculto}
                            onChange={(e) =>
                              alterarToken(selecionado.id, (p) => ({
                                ...p,
                                oculto: e.target.checked,
                              }))
                            }
                          />{' '}
                          Ocultar token na prévia do jogador
                        </label>
                        <button
                          type="button"
                          disabled={Boolean(cenaAtual.tokens[selecionado.id].travado)}
                          onClick={() => retirarTokenDaCena(selecionado.id)}
                        >
                          Retirar token da cena (sem teclado)
                        </button>
                      </div>
                    </details>
                  ) : (
                    <button type="button" onClick={() => adicionarTokenNaCena(selecionado)}>
                      ＋ Colocar token nesta cena
                    </button>
                  )}
                  <details className="personagem-opcoes-discretas">
                    <summary>Gerenciar personagem</summary>
                    <button className="botao-perigo" onClick={removerUnidade}>
                      Remover personagem da campanha
                    </button>
                  </details>
                </section>
              )}
            </div>
          </>
        ) : (
          <p className="vazio">Nenhum personagem na mesa.</p>
        )}
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('inventario')}
        titulo={`Inventário · ${selecionado?.nome || 'Personagem'}`}
        icone="⚔"
        classe="janela-inventario"
      >
        {selecionado ? (
          <InventarioMesa
            key={selecionado.id}
            nome={selecionado.nome}
            itens={selecionado.itens || []}
            usaRegrasImpeto={usaRegrasImpeto}
            destinatarios={campanha.unidades
              .filter((u) => u.id !== selecionado.id && u.tipo === 'jogador')
              .map((u) => ({ id: u.id, nome: u.nome }))}
            onAdicionar={entregarItem}
            onQuantidade={mudarQuantidadeItem}
            onTransferir={transferirItem}
            onUsar={usarItem}
            onRemover={removerItem}
          />
        ) : (
          <p className="aviso-pequeno">Selecione um personagem para gerenciar os itens.</p>
        )}
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('clima')}
        titulo="Clima da cena"
        icone="☁"
        classe="janela-clima"
      >
        <p className="aviso-pequeno">
          Efeitos visuais inspirados no Weather do Owlbear Rodeo, criados diretamente no portal. Não
          alteram HP, movimento, visão ou regras do RPG.
        </p>
        {MODO_3D && (
          <p className="aviso-pequeno">
            As condições climáticas são compartilhadas pelas Mesas 2D e 3D. Para mudar o céu entre
            dia, entardecer e noite, abra <strong>Iluminação</strong>.
          </p>
        )}
        <label className="rotulo-campo" htmlFor="clima-tipo">
          Condição climática
        </label>
        <select
          id="clima-tipo"
          className="campo"
          value={climaAtual.tipo}
          onChange={(e) =>
            atualizarCena((c) => ({
              ...c,
              clima: { ...normalizarClima(c.clima), tipo: e.target.value as ConfigClima['tipo'] },
            }))
          }
        >
          {TIPOS_CLIMA.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.simbolo} {tipo.nome}
            </option>
          ))}
        </select>
        <p className="aviso-pequeno">
          {TIPOS_CLIMA.find((t) => t.id === climaAtual.tipo)?.descricao}
        </p>
        <div className="clima-ajustes">
          <label>
            Intensidade / cobertura <strong>{climaAtual.intensidade}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={climaAtual.intensidade}
              disabled={climaAtual.tipo === 'nenhum'}
              onChange={(e) =>
                atualizarCena((c) => ({
                  ...c,
                  clima: { ...normalizarClima(c.clima), intensidade: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            Força do vento <strong>{climaAtual.vento}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={climaAtual.vento}
              disabled={climaAtual.tipo === 'nenhum'}
              onChange={(e) =>
                atualizarCena((c) => ({
                  ...c,
                  clima: { ...normalizarClima(c.clima), vento: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            Direção do vento <strong>{climaAtual.direcao}°</strong>
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={climaAtual.direcao}
              disabled={climaAtual.tipo === 'nenhum'}
              onChange={(e) =>
                atualizarCena((c) => ({
                  ...c,
                  clima: { ...normalizarClima(c.clima), direcao: Number(e.target.value) },
                }))
              }
            />
          </label>
          <p className="aviso-pequeno">
            0° → direita · 90° ↓ baixo · 180° ← esquerda · 270° ↑ cima.
          </p>
        </div>
        <label className="checkbox-token">
          <input
            type="checkbox"
            checked={pausarClima}
            onChange={(e) => setPausarClima(e.target.checked)}
          />{' '}
          Pausar animação neste navegador
        </label>
        <div className="acoes-cena">
          <button
            type="button"
            disabled={climaAtual.tipo === 'nenhum'}
            onClick={() =>
              atualizarCena((c) => ({
                ...c,
                clima: { ...normalizarClima(c.clima), tipo: 'nenhum' },
              }))
            }
          >
            ☀ Remover clima
          </button>
          <button type="button" onClick={() => mudarJanela('clima', { aberta: false })}>
            Fechar painel
          </button>
        </div>
        <p className="aviso-pequeno">
          O clima é salvo separadamente em cada cena e acompanha o backup do mestre. A névoa de
          exploração e a iluminação permanecem independentes. A preferência por movimento reduzido é
          respeitada automaticamente.
        </p>
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('iluminacao')}
        titulo="Iluminação e obstáculos"
        icone="☼"
        classe="janela-iluminacao"
      >
        {MODO_3D && (
          <section className="iluminacao-ceu-3d" aria-label="Céu e horário da cena 3D">
            <div className="janela-linha-acoes titulo-exploracao">
              <span className="mini-titulo">CÉU E HORÁRIO · MESA 3D</span>
            </div>
            <p className="aviso-pequeno">
              Escolha o período desta cena. A mudança é aplicada imediatamente ao céu e à luz do
              mundo 3D, sem alterar a planta ou a Mesa 2D.
            </p>
            <div
              className="presets-iluminacao presets-horario-3d"
              role="group"
              aria-label="Horário da cena 3D"
            >
              {PERIODOS_DIA_3D.map((periodo) => (
                <button
                  key={periodo}
                  type="button"
                  aria-pressed={periodoDiaCena3D === periodo}
                  className={periodoDiaCena3D === periodo ? 'ativo' : ''}
                  onClick={() => escolherPeriodoDia3D(periodo)}
                >
                  {periodo === 'dia' ? '☀' : periodo === 'entardecer' ? '◑' : '☾'}{' '}
                  {AMBIENTES_3D[periodo].nome}
                </button>
              ))}
            </div>
          </section>
        )}
        <p className="aviso-pequeno">
          Configure cada cena separadamente. A opção <strong>Tudo visível</strong> desativa as
          restrições de visão na prévia dos jogadores.
        </p>
        <div className="janela-linha-acoes titulo-exploracao">
          <span className="mini-titulo">ILUMINAÇÃO DA CENA</span>
        </div>
        <div className="presets-iluminacao" role="group" aria-label="Presets de iluminação">
          {PRESETS_ILUMINACAO.map((preset) => (
            <button
              type="button"
              key={preset.id}
              aria-pressed={configLuz.ativa && configLuz.ambiente === preset.ambiente}
              className={configLuz.ativa && configLuz.ambiente === preset.ambiente ? 'ativo' : ''}
              onClick={() =>
                atualizarCena((c) => ({
                  ...c,
                  iluminacao: aplicarPresetIluminacao(
                    c.iluminacao ?? { ativa: false, ambiente: 40, colisao: false },
                    preset.id,
                  ),
                }))
              }
            >
              {preset.nome}
            </button>
          ))}
        </div>
        <p className="aviso-pequeno">
          Os presets ajustam a luz ambiente sem apagar fontes de luz, paredes, portas ou
          configurações de colisão. O efeito aparece com a visão restrita (Névoa ou Visão por
          personagem).
        </p>
        <label className="checkbox-token">
          <input
            type="checkbox"
            checked={configLuz.ativa}
            onChange={(e) =>
              atualizarCena((c) => ({
                ...c,
                iluminacao: {
                  ...(c.iluminacao ?? { ativa: false, ambiente: 40, colisao: false }),
                  ativa: e.target.checked,
                },
              }))
            }
          />{' '}
          Iluminação dinâmica ativada
        </label>
        <label className="rotulo-campo">
          Luz ambiente: {configLuz.ambiente}%
          <input
            type="range"
            min={0}
            max={100}
            value={configLuz.ambiente}
            onChange={(e) =>
              atualizarCena((c) => ({
                ...c,
                iluminacao: {
                  ...(c.iluminacao ?? { ativa: false, ambiente: 40, colisao: false }),
                  ambiente: Number(e.target.value),
                },
              }))
            }
          />
        </label>
        <label className="checkbox-token">
          <input
            type="checkbox"
            checked={configLuz.colisao}
            onChange={(e) =>
              atualizarCena((c) => ({
                ...c,
                iluminacao: {
                  ...(c.iluminacao ?? { ativa: false, ambiente: 40, colisao: false }),
                  colisao: e.target.checked,
                },
              }))
            }
          />{' '}
          Impedir arrasto do mestre através de paredes e portas fechadas (jogadores sempre respeitam
          barreiras físicas)
        </label>
        <p className="aviso-pequeno">
          Paredes e portas fechadas bloqueiam os raios de visão e luz. Portas abertas deixam passar
          luz e movimento. O mestre pode alterar as portas abaixo.
        </p>
        <div className="janela-linha-acoes titulo-exploracao">
          <strong>Obstáculos ({barreiras.length})</strong>
          <button onClick={() => usarFerramenta('parede')}>▥ Desenhar parede</button>
          <button onClick={() => usarFerramenta('porta')}>🚪 Porta</button>
        </div>
        <div className="lista-obstaculos">
          {barreiras.length ? (
            barreiras.map((b, i) => (
              <div className="linha-obstaculo" key={b.id}>
                {!MODO_3D && (
                  <label className="hx-objeto-selecao" title="Marcar barreira para remoção em lote">
                    <input
                      type="checkbox"
                      checked={selecoesMapa.includes(`barreira:${b.id}`)}
                      onChange={() => alternarSelecaoMapa('barreira', b.id)}
                    />
                  </label>
                )}
                <span>
                  <strong>
                    {NOMES_BARREIRA[b.tipo]} {i + 1}
                  </strong>
                  <small>
                    {barreiraBloqueiaMovimento(b) ? 'Bloqueia movimento' : 'Passagem livre'} ·{' '}
                    {barreiraBloqueiaVisao(b) ? 'Bloqueia visão' : 'Visão livre'}
                  </small>
                </span>
                {b.tipo === 'porta' && (
                  <>
                    <button
                      onClick={() =>
                        atualizarCena((c) => ({
                          ...c,
                          barreiras: (c.barreiras ?? []).map((item) =>
                            item.id === b.id
                              ? { ...item, aberta: !item.aberta, trancada: false }
                              : item,
                          ),
                        }))
                      }
                    >
                      {b.aberta ? 'Fechar' : 'Abrir'}
                    </button>
                    <button
                      title="Trancar/destrancar porta"
                      onClick={() =>
                        atualizarCena((c) => ({
                          ...c,
                          barreiras: (c.barreiras ?? []).map((item) =>
                            item.id === b.id
                              ? { ...item, trancada: !item.trancada, aberta: false }
                              : item,
                          ),
                        }))
                      }
                    >
                      {b.trancada ? '🔓' : '🔒'}
                    </button>
                  </>
                )}
                <select
                  aria-label={`Tipo da barreira ${i + 1}`}
                  value={b.tipo}
                  onChange={(e) =>
                    atualizarCena((c) => ({
                      ...c,
                      barreiras: (c.barreiras ?? []).map((item) =>
                        item.id === b.id
                          ? alterarTipoBarreira(item, e.target.value as BarreiraMapa['tipo'])
                          : item,
                      ),
                    }))
                  }
                >
                  {(Object.entries(NOMES_BARREIRA) as [BarreiraMapa['tipo'], string][]).map(
                    ([tipo, nome]) => (
                      <option value={tipo} key={tipo}>
                        {nome}
                      </option>
                    ),
                  )}
                </select>
                <button
                  type="button"
                  title="Selecionar e editar no mapa"
                  onClick={() => {
                    if (MODO_3D) {
                      escolherCameraMesa3D('mestre');
                      enviar3D('selecionar-barreira', b.id);
                    } else {
                      setFerramentaMapa('mover');
                      setTokenEmEdicaoId(null);
                      setBarreiraSelecionadaId(b.id);
                    }
                  }}
                >
                  Editar
                </button>
                <button
                  className="excluir-obstaculo"
                  title="Remover obstáculo"
                  onClick={() => {
                    if (barreiraSelecionadaId === b.id) setBarreiraSelecionadaId(null);
                    atualizarCena((c) => ({
                      ...c,
                      barreiras: (c.barreiras ?? []).filter((item) => item.id !== b.id),
                    }));
                  }}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p className="aviso-pequeno">
              Nenhum obstáculo. Selecione Parede ou Porta e arraste sobre o mapa para desenhar.
            </p>
          )}
        </div>
        <div className="janela-linha-acoes titulo-exploracao">
          <strong>Fontes de luz ({fontesLuz.length})</strong>
          <button onClick={() => usarFerramenta('luz')}>☼ Adicionar no mapa</button>
        </div>
        <div className="lista-obstaculos hx-fontes-luz-lista">
          {fontesLuz.length ? (
            fontesLuz.map((f, i) => (
              <div className="fonte-luz-item hx-fonte-luz-resumo" data-luz-id={f.id} key={f.id}>
                {!MODO_3D && (
                  <label className="hx-luz-selecao" title="Selecionar para remoção em lote">
                    <input
                      type="checkbox"
                      checked={selecoesMapa.includes(`luz:${f.id}`)}
                      onChange={() => alternarSelecaoMapa('luz', f.id)}
                    />{' '}
                    Seleção múltipla
                  </label>
                )}
                <div className="hx-fonte-luz-titulo">
                  <strong title={f.nome}>✦ {f.nome || `Luz ${i + 1}`}</strong>
                  <small>
                    <span className="hx-luz-mini-cor" style={{ backgroundColor: f.cor }} />{' '}
                    {f.ativa ? 'Acesa' : 'Apagada'} · {f.alcance}% de alcance
                  </small>
                </div>
                <div className="hx-fonte-luz-acoes">
                  <button
                    type="button"
                    title={`Editar ${f.nome || `Luz ${i + 1}`} no mapa`}
                    onClick={() => editarFonteLuz(f.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    title={f.ativa ? 'Apagar luz' : 'Acender luz'}
                    onClick={() => alterarLuzSelecionada(f.id, { ativa: !f.ativa })}
                  >
                    {f.ativa ? 'Apagar' : 'Acender'}
                  </button>
                  <button
                    type="button"
                    className="excluir-obstaculo"
                    title="Remover luz da cena"
                    onClick={() => removerLuzSelecionada(f.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="aviso-pequeno">Nenhuma fonte de luz na cena.</p>
          )}
        </div>
        <div className="acoes-cena">
          <button
            onClick={() => {
              setFerramentaMapa('mover');
              setPreverJogador(true);
            }}
          >
            ◐ Prévia do jogador
          </button>
          <button
            onClick={() => {
              atualizarCena((c) => ({ ...c, visibilidade: 'total' }));
              setPreverJogador(false);
            }}
          >
            👁 Tudo visível
          </button>
        </div>
        <p className="aviso-pequeno">
          Esta prévia não protege dados secretos de usuários conectados. A filtragem por jogador
          será feita pelo servidor multiplayer.
        </p>
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('chat')}
        titulo="Chat da campanha"
        icone="◉"
        classe="janela-chat"
        manterMontado
      >
        <ChatMesa
          campanhaId={CAMPAIGN_ID}
          personagens={campanha.unidades.map((u) => ({
            id: u.id,
            nome: u.nome,
            tipo: u.tipo,
            foto: urlRetratos[u.id] || urlTokens[u.id],
            cor: u.cor,
            enquadramento: u.retratoEnquadramento,
          }))}
          cenaNome={cenaAtual.nome}
          visivel={janelas.chat.aberta && !janelas.chat.minimizada}
          onNovas={setChatNaoLidas}
        />
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('diario')}
        titulo="Diário da campanha"
        icone="▤"
        classe="janela-diario"
      >
        <details className="pm-diario-config-campanha">
          <summary>Nome da campanha</summary>
          <label className="rotulo-campo" htmlFor="campanha-nome">
            Nome
          </label>
          <input
            className="campo"
            id="campanha-nome"
            value={campanha.titulo}
            maxLength={120}
            onChange={(e) => setCampanha((c) => ({ ...c, titulo: e.target.value }))}
            onBlur={(e) => {
              try {
                atualizarCampanha(CAMPAIGN_ID, { titulo: e.target.value });
              } catch {
                /* Mesa permanece utilizável */
              }
            }}
          />
        </details>
        <DiarioMestreMultiplayer
          campanhaId={CAMPAIGN_ID}
          paginas={campanha.paginasDiario}
          nomeCampanha={campanha.titulo}
          personagens={campanha.unidades
            .filter((u) => u.tipo === 'jogador')
            .map((u) => ({ id: u.id, nome: u.nome, foto: urlRetratos[u.id], cor: u.cor }))}
          onCriarItem={criarItemDoDiario}
          onOperacao={(operacao: OperacaoDiario) =>
            setCampanha((c) => ({
              ...c,
              paginasDiario: aplicarOperacaoDiario(c.paginasDiario, operacao),
            }))
          }
        />
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('historico')}
        titulo="Histórico de rolagens"
        icone="◈"
        classe="janela-historico"
      >
        <p className="aviso-pequeno">
          🌐 Públicas aparecem na prévia do jogador; 🔒 só mestre ficam ocultas nela. A privacidade
          real entre computadores virá com o servidor multiplayer.
        </p>
        <div className="janela-linha-acoes">
          <span className="mini-titulo">ÚLTIMOS EVENTOS</span>
          <button onClick={() => setCampanha((c) => ({ ...c, registros: [] }))}>Limpar</button>
        </div>
        <div className="lista-eventos" aria-live="polite">
          {[...registrosVisiveis]
            .reverse()
            .slice(0, 40)
            .map((r) => (
              <div key={r.id} className={`registro ${r.tipo}`}>
                {r.iconeAcao ? (
                  <IconeDaAcao icone={r.iconeAcao} />
                ) : (
                  <span>{r.tipo === 'dado' ? '⚄' : '✧'}</span>
                )}
                <p>{r.texto}</p>
                {r.tipo === 'dado' && (
                  <em
                    className={
                      r.visibilidade === 'mestre' ? 'registro-privado' : 'registro-publico'
                    }
                  >
                    {r.visibilidade === 'mestre' ? '🔒 Mestre' : '🌐 Público'}
                  </em>
                )}
                <time>{r.hora}</time>
              </div>
            ))}
          {!registrosVisiveis.length && <p className="vazio">Nenhuma rolagem visível.</p>}
        </div>
      </JanelaFlutuante>

      {/* Manter montado evita interromper a música ao fechar ou minimizar a janela. */}
      <JanelaFlutuante
        {...propsJanela('musica')}
        titulo="Música da sessão"
        icone="♫"
        classe="janela-musica"
        manterMontado
      >
        <MusicaMesa campanhaId={CAMPAIGN_ID} cenaId={cenaAtual.id} />
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('fichas')}
        titulo="Personagens da campanha"
        icone="✧"
        classe="janela-biblioteca-fichas"
      >
        <div className="fichas-cabecalho">
          <p>
            <strong>
              {nomeDoSistema(metaFichasCampanha ? sistemaDaCampanha(metaFichasCampanha) : null)}.
            </strong>{' '}
            Selecione um personagem compatível. Para outras regras ainda não cadastradas, utilize o
            botão <strong>＋ Personagem</strong> e uma ficha PDF.
          </p>
          <div className="fichas-acoes">
            <a className="botao-abrir-criador" href="/personagens/">
              ✧ Meus personagens
            </a>
            <button onClick={() => void atualizarBibliotecaFichas()}>↻ Atualizar lista</button>
          </div>
        </div>
        <label className="campo-busca-fichas">
          Pesquisar personagem
          <input
            type="search"
            value={buscaFicha}
            onChange={(e) => {
              setBuscaFicha(e.target.value);
              setPaginaFicha(0);
            }}
            placeholder="Nome, classe ou elemento..."
          />
        </label>
        <label className="campo-busca-fichas">
          Categoria
          <select
            value={filtroPapelFicha}
            onChange={(e) => {
              setFiltroPapelFicha(e.target.value as PapelFicha | 'todos');
              setPaginaFicha(0);
            }}
          >
            <option value="todos">Todas as fichas</option>
            <option value="jogador">Jogadores</option>
            <option value="npc">NPCs</option>
            <option value="inimigo">Inimigos</option>
            <option value="chefe">Chefes</option>
          </select>
        </label>
        <label className="fichas-filtro-vinculo">
          <input
            type="checkbox"
            checked={mostrarTodasFichas}
            onChange={(e) => {
              setMostrarTodasFichas(e.target.checked);
              setPaginaFicha(0);
            }}
          />{' '}
          Mostrar toda a biblioteca (também não vinculados)
        </label>
        <div className="fichas-contagem">
          {fichasVisiveis.length}{' '}
          {fichasVisiveis.length === 1 ? 'ficha disponível' : 'fichas disponíveis'} nesta seleção
        </div>
        <div className="lista-biblioteca-fichas">
          {fichasVisiveis.slice(paginaFicha * 8, (paginaFicha + 1) * 8).map((f) => {
            const papel = papelDaFicha(f.dados);
            const ligada =
              papel === 'jogador' ? campanha.unidades.find((u) => u.fichaId === f.id) : undefined;
            return (
              <article key={f.id} className="cartao-biblioteca-ficha">
                <div className="fichas-info">
                  <span
                    className="fichas-avatar"
                    style={{ borderColor: corElemento(f.dados.element) }}
                  >
                    {f.dados.photo ? (
                      <ImagemRetrato src={f.dados.photo} ajuste={f.dados.retratoAjuste} alt="" />
                    ) : (
                      f.nome.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div>
                    <strong>{f.nome}</strong>
                    <small>
                      {ROTULOS_PAPEL[papel]} · {descricaoFicha(f)}
                    </small>
                    {usaRegrasImpeto && (
                      <small>
                        HP {f.dados.hpMax} · {f.dados.impeto ? 'EN' : 'Mana'} {f.dados.manaMax} · CA{' '}
                        {f.dados.ca}
                      </small>
                    )}
                  </div>
                  {ligada && <span className="fichas-vinculada">Na mesa</span>}
                </div>
                <div className="fichas-botoes">
                  <button className="botao-primario" onClick={() => colocarFichaNaMesa(f)}>
                    {ligada
                      ? '↻ Atualizar atributos'
                      : papel === 'jogador'
                        ? '＋ Adicionar à mesa'
                        : '＋ Adicionar instância'}
                  </button>
                  {f.dados.impeto ? (
                    <span title="Ficha Ímpeto: consulte as habilidades na mesa ou na biblioteca">
                      {f.dados.impeto.escala==='universal-v1'?'Ímpeto Universal':'Ficha A01'}
                    </span>
                  ) : (
                    <a href="/personagens/">Ver na Biblioteca</a>
                  )}
                </div>
              </article>
            );
          })}
          {!fichasVisiveis.length && (
            <div className="fichas-vazio">
              <strong>
                {fichasCompativeis.length
                  ? 'Nenhum personagem nesta seleção'
                  : 'Nenhum personagem compatível na biblioteca'}
              </strong>
              <p>
                Vincule personagens compatíveis pelo portal ou ative "Mostrar toda a biblioteca".
                Não é possível misturar fichas de sistemas diferentes.
              </p>
              <a className="botao-abrir-criador" href="/personagens/">
                Ir para Meus personagens
              </a>
            </div>
          )}
        </div>
        {fichasVisiveis.length > 8 && (
          <nav className="fichas-paginacao" aria-label="Páginas dos personagens">
            <button
              disabled={paginaFicha === 0}
              onClick={() => setPaginaFicha((p) => Math.max(0, p - 1))}
            >
              ← Anterior
            </button>
            <span>
              Página {paginaFicha + 1} de {Math.ceil(fichasVisiveis.length / 8)}
            </span>
            <button
              disabled={(paginaFicha + 1) * 8 >= fichasVisiveis.length}
              onClick={() => setPaginaFicha((p) => p + 1)}
            >
              Próxima →
            </button>
          </nav>
        )}
        {usaRegrasImpeto && (
          <p className="aviso-pequeno">
            A mesa guarda o HP e a Energia atuais separadamente da ficha de criação. Importar uma
            ficha A01 não altera recursos e condições de um combate em andamento.
          </p>
        )}
      </JanelaFlutuante>

      <JanelaFlutuante
        {...propsJanela('pdf')}
        titulo={`Pergaminho · ${selecionado?.nome || 'Personagem'}`}
        icone="▥"
        classe="janela-pdf"
      >
        <div className="cabecalho-pdf">
          <span>Ficha PDF do personagem</span>
          <button onClick={() => inputPdf.current?.click()}>
            ↥ {selecionado?.temPdf ? 'Substituir PDF' : 'Importar PDF'}
          </button>
        </div>
        {selecionado?.temPdf ? (
          urlPdf ? (
            <iframe
              title={`Ficha PDF de ${selecionado.nome}`}
              src={urlPdf}
              className="leitor-pdf"
            />
          ) : (
            <div className="aviso-pequeno">Carregando PDF...</div>
          )
        ) : (
          <div className="pdf-vazio">
            <strong>Nenhum pergaminho importado</strong>
            <p>
              Selecione um personagem e importe sua ficha em PDF, do sistema escolhido para a
              campanha.
            </p>
            <button className="botao-primario" onClick={() => inputPdf.current?.click()}>
              Importar PDF
            </button>
          </div>
        )}
        {usaRegrasImpeto ? (
          <p className="aviso-pequeno">
            O documento mantém a arte original. HP, Mana e condições são editados na janela Ficha de
            combate.
          </p>
        ) : (
          <p className="aviso-pequeno">
            A ficha PDF é a referência de regras deste personagem. A mesa não impõe atributos de
            combate de outro sistema.
          </p>
        )}
      </JanelaFlutuante>

      {/* Inputs globais para que o PDF possa ser importado mesmo com a janela de recursos fechada. */}
      <input
        type="file"
        hidden
        accept="application/pdf,.pdf"
        ref={inputPdf}
        onChange={(e) => {
          void importarPdf(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        hidden
        accept="image/*"
        ref={inputRetrato}
        onChange={(e) => {
          void importarRetrato(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        hidden
        accept="image/png,image/webp,image/jpeg,image/gif"
        ref={inputToken}
        onChange={(e) => {
          void importarToken(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        hidden
        accept="image/png,image/webp,image/jpeg,image/gif"
        ref={inputNovaSkin}
        onChange={(e) => {
          void adicionarSkinToken(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {modal && (
        <div
          className="modal-fundo"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mesa-modal-titulo"
          >
            <div className="modal-topo">
              <div>
                <small>PORTAL DO MESTRE</small>
                <h2 id="mesa-modal-titulo">
                  {modal === 'unidade'
                    ? 'Adicionar personagem'
                    : modal === 'condicao'
                      ? 'Adicionar efeito'
                      : modal === 'cena'
                        ? 'Criar nova cena'
                        : marcadorPendente?.editarId
                          ? 'Editar ponto de interesse'
                          : 'Novo ponto de interesse'}
                </h2>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Fechar janela">
                ×
              </button>
            </div>
            {modal === 'marcador' && (
              <form className="formulario-modal" onSubmit={salvarMarcador}>
                <label htmlFor="nome-ponto-interesse">
                  Nome do ponto de interesse
                  <input
                    id="nome-ponto-interesse"
                    autoFocus
                    required
                    maxLength={65}
                    value={nomeMarcador}
                    onChange={(e) => setNomeMarcador(e.target.value)}
                    placeholder="Ex.: Entrada da caverna"
                  />
                </label>
                {marcadorPendente && (
                  <div className="duas-colunas hx-posicao-marcador">
                    <label>
                      Posição X (%)
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label="Posição X da marcação"
                        value={coordenadasMarcadorTexto.x}
                        onChange={(e) =>
                          setCoordenadasMarcadorTexto((v) => ({ ...v, x: e.target.value }))
                        }
                        placeholder="Ex.: 12,75"
                      />
                    </label>
                    <label>
                      Posição Y (%)
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label="Posição Y da marcação"
                        value={coordenadasMarcadorTexto.y}
                        onChange={(e) =>
                          setCoordenadasMarcadorTexto((v) => ({ ...v, y: e.target.value }))
                        }
                        placeholder="Ex.: 50,5"
                      />
                    </label>
                  </div>
                )}
                <p className="aviso-pequeno">
                  As marcações são criadas diretamente pelo clique. Aqui você pode renomear e usar
                  coordenadas exatas com vírgula ou ponto (ex.: 12,75).
                </p>
                <div className="modal-acoes">
                  <button type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="botao-primario" type="submit" disabled={!nomeMarcador.trim()}>
                    {marcadorPendente?.editarId ? 'Salvar alterações' : 'Adicionar marcador'}
                  </button>
                </div>
              </form>
            )}
            {modal === 'cena' && (
              <form className="formulario-modal" onSubmit={salvarNovaCena}>
                <label htmlFor="nome-nova-cena">
                  Nome da cena
                  <input
                    id="nome-nova-cena"
                    autoFocus
                    required
                    maxLength={65}
                    value={nomeNovaCena}
                    onChange={(e) => setNomeNovaCena(e.target.value)}
                    placeholder="Ex.: Entrada da caverna"
                  />
                </label>
                <div className="modal-acoes">
                  <button type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="botao-primario" type="submit" disabled={!nomeNovaCena.trim()}>
                    Criar cena
                  </button>
                </div>
              </form>
            )}
            {modal === 'unidade' && (
              <form className="formulario-modal" onSubmit={adicionarUnidade}>
                <label>
                  Nome
                  <input
                    value={nomeNovo}
                    maxLength={45}
                    required
                    placeholder="Nome do personagem"
                    onChange={(e) => setNomeNovo(e.target.value)}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={tipoNovo}
                    onChange={(e) => setTipoNovo(e.target.value as TipoUnidade)}
                  >
                    <option value="jogador">Jogador</option>
                    <option value="npc">NPC</option>
                    <option value="inimigo">Inimigo</option>
                  </select>
                </label>
                {usaRegrasImpeto ? (
                  <>
                    {tipoNovo === 'inimigo' && (
                      <label>
                        <input
                          type="checkbox"
                          checked={chefeNovo}
                          onChange={(e) => setChefeNovo(e.target.checked)}
                        />{' '}
                        Chefe (C02: no máximo uma ativação perdida por rodada)
                      </label>
                    )}
                    <div className="duas-colunas">
                      <label>
                        HP máximo
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={hpNovo}
                          onChange={(e) => setHpNovo(limite(Number(e.target.value) || 1, 1, 9999))}
                        />
                      </label>
                      <label>
                        Mana máximo
                        <input
                          type="number"
                          min={0}
                          max={9999}
                          value={manaNovo}
                          onChange={(e) =>
                            setManaNovo(limite(Number(e.target.value) || 0, 0, 9999))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      CA
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={caNovo}
                        onChange={(e) => setCaNovo(limite(Number(e.target.value) || 0, 0, 99))}
                      />
                    </label>
                  </>
                ) : (
                  <p className="aviso-pequeno">
                    Este cadastro é apenas para identificar o personagem na mesa. Você poderá
                    importar um PDF e usar um token sem preencher atributos exclusivos do Ímpeto.
                  </p>
                )}
                <button type="submit" className="botao-primario">
                  Adicionar à mesa
                </button>
              </form>
            )}
            {modal === 'condicao' && usaRegrasImpeto && (
              <form className="formulario-modal" onSubmit={adicionarCondicao}>
                <p className="hx-efeitos-form-subtitulo">
                  Utiliza as condições que a campanha já possui. A categoria muda apenas a
                  apresentação visual.
                </p>
                <label>
                  Tipo de efeito
                  <select
                    value={tipoEfeitoNovo}
                    onChange={(e) => setTipoEfeitoNovo(e.target.value as TipoEfeitoCombate)}
                  >
                    <option value="buff">Buff · Bônus</option>
                    <option value="debuff">Debuff · Penalidade</option>
                    <option value="condicao">Condição</option>
                  </select>
                </label>
                <label>
                  Efeito
                  <select value={condicaoNova} onChange={(e) => setCondicaoNova(e.target.value)}>
                    {CONDICOES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                {condicaoNova === 'Outra' && (
                  <label>
                    Nome do efeito
                    <input
                      required
                      maxLength={75}
                      value={condicaoCustom}
                      onChange={(e) => setCondicaoCustom(e.target.value)}
                      placeholder="Ex.: Vela Aquática, Lento, Protegido"
                    />
                  </label>
                )}
                <label>
                  Origem (opcional)
                  <input
                    maxLength={75}
                    value={origemEfeitoNova}
                    onChange={(e) => setOrigemEfeitoNova(e.target.value)}
                    placeholder="Ex.: Habilidade da Morgana"
                  />
                </label>
                <label>
                  Duração em turnos
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={turnosNovos}
                    onChange={(e) => setTurnosNovos(limite(Number(e.target.value) || 1, 1, 99))}
                  />
                </label>
                <p className="aviso-pequeno">
                  A duração continua diminuindo ao fim do turno do personagem afetado, como antes.
                  Efeitos mecânicos são aplicados pelo mestre.
                </p>
                <button className="botao-primario" type="submit">
                  Adicionar efeito
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
