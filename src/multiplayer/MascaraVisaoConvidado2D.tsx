import MascaraVisaoCanvas from '../lib/MascaraVisaoCanvas';
/** A cena abaixo já chegou censurada; a máscara é o mesmo desenho do mestre. */
export default function MascaraVisaoConvidado2D({
  mascara,
  poligono,
}: {
  mascara?: string;
  poligono?: readonly { x: number; y: number }[];
}) {
  return (
    <MascaraVisaoCanvas mascara={mascara} poligono={poligono} className="pm-jogo-visao-comum" />
  );
}
