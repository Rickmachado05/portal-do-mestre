import { useEffect, useRef, useState } from 'react';
import {
  assinarPresenca,
  autorizar,
  urlSala,
  type CredencialSala,
  type MusicaCompartilhada,
} from './api';
import './MusicaConvidado.css';

const chaveVolume = 'portal-musica-volume-convidado-v1';
function volumeInicial() {
  try {
    const raw = localStorage.getItem(chaveVolume);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
  } catch {
    /* privado */
  }
  return 70;
}
export default function MusicaConvidado({ credencial }: { credencial: CredencialSala }) {
  const [musica, setMusica] = useState<MusicaCompartilhada | null>(null);
  const [volume, setVolume] = useState(volumeInicial);
  const [ativado, setAtivado] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const ativadoRef = useRef(true);
  const estadoRef = useRef<MusicaCompartilhada | null>(null);
  const fonteRef = useRef('');
  const recebidoEm = useRef(performance.now());
  const ultimoVolume = useRef(volume || 70);
  const musicaRef = useRef<MusicaCompartilhada | null>(null);
  musicaRef.current = musica;
  const fonte =
    musica?.origem === 'arquivo'
      ? `${urlSala(credencial.codigo)}/musicas/${musica.id}?token=${encodeURIComponent(credencial.token)}`
      : musica?.endereco || '';
  function ajustarReproducao(atual: MusicaCompartilhada | null, exigirGesto = false) {
    const player = audio.current;
    if (!player) return;
    if (!atual) {
      player.pause();
      return;
    }
    if (!ativadoRef.current) return;
    const alvo = Math.max(
      0,
      atual.posicao +
        (atual.tocando ? Math.max(0, (performance.now() - recebidoEm.current) / 1000) : 0),
    );
    const sincronizar = () => {
      if (player.readyState < 1) return;
      const max = Number.isFinite(player.duration) ? Math.max(0, player.duration - 0.25) : alvo;
      const ajuste = Math.min(alvo, max);
      if (Number.isFinite(ajuste) && Math.abs(player.currentTime - ajuste) > 1.7) {
        try {
          player.currentTime = ajuste;
        } catch {
          /* ainda carregando */
        }
      }
    };
    sincronizar();
    if (atual.tocando) {
      if (player.paused || exigirGesto)
        void player
          .play()
          .then(() => {
            setBloqueado(false);
            setErro('');
          })
          .catch(() => {
            setBloqueado(true);
          });
    } else {
      player.pause();
    }
  }
  useEffect(() => {
    let ativo = true;
    setMusica(null);
    setAtivado(true);
    ativadoRef.current = true;
    fonteRef.current = '';
    estadoRef.current = null;
    void fetch(`${urlSala(credencial.codigo)}/musica`, {
      headers: autorizar(credencial.token),
      cache: 'no-store',
    })
      .then(async (r) =>
        r.ok ? ((await r.json()) as { musica: MusicaCompartilhada | null }) : null,
      )
      .then((r) => {
        if (ativo && r) {
          recebidoEm.current = performance.now();
          setMusica(r.musica);
        }
      })
      .catch(() => undefined);
    const remover = assinarPresenca(
      credencial,
      (evento) => {
        if (evento.tipo === 'musica' && ativo) {
          recebidoEm.current = performance.now();
          setMusica(evento.musica);
        }
      },
      () => undefined,
    );
    return () => {
      ativo = false;
      remover();
      audio.current?.pause();
    };
  }, [credencial.codigo, credencial.token]);
  // A sessão inicia com áudio habilitado, como na mesa do mestre.
  // Política dos navegadores: quando autoplay é bloqueado, uma interação real
  // do jogador (qualquer clique ou tecla) libera a reprodução sem botão fixo na HUD.
  useEffect(() => {
    const liberar = () => {
      const atual = musicaRef.current;
      const player = audio.current;
      if (!player || !atual?.tocando || !player.paused) return;
      void player
        .play()
        .then(() => {
          setBloqueado(false);
          setErro('');
        })
        .catch((e) => {
          if ((e as Error)?.name === 'NotAllowedError') setBloqueado(true);
        });
    };
    document.addEventListener('pointerdown', liberar, { capture: true });
    document.addEventListener('keydown', liberar, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', liberar, true);
      document.removeEventListener('keydown', liberar, true);
    };
  }, []);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.volume = volume / 100;
    try {
      localStorage.setItem(chaveVolume, String(volume));
    } catch {
      /* privado */
    }
  }, [volume]);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    if (!fonte || fonteRef.current !== fonte) {
      player.pause();
      fonteRef.current = fonte;
      if (fonte) {
        player.src = fonte;
        player.load();
      } else {
        player.removeAttribute('src');
        player.load();
      }
    }
    estadoRef.current = musica;
    ajustarReproducao(musica);
  }, [fonte, musica]);
  async function ativar() {
    ativadoRef.current = true;
    setAtivado(true);
    setBloqueado(false);
    const player = audio.current;
    if (!player) return;
    const atual = musicaRef.current;
    if (atual) {
      const alvo = Math.max(
        0,
        atual.posicao +
          (atual.tocando ? Math.max(0, (performance.now() - recebidoEm.current) / 1000) : 0),
      );
      if (player.readyState >= 1 && Math.abs(player.currentTime - alvo) > 1.7)
        try {
          player.currentTime = alvo;
        } catch {
          /* sem metadados */
        }
      if (atual.tocando)
        try {
          await player.play();
          setBloqueado(false);
          setErro('');
        } catch {
          setBloqueado(true);
        }
    }
  }
  function mutar() {
    setVolume((v) => {
      if (v === 0) return ultimoVolume.current;
      ultimoVolume.current = v;
      return 0;
    });
  }
  return (
    <section className="pm-musica-convidado" aria-label="Controle individual de música">
      <audio
        ref={audio}
        preload="auto"
        autoPlay
        onLoadedMetadata={() => ajustarReproducao(estadoRef.current)}
        onCanPlay={() => ajustarReproducao(estadoRef.current)}
        onError={() => {
          if (musicaRef.current)
            setErro('Esta faixa não pôde ser carregada. Confira a música na mesa do mestre.');
        }}
      />
      <div className="pm-musica-faixa">
        <small>
          {musica
            ? musica.tocando
              ? 'TOCANDO NA MESA DO MESTRE'
              : 'PAUSADA PELO MESTRE'
            : 'AGUARDANDO O MESTRE'}
        </small>
        <b>{musica?.titulo || 'Nenhuma música selecionada'}</b>
      </div>
      {bloqueado && musica?.tocando ? (
        <button className="pm-musica-ativar" type="button" onClick={() => void ativar()}>
          ▶ Liberar som neste navegador
        </button>
      ) : null}
      <label className="pm-musica-vol">
        <span>Volume individual</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume da música"
        />
        <strong>{volume}%</strong>
      </label>
      <button className="pm-musica-mut" type="button" onClick={mutar}>
        {volume === 0 ? '◖ Restaurar som' : '◖ Silenciar música'}
      </button>
      {erro && (
        <p role="alert" className="pm-musica-erro">
          {erro}
        </p>
      )}
      <small className="pm-musica-nota">
        O mestre escolhe a faixa e controla a reprodução. O volume é só seu e fica salvo neste
        navegador.{' '}
        {bloqueado
          ? 'Se o navegador impedir o áudio, clique em Liberar som.'
          : ativado
            ? 'Áudio habilitado automaticamente.'
            : ''}
      </small>
    </section>
  );
}
