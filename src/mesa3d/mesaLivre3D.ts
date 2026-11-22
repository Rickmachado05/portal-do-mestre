/** Conversão explícita entre as posições percentuais da Mesa 2D e o piso da Mesa 3D.
 * Preserva o mesmo token e as demais propriedades no registro compartilhado.
 */
import { RAIO_AVATAR, type Posicao } from './roomLogic';
import { colisaoCenario3D, dimensoesTerreno3D, type Cenario3D } from './editorCena3D';
import { alterarMesaCompartilhada } from './administracaoMesa3D';
import { calcularTamanhoVisualPlanta3D } from './pisoConstruicao3D';
import { pontoBloqueadoPorBarreira3D } from './mapaCompartilhado3D';
import type { BarreiraMapa } from '../lib/lighting';

export type PontoPercentual = { x: number; y: number };
const margem = RAIO_AVATAR;
const limite = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const valido = (p: Posicao) => Number.isFinite(p.x) && Number.isFinite(p.z);
/** Tokens compartilhados são ancorados na PLANTA da Mesa 2D, não nas bordas
 * externas do terreno 3D. Expandir o chão não deve deslocar os personagens. */
export function referenciaTokens3D(cenario: Cenario3D) {
  const area = dimensoesTerreno3D(cenario);
  // A v1.3.40 usa a superfície inteira como o único mapa compartilhado.
  if (cenario.mapaUnico === true || cenario.piso !== 'imagem') return area;
  const escala = Math.max(0.5, Math.min(2, cenario.escalaMapa ?? 1));
  // Usa a MESMA projeção visual do renderizador, inclusive ao voltar para
  // o encaixe proporcional. Assim a posição percentual do token segue a planta.
  const baseW = cenario.larguraPlanta ?? area.largura;
  const baseH = cenario.profundidadePlanta ?? area.profundidade;
  const encaixe = cenario.aspectoPlanta
    ? calcularTamanhoVisualPlanta3D(
        cenario.aspectoPlanta,
        1,
        Math.min(area.largura, baseW),
        Math.min(area.profundidade, baseH),
        baseW,
        baseH,
        cenario.ajusteMapa ?? 'conter',
        escala,
        cenario.ajusteLivrePlanta === true,
      )
    : { largura: baseW * escala, altura: baseH * escala };
  const largura = encaixe.largura;
  const profundidade = encaixe.altura;
  const cx = (cenario.deslocamentoMapaX ?? 0) * area.largura;
  const cz = (cenario.deslocamentoMapaZ ?? 0) * area.profundidade;
  return {
    largura,
    profundidade,
    minX: cx - largura / 2,
    maxX: cx + largura / 2,
    minZ: cz - profundidade / 2,
    maxZ: cz + profundidade / 2,
  };
}
export function percentualParaChao3D(
  p: PontoPercentual,
  cenario: Cenario3D = { versao: 1, base: 'vazia', objetos: [] },
): Posicao {
  const a = referenciaTokens3D(cenario);
  return {
    x: a.minX + (a.largura * limite(p.x, 0, 100)) / 100,
    z: a.minZ + (a.profundidade * limite(p.y, 0, 100)) / 100,
  };
}
export function chaoParaPercentual3D(
  p: Posicao,
  cenario: Cenario3D = { versao: 1, base: 'vazia', objetos: [] },
): PontoPercentual {
  const a = referenciaTokens3D(cenario);
  return {
    x: limite(((p.x - a.minX) / a.largura) * 100, 0, 100),
    y: limite(((p.z - a.minZ) / a.profundidade) * 100, 0, 100),
  };
}
export function posicaoPermitidaNaMesa3D(
  p: Posicao,
  cenario: Cenario3D,
  outras: readonly Posicao[] = [],
  barreiras: readonly BarreiraMapa[] = [],
): boolean {
  const a = referenciaTokens3D(cenario);
  return (
    valido(p) &&
    p.x > a.minX + margem &&
    p.x < a.maxX - margem &&
    p.z > a.minZ + margem &&
    p.z < a.maxZ - margem &&
    !colisaoCenario3D(p, cenario) &&
    !pontoBloqueadoPorBarreira3D(p, barreiras, cenario) &&
    outras.every((o) => Math.hypot(o.x - p.x, o.z - p.z) >= RAIO_AVATAR * 2)
  );
}
export function moverTokenCompartilhado3D(
  campanhaId: string,
  cenaId: string,
  unidadeId: string,
  p: Posicao,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
  cenario: Cenario3D = { versao: 1, base: 'vazia', objetos: [] },
): boolean {
  const a = referenciaTokens3D(cenario);
  if (!valido(p) || p.x < a.minX || p.x > a.maxX || p.z < a.minZ || p.z > a.maxZ) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena || !cena.tokens || typeof cena.tokens !== 'object' || Array.isArray(cena.tokens))
        return false;
      const tokens = cena.tokens as Record<string, Record<string, unknown>>;
      const token = tokens[unidadeId];
      if (!token || token.travado === true) return false;
      const ponto = chaoParaPercentual3D(p, cenario);
      tokens[unidadeId] = { ...token, x: ponto.x, y: ponto.y };
      return true;
    },
    storage,
  );
}
/** Espelha apenas o visual deste token na cena atual.
 * Não muda ângulo, posição, ficha, skins originais ou outras cenas. */
export function espelharTokenCompartilhado3D(
  campanhaId: string,
  cenaId: string,
  unidadeId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (!campanhaId || !cenaId || !unidadeId) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena || !cena.tokens || typeof cena.tokens !== 'object' || Array.isArray(cena.tokens))
        return false;
      const tokens = cena.tokens as Record<string, Record<string, unknown>>;
      const token = tokens[unidadeId];
      if (!token || token.travado === true) return false;
      tokens[unidadeId] = { ...token, espelhadoX: token.espelhadoX !== true };
      return true;
    },
    storage,
  );
}
/** Retira somente a instância do token da cena indicada. Fichas, retratos,
 * inventários, HP/Mana e tokens de outras cenas não são alterados. */
export function removerTokenDaCenaCompartilhada3D(
  campanhaId: string,
  cenaId: string,
  unidadeId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (!campanhaId || !cenaId || !unidadeId) return false;
  return alterarMesaCompartilhada(
    campanhaId,
    (estado) => {
      const cena = (estado.cenas as Record<string, unknown>[]).find((c) => c?.id === cenaId);
      if (!cena || !cena.tokens || typeof cena.tokens !== 'object' || Array.isArray(cena.tokens))
        return false;
      const tokens = cena.tokens as Record<string, Record<string, unknown>>;
      if (
        !Object.prototype.hasOwnProperty.call(tokens, unidadeId) ||
        !tokens[unidadeId] ||
        tokens[unidadeId].travado === true
      )
        return false;
      const unidade = (estado.unidades as Record<string, unknown>[]).find(
        (u) => u?.id === unidadeId,
      );
      const nome = typeof unidade?.nome === 'string' ? unidade.nome : 'Token';
      const restantes = { ...tokens };
      delete restantes[unidadeId];
      cena.tokens = restantes;
      const registros = Array.isArray(estado.registros)
        ? (estado.registros as Record<string, unknown>[])
        : [];
      estado.registros = [
        ...registros,
        {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `token-${Date.now()}`,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'evento',
          visibilidade: 'mestre',
          texto: `${nome}: token retirado da cena (Delete).`,
        },
      ].slice(-150);
      return true;
    },
    storage,
  );
}
export function deslocarAlvoCamera(
  c: { x: number; z: number },
  dx: number,
  dy: number,
  yaw: number,
  dist: number,
  cenario: Cenario3D = { versao: 1, base: 'vazia', objetos: [] },
): Posicao {
  const fator = dist * 0.0017;
  const direita = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const frente = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const a = dimensoesTerreno3D(cenario);
  return {
    x: limite(c.x - dx * fator * direita.x + dy * fator * frente.x, a.minX, a.maxX),
    z: limite(c.z - dx * fator * direita.z + dy * fator * frente.z, a.minZ, a.maxZ),
  };
}
