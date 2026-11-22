/** Carregamento sob demanda de GLBs no Three.js. Sem WebGL adicional para a biblioteca. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { carregarMiniatura3D } from '../lib/bibliotecaMiniaturas3D';
import type { InstanciaMiniatura3D } from './miniaturasCena3D';
import type { TokenMesa } from '../lib/mesaCompartilhada';
import { percentualParaChao3D } from './mesaLivre3D';
import type { Cenario3D } from './editorCena3D';
import {
  escolherIndiceIdle,
  normalizarModoAnimacaoMiniatura,
  normalizarVelocidadeAnimacao,
} from './animacoesMiniaturas3D';

export async function lerModeloGLB(blob: Blob): Promise<THREE.Group> {
  const buffer = await blob.arrayBuffer();
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(
      buffer,
      '',
      (gltf) => {
        // GLTFLoader entrega os AnimationClip fora de scene: preservar no modelo-base.
        gltf.scene.animations = gltf.animations;
        resolve(gltf.scene);
      },
      (e) => reject(e),
    ),
  );
}
export function normalizarModeloNoChao(modelo: THREE.Object3D, alturaPadrao = 1.8): THREE.Group {
  const caixa = new THREE.Box3().setFromObject(modelo);
  const tamanho = new THREE.Vector3();
  caixa.getSize(tamanho);
  if (!Number.isFinite(tamanho.y) || tamanho.y < 0.0001)
    throw Error('Modelo GLB sem altura válida.');
  const grupo = new THREE.Group(),
    fator = alturaPadrao / tamanho.y;
  modelo.scale.multiplyScalar(fator);
  modelo.position.set(
    (-(caixa.min.x + caixa.max.x) * fator) / 2,
    -caixa.min.y * fator,
    (-(caixa.min.z + caixa.max.z) * fator) / 2,
  );
  const clonarMaterial = (m: THREE.Material) => {
    const copia = m.clone();
    copia.userData.opacidadeOriginal = copia.opacity;
    return copia;
  };
  modelo.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Materiais independentes por instância: ocultar uma miniatura não muda as outras.
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(clonarMaterial)
        : clonarMaterial(obj.material);
      // GLBs podem usar cabelo, tecidos e vidros TRANSPARENTES. O Three.js desenha
      // esses materiais no mesmo passe da névoa; renderizá-los depois da película
      // do chão impede que partes transparentes desapareçam ao redor do token.
      // O depthTest normal do modelo continua ativo para respeitar a geometria.
      obj.renderOrder = 3;
    }
  });
  grupo.add(modelo);
  return grupo;
}
/** Geometria/texturas pertencem à instância de cena GLTF carregada como modelo-base. */
function descartarModeloCompartilhado(modelo: THREE.Object3D) {
  const geometrias = new Set<THREE.BufferGeometry>();
  const materiais = new Set<THREE.Material>();
  const texturas = new Set<THREE.Texture>();
  modelo.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometrias.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materiais.add(m);
        for (const campo of [
          'map',
          'normalMap',
          'metalnessMap',
          'roughnessMap',
          'emissiveMap',
          'aoMap',
          'alphaMap',
        ] as const) {
          const textura = (m as unknown as Record<string, unknown>)[campo];
          if (textura instanceof THREE.Texture) texturas.add(textura);
        }
      }
    }
  });
  geometrias.forEach((g) => g.dispose());
  materiais.forEach((m) => m.dispose());
  texturas.forEach((t) => t.dispose());
}
export function criarCamadaMiniaturas3D(
  cena: THREE.Scene,
  carregarModeloExterno?: (modeloId: string) => Promise<Blob | null>,
) {
  const grupo = new THREE.Group();
  grupo.name = 'miniaturas-3d-importadas';
  cena.add(grupo);
  const modelos = new Map<string, Promise<THREE.Group>>();
  const instancias = new Map<string, THREE.Group>();
  const modeloPorInstancia = new Map<string, string>();
  const pendentes = new Map<string, string>();
  const erros = new Map<string, string>();
  let vivo = true,
    selecionada: string | null = null;
  let atual: readonly InstanciaMiniatura3D[] = [],
    tokensAtuais: Record<string, TokenMesa> = {},
    cenarioAtual: Cenario3D | null = null,
    mostrarCamada = true;
  // Filtro local da prévia Observar. Não destrói instâncias nem recarrega GLBs.
  // null = sem prévia, a representação volta à visibilidade normal da cena.
  let visiveisNaPrevia: ReadonlySet<string> | null = null;
  // Exatamente a lista de IDs de miniaturas publicada ao convidado.
  // Não confundir ID da instância GLB com ID da ficha vinculada.
  let miniaturasVisiveisNaPrevia: ReadonlySet<string> | null = null;
  // Coordenadas visuais atualizadas por WASD/arrasto ou pela sincronização
  // do elenco. O filtro Observar NÃO deve recolocar o GLB na posição antiga
  // do token persistido enquanto a movimentação ainda está em curso.
  const posicoesVisuaisVinculadas = new Map<string, { x: number; z: number }>();
  let aoCarregar: () => void = () => {};
  const estilos = new Map<string, THREE.Mesh>();
  const animadores = new Map<
    string,
    { mixer: THREE.AnimationMixer; chave: string; velocidade: number }
  >();
  let acumuladoAnimacao = 0;
  function liberarAnimacao(id: string) {
    const anterior = animadores.get(id);
    if (!anterior) return;
    anterior.mixer.stopAllAction();
    const obj = instancias.get(id);
    if (obj) anterior.mixer.uncacheRoot(obj);
    animadores.delete(id);
  }
  function configurarAnimacao(inst: InstanciaMiniatura3D, obj: THREE.Group) {
    // Um AnimationMixer por instância: skeletons não podem compartilhar a mesma pose.
    const clipes = obj.animations;
    const modo = normalizarModoAnimacaoMiniatura(inst.animacaoModo);
    const indice = escolherIndiceIdle(
      clipes.map((c) => c.name),
      modo,
      inst.animacaoIndice ?? 0,
    );
    const clip = indice >= 0 ? clipes[indice] : undefined;
    const velocidade = normalizarVelocidadeAnimacao(inst.animacaoVelocidade);
    const chave = clip ? `${inst.modeloId}:${indice}:${modo}` : '';
    const anterior = animadores.get(inst.id);
    // Visibilidade de Fog é apenas um filtro gráfico. Não destruir o
    // AnimationMixer em cada quadro em que a miniatura sai do campo de visão:
    // um novo play() reiniciaria o esqueleto e causaria flashes e saltos.
    if (!clip || !instancias.has(inst.id)) {
      if (anterior) liberarAnimacao(inst.id);
      return;
    }
    if (anterior?.chave === chave) {
      anterior.velocidade = velocidade;
      return;
    }
    liberarAnimacao(inst.id);
    const mixer = new THREE.AnimationMixer(obj);
    const acao = mixer.clipAction(clip);
    acao.setLoop(THREE.LoopRepeat, Infinity);
    acao.enabled = true;
    acao.play();
    animadores.set(inst.id, { mixer, chave, velocidade });
  }
  /** 30 Hz para bones leves; renderização da câmera continua na taxa normal. */
  function atualizarAnimacoes(dt: number) {
    if (!vivo || !mostrarCamada || !animadores.size) return;
    acumuladoAnimacao += Math.max(0, Math.min(0.05, dt));
    if (acumuladoAnimacao < 1 / 30) return;
    const passo = Math.min(0.08, acumuladoAnimacao);
    acumuladoAnimacao = 0;
    for (const [id, anim] of animadores) {
      if (!instancias.get(id)?.visible) continue;
      anim.mixer.update(passo * anim.velocidade);
    }
  }

  // Decodificação concorrente limitada: abrir uma cena com 30 modelos não dispara
  // 30 leituras do IndexedDB e parse de GLB simultâneos na thread de UI.
  const fila: (() => void)[] = [];
  let leituras = 0;
  const iniciarFila = () => {
    while (vivo && leituras < 2 && fila.length) {
      const tarefa = fila.shift()!;
      leituras++;
      tarefa();
    }
  };
  const carregar = (id: string) => {
    const anterior = modelos.get(id);
    if (anterior) return anterior;
    const promise = new Promise<THREE.Group>((resolve, reject) => {
      fila.push(() => {
        void (async () => {
          try {
            if (!vivo) throw Error('Visualizador encerrado.');
            const blob = await (carregarModeloExterno
              ? carregarModeloExterno(id)
              : carregarMiniatura3D(id));
            if (!blob)
              throw Error(
                'Arquivo GLB ausente na biblioteca. Importe o backup que contém o modelo.',
              );
            const glb = await lerModeloGLB(blob);
            if (!vivo) {
              descartarModeloCompartilhado(glb);
              throw Error('Visualizador encerrado.');
            }
            resolve(glb);
          } catch (e) {
            modelos.delete(id);
            reject(e);
          } finally {
            leituras--;
            iniciarFila();
          }
        })();
      });
      iniciarFila();
    });
    modelos.set(id, promise);
    return promise;
  };
  /** Instâncias compartilham geometria e textura, mas cada uma tem materiais próprios. */
  function removerInstancia(id: string) {
    liberarAnimacao(id);
    const objeto = instancias.get(id);
    if (!objeto) return;
    objeto.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materiais = Array.isArray(child.material) ? child.material : [child.material];
        materiais.forEach((m) => m.dispose());
        if (child === estilos.get(id)) child.geometry.dispose();
      }
    });
    grupo.remove(objeto);
    instancias.delete(id);
    modeloPorInstancia.delete(id);
    estilos.delete(id);
  }
  function posicionar(instancia: InstanciaMiniatura3D, group: THREE.Group) {
    const token = instancia.personagemId ? tokensAtuais[instancia.personagemId] : undefined;
    const posVisual = instancia.personagemId
      ? posicoesVisuaisVinculadas.get(instancia.personagemId)
      : undefined;
    const pos =
      posVisual ??
      (token && cenarioAtual
        ? percentualParaChao3D(token, cenarioAtual)
        : { x: instancia.x, z: instancia.z });
    group.position.set(pos.x, instancia.altura, pos.z);
    group.rotation.y = instancia.rotacao;
    group.scale.setScalar(instancia.escala);
    group.visible =
      mostrarCamada &&
      (!instancia.personagemId || !!token) &&
      (miniaturasVisiveisNaPrevia !== null
        ? miniaturasVisiveisNaPrevia.has(instancia.id)
        : visiveisNaPrevia === null ||
          (!!instancia.personagemId && visiveisNaPrevia.has(instancia.personagemId)));
    const opacidade = instancia.oculto === true || token?.oculto === true ? 0.38 : 1;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== estilos.get(instancia.id)) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          const antes = m.transparent;
          m.transparent = opacidade < 1 || m.transparent;
          m.opacity =
            (typeof m.userData.opacidadeOriginal === 'number' ? m.userData.opacidadeOriginal : 1) *
            opacidade;
          if (m.transparent !== antes) m.needsUpdate = true;
        }
      }
    });
    const aro = estilos.get(instancia.id);
    if (aro) aro.visible = !mostrandoPrevia() && selecionada === instancia.id;
    configurarAnimacao(instancia, group);
  }
  function sincronizar(
    lista: readonly InstanciaMiniatura3D[],
    cenario: Cenario3D,
    tokens: Record<string, TokenMesa>,
    mostrar = true,
    onLoad: () => void = () => {},
  ) {
    atual = lista;
    cenarioAtual = cenario;
    tokensAtuais = tokens;
    mostrarCamada = mostrar;
    aoCarregar = onLoad;
    const ids = new Set(lista.map((m) => m.id));
    const vinculados = new Set(
      lista.map((m) => m.personagemId).filter((id): id is string => Boolean(id)),
    );
    for (const id of posicoesVisuaisVinculadas.keys())
      if (!vinculados.has(id)) posicoesVisuaisVinculadas.delete(id);
    for (const id of instancias.keys())
      if (!ids.has(id) || modeloPorInstancia.get(id) !== lista.find((m) => m.id === id)?.modeloId)
        removerInstancia(id);
    for (const inst of lista) {
      const existente = instancias.get(inst.id);
      if (existente) {
        posicionar(inst, existente);
        continue;
      }
      if (!mostrarCamada) continue; // Miniaturas ocultas não fazem parse de GLB em segundo plano.
      if (pendentes.get(inst.id) === inst.modeloId) continue;
      pendentes.set(inst.id, inst.modeloId);
      void carregar(inst.modeloId)
        .then((modelo) => {
          if (pendentes.get(inst.id) !== inst.modeloId) return;
          pendentes.delete(inst.id);
          const maisRecente = atual.find((m) => m.id === inst.id);
          if (!vivo || !maisRecente || maisRecente.modeloId !== inst.modeloId) return;
          const novo = normalizarModeloNoChao(cloneSkeleton(modelo));
          novo.animations = modelo.animations;
          novo.userData.miniaturaId = inst.id;
          const aro = new THREE.Mesh(
            new THREE.RingGeometry(0.52, 0.62, 36),
            new THREE.MeshBasicMaterial({
              color: '#f5c482',
              depthTest: false,
              side: THREE.DoubleSide,
            }),
          );
          aro.rotation.x = -Math.PI / 2;
          aro.position.y = 0.035;
          aro.renderOrder = 10;
          novo.add(aro);
          estilos.set(inst.id, aro);
          instancias.set(inst.id, novo);
          modeloPorInstancia.set(inst.id, inst.modeloId);
          grupo.add(novo);
          posicionar(maisRecente, novo);
          aoCarregar();
        })
        .catch((e) => {
          if (pendentes.get(inst.id) === inst.modeloId) pendentes.delete(inst.id);
          if (vivo)
            erros.set(
              inst.modeloId,
              e instanceof Error ? e.message : 'Não foi possível abrir GLB.',
            );
        });
    }
  }
  function configurarFiltroPersonagensVisiveis(ids: ReadonlySet<string> | null) {
    visiveisNaPrevia = ids;
    for (const inst of atual) {
      const modelo = instancias.get(inst.id);
      if (modelo) posicionar(inst, modelo);
    }
  }
  function configurarFiltroMiniaturasVisiveis(ids: ReadonlySet<string> | null) {
    miniaturasVisiveisNaPrevia = ids;
    for (const inst of atual) {
      const modelo = instancias.get(inst.id);
      if (modelo) posicionar(inst, modelo);
    }
  }
  // O sprite só pode ser suprimido pelo GLB efetivamente renderizado.
  // Uma carga lenta ou um GLB filtrado não pode deixar o próprio observador
  // invisível (o sprite é o fallback até a miniatura aparecer).
  function vinculoAtivo(personagemId: string): boolean {
    return (
      mostrarCamada &&
      atual.some((m) => m.personagemId === personagemId && instancias.get(m.id)?.visible === true)
    );
  }
  const mostrandoPrevia = () => miniaturasVisiveisNaPrevia !== null || visiveisNaPrevia !== null;
  function selecionarPersonagem(id: string | null) {
    selecionada = atual.find((m) => m.personagemId === id)?.id ?? null;
    for (const inst of atual) {
      const aro = estilos.get(inst.id);
      if (aro) aro.visible = !mostrandoPrevia() && inst.id === selecionada;
    }
  }
  function tokenDaMiniatura(id: string): string | null {
    return atual.find((m) => m.id === id)?.personagemId ?? null;
  }
  function moverVinculada(tokenId: string, x: number, z: number) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    posicoesVisuaisVinculadas.set(tokenId, { x, z });
    for (const m of atual)
      if (m.personagemId === tokenId) {
        const grupo = instancias.get(m.id);
        if (grupo) grupo.position.set(x, m.altura, z);
      }
  }
  function selecionar(id: string | null) {
    selecionada = id;
    for (const inst of atual) {
      const aro = estilos.get(inst.id);
      if (aro) aro.visible = !mostrandoPrevia() && inst.id === id;
    }
  }
  function atingida(raycaster: THREE.Raycaster): string | null {
    const hits = raycaster.intersectObjects(
      Array.from(instancias.values()).filter((m) => m.visible),
      true,
    );
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (typeof obj.userData.miniaturaId === 'string') return obj.userData.miniaturaId;
        obj = obj.parent;
      }
    }
    return null;
  }
  function moverVisual(id: string, x: number, z: number) {
    const obj = instancias.get(id);
    if (obj) obj.position.set(x, obj.position.y, z);
  }
  function dispose() {
    vivo = false;
    for (const id of [...instancias.keys()]) removerInstancia(id);
    // Os modelos-base compartilham buffers com as instâncias. Só liberamos as
    // geometrias e texturas ao encerrar a cena, nunca ao remover um clone.
    for (const promise of modelos.values())
      void promise.then(descartarModeloCompartilhado).catch(() => {});
    fila.length = 0;
    grupo.removeFromParent();
    grupo.clear();
    pendentes.clear();
    modeloPorInstancia.clear();
    animadores.clear();
    posicoesVisuaisVinculadas.clear();
    modelos.clear();
    erros.clear();
  }
  return {
    sincronizar,
    configurarFiltroPersonagensVisiveis,
    configurarFiltroMiniaturasVisiveis,
    selecionar,
    selecionarPersonagem,
    atingida,
    moverVisual,
    moverVinculada,
    vinculoAtivo,
    tokenDaMiniatura,
    erros,
    atualizarAnimacoes,
    dispose,
  };
}
