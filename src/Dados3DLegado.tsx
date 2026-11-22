import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import './Dados3D.css';
import type { DiceArtPackage } from './hexatombe/diceLibrary';
import type { ConfigDados } from './DadosPersonalizacao';

// Material e geometria próprios, inspirados na qualidade visual de dados de mesa.
// O componente é apenas uma visualização: o sorteio permanece no App.tsx.
export type AcabamentoDados = 'classico' | 'obsidiana' | 'jade' | 'oceano' | 'brasa';
type Props = {
  faces: number;
  valores: number[];
  acabamento?: AcabamentoDados;
  arte?: DiceArtPackage | null;
  config?: ConfigDados;
};
type Visual = { lados: number; numero: number | string; variante: number };
type Faceta = { centro: THREE.Vector3; normal: THREE.Vector3 };
type Dado = {
  grupo: THREE.Group;
  corpo: CANNON.Body;
  destino: THREE.Quaternion;
  alturaFinal: number;
  posicaoFinal: THREE.Vector3;
  quaternionInicio?: THREE.Quaternion;
  posicaoInicio?: THREE.Vector3;
  sombra: THREE.Mesh;
  marcadorFace: THREE.Mesh;
  normalResultado: THREE.Vector3;
};
type Paleta = { base: string; escura: string; clara: string; numero: string; metais: string };
const DURACAO_FISICA = 2400;
const DURACAO_APOIO = 480;
// Coleções opcionais: o padrão conserva as cores individuais aprovadas na v0.3.3.
const ACABAMENTOS: Record<Exclude<AcabamentoDados, 'classico'>, Paleta> = {
  obsidiana: {
    base: '#313443',
    escura: '#090e19',
    clara: '#777d99',
    numero: '#f4e4bd',
    metais: '#d1ad72',
  },
  jade: {
    base: '#367e70',
    escura: '#0c3431',
    clara: '#b5d1aa',
    numero: '#fff4d1',
    metais: '#cfba78',
  },
  oceano: {
    base: '#376bba',
    escura: '#10274f',
    clara: '#a9e0fa',
    numero: '#f6faff',
    metais: '#bed2e9',
  },
  brasa: {
    base: '#983d33',
    escura: '#32121f',
    clara: '#edaa72',
    numero: '#fff4da',
    metais: '#e9b26c',
  },
};
const PALETAS: Record<number, Paleta> = {
  4: { base: '#85424b', escura: '#35172a', clara: '#cc7c7f', numero: '#fff5e6', metais: '#d7af83' },
  6: { base: '#397c8b', escura: '#123247', clara: '#a0e4e4', numero: '#fff7e9', metais: '#e5c994' },
  8: { base: '#4a649e', escura: '#1c234d', clara: '#94b1e9', numero: '#fff8ed', metais: '#cbd6ed' },
  10: {
    base: '#80639a',
    escura: '#2a204a',
    clara: '#bca0d5',
    numero: '#fff8e8',
    metais: '#e2bc8b',
  },
  12: {
    base: '#906243',
    escura: '#3e2823',
    clara: '#e9b682',
    numero: '#fff8ec',
    metais: '#f4cf93',
  },
  20: {
    base: '#62569b',
    escura: '#272046',
    clara: '#b6a7e0',
    numero: '#fff8e9',
    metais: '#ddc59c',
  },
};

function criarVisuais(lados: number, valores: number[]): Visual[] {
  const visuais: Visual[] = [];
  for (const valor of valores) {
    if (visuais.length >= 8) break;
    if (lados === 100) {
      if (visuais.length > 6) break;
      visuais.push({
        lados: 10,
        numero: String(Math.floor((valor % 100) / 10) * 10).padStart(2, '0'),
        variante: 1,
      });
      visuais.push({ lados: 10, numero: valor % 10, variante: 2 });
    } else {
      visuais.push({
        lados: [4, 6, 8, 10, 12, 20].includes(lados) ? lados : 20,
        numero: valor,
        variante: 0,
      });
    }
  }
  return visuais;
}

// Retém os canais no espaço sRGB do canvas, evitando alocar objetos em cada pixel.
function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function texturaPedra(p: Paleta, seed: number): THREE.CanvasTexture {
  const lado = 256;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(lado, lado);
  const base = rgb(p.base),
    escura = rgb(p.escura),
    clara = rgb(p.clara);
  const rnd = (x: number) => {
    const n = Math.sin(x * 127.1 + seed * 71.7) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++) {
      const a = x / lado,
        b = y / lado;
      const onda = Math.sin(
        (a * 5.5 + b * 4.8 + Math.sin(a * 12 + b * 6 + seed) * 0.27) * Math.PI * 2 + seed,
      );
      const veios = Math.pow(
        Math.max(0, Math.sin((a * 9.8 - b * 5.5 + Math.sin(b * 9 + seed) * 0.22) * Math.PI * 2)),
        15,
      );
      const t = Math.max(
        0,
        Math.min(1, 0.5 + onda * 0.18 + (rnd(x * 0.75 + y * 1.47) - 0.5) * 0.11),
      );
      const luz = Math.max(0, (t - 0.52) * 0.8),
        veio = veios > 0.35 ? veios * 0.38 : 0;
      const i = (y * lado + x) * 4;
      for (let k = 0; k < 3; k++) {
        const mistura = escura[k] * (1 - t) + base[k] * t;
        const aclarado = mistura * (1 - luz) + clara[k] * luz;
        img.data[i + k] = aclarado * (1 - veio) + clara[k] * veio;
      }
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 11; i++) {
    const x = rnd(i + 2) * 300 - 20,
      y = rnd(i + 30) * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 32, y + 30, x - 50, y + 70, x + 45, y + 140);
    ctx.strokeStyle = i % 2 ? '#ffffff20' : '#0b102429';
    ctx.lineWidth = 0.9 + rnd(i) * 1;
    ctx.stroke();
  }
  for (let i = 0; i < 100; i++) {
    const x = rnd(i * 2 + 14) * 256,
      y = rnd(i * 2 + 15) * 256;
    ctx.fillStyle = i % 3 === 0 ? '#fff5ca9a' : '#c4a26265';
    ctx.beginPath();
    ctx.arc(x, y, 0.25 + rnd(i + 9) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function textoDaFace(
  numero: number | string,
  paleta: Paleta,
  arte?: DiceArtPackage | null,
  indiceFace = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const tx = new THREE.CanvasTexture(canvas);
  tx.colorSpace = THREE.SRGBColorSpace;
  const desenharTexto = () => {
    if (arte?.showNumbers === false) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const s = arte?.faceLabels?.[indiceFace - 1] || String(numero);
    const tamanho = arte?.numbering?.size
      ? Math.max(60, Math.min(160, (150 * arte.numbering.size) / 100))
      : 157;
    ctx.font = `700 ${s.length >= 3 ? tamanho * 0.57 : s.length === 2 ? tamanho * 0.77 : tamanho}px Georgia,serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#12121eb8';
    ctx.strokeText(s, 128, 133, 226);
    ctx.fillStyle = arte?.numbering?.color || paleta.numero;
    ctx.fillText(s, 128, 133, 226);
    tx.needsUpdate = true;
  };
  const pintura = arte?.artworkPNG?.[String(indiceFace)];
  if (pintura?.startsWith('data:image/png;base64,')) {
    const imagem = new Image();
    imagem.onload = () => {
      // O desenho é decorativo, nunca substitui o valor real sorteado pelo servidor.
      ctx.drawImage(imagem, 0, 0, 256, 256);
      desenharTexto();
    };
    imagem.onerror = desenharTexto;
    imagem.src = pintura;
  } else desenharTexto();
  return tx;
}

// d10 em forma de trapezoedro pentagonal, não mais um cilindro.
function criarD10(): { geometria: THREE.BufferGeometry; facetas: Faceta[] } {
  const H = 1.16,
    r = 1.0,
    c = Math.cos(Math.PI / 5),
    h = (H * (1 - c)) / (1 + c);
  const anel = Array.from(
    { length: 10 },
    (_, i) =>
      new THREE.Vector3(
        r * Math.cos((i * Math.PI) / 5),
        i % 2 === 0 ? h : -h,
        r * Math.sin((i * Math.PI) / 5),
      ),
  );
  const sup = new THREE.Vector3(0, H, 0),
    inf = new THREE.Vector3(0, -H, 0);
  const vertices: number[] = [];
  const uvs: number[] = [];
  const facetas: Faceta[] = [];
  function quadrilatero(v: THREE.Vector3[]) {
    const n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    if (n.dot(v.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(0.25)) < 0)
      v.reverse();
    const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    const centro = v.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(0.25);
    const eixoX = v[1].clone().sub(v[0]).normalize();
    const eixoY = normal.clone().cross(eixoX).normalize();
    for (const [i, j, k] of [
      [0, 1, 2],
      [0, 2, 3],
    ])
      for (const index of [i, j, k]) {
        const vert = v[index];
        vertices.push(...vert.toArray());
        const relativo = vert.clone().sub(centro);
        uvs.push(0.5 + relativo.dot(eixoX) * 0.42, 0.5 + relativo.dot(eixoY) * 0.42);
      }
    facetas.push({ normal, centro });
  }
  for (let i = 1; i < 10; i += 2)
    quadrilatero([
      sup.clone(),
      anel[(i + 9) % 10].clone(),
      anel[i].clone(),
      anel[(i + 1) % 10].clone(),
    ]);
  for (let i = 0; i < 10; i += 2)
    quadrilatero([
      inf.clone(),
      anel[(i + 9) % 10].clone(),
      anel[i].clone(),
      anel[(i + 1) % 10].clone(),
    ]);
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometria.computeVertexNormals();
  return { geometria, facetas };
}

function agruparFacetas(g: THREE.BufferGeometry): Faceta[] {
  const geom = g.index ? g.toNonIndexed() : g;
  const pos = geom.getAttribute('position');
  const encontrados: Faceta[] = [];
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const centro = a
      .clone()
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(centro) < 0) normal.negate();
    if (
      !encontrados.some(
        (e) =>
          e.normal.dot(normal) > 0.999 &&
          Math.abs(e.normal.dot(e.centro.clone().sub(centro))) < 0.008,
      )
    ) {
      encontrados.push({ normal, centro });
    } else {
      const e = encontrados.find(
        (e) =>
          e.normal.dot(normal) > 0.999 &&
          Math.abs(e.normal.dot(e.centro.clone().sub(centro))) < 0.008,
      )!;
      e.centro.add(centro).multiplyScalar(0.5);
    }
  }
  if (geom !== g) geom.dispose();
  return encontrados;
}

function construirDado(
  visual: Visual,
  seed: number,
  acabamento: AcabamentoDados,
  arte?: DiceArtPackage | null,
): {
  grupo: THREE.Group;
  geometria: THREE.BufferGeometry;
  normalEscolhida: THREE.Vector3;
  upEscolhida: THREE.Vector3;
  facetas: Faceta[];
  marcadorFace: THREE.Mesh;
} {
  const base =
    acabamento === 'classico' ? PALETAS[visual.lados] || PALETAS[20] : ACABAMENTOS[acabamento];
  const p: Paleta = arte
    ? {
        ...base,
        base: arte.baseColor,
        numero: arte.numbering?.color || base.numero,
        metais: arte.border?.color || base.metais,
      }
    : base;
  const personalizado = visual.lados === 10 ? criarD10() : null;
  const geometria =
    personalizado?.geometria ||
    (visual.lados === 4
      ? new THREE.TetrahedronGeometry(1.06)
      : visual.lados === 6
        ? new THREE.BoxGeometry(1.52, 1.52, 1.52)
        : visual.lados === 8
          ? new THREE.OctahedronGeometry(1.11)
          : visual.lados === 12
            ? new THREE.DodecahedronGeometry(1.03)
            : new THREE.IcosahedronGeometry(1.06));
  const facetas = personalizado?.facetas || agruparFacetas(geometria);
  const grupo = new THREE.Group();
  const textura = texturaPedra(p, seed);
  const material = new THREE.MeshPhysicalMaterial({
    map: textura,
    metalness: arte?.material === 'metal' ? 0.6 : 0.1,
    roughness: arte?.material === 'pedra' ? 0.72 : 0.29,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    flatShading: true,
  });
  const corpo = new THREE.Mesh(geometria, material);
  grupo.add(corpo);
  const arestas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometria, 12),
    new THREE.LineBasicMaterial({ color: p.metais, transparent: true, opacity: 0.6 }),
  );
  grupo.add(arestas);
  const numeros =
    visual.variante === 1
      ? Array.from({ length: 10 }, (_, i) => String(i * 10).padStart(2, '0'))
      : visual.variante === 2
        ? Array.from({ length: 10 }, (_, i) => i)
        : Array.from({ length: visual.lados }, (_, i) => i + 1);
  const demais = numeros.filter((n) => String(n) !== String(visual.numero));
  let normalEscolhida = new THREE.Vector3(0, 1, 0),
    upEscolhida = new THREE.Vector3(0, 0, 1);
  let marcadorFace: THREE.Mesh | undefined;
  for (let i = 0; i < facetas.length; i++) {
    const f = facetas[i],
      numero = i === 0 ? visual.numero : demais[(i - 1) % Math.max(1, demais.length)];
    const valor = Number(numero);
    const indiceFace =
      visual.variante === 1
        ? valor === 0
          ? 10
          : Math.floor(valor / 10)
        : visual.variante === 2
          ? valor === 0
            ? 10
            : valor
          : valor;
    const arteFace = visual.variante === 2 && arte?.type === 100 ? null : arte;
    const tx = textoDaFace(numero, p, arteFace, Math.max(1, indiceFace));
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(
        visual.lados === 20 ? 0.4 : visual.lados === 12 ? 0.51 : visual.lados === 10 ? 0.51 : 0.64,
        visual.lados === 20 ? 0.4 : visual.lados === 12 ? 0.51 : visual.lados === 10 ? 0.51 : 0.64,
      ),
      new THREE.MeshBasicMaterial({
        map: tx,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const up = new THREE.Vector3(0, 1, 0)
      .addScaledVector(f.normal, -new THREE.Vector3(0, 1, 0).dot(f.normal))
      .normalize();
    if (up.lengthSq() < 0.03) up.set(0, 0, 1).addScaledVector(f.normal, -f.normal.z).normalize();
    const right = up.clone().cross(f.normal).normalize();
    up.copy(f.normal.clone().cross(right).normalize());
    label.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, f.normal));
    label.position.copy(f.centro).addScaledVector(f.normal, 0.018);
    grupo.add(label);
    if (i === 0) {
      normalEscolhida = f.normal.clone();
      upEscolhida = up.clone();
      // Esta e a face do numero sorteado. O contorno so aparece quando
      // o dado termina o movimento, para deixar claro qual face conta.
      const raio =
        visual.lados === 20
          ? 0.255
          : visual.lados === 12
            ? 0.31
            : visual.lados === 10
              ? 0.32
              : visual.lados === 4
                ? 0.37
                : 0.39;
      marcadorFace = new THREE.Mesh(
        new THREE.RingGeometry(raio, raio + 0.032, 40),
        new THREE.MeshBasicMaterial({
          color: p.metais,
          transparent: true,
          opacity: 0.94,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      marcadorFace.quaternion.copy(label.quaternion);
      marcadorFace.position.copy(f.centro).addScaledVector(f.normal, 0.033);
      marcadorFace.visible = false;
      grupo.add(marcadorFace);
    }
  }
  if (!marcadorFace) throw new Error('Dado sem face de resultado.');
  return { grupo, geometria, normalEscolhida, upEscolhida, facetas, marcadorFace };
}

function destinoDaFace(
  normal: THREE.Vector3,
  textoUp: THREE.Vector3,
  camera: THREE.Camera,
  lados: number,
  facetas: Faceta[],
): THREE.Quaternion {
  // Um dado fisico nao deve ficar inclinado so para "encarar" a camera.
  // Para d6/d8/d10/d12/d20, assentamos a face premiada PARA CIMA (Y),
  // girando em torno do eixo vertical para que o numero fique em pe na tela.
  const mundoCima = new THREE.Vector3(0, 1, 0);
  const frenteCamera = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion).normalize();
  const cimaCamera = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const n = normal.clone().normalize();
  const up = textoUp.clone().addScaledVector(n, -textoUp.dot(n)).normalize();

  if (lados === 4) {
    // Um tetraedro nao repousa com uma face para cima. Ele repousa sobre uma
    // das OUTRAS faces, deixando a face sorteada inclinada na direcao de quem
    // olha a mesa. Escolhemos o apoio que mantem o texto mais legivel.
    const paraCameraHorizontal = frenteCamera.clone().setY(0).normalize();
    let melhor = new THREE.Quaternion();
    let melhorNota = -Infinity;
    for (const apoio of facetas) {
      if (apoio.normal.dot(n) > 0.99) continue;
      const alinharBase = new THREE.Quaternion().setFromUnitVectors(
        apoio.normal.clone().normalize(),
        new THREE.Vector3(0, -1, 0),
      );
      const normalApoiada = n.clone().applyQuaternion(alinharBase);
      const horizontal = normalApoiada.clone().setY(0).normalize();
      if (horizontal.lengthSq() < 0.0001) continue;
      const girarParaCamera = new THREE.Quaternion().setFromUnitVectors(
        horizontal,
        paraCameraHorizontal,
      );
      const destino = girarParaCamera.clone().multiply(alinharBase).normalize();
      const faceVisivel = n.clone().applyQuaternion(destino);
      const textoVisivel = up.clone().applyQuaternion(destino);
      // Peso maior para frente visivel; orientacao do texto desempata o apoio.
      const nota = faceVisivel.dot(frenteCamera) * 3 + textoVisivel.dot(cimaCamera);
      if (nota > melhorNota) {
        melhorNota = nota;
        melhor.copy(destino);
      }
    }
    return melhor.normalize();
  }

  // Eixo de leitura projetado no plano horizontal. Com camera inclinada,
  // aponta para a parte superior da tela e nao para o fundo da mesa.
  const upTelaPlano = cimaCamera
    .clone()
    .addScaledVector(mundoCima, -cimaCamera.dot(mundoCima))
    .normalize();
  if (upTelaPlano.lengthSq() < 0.001) upTelaPlano.set(0, 0, -1);
  const localRight = up.clone().cross(n).normalize();
  const localBasis = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(localRight, up, n),
  );
  const worldRight = upTelaPlano.clone().cross(mundoCima).normalize();
  const targetBasis = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(worldRight, upTelaPlano, mundoCima),
  );
  const destino = targetBasis.multiply(localBasis.invert()).normalize();
  // A face escolhida deve ser o topo real, independentemente da camera.
  if (n.applyQuaternion(destino).dot(mundoCima) < 0.999) {
    throw new Error('Nao foi possivel assentar o numero sorteado para cima.');
  }
  return destino;
}

// A física usa os mesmos vértices do modelo 3D. Faces trianguladas coplanares
// são unificadas: o ConvexPolyhedron exige um único polígono por faceta.
function colisaoConvexa(geometria: THREE.BufferGeometry): CANNON.ConvexPolyhedron {
  const attr = geometria.getAttribute('position');
  const indices: number[] = geometria.index
    ? Array.from(geometria.index.array as ArrayLike<number>)
    : Array.from({ length: attr.count }, (_, i) => i);
  const vertices: THREE.Vector3[] = [];
  const mapa = new Map<string, number>();
  const mapear = (indice: number) => {
    const vert = new THREE.Vector3().fromBufferAttribute(attr, indice);
    const chave = [vert.x, vert.y, vert.z].map((v) => Math.round(v * 10000)).join(':');
    let idx = mapa.get(chave);
    if (idx === undefined) {
      idx = vertices.length;
      vertices.push(vert);
      mapa.set(chave, idx);
    }
    return idx;
  };
  const grupos: { normal: THREE.Vector3; distancia: number; indices: Set<number> }[] = [];
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const tri = [mapear(indices[i]), mapear(indices[i + 1]), mapear(indices[i + 2])];
    const a = vertices[tri[0]],
      b = vertices[tri[1]],
      c = vertices[tri[2]];
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() < 0.000001) continue;
    normal.normalize();
    const centro = a.clone().add(b).add(c).divideScalar(3);
    if (normal.dot(centro) < 0) normal.negate();
    const distancia = normal.dot(a);
    let face = grupos.find(
      (g) => g.normal.dot(normal) > 0.998 && Math.abs(g.distancia - distancia) < 0.025,
    );
    if (!face) {
      face = { normal, distancia, indices: new Set() };
      grupos.push(face);
    }
    tri.forEach((v) => face!.indices.add(v));
  }
  const faces = grupos
    .map((g) => {
      const centros = [...g.indices].map((i) => vertices[i]);
      const medio = centros
        .reduce((a, b) => a.add(b), new THREE.Vector3())
        .divideScalar(centros.length);
      const ex = centros[0].clone().sub(medio).normalize();
      const ey = g.normal.clone().cross(ex).normalize();
      const ordem = [...g.indices].sort((i, j) => {
        const a = vertices[i].clone().sub(medio),
          b = vertices[j].clone().sub(medio);
        return Math.atan2(a.dot(ey), a.dot(ex)) - Math.atan2(b.dot(ey), b.dot(ex));
      });
      const a = vertices[ordem[0]],
        b = vertices[ordem[1]],
        c = vertices[ordem[2]];
      if (b.clone().sub(a).cross(c.clone().sub(a)).dot(g.normal) < 0) ordem.reverse();
      return ordem;
    })
    .filter((face) => face.length >= 3);
  if (faces.length < 4) throw new Error('Geometria sem facetas para colisão.');
  return new CANNON.ConvexPolyhedron({
    vertices: vertices.map((v) => new CANNON.Vec3(v.x, v.y, v.z)),
    faces,
  });
}

function alturaApoiada(geometria: THREE.BufferGeometry, rotacao: THREE.Quaternion): number {
  const p = geometria.getAttribute('position');
  const v = new THREE.Vector3();
  let minima = Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyQuaternion(rotacao);
    minima = Math.min(minima, v.y);
  }
  return -minima + 0.018;
}

// Plano de colisão invisível, sobreposto visualmente ao mapa.
// Paredes também invisíveis impedem que os dados saiam da área capturada pela câmera.
function criarAreaDeRolagem(world: CANNON.World) {
  const material = new CANNON.Material('chao-do-mapa');
  const plano = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() });
  plano.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(plano);
  const paredes: [number, number, number, number, number, number][] = [
    [-4.3, 1.25, 0, 0.16, 1.25, 2.65],
    [4.3, 1.25, 0, 0.16, 1.25, 2.65],
    [0, 1.25, -2.65, 4.4, 1.25, 0.16],
    [0, 1.25, 2.65, 4.4, 1.25, 0.16],
  ];
  paredes.forEach(([x, y, z, hx, hy, hz]) => {
    const p = new CANNON.Body({
      mass: 0,
      material,
      shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)),
    });
    p.position.set(x, y, z);
    world.addBody(p);
  });
  return material;
}

function destruir(scene: THREE.Scene) {
  const geometrias = new Set<THREE.BufferGeometry>();
  const materiais = new Set<THREE.Material>();
  const texturas = new Set<THREE.Texture>();
  scene.traverse((o: THREE.Object3D) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
    geometrias.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materiais.add(m);
      const mapa = (m as THREE.MeshBasicMaterial).map;
      if (mapa) texturas.add(mapa);
    }
  });
  geometrias.forEach((g) => g.dispose());
  texturas.forEach((t) => t.dispose());
  materiais.forEach((m) => m.dispose());
}

export default function Dados3D({ faces, valores, acabamento = 'classico', arte, config }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [erroWebgl, setErroWebgl] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    setErroWebgl(false);
    const visuais = criarVisuais(faces, valores);
    const scene = new THREE.Scene();
    // Câmera ortográfica: acompanha o espaço visível do mapa, não a área fixa de uma bandeja.
    const camera = new THREE.OrthographicCamera(-6.2, 6.2, 3.8, -3.8, 0.1, 100);
    // Camera inclinada aproximadamente 35 graus: vemos o numero sobre a face
    // superior e, no d4, a face inclinada na direcao da camera.
    camera.position.set(0, 18, 12);
    camera.lookAt(0, 0.5, 0);
    camera.zoom = Math.max(0.7, Math.min(1.45, (config?.escala ?? 5) / 5));
    scene.add(new THREE.HemisphereLight(0xeef4ff, 0x5a3053, 2.4 * (config?.iluminacao ?? 1)));
    const luz = new THREE.DirectionalLight(0xffe0ac, 3.0 * (config?.iluminacao ?? 1));
    luz.position.set(-4, 9, 6);
    scene.add(luz);
    const borda = new THREE.DirectionalLight(0x98b9ff, 2.1 * (config?.iluminacao ?? 1));
    borda.position.set(5, 4, -4);
    scene.add(borda);
    // Sem plano visual: o canvas WebGL é transparente e o mapa real aparece por trás.
    // A física mantém um plano invisível de colisão para os dados quicarem.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
    } catch {
      setErroWebgl(true);
      destruir(scene);
      return;
    }
    const mundo = new CANNON.World({
      gravity: new CANNON.Vec3(0, -24 * (config?.gravidade ?? 1), 0),
    });
    mundo.allowSleep = true;
    if (mundo.solver instanceof CANNON.GSSolver) {
      mundo.solver.iterations = 12;
    }
    const feltro = criarAreaDeRolagem(mundo);
    const resina = new CANNON.Material('resina');
    mundo.addContactMaterial(
      new CANNON.ContactMaterial(resina, feltro, {
        friction: 0.54 * (config?.atrito ?? 1),
        restitution: Math.min(0.8, 0.23 + (config?.quique ?? 0)),
      }),
    );
    mundo.addContactMaterial(
      new CANNON.ContactMaterial(resina, resina, {
        friction: 0.36 * (config?.atrito ?? 1),
        restitution: Math.min(0.8, 0.28 + (config?.quique ?? 0)),
      }),
    );
    const dados: Dado[] = [];
    const n = visuais.length;
    // Não deixar corpos próximos das bordas invisíveis; espaço para até 8 poliedros.
    const larguraMinima = Math.max(12.4, n * 1.55 + 3.2);
    const sombraCanvas = document.createElement('canvas');
    sombraCanvas.width = 128;
    sombraCanvas.height = 128;
    const ctx = sombraCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
    grad.addColorStop(0, '#00000096');
    grad.addColorStop(1, '#00000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const texturaSombra = new THREE.CanvasTexture(sombraCanvas);
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      for (let i = 0; i < n; i++) {
        const visual = visuais[i];
        const { grupo, geometria, normalEscolhida, upEscolhida, facetas, marcadorFace } =
          construirDado(
            visual,
            i * 13 + faces * 3 + Number(valores[i % valores.length]),
            acabamento,
            arte,
          );
        // Distribuicao final centralizada sobre o mapa, evitando dados fora
        // da imagem (mesmo quando a janela da mesa for bem larga).
        const colunas = Math.min(3, n);
        const linhas = Math.ceil(n / colunas);
        const linha = Math.floor(i / colunas);
        const coluna = i % colunas;
        const nestaLinha = Math.min(colunas, n - linha * colunas);
        const x = (coluna - (nestaLinha - 1) / 2) * 2.05;
        const z = (linha - (linhas - 1) / 2) * 1.7;
        const destino = destinoDaFace(normalEscolhida, upEscolhida, camera, visual.lados, facetas);
        const alturaFinal = alturaApoiada(geometria, destino);
        let forma: CANNON.Shape;
        try {
          forma = colisaoConvexa(geometria);
        } catch (err) {
          console.warn('Colisão convexa indisponível, usando esfera de segurança.', err);
          forma = new CANNON.Sphere(0.88);
        }
        const corpo = new CANNON.Body({
          mass: 1,
          material: resina,
          linearDamping: 0.18,
          angularDamping: config?.amortecimentoAngular ?? 0.33,
        });
        corpo.addShape(forma);
        corpo.position.set(x, (3.2 * (config?.altura ?? 8)) / 8 + (i % 3) * 0.38, z - 0.45);
        corpo.velocity.set(
          ((Math.random() - 0.5) * 1.4 * (config?.forca ?? 6)) / 6,
          0,
          ((1.2 + (Math.random() - 0.5) * 0.6) * (config?.forca ?? 6)) / 6,
        );
        corpo.angularVelocity.set(
          ((7 + Math.random() * 9) * (config?.giro ?? 4)) / 4,
          ((5 + Math.random() * 8) * (config?.giro ?? 4)) / 4,
          ((6 + Math.random() * 10) * (config?.giro ?? 4)) / 4,
        );
        corpo.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        mundo.addBody(corpo);
        grupo.position.set(corpo.position.x, corpo.position.y, corpo.position.z);
        scene.add(grupo);
        const sombra = new THREE.Mesh(
          new THREE.PlaneGeometry(2.1, 1.8),
          new THREE.MeshBasicMaterial({
            map: texturaSombra,
            transparent: true,
            depthWrite: false,
            opacity: 0.4,
          }),
        );
        sombra.rotation.x = -Math.PI / 2;
        sombra.position.set(x, 0.003, z);
        sombra.visible = config?.sombras !== false;
        scene.add(sombra);
        dados.push({
          grupo,
          corpo,
          destino,
          alturaFinal,
          posicaoFinal: new THREE.Vector3(x, alturaFinal, z),
          sombra,
          marcadorFace,
          normalResultado: normalEscolhida,
        });
      }
    } catch (e) {
      console.error('Não foi possível preparar os dados.', e);
      setErroWebgl(true);
      destruir(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      return;
    }
    function resize() {
      const w = Math.max(1, el!.clientWidth),
        h = Math.max(1, el!.clientHeight);
      // Campo visível vertical mínimo garante espaço para a queda e os quicados.
      // Em janelas muito largas, expandimos o campo horizontal, não cortamos dados.
      const largura = Math.max(larguraMinima, (7.8 * w) / h);
      camera.left = -largura / 2;
      camera.right = largura / 2;
      camera.top = (largura * h) / w / 2;
      camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    }
    const obs = new ResizeObserver(resize);
    obs.observe(el);
    resize();
    let ativo = true,
      frame = 0,
      inicio = -1,
      ultimo = 0;
    const animar = (instante: number) => {
      if (!ativo) return;
      if (inicio < 0) {
        inicio = instante;
        ultimo = instante;
      }
      const tempo = instante - inicio;
      if (!reduzido && tempo < DURACAO_FISICA) {
        const delta = Math.min(0.055, Math.max(0, (instante - ultimo) / 1000));
        mundo.step(1 / 60, delta, 6);
        for (const d of dados) {
          d.grupo.position.set(d.corpo.position.x, d.corpo.position.y, d.corpo.position.z);
          d.grupo.quaternion.set(
            d.corpo.quaternion.x,
            d.corpo.quaternion.y,
            d.corpo.quaternion.z,
            d.corpo.quaternion.w,
          );
        }
      } else {
        const t = reduzido
          ? 1
          : THREE.MathUtils.clamp((tempo - DURACAO_FISICA) / DURACAO_APOIO, 0, 1);
        const suave = t * t * (3 - 2 * t);
        for (const d of dados) {
          if (!d.quaternionInicio) {
            d.quaternionInicio = d.grupo.quaternion.clone();
            d.posicaoInicio = d.grupo.position.clone();
            // O lance foi físico. A última etapa orienta a face já sorteada
            // na lógica de rolagem para manter resultado, histórico e dado coerentes.
            // Mantem a sensacao de quique fisico, mas os dados terminam
            // agrupados no centro, sem escorregar para fora do mapa.
            d.posicaoFinal.y = d.alturaFinal;
          }
          d.grupo.quaternion.copy(d.quaternionInicio).slerp(d.destino, suave);
          d.grupo.position.copy(d.posicaoInicio!).lerp(d.posicaoFinal, suave);
          // Marca a face sorteada apenas ao assentar: no topo em dados
          // comuns, e na face mais legivel do tetraedro em d4.
          d.marcadorFace.visible = t >= 0.99;
          if (t >= 1) {
            d.grupo.quaternion.copy(d.destino);
            d.grupo.position.copy(d.posicaoFinal);
          }
        }
      }
      // Sombras discretas sobre o mapa, acompanhando a posição de cada dado.
      for (const d of dados) {
        d.sombra.position.x = d.grupo.position.x;
        d.sombra.position.z = d.grupo.position.z;
        const altura = Math.max(0, d.grupo.position.y - d.alturaFinal);
        (d.sombra.material as THREE.MeshBasicMaterial).opacity =
          THREE.MathUtils.clamp(0.48 - altura * 0.105, 0.1, 0.48) *
          (config?.sombraTransparencia ?? 1);
        const escala = 1 + Math.min(altura, 3) * 0.13;
        d.sombra.scale.set(escala, escala, 1);
      }
      ultimo = instante;
      renderer.render(scene, camera);
      if (tempo < DURACAO_FISICA + DURACAO_APOIO && !reduzido)
        frame = requestAnimationFrame(animar);
    };
    frame = requestAnimationFrame(animar);
    return () => {
      ativo = false;
      cancelAnimationFrame(frame);
      obs.disconnect();
      destruir(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [faces, valores, acabamento, arte, config]);
  return (
    <div
      className="dados3d-palco"
      ref={container}
      aria-label={`Dados 3D rolados sobre o mapa: ${valores.join(', ')}`}
    >
      {erroWebgl && (
        <span className="dados3d-fallback">
          Não foi possível exibir os dados 3D. Confira o resultado no histórico.
        </span>
      )}
    </div>
  );
}
