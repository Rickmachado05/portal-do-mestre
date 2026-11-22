import { useEffect, useState } from 'react';
import { imagemItemValida } from './imagensItens';
import type { CategoriaItem } from './itensLibrary';
import './ImagemItem.css';

const SIMBOLOS: Record<CategoriaItem, string> = {
  arma: '⚔️',
  consumivel: '🧪',
  comida: '🍞',
  acampamento: '⛺',
  equipamento: '🛡️',
  material: '🧰',
  documento: '📜',
  outro: '📦',
};

type Props = { imagem?: string; categoria: CategoriaItem; nome: string; className?: string };
/** Ícone visual compartilhado pelo catálogo, prévia do editor e inventários. */
export default function ImagemItem({ imagem, categoria, nome, className = '' }: Props) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [imagem]);
  return (
    <span className={`pm-item-thumb ${className}`}>
      {imagemItemValida(imagem) && !falhou ? (
        <img
          src={imagem}
          alt={`Ilustração de ${nome || 'item'}`}
          loading="lazy"
          decoding="async"
          onError={() => setFalhou(true)}
        />
      ) : (
        <span
          className="pm-item-thumb-fallback"
          role="img"
          aria-label={`Ícone da categoria ${categoria}`}
        >
          {SIMBOLOS[categoria] || SIMBOLOS.outro}
        </span>
      )}
    </span>
  );
}
