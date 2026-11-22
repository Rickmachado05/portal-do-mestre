import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alterarTipoBarreira, barreiraBloqueiaVisao } from '../src/lib/lighting.ts';
import { poligonoDoObservador, tokenVisivelParaObservador } from '../src/lib/visaoIndividual.ts';
import { normalizarEstadoCompartilhado } from '../src/lib/mesaCompartilhada.ts';

const dim={largura:100,altura:100};
const origem={x:25,y:50,visao:50};
const muro={id:'m',tipo:'parede',x1:50,y1:0,x2:50,y2:100,aberta:false,trancada:false};
const poligono=b=>poligonoDoObservador(origem,b,dim);
const ve=(token,b)=>tokenVisivelParaObservador(token,origem,poligono(b),dim);

test('a visão tem raio individual e oculta tokens distantes',()=>{
 const ponto={x:25,y:50,visao:15};const visao=poligonoDoObservador(ponto,[],dim);
 assert.equal(tokenVisivelParaObservador({x:28,y:54},ponto,visao,dim),true);
 assert.equal(tokenVisivelParaObservador({x:80,y:50},ponto,visao,dim),false);
 assert.equal(tokenVisivelParaObservador(ponto,ponto,visao,dim),true);
});
test('parede e porta fechada impedem ver token do outro lado',()=>{
 assert.equal(ve({x:40,y:50},[muro]),true);
 assert.equal(ve({x:65,y:50},[muro]),false);
 assert.equal(ve({x:65,y:50},[{...muro,tipo:'porta'}]),false);
});
test('porta aberta, janela e mureta permitem enxergar',()=>{
 for(const b of [{...muro,tipo:'porta',aberta:true},alterarTipoBarreira(muro,'janela'),alterarTipoBarreira(muro,'mureta')]){
   assert.equal(barreiraBloqueiaVisao(b),false);
   assert.equal(ve({x:65,y:50},[b]),true,`bloqueio indevido na barreira ${b.tipo}`);
 }
});
test('configuração explícita de bloqueio tem prioridade sobre a aparência',()=>{
 const janela={...alterarTipoBarreira(muro,'janela'),bloqueiaVisao:true};
 assert.equal(ve({x:65,y:50},[janela]),false);
 const livre={...muro,bloqueiaVisao:false};
 assert.equal(ve({x:65,y:50},[livre]),true);
});
test('mapa retangular calcula raio na largura real, sem distorcer a visão',()=>{
 const r={largura:200,altura:100},obs={x:50,y:50,visao:20};
 const p=poligonoDoObservador(obs,[],r);
 assert.equal(tokenVisivelParaObservador({x:65,y:50},obs,p,r),true);
 assert.equal(tokenVisivelParaObservador({x:50,y:95},obs,p,r),false);
});
test('normalização 3D preserva janelas, muretas, porta aberta e flags independentes',()=>{
 const outras=['janela','mureta','porta','parede'].map((tipo,i)=>({...muro,id:`b${i}`,tipo,bloqueiaVisao:i===0?true:false,bloqueiaMovimento:i===2?false:true,aberta:i===2}));
 const result=normalizarEstadoCompartilhado({unidades:[],cenas:[{id:'c',barreiras:outras,tokens:{},visibilidade:'visao'}]});
 const b=result.cenas[0].barreiras;
 assert.equal(b.length,4);
 assert.deepEqual(b.map(x=>x.tipo),['janela','mureta','porta','parede']);
 assert.equal(b[0].bloqueiaVisao,true);
 assert.equal(b[2].bloqueiaMovimento,false);
 assert.equal(b[2].aberta,true);
});
test('preview da Mesa 2D não muda a visibilidade da cena; ponte 3D recebe token selecionado',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/const fogVisao = preverJogador \|\|/);
 assert.match(app,/enviar3D\('visao-individual',observador\?\?''\)/);
 assert.ok(!app.includes("if (!fogVisao) atualizarCena(c=>({...c,visibilidade:"));
});
test('renderer 3D desenha máscara com polígono e protege a seleção na prévia',()=>{
 const room=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
 assert.match(room,/mascara-de-visao-individual/);
 assert.match(room,/ctxVisao\.globalCompositeOperation='destination-out'/);
 assert.match(room,/tokenVisivelParaObservador/);
 assert.match(app,/sala\.configurarVisaoIndividual\(/);
 assert.match(app,/if\(visaoIndividualRef\.current&&modoMestreRef\.current&&ev\.button===0\)return/);
 assert.match(app,/sala\.tokenEstaVisivel\(idRef\.current\)/);
});
