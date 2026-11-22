import type { PaginaDiario } from './registrosDiario';
import { listarItens, salvarItem, type ModeloItem } from './itensLibrary.ts';
import { imagemConteudoValida } from './imagensItens.ts';

export type DadosItemDiario = Pick<
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
>;

/** Preserva parágrafos/listas sem introduzir HTML não confiável no visualizador de itens. */
export function textoLegivelDoDiario(conteudo: string, formato?: 'texto' | 'html'): string {
  if (formato !== 'html') return conteudo.trim();
  const semCodigo = conteudo.replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const texto = semCodigo
    .replace(/<\s*li\b[^>]*>/gi, '• ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(?:p|div|li|h[1-6]|ul|ol|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|nbsp|amp|lt|gt|quot|apos|#39);/gi, (_, entidade: string) => {
      const comum: Record<string, string> = {
        nbsp: ' ',
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        '#39': "'",
      };
      const id = entidade.toLowerCase();
      if (id in comum) return comum[id];
      const valor = id.startsWith('#x')
        ? Number.parseInt(id.slice(2), 16)
        : Number.parseInt(id.slice(1), 10);
      return Number.isFinite(valor) &&
        valor > 0 &&
        valor <= 0x10ffff &&
        !(valor >= 0xd800 && valor <= 0xdfff)
        ? String.fromCodePoint(valor)
        : '';
    });
  return texto
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Gera os dados de um item-documento a partir de uma página; não remove a página original. */
export function criarDadosItemDoDiario(pagina: PaginaDiario): DadosItemDiario {
  if (pagina.tipo === 'pasta') throw new Error('Selecione uma nota ou imagem, não uma pasta.');
  const nome = pagina.titulo.trim().slice(0, 80) || 'Documento sem título';
  const conteudo = textoLegivelDoDiario(pagina.conteudo, pagina.formato);
  if (conteudo.length > 18000)
    throw new Error(
      'O texto ultrapassa 18.000 caracteres. Resuma ou divida o documento antes de criar o item.',
    );
  if (pagina.imagem && !imagemConteudoValida(pagina.imagem))
    throw new Error(
      'A imagem do Diário não é compatível com o inventário. Importe novamente a imagem.',
    );
  return {
    nome,
    categoria: 'documento',
    efeito: 'nenhum',
    valor: '',
    consumivel: false,
    descricao: 'Documento criado a partir do Diário da campanha.',
    ...(conteudo ? { conteudo } : {}),
    ...(pagina.imagem ? { imagemConteudo: pagina.imagem } : {}),
  };
}

/** Reexportar a mesma página atualiza o item correspondente no catálogo. */
export function publicarItemDoDiario(pagina: PaginaDiario, campanhaId: string): ModeloItem {
  if (!campanhaId.trim()) throw new Error('Campanha inválida para a publicação do documento.');
  const dados = criarDadosItemDoDiario(pagina);
  const anterior = listarItens().find(
    (x) => x.origemCampanhaId === campanhaId && x.origemDiarioId === pagina.id,
  );
  return salvarItem(
    { ...dados, origemCampanhaId: campanhaId, origemDiarioId: pagina.id },
    anterior?.id,
  );
}
