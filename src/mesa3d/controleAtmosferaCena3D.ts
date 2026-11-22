/** Compartilha o horário do céu da cena 3D com o menu Iluminação da mesa.
 * Não altera clima, construção, mapa nem a configuração da Mesa 2D.
 */
import { periodoDia3DValido, type PeriodoDia3D } from './ambientes3D';
import { carregarCenario3D, salvarCenario3D } from './editorCena3D';

export function periodoAtualCena3D(campanhaId: string, cenaId: string): PeriodoDia3D {
  return carregarCenario3D(campanhaId, cenaId).periodoDia ?? 'dia';
}

export function salvarPeriodoCena3D(
  campanhaId: string,
  cenaId: string,
  periodo: PeriodoDia3D,
): void {
  if (!periodoDia3DValido(periodo)) throw new Error('Horário de céu inválido.');
  const cenario = carregarCenario3D(campanhaId, cenaId);
  // Ler o cenário mais recente evita sobrescrever móveis ou paredes modificados na mesma sessão.
  salvarCenario3D(campanhaId, cenaId, { ...cenario, periodoDia: periodo });
}
