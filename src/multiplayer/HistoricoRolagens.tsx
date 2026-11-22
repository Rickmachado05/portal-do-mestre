import type { RolagemCompartilhada } from './api';

/** Histórico público do multiplayer, com a mesma apresentação de registros da Mesa do Mestre. */
export default function HistoricoRolagens({
  rolagens,
  compacto = false,
}: {
  rolagens: RolagemCompartilhada[];
  compacto?: boolean;
}) {
  const listagem = compacto ? rolagens.slice(-8) : rolagens.slice(-50);
  return (
    <section
      className="pm-mp-historico pm-jogo-historico"
      aria-label="Histórico de rolagens compartilhadas"
    >
      <div className="janela-linha-acoes">
        <span className="mini-titulo">ÚLTIMOS EVENTOS</span>
        <small>{listagem.length} registro(s)</small>
      </div>
      <div className="lista-eventos" aria-live="polite">
        {[...listagem].reverse().map((rolagem) => (
          <div key={rolagem.id} className="registro dado">
            <span aria-hidden="true">⚄</span>
            <p>
              <strong>
                {rolagem.visibilidade === 'mestre' ? '🔒 ' : '🌐 '}
                {rolagem.personagem} · {rolagem.acaoNome}
              </strong>
              <small>
                {rolagem.formula} · [{rolagem.dados.join(' + ')}]
                {rolagem.modificador
                  ? ` ${rolagem.modificador > 0 ? '+' : ''}${rolagem.modificador}`
                  : ''}{' '}
                · {rolagem.participante}
              </small>
            </p>
            <b className="pm-jogo-historico-total" title={`Total da rolagem: ${rolagem.total}`}>
              {rolagem.total}
            </b>
            <time dateTime={rolagem.hora}>
              {new Date(rolagem.hora).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        ))}
        {!listagem.length && <p className="vazio">Nenhuma rolagem compartilhada ainda.</p>}
      </div>
    </section>
  );
}
