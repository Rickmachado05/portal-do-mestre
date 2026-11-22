/** Projeção privada do inventário. Nunca publica o catálogo global ou campos do Diário. */
import type { ItemInventario } from '../hexatombe/itensLibrary';
import type { InventarioCompartilhado, ItemCompartilhado } from './api';

type UnidadeInventario = { id: string; nome: string; tipo: string; itens?: ItemInventario[] };
const imagemPequena = (valor?: string) =>
  typeof valor === 'string' && valueIsImage(valor) && valor.length <= 180_000 ? valor : undefined;
function valueIsImage(valor: string) {
  return /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(valor);
}
export function montarInventariosCompartilhados(unidades: UnidadeInventario[]): {
  personagens: InventarioCompartilhado[];
} {
  return {
    personagens: unidades
      .filter((u) => u.tipo === 'jogador')
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        itens: (u.itens || [])
          .slice(0, 120)
          .filter((item) => item.quantidade > 0)
          .map((item): ItemCompartilhado => ({
            id: item.id,
            nome: item.nome,
            categoria: item.categoria,
            efeito: item.efeito,
            valor: item.valor,
            descricao: item.descricao,
            consumivel: item.consumivel,
            quantidade: item.quantidade,
            ...(imagemPequena(item.imagem) ? { imagem: imagemPequena(item.imagem) } : {}),
            ...(item.categoria === 'documento' && item.conteudo
              ? { conteudo: item.conteudo.slice(0, 12000) }
              : {}),
            ...(item.categoria === 'documento' && imagemPequena(item.imagemConteudo)
              ? { imagemConteudo: imagemPequena(item.imagemConteudo) }
              : {}),
          })),
      })),
  };
}

/** Prepara anexos para a rede: o original continua intacto na biblioteca do mestre.
 *  No formato anterior, anexos acima de 180 KB desapareciam sem aviso.
 *  A conversão é feita apenas pelo mestre, antes da publicação privada da ficha.
 */
const cacheImagem = new Map<string, string | undefined>();
export async function imagemCompartilhavel(
  valor?: string,
  documento = false,
): Promise<string | undefined> {
  if (!valor || !valueIsImage(valor)) return undefined;
  if (valor.length <= 180_000) return valor;
  const chave = `${documento ? 'documento' : 'icone'}:${valor}`;
  if (cacheImagem.has(chave)) return cacheImagem.get(chave);
  try {
    const imagem = new Image();
    await new Promise<void>((resolver, rejeitar) => {
      imagem.onload = () => resolver();
      imagem.onerror = () => rejeitar(Error('Imagem inválida'));
      imagem.src = valor;
    });
    const tamanhos = documento ? [1100, 900, 750, 600, 420, 300] : [480, 320, 220, 144];
    let resultado: string | undefined;
    for (const tamanho of tamanhos) {
      const escala = Math.min(1, tamanho / Math.max(imagem.naturalWidth, imagem.naturalHeight));
      const tela = document.createElement('canvas');
      tela.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      tela.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      tela.getContext('2d')?.drawImage(imagem, 0, 0, tela.width, tela.height);
      for (const qualidade of [0.82, 0.72, 0.6, 0.48]) {
        const data = tela.toDataURL('image/webp', qualidade);
        if (data.length <= 180_000) {
          resultado = data;
          break;
        }
      }
      if (resultado) break;
    }
    if (cacheImagem.size > 60) cacheImagem.clear();
    cacheImagem.set(chave, resultado);
    return resultado;
  } catch {
    return undefined;
  }
}

/** Mantém os demais campos dos itens e prepara as imagens sob demanda de publicação. */
export async function montarInventariosParaPublicacao(
  unidades: UnidadeInventario[],
): Promise<{ personagens: InventarioCompartilhado[] }> {
  const normalizados = await Promise.all(
    unidades
      .filter((u) => u.tipo === 'jogador')
      .map(async (unidade) => ({
        ...unidade,
        itens: await Promise.all(
          (unidade.itens || []).map(async (item) => ({
            ...item,
            imagem: await imagemCompartilhavel(item.imagem, false),
            imagemConteudo:
              item.categoria === 'documento'
                ? await imagemCompartilhavel(item.imagemConteudo, true)
                : undefined,
          })),
        ),
      })),
  );
  return montarInventariosCompartilhados(normalizados);
}
