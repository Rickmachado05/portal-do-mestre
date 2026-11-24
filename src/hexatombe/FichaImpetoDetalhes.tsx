import { useState } from 'react';
import type { FichaPortalImpeto } from '../impeto/contrato';
import { NOMES_ATRIBUTOS, NOMES_PERICIAS } from '../impeto/contrato';
import { pontosRecursos } from '../impeto/importador';
import { custoPC, custoPX, custoPassiva, custoEN, custoENPX } from '../impeto/custos';
import { formulaAtiva, tipoAtiva, resumirCustoEN } from '../impeto/integracaoPortal';
import './FichaImpetoDetalhes.css';
import {acoesUniversais,descricaoEscolhasUniversal,converterUniversal} from '../impeto/universal.mjs';
import ConsultaPersonagemImpeto,{dadosConsultaMestre} from './ConsultaPersonagemImpeto';

type SecaoDetalhes = 'atributos' | 'pericias' | 'escolhas' | 'tecnicas' | 'exploracao';

/** Consulta completa do sistema na Biblioteca, 2D e 3D. Sem regravar a ficha. */
export default function FichaImpetoDetalhes({
  ficha,
  secoes,
}: {
  ficha: FichaPortalImpeto;
  secoes?: SecaoDetalhes[];
}) {
  const [abaTecnicas, setAbaTecnicas] = useState<'combate' | 'exploracao'>('combate');
  const usarSubabas = !secoes || (secoes.includes('tecnicas') && secoes.includes('exploracao'));
  const mostrar = (secao: SecaoDetalhes) =>
    (!secoes || secoes.includes(secao)) &&
    (!usarSubabas ||
      (secao !== 'tecnicas' && secao !== 'exploracao') ||
      (secao === 'tecnicas' && abaTecnicas === 'combate') ||
      (secao === 'exploracao' && abaTecnicas === 'exploracao'));
  if(ficha.escala==='universal-v1'){
    const info=descricaoEscolhasUniversal(ficha),dados=dadosConsultaMestre(ficha),acoes=acoesUniversais(converterUniversal(ficha.origem));
    return <section className="impeto-a01-detalhes">{!secoes&&<div className="impeto-a01-versao"><strong>ÍMPETO RPG · Universal</strong><span>{['pa','pr','pt','pc','px'].map(k=>info.config[k]+' '+k.toUpperCase()).join(' · ')}</span></div>}
      {ficha.requerRevisao&&<aside className="impeto-a01-avisos">{ficha.avisos.map((a,i)=><p key={i}>{a}</p>)}</aside>}
      {(['atributos','pericias','escolhas'] as const).filter(mostrar).map(aba=><ConsultaPersonagemImpeto key={aba} dados={dados} aba={aba}/>)}
      {mostrar('escolhas')&&<section className="impeto-a01-painel">{info.talento&&<p>{info.talento}</p>}{info.vantagens.map(v=><p key={v.nome}><b>{v.nome}:</b> {v.descricao}</p>)}{info.conceito&&<p>Conceito: {info.conceito}</p>}{info.equipamentos&&<p>Equipamentos: {info.equipamentos}</p>}</section>}
      {usarSubabas&&<nav className="impeto-a01-subtabs" role="tablist"><button role="tab" aria-selected={abaTecnicas==='combate'} onClick={()=>setAbaTecnicas('combate')}>⚔ Combate</button><button role="tab" aria-selected={abaTecnicas==='exploracao'} onClick={()=>setAbaTecnicas('exploracao')}>✧ Exploração</button></nav>}
      {(['tecnicas','exploracao'] as const).filter(mostrar).map(secao=><section key={secao} className="impeto-a01-painel"><h4>{secao==='tecnicas'?'Combate':'Exploração'}</h4><div className="impeto-a01-tecnicas">{acoes.filter(a=>secao==='tecnicas'?a.ativacao!=='exploracao':a.ativacao==='exploracao').map(a=><article key={a.id}><strong>{a.titulo}</strong><small>{a.tipo} · {a.ativacao} {a.pc!==undefined?' · '+a.pc+' PC':''}{a.px!==undefined?' · '+a.px+' PX':''}{a.enIndefinida?' · Custo especial':a.custo!==undefined?' · '+a.custo+' EN':''}</small>{a.valor&&<p>{a.valor}</p>}{a.descricao&&<p>{a.descricao}</p>}{a.restricoes&&<p>{a.restricoes}</p>}</article>)}</div></section>)}
    </section>;
  }
  const pc = ficha.ativas.reduce((total, a) => total + custoPC(a), 0) + custoPassiva(ficha.passiva);
  const px = ficha.exploracao.reduce((total, e) => total + custoPX(e), 0);
  const nomeD01: Record<string, string> = {
    resistencia: 'Resistência',
    reserva: 'Reserva',
    potencia: 'Potência',
  };
  const nomesV01: Record<string, string> = {
    preparadoImprevistos: 'Preparado para Imprevistos',
    memoriaTreinada: 'Memória Treinada',
    sangueFrio: 'Sangue-Frio',
    raciocinioAplicado: 'Raciocínio Aplicado',
    articulacaoSocial: 'Articulação Social',
    engenhosidade: 'Engenhosidade',
    conhecimentoCruzado: 'Conhecimento Cruzado',
    exploradorPreparado: 'Explorador Preparado',
  };
  const nomesT02: Record<string, string> = {
    fluxoEficiente: 'Fluxo Eficiente',
    absorcaoInstintiva: 'Absorção Instintiva',
    correcaoDeGolpe: 'Correção de Golpe',
  };
  return (
    <section className="impeto-a01-detalhes" aria-label="Regras do Ímpeto RPG na ficha">
      {!secoes && (
        <div className="impeto-a01-versao">
          <strong>ÍMPETO RPG 1.0 · Avatar A01</strong>
          <span>
            32 PA · 20 PR · 6 PT · {pc}/100 PC · {px}/35 PX
          </span>
        </div>
      )}
      {ficha.requerRevisao && (
        <aside className="impeto-a01-avisos">
          <strong>Ficha importada com pontos para revisar:</strong>
          <ul>
            {ficha.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </aside>
      )}
      {mostrar('atributos') && (
        <section className="impeto-a01-painel">
          <h4>
            Atributos <small>8 valores</small>
          </h4>
          <dl className="impeto-a01-grade">
            {NOMES_ATRIBUTOS.map((nome) => (
              <div key={nome}>
                <dt>{nome}</dt>
                <dd>{ficha.atributos[nome]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {mostrar('pericias') && (
        <section className="impeto-a01-painel">
          <h4>
            Perícias <small>16 treinamentos</small>
          </h4>
          <p className="impeto-a01-ajuda">Não treinado +0 · Treinado +2 · Especialista +4</p>
          <dl className="impeto-a01-grade">
            {NOMES_PERICIAS.map((nome) => (
              <div key={nome}>
                <dt>{nome}</dt>
                <dd>+{ficha.pericias[nome] * 2}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {mostrar('escolhas') && (
        <section className="impeto-a01-painel">
          <h4>Construção do personagem</h4>
          <div className="impeto-a01-escolhas-grade">
            <article>
              <small>ARQUÉTIPO</small>
              <strong>{ficha.arquetipo || 'Não escolhido'}</strong>
              <span>Talento T02: {nomesT02[ficha.talento] || ficha.talento || 'Nenhum'}</span>
            </article>
            <article>
              <small>VANTAGEM V01</small>
              <strong>{nomesV01[ficha.vantagem] || ficha.vantagem || 'Nenhuma'}</strong>
            </article>
            <article>
              <small>DERIVAÇÃO D01</small>
              <strong>{nomeD01[ficha.derivacao.tipo] || 'Nenhuma'}</strong>
              <span>
                {ficha.derivacao.atributo ? `Atributo: ${ficha.derivacao.atributo}` : 'Opcional'}
                {ficha.derivacao.justificativa ? ` · ${ficha.derivacao.justificativa}` : ''}
              </span>
            </article>
            <article>
              <small>INVESTIMENTO PR</small>
              <strong>{pontosRecursos(ficha.recursosPR)}/20 PR utilizados</strong>
              <span>
                HP +{ficha.recursosPR.hp} PR · EN +{ficha.recursosPR.energia} PR · CA{' '}
                {ficha.recursosPR.ca} · ataque +{ficha.recursosPR.ataqueDados}d6 · regeneração +
                {ficha.recursosPR.regeneracao}
              </span>
            </article>
          </div>
        </section>
      )}
      {usarSubabas && (
        <nav className="impeto-a01-subtabs" aria-label="Tipos de técnicas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={abaTecnicas === 'combate'}
            onClick={() => setAbaTecnicas('combate')}
          >
            ⚔ Combate <small>5 ativas + passiva</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaTecnicas === 'exploracao'}
            onClick={() => setAbaTecnicas('exploracao')}
          >
            ✧ Exploração{' '}
            <small>
              {ficha.exploracao.length} técnicas · {px}/35 PX
            </small>
          </button>
        </nav>
      )}
      {mostrar('tecnicas') && (
        <section className="impeto-a01-painel" role={usarSubabas ? 'tabpanel' : undefined}>
          <h4>Habilidades H06 · 5 ativas</h4>
          <div className="impeto-a01-tecnicas">
            {ficha.ativas.map((a, i) => (
              <article key={i}>
                <div className="impeto-a01-tecnica-cabeca">
                  <span className="impeto-a01-numero">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{a.nome || 'Habilidade sem nome'}</strong>
                    <small>
                      {tipoAtiva(a)} ·{' '}
                      {a.ativacao === 'principal'
                        ? 'Ação principal'
                        : a.ativacao === 'buff'
                          ? 'Buff rápido'
                          : 'Reação'}
                    </small>
                  </div>
                  <span className="impeto-a01-preco">{resumirCustoEN(custoEN(custoPC(a), a))}</span>
                </div>
                <small>
                  {custoPC(a)} PC {formulaAtiva(a) ? ` · ${formulaAtiva(a)}` : ''}{' '}
                  {a.distante ? '· Alcance ampliado' : ''}
                </small>
                {a.descricao && <p>{a.descricao}</p>}
                {a.gatilho && (
                  <p>
                    <b>Gatilho:</b> {a.gatilho}
                  </p>
                )}
                {a.limites && (
                  <p>
                    <b>Limites:</b> {a.limites}
                  </p>
                )}
              </article>
            ))}
          </div>
          <h4>Passiva H04.1</h4>
          <div className="impeto-a01-tecnicas">
            <article>
              <strong>{ficha.passiva.nome || 'Sem nome'}</strong>
              <small>
                {custoPassiva(ficha.passiva)} PC · {ficha.passiva.usos} uso(s)/combate
              </small>
              {ficha.passiva.descricao && <p>{ficha.passiva.descricao}</p>}
              {ficha.passiva.limites && <p>{ficha.passiva.limites}</p>}
            </article>
          </div>
        </section>
      )}
      {mostrar('exploracao') && (
        <section className="impeto-a01-painel" role={usarSubabas ? 'tabpanel' : undefined}>
          <h4>Exploração PX · {px}/35</h4>
          <div className="impeto-a01-tecnicas">
            {ficha.exploracao.length ? (
              ficha.exploracao.map((e, i) => (
                <article key={i}>
                  <div className="impeto-a01-tecnica-cabeca">
                    <span className="impeto-a01-numero">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{e.nome || 'Técnica de exploração'}</strong>
                      <small>
                        {e.categoria} · {e.classe}
                      </small>
                    </div>
                    <span className="impeto-a01-preco">
                      {resumirCustoEN(custoENPX(custoPX(e), e.automatica))}
                    </span>
                  </div>
                  <small>
                    {custoPX(e)} PX · alcance {e.alcance} · duração {e.duracao}
                  </small>
                  {e.descricao && <p>{e.descricao}</p>}
                  {e.teste && (
                    <p>
                      <b>Teste:</b> {e.teste}
                    </p>
                  )}
                  {e.limites && (
                    <p>
                      <b>Limites:</b> {e.limites}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p>Não há técnicas adicionais de exploração.</p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
