/** Retrato do personagem e token são recursos independentes.
 * PNG/JPEG/WebP/GIF são guardados no campo photo para que backups e
 * miniaturas antigas continuem funcionando sem migrar o banco. */
export const TAMANHO_MAX_RETRATO = 3_500_000;
export const MIME_RETRATO = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const RETRATO_ACEITOS = 'image/png,image/jpeg,image/webp,image/gif';
export function validarArquivoRetrato(arquivo: File): void {
  if (!MIME_RETRATO.some((m) => m === arquivo.type))
    throw Error('Use PNG, JPG, WebP ou GIF para o retrato.');
  if (arquivo.size === 0 || arquivo.size > TAMANHO_MAX_RETRATO)
    throw Error('O retrato deve ter até 3,5 MB.');
}
export async function lerArquivoRetrato(arquivo: File): Promise<string> {
  validarArquivoRetrato(arquivo);
  const resultado = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(resultado) || resultado.length >= 5_500_000)
    throw Error('O formato ou tamanho do retrato é inválido.');
  return resultado;
}
