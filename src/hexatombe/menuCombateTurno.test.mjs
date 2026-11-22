import assert from 'node:assert/strict';
import { mostrarMenuNoTurno, SECOES_MENU_COMBATE } from './menuCombateTurno.ts';
const base = { combateAtivo:true, modoCamera:'personagem', personagemFocoId:'morgana', turnoId:'morgana', tokenPresente:true };
assert.equal(mostrarMenuNoTurno(base),true,'Menu no turno da personagem acompanhada');
for(const alterar of [
 {combateAtivo:false}, {modoCamera:'tatica'}, {modoCamera:'terceira'},
 {personagemFocoId:'naeris'}, {turnoId:'naeris'}, {turnoId:null},
 {tokenPresente:false},
]) assert.equal(mostrarMenuNoTurno({...base,...alterar}),false,JSON.stringify(alterar));
assert.deepEqual(SECOES_MENU_COMBATE.map(x=>x.id),['ataque','habilidades','itens','status']);
console.log('9 verificações de visibilidade de turno e seções passaram.');
