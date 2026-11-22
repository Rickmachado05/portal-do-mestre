import { useState, useEffect, useRef } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { FichaDados } from './fichasLibrary';
import type { ItemInventario } from './itensLibrary';
import type { EfeitoCombate } from './efeitosCombate';
import { ROTULOS_EFEITO, tipoEfeitoCombate } from './efeitosCombate';
import IconeDaAcao from './IconeDaAcao';
import ImagemItem from './ImagemItem';
import VisualizadorItem from './VisualizadorItem';
import { listarAcoesDaFicha, type AcaoDaFicha } from './acoesFichaDados';
import { permiteRolarEfeito, precisaTesteContraCA } from './logicaAcoesDaFicha';
import { formulaRolavelDaFicha } from './rolagensDaFicha';
import { SECOES_MENU_COMBATE, type SecaoMenuCombate } from './menuCombateTurno';
import { identidadeCombate } from './identidadeCombate';
import { acoesDaSecaoMenu, grupoStatusDaAcao } from './classificacaoMenuImpeto';
import { calcularLayoutLateralMenuCombate, type PontoMenuCombate } from './posicaoMenuCombate';
import {
  lerPosicaoEditorHud,
  limitarPosicaoEditorHud,
  posicaoInicialEditorHud,
  restaurarPosicaoEditorHud,
  salvarPosicaoEditorHud,
  type PosicaoEditorArrastavel,
} from './posicaoEditorArrastavel';
import {
  PADRAO_HUD_COMBATE,
  TEMAS_HUD_COMBATE,
  escolherTemaHud,
  lerPersonalizacaoHud,
  salvarPersonalizacaoHud,
  textoContrasteHud,
  type PersonalizacaoHudCombate,
} from './personalizacaoHudCombate';
import './MenuCombateImersivo.css';

type Props = {
  ficha?: FichaDados;
  personagemId: string;
  ancora?: PontoMenuCombate;
  personagem: {
    nome: string;
    hp: number;
    hpMax: number;
    mana: number;
    manaMax: number;
    ca: number;
    escudo?: number;
    bonusCaTemporario?: number;
    penalidadeCaTemporaria?: number;
    elemento: string;
    itens?: ItemInventario[];
    condicoes?: EfeitoCombate[];
  };
  rodada: number;
  /** A mesma HUD recebe a lista privada do jogador sem recriar a ficha integral do mestre. */
  acoesPublicadas?: AcaoDaFicha[];
  identidadePublicada?: string;
  impetoPublicado?: boolean;
  onRolarAcaoPublicada?: (acaoId: string, modalidade: 'teste' | 'valor') => void;
  rolando?: boolean;
  onRolar: (formula: string, nomeAcao: string, iconeAcao?: string) => void;
  onUsarItem: (item: ItemInventario) => void;
  onAbrirInventario: () => void;
  onAbrirFicha: () => void;
};

/** Menu compacto do TURNO na câmera de Personagem: consulta e rolagens sem automatizar o combate. */
export default function MenuCombateImersivo({
  ficha,
  ancora,
  personagemId,
  personagem,
  rodada,
  acoesPublicadas,
  identidadePublicada,
  impetoPublicado = false,
  onRolarAcaoPublicada,
  rolando = false,
  onRolar,
  onUsarItem,
  onAbrirInventario,
  onAbrirFicha,
}: Props) {
  const identidadeFicha = identidadePublicada ?? identidadeCombate(personagem.elemento, ficha);
  const [secao, setSecao] = useState<SecaoMenuCombate>('habilidades');
  const [selecionadoId, setSelecionadoId] = useState<string>('');
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const [itemEmVisualizacao, setItemEmVisualizacao] = useState<ItemInventario | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [posicaoEscolhidaEditor, setPosicaoEscolhidaEditor] =
    useState<PosicaoEditorArrastavel | null>(() => lerPosicaoEditorHud(personagemId));
  const [posicaoDuranteArrasto, setPosicaoDuranteArrasto] =
    useState<PosicaoEditorArrastavel | null>(null);
  const editorElementoRef = useRef<HTMLElement | null>(null);
  const arrastoEditorRef = useRef<{
    pointerId: number;
    xInicial: number;
    yInicial: number;
    posicaoInicial: PosicaoEditorArrastavel;
    larguraEditor: number;
    alturaEditor: number;
  } | null>(null);
  const [personalizacao, setPersonalizacao] = useState<PersonalizacaoHudCombate>(() =>
    lerPersonalizacaoHud(personagemId),
  );
  useEffect(() => {
    salvarPersonalizacaoHud(personagemId, personalizacao);
  }, [personagemId, personalizacao]);
  const [viewport, setViewport] = useState(() => ({
    largura: window.innerWidth,
    altura: window.innerHeight,
  }));
  useEffect(() => {
    const atualizar = () => setViewport({ largura: window.innerWidth, altura: window.innerHeight });
    window.addEventListener('resize', atualizar);
    return () => window.removeEventListener('resize', atualizar);
  }, []);
  const layout = calcularLayoutLateralMenuCombate(
    ancora,
    viewport.largura,
    viewport.altura,
    personalizacao,
  );
  // Depois do primeiro arrasto, a posição é manual — não acompanha mais a câmera.
  const posicaoEditor = limitarPosicaoEditorHud(
    posicaoDuranteArrasto ??
      posicaoEscolhidaEditor ??
      posicaoInicialEditorHud(viewport.largura, viewport.altura),
    viewport.largura,
    viewport.altura,
  );
  const posicaoEditorAtualRef = useRef(posicaoEditor);
  posicaoEditorAtualRef.current = posicaoEditor;
  function iniciarArrastoEditor(evento: ReactPointerEvent<HTMLDivElement>) {
    if (evento.button !== 0) return;
    const elemento = editorElementoRef.current;
    const caixa = elemento?.getBoundingClientRect();
    arrastoEditorRef.current = {
      pointerId: evento.pointerId,
      xInicial: evento.clientX,
      yInicial: evento.clientY,
      posicaoInicial: posicaoEditorAtualRef.current,
      larguraEditor: caixa?.width ?? 290,
      alturaEditor: caixa?.height ?? 430,
    };
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }
  function moverEditor(evento: ReactPointerEvent<HTMLDivElement>) {
    const arrasto = arrastoEditorRef.current;
    if (!arrasto || arrasto.pointerId !== evento.pointerId) return;
    const nova = limitarPosicaoEditorHud(
      {
        left: arrasto.posicaoInicial.left + evento.clientX - arrasto.xInicial,
        top: arrasto.posicaoInicial.top + evento.clientY - arrasto.yInicial,
      },
      viewport.largura,
      viewport.altura,
      arrasto.larguraEditor,
      arrasto.alturaEditor,
    );
    posicaoEditorAtualRef.current = nova;
    setPosicaoDuranteArrasto(nova);
  }
  function encerrarArrastoEditor(evento: ReactPointerEvent<HTMLDivElement>) {
    const arrasto = arrastoEditorRef.current;
    if (!arrasto || arrasto.pointerId !== evento.pointerId) return;
    arrastoEditorRef.current = null;
    const nova = posicaoEditorAtualRef.current;
    setPosicaoEscolhidaEditor(nova);
    setPosicaoDuranteArrasto(null);
    salvarPosicaoEditorHud(personagemId, nova);
    if (evento.currentTarget.hasPointerCapture(evento.pointerId))
      evento.currentTarget.releasePointerCapture(evento.pointerId);
  }
  function restaurarPosicaoEditor() {
    arrastoEditorRef.current = null;
    setPosicaoDuranteArrasto(null);
    setPosicaoEscolhidaEditor(null);
    restaurarPosicaoEditorHud(personagemId);
  }
  function moverEditorTeclado(evento: ReactKeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Home') {
      evento.preventDefault();
      restaurarPosicaoEditor();
      return;
    }
    const direcoes: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const sentido = direcoes[evento.key];
    if (!sentido) return;
    evento.preventDefault();
    const passo = evento.shiftKey ? 25 : 10;
    const atual = posicaoEditorAtualRef.current;
    const nova = limitarPosicaoEditorHud(
      { left: atual.left + sentido[0] * passo, top: atual.top + sentido[1] * passo },
      viewport.largura,
      viewport.altura,
    );
    setPosicaoEscolhidaEditor(nova);
    salvarPosicaoEditorHud(personagemId, nova);
  }
  const temaCss = {
    '--hx-hud-acento': personalizacao.cor,
    '--hx-hud-brilho': String(personalizacao.intensidade / 100),
    '--hx-hud-texto-ativo': textoContrasteHud(personalizacao.cor),
  } as CSSProperties;
  const transformacao: CSSProperties = {
    transform: `scale(${layout.escala})`,
    transformOrigin: 'top left',
  };
  const alterarPersonalizacao = (altera: Partial<PersonalizacaoHudCombate>) =>
    setPersonalizacao((atual) => ({ ...atual, ...altera }));
  const estiloPosicao: CSSProperties = {
    left: layout.principal.left,
    top: layout.principal.top,
    width: layout.larguraPrincipal,
    ...transformacao,
    ...temaCss,
  };
  const estiloLista: CSSProperties = {
    left: layout.lista.left,
    top: layout.lista.top,
    width: layout.lista.width,
    maxHeight: layout.lista.maxHeight,
    ...transformacao,
    ...temaCss,
  };
  const estiloDetalhe: CSSProperties = {
    left: layout.detalhe.left,
    top: layout.detalhe.top,
    width: layout.detalhe.width,
    maxHeight: layout.detalhe.maxHeight,
    ...transformacao,
    ...temaCss,
  };
  const lado = `hx-combate-lado-${layout.principal.lado}`;
  const direcao = `hx-combate-expansao-${layout.direcao}`;
  const hpPct =
    personagem.hpMax > 0 ? Math.max(0, Math.min(100, (personagem.hp / personagem.hpMax) * 100)) : 0;
  // Mana do Ímpeto não tem teto: a barra representa o valor-base, mas o número é real.
  const manaPct =
    personagem.manaMax > 0
      ? Math.max(0, Math.min(100, (personagem.mana / personagem.manaMax) * 100))
      : 0;

  const fichaManualImpeto = Boolean(
    ficha?.papel && ficha.papel !== 'jogador' && (!ficha.sistemaId || ficha.sistemaId === 'impeto'),
  );
  const acoes = acoesPublicadas ?? listarAcoesDaFicha(ficha);
  const acoesDaSecao = acoesDaSecaoMenu(acoes, secao);
  const grupoStatus = (indice: number) =>
    secao === 'status' ? grupoStatusDaAcao(acoesDaSecao[indice]) : null;
  const itens = (personagem.itens || []).filter((item) => item.quantidade > 0);
  const efeitos = personagem.condicoes || [];
  const acao = acoesDaSecao.find((item) => item.id === selecionadoId) || acoesDaSecao[0];
  const item = itens.find((atual) => atual.id === selecionadoId) || itens[0];
  const formula =
    acao && permiteRolarEfeito(acao.categoria) ? formulaRolavelDaFicha(acao.valor) : null;
  const testeCA = acao ? (acao.exigeCA ?? precisaTesteContraCA(acao.categoria)) : false;
  const restricoes = acao?.restricoes?.trim() || '';
  const descricaoAcao = [acao?.descricao?.trim(), restricoes ? `Limitações: ${restricoes}` : '']
    .filter(Boolean)
    .join('\n');
  const itensEmDestaque = secao === 'itens';
  const status = secao === 'status';
  const tituloSecao = SECOES_MENU_COMBATE.find((s) => s.id === secao)?.nome || 'Ações';
  const quantidadeEntradas =
    secao === 'itens' ? itens.length : acoesDaSecao.length + (status ? efeitos.length : 0);
  const ehImpetoA01 = Boolean(ficha?.impeto || impetoPublicado);
  const caAtual = ehImpetoA01
    ? Math.max(
        0,
        personagem.ca +
          Math.min(2, personagem.bonusCaTemporario ?? 0) -
          Math.min(2, personagem.penalidadeCaTemporaria ?? 0),
      )
    : personagem.ca;

  function selecionarSecao(nova: SecaoMenuCombate) {
    setSecao(nova);
    setSelecionadoId('');
    setDetalhesAbertos(false);
  }
  function selecionar(id: string) {
    setSelecionadoId(id);
    setDetalhesAbertos(true);
  }
  if (recolhido)
    return (
      <div className={`hx-combate-recolhido ${lado}`} style={estiloPosicao}>
        <button type="button" onClick={() => setRecolhido(false)} aria-label="Abrir ações do turno">
          ✦ TURNO · {personagem.nome.toUpperCase()}
        </button>
      </div>
    );

  return (
    <>
      <aside
        className={`hx-combate-imersivo ${lado}`}
        style={estiloPosicao}
        aria-label={`Ações do turno de ${personagem.nome}`}
      >
        <header className="hx-combate-topo">
          <div>
            <small>✦ TURNO ATIVO · RODADA {rodada}</small>
            <strong>{personagem.nome}</strong>
            <span className="hx-combate-identidade">{identidadeFicha}</span>
          </div>
          <span
            className="hx-combate-ca"
            title={ehImpetoA01 ? `CA Base ${personagem.ca} · CA Efetiva ${caAtual}` : undefined}
          >
            CA <b>{caAtual}</b>
          </span>
          <button
            type="button"
            className="hx-combate-personalizar"
            onClick={() => setEditorAberto((aberto) => !aberto)}
            aria-expanded={editorAberto}
            aria-label="Personalizar HUD deste personagem"
            title="Personalizar cores, tamanho e posição desta HUD"
          >
            ⚙
          </button>
          <button
            type="button"
            className="hx-combate-minimizar"
            onClick={() => setRecolhido(true)}
            aria-label="Recolher menu de combate"
            title="Recolher menu"
          >
            —
          </button>
        </header>
        <div className="hx-combate-recursos" aria-label="Recursos atuais">
          <div className="hx-combate-medidor hx-combate-hp">
            <span>♥ HP</span>
            <div className="hx-combate-trilha">
              <i style={{ width: `${hpPct}%` }} />
            </div>
            <b>
              {personagem.hp}/{personagem.hpMax}
            </b>
          </div>
          <div
            className="hx-combate-medidor hx-combate-mana"
            title={ehImpetoA01 ? 'Energia pode ultrapassar o valor de referência.' : undefined}
          >
            <span>◆ {ehImpetoA01 || fichaManualImpeto ? 'EN' : 'Mana'}</span>
            <div className="hx-combate-trilha">
              <i style={{ width: `${manaPct}%` }} />
            </div>
            <b>
              {personagem.mana}
              {personagem.manaMax > 0 ? `/${personagem.manaMax}` : ''}
              {ehImpetoA01 && personagem.mana > personagem.manaMax ? ' ↑' : ''}
            </b>
          </div>
          {ehImpetoA01 && (
            <div
              className="hx-combate-medidor hx-combate-escudo"
              title="Escudo temporário absorve dano antes do HP"
            >
              <span>⬡ Escudo</span>
              <div className="hx-combate-trilha">
                <i style={{ width: (personagem.escudo ?? 0) > 0 ? '100%' : '0%' }} />
              </div>
              <b>{personagem.escudo ?? 0}</b>
            </div>
          )}
        </div>
        <nav className="hx-combate-categorias" aria-label="Ações deste turno">
          {SECOES_MENU_COMBATE.map((s) => (
            <button
              type="button"
              key={s.id}
              className={secao === s.id ? 'ativo' : ''}
              aria-pressed={secao === s.id}
              onClick={() => selecionarSecao(s.id)}
            >
              <span aria-hidden="true">{s.icone}</span>
              <strong>{s.nome}</strong>
            </button>
          ))}
        </nav>
        <footer className="hx-combate-rodape">
          <button type="button" onClick={onAbrirInventario}>
            Inventário completo
          </button>
          <button type="button" onClick={onAbrirFicha}>
            Ficha
          </button>
        </footer>
      </aside>
      {
        <section
          className={`hx-combate-submenu ${direcao} hx-combate-layout-${layout.modo}`}
          style={estiloLista}
          aria-label={`Lista de ${tituloSecao.toLowerCase()}`}
        >
          <header className="hx-combate-submenu-topo">
            <span>✦ {tituloSecao}</span>
            <b>{String(quantidadeEntradas).padStart(2, '0')}</b>
          </header>
          <div
            className="hx-combate-lista"
            aria-label={
              itensEmDestaque
                ? 'Itens disponíveis'
                : status
                  ? 'Buffs, exploração, passivas e condições'
                  : 'Habilidades disponíveis'
            }
          >
            {itensEmDestaque ? (
              <>
                {itens.map((atual, i) => (
                  <button
                    type="button"
                    key={atual.id}
                    className={`hx-combate-habilidade ${item?.id === atual.id ? 'ativa' : ''}`}
                    aria-pressed={item?.id === atual.id}
                    onClick={() => selecionar(atual.id)}
                  >
                    <span className="hx-combate-habilidade-interior">
                      <span className="hx-combate-ordem">{String(i + 1).padStart(2, '0')}</span>
                      <ImagemItem
                        imagem={atual.imagem}
                        categoria={atual.categoria}
                        nome={atual.nome}
                        className="hx-combate-item-imagem"
                      />
                      <span className="hx-combate-habilidade-titulo">
                        <strong>{atual.nome}</strong>
                        <small>{atual.categoria}</small>
                      </span>
                      <span className="hx-combate-custo">×{atual.quantidade}</span>
                    </span>
                  </button>
                ))}
                {!itens.length && <p className="hx-combate-vazio">Nenhum item no inventário.</p>}
              </>
            ) : (
              <>
                {acoesDaSecao.map((atual, i) => (
                  <div className="hx-combate-entrada" key={atual.id}>
                    {status && (i === 0 || grupoStatus(i) !== grupoStatus(i - 1)) && (
                      <span className="hx-combate-grupo-titulo">{grupoStatus(i)}</span>
                    )}
                    <button
                      type="button"
                      className={`hx-combate-habilidade ${acao?.id === atual.id ? 'ativa' : ''}`}
                      aria-pressed={acao?.id === atual.id}
                      onClick={() => selecionar(atual.id)}
                    >
                      <span className="hx-combate-habilidade-interior">
                        <span className="hx-combate-ordem">{String(i + 1).padStart(2, '0')}</span>
                        <span className="hx-combate-icone">
                          {atual.icone ? <IconeDaAcao icone={atual.icone} /> : '✦'}
                        </span>
                        <span className="hx-combate-habilidade-titulo">
                          <strong>{atual.titulo}</strong>
                          <small>{atual.tipo}</small>
                        </span>
                        {typeof atual.custo === 'number' && atual.custo > 0 && (
                          <span className="hx-combate-custo">
                            {atual.custo} {ehImpetoA01 || fichaManualImpeto ? 'EN' : 'MP'}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                ))}
                {status && efeitos.length > 0 && (
                  <span className="hx-combate-grupo-titulo">Condições ativas</span>
                )}
                {status &&
                  efeitos.map((efeito) => (
                    <div className="hx-combate-efeito" key={efeito.id}>
                      <span>
                        {ROTULOS_EFEITO[tipoEfeitoCombate(efeito)]} · {efeito.nome}
                      </span>
                      <b>{efeito.turnos}t</b>
                    </div>
                  ))}
                {!acoesDaSecao.length && !(status && efeitos.length) && (
                  <p className="hx-combate-vazio">
                    {ficha || acoesPublicadas
                      ? 'Nenhuma ação nesta seção.'
                      : 'Vincule uma ficha para consultar as habilidades.'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      }
      {detalhesAbertos && (itensEmDestaque ? item : acao) && (
        <section
          className={`hx-combate-detalhe ${direcao} hx-combate-layout-${layout.modo}`}
          style={estiloDetalhe}
          aria-live="polite"
        >
          <div className="hx-combate-detalhe-cabecalho">
            <strong>{itensEmDestaque ? item?.nome : acao?.titulo}</strong>
            <button
              type="button"
              aria-label="Recolher detalhes da ação"
              onClick={() => setDetalhesAbertos(false)}
            >
              ×
            </button>
          </div>
          {itensEmDestaque && item ? (
            <>
              {item.descricao && <p>{item.descricao}</p>}
              <small>
                {item.valor ? `Efeito: ${item.valor} · ` : ''}
                {item.consumivel ? 'Consome 1 ao usar' : 'Não consumível'}
              </small>
              <div className="hx-combate-acoes-item">
                <button
                  type="button"
                  className="hx-combate-acao"
                  onClick={() => setItemEmVisualizacao(item)}
                >
                  ▣ Ver item
                </button>
                {item.categoria !== 'documento' && (
                  <button
                    type="button"
                    className="hx-combate-acao"
                    onClick={() => onUsarItem(item)}
                  >
                    Usar item
                  </button>
                )}
              </div>
            </>
          ) : (
            acao && (
              <>
                {descricaoAcao && <p>{descricaoAcao}</p>}
                {acao.valor && <small>Efeito: {acao.valor}</small>}
                <div className="hx-combate-rolagens">
                  {testeCA && (
                    <button
                      type="button"
                      disabled={rolando}
                      onClick={() =>
                        onRolarAcaoPublicada
                          ? onRolarAcaoPublicada(acao.id, 'teste')
                          : onRolar('1d20', `${acao.titulo} · acerto contra CA`, acao.icone)
                      }
                    >
                      ⚄ Teste CA
                    </button>
                  )}
                  {formula && (
                    <button
                      type="button"
                      className="principal"
                      disabled={rolando}
                      onClick={() =>
                        onRolarAcaoPublicada
                          ? onRolarAcaoPublicada(acao.id, 'valor')
                          : onRolar(
                              formula,
                              `${acao.titulo} · ${acao.categoria === 'cura' ? 'cura' : 'efeito'}`,
                              acao.icone,
                            )
                      }
                    >
                      ⚄ {formula}
                    </button>
                  )}
                  {!testeCA && !formula && <small>Sem teste de CA obrigatório.</small>}
                </div>
              </>
            )
          )}
        </section>
      )}
      {itemEmVisualizacao && (
        <VisualizadorItem item={itemEmVisualizacao} onFechar={() => setItemEmVisualizacao(null)} />
      )}
      {editorAberto && (
        <section
          ref={editorElementoRef}
          className="hx-combate-editor"
          aria-label={`Personalização da HUD de ${personagem.nome}`}
          style={{ ...temaCss, left: posicaoEditor.left, top: posicaoEditor.top }}
          data-layout-editor="manual"
        >
          <header className="hx-combate-editor-topo">
            <div
              className="hx-combate-editor-arrastar"
              role="button"
              tabIndex={0}
              aria-label="Mover editor da HUD: arraste ou use as setas do teclado. Home restaura a posição inicial."
              title="Arraste para posicionar. Setas movimentam; Shift + seta movimenta mais rápido."
              onPointerDown={iniciarArrastoEditor}
              onPointerMove={moverEditor}
              onPointerUp={encerrarArrastoEditor}
              onPointerCancel={encerrarArrastoEditor}
              onLostPointerCapture={encerrarArrastoEditor}
              onKeyDown={moverEditorTeclado}
            >
              <small>✥ Arraste para posicionar</small>
              <strong>HUD DE {personagem.nome.toUpperCase()}</strong>
            </div>
            <div className="hx-combate-editor-topo-acoes">
              <button
                type="button"
                aria-label="Restaurar posição inicial do editor"
                title="Restaurar posição inicial do editor"
                onClick={restaurarPosicaoEditor}
              >
                ↺
              </button>
              <button
                type="button"
                aria-label="Fechar personalização"
                onClick={() => setEditorAberto(false)}
              >
                ×
              </button>
            </div>
          </header>
          <p>
            Personalize esta HUD. Arraste a barra superior para escolher onde o editor fica; a
            posição será salva para este personagem.
          </p>
          <div className="hx-combate-editor-temas" aria-label="Paleta visual da HUD">
            {TEMAS_HUD_COMBATE.map((tema) => (
              <button
                key={tema.id}
                type="button"
                className={personalizacao.tema === tema.id ? 'selecionado' : ''}
                aria-pressed={personalizacao.tema === tema.id}
                onClick={() => setPersonalizacao((atual) => escolherTemaHud(atual, tema.id))}
              >
                <span
                  style={{ background: tema.id === 'customizado' ? personalizacao.cor : tema.cor }}
                />
                {tema.nome}
              </button>
            ))}
          </div>
          <label className="hx-combate-editor-linha">
            Cor de destaque
            <input
              type="color"
              aria-label="Cor de destaque personalizada"
              value={personalizacao.cor}
              onChange={(e) => alterarPersonalizacao({ cor: e.target.value, tema: 'customizado' })}
            />
          </label>
          <label className="hx-combate-editor-slider">
            Tamanho <output>{Math.round(personalizacao.escala * 100)}%</output>
            <input
              type="range"
              min="80"
              max="120"
              step="5"
              value={Math.round(personalizacao.escala * 100)}
              onChange={(e) => alterarPersonalizacao({ escala: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="hx-combate-editor-slider">
            Distância do token <output>{personalizacao.distancia}px</output>
            <input
              type="range"
              min="75"
              max="210"
              step="5"
              value={personalizacao.distancia}
              onChange={(e) => alterarPersonalizacao({ distancia: Number(e.target.value) })}
            />
          </label>
          <label className="hx-combate-editor-slider">
            Brilho <output>{personalizacao.intensidade}%</output>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={personalizacao.intensidade}
              onChange={(e) => alterarPersonalizacao({ intensidade: Number(e.target.value) })}
            />
          </label>
          <label className="hx-combate-editor-linha">
            Abrir menu para
            <select
              aria-label="Lado preferido do menu"
              value={personalizacao.lado}
              onChange={(e) =>
                alterarPersonalizacao({ lado: e.target.value as PersonalizacaoHudCombate['lado'] })
              }
            >
              <option value="auto">Automático</option>
              <option value="direita">Direita</option>
              <option value="esquerda">Esquerda</option>
            </select>
          </label>
          <div className="hx-combate-editor-rodape">
            <button type="button" onClick={() => setPersonalizacao({ ...PADRAO_HUD_COMBATE })}>
              ↺ Restaurar padrão
            </button>
            <button
              type="button"
              className="hx-combate-editor-ok"
              onClick={() => setEditorAberto(false)}
            >
              Concluir
            </button>
          </div>
        </section>
      )}
    </>
  );
}
