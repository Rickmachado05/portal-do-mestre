import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const room=readFileSync(resolve(root,'src/mesa3d/roomScene.ts'),'utf8');
const model=readFileSync(resolve(root,'src/mesa3d/renderMiniaturas3D.ts'),'utf8');
const player=readFileSync(resolve(root,'src/multiplayer/MesaConvidado3D.tsx'),'utf8');

test('v29.15.30: máscara de fog usa profundidade e fica junto do piso, sem seccionar GLBs opacos',()=>{
 assert.match(room,/materialVisao=new THREE\.MeshBasicMaterial\(\{[^\n]*depthWrite:false,depthTest:true/);
 assert.match(room,/const ALTURA_FOG_PISO_3D=\.025;/);
 assert.match(room,/malhaVisao\.position\.set\(\(a\.minX\+a\.maxX\)\/2,ALTURA_FOG_PISO_3D,/);
 assert.match(room,/malhaVisao\.position\.set\(\(dimensoes\.minX\+dimensoes\.maxX\)\/2,ALTURA_FOG_PISO_3D,/);
 assert.doesNotMatch(room,/malhaVisao\.position\.y=\.12/);
});
test('v29.15.30: materiais transparentes dos modelos são renderizados após a névoa',()=>{
 assert.match(room,/malhaVisao\.renderOrder=1/);
 assert.match(model,/obj\.renderOrder=3/);
 assert.match(model,/modelo\.traverse\(obj=>\{if\(obj instanceof THREE\.Mesh\)/);
});
test('v29.15.30: recorte seguro e sincronização de GLBs do jogador permanecem',()=>{
 assert.match(player,/sala\.configurarFogPublicado3D\(quadro\.mascara,quadro\.cenario,quadro\.poligono\)/);
 assert.match(player,/sala\.configurarMiniaturas\(configuracao\.miniaturas\?\?\[\],configuracao,remotos,true\)/);
 assert.match(room,/camadaMiniaturas\.vinculoAtivo\(id\)/);
});
