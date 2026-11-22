import { useState } from 'react';
import type { FichaPortalImpeto, NomeAtributo, NomePericia } from '../impeto/contrato';
import { NOMES_ATRIBUTOS, NOMES_PERICIAS } from '../impeto/contrato';

// Referências de dificuldade do Ímpeto RPG 1.0 (playtest). Não mudar as CDs pela interface.
const dificuldades = [
  { cd: 15, rotulo: 'Simples' },
  { cd: 20, rotulo: 'Moderada' },
  { cd: 25, rotulo: 'Difícil' },
  { cd: 30, rotulo: 'Muito difícil' },
  { cd: 35, rotulo: 'Excepcional' },
] as const;

/** O mestre escolhe o atributo segundo a abordagem; perícia acrescenta +0/+2/+4. */
export default function TestesImpeto({
  ficha,
  nome,
  onRolar,
}: {
  ficha: FichaPortalImpeto;
  nome: string;
  onRolar: (formula: string, rotulo: string) => void;
}) {
  const [atributo, setAtributo] = useState<NomeAtributo>('Percepção');
  const [pericia, setPericia] = useState<NomePericia>('Atenção');
  const valorAtributo = ficha.atributos[atributo];
  const bonusPericia = ficha.pericias[pericia] * 2;
  const bonus = valorAtributo + bonusPericia;

  return (
    <section className="impeto-a01-testes" aria-label="Rolagem de perícia">
      <header className="impeto-a01-testes-cabecalho">
        <span className="impeto-a01-testes-icone" aria-hidden="true">
          ⚄
        </span>
        <div>
          <h3>Rolagem de perícia</h3>
          <p>Escolha um atributo e uma perícia. O mestre define a dificuldade.</p>
        </div>
      </header>
      <div className="impeto-a01-testes-campos">
        <label>
          Atributo
          <select
            value={atributo}
            onChange={(evento) => setAtributo(evento.target.value as NomeAtributo)}
          >
            {NOMES_ATRIBUTOS.map((a) => (
              <option key={a} value={a}>
                {a} ({ficha.atributos[a]})
              </option>
            ))}
          </select>
        </label>
        <label>
          Perícia
          <select
            value={pericia}
            onChange={(evento) => setPericia(evento.target.value as NomePericia)}
          >
            {NOMES_PERICIAS.map((a) => (
              <option key={a} value={a}>
                {a} (+{ficha.pericias[a] * 2})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="impeto-a01-testes-resultado" aria-live="polite">
        <span>Seu bônus neste teste</span>
        <strong>+{bonus}</strong>
        <small>
          1d20 + {valorAtributo} (atributo) + {bonusPericia} (perícia)
        </small>
      </div>
      <button
        className="impeto-a01-testes-rolar"
        type="button"
        onClick={() => onRolar(`1d20+${bonus}`, `${nome} · ${atributo} + ${pericia} (+${bonus})`)}
      >
        <span aria-hidden="true">⚄</span> Rolar teste (+{bonus})
      </button>
      <div className="impeto-a01-testes-dificuldades">
        <strong>Dificuldade de referência</strong>
        <div className="impeto-a01-testes-cds" aria-label="Classes de dificuldade sugeridas">
          {dificuldades.map(({ cd, rotulo }) => (
            <span key={cd} className="impeto-a01-cd">
              <b>CD {cd}</b>
              <small>{rotulo}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
