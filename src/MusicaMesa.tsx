import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  carregarArquivo as carregarArquivoBase,
  excluirArquivo as excluirArquivoBase,
  salvarArquivo as salvarArquivoBase,
} from './lib/storage';
import { chaveArquivoCampanha } from './hexatombe/campaignLibrary';
import { autorizar, chaveMestre, lerCredencial, urlSala } from './multiplayer/api';
import './MusicaMesa.css';

type Playlist = { id: string; nome: string; faixas: string[] };
type ConfiguracaoPlaylists = { listas: Playlist[]; porCena: Record<string, string> };
const chavePlaylist = (campanhaId: string) => `portal-mestre-playlists-v13448:${campanhaId}`;
function carregarPlaylists(campanhaId: string): ConfiguracaoPlaylists {
  try {
    const raw = JSON.parse(
      localStorage.getItem(chavePlaylist(campanhaId)) || '{}',
    ) as ConfiguracaoPlaylists;
    return {
      listas: Array.isArray(raw.listas)
        ? raw.listas
            .filter(
              (v) =>
                v &&
                typeof v.id === 'string' &&
                typeof v.nome === 'string' &&
                Array.isArray(v.faixas),
            )
            .map((v) => ({
              ...v,
              faixas: v.faixas.filter((id): id is string => typeof id === 'string'),
            }))
        : [],
      porCena:
        raw.porCena && typeof raw.porCena === 'object' && !Array.isArray(raw.porCena)
          ? raw.porCena
          : {},
    };
  } catch {
    return { listas: [], porCena: {} };
  }
}

type Faixa = {
  id: string;
  titulo: string;
  origem: 'arquivo' | 'url';
  endereco?: string;
};
const CHAVE = 'hexatombe-mesa-musicas-v031';
const CHAVE_AUDIO = (id: string) => `audio:${id}`;
const chaveMusicas = (campanhaId: string) =>
  campanhaId === 'principal' ? CHAVE : `${CHAVE}:${campanhaId}`;

function carregarLista(campanhaId: string): Faixa[] {
  try {
    const valor = JSON.parse(localStorage.getItem(chaveMusicas(campanhaId)) || '[]') as unknown;
    if (!Array.isArray(valor)) return [];
    return valor.filter((item): item is Faixa =>
      Boolean(
        item &&
        typeof item.id === 'string' &&
        typeof item.titulo === 'string' &&
        (item.origem === 'arquivo' || (item.origem === 'url' && typeof item.endereco === 'string')),
      ),
    );
  } catch {
    return [];
  }
}
function tempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const total = Math.floor(segundos);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Áudio permanece montado, mesmo quando a janela Música está fechada ou minimizada. */
export default function MusicaMesa({
  campanhaId = 'principal',
  cenaId = 'geral',
}: {
  campanhaId?: string;
  cenaId?: string;
}) {
  const carregarArquivo = (chave: string) =>
    carregarArquivoBase(chaveArquivoCampanha(campanhaId, chave));
  const salvarArquivo = (chave: string, arquivo: Blob) =>
    salvarArquivoBase(chaveArquivoCampanha(campanhaId, chave), arquivo);
  const excluirArquivo = (chave: string) =>
    excluirArquivoBase(chaveArquivoCampanha(campanhaId, chave));
  const [faixas, setFaixas] = useState<Faixa[]>(() => carregarLista(campanhaId));
  const [configPlaylists, setConfigPlaylists] = useState<ConfiguracaoPlaylists>(() =>
    carregarPlaylists(campanhaId),
  );
  const [edicaoFaixa, setEdicaoFaixa] = useState<string | null>(null);
  const [tituloEmEdicao, setTituloEmEdicao] = useState('');
  const playlistCenaId = configPlaylists.porCena[cenaId] || '';
  const playlistCena = configPlaylists.listas.find((x) => x.id === playlistCenaId);
  const faixasDaCena = playlistCena
    ? faixas.filter((x) => playlistCena.faixas.includes(x.id))
    : faixas;
  const mudarPlaylistCena = (novaId: string) =>
    setConfigPlaylists((c) => ({ ...c, porCena: { ...c.porCena, [cenaId]: novaId } }));
  const criarPlaylist = () => {
    const nome = window.prompt('Nome da nova playlist:', `Trilha de ${cenaId}`)?.trim();
    if (!nome) return;
    const id = novoId();
    setConfigPlaylists((c) => ({
      ...c,
      listas: [...c.listas, { id, nome: nome.slice(0, 90), faixas: [] }],
      porCena: { ...c.porCena, [cenaId]: id },
    }));
  };
  const renomearPlaylist = () => {
    if (!playlistCena) return;
    const nome = window.prompt('Renomear playlist:', playlistCena.nome)?.trim();
    if (nome)
      setConfigPlaylists((c) => ({
        ...c,
        listas: c.listas.map((l) =>
          l.id === playlistCena.id ? { ...l, nome: nome.slice(0, 90) } : l,
        ),
      }));
  };
  const excluirPlaylist = () => {
    if (
      !playlistCena ||
      !window.confirm(
        `Excluir a playlist “${playlistCena.nome}”? As músicas continuam na biblioteca.`,
      )
    )
      return;
    setConfigPlaylists((c) => ({
      ...c,
      listas: c.listas.filter((l) => l.id !== playlistCena.id),
      porCena: Object.fromEntries(
        Object.entries(c.porCena).filter(([, id]) => id !== playlistCena.id),
      ),
    }));
  };
  const alternarMusicaPlaylist = (id: string) => {
    if (!playlistCena) return;
    setConfigPlaylists((c) => ({
      ...c,
      listas: c.listas.map((l) =>
        l.id === playlistCena.id
          ? {
              ...l,
              faixas: l.faixas.includes(id) ? l.faixas.filter((x) => x !== id) : [...l.faixas, id],
            }
          : l,
      ),
    }));
  };
  const [enderecos, setEnderecos] = useState<Record<string, string>>({});
  const objetos = useRef<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [tocando, setTocando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [posicao, setPosicao] = useState(0);
  const [volume, setVolume] = useState(() => {
    const bruto = localStorage.getItem('portal-musica-volume-mestre-v1');
    const salvo = Number(bruto);
    return bruto !== null && Number.isFinite(salvo) && salvo >= 0 && salvo <= 100 ? salvo : 75;
  });
  const [revisaoSincronizacao, setRevisaoSincronizacao] = useState(0);
  const ultimaPublicacao = useRef('');
  const ultimaFaixaPublicada = useRef('');
  const [repetir, setRepetir] = useState(false);
  const [embaralhar, setEmbaralhar] = useState(false);
  const [link, setLink] = useState('');
  const [tituloLink, setTituloLink] = useState('');
  const [aviso, setAviso] = useState('');
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Trocar de cena/playlist não mantém tocando uma faixa que não pertence à nova seleção.
    if (atualId && !faixasDaCena.some((f) => f.id === atualId)) {
      audioRef.current?.pause();
      setTocando(false);
      setAtualId(null);
    }
  }, [atualId, cenaId, playlistCenaId, faixasDaCena]);
  const faixaAtual = faixas.find((f) => f.id === atualId);
  const fonte = faixaAtual?.origem === 'arquivo' ? enderecos[faixaAtual.id] : faixaAtual?.endereco;

  useEffect(() => {
    try {
      localStorage.setItem(chavePlaylist(campanhaId), JSON.stringify(configPlaylists));
    } catch {
      setAviso('Não foi possível salvar as playlists neste navegador.');
    }
  }, [configPlaylists, campanhaId]);

  useEffect(() => {
    try {
      localStorage.setItem(chaveMusicas(campanhaId), JSON.stringify(faixas));
    } catch {
      setAviso('Não foi possível salvar a lista de músicas neste navegador.');
    }
  }, [faixas, campanhaId]);

  // Restaura os arquivos de música guardados no IndexedDB, sem armazenar MP3s no localStorage.
  useEffect(() => {
    let cancelado = false;
    const criados: string[] = [];
    void (async () => {
      const registradas = carregarLista(campanhaId).filter((f) => f.origem === 'arquivo');
      for (const faixa of registradas) {
        try {
          const arquivo = await carregarArquivo(CHAVE_AUDIO(faixa.id));
          if (cancelado) break;
          if (arquivo) {
            const url = URL.createObjectURL(arquivo);
            criados.push(url);
            objetos.current[faixa.id] = url;
            setEnderecos((atual) => ({ ...atual, [faixa.id]: url }));
          }
        } catch {
          if (!cancelado) setAviso('Alguns arquivos não puderam ser recuperados.');
        }
      }
    })();
    return () => {
      cancelado = true;
      criados.forEach(URL.revokeObjectURL);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!fonte) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setTocando(false);
      setPosicao(0);
      setDuracao(0);
      return;
    }
    if (audio.getAttribute('src') !== fonte) {
      audio.pause();
      audio.setAttribute('src', fonte);
      audio.load();
      setTocando(false);
      setPosicao(0);
      setDuracao(0);
    }
  }, [fonte]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    try {
      localStorage.setItem('portal-musica-volume-mestre-v1', String(volume));
    } catch {
      /* privado */
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.loop = repetir;
  }, [repetir]);

  // O mestre controla a trilha; cada convidado decide o volume localmente.
  // A publicação continua funcionando se o servidor Cloudflare estiver ativo
  // mesmo depois de a faixa ter sido selecionada no navegador do mestre.
  useEffect(() => {
    const timer = window.setInterval(() => setRevisaoSincronizacao((n) => n + 1), 4000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const cred = lerCredencial(chaveMestre(campanhaId));
    if (!cred || cred.papel !== 'mestre') return;
    const audio = audioRef.current;
    const faixa = faixas.find((f) => f.id === atualId);
    const chaveFaixa = `${cred.codigo}:${faixa?.id || ''}`;
    if (!faixa || faixa.origem !== 'arquivo') ultimaFaixaPublicada.current = '';
    const registro = `${chaveFaixa}:${tocando ? 'play' : 'pause'}:${Math.floor((audio?.currentTime || 0) / 4)}`;
    if (registro === ultimaPublicacao.current) return;
    let cancelado = false;
    const publicar = async () => {
      try {
        if (faixa?.origem === 'arquivo' && chaveFaixa !== ultimaFaixaPublicada.current) {
          const blob = await carregarArquivo(CHAVE_AUDIO(faixa.id));
          if (!blob) throw Error('Arquivo de música não encontrado no navegador do mestre.');
          if (blob.size > 45_000_000)
            throw Error('Esta faixa ultrapassa 45 MB e não pode ser transmitida.');
          const resposta = await fetch(`${urlSala(cred.codigo)}/musicas/${faixa.id}`, {
            method: 'POST',
            headers: { ...autorizar(cred.token), 'Content-Type': blob.type || 'audio/mpeg' },
            body: blob,
          });
          if (!resposta.ok)
            throw Error(
              (await resposta.json().catch(() => ({}))).erro || 'Falha no envio da faixa.',
            );
          if (cancelado) return;
          ultimaFaixaPublicada.current = chaveFaixa;
        }
        if (cancelado) return;
        const atual = audioRef.current;
        const resposta = await fetch(`${urlSala(cred.codigo)}/musica`, {
          method: 'POST',
          headers: { ...autorizar(cred.token), 'Content-Type': 'application/json' },
          body: JSON.stringify(
            faixa
              ? {
                  id: faixa.id,
                  titulo: faixa.titulo,
                  origem: faixa.origem,
                  ...(faixa.origem === 'url' ? { endereco: faixa.endereco } : {}),
                  tocando: Boolean(atual && !atual.paused && !atual.ended),
                  posicao: atual?.currentTime || 0,
                }
              : { id: null },
          ),
        });
        if (!resposta.ok)
          throw Error(
            (await resposta.json().catch(() => ({}))).erro || 'Falha ao sincronizar a trilha.',
          );
        if (!cancelado) {
          ultimaPublicacao.current = registro;
          setAviso((texto) =>
            texto.startsWith('Música local funciona, mas convidados') ? '' : texto,
          );
        }
      } catch (e) {
        if (!cancelado && faixa)
          setAviso(
            `Música local funciona, mas convidados não receberam a faixa: ${e instanceof Error ? e.message : 'falha de conexão'}`,
          );
      }
    };
    const timer = window.setTimeout(() => {
      void publicar();
    }, 120);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [campanhaId, atualId, tocando, faixas, revisaoSincronizacao]);

  async function importar(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(event.target.files || []);
    event.target.value = '';
    if (!arquivos.length) return;
    const adicionadas: Faixa[] = [];
    const alertas: string[] = [];
    for (const arquivo of arquivos) {
      if (
        !arquivo.type.startsWith('audio/') &&
        !/\.(mp3|ogg|wav|m4a|aac|flac|webm|opus)$/i.test(arquivo.name)
      ) {
        alertas.push(`${arquivo.name}: formato não reconhecido`);
        continue;
      }
      if (arquivo.size > 150 * 1024 * 1024) {
        alertas.push(`${arquivo.name}: acima de 150 MB`);
        continue;
      }
      const id = novoId();
      try {
        await salvarArquivo(CHAVE_AUDIO(id), arquivo);
        const url = URL.createObjectURL(arquivo);
        objetos.current[id] = url;
        setEnderecos((atual) => ({ ...atual, [id]: url }));
        adicionadas.push({ id, titulo: arquivo.name.replace(/\.[^.]+$/, ''), origem: 'arquivo' });
      } catch {
        alertas.push(`${arquivo.name}: não foi possível salvar no navegador`);
      }
    }
    if (adicionadas.length) {
      setFaixas((atual) => [...atual, ...adicionadas]);
      if (!atualId) setAtualId(adicionadas[0].id);
    }
    setAviso(
      alertas.length
        ? alertas.join(' · ')
        : `${adicionadas.length} faixa(s) adicionada(s) à lista.`,
    );
  }

  function adicionarLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const url = new URL(link.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Protocolo inválido');
      const id = novoId();
      const faixa: Faixa = {
        id,
        origem: 'url',
        endereco: url.href,
        titulo:
          tituloLink.trim() || decodeURIComponent(url.pathname.split('/').pop() || 'Áudio por URL'),
      };
      setFaixas((atual) => [...atual, faixa]);
      if (!atualId) setAtualId(id);
      setLink('');
      setTituloLink('');
      setAviso(
        'Link adicionado. Use uma URL direta para MP3, OGG ou outro áudio reproduzível pelo navegador.',
      );
    } catch {
      setAviso('Insira um endereço HTTP ou HTTPS válido.');
    }
  }

  function tocar(id?: string) {
    const selecionada = id
      ? faixasDaCena.find((f) => f.id === id)
      : faixaAtual && faixasDaCena.some((f) => f.id === faixaAtual.id)
        ? faixaAtual
        : faixasDaCena[0];
    if (!selecionada) {
      setAviso('Adicione primeiro uma música.');
      return;
    }
    const endereco =
      selecionada.origem === 'arquivo' ? enderecos[selecionada.id] : selecionada.endereco;
    if (!endereco) {
      setAviso('Arquivo ainda não carregado ou indisponível.');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    setAtualId(selecionada.id);
    if (audio.getAttribute('src') !== endereco) {
      audio.pause();
      audio.setAttribute('src', endereco);
      audio.load();
      setPosicao(0);
      setDuracao(0);
    }
    void audio
      .play()
      .then(() => {
        setTocando(true);
        setAviso('');
      })
      .catch(() => {
        setTocando(false);
        setAviso(
          'Não foi possível tocar esta faixa. Links de vídeos, como YouTube, não são URLs diretas de áudio.',
        );
      });
  }
  function pausar() {
    audioRef.current?.pause();
    setTocando(false);
  }

  function pular(direcao: -1 | 1) {
    if (!faixasDaCena.length) return;
    const indice = faixasDaCena.findIndex((f) => f.id === atualId);
    const proximoIndice =
      embaralhar && direcao === 1 && faixasDaCena.length > 1
        ? (indice + 1 + Math.floor(Math.random() * (faixasDaCena.length - 1))) % faixasDaCena.length
        : (indice + direcao + faixasDaCena.length) % faixasDaCena.length;
    const proximo = faixasDaCena[proximoIndice];
    if (proximo) tocar(proximo.id);
  }
  function terminou() {
    if (repetir) return;
    const indice = faixasDaCena.findIndex((f) => f.id === atualId);
    if (embaralhar && faixasDaCena.length > 1) pular(1);
    else if (indice >= 0 && indice < faixasDaCena.length - 1) tocar(faixasDaCena[indice + 1].id);
    else setTocando(false);
  }
  function confirmarRenomeacao(faixaId: string) {
    const titulo = tituloEmEdicao.trim();
    if (!titulo) {
      setAviso('O nome da música não pode ficar vazio.');
      return;
    }
    setFaixas((atual) =>
      atual.map((f) => (f.id === faixaId ? { ...f, titulo: titulo.slice(0, 120) } : f)),
    );
    setEdicaoFaixa(null);
    setTituloEmEdicao('');
  }
  async function remover(id: string) {
    const faixa = faixas.find((f) => f.id === id);
    if (!faixa) return;
    if (atualId === id) {
      pausar();
      audioRef.current?.removeAttribute('src');
      audioRef.current?.load();
      setAtualId(null);
    }
    setFaixas((atual) => atual.filter((f) => f.id !== id));
    setConfigPlaylists((c) => ({
      ...c,
      listas: c.listas.map((l) => ({ ...l, faixas: l.faixas.filter((x) => x !== id) })),
    }));
    if (faixa.origem === 'arquivo') {
      try {
        await excluirArquivo(CHAVE_AUDIO(id));
      } catch {
        setAviso('A faixa saiu da lista, mas houve falha ao excluir o arquivo guardado.');
      }
      if (objetos.current[id]) {
        URL.revokeObjectURL(objetos.current[id]);
        delete objetos.current[id];
      }
      setEnderecos((atual) => {
        const novos = { ...atual };
        delete novos[id];
        return novos;
      });
    }
  }

  return (
    <div className="player-musica">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setPosicao(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) =>
          setDuracao(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
        }
        onEnded={terminou}
        onSeeked={() => setRevisaoSincronizacao((n) => n + 1)}
        onPause={() => setTocando(false)}
        onPlay={() => setTocando(true)}
        onError={() => {
          if (faixaAtual) {
            setTocando(false);
            setAviso('Não foi possível carregar o áudio. Confira o arquivo ou use um link direto.');
          }
        }}
      />
      <div className="musica-status">
        <span className="musica-selo">♫</span>
        <div>
          <small>TOCANDO NA MESA DO MESTRE</small>
          <strong>{faixaAtual?.titulo || 'Nenhuma música selecionada'}</strong>
        </div>
      </div>
      <div className="musica-progresso">
        <input
          type="range"
          min="0"
          max={Math.max(duracao, 1)}
          step="0.1"
          value={Math.min(posicao, Math.max(duracao, 1))}
          aria-label="Posição da reprodução"
          disabled={!duracao}
          onChange={(e) => {
            const nova = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = nova;
            setPosicao(nova);
          }}
        />
        <div>
          <span>{tempo(posicao)}</span>
          <span>{tempo(duracao)}</span>
        </div>
      </div>
      <div className="musica-controles">
        <button
          type="button"
          title="Faixa anterior"
          onClick={() => pular(-1)}
          disabled={!faixasDaCena.length}
        >
          ⏮
        </button>
        <button
          type="button"
          className="musica-reproduzir"
          title={tocando ? 'Pausar' : 'Reproduzir'}
          onClick={() => (tocando ? pausar() : tocar())}
          disabled={!faixasDaCena.length}
        >
          {tocando ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          title="Próxima faixa"
          onClick={() => pular(1)}
          disabled={!faixasDaCena.length}
        >
          ⏭
        </button>
        <button
          type="button"
          className={embaralhar ? 'musica-ativado' : ''}
          title="Ordem aleatória"
          aria-pressed={embaralhar}
          onClick={() => setEmbaralhar((v) => !v)}
        >
          ⇄
        </button>
        <button
          type="button"
          className={repetir ? 'musica-ativado' : ''}
          title="Repetir faixa atual"
          aria-pressed={repetir}
          onClick={() => setRepetir((v) => !v)}
        >
          ↻
        </button>
        <label className="musica-volume" title={`Volume ${volume}%`}>
          ◖{' '}
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />{' '}
          {volume}%
        </label>
      </div>
      <section className="musica-playlists" aria-label="Playlists por cena">
        <label>
          Playlist desta cena
          <select
            aria-label="Playlist da cena"
            value={playlistCenaId}
            onChange={(e) => {
              mudarPlaylistCena(e.target.value);
              pausar();
              setAtualId(null);
            }}
          >
            <option value="">Todas as músicas da biblioteca</option>
            {configPlaylists.listas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome} ({l.faixas.length})
              </option>
            ))}
          </select>
        </label>
        <div className="musica-playlist-botoes">
          <button type="button" onClick={criarPlaylist}>
            ＋ Nova playlist
          </button>
          <button type="button" disabled={!playlistCena} onClick={renomearPlaylist}>
            ✎ Renomear
          </button>
          <button type="button" disabled={!playlistCena} onClick={excluirPlaylist}>
            ✕ Excluir
          </button>
        </div>
        {playlistCena && (
          <details className="musica-playlist-edicao">
            <summary>Organizar músicas de “{playlistCena.nome}”</summary>
            {faixas.length ? (
              faixas.map((f) => (
                <label key={f.id}>
                  <input
                    type="checkbox"
                    checked={playlistCena.faixas.includes(f.id)}
                    onChange={() => alternarMusicaPlaylist(f.id)}
                  />
                  {f.titulo}
                </label>
              ))
            ) : (
              <p>Importe músicas na biblioteca abaixo para adicioná-las à playlist.</p>
            )}
          </details>
        )}
        <small>
          {playlistCena
            ? `Cena vinculada a “${playlistCena.nome}” · ${faixasDaCena.length} músicas`
            : 'Esta cena usa a biblioteca inteira. Escolha ou crie uma playlist para ter uma trilha específica.'}
        </small>
      </section>
      <div className="musica-biblioteca-topo">
        <strong>
          Biblioteca de músicas <small>({faixas.length})</small>
        </strong>
        <button type="button" onClick={() => inputArquivo.current?.click()}>
          ＋ Arquivos
        </button>
      </div>
      <input
        hidden
        ref={inputArquivo}
        type="file"
        accept="audio/*,.mp3,.ogg,.wav,.m4a,.opus,.flac,.webm"
        multiple
        onChange={(e) => {
          void importar(e);
        }}
      />
      <div className="musica-lista">
        {!faixasDaCena.length && (
          <p className="musica-vazia">
            {!faixas.length
              ? 'Importe arquivos MP3/OGG/WAV para montar a trilha da sessão. As faixas ficam guardadas neste navegador.'
              : 'Esta playlist ainda não tem músicas. Use Organizar músicas acima para escolher as faixas.'}
          </p>
        )}
        {faixasDaCena.map((faixa, indice) => (
          <div className={`musica-faixa ${atualId === faixa.id ? 'atual' : ''}`} key={faixa.id}>
            <button
              type="button"
              className="musica-faixa-selecionar"
              onClick={() => tocar(faixa.id)}
              title={`Reproduzir ${faixa.titulo}`}
            >
              <span>
                {atualId === faixa.id && tocando ? '♫' : String(indice + 1).padStart(2, '0')}
              </span>
              <strong>{faixa.titulo}</strong>
              <small>{faixa.origem === 'arquivo' ? 'Arquivo' : 'Link'}</small>
            </button>
            {edicaoFaixa === faixa.id ? (
              <div className="musica-edicao-faixa">
                <input
                  aria-label="Novo nome da música"
                  autoFocus
                  maxLength={120}
                  value={tituloEmEdicao}
                  onChange={(e) => setTituloEmEdicao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmarRenomeacao(faixa.id);
                    if (e.key === 'Escape') setEdicaoFaixa(null);
                  }}
                />
                <button type="button" onClick={() => confirmarRenomeacao(faixa.id)}>
                  Salvar
                </button>
                <button type="button" onClick={() => setEdicaoFaixa(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="musica-renomear"
                onClick={() => {
                  setEdicaoFaixa(faixa.id);
                  setTituloEmEdicao(faixa.titulo);
                }}
                title={`Renomear ${faixa.titulo}`}
              >
                ✎
              </button>
            )}
            <button
              type="button"
              className="musica-excluir"
              onClick={() => {
                void remover(faixa.id);
              }}
              title={`Remover ${faixa.titulo}`}
              aria-label={`Remover ${faixa.titulo}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <details className="musica-link">
        <summary>Adicionar áudio por link direto</summary>
        <form onSubmit={adicionarLink}>
          <input
            value={tituloLink}
            placeholder="Título da música (opcional)"
            onChange={(e) => setTituloLink(e.target.value)}
          />
          <input
            value={link}
            placeholder="https://site.com/trilha.mp3"
            type="url"
            required
            onChange={(e) => setLink(e.target.value)}
          />
          <button type="submit">Adicionar URL</button>
        </form>
        <p>
          Links de YouTube, Spotify e páginas comuns não são arquivos de áudio diretos e não
          funcionam neste tocador.
        </p>
      </details>
      {aviso && (
        <div className="musica-aviso" role="status">
          {aviso}{' '}
          <button type="button" title="Dispensar aviso" onClick={() => setAviso('')}>
            ×
          </button>
        </div>
      )}
      <p className="musica-rodape">
        As playlists são salvas por campanha e associadas a cenas. Com uma sala multiplayer aberta,
        a faixa toca também para os convidados. Cada participante ajusta seu próprio volume;
        arquivos locais são compartilhados temporariamente durante a sessão.
      </p>
    </div>
  );
}
