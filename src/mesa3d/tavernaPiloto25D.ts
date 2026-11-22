/** Pequeno cenário de validação 2.5D: peças editáveis, não uma sala fixa.
 * Só pode ser montado em uma cena sem objetos e sem planta importada.
 * Não altera campanhas, personagens, mapas 2D nem cenas vizinhas.
 */
import { novoObjeto3D, type Cenario3D, type ObjetoCena3D, type TipoObjeto3D } from './editorCena3D';

export function podeMontarTavernaPiloto25D(cenario: Cenario3D): boolean {
  return cenario.objetos.length === 0 && cenario.piso !== 'imagem';
}

export function montarTavernaPiloto25D(cenario: Cenario3D): Cenario3D {
  if (!podeMontarTavernaPiloto25D(cenario))
    throw new Error('A taverna piloto exige uma cena sem objetos e sem planta importada.');
  const base: Cenario3D = {
    ...cenario,
    base: 'vazia',
    piso: 'madeira',
    larguraTerreno: 18,
    profundidadeTerreno: 17,
    mostrarGrade: false,
    objetos: [],
  };
  const objetos: ObjetoCena3D[] = [];
  function peca(
    tipo: TipoObjeto3D,
    nome: string,
    x: number,
    z: number,
    extras: Partial<ObjetoCena3D> = {},
  ) {
    const objeto = novoObjeto3D(tipo, { x, z }, base);
    Object.assign(objeto, { nome, ...extras });
    objetos.push(objeto);
  }
  // Perímetro com uma abertura real na entrada sul. A porta é uma peça lateral,
  // não bloqueia a passagem: animação de abrir/fechar fica para outra etapa.
  peca('parede', 'Parede dos fundos', 0, -6.5, { comprimento: 14, altura: 2.8 });
  peca('parede', 'Parede oeste', -7, 0, { comprimento: 13, rotacao: Math.PI / 2, altura: 2.8 });
  peca('parede', 'Parede leste', 7, 0, { comprimento: 13, rotacao: Math.PI / 2, altura: 2.8 });
  peca('parede', 'Entrada · lado esquerdo', -4.25, 6.5, { comprimento: 5.5, altura: 2.8 });
  peca('parede', 'Entrada · lado direito', 4.25, 6.5, { comprimento: 5.5, altura: 2.8 });
  peca('porta', 'Porta recolhida · decoração', 6.15, 5.2, {
    largura: 0.9,
    altura: 2.25,
    rotacao: Math.PI / 2,
  });
  peca('balcao', 'Balcão da taverna', -2.5, -4.7, { largura: 4.1, profundidade: 1.05 });
  peca('estante', 'Estante de provisões', 4.65, -5.55, {
    largura: 2.6,
    profundidade: 0.65,
    altura: 2.2,
  });
  peca('mesa', 'Mesa do grupo oeste', -3, -0.7);
  peca('mesa', 'Mesa do grupo leste', 3, -0.7);
  for (const [nome, x, z] of [
    ['Cadeira oeste 1', -3, 1.1],
    ['Cadeira oeste 2', -3, -2.3],
    ['Cadeira leste 1', 3, 1.1],
    ['Cadeira leste 2', 3, -2.3],
  ] as const)
    peca('cadeira', nome, x, z, { estilo: 'pixel' });
  peca('barril', 'Barril de bebidas', 5.55, 3.45, { estilo: 'pixel' });
  peca('barril', 'Barril de reservas', 5.55, 4.6, { estilo: 'pixel' });
  peca('tapete', 'Tapete da entrada', 0, 3.85, { largura: 3.4, profundidade: 2.6 });
  peca('luz', 'Luz quente oeste', -5.5, -4.8);
  peca('luz', 'Luz quente leste', 5.5, -4.8);
  peca('vaso', 'Vaso de plantas oeste', -5.4, 3.5, { estilo: 'pixel' });
  peca('vaso', 'Vaso de plantas leste', 3.6, 4.3, { estilo: 'pixel' });
  return { ...base, objetos };
}
