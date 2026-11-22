/** Contrato da cena pública 3D: dados visuais, sem controles de edição nem biblioteca. */
import type { Cenario3D, ObjetoCena3D } from './editorCena3D';
import type { InstanciaMiniatura3D } from './miniaturasCena3D';

export type CenarioPublico3D = Omit<Cenario3D, 'objetos' | 'miniaturas'> & {
  objetos: ObjetoCena3D[];
  miniaturas: InstanciaMiniatura3D[];
};

/** Só a cena integralmente revelada é transportada; miniaturas requerem upload confirmado. */
export function projetarCenarioPublico3D(
  cenario: Cenario3D,
  idsVisiveis: ReadonlySet<string>,
  modelosAutorizados: ReadonlySet<string>,
  mostrarObjetos = true,
): CenarioPublico3D {
  const objetos = (mostrarObjetos ? cenario.objetos : [])
    .filter((o) => o.oculto !== true)
    .map((o) => ({ ...o, oculto: false }));
  const miniaturas = (cenario.miniaturas ?? [])
    .filter(
      (m) =>
        m.oculto !== true &&
        modelosAutorizados.has(m.modeloId) &&
        (!m.personagemId || idsVisiveis.has(m.personagemId)),
    )
    .map((m) => ({ ...m, oculto: false }));
  return { ...cenario, objetos, miniaturas };
}
