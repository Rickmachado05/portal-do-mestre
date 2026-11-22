import { useId, type ReactNode } from 'react';
import { estiloEnquadramento, type EnquadramentoImagem } from './enquadramentoToken';
import { pontoString, type Ponto } from './lighting';
import TokenIdle from './TokenIdle';
import './CenaVisual2D.css';

/**
 * Visual independente do papel da pessoa: mestre e convidado compartilham
 * exatamente as mesmas camadas, sem duplicar filtros e vinhetas no CSS.
 * Controles, nevoa privada e autorizacoes continuam com seus proprietarios.
 */
export function FundoCena2D({
  imagem,
  alt = 'Imagem do cenário',
}: {
  imagem?: string | null;
  alt?: string;
}) {
  return (
    <div className="pm-cena2d-fundo" aria-hidden="true">
      {imagem && <img src={imagem} alt={alt} draggable={false} />}
      <span className="pm-cena2d-tom" />
      <span className="pm-cena2d-vinheta" />
    </div>
  );
}

export type LuzVisual2D = {
  id: string;
  x: number;
  y: number;
  alcance: number;
  cor: string;
  ativa?: boolean;
  pontos?: Ponto[];
};
export function IluminacaoCena2D({
  ativa,
  ambiente = 40,
  luzes,
  largura,
  altura,
}: {
  ativa?: boolean;
  ambiente?: number;
  luzes: LuzVisual2D[];
  largura: number;
  altura: number;
}) {
  const sufixo = useId().replaceAll(':', '');
  if (!ativa || largura <= 0 || altura <= 0) return null;
  const fontes = luzes.filter((l) => l.ativa !== false);
  const opacidade = (0.95 * (100 - Math.max(0, Math.min(100, ambiente)))) / 100;
  const raio = (l: LuzVisual2D) => (l.alcance * largura) / 100;
  const area = (l: LuzVisual2D) => (l.pontos?.length ? pontoString(l.pontos) : '');
  return (
    <svg
      className="pm-cena2d-iluminacao"
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <mask
          id={`${sufixo}-mascara`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={largura}
          height={altura}
        >
          <rect width={largura} height={altura} fill="white" />
          {fontes.map((f, i) =>
            f.pontos?.length ? (
              <polygon key={i} points={area(f)} fill="black" />
            ) : (
              <circle
                key={i}
                cx={(f.x * largura) / 100}
                cy={(f.y * altura) / 100}
                r={raio(f)}
                fill="black"
              />
            ),
          )}
        </mask>
        {fontes.map((f, i) => (
          <radialGradient
            key={i}
            id={`${sufixo}-grad-${i}`}
            gradientUnits="userSpaceOnUse"
            cx={(f.x * largura) / 100}
            cy={(f.y * altura) / 100}
            r={raio(f)}
          >
            <stop offset="0%" stopColor={f.cor} stopOpacity=".16" />
            <stop offset="100%" stopColor={f.cor} stopOpacity="0" />
          </radialGradient>
        ))}
        {fontes.map(
          (f, i) =>
            f.pontos?.length && (
              <clipPath key={i} id={`${sufixo}-clip-${i}`} clipPathUnits="userSpaceOnUse">
                <polygon points={area(f)} />
              </clipPath>
            ),
        )}
      </defs>
      <rect
        width={largura}
        height={altura}
        fill="#000310"
        opacity={opacidade}
        mask={`url(#${sufixo}-mascara)`}
      />
      {fontes.map((f, i) => (
        <circle
          key={i}
          cx={(f.x * largura) / 100}
          cy={(f.y * altura) / 100}
          r={raio(f)}
          fill={`url(#${sufixo}-grad-${i})`}
          clipPath={f.pontos?.length ? `url(#${sufixo}-clip-${i})` : undefined}
        />
      ))}
    </svg>
  );
}

/** O mesmo rosto e etiqueta do token; o envoltorio fornece apenas as permissoes. */
export function CorpoTokenCena2D({
  nome,
  imagem,
  imagemAlternativa,
  animado = false,
  pausado = false,
  velocidade = 1,
  enquadramento,
  ocultarNome = false,
  sufixoNome,
  controles,
}: {
  nome: string;
  imagem?: string | null;
  imagemAlternativa?: string | null;
  animado?: boolean;
  pausado?: boolean;
  velocidade?: number;
  enquadramento?: Partial<EnquadramentoImagem> | null;
  ocultarNome?: boolean;
  sufixoNome?: string;
  controles?: ReactNode;
}) {
  return (
    <>
      <span className="token-rosto">
        <span className="token-arte" style={estiloEnquadramento(enquadramento)}>
          {imagem ? (
            <TokenIdle
              src={imagem}
              alt=""
              animado={animado}
              pausado={pausado}
              velocidade={velocidade}
            />
          ) : imagemAlternativa ? (
            <img src={imagemAlternativa} alt="" draggable={false} />
          ) : (
            nome.slice(0, 1)
          )}
        </span>
        {controles}
      </span>
      {!ocultarNome && (
        <span className="token-nome">
          {nome}
          {sufixoNome || ''}
        </span>
      )}
    </>
  );
}
