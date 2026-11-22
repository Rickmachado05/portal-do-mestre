import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TOKEN_ORIGINAL, chaveImagemSkin, limparSkinNoToken, nomeSkinPadrao,
  removerSkinUnidade, skinAtiva, skinsValidas, validarImagemSkin,
} from '../src/lib/tokenSkins.ts';

const morgana = {
  id:'morgana', nome:'Morgana', temToken:true,
  skins:[{id:'combate',nome:'Combate'},{id:'ferida',nome:'Ferida'}],
  skinPadraoId:'combate',
};

test('preserva token original e reconhece skin padrão nas cenas antigas', () => {
  assert.equal(skinAtiva({}), TOKEN_ORIGINAL);
  assert.equal(skinAtiva(morgana), 'combate');
  assert.equal(skinAtiva(morgana,{x:50,y:60,rotacao:90}), 'combate');
  assert.equal(nomeSkinPadrao(morgana), 'Combate');
  assert.equal(skinAtiva(morgana,{skinId:'original'}),'original');
  assert.equal(skinAtiva(morgana,{skinId:'ferida'}),'ferida');
  assert.equal(skinAtiva(morgana,{skinId:'inexistente'}),'combate');
});

test('skins são independentes de acordo com a cena e metadados antigos permanecem', () => {
  const cena1 = {skinId:'ferida',x:23,y:45,tamanho:65,rotacao:180,oculto:true,visao:20};
  const cena2 = {x:55,y:35,tamanho:80,rotacao:0,oculto:false};
  assert.equal(skinAtiva(morgana,cena1),'ferida');
  assert.equal(skinAtiva(morgana,cena2),'combate');
  const limpa = limparSkinNoToken(cena1,'ferida');
  assert.equal(limpa.skinId,undefined);
  assert.equal(limpa.x,23);
  assert.equal(limpa.tamanho,65);
  assert.equal(limpa.rotacao,180);
  assert.equal(limpa.visao,20);
  assert.equal(cena1.skinId,'ferida');
});

test('exclusão devolve ao padrão sem apagar outras skins e sem mexer em HP', () => {
  const u = {...morgana, hp:100, condicoes:[{nome:'Sono'}]};
  const nova=removerSkinUnidade(u,'combate');
  assert.equal(nova.skinPadraoId,TOKEN_ORIGINAL);
  assert.equal(nova.skins.length,1);
  assert.equal(nova.skins[0].id,'ferida');
  assert.equal(nova.hp,100);
  assert.equal(nova.condicoes[0].nome,'Sono');
  assert.equal(u.skins.length,2);
  assert.equal(u.skinPadraoId,'combate');
  assert.equal(skinAtiva(nova,{skinId:'combate'}),'original');
});

test('metadados antigos e inválidos são tratados com segurança', () => {
  assert.deepEqual(skinsValidas({skins:null}),[]);
  assert.deepEqual(skinsValidas({skins:[null,{id:'original',nome:'Original'},{id:'abc',nome:'Skin'},{id:'abc',nome:'Repetida'},{id:'',nome:'Vazia'}]}),[{id:'abc',nome:'Skin'}]);
  assert.equal(skinAtiva({skinPadraoId:'sumida'}),'original');
});

test('valida formatos de imagem e limite de tamanho e cria chave de arquivo exclusiva', () => {
  assert.equal(validarImagemSkin({type:'image/png',size:200}),null);
  assert.equal(validarImagemSkin({type:'image/jpeg',size:200}),null);
  assert.equal(validarImagemSkin({type:'image/webp',size:200}),null);
  assert.match(validarImagemSkin({type:'image/svg+xml',size:200}),/PNG/);
  assert.match(validarImagemSkin({type:'image/png',size:9000000}),/8 MB/);
  assert.match(validarImagemSkin({type:'image/png',size:0}),/8 MB/);
  assert.equal(chaveImagemSkin('morgana','ferida'),'token-skin:morgana:ferida');
});

test('interface permite galeria, escolha por cena, padrões e exclusão confirmada', () => {
  const codigo = readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(codigo,/Galeria de skins do token/);
  assert.match(codigo,/Seguir padrão/);
  assert.match(codigo,/Confirmar exclusão/);
  assert.match(codigo,/Definir padrão/);
  assert.match(codigo,/Adicionar skin/);
  assert.match(codigo,/skinId: novaSkin.id/);
  assert.match(codigo,/imagemTokenCena\(u,p\)/);
  assert.match(codigo,/chaveImagemSkin\(ref, skin.id\)/);
  assert.match(codigo,/skinId: e.target.value \|\| undefined/);
});

test('backup inclui as imagens das skins via IndexedDB', () => {
  const codigo = readFileSync(new URL('../src/portal/backupMestre.ts',import.meta.url),'utf8');
  assert.match(codigo,/'hexatombe-mesa-arquivos'/);
  assert.match(codigo,/openCursor\(\)/);
  // O backup percorre o store inteiro. Não depende de uma lista fixa de tipos de token.
});
