import { criarGerenciadorEventosCompartilhados } from './eventosCompartilhados.mjs';
import { criarConexaoWebSocket, usarWebSocketNoHost } from './websocketEventos.mjs';
import { origemServidorMultiplayer, raizServidorMultiplayer } from './configuracaoServidor.mjs';
/** Protocolo local: presença, movimento validado, ficha privada e rolagens verificadas pelo servidor. */
export type ParticipanteSala = {
  id: string;
  apelido: string;
  papel: 'mestre' | 'convidado';
  conectado: boolean;
  personagemId: string | null;
  personagemNome?: string | null;
};
export type ResumoSala = {
  codigo: string;
  campanha: string;
  hostOnline: boolean;
  mesaControlada: boolean;
  participantes: ParticipanteSala[];
  limiteConvidados: number;
};
export type ConviteSala = {
  codigo: string;
  campanha: string;
  hostOnline: boolean;
  quantidadeConvidados: number;
  limiteConvidados: number;
};
export type CredencialSala = {
  codigo: string;
  token: string;
  papel: 'mestre' | 'convidado';
  id?: string;
  apelido?: string;
};
/** Apenas propriedades VISUAIS publicadas: nunca enviar dados privados da ficha ou da campanha. */
export type TokenPublico = {
  id: string;
  nome: string;
  tipo: 'jogador' | 'npc' | 'inimigo';
  x: number;
  y: number;
  cor: string;
  travado: boolean;
  imagem?: string;
  animacao?: string;
  topview?: boolean;
  ocultarNome?: boolean;
  tamanho?: number;
  largura3D?: number;
  altura3D?: number;
  rotacao?: number;
  espelhadoX?: boolean;
  fundo?: string;
  enquadramento?: import('../lib/enquadramentoToken').EnquadramentoImagem;
  idlePausado?: boolean;
  idleVelocidade?: number;
};
/** Retratos da equipe: não transportam coordenadas ou dados privados. */
export type RetratoGrupoPublico = {
  id: string;
  nome: string;
  tipo: 'jogador';
  cor: string;
  imagem?: string;
  animacao?: string;
  enquadramento?: import('../lib/retratoAjuste').AjusteRetrato;
};
export type CombatePublico = {
  ativo: boolean;
  rodada: number;
  turnoId: string | null;
  ordem: string[];
  valores?: Record<string, number>;
};
export type MesaPublica = {
  combate?: CombatePublico;
  revisao?: number;
  cenaId: string;
  cenaNome: string;
  modoMesa?: '2d' | '3d';
  permitirDesenhoJogadores?: boolean;
  visibilidade: 'total' | 'restrita' | 'individual';
  aspecto?: number;
  escalaMapa?: number;
  imagem: string | null;
  tokens: TokenPublico[];
  grupo?: RetratoGrupoPublico[];
  vistas?: Array<{
    personagemId: string;
    imagem: string | null;
    idsVisiveis: string[];
    mascara3D?: string;
    poligono3D?: { x: number; y: number }[];
    objetos3DVisiveis?: string[];
    miniaturas3DVisiveis?: string[];
  }>;
  mascara3D?: string;
  poligono3D?: { x: number; y: number }[];
  ambiente?: import('./ambientePublicado').AmbientePublicado;
  cenario3D?: import('../mesa3d/cenarioPublico3D').CenarioPublico3D;
};
/** Dados estritamente de jogo da própria ficha Ímpeto, não a ficha integral do Criador. */
export type FichaImpetoCompartilhada = {
  escala: 'avatar-a01' | 'universal-v1';
  atributos: Array<{ nome: string; valor: number }>;
  pericias: Array<{ nome: string; bonus: number }>;
  arquetipo: string;
  talento: string;
  vantagem: string;
  derivacao: { tipo: string; atributo: string; justificativa: string };
  investimento: {
    hp: number;
    energia: number;
    ca: number;
    ataqueDados: number;
    regeneracao: number;
  };
};
export type CondicaoFichaCompartilhada = {
  id: string;
  nome: string;
  turnos: number;
  tipo: 'buff' | 'debuff' | 'condicao';
  origem?: string;
};
export type AcaoFichaCompartilhada = {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  custo?: number;
  valor?: string;
  descricao?: string;
  restricoes?: string;
  fonte?: 'a01' | 'universal' | 'legado' | 'manual';
  ativacao?: 'principal' | 'buff' | 'reacao' | 'exploracao' | 'passiva';
  pc?: number;
  px?: number;
  enIndefinida?: boolean;
  exigeCA?: boolean;
};
export type FichaCompartilhada = {
  id: string;
  nome: string;
  elemento: string;
  classe: string;
  hp: number;
  hpMax: number;
  mana: number;
  manaMax: number;
  ca: number;
  escudo: number;
  temFicha: boolean;
  acoes: AcaoFichaCompartilhada[];
  impeto?: FichaImpetoCompartilhada;
  condicoes?: CondicaoFichaCompartilhada[];
};
export type PaginaEnviadaPersonagem = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  tipo: 'nota' | 'imagem' | 'pasta';
  pastaId: string;
  formato: 'texto' | 'html';
  imagem: string;
  criadaEm: string;
  atualizadaEm: string;
};
export type DiarioRecebidoMestre = {
  id: string;
  apelido: string;
  personagemId: string;
  personagemNome: string;
  recebidoEm: string;
  pagina: PaginaEnviadaPersonagem;
  permissao: 'ver' | 'editar';
};
export type PaginaDiarioCompartilhada = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  tipo: 'nota' | 'imagem' | 'pasta';
  pastaId: string;
  formato: 'texto' | 'html';
  imagem: string;
  fixada: boolean;
  criadaEm: string;
  atualizadaEm: string;
  origem?: 'mestre' | 'personagem';
  proprietario?: string;
  permissao?: 'ver' | 'editar';
};
export type ItemCompartilhado = {
  id: string;
  nome: string;
  categoria: string;
  efeito: string;
  valor: string;
  descricao: string;
  consumivel: boolean;
  quantidade: number;
  imagem?: string;
  conteudo?: string;
  imagemConteudo?: string;
};
export type InventarioCompartilhado = {
  id: string;
  nome: string;
  itens: ItemCompartilhado[];
  destinatarios?: Array<{ id: string; nome: string }>;
};
export type PedidoItemCompartilhado = {
  tipo: 'pedido-item';
  pedidoId: string;
  pessoaId: string;
  personagemId: string;
  itemId: string;
  quantidade: number;
  destinatarioId: string | null;
  criadoEm: number;
  operacao: 'usar' | 'transferir';
  solicitante?: string;
  personagemNome?: string;
  itemNome?: string;
  itemCategoria?: string;
  destinoNome?: string | null;
  iniciadoEm?: number;
};
export type ResultadoPedidoItem = { pedidoId: string; ok: boolean; mensagem: string };
export type MensagemChatSala = {
  id: string;
  autorId: string;
  autorNome: string;
  texto: string;
  criadaEm: number;
  personagemId?: string;
  destinatarioId?: string;
  destinatarioNome?: string;
  persona?: { id: string; nome: string; tipo: 'npc' | 'inimigo'; cor?: string; foto?: string };
};
export type AparenciaDadosCompartilhada =
  | { tipo: 'preset'; id: 'marmore' | 'obsidiana' | 'jade' | 'oceano' | 'brasa' }
  | { tipo: 'custom'; arte: import('../hexatombe/diceLibrary').DiceArtPackage };
export type RolagemCompartilhada = {
  id: string;
  hora: string;
  participante: string;
  participanteId: string;
  personagemId: string;
  personagem: string;
  acaoNome: string;
  categoria: string;
  formula: string;
  dados: number[];
  modificador: number;
  total: number;
  visibilidade?: 'publica' | 'mestre';
  origem?: 'mestre' | 'convidado';
  origemId?: string;
  aparencia?: AparenciaDadosCompartilhada;
};
export type EventoDadosAoVivo = {
  tipo: 'dados-ao-vivo';
  acao: 'inicio' | 'sinal' | 'fim';
  id: string;
  emissorId: string;
  remetenteId?: string;
  sinal?: { tipo: 'oferta' | 'resposta' | 'ice'; sdp?: string; candidato?: RTCIceCandidateInit };
};
export type MusicaCompartilhada = {
  id: string;
  titulo: string;
  origem: 'arquivo' | 'url';
  endereco?: string;
  tocando: boolean;
  posicao: number;
  atualizadoEm: number;
};
export type EventoSala =
  | {
      tipo: 'ambiente-mesa';
      cenaId: string;
      ambiente?: MesaPublica['ambiente'];
      periodoDia3D?: 'dia' | 'entardecer' | 'noite';
    }
  | { tipo: 'video-rolagem'; rolagemId: string }
  | { tipo: 'presenca' | 'encerrada'; sala: ResumoSala }
  | { tipo: 'mesa'; mesa: MesaPublica }
  | {
      tipo: 'pedido-movimento';
      cenaId: string;
      personagemId: string;
      x: number;
      y: number;
      gestoId?: string;
    }
  | { tipo: 'ficha'; ficha: FichaCompartilhada | null }
  | { tipo: 'rolagem'; rolagem: RolagemCompartilhada }
  | { tipo: 'inventario'; inventario: InventarioCompartilhado | null }
  | { tipo: 'diario'; paginas: PaginaDiarioCompartilhada[] }
  | { tipo: 'diario-personagem'; recebidos: DiarioRecebidoMestre[] }
  | {
      tipo: 'diario-pessoal-editado';
      paginaId: string;
      campos: {
        titulo?: string;
        conteudo?: string;
        imagem?: string;
        formato?: 'html' | 'texto';
        atualizadaEm: string;
      };
    }
  | EventoDadosAoVivo
  | {
      tipo: 'desenho-jogador';
      acao: 'adicionar' | 'remover';
      cenaId: string;
      traco?: import('../lib/anotacoesMesa').TracoDesenho;
      id?: string;
    }
  | { tipo: 'desenho-confirmado'; cenaId: string; id: string }
  | {
      tipo: 'posicoes-tokens';
      cenaId: string;
      revisao: number;
      posicoes: Array<{ id: string; x: number; y: number }>;
    }
  | {
      tipo: 'arrasto-token';
      cenaId: string;
      id: string;
      x: number;
      y: number;
      final: boolean;
      sequencia: number;
    }
  | { tipo: 'arrasto-bloqueado'; cenaId: string; gestoId: string }
  | PedidoItemCompartilhado
  | { tipo: 'resultado-item'; resultado: ResultadoPedidoItem }
  | { tipo: 'chat'; mensagem: MensagemChatSala }
  | { tipo: 'musica'; musica: MusicaCompartilhada | null };

const validarCodigo = (codigo: string) => /^[A-Z2-9]{8}$/.test(codigo);
export const urlConvite = (codigo: string) => {
  const convite = new URL('/convidado/', window.location.origin);
  convite.searchParams.set('sala', codigo);
  const remoto = origemServidorMultiplayer();
  if (remoto) convite.searchParams.set('servidor', remoto);
  return convite.toString();
};
export const urlRaizMultiplayer = () => raizServidorMultiplayer();
export const urlSala = (codigo: string) => `${raizServidorMultiplayer()}/salas/${encodeURIComponent(codigo)}`;
export const chaveMestre = (campanhaId: string) =>
  `portal-multiplayer-mestre-v1:${campanhaId}${origemServidorMultiplayer() ? `@${origemServidorMultiplayer()}` : ''}`;
export const chaveConvidado = (codigo: string) =>
  `portal-multiplayer-convidado-v1:${codigo}${origemServidorMultiplayer() ? `@${origemServidorMultiplayer()}` : ''}`;

// Credenciais locais são SEGREDOS de acesso à sessão. Persistem somente no
// navegador usado pelo participante e são apagadas ao sair/encerrar a sala.
// O sessionStorage antigo continua sendo lido para migração sem novo login.
export function lerCredencial(chave: string): CredencialSala | null {
  for (const tipo of ['session', 'local'] as const) {
    try {
      const storage = tipo === 'session' ? sessionStorage : localStorage;
      const valor = JSON.parse(storage.getItem(chave) || 'null');
      if (
        valor &&
        validarCodigo(valor.codigo) &&
        typeof valor.token === 'string' &&
        valor.token.length > 20 &&
        ((chave.startsWith('portal-multiplayer-mestre-v1:') && valor.papel === 'mestre') ||
          (chave.startsWith('portal-multiplayer-convidado-v1:') && valor.papel === 'convidado')) &&
        (valor.papel !== 'convidado' || typeof valor.id === 'string') &&
        (valor.papel === 'mestre' || chave === chaveConvidado(valor.codigo))
      )
        return valor;
    } catch {
      /* armazenamento bloqueado ou registro inválido */
    }
  }
  return null;
}
export function salvarCredencial(chave: string, credencial: CredencialSala) {
  try {
    sessionStorage.setItem(chave, JSON.stringify(credencial));
  } catch {
    /* privado */
  }
  try {
    localStorage.setItem(chave, JSON.stringify(credencial));
  } catch {
    /* privado */
  }
}
export function limparCredencial(chave: string) {
  try {
    sessionStorage.removeItem(chave);
  } catch {
    /* privado */
  }
  try {
    localStorage.removeItem(chave);
  } catch {
    /* privado */
  }
}
export class ErroHttpMultiplayer extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ErroHttpMultiplayer';
  }
}
export const credencialRevogada = (erro: unknown) =>
  erro instanceof ErroHttpMultiplayer && [401, 404].includes(erro.status);

export async function solicitar<T>(url: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      cache: 'no-store',
      ...opcoes,
      headers: {
        ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opcoes.headers || {}),
      },
    });
  } catch {
    throw new Error(
      'Servidor multiplayer indisponível. Inicie o projeto com npm run dev:multiplayer.',
    );
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok)
    throw new ErroHttpMultiplayer(dados.erro || `Falha HTTP ${resposta.status}.`, resposta.status);
  return dados as T;
}
export const autorizar = (token: string) => ({ Authorization: `Bearer ${token}` });
// Todas as interfaces autenticadas desta janela utilizam o MESMO fluxo SSE.
// O canal de controle é habilitado apenas quando PublicadorMesa está montado.
const eventosValidos = [
  'presenca',
  'encerrada',
  'mesa',
  'ambiente-mesa',
  'pedido-movimento',
  'ficha',
  'rolagem',
  'inventario',
  'diario',
  'diario-personagem',
  'diario-pessoal-editado',
  'pedido-item',
  'resultado-item',
  'desenho-jogador',
  'desenho-confirmado',
  'posicoes-tokens',
  'arrasto-token',
  'arrasto-bloqueado',
  'chat',
  'video-rolagem',
  'dados-ao-vivo',
  'musica',
];
const conexoesCompartilhadas = criarGerenciadorEventosCompartilhados((url: string) =>
  usarWebSocketNoHost(new URL(url, window.location.href).hostname)
    ? criarConexaoWebSocket(url)
    : new EventSource(url),
);
export function assinarPresenca(
  credencial: CredencialSala,
  onEvento: (e: EventoSala) => void,
  onStatus: (status: 'conectado' | 'reconectando') => void,
  controlador = false,
) {
  return conexoesCompartilhadas.assinar(
    credencial,
    urlSala(credencial.codigo),
    eventosValidos,
    onEvento,
    onStatus,
    controlador,
  );
}
