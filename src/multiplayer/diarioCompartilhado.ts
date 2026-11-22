/** Publica apenas documentos com destinatário definido (página ou pasta compartilhada).
 * A projeção de mestre não inclui Caderno, backups nem notas particulares.
 * O servidor refiltra por personagem autenticado.
 */
import type { PaginaDiario } from '../hexatombe/registrosDiario';
export function montarDiarioParaSala(paginas: PaginaDiario[]) {
  const pastasCompartilhadas = new Set(
    paginas
      .filter((p) => p.tipo === 'pasta' && Object.keys(p.compartilhadoCom || {}).length > 0)
      .map((p) => p.id),
  );
  const publicaveis = paginas.filter(
    (p) =>
      Object.keys(p.compartilhadoCom || {}).length > 0 ||
      Boolean(p.pastaId && pastasCompartilhadas.has(p.pastaId)),
  );
  return {
    paginas: publicaveis.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      conteudo: p.conteudo,
      categoria: p.categoria,
      fixada: p.fixada,
      criadaEm: p.criadaEm,
      atualizadaEm: p.atualizadaEm,
      tipo: p.tipo || 'nota',
      pastaId: p.pastaId || '',
      formato: p.formato || 'texto',
      imagem: p.imagem || '',
      compartilhadoCom: p.compartilhadoCom || {},
    })),
  };
}
