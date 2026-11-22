import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITENS_KEY,listarItens,salvarItem,excluirItem,copiarParaInventario,adicionarItemInventario,
  consumirItem,analisarValorItem,aplicarDanoComEscudo,concederEscudo,
} from '../src/hexatombe/itensLibrary.ts';

class MockStorage {
  data=new Map();getItem(k){return this.data.get(k)??null;}
  setItem(k,v){this.data.set(k,String(v));}
  removeItem(k){this.data.delete(k);}
  key(i){return [...this.data.keys()][i]??null;}
  get length(){return this.data.size;}
}
const storage=new MockStorage();
globalThis.localStorage=storage;
globalThis.window=new EventTarget();

test('escudo absorve o dano antes do HP, inclusive dano excedente',()=>{
  assert.deepEqual(aplicarDanoComEscudo(135,10,7),{hp:135,escudo:3,absorvido:7,danoHp:0});
  assert.deepEqual(aplicarDanoComEscudo(135,10,17),{hp:128,escudo:0,absorvido:10,danoHp:7});
  assert.deepEqual(aplicarDanoComEscudo(5,0,300),{hp:0,escudo:0,absorvido:0,danoHp:5});
});
test('escudos temporários mantêm o maior valor sem acumular',()=>{
  assert.equal(concederEscudo(8,5),8);
  assert.equal(concederEscudo(8,14),14);
  assert.equal(concederEscudo(0,5),5);
});
test('efeitos aceitam valores numéricos e fórmulas compatíveis com dados 3D',()=>{
  assert.deepEqual(analisarValorItem(' 1d6 + 2 '),{tipo:'dados',formula:'1d6+2'});
  assert.deepEqual(analisarValorItem('10'),{tipo:'fixo',valor:10});
  for(const invalid of ['0','10d20','1d7','abc','2d20+1000','1d6 + 99999']) assert.equal(analisarValorItem(invalid),null,invalid);
});
test('biblioteca global, snapshots de inventário e consumo conservam independência',()=>{
  const faca=salvarItem({nome:'Faca da Morgana',categoria:'arma',efeito:'dano',valor:'1d4+1',descricao:'Dano definido pelo mestre.',consumivel:false});
  const barraca=salvarItem({nome:'Barraca',categoria:'acampamento',efeito:'nenhum',valor:'',descricao:'Reutilizável.',consumivel:false});
  const pocao=salvarItem({nome:'Poção',categoria:'consumivel',efeito:'cura',valor:'2d6',descricao:'Teste.',consumivel:true});
  assert.equal(listarItens().length,3);
  assert.equal(storage.getItem(ITENS_KEY)!==null,true);
  const inventario1=adicionarItemInventario([],faca,1);
  assert.equal(inventario1[0].nome,'Faca da Morgana');
  assert.equal(inventario1[0].consumivel,false);
  const inventario2=adicionarItemInventario(inventario1,pocao,3);
  const inventario3=adicionarItemInventario(inventario2,pocao,2);
  assert.equal(inventario3.find(x=>x.catalogoId===pocao.id)?.quantidade,5);
  const consumido=consumirItem(inventario3,inventario3[1].id);
  assert.equal(consumido[1].quantidade,4);
  const facaCopia=copiarParaInventario(faca,1);
  salvarItem({...faca,nome:'Faca revisada'},faca.id);
  assert.equal(facaCopia.nome,'Faca da Morgana');
  excluirItem(faca.id);
  assert.equal(listarItens().length,2);
  assert.equal(facaCopia.nome,'Faca da Morgana');
  assert.equal(barraca.efeito,'nenhum');
});
test('não permite fórmulas inválidas nem itens sem nome',()=>{
  assert.throws(()=>salvarItem({nome:'Poção ruim',categoria:'consumivel',efeito:'cura',valor:'23d6',descricao:'',consumivel:true}),/Efeito inválido/);
  assert.throws(()=>salvarItem({nome:' ',categoria:'outro',efeito:'nenhum',valor:'',descricao:'',consumivel:false}),/nome do item/);
});
