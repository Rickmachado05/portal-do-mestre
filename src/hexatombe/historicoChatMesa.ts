/** Conversa local da campanha: armazenamento independente dos movimentos e recursos da mesa.
 * O backup completo já inclui chaves `portal-mestre-`. Multiplayer terá transporte próprio. */
export const EVENTO_CHAT_MESA = 'portal-mestre-chat-atualizado';
export const MAX_MENSAGENS_CHAT = 300;
export const MAX_TEXTO_CHAT = 1200;
export type TipoAutorChat = 'mestre' | 'jogador' | 'npc' | 'inimigo';
export type AutorChat = { id: string; nome: string; tipo: TipoAutorChat };
/** Destinatário ausente = canal geral. Conversa particular só identifica participantes; não criptografa mensagens locais. */
export type MensagemChat = AutorChat & {
  mensagemId: string;
  texto: string;
  criadaEm: number;
  cenaNome?: string;
  destinatarioId?: string;
  destinatarioNome?: string;
};
const TIPOS_CHAT = new Set<TipoAutorChat>(['mestre', 'jogador', 'npc', 'inimigo']);
const objeto = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
export const chaveChatMesa = (campanhaId: string) => `portal-mestre-chat-v1:${campanhaId}`;
export const chaveAutorChat = (campanhaId: string) => `portal-mestre-chat-autor-v1:${campanhaId}`;
export function normalizarMensagensChat(raw: unknown): MensagemChat[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const saida: MensagemChat[] = [];
  for (const dado of raw.slice(-MAX_MENSAGENS_CHAT)) {
    const m = objeto(dado);
    const mensagemId = texto(m.mensagemId, 100);
    const conteudo = texto(m.texto, MAX_TEXTO_CHAT).trim();
    if (
      !mensagemId ||
      !conteudo ||
      ids.has(mensagemId) ||
      typeof m.criadaEm !== 'number' ||
      !Number.isFinite(m.criadaEm) ||
      m.criadaEm < 0 ||
      m.criadaEm > 8.64e15
    )
      continue;
    ids.add(mensagemId);
    saida.push({
      mensagemId,
      texto: conteudo,
      criadaEm: m.criadaEm,
      id: texto(m.id, 120) || 'mestre',
      nome: texto(m.nome, 90) || 'Mestre',
      tipo: TIPOS_CHAT.has(m.tipo as TipoAutorChat) ? (m.tipo as TipoAutorChat) : 'mestre',
      ...(texto(m.cenaNome, 90) ? { cenaNome: texto(m.cenaNome, 90) } : {}),
      ...(texto(m.destinatarioId, 120) &&
      texto(m.destinatarioId, 120) !== (texto(m.id, 120) || 'mestre')
        ? {
            destinatarioId: texto(m.destinatarioId, 120),
            destinatarioNome: texto(m.destinatarioNome, 90) || 'Destinatário',
          }
        : {}),
    });
  }
  return saida;
}
export function criarMensagemChat(
  autor: AutorChat,
  conteudo: string,
  cenaNome?: string,
  agora = Date.now(),
  identificador?: string,
  destinatario?: AutorChat,
): MensagemChat | null {
  const textoLimpo = conteudo.replace(/\r\n?/g, '\n').trim();
  if (
    !textoLimpo ||
    textoLimpo.length > MAX_TEXTO_CHAT ||
    (destinatario && (!destinatario.id.trim() || destinatario.id === autor.id))
  )
    return null;
  return {
    mensagemId: identificador || `chat-${agora}-${Math.random().toString(36).slice(2, 11)}`,
    texto: textoLimpo,
    criadaEm: agora,
    id: autor.id.slice(0, 120),
    nome: autor.nome.trim().slice(0, 90) || 'Mestre',
    tipo: TIPOS_CHAT.has(autor.tipo) ? autor.tipo : 'mestre',
    ...(cenaNome ? { cenaNome: cenaNome.slice(0, 90) } : {}),
    ...(destinatario && destinatario.id !== autor.id && destinatario.id.trim()
      ? {
          destinatarioId: destinatario.id.slice(0, 120),
          destinatarioNome: destinatario.nome.slice(0, 90),
        }
      : {}),
  };
}
export function lerMensagensChat(campanhaId: string): MensagemChat[] {
  try {
    return normalizarMensagensChat(
      JSON.parse(localStorage.getItem(chaveChatMesa(campanhaId)) || '[]'),
    );
  } catch {
    return [];
  }
}
function avisarChat(campanhaId: string) {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent(EVENTO_CHAT_MESA, { detail: { campanhaId } }));
}
/** Lê a versão mais recente no momento do envio, em vez de gravar estado React defasado. */
export function enviarMensagemChat(campanhaId: string, mensagem: MensagemChat): MensagemChat[] {
  const atuais = lerMensagensChat(campanhaId);
  if (atuais.some((m) => m.mensagemId === mensagem.mensagemId)) return atuais;
  const proximas = normalizarMensagensChat([...atuais, mensagem]);
  localStorage.setItem(chaveChatMesa(campanhaId), JSON.stringify(proximas));
  avisarChat(campanhaId);
  return proximas;
}
export function apagarHistoricoChat(campanhaId: string) {
  localStorage.removeItem(chaveChatMesa(campanhaId));
  avisarChat(campanhaId);
}
export function lerAutorChat(campanhaId: string): string {
  try {
    return localStorage.getItem(chaveAutorChat(campanhaId)) || 'mestre';
  } catch {
    return 'mestre';
  }
}
export function salvarAutorChat(campanhaId: string, id: string) {
  try {
    localStorage.setItem(chaveAutorChat(campanhaId), id);
  } catch {
    /* A conversa segue funcionando. */
  }
}

/** Mensagens particulares só aparecem na conversa do par, independentemente do sentido. */
export function mensagensCanalChat(
  mensagens: MensagemChat[],
  autorId: string,
  destinatarioId?: string,
): MensagemChat[] {
  if (!destinatarioId) return mensagens.filter((m) => !m.destinatarioId);
  if (!autorId || autorId === destinatarioId) return [];
  return mensagens.filter(
    (m) =>
      Boolean(m.destinatarioId) &&
      ((m.id === autorId && m.destinatarioId === destinatarioId) ||
        (m.id === destinatarioId && m.destinatarioId === autorId)),
  );
}
