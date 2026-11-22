import { useEffect, useRef, useState } from 'react';
import {
  adicionarTokenBiblioteca,
  carregarTokenBiblioteca,
  lerBibliotecaTokens,
  removerTokenBiblioteca,
  MAX_TOKENS_BIBLIOTECA,
  type TokenBiblioteca,
} from './bibliotecaTokens';
import TokenIdle from './TokenIdle';
import './bibliotecaIdle.css';
import './bibliotecaTokens.css';

type Props = {
  onAplicar?: (token: TokenBiblioteca, blob: Blob) => void | Promise<void>;
  onGuardarAtual?: () => Promise<{ nome: string; blob: Blob }>;
  tipo?: 'todos' | 'animados' | 'estaticos';
};
/** O arquivo só é aberto ao solicitar a prévia, evitando carregar todos os GIFs. */
export default function BibliotecaTokens({ onAplicar, onGuardarAtual, tipo = 'todos' }: Props) {
  const [lista, setLista] = useState(() => lerBibliotecaTokens());
  const [filtro, setFiltro] = useState<'todos' | 'animados' | 'estaticos'>(tipo);
  const [idPrevia, setIdPrevia] = useState<string | null>(null);
  const [urlPrevia, setUrlPrevia] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [velocidade, setVelocidade] = useState(1);
  const [pausado, setPausado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [revisao, setRevisao] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!idPrevia) {
      setUrlPrevia(null);
      return;
    }
    let ativo = true,
      url: string | null = null;
    setUrlPrevia(null);
    void carregarTokenBiblioteca(idPrevia)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (ativo) setUrlPrevia(url);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível abrir a prévia.');
      });
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [idPrevia, revisao]);
  const executar = async (acao: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      await acao();
      setLista(lerBibliotecaTokens());
      setRevisao((v) => v + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Operação não concluída.');
    } finally {
      setOcupado(false);
    }
  };
  const itens = lista.filter(
    (t) => filtro === 'todos' || (filtro === 'animados' ? t.animado : !t.animado),
  );
  return (
    <section
      className="biblioteca-idle-mestre biblioteca-tokens-mestre"
      aria-label="Biblioteca de tokens do mestre"
    >
      <header className="biblioteca-idle-cabecalho">
        <div>
          <strong>Biblioteca de Tokens do Mestre</strong>
          <small>Imagens PNG, JPG, WebP e GIF idle reutilizáveis entre campanhas.</small>
        </div>
        <span>
          {lista.length}/{MAX_TOKENS_BIBLIOTECA}
        </span>
      </header>
      <div className="biblioteca-idle-acoes">
        <label className="biblioteca-idle-nome">
          Nome do token
          <input
            className="campo"
            value={nome}
            maxLength={64}
            placeholder="Ex.: Guarda da tribo"
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <button
          disabled={ocupado || lista.length >= MAX_TOKENS_BIBLIOTECA}
          type="button"
          onClick={() => input.current?.click()}
        >
          ＋ Importar token
        </button>
        {onGuardarAtual && (
          <button
            type="button"
            disabled={ocupado || lista.length >= MAX_TOKENS_BIBLIOTECA}
            onClick={() =>
              void executar(async () => {
                const atual = await onGuardarAtual();
                const formato =
                  atual.blob.type === 'image/gif'
                    ? '.gif'
                    : atual.blob.type === 'image/png'
                      ? '.png'
                      : atual.blob.type === 'image/jpeg'
                        ? '.jpg'
                        : '.webp';
                await adicionarTokenBiblioteca(
                  new File([atual.blob], `${atual.nome}${formato}`, { type: atual.blob.type }),
                  nome || atual.nome,
                );
                setNome('');
              })
            }
          >
            Guardar token selecionado
          </button>
        )}
        <input
          type="file"
          hidden
          ref={input}
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = '';
            if (arquivo)
              void executar(async () => {
                await adicionarTokenBiblioteca(arquivo, nome);
                setNome('');
              });
          }}
        />
      </div>
      <div className="biblioteca-idle-config">
        <label>
          Mostrar{' '}
          <select
            className="campo"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          >
            <option value="todos">Todos</option>
            <option value="estaticos">Estáticos</option>
            <option value="animados">Animados</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={pausado} onChange={(e) => setPausado(e.target.checked)} />{' '}
          Pausar prévia
        </label>
        <label>
          Velocidade da prévia{' '}
          <select
            className="campo"
            value={velocidade}
            onChange={(e) => setVelocidade(Number(e.target.value))}
          >
            <option value="0.5">0,5×</option>
            <option value="1">1×</option>
            <option value="1.5">1,5×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </div>
      {erro && (
        <p className="biblioteca-idle-erro" role="alert">
          {erro}
        </p>
      )}
      {itens.length === 0 ? (
        <p className="aviso-pequeno">
          Nenhum token nesta categoria. Importe uma imagem ou GIF para começar.
        </p>
      ) : (
        <div className="biblioteca-idle-lista">
          {itens.map((token) => (
            <article className="biblioteca-idle-cartao" key={token.id}>
              <div className="biblioteca-idle-preview">
                {idPrevia === token.id && urlPrevia ? (
                  <TokenIdle
                    src={urlPrevia}
                    animado={token.animado}
                    pausado={pausado}
                    velocidade={velocidade}
                    alt={token.nome}
                  />
                ) : (
                  <span>{token.animado ? 'GIF idle' : 'Imagem estática'}</span>
                )}
              </div>
              <strong title={token.nome}>{token.nome}</strong>
              <small>
                {token.animado
                  ? 'Animado · GIF'
                  : 'Estático · ' + token.mime.split('/')[1].toUpperCase()}{' '}
                · {(token.tamanho / 1048576).toFixed(2)} MB
              </small>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setIdPrevia((v) => (v === token.id ? null : token.id))}
              >
                {idPrevia === token.id ? 'Ocultar prévia' : 'Ver prévia'}
              </button>
              {onAplicar && (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    void executar(async () =>
                      onAplicar(token, await carregarTokenBiblioteca(token)),
                    )
                  }
                >
                  Usar como token
                </button>
              )}
              <button
                type="button"
                className="biblioteca-idle-excluir"
                disabled={ocupado}
                onClick={() => {
                  if (
                    window.confirm(
                      `Excluir “${token.nome}” da biblioteca? Os tokens já aplicados serão preservados.`,
                    )
                  )
                    void executar(async () => {
                      await removerTokenBiblioteca(token.id);
                      if (idPrevia === token.id) setIdPrevia(null);
                    });
                }}
              >
                Excluir do acervo
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="aviso-pequeno">
        A biblioteca antiga de idles foi preservada. Cada aplicação cria uma cópia própria. GIF: até
        4 MB, 512×512 e 40 quadros. Imagens estáticas: até 8 MB. Limite de acervo: 160 MB. Os
        recursos são incluídos no backup completo.
      </p>
    </section>
  );
}
