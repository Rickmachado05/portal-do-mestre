import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { carregarConfigDados, salvarConfigDados, type ConfigDados } from './DadosPersonalizacao';
import BibliotecaDados from './hexatombe/BibliotecaDados';
import './EditorDados.css';

type Aba = 'luz' | 'movimento';
type CampoNumerico = {
  key: keyof Pick<
    ConfigDados,
    | 'escala'
    | 'iluminacao'
    | 'sombraTransparencia'
    | 'gravidade'
    | 'atrito'
    | 'quique'
    | 'giro'
    | 'forca'
    | 'altura'
    | 'amortecimentoAngular'
  >;
  label: string;
  min: number;
  max: number;
  step: number;
  info: string;
};
const LUZ: CampoNumerico[] = [
  { key: 'escala', label: 'Tamanho do dado', min: 2, max: 9, step: 0.25, info: 'Tamanho na mesa' },
  {
    key: 'iluminacao',
    label: 'Iluminação',
    min: 0.35,
    max: 2,
    step: 0.05,
    info: 'Brilho da superfície',
  },
  {
    key: 'sombraTransparencia',
    label: 'Transparência das sombras',
    min: 0.15,
    max: 1,
    step: 0.05,
    info: 'Suavidade da sombra',
  },
];
const MOVIMENTO: CampoNumerico[] = [
  {
    key: 'forca',
    label: 'Força do lançamento',
    min: 2,
    max: 10,
    step: 0.5,
    info: 'Velocidade inicial',
  },
  { key: 'giro', label: 'Força do giro', min: 1, max: 8, step: 0.5, info: 'Rotação' },
  { key: 'altura', label: 'Altura inicial', min: 5, max: 11, step: 0.5, info: 'Altura de queda' },
  { key: 'gravidade', label: 'Gravidade', min: 0.6, max: 1.7, step: 0.05, info: 'Aceleração' },
  { key: 'atrito', label: 'Atrito', min: 0.2, max: 1.3, step: 0.05, info: 'Deslizamento' },
  {
    key: 'quique',
    label: 'Elasticidade / quique',
    min: 0,
    max: 0.6,
    step: 0.05,
    info: 'Intensidade das batidas',
  },
  {
    key: 'amortecimentoAngular',
    label: 'Freio do giro',
    min: 0.15,
    max: 0.8,
    step: 0.05,
    info: 'Diminuição gradual da rotação',
  },
];
export default function EditorDados({
  origem = 'mesa',
  codigoSala,
}: { origem?: 'mesa' | 'mesa3d' | 'convidado'; codigoSala?: string } = {}) {
  const [painel, setPainel] = useState<'biblioteca' | 'fisica' | null>(null);
  // Mantém a campanha de origem para voltar ao mesmo espaço depois de editar os dados.
  const atelieUrlMesa = (() => {
    const campanha = new URLSearchParams(window.location.search).get('campanha');
    return origem === 'convidado'
      ? `/atelie-de-dados.html?origem=convidado&sala=${encodeURIComponent(codigoSala || '')}`
      : origem === 'mesa3d'
        ? `/atelie-de-dados.html?origem=mesa3d${campanha ? `&campanha=${encodeURIComponent(campanha)}` : ''}`
        : `/atelie-de-dados.html?origem=mesa${campanha ? `&campanha=${encodeURIComponent(campanha)}` : ''}`;
  })();
  const [aba, setAba] = useState<Aba>('movimento');
  const [expandido, setExpandido] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const [config, setConfig] = useState<ConfigDados>(() => carregarConfigDados());
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPainel(null);
    };
    const fecharPeloMenu = () => setPainel(null);
    window.addEventListener('keydown', fechar);
    window.addEventListener('hexatombe-mesa-fechar-paineis', fecharPeloMenu);
    return () => {
      window.removeEventListener('keydown', fechar);
      window.removeEventListener('hexatombe-mesa-fechar-paineis', fecharPeloMenu);
    };
  }, []);
  function atualizar(changes: Partial<ConfigDados>) {
    setConfig(salvarConfigDados({ ...config, ...changes }));
    setAviso('Ajustes salvos · aplicados à próxima rolagem.');
  }
  function campo(c: CampoNumerico) {
    return (
      <label className="hd-campo-range" key={c.key} title={c.info}>
        <span>
          <strong>{c.label}</strong>
          <output>{Number(config[c.key].toFixed(2))}</output>
        </span>
        <input
          type="range"
          min={c.min}
          max={c.max}
          step={c.step}
          value={config[c.key]}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            atualizar({ [c.key]: Number(e.target.value) } as Partial<ConfigDados>)
          }
        />
      </label>
    );
  }
  return (
    <div className="hd-editor-externo hd-dados-central">
      <div className="hd-dados-acoes">
        <button
          type="button"
          className="hd-editor-abrir"
          aria-expanded={painel === 'biblioteca'}
          aria-label="Abrir biblioteca dos dados"
          onClick={() => {
            setRecolhido(false);
            setPainel((p) => (p === 'biblioteca' ? null : 'biblioteca'));
          }}
        >
          <span aria-hidden="true">⚄</span>
          <span>Meus dados</span>
        </button>
        <button
          type="button"
          className="hd-editor-abrir"
          aria-expanded={painel === 'fisica'}
          aria-label="Configurar física dos dados"
          onClick={() => setPainel((p) => (p === 'fisica' ? null : 'fisica'))}
        >
          <span aria-hidden="true">⚙</span>
          <span>Física</span>
        </button>
      </div>
      <section
        hidden={painel !== 'biblioteca'}
        role="dialog"
        aria-modal="false"
        aria-labelledby="hd-library-title"
        className={`hd-editor-painel hd-biblioteca-painel ${expandido ? 'hd-biblioteca-expandida' : ''} ${recolhido ? 'hd-biblioteca-recolhida' : ''}`}
      >
        <header className="hd-biblioteca-barra">
          <div className="hd-biblioteca-titulo">
            <span aria-hidden="true">◈</span>
            <div>
              <small>PORTAL DO MESTRE · ATELIÊ</small>
              <strong id="hd-library-title">Biblioteca de dados</strong>
            </div>
          </div>
          <div className="hd-biblioteca-controles">
            <button
              type="button"
              aria-label={recolhido ? 'Restaurar biblioteca' : 'Recolher biblioteca'}
              title={recolhido ? 'Restaurar janela' : 'Recolher janela'}
              onClick={() => setRecolhido((v) => !v)}
            >
              {recolhido ? '▢' : '—'}
            </button>
            <button
              type="button"
              aria-label={expandido ? 'Restaurar tamanho da biblioteca' : 'Expandir biblioteca'}
              title={expandido ? 'Restaurar tamanho' : 'Expandir janela'}
              onClick={() => {
                setRecolhido(false);
                setExpandido((v) => !v);
              }}
            >
              {expandido ? '❐' : '□'}
            </button>
            <button
              type="button"
              aria-label="Fechar biblioteca"
              title="Fechar"
              onClick={() => setPainel(null)}
            >
              ×
            </button>
          </div>
        </header>
        <div className="hd-biblioteca-scroll" hidden={recolhido}>
          <BibliotecaDados
            aberto={painel === 'biblioteca' && !recolhido}
            atelieUrl={atelieUrlMesa}
          />
        </div>
      </section>
      {painel === 'fisica' && (
        <section className="hd-editor-painel" aria-label="Configurações de física dos dados">
          <header className="hd-editor-topo">
            <div>
              <small>PORTAL DO MESTRE · SIMULAÇÃO</small>
              <h2>Física e iluminação</h2>
              <p>Ajustes preservados da mesa original</p>
            </div>
            <button type="button" aria-label="Fechar física" onClick={() => setPainel(null)}>
              ×
            </button>
          </header>
          <div className="hd-editor-abas" role="tablist" aria-label="Configurações">
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'movimento'}
              className={aba === 'movimento' ? 'ativo' : ''}
              onClick={() => setAba('movimento')}
            >
              Movimento
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'luz'}
              className={aba === 'luz' ? 'ativo' : ''}
              onClick={() => setAba('luz')}
            >
              Luz e tamanho
            </button>
          </div>
          <div className="hd-editor-conteudo">
            <p className="hd-editor-explicacao">
              Esses controles modificam somente a simulação física e o visual dos dados, nunca o
              resultado matemático.
            </p>
            {(aba === 'movimento' ? MOVIMENTO : LUZ).map(campo)}
            {aba === 'luz' && (
              <label className="hd-editor-check">
                <input
                  type="checkbox"
                  checked={config.sombras}
                  onChange={(e) => atualizar({ sombras: e.target.checked })}
                />{' '}
                Projetar sombras
              </label>
            )}
            {aba === 'movimento' && (
              <button
                type="button"
                className="hd-editor-acao"
                onClick={() =>
                  atualizar({
                    forca: 6,
                    giro: 4,
                    altura: 8,
                    gravidade: 1,
                    atrito: 0.8,
                    quique: 0,
                    amortecimentoAngular: 0.4,
                  })
                }
              >
                Restaurar movimento original
              </button>
            )}
          </div>
          <footer className="hd-editor-rodape" role="status">
            {aviso || 'As alterações serão aplicadas na próxima rolagem.'}
          </footer>
        </section>
      )}
    </div>
  );
}
