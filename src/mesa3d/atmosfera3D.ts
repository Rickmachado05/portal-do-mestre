/** Atmosfera visual isolada: não muda colisões, câmera nem dimensões do terreno.
 * Céu e horizonte são gerados localmente com materiais nativos do Three.js,
 * sem shaders customizados, texturas externas ou downloads durante a sessão.
 */
import * as THREE from 'three';
import { AMBIENTES_3D, type PeriodoDia3D } from './ambientes3D';

export function criarAtmosfera3D(cena: THREE.Scene) {
  // Material padrão (vertexColors) para evitar dependência de compilação de shaders próprios.
  const geometria = new THREE.SphereGeometry(390, 40, 20);
  const posicoes = geometria.getAttribute('position');
  const cores = new Float32Array(posicoes.count * 3);
  geometria.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  const material = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    vertexColors: true,
    fog: false,
    depthWrite: false,
    toneMapped: false,
  });
  const domo = new THREE.Mesh(geometria, material);
  domo.name = 'atmosfera-ceu-3d';
  domo.frustumCulled = false;
  cena.add(domo);

  // Chão panorâmico é SOMENTE decorativo, abaixo do piso editável.
  // O raycaster e as colisões continuam usando o terreno original.
  const solo = new THREE.Mesh(
    new THREE.PlaneGeometry(650, 650),
    new THREE.MeshBasicMaterial({ color: '#526f5e', side: THREE.DoubleSide }),
  );
  solo.name = 'horizonte-visual-sem-colisao';
  solo.rotation.x = -Math.PI / 2;
  solo.position.y = -0.55;
  solo.receiveShadow = false;
  cena.add(solo);

  // Pontos simples e determinísticos: visíveis somente à noite, sem partículas ou animação.
  let semente = 7531;
  const aleatorio = () => {
    semente = (Math.imul(1664525, semente) + 1013904223) >>> 0;
    return semente / 4294967296;
  };
  const pontos: number[] = [];
  for (let i = 0; i < 160; i++) {
    const elevacao = 0.18 + aleatorio() * 0.78;
    const azimute = aleatorio() * Math.PI * 2;
    const raio = 374;
    const horizontal = Math.sqrt(1 - elevacao * elevacao);
    pontos.push(
      Math.cos(azimute) * horizontal * raio,
      elevacao * raio,
      Math.sin(azimute) * horizontal * raio,
    );
  }
  const estrelasGeo = new THREE.BufferGeometry();
  estrelasGeo.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
  const estrelas = new THREE.Points(
    estrelasGeo,
    new THREE.PointsMaterial({
      color: '#dae5ff',
      size: 1.8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      fog: false,
    }),
  );
  estrelas.name = 'estrelas-noturnas-3d';
  estrelas.visible = false;
  cena.add(estrelas);

  cena.fog = new THREE.FogExp2('#a8cbd0', 0.0025);
  cena.background = new THREE.Color('#bedce5');

  const atualizar = (periodo: PeriodoDia3D) => {
    const config = AMBIENTES_3D[periodo];
    const alto = new THREE.Color(config.topo),
      horizonte = new THREE.Color(config.horizonte),
      baixo = new THREE.Color(config.abaixo);
    const atual = new THREE.Color();
    for (let i = 0; i < posicoes.count; i++) {
      const elevacao = posicoes.getY(i) / 390;
      if (elevacao >= 0) {
        atual.copy(horizonte).lerp(alto, Math.min(1, Math.pow(elevacao, 0.75)));
      } else {
        atual.copy(horizonte).lerp(baixo, Math.min(1, -elevacao));
      }
      cores[i * 3] = atual.r;
      cores[i * 3 + 1] = atual.g;
      cores[i * 3 + 2] = atual.b;
    }
    geometria.attributes.color.needsUpdate = true;
    (solo.material as THREE.MeshBasicMaterial).color.set(config.chao);
    if (cena.fog instanceof THREE.FogExp2) cena.fog.color.set(config.nevoa);
    if (cena.background instanceof THREE.Color) cena.background.set(config.horizonte);
    estrelas.visible = periodo === 'noite';
    return config;
  };
  atualizar('dia');
  return {
    atualizar,
    dispose: () => {
      estrelasGeo.dispose();
      (estrelas.material as THREE.PointsMaterial).dispose();
    },
  };
}
