import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=arquivo=>readFileSync(new URL(`../${arquivo}`,import.meta.url),'utf8');

test('v29.12.1: câmera tem nomes visíveis e feedback de estado',()=>{
 const mapa=ler('src/multiplayer/MesaConvidado2D.tsx');
 assert.match(mapa,/<span>Centralizar<\/span>/);
 assert.match(mapa,/seguirToken\?'Seguindo':'Seguir'/);
 assert.match(mapa,/aria-pressed=\{seguirToken\}/);
 assert.match(mapa,/aria-label=\{seguirToken\?'Desativar seguir personagem':'Ativar seguir personagem'\}/);
 assert.match(mapa,/<svg viewBox=/);
});
test('v29.12.1: arrasto do token e proteção 3D preservados; Shift não cria ações',()=>{
 const mapa=ler('src/multiplayer/MesaConvidado2D.tsx');
 assert.doesNotMatch(mapa,/cliqueMover|e\.shiftKey|Shift \+ clique/);
 assert.match(mapa,/onTokenDown=\{onTokenDown\}/);
 assert.match(ler('src/multiplayer/TokenConvidadoFluido.tsx'),/onPointerDown=\{e=>onTokenDown\(e,token.id\)\}/);
 assert.match(mapa,/if\(visualizacao==='3d'\)return/);
 assert.match(mapa,/onSolicitarMovimento=\{onMoverPonto\}/);
});
test('v29.12.1: botão seguir, zoom e CSS acessível em todas as larguras',()=>{
 const mapa=ler('src/multiplayer/MesaConvidado2D.tsx');
 const css=ler('src/multiplayer/MesaConvidado2DParity.css');
 assert.match(mapa,/onClick=\{\(\)=>\{if\(!seguirToken\)centralizarNoPersonagem\(\);setSeguirToken\(!seguirToken\);\}\}/);
 assert.match(mapa,/setSeguirToken\(false\);setZoom\(1\);setPan/);
 assert.match(css,/\.pm-jogo-camera-acoes/);
 assert.match(css,/\.pm-jogo-camera-zoom/);
 assert.match(css,/@media\(max-width:620px\)/);
});
