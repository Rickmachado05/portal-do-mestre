import { chaveMestre, lerCredencial } from './api';
import { enviarVideoRolagem } from './videoRolagem';
export async function publicarVideoRolagemMestre(campanhaId: string, id: string, video: Blob) {
  const credencial = lerCredencial(chaveMestre(campanhaId));
  if (credencial?.papel === 'mestre') await enviarVideoRolagem(credencial, id, video);
}
