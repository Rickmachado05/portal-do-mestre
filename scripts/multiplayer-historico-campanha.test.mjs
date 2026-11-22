import test from 'node:test';
import assert from 'node:assert/strict';
import {registroDaRolagemMultiplayer, incorporarRolagensMultiplayer} from '../src/multiplayer/historicoCampanha.mjs';

const rolagem = (id='dado-a',extra={}) => ({
  id, hora:'2026-11-13T17:20:00.000Z', participante:'Ana', personagemId:'morgana',
  personagem:'Morgana', acaoNome:'Maré Curativa', categoria:'cura',
  formula:'2d8+3', dados:[4,7], modificador:3, total:14,
  ...extra,
});

test('rolagem multiplayer entra no histórico nativo como dado público, com identidade e resultado',()=>{
  const local={id:'local-1',hora:'12:00',tipo:'dado',visibilidade:'mestre',texto:'Rolagem secreta do mestre'};
  const registro=registroDaRolagemMultiplayer(rolagem());
  assert.equal(registro.id,'mp-rolagem:dado-a');
  assert.equal(registro.tipo,'dado');
  assert.equal(registro.visibilidade,'publica');
  assert.match(registro.hora,/^\d\d:\d\d$/);
  for(const parte of ['Morgana','Ana','Maré Curativa','2d8+3','[4, 7] + 3','= 14']){
    assert.ok(registro.texto.includes(parte),`O registro deve conter ${parte}`);
  }
  const historico=incorporarRolagensMultiplayer([local],[rolagem()]);
  assert.deepEqual(historico[0],local);
  assert.deepEqual(historico[1],registro);
});

test('SSE e recuperação de rolagens não duplicam o mesmo ID',()=>{
  const primeira=incorporarRolagensMultiplayer([], [rolagem('a')]);
  const segunda=incorporarRolagensMultiplayer(primeira,[rolagem('a'),rolagem('b',{dados:[2],modificador:-2,total:0})]);
  assert.equal(segunda.length,2);
  assert.equal(segunda[0].id,'mp-rolagem:a');
  assert.match(segunda[1].texto,/\[2\] - 2 = 0/);
  assert.equal(incorporarRolagensMultiplayer(segunda,[rolagem('a'),rolagem('b')]),segunda);
});

test('rolagens inválidas são ignoradas e o limite de 150 registros é preservado',()=>{
  const historico=Array.from({length:149},(_,i)=>({id:`mestre-${i}`,tipo:'evento',texto:'Evento antigo',hora:'11:00'}));
  const completo=incorporarRolagensMultiplayer(historico,[rolagem('um'),rolagem('dois'),rolagem('tres')]);
  assert.equal(completo.length,150);
  assert.equal(completo[0].id,'mestre-2');
  assert.equal(completo.at(-1).id,'mp-rolagem:tres');
  assert.equal(incorporarRolagensMultiplayer(completo,[null,{}, {id:'corrompido',dados:[],total:NaN}]),completo);
});
