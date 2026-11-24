import { useCallback, useEffect, useState } from 'react';
import { listarFichas, papelDaFicha, type FichaRegistro } from '../hexatombe/fichasLibrary';
import { listDiceCollections, type SavedDiceCollection } from '../hexatombe/diceCollections';
import { listSavedDice, type SavedDiceArt } from '../hexatombe/diceLibrary';
import BibliotecaDados from '../hexatombe/BibliotecaDados';
import GestaoCampanhas from './GestaoCampanhas';
import GestaoPersonagens from './GestaoPersonagens';
import { nomeDoSistema, rotuloSistemaCampanha, sistemaDaFicha } from '../hexatombe/sistemasRpg';
import PreparacaoSessao from './PreparacaoSessao';
import PerfilBackup from './PerfilBackup';
import GestaoItens from './GestaoItens';
import BibliotecaTokens from '../lib/PainelBibliotecaTokens';
import BibliotecaModelos3D from './BibliotecaModelos3D';
import './GestaoPersonagens.css';
import { listarCampanhas, urlMesaCampanha, type CampanhaMeta } from '../hexatombe/campaignLibrary';

type Secao =
  | 'inicio'
  | 'mesas'
  | 'personagens'
  | 'dados'
  | 'caderno'
  | 'perfil'
  | 'itens'
  | 'tokens'
  | 'miniaturas';
const secao: Secao = location.pathname.startsWith('/perfil')
  ? 'perfil'
  : location.pathname.startsWith('/caderno')
    ? 'caderno'
    : location.pathname.startsWith('/miniaturas')
      ? 'miniaturas'
      : location.pathname.startsWith('/tokens')
        ? 'tokens'
        : location.pathname.startsWith('/itens')
          ? 'itens'
          : location.pathname.startsWith('/personagens')
            ? 'personagens'
            : location.pathname.startsWith('/dados')
              ? 'dados'
              : location.pathname.startsWith('/mesas')
                ? 'mesas'
                : 'inicio';
const menu: { nome: string; url: string; secao: Secao; simbolo: string }[] = [
  { nome: 'Painel', url: '/', secao: 'inicio', simbolo: '⌂' },
  { nome: 'Campanhas', url: '/mesas/', secao: 'mesas', simbolo: '▦' },
  { nome: 'Caderno do Mestre', url: '/caderno/', secao: 'caderno', simbolo: '✎' },
  { nome: 'Personagens', url: '/personagens/', secao: 'personagens', simbolo: '♙' },
  { nome: 'Itens', url: '/itens/', secao: 'itens', simbolo: '⚔' },
  { nome: 'Tokens', url: '/tokens/', secao: 'tokens', simbolo: '◈' },
  { nome: 'Miniaturas 3D', url: '/miniaturas/', secao: 'miniaturas', simbolo: '♟' },
  { nome: 'Dados e Ateliê', url: '/dados/', secao: 'dados', simbolo: '⚄' },
  { nome: 'Meu Perfil', url: '/perfil/', secao: 'perfil', simbolo: '♙' },
];
function NumberBadge({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="hp-number-badge">
      <strong>{value === null ? '—' : value}</strong>
      <span>{label}</span>
    </div>
  );
}
function PortalCard({
  href,
  mark,
  title,
  summary,
  foot,
  kind,
}: {
  href: string;
  mark: string;
  title: string;
  summary: string;
  foot: string;
  kind: string;
}) {
  return (
    <a className={`hp-section-card hp-card-${kind}`} href={href}>
      <span className="hp-card-mark" aria-hidden="true">
        {mark}
      </span>
      <strong>{title}</strong>
      <p>{summary}</p>
      <span className="hp-card-foot">
        {foot}
        <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}
const ultimaAtividade = (m: CampanhaMeta) => m.acessadaEm || m.atualizadaEm;
export default function Portal() {
  const [campanhas, setCampanhas] = useState<CampanhaMeta[]>(() => {
    try {
      return listarCampanhas();
    } catch {
      return [];
    }
  });
  const [fichas, setFichas] = useState<FichaRegistro[]>([]);
  const [colecoes, setColecoes] = useState<SavedDiceCollection[]>([]);
  const [dados, setDados] = useState<SavedDiceArt[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const refreshCampanhas = useCallback(() => {
    try {
      setCampanhas(listarCampanhas());
    } catch {
      setMensagem('Falha ao abrir a biblioteca de campanhas.');
    }
  }, []);
  const carregar = useCallback(async () => {
    const resultados = await Promise.allSettled([
      listarFichas(),
      listDiceCollections(),
      listSavedDice(),
    ]);
    if (resultados[0].status === 'fulfilled') setFichas(resultados[0].value);
    if (resultados[1].status === 'fulfilled') setColecoes(resultados[1].value);
    if (resultados[2].status === 'fulfilled') setDados(resultados[2].value);
    if (resultados.some((r) => r.status === 'rejected'))
      setMensagem(
        'Não foi possível abrir alguma biblioteca. Confira o armazenamento do navegador.',
      );
    refreshCampanhas();
    setCarregando(false);
  }, [refreshCampanhas]);
  useEffect(() => {
    void carregar();
    const refresh = () => {
      void carregar();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('hexatombe-dice-library-changed', refresh);
    window.addEventListener('hexatombe-campaigns-changed', refreshCampanhas);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('hexatombe-dice-library-changed', refresh);
      window.removeEventListener('hexatombe-campaigns-changed', refreshCampanhas);
    };
  }, [carregar, refreshCampanhas]);
  const campanhasAtivas = [...campanhas]
    .filter((m) => !m.arquivada)
    .sort((a, b) => ultimaAtividade(b).localeCompare(ultimaAtividade(a)));
  const ultimaMesa = campanhasAtivas[0];
  const destinoMesa = ultimaMesa ? urlMesaCampanha(ultimaMesa.id) : '/mesas/';
  return (
    <div className="hx-portal gm-portal">
      <header className="hp-header">
        <a href="/" className="hp-brand" aria-label="Portal do Mestre — início">
          <span className="gm-brand-icon" aria-hidden="true">
            ✥
          </span>
          <span>
            <strong>PORTAL DO MESTRE</strong>
            <small>CAMPANHAS · FERRAMENTAS DE RPG</small>
          </span>
        </a>
        <nav aria-label="Navegação principal" className="hp-navigation">
          {menu.map((m) => (
            <a key={m.url} href={m.url} aria-current={secao === m.secao ? 'page' : undefined}>
              <span className="hp-nav-icon">{m.simbolo}</span>
              {m.nome}
            </a>
          ))}
        </nav>
        <a className="hp-header-action" href={destinoMesa}>
          {ultimaMesa ? 'Continuar campanha' : 'Nova campanha'} <span>→</span>
        </a>
      </header>

      <main className="hp-main" id="conteudo">
        {mensagem && (
          <div className="hp-feedback" role="status">
            {mensagem}
            <button onClick={() => setMensagem('')} aria-label="Dispensar aviso">
              ×
            </button>
          </div>
        )}
        {secao === 'inicio' && (
          <>
            <section className="gm-dashboard-hero" aria-labelledby="hp-hero-title">
              <div className="gm-dashboard-head">
                <span className="hp-kicker">✦ CENTRAL DE MESTRAGEM · SUAS HISTÓRIAS</span>
                <h1 id="hp-hero-title">
                  O próximo capítulo começa <em>com você.</em>
                </h1>
                <p>
                  Prepare sessões, organize personagens e conduza aventuras em qualquer cenário.
                  Cada mundo tem suas regras; este espaço é seu.
                </p>
                <div className="hp-hero-actions">
                  <a className="hp-button hp-button-primary" href="/mesas/">
                    ▦ Gerenciar campanhas <span>→</span>
                  </a>
                  <a className="hp-button hp-button-outline" href="/caderno/">
                    ✎ Preparar sessão
                  </a>
                </div>
                <div className="gm-hero-tags">
                  <span>◈ Mapas e tokens</span>
                  <span>⚄ Dados 3D</span>
                  <span>♙ Fichas</span>
                  <span>✎ Preparação</span>
                </div>
              </div>
              <div className="gm-featured-card">
                <div className="gm-featured-overline">
                  {ultimaMesa ? 'ÚLTIMA CAMPANHA ACESSADA' : 'PRIMEIRA AVENTURA'}
                </div>
                <div
                  className="gm-featured-cover"
                  style={
                    ultimaMesa?.capa
                      ? {
                          backgroundImage: `linear-gradient(180deg,#121b2260,#10161df5),url(${ultimaMesa.capa})`,
                        }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  <span>✥</span>
                </div>
                <div className="gm-featured-content">
                  <span className="gm-system-chip">
                    {ultimaMesa ? rotuloSistemaCampanha(ultimaMesa) : 'Sistema não definido'}
                  </span>
                  <h2>{ultimaMesa?.titulo || 'Sua próxima campanha'}</h2>
                  <p>
                    {ultimaMesa?.descricao ||
                      'Crie uma aventura, prepare suas sessões e explore as ferramentas do mestre.'}
                  </p>
                  <a className="gm-featured-link" href={destinoMesa}>
                    {ultimaMesa ? 'Entrar na mesa' : 'Criar campanha'} <span>→</span>
                  </a>
                </div>
              </div>
            </section>
            <section className="hp-overview" aria-label="Resumo das bibliotecas">
              <div>
                <span className="hp-eyebrow">VISÃO GERAL</span>
                <h2>Seu espaço de mestragem</h2>
                <p className="gm-subtitle">
                  Uma central para suas campanhas, independentemente do sistema de RPG.
                </p>
              </div>
              <div className="hp-summary">
                <NumberBadge value={campanhasAtivas.length} label="Campanhas ativas" />
                <NumberBadge value={carregando ? null : fichas.length} label="Fichas" />
                <NumberBadge
                  value={carregando ? null : colecoes.length}
                  label="Conjuntos de dados"
                />
              </div>
            </section>
            <section className="gm-main-sections" aria-label="Ferramentas principais">
              <div className="gm-section-title">
                <span className="hp-eyebrow">SUAS FERRAMENTAS</span>
                <h2>O que vamos preparar hoje?</h2>
              </div>
              <div className="hp-cards">
                <PortalCard
                  href="/itens/"
                  mark="⚔"
                  title="Arsenal e itens"
                  summary="Armas, suprimentos, poções, equipamentos e catálogo do mestre."
                  foot="Abrir biblioteca"
                  kind="itens"
                />
                <PortalCard
                  href="/mesas/"
                  mark="▦"
                  title="Campanhas e mesas"
                  summary="Gerencie aventuras, cenários, mapas, tokens e sessões independentes."
                  foot="Abrir campanhas"
                  kind="mesa"
                />
                <PortalCard
                  href="/personagens/"
                  mark="♙"
                  title="Biblioteca de personagens"
                  summary="Personagens, NPCs, inimigos e chefes em uma única biblioteca por sistema."
                  foot="Abrir biblioteca"
                  kind="fichas"
                />
                <PortalCard
                  href="/tokens/"
                  mark="◈"
                  title="Biblioteca de tokens"
                  summary="Imagens e GIFs idle reutilizáveis, com token padrão nas fichas."
                  foot="Abrir tokens"
                  kind="fichas"
                />
                <PortalCard
                  href="/miniaturas/"
                  mark="♟"
                  title="Biblioteca de Miniaturas 3D"
                  summary="Modelos GLB compartilhados entre campanhas, prévia, organização e exclusão segura."
                  foot="Gerenciar modelos"
                  kind="fichas"
                />
                <PortalCard
                  href="/dados/"
                  mark="⚄"
                  title="Dados e laboratório"
                  summary="Crie conjuntos, personalize as faces e teste a física em um espaço separado."
                  foot="Abrir ateliê"
                  kind="dados"
                />
              </div>
            </section>
            <div className="gm-bottom-grid">
              <section className="gm-recent-campaigns" aria-label="Campanhas recentes">
                <div className="gm-panel-heading">
                  <div>
                    <span className="hp-eyebrow">EM ANDAMENTO</span>
                    <h2>Campanhas recentes</h2>
                  </div>
                  <a href="/mesas/">Ver todas →</a>
                </div>
                {campanhasAtivas.length ? (
                  campanhasAtivas.slice(0, 3).map((m) => (
                    <article className="gm-campaign-line" key={m.id}>
                      <div
                        className="gm-campaign-thumb"
                        style={m.capa ? { backgroundImage: `url(${m.capa})` } : undefined}
                      >
                        ✥
                      </div>
                      <div>
                        <strong>{m.titulo}</strong>
                        <small>
                          {rotuloSistemaCampanha(m)} · {m.fichaIds.length} personagens vinculados
                        </small>
                      </div>
                      <a href={urlMesaCampanha(m.id)} aria-label={`Entrar na mesa ${m.titulo}`}>
                        →
                      </a>
                    </article>
                  ))
                ) : (
                  <div className="gm-empty-recent">
                    <p>Nenhuma campanha ainda. Comece criando a sua primeira aventura.</p>
                    <a href="/mesas/">Criar campanha →</a>
                  </div>
                )}
                <div className="gm-recent-characters">
                  <h3>Personagens recentes</h3>
                  {fichas.length ? (
                    fichas.slice(0, 3).map((f) => (
                      <a
                        className="hp-recent-item"
                        href={
                          sistemaDaFicha(f.dados) === 'impeto' &&
                          papelDaFicha(f.dados) === 'jogador' &&
                          (!f.dados.impeto || f.dados.impeto.escala==='universal-v1')
                            ? `/criador/?ficha=${encodeURIComponent(f.id)}`
                            : '/personagens/'
                        }
                        key={f.id}
                      >
                        <span className="hp-mini-avatar">
                          {f.dados.photo ? <img src={f.dados.photo} alt="" /> : '♙'}
                        </span>
                        <span>
                          <strong>{f.nome}</strong>
                          <small>{nomeDoSistema(sistemaDaFicha(f.dados))} · Ver ficha</small>
                        </span>
                        <b>→</b>
                      </a>
                    ))
                  ) : (
                    <p className="hp-empty">
                      Ainda não existem personagens.{' '}
                      <a href="/criador/?nova=1">Criar ficha Ímpeto</a>
                    </p>
                  )}
                </div>
              </section>
              <PreparacaoSessao campanhas={campanhas} />
            </div>
            <div className="gm-backup-shortcut">
              <div>
                <strong>✥ Proteja suas campanhas</strong>
                <p>Salve tudo em um backup portátil do seu perfil de mestre, quando quiser.</p>
              </div>
              <a href="/perfil/" className="hp-button hp-button-outline">
                Meu Perfil e Backups →
              </a>
            </div>
            <p className="gm-platform-note">
              ✦ Seus personagens ficam em uma única biblioteca. Cada campanha escolhe um sistema;
              somente personagens compatíveis podem ser vinculados. O gerador disponível nesta
              versão é o de Ímpeto RPG.
            </p>
          </>
        )}

        {secao === 'perfil' && <PerfilBackup />}

        {secao === 'caderno' && (
          <>
            <section className="hp-page-intro gm-notebook-page-intro">
              <span className="hp-eyebrow">PLANEJAMENTO DE CAMPANHAS</span>
              <h1>
                Caderno do <em>Mestre.</em>
              </h1>
              <p>
                Prepare sessões, organize cenas, registre NPCs e acompanhe os detalhes de cada
                aventura. Cada campanha possui seu próprio caderno.
              </p>
            </section>
            <PreparacaoSessao campanhas={campanhas} pagina />
          </>
        )}

        {secao === 'mesas' && (
          <>
            <section className="hp-page-intro">
              <span className="hp-eyebrow">BIBLIOTECA DO MESTRE</span>
              <h1>
                Suas <em>campanhas.</em>
              </h1>
              <p>
                Crie aventuras de qualquer sistema de RPG. Cada campanha mantém suas próprias cenas,
                tokens, mapas, trilha sonora e histórico.
              </p>
            </section>
            <GestaoCampanhas fichas={fichas} colecoes={colecoes} onChange={refreshCampanhas} />
          </>
        )}

        {secao === 'personagens' && (
          <>
            <section className="hp-page-intro">
              <span className="hp-eyebrow">BIBLIOTECA UNIVERSAL</span>
              <h1>
                Seus <em>personagens.</em>
              </h1>
              <p>
                Guarde todos os personagens no mesmo lugar e vincule cada um apenas às campanhas do
                seu sistema. O gerador disponível atualmente é o de Ímpeto RPG.
              </p>
            </section>
            <GestaoPersonagens fichas={fichas} campanhas={campanhas} onChange={carregar} />
          </>
        )}

        {secao === 'miniaturas' && (
          <>
            <section className="hp-page-intro">
              <span className="hp-eyebrow">BIBLIOTECA UNIVERSAL DO MESTRE</span>
              <h1>
                Miniaturas <em>3D.</em>
              </h1>
              <p>
                Gerencie GLBs reutilizáveis em qualquer campanha. Importe, visualize ou exclua
                modelos sem precisar entrar numa mesa.
              </p>
            </section>
            <BibliotecaModelos3D />
          </>
        )}
        {secao === 'tokens' && (
          <>
            <section className="hp-page-intro">
              <span className="hp-eyebrow">RECURSOS VISUAIS DO MESTRE</span>
              <h1>
                Biblioteca de <em>tokens.</em>
              </h1>
              <p>
                Guarde PNGs, JPGs, WebPs e GIFs idle para aplicar às fichas de jogadores, NPCs,
                inimigos e chefes.
              </p>
            </section>
            <BibliotecaTokens />
          </>
        )}
        {secao === 'itens' && <GestaoItens />}
        {secao === 'dados' && (
          <>
            <section className="hp-page-intro">
              <span className="hp-eyebrow">OFICINA DE DADOS</span>
              <h1>
                Dados e <em>Ateliê.</em>
              </h1>
              <p>
                Personalize conjuntos de dados para qualquer aventura, preserve seus modelos
                favoritos e experimente as rolagens no laboratório.
              </p>
            </section>
            <div className="hp-dice-toolbar">
              <div>
                <strong>{colecoes.length}</strong> conjuntos ·{' '}
                <strong>{dados.filter((d) => !d.collectionId).length}</strong> dados individuais
              </div>
              <a className="hp-button hp-button-primary" href="/atelie-de-dados.html">
                ✧ Criar no Ateliê <span>→</span>
              </a>
            </div>
            <div className="hp-portal-dice-wrap">
              <BibliotecaDados aberto={true} />
            </div>
          </>
        )}
      </main>
      <footer className="hp-footer">
        <span>✥ PORTAL DO MESTRE · FERRAMENTAS DE RPG</span>
        <span>Interface v1.3.13 · Dados locais neste navegador</span>
        <a href="/">Voltar ao painel ↑</a>
      </footer>
    </div>
  );
}
