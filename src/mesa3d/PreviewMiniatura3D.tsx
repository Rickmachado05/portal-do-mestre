import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { carregarMiniatura3D } from '../lib/bibliotecaMiniaturas3D';
import { lerModeloGLB, normalizarModeloNoChao } from './renderMiniaturas3D';
import { escolherIndiceIdle } from './animacoesMiniaturas3D';
/** Preview isolado, carregado apenas com a biblioteca aberta. */
export default function PreviewMiniatura3D({ modeloId }: { modeloId: string }) {
  const ref = useRef<HTMLDivElement>(null),
    [erro, setErro] = useState('');
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setErro('Prévia WebGL indisponível.');
      return;
    }
    let ativo = true,
      frame = 0,
      rotacao = 0,
      arrastando = false,
      ultimoX = 0,
      modelo: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null,
      ultimoQuadro = 0,
      animarIdle = false;
    // Prévia estática: redesenha somente quando o modelo ou a câmera mudam.
    // Evita um segundo loop WebGL de 60 FPS concorrendo com a Mesa 3D.
    const cena = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(3.2, 2.35, 4.2);
    camera.lookAt(0, 0.9, 0);
    cena.add(new THREE.HemisphereLight(0xdbeaff, 0x846849, 2.1));
    const sol = new THREE.DirectionalLight(0xffe8c9, 2.6);
    sol.position.set(-4, 7, 5);
    cena.add(sol);
    const piso = new THREE.Mesh(
      new THREE.CircleGeometry(0.88, 40),
      new THREE.MeshStandardMaterial({ color: '#4c4148', roughness: 0.87 }),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = -0.025;
    cena.add(piso);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.style.cssText =
      'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    root.appendChild(renderer.domElement);
    const desenhar = (tempo: number) => {
      frame = 0;
      if (!ativo || document.hidden) return;
      // Não disputar 60 FPS com a Mesa 3D enquanto a biblioteca está aberta.
      if (animarIdle && ultimoQuadro && tempo - ultimoQuadro < 1000 / 30) {
        frame = requestAnimationFrame(desenhar);
        return;
      }
      if (modelo) modelo.rotation.y = rotacao;
      if (mixer && animarIdle) {
        const dt = ultimoQuadro ? Math.min(0.08, (tempo - ultimoQuadro) / 1000) : 0;
        if (dt >= 0) mixer.update(dt);
      }
      ultimoQuadro = tempo;
      renderer.render(cena, camera);
      if (animarIdle) frame = requestAnimationFrame(desenhar);
    };
    const solicitarDesenho = () => {
      if (ativo && !document.hidden && !frame) frame = requestAnimationFrame(desenhar);
    };
    const visibilidade = () => {
      ultimoQuadro = 0;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else solicitarDesenho();
    };
    document.addEventListener('visibilitychange', visibilidade);
    const ajustar = () => {
      const w = Math.max(100, root.clientWidth),
        h = Math.max(100, root.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      solicitarDesenho();
    };
    const observer = new ResizeObserver(ajustar);
    observer.observe(root);
    ajustar();
    const down = (e: PointerEvent) => {
      arrastando = true;
      ultimoX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!arrastando) return;
      rotacao += (e.clientX - ultimoX) * 0.012;
      ultimoX = e.clientX;
      solicitarDesenho();
    };
    const up = () => {
      arrastando = false;
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    void carregarMiniatura3D(modeloId)
      .then((blob) => {
        if (!blob) throw Error('Arquivo GLB não encontrado.');
        return lerModeloGLB(blob);
      })
      .then((arquivo) => {
        if (!ativo) return;
        modelo = normalizarModeloNoChao(arquivo);
        cena.add(modelo);
        const indice = escolherIndiceIdle(
          arquivo.animations.map((a) => a.name),
          'automatico',
        );
        if (indice >= 0) {
          mixer = new THREE.AnimationMixer(modelo);
          mixer.clipAction(arquivo.animations[indice]).setLoop(THREE.LoopRepeat, Infinity).play();
          animarIdle = true;
        }
        solicitarDesenho();
        setErro('');
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao abrir modelo.');
      });
    solicitarDesenho();
    return () => {
      ativo = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibilidade);
      if (mixer && modelo) {
        mixer.stopAllAction();
        mixer.uncacheRoot(modelo);
      }
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
            const mapa = (mat as THREE.MeshStandardMaterial).map;
            mapa?.dispose();
            mat.dispose();
          }
        }
      });
      renderer.dispose();
      canvas.remove();
    };
  }, [modeloId]);
  return (
    <div className="m3d-mini-preview" ref={ref} aria-label="Prévia 3D giratória">
      {erro && <div className="m3d-mini-preview-error">{erro}</div>}
    </div>
  );
}
