/** Mostra imagens e GIFs sem converter, recortar ou substituir o arquivo original. */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { normalizarAjusteRetrato, encaixeAutomatico } from './retratoAjuste';
import type { AjusteRetrato } from './retratoAjuste';
export { AJUSTE_RETRATO_PADRAO, normalizarAjusteRetrato, encaixeAutomatico } from './retratoAjuste';
export type { AjusteRetrato, ModoRetrato } from './retratoAjuste';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  ajuste?: Partial<AjusteRetrato> | null;
};
export default function ImagemRetrato({ src, ajuste, style, onLoad, ...resto }: Props) {
  const imagem = useRef<HTMLImageElement>(null);
  const [automatico, setAutomatico] = useState<'cover' | 'contain'>('cover');
  const a = normalizarAjusteRetrato(ajuste);
  useEffect(() => {
    const img = imagem.current;
    if (!img) return;
    const pai = img.parentElement;
    if (!pai) return;
    const atualizar = () =>
      setAutomatico(
        encaixeAutomatico(img.naturalWidth, img.naturalHeight, pai.clientWidth, pai.clientHeight),
      );
    atualizar();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(atualizar);
    observer.observe(pai);
    return () => observer.disconnect();
  }, [src]);
  const estilo: CSSProperties = {
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    maxWidth: 'none',
    display: 'block',
    objectPosition: 'center',
    objectFit: a.modo === 'conter' ? 'contain' : a.modo === 'preencher' ? 'cover' : automatico,
    transform: `translate(${a.x}%, ${a.y}%) scale(${a.zoom}) scaleX(${a.largura / 100}) scaleY(${a.altura / 100})`,
    transformOrigin: 'center',
    ...style,
  };
  return (
    <img
      {...resto}
      loading={resto.loading ?? 'lazy'}
      decoding={resto.decoding ?? 'async'}
      ref={imagem}
      src={src}
      style={estilo}
      onLoad={(e) => {
        const img = e.currentTarget,
          pai = img.parentElement;
        if (pai)
          setAutomatico(
            encaixeAutomatico(
              img.naturalWidth,
              img.naturalHeight,
              pai.clientWidth,
              pai.clientHeight,
            ),
          );
        onLoad?.(e);
      }}
    />
  );
}
