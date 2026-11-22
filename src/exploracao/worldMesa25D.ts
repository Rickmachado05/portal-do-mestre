import * as THREE from 'three';
import { calcularPoligonoVisao } from '../lib/lighting';
import {
  dentroPoligono,
  nevoaReveladaNoPonto,
  posicaoMundo,
  type Cena25D,
  type Dimensoes25D,
  type PontoPct,
  type Unidade25D,
} from './mesa25dData';

type TokenRender = {
  grupo: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  anel: THREE.Mesh;
  texture: THREE.Texture;
};
export type MundoMesa25D = {
  scene: THREE.Scene;
  dim: Dimensoes25D;
  tokens: Map<string, TokenRender>;
  atualizarPosicao: (id: string, p: PontoPct) => void;
  selecionar: (id: string) => void;
  atualizarVisao: (id: string, mostrarSegredos: boolean) => void;
  definirMapa: (blob: Blob) => Promise<void>;
  definirImagemToken: (id: string, blob: Blob) => Promise<void>;
  liberar: () => void;
};
const canvas = (w: number, h: number) => {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return el;
};
const texCanvas = (el: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
function carregarTextura(blob: Blob): Promise<THREE.Texture> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) =>
    new THREE.TextureLoader().load(
      url,
      (t) => {
        URL.revokeObjectURL(url);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        resolve(t);
      },
      undefined,
      () => {
        URL.revokeObjectURL(url);
        reject(new Error('Imagem inválida'));
      },
    ),
  );
}
function fallback(nome: string, cor: string) {
  const el = canvas(128, 128),
    ctx = el.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 55, 0, Math.PI * 2);
  ctx.fillStyle = '#1c2831';
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.font = 'bold 55px Georgia,serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5e7cc';
  ctx.fillText(nome.slice(0, 1).toUpperCase(), 64, 65);
  return texCanvas(el);
}
function caminhoPoligono(
  ctx: CanvasRenderingContext2D,
  p: PontoPct[],
  largura: number,
  altura: number,
) {
  if (p.length < 3) return;
  ctx.beginPath();
  ctx.moveTo((p[0].x / 100) * largura, (p[0].y / 100) * altura);
  p.slice(1).forEach((q) => ctx.lineTo((q.x / 100) * largura, (q.y / 100) * altura));
  ctx.closePath();
}
function tracarNevoa(ctx: CanvasRenderingContext2D, cena: Cena25D, w: number, h: number) {
  ctx.fillStyle = 'rgba(2,5,13,0.96)';
  ctx.fillRect(0, 0, w, h);
  for (const t of cena.nevoa) {
    if (!t.pontos.length) continue;
    ctx.globalCompositeOperation = t.acao === 'revelar' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#02050d';
    ctx.fillStyle = '#02050d';
    ctx.lineWidth = ((t.raio * w) / 100) * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (t.pontos.length === 1) {
      const p = t.pontos[0];
      ctx.beginPath();
      ctx.ellipse(
        (p.x * w) / 100,
        (p.y * h) / 100,
        (t.raio * w) / 100,
        (t.raio * h) / 100,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo((t.pontos[0].x * w) / 100, (t.pontos[0].y * h) / 100);
      t.pontos.slice(1).forEach((p) => ctx.lineTo((p.x * w) / 100, (p.y * h) / 100));
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
function desenharOcultacao(
  ctx: CanvasRenderingContext2D,
  poligono: PontoPct[],
  w: number,
  h: number,
) {
  if (poligono.length < 3) {
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.moveTo((poligono[0].x / 100) * w, (poligono[0].y / 100) * h);
  poligono.slice(1).forEach((p) => ctx.lineTo((p.x / 100) * w, (p.y / 100) * h));
  ctx.closePath();
  ctx.fillStyle = '#02050d';
  ctx.fill('evenodd');
}
const texturaPlaca = (c: HTMLCanvasElement, dim: Dimensoes25D, altura: number, opacity = 1) => {
  const t = texCanvas(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(dim.largura, dim.altura),
    new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = altura;
  mesh.renderOrder = Math.round(altura * 1000);
  return mesh;
};
export function criarMundoMesa25D(
  cena: Cena25D,
  unidades: Unidade25D[],
  dim: Dimensoes25D,
): MundoMesa25D {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e171c');
  const ambiente = new THREE.HemisphereLight('#e5e4d4', '#26323b', 1.5);
  scene.add(ambiente);
  const sol = new THREE.DirectionalLight('#cadbea', 1.7);
  sol.position.set(-5, 14, 10);
  scene.add(sol);
  const chao = canvas(768, Math.max(200, Math.round((768 * dim.altura) / dim.largura))),
    base = chao.getContext('2d')!;
  base.fillStyle = '#263037';
  base.fillRect(0, 0, chao.width, chao.height);
  base.strokeStyle = '#c9ba9950';
  base.lineWidth = 1;
  for (let x = 0; x <= chao.width; x += chao.width / 20) {
    base.beginPath();
    base.moveTo(x, 0);
    base.lineTo(x, chao.height);
    base.stroke();
  }
  for (let y = 0; y <= chao.height; y += chao.width / 20) {
    base.beginPath();
    base.moveTo(0, y);
    base.lineTo(chao.width, y);
    base.stroke();
  }
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(dim.largura, dim.altura),
    new THREE.MeshBasicMaterial({ map: texCanvas(chao), side: THREE.DoubleSide }),
  );
  piso.rotation.x = -Math.PI / 2;
  scene.add(piso);
  const parede = new THREE.MeshStandardMaterial({
    color: '#647379',
    roughness: 0.93,
    transparent: true,
    opacity: 0.77,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const porta = new THREE.MeshStandardMaterial({
    color: '#b28b56',
    roughness: 0.8,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const paredes: THREE.Mesh[] = [];
  for (const b of cena.barreiras) {
    const a = posicaoMundo({ x: b.x1, y: b.y1 }, dim),
      c = posicaoMundo({ x: b.x2, y: b.y2 }, dim);
    const length = Math.hypot(c.x - a.x, c.z - a.z);
    if (length < 0.03) continue;
    const altura = b.tipo === 'porta' ? (b.aberta ? 0.23 : 1.5) : 1.65;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(length, altura, b.tipo === 'porta' ? 0.12 : 0.16),
      b.tipo === 'porta' ? porta : parede,
    );
    mesh.position.set((a.x + c.x) / 2, altura / 2, (a.z + c.z) / 2);
    mesh.rotation.y = -Math.atan2(c.z - a.z, c.x - a.x);
    scene.add(mesh);
    paredes.push(mesh);
  }
  const tokens = new Map<string, TokenRender>();
  if (cena.camadas.tokens) {
    for (const u of unidades) {
      const t = cena.tokens[u.id];
      if (!t) continue;
      const grupo = new THREE.Group();
      const p = posicaoMundo(t, dim);
      grupo.position.set(p.x, 0, p.z);
      scene.add(grupo);
      const tex = fallback(u.nome, u.cor);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.07,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const size = Math.max(0.65, Math.min(4.2, t.tamanho / 40));
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = (t.rotacao * Math.PI) / 180;
      mesh.position.y = 0.14;
      mesh.renderOrder = 12;
      grupo.add(mesh);
      const anel = new THREE.Mesh(
        new THREE.RingGeometry(size * 0.51, size * 0.57, 42),
        new THREE.MeshBasicMaterial({
          color: u.cor,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.11;
      anel.renderOrder = 11;
      grupo.add(anel);
      tokens.set(u.id, { grupo, mesh, mat, anel, texture: tex });
    }
  }
  const w = 768,
    h = Math.max(200, Math.round((768 * dim.altura) / dim.largura));
  const luzEl = canvas(w, h),
    luzCtx = luzEl.getContext('2d')!;
  const escurecimento = texturaPlaca(luzEl, dim, 0.2);
  scene.add(escurecimento);
  const brilhoEl = canvas(w, h),
    brilhoCtx = brilhoEl.getContext('2d')!;
  const brilho = texturaPlaca(brilhoEl, dim, 0.215);
  scene.add(brilho);
  const fogEl = canvas(w, h),
    fogCtx = fogEl.getContext('2d')!;
  const nevoa = texturaPlaca(fogEl, dim, 0.25);
  scene.add(nevoa);
  // A luz de cena usa o mesmo polígono com oclusão das paredes da mesa 2D.
  const luzes: Array<{ pos: PontoPct; alcance: number; cor: string }> = cena.fontesLuz
    .filter((f) => f.ativa)
    .map((f) => ({ pos: f, alcance: f.alcance, cor: f.cor }));
  for (const t of Object.values(cena.tokens)) {
    if (t.emiteLuz) luzes.push({ pos: t, alcance: t.alcanceLuz, cor: t.corLuz });
  }
  let ativo = true;
  function poligonoVisao(p: PontoPct, raio: number): PontoPct[] {
    return calcularPoligonoVisao(p.x, p.y, raio, cena.barreiras, w, h).map((v) => ({
      x: (v.x / w) * 100,
      y: (v.y / h) * 100,
    }));
  }
  function atualizarVisao(id: string, mostrarSegredos: boolean) {
    const token = cena.tokens[id],
      usaVisao = cena.visibilidade === 'visao' || cena.visibilidade === 'nevoa_visao';
    fogCtx.clearRect(0, 0, w, h);
    if (!mostrarSegredos) {
      if (cena.visibilidade === 'nevoa' || cena.visibilidade === 'nevoa_visao')
        tracarNevoa(fogCtx, cena, w, h);
      if (usaVisao) desenharOcultacao(fogCtx, token ? poligonoVisao(token, token.visao) : [], w, h);
    }
    (nevoa.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
    luzCtx.clearRect(0, 0, w, h);
    brilhoCtx.clearRect(0, 0, w, h);
    if (cena.iluminacao.ativa && cena.visibilidade !== 'total') {
      const alpha = (1 - cena.iluminacao.ambiente / 100) * 0.88;
      luzCtx.fillStyle = `rgba(2,5,15,${alpha.toFixed(3)})`;
      luzCtx.fillRect(0, 0, w, h);
      for (const fonte of luzes) {
        luzCtx.save();
        caminhoPoligono(luzCtx, poligonoVisao(fonte.pos, fonte.alcance), w, h);
        luzCtx.clip();
        const x = (fonte.pos.x * w) / 100,
          y = (fonte.pos.y * h) / 100,
          r = (fonte.alcance * w) / 100;
        const grad = luzCtx.createRadialGradient(x, y, r * 0.06, x, y, r);
        grad.addColorStop(0, 'rgba(0,0,0,0.95)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        luzCtx.globalCompositeOperation = 'destination-out';
        luzCtx.fillStyle = grad;
        luzCtx.fillRect(x - r, y - r, r * 2, r * 2);
        luzCtx.restore();
        const segura = /^#[0-9a-f]{6}$/i.test(fonte.cor) ? fonte.cor : '#ffcd86';
        const rCor = parseInt(segura.slice(1, 3), 16),
          gCor = parseInt(segura.slice(3, 5), 16),
          bCor = parseInt(segura.slice(5, 7), 16);
        brilhoCtx.save();
        caminhoPoligono(brilhoCtx, poligonoVisao(fonte.pos, fonte.alcance), w, h);
        brilhoCtx.clip();
        const glow = brilhoCtx.createRadialGradient(x, y, 0, x, y, r);
        glow.addColorStop(0, `rgba(${rCor},${gCor},${bCor},0.29)`);
        glow.addColorStop(1, `rgba(${rCor},${gCor},${bCor},0)`);
        brilhoCtx.fillStyle = glow;
        brilhoCtx.fillRect(x - r, y - r, r * 2, r * 2);
        brilhoCtx.restore();
      }
    }
    (escurecimento.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
    (brilho.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
    const visao = usaVisao && token ? poligonoVisao(token, token.visao) : null;
    for (const [tokenId, render] of tokens) {
      const t = cena.tokens[tokenId];
      const mostra =
        mostrarSegredos ||
        id === tokenId ||
        (!t.oculto && nevoaReveladaNoPonto(cena, t) && (!visao || dentroPoligono(t, visao)));
      render.grupo.visible = mostra;
    }
  }
  let selecionado = '';
  function selecionar(id: string) {
    selecionado = id;
    for (const [key, r] of tokens) {
      (r.anel.material as THREE.MeshBasicMaterial).opacity = key === id ? 1 : 0.35;
      // O avatar controlado precisa continuar visível sobre a névoa, mesmo em área ainda não revelada.
      r.mesh.position.y = key === id ? 0.36 : 0.14;
      r.anel.position.y = key === id ? 0.35 : 0.11;
      // Escrever profundidade apenas no token controlado impede que o plano de névoa o esconda.
      r.mat.depthWrite = key === id;
      (r.anel.material as THREE.MeshBasicMaterial).depthWrite = key === id;
      r.mesh.renderOrder = key === id ? 32 : 12;
      r.anel.renderOrder = key === id ? 31 : 11;
    }
  }
  async function definirMapa(blob: Blob) {
    try {
      const tex = await carregarTextura(blob);
      if (!ativo) {
        tex.dispose();
        return;
      }
      const mat = piso.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.map = tex;
      mat.needsUpdate = true;
    } catch {
      /* mapa permanece em grade neutra */
    }
  }
  async function definirImagemToken(id: string, blob: Blob) {
    try {
      const tex = await carregarTextura(blob);
      const r = tokens.get(id);
      if (!ativo || !r) {
        tex.dispose();
        return;
      }
      r.texture.dispose();
      r.texture = tex;
      r.mat.map = tex;
      r.mat.needsUpdate = true;
    } catch {
      /* fallback sem imagem */
    }
  }
  function atualizarPosicao(id: string, p: PontoPct) {
    const r = tokens.get(id),
      t = cena.tokens[id];
    if (!r || !t) return;
    const m = posicaoMundo(p, dim);
    r.grupo.position.set(m.x, 0, m.z);
    t.x = p.x;
    t.y = p.y;
  }
  function liberar() {
    ativo = false;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((m) => {
          if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
  selecionar(selecionado);
  return {
    scene,
    dim,
    tokens,
    atualizarPosicao,
    selecionar,
    atualizarVisao,
    definirMapa,
    definirImagemToken,
    liberar,
  };
}
