/**
 * v1.3.40.13 — Clima visual da Mesa 3D, usando a mesma ConfigClima da Mesa 2D.
 * Não altera colisões, linha de visão, estados do Fog of War, iluminação ou regras de RPG.
 * Todos os recursos WebGL são criados uma vez e descartados no fechamento da cena.
 */
import * as THREE from 'three';
import { climaAtivo, normalizarClima, type ConfigClima, type TipoClima } from '../lib/weather';
import {
  LIMITE_PARTICULAS_CLIMA_3D,
  DENSIDADE_NEBLINA_PADRAO_3D,
  quantidadeParticulasClima3D,
  vetorVentoClima3D,
} from '../lib/weather3d';
export {
  LIMITE_PARTICULAS_CLIMA_3D,
  DENSIDADE_NEBLINA_PADRAO_3D,
  DISTANCIA_MAXIMA_CLIMA_3D,
  quantidadeParticulasClima3D,
  vetorVentoClima3D,
} from '../lib/weather3d';

export type ControleClima3D = {
  configurar: (config: ConfigClima, pausado?: boolean) => void;
  atualizar: (
    delta: number,
    foco: { x: number; z: number },
    distanciaCamera: number,
    terreno: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => void;
  dispose: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rng = (() => {
  let s = 92703;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
})();

function criarTexturaPonto(tipo: 'neve' | 'cinzas' | 'areia' | 'folhas'): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = el.height = 64;
  const ctx = el.getContext('2d')!;
  if (tipo === 'cinzas') {
    // Fragmentos irregulares e discretos: cinzas NÃO devem parecer flocos de neve.
    ctx.translate(32, 32);
    ctx.rotate(-0.27);
    ctx.fillStyle = 'rgba(200,186,170,.95)';
    ctx.beginPath();
    ctx.moveTo(-17, -4);
    ctx.lineTo(-6, -10);
    ctx.lineTo(10, -5);
    ctx.lineTo(16, 4);
    ctx.lineTo(-1, 9);
    ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(119,105,96,.8)';
    ctx.fillRect(-10, 1, 13, 3);
  } else if (tipo === 'folhas') {
    ctx.translate(32, 32);
    ctx.rotate(-Math.PI / 5);
    ctx.fillStyle = '#e6bb61';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.quadraticCurveTo(0, -19, 20, 0);
    ctx.quadraticCurveTo(0, 17, -20, 0);
    ctx.fill();
    ctx.strokeStyle = '#986f3b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(21, 0);
    ctx.stroke();
  } else {
    const cor = tipo === 'neve' ? '242,249,255' : tipo === 'cinzas' ? '188,179,168' : '221,190,136';
    const degradê = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
    degradê.addColorStop(0, `rgba(${cor},1)`);
    degradê.addColorStop(0.52, `rgba(${cor},.9)`);
    degradê.addColorStop(1, `rgba(${cor},0)`);
    ctx.fillStyle = degradê;
    ctx.fillRect(0, 0, 64, 64);
  }
  const textura = new THREE.CanvasTexture(el);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.minFilter = THREE.LinearFilter;
  return textura;
}

function criarTexturaBruma(): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = el.height = 256;
  const ctx = el.getContext('2d')!;
  for (let i = 0; i < 28; i++) {
    const x = rng() * 256,
      y = rng() * 256,
      tamanho = 40 + rng() * 82;
    const g = ctx.createRadialGradient(x, y, 2, x, y, tamanho);
    g.addColorStop(0, 'rgba(217,232,237,.29)');
    g.addColorStop(0.46, 'rgba(215,228,232,.14)');
    g.addColorStop(1, 'rgba(215,228,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - tamanho, y - tamanho, tamanho * 2, tamanho * 2);
  }
  const textura = new THREE.CanvasTexture(el);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.minFilter = THREE.LinearFilter;
  return textura;
}

export function criarClimaCena3D(cena: THREE.Scene): ControleClima3D {
  const grupo = new THREE.Group();
  grupo.name = 'clima-cena-3d';
  grupo.visible = false;
  // As geometrias individuais desativam o raycast para não interferir na edição.
  cena.add(grupo);
  const gotas = new THREE.Float32BufferAttribute(
    new Float32Array(LIMITE_PARTICULAS_CLIMA_3D * 6),
    3,
  );
  gotas.setUsage(THREE.DynamicDrawUsage);
  const geometriaChuva = new THREE.BufferGeometry();
  geometriaChuva.setAttribute('position', gotas);
  geometriaChuva.setDrawRange(0, 0);
  const materialChuva = new THREE.LineBasicMaterial({
    color: '#beddf5',
    transparent: true,
    opacity: 0.73,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const chuva = new THREE.LineSegments(geometriaChuva, materialChuva);
  chuva.name = 'chuva-3d';
  chuva.frustumCulled = false;
  chuva.visible = false;
  chuva.renderOrder = 8;
  chuva.raycast = () => {};
  grupo.add(chuva);

  const pontos = new THREE.Float32BufferAttribute(
    new Float32Array(LIMITE_PARTICULAS_CLIMA_3D * 3),
    3,
  );
  pontos.setUsage(THREE.DynamicDrawUsage);
  const geometriaPontos = new THREE.BufferGeometry();
  geometriaPontos.setAttribute('position', pontos);
  geometriaPontos.setDrawRange(0, 0);
  const texturas = {
    neve: criarTexturaPonto('neve'),
    cinzas: criarTexturaPonto('cinzas'),
    areia: criarTexturaPonto('areia'),
    folhas: criarTexturaPonto('folhas'),
  };
  const materialPontos = new THREE.PointsMaterial({
    map: texturas.neve,
    color: '#ffffff',
    size: 0.26,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    alphaTest: 0.025,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const particulas = new THREE.Points(geometriaPontos, materialPontos);
  particulas.name = 'particulas-clima-3d';
  particulas.visible = false;
  particulas.frustumCulled = false;
  particulas.renderOrder = 8;
  particulas.raycast = () => {};
  grupo.add(particulas);

  const texturaNeblina = criarTexturaBruma();
  const brumas = [0, 1].map((i) => {
    const material = new THREE.MeshBasicMaterial({
      map: texturaNeblina,
      color: '#eef3f4',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      fog: false,
      side: THREE.DoubleSide,
    });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    plano.rotation.x = -Math.PI / 2;
    plano.name = `bruma-ambiental-${i}`;
    plano.renderOrder = 7;
    plano.position.y = 0.35 + i * 0.66;
    plano.visible = false;
    plano.raycast = () => {};
    grupo.add(plano);
    return plano;
  });
  // Cada partícula usa coordenadas normalizadas relativas ao terreno.
  // O volume permanece fixo na cena mesmo ao mover ou orbitar a câmera.
  const ps = Array.from({ length: LIMITE_PARTICULAS_CLIMA_3D }, () => ({
    x: rng() * 2 - 1,
    y: rng(),
    z: rng() * 2 - 1,
    vel: 0.58 + rng() * 0.98,
    fase: rng() * 6.28,
  }));
  let config = normalizarClima(null),
    pausado = false,
    descartado = false;
  let tipoAnterior: TipoClima = 'nenhum';
  const densidadeAnterior = cena.fog instanceof THREE.FogExp2 ? cena.fog.density : null;
  const preferencia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const atualizarVisibilidade = () => {
    const ativo = climaAtivo(config, pausado);
    grupo.visible = ativo;
    chuva.visible = ativo && config.tipo === 'chuva';
    particulas.visible = ativo && ['neve', 'cinzas', 'areia', 'folhas'].includes(config.tipo);
    brumas.forEach((b) => {
      b.visible = ativo && config.tipo === 'neblina';
    });
    if (cena.fog instanceof THREE.FogExp2) {
      // Névoa ambiental NÃO participa das máscaras, memórias ou testes de visibilidade do Fog of War.
      cena.fog.density =
        ativo && config.tipo === 'neblina'
          ? DENSIDADE_NEBLINA_PADRAO_3D + (0.012 * config.intensidade) / 100
          : (densidadeAnterior ?? DENSIDADE_NEBLINA_PADRAO_3D);
    }
  };
  const configurar = (novo: ConfigClima, pausa = false) => {
    if (descartado) return;
    config = normalizarClima(novo);
    pausado = pausa;
    if (config.tipo !== tipoAnterior) {
      tipoAnterior = config.tipo;
      if (config.tipo !== 'nenhum' && config.tipo !== 'chuva' && config.tipo !== 'neblina') {
        materialPontos.map = texturas[config.tipo];
        materialPontos.color.set(config.tipo === 'cinzas' ? '#e4d7ca' : '#ffffff');
        materialPontos.needsUpdate = true;
      }
    }
    atualizarVisibilidade();
  };
  const atualizar = (
    delta: number,
    _foco: { x: number; z: number },
    distanciaCamera: number,
    terreno: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => {
    if (descartado || !grupo.visible) return;
    const distancia = clamp(distanciaCamera, 3, 160);
    // O volume do clima pertence ao TERRENO, não à câmera. Evita chuva fora do
    // tabuleiro ou deslocamentos aparentes ao orbitar e aproximar a visão.
    const largura = Math.max(4, terreno.maxX - terreno.minX);
    const profundidade = Math.max(4, terreno.maxZ - terreno.minZ);
    const raioX = Math.max(1, largura / 2 - 0.25),
      raioZ = Math.max(1, profundidade / 2 - 0.25);
    // Cinzas devem ser perceptíveis perto das quatro câmeras, não espalhadas
    // por uma coluna invisível de 28m. O volume continua ancorado ao terreno.
    const altura =
      config.tipo === 'cinzas'
        ? clamp(Math.min(largura, profundidade) * 0.38, 4, 11)
        : clamp(Math.min(largura, profundidade) * 0.8, 6, 28);
    grupo.position.set((terreno.minX + terreno.maxX) / 2, 0, (terreno.minZ + terreno.maxZ) / 2);
    const vento = vetorVentoClima3D(config.direcao, config.vento);
    const movimento =
      !pausado && !preferencia?.matches && typeof document !== 'undefined' && !document.hidden;
    const dt = movimento ? clamp(delta, 0, 0.05) : 0;
    if (config.tipo === 'neblina') {
      brumas.forEach((b, i) => {
        b.scale.set(raioX * 2, raioZ * 2, 1);
        b.position.y = 0.32 + i * 0.67;
        b.position.x = (i ? -0.05 : 0.05) * raioX;
        b.position.z = (i ? 0.04 : -0.04) * raioZ;
        (b.material as THREE.MeshBasicMaterial).opacity =
          ((0.15 + i * 0.07) * config.intensidade) / 100;
        const textura = b.material instanceof THREE.MeshBasicMaterial ? b.material.map : null;
        // Somente um mapa é compartilhado; rolar UV uma única vez por quadro.
        if (i === 0 && textura && dt) {
          textura.offset.x = (textura.offset.x + vento.x * dt * 0.012) % 1;
          textura.offset.y = (textura.offset.y + vento.z * dt * 0.012) % 1;
        }
      });
      return;
    }
    const n = quantidadeParticulasClima3D(config.tipo, config.intensidade);
    geometriaChuva.setDrawRange(0, config.tipo === 'chuva' ? n * 2 : 0);
    geometriaPontos.setDrawRange(0, config.tipo === 'chuva' ? 0 : n);
    const base =
      config.tipo === 'chuva'
        ? 8.6
        : config.tipo === 'neve'
          ? 0.85
          : config.tipo === 'folhas'
            ? 1.25
            : config.tipo === 'cinzas'
              ? 0.6
              : 1.5;
    const arrChuva = gotas.array as Float32Array,
      arrPontos = pontos.array as Float32Array;
    if (config.tipo !== 'chuva') {
      materialPontos.size = clamp(
        (config.tipo === 'folhas'
          ? 0.42
          : config.tipo === 'areia'
            ? 0.11
            : config.tipo === 'cinzas'
              ? 0.21
              : 0.25) * Math.sqrt(distancia / 7),
        0.045,
        2.1,
      );
      materialPontos.opacity =
        config.tipo === 'cinzas' ? 0.88 : config.tipo === 'areia' ? 0.73 : 0.86;
    }
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      if (dt) {
        p.x +=
          (dt *
            (vento.x * 5.0 + (config.tipo === 'neve' ? Math.sin(p.fase + p.y * 8) * 0.35 : 0))) /
          raioX;
        p.z +=
          (dt *
            (vento.z * 5.0 + (config.tipo === 'folhas' ? Math.sin(p.fase + p.y * 9) * 0.32 : 0))) /
          raioZ;
        // Ao contrário da neve, cinzas sobem em pequenas correntes de ar.
        p.y += ((config.tipo === 'cinzas' ? 1 : -1) * dt * p.vel * base) / altura;
        if (p.y < 0) p.y += 1;
        else if (p.y > 1) p.y -= 1;
        if (p.x > 1) p.x -= 2;
        else if (p.x < -1) p.x += 2;
        if (p.z > 1) p.z -= 2;
        else if (p.z < -1) p.z += 2;
      }
      const x = p.x * raioX,
        y = 0.4 + p.y * altura,
        z = p.z * raioZ;
      if (config.tipo === 'chuva') {
        const idx = i * 6;
        const comprimento = clamp(distancia * 0.035, 0.34, 1.6);
        arrChuva[idx] = x;
        arrChuva[idx + 1] = y;
        arrChuva[idx + 2] = z;
        arrChuva[idx + 3] = x - vento.x * comprimento * 0.38;
        arrChuva[idx + 4] = y - comprimento;
        arrChuva[idx + 5] = z - vento.z * comprimento * 0.38;
      } else {
        const idx = i * 3;
        arrPontos[idx] = x;
        arrPontos[idx + 1] = y;
        arrPontos[idx + 2] = z;
      }
    }
    if (config.tipo === 'chuva') gotas.needsUpdate = true;
    else pontos.needsUpdate = true;
  };
  const dispose = () => {
    if (descartado) return;
    descartado = true;
    if (cena.fog instanceof THREE.FogExp2 && densidadeAnterior !== null)
      cena.fog.density = densidadeAnterior;
    cena.remove(grupo);
    geometriaChuva.dispose();
    materialChuva.dispose();
    geometriaPontos.dispose();
    materialPontos.dispose();
    for (const t of Object.values(texturas)) t.dispose();
    for (const b of brumas) {
      b.geometry.dispose();
      (b.material as THREE.Material).dispose();
    }
    texturaNeblina.dispose();
    grupo.clear();
  };
  return { configurar, atualizar, dispose };
}
