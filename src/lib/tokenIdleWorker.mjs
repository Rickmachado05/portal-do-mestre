/** Decodifica quadros GIF fora da thread principal da mesa. */
import { decodificarGifIdle } from './tokenIdleGif.mjs';
self.onmessage = ({data}) => {
  const {id, dados} = data;
  try {
    const animacao = decodificarGifIdle(new Uint8Array(dados));
    self.postMessage({id, animacao}, animacao.quadros.map(q => q.pixels.buffer));
  } catch (erro) {
    self.postMessage({id, erro: erro instanceof Error ? erro.message : 'Falha na decodificação GIF'});
  }
};
