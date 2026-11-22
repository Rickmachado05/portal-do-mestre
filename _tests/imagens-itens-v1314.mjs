import test from 'node:test';
import assert from 'node:assert/strict';
import { imagemItemValida, processarImagemItem } from '../src/hexatombe/imagensItens.ts';
import { ITENS_KEY, listarItens, salvarItem, excluirItem, copiarParaInventario, adicionarItemInventario } from '../src/hexatombe/itensLibrary.ts';

class Storage {
  data = new Map();
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
  key(index){return [...this.data.keys()][index]??null;}
  get length(){return this.data.size;}
}
const storage=new Storage();
globalThis.localStorage=storage;
globalThis.window=new EventTarget();
const imagem = 'data:image/webp;base64,'+'A'.repeat(160);
const imagemNova = 'data:image/png;base64,'+'B'.repeat(160);
const dados = {nome:'Faca ilustrada',categoria:'arma',efeito:'dano',valor:'1d4',descricao:'Teste de imagem.',consumivel:false};

test('aceita somente miniaturas locais PNG, JPG e WebP',()=>{
  assert.equal(imagemItemValida(imagem),true);
  assert.equal(imagemItemValida(imagemNova),true);
  assert.equal(imagemItemValida('data:image/jpeg;base64,'+'C'.repeat(160)),true);
  for(const invalido of [null,'https://example.com/x.png','data:image/svg+xml;base64,'+'A'.repeat(160),'data:image/png;base64,'+'%'.repeat(100),'data:image/webp;base64,'+'A'.repeat(190010)]) {
    assert.equal(imagemItemValida(invalido),false);
  }
});

test('itens antigos continuam válidos, foto acompanha cópias e backup local',()=>{
  storage.setItem(ITENS_KEY,JSON.stringify([{...dados,id:'antigo',criadoEm:'2026-01-01',atualizadoEm:'2026-01-01'}]));
  assert.equal(listarItens()[0].imagem,undefined);
  const item=salvarItem({...dados,imagem});
  assert.equal(listarItens().find(x=>x.id===item.id)?.imagem,imagem);
  assert.ok(storage.getItem(ITENS_KEY).includes(imagem)); // prefixo salvo pelo backup do mestre
  const inventario=copiarParaInventario(item,1);
  assert.equal(inventario.imagem,imagem);
  salvarItem({...dados,imagem:imagemNova},item.id);
  assert.equal(inventario.imagem,imagem); // cópia independente após edição
  assert.equal(listarItens().find(x=>x.id===item.id)?.imagem,imagemNova);
  const duasArtes=adicionarItemInventario([inventario],listarItens().find(x=>x.id===item.id),1);
  assert.equal(duasArtes.length,2); // não combina pilhas com imagens distintas
  excluirItem(item.id);
  assert.equal(inventario.imagem,imagem); // não remove arte já entregue
});

test('permite remover imagem ao editar e bloqueia conteúdo externo',()=>{
  const item=salvarItem({...dados,nome:'Poção',imagem});
  const semImagem=salvarItem({...dados,nome:'Poção sem foto',imagem:undefined},item.id);
  assert.equal(semImagem.imagem,undefined);
  assert.throws(()=>salvarItem({...dados,imagem:'https://example.com/image.png'}),/Imagem inválida/);
});

test('reduz imagens no navegador sem necessidade de upload ou servidor',async()=>{
  const originalImage=globalThis.Image;
  const originalDocument=globalThis.document;
  const canvas={width:0,height:0, getContext:()=>({clearRect(){},drawImage(){}}),toDataURL:()=>imagem};
  class MockImage {naturalWidth=1600;naturalHeight=1000;onload=null;onerror=null;set src(_url){queueMicrotask(()=>this.onload?.());}}
  globalThis.Image=MockImage;
  globalThis.document={createElement:()=>canvas};
  try{
    const result=await processarImagemItem(new File(['abc'],'test.png',{type:'image/png'}));
    assert.equal(result,imagem);
    assert.equal(canvas.width,360);
    assert.equal(canvas.height,225);
    await assert.rejects(()=>processarImagemItem(new File(['abc'],'fake.svg',{type:'image/svg+xml'})),/PNG, JPG ou WebP/);
    await assert.rejects(()=>processarImagemItem(new File(['a'.repeat(8*1024*1024+1)],'large.jpg',{type:'image/jpeg'})),/máximo 8 MB/);
  }finally{
    globalThis.Image=originalImage;
    globalThis.document=originalDocument;
  }
});
