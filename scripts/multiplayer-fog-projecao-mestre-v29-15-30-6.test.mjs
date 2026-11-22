import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projetarFogNaPlanta3D,comporFogNaPlanta3D,comporCamadaFogNaPlanta3D} from '../src/mesa3d/projecaoFogPlanta3D.mjs';

const planta={x:0,z:0,largura:20,altura:10};
const area={minX:-10,minZ:-5,largura:20,altura:10};
test('fog mestre cobre 100% da planta quando áreas coincidem',()=>{
 assert.deepEqual(projetarFogNaPlanta3D(planta,area,800,400),{x:0,y:0,largura:800,altura:400});
});
test('fog não estica visão quando imagem da planta está deslocada',()=>{
 const result=projetarFogNaPlanta3D({...planta,x:5},area,800,400);
 assert.deepEqual(result,{x:-200,y:0,largura:800,altura:400});
});
test('fog não deforma o círculo em mapa de proporções diferentes',()=>{
 const result=projetarFogNaPlanta3D({...planta,largura:40,altura:20},area,800,400);
 assert.deepEqual(result,{x:200,y:100,largura:400,altura:200});
});
test('regiões externas à visão continuam ocultas',()=>{
 const eventos=[];const ctx={globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'',
  save(){eventos.push(['save']);},restore(){eventos.push(['restore']);},
  drawImage(...args){eventos.push(['drawImage',...args]);},
  fillRect(...args){eventos.push(['fillRect',...args]);},
  beginPath(){eventos.push(['beginPath']);},rect(...args){eventos.push(['rect',...args]);},clip(){eventos.push(['clip']);}};
 const image={name:'mapa'},fog={name:'fog'};
 assert.equal(comporFogNaPlanta3D(ctx,image,fog,{x:200,y:100,largura:400,altura:200},800,400),true);
 assert.ok(eventos.some(e=>e[0]==='fillRect'&&e[1]===0&&e[2]===0&&e[3]===800&&e[4]===100));
 assert.ok(eventos.some(e=>e[0]==='drawImage'&&e[1]===fog&&e[2]===200&&e[3]===100));
 assert.equal(eventos.filter(e=>e[0]==='save').length,eventos.filter(e=>e[0]==='restore').length);
});
test('v29.15.30.9: renderizador mestre usa o mesmo recorte do convidado e preserva GLB',()=>{
 const s=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
 assert.match(s,/comporRecorteFogComoJogador3D\(ctx,origem as CanvasImageSource,telaVisao,w,h,opacidade\)/);
 assert.match(s,/camadaMiniaturas\.configurarFiltroPersonagensVisiveis/);
 assert.match(s,/desenharVisaoCompartilhada3D\(ctxVisao,estadosFog/);
});

test('v29.15.30.8: a camada de Fog preserva o mapa original e usa transparência',()=>{
 const eventos=[];const ctx={globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'',
  save(){eventos.push(['save']);},restore(){eventos.push(['restore']);},
  clearRect(...a){eventos.push(['clearRect',...a]);},drawImage(...a){eventos.push(['drawImage',...a]);},
  fillRect(...a){eventos.push(['fillRect',...a]);},
  beginPath(){eventos.push(['beginPath']);},rect(...a){eventos.push(['rect',...a]);},clip(){eventos.push(['clip']);}};
 const fog={name:'mascara'},p={x:120,y:50,largura:340,altura:280};
 assert.equal(comporCamadaFogNaPlanta3D(ctx,fog,p,800,500),true);
 assert.ok(eventos.some(e=>e[0]==='clearRect'&&e[3]===800&&e[4]===500));
 assert.ok(eventos.some(e=>e[0]==='drawImage'&&e[1]===fog));
 assert.equal(eventos.filter(e=>e[0]==='drawImage').length,1,'a imagem original nunca é redesenhada');
 assert.ok(eventos.some(e=>e[0]==='fillRect'&&e[3]===800&&e[4]===50),'região externa continua oculta');
 assert.equal(eventos.filter(e=>e[0]==='save').length,eventos.filter(e=>e[0]==='restore').length);
 assert.equal(comporCamadaFogNaPlanta3D(ctx,fog,{...p,largura:-5},800,500),false);
});
test('v29.15.30.9: Observar altera só a textura no material atual, sem outro plano',()=>{
 const s=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
 const start=s.indexOf('const comporFogNoPisoDoMestre=');const end=s.indexOf('let visaoObservadorId:',start);
 const preview=s.slice(start,end);
 assert.match(preview,/plantaMaterial\.map=texturaPreviaFogMestre/);
 assert.doesNotMatch(preview,/new THREE\.Mesh\(/);
 assert.doesNotMatch(preview,/malhaVisao\.scale\.set\(/);
 assert.match(s,/if\(previewNoPiso\)malhaVisao\.visible=false/);
});
