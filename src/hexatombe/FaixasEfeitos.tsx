import {
  alterarDuracaoEfeito,
  ROTULOS_EFEITO,
  SIMBOLOS_EFEITO,
  tipoEfeitoCombate,
  type EfeitoCombate,
} from './efeitosCombate';
import './FaixasEfeitos.css';

type Props = {
  efeitos: EfeitoCombate[];
  onAtualizar?: (efeitos: EfeitoCombate[]) => void;
  onRemover?: (id: string) => void;
  compacto?: boolean;
};

export default function FaixasEfeitos({
  efeitos,
  onAtualizar,
  onRemover,
  compacto = false,
}: Props) {
  if (!efeitos.length) return <p className="hx-efeitos-vazio">Nenhum efeito ativo.</p>;
  return (
    <div
      className={`hx-efeitos-lista${compacto ? ' hx-efeitos-lista--compacta' : ''}`}
      role="list"
      aria-label="Efeitos ativos"
    >
      {efeitos.map((efeito) => {
        const tipo = tipoEfeitoCombate(efeito);
        return (
          <div
            role="listitem"
            key={efeito.id}
            className={`hx-efeito-faixa hx-efeito-faixa--${tipo}`}
          >
            <span className="hx-efeito-simbolo" aria-hidden="true">
              {SIMBOLOS_EFEITO[tipo]}
            </span>
            <div className="hx-efeito-dados">
              <span className="hx-efeito-classe">{ROTULOS_EFEITO[tipo]}</span>
              <strong title={efeito.nome}>{efeito.nome}</strong>
              {efeito.origem && !compacto && (
                <small title={`Origem: ${efeito.origem}`}>Origem: {efeito.origem}</small>
              )}
            </div>
            <span className="hx-efeito-tempo" aria-label={`${efeito.turnos} turnos restantes`}>
              {efeito.turnos}
              <small>t</small>
            </span>
            {!compacto && (onAtualizar || onRemover) && (
              <div className="hx-efeito-acoes">
                {onAtualizar && (
                  <>
                    <button
                      type="button"
                      title={`Reduzir duração de ${efeito.nome}`}
                      aria-label={`Reduzir duração de ${efeito.nome}`}
                      disabled={efeito.turnos <= 1}
                      onClick={() => onAtualizar(alterarDuracaoEfeito(efeitos, efeito.id, -1))}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      title={`Aumentar duração de ${efeito.nome}`}
                      aria-label={`Aumentar duração de ${efeito.nome}`}
                      disabled={efeito.turnos >= 99}
                      onClick={() => onAtualizar(alterarDuracaoEfeito(efeitos, efeito.id, 1))}
                    >
                      +
                    </button>
                  </>
                )}
                {onRemover && (
                  <button
                    type="button"
                    className="hx-efeito-remover"
                    aria-label={`Remover ${efeito.nome}`}
                    title={`Encerrar ${efeito.nome}`}
                    onClick={() => onRemover(efeito.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
