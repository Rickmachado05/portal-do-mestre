import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import ImagemRetrato, { type AjusteRetrato } from '../lib/retratoResponsivo';
import {
  apagarHistoricoChat,
  criarMensagemChat,
  enviarMensagemChat,
  EVENTO_CHAT_MESA,
  chaveChatMesa,
  lerAutorChat,
  lerMensagensChat,
  mensagensCanalChat,
  MAX_TEXTO_CHAT,
  salvarAutorChat,
  type AutorChat,
  type MensagemChat,
} from './historicoChatMesa';
import {
  assinarPresenca,
  autorizar,
  chaveMestre,
  lerCredencial,
  solicitar,
  urlSala,
  type CredencialSala,
  type MensagemChatSala,
  type ResumoSala,
} from '../multiplayer/api';
import './ChatMesa.css';

type PersonagemChat = {
  id: string;
  nome: string;
  tipo: 'jogador' | 'npc' | 'inimigo';
  foto?: string;
  cor?: string;
  enquadramento?: AjusteRetrato;
};
type Props = {
  campanhaId: string;
  personagens: PersonagemChat[];
  cenaNome: string;
  visivel?: boolean;
  onNovas?: (quantidade: number) => void;
  /** No convite, o mesmo chat da mesa usa a identidade autenticada do convidado. */
  credencial?: CredencialSala;
};
type MensagemTela = MensagemChat & { avatarId?: string; avatarFoto?: string; avatarCor?: string };
const hora = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Imagem leve do NPC na mensagem compartilhada. Nunca envia o retrato original em alta resolução. */
async function miniaturaChat(foto?: string): Promise<string | undefined> {
  if (!foto) return undefined;
  return new Promise((resolve) => {
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const tamanho = 64;
        const tela = document.createElement('canvas');
        tela.width = tamanho;
        tela.height = tamanho;
        const ctx = tela.getContext('2d');
        if (!ctx) {
          resolve(undefined);
          return;
        }
        const escala = Math.max(tamanho / imagem.naturalWidth, tamanho / imagem.naturalHeight);
        const largura = imagem.naturalWidth * escala,
          altura = imagem.naturalHeight * escala;
        ctx.drawImage(imagem, (tamanho - largura) / 2, (tamanho - altura) / 2, largura, altura);
        const data = tela.toDataURL('image/webp', 0.66);
        resolve(data.length <= 25_000 ? data : undefined);
      } catch {
        resolve(undefined);
      }
    };
    imagem.onerror = () => resolve(undefined);
    imagem.src = foto;
  });
}

/** Uma interface para o chat local e o chat multiplayer: as mensagens privadas online são filtradas no servidor. */
export default function ChatMesa({
  campanhaId,
  personagens,
  cenaNome,
  visivel = true,
  onNovas,
  credencial: credencialProp,
}: Props) {
  const [credencialMestre, setCredencialMestre] = useState<CredencialSala | null>(() =>
    credencialProp ? null : lerCredencial(chaveMestre(campanhaId)),
  );
  const credencial = credencialProp || credencialMestre;
  const online = Boolean(credencial);
  const [sala, setSala] = useState<ResumoSala | null>(null);
  const [mensagensOnline, setMensagensOnline] = useState<MensagemChatSala[]>([]);
  const [status, setStatus] = useState<'conectado' | 'reconectando'>('reconectando');
  const [mensagensLocais, setMensagensLocais] = useState<MensagemChat[]>(() =>
    lerMensagensChat(campanhaId),
  );
  const [autorId, setAutorId] = useState(() => lerAutorChat(campanhaId));
  const [rascunho, setRascunho] = useState('');
  const [canal, setCanal] = useState<'geral' | 'particular'>('geral');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const [novas, setNovas] = useState(0);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const estavaNoFim = useRef(true);
  const ultimaIdLocalRef = useRef(mensagensLocais.at(-1)?.mensagemId || '');
  const ultimaIdOnlineRef = useRef('');
  const contextoRef = useRef({ visivel, proprioId: '' });

  useEffect(() => {
    if (credencialProp) return;
    const atualizar = () => setCredencialMestre(lerCredencial(chaveMestre(campanhaId)));
    window.addEventListener('portal-multiplayer-sala', atualizar);
    atualizar();
    return () => window.removeEventListener('portal-multiplayer-sala', atualizar);
  }, [campanhaId, credencialProp]);

  const proprioId =
    credencial?.papel === 'mestre'
      ? sala?.participantes.find((p) => p.papel === 'mestre')?.id || credencial.id || ''
      : credencial?.id || '';
  contextoRef.current = { visivel, proprioId };
  const participantes = sala?.participantes || [];
  const autorizadosOnline = participantes.filter((p) => p.id !== proprioId);
  const nomeParticipante = (p: { apelido: string; personagemNome?: string | null }) =>
    p.personagemNome ? `${p.apelido} (${p.personagemNome})` : p.apelido;
  const possoFalarComoPersonagem = credencial?.papel === 'mestre';
  const autoresLocais = useMemo<AutorChat[]>(
    () => [
      { id: 'mestre', nome: 'Mestre', tipo: 'mestre' },
      ...personagens.map((u) => ({ id: u.id, nome: u.nome, tipo: u.tipo })),
    ],
    [personagens],
  );
  const autoresOnline = useMemo<AutorChat[]>(
    () => [
      { id: 'mestre', nome: 'Mestre', tipo: 'mestre' },
      ...personagens
        .filter((p) => p.tipo === 'npc' || p.tipo === 'inimigo')
        .map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo })),
    ],
    [personagens],
  );
  const autores = online ? autoresOnline : autoresLocais;
  const participanteAtual = participantes.find((p) => p.id === proprioId);
  const autorAtual =
    credencial?.papel === 'convidado'
      ? {
          id: proprioId,
          nome: participanteAtual
            ? nomeParticipante(participanteAtual)
            : credencial.apelido || 'Convidado',
          tipo: 'jogador' as const,
        }
      : autores.find((a) => a.id === autorId) || autores[0];
  const destinosOnline = useMemo<AutorChat[]>(
    () =>
      autorizadosOnline.map((p): AutorChat => ({
        id: p.id,
        nome: p.personagemNome ? `${p.apelido} (${p.personagemNome})` : p.apelido,
        tipo: p.papel === 'mestre' ? 'mestre' : 'jogador',
      })),
    [sala, proprioId],
  );
  const destinatarios = online ? destinosOnline : autores.filter((a) => a.id !== autorAtual.id);
  const destinatarioAtual = destinatarios.find((a) => a.id === destinatarioId) || destinatarios[0];
  const particular = canal === 'particular';
  const nomeCanal = particular
    ? `Conversa particular com ${destinatarioAtual?.nome || 'destinatário'}`
    : 'Conversa geral';
  const retrato = (identidade: string) => personagens.find((u) => u.id === identidade);
  const iconeAutor = (identidade: string, nome: string, fotoExtra?: string, corExtra?: string) => {
    const perfil = retrato(identidade);
    const foto = perfil?.foto || fotoExtra;
    return (
      <span
        className={`pm-chat-avatar ${identidade === 'mestre' ? 'pm-chat-avatar-mestre' : ''}`}
        style={{ borderColor: perfil?.cor || corExtra || '#ae9169' }}
        aria-hidden="true"
      >
        {foto ? (
          <ImagemRetrato src={foto} alt="" ajuste={perfil?.enquadramento} />
        ) : (
          <span>{identidade === 'mestre' ? '✦' : nome.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
    );
  };
  const mensagensVisiveis = useMemo<MensagemTela[]>(() => {
    if (!online)
      return mensagensCanalChat(
        mensagensLocais,
        autorAtual.id,
        particular ? destinatarioAtual?.id : undefined,
      );
    if (particular && !destinatarioAtual) return [];
    return mensagensOnline
      .filter((m) =>
        particular
          ? Boolean(m.destinatarioId) &&
            ((m.autorId === proprioId && m.destinatarioId === destinatarioAtual?.id) ||
              (m.autorId === destinatarioAtual?.id && m.destinatarioId === proprioId))
          : !m.destinatarioId,
      )
      .map((m): MensagemTela => {
        const autorPessoa = participantes.find((p) => p.id === m.autorId);
        return {
          mensagemId: m.id,
          id: m.autorId,
          nome: m.persona?.nome || m.autorNome,
          tipo: m.persona?.tipo || (autorPessoa?.papel === 'mestre' ? 'mestre' : 'jogador'),
          texto: m.texto,
          criadaEm: m.criadaEm,
          ...(m.destinatarioId
            ? { destinatarioId: m.destinatarioId, destinatarioNome: m.destinatarioNome }
            : {}),
          avatarId: m.persona?.id || m.personagemId || autorPessoa?.personagemId || m.autorId,
          avatarFoto: m.persona?.foto,
          avatarCor: m.persona?.cor,
        };
      });
  }, [
    online,
    mensagensLocais,
    mensagensOnline,
    autorAtual.id,
    particular,
    destinatarioAtual?.id,
    proprioId,
    sala,
  ]);

  useEffect(() => {
    setMensagensLocais(lerMensagensChat(campanhaId));
    setAutorId(lerAutorChat(campanhaId));
    setCanal('geral');
    setDestinatarioId('');
    setNovas(0);
    ultimaIdLocalRef.current = lerMensagensChat(campanhaId).at(-1)?.mensagemId || '';
  }, [campanhaId]);

  useEffect(() => {
    if (!credencial) {
      setSala(null);
      setMensagensOnline([]);
      setStatus('reconectando');
      return;
    }
    let ativo = true;
    setSala(null);
    setMensagensOnline([]);
    setStatus('reconectando');
    setErro('');
    ultimaIdOnlineRef.current = '';
    const url = urlSala(credencial.codigo);
    async function recuperar() {
      try {
        const [identidade, historico] = await Promise.all([
          solicitar<{ sala: ResumoSala }>(`${url}/eu`, { headers: autorizar(credencial!.token) }),
          solicitar<{ mensagens: MensagemChatSala[] }>(`${url}/chat`, {
            headers: autorizar(credencial!.token),
          }),
        ]);
        if (!ativo) return;
        setSala(identidade.sala);
        setMensagensOnline((anterior) =>
          [...new Map([...historico.mensagens, ...anterior].map((m) => [m.id, m])).values()]
            .sort((a, b) => a.criadaEm - b.criadaEm)
            .slice(-200),
        );
        setErro('');
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Chat multiplayer indisponível.');
      }
    }
    void recuperar();
    const desassinar = assinarPresenca(
      credencial,
      (evento) => {
        if (!ativo) return;
        if (evento.tipo === 'encerrada') {
          setSala(null);
          setMensagensOnline([]);
          setErro('Sala encerrada pelo mestre.');
          return;
        }
        if (evento.tipo === 'presenca') {
          setSala(evento.sala);
          return;
        }
        if (evento.tipo === 'chat') {
          const m = evento.mensagem;
          if (m.id !== ultimaIdOnlineRef.current) {
            ultimaIdOnlineRef.current = m.id;
            if (!contextoRef.current.visivel && m.autorId !== contextoRef.current.proprioId)
              setNovas((n) => n + 1);
          }
          setMensagensOnline((anterior) =>
            anterior.some((x) => x.id === m.id) ? anterior : [...anterior, m].slice(-200),
          );
        }
      },
      (conexao) => {
        if (ativo) {
          setStatus(conexao);
          if (conexao === 'conectado') void recuperar();
        }
      },
    );
    return () => {
      ativo = false;
      desassinar();
    };
  }, [credencial?.codigo, credencial?.token]);

  useEffect(() => {
    if (online) return;
    const sincronizar = () => {
      const novos = lerMensagensChat(campanhaId);
      setMensagensLocais(novos);
      const ultimo = novos.at(-1)?.mensagemId || '';
      if (!visivel && ultimo && ultimo !== ultimaIdLocalRef.current) {
        const nova = novos.find((m) => m.mensagemId === ultimo);
        if (
          nova &&
          (!particular || destinatarioAtual) &&
          mensagensCanalChat([nova], autorAtual.id, particular ? destinatarioAtual?.id : undefined)
            .length
        )
          setNovas((n) => n + 1);
      }
      ultimaIdLocalRef.current = ultimo;
    };
    const evento = (e: Event) => {
      if ((e as CustomEvent<{ campanhaId: string }>).detail?.campanhaId === campanhaId)
        sincronizar();
    };
    const armazenamento = (e: StorageEvent) => {
      if (e.key === chaveChatMesa(campanhaId) || e.key === null) sincronizar();
    };
    window.addEventListener(EVENTO_CHAT_MESA, evento);
    window.addEventListener('storage', armazenamento);
    return () => {
      window.removeEventListener(EVENTO_CHAT_MESA, evento);
      window.removeEventListener('storage', armazenamento);
    };
  }, [online, campanhaId, visivel, autorAtual.id, particular, destinatarioAtual?.id]);
  useEffect(() => {
    if (visivel) {
      setNovas(0);
      campoRef.current?.focus();
    }
  }, [visivel]);
  useEffect(() => {
    onNovas?.(novas);
  }, [novas, onNovas]);
  useEffect(() => {
    if (visivel && estavaNoFim.current)
      listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'auto' });
  }, [mensagensVisiveis, visivel]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (enviando) return;
    if (particular && !destinatarioAtual) {
      setErro('Escolha alguém para a conversa particular.');
      return;
    }
    const conteudo = rascunho.replace(/\r\n?/g, '\n').trim();
    if (!conteudo || conteudo.length > MAX_TEXTO_CHAT) {
      setErro(`Digite uma mensagem de até ${MAX_TEXTO_CHAT} caracteres.`);
      return;
    }
    estavaNoFim.current = true;
    setEnviando(true);
    setErro('');
    try {
      if (credencial) {
        if (status !== 'conectado' || !proprioId)
          throw new Error('Aguarde a conexão à sala para enviar mensagens.');
        const persona =
          possoFalarComoPersonagem && ['npc', 'inimigo'].includes(autorAtual.tipo)
            ? personagens.find((p) => p.id === autorAtual.id && ['npc', 'inimigo'].includes(p.tipo))
            : undefined;
        const foto = persona ? await miniaturaChat(persona.foto) : undefined;
        const resposta = await solicitar<{ mensagem: MensagemChatSala }>(
          `${urlSala(credencial.codigo)}/chat`,
          {
            method: 'POST',
            headers: autorizar(credencial.token),
            body: JSON.stringify({
              texto: conteudo,
              ...(particular ? { destinatarioId: destinatarioAtual?.id } : {}),
              ...(persona
                ? {
                    persona: {
                      id: persona.id,
                      nome: persona.nome,
                      tipo: persona.tipo,
                      cor: persona.cor,
                      ...(foto ? { foto } : {}),
                    },
                  }
                : {}),
            }),
          },
        );
        setMensagensOnline((anterior) =>
          anterior.some((m) => m.id === resposta.mensagem.id)
            ? anterior
            : [...anterior, resposta.mensagem].slice(-200),
        );
      } else {
        const mensagem = criarMensagemChat(
          autorAtual,
          conteudo,
          cenaNome,
          Date.now(),
          undefined,
          particular ? destinatarioAtual : undefined,
        );
        if (!mensagem) throw new Error('Mensagem inválida.');
        setMensagensLocais(enviarMensagemChat(campanhaId, mensagem));
      }
      setRascunho('');
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }
  function enviarPeloTeclado(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  }
  function limpar() {
    try {
      apagarHistoricoChat(campanhaId);
      setMensagensLocais([]);
      setConfirmarLimpeza(false);
      setErro('');
      setNovas(0);
      ultimaIdLocalRef.current = '';
    } catch {
      setErro('Não foi possível apagar o histórico.');
    }
  }
  return (
    <div className="pm-chat" aria-label="Conversa da campanha">
      <div className="pm-chat-intro">
        <div>
          <strong>CONVERSA DA CAMPANHA</strong>
          <span>Geral e particular · Mesa 2D e 3D</span>
        </div>
        <span
          className="pm-chat-local"
          title={
            online
              ? 'Conversa da sala multiplayer, entregue pelo servidor'
              : 'Conversa salva localmente nesta campanha'
          }
        >
          {online ? (status === 'conectado' ? '● ONLINE' : '◌ CONECTANDO') : 'LOCAL'}
        </span>
      </div>
      <div className="pm-chat-barra">
        {online && credencial?.papel === 'convidado' ? (
          <span className="pm-chat-autor-rotulo">Falar como</span>
        ) : (
          <label htmlFor="pm-chat-autor">Falar como</label>
        )}
        {online && credencial?.papel === 'convidado' ? (
          <strong className="pm-chat-autor-fixo">{autorAtual.nome}</strong>
        ) : (
          <select
            id="pm-chat-autor"
            value={autorAtual.id}
            onChange={(e) => {
              setAutorId(e.target.value);
              if (!online) salvarAutorChat(campanhaId, e.target.value);
              setNovas(0);
              estavaNoFim.current = true;
            }}
          >
            {autores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tipo === 'mestre' ? '✦ ' : ''}
                {a.nome}
                {a.tipo === 'npc' ? ' · NPC' : a.tipo === 'inimigo' ? ' · Inimigo' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="pm-chat-canais" role="group" aria-label="Canal da conversa">
        <button
          type="button"
          className={canal === 'geral' ? 'ativo' : ''}
          onClick={() => {
            setCanal('geral');
            setNovas(0);
            estavaNoFim.current = true;
          }}
        >
          ☰ Geral
        </button>
        <button
          type="button"
          className={particular ? 'ativo' : ''}
          onClick={() => {
            setCanal('particular');
            setNovas(0);
            estavaNoFim.current = true;
          }}
          disabled={!destinatarios.length}
        >
          ✉ Particular
        </button>
      </div>
      {particular && (
        <div className="pm-chat-destinatario">
          {iconeAutor(destinatarioAtual?.id || 'mestre', destinatarioAtual?.nome || '')}
          <label htmlFor="pm-chat-destino">Conversar com</label>
          <select
            id="pm-chat-destino"
            value={destinatarioAtual?.id || ''}
            onChange={(e) => {
              setDestinatarioId(e.target.value);
              setNovas(0);
              estavaNoFim.current = true;
            }}
          >
            {destinatarios.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
                {a.tipo === 'npc' ? ' · NPC' : a.tipo === 'inimigo' ? ' · Inimigo' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {particular && (
        <p className="pm-chat-aviso-privado">
          {online
            ? 'Conversa privada: somente você e o destinatário recebem estas mensagens.'
            : 'Particular nesta instalação: quem controla o Portal pode selecionar qualquer personagem e consultar estas mensagens.'}
        </p>
      )}
      <div
        className="pm-chat-historico"
        ref={listaRef}
        role="log"
        aria-label={nomeCanal}
        aria-live="polite"
        aria-relevant="additions text"
        onScroll={(e) => {
          const el = e.currentTarget;
          estavaNoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 54;
        }}
      >
        {!mensagensVisiveis.length && (
          <div className="pm-chat-vazio">
            <span>{particular ? '✉' : '✧'}</span>
            <strong>{particular ? 'Conversa particular' : 'O começo de uma história'}</strong>
            <p>
              {particular
                ? `As mensagens entre ${autorAtual.nome} e ${destinatarioAtual?.nome || 'outro participante'} aparecerão aqui.`
                : online
                  ? 'Envie a primeira mensagem da sala. Todos os participantes conectados poderão vê-la.'
                  : 'Escreva a primeira mensagem. A conversa fica salva nesta campanha, mesmo depois de fechar a janela.'}
            </p>
          </div>
        )}
        {mensagensVisiveis.map((m, i) => (
          <div className={`pm-chat-mensagem pm-chat-${m.tipo}`} key={m.mensagemId}>
            {iconeAutor(m.avatarId || m.id, m.nome, m.avatarFoto, m.avatarCor)}
            <div className="pm-chat-mensagem-conteudo">
              <div className="pm-chat-mensagem-meta">
                <strong>
                  {m.tipo === 'mestre' ? '✦ ' : ''}
                  {m.nome}
                </strong>
                <time dateTime={new Date(m.criadaEm).toISOString()}>{hora(m.criadaEm)}</time>
              </div>
              <p>{m.texto}</p>
              {m.cenaNome && i === mensagensVisiveis.length - 1 && <small>{m.cenaNome}</small>}
            </div>
          </div>
        ))}
      </div>
      {novas > 0 && !visivel && <span className="pm-chat-novas">{novas} novas mensagens</span>}
      <form className="pm-chat-form" onSubmit={(e) => void enviar(e)}>
        <label htmlFor="pm-chat-texto">
          {particular
            ? `Mensagem particular para ${destinatarioAtual?.nome || '…'}`
            : 'Mensagem geral'}
        </label>
        <textarea
          ref={campoRef}
          id="pm-chat-texto"
          aria-label="Escrever mensagem no chat"
          maxLength={MAX_TEXTO_CHAT}
          rows={3}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={enviarPeloTeclado}
          placeholder={
            particular
              ? `Mensagem para ${destinatarioAtual?.nome || '…'}…`
              : `Escrever como ${autorAtual.nome}…`
          }
        />
        <div className="pm-chat-form-rodape">
          <small>
            Enter envia · Shift + Enter quebra linha · {rascunho.length}/{MAX_TEXTO_CHAT}
          </small>
          <button
            type="submit"
            disabled={
              enviando ||
              !rascunho.trim() ||
              (particular && !destinatarioAtual) ||
              (online && (status !== 'conectado' || !proprioId))
            }
          >
            {enviando ? 'Enviando…' : particular ? 'Enviar particular ↗' : 'Enviar ↗'}
          </button>
        </div>
      </form>
      {erro && (
        <p className="pm-chat-erro" role="alert">
          {erro}
        </p>
      )}
      <div className="pm-chat-rodape">
        {online ? (
          <span>
            Histórico disponível enquanto a sala estiver ativa. Mensagens particulares não são
            gravadas no histórico local.
          </span>
        ) : confirmarLimpeza ? (
          <div className="pm-chat-confirmacao">
            <span>Apagar todas as mensagens desta campanha?</span>
            <button type="button" onClick={() => setConfirmarLimpeza(false)}>
              Cancelar
            </button>
            <button className="pm-chat-apagar" type="button" onClick={limpar}>
              Apagar
            </button>
          </div>
        ) : (
          <>
            <span>O histórico geral e particular local entra no backup completo do mestre.</span>
            <button
              type="button"
              disabled={!mensagensLocais.length}
              onClick={() => setConfirmarLimpeza(true)}
            >
              Limpar histórico
            </button>
          </>
        )}
      </div>
    </div>
  );
}
