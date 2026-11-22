import * as THREE from 'three';
import { INTERACOES, type PontoXZ } from './worldLogic';

export type Mundo25D = {
  scene: THREE.Scene;
  sprite: THREE.Sprite;
  sombra: THREE.Mesh;
  grupoJogador: THREE.Group;
  animar: (tempo: number, movimento: boolean) => void;
  alterarCorPersonagem: (cor: string) => void;
  liberar: () => void;
};

function corSegura(cor: string): string {
  return /^#[\da-f]{6}$/i.test(cor) ? cor : '#5c8fa0';
}

function texturaPiso(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;
  let seed = 173;
  const aleatorio = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.fillStyle = '#303d3b';
  ctx.fillRect(0, 0, 1024, 1024);
  const tiles = 16,
    t = 1024 / tiles;
  for (let z = 0; z < tiles; z++)
    for (let x = 0; x < tiles; x++) {
      const n = Math.floor(aleatorio() * 12);
      ctx.fillStyle = `rgb(${46 + n},${54 + n},${53 + n})`;
      ctx.fillRect(x * t + 2, z * t + 2, t - 3, t - 3);
      ctx.strokeStyle = 'rgba(14,25,25,.60)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * t + 1, z * t + 1, t - 2, t - 2);
      ctx.strokeStyle = 'rgba(205,180,124,.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x * t + 7, z * t + 8);
      ctx.lineTo(x * t + 26, z * t + 6);
      ctx.stroke();
      if (aleatorio() > 0.7) {
        ctx.strokeStyle = 'rgba(17,27,28,.26)';
        ctx.beginPath();
        ctx.moveTo(x * t + 8, z * t + 20);
        ctx.lineTo(x * t + 26, z * t + 22);
        ctx.lineTo(x * t + 38, z * t + 33);
        ctx.stroke();
      }
    }
  for (let i = 0; i < 1700; i++) {
    ctx.fillStyle = aleatorio() > 0.5 ? 'rgba(240,211,145,.04)' : 'rgba(9,20,24,.08)';
    ctx.fillRect(aleatorio() * 1024, aleatorio() * 1024, aleatorio() * 4 + 1, aleatorio() * 4 + 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function texturaParede(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#293638';
  ctx.fillRect(0, 0, 512, 256);
  for (let row = 0; row < 8; row++)
    for (let col = -1; col < 9; col++) {
      const offset = row % 2 === 0 ? 0 : 32;
      const x = col * 64 + offset,
        y = row * 32;
      ctx.fillStyle =
        (row + col) % 3 === 0 ? '#314144' : (row + col) % 3 === 1 ? '#364345' : '#2c3a3d';
      ctx.fillRect(x + 2, y + 2, 61, 29);
      ctx.strokeStyle = 'rgba(13,22,26,.6)';
      ctx.strokeRect(x + 2, y + 2, 61, 29);
      ctx.fillStyle = 'rgba(218,198,150,.045)';
      ctx.fillRect(x + 5, y + 4, 48, 2);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function caixa(
  pai: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pai.add(mesh);
  return mesh;
}
function cilindro(
  pai: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r1: number,
  r2: number,
  h: number,
  material: THREE.Material,
  lados = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, lados), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pai.add(mesh);
  return mesh;
}
function esfera(
  pai: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  pai.add(mesh);
  return mesh;
}

/** Sprite 2D com pixels nítidos dentro do mundo tridimensional. */
function criarTexturaPersonagem(roupa: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 64;
  const p = c.getContext('2d')!;
  p.imageSmoothingEnabled = false;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    p.fillStyle = color;
    p.fillRect(x, y, w, h);
  };
  // sombra/contorno e cabelos volumosos
  r(17, 9, 18, 3, '#141c25');
  r(14, 12, 24, 16, '#18212b');
  r(13, 17, 3, 13, '#18212b');
  r(37, 17, 3, 12, '#18212b');
  r(17, 11, 18, 14, '#4c302c');
  r(15, 16, 22, 10, '#5e3a2d');
  r(18, 11, 13, 4, '#704532');
  // rosto e expressão
  r(18, 21, 18, 13, '#c68f6a');
  r(21, 26, 3, 2, '#20212a');
  r(30, 26, 3, 2, '#20212a');
  r(23, 31, 7, 1, '#a8685d');
  r(17, 28, 2, 3, '#a9735b');
  r(36, 28, 2, 3, '#a9735b');
  // capa aberta e túnica
  r(13, 34, 27, 22, '#18232e');
  r(10, 40, 7, 18, '#222c36');
  r(36, 40, 7, 18, '#222c36');
  r(18, 36, 17, 21, roupa);
  r(22, 36, 7, 4, '#d9b48b');
  r(22, 41, 8, 4, '#b2a68a');
  r(20, 46, 15, 2, 'rgba(231,205,158,.43)');
  r(18, 53, 17, 3, '#263037');
  // braços e mãos
  r(11, 43, 7, 11, '#283441');
  r(36, 43, 7, 11, '#283441');
  r(11, 53, 5, 3, '#c68f6a');
  r(38, 53, 5, 3, '#c68f6a');
  // botas
  r(18, 56, 7, 5, '#171e27');
  r(30, 56, 7, 5, '#171e27');
  // detalhe de magia
  r(25, 46, 3, 3, '#e1c98b');
  r(25, 47, 3, 1, '#fff2c3');
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function colocarMarco(scene: THREE.Scene, ponto: PontoXZ, brilho: string) {
  const aro = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.89, 40),
    new THREE.MeshBasicMaterial({
      color: brilho,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.set(ponto.x, 0.042, ponto.z);
  scene.add(aro);
  const disco = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 40),
    new THREE.MeshBasicMaterial({
      color: brilho,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    }),
  );
  disco.rotation.x = -Math.PI / 2;
  disco.position.set(ponto.x, 0.045, ponto.z);
  scene.add(disco);
  return { aro, disco };
}

export function criarMundo25D(): Mundo25D {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1720');
  scene.fog = new THREE.FogExp2('#101e27', 0.022);
  const pedras = new THREE.MeshStandardMaterial({ color: '#455054', roughness: 0.96 });
  const pedraClara = new THREE.MeshStandardMaterial({ color: '#66716b', roughness: 0.92 });
  const pedraEscura = new THREE.MeshStandardMaterial({ color: '#28353b', roughness: 0.99 });
  const metal = new THREE.MeshStandardMaterial({
    color: '#ac9063',
    metalness: 0.55,
    roughness: 0.48,
  });
  const madeira = new THREE.MeshStandardMaterial({ color: '#453b32', roughness: 0.94 });
  const emissivo = new THREE.MeshStandardMaterial({
    color: '#96cfd4',
    emissive: '#3b9fae',
    emissiveIntensity: 1.75,
    roughness: 0.25,
    metalness: 0.25,
  });
  const amarelo = new THREE.MeshStandardMaterial({
    color: '#e9b578',
    emissive: '#ad5c22',
    emissiveIntensity: 1.65,
  });
  const floorTex = texturaPiso();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 20),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.035;
  floor.receiveShadow = true;
  scene.add(floor);
  const wallTex = texturaParede();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.98 });
  caixa(scene, 0, 2.1, -10.35, 28.7, 4.2, 0.85, wallMat);
  caixa(scene, -14.25, 2.1, 0, 0.85, 4.2, 21.1, wallMat);
  // Rodapés e frisos para reforçar a profundidade.
  caixa(scene, 0, 0.34, -9.96, 28.8, 0.55, 0.4, pedraEscura);
  caixa(scene, -13.86, 0.34, 0, 0.4, 0.55, 20.7, pedraEscura);
  caixa(scene, 0, 4.24, -10.3, 28.8, 0.3, 1.0, metal);
  caixa(scene, -14.25, 4.24, 0, 1, 0.3, 21.0, metal);
  // Tapete de navegação sobre pedras, diante do altar.
  const tapete = new THREE.Mesh(
    new THREE.PlaneGeometry(4.1, 10.2),
    new THREE.MeshStandardMaterial({ color: '#373d49', roughness: 1 }),
  );
  tapete.rotation.x = -Math.PI / 2;
  tapete.position.set(0, 0.015, 1.1);
  tapete.receiveShadow = true;
  scene.add(tapete);
  const faixa = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 9.7),
    new THREE.MeshBasicMaterial({
      color: '#9e8960',
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    }),
  );
  faixa.rotation.x = -Math.PI / 2;
  faixa.position.set(0, 0.021, 1.1);
  scene.add(faixa);
  const faixaInterior = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 9.45),
    new THREE.MeshStandardMaterial({ color: '#373d49', roughness: 1 }),
  );
  faixaInterior.rotation.x = -Math.PI / 2;
  faixaInterior.position.set(0, 0.024, 1.1);
  scene.add(faixaInterior);
  // Altares laterais / estantes sólidas que também funcionam como obstáculos.
  for (const x of [-8.1, 8.3]) {
    caixa(scene, x, 0.65, -5, 3.2, 1.3, 1.45, pedraEscura);
    caixa(scene, x, 1.28, -5, 3.45, 0.18, 1.62, pedraClara);
    for (const off of [-0.9, 0.9]) cilindro(scene, x + off, 1.55, -5, 0.28, 0.31, 0.42, metal);
    esfera(scene, x, 1.62, -5, 0.39, amarelo);
    const light = new THREE.PointLight('#f3b46e', 13, 9, 1.4);
    light.position.set(x, 2.5, -5);
    scene.add(light);
  }
  // Altar central: degraus, coluna e núcleo suspenso.
  caixa(scene, 0, 0.21, -5.4, 4.6, 0.43, 2.2, pedraEscura);
  caixa(scene, 0, 0.52, -5.4, 3.8, 0.28, 1.75, pedras);
  caixa(scene, 0, 1.17, -5.4, 2.25, 1.1, 1.35, pedraClara);
  caixa(scene, 0, 1.8, -5.4, 2.45, 0.2, 1.65, metal);
  const cristal = new THREE.Group();
  cristal.position.set(0, 2.55, -5.4);
  scene.add(cristal);
  const núcleo = new THREE.Mesh(new THREE.OctahedronGeometry(0.66), emissivo);
  núcleo.rotation.z = 0.22;
  cristal.add(núcleo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.035, 9, 48), metal);
  ring.rotation.x = 0.7;
  cristal.add(ring);
  const altarLuz = new THREE.PointLight('#76c9d6', 25, 10, 1.45);
  altarLuz.position.set(0, 2.8, -5.4);
  scene.add(altarLuz);
  for (const x of [-11.8, 11.8]) {
    for (const z of [-7.4, -0.2, 7.1]) {
      cilindro(scene, x, 1.38, z, 0.67, 0.73, 2.75, pedras);
      cilindro(scene, x, 2.8, z, 0.84, 0.78, 0.36, pedraClara);
      cilindro(scene, x, 0.18, z, 0.85, 0.84, 0.36, pedraEscura);
    }
  }
  // Canto de arquivo e canto de suprimentos.
  caixa(scene, -8.6, 0.55, 4.4, 2.3, 1.1, 2.4, madeira);
  for (const x of [-9.35, -8.7, -8.05]) caixa(scene, x, 1.26, 4.25, 0.22, 0.42, 0.75, metal);
  caixa(scene, 8.1, 0.47, 3.3, 2.5, 0.94, 2, madeira);
  caixa(scene, 8.1, 0.99, 3.3, 2.48, 0.16, 2.05, metal);
  caixa(scene, 8.1, 1.08, 3.3, 0.35, 0.16, 2.09, pedraEscura);
  // Luminosidade teatral; sombras suaves.
  const ambiente = new THREE.HemisphereLight('#c4dce1', '#1b252b', 2.3);
  scene.add(ambiente);
  const lua = new THREE.DirectionalLight('#e0e7dc', 3.6);
  lua.position.set(6, 18, 13);
  lua.castShadow = true;
  lua.shadow.mapSize.set(2048, 2048);
  lua.shadow.camera.left = -21;
  lua.shadow.camera.right = 21;
  lua.shadow.camera.top = 21;
  lua.shadow.camera.bottom = -21;
  lua.shadow.normalBias = 0.028;
  lua.shadow.bias = -0.0001;
  scene.add(lua);
  // Partículas discretas reforçam a sensação de profundidade.
  const pontos = new Float32Array(48 * 3);
  for (let i = 0; i < 48; i++) {
    const n = i * 3;
    pontos[n] = Math.sin(i * 37.2) * 12;
    pontos[n + 1] = 0.45 + ((i * 17) % 21) / 7;
    pontos[n + 2] = Math.cos(i * 19.7) * 8;
  }
  const geoPart = new THREE.BufferGeometry();
  geoPart.setAttribute('position', new THREE.BufferAttribute(pontos, 3));
  const poeira = new THREE.Points(
    geoPart,
    new THREE.PointsMaterial({
      size: 0.055,
      color: '#c3d8c7',
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  );
  scene.add(poeira);
  // Áreas interativas: brilho no chão, sem afetar o inventário/sistema de regras.
  const marcos = INTERACOES.map((item, i) =>
    colocarMarco(scene, item, i === 0 ? '#91ccda' : i === 1 ? '#cca777' : '#b5cbaa'),
  );
  const grupoJogador = new THREE.Group();
  scene.add(grupoJogador);
  const textura = criarTexturaPersonagem('#588b94');
  const spriteMaterial = new THREE.SpriteMaterial({
    map: textura,
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2.25, 3.15, 1);
  sprite.position.y = 1.62;
  grupoJogador.add(sprite);
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 30),
    new THREE.MeshBasicMaterial({
      color: '#020608',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.04;
  grupoJogador.add(sombra);
  function alterarCorPersonagem(cor: string) {
    const antigo = spriteMaterial.map;
    spriteMaterial.map = criarTexturaPersonagem(corSegura(cor));
    spriteMaterial.needsUpdate = true;
    antigo?.dispose();
  }
  function animar(tempo: number, movimento: boolean) {
    cristal.rotation.y = tempo * 0.35;
    cristal.position.y = 2.55 + Math.sin(tempo * 1.7) * 0.1;
    altarLuz.intensity = 24 + Math.sin(tempo * 2.3) * 2;
    sprite.position.y =
      1.62 + (movimento ? Math.abs(Math.sin(tempo * 10)) * 0.11 : Math.sin(tempo * 2.2) * 0.027);
    sprite.material.rotation = movimento ? Math.sin(tempo * 9) * 0.027 : 0;
    for (let i = 0; i < marcos.length; i++) {
      marcos[i].aro.rotation.z = tempo * 0.35 * (i % 2 === 0 ? 1 : -1);
      (marcos[i].aro.material as THREE.MeshBasicMaterial).opacity =
        0.36 + Math.sin(tempo * 2 + i) * 0.15;
    }
    poeira.position.y = Math.sin(tempo * 0.5) * 0.08;
  }
  function liberar() {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          if (!material) continue;
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        }
      }
    });
    floorTex.dispose();
    wallTex.dispose();
    geoPart.dispose();
  }
  return { scene, sprite, sombra, grupoJogador, animar, alterarCorPersonagem, liberar };
}
