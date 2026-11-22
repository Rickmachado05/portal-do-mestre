import { useEffect, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import './Dados3D.css';
import { capturarDadosComAlfaSeparado } from './multiplayer/capturaDadosAlfa';
import { carregarConfigDados, opcoesDiceBox } from './DadosPersonalizacao';
import {
  activeForDie,
  getSavedDice,
  getActiveDiceMap,
  DICE_TYPE_LIST,
  type DiceSides,
  type DiceArtPackage,
  type SavedDiceArt,
} from './hexatombe/diceLibrary';
import { prepareDiceTheme } from './hexatombe/diceTheme3d';

/**
 * Hexatombe: Mesa — teste do Dice Box oficial (Babylon.js + Ammo.js).
 * Este componente preserva a assinatura usada pelo App.tsx desde a v0.3.11.
 * NÃO sorteia números nem os obtém da câmera: usa os resultados do Dice Box.
 */
export type AcabamentoDados = 'classico' | 'obsidiana' | 'jade' | 'oceano' | 'brasa';

type Props = {
  faces: number;
  valores: number[]; // A quantidade vem daqui; os valores são calculados pelo motor.
  acabamento?: AcabamentoDados;
  /** Limite de assentamento do Dice Box para a Mesa 3D do mestre. */
  tempoAssentamentoMs?: number;
  onResultado?: (valores: number[]) => void;
  onGravacao?: (video: Blob) => void | Promise<void>;
  /** Transmite o canvas original via WebRTC enquanto a física acontece. */
  onStream?: (stream: MediaStream) => void | Promise<void>;
  onFimStream?: () => void;
  /** Apenas reprodução visual de uma rolagem oficial da sala; não altera o histórico. */
  reproducao?: {
    id: string;
    valoresOficiais: number[];
    arte?: DiceArtPackage | null;
    acabamento?: AcabamentoDados;
    usarMinhaAparencia?: boolean;
  };
  onErro?: (mensagem: string) => void;
};

/**
 * Dice Box 1.1.4: roll() resolve uma lista PLANA de resultados individuais.
 * getRollResults() e onRollComplete retornam grupos com a propriedade rolls.
 * Os dois formatos são suportados pelo leitor.
 */
type ResultadoIndividual = { value?: unknown; result?: unknown; sides?: unknown };
type ResultadoGrupo = { rolls?: unknown };

type Motor = InstanceType<typeof DiceBox>;

const CORES: Record<AcabamentoDados, string> = {
  classico: '#80639A',
  obsidiana: '#323848',
  jade: '#3A8F77',
  oceano: '#386EA9',
  brasa: '#B25742',
};

/** ID de tema estável: uma mesma pintura recebida reutiliza o atlas local, sem
 * registrar o conjunto do convidado como dado pessoal no navegador alheio. */
function idArteCompartilhada(art: DiceArtPackage): string {
  const data = JSON.stringify(art);
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
  return `mp-${art.type}-${(hash >>> 0).toString(36)}`;
}

const HOST_ID = 'hexatombe-dicebox-oficial-palco';
let motorPromise: Promise<Motor> | null = null;
let tokenEmUso = 0;

function obterPalco(): HTMLDivElement {
  let palco = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (!palco) {
    palco = document.createElement('div');
    palco.id = HOST_ID;
    palco.className = 'hexatombe-dicebox-oficial';
    palco.setAttribute('aria-hidden', 'true');
    document.body.appendChild(palco);
  }
  return palco;
}

async function obterMotor(): Promise<Motor> {
  if (!motorPromise) {
    obterPalco();
    const instancia = new DiceBox({
      container: `#${HOST_ID}`,
      assetPath: '/assets/dice-box/',
      theme: 'default',
      scale: 5,
      throwForce: 6,
      spinForce: 4,
      gravity: 1,
      settleTimeout: 6000,
      enableShadows: true,
      offscreen: false,
    });
    motorPromise = instancia
      .init()
      .then(() => instancia)
      .catch((erro: unknown) => {
        motorPromise = null;
        throw erro;
      });
  }
  return motorPromise;
}

/**
 * Em @3d-dice/dice-box 1.1.4, await motor.roll('2d6') retorna, em geral:
 * [ { sides: 6, value: 3, groupId: 0, rollId: 0 }, { sides: 6, value: 5, ... } ]
 * Diferente de motor.getRollResults() / onRollComplete, que retornam grupos:
 * [ { qty: 2, sides: 6, rolls: [{value:3}, {value:5}], value:8 } ]
 *
 * Antes a função só aceitava o segundo formato: por isso "0 dados".
 * Se a biblioteca retornar inesperadamente outra estrutura, mostra erro;
 * NUNCA gera números fictícios no lugar dos dados renderizados.
 */
export function lerValoresDiceBox(retorno: unknown, quantidade: number, faces: number): number[] {
  const entrada: unknown[] = Array.isArray(retorno)
    ? retorno
    : retorno && typeof retorno === 'object'
      ? [retorno]
      : [];

  const individuais: ResultadoIndividual[] = entrada.flatMap((item): ResultadoIndividual[] => {
    if (!item || typeof item !== 'object') return [];
    const grupo = item as ResultadoGrupo;
    if (Array.isArray(grupo.rolls)) {
      return grupo.rolls.filter((dado): dado is ResultadoIndividual =>
        Boolean(dado && typeof dado === 'object'),
      );
    }
    const dado = item as ResultadoIndividual;
    return 'value' in dado || 'result' in dado ? [dado] : [];
  });

  if (individuais.length !== quantidade) {
    const formato = Array.isArray(retorno) ? 'array' : typeof retorno;
    const chaves =
      entrada[0] && typeof entrada[0] === 'object' ? Object.keys(entrada[0]).join(', ') : 'nenhuma';
    throw new Error(
      `O motor devolveu ${individuais.length} resultado(s); eram esperados ${quantidade}. ` +
        `Formato: ${formato}; propriedades do primeiro item: ${chaves}. Confira o Console (F12).`,
    );
  }

  return individuais.map((dado, indice) => {
    const bruto = dado.value ?? dado.result;
    const numero = typeof bruto === 'number' ? bruto : Number(bruto);
    const normalizado = faces === 100 && numero === 0 ? 100 : numero;
    if (!Number.isInteger(normalizado) || normalizado < 1 || normalizado > faces) {
      throw new Error(`Valor inválido no dado ${indice + 1}: ${String(bruto)}.`);
    }
    return normalizado;
  });
}

export default function Dados3D({
  faces,
  valores,
  acabamento = 'classico',
  tempoAssentamentoMs,
  onResultado,
  onGravacao,
  onStream,
  onFimStream,
  reproducao,
  onErro,
}: Props) {
  const [estado, setEstado] = useState('Preparando dados 3D…');
  const [erro, setErro] = useState('');
  const callback = useRef(onResultado);
  callback.current = onResultado;
  const gravacaoCallback = useRef(onGravacao);
  gravacaoCallback.current = onGravacao;
  const streamCallback = useRef(onStream);
  streamCallback.current = onStream;
  const fimStreamCallback = useRef(onFimStream);
  fimStreamCallback.current = onFimStream;
  const erroCallback = useRef(onErro);
  erroCallback.current = onErro;
  const quantidade = valores.length;

  useEffect(() => {
    const token = ++tokenEmUso;
    const palco = obterPalco();
    let encerrado = false;

    async function executar() {
      try {
        if (!reproducao && !callback.current) {
          throw new Error(
            'Esta rolagem precisa de onResultado para registrar o Dice Box original.',
          );
        }
        if (![4, 6, 8, 10, 12, 20, 100].includes(faces) || quantidade < 1 || quantidade > 12) {
          throw new Error('Use de 1 a 12 dados: d4, d6, d8, d10, d12, d20 ou d100.');
        }
        if (
          reproducao &&
          (reproducao.valoresOficiais.length !== quantidade ||
            reproducao.valoresOficiais.some((v) => !Number.isInteger(v) || v < 1 || v > faces))
        ) {
          throw new Error('Resultado oficial inconsistente com a fórmula desta rolagem.');
        }
        const motor = await obterMotor();
        if (encerrado || token !== tokenEmUso) return;
        // Reprodução multiplayer e rolagem local compartilham exatamente o
        // mesmo Dice Box oficial (Babylon/Ammo), não motores THREE paralelos.
        const usarPreferenciaLocal = !reproducao || reproducao.usarMinhaAparencia;
        const escolha =
          usarPreferenciaLocal &&
          DICE_TYPE_LIST.includes(faces as DiceSides) &&
          getActiveDiceMap()[String(faces)]
            ? activeForDie(faces as DiceSides)
            : null;
        let tema = 'default';
        const antigo = localStorage.getItem(
          'hexatombe-mesa-acabamento-dados',
        ) as AcabamentoDados | null;
        const acabamentoAtual = reproducao?.acabamento ?? acabamento;
        let cor = CORES[!reproducao && antigo && antigo in CORES ? antigo : acabamentoAtual];
        if (reproducao?.arte && reproducao.arte.type === faces) {
          setEstado('Preparando pintura compartilhada…');
          const art = reproducao.arte;
          const id = idArteCompartilhada(art);
          const data = '2026-01-01T00:00:00.000Z';
          const item: SavedDiceArt = { id, art, createdAt: data, updatedAt: data };
          tema = await prepareDiceTheme(item);
          cor = art.baseColor;
        } else if (escolha?.kind === 'custom') {
          const item = await getSavedDice(escolha.id);
          if (item && item.art.type === faces) {
            setEstado('Preparando textura personalizada…');
            const unitsChoice = faces === 100 ? activeForDie(10) : null;
            const companion =
              unitsChoice?.kind === 'custom' ? await getSavedDice(unitsChoice.id) : undefined;
            tema = await prepareDiceTheme(item, companion?.art.type === 10 ? companion : undefined);
            cor = item.art.baseColor;
          }
        } else if (escolha?.kind === 'preset') {
          const coresTema: Record<string, string> = {
            marmore: CORES.classico,
            obsidiana: CORES.obsidiana,
            jade: CORES.jade,
            oceano: CORES.oceano,
            brasa: CORES.brasa,
          };
          cor = coresTema[escolha.id] ?? cor;
        }
        if (encerrado || token !== tokenEmUso) return;
        // O tema muda o atlas; gravidade, quique e resultado permanecem do Dice Box.
        await motor.updateConfig({
          ...opcoesDiceBox(carregarConfigDados(), faces, cor),
          // A pintura transmitida pelo autor prevalece sobre a cor local.
          ...(reproducao?.arte ? { themeColor: cor } : {}),
          // O motor é global/reutilizado: restaurar 6 s nas outras mesas,
          // em vez de herdar o ajuste de 4,2 s da Mesa 3D do mestre.
          settleTimeout: tempoAssentamentoMs
            ? Math.max(3000, Math.min(6000, tempoAssentamentoMs))
            : 6000,
          theme: tema,
        });
        palco.style.visibility = 'visible';
        setEstado('');
        // Capturar o canvas real durante o mesmo lançamento, sem segundo sorteio.
        let gravador: MediaRecorder | undefined;
        let stream: MediaStream | undefined;
        let pararComposicao: (() => void) | undefined;
        let fragmentos: Blob[] = [];
        try {
          const canvas = palco.querySelector('canvas');
          const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(
            (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
          );
          if (
            (gravacaoCallback.current || streamCallback.current) &&
            canvas &&
            typeof canvas.captureStream === 'function'
          ) {
            const captura = capturarDadosComAlfaSeparado(canvas, 30);
            stream = captura.stream;
            pararComposicao = captura.parar;
            if (gravacaoCallback.current && mime) {
              gravador = new MediaRecorder(stream, {
                mimeType: mime,
                videoBitsPerSecond: 2_800_000,
              });
              gravador.ondataavailable = (e) => {
                if (e.data.size) fragmentos.push(e.data);
              };
              gravador.start(250);
            }
          } else if (gravacaoCallback.current || streamCallback.current) {
            console.warn(
              '[Dice Box] Captura indisponível neste navegador (canvas ou MediaRecorder).',
            );
          }
        } catch (e) {
          console.warn('[Dice Box] Captura indisponível:', e);
        }
        if (stream && streamCallback.current) {
          // Aguarda brevemente ofertas/ICE para os espectadores entrarem antes
          // dos dados caírem. Um problema de rede NUNCA bloqueia o lançamento.
          const transmissao = Promise.resolve()
            .then(() => streamCallback.current?.(stream!))
            .catch((e) => console.warn('[Portal/Dados ao vivo] Conexão direta indisponível:', e));
          await Promise.race([
            transmissao,
            new Promise<void>((resolve) => window.setTimeout(resolve, 950)),
          ]);
        }
        let resultado: unknown;
        try {
          resultado = await motor.roll(`${quantidade}d${faces}`);
        } finally {
          if (gravador && gravador.state !== 'inactive') {
            await new Promise<void>((resolve) => {
              gravador!.onstop = () => resolve();
              gravador!.onerror = () => resolve();
              window.setTimeout(() => {
                try {
                  gravador!.stop();
                } catch {
                  resolve();
                }
              }, 350);
            });
            const video = new Blob(fragmentos, { type: gravador.mimeType.split(';')[0] });
            if (!encerrado && token === tokenEmUso && video.size > 100 && video.size <= 5_000_000) {
              try {
                void Promise.resolve(gravacaoCallback.current?.(video)).catch((e) =>
                  console.warn('[Dice Box] Falha ao compartilhar:', e),
                );
              } catch (e) {
                console.warn('[Dice Box] Falha ao compartilhar:', e);
              }
            } else if (gravacaoCallback.current) {
              console.warn(`[Dice Box] Captura descartada: ${video.size} bytes (limite 5 MB).`);
            }
          }
          if (stream && streamCallback.current) {
            try {
              fimStreamCallback.current?.();
            } catch (e) {
              console.warn('[Portal/Dados ao vivo] Falha ao encerrar transmissão:', e);
            }
          }
          pararComposicao?.();
          stream?.getTracks().forEach((t) => t.stop());
          fragmentos = [];
        }
        if (encerrado || token !== tokenEmUso) return;
        // O resultado de convidados é calculado e validado pelo servidor.
        // O Dice Box 1.1.x ainda não aceita impor faces predefinidas à física;
        // portanto a reprodução não deve sobrescrever o valor oficial.
        if (reproducao) {
          setEstado('');
        } else {
          const numeros = lerValoresDiceBox(resultado, quantidade, faces);
          setEstado('');
          callback.current?.(numeros);
        }
      } catch (falha) {
        if (encerrado || token !== tokenEmUso) return;
        console.error('[Hexatombe/DiceBox] Falha no lançamento:', falha);
        const mensagem = falha instanceof Error ? falha.message : String(falha);
        setErro(mensagem);
        erroCallback.current?.(mensagem);
        setEstado('');
      }
    }

    void executar();
    return () => {
      encerrado = true;
      if (tokenEmUso === token) {
        ++tokenEmUso;
        palco.style.visibility = 'hidden';
      }
    };
    // Quantidade e lados definem esta rolagem; acabamento é aplicado no início dela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, quantidade, reproducao?.id, tempoAssentamentoMs]);

  return (
    <div className="dados3d-palco dados3d-oficial-placeholder" role="status" aria-live="polite">
      {estado && <span className="dados3d-oficial-status">{estado}</span>}
      {erro && (
        <div className="dados3d-fallback">
          <strong>Não foi possível lançar os dados.</strong>
          <p>{erro}</p>
          <small>Confira os assets em public/assets/dice-box e o Console (F12).</small>
        </div>
      )}
    </div>
  );
}
