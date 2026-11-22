import { iconeAcaoEhImagem, normalizarIconeAcao } from './iconesAcao';
import './IconeDaAcao.css';
export default function IconeDaAcao({ icone, classe = '' }: { icone?: string; classe?: string }) {
  const seguro = normalizarIconeAcao(icone);
  if (!seguro) return null;
  return (
    <span className={`hx-icone-acao ${classe}`} aria-hidden="true">
      {iconeAcaoEhImagem(seguro) ? <img src={seguro} alt="" /> : seguro}
    </span>
  );
}
