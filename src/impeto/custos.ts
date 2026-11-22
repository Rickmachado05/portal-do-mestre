/** Cálculos copiados fielmente do módulo H06 do criador Hexatombe: Avatar (15/11/2026).
 * Mantê-los sincronizados nas futuras revisões do Ímpeto. Preços experimentais.
 */
import type { Ativa, Passiva, Exploracao } from './contrato';
const DADOS: Record<4 | 6 | 8 | 10 | 12, number> = { 4: 3, 6: 4, 8: 5, 10: 6, 12: 7 };
const PX: Record<Exclude<Exploracao['classe'], 'nenhum'>, number> = {
  pontual: 4,
  especializada: 8,
  complexa: 12,
  ampla: 18,
  extraordinaria: 28,
};
const valorDados = (d: 4 | 6 | 8 | 10 | 12, q: number, f: number) => q * DADOS[d] + f * 2;
export function custoPC(a: Ativa) {
  let base = 0;
  switch (a.efeito) {
    case 'nenhum':
      return 0;
    case 'dano':
      base = valorDados(a.dado, a.quantidade, a.fixo) + (a.empurraoAdicional ? 4 : 0);
      break;
    case 'cura':
      base = valorDados(a.dado, a.quantidade, a.fixo) * 1.5;
      break;
    case 'escudo':
    case 'mitigacao':
      base = valorDados(a.dado, a.quantidade, a.fixo) * 1.25;
      break;
    case 'empurrao':
      base = 4;
      break;
    case 'imobilizacao':
      base = 8;
      break;
    case 'atordoamento':
      base = 19;
      break;
    case 'buffCa1':
      base = 8;
      break;
    case 'buffCa2':
      base = 16;
      break;
  }
  return (
    Math.ceil(
      base *
        (a.alvos === 3 ? 2 : a.alvos === 2 ? 1.5 : 1) *
        (a.ativacao === 'principal' ? 1 : 1.5) *
        (a.distante ? 1.25 : 1),
    ) +
    3 * a.rodadasExtras
  );
}
export function custoPassiva(p: Passiva) {
  if (p.efeito === 'nenhum') return 0;
  const base = Math.ceil(
    valorDados(p.dado, p.quantidade, p.fixo) *
      (p.efeito === 'escudo' || p.efeito === 'mitigacao' ? 1.25 : 1),
  );
  return Math.ceil(base * 1.5 * (p.usos === 3 ? 2.5 : p.usos === 2 ? 1.8 : 1));
}
export function custoPX(e: Exploracao) {
  if (e.classe === 'nenhum') return 0;
  const subtotal =
    PX[e.classe] +
    (e.alvos === 6 ? 4 : e.alvos === 2 ? 2 : 0) +
    (e.alcance === 'remoto' ? 6 : e.alcance === 'distante' ? 2 : 0) +
    (e.duracao === 'dia' ? 8 : e.duracao === 'duasCenas' ? 4 : 0) +
    (e.automatica ? 0 : e.usos === 3 ? 6 : e.usos === 2 ? 3 : 0);
  return e.automatica ? Math.ceil(subtotal * 1.5) : subtotal;
}
export function custoEN(pc: number, a?: Ativa): number | null {
  if (pc === 0) return 0;
  if (a?.efeito === 'atordoamento' && pc === 19) return 12;
  if (
    a?.ativacao === 'reacao' &&
    a.efeito === 'escudo' &&
    a.quantidade === 1 &&
    a.dado === 8 &&
    a.fixo === 2 &&
    a.alvos === 1 &&
    !a.distante &&
    a.rodadasExtras === 0 &&
    pc === 17
  )
    return 12;
  if (
    a?.ativacao === 'reacao' &&
    a.efeito === 'mitigacao' &&
    a.quantidade === 2 &&
    a.dado === 8 &&
    a.fixo === 0 &&
    a.alvos === 1 &&
    !a.distante &&
    a.rodadasExtras === 0 &&
    pc === 19
  )
    return 15;
  if (pc < 4) return null;
  if (pc <= 7) return 3;
  if (pc <= 14) return 6;
  if (pc <= 22) return 10;
  if (pc <= 30) return 15;
  if (pc <= 40) return 21;
  if (pc <= 55) return 28;
  if (pc <= 70) return 36;
  return null;
}
export function custoENPX(px: number, automatica: boolean): number | null {
  if (px === 0 || automatica) return 0;
  if (px <= 4) return 1;
  if (px <= 8) return 2;
  if (px <= 12) return 4;
  if (px <= 18) return 6;
  if (px <= 28) return 10;
  return null;
}
export function validaExploracao(x: unknown): x is Exploracao {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.nome === 'string' &&
    ['nenhum', 'pontual', 'especializada', 'complexa', 'ampla', 'extraordinaria'].includes(
      e.classe as string,
    ) &&
    typeof e.categoria === 'string' &&
    [1, 2, 6].includes(e.alvos as number) &&
    ['proximo', 'distante', 'remoto'].includes(e.alcance as string) &&
    ['cena', 'duasCenas', 'dia'].includes(e.duracao as string) &&
    [1, 2, 3].includes(e.usos as number) &&
    typeof e.automatica === 'boolean' &&
    (!e.automatica || e.usos === 1) &&
    typeof e.descricao === 'string' &&
    typeof e.limites === 'string' &&
    typeof e.teste === 'string'
  );
}
