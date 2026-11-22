import { autorizar, type CredencialSala, urlSala } from './api';

/** Publica os quadros físicos reais da rolagem, sem outra simulação. */
export async function enviarVideoRolagem(
  credencial: CredencialSala,
  origemId: string,
  video: Blob,
): Promise<void> {
  if (video.size < 100 || video.size > 5_000_000)
    throw Error(`Gravação do Dice Box fora do limite (bytes: ${video.size}).`);
  const uri = `${urlSala(credencial.codigo)}/rolagens/${encodeURIComponent(origemId)}/video`;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const resposta = await fetch(uri, {
        method: 'POST',
        headers: { ...autorizar(credencial.token), 'Content-Type': video.type || 'video/webm' },
        body: video,
      });
      if (resposta.ok) return;
      if (![404, 409].includes(resposta.status)) throw Error(`HTTP ${resposta.status}`);
    } catch (e) {
      if (tentativa === 4) throw e;
    }
    if (tentativa === 4) throw Error('A rolagem não foi registrada a tempo de receber a gravação.');
    await new Promise((resolve) => window.setTimeout(resolve, (tentativa + 1) * 250));
  }
}
export async function buscarVideoRolagem(
  credencial: CredencialSala,
  rolagemId: string,
  signal?: AbortSignal,
): Promise<string> {
  const resposta = await fetch(
    `${urlSala(credencial.codigo)}/rolagens/${encodeURIComponent(rolagemId)}/video`,
    {
      headers: autorizar(credencial.token),
      cache: 'no-store',
      signal,
    },
  );
  if (!resposta.ok) throw Error(`Vídeo indisponível (HTTP ${resposta.status}).`);
  const video = await resposta.blob();
  if (
    !['video/webm', 'video/mp4'].includes(video.type) ||
    video.size < 100 ||
    video.size > 5_000_000
  )
    throw Error('Vídeo incompatível.');
  return URL.createObjectURL(video);
}

/** Uma rolagem chega pelo SSE antes de a captura terminar de subir. Busca o
 * mesmo vídeo do autor, sem iniciar uma nova simulação e sem depender de outro
 * evento SSE que pode ter sido perdido durante uma reconexão. */
export async function aguardarVideoRolagem(
  credencial: CredencialSala,
  rolagemId: string,
  signal?: AbortSignal,
): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    if (signal?.aborted) throw Error('Reprodução cancelada.');
    try {
      return await buscarVideoRolagem(credencial, rolagemId, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      // Não insistir em erros de autorização, sessão encerrada ou mídia inválida.
      if (e instanceof Error && !/HTTP 404|HTTP 409/.test(e.message)) throw e;
      if (tentativa === 19) throw Error('A gravação não chegou à sala após a rolagem.');
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          signal?.removeEventListener('abort', abortar);
          resolve();
        }, 700);
        const abortar = () => {
          window.clearTimeout(timeout);
          reject(Error('Reprodução cancelada.'));
        };
        signal?.addEventListener('abort', abortar, { once: true });
        if (signal?.aborted) abortar();
      });
    }
  }
  throw Error('Gravação indisponível.');
}
