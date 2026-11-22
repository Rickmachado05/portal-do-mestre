import type { CSSProperties } from 'react';
import type { MesaPublica } from './api';
import ImagemRetrato from '../lib/retratoResponsivo';
import './CombateConvidado.css';

/** Mesma Ordem de Turnos visual do mestre: somente leitura, com dados filtrados pelo servidor. */
export default function CombateConvidado({
  mesa,
  personagemId,
}: {
  mesa: MesaPublica | null;
  personagemId: string | null;
}) {
  const combate = mesa?.combate;
  const ordem = combate?.ordem ?? [];
  const participantes = new Map((mesa?.tokens ?? []).map((t) => [t.id, t]));
  const retratos = new Map((mesa?.grupo ?? []).map((p) => [p.id, p]));
  const turno = combate?.turnoId ? participantes.get(combate.turnoId) : null;
  return (
    <section
      className="pm-combate pm-iniciativa-leitura"
      aria-label="Ordem de turnos do jogador (somente leitura)"
    >
      <div className="janela-linha-acoes">
        <span className="mini-titulo">
          {combate?.ativo ? `RODADA ${combate.rodada}` : 'PARTICIPANTES DO COMBATE'}
        </span>
        <div className="iniciativa-acoes-cabecalho">
          <strong className="contador-participantes">{ordem.length} na iniciativa</strong>
        </div>
      </div>
      <p className="aviso-pequeno">
        Somente os participantes que o mestre revelou aparecem nesta ordem. A iniciativa é
        controlada pelo mestre.
      </p>
      <div className="lista-iniciativa">
        {ordem.map((id, n) => {
          const t = participantes.get(id);
          if (!t) return null;
          const retrato = retratos.get(id);
          return (
            <div
              key={id}
              className={`linha-iniciativa ${id === combate?.turnoId && combate?.ativo ? 'turno' : ''} ${id === personagemId ? 'pm-iniciativa-eu' : ''}`}
            >
              <div className="ini-selecionar">
                <span className="ordem-num">{String(n + 1).padStart(2, '0')}</span>
                <span
                  className="iniciativa-retrato"
                  style={{ '--cor-unidade': t.cor } as CSSProperties}
                >
                  {retrato?.imagem ? (
                    <ImagemRetrato src={retrato.imagem} alt="" ajuste={retrato.enquadramento} />
                  ) : t.imagem ? (
                    <img src={t.imagem} alt="" />
                  ) : (
                    t.nome.slice(0, 1).toUpperCase()
                  )}
                </span>
                <strong>{t.nome}</strong>
              </div>
              <output className="pm-iniciativa-valor" aria-label={`Iniciativa de ${t.nome}`}>
                {combate?.valores?.[id] ?? '—'}
              </output>
              {combate?.ativo && id === combate.turnoId && (
                <span className="pm-iniciativa-marcador" title="Turno atual">
                  ✦
                </span>
              )}
            </div>
          );
        })}
        {!ordem.length && (
          <p className="vazio">
            {combate?.ativo
              ? 'Nenhum participante visível nesta cena.'
              : 'O mestre ainda não adicionou participantes visíveis.'}
          </p>
        )}
      </div>
      <div className="acoes-turnos pm-iniciativa-estado" role="status">
        <span>
          {!combate?.ativo
            ? 'Aguardando o mestre iniciar o combate'
            : combate.turnoId === personagemId
              ? '✦ É a sua vez'
              : turno
                ? `Vez de ${turno.nome}`
                : 'O turno atual está fora da sua visão'}
        </span>
      </div>
      {combate?.ativo && (
        <p className="aviso-pequeno">
          Rodada {combate.rodada}.{' '}
          {turno ? `Vez de ${turno.nome}.` : 'Participantes ocultos permanecem anônimos.'}
        </p>
      )}
      <div className="iniciativa-adicionar-cabecalho">
        <strong>CONTROLE DO MESTRE</strong>
      </div>
      <p className="aviso-pequeno">
        Adicionar participantes, rolar iniciativas, avançar turnos e encerrar o combate são ações
        exclusivas do mestre.
      </p>
    </section>
  );
}
