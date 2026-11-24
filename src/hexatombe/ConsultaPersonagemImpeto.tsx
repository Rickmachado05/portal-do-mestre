import type { FichaPortalImpeto } from '../impeto/contrato';
import { NOMES_ATRIBUTOS, NOMES_PERICIAS } from '../impeto/contrato';
import type { FichaImpetoCompartilhada } from '../multiplayer/api';

export type AbaPersonagem = 'atributos' | 'pericias' | 'escolhas';
export type DadosConsultaPersonagem = Pick<
  FichaImpetoCompartilhada,
  'atributos' | 'pericias' | 'arquetipo' | 'talento' | 'vantagem' | 'derivacao' | 'investimento'
>;
/** Mesma apresentação aprovada pelo jogador nas mesas do mestre e do convidado.
 * O conversor usa apenas os campos permitidos na visualização de personagem; não altera a ficha. */
export function dadosConsultaMestre(ficha: FichaPortalImpeto): DadosConsultaPersonagem {
  return {
    atributos: NOMES_ATRIBUTOS.map((nome) => ({ nome, valor: ficha.atributos[nome] })),
    pericias: NOMES_PERICIAS.map((nome) => ({ nome, bonus: ficha.pericias[nome] * 2 })),
    arquetipo: ficha.arquetipo,
    talento: ficha.talento,
    vantagem: ficha.vantagem,
    derivacao: ficha.derivacao,
    investimento: ficha.recursosPR,
  };
}

const nomesVantagens: Record<string, string> = {
  preparadoImprevistos: 'Preparado para Imprevistos',
  memoriaTreinada: 'Memória Treinada',
  sangueFrio: 'Sangue-Frio',
  raciocinioAplicado: 'Raciocínio Aplicado',
  articulacaoSocial: 'Articulação Social',
  engenhosidade: 'Engenhosidade',
  conhecimentoCruzado: 'Conhecimento Cruzado',
  exploradorPreparado: 'Explorador Preparado',
};
const nomesTalentos: Record<string, string> = {
  fluxoEficiente: 'Fluxo Eficiente',
  absorcaoInstintiva: 'Absorção Instintiva',
  correcaoDeGolpe: 'Correção de Golpe',
};
const nomesDerivacoes: Record<string, string> = {
  resistencia: 'Resistência',
  reserva: 'Reserva',
  potencia: 'Potência',
};

/** Somente atributos e perícias da ficha do próprio jogador, já filtrados no servidor. */
export default function ConsultaPersonagemImpeto({
  dados,
  aba,
}: {
  dados: DadosConsultaPersonagem;
  aba: AbaPersonagem;
}) {
  const inv = dados.investimento;
  return (
    <div className="hx-ficha-personagem-conteudo" role="tabpanel">
      {aba === 'atributos' && (
        <section className="impeto-a01-painel">
          <h4>
            Atributos <small>Ímpeto</small>
          </h4>
          <dl className="impeto-a01-grade">
            {dados.atributos.map((a) => (
              <div key={a.nome}>
                <dt>{a.nome}</dt>
                <dd>{a.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {aba === 'pericias' && (
        <section className="impeto-a01-painel">
          <h4>
            Perícias <small>Treinamentos</small>
          </h4>
          <p className="impeto-a01-ajuda">Não treinado +0 · Treinado +2 · Especialista +4</p>
          <dl className="impeto-a01-grade">
            {dados.pericias.map((p) => (
              <div key={p.nome}>
                <dt>{p.nome}</dt>
                <dd>+{p.bonus}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {aba === 'escolhas' && (
        <section className="impeto-a01-painel">
          <h4>Construção do personagem</h4>
          <div className="impeto-a01-escolhas-grade">
            <article>
              <small>ARQUÉTIPO</small>
              <strong>{dados.arquetipo || 'Não escolhido'}</strong>
              <span>Talento: {nomesTalentos[dados.talento] || dados.talento || 'Nenhum'}</span>
            </article>
            <article>
              <small>VANTAGENS</small>
              <strong>{nomesVantagens[dados.vantagem] || dados.vantagem || 'Nenhuma'}</strong>
            </article>
            <article>
              <small>DERIVAÇÃO</small>
              <strong>{nomesDerivacoes[dados.derivacao.tipo] || 'Nenhuma'}</strong>
              <span>
                {dados.derivacao.atributo ? `Atributo: ${dados.derivacao.atributo}` : 'Opcional'}
                {dados.derivacao.justificativa ? ` · ${dados.derivacao.justificativa}` : ''}
              </span>
            </article>
            <article>
              <small>INVESTIMENTO PR</small>
              <strong>Recursos adquiridos</strong>
              <span>
                HP +{inv.hp} PR · EN +{inv.energia} PR · CA {inv.ca} · Ataque +{inv.ataqueDados}d6 ·
                Regeneração +{inv.regeneracao}
              </span>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
