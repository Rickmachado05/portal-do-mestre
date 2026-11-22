import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcularLayoutLateralMenuCombate} from '../src/hexatombe/posicaoMenuCombate.ts';
import {PADRAO_HUD_COMBATE, TEMAS_HUD_COMBATE, CHAVE_HUD_COMBATE,
  lerPersonalizacaoHud, salvarPersonalizacaoHud, sanitizarPersonalizacaoHud, escolherTemaHud} from '../src/hexatombe/personalizacaoHudCombate.ts';
const menu=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css',import.meta.url),'utf8');

function retangulos(layout){
 const e=layout.escala;
 return {
  main:{min:layout.principal.left,max:layout.principal.left+layout.larguraPrincipal*e},
  lista:{min:layout.lista.left,max:layout.lista.left+layout.lista.width*e},
  detalhe:{min:layout.detalhe.left,max:layout.detalhe.left+layout.detalhe.width*e},
 };
}
const separado=(a,b)=>a.max<=b.min+.2||b.max<=a.min+.2;

test('reserva segura do token na resolução da captura, inclusive com zoom e escala',()=>{
 for(const x of [740,800,820,830,850,900,1000,1100,1230])for(const escala of [.8,1,1.2]){
  const distancia=100;
  const l=calcularLayoutLateralMenuCombate({x,y:500,visivel:true},1649,928,{escala,distancia});
  const r=retangulos(l);
  for(const a of [r.main,r.lista,r.detalhe]){
   assert.ok(a.min>=-1&&a.max<=1649.5,`fora da janela ${x}/${escala}`);
   // Todos os painéis ficam fora da zona protegida horizontalmente nos layouts laterais.
   if(l.modo!=='vertical')assert.ok(a.max<=x-distancia+.5||a.min>=x+distancia-.5,
     `painel tocou avatar ${x}/${escala}: ${JSON.stringify({l,r})}`);
  }
  if(l.modo==='triplo'){
   assert.ok(separado(r.main,r.lista)&&separado(r.main,r.detalhe)&&separado(r.lista,r.detalhe),`sobreposição tripla ${x}/${escala}`);
  }else if(l.modo==='duplo'){
   assert.ok(separado(r.main,r.lista)&&separado(r.main,r.detalhe));
   assert.ok(l.lista.top+l.lista.maxHeight*l.escala<=l.detalhe.top+.9);
  }
 }
});

test('a captura da Morgana permite três faixas ao lado do token sem cobri-lo',()=>{
 const x=820;
 const l=calcularLayoutLateralMenuCombate({x,y:520,visivel:true},1649,928);
 assert.equal(l.modo,'triplo');
 assert.equal(l.direcao,'direita');
 assert.ok(l.principal.left>=x+100);
 assert.ok(l.detalhe.left+l.detalhe.width<=1517);
});

test('temas disponíveis, cor manual, validação e valores extremos',()=>{
 assert.deepEqual(TEMAS_HUD_COMBATE.map(t=>t.id),['original','agua','fogo','terra','ar','espiritual','customizado']);
 assert.equal(escolherTemaHud(PADRAO_HUD_COMBATE,'agua').cor,'#378ed2');
 const custom=sanitizarPersonalizacaoHud({tema:'customizado',cor:'#ABC123',escala:20,distancia:-20,intensidade:300,lado:'invalid'});
 assert.deepEqual([custom.cor,custom.escala,custom.distancia,custom.intensidade,custom.lado],['#ABC123',1.2,75,100,'auto']);
 assert.equal(sanitizarPersonalizacaoHud({tema:'fogo',cor:'bad'}).cor,'#e56b3a');
 assert.equal(sanitizarPersonalizacaoHud(null).tema,'original');
});

test('preferências são distintas por personagem e sobrevivem a remount/turno',()=>{
 const data=new Map();
 const antigo=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 try{
  salvarPersonalizacaoHud('morgana',{...PADRAO_HUD_COMBATE,tema:'agua',cor:'#378ed2',escala:.9});
  salvarPersonalizacaoHud('naeris',{...PADRAO_HUD_COMBATE,tema:'terra',cor:'#608e58'});
  assert.equal(lerPersonalizacaoHud('morgana').escala,.9);
  assert.equal(lerPersonalizacaoHud('naeris').tema,'terra');
  assert.equal(lerPersonalizacaoHud('outro').tema,'original');
  assert.ok(data.get(CHAVE_HUD_COMBATE).includes('morgana'));
  salvarPersonalizacaoHud('morgana',PADRAO_HUD_COMBATE);
  assert.equal(lerPersonalizacaoHud('naeris').tema,'terra');
 }finally{if(antigo===undefined)delete globalThis.localStorage;else globalThis.localStorage=antigo;}
});

test('editor aparece por personagem sem alterar a ficha ou as rolagens',()=>{
 assert.match(menu,/personagemId: string/);
 assert.match(menu,/onRolar\('1d20'/);
 assert.match(menu,/onUsarItem\(item\)/);
 assert.match(menu,/lerPersonalizacaoHud\(personagemId\)/);
 assert.match(menu,/salvarPersonalizacaoHud\(personagemId, personalizacao\)/);
 assert.match(menu,/aria-label="Personalizar HUD deste personagem"/);
 assert.match(menu,/Distância do token/);
 assert.match(menu,/Restaurar padrão/);
 assert.match(app,/personagemId=\{foco.id\}/);
 assert.match(css, /--hx-hud-acento/);
 assert.match(css, /hx-combate-editor-temas/);
});
