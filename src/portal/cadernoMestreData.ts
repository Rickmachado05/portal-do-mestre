/** Caderno do Mestre v2. Não altera estado da mesa ou fichas. */
export type StatusSessao = 'preparando' | 'pronta' | 'concluida';
export type EstadoCena = 'planejada' | 'jogada' | 'ignorada';
export type TarefaCaderno = { id: string; texto: string; concluida: boolean };
export type CenaCaderno = {
  id: string;
  titulo: string;
  local: string;
  detalhes: string;
  estado: EstadoCena;
};
export type NpcCaderno = { id: string; nome: string; papel: string; segredo: string };
export type SessaoCaderno = {
  id: string;
  titulo: string;
  data: string;
  status: StatusSessao;
  resumoAnterior: string;
  objetivos: string;
  gancho: string;
  anotacoes: string;
  cenas: CenaCaderno[];
  npcs: NpcCaderno[];
  tarefas: TarefaCaderno[];
  criadaEm: string;
  atualizadaEm: string;
};
export type Caderno = { schemaVersion: 2; sessaoAtivaId: string; sessoes: SessaoCaderno[] };
const KEY_V2 = (id: string) => `rpg-painel-mestre-caderno-v2:${id}`;
const KEY_V1 = (id: string) => `rpg-painel-mestre-preparacao-v1:${id}`;
export const chaveCaderno = KEY_V2;
const cap = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
const idValido = (s: unknown) => typeof s === 'string' && s.length > 0 && s.length <= 100;
const dataValida = (s: unknown) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
const hoje = () => new Date().toISOString();
export const novoIdCaderno = () =>
  globalThis.crypto?.randomUUID?.() ??
  `caderno-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function novaSessao(indice: number): SessaoCaderno {
  const agora = hoje();
  return {
    id: novoIdCaderno(),
    titulo: `Sessão ${indice}`,
    data: '',
    status: 'preparando',
    resumoAnterior: '',
    objetivos: '',
    gancho: '',
    anotacoes: '',
    cenas: [],
    npcs: [],
    tarefas: [],
    criadaEm: agora,
    atualizadaEm: agora,
  };
}
export function novoCaderno(): Caderno {
  const sessao = novaSessao(1);
  return { schemaVersion: 2, sessaoAtivaId: sessao.id, sessoes: [sessao] };
}
export function validarCaderno(obj: unknown): Caderno | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const raw = obj as Record<string, unknown>;
  if (
    raw.schemaVersion !== 2 ||
    !Array.isArray(raw.sessoes) ||
    !raw.sessoes.length ||
    raw.sessoes.length > 60
  )
    return null;
  const ids = new Set<string>();
  const sessoes: SessaoCaderno[] = [];
  for (const item of raw.sessoes) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const s = item as Record<string, unknown>;
    if (!idValido(s.id) || ids.has(s.id as string)) return null;
    ids.add(s.id as string);
    const tarefas: TarefaCaderno[] = Array.isArray(s.tarefas)
      ? s.tarefas
          .slice(0, 60)
          .filter((x) => x && typeof x === 'object' && typeof x.texto === 'string')
          .map((x, i) => ({
            id: idValido(x.id) ? x.id : String(i),
            texto: cap(x.texto, 180),
            concluida: !!x.concluida,
          }))
      : [];
    const cenas: CenaCaderno[] = Array.isArray(s.cenas)
      ? s.cenas
          .slice(0, 35)
          .filter((x) => x && typeof x === 'object')
          .map((x, i) => ({
            id: idValido(x.id) ? x.id : String(i),
            titulo: cap(x.titulo, 90),
            local: cap(x.local, 100),
            detalhes: cap(x.detalhes, 1700),
            estado: x.estado === 'jogada' || x.estado === 'ignorada' ? x.estado : 'planejada',
          }))
      : [];
    const npcs: NpcCaderno[] = Array.isArray(s.npcs)
      ? s.npcs
          .slice(0, 35)
          .filter((x) => x && typeof x === 'object')
          .map((x, i) => ({
            id: idValido(x.id) ? x.id : String(i),
            nome: cap(x.nome, 90),
            papel: cap(x.papel, 110),
            segredo: cap(x.segredo, 1300),
          }))
      : [];
    sessoes.push({
      id: s.id as string,
      titulo: cap(s.titulo, 90),
      data: dataValida(s.data),
      status: s.status === 'pronta' || s.status === 'concluida' ? s.status : 'preparando',
      resumoAnterior: cap(s.resumoAnterior, 3500),
      objetivos: cap(s.objetivos, 3500),
      gancho: cap(s.gancho, 2200),
      anotacoes: cap(s.anotacoes, 8000),
      tarefas,
      cenas,
      npcs,
      criadaEm: cap(s.criadaEm, 40) || hoje(),
      atualizadaEm: cap(s.atualizadaEm, 40) || hoje(),
    });
  }
  return {
    schemaVersion: 2,
    sessaoAtivaId: ids.has(raw.sessaoAtivaId as string)
      ? (raw.sessaoAtivaId as string)
      : sessoes[0].id,
    sessoes,
  };
}
/** Importação de dados do caderno antigo, sem apagar a chave de origem. */
export function migrarPlanoAntigo(obj: unknown): Caderno | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const old = obj as Record<string, unknown>;
  const s = novaSessao(1);
  s.titulo = cap(old.titulo, 90) || 'Sessão 1';
  s.data = dataValida(old.proximaSessao);
  s.objetivos = cap(old.objetivos, 3500);
  s.anotacoes = cap(old.anotacoes, 8000);
  s.tarefas = Array.isArray(old.tarefas)
    ? old.tarefas
        .slice(0, 60)
        .filter((x) => x && typeof x === 'object' && typeof x.texto === 'string')
        .map((x, i) => ({
          id: idValido(x.id) ? x.id : String(i),
          texto: cap(x.texto, 180),
          concluida: !!x.concluida,
        }))
    : [];
  return { schemaVersion: 2, sessaoAtivaId: s.id, sessoes: [s] };
}
export function lerCaderno(id: string): Caderno {
  try {
    const v2 = localStorage.getItem(KEY_V2(id));
    if (v2 !== null) return validarCaderno(JSON.parse(v2)) ?? novoCaderno();
    const antigo = localStorage.getItem(KEY_V1(id));
    return antigo ? (migrarPlanoAntigo(JSON.parse(antigo)) ?? novoCaderno()) : novoCaderno();
  } catch {
    return novoCaderno();
  }
}
/** Retorna erro em vez de deixar a interface fingir que houve salvamento. */
export function gravarCaderno(id: string, caderno: Caderno): boolean {
  if (!id || !validarCaderno(caderno)) return false;
  try {
    localStorage.setItem(KEY_V2(id), JSON.stringify(caderno));
    return true;
  } catch {
    return false;
  }
}
export function exportarCaderno(nomeCampanha: string, caderno: Caderno): void {
  const texto = JSON.stringify(
    {
      formato: 'portal-do-mestre/caderno-v2',
      campanha: nomeCampanha,
      exportadoEm: hoje(),
      ...caderno,
    },
    null,
    2,
  );
  const blob = new Blob([texto], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caderno-${
    nomeCampanha
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 40) || 'campanha'
  }.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
