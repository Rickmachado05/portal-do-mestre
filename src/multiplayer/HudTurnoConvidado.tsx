/**
 * Mesma HUD cinematográfica usada no mestre. Nenhuma ficha integral sai do host:
 * apenas ações do personagem atribuído, seu estado de HP/EN e itens privados.
 * O servidor continua validando rolagens e pedidos de uso de item.
 */
import MenuCombateImersivo from '../hexatombe/MenuCombateImersivo';
import { mostrarMenuNoTurno } from '../hexatombe/menuCombateTurno';
import type { AcaoDaFicha } from '../hexatombe/acoesFichaDados';
import type { ItemInventario, CategoriaItem, EfeitoItem } from '../hexatombe/itensLibrary';
import type { FichaCompartilhada, InventarioCompartilhado, MesaPublica } from './api';
import type { PontoMenuCombate } from '../hexatombe/posicaoMenuCombate';

export function habilitarHudTurnoJogador(
  mesa: MesaPublica | null,
  personagemId: string | null,
  camera: string,
  modo: '2d' | '3d',
): boolean {
  if (!mesa || !personagemId) return false;
  return mostrarMenuNoTurno({
    combateAtivo: mesa.combate?.ativo === true,
    modoCamera: modo === '3d' ? camera : 'mesa',
    personagemFocoId: personagemId,
    turnoId: mesa.combate?.turnoId,
    tokenPresente: mesa.tokens.some((t) => t.id === personagemId),
  });
}

export default function HudTurnoConvidado({
  mesa,
  personagemId,
  ficha,
  inventario,
  ancora,
  rolando,
  onRolarAcao,
  onSolicitarItem,
  onAbrirFicha,
  onAbrirInventario,
}: {
  mesa: MesaPublica;
  personagemId: string;
  ficha: FichaCompartilhada | null;
  inventario: InventarioCompartilhado | null;
  ancora?: PontoMenuCombate;
  rolando: boolean;
  onRolarAcao: (id: string, modalidade: 'teste' | 'valor') => void;
  onSolicitarItem: (pedido: {
    tipo: 'usar' | 'transferir';
    itemId: string;
    quantidade?: number;
    destinatarioId?: string;
  }) => void;
  onAbrirFicha: () => void;
  onAbrirInventario: () => void;
}) {
  // Sem ficha privada do próprio convidado: não apresentar recursos de outra pessoa.
  if (!ficha || ficha.id !== personagemId) return null;
  const acoes: AcaoDaFicha[] = ficha.acoes.map((a) => ({
    id: a.id,
    titulo: a.nome,
    tipo: a.tipo,
    categoria: a.categoria as AcaoDaFicha['categoria'],
    descricao: a.descricao,
    restricoes: a.restricoes,
    valor: a.valor,
    custo: a.custo,
    fonte: a.fonte,
    ativacao: a.ativacao,
    pc: a.pc,
    px: a.px,
    enIndefinida: a.enIndefinida,
    exigeCA: a.exigeCA,
  }));
  const itens: ItemInventario[] =
    inventario?.id === personagemId
      ? inventario.itens.map((item) => ({
          id: item.id,
          nome: item.nome,
          categoria: item.categoria as CategoriaItem,
          efeito: item.efeito as EfeitoItem,
          descricao: item.descricao,
          valor: item.valor,
          quantidade: item.quantidade,
          consumivel: item.consumivel,
          imagem: item.imagem,
          conteudo: item.conteudo,
          imagemConteudo: item.imagemConteudo,
          equipado: false,
        }))
      : [];
  const identidade = [ficha.elemento, ficha.classe].filter(Boolean).join(' · ');
  return (
    <MenuCombateImersivo
      key={`${mesa.cenaId}:${personagemId}:${mesa.combate?.rodada}`}
      personagemId={personagemId}
      ancora={ancora}
      rodada={mesa.combate?.rodada ?? 1}
      personagem={{
        nome: ficha.nome,
        hp: ficha.hp,
        hpMax: ficha.hpMax,
        mana: ficha.mana,
        manaMax: ficha.manaMax,
        ca: ficha.ca,
        escudo: ficha.escudo,
        elemento: ficha.elemento,
        itens,
        condicoes: ficha.condicoes,
      }}
      identidadePublicada={identidade}
      impetoPublicado={Boolean(ficha.impeto || acoes.some((a) => a.fonte === 'a01'))}
      acoesPublicadas={acoes}
      rolando={rolando}
      onRolarAcaoPublicada={onRolarAcao}
      onRolar={() => undefined}
      onUsarItem={(item) => {
        if (
          inventario?.id === personagemId &&
          inventario.itens.some((i) => i.id === item.id && i.quantidade > 0)
        )
          onSolicitarItem({ tipo: 'usar', itemId: item.id, quantidade: 1 });
      }}
      onAbrirFicha={onAbrirFicha}
      onAbrirInventario={onAbrirInventario}
    />
  );
}
