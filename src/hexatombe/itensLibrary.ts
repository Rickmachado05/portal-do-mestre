import { imagemItemValida, imagemConteudoValida } from './imagensItens.ts';
/** Biblioteca de itens do mestre (localStorage, incluída no backup do perfil).
 * Os inventários são cópias dos itens armazenadas nos personagens de cada campanha.
 */
export const ITENS_KEY = 'portal-mestre-itens-v1';
export type CategoriaItem =
  | 'arma'
  | 'consumivel'
  | 'comida'
  | 'acampamento'
  | 'equipamento'
  | 'material'
  | 'documento'
  | 'outro';
export type EfeitoItem = 'nenhum' | 'cura' | 'mana' | 'escudo' | 'dano';
export type ModeloItem = {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  efeito: EfeitoItem;
  valor: string;
  descricao: string;
  consumivel: boolean;
  imagem?: string;
  /** Conteúdo de leitura próprio do item: não depende do Diário para ser aberto. */
  conteudo?: string;
  imagemConteudo?: string;
  /** Vínculo de origem para atualizar o item do catálogo sem gerar duplicatas. */
  origemDiarioId?: string;
  origemCampanhaId?: string;
  criadoEm: string;
  atualizadoEm: string;
};
export type ItemInventario = Pick<
  ModeloItem,
  | 'nome'
  | 'categoria'
  | 'efeito'
  | 'valor'
  | 'descricao'
  | 'consumivel'
  | 'imagem'
  | 'conteudo'
  | 'imagemConteudo'
> & {
  id: string;
  catalogoId?: string;
  quantidade: number;
  equipado: boolean;
};
export const CATEGORIAS: Record<CategoriaItem, string> = {
  arma: 'Arma',
  consumivel: 'Consumível',
  comida: 'Comida',
  acampamento: 'Acampamento',
  equipamento: 'Equipamento',
  material: 'Material',
  documento: 'Documento',
  outro: 'Outro',
};
export const EFEITOS: Record<EfeitoItem, string> = {
  nenhum: 'Sem efeito automático',
  cura: 'Recuperar HP',
  mana: 'Recuperar Mana/Foco',
  escudo: 'Conceder escudo',
  dano: 'Dano / rolagem',
};
const categorias = Object.keys(CATEGORIAS) as CategoriaItem[];
const efeitos = Object.keys(EFEITOS) as EfeitoItem[];
const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const objeto = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const texto = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';
const escolha = <T extends string>(value: unknown, lista: readonly T[], padrao: T): T =>
  lista.includes(value as T) ? (value as T) : padrao;
function validar(value: unknown): ModeloItem | null {
  if (!objeto(value)) return null;
  const nome = texto(value.nome, 80).trim();
  if (!nome) return null;
  return {
    id: texto(value.id, 110) || novoId(),
    nome,
    categoria: escolha(value.categoria, categorias, 'outro'),
    efeito: escolha(value.efeito, efeitos, 'nenhum'),
    valor: texto(value.valor, 32).trim(),
    descricao: texto(value.descricao, 650),
    consumivel: Boolean(value.consumivel),
    ...(imagemItemValida(value.imagem) ? { imagem: value.imagem } : {}),
    ...(typeof value.conteudo === 'string' && value.conteudo.trim()
      ? { conteudo: value.conteudo.slice(0, 18000) }
      : {}),
    ...(imagemConteudoValida(value.imagemConteudo) ? { imagemConteudo: value.imagemConteudo } : {}),
    ...(typeof value.origemDiarioId === 'string' && value.origemDiarioId.length <= 140
      ? { origemDiarioId: value.origemDiarioId }
      : {}),
    ...(typeof value.origemCampanhaId === 'string' && value.origemCampanhaId.length <= 140
      ? { origemCampanhaId: value.origemCampanhaId }
      : {}),
    criadoEm: texto(value.criadoEm, 40) || new Date().toISOString(),
    atualizadoEm: texto(value.atualizadoEm, 40) || new Date().toISOString(),
  };
}
export function listarItens(): ModeloItem[] {
  try {
    const dados = JSON.parse(localStorage.getItem(ITENS_KEY) || '[]') as unknown;
    return Array.isArray(dados)
      ? dados
          .slice(0, 500)
          .map(validar)
          .filter((x): x is ModeloItem => x !== null)
      : [];
  } catch {
    return [];
  }
}
export function salvarItem(
  dados: Pick<
    ModeloItem,
    | 'nome'
    | 'categoria'
    | 'efeito'
    | 'valor'
    | 'descricao'
    | 'consumivel'
    | 'imagem'
    | 'conteudo'
    | 'imagemConteudo'
  > &
    Partial<Pick<ModeloItem, 'origemDiarioId' | 'origemCampanhaId'>>,
  itemId?: string,
): ModeloItem {
  if (dados.imagem && !imagemItemValida(dados.imagem))
    throw new Error('Imagem inválida: escolha PNG, JPG ou WebP pelo formulário.');
  if (dados.imagemConteudo && !imagemConteudoValida(dados.imagemConteudo))
    throw new Error('Imagem de leitura inválida: use PNG, JPG ou WebP.');
  if (dados.conteudo && dados.conteudo.length > 18000)
    throw new Error('O texto do documento deve ter até 18.000 caracteres.');
  const dadosValidados =
    dados.categoria === 'documento'
      ? { ...dados, efeito: 'nenhum' as const, valor: '', consumivel: false }
      : dados;
  const itens = listarItens();
  const anterior = itemId ? itens.find((x) => x.id === itemId) : undefined;
  if (itemId && !anterior) throw new Error('O item não foi encontrado para edição.');
  if (!itemId && itens.length >= 500) throw new Error('Limite de 500 itens na biblioteca.');
  const agora = new Date().toISOString();
  const item = validar({
    ...dadosValidados,
    origemDiarioId: dados.origemDiarioId ?? anterior?.origemDiarioId,
    origemCampanhaId: dados.origemCampanhaId ?? anterior?.origemCampanhaId,
    id: anterior?.id || novoId(),
    criadoEm: anterior?.criadoEm || agora,
    atualizadoEm: agora,
  });
  if (!item) throw new Error('Informe o nome do item.');
  if (item.efeito !== 'nenhum' && item.valor && !analisarValorItem(item.valor))
    throw new Error('Efeito inválido: informe um número ou dados como 1d6+2 (máximo 8 dados).');
  const atualizados = itemId ? itens.map((x) => (x.id === itemId ? item : x)) : [...itens, item];
  try {
    localStorage.setItem(ITENS_KEY, JSON.stringify(atualizados));
  } catch {
    throw new Error(
      'Sem espaço no navegador para salvar o item. Remova imagens grandes ou libere espaço local.',
    );
  }
  window.dispatchEvent(new Event('portal-mestre-itens-alterados'));
  return item;
}
export function excluirItem(id: string): void {
  localStorage.setItem(ITENS_KEY, JSON.stringify(listarItens().filter((x) => x.id !== id)));
  window.dispatchEvent(new Event('portal-mestre-itens-alterados'));
}
export function copiarParaInventario(item: ModeloItem, quantidade = 1): ItemInventario {
  return {
    id: novoId(),
    catalogoId: item.id,
    nome: item.nome,
    categoria: item.categoria,
    efeito: item.efeito,
    valor: item.valor,
    descricao: item.descricao,
    consumivel: item.consumivel,
    ...(item.imagem ? { imagem: item.imagem } : {}),
    ...(item.conteudo ? { conteudo: item.conteudo } : {}),
    ...(item.imagemConteudo ? { imagemConteudo: item.imagemConteudo } : {}),
    quantidade: Math.max(1, Math.min(999, Math.trunc(quantidade) || 1)),
    equipado: false,
  };
}
export function adicionarItemInventario(
  atual: ItemInventario[],
  item: ModeloItem,
  quantidade = 1,
): ItemInventario[] {
  const q = Math.max(1, Math.min(999, Math.trunc(quantidade) || 1));
  const pos = atual.findIndex(
    (x) =>
      x.catalogoId === item.id &&
      x.nome === item.nome &&
      x.valor === item.valor &&
      x.efeito === item.efeito &&
      x.categoria === item.categoria &&
      x.consumivel === item.consumivel &&
      x.descricao === item.descricao &&
      (x.imagem || '') === (item.imagem || '') &&
      (x.conteudo || '') === (item.conteudo || '') &&
      (x.imagemConteudo || '') === (item.imagemConteudo || ''),
  );
  if (pos < 0) return [...atual, copiarParaInventario(item, q)];
  return atual.map((x, i) =>
    i === pos ? { ...x, quantidade: Math.min(9999, x.quantidade + q) } : x,
  );
}
/** Transferência local e integralmente validada entre inventários da mesma campanha.
 * Não aplica efeitos de combate; apenas move uma quantidade, sem duplicar unidades.
 * Duas pilhas só se unem se todas as propriedades narrativas, visuais e mecânicas coincidirem.
 */
function mesmaPilha(a: ItemInventario, b: ItemInventario): boolean {
  return (
    (a.catalogoId || '') === (b.catalogoId || '') &&
    a.nome === b.nome &&
    a.categoria === b.categoria &&
    a.efeito === b.efeito &&
    a.valor === b.valor &&
    a.descricao === b.descricao &&
    a.consumivel === b.consumivel &&
    (a.imagem || '') === (b.imagem || '') &&
    (a.conteudo || '') === (b.conteudo || '') &&
    (a.imagemConteudo || '') === (b.imagemConteudo || '')
  );
}
export function transferirItemInventario(
  origem: ItemInventario[],
  destino: ItemInventario[],
  itemId: string,
  quantidade: number,
): {
  origem: ItemInventario[];
  destino: ItemInventario[];
  item: ItemInventario;
} {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 9999)
    throw new Error('Informe uma quantidade inteira válida para transferir.');
  const item = origem.find((x) => x.id === itemId);
  if (!item || !Number.isSafeInteger(item.quantidade) || quantidade > item.quantidade)
    throw new Error('O personagem não possui essa quantidade do item.');
  const pilha = destino.find((x) => mesmaPilha(x, item));
  if (pilha && pilha.quantidade + quantidade > 9999)
    throw new Error('O destinatário atingiria o limite de 9999 unidades nessa pilha.');
  const novaOrigem = origem.flatMap((x) =>
    x.id !== itemId
      ? [x]
      : x.quantidade > quantidade
        ? [{ ...x, quantidade: x.quantidade - quantidade }]
        : [],
  );
  const novoDestino = pilha
    ? destino.map((x) => (x.id === pilha.id ? { ...x, quantidade: x.quantidade + quantidade } : x))
    : [...destino, { ...item, id: novoId(), quantidade, equipado: false }];
  return { origem: novaOrigem, destino: novoDestino, item };
}
export function consumirItem(atual: ItemInventario[], id: string): ItemInventario[] {
  return atual.flatMap((item) =>
    item.id !== id
      ? [item]
      : item.quantidade > 1
        ? [{ ...item, quantidade: item.quantidade - 1 }]
        : [],
  );
}
export type ValorItem = { tipo: 'fixo'; valor: number } | { tipo: 'dados'; formula: string };
export function analisarValorItem(entrada: string): ValorItem | null {
  const limpo = entrada.trim().toLowerCase().replace(/\s+/g, '');
  if (/^\d{1,4}$/.test(limpo)) {
    const n = Number(limpo);
    return n > 0 && n <= 9999 ? { tipo: 'fixo', valor: n } : null;
  }
  const match = /^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/.exec(limpo);
  if (!match) return null;
  const qtd = Number(match[1]),
    mod = Number(match[3] || '0');
  return qtd >= 1 && qtd <= 8 && Math.abs(mod) <= 999 ? { tipo: 'dados', formula: limpo } : null;
}
export function aplicarDanoComEscudo(hp: number, escudo: number, dano: number) {
  const valor = Math.max(0, Math.trunc(dano) || 0);
  const atual = Math.max(0, Math.trunc(escudo) || 0);
  const absorvido = Math.min(atual, valor);
  const danoHp = Math.min(Math.max(0, Math.trunc(hp) || 0), valor - absorvido);
  return {
    hp: Math.max(0, (Math.trunc(hp) || 0) - danoHp),
    escudo: atual - absorvido,
    absorvido,
    danoHp,
  };
}
export function concederEscudo(atual: number, novo: number) {
  // O padrão do Ímpeto para escudos temporários é manter o maior, sem somar.
  return Math.max(0, Math.trunc(atual) || 0, Math.trunc(novo) || 0);
}
