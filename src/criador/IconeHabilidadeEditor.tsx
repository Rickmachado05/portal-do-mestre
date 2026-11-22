import { useState } from 'react';
import IconeDaAcao from '../hexatombe/IconeDaAcao';
import { ICONES_PRONTOS, iconeAcaoEhImagem, normalizarIconeAcao } from '../hexatombe/iconesAcao';
import './IconeHabilidadeEditor.css';

type Props = { id: string; valor?: string; aoAlterar: (icone: string) => void };
export default function IconeHabilidadeEditor({ id, valor, aoAlterar }: Props) {
  const [erro, setErro] = useState('');
  const escolhido = normalizarIconeAcao(valor);
  async function carregarArquivo(arquivo?: File) {
    if (!arquivo) return;
    setErro('');
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) ||
      arquivo.size > 3_000_000
    ) {
      setErro('Escolha PNG, JPG ou WebP de até 3 MB.');
      return;
    }
    const url = URL.createObjectURL(arquivo);
    try {
      const imagem = new Image();
      imagem.src = url;
      await imagem.decode();
      const tela = document.createElement('canvas');
      tela.width = 64;
      tela.height = 64;
      const contexto = tela.getContext('2d');
      if (!contexto) throw Error('Canvas indisponível.');
      const escala = Math.min(64 / imagem.width, 64 / imagem.height);
      const w = imagem.width * escala,
        h = imagem.height * escala;
      contexto.drawImage(imagem, (64 - w) / 2, (64 - h) / 2, w, h);
      const data = tela.toDataURL('image/webp', 0.72);
      const seguro = normalizarIconeAcao(data);
      if (!seguro) throw Error('Imagem muito grande depois do ajuste.');
      aoAlterar(seguro);
    } catch {
      setErro('Não foi possível preparar o ícone. Tente outra imagem.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <div className="hx-icone-editor">
      <div id={`${id}-icone-titulo`} className="hx-icone-editor-titulo">
        Ícone opcional da ação
      </div>
      <div
        id={`${id}-icone`}
        className="hx-icone-editor-grade"
        role="group"
        aria-labelledby={`${id}-icone-titulo`}
      >
        {ICONES_PRONTOS.map((opcao) => (
          <button
            type="button"
            key={opcao.nome}
            className={`hx-icone-opcao ${escolhido === opcao.valor ? 'ativo' : ''}`}
            aria-pressed={escolhido === opcao.valor}
            title={opcao.nome}
            onClick={() => {
              setErro('');
              aoAlterar(opcao.valor);
            }}
          >
            <span className="hx-icone-opcao-simbolo" aria-hidden="true">
              {opcao.valor || '∅'}
            </span>
            <span className="hx-icone-opcao-nome">{opcao.nome}</span>
          </button>
        ))}
      </div>
      <div className="hx-icone-editor-linha">
        <span className="hx-icone-editor-preview">
          <IconeDaAcao icone={escolhido} />
        </span>
        <label className="hx-icone-editor-arquivo">
          {iconeAcaoEhImagem(escolhido) ? '✓ Imagem personalizada' : '↥ Enviar imagem'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Enviar imagem para ícone"
            onChange={(e) => {
              void carregarArquivo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {escolhido && (
          <button
            type="button"
            className="hx-icone-editor-limpar"
            onClick={() => aoAlterar('')}
            title="Retirar ícone"
          >
            Remover ícone
          </button>
        )}
      </div>
      {erro && <small role="alert">{erro}</small>}
    </div>
  );
}
