import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcularTamanhoVisualPlanta3D} from '../src/mesa3d/pisoConstruicao3D.ts';
import {normalizarCenario3D} from '../src/mesa3d/editorCena3D.ts';
import {referenciaTokens3D,percentualParaChao3D,chaoParaPercentual3D} from '../src/mesa3d/mesaLivre3D.ts';
const fonte=(p)=>readFileSync(new URL(`../src/mesa3d/${p}`,import.meta.url),'utf8');

test('planta 3D muda só a largura ou só a profundidade quando ajuste livre está ativo',()=>{
  const largura=calcularTamanhoVisualPlanta3D(900,1800,18,36,30,15,'conter',1,true);
  assert.deepEqual(largura,{largura:30,altura:15});
  const profundidade=calcularTamanhoVisualPlanta3D(900,1800,18,36,18,45,'conter',1,true);
  assert.deepEqual(profundidade,{largura:18,altura:45});
  assert.deepEqual(calcularTamanhoVisualPlanta3D(900,1800,18,36,30,15,'conter',1.5,true),{largura:45,altura:22.5});
});
test('cenas antigas continuam usando o enquadramento proporcional sem deformação',()=>{
  const visual=calcularTamanhoVisualPlanta3D(900,1800,30,15,30,15,'conter',1,false);
  assert.deepEqual(visual,{largura:7.5,altura:15});
  const salvo=normalizarCenario3D({versao:1,base:'vazia',objetos:[],piso:'imagem',larguraTerreno:30,profundidadeTerreno:15,larguraPlanta:30,profundidadePlanta:15});
  assert.equal(salvo.ajusteLivrePlanta,undefined);
});
test('opção de alongar e proporção original persistem com validação',()=>{
  const salvo=normalizarCenario3D({versao:1,base:'vazia',objetos:[],piso:'imagem',ajusteLivrePlanta:true,aspectoPlanta:.5,larguraPlanta:26,profundidadePlanta:12});
  assert.equal(salvo.ajusteLivrePlanta,true);
  assert.equal(salvo.aspectoPlanta,.5);
  assert.equal(salvo.larguraPlanta,26);
  assert.equal(salvo.profundidadePlanta,12);
  assert.equal(normalizarCenario3D({...salvo,ajusteLivrePlanta:'sim'}).ajusteLivrePlanta,undefined);
});
test('tokens se alinham à planta após alongar cada eixo independentemente',()=>{
  const livre={versao:1,base:'vazia',objetos:[],piso:'imagem',larguraTerreno:40,profundidadeTerreno:40,larguraPlanta:28,profundidadePlanta:12,ajusteLivrePlanta:true,aspectoPlanta:.5};
  const largura=referenciaTokens3D(livre);
  assert.equal(largura.largura,28);
  assert.equal(largura.profundidade,12);
  assert.deepEqual(percentualParaChao3D({x:100,y:50},livre),{x:14,z:0});
  const maisAlto={...livre,profundidadePlanta:20};
  assert.deepEqual(percentualParaChao3D({x:100,y:50},maisAlto),{x:14,z:0});
  assert.deepEqual(percentualParaChao3D({x:50,y:100},maisAlto),{x:0,z:10});
  assert.deepEqual(chaoParaPercentual3D({x:0,z:10},maisAlto),{x:50,y:100});
});
test('restaurar encaixe proporcional atualiza também a área real dos tokens',()=>{
  const mapa={versao:1,base:'vazia',objetos:[],piso:'imagem',larguraTerreno:40,profundidadeTerreno:40,larguraPlanta:30,profundidadePlanta:15,aspectoPlanta:.5,ajusteLivrePlanta:false};
  const d=referenciaTokens3D(mapa);
  assert.equal(d.largura,7.5);
  assert.equal(d.profundidade,15);
  assert.deepEqual(percentualParaChao3D({x:100,y:100},mapa),{x:3.75,z:7.5});
});
test('editor expõe os dois eixos e terreno cresce para caber a planta',()=>{
  const tela=fonte('Mesa3DPrototipo.tsx');
  const cenario=fonte('roomScene.ts');
  assert.match(tela,/aria-label="Largura da planta 3D"/);
  assert.match(tela,/aria-label="Profundidade da planta 3D"/);
  assert.match(tela,/redimensionarPlanta\('largura',Number\(e\.target\.value\)\)/);
  assert.match(tela,/redimensionarPlanta\('profundidade',Number\(e\.target\.value\)\)/);
  assert.match(tela,/larguraTerreno:Math\.min\(120,Math\.max/);
  assert.match(tela,/profundidadeTerreno:Math\.min\(120,Math\.max/);
  assert.match(tela,/Manter proporção original/);
  assert.match(cenario,/calcularTamanhoVisualPlanta3D/);
});
