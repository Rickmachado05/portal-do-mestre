import { useEffect, useRef, useState } from 'react';
import { carregarArquivo } from './storage';
import { chaveTokenFicha, validarTokenArquivo } from './bibliotecaTokens';
import BibliotecaTokens from './PainelBibliotecaTokens';
import TokenIdle from './TokenIdle';
import { otimizarImagemSkin } from './tokenSkins';
import './tokenPadraoFicha.css';

type Props = {
  fichaId?: string;
  temToken?: boolean;
  onAlterar: (blob: Blob | null) => void | Promise<void>;
  desabilitado?: boolean;
  revisao?: number;
};
/** Permite definir o token padrão antes de adicionar uma ficha à mesa.
 * O arquivo é copiado, nunca referenciado diretamente à biblioteca global. */
export default function TokenPadraoFicha({
  fichaId,
  temToken = false,
  onAlterar,
  desabilitado = false,
  revisao = 0,
}: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [mostrarAcervo, setMostrarAcervo] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let ativo = true;
    if (!fichaId || !temToken) {
      setBlob(null);
      return;
    }
    void carregarArquivo(chaveTokenFicha(fichaId))
      .then((b) => {
        if (ativo) setBlob(b);
      })
      .catch(() => {
        if (ativo) setBlob(null);
      });
    return () => {
      ativo = false;
    };
  }, [fichaId, temToken, revisao]);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const endereco = URL.createObjectURL(blob);
    setUrl(endereco);
    return () => URL.revokeObjectURL(endereco);
  }, [blob]);
  const executar = async (b: Blob | null) => {
    if (ocupado || desabilitado) return;
    setOcupado(true);
    setErro('');
    try {
      if (b) await validarTokenArquivo(b);
      const preparado = b instanceof File ? await otimizarImagemSkin(b) : b;
      await onAlterar(preparado);
      setBlob(preparado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível definir o token.');
      throw e;
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section className="token-padrao-ficha" aria-label="Token padrão da ficha">
      <header>
        <strong>Token padrão</strong>
        <small>
          Usado automaticamente quando esta ficha entrar nas Mesas 2D e 3D. Independente do retrato.
        </small>
      </header>
      <div className="token-padrao-corpo">
        <div className="token-padrao-preview">
          {url && blob ? (
            <TokenIdle src={url} animado={blob.type === 'image/gif'} alt="Prévia do token padrão" />
          ) : (
            <span>Sem token padrão</span>
          )}
        </div>
        <div className="token-padrao-acoes">
          <button
            type="button"
            disabled={desabilitado || ocupado}
            onClick={() => entrada.current?.click()}
          >
            ↥ Importar PNG, WebP, JPG ou GIF
          </button>
          <button
            type="button"
            disabled={desabilitado || ocupado}
            onClick={() => setMostrarAcervo((v) => !v)}
          >
            {mostrarAcervo ? 'Fechar biblioteca' : 'Escolher da biblioteca'}
          </button>
          <button
            type="button"
            disabled={desabilitado || ocupado || (!blob && !temToken)}
            onClick={() => void executar(null).catch(() => undefined)}
          >
            Remover token padrão
          </button>
        </div>
      </div>
      <input
        ref={entrada}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void executar(f).catch(() => undefined);
        }}
      />
      {erro && (
        <p role="alert" className="biblioteca-idle-erro">
          {erro}
        </p>
      )}
      {mostrarAcervo && (
        <BibliotecaTokens
          onAplicar={async (_, arquivo) => {
            await executar(arquivo);
            setMostrarAcervo(false);
          }}
        />
      )}
    </section>
  );
}
