import { miniaturasParaVisaoIndividual3D } from './miniaturasVisaoIndividual3D';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Multiplayer.css';
import {
  assinarPresenca,
  autorizar,
  chaveMestre,
  lerCredencial,
  solicitar,
  urlSala,
  type MesaPublica,
  type RolagemCompartilhada,
  type PedidoItemCompartilhado,
} from './api';
import { montarFichasCompartilhadas } from './fichaCompartilhada';
import { montarInventariosParaPublicacao } from './inventarioCompartilhado';
import { montarDiarioParaSala } from './diarioCompartilhado';
import type { PaginaDiario } from '../hexatombe/registrosDiario';
import type { FichaDados } from '../hexatombe/fichasLibrary';
import { normalizarAjusteRetrato, type AjusteRetrato } from '../lib/retratoAjuste';
import { gerarVistasIndividuais, type VistaPublicacao } from './visaoIndividualPublicada';
import { calcularPoligonoVisao, type BarreiraMapa } from '../lib/lighting';
import { prepararAmbientePublicado, type LuzPublicada } from './ambientePublicado';
import { normalizarDesenhos, type TracoDesenho } from '../lib/anotacoesMesa';
import { aparenciaTokenAtiva, corFundoToken, type AparenciaToken } from '../lib/aparenciaToken';
import { enquadramentoTokenAtivo, type EnquadramentoImagem } from '../lib/enquadramentoToken';
import { parametrosIdleAtivos, type TokenSkin } from '../lib/tokenSkins';
import { carregarCenario3D, dimensoesTerreno3D } from '../mesa3d/editorCena3D';
import { projetarCenarioPublico3D } from '../mesa3d/cenarioPublico3D';
import { carregarMiniatura3D } from '../lib/bibliotecaMiniaturas3D';
import { carregarArquivo } from '../lib/storage';
import { chaveArquivoCampanha } from '../hexatombe/campaignLibrary';
import { CHAVE_PISO_3D } from '../mesa3d/pisoConstruicao3D';
import { chaoParaPercentual3D, referenciaTokens3D } from '../mesa3d/mesaLivre3D';

type Props = {
  campanhaId: string;
  combate?: { ativo: boolean; rodada: number; turnoId: string | null; ordem: string[] };
  modoMesa?: '2d' | '3d';
  cena: {
    id: string;
    nome: string;
    visibilidade: string;
    permitirDesenhoJogadores?: boolean;
    largura?: number;
    altura?: number;
    camadas?: {
      fundo?: boolean;
      tokens?: boolean;
      jogadores?: boolean;
      npcs?: boolean;
      inimigos?: boolean;
      marcadores?: boolean;
      objetos?: boolean;
    };
    tokens: Record<
      string,
      {
        x: number;
        y: number;
        tamanho?: number;
        largura3D?: number;
        altura3D?: number;
        rotacao?: number;
        espelhadoX?: boolean;
        skinId?: string;
        visao?: number;
        oculto?: boolean;
        ocultarNome?: boolean;
        travado?: boolean;
        emiteLuz?: boolean;
        alcanceLuz?: number;
        corLuz?: string;
      }
    >;
    barreiras?: BarreiraMapa[];
    nevoa?: Array<{
      acao: 'revelar' | 'ocultar';
      pontos: { x: number; y: number }[];
      raio: number;
    }>;
    exploracaoPorToken?: Record<string, string>;
    clima?: unknown;
    iluminacao?: { ativa?: boolean; ambiente?: number };
    fontesLuz?: Array<{ x: number; y: number; cor: string; alcance: number; ativa: boolean }>;
    marcadores?: unknown;
    desenhos?: unknown;
  };
  unidades: Array<{
    id: string;
    nome: string;
    tipo: string;
    cor: string;
    elemento: string;
    hp: number;
    hpMax: number;
    mana: number;
    manaMax: number;
    ca: number;
    iniciativa?: number;
    escudo?: number;
    fichaId?: string;
    condicoes?: import('../hexatombe/efeitosCombate').EfeitoCombate[];
    itens?: import('../hexatombe/itensLibrary').ItemInventario[];
    retratoEnquadramento?: AjusteRetrato;
    tokenEnquadramento?: EnquadramentoImagem;
    tokenAparencia?: AparenciaToken;
    skins?: TokenSkin[];
    skinPadraoId?: string;
    tokenIdleGif?: boolean;
    tokenIdlePausado?: boolean;
    tokenIdleVelocidade?: number;
  }>;
  fichas: Array<{ id: string; dados: FichaDados }>;
  paginasDiario?: PaginaDiario[];
  urlMapa: string | null;
  aspectoMapa?: number;
  imagensTokens?: Record<string, string | undefined>;
  tokensTopview?: Record<string, boolean>;
  retratosGrupo?: Record<string, string | undefined>;
  onMoverTokenRemoto: (pedido: {
    cenaId: string;
    personagemId: string;
    x: number;
    y: number;
    gestoId?: string;
  }) => boolean;
  onDesenhoRemoto: (pedido: {
    acao: 'adicionar' | 'remover';
    cenaId: string;
    traco?: TracoDesenho;
    id?: string;
  }) => void;
  onRolagensMultiplayer: (rolagens: RolagemCompartilhada[]) => void;
  onPedidoItemRemoto: (
    pedido: PedidoItemCompartilhado,
  ) => Promise<{ ok: boolean; mensagem: string }>;
};

/** Converte somente o mapa público para imagem pequena; nunca expõe o IndexedDB nem a campanha inteira. */
async function reduzirMapa(url: string): Promise<string | null> {
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw Error('Mapa não disponível');
    return r.blob();
  });
  if (blob.size > 15_000_000) return null;
  const endereco = URL.createObjectURL(blob);
  try {
    const imagem = new Image();
    await new Promise<void>((resolve, reject) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => reject(Error('Imagem inválida'));
      imagem.src = endereco;
    });
    const escala = Math.min(1, 1500 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    canvas.getContext('2d')?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const saida = canvas.toDataURL('image/webp', 0.9);
    if (saida.length <= 1_900_000) return saida;
    const menor = canvas.toDataURL('image/webp', 0.75);
    if (menor.length <= 1_900_000) return menor;
    const fator = Math.min(1, 1100 / Math.max(canvas.width, canvas.height));
    const reserva = document.createElement('canvas');
    reserva.width = Math.max(1, Math.round(canvas.width * fator));
    reserva.height = Math.max(1, Math.round(canvas.height * fator));
    reserva.getContext('2d')?.drawImage(canvas, 0, 0, reserva.width, reserva.height);
    const ultima = reserva.toDataURL('image/webp', 0.7);
    return ultima.length <= 1_900_000 ? ultima : null;
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

/** Miniaturas (até 128 px) dos tokens visíveis: não transferir fotos em tamanho original. */
async function reduzirToken(url: string): Promise<string | undefined> {
  try {
    const imagem = new Image();
    await new Promise<void>((resolve, reject) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => reject(new Error('Imagem inválida'));
      imagem.src = url;
    });
    if (!imagem.naturalWidth || !imagem.naturalHeight) return undefined;
    const max = 128,
      escala = Math.min(1, max / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    canvas.getContext('2d')?.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/webp', 0.65);
    return data.length <= 45_000 ? data : undefined;
  } catch {
    return undefined;
  }
}

/** O GIF animado fica fora da publicação SSE e é carregado uma única vez por convidado. */
const gifEnviado = new Map<string, string>();
async function publicarGifOriginal(
  url: string,
  cred: { codigo: string; token: string } | null,
): Promise<string | undefined> {
  if (!cred) return;
  const chave = `${cred.codigo}:${url}`;
  const anterior = gifEnviado.get(chave);
  if (anterior) return anterior;
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return;
    const blob = await resposta.blob();
    if (blob.size < 20 || blob.size > 3_000_000) return;
    const assinatura = await blob.slice(0, 6).text();
    if (assinatura !== 'GIF87a' && assinatura !== 'GIF89a') return;
    const upload = await fetch(`${urlSala(cred.codigo)}/midias`, {
      method: 'POST',
      headers: { ...autorizar(cred.token), 'Content-Type': 'image/gif' },
      body: blob,
    });
    if (!upload.ok) return;
    const json = (await upload.json()) as { id?: string };
    if (json.id && /^[a-f0-9]{32}$/.test(json.id)) {
      gifEnviado.set(chave, json.id);
      return json.id;
    }
  } catch {
    /* Servidor antigo ou arquivo inválido: usa a miniatura estática. */
  }
}
/** Quadro público + comandos remotos autorizados; o mestre continua sendo dono da campanha. */
export default function PublicadorMesa({
  campanhaId,
  combate,
  modoMesa = '2d',
  cena,
  unidades,
  fichas,
  paginasDiario = [],
  urlMapa,
  aspectoMapa,
  imagensTokens,
  tokensTopview,
  retratosGrupo,
  onMoverTokenRemoto,
  onDesenhoRemoto,
  onRolagensMultiplayer,
  onPedidoItemRemoto,
}: Props) {
  const moverRef = useRef(onMoverTokenRemoto);
  moverRef.current = onMoverTokenRemoto;
  // Mesmo que várias amostras já estejam no SSE, um gesto que bateu
  // na parede não volta a mover o personagem até o próximo clique.
  const gestosInterrompidosRef = useRef(new Map<string, string>());
  const desenhoRef = useRef(onDesenhoRemoto);
  desenhoRef.current = onDesenhoRemoto;
  const pedidoItemRef = useRef(onPedidoItemRemoto);
  pedidoItemRef.current = onPedidoItemRemoto;
  const rolagensRef = useRef(onRolagensMultiplayer);
  rolagensRef.current = onRolagensMultiplayer;
  const [revisaoSala, setRevisaoSala] = useState(0);
  // A Mesa 3D usa a mesma estrutura de cena do mestre (roomScene.ts).
  // O iframe 3D persiste no mesmo domínio; storage + conferência leve mantém
  // a publicação sincronizada sem recriar a GPU nem retransmitir mapas à toa.
  const [cenarioAtual3D, setCenarioAtual3D] = useState(() =>
    carregarCenario3D(campanhaId, cena.id),
  );
  const [modelosProntos, setModelosProntos] = useState<Set<string>>(() => new Set());
  const salaDosModelosRef = useRef('');
  useEffect(() => {
    let assinatura = '';
    const verificar = () => {
      const atual = carregarCenario3D(campanhaId, cena.id);
      const nova = JSON.stringify(atual);
      if (nova !== assinatura) {
        assinatura = nova;
        setCenarioAtual3D(atual);
      }
    };
    verificar();
    const intervalo = window.setInterval(verificar, 1500);
    const armazenamento = (e: StorageEvent) => {
      if (e.key === `portal-mestre-cenario3d-v1:${campanhaId}:${cena.id}`) verificar();
    };
    const atualizacaoLocal = (evento: Event) => {
      const detalhe = (evento as CustomEvent<{ campanhaId: string; cenaId: string }>).detail;
      if (detalhe?.campanhaId === campanhaId && detalhe.cenaId === cena.id) verificar();
    };
    window.addEventListener('storage', armazenamento);
    window.addEventListener('portal-mestre-cenario3d-atualizado', atualizacaoLocal);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('storage', armazenamento);
      window.removeEventListener('portal-mestre-cenario3d-atualizado', atualizacaoLocal);
    };
  }, [campanhaId, cena.id, modoMesa]);
  const assinaturaModelos3D = JSON.stringify(
    (cenarioAtual3D.miniaturas ?? [])
      .filter((m) => m.oculto !== true)
      .map((m) => m.modeloId)
      .sort(),
  );
  useEffect(() => {
    if (!(
      cena.visibilidade === 'total' ||
      ['nevoa', 'visao', 'nevoa_visao', 'exploracao'].includes(cena.visibilidade)
    ))
      return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    let ativo = true;
    // Atualizações de cena, modo e presença não removem modelos já publicados.
    // Limpar o cache SOMENTE quando o código da sala realmente mudar.
    if (salaDosModelosRef.current !== cred.codigo) {
      salaDosModelosRef.current = cred.codigo;
      setModelosProntos(new Set());
    }
    const ids = [
      ...new Set(
        (cenarioAtual3D.miniaturas ?? []).filter((m) => m.oculto !== true).map((m) => m.modeloId),
      ),
    ];
    // Enviar sequencialmente limita o pico de RAM com modelos grandes.
    void (async () => {
      for (const id of ids) {
        if (!ativo) break;
        try {
          const blob = await carregarMiniatura3D(id);
          if (!blob || blob.size > 35_000_000) continue;
          const resposta = await fetch(
            `${urlSala(cred.codigo)}/modelos3d/${encodeURIComponent(id)}`,
            {
              method: 'POST',
              headers: { ...autorizar(cred.token), 'Content-Type': 'model/gltf-binary' },
              body: blob,
            },
          );
          if (ativo && resposta.ok) setModelosProntos((anteriores) => new Set([...anteriores, id]));
        } catch (e) {
          console.warn('[Mesa 3D] Miniatura não publicada:', id, e);
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, [campanhaId, cena.id, cena.visibilidade, modoMesa, revisaoSala, assinaturaModelos3D]);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [gifsTokens, setGifsTokens] = useState<Record<string, string>>({});
  const [gifsRetratos, setGifsRetratos] = useState<Record<string, string>>({});
  const imagensAssinatura = JSON.stringify(imagensTokens || {});
  useEffect(() => {
    let ativo = true;
    const fontes = Object.entries(imagensTokens || {}).filter((p): p is [string, string] =>
      Boolean(p[1]),
    );
    const cred = lerCredencial(chaveMestre(campanhaId));
    void Promise.all(
      fontes.map(async ([id, url]) => ({
        id,
        poster: await reduzirToken(url),
        animacao: await publicarGifOriginal(url, cred),
      })),
    ).then((imagens) => {
      if (ativo) {
        setMiniaturas(
          Object.fromEntries(imagens.filter((p) => p.poster).map((p) => [p.id, p.poster!])),
        );
        setGifsTokens(
          Object.fromEntries(imagens.filter((p) => p.animacao).map((p) => [p.id, p.animacao!])),
        );
      }
    });
    return () => {
      ativo = false;
    };
  }, [imagensAssinatura, revisaoSala, campanhaId]);
  // Retratos do grupo são independentes dos tokens no mapa: não revelam posição
  // nem a existência de NPCs/inimigos em cenas com visão limitada.
  const [retratosPequenos, setRetratosPequenos] = useState<Record<string, string>>({});
  const assinaturaRetratos = JSON.stringify(retratosGrupo || {});
  useEffect(() => {
    let ativo = true;
    const fontes = Object.entries(retratosGrupo || {}).filter((p): p is [string, string] =>
      Boolean(p[1]),
    );
    const cred = lerCredencial(chaveMestre(campanhaId));
    void Promise.all(
      fontes.map(async ([id, url]) => ({
        id,
        poster: await reduzirToken(url),
        animacao: await publicarGifOriginal(url, cred),
      })),
    ).then((valores) => {
      if (ativo) {
        setRetratosPequenos(
          Object.fromEntries(valores.filter((p) => p.poster).map((p) => [p.id, p.poster!])),
        );
        setGifsRetratos(
          Object.fromEntries(valores.filter((p) => p.animacao).map((p) => [p.id, p.animacao!])),
        );
      }
    });
    return () => {
      ativo = false;
    };
  }, [assinaturaRetratos, revisaoSala, campanhaId]);
  const [pedidos, setPedidos] = useState<PedidoItemCompartilhado[]>([]);
  const [processandoPedido, setProcessandoPedido] = useState<string | null>(null);
  const [erroPedido, setErroPedido] = useState('');
  const [pedidosVisiveis, setPedidosVisiveis] = useState(true);
  const processandoRef = useRef<string | null>(null);
  // Aprovações são explícitas: receber um pedido nunca consome ou transfere itens.
  async function decidirPedido(pedido: PedidoItemCompartilhado, aprovar: boolean) {
    if (processandoRef.current) return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    processandoRef.current = pedido.pedidoId;
    setProcessandoPedido(pedido.pedidoId);
    setErroPedido('');
    let autorizado = false;
    try {
      if (aprovar) {
        await solicitar(`${urlSala(cred.codigo)}/validar-item`, {
          method: 'POST',
          headers: autorizar(cred.token),
          body: JSON.stringify({ pedidoId: pedido.pedidoId }),
        });
        autorizado = true;
      }
      let resultado: { ok: boolean; mensagem: string } = {
        ok: false,
        mensagem: 'O mestre recusou a solicitação.',
      };
      if (aprovar) {
        try {
          resultado = await pedidoItemRef.current(pedido);
        } catch (e) {
          resultado = {
            ok: false,
            mensagem: e instanceof Error ? e.message : 'Falha ao aplicar a solicitação.',
          };
        }
      }
      await solicitar(`${urlSala(cred.codigo)}/resultado-item`, {
        method: 'POST',
        headers: autorizar(cred.token),
        body: JSON.stringify({ pedidoId: pedido.pedidoId, ...resultado }),
      });
      setPedidos((atual) => atual.filter((item) => item.pedidoId !== pedido.pedidoId));
    } catch (e) {
      setErroPedido(
        `${e instanceof Error ? e.message : 'Falha ao responder ao pedido.'}${autorizado ? ' A ação pode ter sido aplicada: não aprove novamente sem conferir o inventário.' : ''}`,
      );
      // O servidor pode ter expirado o pedido. Recupera a fila real antes de tentar outra ação.
      void solicitar<{ pedidos: PedidoItemCompartilhado[] }>(
        `${urlSala(cred.codigo)}/pedidos-itens`,
        {
          headers: autorizar(cred.token),
        },
      )
        .then((r) => setPedidos(r.pedidos))
        .catch(() => undefined);
    } finally {
      processandoRef.current = null;
      setProcessandoPedido(null);
    }
  }
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('portal-mp-pedidos', { detail: { quantidade: pedidos.length } }),
    );
  }, [pedidos.length]);
  useEffect(() => {
    const mostrar = () => setPedidosVisiveis(true);
    window.addEventListener('portal-mp-abrir-pedidos', mostrar);
    return () => {
      window.removeEventListener('portal-mp-abrir-pedidos', mostrar);
      window.dispatchEvent(new CustomEvent('portal-mp-pedidos', { detail: { quantidade: 0 } }));
    };
  }, []);

  const [imagemPronta, setImagemPronta] = useState<{ origem: string; valor: string | null } | null>(
    null,
  );
  const [pisoLegado, setPisoLegado] = useState<{ id: string; imagem: string | null } | null>(null);
  const origemMapa = `${cena.id}:${urlMapa || ''}`;
  const imagem = imagemPronta?.origem === origemMapa ? imagemPronta.valor : null;
  // Compatibilidade com pisos de cenas 3D antigas que ainda não possuem mapa 2D.
  // O arquivo original permanece privado no IndexedDB e só publicamos uma miniatura.
  const imagemPublicada =
    imagem || (!urlMapa && pisoLegado?.id === cena.id ? pisoLegado.imagem : null);
  // Pedidos chegam apenas pela conexão autenticada do mestre.
  // O estado persistente permanece na campanha local do mestre, nunca no cliente convidado.
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    let ativo = true;
    setPedidos([]);
    setErroPedido('');
    const recuperarPedidos = () => {
      void solicitar<{ pedidos: PedidoItemCompartilhado[] }>(
        `${urlSala(cred.codigo)}/pedidos-itens`,
        {
          headers: autorizar(cred.token),
        },
      )
        .then((r) => {
          if (ativo) {
            setPedidos(r.pedidos);
            if (r.pedidos.length) setPedidosVisiveis(true);
          }
        })
        .catch(() => {
          /* Reconexão automática tentará outra vez. */
        });
    };
    // SSE não reenvia eventos antigos. Ao conectar/reconectar, recupera o que
    // ocorreu enquanto o mestre navegava fora da mesa ou estava offline.
    const recuperarRolagens = () => {
      void solicitar<{ rolagens: RolagemCompartilhada[] }>(`${urlSala(cred.codigo)}/rolagens`, {
        headers: autorizar(cred.token),
      })
        .then((res) => {
          if (ativo) rolagensRef.current(res.rolagens);
        })
        .catch(() => {
          /* A próxima reconexão tenta novamente. */
        });
    };
    const desassinar = assinarPresenca(
      cred,
      (evento) => {
        if (evento.tipo === 'pedido-movimento') {
          if (
            evento.gestoId &&
            gestosInterrompidosRef.current.get(evento.personagemId) === evento.gestoId
          )
            return;
          const aceito = moverRef.current(evento);
          if (!aceito && evento.gestoId) {
            gestosInterrompidosRef.current.set(evento.personagemId, evento.gestoId);
            // Encerrar a captura do mouse do convidado, não apenas congelar o token.
            void solicitar(`${urlSala(cred.codigo)}/bloqueio-arrasto`, {
              method: 'POST',
              headers: autorizar(cred.token),
              body: JSON.stringify({
                cenaId: evento.cenaId,
                personagemId: evento.personagemId,
                gestoId: evento.gestoId,
              }),
            }).catch(() => {
              /* A reconexão e um novo clique permanecem seguros. */
            });
          }
        }
        if (evento.tipo === 'desenho-jogador') desenhoRef.current(evento);
        if (evento.tipo === 'rolagem') rolagensRef.current([evento.rolagem]);
        if (evento.tipo === 'pedido-item') {
          setPedidos((atual) =>
            atual.some((p) => p.pedidoId === evento.pedidoId) ? atual : [...atual, evento],
          );
          setPedidosVisiveis(true);
        }
        if (evento.tipo === 'resultado-item') {
          setPedidos((atual) => atual.filter((p) => p.pedidoId !== evento.resultado.pedidoId));
        }
      },
      (estado) => {
        if (estado === 'conectado') {
          recuperarRolagens();
          recuperarPedidos();
        }
      },
      true,
    );
    return () => {
      ativo = false;
      desassinar();
    };
  }, [campanhaId, revisaoSala]);
  useEffect(() => {
    const atualizar = () => setRevisaoSala((n) => n + 1);
    window.addEventListener('portal-multiplayer-sala', atualizar);
    return () => window.removeEventListener('portal-multiplayer-sala', atualizar);
  }, []);
  useEffect(() => {
    if (!cena.camadas?.fundo || !urlMapa) {
      setImagemPronta(null);
      return;
    }
    let ativo = true;
    void reduzirMapa(urlMapa)
      .then((valor) => {
        if (ativo) setImagemPronta({ origem: origemMapa, valor });
      })
      .catch(() => {
        if (ativo) setImagemPronta({ origem: origemMapa, valor: null });
      });
    return () => {
      ativo = false;
    };
  }, [origemMapa, cena.camadas?.fundo, urlMapa]);
  useEffect(() => {
    if (cena.camadas?.fundo === false || urlMapa) {
      setPisoLegado(null);
      return;
    }
    let ativo = true;
    void (async () => {
      try {
        const blob = await carregarArquivo(
          chaveArquivoCampanha(campanhaId, CHAVE_PISO_3D(cena.id)),
        );
        if (!blob) {
          if (ativo) setPisoLegado({ id: cena.id, imagem: null });
          return;
        }
        const url = URL.createObjectURL(blob);
        try {
          const imagem = await reduzirMapa(url);
          if (ativo) setPisoLegado({ id: cena.id, imagem });
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (ativo) setPisoLegado({ id: cena.id, imagem: null });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [campanhaId, cena.id, cena.camadas?.fundo, modoMesa, urlMapa]);
  // Fontes de luz ligadas a tokens só podem sair do mestre quando o token
  // estiver publicamente revelado; NPCs invisíveis não entregam coordenadas.
  const luzesDeTokens: LuzPublicada[] = unidades.flatMap((u) => {
    const t = cena.tokens[u.id];
    if (
      !t ||
      t.oculto ||
      !t.emiteLuz ||
      cena.camadas?.tokens === false ||
      (u.tipo === 'jogador' && cena.camadas?.jogadores === false) ||
      (u.tipo === 'npc' && cena.camadas?.npcs === false) ||
      (u.tipo === 'inimigo' && cena.camadas?.inimigos === false)
    )
      return [];
    return [
      { x: t.x, y: t.y, cor: t.corLuz || '#ffd48b', alcance: t.alcanceLuz ?? 15, ativa: true },
    ];
  });
  // Ambiente é um recorte estritamente público; jamais publicar barreiras,
  // sombras ocultas ou anotações administrativas diretamente ao convidado.
  const ambiente = prepararAmbientePublicado(cena, luzesDeTokens);
  // Publicar apenas a silhueta iluminada em cenas integralmente visíveis.
  // O jogador NÃO recebe as paredes, mas desenha a MESMA luz com obstáculos.
  // Coordenadas de luz usam porcentagem da cena, não pixels de uma janela.
  if (cena.visibilidade === 'total' && cena.iluminacao?.ativa && ambiente.luzes?.length) {
    const relacao = Math.max(0.3, Math.min(5, aspectoMapa || 1.6));
    const larguraLuz = relacao * 1000,
      alturaLuz = 1000;
    ambiente.luzes = ambiente.luzes.map((l) => ({
      ...l,
      pontos: calcularPoligonoVisao(
        l.x,
        l.y,
        l.alcance,
        cena.barreiras || [],
        larguraLuz,
        alturaLuz,
      ).map((p) => ({
        x: Math.round((p.x / larguraLuz) * 10000) / 100,
        y: Math.round((p.y / alturaLuz) * 10000) / 100,
      })),
    }));
  }
  const assinaturaAmbienteVisual = JSON.stringify({
    clima: ambiente.clima,
    iluminacao: ambiente.iluminacao,
    luzes: ambiente.luzes,
    marcadores: ambiente.marcadores,
    desenhos: ambiente.desenhos,
  });
  // Canal leve, independente de recorte/rasterização. Clima, luz e período
  // chegam ao jogador mesmo sem movimento de token e sem aguardar 1,5 s de polling.
  const periodoDiaPublicado = cenarioAtual3D.periodoDia ?? 'dia';
  const assinaturaAmbienteLeve = JSON.stringify({
    cena: cena.id,
    visibilidade: cena.visibilidade,
    clima: ambiente.clima,
    iluminacao: ambiente.iluminacao,
    periodoDia3D: periodoDiaPublicado,
  });
  const revisaoAmbienteRef = useRef(0);
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    const controlador = new AbortController();
    // Em modo individual, só o clima e a hora do céu são enviados;
    // iluminação e geometria privadas permanecem rasterizadas pelo mestre.
    const dados = cena.visibilidade === 'total' ? ambiente : { clima: ambiente.clima };
    const revisaoAmbiente = Math.max(Date.now() * 1000, revisaoAmbienteRef.current + 1);
    revisaoAmbienteRef.current = revisaoAmbiente;
    void solicitar(`${urlSala(cred.codigo)}/ambiente`, {
      method: 'POST',
      headers: autorizar(cred.token),
      signal: controlador.signal,
      body: JSON.stringify({
        cenaId: cena.id,
        ambiente: dados,
        periodoDia3D: periodoDiaPublicado,
        revisaoAmbiente,
      }),
    }).catch(() => {
      /* A publicação normal da mesa recupera o estado ao reconectar. */
    });
    return () => controlador.abort();
  }, [campanhaId, assinaturaAmbienteLeve, revisaoSala]);
  const modoVisao = ['nevoa', 'visao', 'nevoa_visao', 'exploracao'].includes(cena.visibilidade)
    ? (cena.visibilidade as 'nevoa' | 'visao' | 'nevoa_visao' | 'exploracao')
    : null;
  const assinaturaVisao = JSON.stringify({
    cena: cena.id,
    modo: modoVisao,
    modoMesa,
    cenario3D: cenarioAtual3D,
    modelos: [...modelosProntos],
    imagem: origemMapa,
    carregada: Boolean(imagemPublicada),
    tokens: cena.tokens,
    barreiras: cena.barreiras,
    nevoa: cena.nevoa,
    memoria: cena.exploracaoPorToken,
    camadas: cena.camadas,
    permitirDesenhoJogadores: cena.permitirDesenhoJogadores !== false,
    // Omissões antigas: turno, clima e skin só chegavam quando uma posição mudava.
    combate,
    imagensTokens,
    tokensTopview,
    miniaturas,
    gifsTokens,
    unidades: unidades.map((u) => [
      u.id,
      u.tipo,
      u.nome,
      u.cor,
      u.skins,
      u.skinPadraoId,
      u.tokenAparencia,
      u.tokenIdlePausado,
      u.tokenIdleVelocidade,
    ]),
    ambiente: assinaturaAmbienteVisual,
  });
  const parametrosVisao: Parameters<typeof gerarVistasIndividuais>[0] = (() => {
    const observadores = unidades
      .filter(
        (u) =>
          u.tipo === 'jogador' &&
          cena.tokens[u.id] &&
          !cena.tokens[u.id].oculto &&
          cena.camadas?.tokens !== false &&
          cena.camadas?.jogadores !== false,
      )
      .map((u) => ({
        id: u.id,
        x: cena.tokens[u.id].x,
        y: cena.tokens[u.id].y,
        raio: cena.tokens[u.id].visao ?? 18,
      }));
    const tokens = unidades
      .filter((u) => {
        const t = cena.tokens[u.id];
        return (
          t &&
          !t.oculto &&
          cena.camadas?.tokens !== false &&
          (u.tipo === 'jogador'
            ? cena.camadas?.jogadores !== false
            : u.tipo === 'npc'
              ? cena.camadas?.npcs !== false
              : u.tipo === 'inimigo' && cena.camadas?.inimigos !== false)
        );
      })
      .map((u) => ({
        id: u.id,
        x: cena.tokens[u.id].x,
        y: cena.tokens[u.id].y,
        tipo: u.tipo as 'jogador' | 'npc' | 'inimigo',
      }));
    const objetos3D =
      cena.camadas?.objetos !== false
        ? cenarioAtual3D.objetos
            .filter((o) => o.oculto !== true)
            .map((o) => ({ id: o.id, ...chaoParaPercentual3D({ x: o.x, z: o.z }, cenarioAtual3D) }))
        : [];
    const miniaturas3D = miniaturasParaVisaoIndividual3D(
      cenarioAtual3D.miniaturas ?? [],
      modelosProntos,
      cena.tokens,
      cenarioAtual3D,
    );
    return {
      imagem: imagemPublicada || imagem,
      aspecto: aspectoMapa || 1.6,
      barreiras: cena.barreiras || [],
      observadores,
      tokens,
      modo: modoVisao ?? 'visao',
      pinceis: cena.nevoa || [],
      exploracaoPorToken: cena.exploracaoPorToken,
      ambiente,
      objetos3D,
      miniaturas3D,
      modo3D: true,
      dimensoesVisao3D: (() => {
        const d = referenciaTokens3D(cenarioAtual3D);
        return { largura: d.largura, altura: d.profundidade };
      })(),
    };
  })();
  const [vistasProntas, setVistasProntas] = useState<{
    assinatura: string;
    vistas: VistaPublicacao[];
  } | null>(null);
  // A publicação contínua gera recortes para 2D e 3D de uma só vez;
  // não executar em paralelo o publicador legado que cancelava quadros ao caminhar.
  useEffect(() => {
    setVistasProntas(null);
  }, [cena.id, modoVisao]);
  const vistaDaCenaPronta =
    !modoVisao || Boolean(vistasProntas && vistasProntas.assinatura === assinaturaVisao);
  const publico = useMemo<MesaPublica>(
    () => ({
      cenaId: cena.id,
      cenaNome: cena.nome,
      modoMesa,
      permitirDesenhoJogadores: cena.permitirDesenhoJogadores !== false,
      aspecto: aspectoMapa || 1.6,
      // Apenas IDs já publicados. O servidor volta a filtrar por destinatário e recorte.
      combate: combate
        ? {
            ativo: combate.ativo,
            rodada: combate.rodada,
            turnoId: combate.turnoId,
            ordem: combate.ordem,
            valores: Object.fromEntries(
              unidades
                .filter((u) => combate.ordem.includes(u.id))
                .map((u) => [u.id, u.iniciativa ?? 0]),
            ),
          }
        : undefined,
      escalaMapa: Math.max(1, Math.min(5, Math.max(cena.largura ?? 100, cena.altura ?? 100) / 100)),
      visibilidade: cena.visibilidade === 'total' ? 'total' : modoVisao ? 'individual' : 'restrita',
      imagem:
        cena.visibilidade === 'total' && cena.camadas?.fundo !== false ? imagemPublicada : null,
      ...(cena.visibilidade === 'total' || modoVisao
        ? {
            cenario3D: projetarCenarioPublico3D(
              cenarioAtual3D,
              new Set(
                unidades
                  .filter((u) => {
                    const t = cena.tokens[u.id];
                    return Boolean(
                      t &&
                      !t.oculto &&
                      cena.camadas?.tokens !== false &&
                      (u.tipo === 'jogador'
                        ? cena.camadas?.jogadores !== false
                        : u.tipo === 'npc'
                          ? cena.camadas?.npcs !== false
                          : u.tipo === 'inimigo' && cena.camadas?.inimigos !== false),
                    );
                  })
                  .map((u) => u.id),
              ),
              modelosProntos,
              cena.camadas?.objetos !== false,
            ),
          }
        : {}),

      // Cena total: camadas vetoriais leves. Visão individual: APENAS clima;
      // luzes e anotações já foram rasterizadas dentro do recorte autorizado.
      ...(cena.visibilidade === 'total'
        ? { ambiente }
        : modoVisao
          ? { ambiente: { clima: ambiente.clima } }
          : {}),
      // Imagens mascaradas e listas de IDs por personagem. O servidor substitui
      // esta estrutura por UMA única vista ao responder a cada convidado.
      ...(modoVisao
        ? { vistas: vistasProntas?.assinatura === assinaturaVisao ? vistasProntas.vistas : [] }
        : {}),
      // Identidade visual do grupo não depende de estar em campo de visão.
      // O servidor publica apenas nomes, cores e miniaturas de personagens jogadores.
      grupo: unidades
        .filter((u) => u.tipo === 'jogador')
        .map((u) => ({
          id: u.id,
          nome: u.nome,
          tipo: 'jogador' as const,
          cor: u.cor,
          enquadramento: normalizarAjusteRetrato(u.retratoEnquadramento),
          ...(retratosPequenos[u.id] ? { imagem: retratosPequenos[u.id] } : {}),
          ...(gifsRetratos[u.id] ? { animacao: gifsRetratos[u.id] } : {}),
        })),
      // Publicar também NPCs e inimigos REVELADOS pelo mestre, mas nunca ocultos.
      // A lista pública contém só identidade visual e coordenadas, não ficha/HP/notas.
      tokens:
        cena.camadas?.tokens === false
          ? []
          : unidades
              .filter((u) => {
                const token = cena.tokens[u.id];
                if (!token || token.oculto) return false;
                if (u.tipo === 'jogador') return cena.camadas?.jogadores !== false;
                if (u.tipo === 'npc') return cena.camadas?.npcs !== false;
                if (u.tipo === 'inimigo') return cena.camadas?.inimigos !== false;
                return false;
              })
              .map((u) => ({
                id: u.id,
                nome: cena.tokens[u.id].ocultarNome ? 'Personagem' : u.nome,
                tipo: u.tipo as 'jogador' | 'npc' | 'inimigo',
                // O servidor exige confirmação explícita em NPCs/inimigos: não revelar por engano.
                ...(u.tipo !== 'jogador' ? { publicado: true } : {}),
                x: cena.tokens[u.id].x,
                y: cena.tokens[u.id].y,
                // O mestre é a referência única: o aro pode ser diferente da cor da ficha
                // e cada skin possui aparência/enquadramento/reprodução independentes.
                cor: aparenciaTokenAtiva(u, cena.tokens[u.id]).corBorda,
                fundo:
                  aparenciaTokenAtiva(u, cena.tokens[u.id]).fundo === 'transparente'
                    ? 'transparent'
                    : corFundoToken(aparenciaTokenAtiva(u, cena.tokens[u.id])),
                tamanho: cena.tokens[u.id].tamanho ?? 70,
                largura3D: cena.tokens[u.id].largura3D ?? 100,
                altura3D: cena.tokens[u.id].altura3D ?? 100,
                rotacao: cena.tokens[u.id].rotacao ?? 0,
                espelhadoX: Boolean(cena.tokens[u.id].espelhadoX),
                topview: tokensTopview?.[u.id] === true,
                ocultarNome: Boolean(cena.tokens[u.id].ocultarNome),
                enquadramento: enquadramentoTokenAtivo(u, cena.tokens[u.id]),
                idlePausado: parametrosIdleAtivos(u, cena.tokens[u.id]).pausado,
                idleVelocidade: parametrosIdleAtivos(u, cena.tokens[u.id]).velocidade,
                travado: Boolean(cena.tokens[u.id].travado),
                ...(miniaturas[u.id] ? { imagem: miniaturas[u.id] } : {}),
                ...(gifsTokens[u.id] ? { animacao: gifsTokens[u.id] } : {}),
              })),
    }),
    [
      cena,
      combate,
      unidades,
      imagemPublicada,
      miniaturas,
      retratosPequenos,
      gifsTokens,
      gifsRetratos,
      tokensTopview,
      aspectoMapa,
      modoMesa,
      modoVisao,
      vistasProntas,
      assinaturaVisao,
      assinaturaAmbienteVisual,
      cenarioAtual3D,
      modelosProntos,
    ],
  );
  // IDs de desenhos JÁ salvos na campanha: o servidor os usa apenas para
  // confirmar ao autor. Não entram na publicação visível dos jogadores.
  const idsDesenhosConfirmados = normalizarDesenhos(cena.desenhos)
    .filter((t) => t.id.startsWith('jogador-'))
    .map((t) => t.id)
    .slice(-200);
  // Revisões monotônicas impedem que uma resposta antiga do mapa completo
  // desfaça o movimento que já chegou pelo canal leve.
  // As posições não precisam transportar novamente a imagem completa do mapa.
  // Luzes de tokens e campo de visão alteram a estrutura e continuam passando
  // pelo fluxo completo quando necessário.
  const assinaturaEstrutura = JSON.stringify({
    ...publico,
    tokens: publico.tokens.map(({ x: __x, y: __y, ...token }) => token),
    idsDesenhosConfirmados,
  });
  const assinaturaPosicoes = JSON.stringify(
    publico.tokens.map((token) => ({ id: token.id, x: token.x, y: token.y })),
  );
  const quadroRef = useRef<{ assinatura: string; revisao: number }>({ assinatura: '', revisao: 0 });
  const assinaturaQuadro = `${assinaturaEstrutura}\u001f${assinaturaPosicoes}`;
  if (quadroRef.current.assinatura !== assinaturaQuadro) {
    quadroRef.current = {
      assinatura: assinaturaQuadro,
      revisao: Math.max(Date.now() * 1000, quadroRef.current.revisao + 1),
    };
  }
  const revisao = quadroRef.current.revisao;
  // Mantém o último snapshot mesmo durante o debounce da publicação completa.
  const payloadAtualRef = useRef({ publico, idsDesenhosConfirmados, revisao });
  payloadAtualRef.current = { publico, idsDesenhosConfirmados, revisao };
  const ultimaRevisaoVisao3DRef = useRef(0);
  const comprimirAssinaturaVisao = (
    assinatura: string,
    previas: Map<string, { x: number; y: number }>,
  ) =>
    assinatura +
    '|' +
    [...previas]
      .map(([id, p]) => `${id}:${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .sort()
      .join(';');
  // Prévia privada do mestre (arrasto e WASD): alimenta SOMENTE o gerador
  // de vistas autorizadas. Nenhum evento de movimento individual é enviado
  // diretamente aos convidados, nem revela identidades/posições de NPCs.
  const previasPrivadas3DRef = useRef(new Map<string, { x: number; y: number; em: number }>());
  useEffect(() => {
    if (!modoVisao) return;
    const receber = (evento: Event) => {
      const valor = (
        evento as CustomEvent<{ cenaId: string; id: string; x: number; y: number; final: boolean }>
      ).detail;
      if (
        !valor ||
        valor.cenaId !== cena.id ||
        !Number.isFinite(valor.x) ||
        !Number.isFinite(valor.y) ||
        valor.x < 0 ||
        valor.x > 100 ||
        valor.y < 0 ||
        valor.y > 100 ||
        !visao3DRef.current.publico.tokens.some((t) => t.id === valor.id && t.tipo === 'jogador')
      )
        return;
      previasPrivadas3DRef.current.set(valor.id, { x: valor.x, y: valor.y, em: performance.now() });
    };
    window.addEventListener('portal-mp-previa-token-3d', receber);
    return () => {
      previasPrivadas3DRef.current.clear();
      window.removeEventListener('portal-mp-previa-token-3d', receber);
    };
  }, [modoMesa, modoVisao, cena.id]);
  // Cada frame 3D usa os MESMOS dados capturados no instante do cálculo:
  // posição dos tokens, campo autorizado, piso censurado e máscara de visão.
  // O ciclo tem intervalo fixo, independente das renderizações React de 60 FPS.
  const visao3DRef = useRef({
    assinatura: assinaturaVisao,
    publico,
    revisao,
    idsDesenhosConfirmados,
    parametros: parametrosVisao,
    politica: JSON.stringify({
      id: cena.id,
      modo: modoVisao,
      barreiras: cena.barreiras,
      nevoa: cena.nevoa,
      camadas: cena.camadas,
      cenario: cenarioAtual3D,
    }),
  });
  visao3DRef.current = {
    assinatura: assinaturaVisao,
    publico,
    revisao,
    idsDesenhosConfirmados,
    parametros: parametrosVisao,
    politica: JSON.stringify({
      id: cena.id,
      modo: modoVisao,
      barreiras: cena.barreiras,
      nevoa: cena.nevoa,
      camadas: cena.camadas,
      cenario: cenarioAtual3D,
    }),
  };
  useEffect(() => {
    if (modoVisao) window.dispatchEvent(new Event('portal-mp-recalcular-visao'));
  }, [assinaturaVisao, modoVisao]);
  useEffect(() => {
    if (!modoVisao) return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    let ativo = true,
      emVoo = false,
      pendente = false,
      ultimaAssinatura = '';
    const controlador = new AbortController();
    const publicar = async () => {
      if (!ativo) return;
      if (emVoo) {
        pendente = true;
        return;
      }
      const quadro = visao3DRef.current;
      const agora = performance.now();
      const previas = new Map<string, { x: number; y: number }>();
      for (const [id, p] of previasPrivadas3DRef.current) {
        if (agora - p.em > 650) {
          previasPrivadas3DRef.current.delete(id);
          continue;
        }
        if (quadro.publico.tokens.some((t) => t.id === id && t.tipo === 'jogador'))
          previas.set(id, { x: p.x, y: p.y });
      }
      const assinatura = comprimirAssinaturaVisao(quadro.assinatura, previas);
      if (assinatura === ultimaAssinatura) return;
      // Posição publicada corresponde à que foi usada para calcular o recorte.
      const parametros = previas.size
        ? {
            ...quadro.parametros,
            observadores: quadro.parametros.observadores.map((o) => ({
              ...o,
              ...previas.get(o.id),
            })),
            tokens: quadro.parametros.tokens.map((t) => ({ ...t, ...previas.get(t.id) })),
          }
        : quadro.parametros;
      const publico = previas.size
        ? {
            ...quadro.publico,
            tokens: quadro.publico.tokens.map((t) => ({ ...t, ...previas.get(t.id) })),
          }
        : quadro.publico;
      emVoo = true;
      try {
        // Não recalcular a cada pointermove: produz quadros intermediários
        // verificáveis, em vez de cancelar todas as visões antes do último.
        const vistas = await gerarVistasIndividuais(parametros);
        if (!ativo || controlador.signal.aborted) return;
        // Se o mestre mudou permissões, paredes, pincéis ou cenário durante
        // o processamento, descartar esse quadro e calcular o novo.
        if (quadro.politica !== visao3DRef.current.politica) return;
        if (!vistas.length || vistas.some((v) => !v.mascara3D)) return;
        const revisaoEnviada = Math.max(quadro.revisao, ultimaRevisaoVisao3DRef.current + 1);
        ultimaRevisaoVisao3DRef.current = revisaoEnviada;
        const resposta = await solicitar<{ ok: boolean; antiga?: boolean }>(
          `${urlSala(cred.codigo)}/mesa`,
          {
            method: 'POST',
            headers: autorizar(cred.token),
            signal: controlador.signal,
            body: JSON.stringify({
              ...publico,
              vistas,
              idsDesenhosConfirmados: quadro.idsDesenhosConfirmados,
              revisao: revisaoEnviada,
            }),
          },
        );
        if (!resposta.antiga) ultimaAssinatura = assinatura;
      } catch (erro) {
        if (ativo && !controlador.signal.aborted)
          console.warn(
            '[Portal multiplayer] Visão 3D:',
            erro instanceof Error ? erro.message : 'Falha ao publicar recorte',
          );
      } finally {
        emVoo = false;
        // Visão mudou durante a renderização? Processar a última posição sem
        // esperar outro intervalo de uma aba que pode estar em segundo plano.
        if (ativo && pendente) {
          pendente = false;
          queueMicrotask(() => {
            void publicar();
          });
        }
      }
    };
    // Nunca manter uma cena de visão TOTAL no servidor enquanto o novo modo
    // individual ainda está sendo calculado; revogação inicial fail-closed.
    const inicial = visao3DRef.current;
    const oculto = {
      ...inicial.publico,
      visibilidade: 'restrita' as const,
      imagem: null,
      tokens: [],
      cenario3D: undefined,
      vistas: [],
      ambiente: undefined,
      idsDesenhosConfirmados: inicial.idsDesenhosConfirmados,
      revisao: inicial.revisao,
    };
    emVoo = true;
    ultimaRevisaoVisao3DRef.current = Math.max(ultimaRevisaoVisao3DRef.current, inicial.revisao);
    void solicitar(`${urlSala(cred.codigo)}/mesa`, {
      method: 'POST',
      headers: autorizar(cred.token),
      signal: controlador.signal,
      body: JSON.stringify(oculto),
    })
      .catch(() => undefined)
      .finally(() => {
        emVoo = false;
      });
    // Máximo 10 publicações/s; a resposta anterior precisa concluir antes
    // da próxima. Se atrasar, publica a posição MAIS RECENTE na próxima janela.
    const intervalo = window.setInterval(() => {
      void publicar();
    }, 95);
    // Um evento de rede/atualização do mestre pode ocorrer com a aba oculta.
    // Não esperar o timer (limitado pelo navegador em abas em segundo plano).
    const publicarPorEvento = () => {
      void publicar();
    };
    window.addEventListener('portal-mp-recalcular-visao', publicarPorEvento);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      controlador.abort();
      window.removeEventListener('portal-mp-recalcular-visao', publicarPorEvento);
    };
  }, [modoMesa, modoVisao, campanhaId, cena.id, revisaoSala]);
  // Ao entrar em cena restrita, a publicação SEM recortes deve ocultar
  // imediatamente o mapa anterior. Quando os recortes ficam prontos,
  // uma segunda atualização disponibiliza somente a visão autorizada.
  // Jamais manter a cena anterior visível durante o processamento assíncrono.
  const falhaDeRecorte = Boolean(
    modoVisao && vistaDaCenaPronta && imagem && vistasProntas?.vistas.some((v) => !v.imagem),
  );
  useEffect(() => {
    if (falhaDeRecorte)
      console.warn(
        '[Portal multiplayer] Um recorte de visão não pôde ser codificado. Confira o mapa e a memória disponível.',
      );
    if (
      modoVisao &&
      vistaDaCenaPronta &&
      !imagem &&
      imagemPronta?.origem === origemMapa &&
      cena.camadas?.fundo !== false
    )
      console.warn(
        '[Portal multiplayer] Imagem do mapa não carregou para gerar a visão individual.',
      );
  }, [
    falhaDeRecorte,
    modoVisao,
    vistaDaCenaPronta,
    imagem,
    imagemPronta,
    origemMapa,
    cena.camadas?.fundo,
  ]);
  useEffect(() => {
    // Nunca publicar um quadro de visão com vistas:[] enquanto o mestre ainda
    // está rasterizando o novo recorte. Conservar o último quadro autorizado
    // no servidor impede o aviso piscando durante o movimento.
    if (modoVisao) return; // O envio periódico acima publica a mesma visão para 2D e 3D.
    if (modoVisao && !vistaDaCenaPronta) return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    const controlador = new AbortController();
    const atraso = window.setTimeout(() => {
      const enviarCompleto = () => {
        const atual = payloadAtualRef.current;
        return solicitar<{ ok: boolean; antiga?: boolean }>(`${urlSala(cred.codigo)}/mesa`, {
          method: 'POST',
          headers: autorizar(cred.token),
          signal: controlador.signal,
          body: JSON.stringify({
            ...atual.publico,
            idsDesenhosConfirmados: atual.idsDesenhosConfirmados,
            revisao: atual.revisao,
          }),
        });
      };
      void enviarCompleto()
        .then((res) => (res.antiga && !controlador.signal.aborted ? enviarCompleto() : undefined))
        .catch((erro) => {
          if (!controlador.signal.aborted)
            console.warn(
              '[Portal multiplayer] Falha ao publicar a mesa:',
              erro instanceof Error ? erro.message : 'Erro desconhecido',
            );
        });
    }, 180);
    return () => {
      window.clearTimeout(atraso);
      controlador.abort();
    };
  }, [assinaturaEstrutura, campanhaId, revisaoSala, modoVisao, vistaDaCenaPronta, modoMesa]);
  // Transmite o movimento enquanto o ponteiro é arrastado, em vez de esperar
  // 45 ms SEM novas mudanças (debounce anterior causava "teleporte" ao soltar).
  // Um único pedido por vez; se houver novas posições durante o envio,
  // descarta apenas os pontos intermediários, jamais a posição mais recente.
  // Não transmite essa prévia em cenas de visão individual/restrita.
  const posicoesAoVivoRef = useRef({
    cenaId: cena.id,
    visibilidade: cena.visibilidade,
    assinatura: assinaturaPosicoes,
    revisao,
    posicoes: publico.tokens.map((token) => ({ id: token.id, x: token.x, y: token.y })),
  });
  posicoesAoVivoRef.current = {
    cenaId: cena.id,
    visibilidade: cena.visibilidade,
    assinatura: assinaturaPosicoes,
    revisao,
    posicoes: publico.tokens.map((token) => ({ id: token.id, x: token.x, y: token.y })),
  };
  useEffect(() => {
    if (cena.visibilidade !== 'total') return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    let ativo = true,
      emVoo = false;
    let ultimaEnviada = posicoesAoVivoRef.current.assinatura;
    const controle = new AbortController();
    const transmitir = async () => {
      const atual = posicoesAoVivoRef.current;
      if (
        !ativo ||
        emVoo ||
        atual.cenaId !== cena.id ||
        atual.visibilidade !== 'total' ||
        atual.assinatura === ultimaEnviada
      )
        return;
      emVoo = true;
      const anterior = ultimaEnviada;
      ultimaEnviada = atual.assinatura;
      try {
        await solicitar(`${urlSala(cred.codigo)}/posicoes`, {
          method: 'POST',
          headers: autorizar(cred.token),
          signal: controle.signal,
          body: JSON.stringify({
            cenaId: atual.cenaId,
            revisao: atual.revisao,
            posicoes: atual.posicoes,
          }),
        });
      } catch (erro) {
        if (!ativo || controle.signal.aborted) return;
        ultimaEnviada = anterior; // Reenvia a posição mais recente na próxima janela.
        const motivo = erro instanceof Error ? erro.message : '';
        if (/rota inexistente|404|cena não disponível|a cena foi alterada/i.test(motivo)) {
          const quadro = payloadAtualRef.current;
          if (quadro.publico.cenaId !== cena.id || quadro.publico.visibilidade !== 'total') return;
          void solicitar(`${urlSala(cred.codigo)}/mesa`, {
            method: 'POST',
            headers: autorizar(cred.token),
            signal: controle.signal,
            body: JSON.stringify({
              ...quadro.publico,
              idsDesenhosConfirmados: quadro.idsDesenhosConfirmados,
              revisao: quadro.revisao,
            }),
          }).catch(() => {
            /* Servidor antigo: publicação integral de compatibilidade. */
          });
        } else console.warn('[Portal multiplayer] Movimento em tempo real:', motivo);
      } finally {
        emVoo = false;
      }
    };
    // Intervalo fixo ~60 atualizações/s: NÃO reinicia durante pointermove.
    const intervalo = window.setInterval(() => {
      void transmitir();
    }, 16);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      controle.abort();
    };
  }, [cena.id, cena.visibilidade, campanhaId, revisaoSala]);

  // Prévia de arrasto 3D do mestre: rota autenticada, visibilidade total e
  // somente IDs presentes na projeção pública. Não salva coordenadas na ficha.
  useEffect(() => {
    if (modoMesa !== '3d' || cena.visibilidade !== 'total') return;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    let ativo = true,
      emVoo = false;
    type Previa = { cenaId: string; id: string; x: number; y: number; final: boolean };
    let pendente: Previa | null = null;
    const enviar = async () => {
      if (!ativo || emVoo) return;
      emVoo = true;
      try {
        while (ativo && pendente) {
          const amostra = pendente;
          pendente = null;
          await solicitar(`${urlSala(cred.codigo)}/previa-3d`, {
            method: 'POST',
            headers: autorizar(cred.token),
            body: JSON.stringify(amostra),
          });
        }
      } catch {
        /* Se a sessão cair, a posição persistida pelo mestre continua oficial. */
      } finally {
        emVoo = false;
        if (ativo && pendente) void enviar();
      }
    };
    const receber = (evento: Event) => {
      const p = (evento as CustomEvent<Previa>).detail;
      const publicados = payloadAtualRef.current.publico;
      if (
        !p ||
        p.cenaId !== cena.id ||
        publicados.cenaId !== p.cenaId ||
        publicados.visibilidade !== 'total' ||
        !publicados.tokens.some((token) => token.id === p.id) ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x > 100 ||
        p.y > 100
      )
        return;
      pendente = p;
      void enviar();
    };
    window.addEventListener('portal-mp-previa-token-3d', receber);
    return () => {
      ativo = false;
      pendente = null;
      window.removeEventListener('portal-mp-previa-token-3d', receber);
    };
  }, [modoMesa, cena.id, cena.visibilidade, campanhaId, revisaoSala]);

  // Publica exclusivamente o recorte de combate de cada jogador.
  // O servidor envia cada ficha apenas para o convidado que recebeu aquele personagem.
  // HP/Mana/CA acompanham as alterações feitas pelo mestre na campanha local.
  const payloadFichas = JSON.stringify({
    personagens: montarFichasCompartilhadas(unidades, fichas),
  });
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    const controlador = new AbortController();
    const atraso = window.setTimeout(() => {
      void solicitar(`${urlSala(cred.codigo)}/fichas`, {
        method: 'POST',
        headers: autorizar(cred.token),
        body: payloadFichas,
        signal: controlador.signal,
      }).catch(() => {
        /* A próxima alteração da campanha ou reabertura retenta. */
      });
    }, 220);
    return () => {
      window.clearTimeout(atraso);
      controlador.abort();
    };
  }, [payloadFichas, campanhaId, revisaoSala]);
  // A imagem do documento pode ter centenas de KB no backup. Gerar a miniatura
  // de leitura ANTES de criar a publicação; nunca enviar os dados originais.
  const assinaturaInventarios = JSON.stringify(
    unidades
      .filter((u) => u.tipo === 'jogador')
      .map((u) => ({ id: u.id, nome: u.nome, itens: u.itens })),
  );
  const [inventariosProntos, setInventariosProntos] = useState<{
    assinatura: string;
    payload: string;
  } | null>(null);
  useEffect(() => {
    let ativo = true;
    void montarInventariosParaPublicacao(unidades)
      .then((projecao) => {
        if (ativo)
          setInventariosProntos({
            assinatura: assinaturaInventarios,
            payload: JSON.stringify(projecao),
          });
      })
      .catch(() => {
        /* Próxima alteração do inventário tenta novamente. */
      });
    return () => {
      ativo = false;
    };
  }, [assinaturaInventarios]);
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (
      !cred ||
      cred.papel !== 'mestre' ||
      !inventariosProntos ||
      inventariosProntos.assinatura !== assinaturaInventarios
    )
      return;
    const controlador = new AbortController();
    const atraso = window.setTimeout(() => {
      void solicitar(`${urlSala(cred.codigo)}/inventarios`, {
        method: 'POST',
        headers: autorizar(cred.token),
        body: inventariosProntos.payload,
        signal: controlador.signal,
      }).catch(() => {
        /* A próxima alteração tenta republicar o inventário. */
      });
    }, 260);
    return () => {
      window.clearTimeout(atraso);
      controlador.abort();
    };
  }, [inventariosProntos, assinaturaInventarios, campanhaId, revisaoSala]);

  const payloadDiario = JSON.stringify(montarDiarioParaSala(paginasDiario));
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    const controlador = new AbortController();
    const atraso = window.setTimeout(() => {
      void solicitar(`${urlSala(cred.codigo)}/diario`, {
        method: 'POST',
        headers: autorizar(cred.token),
        body: payloadDiario,
        signal: controlador.signal,
      }).catch(() => {
        /* A próxima edição ou reabertura repete a publicação. */
      });
    }, 350);
    return () => {
      window.clearTimeout(atraso);
      controlador.abort();
    };
  }, [payloadDiario, campanhaId, revisaoSala]);
  return pedidos.length
    ? createPortal(
        <aside
          className={`pm-mp-aprovacao ${pedidosVisiveis ? 'aberta' : 'recolhida'}`}
          aria-label="Autorizações de itens multiplayer"
        >
          <header className="pm-mp-aprovacao-topo">
            <strong>
              ⚔ Pedidos de itens <span>{pedidos.length}</span>
            </strong>
            <button
              type="button"
              onClick={() => setPedidosVisiveis((v) => !v)}
              aria-expanded={pedidosVisiveis}
              aria-label={pedidosVisiveis ? 'Recolher pedidos' : 'Mostrar pedidos'}
            >
              {pedidosVisiveis ? '−' : '+'}
            </button>
          </header>
          {pedidosVisiveis && (
            <div className="pm-mp-aprovacao-conteudo">
              <p>Os itens só serão utilizados ou transferidos após sua autorização.</p>
              {pedidos.map((pedido) => (
                <section key={pedido.pedidoId} className="pm-mp-aprovacao-item">
                  <small>
                    {pedido.solicitante || 'Convidado'} · {pedido.personagemNome || 'Personagem'}
                  </small>
                  <strong>
                    {pedido.operacao === 'usar' ? 'Usar item' : 'Transferir item'}:{' '}
                    {pedido.itemNome || 'Item'}
                  </strong>
                  <span>
                    {pedido.operacao === 'transferir'
                      ? `${pedido.quantidade} unidade(s) para ${pedido.destinoNome || 'outro personagem'}`
                      : 'Usar 1 unidade'}
                    {pedido.itemCategoria ? ` · ${pedido.itemCategoria}` : ''}
                  </span>
                  {pedido.iniciadoEm ? (
                    <span>
                      Autorização anterior em processamento. Aguarde a atualização da sala.
                    </span>
                  ) : (
                    <div className="pm-mp-aprovacao-acoes">
                      <button
                        type="button"
                        className="recusar"
                        disabled={Boolean(processandoPedido)}
                        onClick={() => void decidirPedido(pedido, false)}
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        className="aprovar"
                        disabled={Boolean(processandoPedido)}
                        onClick={() => void decidirPedido(pedido, true)}
                      >
                        {processandoPedido === pedido.pedidoId ? 'Processando…' : 'Aprovar'}
                      </button>
                    </div>
                  )}
                </section>
              ))}
              {erroPedido && (
                <p role="alert" className="pm-mp-erro">
                  {erroPedido}
                </p>
              )}
            </div>
          )}
        </aside>,
        document.body,
      )
    : null;
}
