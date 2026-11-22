import { useEffect, useRef, type CSSProperties } from 'react';
import { desenharVisaoCompartilhada3D } from '../mesa3d/desenharVisaoCompartilhada3D';
/** Canvas 2D/3D com o MESMO compositor e contorno. Recebe só o polígono
 * autorizado ou a grade de estados (0/1/2). Sem acesso a mapas privados. */
export default function MascaraVisaoCanvas({
  mascara,
  poligono,
  className,
  style,
}: {
  mascara?: string;
  poligono?: readonly { x: number; y: number }[] | null;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    desenharVisaoCompartilhada3D(
      ctx,
      poligono?.length ? { poligono, larguraMundo: 100, alturaMundo: 100 } : { estados: mascara },
    );
  }, [mascara, poligono]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={640}
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
