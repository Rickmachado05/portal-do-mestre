/**
 * Hexatombe: Mesa — geometria canônica dos dados.
 * Esta é a ÚNICA fonte de vértices, faces, rótulos e colisão.
 * Não importa Three.js, Cannon, React nem a câmera.
 */
export type Vetor3 = [number, number, number];
export type Rotacao = { x: number; y: number; z: number; w: number };
export type FaceCanonica = {
  indices: number[]; // índices dos vértices em sentido anti-horário, olhando de fora
  normal: Vetor3; // normal externa da face, em coordenadas locais
  centro: Vetor3;
  valor: number; // valor gravado nesta mesma face
};
export type ModeloDado = {
  lados: 4 | 6 | 8 | 10 | 12 | 20;
  vertices: Vetor3[];
  faces: FaceCanonica[];
  /** d4 é lido pelo vértice superior, com o número repetido nas três faces que o tocam. */
  leituraPorVertice: boolean;
};

const EPS = 1e-6;
const soma = (a: Vetor3, b: Vetor3): Vetor3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vetor3, b: Vetor3): Vetor3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const escalar = (a: Vetor3, v: number): Vetor3 => [a[0] * v, a[1] * v, a[2] * v];
const produto = (a: Vetor3, b: Vetor3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: Vetor3, b: Vetor3): Vetor3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const tamanho = (a: Vetor3): number => Math.hypot(a[0], a[1], a[2]);
const unitario = (a: Vetor3): Vetor3 => escalar(a, 1 / Math.max(EPS, tamanho(a)));

function verticesParaLados(lados: ModeloDado['lados']): Vetor3[] {
  const sinais = [-1, 1];
  if (lados === 4)
    return [
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
      [1, 1, 1],
    ];
  if (lados === 6)
    return sinais.flatMap((x) => sinais.flatMap((y) => sinais.map((z) => [x, y, z] as Vetor3)));
  if (lados === 8)
    return [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
  const phi = (1 + Math.sqrt(5)) / 2;
  if (lados === 12)
    return [
      ...sinais.flatMap((x) => sinais.flatMap((y) => sinais.map((z) => [x, y, z] as Vetor3))),
      ...sinais.flatMap((y) => sinais.map((z) => [0, y / phi, z * phi] as Vetor3)),
      ...sinais.flatMap((x) => sinais.map((y) => [x / phi, y * phi, 0] as Vetor3)),
      ...sinais.flatMap((x) => sinais.map((z) => [x * phi, 0, z / phi] as Vetor3)),
    ];
  if (lados === 20)
    return [
      ...sinais.flatMap((y) => sinais.map((z) => [0, y, z * phi] as Vetor3)),
      ...sinais.flatMap((x) => sinais.map((y) => [x, y * phi, 0] as Vetor3)),
      ...sinais.flatMap((x) => sinais.map((z) => [x * phi, 0, z] as Vetor3)),
    ];
  // Trapezoedro pentagonal: 10 losangos coplanares, 12 vértices.
  const H = 1.16,
    c = Math.cos(Math.PI / 5),
    h = (H * (1 - c)) / (1 + c);
  return [
    [0, H, 0],
    [0, -H, 0],
    ...Array.from(
      { length: 10 },
      (_, i) =>
        [Math.cos((i * Math.PI) / 5), i % 2 === 0 ? h : -h, Math.sin((i * Math.PI) / 5)] as Vetor3,
    ),
  ];
}

/** Descobre as faces externas do casco convexo (incluindo faces com >3 vértices).
 * Não depende de triangulação/importação de malhas nem de um dicionário de números separado.
 */
function facesDoCasco(vertices: Vetor3[]): Omit<FaceCanonica, 'valor'>[] {
  const unicas = new Map<string, { indices: number[]; normal: Vetor3 }>();
  const limite = vertices.length;
  for (let a = 0; a < limite - 2; a++)
    for (let b = a + 1; b < limite - 1; b++)
      for (let c = b + 1; c < limite; c++) {
        let n = cruz(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a]));
        const norma = tamanho(n);
        if (norma < EPS) continue;
        n = escalar(n, 1 / norma);
        const distancia = produto(n, vertices[a]);
        const ds = vertices.map((v) => produto(n, v) - distancia);
        const max = Math.max(...ds),
          min = Math.min(...ds);
        if (max > EPS && min < -EPS) continue; // plano atravessa o sólido
        if (min >= -EPS) n = escalar(n, -1); // normal externa, sólido atrás
        const plano = produto(n, vertices[a]);
        const indices = vertices.flatMap((v, i) =>
          Math.abs(produto(n, v) - plano) < EPS ? [i] : [],
        );
        if (indices.length < 3) continue;
        const chave = [...indices].sort((x, y) => x - y).join(',');
        unicas.set(chave, { indices, normal: n });
      }
  const resultado: Omit<FaceCanonica, 'valor'>[] = [];
  for (const { indices, normal } of unicas.values()) {
    const centro = escalar(
      indices.reduce((acc, i) => soma(acc, vertices[i]), [0, 0, 0] as Vetor3),
      1 / indices.length,
    );
    const eixoX = unitario(sub(vertices[indices[0]], centro));
    const eixoY = cruz(normal, eixoX);
    const ordenados = [...indices].sort((i, j) => {
      const u = sub(vertices[i], centro),
        v = sub(vertices[j], centro);
      return (
        Math.atan2(produto(u, eixoY), produto(u, eixoX)) -
        Math.atan2(produto(v, eixoY), produto(v, eixoX))
      );
    });
    // Os índices ordenados são CCW quando vistos por fora.
    const p0 = vertices[ordenados[0]],
      p1 = vertices[ordenados[1]],
      p2 = vertices[ordenados[2]];
    if (produto(cruz(sub(p1, p0), sub(p2, p0)), normal) < 0) ordenados.reverse();
    resultado.push({ indices: ordenados, normal, centro });
  }
  resultado.sort(
    (a, b) =>
      b.centro[1] - a.centro[1] ||
      Math.atan2(a.centro[2], a.centro[0]) - Math.atan2(b.centro[2], b.centro[0]),
  );
  return resultado;
}

export function criarModeloDado(lados: ModeloDado['lados']): ModeloDado {
  const dados = verticesParaLados(lados);
  const centro = escalar(
    dados.reduce((acc, v) => soma(acc, v), [0, 0, 0] as Vetor3),
    1 / dados.length,
  );
  const deslocados = dados.map((v) => sub(v, centro));
  const maiorRaio = Math.max(...deslocados.map(tamanho));
  const raio = { 4: 1.12, 6: 1.18, 8: 1.14, 10: 1.17, 12: 1.16, 20: 1.21 }[lados];
  const vertices = deslocados.map((v) => escalar(v, raio / maiorRaio));
  const poligonos = facesDoCasco(vertices);
  if (poligonos.length !== lados) throw Error(`d${lados}: faces inválidas: ${poligonos.length}`);
  const faces = poligonos.map((face, i) => ({ ...face, valor: i + 1 }));
  return { lados, vertices, faces, leituraPorVertice: lados === 4 };
}

export function girarPorQuaternion(v: Vetor3, q: Rotacao): Vetor3 {
  // q * v * conjugate(q), sem dependência de câmera/Three.js.
  const u: Vetor3 = [q.x, q.y, q.z];
  const t = escalar(cruz(u, v), 2);
  return soma(v, soma(escalar(t, q.w), cruz(u, t)));
}

/** Lê exatamente a identificação gravada no casco físico.
 * D4 usa ponta superior; os demais, a normal da face superior.
 */
export function lerValorFisico(modelo: ModeloDado, q: Rotacao): number {
  if (modelo.leituraPorVertice) {
    let indice = 0,
      topo = -Infinity;
    modelo.vertices.forEach((v, i) => {
      const y = girarPorQuaternion(v, q)[1];
      if (y > topo) {
        topo = y;
        indice = i;
      }
    });
    return indice + 1;
  }
  let valor = modelo.faces[0].valor,
    topo = -Infinity;
  for (const face of modelo.faces) {
    const y = girarPorQuaternion(face.normal, q)[1];
    if (y > topo) {
      topo = y;
      valor = face.valor;
    }
  }
  return valor;
}

export function validarModeloDado(modelo: ModeloDado): void {
  if (modelo.faces.length !== modelo.lados) throw Error('Número incorreto de faces');
  const ids = new Set(modelo.faces.map((f) => f.valor));
  if (ids.size !== modelo.lados) throw Error('Numeração duplicada');
  for (const face of modelo.faces) {
    const [i, j, k] = face.indices;
    const A = modelo.vertices[i],
      B = modelo.vertices[j],
      C = modelo.vertices[k];
    if (produto(cruz(sub(B, A), sub(C, A)), face.normal) <= 0) throw Error('Face invertida');
    for (const idx of face.indices) {
      if (Math.abs(produto(face.normal, sub(modelo.vertices[idx], face.centro))) > 1e-5)
        throw Error('Face não plana');
    }
    for (const v of modelo.vertices) {
      if (produto(face.normal, sub(v, face.centro)) > 1e-5) throw Error('Face não convexa');
    }
  }
  // Relação de Euler V - E + F = 2 para todos os poliedros fechados.
  const arestas = new Set<string>();
  for (const f of modelo.faces)
    for (let i = 0; i < f.indices.length; i++) {
      const par = [f.indices[i], f.indices[(i + 1) % f.indices.length]].sort((a, b) => a - b);
      arestas.add(par.join('-'));
    }
  if (modelo.vertices.length - arestas.size + modelo.faces.length !== 2)
    throw Error('Malha aberta ou degenerada');
}
