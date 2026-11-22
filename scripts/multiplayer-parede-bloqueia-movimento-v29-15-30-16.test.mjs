import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

// Executa a geometria REAL usada pelo mestre, sem a UI ou mapas privados.
const fonte=readFileSync(new URL('../src/lib/lighting.ts',import.meta.url),'utf8');
const codigo=stripTypeScriptTypes(fonte,{mode:'strip'});
const {bloqueiaPassagem,barreiraBloqueiaMovimento,barreiraBloqueiaVisao}=
  await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`);
const parede={id:'parede-teste',tipo:'parede',x1:50,y1:10,x2:50,y2:90,aberta:false,trancada:false};
const vai=(b,origem={x:40,y:50},destino={x:60,y:50})=>bloqueiaPassagem(origem,destino,[b],100,100);

test('v29.15.30.16: parede sólida impede atravessar em ambos os sentidos',()=>{
  assert.equal(vai(parede),true);
  assert.equal(vai(parede,{x:60,y:50},{x:40,y:50}),true);
  assert.equal(vai(parede,{x:40,y:30},{x:44,y:30}),false,'Movimento livre deve continuar');
});

test('v29.15.30.16: visão e movimento são regras independentes',()=>{
  const apenasVisao={...parede,bloqueiaMovimento:false,bloqueiaVisao:true};
  assert.equal(barreiraBloqueiaVisao(apenasVisao),true);
  assert.equal(barreiraBloqueiaMovimento(apenasVisao),false);
  assert.equal(vai(apenasVisao),false,'Uma parede configurada explicitamente como permeável mantém essa decisão');
  const apenasMovimento={...parede,bloqueiaMovimento:true,bloqueiaVisao:false};
  assert.equal(barreiraBloqueiaVisao(apenasMovimento),false);
  assert.equal(vai(apenasMovimento),true,'Paredes físicas seguem bloqueando mesmo sem bloquear visão');
});

test('v29.15.30.16: porta fechada bloqueia, aberta libera',()=>{
  assert.equal(vai({...parede,tipo:'porta',aberta:false}),true);
  assert.equal(vai({...parede,tipo:'porta',aberta:true}),false);
});

test('v29.15.30.16: validação de parede no mestre não depende de checkbox ou câmera 2D/3D',()=>{
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  const validar=app.slice(app.indexOf('function validarMovimentoConvidado('),app.indexOf('function moverTokenConvidado('));
  assert.match(validar,/if\(bloqueiaPassagem\(\{x:token\.x,y:token\.y\},final,cena\.barreiras\?\?\[\],100,100\)\)/);
  assert.doesNotMatch(validar,/if\(cena\.iluminacao\?\.colisao && bloqueiaPassagem/);
  assert(validar.indexOf('if(bloqueiaPassagem(')<validar.indexOf('if(MODO_3D)'),
    'A colisão de parede precisa ocorrer antes do ramo exclusivo do mestre 3D');
  assert.match(app,/function moverTokenConvidado\(/);
  const publicador=readFileSync(new URL('../src/multiplayer/PublicadorMesa.tsx',import.meta.url),'utf8');
  assert.match(publicador,/if\(!aceito && evento\.gestoId\)/,'Colisão encerra o arrasto atual do convidado');
});
