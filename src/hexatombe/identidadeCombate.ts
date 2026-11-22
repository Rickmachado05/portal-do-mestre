import type { FichaDados } from './fichasLibrary';

const ELEMENTOS: Record<string, string> = {
  agua: 'Água',
  fogo: 'Fogo',
  terra: 'Terra',
  ar: 'Ar',
  nao: 'Não dobrador',
};
const CLASSES: Record<string, string> = {
  lutador: 'Lutador',
  frente: 'Linha de Frente',
  'linha de frente': 'Linha de Frente',
  conjurador: 'Conjurador',
};

/**
 * A unidade já guarda "Água · Conjurador" para compatibilidade com fichas antigas.
 * Não acrescentar a classe de novo quando existir uma ficha vinculada.
 */
export function identidadeCombate(elementoUnidade: string, ficha?: FichaDados): string {
  const partes = (elementoUnidade || '')
    .split(/\s*[·•]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const normalizar = (valor: string, opcoes: Record<string, string>) =>
    opcoes[valor.toLocaleLowerCase('pt-BR')] || valor;
  const elemento = partes[0] || normalizar((ficha?.element || '').trim(), ELEMENTOS);
  const classeBruta = (ficha?.class || ficha?.editorOriginal?.classe || partes[1] || '').trim();
  const classe = classeBruta ? normalizar(classeBruta, CLASSES) : '';
  return [elemento, classe].filter(Boolean).join(' · ');
}
