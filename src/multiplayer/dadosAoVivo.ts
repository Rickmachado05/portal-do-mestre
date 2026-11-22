import { autorizar, solicitar, urlSala, type CredencialSala, type EventoDadosAoVivo } from './api';

/** WebRTC transporta os frames do Dice Box ORIGINAL (não sorteia nenhum dado).
 * O HTTP/SSE existente é usado só para ofertas, respostas e candidatos ICE.
 * Sem conexão direta, a captura WebM da v1.3.40.56.12.2 continua sendo o fallback.
 */
export type DadosAoVivoRecebidos = { id: string; emissorId: string; stream: MediaStream };
type Ouvinte = (atual: DadosAoVivoRecebidos | null, encerradaId?: string) => void;
type Par = { pc: RTCPeerConnection; pendentes: RTCIceCandidateInit[] };
type Canal = {
  credencial: CredencialSala;
  ouvintes: Set<Ouvinte>;
  emissores: Map<string, { stream: MediaStream; pares: Map<string, Par> }>;
  receptores: Map<string, Par>;
  candidatosAntecipados: Map<string, RTCIceCandidateInit[]>;
};
const canais = new Map<string, Canal>();
const servidoresICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const chave = (c: CredencialSala) => `${c.codigo}:${c.token}`;
const chavePar = (id: string, pessoaId: string) => `${id}:${pessoaId}`;
function canalPara(c: CredencialSala): Canal {
  const id = chave(c);
  let canal = canais.get(id);
  if (!canal) {
    canal = {
      credencial: c,
      ouvintes: new Set(),
      emissores: new Map(),
      receptores: new Map(),
      candidatosAntecipados: new Map(),
    };
    canais.set(id, canal);
  }
  return canal;
}
async function requisitar(c: CredencialSala, corpo: object) {
  return solicitar<{ ok?: boolean; destinatarios?: string[] }>(
    `${urlSala(c.codigo)}/dados-ao-vivo`,
    {
      method: 'POST',
      headers: autorizar(c.token),
      body: JSON.stringify(corpo),
    },
  );
}
async function sinalizar(c: CredencialSala, id: string, destinatarioId: string, sinal: object) {
  try {
    await requisitar(c, { acao: 'sinal', id, destinatarioId, sinal });
  } catch (e) {
    console.warn('[Portal/Dados ao vivo] Sinal não entregue:', e);
  }
}
function criarPar(c: CredencialSala, id: string, destinatarioId: string): Par {
  const pc = new RTCPeerConnection({ iceServers: servidoresICE });
  pc.onicecandidate = (e) => {
    if (e.candidate)
      void sinalizar(c, id, destinatarioId, { tipo: 'ice', candidato: e.candidate.toJSON() });
  };
  return { pc, pendentes: [] };
}
async function adicionarCandidatos(par: Par) {
  if (!par.pc.remoteDescription) return;
  const candidatos = par.pendentes.splice(0);
  for (const candidato of candidatos) {
    try {
      await par.pc.addIceCandidate(candidato);
    } catch (e) {
      console.warn('[Portal/Dados ao vivo] Candidato ICE recusado:', e);
    }
  }
}
function avisar(canal: Canal, estado: DadosAoVivoRecebidos | null, encerradaId?: string) {
  for (const ouvinte of canal.ouvintes) ouvinte(estado, encerradaId);
}
function fecharReceptor(canal: Canal, id: string) {
  canal.receptores.get(id)?.pc.close();
  canal.receptores.delete(id);
  canal.candidatosAntecipados.delete(id);
  avisar(canal, null, id);
}
function fecharEmissor(canal: Canal, id: string) {
  const emissor = canal.emissores.get(id);
  if (!emissor) return;
  for (const par of emissor.pares.values()) par.pc.close();
  canal.emissores.delete(id);
}

/** Um ouvinte por interface (mestre ou convidado); desassinar encerra os pares de recepção. */
export function assinarDadosAoVivo(credencial: CredencialSala, ouvinte: Ouvinte) {
  const canal = canalPara(credencial);
  canal.ouvintes.add(ouvinte);
  return () => {
    canal.ouvintes.delete(ouvinte);
    if (!canal.ouvintes.size) {
      for (const id of [...canal.receptores.keys()]) fecharReceptor(canal, id);
      // A mudança de interface não pode interromper a captura do lançador.
      if (!canal.emissores.size) canais.delete(chave(credencial));
    }
  };
}

/** Inicia antes da rolagem física. Um PeerConnection por espectador (até 12).
 * A visibilidade real do convidado é lida da preparação no servidor.
 */
export async function iniciarDadosAoVivo(
  credencial: CredencialSala,
  id: string,
  stream: MediaStream,
  visibilidade: 'publica' | 'mestre' = 'publica',
): Promise<void> {
  if (typeof RTCPeerConnection === 'undefined') throw Error('WebRTC indisponível neste navegador.');
  const canal = canalPara(credencial);
  if (canal.emissores.has(id)) return;
  const emissor = { stream, pares: new Map<string, Par>() };
  canal.emissores.set(id, emissor);
  try {
    const inicio = await requisitar(credencial, { acao: 'iniciar', id, visibilidade });
    if (!stream.active) {
      void requisitar(credencial, { acao: 'encerrar', id }).catch(() => undefined);
      fecharEmissor(canal, id);
      return;
    }
    const pessoas = inicio.destinatarios || [];
    await Promise.allSettled(
      pessoas.map(async (pessoaId) => {
        const par = criarPar(credencial, id, pessoaId);
        emissor.pares.set(pessoaId, par);
        for (const faixa of stream.getTracks()) {
          if (faixa.kind === 'video' && 'contentHint' in faixa) {
            try {
              faixa.contentHint = 'detail';
            } catch {
              /* preferência opcional */
            }
          }
          const sender = par.pc.addTrack(faixa, stream);
          if (faixa.kind === 'video') {
            try {
              const parametros = sender.getParameters();
              if (!parametros.encodings?.length) parametros.encodings = [{}];
              parametros.encodings[0] = {
                ...parametros.encodings[0],
                maxBitrate: 2_800_000,
                maxFramerate: 30,
                scaleResolutionDownBy: 1,
              };
              parametros.degradationPreference = 'maintain-resolution';
              await sender.setParameters(parametros);
            } catch (e) {
              console.warn('[Portal/Dados ao vivo] Preferência de qualidade não aplicada:', e);
            }
          }
        }
        const oferta = await par.pc.createOffer();
        await par.pc.setLocalDescription(oferta);
        await sinalizar(credencial, id, pessoaId, { tipo: 'oferta', sdp: oferta.sdp });
      }),
    );
    if (emissor.pares.size) {
      // Pequena janela de sincronização: esperar o primeiro espectador conectar
      // quando possível. Se não conectar rápido, o dado rola normalmente e
      // a gravação WebM permanece disponível após o lançamento.
      await new Promise<void>((resolve) => {
        let concluido = false;
        const finalizar = () => {
          if (concluido) return;
          concluido = true;
          window.clearTimeout(tempo);
          resolve();
        };
        const tempo = window.setTimeout(finalizar, 500);
        for (const par of emissor.pares.values()) {
          if (par.pc.connectionState === 'connected') {
            finalizar();
            break;
          }
          par.pc.addEventListener('connectionstatechange', () => {
            if (par.pc.connectionState === 'connected') finalizar();
          });
        }
      });
    }
  } catch (e) {
    fecharEmissor(canal, id);
    throw e;
  }
}

/** Chamado durante o fechamento do lançamento. O vídeo gravado permanece como fallback. */
export function encerrarDadosAoVivo(credencial: CredencialSala, id: string) {
  const canal = canalPara(credencial);
  if (!canal.emissores.has(id)) return;
  void requisitar(credencial, { acao: 'encerrar', id }).catch((e) =>
    console.warn('[Portal/Dados ao vivo] Encerramento não confirmado:', e),
  );
  window.setTimeout(() => {
    fecharEmissor(canal, id);
    if (!canal.ouvintes.size && !canal.receptores.size) canais.delete(chave(credencial));
  }, 1700);
}

/** Entrega recebida pelo MESMO EventSource já usado para a mesa, não uma conexão duplicada. */
export function receberEventoDadosAoVivo(credencial: CredencialSala, evento: EventoDadosAoVivo) {
  const canal = canalPara(credencial);
  if (evento.acao === 'fim') {
    window.setTimeout(() => fecharReceptor(canal, evento.id), 1300);
    return;
  }
  if (evento.acao === 'inicio') return;
  const sinal = evento.sinal;
  if (!sinal) return;
  const meuId = credencial.id;
  if (evento.remetenteId === meuId) return;
  // Se o emissor recebe resposta/ICE de um espectador.
  const emissor = canal.emissores.get(evento.id);
  if (emissor) {
    const par = emissor.pares.get(evento.remetenteId);
    if (!par) return;
    if (sinal.tipo === 'resposta' && sinal.sdp) {
      void par.pc
        .setRemoteDescription({ type: 'answer', sdp: sinal.sdp })
        .then(() => adicionarCandidatos(par))
        .catch((e) => console.warn('[Portal/Dados ao vivo] Resposta inválida:', e));
    } else if (sinal.tipo === 'ice' && sinal.candidato) {
      par.pendentes.push(sinal.candidato);
      void adicionarCandidatos(par);
    }
    return;
  }
  // No espectador, oferta e candidatos podem chegar em qualquer ordem.
  const emissorId = evento.emissorId;
  if (sinal.tipo === 'ice' && sinal.candidato) {
    const par = canal.receptores.get(evento.id);
    if (par) {
      par.pendentes.push(sinal.candidato);
      void adicionarCandidatos(par);
    } else {
      const prev = canal.candidatosAntecipados.get(evento.id) || [];
      if (prev.length < 60) prev.push(sinal.candidato);
      canal.candidatosAntecipados.set(evento.id, prev);
    }
    return;
  }
  if (
    sinal.tipo !== 'oferta' ||
    !sinal.sdp ||
    canal.receptores.has(evento.id) ||
    typeof RTCPeerConnection === 'undefined'
  )
    return;
  const par = criarPar(credencial, evento.id, emissorId);
  par.pendentes.push(...(canal.candidatosAntecipados.get(evento.id) || []));
  canal.candidatosAntecipados.delete(evento.id);
  canal.receptores.set(evento.id, par);
  par.pc.ontrack = (e) => {
    const stream = e.streams[0] || new MediaStream([e.track]);
    avisar(canal, { id: evento.id, emissorId, stream });
  };
  void (async () => {
    try {
      await par.pc.setRemoteDescription({ type: 'offer', sdp: sinal.sdp });
      await adicionarCandidatos(par);
      const resposta = await par.pc.createAnswer();
      await par.pc.setLocalDescription(resposta);
      await sinalizar(credencial, evento.id, emissorId, { tipo: 'resposta', sdp: resposta.sdp });
    } catch (e) {
      console.warn('[Portal/Dados ao vivo] Não foi possível receber a animação:', e);
      fecharReceptor(canal, evento.id);
    }
  })();
}
