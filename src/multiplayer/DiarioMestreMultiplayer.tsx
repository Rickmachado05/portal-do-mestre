import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import DiarioCampanha, { type PaginaExternaDiario } from '../hexatombe/DiarioCampanha';
import {
  assinarPresenca,
  autorizar,
  chaveMestre,
  lerCredencial,
  solicitar,
  urlSala,
  type DiarioRecebidoMestre,
} from './api';
import type { CamposDiario } from '../hexatombe/registrosDiario';

type Props = ComponentProps<typeof DiarioCampanha> & { campanhaId: string };
/** Um único Diário: Meu conteúdo da campanha + Compartilhado comigo dos personagens. */
export default function DiarioMestreMultiplayer({ campanhaId, ...props }: Props) {
  const [recebidos, setRecebidos] = useState<DiarioRecebidoMestre[]>([]);
  const [erro, setErro] = useState('');
  const edicoesPendentes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let ativo = true;
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') {
      setRecebidos([]);
      return;
    }
    const carregar = () =>
      void solicitar<{ recebidos: DiarioRecebidoMestre[] }>(
        `${urlSala(cred.codigo)}/diario-personagem`,
        {
          headers: autorizar(cred.token),
        },
      )
        .then((r) => {
          if (ativo) {
            setRecebidos(r.recebidos);
            setErro('');
          }
        })
        .catch(() => {
          if (ativo) setErro('A conexão com os diários compartilhados está indisponível.');
        });
    carregar();
    const cancelar = assinarPresenca(
      cred,
      (e) => {
        if (ativo && e.tipo === 'diario-personagem') {
          setRecebidos(e.recebidos);
          setErro('');
        }
      },
      (status) => {
        if (status === 'conectado') carregar();
      },
    );
    return () => {
      ativo = false;
      cancelar();
    };
  }, [campanhaId]);
  const paginasExternas = useMemo(
    () =>
      recebidos.map((r) => {
        const pasta = recebidos.find(
          (p) =>
            p.personagemId === r.personagemId &&
            p.apelido === r.apelido &&
            p.pagina.id === r.pagina.pastaId &&
            p.pagina.tipo === 'pasta',
        );
        return {
          ...r.pagina,
          id: `externo:${r.id}`,
          pastaId: pasta ? `externo:${pasta.id}` : '',
          categoria: r.pagina.categoria as PaginaExternaDiario['categoria'],
          fixada: false,
          permissao: r.permissao,
          proprietario: `${r.personagemNome} (${r.apelido})`,
        } as PaginaExternaDiario;
      }),
    [recebidos],
  );
  const editar = useCallback(
    async (id: string, campos: CamposDiario) => {
      const cred = lerCredencial(chaveMestre(campanhaId));
      if (!cred || cred.papel !== 'mestre') throw Error('A sala multiplayer não está ativa.');
      const alteracoes = {
        titulo: campos.titulo,
        conteudo: campos.conteudo,
        formato: campos.formato,
        imagem: campos.imagem,
      };
      const camposValidos = Object.fromEntries(
        Object.entries(alteracoes).filter(([, valor]) => valor !== undefined),
      );
      // Atualização otimista evita que inputs controlados revertam o texto a cada tecla.
      setRecebidos((antigo) =>
        antigo.map((r) =>
          `externo:${r.id}` === id ? { ...r, pagina: { ...r.pagina, ...camposValidos } } : r,
        ),
      );
      const requisicao = edicoesPendentes.current
        .catch(() => undefined)
        .then(async () => {
          const resposta = await solicitar<{ pagina: DiarioRecebidoMestre['pagina'] }>(
            `${urlSala(cred.codigo)}/diario-personagem`,
            {
              method: 'PATCH',
              headers: autorizar(cred.token),
              body: JSON.stringify({ id: id.replace(/^externo:/, ''), campos: camposValidos }),
            },
          );
          // A resposta sincronizada também chegará por SSE; não sobrescrever uma digitação mais nova.
          return resposta;
        });
      edicoesPendentes.current = requisicao.then(() => undefined);
      await requisicao;
    },
    [campanhaId],
  );
  return (
    <>
      {erro && (
        <small className="pm-bib-aviso" role="status">
          {erro}
        </small>
      )}
      <DiarioCampanha {...props} paginasExternas={paginasExternas} onEditarExterno={editar} />
    </>
  );
}
