import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {poligonoDoObservador} from '../src/lib/visaoIndividual.ts';
import {alterarTipoBarreira} from '../src/lib/lighting.ts';
import {normalizarEstadoCompartilhado} from '../src/lib/mesaCompartilhada.ts';
import {celulasVisiveisFog, acrescentarExploracaoFog, mapaEstadosFog, caminhosFog, celulaFog, decodificarFog, validarMemoriaFog, COLUNAS_FOG, LINHAS_FOG} from '../src/lib/fogExploracao.ts';
const dim={largura:100,altura:100};
const visao=(x,y,barreiras=[],raio=18)=>celulasVisiveisFog([poligonoDoObservador({x,y,visao:raio},barreiras,dim)],dim);
const origem={x:25,y:50},pos1=celulaFog(25,50),pos2=celulaFog(80,50),fora=celulaFog(96,96);
test('a exploração começa oculta e respeita a área visível do token',()=>{
 const v=visao(25,50);const estados=mapaEstadosFog({},['rick'],v,[]);
 assert.equal(estados[pos1],2);assert.equal(estados[pos2],0);assert.equal(estados[fora],0);
});
test('ao mover o token a área anterior fica explorada, sem revelar inimigos',()=>{
 const anterior=acrescentarExploracaoFog(undefined,visao(25,50));
 const atual=visao(80,50);
 const estados=mapaEstadosFog({rick:anterior},['rick'],atual,[]);
 assert.equal(estados[pos1],1);assert.equal(estados[pos2],2);assert.equal(estados[fora],0);
});
test('exploração independente e visão combinada do grupo',()=>{
 const a=acrescentarExploracaoFog(undefined,visao(25,50));
 const b=acrescentarExploracaoFog(undefined,visao(80,50));
 const vazio=new Uint8Array(COLUNAS_FOG*LINHAS_FOG);
 const individual=mapaEstadosFog({a,b},['a'],vazio,[]);
 const grupo=mapaEstadosFog({a,b},['a','b'],vazio,[]);
 assert.equal(individual[pos1],1);assert.equal(individual[pos2],0);
 assert.equal(grupo[pos1],1);assert.equal(grupo[pos2],1);
});
test('pincel revelar/cobrir funciona com ordem e arrasto',()=>{
 const invisivel=new Uint8Array(COLUNAS_FOG*LINHAS_FOG);
 const traços=[{acao:'revelar',raio:6,pontos:[{x:20,y:50},{x:30,y:50}]},{acao:'ocultar',raio:3,pontos:[{x:25,y:50}]}];
 const pintado=mapaEstadosFog({},[],invisivel,traços);
 assert.equal(pintado[celulaFog(20,50)],2);assert.equal(pintado[pos1],0);
 const corrigido=mapaEstadosFog({},[],invisivel,[...traços,{acao:'revelar',raio:3,pontos:[{x:25,y:50}]}]);
 assert.equal(corrigido[pos1],2);
});
test('barreiras impedem exploração de áreas ocultas e janelas deixam passar',()=>{
 const parede={id:'b1',tipo:'parede',x1:50,x2:50,y1:0,y2:100,aberta:false,trancada:false};
 const bloqueado=visao(30,50,[parede],45);
 const janela=visao(30,50,[alterarTipoBarreira(parede,'janela')],45);
 assert.equal(bloqueado[celulaFog(65,50)],0);assert.equal(janela[celulaFog(65,50)],1);
});
test('histórico compacto sobrevive normalização e bloqueia dados inválidos',()=>{
 const mem=acrescentarExploracaoFog(undefined,visao(25,50));
 assert.equal(mem.length,COLUNAS_FOG*LINHAS_FOG/4);
 assert.equal(decodificarFog(mem).length,COLUNAS_FOG*LINHAS_FOG/8);
 assert.deepEqual(validarMemoriaFog({a:mem,b:'danger'}),{a:mem});
 const dados=normalizarEstadoCompartilhado({unidades:[],cenas:[{id:'c',visibilidade:'exploracao',tokens:{},exploracaoPorToken:{a:mem}}]});
 assert.equal(dados.cenas[0].visibilidade,'exploracao');assert.equal(dados.cenas[0].exploracaoPorToken.a,mem);
});
test('SVG mantém regiões não exploradas e exploradas separadas',()=>{
 const v=new Uint8Array(COLUNAS_FOG*LINHAS_FOG);
 v[0]=0;v[1]=1;v[2]=2;
 const paths=caminhosFog(v);assert.match(paths.oculto,/M0 0/);assert.ok(paths.explorado.length>0);
});
test('2D e 3D usam a mesma grade e salvamento do histórico',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const room=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
 const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
 assert.match(app,/exploracaoPorToken/);assert.match(app,/fogExploracao/);assert.match(app,/Reiniciar exploração/);
 assert.match(room,/mapaEstadosFog/);assert.match(viewer,/alterarMesaCompartilhada\(campanhaId,raw=>/);
 assert.match(viewer,/desenhoFog/);assert.match(viewer,/ferramentaFogRef/);
});
