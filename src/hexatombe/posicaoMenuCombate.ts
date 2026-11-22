/** Posição da HUD calculada a partir do token projetado pelo WebGL.
 * A reserva ao redor do personagem TEM prioridade sobre três colunas.
 */
export type ProjecaoPersonagemTela = {
  personagemId: string;
  x: number;
  y: number;
  visivel: boolean;
};
export type PontoMenuCombate = { x: number; y: number; visivel: boolean };
export type LadoPreferidoHud = 'auto' | 'direita' | 'esquerda';
export type OpcoesPosicaoHud = { distancia?: number; lado?: LadoPreferidoHud; escala?: number };

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Compatível com os testes e com consumidores da HUD ancorada original. */
export function calcularPosicaoMenuCombate(
  ancora: PontoMenuCombate | undefined,
  larguraViewport: number,
  alturaViewport: number,
): { left: number; top: number; lado: 'direito' | 'esquerdo' } {
  const w = Math.max(280, larguraViewport),
    h = Math.max(250, alturaViewport);
  const painel = w <= 540 ? Math.min(220, w - 18) : 244;
  const esq = w > 800 ? 182 : 10,
    dir = w > 800 ? 100 : 10;
  const xmax = Math.max(10, w - dir - painel);
  const x = ancora && Number.isFinite(ancora.x) ? ancora.x : w * 0.5;
  const y = ancora && Number.isFinite(ancora.y) ? ancora.y : h * 0.52;
  const direita = x + 100,
    esquerda = x - 100 - painel;
  const lado: 'direito' | 'esquerdo' = direita <= xmax || esquerda < esq ? 'direito' : 'esquerdo';
  const left = limitar(lado === 'direito' ? direita : esquerda, Math.min(esq, xmax), xmax);
  const top = limitar(y - 107, Math.min(76, h - 190), Math.max(76, h - 440));
  return { left: Math.round(left), top: Math.round(top), lado };
}

export type PainelMenuCombate = { left: number; top: number; width: number; maxHeight: number };
export type LayoutLateralMenuCombate = {
  principal: ReturnType<typeof calcularPosicaoMenuCombate>;
  larguraPrincipal: number;
  lista: PainelMenuCombate;
  detalhe: PainelMenuCombate;
  direcao: 'direita' | 'esquerda';
  modo: 'triplo' | 'duplo' | 'vertical';
  escala: number;
};

/** Usa tamanhos visualmente progressivos para evitar encostar no token. */
export function calcularLayoutLateralMenuCombate(
  ancora: PontoMenuCombate | undefined,
  larguraViewport: number,
  alturaViewport: number,
  opcoes: OpcoesPosicaoHud = {},
): LayoutLateralMenuCombate {
  const w = Math.max(280, larguraViewport),
    h = Math.max(300, alturaViewport);
  const escala = limitar(Number.isFinite(opcoes.escala) ? opcoes.escala! : 1, 0.8, 1.2);
  const distancia = limitar(Number.isFinite(opcoes.distancia) ? opcoes.distancia! : 100, 75, 210);
  const lado = opcoes.lado || 'auto';
  const x = ancora?.visivel && Number.isFinite(ancora.x) ? ancora.x : w * 0.5;
  const y = ancora?.visivel && Number.isFinite(ancora.y) ? ancora.y : h * 0.52;
  const margemEsq = w > 1000 ? 252 : w > 800 ? 155 : 8;
  const margemDir = w > 1000 ? 132 : w > 800 ? 95 : 8;
  const limiteDir = w - margemDir;
  const gap = 9;
  const larguraNormal = w <= 600 ? Math.min(220, w - 18) : 244;
  const top = limitar(y - 115 * escala, 67, Math.max(67, h - 370 * escala - 95));
  const alturaPainel = Math.max(
    100,
    Math.min(465, (h - (top + 36 * escala) - (h > 650 ? 100 : 48)) / escala),
  );

  const espacos = [
    { direcao: 'direita' as const, inicio: Math.max(margemEsq, x + distancia), fim: limiteDir },
    { direcao: 'esquerda' as const, inicio: margemEsq, fim: Math.min(limiteDir, x - distancia) },
  ].map((e) => ({ ...e, disponivel: Math.max(0, e.fim - e.inicio) }));
  const ordered =
    lado === 'auto'
      ? espacos.sort((a, b) => b.disponivel - a.disponivel)
      : espacos.sort((a, b) => Number(b.direcao === lado) - Number(a.direcao === lado));
  const presets =
    w >= 1200
      ? [
          { principal: 244, lista: 218, detalhe: 244 },
          { principal: 212, lista: 174, detalhe: 188 },
          { principal: 202, lista: 164, detalhe: 186 },
        ]
      : [
          { principal: 244, lista: 196, detalhe: 216 },
          { principal: 216, lista: 178, detalhe: 198 },
          { principal: 202, lista: 160, detalhe: 180 },
        ];

  function montar(
    direcao: 'direita' | 'esquerda',
    inicio: number,
    fim: number,
    larguras: { principal: number; lista: number; detalhe: number },
    modo: 'triplo' | 'duplo',
  ): LayoutLateralMenuCombate {
    const d = escala;
    const larguraPrincipal = larguras.principal;
    const principalLeft = direcao === 'direita' ? inicio : fim - larguraPrincipal * d;
    const listaLeft =
      direcao === 'direita'
        ? principalLeft + (larguraPrincipal + gap) * d
        : principalLeft - (larguras.lista + gap) * d;
    const detalheLeft =
      modo === 'triplo'
        ? direcao === 'direita'
          ? listaLeft + (larguras.lista + gap) * d
          : listaLeft - (larguras.detalhe + gap) * d
        : listaLeft;
    const colTop = top + 35 * d;
    const disp = Math.max(110, (h - colTop - (h > 650 ? 97 : 42)) / d);
    const alturaLista =
      modo === 'triplo' ? alturaPainel : Math.max(82, Math.floor((disp - 9) * 0.54));
    const alturaDetalhe = modo === 'triplo' ? alturaPainel : Math.max(75, disp - alturaLista - 9);
    return {
      principal: {
        left: Math.round(principalLeft),
        top: Math.round(top),
        lado: direcao === 'direita' ? 'direito' : 'esquerdo',
      },
      larguraPrincipal,
      lista: {
        left: Math.round(listaLeft),
        top: Math.round(colTop),
        width: larguras.lista,
        maxHeight: Math.round(alturaLista),
      },
      detalhe: {
        left: Math.round(detalheLeft),
        top: Math.round(modo === 'triplo' ? colTop : colTop + (alturaLista + 9) * d),
        width: modo === 'triplo' ? larguras.detalhe : larguras.lista,
        maxHeight: Math.round(alturaDetalhe),
      },
      direcao,
      modo,
      escala,
    };
  }

  if (w >= 540) {
    // Escolhe a opção mais próxima do token sem colocar NENHUM painel na zona protegida.
    // A coluna tripla compacta mantém a estética; a dupla é o fallback de segurança.
    for (const dimensoes of presets) {
      for (const e of ordered) {
        if (
          e.disponivel >=
          escala * (dimensoes.principal + dimensoes.lista + dimensoes.detalhe + 2 * gap)
        )
          return montar(e.direcao, e.inicio, e.fim, dimensoes, 'triplo');
      }
    }
    for (const dimensoes of presets) {
      for (const e of ordered) {
        if (e.disponivel >= escala * (dimensoes.principal + dimensoes.lista + gap))
          return montar(e.direcao, e.inicio, e.fim, dimensoes, 'duplo');
      }
    }
  }

  // Situações estreitas: uma única coluna junto à borda, sem cruzar a figura.
  const largura = Math.min(w - 16, w < 540 ? 220 : 244);
  const espacoDireita = Math.max(0, limiteDir - (x + distancia));
  const espacoEsquerda = Math.max(0, x - distancia - margemEsq);
  const preferida =
    lado === 'auto'
      ? espacoDireita >= espacoEsquerda
        ? 'direita'
        : 'esquerda'
      : lado === 'direita' && espacoDireita < largura * escala && espacoEsquerda >= largura * escala
        ? 'esquerda'
        : lado === 'esquerda' &&
            espacoEsquerda < largura * escala &&
            espacoDireita >= largura * escala
          ? 'direita'
          : lado;
  const referencia =
    preferida === 'direita'
      ? Math.max(margemEsq, x + distancia)
      : Math.min(x - distancia - largura * escala, limiteDir - largura * escala);
  const principalLeft = limitar(referencia, 8, w - 8 - largura * escala);
  // No celular, priorizar o cabeçalho abaixo dos controles da página.
  const topoVertical =
    w < 540 ? Math.min(78, Math.max(9, h - 550)) : Math.min(110, Math.max(67, y - 400));
  const topoLista = topoVertical + 255 * escala;
  const disp = Math.max(110, (h - topoLista - (w < 540 ? 35 : 85)) / escala);
  const alturaLista = Math.max(65, Math.floor((disp - 9) * 0.5));
  return {
    principal: {
      left: Math.round(principalLeft),
      top: Math.round(topoVertical),
      lado: preferida === 'direita' ? 'direito' : 'esquerdo',
    },
    larguraPrincipal: largura,
    lista: {
      left: Math.round(principalLeft),
      top: Math.round(topoLista),
      width: largura,
      maxHeight: alturaLista,
    },
    detalhe: {
      left: Math.round(principalLeft),
      top: Math.round(topoLista + (alturaLista + 9) * escala),
      width: largura,
      maxHeight: Math.max(58, Math.floor(disp - alturaLista - 9)),
    },
    direcao: preferida,
    modo: 'vertical',
    escala,
  };
}
