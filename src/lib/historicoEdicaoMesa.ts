/**
 * Histórico de edições da cena — v29.8.
 * Apenas alterações gráficas da mesa entram no histórico: nenhuma operação altera
 * fichas, atributos, inventários, iniciativa ou os personagens da biblioteca.
 * SessionStorage permite que o iframe 3D e a Mesa 2D compartilhem o histórico.
 */
export const CAMPOS_EDITAVEIS = [
  'tokens',
  'barreiras',
  'fontesLuz',
  'marcadores',
  'desenhos',
  'nevoa',
] as const;
export type CamposEditaveis = (typeof CAMPOS_EDITAVEIS)[number];
export type InstantaneoMesa = Record<CamposEditaveis, unknown>;
export type HistoricoPasso = {
  tipo: 'cena' | 'cenario3d';
  antes: unknown;
  depois: unknown;
  quando: number;
};
type Pilhas = { desfazer: HistoricoPasso[]; refazer: HistoricoPasso[] };
const LIMITE = 35;
const chave = (campanha: string, cena: string) =>
  `portal-historico-edicao-v298:${campanha}:${cena}`;
export const extrairEdicaoCena = (cena: unknown): InstantaneoMesa => {
  const fonte = (cena && typeof cena === 'object' ? cena : {}) as Record<string, unknown>;
  return Object.fromEntries(
    CAMPOS_EDITAVEIS.map((k) => [k, structuredClone(fonte[k] ?? (k === 'tokens' ? {} : []))]),
  ) as InstantaneoMesa;
};
export const aplicarEdicaoCena = <T extends object>(cena: T, instantaneo: InstantaneoMesa): T => {
  const campos = extrairEdicaoCena(instantaneo);
  return { ...cena, ...campos };
};
const ler = (campanha: string, cena: string): Pilhas => {
  try {
    const raw = sessionStorage.getItem(chave(campanha, cena));
    if (raw) {
      const x = JSON.parse(raw) as Pilhas;
      if (Array.isArray(x.desfazer) && Array.isArray(x.refazer)) return x;
    }
  } catch {
    /* Histórico opcional: não interromper a mesa */
  }
  return { desfazer: [], refazer: [] };
};
const salvar = (campanha: string, cena: string, p: Pilhas) => {
  try {
    sessionStorage.setItem(chave(campanha, cena), JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
};
export function registrarEdicao(
  campanha: string,
  cena: string,
  tipo: HistoricoPasso['tipo'],
  antes: unknown,
  depois: unknown,
): boolean {
  if (!campanha || !cena || !antes || !depois) return false;
  const a = JSON.stringify(antes),
    b = JSON.stringify(depois);
  if (a === b) return false;
  const p = ler(campanha, cena),
    ultimo = p.desfazer[p.desfazer.length - 1];
  // O React pode repetir uma função atualizadora em StrictMode; não registrar duas vezes.
  if (
    ultimo &&
    ultimo.tipo === tipo &&
    JSON.stringify(ultimo.antes) === a &&
    JSON.stringify(ultimo.depois) === b &&
    Date.now() - ultimo.quando < 1200
  )
    return false;
  if (
    ultimo &&
    ultimo.tipo === 'cena' &&
    tipo === 'cena' &&
    JSON.stringify(ultimo.depois) === a &&
    continuacaoDoMesmoPincel(antes, depois)
  ) {
    ultimo.depois = structuredClone(depois);
    ultimo.quando = Date.now();
    p.refazer = [];
    return salvar(campanha, cena, p);
  }
  p.desfazer.push({
    tipo,
    antes: structuredClone(antes),
    depois: structuredClone(depois),
    quando: Date.now(),
  });
  p.desfazer = p.desfazer.slice(-LIMITE);
  p.refazer = [];
  if (salvar(campanha, cena, p)) return true;
  // Cenas com muitos traços podem superar o limite do navegador: tente reduzir o histórico.
  while (p.desfazer.length > 1) {
    p.desfazer.shift();
    if (salvar(campanha, cena, p)) return true;
  }
  return false;
}
/**
 * Um movimento contínuo do pincel não deve ocupar dezenas de entradas no
 * histórico: confirma o traço inteiro como uma única ação de edição.
 */
const continuacaoDoMesmoPincel = (anterior: unknown, atual: unknown): boolean => {
  if (!anterior || !atual || typeof anterior !== 'object' || typeof atual !== 'object')
    return false;
  const a = anterior as Record<string, unknown>,
    b = atual as Record<string, unknown>;
  const nevoaA = Array.isArray(a.nevoa) ? a.nevoa : [],
    nevoaB = Array.isArray(b.nevoa) ? b.nevoa : [];
  if (!nevoaA.length || nevoaA.length !== nevoaB.length) return false;
  for (const chave of CAMPOS_EDITAVEIS) {
    if (chave !== 'nevoa' && JSON.stringify(a[chave]) !== JSON.stringify(b[chave])) return false;
  }
  const ultimaA = nevoaA[nevoaA.length - 1],
    ultimaB = nevoaB[nevoaB.length - 1];
  if (
    !ultimaA ||
    !ultimaB ||
    ultimaA.id !== ultimaB.id ||
    !Array.isArray(ultimaA.pontos) ||
    !Array.isArray(ultimaB.pontos) ||
    ultimaB.pontos.length <= ultimaA.pontos.length
  )
    return false;
  if (JSON.stringify(nevoaA.slice(0, -1)) !== JSON.stringify(nevoaB.slice(0, -1))) return false;
  return (
    JSON.stringify({ ...ultimaA, pontos: ultimaB.pontos }) === JSON.stringify(ultimaB) &&
    JSON.stringify(ultimaA.pontos) ===
      JSON.stringify(ultimaB.pontos.slice(0, ultimaA.pontos.length))
  );
};
/** Consome um passo apenas mediante pedido explícito do mestre. */
export function passoEdicao(
  campanha: string,
  cena: string,
  direcao: 'desfazer' | 'refazer',
): { tipo: HistoricoPasso['tipo']; valor: unknown } | null {
  const p = ler(campanha, cena),
    origem = direcao === 'desfazer' ? p.desfazer : p.refazer,
    destino = direcao === 'desfazer' ? p.refazer : p.desfazer;
  const item = origem.pop();
  if (!item) return null;
  destino.push(item);
  destino.splice(0, Math.max(0, destino.length - LIMITE));
  if (!salvar(campanha, cena, p)) return null;
  return {
    tipo: item.tipo,
    valor: structuredClone(direcao === 'desfazer' ? item.antes : item.depois),
  };
}
export function historicoDisponivel(campanha: string, cena: string) {
  const p = ler(campanha, cena);
  return { desfazer: p.desfazer.length, refazer: p.refazer.length };
}
