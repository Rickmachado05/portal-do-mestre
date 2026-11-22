import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  chaveArquivoCampanha,
  chaveEstadoCampanha,
  obterCampanha,
  resolverCampanhaId,
  urlMesaCampanha,
} from '../hexatombe/campaignLibrary';
import { carregarArquivo } from '../lib/storage';
import WeatherLayer from '../WeatherLayer';
import {
  skinDoToken25D,
  dimensoesMapa,
  moverTokenMesa25D,
  normalizarEstadoMesa25D,
  posicaoMundo,
  salvarPosicaoToken25D,
  type PontoPct,
} from './mesa25dData';
import { criarMundoMesa25D, type MundoMesa25D } from './worldMesa25D';
import { vetorMovimento } from './worldLogic';

const idCampanha = resolverCampanhaId(new URLSearchParams(window.location.search).get('campanha'));
const lerEstado = () => {
  try {
    return normalizarEstadoMesa25D(
      JSON.parse(localStorage.getItem(chaveEstadoCampanha(idCampanha)) || 'null'),
    );
  } catch {
    return normalizarEstadoMesa25D(null);
  }
};
const estadoInicial = lerEstado();
const chaveArquivo = (nome: string) => chaveArquivoCampanha(idCampanha, nome);
const chaveMapa = (id: string) => (id === 'cena-original' ? 'mapa' : `mapa:${id}`);
const velocidade = 4.4;

/** Uma visualização alternativa da mesma cena. Não cria personagens nem mapas paralelos. */
export default function Exploracao25D() {
  const [estado, setEstado] = useState(estadoInicial);
  const [cenaId, setCenaId] = useState(
    estado.cenas.some((c) => c.id === estado.cenaAtivaId)
      ? estado.cenaAtivaId
      : estado.cenas[0]?.id || '',
  );
  const cena = estado.cenas.find((c) => c.id === cenaId);
  const participantes = estado.unidades.filter((u) => cena?.tokens[u.id]);
  const [tokenId, setTokenId] = useState(
    participantes.find((u) => u.tipo === 'jogador')?.id || participantes[0]?.id || '',
  );
  const token = cena?.tokens[tokenId];
  const unidade = participantes.find((u) => u.id === tokenId);
  const [mostrarSegredos, setMostrarSegredos] = useState(false);
  const [pausarClima, setPausarClima] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ajuda, setAjuda] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ponto, setPonto] = useState<PontoPct>(token || { x: 50, y: 50 });
  const [revisao, setRevisao] = useState(0);
  const [mapa, setMapa] = useState<{
    cenaId: string;
    blob: Blob | null;
    w: number;
    h: number;
  } | null>(null);
  const refStage = useRef<HTMLDivElement>(null);
  const refMundo = useRef<MundoMesa25D | null>(null);
  const refCamera = useRef<THREE.OrthographicCamera | null>(null);
  const refPos = useRef<PontoPct>(token || { x: 50, y: 50 });
  const refTokenId = useRef(tokenId);
  const refMostrarSegredos = useRef(mostrarSegredos);
  const teclas = useRef(new Set<string>());
  const refZoom = useRef(zoom);
  const refUltimoSalvar = useRef(0);
  const refSalvarPendente = useRef<() => void>(() => {});

  // Se a mesa 2D for aberta em outra aba, o botão permite recarregar as alterações.
  const atualizarDados = () => {
    refSalvarPendente.current();
    const novos = lerEstado();
    setEstado(novos);
    setRevisao((n) => n + 1);
    setAviso('Dados da mesa recarregados.');
    if (!novos.cenas.some((c) => c.id === cenaId))
      setCenaId(novos.cenaAtivaId || novos.cenas[0]?.id || '');
  };
  const mudarCena = (id: string) => {
    refSalvarPendente.current();
    teclas.current.clear();
    setCenaId(id);
    setAviso('');
    try {
      const key = chaveEstadoCampanha(idCampanha);
      const salvo = JSON.parse(localStorage.getItem(key) || 'null');
      if (
        salvo &&
        Array.isArray(salvo.cenas) &&
        salvo.cenas.some((c: { id: string }) => c.id === id)
      ) {
        salvo.cenaAtivaId = id;
        localStorage.setItem(key, JSON.stringify(salvo));
      }
    } catch {
      /* escolher cena não pode destruir dados */
    }
  };
  useEffect(() => {
    if (!cena) return;
    if (!cena.tokens[tokenId])
      setTokenId(
        estado.unidades.find((u) => u.tipo === 'jogador' && cena.tokens[u.id])?.id ||
          estado.unidades.find((u) => cena.tokens[u.id])?.id ||
          '',
      );
  }, [cenaId, estado, tokenId, cena]);
  useEffect(() => {
    refTokenId.current = tokenId;
    refMostrarSegredos.current = mostrarSegredos;
    const novo = cena?.tokens[tokenId];
    if (novo) {
      refPos.current = { x: novo.x, y: novo.y };
      setPonto({ ...refPos.current });
    }
    teclas.current.clear();
    refMundo.current?.selecionar(tokenId);
    refMundo.current?.atualizarVisao(tokenId, mostrarSegredos);
  }, [tokenId, cenaId, cena, mostrarSegredos]);
  useEffect(() => {
    refZoom.current = zoom;
    if (refCamera.current) {
      refCamera.current.zoom = zoom;
      refCamera.current.updateProjectionMatrix();
    }
  }, [zoom]);
  useEffect(() => {
    let ativo = true;
    setMapa(null);
    if (!cena) {
      return;
    }
    const buscar = async () => {
      let blob: Blob | null = null,
        w = 1200,
        h = 750;
      if (cena.temMapa && cena.camadas.fundo) {
        try {
          blob = await carregarArquivo(chaveArquivo(chaveMapa(cena.id)));
          if (blob) {
            const url = URL.createObjectURL(blob);
            try {
              const imagem = new Image();
              imagem.src = url;
              await imagem.decode();
              w = imagem.naturalWidth || 1200;
              h = imagem.naturalHeight || 750;
            } finally {
              URL.revokeObjectURL(url);
            }
          }
        } catch {
          blob = null;
          if (ativo) setAviso('Não foi possível carregar o mapa desta cena.');
        }
      }
      if (ativo) setMapa({ cenaId: cena.id, blob, w, h });
    };
    void buscar();
    return () => {
      ativo = false;
    };
  }, [cenaId, cena?.temMapa, cena?.camadas.fundo, revisao]);

  const mapaPronto = mapa && mapa.cenaId === cenaId;
  useEffect(() => {
    const el = refStage.current;
    if (!el || !cena || !mapaPronto) return;
    let render: THREE.WebGLRenderer;
    try {
      render = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setErro(
        'Não foi possível abrir o modo 2.5D. Verifique o suporte a WebGL e a aceleração de hardware do navegador.',
      );
      return;
    }
    setErro('');
    render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    render.outputColorSpace = THREE.SRGBColorSpace;
    render.domElement.className = 'exp-canvas';
    render.domElement.setAttribute('aria-label', 'Mesa virtual com mapa e tokens da campanha');
    el.appendChild(render.domElement);
    const dim = dimensoesMapa(mapa.w, mapa.h),
      mundo = criarMundoMesa25D(cena, estado.unidades, dim);
    refMundo.current = mundo;
    if (mapa.blob) void mundo.definirMapa(mapa.blob);
    const arquivos = estado.unidades
      .filter((u) => cena.tokens[u.id] && cena.camadas.tokens)
      .map(async (u) => {
        const t = cena.tokens[u.id],
          skin = skinDoToken25D(u, t);
        const original = () => carregarArquivo(chaveArquivo(`token:${u.id}`));
        let arquivo: Blob | null = null;
        try {
          if (skin !== 'original')
            arquivo = await carregarArquivo(chaveArquivo(`token-skin:${u.id}:${skin}`));
          arquivo = arquivo || (await original());
          if (!arquivo && u.temRetrato)
            arquivo = await carregarArquivo(chaveArquivo(`retrato:${u.id}`));
          if (arquivo) await mundo.definirImagemToken(u.id, arquivo);
        } catch {
          /* O fallback do token permanece disponível. */
        }
      });
    void Promise.all(arquivos);
    const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 140);
    refCamera.current = camera;
    const offset = new THREE.Vector3(9.5, 16, 18),
      frente = new THREE.Vector3(-offset.x, 0, -offset.z).normalize(),
      direita = new THREE.Vector3(-frente.z, 0, frente.x);
    const redimensionar = () => {
      const w = Math.max(200, el.clientWidth),
        h = Math.max(250, el.clientHeight),
        altura = 16.5;
      camera.left = (-altura * w) / h / 2;
      camera.right = (altura * w) / h / 2;
      camera.top = altura / 2;
      camera.bottom = -altura / 2;
      camera.zoom = refZoom.current;
      camera.updateProjectionMatrix();
      render.setSize(w, h, false);
    };
    redimensionar();
    const observer = new ResizeObserver(redimensionar);
    observer.observe(el);
    const liberadas = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ]);
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (liberadas.has(e.code)) {
        e.preventDefault();
        teclas.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => {
      teclas.current.delete(e.code);
      if (!Array.from(teclas.current).some((t) => t.startsWith('Key') || t.startsWith('Arrow')))
        persistir();
    };
    const pausar = () => {
      teclas.current.clear();
      persistir();
    };
    let pendente: { id: string; ponto: PontoPct } | null = null;
    const persistir = () => {
      if (!pendente) return;
      const atual = pendente;
      const ok = salvarPosicaoToken25D(idCampanha, cena.id, atual.id, atual.ponto);
      if (ok) pendente = null;
      else
        setAviso(
          'A posição não pôde ser salva. Confira o armazenamento local e o bloqueio do token.',
        );
    };
    refSalvarPendente.current = persistir;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pausar);
    window.addEventListener('beforeunload', pausar);
    document.addEventListener('visibilitychange', pausar);
    let anim = 0,
      antes = performance.now(),
      atualizacao = 0,
      ultimoMovimento = false;
    const cameraTarget = new THREE.Vector3();
    const foco = new THREE.Vector3();
    const frame = (tempo: number) => {
      const delta = Math.min(0.06, Math.max(0, (tempo - antes) / 1000));
      antes = tempo;
      const id = refTokenId.current,
        t = cena.tokens[id],
        naoBloqueado = t && !t.travado;
      const f =
        Number(teclas.current.has('KeyW') || teclas.current.has('ArrowUp')) -
        Number(teclas.current.has('KeyS') || teclas.current.has('ArrowDown'));
      const l =
        Number(teclas.current.has('KeyD') || teclas.current.has('ArrowRight')) -
        Number(teclas.current.has('KeyA') || teclas.current.has('ArrowLeft'));
      const v = vetorMovimento(f, l, { x: frente.x, z: frente.z }, { x: direita.x, z: direita.z });
      const movimento = Boolean(naoBloqueado) && Math.abs(v.x) + Math.abs(v.z) > 0.001;
      if (movimento) {
        const correr = teclas.current.has('ShiftLeft') || teclas.current.has('ShiftRight');
        const novo = moverTokenMesa25D(
          refPos.current,
          v.x * velocidade * delta * (correr ? 1.5 : 1),
          v.z * velocidade * delta * (correr ? 1.5 : 1),
          cena,
          dim,
        );
        if (novo.x !== refPos.current.x || novo.y !== refPos.current.y) {
          refPos.current = novo;
          mundo.atualizarPosicao(id, novo);
          pendente = { id, ponto: { ...novo } };
          if (tempo - refUltimoSalvar.current > 250) {
            refUltimoSalvar.current = tempo;
            persistir();
          }
          if (tempo - atualizacao > 110) {
            atualizacao = tempo;
            setPonto({ ...novo });
            mundo.atualizarVisao(id, refMostrarSegredos.current);
          }
        }
      }
      if (ultimoMovimento && !movimento) persistir();
      ultimoMovimento = movimento;
      const pontoAtual = posicaoMundo(refPos.current, dim);
      cameraTarget.set(pontoAtual.x, 0, pontoAtual.z);
      foco.lerp(cameraTarget, 1 - Math.exp(-delta * 7));
      camera.position.copy(foco).add(offset);
      camera.lookAt(foco.x, 0.2, foco.z);
      render.render(mundo.scene, camera);
      anim = requestAnimationFrame(frame);
    };
    // Substitui a origem da câmera pelo token, sem transportar o avatar para outro lugar.
    const start = posicaoMundo(refPos.current, dim);
    foco.set(start.x, 0, start.z);
    mundo.selecionar(refTokenId.current);
    mundo.atualizarVisao(refTokenId.current, refMostrarSegredos.current);
    anim = requestAnimationFrame(frame);
    return () => {
      pausar();
      cancelAnimationFrame(anim);
      observer.disconnect();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pausar);
      window.removeEventListener('beforeunload', pausar);
      document.removeEventListener('visibilitychange', pausar);
      if (refSalvarPendente.current === persistir) refSalvarPendente.current = () => {};
      teclas.current.clear();
      mundo.liberar();
      refMundo.current = null;
      refCamera.current = null;
      render.dispose();
      render.domElement.remove();
    };
    // O mundo muda somente com a cena ou com as dimensões da imagem real do mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cenaId, mapaPronto, revisao]);
  const zoomMenor = () => setZoom((v) => Math.max(0.65, +(v - 0.12).toFixed(2)));
  const zoomMaior = () => setZoom((v) => Math.min(1.75, +(v + 0.12).toFixed(2)));
  function touchDown(code: string) {
    teclas.current.add(code);
  }
  function touchUp(code: string) {
    teclas.current.delete(code);
  }
  return (
    <main className="exp-shell">
      <header className="exp-header">
        <a className="exp-brand" href="/mesas/">
          <span className="exp-brand-icon">✥</span>
          <span>
            <strong>PORTAL DO MESTRE</strong>
            <small>MESA DE CAMPANHA</small>
          </span>
        </a>
        <div className="exp-header-center">
          <span className="exp-experimental">● BETA 2.5D</span>
          <strong>{obterCampanha(idCampanha)?.titulo || estado.titulo}</strong>
        </div>
        <a className="exp-back" href={`/mesa3d/?campanha=${encodeURIComponent(idCampanha)}`}>
          ▣ Testar Mesa 3D
        </a>
        <a className="exp-back" href={urlMesaCampanha(idCampanha)}>
          ← Voltar à Mesa 2D
        </a>
      </header>
      <section className="exp-body" aria-label="Mesa 2.5D com recursos reais da campanha">
        <div className="exp-stage" ref={refStage}>
          {mapaPronto && (
            <WeatherLayer
              config={cena?.clima || { tipo: 'nenhum', intensidade: 0, vento: 0, direcao: 0 }}
              pausado={pausarClima}
            />
          )}
          <div className="exp-vignette" aria-hidden="true" />
          {erro && (
            <div className="exp-error" role="alert">
              {erro}
            </div>
          )}
          <div className="exp-stage-title">
            <span>MESA DE EXPLORAÇÃO 2.5D</span>
            <h1>{cena?.nome || 'Nenhuma cena'}</h1>
            <p>
              {cena?.temMapa
                ? 'Usando o mapa, a iluminação e os tokens desta campanha.'
                : 'Cena sem imagem de mapa · adicione uma imagem na Mesa 2D.'}
            </p>
          </div>
          <div className="exp-stage-bottom">
            <span className="exp-loc">
              ◈ {unidade?.nome || 'Selecione um token'} · {Math.round(ponto.x)}%,{' '}
              {Math.round(ponto.y)}%
            </span>
            <span className="exp-safety">WASD move o token na mesma campanha</span>
          </div>
        </div>
        <aside className="exp-side" aria-label="Controles da mesa 2.5D">
          <section className="exp-panel exp-player-panel">
            <span className="exp-eyebrow">CENA ATIVA</span>
            <select
              aria-label="Selecionar cena"
              value={cenaId}
              onChange={(e) => mudarCena(e.target.value)}
            >
              {estado.cenas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <label htmlFor="exp-player-select" className="exp-select-label">
              Token controlado
            </label>
            <select
              id="exp-player-select"
              value={tokenId}
              onChange={(e) => {
                refSalvarPendente.current();
                setTokenId(e.target.value);
              }}
            >
              {participantes.length === 0 ? (
                <option value="">Nenhum token nesta cena</option>
              ) : (
                participantes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} · {u.tipo}
                  </option>
                ))
              )}
            </select>
            <span className="exp-player-status">
              <i />
              {unidade?.nome || 'Sem personagem'} {token?.travado ? '· bloqueado' : '· disponível'}
            </span>
            <p>
              As imagens e as skins são as mesmas da mesa 2D. Se o token estiver bloqueado, não será
              movimentado.
            </p>
          </section>
          <section className="exp-panel">
            <span className="exp-eyebrow">VISIBILIDADE E CLIMA</span>
            <label className="exp-option">
              <input
                type="checkbox"
                checked={mostrarSegredos}
                onChange={(e) => setMostrarSegredos(e.target.checked)}
              />{' '}
              Mostrar áreas e tokens ocultos (mestre)
            </label>
            <label className="exp-option">
              <input
                type="checkbox"
                checked={pausarClima}
                onChange={(e) => setPausarClima(e.target.checked)}
              />{' '}
              Pausar clima dinâmico
            </label>
            <p>
              {cena?.visibilidade === 'total'
                ? 'Cena com visão total.'
                : `Exploração com ${cena?.visibilidade === 'nevoa' ? 'névoa manual' : cena?.visibilidade === 'visao' ? 'visão por personagem' : 'névoa manual e visão por personagem'}.`}{' '}
              {cena?.iluminacao.ativa ? 'Iluminação ativa.' : 'Iluminação desativada.'}
            </p>
          </section>
          <section className="exp-panel exp-settings">
            <span className="exp-eyebrow">CÂMERA</span>
            <div className="exp-zoom">
              <span>Zoom</span>
              <div>
                <button type="button" onClick={zoomMenor} aria-label="Afastar câmera">
                  −
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={zoomMaior} aria-label="Aproximar câmera">
                  +
                </button>
              </div>
            </div>
            <button type="button" className="exp-secondary" onClick={atualizarDados}>
              ↻ Recarregar dados da mesa
            </button>
            <button
              type="button"
              className="exp-secondary"
              onClick={() => setAjuda((v) => !v)}
              aria-expanded={ajuda}
            >
              ⌨ {ajuda ? 'Ocultar' : 'Mostrar'} controles
            </button>
            {ajuda && (
              <p className="exp-help-text">
                WASD ou setas para mover o token selecionado · Shift para deslocamento rápido. Sem
                interações de videogame nem reinício da posição.
              </p>
            )}
            {aviso && (
              <p className="exp-notice" role="status">
                {aviso}
              </p>
            )}
          </section>
          <div className="exp-disclaimer">
            <span>◎ MODO 2.5D EXPERIMENTAL</span>
            <p>
              As posições são gravadas na mesma cena da Mesa 2D. Ainda é um modo local do mestre,
              sem multiplayer. A névoa protege a visualização, mas não é isolamento de dados.
            </p>
          </div>
        </aside>
      </section>
      <footer className="exp-footer">
        <div className="exp-controls">
          <span className="exp-control-title">MOVIMENTAÇÃO</span>
          <span className="exp-key-group">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          <span>Andar</span>
          <kbd>SHIFT</kbd>
          <span>Rápido</span>
        </div>
        <div className="exp-footer-right">
          <span>Campanha compartilhada com a Mesa 2D</span>
          <a href={urlMesaCampanha(idCampanha)}>← Retornar à mesa tradicional</a>
        </div>
      </footer>
      <div className="exp-touch" aria-label="Direcional virtual para dispositivos de toque">
        <button
          type="button"
          className="exp-touch-up"
          onPointerDown={() => touchDown('KeyW')}
          onPointerUp={() => touchUp('KeyW')}
          onPointerLeave={() => touchUp('KeyW')}
          onPointerCancel={() => touchUp('KeyW')}
        >
          ▲
        </button>
        <button
          type="button"
          className="exp-touch-left"
          onPointerDown={() => touchDown('KeyA')}
          onPointerUp={() => touchUp('KeyA')}
          onPointerLeave={() => touchUp('KeyA')}
          onPointerCancel={() => touchUp('KeyA')}
        >
          ◀
        </button>
        <button
          type="button"
          className="exp-touch-down"
          onPointerDown={() => touchDown('KeyS')}
          onPointerUp={() => touchUp('KeyS')}
          onPointerLeave={() => touchUp('KeyS')}
          onPointerCancel={() => touchUp('KeyS')}
        >
          ▼
        </button>
        <button
          type="button"
          className="exp-touch-right"
          onPointerDown={() => touchDown('KeyD')}
          onPointerUp={() => touchUp('KeyD')}
          onPointerLeave={() => touchUp('KeyD')}
          onPointerCancel={() => touchUp('KeyD')}
        >
          ▶
        </button>
      </div>
    </main>
  );
}
