import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
import {
  normalizarParticipantesIniciativa,
  alterarParticipanteIniciativa,
  ordenarParticipantesIniciativa,
  idsParaEnquadrarCombate,
  turnoAposRetirada,
} from '../src/lib/iniciativaParticipantes.ts';
import { calcularEnquadramentoCinematico } from '../src/mesa3d/cameraCinematica.ts';
let passou = 0;
const ok = (nome, callback) => { callback(); passou++; console.log('✓', nome); };
ok('Novas cenas não têm participantes implícitos', () => assert.deepEqual(normalizarParticipantesIniciativa(undefined), []));
ok('IDs inválidos e repetidos são ignorados', () => assert.deepEqual(normalizarParticipantesIniciativa(['a','a',null,2,'b']), ['a','b']));
ok('Adicionar é explícito e não duplica', () => assert.deepEqual(alterarParticipanteIniciativa(['a'],'a',true),['a']));
ok('Retirar é independente do elenco', () => assert.deepEqual(alterarParticipanteIniciativa(['a','b'],'a',false),['b']));
const elenco=[{id:'morgana',iniciativa:10},{id:'npc',iniciativa:18},{id:'inimigo',iniciativa:3}];
ok('Só membros escolhidos entram na ordem', () => assert.deepEqual(ordenarParticipantesIniciativa(elenco,['morgana','inimigo']).map(u=>u.id),['morgana','inimigo']));
ok('Retirar personagem atual passa ao próximo, não ao primeiro', () => assert.equal(turnoAposRetirada(elenco,[elenco[1],elenco[2]],'morgana','morgana'),'npc'));
ok('Reenquadramento reúne somente participantes que estão no mapa', () => assert.deepEqual(idsParaEnquadrarCombate(['morgana','inimigo'],['morgana','npc','inimigo']),['morgana','inimigo']));
ok('Sem selecionados, câmera enquadra todos no mapa', () => assert.deepEqual(idsParaEnquadrarCombate([],['morgana','npc','inimigo']),['morgana','npc','inimigo']));
ok('Participantes ausentes do mapa não forçam a câmera', () => assert.deepEqual(idsParaEnquadrarCombate(['npc-ausente'],['morgana','inimigo']),['morgana','inimigo']));
ok('Limite tático ampliado comporta personagens distantes', () => {
  const frame=calcularEnquadramentoCinematico({x:0,z:0},undefined,'tatica',16/9,[{x:140,z:0},{x:260,z:0}],1,300);
  assert.equal(frame.centro.x,130);assert.ok(frame.distancia>100);
});
const content=fs.readFileSync(new URL('../src/mesa3d/sessaoMesa3D.ts',import.meta.url),'utf8');
const js=ts.transpileModule(content,{fileName:'sessaoMesa3D.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const state={cenaAtivaId:'arena',unidades:JSON.parse(JSON.stringify(elenco)),combateAtivo:false,turnoId:null,rodada:1,cenas:[
  {id:'arena',tokens:{morgana:{x:10,y:10},npc:{x:20,y:20},inimigo:{x:80,y:80}},participantesIniciativa:[]},
  {id:'outro-mapa',tokens:{},participantesIniciativa:['npc']},
]};
const oldTokens=state.cenas[0].tokens;
const exports={};
const ctx={exports,require(name){if(name==='./administracaoMesa3D')return {alterarMesaCompartilhada(_id,modify){return modify(state)}};if(name==='../lib/iniciativaParticipantes')return {normalizarParticipantesIniciativa,alterarParticipanteIniciativa,ordenarParticipantesIniciativa,turnoAposRetirada};if(name==='../hexatombe/campaignLibrary')return {chaveEstadoCampanha:id=>id};if(name==='../hexatombe/registrosDiario')return {normalizarPaginasDiario:()=>[],aplicarOperacaoDiario:(paginas)=>paginas};throw Error('unexpected '+name)},console,JSON,Math,Date,crypto:{randomUUID:()=>String(Math.random())}};
vm.runInNewContext(js,ctx,{filename:'sessaoMesa3D.js'});
const api=ctx.exports;
ok('Sem participantes, combate não inicia',()=>assert.equal(api.alterarTurnoMesa3D('camp','iniciar',true),false));
ok('Adicionar NPC à iniciativa não muda posição nem elenco',()=>{
  assert.equal(api.alterarParticipacaoMesa3D('camp','arena','npc',true),true);
  assert.deepEqual([...state.cenas[0].participantesIniciativa],['npc']);
  assert.equal(state.cenas[0].tokens,oldTokens);
  assert.equal(state.unidades.length,3);
});
ok('Lista é própria por cena',()=>{
  api.alterarParticipacaoMesa3D('camp','arena','morgana',true);
  assert.deepEqual([...state.cenas[1].participantesIniciativa],['npc']);
});
ok('Incluir todos os tokens é uma ação explícita e não inclui fichas fora da cena',()=>{
  state.cenas[0].tokens={morgana:{x:10,y:10},npc:{x:20,y:20}};
  assert.equal(api.incluirTokensDaCenaNaIniciativa3D('camp','arena'),true);
  assert.deepEqual([...state.cenas[0].participantesIniciativa],['npc','morgana']);
  assert.deepEqual([...state.cenas[1].participantesIniciativa],['npc']);
  state.cenas[0].tokens=oldTokens;
});
ok('Combate inicia pelo participante de maior iniciativa',()=>{
  assert.equal(api.alterarTurnoMesa3D('camp','iniciar',true),true);
  assert.equal(state.turnoId,'npc');
});
ok('Remover o ator da vez avança para próximo inscrito',()=>{
  api.alterarParticipacaoMesa3D('camp','arena','npc',false);
  assert.equal(state.turnoId,'morgana');
  assert.equal(state.combateAtivo,true);
});
ok('Remover último participante encerra somente o combate',()=>{
  api.alterarParticipacaoMesa3D('camp','arena','morgana',false);
  assert.equal(state.turnoId,null);
  assert.equal(state.combateAtivo,false);
  assert.equal(state.cenas[0].tokens,oldTokens);
  assert.deepEqual([...state.cenas[1].participantesIniciativa],['npc']);
});
console.log(`\n${passou} verificações funcionais aprovadas.`);
