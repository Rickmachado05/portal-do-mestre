/**
 * Ateliê → Dice Box 1.1.4. Gera um atlas UV real para os modelos originais,
 * sem tocar nos colliders nem na tabela de resultados do motor.
 *
 * O Dice Box carrega temas por URL. O service worker serve APENAS os assets
 * transitórios de temas personalizados, registrados no CacheStorage.
 */
import atlasLayout from './atlasLayout.json';
import { diceFaceCount, diceFaceValue, type DiceSides } from './diceLibrary';
import type { DiceArtPackage, SavedDiceArt } from './diceLibrary';

const CACHE_NAME = 'hexatombe-dice-themes-v1';
const BASE = '/assets/dice-box/themes/';
const SIZE = 1024;
const ART = 512;
const HEX = /^#[0-9a-f]{6}$/i;

type FaceAtlas = { rect: [number, number, number, number]; clip: [number, number][] };
function createCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não disponível.');
  return ctx;
}
function cleanColor(input: unknown, fallback: string): string {
  return typeof input === 'string' && HEX.test(input) ? input : fallback;
}
function rng(seed: number) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}
function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
function lighter(h: string, d: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) + d))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function drawMaterial(ctx: CanvasRenderingContext2D, art: DiceArtPackage, face: number) {
  ctx.fillStyle = cleanColor(art.baseColor, '#72527a');
  ctx.fillRect(0, 0, ART, ART);
  const mat = art.material;
  const gradient = ctx.createLinearGradient(0, 0, ART, ART);
  gradient.addColorStop(0, rgba('#ffffff', mat === 'metal' ? 0.3 : 0.15));
  gradient.addColorStop(0.5, 'rgba(0,0,0,.06)');
  gradient.addColorStop(1, rgba('#000000', mat === 'metal' ? 0.48 : 0.27));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ART, ART);
  if (mat === 'liso') return;
  const r = rng(98471 + face * 131 + mat.length * 59);
  if (mat === 'pergaminho') {
    ctx.fillStyle = 'rgba(255,247,206,.29)';
    ctx.fillRect(0, 0, ART, ART);
  }
  const count =
    mat === 'pedra'
      ? 1300
      : mat === 'sangue'
        ? 110
        : mat === 'metal'
          ? 650
          : mat === 'pergaminho'
            ? 850
            : 800;
  for (let i = 0; i < count; i++) {
    const x = r() * ART,
      y = r() * ART,
      rad = mat === 'pedra' ? r() * 3.8 : mat === 'sangue' ? r() * 5 : r() * 2.2;
    ctx.globalAlpha = mat === 'sangue' ? 0.37 : 0.06 + r() * 0.13;
    ctx.fillStyle = mat === 'sangue' ? '#b0080c' : r() > 0.48 ? '#faf0df' : '#000';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (mat === 'obsidiana' || mat === 'pedra') {
    for (let j = 0; j < (mat === 'pedra' ? 17 : 29); j++) {
      let x = r() * ART,
        y = r() * ART;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += r() * 65 - 32;
        y += r() * 65 - 32;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = mat === 'pedra' ? 'rgba(21,16,13,.15)' : 'rgba(226,163,157,.08)';
      ctx.lineWidth = 1 + r() * 2;
      ctx.stroke();
    }
  }
  if (mat === 'metal')
    for (let i = 0; i < ART; i += 3) {
      ctx.strokeStyle = 'rgba(255,255,255,.045)';
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(ART, i - 38);
      ctx.stroke();
    }
  if (mat === 'sangue')
    for (let i = 0; i < 21; i++) {
      ctx.fillStyle = `rgba(106,2,9,${0.2 + r() * 0.36})`;
      ctx.beginPath();
      ctx.arc(r() * ART, r() * ART, r() * 32 + 4, 0, 7);
      ctx.fill();
    }
}
function border(ctx: CanvasRenderingContext2D, art: DiceArtPackage) {
  const b = art.border,
    st = b?.style || 'nenhuma';
  if (st === 'nenhuma') return;
  const color = cleanColor(b?.color, '#d9aa70'),
    w = Math.max(3, Math.min(40, Number(b?.width) || 15));
  const inset = 22 + w / 2;
  const edge = (i: number, l: number) => {
    ctx.lineWidth = l;
    ctx.strokeRect(i, i, ART - 2 * i, ART - 2 * i);
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (st === 'simples') {
    ctx.strokeStyle = color;
    edge(inset, w);
    ctx.strokeStyle = 'rgba(255,255,255,.27)';
    edge(inset + w * 0.3, 1.5);
  }
  if (st === 'dupla') {
    ctx.strokeStyle = color;
    edge(inset, w * 0.65);
    edge(inset + w * 1.8, Math.max(2, w * 0.32));
  }
  if (st === 'metal') {
    ctx.strokeStyle = 'rgba(0,0,0,.54)';
    edge(inset - w * 0.24, w * 1.5);
    const g = ctx.createLinearGradient(0, 0, ART, ART);
    g.addColorStop(0, lighter(color, 84));
    g.addColorStop(0.33, color);
    g.addColorStop(0.66, lighter(color, -65));
    g.addColorStop(1, lighter(color, 36));
    ctx.strokeStyle = g;
    edge(inset, w);
    ctx.strokeStyle = 'rgba(255,255,255,.52)';
    edge(inset + w * 0.45, Math.max(1, w * 0.13));
  }
  if (st === 'runa') {
    ctx.strokeStyle = color;
    edge(inset, Math.max(2, w * 0.48));
    ctx.fillStyle = color;
    ctx.font = `${Math.round(12 + w * 0.65)}px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < 6; j++) {
      const x = 58 + (j * (ART - 116)) / 5;
      ctx.fillText('✧', x, inset + w * 1.3);
      ctx.fillText('◇', x, ART - inset - w * 1.3);
    }
  }
  if (st === 'fissura') {
    ctx.strokeStyle = color;
    ctx.setLineDash([w * 2, w * 0.58, w * 0.7, w * 1.4]);
    edge(inset, Math.max(2, w * 0.65));
    ctx.setLineDash([]);
  }
  ctx.restore();
}
async function loadImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A pintura PNG de uma face não pôde ser lida.'));
    image.src = data;
  });
}
const fonts: Record<string, string> = {
  cerimonial: 'Georgia,"Times New Roman","Noto Sans CJK JP","Microsoft YaHei",sans-serif',
  classico: 'Georgia,"Noto Sans CJK JP",serif',
  moderno: 'Arial,"Noto Sans CJK JP","Segoe UI Symbol",sans-serif',
  manuscrito: '"Palatino Linotype",Georgia,"Noto Sans CJK JP",serif',
};
function drawLabel(
  ctx: CanvasRenderingContext2D,
  art: DiceArtPackage,
  face: number,
  percentileUnit = false,
) {
  if (art.showNumbers === false) return;
  const real = diceFaceValue(art.type as DiceSides, face);
  const standard =
    art.type === 100 && real === 0 ? '00' : percentileUnit && face === 10 ? '0' : String(real);
  let lbl = art.faceLabels?.[face - 1] ?? standard;
  if (percentileUnit && face === 10 && lbl === '10') lbl = '0';
  if (!lbl) return;
  const num = art.numbering;
  const color = cleanColor(num?.color, '#ffe5b5');
  const family = fonts[num?.font || 'cerimonial'] || fonts.cerimonial;
  const weight = num?.font === 'moderno' ? '700' : '600';
  let size = Math.round((250 * Math.max(45, Math.min(150, num?.size ?? 100))) / 100);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px ${family}`;
  size = Math.max(
    22,
    Math.min(size, Math.floor((size * 375) / Math.max(1, ctx.measureText(lbl).width))),
  );
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.fillText(lbl, 256, 258, 390);
  if (num?.realValueHint !== false && lbl !== standard) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.beginPath();
    ctx.roundRect(402, 419, 75, 60, 13);
    ctx.fill();
    ctx.font = 'bold 38px Arial,sans-serif';
    ctx.fillStyle = '#fff3d6';
    ctx.fillText(standard, 439, 450, 60);
  }
  ctx.restore();
}
async function drawFace(art: DiceArtPackage, face: number, percentileUnit = false) {
  const c = createCanvas(ART),
    ctx = context(c);
  drawMaterial(ctx, art, face);
  const image = art.artworkPNG?.[String(face)];
  if (image) ctx.drawImage(await loadImage(image), 0, 0, ART, ART);
  border(ctx, art);
  drawLabel(ctx, art, face, percentileUnit);
  return c;
}

/** Pinta uma malha física na região UV certa, sem alterar o mapeamento de colisão. */
async function drawAtlasFaces(
  ctx: CanvasRenderingContext2D,
  art: DiceArtPackage,
  percentileUnit = false,
) {
  const layout = (atlasLayout as unknown as Record<string, Record<string, FaceAtlas>>)[
    String(art.type)
  ];
  if (!layout) throw new Error(`Não há atlas para D${art.type}.`);
  for (let value = 1; value <= diceFaceCount(art.type); value++) {
    const dest = layout[String(value)],
      face = await drawFace(art, value, percentileUnit);
    if (!dest) throw new Error(`UV da face ${value} do D${art.type} não encontrado.`);
    const [left, top, width, height] = dest.rect;
    ctx.save();
    ctx.beginPath();
    dest.clip.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(face, left, top, width, height);
    ctx.restore();
  }
}
/** O D100 físico possui um dado de dezenas (10 faces) e outro de unidades (D10).
 * A textura do tema precisa cobrir os dois na MESMA imagem UV. */
export async function generateDiceAtlas(
  art: DiceArtPackage,
  companionD10?: DiceArtPackage,
): Promise<Blob> {
  const atlas = createCanvas(SIZE),
    ctx = context(atlas);
  ctx.fillStyle = cleanColor(art.baseColor, '#72527a');
  ctx.fillRect(0, 0, SIZE, SIZE);
  await drawAtlasFaces(ctx, art);
  if (art.type === 100) {
    const fallback: DiceArtPackage = {
      ...art,
      type: 10,
      faceLabels: Array.from({ length: 10 }, (_, i) => (i === 9 ? '0' : String(i + 1))),
      faceValues: Array.from({ length: 10 }, (_, i) => (i === 9 ? 0 : i + 1)),
      artworkPNG: {},
    };
    await drawAtlasFaces(ctx, companionD10 || fallback, true);
  }
  return new Promise((resolve, reject) =>
    atlas.toBlob((b) => (b ? resolve(b) : reject(Error('Falha ao gerar atlas PNG.'))), 'image/png'),
  );
}

let swPromise: Promise<void> | null = null;
async function ensureServiceWorker(): Promise<void> {
  if (!swPromise)
    swPromise = (async () => {
      if (!('serviceWorker' in navigator) || !('caches' in window))
        throw new Error(
          'Temas 3D personalizados exigem localhost ou HTTPS e suporte a Service Worker.',
        );
      await navigator.serviceWorker.register('/hexatombe-dice-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await Promise.race([
          new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
              once: true,
            });
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(Error('O navegador não ativou o tema 3D. Recarregue a página uma vez.')),
              5000,
            ),
          ),
        ]);
      }
    })().catch((e) => {
      swPromise = null;
      throw e;
    });
  return swPromise;
}
const prepared = new Map<string, Promise<string>>();
/** Nome do tema utilizado em motor.updateConfig({theme}) */
export async function prepareDiceTheme(
  item: SavedDiceArt,
  companionD10?: SavedDiceArt,
): Promise<string> {
  // Nome único sempre que o conjunto é editado, para impedir cache visual desatualizado.
  const id =
    `hx-${item.id.replace(/[^a-z0-9-]/gi, '').slice(0, 25)}-${new Date(item.updatedAt).getTime()}` +
    (companionD10 && item.art.type === 100
      ? `-${companionD10.id.replace(/[^a-z0-9-]/gi, '').slice(0, 20)}-${new Date(companionD10.updatedAt).getTime()}`
      : '');
  if (!prepared.has(id))
    prepared.set(
      id,
      (async () => {
        await ensureServiceWorker();
        const cache = await caches.open(CACHE_NAME);
        const root = `${BASE}${id}/`;
        if (!(await cache.match(root + 'theme.config.json'))) {
          const atlas = await generateDiceAtlas(item.art, companionD10?.art);
          const config = {
            name: item.art.name,
            systemName: id,
            author: 'Hexatombe: Avatar',
            version: 1,
            meshFile: 'default.json',
            material: {
              type: 'standard',
              diffuseTexture: 'diffuse.png',
              diffuseLevel: 1,
              bumpTexture: '../default/normal.png',
              bumpLevel: 0.35,
              specularTexture: '../default/specular.jpg',
              specularPower: 1,
            },
            diceAvailable: item.art.type === 100 ? ['d10', 'd100'] : [`d${item.art.type}`],
          };
          // Gravar primeiro a textura; publicar config por último evita tema incompleto.
          await cache.put(
            root + 'diffuse.png',
            new Response(atlas, { headers: { 'Content-Type': 'image/png' } }),
          );
          await cache.put(
            root + 'theme.config.json',
            new Response(JSON.stringify(config), {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
          );
        }
        return id;
      })().catch((e) => {
        prepared.delete(id);
        throw e;
      }),
    );
  return prepared.get(id)!;
}
