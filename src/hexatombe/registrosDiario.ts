/** Biblioteca de documentos da campanha. Separada do Caderno do Mestre e do histórico de dados. */
export const MAX_PAGINAS_DIARIO = 120;
export const MAX_TEXTO_PAGINA = 40000;
export const MAX_TITULO_PAGINA = 110;
export const MAX_IMAGEM_DIARIO = 550000; // Base64 compactado para caber no backup local.
export const CATEGORIAS_DIARIO = [
  { id: 'sessao', rotulo: 'Sessão', icone: '◷' },
  { id: 'historia', rotulo: 'História', icone: '✧' },
  { id: 'personagem', rotulo: 'Personagem', icone: '♟' },
  { id: 'local', rotulo: 'Local', icone: '⌖' },
  { id: 'pista', rotulo: 'Pista', icone: '◇' },
  { id: 'outro', rotulo: 'Outros', icone: '▤' },
] as const;
export type CategoriaDiario = (typeof CATEGORIAS_DIARIO)[number]['id'];
export type TipoEntradaDiario = 'nota' | 'imagem' | 'pasta';
export type PermissaoDiario = 'ver' | 'editar';
export type PaginaDiario = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: CategoriaDiario;
  fixada: boolean;
  criadaEm: string;
  atualizadaEm: string;
  /** Campos adicionados na 1.3.40.45; opcionais para suportar páginas legadas. */
  tipo?: TipoEntradaDiario;
  pastaId?: string;
  formato?: 'texto' | 'html';
  imagem?: string;
  compartilhadoCom?: Record<string, PermissaoDiario>;
};
export type CamposDiario = Partial<
  Pick<
    PaginaDiario,
    | 'titulo'
    | 'conteudo'
    | 'categoria'
    | 'fixada'
    | 'tipo'
    | 'pastaId'
    | 'formato'
    | 'imagem'
    | 'compartilhadoCom'
  >
>;
export type OperacaoDiario =
  | { tipo: 'criar'; pagina: PaginaDiario }
  | { tipo: 'alterar'; id: string; campos: CamposDiario; data?: string }
  | { tipo: 'excluir'; id: string }
  | { tipo: 'duplicar'; id: string; pagina: PaginaDiario };
const objeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const iso = (valor: unknown): string =>
  typeof valor === 'string' && Number.isFinite(Date.parse(valor))
    ? new Date(valor).toISOString()
    : new Date().toISOString();
const categoria = (v: unknown): CategoriaDiario =>
  CATEGORIAS_DIARIO.some((c) => c.id === v) ? (v as CategoriaDiario) : 'outro';
const tipo = (v: unknown): TipoEntradaDiario => (v === 'pasta' || v === 'imagem' ? v : 'nota');
const textoSeguro = (s: unknown, max: number): string =>
  typeof s === 'string' ? s.slice(0, max) : '';
const idSeguro = (s: unknown): string => textoSeguro(s, 140).trim();
const formato = (s: unknown): 'html' | 'texto' => (s === 'html' ? 'html' : 'texto');
const imagemSegura = (v: unknown): string =>
  typeof v === 'string' &&
  v.length <= MAX_IMAGEM_DIARIO &&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)
    ? v
    : '';
export function normalizarPermissoesDiario(valor: unknown): Record<string, PermissaoDiario> {
  if (!objeto(valor)) return {};
  const saida: Record<string, PermissaoDiario> = {};
  for (const [chave, permissao] of Object.entries(valor).slice(0, 80)) {
    if (chave.trim() && chave.length <= 140 && (permissao === 'ver' || permissao === 'editar'))
      saida[chave] = permissao;
  }
  return saida;
}
export function criarPaginaDiario(
  titulo = 'Nova nota',
  cat: CategoriaDiario = 'sessao',
  data = new Date().toISOString(),
  id?: string,
): PaginaDiario {
  const chave =
    id ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `pagina-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    id: chave,
    titulo: titulo.slice(0, MAX_TITULO_PAGINA),
    conteudo: '',
    categoria: cat,
    fixada: false,
    criadaEm: iso(data),
    atualizadaEm: iso(data),
    tipo: 'nota',
    formato: 'texto',
    pastaId: '',
    imagem: '',
    compartilhadoCom: {},
  };
}
/** Migração não destrutiva: texto e páginas da versão anterior são preservados. */
export function normalizarPaginasDiario(entrada: unknown, textoLegado?: unknown): PaginaDiario[] {
  if (!Array.isArray(entrada)) {
    const antigo = textoSeguro(textoLegado, MAX_TEXTO_PAGINA);
    if (!antigo.trim()) return [];
    return [
      {
        ...criarPaginaDiario(
          'Anotações anteriores',
          'sessao',
          new Date().toISOString(),
          'pagina-legada-v13444',
        ),
        conteudo: antigo,
      },
    ];
  }
  const ids = new Set<string>();
  const paginas: PaginaDiario[] = [];
  for (const value of entrada.slice(0, MAX_PAGINAS_DIARIO)) {
    if (!objeto(value) || typeof value.id !== 'string' || !value.id.trim()) continue;
    const id = idSeguro(value.id);
    if (ids.has(id)) continue;
    ids.add(id);
    paginas.push({
      id,
      titulo: textoSeguro(value.titulo, MAX_TITULO_PAGINA),
      conteudo: textoSeguro(value.conteudo, MAX_TEXTO_PAGINA),
      categoria: categoria(value.categoria),
      fixada: value.fixada === true,
      criadaEm: iso(value.criadaEm),
      atualizadaEm: iso(value.atualizadaEm),
      tipo: tipo(value.tipo),
      pastaId: idSeguro(value.pastaId),
      formato: formato(value.formato),
      imagem: imagemSegura(value.imagem),
      compartilhadoCom: normalizarPermissoesDiario(value.compartilhadoCom),
    });
  }
  const pastas = new Set(paginas.filter((p) => p.tipo === 'pasta').map((p) => p.id));
  return paginas.map((p) => ({
    ...p,
    pastaId: p.tipo === 'pasta' || !pastas.has(p.pastaId || '') ? '' : p.pastaId,
  }));
}
/** Atualização atômica de um documento sem sobrescrever cenas, HP, fichas ou inventários. */
export function aplicarOperacaoDiario(paginas: PaginaDiario[], op: OperacaoDiario): PaginaDiario[] {
  if (op.tipo === 'criar' || op.tipo === 'duplicar') {
    if (
      paginas.length >= MAX_PAGINAS_DIARIO ||
      paginas.some((p) => p.id === op.pagina.id) ||
      (op.tipo === 'duplicar' && !paginas.some((p) => p.id === op.id))
    )
      return paginas;
    const nova = normalizarPaginasDiario([...paginas, op.pagina]).at(-1);
    return nova ? [...paginas, nova] : paginas;
  }
  if (op.tipo === 'excluir') {
    const alvo = paginas.find((p) => p.id === op.id);
    if (!alvo) return paginas;
    // Excluir pasta nunca apaga notas contidas nela: movê-las para a raiz.
    return paginas
      .filter((p) => p.id !== op.id)
      .map((p) => (p.pastaId === op.id ? { ...p, pastaId: '' } : p));
  }
  if (!paginas.some((p) => p.id === op.id)) return paginas;
  const campos = op.campos;
  const proximaPasta = campos.pastaId === undefined ? undefined : idSeguro(campos.pastaId);
  const pastaValida =
    proximaPasta === undefined
      ? undefined
      : proximaPasta && paginas.some((p) => p.id === proximaPasta && p.tipo === 'pasta')
        ? proximaPasta
        : '';
  return paginas.map((p) =>
    p.id === op.id
      ? {
          ...p,
          ...(typeof campos.titulo === 'string'
            ? { titulo: campos.titulo.slice(0, MAX_TITULO_PAGINA) }
            : {}),
          ...(typeof campos.conteudo === 'string'
            ? { conteudo: campos.conteudo.slice(0, MAX_TEXTO_PAGINA) }
            : {}),
          ...(campos.categoria !== undefined ? { categoria: categoria(campos.categoria) } : {}),
          ...(typeof campos.fixada === 'boolean' ? { fixada: campos.fixada } : {}),
          ...(campos.tipo !== undefined ? { tipo: tipo(campos.tipo) } : {}),
          ...(pastaValida !== undefined ? { pastaId: p.tipo === 'pasta' ? '' : pastaValida } : {}),
          ...(campos.formato !== undefined ? { formato: formato(campos.formato) } : {}),
          ...(campos.imagem !== undefined ? { imagem: imagemSegura(campos.imagem) } : {}),
          ...(campos.compartilhadoCom !== undefined
            ? { compartilhadoCom: normalizarPermissoesDiario(campos.compartilhadoCom) }
            : {}),
          atualizadaEm: iso(op.data),
        }
      : p,
  );
}
export function permissaoDePersonagemDiario(
  pagina: PaginaDiario,
  personagemId: string,
): PermissaoDiario | null {
  return pagina.compartilhadoCom?.[personagemId] || null;
}
export function permissaoEfetivaDiario(
  pagina: PaginaDiario,
  paginas: PaginaDiario[],
  personagemId: string,
): PermissaoDiario | null {
  const direta = permissaoDePersonagemDiario(pagina, personagemId);
  if (direta) return direta;
  const pasta = paginas.find((p) => p.id === pagina.pastaId && p.tipo === 'pasta');
  return pasta ? permissaoDePersonagemDiario(pasta, personagemId) : null;
}
export function conteudosCompartilhadosDiario(
  paginas: PaginaDiario[],
  personagemId: string,
): PaginaDiario[] {
  return paginas.filter((p) => !!permissaoEfetivaDiario(p, paginas, personagemId));
}
export function filtrarPaginasDiario(
  paginas: PaginaDiario[],
  busca: string,
  cat: string,
): PaginaDiario[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  return paginas
    .filter(
      (p) =>
        (cat === 'todas' || p.categoria === cat) &&
        (!termo ||
          `${p.titulo}\n${p.conteudo.replace(/<[^>]+>/g, ' ')} `
            .toLocaleLowerCase('pt-BR')
            .includes(termo)),
    )
    .sort(
      (a, b) =>
        Number(b.fixada) - Number(a.fixada) ||
        b.atualizadaEm.localeCompare(a.atualizadaEm) ||
        a.id.localeCompare(b.id),
    );
}
/** Converte um documento rico em texto portátil. Não exporta binários inline no Markdown. */
export function exportarDiarioMarkdown(paginas: PaginaDiario[], campanha: string): string {
  const titulo = campanha.trim() || 'Campanha';
  return (
    `# Diário — ${titulo}\n\n` +
    filtrarPaginasDiario(paginas, '', 'todas')
      .map((p) => {
        const cat = CATEGORIAS_DIARIO.find((c) => c.id === p.categoria)?.rotulo || 'Outros';
        const conteudo =
          p.formato === 'html'
            ? p.conteudo
                .replace(/<\s*br\s*\/?\s*>/gi, '\n')
                .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
            : p.conteudo;
        return `## ${p.tipo === 'pasta' ? '📁 ' : p.tipo === 'imagem' ? '▧ ' : ''}${p.titulo || 'Sem título'}\n\n*${cat} · Última edição: ${new Date(p.atualizadaEm).toLocaleString('pt-BR')}*\n\n${p.imagem ? '[Imagem anexada — disponível no backup completo da campanha]\n\n' : ''}${conteudo}\n`;
      })
      .join('\n---\n\n')
  );
}
