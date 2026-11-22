/** Arte da rolagem: compartilhada somente no evento, sem publicar a biblioteca do jogador. */
import {
  activeForDie,
  getSavedDice,
  DICE_TYPE_LIST,
  type DiceSides,
  type DiceArtPackage,
} from '../hexatombe/diceLibrary';
import type { AparenciaDadosCompartilhada } from './api';

async function compactarFace(png: string): Promise<string> {
  if (!png.startsWith('data:image/png;base64,')) return '';
  return await new Promise((resolve) => {
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 112;
        canvas.height = 112;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(imagem, 0, 0, 112, 112);
        const resultado = canvas.toDataURL('image/png');
        resolve(resultado.length <= 85000 ? resultado : '');
      } catch {
        resolve('');
      }
    };
    imagem.onerror = () => resolve('');
    imagem.src = png;
  });
}

export async function capturarAparenciaDados(
  formula: string,
): Promise<AparenciaDadosCompartilhada | undefined> {
  const lados = /^\s*\d{1,2}d(4|6|8|10|12|20|100)/i.exec(formula);
  if (!lados) return undefined;
  const faces = Number(lados[1]) as DiceSides;
  if (!DICE_TYPE_LIST.includes(faces)) return undefined;
  const ativo = activeForDie(faces);
  if (ativo.kind === 'preset') return { tipo: 'preset', id: ativo.id };
  if (ativo.kind !== 'custom') return undefined;
  const item = await getSavedDice(ativo.id);
  if (!item || item.art.type !== faces) return undefined;
  const imagens: Record<string, string> = {};
  for (const [face, original] of Object.entries(item.art.artworkPNG || {})) {
    const reduzida = await compactarFace(original);
    if (reduzida) imagens[face] = reduzida;
  }
  // O atlas do destinatário é montado da MESMA arte, sem salvar arquivos
  // recebidos nem substituir as escolhas pessoais na biblioteca local.
  const original = item.art;
  const arte: DiceArtPackage = {
    format: 'hexatombe-dice-art',
    version: 1,
    name: original.name,
    type: original.type,
    material: original.material,
    baseColor: original.baseColor,
    border: original.border,
    showNumbers: original.showNumbers,
    numbering: original.numbering,
    faceLabels: original.faceLabels,
    artworkPNG: imagens,
  };
  // Requisição e evento SSE possuem limites para evitar payloads enormes.
  if (JSON.stringify(arte).length > 600_000) return { tipo: 'preset', id: 'marmore' };
  return { tipo: 'custom', arte };
}
