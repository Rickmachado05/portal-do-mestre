import { useEffect, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { carregarConfigDados, opcoesDiceBox } from '../DadosPersonalizacao';
import { lerValoresDiceBox } from '../Dados3D';
import {
  activeForDie,
  getSavedDice,
  DICE_SYNC_EVENT,
  DICE_SYNC_KEY,
  DICE_TYPE_LIST,
  type DiceSides,
} from './diceLibrary';
import { prepareDiceTheme } from './diceTheme3d';

type TestMotor = InstanceType<typeof DiceBox> & {
  show?: () => void;
  hide?: () => void;
  resizeWorld?: () => void;
};
const COLORS: Record<string, string> = {
  marmore: '#80639A',
  obsidiana: '#323848',
  jade: '#3A8F77',
  oceano: '#386EA9',
  brasa: '#B25742',
};
const DEFAULT_COLOR = '#80639A';

/** Simulação 3D independente: NÃO chama o sistema de rolagem, o diário ou o histórico da mesa. */
export default function CaixaTestesDados({ aberto }: { aberto: boolean }) {
  const [faces, setFaces] = useState<DiceSides>(20);
  const [quantidade, setQuantidade] = useState(1);
  const [resultado, setResultado] = useState<number[] | null>(null);
  const [status, setStatus] = useState('Pronto para experimentar seus dados.');
  const [rodando, setRodando] = useState(false);
  const [aparencia, setAparencia] = useState('Tema padrão');
  const enginePromise = useRef<Promise<TestMotor> | null>(null);
  const engine = useRef<TestMotor | null>(null);
  const token = useRef(0);

  useEffect(() => {
    if (aberto) {
      // O canvas é fixo no laboratório: não recriamos o WebGL ao alternar abas.
      engine.current?.show?.();
      requestAnimationFrame(() => engine.current?.resizeWorld?.());
    } else {
      token.current += 1;
      engine.current?.clear();
      engine.current?.hide?.();
      setRodando(false);
    }
  }, [aberto]);

  useEffect(() => {
    const onChange = () => setAparencia('Seleção atualizada · teste novamente');
    window.addEventListener(DICE_SYNC_EVENT, onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key === DICE_SYNC_KEY) onChange();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DICE_SYNC_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  function getEngine(): Promise<TestMotor> {
    if (!enginePromise.current) {
      const instance = new DiceBox({
        container: '#hx-tray-dice-stage',
        assetPath: '/assets/dice-box/',
        theme: 'default',
        scale: 4.5,
        throwForce: 6,
        spinForce: 4,
        gravity: 1,
        enableShadows: true,
        offscreen: false,
        settleTimeout: 6000,
      }) as TestMotor;
      enginePromise.current = instance
        .init()
        .then(() => {
          engine.current = instance;
          instance.show?.();
          instance.resizeWorld?.();
          return instance;
        })
        .catch((error) => {
          enginePromise.current = null;
          engine.current = null;
          throw error;
        });
    }
    return enginePromise.current;
  }

  async function rolar() {
    if (rodando || !aberto) return;
    const myToken = ++token.current;
    setResultado(null);
    setRodando(true);
    setStatus('Preparando o dado para o teste…');
    try {
      const instance = await getEngine();
      if (myToken !== token.current) return;
      const selected = activeForDie(faces);
      let theme = 'default';
      let color = DEFAULT_COLOR;
      let name = 'Tema padrão';
      if (selected.kind === 'custom') {
        const item = await getSavedDice(selected.id);
        if (!item || item.art.type !== faces)
          throw Error('O dado selecionado não está mais na biblioteca. Escolha outro.');
        const companionSelection = faces === 100 ? activeForDie(10) : null;
        const companion =
          companionSelection?.kind === 'custom'
            ? await getSavedDice(companionSelection.id)
            : undefined;
        theme = await prepareDiceTheme(item, companion?.art.type === 10 ? companion : undefined);
        color = item.art.baseColor;
        name = item.art.name;
      } else if (selected.kind === 'preset') {
        color = COLORS[selected.id] ?? DEFAULT_COLOR;
        name =
          (
            {
              marmore: 'Mármore',
              obsidiana: 'Obsidiana',
              jade: 'Jade',
              oceano: 'Oceano',
              brasa: 'Brasa',
            } as Record<string, string>
          )[selected.id] || 'Tema padrão';
      }
      if (myToken !== token.current) return;
      setAparencia(name);
      await instance.updateConfig({ ...opcoesDiceBox(carregarConfigDados(), faces, color), theme });
      if (myToken !== token.current) return;
      instance.show?.();
      setStatus('Rolando dentro da caixa…');
      // Os números vêm exclusivamente da simulação física, como na mesa principal.
      const raw = await instance.roll(`${quantidade}d${faces}`);
      if (myToken !== token.current) return;
      const valores = lerValoresDiceBox(raw, quantidade, faces);
      setResultado(valores);
      setStatus('Teste concluído. Esta rolagem não entrou na campanha.');
    } catch (error) {
      if (myToken !== token.current) return;
      setStatus(
        `Não foi possível testar: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      if (myToken === token.current) setRodando(false);
    }
  }

  return (
    <section
      className={`hx-test-lab ${aberto ? 'hx-test-lab-open' : ''}`}
      aria-label="Caixa de testes de dados"
      hidden={!aberto}
    >
      <div className="hx-test-info">
        <div>
          <span className="hx-dice-overline">LABORATÓRIO · SIMULAÇÃO SEPARADA</span>
          <h3>Caixa de testes</h3>
          <p>
            Experimente texturas e física em um espaço fechado, sem lançar dados sobre o mapa ou
            alterar o histórico.
          </p>
        </div>
        <span className="hx-test-badge">Modo seguro</span>
      </div>
      <div className="hx-test-tools">
        <fieldset aria-label="Tipo do dado">
          <legend>Tipo de dado</legend>
          <div className="hx-test-types">
            {DICE_TYPE_LIST.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={faces === value}
                onClick={() => {
                  setFaces(value);
                  setResultado(null);
                }}
                disabled={rodando}
              >
                D{value}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="hx-test-count">
          Quantidade
          <select
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            disabled={rodando}
          >
            {[1, 2, 3, 4].map((n) => (
              <option value={n} key={n}>
                {n} {n === 1 ? 'dado' : 'dados'}
              </option>
            ))}
          </select>
        </label>
        <button
          className="hx-test-roll"
          onClick={() => void rolar()}
          disabled={rodando}
          type="button"
        >
          {rodando ? 'Rolando…' : '⚄  Rolar na caixa'}
        </button>
      </div>
      <div className="hx-test-stage-shell">
        <div
          className="hx-test-stage"
          id="hx-tray-dice-stage"
          aria-label="Área tridimensional de testes"
        >
          <span className="hx-test-stage-watermark" aria-hidden="true">
            ✧
          </span>
        </div>
        <div className="hx-test-stage-corner">HEXATOMBE · ÁREA DE TESTES</div>
      </div>
      <div className="hx-test-feedback" role="status" aria-live="polite">
        <div>
          <span>Aparência</span>
          <strong>{aparencia}</strong>
        </div>
        <div>
          <span>Resultado isolado</span>
          <strong>
            {resultado ? `${resultado.join(' + ')} = ${resultado.reduce((a, b) => a + b, 0)}` : '—'}
          </strong>
        </div>
      </div>
      <p className="hx-test-status" role="status">
        {status}
      </p>
    </section>
  );
}
