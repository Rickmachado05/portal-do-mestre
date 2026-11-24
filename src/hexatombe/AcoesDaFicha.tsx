import { useState } from 'react';
import type { FichaDados } from './fichasLibrary';
import { formulaRolavelDaFicha } from './rolagensDaFicha';
import IconeDaAcao from './IconeDaAcao';
import IconeHabilidadeEditor from '../criador/IconeHabilidadeEditor';
import {
  CATEGORIAS_ACAO,
  permiteRolarEfeito,
  precisaTesteContraCA,
  type FiltroAcao,
} from './logicaAcoesDaFicha';
import { listarAcoesDaFicha, type AcaoDaFicha } from './acoesFichaDados';

type Props = {
  ficha?: FichaDados;
  nomePersonagem: string;
  onRolar: (formula: string, nomeAcao: string, iconeAcao?: string) => void;
  onEditarIcone?: (idAcao: string, icone: string) => void;
};
function CartaoAcao({
  acao,
  onRolar,
  onEditarIcone,
}: {
  acao: AcaoDaFicha;
  onRolar: Props['onRolar'];
  onEditarIcone?: Props['onEditarIcone'];
}) {
  const [mostrarDescricao, setMostrarDescricao] = useState(false);
  const [editarIcone, setEditarIcone] = useState(false);
  const formula = permiteRolarEfeito(acao.categoria) ? formulaRolavelDaFicha(acao.valor) : null;
  const podeTeste = acao.exigeCA ?? precisaTesteContraCA(acao.categoria);
  const temDescricao = Boolean(acao.descricao?.trim() || acao.restricoes?.trim());
  return (
    <article className="hx-acao-ficha hx-acao-compacta" data-categoria={acao.categoria}>
      <div className="hx-acao-ficha-cabecalho">
        <div className="hx-acao-ficha-identidade">
          <span className="hx-acao-icone-local">
            {acao.icone ? (
              <IconeDaAcao icone={acao.icone} />
            ) : (
              <span className="hx-icone-ausente" aria-hidden="true">
                ✦
              </span>
            )}
          </span>
          <div>
            <strong>{acao.titulo}</strong>
            <span>
              {acao.tipo}
              {(acao.fonte === 'a01' || acao.fonte === 'universal')
                ? ` · ${acao.enIndefinida ? 'EN a definir' : `${acao.custo ?? 0} EN`}${acao.pc !== undefined ? ` · ${acao.pc} PC` : ''}${acao.px !== undefined ? ` · ${acao.px} PX` : ''}`
                : typeof acao.custo === 'number' && acao.custo > 0
                  ? ` · ${acao.custo} Mana/Foco`
                  : ''}
            </span>
          </div>
        </div>
        {acao.valor && <span className="hx-acao-ficha-valor">{acao.valor}</span>}
      </div>
      <div className="hx-acao-ficha-botoes">
        {podeTeste && (
          <button
            type="button"
            onClick={() => onRolar('1d20', `${acao.titulo} · acerto contra CA`, acao.icone)}
            title="Teste contra CA; não aplica dano automaticamente"
          >
            ⚄ Teste CA
          </button>
        )}
        {formula && (
          <button
            className="botao-primario"
            type="button"
            onClick={() =>
              onRolar(
                formula,
                `${acao.titulo} · ${acao.categoria === 'cura' ? 'cura' : 'efeito'}`,
                acao.icone,
              )
            }
            title={`Rolar ${formula}`}
          >
            ⚄ Rolar {formula}
          </button>
        )}
        {temDescricao && (
          <button
            type="button"
            className="hx-acao-mais"
            onClick={() => setMostrarDescricao((v) => !v)}
            aria-expanded={mostrarDescricao}
          >
            {mostrarDescricao ? 'Ocultar descrição' : 'Ver descrição'}
          </button>
        )}
        {onEditarIcone && (
          <button
            type="button"
            className="hx-acao-editar-icone"
            onClick={() => setEditarIcone((v) => !v)}
            aria-expanded={editarIcone}
            title="Escolher ícone que aparece nesta habilidade e nas rolagens"
          >
            ✧ Ícone
          </button>
        )}
      </div>
      {mostrarDescricao && temDescricao && (
        <div className="hx-acao-descricao" aria-label={`Descrição de ${acao.titulo}`}>
          {acao.descricao?.trim() && <p className="hx-acao-ficha-texto">{acao.descricao}</p>}
          {acao.restricoes?.trim() && (
            <p className="hx-acao-ficha-texto hx-acao-ficha-restricoes">
              Limitações: {acao.restricoes}
            </p>
          )}
        </div>
      )}
      {editarIcone && onEditarIcone && (
        <div className="hx-acao-editor-icone">
          <IconeHabilidadeEditor
            id={`ficha-${acao.id}`}
            valor={acao.icone}
            aoAlterar={(icone) => onEditarIcone(acao.id, icone)}
          />
          <small>
            O ícone é salvo na ficha e acompanha a rolagem; não modifica as regras da habilidade.
          </small>
        </div>
      )}
    </article>
  );
}
/** Ações derivadas da ficha original; sem alterações automáticas de HP, Mana ou efeitos. */
export default function AcoesDaFicha({ ficha, nomePersonagem, onRolar, onEditarIcone }: Props) {
  const [filtro, setFiltro] = useState<FiltroAcao>('todos');
  const [abaTecnicas, setAbaTecnicas] = useState<'combate' | 'exploracao'>('combate');
  if (!ficha)
    return (
      <section className="hx-acoes-da-ficha" aria-label="Ações da ficha">
        <p className="aviso-pequeno">
          {nomePersonagem} ainda não possui uma ficha do Criador vinculada. Vincule-a pela
          Biblioteca de Fichas para exibir as ações aqui.
        </p>
      </section>
    );
  const habilidades = (ficha.skills || []).filter((h) => Boolean(h.name?.trim()));
  const acoes = listarAcoesDaFicha(ficha);
  const acoesCombate = acoes.filter((a) => a.ativacao !== 'exploracao');
  const acoesExploracao = acoes.filter((a) => a.ativacao === 'exploracao');
  const filtradas =
    abaTecnicas === 'exploracao'
      ? acoesExploracao
      : filtro === 'todos'
        ? acoesCombate
        : acoesCombate.filter((a) => a.categoria === filtro);
  return (
    <section
      className="hx-acoes-da-ficha"
      aria-label={`Habilidades e passiva de ${nomePersonagem}`}
    >
      <nav className="hx-acoes-subtabs" role="tablist" aria-label="Tipo de habilidades">
        <button
          type="button"
          role="tab"
          aria-selected={abaTecnicas === 'combate'}
          onClick={() => setAbaTecnicas('combate')}
        >
          ⚔ Combate <small>{acoesCombate.length}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaTecnicas === 'exploracao'}
          onClick={() => setAbaTecnicas('exploracao')}
        >
          ✧ Exploração <small>{acoesExploracao.length}</small>
        </button>
      </nav>
      <div role="tabpanel" className="hx-acoes-conteudo">
        {abaTecnicas === 'combate' && (
          <div className="hx-acoes-toolbar">
            <strong>✦ Habilidades e passiva ({habilidades.length})</strong>
            <label className="hx-filtro-categoria">
              Categoria
              <span className="hx-filtro-categoria-campo">
                <select
                  aria-label="Filtrar habilidades por categoria"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value as FiltroAcao)}
                >
                  {CATEGORIAS_ACAO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        )}
        <p className="aviso-pequeno">
          {abaTecnicas === 'combate'
            ? 'Role o acerto e os efeitos quando necessário. Ajuste a Energia manualmente em Recursos; em um 20 natural, role um dado de dano adicional.'
            : 'Técnicas de exploração são usadas conforme a narrativa. O mestre define testes e consequências; ajuste a Energia manualmente em Recursos.'}
        </p>
        <div className="hx-acoes-grade">
          {filtradas.map((acao) => (
            <CartaoAcao key={acao.id} acao={acao} onRolar={onRolar} onEditarIcone={onEditarIcone} />
          ))}
          {!filtradas.length && (
            <p className="aviso-pequeno">
              {abaTecnicas === 'exploracao'
                ? 'Nenhuma técnica de exploração cadastrada nesta ficha.'
                : 'Nenhuma ação desta categoria foi cadastrada.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
