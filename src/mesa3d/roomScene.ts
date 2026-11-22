import * as THREE from 'three';
import {
  decodificarBlobGifIdle,
  quadroNoTempo,
  type AnimacaoGifIdle,
} from '../lib/tokenIdleGif.mjs';
import { MOBILIARIO, PONTO_INICIAL } from './roomLogic';
import {
  dimensoesTerreno3D,
  medidasObjeto3D,
  type Cenario3D,
  type ObjetoCena3D,
  type PisoCena3D,
} from './editorCena3D';
import { calcularTamanhoVisualPlanta3D } from './pisoConstruicao3D';
import type { TokenMesa, UnidadeMesa } from '../lib/mesaCompartilhada';
import {
  dimensoesToken3D,
  escalaVisualToken3D,
  type DimensoesToken3D,
} from '../lib/dimensoesToken3D';
import { percentualParaChao3D, chaoParaPercentual3D, referenciaTokens3D } from './mesaLivre3D';
import { AMBIENTES_3D, type PeriodoDia3D } from './ambientes3D';
import { criarAtmosfera3D } from './atmosfera3D';
import type { BarreiraMapa } from '../lib/lighting';
import { pontoMapaPara3D, ponto3DParaMapa } from './mapaCompartilhado3D';
import {
  poligonoDoObservador,
  tokenVisivelParaObservador,
  pontoDentroDoPoligono,
} from '../lib/visaoIndividual';
import {
  miniaturasParaVisaoIndividual3D,
  filtrarIdsMiniaturasVisaoIndividual3D,
} from '../multiplayer/miniaturasVisaoIndividual3D';
import { liberadoPelosPinceis } from '../multiplayer/pinceisVisao3D';
import {
  COLUNAS_FOG,
  LINHAS_FOG,
  celulaFog,
  celulasVisiveisFog,
  mapaEstadosFog,
  type MemoriaFog,
  type TracoFog,
} from '../lib/fogExploracao';
import { criarTexturaMovel25D, type MovelPixel25D } from './spritesPixel25D';
import {
  normalizarAparenciaToken,
  corFundoToken,
  type AparenciaToken,
} from '../lib/aparenciaToken';
import { type FonteLuzMesa, type MarcadorMapa, type TracoDesenho } from '../lib/anotacoesMesa';
import { desenharVisaoCompartilhada3D, type PontoVisao3D } from './desenharVisaoCompartilhada3D';
import { comporRecorteFogComoJogador3D } from './recorteFogComoJogador3D.mjs';
import { modoFogPublicado3D } from './modoFogPublicado3D.mjs';
import { criarCamadaMiniaturas3D } from './renderMiniaturas3D';
import type { InstanciaMiniatura3D } from './miniaturasCena3D';

export type Sala3D = {
  cena: THREE.Scene;
  avatar: THREE.Group;
  figura: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  trocarAparencia: (
    blob: Blob | null,
    nome: string,
    cor: string,
    ativo?: () => boolean,
  ) => Promise<void>;
  girarParaCamera: (camera: THREE.Camera) => void;
  /** Atualiza somente as texturas cujo quadro idle mudou (max. 12 FPS). */
  atualizarIdle: (tempo: number) => void;
  atualizarAnimacoesMiniaturas: (dt: number) => void;
  configurarIdleToken: (id: string, pausado: boolean, velocidade: number) => void;
  configurarCenario: (config: Cenario3D) => void;
  configurarPeriodoDia: (periodo: PeriodoDia3D) => void;
  configurarMiniaturas: (
    lista: readonly InstanciaMiniatura3D[],
    cenario: Cenario3D,
    tokens: Record<string, TokenMesa>,
    mostrar?: boolean,
  ) => void;
  miniaturaAtingida: (raycaster: THREE.Raycaster) => string | null;
  selecionarMiniatura: (id: string | null) => void;
  visualizarMiniatura: (id: string, x: number, z: number) => void;
  configurarConstrucao: (ativa: boolean, cenario: Cenario3D) => void;
  configurarIluminacao: (ambiente: number, ativa: boolean) => void;
  configurarFontesLuz: (
    fontes: readonly FonteLuzMesa[],
    cenario: Cenario3D,
    mostrarIcones: boolean,
  ) => void;
  configurarAnotacoes: (
    marcadores: readonly MarcadorMapa[],
    desenhos: readonly TracoDesenho[],
    cenario: Cenario3D,
    mostrarMarcadores: boolean,
  ) => void;
  previsualizarDesenho: (traco: TracoDesenho | null, cenario: Cenario3D) => void;
  marcadorAtingido: (raycaster: THREE.Raycaster) => string | null;
  luzAtingida: (raycaster: THREE.Raycaster) => string | null;
  desenhoAtingido: (raycaster: THREE.Raycaster) => string | null;
  moverMarcadorVisual: (id: string, local: { x: number; y: number }, cenario: Cenario3D) => void;
  moverLuzVisual: (id: string, local: { x: number; y: number }, cenario: Cenario3D) => void;
  selecionarAnotacaoVisual: (
    tipo: 'marcador' | 'luz' | 'desenho' | null,
    id: string | null,
    multiplas?: readonly string[],
  ) => void;
  aplicarPiso: (tipo: PisoCena3D, blob?: Blob | null) => Promise<void>;
  atualizarPisoRecorte: (blob: Blob) => Promise<void>;
  visualizarObjeto: (id: string, x: number, z: number) => void;
  visualizarEdicaoObjeto: (o: ObjetoCena3D) => void;
  alcaAtingida: (raycaster: THREE.Raycaster) => 'largura' | 'profundidade' | 'rotacao' | null;
  selecionarObjeto: (id: string | null) => void;
  configurarBarreiras: (
    barreiras: readonly BarreiraMapa[],
    cenario: Cenario3D,
    mostrar: boolean,
    selecionada: string | null,
    multiplas?: readonly string[],
  ) => void;
  configurarVisaoIndividual: (
    observadorId: string | null,
    tokens: Record<string, TokenMesa>,
    barreiras: readonly BarreiraMapa[],
    cenario: Cenario3D,
    posicaoAtual?: { x: number; y: number },
    fog?: {
      ativo: boolean;
      manualSomente?: boolean;
      memoria: MemoriaFog;
      pinceis: readonly TracoFog[];
      grupo: boolean;
      idsGrupo: string[];
    },
  ) => void;
  configurarFogPublicado3D: (
    mascara: string | null,
    cenario: Cenario3D,
    poligono?: readonly PontoVisao3D[] | null,
  ) => void;
  atualizarTransicaoFogPublicado3D: (tempo: number) => void;
  tokenEstaVisivel: (id: string) => boolean;
  barreiraAtingida: (raycaster: THREE.Raycaster) => { id: string; ponta: 1 | 2 | null } | null;
  objetoAtingido: (raycaster: THREE.Raycaster) => string | null;
  configurarParticipantes: (
    unidades: UnidadeMesa[],
    tokens: Record<string, TokenMesa>,
    selecionadoId: string,
  ) => void;
  /** Somente convidados: adiciona/remove personagens sem reconstruir sprites ou GIFs existentes. */
  sincronizarParticipantesConvidado: (
    unidades: UnidadeMesa[],
    tokens: Record<string, TokenMesa>,
  ) => void;
  liberarImagemPendenteParticipante: (id: string) => void;
  restaurarImagemParticipante: (id: string, nome: string, cor: string) => void;
  configurarOcultacaoTokens: (tokens: Record<string, TokenMesa>, visaoMestre: boolean) => void;
  carregarImagemParticipante: (
    id: string,
    blob: Blob | null,
    ativo?: () => boolean,
  ) => Promise<void>;
  tokenAtingido: (raycaster: THREE.Raycaster) => string | null;
  visualizarToken: (id: string, x: number, z: number) => void;
  selecionarToken: (id: string | null) => void;
  selecionarTokens: (ids: readonly string[]) => void;
  selecionarObjetos: (ids: readonly string[]) => void;
  orientarToken: (id: string, espelhadoX: boolean) => void;
  dimensionarToken: (id: string, dimensoes: DimensoesToken3D) => void;
  definirAparenciaToken: (id: string, aparencia: AparenciaToken) => void;
  dispose: () => void;
};

const madeira = (clara = false): THREE.CanvasTexture => {
  const tela = document.createElement('canvas');
  tela.width = 512;
  tela.height = 512;
  const c = tela.getContext('2d')!;
  c.fillStyle = clara ? '#806751' : '#43372e';
  c.fillRect(0, 0, 512, 512);
  // Pequenas tábuas em faixas com variação determinística; não depende de arquivos externos.
  for (let i = 0; i < 16; i++) {
    const y = i * 32;
    c.fillStyle = i % 3 === 0 ? '#90765d' : i % 3 === 1 ? '#6e5846' : '#79624d';
    if (!clara) c.fillStyle = i % 2 ? '#44362d' : '#514034';
    c.fillRect(0, y, 512, 30);
    c.fillStyle = 'rgba(23,17,14,.35)';
    c.fillRect(0, y + 30, 512, 2);
    for (let j = 0; j < 12; j++) {
      const x = (j * 71 + i * 41) % 512;
      c.fillStyle = 'rgba(245,204,139,.07)';
      c.fillRect(x, y + 5, 39, 1);
      c.fillStyle = 'rgba(22,15,12,.13)';
      c.fillRect(x + 13, y + 22, 66, 1);
    }
  }
  const t = new THREE.CanvasTexture(tela);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
function avatarFallback(nome: string, cor: string): THREE.CanvasTexture {
  // Standee original em pixel art; skins personalizadas continuam tendo prioridade.
  const el = document.createElement('canvas');
  el.width = 64;
  el.height = 96;
  const c = el.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const bloco = (x: number, y: number, w: number, h: number, tom: string) => {
    c.fillStyle = tom;
    c.fillRect(x, y, w, h);
  };
  const contorno = '#252530';
  // Sombra, botas, túnica, braços e rosto — silhueta legível de vários ângulos.
  bloco(14, 77, 36, 4, '#151d26');
  bloco(19, 62, 12, 16, contorno);
  bloco(35, 62, 12, 16, contorno);
  bloco(20, 63, 9, 12, '#4a3b47');
  bloco(37, 63, 9, 12, '#4a3b47');
  bloco(15, 33, 34, 33, contorno);
  bloco(18, 35, 28, 29, cor);
  bloco(12, 38, 7, 22, contorno);
  bloco(45, 38, 7, 22, contorno);
  bloco(14, 41, 4, 17, '#bd9782');
  bloco(46, 41, 4, 17, '#bd9782');
  bloco(24, 32, 16, 6, '#aa8069');
  bloco(21, 13, 22, 23, contorno);
  bloco(23, 15, 18, 19, '#d1a68e');
  bloco(20, 10, 23, 9, contorno);
  bloco(18, 14, 6, 12, contorno);
  bloco(25, 26, 4, 2, contorno);
  bloco(36, 26, 4, 2, contorno);
  bloco(27, 39, 9, 19, '#eed5ad');
  bloco(29, 42, 5, 14, '#bca383');
  c.font = 'bold 8px monospace';
  c.textAlign = 'center';
  c.fillStyle = '#1c1c25';
  c.fillText(nome.slice(0, 11), 33, 90, 62);
  c.fillStyle = '#f5e7ce';
  c.fillText(nome.slice(0, 11), 32, 89, 62);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
export function criarSala3D(
  nome = 'Aventureiro',
  cor = '#b99570',
  carregarModeloExterno?: (modeloId: string) => Promise<Blob | null>,
): Sala3D {
  const cena = new THREE.Scene();
  const atmosfera = criarAtmosfera3D(cena);
  let periodoDia: PeriodoDia3D = 'dia';
  let brilhoCompartilhado = 100,
    luzCompartilhadaAtiva = false;
  const mats = {
    parede: new THREE.MeshStandardMaterial({ color: '#c4b19a', roughness: 0.98 }),
    rodape: new THREE.MeshStandardMaterial({ color: '#483a32', roughness: 0.83 }),
    metal: new THREE.MeshStandardMaterial({ color: '#80654b', metalness: 0.36, roughness: 0.4 }),
    couro: new THREE.MeshStandardMaterial({ color: '#344555', roughness: 0.9 }),
    vidro: new THREE.MeshStandardMaterial({
      color: '#416b78',
      roughness: 0.25,
      metalness: 0.18,
      emissive: '#15333d',
      emissiveIntensity: 0.6,
    }),
    carpet: new THREE.MeshStandardMaterial({ color: '#554c4a', roughness: 1 }),
    verde: new THREE.MeshStandardMaterial({ color: '#315448', roughness: 1 }),
    barro: new THREE.MeshStandardMaterial({ color: '#9d7865', roughness: 0.95 }),
    livro: new THREE.MeshStandardMaterial({ color: '#8d604d', roughness: 0.95 }),
  };
  const tex = madeira(true),
    texMesa = madeira(false);
  const floorMat = new THREE.MeshStandardMaterial({ map: tex, color: '#c6b7a3', roughness: 0.91 });
  const woodMat = new THREE.MeshStandardMaterial({
    map: texMesa,
    color: '#d4b79b',
    roughness: 0.88,
  });
  const geo = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const colocar = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    receive = true,
  ) => {
    const m = new THREE.Mesh(geo(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = receive;
    cena.add(m);
    return m;
  };
  // Piso em tábuas, paredes com rodapé. A parede de trás fica aberta para a câmera.
  const piso = colocar(18, 0.35, 17, floorMat, 0, -0.22, 0, true);
  piso.name = 'chao-3d-do-mapa';
  // Moldura formada por quatro réguas EXTERNAS ao mapa, nunca por um bloco sólido.
  // O antigo cubo cobria toda a área interna e disputava a profundidade com o piso.
  // Não há nenhuma geometria de madeira entre as quatro réguas; nada interfere na planta.
  const molduraMapa = new THREE.Group();
  molduraMapa.name = 'mesa-de-madeira-ao-redor-do-mapa';
  const molduraPecas = Array.from({ length: 4 }, (_, indice) => {
    const peca = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), woodMat);
    peca.name = ['moldura-frente', 'moldura-fundo', 'moldura-esquerda', 'moldura-direita'][indice];
    peca.receiveShadow = true;
    peca.castShadow = true;
    molduraMapa.add(peca);
    return peca;
  });
  cena.add(molduraMapa);
  const grade = new THREE.Group();
  grade.position.y = 0.065;
  grade.visible = false;
  grade.renderOrder = 1;
  cena.add(grade);
  const atualizarGrade = (cenario: Cenario3D) => {
    grade.traverse((obj) => {
      if (obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    grade.clear();
    const a = dimensoesTerreno3D(cenario),
      passo = cenario.passoGrade || 0.5;
    const pontos: number[] = [];
    for (let x = Math.ceil(a.minX / passo) * passo; x < a.maxX + 0.001; x += passo)
      pontos.push(x, 0, a.minZ, x, 0, a.maxZ);
    for (let z = Math.ceil(a.minZ / passo) * passo; z < a.maxZ + 0.001; z += passo)
      pontos.push(a.minX, 0, z, a.maxX, 0, z);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    const linhas = new THREE.LineSegments(
      geom,
      new THREE.LineBasicMaterial({
        color: '#cdb38d',
        transparent: true,
        opacity: 0.34,
        depthTest: true,
      }),
    );
    grade.add(linhas);
  };
  let gradeChave = '';
  // v1.3.34 — A planta e o chão expansível são superfícies independentes.
  // A imagem não é mais fundida num canvas bege nem distorcida quando o mestre amplia o terreno.
  // A face superior do piso fica em -0.045. A planta precisa de uma folga de
  // profundidade real em relação a essa face: a antiga diferença de 0.016
  // podia causar z-fighting (faixas/listras) com a câmera tática afastada.
  // Os aros e bases dos tokens começam em 0.034, então a planta continua abaixo deles.
  const ALTURA_PLANTA_3D = 0.005;
  const ALTURA_CONTORNO_PLANTA_3D = -0.01;
  const plantaMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    transparent: true,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
    // Pequeno deslocamento no depth buffer para estabilizar o plano em ângulos rasantes.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const planta = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), plantaMaterial);
  planta.name = 'planta-importada-3d';
  planta.rotation.x = -Math.PI / 2;
  planta.position.y = ALTURA_PLANTA_3D;
  // A planta é uma imagem pronta; retirar sombras dinâmicas evita um segundo
  // possível foco de artefatos no mapa distante. As luzes ambientes continuam atuando no material.
  planta.receiveShadow = false;
  planta.visible = false;
  cena.add(planta);
  const contornoMaterial = new THREE.MeshBasicMaterial({
    color: '#78664f',
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const contorno = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contornoMaterial);
  contorno.name = 'borda-discreta-da-planta';
  contorno.rotation.x = -Math.PI / 2;
  contorno.position.y = ALTURA_CONTORNO_PLANTA_3D;
  contorno.visible = false;
  cena.add(contorno);
  let texturaPlanta: THREE.Texture | null = null;
  let numeroTrocaPiso = 0,
    destruido = false,
    construindo = false;
  let configPiso: Cenario3D = { versao: 1, base: 'vazia', objetos: [] };
  const texturasPiso = new Map<PisoCena3D, THREE.Texture>([['madeira', tex]]);
  const pisoPadrao = (tipo: PisoCena3D): THREE.Texture => {
    const anterior = texturasPiso.get(tipo);
    if (anterior) return anterior;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = tipo === 'grama' ? '#63864a' : '#847a6b';
    ctx.fillRect(0, 0, 512, 512);
    const tons =
      tipo === 'grama'
        ? ['#729453', '#4d713b', '#84a668', '#628748']
        : ['#867a6b', '#a69a87', '#73685d', '#999083'];
    for (let z = 0; z < 8; z++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = tons[(x * 17 + z * 11 + x * z) % tons.length];
        ctx.fillRect(x * 64 + 1, z * 64 + 1, 62, 62);
        if (tipo === 'pedra') {
          ctx.strokeStyle = '#534c46';
          ctx.strokeRect(x * 64 + 1, z * 64 + 1, 62, 62);
        }
      }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    texturasPiso.set(tipo, t);
    return t;
  };
  const atualizarPlanta = () => {
    const a = dimensoesTerreno3D(configPiso);
    const visivel = !!texturaPlanta && configPiso.piso === 'imagem';
    planta.visible = visivel;
    contorno.visible = visivel;
    if (!visivel) return;
    const imagem = texturaPlanta!.image as HTMLImageElement;
    // Limitar a planta ao tamanho do piso, sem alterar a escala ao expandir o terreno.
    const w = configPiso.mapaUnico
      ? a.largura
      : Math.min(a.largura, configPiso.larguraPlanta ?? a.largura);
    const h = configPiso.mapaUnico
      ? a.profundidade
      : Math.min(a.profundidade, configPiso.profundidadePlanta ?? a.profundidade);
    // Ajuste livre: alongar largura ou profundidade não altera o outro eixo.
    // Cenários antigos continuam usando o encaixe proporcional sem distorção.
    const r = configPiso.mapaUnico
      ? { largura: a.largura, altura: a.profundidade }
      : calcularTamanhoVisualPlanta3D(
          imagem.naturalWidth || imagem.width,
          imagem.naturalHeight || imagem.height,
          w,
          h,
          configPiso.larguraPlanta ?? w,
          configPiso.profundidadePlanta ?? h,
          configPiso.ajusteMapa || 'conter',
          configPiso.escalaMapa ?? 1,
          configPiso.ajusteLivrePlanta === true,
        );
    const x = configPiso.mapaUnico ? 0 : (configPiso.deslocamentoMapaX ?? 0) * a.largura;
    const z = configPiso.mapaUnico ? 0 : (configPiso.deslocamentoMapaZ ?? 0) * a.profundidade;
    planta.position.set(x, ALTURA_PLANTA_3D, z);
    planta.scale.set(r.largura, r.altura, 1);
    contorno.position.set(x, ALTURA_CONTORNO_PLANTA_3D, z);
    contorno.scale.set(r.largura + 0.14, r.altura + 0.14, 1);
    // A imagem compartilhada deve manter as cores reais inclusive durante edição.
    // A transparência antiga revelava o piso de suporte, deixando o mapa bege/amarelado.
    plantaMaterial.opacity = 1;
    plantaMaterial.transparent = false;
    plantaMaterial.needsUpdate = true;
  };
  const atualizarTerreno = (cenario: Cenario3D) => {
    const a = dimensoesTerreno3D(cenario);
    piso.scale.set(a.largura / 18, 1, a.profundidade / 17);
    // As réguas não se sobrepõem ao piso nem à textura do mapa.
    // O centro da superfície permanece completamente livre.
    const borda = 0.46,
      altura = 0.35,
      y = -0.215;
    molduraPecas[0].position.set(0, y, a.profundidade / 2 + borda / 2);
    molduraPecas[0].scale.set(a.largura + 2 * borda, altura, borda);
    molduraPecas[1].position.set(0, y, -a.profundidade / 2 - borda / 2);
    molduraPecas[1].scale.set(a.largura + 2 * borda, altura, borda);
    molduraPecas[2].position.set(-a.largura / 2 - borda / 2, y, 0);
    molduraPecas[2].scale.set(borda, altura, a.profundidade);
    molduraPecas[3].position.set(a.largura / 2 + borda / 2, y, 0);
    molduraPecas[3].scale.set(borda, altura, a.profundidade);
    const chave = `${a.largura}:${a.profundidade}:${cenario.passoGrade || 0.5}`;
    if (gradeChave !== chave) {
      atualizarGrade(cenario);
      gradeChave = chave;
    }
    atualizarPlanta();
  };
  const aplicarPiso = async (tipo: PisoCena3D, blob?: Blob | null) => {
    // Um piso de edição/visão total nunca deve ser confundido com um bitmap censurado.
    pisoPublicadoTemRecorte = false;
    const pedido = ++numeroTrocaPiso;
    if (tipo === 'imagem' && blob) {
      const url = URL.createObjectURL(blob);
      let textura: THREE.Texture;
      try {
        textura = await new THREE.TextureLoader().loadAsync(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (destruido || pedido !== numeroTrocaPiso) {
        textura.dispose();
        return;
      }
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.anisotropy = 8;
      const anterior = texturaPlanta;
      texturaPlanta = textura;
      if (anterior === texturaPisoPublicado) texturaPisoPublicado = null;
      plantaMaterial.map = textura;
      plantaMaterial.needsUpdate = true;
      anterior?.dispose();
      // O terreno extra é um suporte escuro discreto, não uma moldura bege gigante.
      floorMat.map = null;
      floorMat.color.set('#283541');
      floorMat.needsUpdate = true;
      configPiso = { ...configPiso, piso: 'imagem' };
      atualizarPlanta();
      return;
    }
    if (texturaPlanta) {
      if (texturaPlanta === texturaPisoPublicado) texturaPisoPublicado = null;
      texturaPlanta.dispose();
      texturaPlanta = null;
      plantaMaterial.map = null;
    }
    planta.visible = false;
    contorno.visible = false;
    floorMat.map = pisoPadrao(tipo === 'imagem' ? 'madeira' : tipo);
    floorMat.color.set('#ffffff');
    floorMat.needsUpdate = true;
  };
  // A visão individual 3D publica vários recortes CENSURADOS por segundo.
  // Reutilizar uma única CanvasTexture evita descarte/criação de textura no
  // movimento e mantém posição, tamanho e iluminação da planta sem saltos.
  let telaPisoPublicado: HTMLCanvasElement | null = null;
  let contextoPisoPublicado: CanvasRenderingContext2D | null = null;
  let texturaPisoPublicado: THREE.CanvasTexture | null = null;
  let pisoPublicadoTemRecorte = false;
  const atualizarPisoRecorte = async (blob: Blob): Promise<void> => {
    if (destruido) return;
    if (typeof createImageBitmap !== 'function') {
      await aplicarPiso('imagem', blob);
      if (!destruido && texturaPlanta) pisoPublicadoTemRecorte = true;
      return;
    }
    const imagem = await createImageBitmap(blob);
    try {
      if (destruido) return;
      if (!telaPisoPublicado) {
        telaPisoPublicado = document.createElement('canvas');
        contextoPisoPublicado = telaPisoPublicado.getContext('2d', { alpha: false });
      }
      if (!telaPisoPublicado || !contextoPisoPublicado)
        throw Error('Canvas do recorte indisponível.');
      if (telaPisoPublicado.width !== imagem.width || telaPisoPublicado.height !== imagem.height) {
        telaPisoPublicado.width = imagem.width;
        telaPisoPublicado.height = imagem.height;
      }
      contextoPisoPublicado.drawImage(imagem, 0, 0);
      if (!texturaPisoPublicado) {
        texturaPisoPublicado = new THREE.CanvasTexture(telaPisoPublicado);
        texturaPisoPublicado.colorSpace = THREE.SRGBColorSpace;
        texturaPisoPublicado.anisotropy = 8;
        texturaPisoPublicado.minFilter = THREE.LinearFilter;
        texturaPisoPublicado.magFilter = THREE.LinearFilter;
      }
      if (texturaPlanta !== texturaPisoPublicado) {
        ++numeroTrocaPiso;
        const anterior = texturaPlanta;
        texturaPlanta = texturaPisoPublicado;
        plantaMaterial.map = texturaPisoPublicado;
        plantaMaterial.needsUpdate = true;
        anterior?.dispose();
        floorMat.map = null;
        floorMat.color.set('#283541');
        floorMat.needsUpdate = true;
        configPiso = { ...configPiso, piso: 'imagem' };
        atualizarPlanta();
      }
      texturaPisoPublicado.needsUpdate = true;
      pisoPublicadoTemRecorte = true;
    } finally {
      imagem.close();
    }
  };
  const configurarConstrucao = (ativa: boolean, cenario: Cenario3D) => {
    construindo = ativa;
    configPiso = cenario;
    atualizarTerreno(cenario);
    grade.visible = ativa && cenario.mostrarGrade !== false;
  };
  const configurarIluminacao = (ambiente: number, ativa: boolean) => {
    brilhoCompartilhado = ambiente;
    luzCompartilhadaAtiva = ativa;
    atualizarLuzesAtmosfera();
  };
  // Mantém o ajuste de luminosidade da Mesa 2D, agora relativo ao horário da cena.
  function atualizarLuzesAtmosfera() {
    const a = AMBIENTES_3D[periodoDia];
    const t = luzCompartilhadaAtiva ? Math.max(0, Math.min(1, brilhoCompartilhado / 100)) : 1;
    iluminacaoGeral.color.set(a.hemisferio);
    iluminacaoGeral.intensity = a.intensidadeHemi * (luzCompartilhadaAtiva ? 0.15 + t * 0.85 : 1);
    sol.color.set(a.sol);
    sol.intensity = a.intensidadeSol * (luzCompartilhadaAtiva ? 0.15 + t * 0.85 : 1);
    sol.position.set(a.solX, a.solY, a.solZ);
  }
  const inicioEstruturaDemo = cena.children.length;
  colocar(18, 4.3, 0.24, mats.parede, 0, 2.15, -8.05);
  colocar(0.3, 4.3, 16.2, mats.parede, -8.95, 2.15, 0);
  colocar(0.3, 4.3, 16.2, mats.parede, 8.95, 2.15, 0);
  colocar(18, 0.26, 0.32, mats.rodape, 0, 0.21, -7.95);
  for (const x of [-8.75, 8.75]) colocar(0.34, 0.27, 16.1, mats.rodape, x, 0.18, 0);
  for (const x of [-7.7, -3.8, 0, 3.8, 7.7]) colocar(0.15, 4.3, 0.18, mats.rodape, x, 2.1, -7.82);
  // Tapeçaria e tapete, marcando um caminho legível para circular.
  colocar(8.0, 0.025, 6.3, mats.carpet, -0.35, 0.017, 0.4, false);
  const faixa = new THREE.MeshStandardMaterial({ color: '#a68960', roughness: 1 });
  for (const x of [-4.2, 3.5]) colocar(0.08, 0.03, 6.3, faixa, x, 0.039, 0.4, false);
  // Duas janelas noturnas com caixilharia, embutidas visualmente na parede frontal.
  for (const x of [-2.65, 2.65]) {
    colocar(1.8, 2.15, 0.05, mats.vidro, x, 2.53, -7.87, false);
    colocar(1.92, 0.12, 0.19, mats.rodape, x, 3.65, -7.69);
    colocar(1.92, 0.12, 0.19, mats.rodape, x, 1.4, -7.69);
    colocar(0.13, 2.2, 0.18, mats.rodape, x, 2.52, -7.69);
    colocar(1.9, 0.1, 0.18, mats.rodape, x, 2.5, -7.69);
  }
  // Estantes e livros coloridos.
  const tons = ['#76624e', '#8c564a', '#596d76', '#506552', '#a48552', '#6d566d'];
  for (const x of [-6.3, 6.35]) {
    colocar(2.75, 3.25, 0.78, woodMat, x, 1.64, -6.76);
    colocar(2.46, 2.9, 0.1, mats.rodape, x, 1.64, -6.36);
    for (let y of [0.57, 1.28, 2, 2.74]) {
      colocar(2.5, 0.11, 0.96, mats.rodape, x, y, -6.35);
      for (let i = 0; i < 12; i++) {
        const height = 0.34 + (i % 4) * 0.062;
        const mat = new THREE.MeshStandardMaterial({
          color:
            tons[
              (i + Math.round(x)) % tons.length < 0
                ? (i + 18) % tons.length
                : (i + Math.round(x)) % tons.length
            ],
          roughness: 0.9,
        });
        colocar(0.135, height, 0.53, mat, x - 1.1 + i * 0.19, y + 0.08 + height / 2, -6.38, false);
      }
    }
  }
  // Mesa de trabalho.
  colocar(3.25, 0.18, 1.8, woodMat, 2.65, 1.04, -2.15);
  for (const x of [1.32, 3.98])
    for (const z of [-2.82, -1.48]) colocar(0.18, 1.05, 0.18, mats.rodape, x, 0.53, z);
  colocar(1.2, 0.075, 0.85, mats.livro, 2.05, 1.19, -2.19, false);
  colocar(0.56, 0.6, 0.45, mats.rodape, 3.55, 1.36, -2.4);
  // Cadeira no lado aberto da mesa.
  colocar(0.97, 0.13, 0.94, woodMat, 2.65, 0.57, 0);
  colocar(0.96, 1.4, 0.13, mats.couro, 2.65, 1.05, 0.48);
  for (const x of [2.29, 3.01])
    for (const z of [-0.32, 0.35]) colocar(0.1, 0.59, 0.1, mats.rodape, x, 0.28, z);
  // Poltrona e mesa baixa.
  colocar(2.75, 0.72, 1.6, mats.couro, -4, 0.45, -2.65);
  colocar(2.75, 1.1, 0.35, mats.couro, -4, 0.98, -3.27);
  colocar(1.65, 0.17, 1.15, woodMat, -3.65, 0.69, -0.3);
  for (const x of [-4.3, -3])
    for (const z of [-0.73, 0.13]) colocar(0.13, 0.7, 0.13, mats.rodape, x, 0.32, z);
  // Pedestal sem interação: elemento cenográfico do futuro criador de salas.
  colocar(1.75, 0.78, 1.35, mats.rodape, 0, 0.4, -6.25);
  colocar(1.3, 0.25, 0.95, mats.metal, 0, 0.94, -6.25);
  const esfera = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.36, 1),
    new THREE.MeshStandardMaterial({
      color: '#8eb1b4',
      emissive: '#376574',
      emissiveIntensity: 0.85,
      roughness: 0.4,
    }),
  );
  esfera.position.set(0, 1.39, -6.25);
  esfera.castShadow = true;
  cena.add(esfera);
  // Vasos com folhas, silhuetas legíveis com luz indireta.
  for (const [x, z] of [
    [7.35, 2.1],
    [-7.4, 3.5],
  ]) {
    const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 0.7, 12), mats.barro);
    vaso.position.set(x, 0.35, z);
    vaso.castShadow = true;
    cena.add(vaso);
    for (let i = 0; i < 7; i++) {
      const folha = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.88, 6), mats.verde);
      const a = (i * Math.PI * 2) / 7;
      folha.position.set(x + Math.sin(a) * 0.31, 1.11 + (i % 3) * 0.11, z + Math.cos(a) * 0.31);
      folha.rotation.z = Math.sin(a) * 0.33;
      folha.rotation.x = -Math.cos(a) * 0.33;
      folha.castShadow = true;
      cena.add(folha);
    }
  }
  const objetosDemo = cena.children.slice(inicioEstruturaDemo);
  const iluminacaoGeral = new THREE.HemisphereLight('#c8def4', '#6a4d35', 1.0);
  cena.add(iluminacaoGeral);
  const sol = new THREE.DirectionalLight('#ead4b3', 2.25);
  sol.position.set(-3, 9, 5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = -13;
  sol.shadow.camera.right = 13;
  sol.shadow.camera.top = 13;
  sol.shadow.camera.bottom = -13;
  sol.shadow.bias = -0.0003;
  sol.shadow.normalBias = 0.02;
  cena.add(sol);
  atualizarLuzesAtmosfera();
  // As lâmpadas faziam parte da antiga sala demonstrativa, não da mesa vazia.
  // São mantidas apenas para backups que escolheram explicitamente a sala antiga.
  const luzesDaSalaAntiga: THREE.Object3D[] = [];
  for (const [x, z, intensity] of [
    [-4, -1, 26],
    [3, -2, 30],
    [0, -6, 22],
  ]) {
    const luz = new THREE.PointLight('#f1b780', intensity, 6.7, 2);
    luz.position.set(x, 3.15, z);
    cena.add(luz);
    luzesDaSalaAntiga.push(luz);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 10),
      new THREE.MeshBasicMaterial({ color: '#f5cd87' }),
    );
    lamp.position.copy(luz.position);
    cena.add(lamp);
    luzesDaSalaAntiga.push(lamp);
  }
  // Camada editável independente da sala de demonstração. Mantém imagens e câmera intactas.
  const objetosCriados = new THREE.Group();
  objetosCriados.name = 'objetos-do-mestre';
  cena.add(objetosCriados);
  const camadaMiniaturas = criarCamadaMiniaturas3D(cena, carregarModeloExterno);
  const limparObjetos = () => {
    objetosCriados.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mat) => {
          if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshStandardMaterial)
            mat.map?.dispose();
          mat.dispose();
        });
      }
    });
    objetosCriados.clear();
  };
  const adicionarObjeto = (o: ObjetoCena3D) => {
    const s = medidasObjeto3D(o);
    const grupo = new THREE.Group();
    grupo.position.set(o.x, 0, o.z);
    grupo.rotation.y = -o.rotacao;
    grupo.userData.objetoId = o.id;
    grupo.userData.medidas = { ...s };
    grupo.userData.oculto = o.oculto === true;
    grupo.visible = !o.oculto;
    const cor: Record<string, string> = {
      parede: '#bdab96',
      porta: '#675143',
      mesa: '#886446',
      estante: '#6d523d',
      caixa: '#957450',
      barril: '#8e6e48',
      coluna: '#aaa59b',
      tapete: '#655069',
      luz: '#e5bb70',
      cadeira: '#8b6142',
      balcao: '#785136',
      vaso: '#42754f',
    };
    const colocarPeca = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      tom = cor[o.tipo],
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: tom, roughness: 0.86 }),
      );
      m.position.set(x, y, z);
      m.castShadow = o.tipo !== 'tapete';
      m.receiveShadow = true;
      m.userData.objetoId = o.id;
      grupo.add(m);
      return m;
    };
    // Móveis 2D vivem no mesmo espaço 3D: usam a colisão e a seleção já existentes.
    if (
      (o.tipo === 'cadeira' || o.tipo === 'vaso' || o.tipo === 'barril') &&
      (o.estilo === 'pixel' || o.tipo !== 'barril')
    ) {
      const tipo = o.tipo as MovelPixel25D;
      const textura = criarTexturaMovel25D(tipo);
      const mat = new THREE.MeshBasicMaterial({
        map: textura,
        transparent: true,
        alphaTest: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sprite = new THREE.Mesh(new THREE.PlaneGeometry(s.largura * 1.3, s.altura), mat);
      sprite.position.y = s.altura / 2;
      sprite.userData.objetoId = o.id;
      sprite.userData.movelPixel25D = true;
      sprite.renderOrder = 3;
      grupo.add(sprite);
      // Sombra no chão reforça o volume sem exigir modelos 3D detalhados.
      const sombra = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(0.28, s.largura * 0.46), 20),
        new THREE.MeshBasicMaterial({
          color: '#100d13',
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      );
      sombra.rotation.x = -Math.PI / 2;
      sombra.position.y = 0.035;
      sombra.userData.objetoId = o.id;
      grupo.add(sombra);
    } else if (o.tipo === 'balcao') {
      colocarPeca(s.largura, s.altura * 0.78, s.profundidade, 0, s.altura * 0.39, 0, '#65442f');
      colocarPeca(s.largura + 0.16, 0.18, s.profundidade + 0.19, 0, s.altura, 0, '#c09161');
      for (const x of [-s.largura * 0.31, 0, s.largura * 0.31])
        colocarPeca(
          0.09,
          s.altura * 0.68,
          0.06,
          x,
          s.altura * 0.38,
          s.profundidade / 2 + 0.04,
          '#3e2d2b',
        );
    } else if (o.tipo === 'barril' || o.tipo === 'coluna') {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(s.largura * 0.48, s.largura * 0.48, s.altura, 12),
        new THREE.MeshStandardMaterial({ color: cor[o.tipo], roughness: 0.85 }),
      );
      m.position.y = s.altura / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.objetoId = o.id;
      grupo.add(m);
      if (o.tipo === 'barril')
        for (const y of [0.22, 0.83])
          colocarPeca(s.largura + 0.06, 0.055, s.profundidade + 0.06, 0, y, 0, '#55483b');
    } else if (o.tipo === 'luz') {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        new THREE.MeshStandardMaterial({
          color: '#ffd395',
          emissive: '#ffb45c',
          emissiveIntensity: 2,
        }),
      );
      bulb.position.y = s.altura;
      bulb.userData.objetoId = o.id;
      grupo.add(bulb);
      const luz = new THREE.PointLight('#ffd5a0', 28, 7, 2);
      luz.position.y = s.altura;
      grupo.add(luz);
    } else if (o.tipo === 'mesa') {
      colocarPeca(s.largura, 0.16, s.profundidade, 0, s.altura, 0);
      for (const x of [-s.largura * 0.39, s.largura * 0.39])
        for (const z of [-s.profundidade * 0.37, s.profundidade * 0.37])
          colocarPeca(0.14, s.altura - 0.12, 0.14, x, (s.altura - 0.12) / 2, z, '#534335');
    } else if (o.tipo === 'estante') {
      colocarPeca(s.largura, s.altura, s.profundidade, 0, s.altura / 2, 0);
      for (const y of [0.5, 1.15, 1.8, 2.45])
        colocarPeca(s.largura - 0.08, 0.09, s.profundidade + 0.06, 0, y, 0, '#46382c');
    } else if (o.tipo === 'porta') {
      colocarPeca(s.largura, s.altura, s.profundidade, 0, s.altura / 2, 0);
      colocarPeca(0.12, 0.12, 0.15, s.largura * 0.3, 1.25, s.profundidade / 2 + 0.055, '#d5ae63');
    } else colocarPeca(s.largura, s.altura, s.profundidade, 0, s.altura / 2, 0);
    objetosCriados.add(grupo);
  };
  const manipulador = new THREE.Group();
  manipulador.name = 'alcas-de-edicao';
  manipulador.visible = false;
  cena.add(manipulador);
  const criarAlca = (tipo: 'largura' | 'profundidade' | 'rotacao', cor: string) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 12, 10),
      new THREE.MeshBasicMaterial({
        color: cor,
        depthTest: false,
        transparent: true,
        opacity: 0.96,
      }),
    );
    m.userData.alca = tipo;
    m.renderOrder = 18;
    manipulador.add(m);
    return m;
  };
  const alcaLargura = criarAlca('largura', '#f0c078');
  const alcaProfundidade = criarAlca('profundidade', '#6ac6d0');
  const alcaRotacao = criarAlca('rotacao', '#d49aff');
  const atualizarManipulador = (obj: THREE.Object3D | null) => {
    if (!obj) {
      manipulador.visible = false;
      return;
    }
    manipulador.visible = true;
    manipulador.position.set(obj.position.x, 0, obj.position.z);
    manipulador.rotation.y = obj.rotation.y;
    const s = obj.userData.medidas as { largura: number; profundidade: number } | undefined;
    if (!s) return;
    alcaLargura.position.set((s.largura * (obj.scale.x || 1)) / 2 + 0.38, 0.27, 0);
    alcaProfundidade.position.set(0, 0.27, (s.profundidade * (obj.scale.z || 1)) / 2 + 0.38);
    alcaRotacao.position.set(
      -(s.largura * (obj.scale.x || 1)) / 2 - 0.58,
      0.27,
      -(s.profundidade * (obj.scale.z || 1)) / 2 - 0.55,
    );
  };
  let objetoSelecionado: string | null = null;
  let camadaObjetosAtiva = true;
  const configurarVisibilidadeObjetos = (visivel: boolean) => {
    camadaObjetosAtiva = visivel;
    for (const grupo of objetosCriados.children)
      grupo.visible = visivel && grupo.userData.oculto !== true;
  };
  const configurarPeriodoDia = (periodo: PeriodoDia3D) => {
    if (periodo === periodoDia) return;
    periodoDia = periodo;
    atmosfera.atualizar(periodoDia);
    atualizarLuzesAtmosfera();
  };
  const configurarCenario = (config: Cenario3D) => {
    configurarPeriodoDia(config.periodoDia || 'dia');
    objetosDemo.forEach((obj) => {
      obj.visible = config.base === 'arquivos';
    });
    luzesDaSalaAntiga.forEach((obj) => {
      obj.visible = config.base === 'arquivos';
    });
    limparObjetos();
    config.objetos.forEach(adicionarObjeto);
    configurarVisibilidadeObjetos(camadaObjetosAtiva);
    atualizarManipulador(
      objetosCriados.children.find((c) => c.userData.objetoId === objetoSelecionado) || null,
    );
  };
  const visualizarObjeto = (id: string, x: number, z: number) => {
    const obj = objetosCriados.children.find((c) => c.userData.objetoId === id);
    if (obj) {
      obj.position.set(x, 0, z);
      if (objetoSelecionado === id) atualizarManipulador(obj);
    }
  };
  const visualizarEdicaoObjeto = (o: ObjetoCena3D) => {
    const obj = objetosCriados.children.find((c) => c.userData.objetoId === o.id);
    if (!obj) return;
    const base = obj.userData.medidas as { largura: number; profundidade: number; altura: number };
    const m = medidasObjeto3D(o);
    obj.position.set(o.x, 0, o.z);
    obj.rotation.y = -o.rotacao;
    obj.scale.set(
      m.largura / base.largura,
      m.altura / base.altura,
      m.profundidade / base.profundidade,
    );
    if (objetoSelecionado === o.id) atualizarManipulador(obj);
  };
  const selecionarObjeto = (id: string | null) => {
    objetoSelecionado = id;
    objetosCriados.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive.set(obj.userData.objetoId === id ? '#56421e' : '#000000');
          mat.emissiveIntensity = obj.userData.objetoId === id ? 0.5 : 0;
        }
      }
    });
    atualizarManipulador(objetosCriados.children.find((c) => c.userData.objetoId === id) || null);
  };
  const selecionarObjetos = (ids: readonly string[]) => {
    const escolhidos = new Set(ids);
    if (!escolhidos.size) return;
    // Destaque nos objetos do lote, sem alças nem mudança de posição.
    objetosCriados.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        const marcado = escolhidos.has(String(obj.userData.objetoId || ''));
        obj.material.emissive.set(marcado ? '#705124' : '#000000');
        obj.material.emissiveIntensity = marcado ? 0.65 : 0;
      }
    });
    manipulador.visible = false;
  };
  const alcaAtingida = (
    raycaster: THREE.Raycaster,
  ): 'largura' | 'profundidade' | 'rotacao' | null => {
    if (!manipulador.visible) return null;
    const acertos = raycaster.intersectObjects(manipulador.children, false);
    return acertos.length
      ? (acertos[0].object.userData.alca as 'largura' | 'profundidade' | 'rotacao')
      : null;
  };
  const objetoAtingido = (raycaster: THREE.Raycaster): string | null => {
    const hits = raycaster.intersectObjects(objetosCriados.children, true);
    return hits.length ? String(hits[0].object.userData.objetoId || '') : null;
  };
  // Paredes/portas compartilhadas com a Mesa 2D. Só desenhamos os traços para
  // o mestre; os jogadores encontram a colisão invisível sobre a planta.
  const camadaBarreiras = new THREE.Group();
  camadaBarreiras.name = 'barreiras-compartilhadas-da-planta';
  cena.add(camadaBarreiras);
  const liberarBarreiras = () => {
    camadaBarreiras.traverse((item) => {
      if (item instanceof THREE.Line || item instanceof THREE.Mesh) {
        item.geometry.dispose();
        const mat = item.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    camadaBarreiras.clear();
  };
  const configurarBarreiras = (
    barreiras: readonly BarreiraMapa[],
    cenario: Cenario3D,
    mostrar: boolean,
    selecionada: string | null,
    multiplas: readonly string[] = [],
  ) => {
    liberarBarreiras();
    camadaBarreiras.visible = mostrar;
    if (!mostrar) return;
    for (const b of barreiras) {
      const p = pontoMapaPara3D({ x: b.x1, y: b.y1 }, cenario),
        q = pontoMapaPara3D({ x: b.x2, y: b.y2 }, cenario);
      const cor =
        selecionada === b.id || multiplas.includes(b.id)
          ? '#ffe095'
          : b.tipo === 'porta'
            ? b.aberta
              ? '#49b99f'
              : '#7db9e8'
            : b.tipo === 'janela'
              ? '#65cadd'
              : b.tipo === 'mureta'
                ? '#9bcc7d'
                : '#d9a97b';
      const linha = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p.x, 0.13, p.z),
          new THREE.Vector3(q.x, 0.13, q.z),
        ]),
        new THREE.LineBasicMaterial({
          color: cor,
          depthTest: false,
          transparent: true,
          opacity: selecionada === b.id || multiplas.includes(b.id) ? 1 : 0.83,
        }),
      );
      linha.userData.barreiraId = b.id;
      linha.userData.ponta = null;
      linha.renderOrder = 30;
      camadaBarreiras.add(linha);
      if (selecionada === b.id) {
        for (const [i, pt] of [p, q].entries()) {
          const esfera = new THREE.Mesh(
            new THREE.SphereGeometry(0.19, 10, 8),
            new THREE.MeshBasicMaterial({ color: '#ffe095', depthTest: false }),
          );
          esfera.position.set(pt.x, 0.17, pt.z);
          esfera.userData.barreiraId = b.id;
          esfera.userData.ponta = i + 1;
          esfera.renderOrder = 31;
          camadaBarreiras.add(esfera);
        }
      }
    }
  };
  const barreiraAtingida = (raycaster: THREE.Raycaster) => {
    const anterior = raycaster.params.Line?.threshold;
    raycaster.params.Line = { threshold: 0.33 };
    const resultados = raycaster.intersectObjects(camadaBarreiras.children, false);
    raycaster.params.Line = { threshold: anterior ?? 1 };
    if (!resultados.length) return null;
    const id = resultados[0].object.userData.barreiraId as string;
    const ponta = resultados[0].object.userData.ponta as 1 | 2 | null;
    return { id, ponta: ponta ?? null };
  };
  // A iluminação vem da mesma lista usada pela Mesa 2D. Nenhuma luz é salva
  // como objeto privado do editor 3D (compatibilidade garantida na migração).
  const camadaLuzes = new THREE.Group();
  camadaLuzes.name = 'fontes-de-luz-compartilhadas';
  cena.add(camadaLuzes);
  const camadaMarcadores = new THREE.Group();
  camadaMarcadores.name = 'marcacoes-compartilhadas';
  cena.add(camadaMarcadores);
  const camadaDesenhos = new THREE.Group();
  camadaDesenhos.name = 'desenhos-compartilhados';
  cena.add(camadaDesenhos);
  const limparGrupo = (grupo: THREE.Group) => {
    grupo.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
      if (o instanceof THREE.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    grupo.clear();
  };
  const configurarFontesLuz = (
    fontes: readonly FonteLuzMesa[],
    config: Cenario3D,
    mostrarIcones: boolean,
  ) => {
    limparGrupo(camadaLuzes);
    const a = dimensoesTerreno3D(config);
    for (const f of fontes.slice(0, 40)) {
      const pos = pontoMapaPara3D(f, config);
      const alcance = Math.max(
        2,
        Math.min(25, (Math.sqrt(a.largura * a.profundidade) * f.alcance) / 60),
      );
      const ponto = new THREE.PointLight(f.cor || '#ffd48b', 28, alcance, 2);
      ponto.position.set(pos.x, 2.55, pos.z);
      ponto.userData.luzId = f.id;
      ponto.visible = f.ativa !== false;
      camadaLuzes.add(ponto);
      if (mostrarIcones) {
        const icone = new THREE.Mesh(
          new THREE.SphereGeometry(0.23, 12, 10),
          new THREE.MeshBasicMaterial({
            color: f.cor || '#ffd48b',
            transparent: true,
            opacity: f.ativa ? 0.95 : 0.45,
            depthTest: false,
          }),
        );
        icone.position.set(pos.x, 2.55, pos.z);
        icone.userData.luzId = f.id;
        icone.renderOrder = 35;
        camadaLuzes.add(icone);
        const alvo = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 12, 10),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        alvo.position.copy(icone.position);
        alvo.userData.luzId = f.id;
        camadaLuzes.add(alvo);
      }
    }
  };
  const configurarAnotacoes = (
    marcadores: readonly MarcadorMapa[],
    desenhos: readonly TracoDesenho[],
    config: Cenario3D,
    mostrarMarcadores: boolean,
  ) => {
    limparGrupo(camadaMarcadores);
    limparGrupo(camadaDesenhos);
    for (const traco of desenhos.slice(-200)) {
      const pontos = traco.pontos.slice(0, 500).map((p) => {
        const v = pontoMapaPara3D(p, config);
        return new THREE.Vector3(v.x, 0.16, v.z);
      });
      if (pontos.length === 1)
        pontos.push(new THREE.Vector3(pontos[0].x + 0.015, 0.16, pontos[0].z + 0.015));
      if (pontos.length < 2) continue;
      // Quads sobre o chão: WebGL ignora lineWidth em muitos navegadores.
      // Assim a espessura escolhida pelo mestre aparece também no 3D.
      const espessura = Math.max(0.025, Math.min(0.24, traco.espessura * 0.018));
      const vertices: number[] = [];
      for (let i = 1; i < pontos.length; i++) {
        const a = pontos[i - 1],
          b = pontos[i],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len = Math.hypot(dx, dz);
        if (len < 0.001) continue;
        const nx = ((-dz / len) * espessura) / 2,
          nz = ((dx / len) * espessura) / 2;
        vertices.push(
          a.x + nx,
          0.17,
          a.z + nz,
          a.x - nx,
          0.17,
          a.z - nz,
          b.x + nx,
          0.17,
          b.z + nz,
          b.x + nx,
          0.17,
          b.z + nz,
          a.x - nx,
          0.17,
          a.z - nz,
          b.x - nx,
          0.17,
          b.z - nz,
        );
      }
      if (!vertices.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      const linha = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: traco.cor,
          side: THREE.DoubleSide,
          depthTest: false,
          transparent: true,
          opacity: 0.94,
        }),
      );
      linha.userData.desenhoId = traco.id;
      linha.userData.corOriginal = traco.cor;
      linha.renderOrder = 22;
      camadaDesenhos.add(linha);
    }
    if (!mostrarMarcadores) return;
    for (const m of marcadores.slice(0, 300)) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#191e26';
      ctx.beginPath();
      ctx.roundRect(2, 3, 252, 82, 15);
      ctx.fill();
      ctx.strokeStyle = '#e9ba71';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 25px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe2ab';
      ctx.fillText(`✦ ${m.texto.slice(0, 19)}`, 128, 53, 238);
      const textura = new THREE.CanvasTexture(canvas);
      textura.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false }),
      );
      const pos = pontoMapaPara3D(m, config);
      sprite.position.set(pos.x, 0.66, pos.z);
      sprite.scale.set(2.8, 0.98, 1);
      sprite.renderOrder = 31;
      sprite.userData.marcadorId = m.id;
      camadaMarcadores.add(sprite);
    }
  };
  const camadaRascunho = new THREE.Group();
  cena.add(camadaRascunho);
  const previsualizarDesenho = (traco: TracoDesenho | null, cenario: Cenario3D) => {
    limparGrupo(camadaRascunho);
    if (!traco?.pontos.length) return;
    const points = traco.pontos.map((p) => pontoMapaPara3D(p, cenario));
    const vertices: number[] = [];
    const largura = Math.max(0.025, Math.min(0.24, traco.espessura * 0.018)) / 2;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz);
      if (len < 0.001) continue;
      const nx = (-dz / len) * largura,
        nz = (dx / len) * largura;
      vertices.push(
        a.x + nx,
        0.18,
        a.z + nz,
        a.x - nx,
        0.18,
        a.z - nz,
        b.x + nx,
        0.18,
        b.z + nz,
        b.x + nx,
        0.18,
        b.z + nz,
        a.x - nx,
        0.18,
        a.z - nz,
        b.x - nx,
        0.18,
        b.z - nz,
      );
    }
    if (!vertices.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const malha = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: traco.cor, depthTest: false, side: THREE.DoubleSide }),
    );
    malha.renderOrder = 24;
    camadaRascunho.add(malha);
  };
  const marcadorAtingido = (raycaster: THREE.Raycaster): string | null => {
    const hit = raycaster.intersectObjects(camadaMarcadores.children, false)[0];
    return hit ? String(hit.object.userData.marcadorId || '') : null;
  };
  const luzAtingida = (raycaster: THREE.Raycaster): string | null => {
    const hit = raycaster
      .intersectObjects(camadaLuzes.children, false)
      .find((h) => typeof h.object.userData.luzId === 'string');
    return hit ? String(hit.object.userData.luzId) : null;
  };
  const desenhoAtingido = (raycaster: THREE.Raycaster): string | null => {
    const hit = raycaster
      .intersectObjects(camadaDesenhos.children, false)
      .find((h) => typeof h.object.userData.desenhoId === 'string');
    return hit ? String(hit.object.userData.desenhoId) : null;
  };
  const moverMarcadorVisual = (id: string, local: { x: number; y: number }, config: Cenario3D) => {
    const pos = pontoMapaPara3D(local, config);
    const sprite = camadaMarcadores.children.find((o) => o.userData.marcadorId === id);
    if (sprite) sprite.position.set(pos.x, 0.66, pos.z);
  };
  const moverLuzVisual = (id: string, local: { x: number; y: number }, config: Cenario3D) => {
    const pos = pontoMapaPara3D(local, config);
    camadaLuzes.children
      .filter((o) => o.userData.luzId === id)
      .forEach((o) => o.position.set(pos.x, 2.55, pos.z));
  };
  const selecionarAnotacaoVisual = (
    tipo: 'marcador' | 'luz' | 'desenho' | null,
    id: string | null,
    multiplas: readonly string[] = [],
  ) => {
    const marcado = (t: 'marcador' | 'luz' | 'desenho', uid: string) =>
      Boolean(uid) && ((t === tipo && uid === id) || multiplas.includes(`${t}:${uid}`));
    camadaMarcadores.children.forEach((o) => {
      if (o instanceof THREE.Sprite) {
        const sel = marcado('marcador', String(o.userData.marcadorId || ''));
        o.material.opacity = sel ? 1 : 0.85;
        o.material.color.set(sel ? '#ffe5a1' : '#ffffff');
        o.scale.set(sel ? 3.2 : 2.8, sel ? 1.12 : 0.98, 1);
      }
    });
    camadaLuzes.children.forEach((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshBasicMaterial &&
        o.material.opacity > 0
      ) {
        const sel = marcado('luz', String(o.userData.luzId || ''));
        o.scale.setScalar(sel ? 1.65 : 1);
      }
    });
    camadaDesenhos.children.forEach((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
        const sel = marcado('desenho', String(o.userData.desenhoId || ''));
        o.material.opacity = sel ? 1 : 0.9;
        o.material.color.set(sel ? '#fff0a4' : o.userData.corOriginal || '#f1bb78');
      }
    });
  };
  const avatar = new THREE.Group();
  avatar.position.set(PONTO_INICIAL.x, 0, PONTO_INICIAL.z);
  cena.add(avatar);
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 32),
    new THREE.MeshBasicMaterial({
      color: '#02070d',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.034;
  avatar.add(sombra);
  const plane = new THREE.PlaneGeometry(1.35, 1.95);
  const material = new THREE.MeshBasicMaterial({
    map: avatarFallback(nome, cor),
    transparent: true,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const figura = new THREE.Mesh(plane, material);
  figura.position.y = 1.03;
  figura.renderOrder = 2;
  avatar.add(figura);
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(0.59, 0.64, 38),
    new THREE.MeshBasicMaterial({
      color: '#bd9d70',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.84,
    }),
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.043;
  avatar.add(aro);

  // Cada token real é um standee em pé; seleção pelo raycaster funciona no Modo Mestre.
  // O avatar existente representa o personagem selecionado no Modo Exploração.
  const espelhadosTokens = new Map<string, boolean>();
  const largurasNaturais = new Map<string, number>();
  const dimensoes3D = new Map<string, DimensoesToken3D>();
  const outrosTokens = new THREE.Group();
  outrosTokens.name = 'tokens-da-campanha';
  cena.add(outrosTokens);
  const outros = new Map<
    string,
    { grupo: THREE.Group; figura: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> }
  >();
  // Prévia local da visão individual. Canvas/plane opaco fora do polígono, com
  // transparência apenas no espaço visível. Não altera mapa, cena ou texturas.
  const telaVisao = document.createElement('canvas');
  telaVisao.width = 640;
  telaVisao.height = 640;
  const ctxVisao = telaVisao.getContext('2d')!;
  const texturaVisao = new THREE.CanvasTexture(telaVisao);
  texturaVisao.magFilter = THREE.LinearFilter;
  texturaVisao.minFilter = THREE.LinearFilter;
  // A névoa é uma película SOBRE O PISO, não um overlay de tela. O teste de
  // profundidade protege modelos GLB opacos que foram desenhados no passe opaco;
  // sem ele, a névoa transparente pode ser pintada POR CIMA da metade superior
  // dos personagens (especialmente com a câmera Mesa em ângulo baixo).
  const materialVisao = new THREE.MeshBasicMaterial({
    map: texturaVisao,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const malhaVisao = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materialVisao);
  malhaVisao.name = 'mascara-de-visao-individual';
  malhaVisao.rotation.x = -Math.PI / 2;
  // O mesmo desenho para mestre/convidado, sempre rente ao terreno.
  // Não levantar a película até a altura dos tornozelos: ela deve cobrir o piso,
  // nunca seccionar um GLB ou um standee visível. A segurança continua no
  // recorte do servidor (a máscara é só a representação visual dele).
  const ALTURA_FOG_PISO_3D = 0.025;
  malhaVisao.renderOrder = 1;
  malhaVisao.position.y = ALTURA_FOG_PISO_3D;
  malhaVisao.visible = false;
  cena.add(malhaVisao);
  // v29.15.30.9 — Observar usa o mesmo recorte de IMAGEM + MÁSCARA do
  // convidado, no próprio piso existente. Não cria outra cena/canvas WebGL e
  // não aplica uma película desalinhada sobre o mapa original.
  // A textura original nunca é modificada; apenas o ponteiro do material
  // alterna entre a imagem completa e uma CanvasTexture reutilizável.
  let canvasPreviaFogMestre: HTMLCanvasElement | null = null;
  let texturaPreviaFogMestre: THREE.CanvasTexture | null = null;
  const restaurarTexturaPisoAposObservar = () => {
    if (plantaMaterial.map === texturaPreviaFogMestre) {
      plantaMaterial.map = texturaPlanta;
      plantaMaterial.needsUpdate = true;
    }
  };
  const comporFogNoPisoDoMestre = (opacidade = 1): boolean => {
    if (!texturaPlanta || !planta.visible || configPiso.piso !== 'imagem') return false;
    const origem = texturaPlanta.image as
      | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
      | undefined;
    const largura = origem?.naturalWidth || origem?.width || 0;
    const altura = origem?.naturalHeight || origem?.height || 0;
    if (
      !origem ||
      !Number.isFinite(largura) ||
      !Number.isFinite(altura) ||
      largura < 1 ||
      altura < 1
    )
      return false;
    const escala = Math.min(1, 1536 / Math.max(largura, altura));
    const w = Math.max(1, Math.round(largura * escala));
    const h = Math.max(1, Math.round(altura * escala));
    if (!canvasPreviaFogMestre) canvasPreviaFogMestre = document.createElement('canvas');
    if (canvasPreviaFogMestre.width !== w || canvasPreviaFogMestre.height !== h) {
      canvasPreviaFogMestre.width = w;
      canvasPreviaFogMestre.height = h;
    }
    const ctx = canvasPreviaFogMestre.getContext('2d', { alpha: false });
    if (!ctx) return false;
    // Mesmo referencial do recorte publicado ao convidado: percentual sobre
    // a imagem INTEIRA, não uma projeção separada de terreno em um plano 3D.
    // O Canvas de máscara já foi desenhado por desenharVisaoCompartilhada3D.
    try {
      if (
        !comporRecorteFogComoJogador3D(ctx, origem as CanvasImageSource, telaVisao, w, h, opacidade)
      )
        return false;
    } catch {
      return false;
    }
    if (!texturaPreviaFogMestre) {
      texturaPreviaFogMestre = new THREE.CanvasTexture(canvasPreviaFogMestre);
      texturaPreviaFogMestre.colorSpace = THREE.SRGBColorSpace;
      texturaPreviaFogMestre.anisotropy = 8;
      texturaPreviaFogMestre.magFilter = THREE.LinearFilter;
      texturaPreviaFogMestre.minFilter = THREE.LinearFilter;
    }
    texturaPreviaFogMestre.needsUpdate = true;
    if (plantaMaterial.map !== texturaPreviaFogMestre) {
      plantaMaterial.map = texturaPreviaFogMestre;
      plantaMaterial.needsUpdate = true;
    }
    return true;
  };
  let visaoObservadorId: string | null = null;
  let visiveisIndividual = new Set<string>();
  const tokenEstaVisivel = (tokenId: string) =>
    visaoObservadorId === null || visiveisIndividual.has(tokenId);
  /** Renderizador único: aplica no chão a máscara calculada pelo mestre.
   * Não recebe barreiras nem histórico de exploração de outros jogadores. */
  // A publicação via rede é discreta. Em vez de trocar um círculo inteiro
  // a cada pacote, interpola a máscara na GPU com uma CanvasTexture reutilizada.
  // A imagem de fundo já chega censurada do servidor antes de qualquer revelação.
  const canvasFogAntes = document.createElement('canvas');
  canvasFogAntes.width = telaVisao.width;
  canvasFogAntes.height = telaVisao.height;
  const contextoFogAntes = canvasFogAntes.getContext('2d')!;
  const canvasFogDepois = document.createElement('canvas');
  canvasFogDepois.width = telaVisao.width;
  canvasFogDepois.height = telaVisao.height;
  const contextoFogDepois = canvasFogDepois.getContext('2d')!;
  let inicioAnimacaoFog = -1;
  const atualizarTransicaoFogPublicado3D = (tempo: number) => {
    if (inicioAnimacaoFog < 0 || !malhaVisao.visible) return;
    const t = Math.min(1, Math.max(0, (tempo - inicioAnimacaoFog) / 115));
    ctxVisao.clearRect(0, 0, telaVisao.width, telaVisao.height);
    ctxVisao.globalCompositeOperation = 'source-over';
    ctxVisao.globalAlpha = 1 - t;
    ctxVisao.drawImage(canvasFogAntes, 0, 0);
    ctxVisao.globalAlpha = t;
    ctxVisao.drawImage(canvasFogDepois, 0, 0);
    ctxVisao.globalAlpha = 1;
    texturaVisao.needsUpdate = true;
    if (t >= 1) inicioAnimacaoFog = -1;
  };
  const configurarFogPublicado3D = (
    mascara: string | null,
    cenario: Cenario3D,
    poligono?: readonly PontoVisao3D[] | null,
  ) => {
    // O jogador já recebe um mapa em que o mestre rasterizou o Fog of War.
    // Aplicar uma segunda película 3D acima da planta (0.025 vs 0.005)
    // fazia o depth buffer alternar entre o preto e o piso azulado conforme
    // a inclinação da câmera. O próprio bitmap é a única fonte de Fog.
    const pisoPodeSerLimpo = Boolean(
      contextoPisoPublicado && texturaPisoPublicado && plantaMaterial.map === texturaPisoPublicado,
    );
    const modo = modoFogPublicado3D(mascara, pisoPublicadoTemRecorte, pisoPodeSerLimpo);
    if (modo === 'desativado' || modo === 'imagem') {
      malhaVisao.visible = false;
      inicioAnimacaoFog = -1;
      return;
    }
    if (modo === 'ocultar-piso') {
      // Um pacote de proteção (máscara toda fechada) precisa cobrir também
      // o último recorte autorizado, sem depender de outro plano com z-fighting.
      contextoPisoPublicado!.save();
      contextoPisoPublicado!.globalCompositeOperation = 'source-over';
      contextoPisoPublicado!.globalAlpha = 1;
      contextoPisoPublicado!.fillStyle = '#050913';
      contextoPisoPublicado!.fillRect(0, 0, telaPisoPublicado!.width, telaPisoPublicado!.height);
      contextoPisoPublicado!.restore();
      texturaPisoPublicado!.needsUpdate = true;
      malhaVisao.visible = false;
      inicioAnimacaoFog = -1;
      return;
    }
    // Compatibilidade: sem uma textura censurada confirmada (ou sem suporte
    // a canvas), a máscara opaca continua protegendo o piso de fallback.
    const eraVisivel = malhaVisao.visible;
    contextoFogAntes.clearRect(0, 0, canvasFogAntes.width, canvasFogAntes.height);
    contextoFogAntes.drawImage(telaVisao, 0, 0);
    // Para visão comum usa o mesmo polígono exato do mestre, NÃO uma
    // aproximação quadriculada. Exploração/manual conservam a grade histórica.
    desenharVisaoCompartilhada3D(
      contextoFogDepois,
      poligono?.length ? { poligono, larguraMundo: 100, alturaMundo: 100 } : { estados: mascara },
    );
    // Transição de 115ms entre dois quadros AUTORIZADOS; nunca antecipa
    // mapa/objeto fora do snapshot filtrado do servidor.
    // A textura da cena e a máscara pertencem ao MESMO quadro autorizado.
    // Nunca misturar o recorte novo com a silhueta velha: cria contornos pretos.
    void eraVisivel;
    inicioAnimacaoFog = -1;
    ctxVisao.clearRect(0, 0, telaVisao.width, telaVisao.height);
    ctxVisao.drawImage(canvasFogDepois, 0, 0);
    const a = referenciaTokens3D(cenario);
    malhaVisao.position.set((a.minX + a.maxX) / 2, ALTURA_FOG_PISO_3D, (a.minZ + a.maxZ) / 2);
    malhaVisao.scale.set(a.largura, a.profundidade, 1);
    malhaVisao.visible = true;
    materialVisao.opacity = 1;
    texturaVisao.needsUpdate = true;
  };
  const configurarVisaoIndividual = (
    observadorId: string | null,
    tokens: Record<string, TokenMesa>,
    barreiras: readonly BarreiraMapa[],
    cenario: Cenario3D,
    posicaoAtual?: { x: number; y: number },
    fog?: {
      ativo: boolean;
      manualSomente?: boolean;
      memoria: MemoriaFog;
      pinceis: readonly TracoFog[];
      grupo: boolean;
      idsGrupo: string[];
    },
  ) => {
    const tokenObservado = observadorId ? tokens[observadorId] : null;
    visaoObservadorId = tokenObservado ? observadorId : null;
    malhaVisao.visible = Boolean(tokenObservado) || Boolean(fog?.ativo);
    if (!tokenObservado && !fog?.ativo) {
      restaurarTexturaPisoAposObservar();
      // Sair de Observar é uma transição completa: não deixar uma figura nem
      // um modelo presos nos estados de visibilidade da visão anterior.
      visiveisIndividual.clear();
      malhaVisao.visible = false;
      ctxVisao.clearRect(0, 0, telaVisao.width, telaVisao.height);
      texturaVisao.needsUpdate = true;
      avatar.visible = !!tokens[idAvatar];
      for (const [id, outro] of outros) outro.grupo.visible = !!tokens[id];
      for (const objeto of objetosCriados.children)
        objeto.visible = camadaObjetosAtiva && objeto.userData.oculto !== true;
      camadaMiniaturas.configurarFiltroMiniaturasVisiveis(null);
      camadaMiniaturas.configurarFiltroPersonagensVisiveis(null);
      atualizarStandeeMiniatura();
      return;
    }
    const dimensoes = referenciaTokens3D(cenario);
    const dim = { largura: dimensoes.largura, altura: dimensoes.profundidade };
    // A posição persistida no estado da campanha pode chegar um quadro depois
    // da movimentação 3D. O Fog precisa seguir a MESMA posição já desenhada do
    // standee/GLB, em vez de abrir um segundo recorte no ponto antigo.
    // Um arrasto fornece posicaoAtual explicitamente e tem prioridade.
    const grupoObservado = tokenObservado
      ? observadorId === idAvatar
        ? avatar
        : outros.get(observadorId!)?.grupo
      : null;
    const posicaoVisual =
      grupoObservado &&
      Number.isFinite(grupoObservado.position.x) &&
      Number.isFinite(grupoObservado.position.z)
        ? chaoParaPercentual3D(
            { x: grupoObservado.position.x, z: grupoObservado.position.z },
            cenario,
          )
        : undefined;
    const observador = tokenObservado
      ? { ...tokenObservado, ...posicaoVisual, ...posicaoAtual }
      : null;
    const idsFog =
      fog?.grupo || !observadorId ? (fog?.idsGrupo ?? []) : tokenObservado ? [observadorId!] : [];
    const poligonosFog =
      fog?.ativo && !fog.manualSomente
        ? idsFog.map((uid) =>
            poligonoDoObservador(
              uid === observadorId ? observador : tokens[uid] || null,
              barreiras,
              dim,
            ),
          )
        : [];
    const visiveisFog = fog?.ativo
      ? fog.manualSomente
        ? new Uint8Array(COLUNAS_FOG * LINHAS_FOG)
        : celulasVisiveisFog(poligonosFog, dim)
      : null;
    const estadosFog =
      fog?.ativo && visiveisFog
        ? mapaEstadosFog(fog.memoria, idsFog, visiveisFog, fog.pinceis)
        : null;
    const pontos = poligonoDoObservador(observador, barreiras, dim);
    materialVisao.opacity = tokenObservado ? 1 : 0.4;
    // Mesmo compositor para mestre e convidado: uma só implementação.
    const contornoValido =
      pontos.length >= 3 && pontos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    // Uma posição sem polígono válido não deve cobrir a mesa inteira do mestre.
    if (tokenObservado && !estadosFog && !contornoValido) {
      restaurarTexturaPisoAposObservar();
      malhaVisao.visible = false;
    } else {
      desenharVisaoCompartilhada3D(
        ctxVisao,
        estadosFog
          ? { estados: estadosFog }
          : { poligono: pontos, larguraMundo: dim.largura, alturaMundo: dim.altura },
      );
      texturaVisao.needsUpdate = true;
      // O Fog da exploração do mestre também deve seguir a própria planta,
      // como já ocorre com Observar e com a versão censurada do jogador.
      // No modo de edição do mestre preservamos a transparência de 40%,
      // permitindo enxergar a área encoberta sem nenhuma película paralela.
      // Observar permanece 100% opaco, idêntico à visão do personagem.
      const previewNoPiso =
        (Boolean(tokenObservado) || Boolean(fog?.ativo)) &&
        comporFogNoPisoDoMestre(tokenObservado ? 1 : 0.4);
      if (previewNoPiso) malhaVisao.visible = false;
      else {
        restaurarTexturaPisoAposObservar();
        // Sem bitmap de planta, a máscara 3D ainda serve como fallback.
        malhaVisao.visible = Boolean(tokenObservado) || Boolean(fog?.ativo);
      }
    }
    // O piso original só volta quando NENHUMA visualização Fog está ativa.
    // Restaurá-lo com exploração ativa apagava a prévia a cada efeito React.
    if (!tokenObservado && !fog?.ativo) restaurarTexturaPisoAposObservar();
    // Película legada apenas para mapas sem planta, nunca para dois planos simultâneos.
    if (!tokenObservado || plantaMaterial.map !== texturaPreviaFogMestre) {
      malhaVisao.position.set(
        (dimensoes.minX + dimensoes.maxX) / 2,
        ALTURA_FOG_PISO_3D,
        (dimensoes.minZ + dimensoes.maxZ) / 2,
      );
      malhaVisao.scale.set(dim.largura, dim.altura, 1);
    }
    // A mesma autorização do publicador do jogador: campo de visão contínuo
    // (ou mapa inteiro na névoa 100% manual) seguido pelos MESMOS pincéis.
    // A grade de exploração só afeta os pixels; não pode ressuscitar um GLB
    // fora do raio que o servidor autorizaria ao respectivo jogador.
    const poligonoPermissao = fog?.manualSomente
      ? [
          { x: 0, y: 0 },
          { x: dim.largura, y: 0 },
          { x: dim.largura, y: dim.altura },
          { x: 0, y: dim.altura },
        ]
      : pontos;
    const pinceisVisao = fog?.ativo ? (fog.pinceis ?? []) : [];
    const pontoAutorizado = (p: { x: number; y: number }) =>
      pontoDentroDoPoligono(
        { x: (p.x * dim.largura) / 100, y: (p.y * dim.altura) / 100 },
        poligonoPermissao,
      ) &&
      liberadoPelosPinceis(
        { x: (p.x * dim.largura) / 100, y: (p.y * dim.altura) / 100 },
        pinceisVisao,
        dim.largura,
        dim.altura,
        !fog?.manualSomente,
      );
    visiveisIndividual = new Set(observadorId ? [observadorId] : []);
    for (const [uid, token] of Object.entries(tokens)) {
      if (uid === observadorId) continue;
      if (!token.oculto && pontoAutorizado(token)) visiveisIndividual.add(uid);
    }
    // O publicador usa este mesmo projetor para acompanhar o token vinculado.
    // A previsão local do WASD/arrasto tem prioridade sobre a posição salva.
    const tokensProjetados =
      observadorId && observador
        ? {
            ...tokens,
            [observadorId]: observador,
          }
        : tokens;
    const miniaturasPublicaveis = miniaturasParaVisaoIndividual3D(
      cenario.miniaturas ?? [],
      new Set((cenario.miniaturas ?? []).map((m) => m.modeloId)),
      tokensProjetados,
      cenario,
    );
    // O sprite e sua miniatura seguem o MESMO estado de visibilidade.
    // Reaplica-se ao sair, mesmo quando não há uma atualização do elenco.
    avatar.visible = !!tokens[idAvatar] && (!tokenObservado || visiveisIndividual.has(idAvatar));
    for (const [id, outro] of outros)
      outro.grupo.visible = !!tokens[id] && (!tokenObservado || visiveisIndividual.has(id));
    const miniaturasAutorizadas = tokenObservado
      ? new Set(
          filtrarIdsMiniaturasVisaoIndividual3D(
            miniaturasPublicaveis,
            visiveisIndividual,
            pontoAutorizado,
            observadorId ?? undefined,
          ),
        )
      : null;
    camadaMiniaturas.configurarFiltroMiniaturasVisiveis(miniaturasAutorizadas);
    camadaMiniaturas.configurarFiltroPersonagensVisiveis(
      tokenObservado ? visiveisIndividual : null,
    );
    // O mesmo ponto que centraliza o círculo de visão posiciona a GLB.
    // A atualização do filtro pode chegar antes de o token persistido
    // acompanhar o mouse; por isso reposicionamos o observador neste frame.
    if (observadorId && observador) {
      const p = percentualParaChao3D(observador, cenario);
      camadaMiniaturas.moverVinculada(observadorId, p.x, p.z);
    }
    atualizarStandeeMiniatura();
    // Móveis editáveis fora do campo também não podem revelar a cena.
    for (const objeto of objetosCriados.children) {
      const p = ponto3DParaMapa({ x: objeto.position.x, z: objeto.position.z }, cenario);
      objeto.visible =
        camadaObjetosAtiva &&
        objeto.userData.oculto !== true &&
        (!tokenObservado ||
          (estadosFog
            ? estadosFog[celulaFog(p.x, p.y)] === 2
            : tokenVisivelParaObservador(p, observador, pontos, dim)));
    }
    // Destaques de edição nunca aparecem sobre a visão individual.
    if (tokenObservado) for (const guia of molduras.values()) guia.visible = false;
  };
  // Moldura discreta no próprio plano do token (não muda colisão, câmera ou tamanho da miniatura).
  const molduras = new Map<string, THREE.Group>();
  const criarMolduraSelecao = (
    plano: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
    tokenId: string,
  ) => {
    const guia = new THREE.Group();
    guia.name = 'selecao-token-3d';
    guia.visible = false;
    const pontos = [
      [-0.705, -1.01],
      [0.705, -1.01],
      [0.705, 1.01],
      [-0.705, 1.01],
    ];
    const contorno = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        pontos.map(([x, y]) => new THREE.Vector3(x, y, 0.035)),
      ),
      new THREE.LineBasicMaterial({
        color: 0xffaa57,
        depthTest: false,
        transparent: true,
        opacity: 0.98,
      }),
    );
    contorno.renderOrder = 11;
    guia.add(contorno);
    const geom = new THREE.PlaneGeometry(0.115, 0.115);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffedcf,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    for (const [x, y] of pontos) {
      const alca = new THREE.Mesh(geom, mat);
      alca.position.set(x, y, 0.045);
      alca.renderOrder = 12;
      guia.add(alca);
    }
    plano.add(guia);
    molduras.set(tokenId, guia);
  };
  criarMolduraSelecao(figura, '__avatar__');
  // Fundo e aro são os círculos existentes no chão, sem duplicar geometria.
  const basesTokens = new Map<string, { aro: THREE.Mesh; fundo: THREE.Mesh }>();
  basesTokens.set('__avatar__', { aro, fundo: sombra });
  type TextureIdle = {
    animacao: AnimacaoGifIdle;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    textura: THREE.CanvasTexture;
    ultimo: number;
  };
  const texturasIdle = new Map<string, TextureIdle>();
  const parametrosIdle = new Map<string, { pausado: boolean; velocidade: number }>();
  // Impede flashes de placeholders quando uma nova mídia ainda está baixando/decodificando.
  const imagensPendentesConvidado = new Set<string>();
  let modoConvidadoIncremental = false;
  const configurarIdleToken = (id: string, pausado: boolean, velocidade: number) => {
    parametrosIdle.set(id, {
      pausado,
      velocidade: [0.5, 1, 1.5, 2].includes(velocidade) ? velocidade : 1,
    });
  };
  const atualizarIdle = (tempo: number) => {
    // Abas em segundo plano não precisam atualizar texturas da GPU.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const movimentoReduzido =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (const [id, registro] of texturasIdle) {
      const preferencia = parametrosIdle.get(id);
      const indice =
        movimentoReduzido || preferencia?.pausado
          ? 0
          : quadroNoTempo(registro.animacao, tempo * (preferencia?.velocidade ?? 1));
      if (indice === registro.ultimo) continue;
      // Na Mesa 3D a posição, a borda e a câmera não são reconstruídas.
      if (id === idAvatar ? !avatar.visible : !outros.get(id)?.grupo.visible) continue;
      registro.ultimo = indice;
      registro.ctx.putImageData(
        new ImageData(
          registro.animacao.quadros[indice].pixels,
          registro.animacao.largura,
          registro.animacao.altura,
        ),
        0,
        0,
      );
      registro.textura.needsUpdate = true;
    }
  };
  const prepararTextura = async (
    blob: Blob,
  ): Promise<{ textura: THREE.Texture; largura: number; altura: number; idle?: TextureIdle }> => {
    if (blob.type === 'image/gif') {
      const animacao = await decodificarBlobGifIdle(blob);
      const canvas = document.createElement('canvas');
      canvas.width = animacao.largura;
      canvas.height = animacao.altura;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) throw Error('Canvas de token indisponível.');
      ctx.putImageData(
        new ImageData(animacao.quadros[0].pixels, animacao.largura, animacao.altura),
        0,
        0,
      );
      const textura = new THREE.CanvasTexture(canvas);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.minFilter = THREE.LinearFilter;
      textura.magFilter = THREE.LinearFilter;
      textura.generateMipmaps = false;
      return {
        textura,
        largura: animacao.largura,
        altura: animacao.altura,
        idle: { animacao, canvas, ctx, textura, ultimo: 0 },
      };
    }
    const url = URL.createObjectURL(blob);
    try {
      const textura = await new THREE.TextureLoader().loadAsync(url);
      textura.colorSpace = THREE.SRGBColorSpace;
      const imagem = textura.image as HTMLImageElement;
      return { textura, largura: imagem.width || 320, altura: imagem.height || 480 };
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const limparParticipantes = () => {
    // Cancelar atualizações do antigo conjunto de personagens antes de liberar texturas.
    imagensPendentesConvidado.clear();
    for (const chave of texturasIdle.keys()) if (chave !== idAvatar) texturasIdle.delete(chave);
    for (const { grupo } of outros.values()) {
      grupo.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const materiais = Array.isArray(obj.material) ? obj.material : [obj.material];
          materiais.forEach((m) => m.dispose());
        } else if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material as THREE.MeshBasicMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
    }
    outros.clear();
    outrosTokens.clear();
    for (const chave of Array.from(basesTokens.keys()))
      if (chave !== '__avatar__') basesTokens.delete(chave);
    for (const key of Array.from(molduras.keys())) if (key !== '__avatar__') molduras.delete(key);
    espelhadosTokens.clear();
    largurasNaturais.clear();
    dimensoes3D.clear();
  };
  let idAvatar = '';
  const dimensionarToken = (id: string, dimensoes: DimensoesToken3D) => {
    const visual = id === idAvatar ? figura : outros.get(id)?.figura;
    if (!visual) return;
    const normalizado = dimensoesToken3D(dimensoes);
    dimensoes3D.set(id, normalizado);
    const s = escalaVisualToken3D(
      largurasNaturais.get(id) ?? 1.35,
      normalizado,
      espelhadosTokens.get(id),
    );
    visual.scale.set(s.x, s.y, 1);
    visual.position.y = s.centroY;
  };
  const adicionarParticipante = (unidade: UnidadeMesa, token: TokenMesa, aguardarMidia = false) => {
    const p = percentualParaChao3D(token, configPiso);
    const grupo = new THREE.Group();
    grupo.position.set(p.x, 0, p.z);
    grupo.userData.tokenId = unidade.id;
    const sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 28),
      new THREE.MeshBasicMaterial({
        color: '#050c12',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.04;
    grupo.add(sombra);
    const material = new THREE.MeshBasicMaterial({
      map: avatarFallback(unidade.nome, unidade.cor),
      transparent: true,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const figura = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.95), material);
    figura.position.y = 1.03;
    figura.renderOrder = 2;
    grupo.add(figura);
    largurasNaturais.set(unidade.id, 1.35);
    criarMolduraSelecao(figura, unidade.id);
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(0.57, 0.63, 36),
      new THREE.MeshBasicMaterial({ color: '#80715d', side: THREE.DoubleSide }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.05;
    grupo.add(aro);
    basesTokens.set(unidade.id, { aro, fundo: sombra });
    grupo.traverse((obj) => {
      obj.userData.tokenId = unidade.id;
    });
    outrosTokens.add(grupo);
    outros.set(unidade.id, { grupo, figura });
    dimensionarToken(unidade.id, dimensoesToken3D(token));
    if (aguardarMidia) imagensPendentesConvidado.add(unidade.id);
  };
  const removerParticipanteConvidado = (id: string) => {
    const participante = outros.get(id);
    if (!participante) return;
    imagensPendentesConvidado.delete(id);
    texturasIdle.delete(id);
    parametrosIdle.delete(id);
    participante.grupo.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material])
          mat.dispose();
      } else if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          if (mat instanceof THREE.MeshBasicMaterial) mat.map?.dispose();
          mat.dispose();
        }
      }
    });
    participante.grupo.removeFromParent();
    outros.delete(id);
    basesTokens.delete(id);
    molduras.delete(id);
    espelhadosTokens.delete(id);
    largurasNaturais.delete(id);
    dimensoes3D.delete(id);
  };
  const sincronizarParticipantesConvidado = (
    unidades: UnidadeMesa[],
    tokens: Record<string, TokenMesa>,
  ) => {
    // O convidado não tem avatar local no motor: todos os personagens são standees/remotos.
    // Nenhum existente é destruído quando um terceiro entra/sai do campo de visão.
    avatar.visible = false;
    modoConvidadoIncremental = true;
    const ids = new Set(unidades.filter((u) => Boolean(tokens[u.id])).map((u) => u.id));
    for (const id of [...outros.keys()]) if (!ids.has(id)) removerParticipanteConvidado(id);
    for (const unidade of unidades) {
      const token = tokens[unidade.id];
      if (!token || outros.has(unidade.id)) continue;
      adicionarParticipante(unidade, token, unidade.temToken);
    }
    atualizarStandeeMiniatura();
  };
  const liberarImagemPendenteParticipante = (id: string) => {
    if (imagensPendentesConvidado.delete(id)) atualizarStandeeMiniatura();
  };
  const restaurarImagemParticipante = (id: string, nome: string, cor: string) => {
    const figura = outros.get(id)?.figura;
    if (!figura) return;
    texturasIdle.delete(id);
    const anterior = figura.material.map;
    figura.material.map = avatarFallback(nome, cor);
    figura.material.needsUpdate = true;
    anterior?.dispose();
    largurasNaturais.set(id, 1.35);
    dimensionarToken(id, dimensoes3D.get(id) ?? { largura3D: 100, altura3D: 100 });
    liberarImagemPendenteParticipante(id);
  };
  const configurarParticipantes = (
    unidades: UnidadeMesa[],
    tokens: Record<string, TokenMesa>,
    selecionadoId: string,
  ) => {
    const anteriorAvatar = idAvatar;
    limparParticipantes();
    modoConvidadoIncremental = false;
    idAvatar = selecionadoId;
    if (anteriorAvatar !== selecionadoId) texturasIdle.delete(anteriorAvatar);
    for (const [key, token] of Object.entries(tokens))
      espelhadosTokens.set(key, token.espelhadoX === true);
    const tokenSelecionado = tokens[selecionadoId];
    avatar.visible = !!tokenSelecionado;
    if (tokenSelecionado) {
      const p = percentualParaChao3D(tokenSelecionado, configPiso);
      avatar.position.set(p.x, 0, p.z);
    }
    largurasNaturais.set(selecionadoId, 1.35);
    if (tokenSelecionado) dimensionarToken(selecionadoId, dimensoesToken3D(tokenSelecionado));
    basesTokens.set(selecionadoId, { aro, fundo: sombra });
    for (const chave of Array.from(basesTokens.keys()))
      if (chave !== '__avatar__' && chave !== selecionadoId) basesTokens.delete(chave);
    avatar.userData.tokenId = selecionadoId;
    avatar.traverse((obj) => {
      obj.userData.tokenId = selecionadoId;
    });
    for (const unidade of unidades) {
      if (unidade.id === selecionadoId || !tokens[unidade.id]) continue;
      adicionarParticipante(unidade, tokens[unidade.id]);
    }
    // Após reconstruir standees, esconder o sprite E sua base quando há GLB.
    // A miniatura 3D possui seu próprio chão/aro e representa o mesmo personagem.
    atualizarStandeeMiniatura();
  };
  // Apenas o mestre vê o 'fantasma' de tokens ocultos. Na visão individual
  // continuam invisíveis conforme as regras de visão/Fog of War existentes.
  const configurarOcultacaoTokens = (tokens: Record<string, TokenMesa>, visaoMestre: boolean) => {
    for (const [id, token] of Object.entries(tokens)) {
      const opacidade = visaoMestre && token.oculto ? 0.38 : 1;
      const desenho = id === idAvatar ? figura : outros.get(id)?.figura;
      const base = basesTokens.get(id);
      if (desenho) {
        desenho.material.opacity = opacidade;
        desenho.material.depthWrite = false;
      }
      if (base) {
        const aroMaterial = base.aro.material as THREE.MeshBasicMaterial;
        if (!aroMaterial.transparent) {
          aroMaterial.transparent = true;
          aroMaterial.needsUpdate = true;
        }
        aroMaterial.opacity = opacidade === 1 ? (id === idAvatar ? 0.84 : 1) : 0.26;
        const sombraMaterial = base.fundo.material as THREE.MeshBasicMaterial;
        sombraMaterial.opacity = opacidade === 1 ? 0.9 : 0.13;
      }
    }
  };
  const carregarImagemParticipante = async (
    id: string,
    blob: Blob | null,
    ativo: () => boolean = () => true,
  ) => {
    const unidade = outros.get(id);
    if (!unidade || !blob) return;
    const preparado = await prepararTextura(blob);
    if (!ativo() || outros.get(id) !== unidade) {
      preparado.textura.dispose();
      return;
    }
    const mat = unidade.figura.material;
    texturasIdle.delete(id);
    mat.map?.dispose();
    mat.map = preparado.textura;
    mat.needsUpdate = true;
    if (preparado.idle) texturasIdle.set(id, preparado.idle);
    imagensPendentesConvidado.delete(id);
    atualizarStandeeMiniatura();
    const ratio = Math.min(1.22, Math.max(0.46, preparado.largura / Math.max(1, preparado.altura)));
    largurasNaturais.set(id, 1.95 * ratio);
    dimensionarToken(id, dimensoes3D.get(id) ?? { largura3D: 100, altura3D: 100 });
  };
  const tokenAtingido = (raycaster: THREE.Raycaster): string | null => {
    const mini = camadaMiniaturas.atingida(raycaster);
    if (mini) {
      const vinculo = camadaMiniaturas.tokenDaMiniatura(mini);
      if (vinculo) return vinculo;
    }
    const alvos: THREE.Object3D[] = [avatar, ...outrosTokens.children].filter((g) => g.visible);
    const hits = raycaster
      .intersectObjects(alvos, true)
      .filter(
        (h) => h.object instanceof THREE.Mesh && h.object.geometry instanceof THREE.PlaneGeometry,
      );
    if (!hits.length) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData.tokenId) obj = obj.parent;
    return obj ? String(obj.userData.tokenId) : null;
  };
  const visualizarToken = (id: string, x: number, z: number) => {
    const alvo = id === idAvatar ? avatar : outros.get(id)?.grupo;
    if (alvo) alvo.position.set(x, 0, z);
    camadaMiniaturas.moverVinculada(id, x, z);
  };
  const selecionarToken = (id: string | null) => {
    camadaMiniaturas.selecionarPersonagem(id);
    for (const [key, guia] of molduras)
      guia.visible = Boolean(id) && (key === id || (key === '__avatar__' && idAvatar === id));
    // A cor escolhida pelo mestre pertence ao token; a moldura de seleção
    // já fornece o destaque amarelo e não substitui a cor do aro.
  };
  const selecionarTokens = (ids: readonly string[]) => {
    if (visaoObservadorId) return;
    camadaMiniaturas.selecionarPersonagem(ids.length === 1 ? ids[0] : null);
    const escolhidos = new Set(ids);
    for (const [key, guia] of molduras) {
      const uid = key === '__avatar__' ? idAvatar : key;
      guia.visible = escolhidos.has(uid);
    }
  };
  const definirAparenciaToken = (id: string, dados: AparenciaToken) => {
    const base = basesTokens.get(id);
    if (!base) return;
    const visual = normalizarAparenciaToken(dados);
    const materialAro = base.aro.material;
    if (materialAro instanceof THREE.MeshBasicMaterial) {
      materialAro.color.set(visual.corBorda);
      materialAro.needsUpdate = true;
    }
    const materialFundo = base.fundo.material;
    if (materialFundo instanceof THREE.MeshBasicMaterial) {
      // Nunca expor base vazia enquanto o GIF de um convidado está carregando.
      // Manter também a ocultação de fundo quando a miniatura GLB substitui o standee.
      base.fundo.visible =
        visual.fundo !== 'transparente' &&
        (!modoConvidadoIncremental ||
          (id === idAvatar ? figura.visible : (outros.get(id)?.figura.visible ?? false)));
      materialFundo.color.set(corFundoToken(visual));
      materialFundo.opacity = 0.9;
      materialFundo.transparent = true;
      materialFundo.needsUpdate = true;
    }
  };
  const orientarToken = (id: string, espelhadoX: boolean) => {
    espelhadosTokens.set(id, espelhadoX);
    const alvo = id === idAvatar ? figura : outros.get(id)?.figura;
    if (alvo) dimensionarToken(id, dimensoes3D.get(id) ?? { largura3D: 100, altura3D: 100 });
  };

  const trocarAparencia = async (
    blob: Blob | null,
    personagem: string,
    hex: string,
    ativo: () => boolean = () => true,
  ) => {
    const preparado = blob ? await prepararTextura(blob) : null;
    const nova = preparado?.textura ?? avatarFallback(personagem, hex);
    if (!ativo()) {
      nova.dispose();
      return;
    }
    texturasIdle.delete(idAvatar);
    const antiga = material.map;
    material.map = nova;
    material.needsUpdate = true;
    antiga?.dispose();
    if (preparado?.idle) texturasIdle.set(idAvatar, preparado.idle);
    if (preparado) {
      const ratio = Math.min(
        1.22,
        Math.max(0.46, preparado.largura / Math.max(1, preparado.altura)),
      );
      largurasNaturais.set(idAvatar, 1.95 * ratio);
    } else largurasNaturais.set(idAvatar, 1.35);
    dimensionarToken(idAvatar, dimensoes3D.get(idAvatar) ?? { largura3D: 100, altura3D: 100 });
  };
  const girarParaCamera = (camera: THREE.Camera) => {
    const dir = new THREE.Vector3().subVectors(camera.position, avatar.position);
    figura.rotation.y = Math.atan2(dir.x, dir.z);
    for (const { grupo, figura: outra } of outros.values()) {
      const v = new THREE.Vector3().subVectors(camera.position, grupo.position);
      outra.rotation.y = Math.atan2(v.x, v.z);
    }
    // Billboard por peça: funciona na Visão Mestre e na Terceira Pessoa.
    for (const grupo of objetosCriados.children) {
      const direcao = new THREE.Vector3().subVectors(camera.position, grupo.position);
      const angulo = Math.atan2(direcao.x, direcao.z) - grupo.rotation.y;
      for (const filho of grupo.children) {
        if (filho.userData.movelPixel25D) filho.rotation.y = angulo;
      }
    }
  };
  const atualizarStandeeMiniatura = () => {
    const mostrarOriginal = (id: string, ativo: boolean, visual: THREE.Object3D) => {
      const visivel =
        ativo && !camadaMiniaturas.vinculoAtivo(id) && !imagensPendentesConvidado.has(id);
      visual.visible = visivel;
      const base = basesTokens.get(id);
      if (base) {
        base.aro.visible = visivel;
        base.fundo.visible = visivel;
      }
    };
    mostrarOriginal(idAvatar, avatar.visible, figura);
    for (const [uid, outro] of outros) mostrarOriginal(uid, outro.grupo.visible, outro.figura);
  };
  const configurarMiniaturas = (
    lista: readonly InstanciaMiniatura3D[],
    cenario: Cenario3D,
    tokens: Record<string, TokenMesa>,
    mostrar = true,
  ) => {
    camadaMiniaturas.sincronizar(lista, cenario, tokens, mostrar, atualizarStandeeMiniatura);
    atualizarStandeeMiniatura();
  };
  const dispose = () => {
    camadaMiniaturas.dispose();
    liberarBarreiras();
    limparGrupo(camadaLuzes);
    limparGrupo(camadaMarcadores);
    limparGrupo(camadaDesenhos);
    limparGrupo(camadaRascunho);
    texturasIdle.clear();
    parametrosIdle.clear();
    restaurarTexturaPisoAposObservar();
    texturaPreviaFogMestre?.dispose();
    texturaVisao.dispose();
    materialVisao.dispose();
    malhaVisao.geometry.dispose();
    destruido = true;
    numeroTrocaPiso++;
    atmosfera.dispose();
    limparParticipantes();
    texturaPlanta?.dispose();
    texturasPiso.forEach((t) => t.dispose());
    const geos = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    cena.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        geos.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material])
          materials.add(mat);
      }
      if (obj instanceof THREE.Mesh) {
        geos.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          materials.add(mat);
          const map = (mat as THREE.MeshStandardMaterial).map;
          if (map) textures.add(map);
        }
      }
    });
    geos.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };
  return {
    cena,
    avatar,
    figura,
    atualizarTransicaoFogPublicado3D,
    configurarMiniaturas,
    atualizarAnimacoesMiniaturas: camadaMiniaturas.atualizarAnimacoes,
    miniaturaAtingida: camadaMiniaturas.atingida,
    selecionarMiniatura: camadaMiniaturas.selecionar,
    visualizarMiniatura: camadaMiniaturas.moverVisual,
    configurarBarreiras,
    configurarVisibilidadeObjetos,
    configurarVisaoIndividual,
    configurarFogPublicado3D,
    tokenEstaVisivel,
    barreiraAtingida,
    trocarAparencia,
    girarParaCamera,
    configurarCenario,
    configurarPeriodoDia,
    configurarConstrucao,
    configurarIluminacao,
    configurarFontesLuz,
    configurarAnotacoes,
    previsualizarDesenho,
    marcadorAtingido,
    luzAtingida,
    desenhoAtingido,
    moverMarcadorVisual,
    moverLuzVisual,
    selecionarAnotacaoVisual,
    aplicarPiso,
    atualizarPisoRecorte,
    visualizarObjeto,
    visualizarEdicaoObjeto,
    alcaAtingida,
    selecionarObjeto,
    objetoAtingido,
    configurarParticipantes,
    configurarOcultacaoTokens,
    carregarImagemParticipante,
    tokenAtingido,
    visualizarToken,
    selecionarToken,
    selecionarTokens,
    selecionarObjetos,
    sincronizarParticipantesConvidado,
    liberarImagemPendenteParticipante,
    restaurarImagemParticipante,
    orientarToken,
    dimensionarToken,
    definirAparenciaToken,
    atualizarIdle,
    configurarIdleToken,
    dispose,
  };
}
export const obstaculosVisuais = MOBILIARIO;
