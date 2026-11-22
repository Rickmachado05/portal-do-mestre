import { useEffect, useRef, useState } from 'react';
import {
  adicionarIdleBiblioteca,
  carregarIdleBiblioteca,
  lerBibliotecaIdle,
  removerIdleBiblioteca,
  type IdleBiblioteca,
  MAX_IDLES_BIBLIOTECA,
} from './bibliotecaIdle';
import TokenIdle from './TokenIdle';
import './bibliotecaIdle.css';

type Props = {
  onAplicar: (idle: IdleBiblioteca, blob: Blob) => Promise<void>;
  onGuardarAtual: () => Promise<{ nome: string; blob: Blob }>;
  atualEhGif: boolean;
};
/** Biblioteca reutilizável entre campanhas; não move nem altera imagens já aplicadas. */
export default function BibliotecaIdleTokens({ onAplicar, onGuardarAtual, atualEhGif }: Props) {
  const [idles, setIdles] = useState<IdleBiblioteca[]>(() => lerBibliotecaIdle());
  const [previsualizarId, setPrevisualizarId] = useState<string | null>(null);
  const [urlPrevia, setUrlPrevia] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [pausarPrevia, setPausarPrevia] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const input = useRef<HTMLInputElement>(null);
  const [revisao, setRevisao] = useState(0);
  // Só decodifica o GIF pedido na prévia: 40 GIFs de 512 px simultâneos
  // consumiriam memória excessiva, especialmente no computador do mestre.
  useEffect(() => {
    if (!previsualizarId) {
      setUrlPrevia(null);
      return;
    }
    let ativo = true,
      url: string | null = null;
    setUrlPrevia(null);
    void carregarIdleBiblioteca(previsualizarId)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (ativo) setUrlPrevia(url);
      })
      .catch(() => {
        if (ativo) setUrlPrevia(null);
      });
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [previsualizarId, revisao]);
  const atualizar = () => {
    setIdles(lerBibliotecaIdle());
    setRevisao((r) => r + 1);
  };
  const realizar = async (acao: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      await acao();
      atualizar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section className="biblioteca-idle-mestre" aria-label="Biblioteca de tokens idle">
      <header className="biblioteca-idle-cabecalho">
        <div>
          <strong>Biblioteca de idles do Mestre</strong>
          <small>
            Reutilize GIFs em personagens, NPCs, inimigos e chefes de qualquer campanha.
          </small>
        </div>
        <span>
          {idles.length}/{MAX_IDLES_BIBLIOTECA}
        </span>
      </header>
      <div className="biblioteca-idle-acoes">
        <label className="biblioteca-idle-nome">
          Nome do idle
          <input
            className="campo"
            maxLength={64}
            value={nome}
            placeholder="Ex.: Guarda em espera"
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={ocupado || idles.length >= MAX_IDLES_BIBLIOTECA}
          onClick={() => input.current?.click()}
        >
          ＋ Importar GIF idle
        </button>
        <button
          type="button"
          disabled={ocupado || !atualEhGif || idles.length >= MAX_IDLES_BIBLIOTECA}
          onClick={() =>
            void realizar(async () => {
              const atual = await onGuardarAtual();
              await adicionarIdleBiblioteca(atual.blob, nome.trim() || atual.nome);
              setNome('');
            })
          }
        >
          Guardar idle selecionado
        </button>
        <input
          ref={input}
          type="file"
          accept="image/gif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file)
              void realizar(async () => {
                await adicionarIdleBiblioteca(
                  file,
                  nome.trim() || file.name.replace(/\.gif$/i, ''),
                );
                setNome('');
              });
          }}
        />
      </div>
      <div className="biblioteca-idle-config">
        <label>
          <input
            type="checkbox"
            checked={pausarPrevia}
            onChange={(e) => setPausarPrevia(e.target.checked)}
          />{' '}
          Pausar prévias
        </label>
        <label>
          Prévia{' '}
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
        <p role="alert" className="biblioteca-idle-erro">
          {erro}
        </p>
      )}
      {!idles.length ? (
        <p className="aviso-pequeno">
          Ainda não há GIFs nesta biblioteca. Importe um idle ou guarde a skin animada selecionada.
        </p>
      ) : (
        <div className="biblioteca-idle-lista">
          {idles.map((idle) => (
            <div key={idle.id} className="biblioteca-idle-cartao">
              <div className="biblioteca-idle-preview">
                {previsualizarId === idle.id && urlPrevia ? (
                  <TokenIdle
                    src={urlPrevia}
                    animado
                    pausado={pausarPrevia}
                    velocidade={velocidade}
                    alt={idle.nome}
                  />
                ) : (
                  <span>GIF idle</span>
                )}
              </div>
              <strong title={idle.nome}>{idle.nome}</strong>
              <small>{(idle.tamanho / 1024 / 1024).toFixed(2)} MB · GIF idle</small>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setPrevisualizarId((a) => (a === idle.id ? null : idle.id))}
              >
                {previsualizarId === idle.id ? 'Ocultar prévia' : 'Ver prévia'}
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void realizar(async () => {
                    const arquivo = await carregarIdleBiblioteca(idle.id);
                    await onAplicar(idle, arquivo);
                  })
                }
              >
                Usar como skin
              </button>
              <button
                type="button"
                className="biblioteca-idle-excluir"
                disabled={ocupado}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remover “${idle.nome}” da biblioteca? Skins já aplicadas serão mantidas.`,
                    )
                  )
                    void realizar(async () => {
                      await removerIdleBiblioteca(idle.id);
                      if (previsualizarId === idle.id) setPrevisualizarId(null);
                    });
                }}
              >
                Remover da biblioteca
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="aviso-pequeno">
        Os GIFs são guardados no dispositivo e incluídos no backup completo. Ao aplicar, o Portal
        faz uma cópia independente para o personagem. Limites: 4 MB, 512×512 e 40 quadros.
      </p>
    </section>
  );
}
