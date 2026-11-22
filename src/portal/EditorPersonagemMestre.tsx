import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { FichaDados, FichaRegistro, PapelFicha } from '../hexatombe/fichasLibrary';
import { ROTULOS_PAPEL } from '../hexatombe/fichasLibrary';
import { ehExploracaoManual } from '../hexatombe/acoesFichaDados';
import TokenPadraoFicha from '../lib/TokenPadraoFicha';
import { lerArquivoRetrato, RETRATO_ACEITOS } from '../lib/retratoFicha';

const PAPEIS_MESTRE: readonly PapelFicha[] = ['npc', 'inimigo', 'chefe'];
const criarTecnica = () => ({ name: '', type: '', cost: 0, damage: '', effect: '', limits: '' });
type Tecnica = ReturnType<typeof criarTecnica>;
type Props = {
  papelInicial: PapelFicha;
  registro?: FichaRegistro;
  salvando: boolean;
  onCancelar: () => void;
  onSalvar: (dados: FichaDados, id?: string, tokenPadrao?: Blob | null) => void | Promise<void>;
};

/** Editor independente para personagens controlados pelo mestre.
 * Não cria valores de PR/PC nem atribui poderes ou dificuldades automaticamente.
 * A01 importado é editável no criador oficial, nunca neste formulário manual.
 */
export default function EditorPersonagemMestre({
  papelInicial,
  registro,
  salvando,
  onCancelar,
  onSalvar,
}: Props) {
  const original = registro?.dados;
  const [papel, setPapel] = useState<PapelFicha>(original?.papel ?? papelInicial);
  const [nome, setNome] = useState(original?.name ?? '');
  const [funcao, setFuncao] = useState(original?.class ?? '');
  const [elemento, setElemento] = useState(original?.element ?? 'neutro');
  const [historia, setHistoria] = useState(original?.story ?? '');
  const [objetivo, setObjetivo] = useState(original?.objetivo ?? '');
  const [comportamento, setComportamento] = useState(original?.comportamento ?? '');
  const [notas, setNotas] = useState(original?.notasMestre ?? '');
  const [fasesChefe, setFasesChefe] = useState(original?.fasesChefe ?? '');
  const [planoEncontro, setPlanoEncontro] = useState(original?.planoEncontro ?? '');
  const [hp, setHp] = useState(original?.hpMax ?? 1);
  const [energia, setEnergia] = useState(original?.manaMax ?? 0);
  const [ca, setCa] = useState(original?.ca ?? 0);
  const [regeneracao, setRegeneracao] = useState(original?.regen ?? '0');
  const [nomeAtaque, setNomeAtaque] = useState(original?.basicName ?? '');
  const [danoAtaque, setDanoAtaque] = useState(original?.basicDamage ?? '');
  const [descricaoAtaque, setDescricaoAtaque] = useState(original?.basicDescription ?? '');
  const [passiva, setPassiva] = useState(original?.passiveName ?? '');
  const [efeitoPassiva, setEfeitoPassiva] = useState(original?.passiveEffect ?? '');
  const [abaTecnicas, setAbaTecnicas] = useState<'combate' | 'exploracao'>('combate');
  const [tecnicas, setTecnicas] = useState<Tecnica[]>(() =>
    (
      original?.skills?.map((t) => ({
        name: t.name ?? '',
        type: t.type ?? '',
        cost: t.cost ?? 0,
        damage: t.damage ?? '',
        effect: t.effect ?? '',
        limits: t.limits ?? '',
      })) ?? []
    )
      .filter((t) => t.name || t.effect)
      .slice(0, 5),
  );
  const tecnicasVisiveis = tecnicas
    .map((t, i) => ({ t, i }))
    .filter(({ t }) =>
      abaTecnicas === 'exploracao' ? ehExploracaoManual(t.type) : !ehExploracaoManual(t.type),
    );
  const [foto, setFoto] = useState(original?.photo ?? '');
  const [erro, setErro] = useState('');
  const [tokenPadraoPendente, setTokenPadraoPendente] = useState<Blob | null | undefined>(
    undefined,
  );
  const arquivoRef = useRef<HTMLInputElement>(null);
  const editarTecnica = (index: number, campo: keyof Tecnica, valor: string | number) => {
    setTecnicas((anterior) =>
      anterior.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    );
    // Ao mudar de categoria, acompanhar o cartão para ele não desaparecer do editor.
    if (campo === 'type')
      setAbaTecnicas(ehExploracaoManual(String(valor)) ? 'exploracao' : 'combate');
  };
  async function carregarFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setFoto(await lerArquivoRetrato(arquivo));
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o retrato.');
    }
  }
  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) {
      setErro('Dê um nome ao personagem.');
      return;
    }
    if (
      !Number.isInteger(hp) ||
      hp < 1 ||
      hp > 9999 ||
      !Number.isInteger(energia) ||
      energia < 0 ||
      energia > 9999 ||
      !Number.isInteger(ca) ||
      ca < 0 ||
      ca > 30
    ) {
      setErro('Confira os valores de HP (1–9999), Energia (0–9999) e CA (0–30).');
      return;
    }
    const base: FichaDados = {
      ...original,
      sistemaId: original?.sistemaId ?? 'impeto',
      name: nome.trim(),
      papel,
      element: elemento.trim() || 'neutro',
      class: funcao.trim() || 'Sem arquétipo',
      story: historia,
      objetivo,
      comportamento,
      notasMestre: notas,
      fasesChefe,
      planoEncontro,
      photo: foto,
      hpMax: hp,
      hpCurrent: original ? Math.min(original.hpCurrent, hp) : hp,
      manaMax: energia,
      manaCurrent: original ? original.manaCurrent : energia,
      ca,
      regen: regeneracao,
      basicName: nomeAtaque,
      basicDamage: danoAtaque,
      basicDescription: descricaoAtaque,
      skills: tecnicas
        .filter((t) => t.name.trim() || t.effect.trim())
        .map((t) => ({ ...t, cost: Math.max(0, Math.min(9999, t.cost)) })),
      passiveName: passiva,
      passiveEffect: efeitoPassiva,
    };
    void onSalvar(base, registro?.id, tokenPadraoPendente);
  }
  return (
    <div
      className="hx-character-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !salvando) onCancelar();
      }}
    >
      <form
        className="hx-mestre-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hx-editor-mestre-titulo"
        onSubmit={enviar}
      >
        <header className="hx-mestre-editor-header">
          <div>
            <span className="hp-eyebrow">BIBLIOTECA DO MESTRE · ÍMPETO RPG</span>
            <h2 id="hx-editor-mestre-titulo">
              {registro ? 'Editar registro' : `Criar ${ROTULOS_PAPEL[papelInicial]}`}
            </h2>
            <p>
              Cadastre seus NPCs e adversários. Os números são definidos pelo mestre e não geram
              dificuldade automática.
            </p>
          </div>
          <button type="button" aria-label="Fechar editor" disabled={salvando} onClick={onCancelar}>
            ×
          </button>
        </header>
        <div className="hx-mestre-editor-scroll">
          <section className="hx-mestre-editor-section">
            <h3>Identidade e função</h3>
            <div className="hx-mestre-editor-grid">
              <label>
                Nome{' '}
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Guardião do Santuário"
                />
              </label>
              <label>
                Categoria{' '}
                <select value={papel} onChange={(e) => setPapel(e.target.value as PapelFicha)}>
                  {PAPEIS_MESTRE.map((p) => (
                    <option key={p} value={p}>
                      {ROTULOS_PAPEL[p]}
                    </option>
                  ))}
                  {papel === 'jogador' && <option value="jogador">Personagem</option>}
                </select>
              </label>
              <label>
                Elemento / origem{' '}
                <input
                  maxLength={40}
                  value={elemento}
                  onChange={(e) => setElemento(e.target.value)}
                  placeholder="Água, espírito, não dobrador…"
                />
              </label>
              <label>
                Função / arquétipo{' '}
                <input
                  maxLength={40}
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Curandeiro, guarda, líder…"
                />
              </label>
            </div>
            <div className="hx-mestre-editor-photo">
              {foto ? <img src={foto} alt="Retrato da ficha" /> : <div aria-hidden="true">✧</div>}
              <div>
                <label className="hx-mestre-foto-botao">
                  Selecionar retrato
                  <input
                    hidden
                    type="file"
                    ref={arquivoRef}
                    accept={RETRATO_ACEITOS}
                    onChange={(e) => void carregarFoto(e)}
                  />
                </label>
                {foto && (
                  <button type="button" onClick={() => setFoto('')}>
                    Remover imagem
                  </button>
                )}
                <small>
                  PNG, JPG, WebP ou GIF animado, até 3,5 MB. O retrato é diferente do token e entra
                  no backup da ficha.
                </small>
              </div>
            </div>
          </section>
          <section className="hx-mestre-editor-section">
            <h3>Perfil narrativo</h3>
            <label>
              Descrição e história
              <textarea
                rows={3}
                maxLength={12000}
                value={historia}
                onChange={(e) => setHistoria(e.target.value)}
                placeholder="Quem é e como participa da história?"
              />
            </label>
            <div className="hx-mestre-editor-grid">
              <label>
                Objetivo{' '}
                <textarea
                  rows={2}
                  maxLength={1600}
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="O que deseja alcançar?"
                />
              </label>
              <label>
                Comportamento{' '}
                <textarea
                  rows={2}
                  maxLength={1600}
                  value={comportamento}
                  onChange={(e) => setComportamento(e.target.value)}
                  placeholder="Como negocia, reage ou luta?"
                />
              </label>
            </div>
            <label>
              Notas de preparação{' '}
              <textarea
                rows={2}
                maxLength={4000}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Anotações de referência para o mestre; evite informações que não devem constar na ficha compartilhada."
              />
            </label>
            {papel === 'chefe' && (
              <div className="hx-mestre-editor-chefe">
                <h4>Preparação do chefe</h4>
                <p>
                  Use o guia de encontros como referência. As iniciativas múltiplas são decididas no
                  combate; o editor não cria ações extras.
                </p>
                <label>
                  Fases e mudanças de comportamento
                  <textarea
                    rows={3}
                    maxLength={3000}
                    value={fasesChefe}
                    onChange={(e) => setFasesChefe(e.target.value)}
                    placeholder="Ex.: ao perder metade do HP, anuncia uma nova postura. O mestre decide os efeitos."
                  />
                </label>
                <label>
                  Reforços e objetivo do encontro
                  <textarea
                    rows={3}
                    maxLength={3000}
                    value={planoEncontro}
                    onChange={(e) => setPlanoEncontro(e.target.value)}
                    placeholder="Ex.: dois guardas, um ritual e condições alternativas de vitória."
                  />
                </label>
              </div>
            )}
          </section>
          <TokenPadraoFicha
            fichaId={registro?.id}
            temToken={original?.temTokenPadrao === true}
            onAlterar={setTokenPadraoPendente}
          />
          <section className="hx-mestre-editor-section">
            <h3>Recursos de referência</h3>
            <p>
              Não há valores automáticos por categoria. Você pode montar NPCs narrativos sem
              técnicas de combate.
            </p>
            <div className="hx-mestre-editor-grid tres">
              <label>
                HP máximo{' '}
                <input
                  required
                  type="number"
                  min={1}
                  max={9999}
                  step={1}
                  value={hp}
                  onChange={(e) => setHp(e.target.valueAsNumber)}
                />
              </label>
              <label>
                Energia de referência{' '}
                <input
                  required
                  type="number"
                  min={0}
                  max={9999}
                  step={1}
                  value={energia}
                  onChange={(e) => setEnergia(e.target.valueAsNumber)}
                />
              </label>
              <label>
                CA Base{' '}
                <input
                  required
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={ca}
                  onChange={(e) => setCa(e.target.valueAsNumber)}
                />
              </label>
              <label>
                Regeneração{' '}
                <input
                  maxLength={40}
                  value={regeneracao}
                  onChange={(e) => setRegeneracao(e.target.value)}
                  placeholder="Ex.: 0 ou 1/rodada"
                />
              </label>
            </div>
          </section>
          <section className="hx-mestre-editor-section">
            <h3>Ataque e técnicas</h3>
            <div className="hx-mestre-editor-grid">
              <label>
                Ataque básico{' '}
                <input
                  maxLength={80}
                  value={nomeAtaque}
                  onChange={(e) => setNomeAtaque(e.target.value)}
                  placeholder="Nome do ataque"
                />
              </label>
              <label>
                Dano / efeito{' '}
                <input
                  maxLength={80}
                  value={danoAtaque}
                  onChange={(e) => setDanoAtaque(e.target.value)}
                  placeholder="Ex.: 2d6+2"
                />
              </label>
            </div>
            <label>
              Descrição do ataque{' '}
              <textarea
                rows={2}
                maxLength={650}
                value={descricaoAtaque}
                onChange={(e) => setDescricaoAtaque(e.target.value)}
              />
            </label>
            <nav
              className="impeto-a01-subtabs hx-mestre-tech-subtabs"
              role="tablist"
              aria-label="Tipo de técnicas do mestre"
            >
              <button
                type="button"
                role="tab"
                aria-selected={abaTecnicas === 'combate'}
                onClick={() => setAbaTecnicas('combate')}
              >
                ⚔ Combate{' '}
                <small>{tecnicas.filter((t) => !ehExploracaoManual(t.type)).length}</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={abaTecnicas === 'exploracao'}
                onClick={() => setAbaTecnicas('exploracao')}
              >
                ✧ Exploração{' '}
                <small>{tecnicas.filter((t) => ehExploracaoManual(t.type)).length}</small>
              </button>
            </nav>
            <p className="hx-mestre-tech-ajuda">
              As técnicas são manuais e compartilham os cinco espaços deste editor. Os limites
              oficiais A01 (5 de combate + até 3 PX) continuam no Criador Avatar.
            </p>
            <div className="hx-mestre-editor-tech-head">
              <h4>
                {abaTecnicas === 'combate' ? 'Técnicas de combate' : 'Técnicas de exploração'} (
                {tecnicasVisiveis.length})
              </h4>
              <button
                type="button"
                disabled={tecnicas.length >= 5}
                onClick={() =>
                  setTecnicas((t) => [
                    ...t,
                    { ...criarTecnica(), type: abaTecnicas === 'exploracao' ? 'Exploração' : '' },
                  ])
                }
              >
                ＋ Adicionar técnica
              </button>
            </div>
            <datalist id="hx-tipos-tecnica-mestre">
              <option value="Ofensiva" />
              <option value="Controle" />
              <option value="Defesa" />
              <option value="Buff" />
              <option value="Cura" />
              <option value="Exploração" />
            </datalist>
            <div role="tabpanel">
              {tecnicasVisiveis.map(({ t, i }) => (
                <div key={i} className="hx-mestre-editor-tech">
                  <div className="hx-mestre-editor-tech-head">
                    <strong>Técnica {i + 1}</strong>
                    <button
                      type="button"
                      onClick={() => setTecnicas((a) => a.filter((_, j) => j !== i))}
                    >
                      Remover
                    </button>
                  </div>
                  <div className="hx-mestre-editor-grid tres">
                    <label>
                      Nome{' '}
                      <input
                        maxLength={80}
                        value={t.name}
                        onChange={(e) => editarTecnica(i, 'name', e.target.value)}
                      />
                    </label>
                    <label>
                      Tipo{' '}
                      <input
                        list="hx-tipos-tecnica-mestre"
                        maxLength={40}
                        value={t.type}
                        onChange={(e) => editarTecnica(i, 'type', e.target.value)}
                        placeholder="Ofensiva, Exploração…"
                      />
                    </label>
                    <label>
                      Custo EN{' '}
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        step={1}
                        value={t.cost}
                        onChange={(e) => editarTecnica(i, 'cost', e.target.valueAsNumber || 0)}
                      />
                    </label>
                  </div>
                  <label>
                    Dano / efeito{' '}
                    <input
                      maxLength={80}
                      value={t.damage}
                      onChange={(e) => editarTecnica(i, 'damage', e.target.value)}
                    />
                  </label>
                  <label>
                    Descrição{' '}
                    <textarea
                      rows={2}
                      maxLength={1800}
                      value={t.effect}
                      onChange={(e) => editarTecnica(i, 'effect', e.target.value)}
                    />
                  </label>
                  <label>
                    Limitações{' '}
                    <textarea
                      rows={2}
                      maxLength={750}
                      value={t.limits}
                      onChange={(e) => editarTecnica(i, 'limits', e.target.value)}
                    />
                  </label>
                </div>
              ))}
              {!tecnicasVisiveis.length && (
                <p className="hx-mestre-tech-ajuda">
                  Nenhuma técnica nesta categoria. Use “Adicionar técnica” para criar uma.
                </p>
              )}
            </div>
            <div className="hx-mestre-editor-grid">
              <label>
                Passiva (opcional){' '}
                <input
                  maxLength={80}
                  value={passiva}
                  onChange={(e) => setPassiva(e.target.value)}
                />
              </label>
              <label>
                Efeito passivo{' '}
                <input
                  maxLength={1400}
                  value={efeitoPassiva}
                  onChange={(e) => setEfeitoPassiva(e.target.value)}
                />
              </label>
            </div>
          </section>
          {erro && (
            <p className="hx-mestre-editor-erro" role="alert">
              {erro}
            </p>
          )}
        </div>
        <footer className="hx-mestre-editor-actions">
          <button type="button" disabled={salvando} onClick={onCancelar}>
            Cancelar
          </button>
          <button className="hx-mestre-editor-salvar" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : registro ? 'Salvar alterações' : 'Salvar na Biblioteca'}
          </button>
        </footer>
      </form>
    </div>
  );
}
