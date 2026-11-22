import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modoFogPublicado3D} from '../src/mesa3d/modoFogPublicado3D.mjs';
const fonte=p=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');
const todaOculta='0'.repeat(2304);
const metadeExplorada='1'.repeat(1152)+'0'.repeat(1152);
const areaVisivel='0'.repeat(1100)+'2'.repeat(100)+'0'.repeat(1104);

test('29.15.30.12: mapa 3D já censurado dispensa película para visão e exploração',()=>{
  for(const mascara of [areaVisivel,metadeExplorada]){
    assert.equal(modoFogPublicado3D(mascara,true,true),'imagem');
    assert.equal(modoFogPublicado3D(mascara,true,false),'imagem');
  }
});
test('29.15.30.12: antes de confirmar recorte usa película de proteção',()=>{
  assert.equal(modoFogPublicado3D(areaVisivel,false,false),'pelicula');
  assert.equal(modoFogPublicado3D(todaOculta,false,false),'pelicula');
});
test('29.15.30.12: máscara totalmente fechada apaga bitmap anterior em vez de sobrepor planos',()=>{
  assert.equal(modoFogPublicado3D(todaOculta,true,true),'ocultar-piso');
  assert.equal(modoFogPublicado3D(todaOculta,true,false),'pelicula');
});
test('29.15.30.12: máscaras inválidas nunca habilitam um overlay com estado incorreto',()=>{
  for(const mascara of [null,undefined,'', '2'.repeat(2303),'x'.repeat(2304)])
    assert.equal(modoFogPublicado3D(mascara,true,true),'desativado');
});
test('29.15.30.12: motor mantém a película apenas como proteção anterior ao recorte',()=>{
  const sala=fonte('mesa3d/roomScene.ts');
  assert.match(sala,/if\(modo==='desativado'\|\|modo==='imagem'\)\{\s*malhaVisao\.visible=false/);
  assert.match(sala,/if\(modo==='ocultar-piso'\)/);
  assert.match(sala,/contextoPisoPublicado!\.fillRect\(0,0,telaPisoPublicado!\.width,telaPisoPublicado!\.height\)/);
  assert.match(sala,/pisoPublicadoTemRecorte=true/);
  assert.match(sala,/pisoPublicadoTemRecorte=false/);
  assert.match(sala,/malhaVisao\.visible=true;materialVisao\.opacity=1/);
});
test('29.15.30.12: memória explorada escurecida diretamente no bitmap autorizado',()=>{
  const vista=fonte('multiplayer/visaoIndividualPublicada.ts');
  assert.match(vista,/ctx\.globalAlpha=\.27;ctx\.drawImage\(imagem/);
  assert.doesNotMatch(vista,/ctx\.globalAlpha=args\.modo3D\?1:\.27/);
  assert.match(vista,/serializarRecorteSeguro\(canvas\)/);
});
