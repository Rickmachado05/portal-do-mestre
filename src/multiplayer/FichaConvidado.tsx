import { useState } from 'react';
import { formulaRolavelDaFicha } from '../hexatombe/rolagensDaFicha';
import {
  permiteRolarEfeito,
  precisaTesteContraCA,
  type CategoriaAcao,
} from '../hexatombe/logicaAcoesDaFicha';
import FaixasEfeitos from '../hexatombe/FaixasEfeitos';
import ConsultaPersonagemImpeto, {
  type AbaPersonagem,
} from '../hexatombe/ConsultaPersonagemImpeto';
import type { FichaCompartilhada, FichaImpetoCompartilhada } from './api';
import ImagemRetrato, { type AjusteRetrato } from '../lib/retratoResponsivo';
import '../fichaAbas.css';
import '../hexatombe/AcoesDaFicha.css';
import '../hexatombe/FichaImpetoDetalhes.css';
import '../impeto/portalA01.css';
import './FichaConvidado.css';

type Aba = 'atributos' | 'habilidades' | 'personagem' | 'inventario' | 'token';
const categorias: Record<string, string> = {
  basico: 'Ataque básico',
  ofensiva: 'Ofensiva',
  buff: 'Buff',
  cura: 'Cura',
  controle: 'Controle',
  defesa: 'Defesa',
  utilidade: 'Utilidade',
  passiva: 'Passiva',
};
/** Mesma fórmula de consulta da ficha do mestre. A rolagem utiliza a ação livre já autorizada pelo servidor. */
function TestePericiaConvidado({
  dados,
  onRolarFormula,
  rolando,
}: {
  dados: FichaImpetoCompartilhada;
  onRolarFormula: (formula: string) => void;
  rolando: boolean;
}) {
  const [atributo, setAtributo] = useState('Percepção');
  const [pericia, setPericia] = useState('Atenção');
  const a = dados.atributos.find((x) => x.nome === atributo)?.valor || 0;
  const p = dados.pericias.find((x) => x.nome === pericia)?.bonus || 0;
  const soma = a + p;
  return (
    <section className="impeto-a01-testes pm-jogo-testes-impeto" aria-label="Rolagem de perícia">
      <header className="impeto-a01-testes-cabecalho">
        <span className="impeto-a01-testes-icone" aria-hidden="true">
          ⚄
        </span>
        <div>
          <h3>Rolagem de perícia</h3>
          <p>Escolha o atributo e a perícia. O mestre define a dificuldade.</p>
        </div>
      </header>
      <div className="impeto-a01-testes-campos">
        <label>
          Atributo
          <select value={atributo} onChange={(e) => setAtributo(e.target.value)}>
            {dados.atributos.map((a) => (
              <option key={a.nome} value={a.nome}>
                {a.nome} ({a.valor})
              </option>
            ))}
          </select>
        </label>
        <label>
          Perícia
          <select value={pericia} onChange={(e) => setPericia(e.target.value)}>
            {dados.pericias.map((p) => (
              <option key={p.nome} value={p.nome}>
                {p.nome} (+{p.bonus})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="impeto-a01-testes-resultado" aria-live="polite">
        <span>Seu bônus neste teste</span>
        <strong>+{soma}</strong>
        <small>
          1d20 + {a} (atributo) + {p} (perícia)
        </small>
      </div>
      <button
        className="impeto-a01-testes-rolar"
        type="button"
        disabled={rolando}
        onClick={() => onRolarFormula(`1d20+${soma}`)}
      >
        ⚄ Rolar teste (+{soma})
      </button>
      <div className="impeto-a01-testes-dificuldades">
        <strong>Dificuldade de referência</strong>
        <div className="impeto-a01-testes-cds">
          {(
            [
              ['15', 'Simples'],
              ['20', 'Moderada'],
              ['25', 'Difícil'],
              ['30', 'Muito difícil'],
              ['35', 'Excepcional'],
            ] as const
          ).map(([cd, nome]) => (
            <span className="impeto-a01-cd" key={cd}>
              <b>CD {cd}</b>
              <small>{nome}</small>
            </span>
          ))}
        </div>
      </div>
      <p className="pm-jogo-registro-rolagem">
        A rolagem é registrada pelo servidor; a dificuldade é determinada pelo mestre.
      </p>
    </section>
  );
}

/** Espelho somente leitura da ficha de combate do mestre, com dados autorizados do próprio convidado. */
export default function FichaConvidado({
  ficha,
  atribuido,
  onRolarAcao,
  onRolarFormula,
  rolando,
  retrato,
  enquadramento,
  tokenImagem,
  onAbrirInventario,
}: {
  ficha: FichaCompartilhada | null;
  atribuido: boolean;
  onRolarAcao: (acaoId: string, modalidade: 'teste' | 'valor') => void;
  onRolarFormula: (formula: string) => void;
  rolando: boolean;
  retrato?: string;
  enquadramento?: AjusteRetrato;
  tokenImagem?: string;
  onAbrirInventario?: () => void;
}) {
  const [aba, setAba] = useState<Aba>('atributos');
  const [abaPersonagem, setAbaPersonagem] = useState<AbaPersonagem>('atributos');
  const [abaTecnicas, setAbaTecnicas] = useState<'combate' | 'exploracao'>('combate');
  const [filtro, setFiltro] = useState('todos');
  if (!atribuido)
    return <p className="pm-mp-nota">O mestre ainda não atribuiu um personagem a você.</p>;
  if (!ficha)
    return <p className="pm-mp-nota">Aguardando o mestre compartilhar sua ficha de combate.</p>;
  const impeto = ficha.impeto;
  const acoes = ficha.acoes.filter(
    (a) =>
      (abaTecnicas === 'exploracao') === (a.ativacao === 'exploracao') &&
      (filtro === 'todos' || a.categoria === filtro),
  );
  const temExploracao = ficha.acoes.some((a) => a.ativacao === 'exploracao');
  const energia = Boolean(impeto);
  const recursoNome = energia
    ? 'ENERGIA'
    : ficha.elemento.includes('Não Dobrador')
      ? 'FOCO'
      : 'MANA';
  return (
    <section className="pm-jogo-ficha-mestre" aria-label="Minha ficha de personagem">
      <header className="cabecalho-ficha">
        <span className="avatar-ficha">
          {retrato ? (
            <ImagemRetrato src={retrato} alt="" ajuste={enquadramento} />
          ) : (
            ficha.nome.slice(0, 1)
          )}
        </span>
        <div className="hx-ficha-identidade">
          <strong>{ficha.nome}</strong>
          <small>
            {[ficha.elemento, ficha.classe]
              .filter(Boolean)
              .filter(
                (v, i, arr) => arr.findIndex((n) => n.toLowerCase() === v.toLowerCase()) === i,
              )
              .join(' · ')}
          </small>
        </div>
        <div className="hx-ficha-resumo" aria-label="Recursos atuais do personagem">
          {(
            [
              ['hp', '♥ HP', ficha.hp, ficha.hpMax],
              ['mana', `◆ ${energia ? 'EN' : recursoNome}`, ficha.mana, ficha.manaMax],
            ] as const
          ).map(([tipo, nome, atual, maximo]) => (
            <div className={`hx-resumo-recurso hx-resumo-${tipo}`} key={tipo}>
              <div className="hx-resumo-cabecalho">
                <span>{nome}</span>
                <strong>
                  {atual}
                  <small>
                    {' '}
                    / {maximo}
                    {tipo === 'mana' && energia ? ' ref.' : ''}
                  </small>
                </strong>
              </div>
              <div className="hx-resumo-barra">
                <span
                  style={{
                    width: `${maximo > 0 ? Math.min(100, Math.max(0, (atual / maximo) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <span className="selo-ca">
          CA <b>{ficha.ca}</b>
        </span>
      </header>
      <nav className="hx-ficha-abas" aria-label="Abas da ficha do jogador">
        {(
          [
            ['atributos', '♥', 'Atributos'],
            ['habilidades', '✦', 'Habilidades'],
            ...(impeto ? [['personagem', '☷', 'Personagem'] as const] : []),
            ['inventario', '▣', 'Inventário'],
            ['token', '♟', 'Token'],
          ] as const
        ).map(([id, icone, nome]) => (
          <button
            key={id}
            type="button"
            className={aba === id ? 'ativa' : ''}
            aria-current={aba === id ? 'page' : undefined}
            onClick={() => setAba(id)}
          >
            <span aria-hidden="true">{icone}</span> {nome}
          </button>
        ))}
      </nav>
      <div className="hx-ficha-corpo">
        {aba === 'atributos' && (
          <div
            className="hx-ficha-painel pm-jogo-atributos-limpos"
            aria-label="Condições e efeitos ativos do personagem"
          >
            {ficha.condicoes && ficha.condicoes.length > 0 && (
              <section className="pm-jogo-condicoes">
                <strong>Buffs, debuffs e condições</strong>
                <FaixasEfeitos efeitos={ficha.condicoes} />
              </section>
            )}
            {(!ficha.condicoes || ficha.condicoes.length === 0) && (
              <p className="pm-jogo-sem-condicoes">
                Nenhum buff, debuff ou condição ativa no momento.
              </p>
            )}
          </div>
        )}
        {aba === 'habilidades' && (
          <section
            className="hx-acoes-da-ficha pm-jogo-habilidades"
            aria-label="Habilidades do personagem"
          >
            {impeto && (
              <TestePericiaConvidado
                dados={impeto}
                onRolarFormula={onRolarFormula}
                rolando={rolando}
              />
            )}
            {temExploracao && (
              <nav className="hx-acoes-subtabs" role="tablist" aria-label="Tipos de técnicas">
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaTecnicas === 'combate'}
                  onClick={() => {
                    setAbaTecnicas('combate');
                    setFiltro('todos');
                  }}
                >
                  ⚔ Combate{' '}
                  <small>{ficha.acoes.filter((a) => a.ativacao !== 'exploracao').length}</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaTecnicas === 'exploracao'}
                  onClick={() => {
                    setAbaTecnicas('exploracao');
                    setFiltro('todos');
                  }}
                >
                  ✧ Exploração{' '}
                  <small>{ficha.acoes.filter((a) => a.ativacao === 'exploracao').length}</small>
                </button>
              </nav>
            )}
            <div className="hx-acoes-conteudo">
              <div className="hx-acoes-toolbar">
                <strong>
                  ✦{' '}
                  {abaTecnicas === 'exploracao'
                    ? 'Técnicas de exploração'
                    : 'Habilidades e passiva'}{' '}
                  ({acoes.length})
                </strong>
                <label className="hx-filtro-categoria">
                  Categoria{' '}
                  <span className="hx-filtro-categoria-campo">
                    <select
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      aria-label="Filtrar habilidades"
                    >
                      <option value="todos">Todas</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
              <p className="aviso-pequeno">
                Rolagens registradas pelo servidor. Custos, condições e efeitos são aplicados pelo
                mestre.
              </p>
              <div className="hx-acoes-grade">
                {acoes.map((acao) => {
                  const formula = permiteRolarEfeito(acao.categoria as CategoriaAcao)
                    ? formulaRolavelDaFicha(acao.valor)
                    : null;
                  const teste =
                    acao.exigeCA ?? precisaTesteContraCA(acao.categoria as CategoriaAcao);
                  const custo =
                    (acao.fonte === 'a01' || acao.fonte === 'universal')
                      ? acao.enIndefinida
                        ? 'EN a definir'
                        : `${acao.custo ?? 0} EN`
                      : acao.custo
                        ? `${acao.custo} Mana/Foco`
                        : '';
                  return (
                    <article
                      key={acao.id}
                      className="hx-acao-ficha hx-acao-compacta"
                      data-categoria={acao.categoria}
                    >
                      <div className="hx-acao-ficha-cabecalho">
                        <div className="hx-acao-ficha-identidade">
                          <span className="hx-acao-icone-local">
                            <span className="pm-jogo-icone-categoria" aria-hidden="true">
                              {(
                                {
                                  basico: '⚔',
                                  ofensiva: '✦',
                                  buff: '✧',
                                  cura: '♥',
                                  controle: '◎',
                                  defesa: '⬡',
                                  utilidade: '◇',
                                  passiva: '✺',
                                } as Record<string, string>
                              )[acao.categoria] || '✦'}
                            </span>
                          </span>
                          <div>
                            <strong>{acao.nome}</strong>
                            <span>
                              {acao.tipo}
                              {custo ? ` · ${custo}` : ''}
                              {acao.pc !== undefined ? ` · ${acao.pc} PC` : ''}
                              {acao.px !== undefined ? ` · ${acao.px} PX` : ''}
                            </span>
                          </div>
                        </div>
                        {acao.valor && <span className="hx-acao-ficha-valor">{acao.valor}</span>}
                      </div>
                      <div className="hx-acao-ficha-botoes">
                        {teste && (
                          <button
                            type="button"
                            disabled={rolando}
                            onClick={() => onRolarAcao(acao.id, 'teste')}
                          >
                            ⚄ Teste CA
                          </button>
                        )}
                        {formula && (
                          <button
                            type="button"
                            className="botao-primario"
                            disabled={rolando}
                            onClick={() => onRolarAcao(acao.id, 'valor')}
                          >
                            ⚄ Rolar {formula}
                          </button>
                        )}
                      </div>
                      {(acao.descricao || acao.restricoes) && (
                        <details className="pm-jogo-acao-descricao">
                          <summary>Ver descrição</summary>
                          {acao.descricao && <p>{acao.descricao}</p>}
                          {acao.restricoes && (
                            <p>
                              <strong>Limitações:</strong> {acao.restricoes}
                            </p>
                          )}
                        </details>
                      )}
                    </article>
                  );
                })}
                {!acoes.length && (
                  <p className="aviso-pequeno">Nenhuma habilidade cadastrada nesta categoria.</p>
                )}
              </div>
              {!ficha.temFicha && (
                <p className="aviso-pequeno">O mestre ainda não vinculou uma ficha completa.</p>
              )}
            </div>
          </section>
        )}
        {aba === 'personagem' && impeto && (
          <section
            className="hx-ficha-painel hx-ficha-personagem impeto-a01-detalhes"
            aria-label="Detalhes do personagem Ímpeto"
          >
            <div className="hx-ficha-personagem-cabecalho">
              <strong>Ficha do personagem</strong>
              <small>Ímpeto · {impeto.escala==='universal-v1'?'Universal':'Avatar A01'}</small>
            </div>
            <nav className="hx-ficha-personagem-abas" role="tablist" aria-label="Detalhes da ficha">
              {(
                [
                  ['atributos', 'Atributos'],
                  ['pericias', 'Perícias'],
                  ['escolhas', 'Construção'],
                ] as const
              ).map(([id, nome]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={abaPersonagem === id}
                  onClick={() => setAbaPersonagem(id)}
                >
                  {nome}
                </button>
              ))}
            </nav>
            <ConsultaPersonagemImpeto dados={impeto} aba={abaPersonagem} />
          </section>
        )}
        {aba === 'inventario' && (
          <section className="hx-ficha-painel">
            <p className="aviso-pequeno">
              O inventário é privado. Usos e transferências requerem autorização do mestre.
            </p>
            {onAbrirInventario ? (
              <button
                type="button"
                className="hx-inventario-separado botao-primario"
                onClick={onAbrirInventario}
              >
                ▣ Abrir meu inventário
              </button>
            ) : (
              <p className="aviso-pequeno">Abra o Inventário para visualizar seus itens.</p>
            )}
          </section>
        )}
        {aba === 'token' && (
          <section
            className="hx-ficha-painel pm-jogo-ficha-token"
            aria-label="Token do personagem na cena"
          >
            <strong>Token em cena</strong>
            {tokenImagem ? (
              <img src={tokenImagem} alt={`Token de ${ficha.nome}`} />
            ) : (
              <p className="aviso-pequeno">
                O mestre ainda não publicou um token para seu personagem nesta cena.
              </p>
            )}
            <p className="aviso-pequeno">
              Visualização do seu token. O mestre controla a aparência e as permissões de
              movimentação.
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
