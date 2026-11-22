/**
 * v29.15.13 — A MESMA cena e o MESMO motor Three.js da Mesa 3D do mestre.
 * O servidor entrega somente a projeção visível; nenhuma leitura de campanha,
 * acesso a arquivos locais, geometria escondida ou ferramentas administrativas.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { criarSala3D } from '../mesa3d/roomScene';
import { criarClimaCena3D } from '../mesa3d/climaCena3D';
import { dimensoesTerreno3D, moverNoCenario3D, type Cenario3D } from '../mesa3d/editorCena3D';
import {
  percentualParaChao3D,
  chaoParaPercentual3D,
  deslocarAlvoCamera,
  posicaoPermitidaNaMesa3D,
} from '../mesa3d/mesaLivre3D';
import { direcaoCamera } from '../mesa3d/roomLogic';
import {
  CAMERA_TERCEIRA_3D,
  posicionarCameraTerceira3D,
} from '../mesa3d/cameraTerceiraCompartilhada';
import { distanciaInicialMapa3D } from '../mesa3d/enquadramentoMesa3D';
import {
  calcularEnquadramentoCinematico,
  girarCameraPersonagem,
  girarCameraTatica,
  zoomCameraPersonagem,
} from '../mesa3d/cameraCinematica';
import { registrarPosicao, amostrarPosicao, ATRASO_VISUAL_MS } from './interpolacaoRemota.mjs';
import type { AmostraPosicao } from './interpolacaoRemota.mjs';
import { assinarArrasto } from './arrastoRemoto.mjs';
import type { ArrastoRemoto } from './arrastoRemoto.mjs';
import { normalizarClima } from '../lib/weather';
import type { ConfigClima } from '../lib/weather';
import type { ControleClima3D } from '../mesa3d/climaCena3D';
import type { TokenMesa, UnidadeMesa } from '../lib/mesaCompartilhada';
import type { TracoDesenho } from '../lib/anotacoesMesa';
import type { MesaPublica, TokenPublico, CredencialSala } from './api';
import type { PontoMenuCombate } from '../hexatombe/posicaoMenuCombate';
import { autorizar, urlSala } from './api';
import './MesaConvidado3D.css';

export type CameraJogador = 'mesa' | 'terceira' | 'personagem' | 'tatica';
type Props = {
  mesa: MesaPublica;
  credencial: CredencialSala;
  meuPersonagem: string | null;
  podeMover: boolean;
  onSolicitarMovimento: (x: number, y: number, final?: boolean) => void;
  onIniciarArrasto: () => string;
  onEncerrarArrasto: (gestoId: string) => void;
  arrastoBloqueado: { gestoId: string; sequencia: number } | null;
  onProjecaoPersonagem?: (posicao: PontoMenuCombate | undefined) => void;
  desenhoAtivo?: boolean;
  corDesenho?: string;
  espessuraDesenho?: number;
  desenhosPendentes?: TracoDesenho[];
  onConcluirDesenho?: (traco: TracoDesenho) => void;
  camera: CameraJogador;
  zoomTatico: number;
  onZoomTatico: (valor: number) => void;
  reenquadrar: number;
  restaurar: number;
  pausarClima?: boolean;
};
const restringir = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cenarioFallback: Cenario3D = {
  versao: 1,
  base: 'vazia',
  piso: 'imagem',
  objetos: [],
  miniaturas: [],
  mapaUnico: true,
};
function montarPersonagem3D(t: TokenPublico): UnidadeMesa {
  return {
    id: t.id,
    nome: t.nome,
    cor: t.cor,
    tipo: t.tipo,
    temToken: !!t.imagem || !!t.animacao,
    temRetrato: false,
    temPdf: false,
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
}
function montarToken3D(t: TokenPublico): TokenMesa {
  return {
    x: t.x,
    y: t.y,
    tamanho: t.tamanho ?? 70,
    largura3D: t.largura3D,
    altura3D: t.altura3D,
    rotacao: t.rotacao ?? 0,
    oculto: false,
    travado: t.travado,
    ocultarNome: !!t.ocultarNome,
    espelhadoX: !!t.espelhadoX,
    visao: 18,
    emiteLuz: false,
    alcanceLuz: 15,
    corLuz: '#ffdb94',
  };
}
function fundoToken(t: TokenPublico) {
  return {
    corBorda: t.cor,
    fundo:
      t.fundo === 'transparent'
        ? 'transparente'
        : t.fundo && t.fundo !== '#22252d'
          ? 'personalizado'
          : 'escuro',
    corFundo: t.fundo && t.fundo !== 'transparent' ? t.fundo : '#22252d',
  } as const;
}

export default function MesaConvidado3D({
  mesa,
  credencial,
  meuPersonagem,
  podeMover,
  onSolicitarMovimento,
  onIniciarArrasto,
  onEncerrarArrasto,
  arrastoBloqueado,
  onProjecaoPersonagem,
  desenhoAtivo = false,
  corDesenho = '#f0bf73',
  espessuraDesenho = 3,
  desenhosPendentes = [],
  onConcluirDesenho,
  camera,
  zoomTatico,
  onZoomTatico,
  reenquadrar,
  restaurar,
  pausarClima = false,
}: Props) {
  const elemento = useRef<HTMLDivElement | null>(null);
  const climaRef = useRef<ControleClima3D | null>(null);
  const climaConfiguradoRef = useRef<ConfigClima>(normalizarClima(mesa.ambiente?.clima));
  const climaPausadoRef = useRef(pausarClima);
  climaPausadoRef.current = pausarClima;
  // Reconfigura o mesmo clima 3D ao pausar/reabrir, sem remontar renderer, câmera ou tokens.
  useEffect(() => {
    climaRef.current?.configurar(climaConfiguradoRef.current, pausarClima);
  }, [pausarClima]);
  const atualizar = useRef<(projecao: MesaPublica, personagem: string | null) => void>(
    () => undefined,
  );
  const solicitarRef = useRef(onSolicitarMovimento);
  solicitarRef.current = onSolicitarMovimento;
  const iniciarGestoRef = useRef(onIniciarArrasto);
  iniciarGestoRef.current = onIniciarArrasto;
  const encerrarGestoRef = useRef(onEncerrarArrasto);
  encerrarGestoRef.current = onEncerrarArrasto;
  const cancelarGestoRef = useRef<(gestoId: string) => void>(() => undefined);
  useEffect(() => {
    if (arrastoBloqueado) cancelarGestoRef.current(arrastoBloqueado.gestoId);
  }, [arrastoBloqueado]);
  const projecaoRef = useRef(onProjecaoPersonagem);
  projecaoRef.current = onProjecaoPersonagem;
  const desenhoRef = useRef({
    ativo: desenhoAtivo,
    cor: corDesenho,
    espessura: espessuraDesenho,
    aoConcluir: onConcluirDesenho,
  });
  desenhoRef.current = {
    ativo: desenhoAtivo,
    cor: corDesenho,
    espessura: espessuraDesenho,
    aoConcluir: onConcluirDesenho,
  };
  const extrasRef = useRef(desenhosPendentes);
  extrasRef.current = desenhosPendentes;
  useEffect(() => {
    atualizar.current(cenaAtual.current, idAtual.current);
  }, [desenhosPendentes]);
  const podeMoverRef = useRef(podeMover);
  podeMoverRef.current = podeMover;
  const cameraRef = useRef(camera);
  const zoomTaticoRef = useRef(zoomTatico);
  const onZoomTaticoRef = useRef(onZoomTatico);
  onZoomTaticoRef.current = onZoomTatico;
  const comandosRef = useRef<{ reenquadrar: () => void; restaurar: () => void }>({
    reenquadrar: () => {},
    restaurar: () => {},
  });
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const cenaAtual = useRef(mesa);
  cenaAtual.current = mesa;
  const idAtual = useRef(meuPersonagem);
  idAtual.current = meuPersonagem;
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    zoomTaticoRef.current = zoomTatico;
  }, [zoomTatico]);
  useEffect(() => {
    if (reenquadrar > 0) comandosRef.current.reenquadrar();
  }, [reenquadrar]);
  useEffect(() => {
    if (restaurar > 0) comandosRef.current.restaurar();
  }, [restaurar]);

  useEffect(() => {
    const host = elemento.current;
    if (
      !host ||
      !(
        mesa.visibilidade === 'total' ||
        (mesa.visibilidade === 'individual' && Boolean(mesa.mascara3D) && Boolean(mesa.cenario3D))
      )
    )
      return;
    let ativo = true;
    let limpar: () => void = () => undefined;
    setErro(null);
    setPronto(false);
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
      renderer.domElement.className = 'm3d-canvas';
      renderer.domElement.setAttribute('aria-label', 'Mesma cena 3D compartilhada com o mestre');
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'none';
      host.appendChild(renderer.domElement);
      const carregarModelo = async (id: string): Promise<Blob | null> => {
        if (!ativo) return null;
        const resposta = await fetch(
          `${urlSala(credencial.codigo)}/modelos3d/${encodeURIComponent(id)}`,
          {
            headers: autorizar(credencial.token),
            cache: 'force-cache',
          },
        );
        return resposta.ok ? resposta.blob() : null;
      };
      const sala = criarSala3D('Convidado', '#b99570', carregarModelo);
      const clima = criarClimaCena3D(sala.cena);
      climaRef.current = clima;
      climaConfiguradoRef.current = normalizarClima(cenaAtual.current.ambiente?.clima);
      clima.configurar(climaConfiguradoRef.current, climaPausadoRef.current);
      const camera3d = new THREE.PerspectiveCamera(62, 1, 0.25, 450);
      let configuracao: Cenario3D = cenarioFallback;
      let ultimaEstrutura = '',
        ultimaConfiguracao = '',
        ultimoPeriodoDia: string = '',
        ultimaImagem = '',
        ultimaAmbiente = '';
      // Cada personagem possui pedido próprio: não reiniciar GIFs anteriores
      // quando outro token fica visível. A referência do pedido invalida respostas antigas.
      const pedidosMidia = new Map<string, { fonte: string }>();
      let mascaraAplicada: string | null = null;
      let poligonoAplicado = '';
      let imagemEmCarga = false;
      type QuadroFog = {
        imagem: string;
        mascara: string | null;
        poligono?: { x: number; y: number }[];
        cenario: Cenario3D;
      };
      let recortePendente: QuadroFog | null = null;
      const processarRecortes = async () => {
        if (imagemEmCarga) return;
        imagemEmCarga = true;
        try {
          // Sempre termina o quadro em curso antes de ler a posição mais nova;
          // não abortar cada TextureLoader quando chegam quadros em sequência.
          while (ativo && recortePendente) {
            const quadro = recortePendente;
            recortePendente = null;
            try {
              const blob = quadro.imagem ? await (await fetch(quadro.imagem)).blob() : null;
              if (!ativo) return;
              if (blob) await sala.atualizarPisoRecorte(blob);
              else await sala.aplicarPiso('madeira');
              if (!ativo) return;
              sala.configurarFogPublicado3D(quadro.mascara, quadro.cenario, quadro.poligono);
              mascaraAplicada = quadro.mascara;
              poligonoAplicado = JSON.stringify(quadro.poligono ?? null);
            } catch {
              // Se um recorte falhar, não mostrar o mapa anterior sem censura.
              if (ativo) {
                sala.configurarFogPublicado3D('0'.repeat(2304), quadro.cenario);
                mascaraAplicada = null;
              }
            }
          }
        } finally {
          imagemEmCarga = false;
        }
      };
      let posicoes = new Map<string, { x: number; z: number }>();
      type EstadoToken = {
        amostras: AmostraPosicao[];
        ponto: { x: number; y: number };
        ultimo: { x: number; y: number };
      };
      const visuais = new Map<string, EstadoToken>();
      const oficiais = new Map<string, { x: number; y: number }>();
      const subscricoes = new Map<string, () => void>();
      // O WASD é simulado em cada quadro (como no mestre) e publicado em lotes.
      // A autoridade permanece no mestre: esta previsão nunca altera o estado salvo.
      type CaminhadaLocal = {
        id: string;
        x: number;
        z: number;
        andando: boolean;
        ate: number;
        ultimoEnvio: number;
      };
      let caminhadaLocal: CaminhadaLocal | null = null;
      // Posições públicas trafegam em %; amostragem quadro a quadro impede teleporte visual.
      const registrar = (id: string, x: number, y: number) => {
        const agora = performance.now(),
          anterior = visuais.get(id);
        if (!anterior) {
          visuais.set(id, { amostras: [{ x, y, t: agora }], ponto: { x, y }, ultimo: { x, y } });
          return;
        }
        anterior.amostras = registrarPosicao(anterior.amostras, x, y, agora);
      };
      const receberArrasto = (evento: ArrastoRemoto) => {
        // Eventos de arrasto são enviados ANTES de o mestre validar paredes.
        // No 3D, nunca renderizar esse destino especulativo: se for negado,
        // o token atravessa a parede e depois teleporta de volta.
        // Somente registrar coordenadas já presentes no quadro AUTORIZADO.
        const oficial = oficiais.get(evento.id);
        if (!ativo || !oficial || Math.hypot(evento.x - oficial.x, evento.y - oficial.y) > 0.01)
          return;
        registrar(evento.id, oficial.x, oficial.y);
      };
      let distancia = 26,
        rotacao = 0.3,
        angulo = 0.92;
      let centroMesa = { x: 0, z: 0 };
      // Parâmetros da câmera usados pelo mestre, sem uma segunda implementação visual.
      let anguloTerceira: number = CAMERA_TERCEIRA_3D.anguloInicial;
      let elevacaoTerceira: number = CAMERA_TERCEIRA_3D.elevacaoInicial;
      let distanciaTerceira: number = CAMERA_TERCEIRA_3D.distanciaInicial;
      const focoTerceira = new THREE.Vector3();
      let focoInicializado = false;
      let anguloPersonagem = 0.65,
        elevacaoPersonagem = 0.3,
        distanciaPersonagem = 5.2;
      let anguloTatico = 0.65,
        elevacaoTatico = 1.04;
      let deslocamentoTatico = { x: 0, z: 0 };
      // Idêntico ao mestre: a câmera tática amortece a posição e o foco.
      // Durante o arrasto congelamos a câmera para o chão não fugir do mouse.
      const posCameraTatica = new THREE.Vector3(),
        focoCameraTatica = new THREE.Vector3();
      let cameraTaticaInicializada = false,
        cameraTaticaEmArrasto = false,
        modoCameraAnterior: CameraJogador | null = null;
      let tokenSelecionado: string | null = null;
      let ultimoEnvioDrag = 0;
      comandosRef.current.reenquadrar = () => {
        anguloTatico = 0.65;
        elevacaoTatico = 1.04;
        deslocamentoTatico = { x: 0, z: 0 };
        cameraTaticaEmArrasto = false;
      };
      comandosRef.current.restaurar = () => {
        anguloPersonagem = 0.65;
        elevacaoPersonagem = 0.3;
        distanciaPersonagem = 5.2;
      };

      let iniciaTamanho = true;
      const ajustar = () => {
        const w = host.clientWidth,
          h = host.clientHeight;
        if (w < 2 || h < 2) return;
        camera3d.aspect = w / h;
        camera3d.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (iniciaTamanho) {
          const d = dimensoesTerreno3D(configuracao);
          distancia = distanciaInicialMapa3D(d.largura, d.profundidade, w / h, rotacao, angulo);
          iniciaTamanho = false;
        }
      };
      let ultimaProjecao = 0;
      const observer = new ResizeObserver(ajustar);
      observer.observe(host);
      const atualizarMesa = (dados: MesaPublica, personagem: string | null) => {
        if (!ativo) return;
        const novoCenario = dados.cenario3D ?? cenarioFallback;
        // Cada quadro contém piso já censurado + máscara do MESMO observador.
        // A fila descarta apenas intermediários atrasados, sem esperar o jogador parar.
        const mascara = dados.visibilidade === 'individual' ? (dados.mascara3D ?? null) : null;
        const poligono = dados.visibilidade === 'individual' ? dados.poligono3D : undefined;
        // Dia/tarde/noite não precisa reconstruir objetos, piso ou texturas.
        const chaveCenario = JSON.stringify({ ...novoCenario, periodoDia: undefined });
        const mudouCenario = chaveCenario !== ultimaConfiguracao;
        if (mudouCenario) {
          ultimaConfiguracao = chaveCenario;
          configuracao = novoCenario;
          sala.configurarCenario(configuracao);
          sala.configurarConstrucao(false, configuracao);
          const d = dimensoesTerreno3D(configuracao);
          if (!posicoes.size) {
            distancia = distanciaInicialMapa3D(
              d.largura,
              d.profundidade,
              Math.max(0.5, host.clientWidth / Math.max(1, host.clientHeight)),
              rotacao,
              angulo,
            );
          }
        }
        if (!mudouCenario) configuracao = novoCenario;
        const periodoRecebido = novoCenario.periodoDia ?? 'dia';
        if (ultimoPeriodoDia !== periodoRecebido) {
          ultimoPeriodoDia = periodoRecebido;
          sala.configurarPeriodoDia(periodoRecebido);
        }
        const imagem = dados.imagem || '';
        if (imagem !== ultimaImagem || mudouCenario) {
          const primeiroMapa = ultimaImagem === '';
          ultimaImagem = imagem;
          if (primeiroMapa && mascara) {
            // Fechar tudo até a primeira textura censurada estar pronta.
            sala.configurarFogPublicado3D('0'.repeat(2304), novoCenario);
          }
          recortePendente = { imagem, mascara, poligono, cenario: novoCenario };
          void processarRecortes();
        } else if (
          !imagemEmCarga &&
          (mascara !== mascaraAplicada || JSON.stringify(poligono ?? null) !== poligonoAplicado)
        ) {
          sala.configurarFogPublicado3D(mascara, novoCenario, poligono);
          mascaraAplicada = mascara;
          poligonoAplicado = JSON.stringify(poligono ?? null);
        }
        const chaveClima = JSON.stringify(dados.ambiente) + JSON.stringify(extrasRef.current);
        if (chaveClima !== ultimaAmbiente || mudouCenario) {
          ultimaAmbiente = chaveClima;
          climaConfiguradoRef.current = normalizarClima(dados.ambiente?.clima);
          clima.configurar(climaConfiguradoRef.current, climaPausadoRef.current);
          sala.configurarIluminacao(
            dados.ambiente?.iluminacao?.ambiente ?? 40,
            dados.ambiente?.iluminacao?.ativa ?? false,
          );
          sala.configurarFontesLuz(
            (dados.ambiente?.luzes ?? []).map((l, i) => ({ ...l, id: `publica-${i}` })),
            configuracao,
            false,
          );
          sala.configurarAnotacoes(
            dados.ambiente?.marcadores ?? [],
            [...(dados.ambiente?.desenhos ?? []), ...extrasRef.current],
            configuracao,
            true,
          );
        }
        const keyTokens = JSON.stringify(
          dados.tokens.map((t) => ({
            id: t.id,
            nome: t.nome,
            cor: t.cor,
            imagem: t.imagem,
            animacao: t.animacao,
          })),
        );
        if (keyTokens !== ultimaEstrutura) {
          ultimaEstrutura = keyTokens;
          const remotosAtualizados = Object.fromEntries(
            dados.tokens.map((t) => [t.id, montarToken3D(t)]),
          );
          // Atualização incremental: jamais destruir GIFs já decodificados porque um
          // personagem novo entrou/saiu do campo de visão.
          sala.sincronizarParticipantesConvidado(
            dados.tokens.map(montarPersonagem3D),
            remotosAtualizados,
          );
          const ids = new Set(dados.tokens.map((t) => t.id));
          for (const id of pedidosMidia.keys()) if (!ids.has(id)) pedidosMidia.delete(id);
          for (const token of dados.tokens) {
            const fonte = token.animacao
              ? `${urlSala(credencial.codigo)}/midias/${token.animacao}`
              : (token.imagem ?? '');
            const assinatura = fonte || `fallback:${token.nome}:${token.cor}`;
            if (pedidosMidia.get(token.id)?.fonte === assinatura) continue;
            const pedido = { fonte: assinatura };
            pedidosMidia.set(token.id, pedido);
            if (!fonte) {
              sala.restaurarImagemParticipante(token.id, token.nome, token.cor);
              continue;
            }
            void (async () => {
              try {
                const resposta = await fetch(
                  fonte,
                  token.animacao ? { headers: autorizar(credencial.token) } : undefined,
                );
                if (!resposta.ok) throw Error('Mídia indisponível');
                const blob = await resposta.blob();
                if (!ativo || pedidosMidia.get(token.id) !== pedido) return;
                await sala.carregarImagemParticipante(
                  token.id,
                  blob,
                  () => ativo && pedidosMidia.get(token.id) === pedido,
                );
              } catch {
                // Falha permanente: liberar fallback apenas para este personagem,
                // sem piscar ou reconstruir o restante da cena.
                if (ativo && pedidosMidia.get(token.id) === pedido)
                  sala.liberarImagemPendenteParticipante(token.id);
              }
            })();
          }
        }
        const remotos = Object.fromEntries(dados.tokens.map((t) => [t.id, montarToken3D(t)]));
        const presentes = new Set(dados.tokens.map((t) => t.id));
        for (const id of visuais.keys())
          if (!presentes.has(id)) {
            visuais.delete(id);
            oficiais.delete(id);
            posicoes.delete(id);
            subscricoes.get(id)?.();
            subscricoes.delete(id);
          }
        for (const token of dados.tokens) {
          const oficial = { x: token.x, y: token.y };
          oficiais.set(token.id, oficial);
          // O estado confirmado pelo mestre é a única origem do movimento visual.
          // Não deixar um arrasto rejeitado substituir esta posição.
          registrar(token.id, oficial.x, oficial.y);
          const atual = visuais.get(token.id)?.ponto ?? oficial;
          const ponto = percentualParaChao3D(atual, configuracao);
          const visual =
            caminhadaLocal?.id === token.id ? { x: caminhadaLocal.x, z: caminhadaLocal.z } : ponto;
          sala.visualizarToken(token.id, visual.x, visual.z);
          posicoes.set(token.id, visual);
          if (!subscricoes.has(token.id))
            subscricoes.set(token.id, assinarArrasto(dados.cenaId, token.id, receberArrasto));
          sala.orientarToken(token.id, !!token.espelhadoX);
          sala.dimensionarToken(token.id, remotos[token.id]);
          sala.definirAparenciaToken(token.id, fundoToken(token));
          sala.configurarIdleToken(token.id, !!token.idlePausado, token.idleVelocidade ?? 1);
        }
        sala.configurarOcultacaoTokens(remotos, false);
        sala.configurarMiniaturas(configuracao.miniaturas ?? [], configuracao, remotos, true);
        if (
          caminhadaLocal &&
          (!podeMoverRef.current ||
            caminhadaLocal.id !== personagem ||
            !presentes.has(caminhadaLocal.id))
        )
          caminhadaLocal = null;
        if (
          !tokenSelecionado ||
          tokenSelecionado !== personagem ||
          !presentes.has(tokenSelecionado)
        )
          tokenSelecionado = null;
        sala.selecionarToken(tokenSelecionado);
        if (personagem && !posicoes.has(personagem) && cameraRef.current === 'personagem')
          cameraRef.current = 'mesa';
      };
      atualizar.current = atualizarMesa;
      ajustar();
      atualizarMesa(cenaAtual.current, idAtual.current);
      const restaurarPosicaoPublicada = (id: string) => {
        const posicao = visuais.get(id)?.ponto ?? oficiais.get(id);
        if (!posicao) return;
        const ponto = percentualParaChao3D(posicao, configuracao);
        sala.visualizarToken(id, ponto.x, ponto.z);
        posicoes.set(id, ponto);
      };
      // Mesmo gesto do mestre: clique seleciona o token; esquerdo arrasta somente
      // o personagem atribuído; direito orbita; do meio/Shift+esquerdo desloca.
      // O servidor valida todo movimento. Jamais mover outros tokens ou o cenário.
      type Ponteiro3D = {
        id: number;
        x: number;
        y: number;
        inicioX: number;
        inicioY: number;
        movido: boolean;
        botao: number;
        acao: 'token' | 'orbita' | 'pan' | 'desenho' | 'nenhuma';
        ultimoX: number;
        ultimoY: number;
        gestoId?: string;
      };
      let inicio: Ponteiro3D | null = null;
      let rascunho3D: TracoDesenho | null = null;
      const raycaster = new THREE.Raycaster();
      const mouseRaycast = (e: PointerEvent) => {
        const retangulo = renderer.domElement.getBoundingClientRect();
        if (retangulo.width <= 0 || retangulo.height <= 0) return false;
        const mouse = new THREE.Vector2(
          ((e.clientX - retangulo.left) / retangulo.width) * 2 - 1,
          -((e.clientY - retangulo.top) / retangulo.height) * 2 + 1,
        );
        camera3d.updateMatrixWorld();
        raycaster.setFromCamera(mouse, camera3d);
        return true;
      };
      const pontoNoChao = (e: PointerEvent) => {
        if (!mouseRaycast(e)) return null;
        const chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const ponto = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(chao, ponto)) return null;
        const d = dimensoesTerreno3D(configuracao);
        return ponto.x >= d.minX && ponto.x <= d.maxX && ponto.z >= d.minZ && ponto.z <= d.maxZ
          ? { x: ponto.x, z: ponto.z }
          : null;
      };
      const converterPonto = (p: { x: number; z: number }) => {
        const percentual = chaoParaPercentual3D(p, configuracao);
        if (
          !Number.isFinite(percentual.x) ||
          !Number.isFinite(percentual.y) ||
          percentual.x < 1 ||
          percentual.x > 99 ||
          percentual.y < 1 ||
          percentual.y > 99
        )
          return null;
        return { x: Math.round(percentual.x * 100) / 100, y: Math.round(percentual.y * 100) / 100 };
      };
      cancelarGestoRef.current = (gestoId: string) => {
        // A colisão não apenas imobiliza o token: encerra o arrasto do ponteiro.
        if (!inicio || inicio.acao !== 'token' || inicio.gestoId !== gestoId) return;
        const id = inicio.id;
        inicio = null;
        cameraTaticaEmArrasto = false;
        ultimoEnvioDrag = 0;
        tokenSelecionado = null;
        sala.selecionarToken(null);
        renderer.domElement.style.cursor = 'default';
        if (renderer.domElement.hasPointerCapture(id))
          renderer.domElement.releasePointerCapture(id);
      };
      const arrastar = (e: PointerEvent) => {
        if (!inicio) {
          if (desenhoRef.current.ativo) {
            renderer.domElement.style.cursor = 'crosshair';
            return;
          }
          const modo = cameraRef.current;
          const atingido =
            (modo === 'mesa' || modo === 'tatica') && mouseRaycast(e)
              ? sala.tokenAtingido(raycaster)
              : null;
          renderer.domElement.style.cursor =
            atingido && atingido === idAtual.current
              ? podeMoverRef.current
                ? 'grab'
                : 'pointer'
              : modo === 'terceira' || modo === 'personagem'
                ? 'grab'
                : 'default';
          return;
        }
        if (e.pointerId !== inicio.id) return;
        const dx = e.clientX - inicio.x,
          dy = e.clientY - inicio.y;
        if (Math.hypot(e.clientX - inicio.inicioX, e.clientY - inicio.inicioY) > 5)
          inicio.movido = true;
        const modo = cameraRef.current;
        if (inicio.acao === 'desenho') {
          const ponto = pontoNoChao(e),
            percentual = ponto ? converterPonto(ponto) : null;
          if (percentual && rascunho3D && rascunho3D.pontos.length < 180) {
            const anterior = rascunho3D.pontos[rascunho3D.pontos.length - 1];
            if (
              !anterior ||
              Math.hypot(percentual.x - anterior.x, percentual.y - anterior.y) > 0.24
            ) {
              rascunho3D = { ...rascunho3D, pontos: [...rascunho3D.pontos, percentual] };
              sala.previsualizarDesenho(rascunho3D, configuracao);
            }
          }
        } else if (inicio.acao === 'token') {
          if (inicio.movido && podeMoverRef.current && idAtual.current === tokenSelecionado) {
            const ponto = pontoNoChao(e),
              percentual = ponto ? converterPonto(ponto) : null;
            if (percentual && ponto) {
              // Bloqueio imediato contra objetos e tokens JÁ autorizados no
              // cenário público. As paredes privadas continuam verificadas
              // exclusivamente no mestre, sem vazamento de sua geometria.
              const outros = [...posicoes.entries()]
                .filter(([id]) => id !== tokenSelecionado)
                .map(([, pos]) => pos);
              if (!posicaoPermitidaNaMesa3D(ponto, configuracao, outros)) {
                // Obstáculo público: cancelar imediatamente, sem aguardar a rede.
                const gestoId = inicio.gestoId;
                if (gestoId) {
                  encerrarGestoRef.current(gestoId);
                  cancelarGestoRef.current(gestoId);
                }
                return;
              }
              if (
                (!Number.isFinite(inicio.ultimoX) ||
                  Math.abs(percentual.x - inicio.ultimoX) +
                    Math.abs(percentual.y - inicio.ultimoY) >
                    0.02) &&
                performance.now() - ultimoEnvioDrag > 30
              ) {
                ultimoEnvioDrag = performance.now();
                inicio.ultimoX = percentual.x;
                inicio.ultimoY = percentual.y;
                solicitarRef.current(percentual.x, percentual.y, false);
              }
              // Não mexer em sala.visualizarToken aqui: somente a resposta
              // confirmada do mestre move o personagem na tela do convidado.
            }
          }
        } else if (inicio.acao === 'orbita') {
          if (modo === 'terceira') {
            anguloTerceira += dx * 0.007;
            elevacaoTerceira = restringir(elevacaoTerceira + dy * 0.0045, 0.37, 1.24);
          } else if (modo === 'personagem') {
            const prox = girarCameraPersonagem(anguloPersonagem, elevacaoPersonagem, dx, -dy);
            anguloPersonagem = prox.angulo;
            elevacaoPersonagem = prox.elevacao;
          } else if (modo === 'tatica') {
            const prox = girarCameraTatica(anguloTatico, elevacaoTatico, dx, -dy);
            anguloTatico = prox.angulo;
            elevacaoTatico = prox.elevacao;
          } else {
            rotacao += dx * 0.007;
            angulo = restringir(angulo - dy * 0.006, 0.25, 1.48);
          }
        } else if (inicio.acao === 'pan') {
          if (modo === 'tatica') {
            // Deslocamento manual independente do enquadramento automático do grupo.
            const foco = posicoes.get(idAtual.current || '') ?? { x: 0, z: 0 };
            const pontos = [...posicoes.entries()]
              .filter(([id]) => id !== idAtual.current)
              .map(([, p]) => p);
            const enquadramento = calcularEnquadramentoCinematico(
              foco,
              undefined,
              'tatica',
              Math.max(0.5, host.clientWidth / Math.max(1, host.clientHeight)),
              pontos,
              zoomTaticoRef.current / 100,
            );
            const destino = deslocarAlvoCamera(
              {
                x: enquadramento.centro.x + deslocamentoTatico.x,
                z: enquadramento.centro.z + deslocamentoTatico.z,
              },
              dx,
              dy,
              anguloTatico,
              enquadramento.distancia,
              configuracao,
            );
            deslocamentoTatico = {
              x: destino.x - enquadramento.centro.x,
              z: destino.z - enquadramento.centro.z,
            };
          } else if (modo === 'mesa')
            centroMesa = deslocarAlvoCamera(centroMesa, dx, dy, rotacao, distancia, configuracao);
        }
        inicio.x = e.clientX;
        inicio.y = e.clientY;
      };
      const iniciar = (e: PointerEvent) => {
        const modo = cameraRef.current;
        if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
        e.preventDefault();
        let acao: Ponteiro3D['acao'] = 'nenhuma';
        if (
          desenhoRef.current.ativo &&
          e.button === 0 &&
          (modo === 'mesa' || modo === 'tatica') &&
          cenaAtual.current.visibilidade !== 'restrita'
        ) {
          const p = pontoNoChao(e),
            percentual = p ? converterPonto(p) : null;
          if (!percentual) return;
          rascunho3D = {
            id: `desenho3d-${Date.now()}`,
            pontos: [percentual],
            cor: desenhoRef.current.cor,
            espessura: desenhoRef.current.espessura,
          };
          sala.previsualizarDesenho(rascunho3D, configuracao);
          acao = 'desenho';
        } else if ((modo === 'mesa' || modo === 'tatica') && e.button === 0 && !e.shiftKey) {
          const atingido = mouseRaycast(e) ? sala.tokenAtingido(raycaster) : null;
          // Não permitir seleção nem arrasto de NPCs, monstros ou personagens alheios.
          tokenSelecionado = atingido === idAtual.current ? atingido : null;
          sala.selecionarToken(tokenSelecionado);
          if (tokenSelecionado && podeMoverRef.current) {
            acao = 'token';
            ultimoEnvioDrag = 0;
            if (modo === 'tatica') cameraTaticaEmArrasto = true;
          }
        } else if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
          if (modo === 'mesa' || modo === 'tatica') acao = 'pan';
        } else if (
          e.button === 2 ||
          (e.button === 0 && (modo === 'terceira' || modo === 'personagem'))
        )
          acao = 'orbita';
        inicio = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          inicioX: e.clientX,
          inicioY: e.clientY,
          movido: false,
          botao: e.button,
          acao,
          ultimoX: NaN,
          ultimoY: NaN,
          ...(acao === 'token' ? { gestoId: iniciarGestoRef.current() } : {}),
        };
        if (acao !== 'nenhuma') {
          renderer.domElement.setPointerCapture(e.pointerId);
          renderer.domElement.style.cursor = acao === 'desenho' ? 'crosshair' : 'grabbing';
        }
      };
      const terminar = (e: PointerEvent) => {
        const atual = inicio;
        if (!atual || atual.id !== e.pointerId) return;
        inicio = null;
        cameraTaticaEmArrasto = false;
        renderer.domElement.style.cursor = 'default';
        if (renderer.domElement.hasPointerCapture(e.pointerId))
          renderer.domElement.releasePointerCapture(e.pointerId);
        if (atual.acao === 'desenho') {
          if (!desenhoRef.current.ativo) {
            rascunho3D = null;
            sala.previsualizarDesenho(null, configuracao);
            return;
          }
          if (rascunho3D?.pontos.length) {
            const r = rascunho3D;
            if (r.pontos.length === 1)
              r.pontos.push({ x: Math.min(100, r.pontos[0].x + 0.03), y: r.pontos[0].y });
            desenhoRef.current.aoConcluir?.(r);
          }
          rascunho3D = null;
          sala.previsualizarDesenho(null, configuracao);
          return;
        }
        if (atual.acao === 'token') {
          if (atual.gestoId) encerrarGestoRef.current(atual.gestoId);
          // Não emitir um destino FINAL baseado no cursor nem reemitir a última
          // posição oficial (que pode estar atrasada em relação à requisição
          // em voo). As amostras já solicitadas seguem na fila e somente a
          // confirmação do mestre atualiza o token.
          ultimoEnvioDrag = 0;
        }
      };
      const cancelar = (e: PointerEvent) => {
        if (inicio?.id !== e.pointerId) return;
        if (inicio.gestoId) encerrarGestoRef.current(inicio.gestoId);
        inicio = null;
        cameraTaticaEmArrasto = false;
        renderer.domElement.style.cursor = 'default';
        rascunho3D = null;
        sala.previsualizarDesenho(null, configuracao);
        if (renderer.domElement.hasPointerCapture(e.pointerId))
          renderer.domElement.releasePointerCapture(e.pointerId);
      };
      const roda = (e: WheelEvent) => {
        e.preventDefault();
        if (cameraRef.current === 'personagem')
          distanciaPersonagem = zoomCameraPersonagem(distanciaPersonagem, e.deltaY);
        else if (cameraRef.current === 'tatica') {
          const valor = restringir(zoomTaticoRef.current + Math.sign(e.deltaY) * 5, 65, 200);
          zoomTaticoRef.current = valor;
          onZoomTaticoRef.current(valor);
        } else if (cameraRef.current === 'terceira')
          distanciaTerceira = restringir(distanciaTerceira + Math.sign(e.deltaY) * 0.35, 3, 7.8);
        else distancia = restringir(distancia + Math.sign(e.deltaY) * 1.5, 5, 175);
      };
      const impedirMenu = (e: MouseEvent) => e.preventDefault();
      const teclas = new Set<string>();
      const aoTeclar = (e: KeyboardEvent) => {
        if (cameraRef.current !== 'terceira' || !podeMoverRef.current || !idAtual.current) return;
        const alvo = e.target as HTMLElement | null;
        if (alvo?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))
          return;
        const tecla = e.key.toLowerCase();
        if (!['w', 'a', 's', 'd', 'shift'].includes(tecla)) return;
        teclas.add(tecla);
        e.preventDefault();
      };
      const soltarTecla = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());
      const perderFoco = () => teclas.clear();
      renderer.domElement.addEventListener('pointerdown', iniciar);
      renderer.domElement.addEventListener('pointermove', arrastar);
      renderer.domElement.addEventListener('pointerup', terminar);
      renderer.domElement.addEventListener('pointercancel', cancelar);
      renderer.domElement.addEventListener('wheel', roda, { passive: false });
      renderer.domElement.addEventListener('contextmenu', impedirMenu);
      window.addEventListener('keydown', aoTeclar);
      window.addEventListener('keyup', soltarTecla);
      window.addEventListener('blur', perderFoco);
      let quadro = 0,
        ultimo = 0;
      const desenhar = (tempo: number) => {
        if (!ativo) return;
        quadro = requestAnimationFrame(desenhar);
        if (document.hidden) return;
        const dt = Math.min(0.05, Math.max(0, (tempo - ultimo) / 1000));
        ultimo = tempo;
        // Renderiza a posição interpolada a cada frame WebGL, não só a cada pacote SSE.
        // Saltos administrativos grandes preservam o tratamento do interpolador comum 2D/3D.
        for (const [id, estado] of visuais) {
          const amostra = amostrarPosicao(estado.amostras, performance.now(), ATRASO_VISUAL_MS);
          if (!amostra) continue;
          if (Math.hypot(amostra.x - estado.ponto.x, amostra.y - estado.ponto.y) < 0.005) continue;
          estado.ponto = amostra;
          if (caminhadaLocal?.id === id) continue; // A prévia local tem prioridade até confirmação.
          const ponto = percentualParaChao3D(amostra, configuracao);
          sala.visualizarToken(id, ponto.x, ponto.z);
          posicoes.set(id, ponto);
        }
        // Arrasto do jogador: a posição renderizada é sempre autorizada pelo
        // mestre. Sem previsão no cursor, não existe teleporte após colisão.
        // Movimento contínuo: 60 FPS localmente, mesma velocidade de deslocamento
        // do mestre (3.05 un/s, Shift 5.25). Só publica pontos a cada 100ms,
        // e sempre envia o ponto FINAL ao soltar a última tecla.
        const modo = cameraRef.current;
        const proprio = idAtual.current;
        const frente = Number(teclas.has('w')) - Number(teclas.has('s'));
        const lateral = Number(teclas.has('d')) - Number(teclas.has('a'));
        const caminhando =
          modo === 'terceira' &&
          podeMoverRef.current &&
          Boolean(proprio) &&
          (frente !== 0 || lateral !== 0);
        if (caminhando && proprio) {
          if (!caminhadaLocal || caminhadaLocal.id !== proprio) {
            const inicio = posicoes.get(proprio);
            if (inicio)
              caminhadaLocal = { id: proprio, ...inicio, andando: true, ate: 0, ultimoEnvio: 0 };
          }
          if (caminhadaLocal?.id === proprio) {
            caminhadaLocal.andando = true;
            const direcao = direcaoCamera(frente, lateral, anguloTerceira);
            const velocidade = teclas.has('shift') ? 5.25 : 3.05;
            const anterior = { x: caminhadaLocal.x, z: caminhadaLocal.z };
            const destino = moverNoCenario3D(
              anterior,
              { x: direcao.x * velocidade * dt, z: direcao.z * velocidade * dt },
              configuracao,
            );
            const demais = [...posicoes.entries()]
              .filter(([id]) => id !== proprio)
              .map(([, pos]) => pos);
            const pValido = chaoParaPercentual3D(destino, configuracao);
            // O servidor aceita apenas 1..99%. Não prever uma posição que a
            // autoridade rejeitaria (erro 'Posição ou cena inválida').
            if (
              pValido.x >= 1 &&
              pValido.x <= 99 &&
              pValido.y >= 1 &&
              pValido.y <= 99 &&
              posicaoPermitidaNaMesa3D(destino, configuracao, demais)
            ) {
              caminhadaLocal.x = destino.x;
              caminhadaLocal.z = destino.z;
            }
            sala.visualizarToken(proprio, caminhadaLocal.x, caminhadaLocal.z);
            posicoes.set(proprio, { x: caminhadaLocal.x, z: caminhadaLocal.z });
            if (tempo - caminhadaLocal.ultimoEnvio >= 100) {
              caminhadaLocal.ultimoEnvio = tempo;
              const p = chaoParaPercentual3D(caminhadaLocal, configuracao);
              solicitarRef.current(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, false);
            }
          }
        } else if (caminhadaLocal?.andando) {
          caminhadaLocal.andando = false;
          caminhadaLocal.ate = tempo + 1400;
          const p = chaoParaPercentual3D(caminhadaLocal, configuracao);
          solicitarRef.current(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, true);
        }
        if (caminhadaLocal && !caminhadaLocal.andando) {
          const oficial = oficiais.get(caminhadaLocal.id);
          const publicado = chaoParaPercentual3D(caminhadaLocal, configuracao);
          const confirmado =
            oficial && Math.hypot(oficial.x - publicado.x, oficial.y - publicado.y) < 0.16;
          if (confirmado || tempo > caminhadaLocal.ate) {
            const id = caminhadaLocal.id;
            caminhadaLocal = null;
            restaurarPosicaoPublicada(id);
          } else {
            sala.visualizarToken(caminhadaLocal.id, caminhadaLocal.x, caminhadaLocal.z);
            posicoes.set(caminhadaLocal.id, { x: caminhadaLocal.x, z: caminhadaLocal.z });
          }
        }
        const seguir = posicoes.get(proprio || '');
        const campoVisao =
          modo === 'terceira'
            ? CAMERA_TERCEIRA_3D.campoVisao
            : modo === 'personagem'
              ? 47
              : modo === 'tatica'
                ? 52
                : 62;
        if (camera3d.fov !== campoVisao) {
          camera3d.fov = campoVisao;
          camera3d.updateProjectionMatrix();
        }
        let distanciaClima = distancia;
        if (modo === 'terceira' && seguir) {
          const destino = new THREE.Vector3(seguir.x, CAMERA_TERCEIRA_3D.alturaDoFoco, seguir.z);
          if (!focoInicializado) {
            focoTerceira.copy(destino);
            focoInicializado = true;
          } else focoTerceira.lerp(destino, 1 - Math.exp(-dt * CAMERA_TERCEIRA_3D.suavizacao));
          posicionarCameraTerceira3D(
            camera3d,
            focoTerceira,
            anguloTerceira,
            distanciaTerceira,
            elevacaoTerceira,
          );
          distanciaClima = distanciaTerceira;
        } else if (modo === 'personagem' && seguir) {
          camera3d.position.set(
            seguir.x +
              Math.sin(anguloPersonagem) * Math.cos(elevacaoPersonagem) * distanciaPersonagem,
            0.8 + Math.sin(elevacaoPersonagem) * distanciaPersonagem,
            seguir.z +
              Math.cos(anguloPersonagem) * Math.cos(elevacaoPersonagem) * distanciaPersonagem,
          );
          camera3d.lookAt(seguir.x, 0.85, seguir.z);
          distanciaClima = distanciaPersonagem;
        } else if (modo === 'tatica') {
          const foco = seguir ?? { x: 0, z: 0 };
          const pontos = [...posicoes.entries()]
            .filter(([id]) => id !== idAtual.current)
            .map(([, p]) => p);
          const enquadramento = calcularEnquadramentoCinematico(
            foco,
            undefined,
            'tatica',
            Math.max(0.5, host.clientWidth / Math.max(1, host.clientHeight)),
            pontos,
            zoomTaticoRef.current / 100,
          );
          const alvo = {
              x: enquadramento.centro.x + deslocamentoTatico.x,
              z: enquadramento.centro.z + deslocamentoTatico.z,
            },
            d = enquadramento.distancia;
          const destino = new THREE.Vector3(
            alvo.x + Math.sin(anguloTatico) * Math.cos(elevacaoTatico) * d,
            Math.max(2, Math.sin(elevacaoTatico) * d),
            alvo.z + Math.cos(anguloTatico) * Math.cos(elevacaoTatico) * d,
          );
          const focoDesejado = new THREE.Vector3(alvo.x, 0.85, alvo.z);
          if (!cameraTaticaInicializada || modoCameraAnterior !== 'tatica') {
            posCameraTatica.copy(destino);
            focoCameraTatica.copy(focoDesejado);
            cameraTaticaInicializada = true;
          } else if (!cameraTaticaEmArrasto) {
            const suavidade = 1 - Math.exp(-dt * 3.5);
            posCameraTatica.lerp(destino, suavidade);
            focoCameraTatica.lerp(focoDesejado, suavidade);
          }
          camera3d.position.copy(posCameraTatica);
          camera3d.lookAt(focoCameraTatica);
          distanciaClima = d;
        } else {
          camera3d.position.set(
            centroMesa.x + Math.sin(rotacao) * Math.cos(angulo) * distancia,
            Math.max(0.9, Math.sin(angulo) * distancia),
            centroMesa.z + Math.cos(rotacao) * Math.cos(angulo) * distancia,
          );
          camera3d.lookAt(centroMesa.x, 0, centroMesa.z);
        }
        modoCameraAnterior = modo;
        sala.girarParaCamera(camera3d);
        sala.atualizarTransicaoFogPublicado3D(tempo);
        sala.atualizarIdle(tempo);
        sala.atualizarAnimacoesMiniaturas(dt);
        const area = dimensoesTerreno3D(configuracao);
        clima.atualizar(dt, seguir || { x: 0, z: 0 }, distanciaClima, area);
        // Mesmo sistema da HUD do mestre: ancora o menu na posição projetada do personagem.
        // Publica só a coordenada na tela do próprio jogador, nunca a de outros tokens.
        if (projecaoRef.current && tempo - ultimaProjecao >= 110) {
          ultimaProjecao = tempo;
          const ponto = posicoes.get(idAtual.current || '');
          if (ponto && modo === 'personagem') {
            const projetado = new THREE.Vector3(ponto.x, 1.55, ponto.z).project(camera3d);
            const caixa = host.getBoundingClientRect();
            projecaoRef.current({
              x: caixa.left + ((projetado.x + 1) * caixa.width) / 2,
              y: caixa.top + ((1 - projetado.y) * caixa.height) / 2,
              visivel: projetado.z >= -1 && projetado.z <= 1,
            });
          } else projecaoRef.current(undefined);
        }
        renderer.render(sala.cena, camera3d);
      };
      quadro = requestAnimationFrame(desenhar);
      setPronto(true);
      limpar = () => {
        ativo = false;
        cancelAnimationFrame(quadro);
        recortePendente = null;
        pedidosMidia.clear();
        observer.disconnect();
        renderer.domElement.removeEventListener('pointerdown', iniciar);
        renderer.domElement.removeEventListener('pointermove', arrastar);
        cancelarGestoRef.current = () => undefined;
        renderer.domElement.removeEventListener('pointerup', terminar);
        renderer.domElement.removeEventListener('pointercancel', cancelar);
        renderer.domElement.removeEventListener('wheel', roda);
        renderer.domElement.removeEventListener('contextmenu', impedirMenu);
        window.removeEventListener('keydown', aoTeclar);
        window.removeEventListener('keyup', soltarTecla);
        window.removeEventListener('blur', perderFoco);
        for (const desassinar of subscricoes.values()) desassinar();
        subscricoes.clear();
        if (climaRef.current === clima) climaRef.current = null;
        clima.dispose();
        sala.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
        atualizar.current = () => undefined;
        comandosRef.current = { reenquadrar: () => {}, restaurar: () => {} };
      };
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar a Mesa 3D.');
    }
    return () => {
      ativo = false;
      limpar();
    };
  }, [
    mesa.cenaId,
    mesa.visibilidade,
    Boolean(mesa.mascara3D),
    Boolean(mesa.cenario3D),
    credencial.codigo,
    credencial.token,
  ]);
  useEffect(() => {
    atualizar.current(mesa, meuPersonagem);
  }, [mesa, meuPersonagem]);
  const comPermissao =
    mesa.visibilidade === 'total' ||
    (mesa.visibilidade === 'individual' && Boolean(mesa.mascara3D) && Boolean(mesa.cenario3D));
  return (
    <div className="pm-player3d" aria-label="Mesa 3D do jogador">
      <div className="pm-player3d-tela" ref={elemento} />
      {!pronto && !erro && comPermissao && (
        <div className="pm-player3d-espera" role="status">
          Carregando a mesma cena 3D do mestre…
        </div>
      )}
      {!comPermissao && (
        <div className="pm-player3d-espera" role="status">
          {mesa.visibilidade === 'individual'
            ? 'Aguardando o recorte individual do mestre…'
            : 'Cena 3D restrita: o mestre precisa liberar sua visualização.'}
        </div>
      )}
      {erro && (
        <div className="pm-player3d-espera" role="alert">
          {erro}
        </div>
      )}
      <div className="pm-player3d-ajuda">
        {desenhoAtivo
          ? '✎ Desenhe sobre o terreno arrastando o botão esquerdo · Saia do modo Desenhar para mover tokens'
          : camera === 'terceira'
            ? 'WASD movimenta seu personagem · Arraste para girar e use a roda para zoom'
            : camera === 'mesa' || camera === 'tatica'
              ? podeMover
                ? 'Clique no seu personagem para selecionar e arraste para movê-lo · Botão direito gira a câmera'
                : 'Clique no seu personagem para selecionar · Movimento sujeito às permissões do mestre'
              : 'Arraste para girar a câmera · Roda do mouse para aproximar'}
      </div>
    </div>
  );
}
