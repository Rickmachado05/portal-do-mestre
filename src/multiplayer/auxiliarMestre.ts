/** Ponte local opcional: somente a máquina que hospeda a sessão executa este auxiliar.
 * O navegador NÃO executa comandos. A instalação local registra um processo com rotas fixas.
 */
export type StatusAuxiliar = {
  estado: 'parado' | 'iniciando' | 'pronto' | 'erro';
  tunnel: string;
  mensagem: string;
};

export const URL_AUXILIAR = 'http://127.0.0.1:8790';
const INTERVALO = 1100;
const TEMPO_MAXIMO = 95000;

export function suportaAuxiliarMestre() {
  return typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.vercel.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

async function chamarAuxiliar(rota: string, metodo: 'GET' | 'POST' = 'GET', timeout = 2500): Promise<StatusAuxiliar> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${URL_AUXILIAR}${rota}`, {
      method: metodo,
      headers: metodo === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: metodo === 'POST' ? '{}' : undefined,
      cache: 'no-store',
      signal: controller.signal,
      // Chrome 142+: a permissão para acessar o próprio PC deve ser solicitada pelo navegador.
      targetAddressSpace: 'loopback',
    } as RequestInit & { targetAddressSpace: 'loopback' });
    if (!response.ok) throw new Error(`Auxiliar local retornou HTTP ${response.status}.`);
    const dados = await response.json() as StatusAuxiliar;
    if (!['parado', 'iniciando', 'pronto', 'erro'].includes(dados.estado)) throw new Error('Resposta inesperada do auxiliar local.');
    return dados;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function statusAuxiliarMestre() {
  return chamarAuxiliar('/v1/status');
}

export async function iniciarSessaoPeloAuxiliar(atualizar?: (status: StatusAuxiliar) => void): Promise<string> {
  let resposta = await chamarAuxiliar('/v1/start', 'POST', 5000);
  atualizar?.(resposta);
  const limite = Date.now() + TEMPO_MAXIMO;
  while (Date.now() < limite) {
    if (resposta.estado === 'pronto') {
      const url = new URL(resposta.tunnel);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.trycloudflare.com')) throw new Error('O auxiliar retornou um endereço de Tunnel inválido.');
      return url.origin;
    }
    if (resposta.estado === 'erro') throw new Error(resposta.mensagem || 'Falha ao iniciar Cloudflare Tunnel.');
    await new Promise(resolve => window.setTimeout(resolve, INTERVALO));
    resposta = await chamarAuxiliar('/v1/status', 'GET', 3000);
    atualizar?.(resposta);
  }
  throw new Error('O Cloudflare não confirmou a conexão. Confira o arquivo auxiliar-mestre.log no PC.');
}

export function pararSessaoPeloAuxiliar() {
  return chamarAuxiliar('/v1/stop', 'POST', 5000);
}

/** Abrir o protocolo é uma interação explícita do usuário; não o disparar em efeito automático. */
export function abrirAuxiliarInstalado() {
  window.location.href = 'portalmestre://abrir';
}
