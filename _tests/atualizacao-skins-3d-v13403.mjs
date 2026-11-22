import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {skinAtiva} from '../src/lib/tokenSkins.ts';

const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');

test('troca de skin por cena altera a skin resolvida para o token selecionado',()=>{
  const u={skins:[{id:'armadura',nome:'Armadura'},{id:'viagem',nome:'Viagem'}],skinPadraoId:'armadura'};
  assert.equal(skinAtiva(u,{skinId:'viagem'}),'viagem');
  assert.equal(skinAtiva(u,{skinId:'armadura'}),'armadura');
  assert.equal(skinAtiva(u,{skinId:'original'}),'original');
  assert.equal(skinAtiva(u,{}),'armadura');
});

test('avatar selecionado recarrega textura quando muda skinId na cena',()=>{
  assert.match(viewer,/\},\[id,nomeSelecionado\.skinPadraoId,cenaAtual\?\.tokens\[id\]\?\.skinId,/);
  assert.match(viewer,/await sala\.trocarAparencia\(blob,escolhido\.nome/);
});

test('mudanca de skin ou upload de arquivo e notificacao explicita enviada ao iframe',()=>{
  assert.match(app,/const assinaturaSkins3D=JSON\.stringify\(/);
  assert.match(app,/tokens:Object\.entries\(cenaAtual\.tokens\)\.map\(\(\[id,token\]\)=>\(\{id,skinId:token\.skinId\}\)\)/);
  assert.match(app,/\},\[assinaturaSkins3D,revisaoToken\]\)/);
  assert.match(app,/enviar3D\('skins-atualizadas'\)/);
});

test('iframe atualiza somente metadados e imagens sem reiniciar o palco 3D',()=>{
  assert.match(viewer,/if\(tipo==='skins-atualizadas'\)\{[\s\S]*?setEstado\(buscarCampanha\(\)\);\s*setRevisaoImagens\(v=>v\+1\);/);
  assert.match(viewer,/\},\[visuaisCena,salaPronta,revisaoImagens\]\)/);
  const handler=viewer.split("if(tipo==='skins-atualizadas'){")[1].split("if(tipo==='camera'")[0];
  assert.doesNotMatch(handler,/(?:setCenario|setPosicao|criarSala3D)\(/);
});

test('handshake inicial envia skins ao iframe que acabou de iniciar',()=>{
  assert.match(app,/if\(e\.data\.tipo==='pronto'\)\{[\s\S]*?enviar3D\('skins-atualizadas'\);/);
});
