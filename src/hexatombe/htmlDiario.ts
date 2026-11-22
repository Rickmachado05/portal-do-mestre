/** HTML controlado para notas formatadas. Não permite scripts, estilos inline nem URLs inseguras. */
export function escaparTextoDiario(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function textoLegadoParaHtml(texto: string): string {
  return `<p>${escaparTextoDiario(texto).replace(/\n/g, '<br>')}</p>`;
}
const tagsPermitidas = new Set([
  'p',
  'div',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'code',
]);
const tagsDescartadas = new Set([
  'script',
  'style',
  'iframe',
  'svg',
  'math',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'video',
  'audio',
  'img',
  'link',
  'meta',
]);
export function limparHtmlDiario(html: string): string {
  if (typeof DOMParser === 'undefined') return escaparTextoDiario(html); // ambiente não-DOM
  const doc = new DOMParser().parseFromString(html.slice(0, 60000), 'text/html');
  const visitar = (no: Node): string => {
    if (no.nodeType === 3) return escaparTextoDiario(no.textContent || '');
    if (no.nodeType !== 1) return '';
    const el = no as Element;
    const tag = el.tagName.toLowerCase();
    if (tagsDescartadas.has(tag)) return '';
    const filhos = Array.from(el.childNodes).map(visitar).join('');
    if (!tagsPermitidas.has(tag)) return filhos;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      try {
        const url = new URL(href);
        if (['https:', 'http:', 'mailto:'].includes(url.protocol))
          return `<a href="${escaparTextoDiario(url.toString())}" target="_blank" rel="noopener noreferrer">${filhos}</a>`;
      } catch {
        /* Sem link inseguro. */
      }
      return filhos;
    }
    return `<${tag}>${filhos}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map(visitar).join('').slice(0, 40000);
}
