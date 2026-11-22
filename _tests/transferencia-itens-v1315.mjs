import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {copiarParaInventario, transferirItemInventario, CATEGORIAS} from '../src/hexatombe/itensLibrary.ts';

const foto = 'data:image/webp;base64,' + 'A'.repeat(160);
const faca={id:'faca',nome:'Faca da Morgana',categoria:'arma',efeito:'dano',valor:'1d4',descricao:'Faca especial.',consumivel:false,imagem:foto,criadoEm:'2026',atualizadoEm:'2026'};
const pocao={...faca,id:'pocao',nome:'Poção de Cura',categoria:'consumivel',efeito:'cura',valor:'2d6',consumivel:true};
const acampamento={...faca,id:'barraca',nome:'Barraca',categoria:'acampamento',efeito:'nenhum',valor:'',imagem:undefined};

test('transfere uma parte da pilha sem duplicar e sem alterar a origem',()=>{
  const origem=[copiarParaInventario(pocao,5)];
  const destino=[];
  const resultado=transferirItemInventario(origem,destino,origem[0].id,2);
  assert.equal(resultado.origem[0].quantidade,3);
  assert.equal(resultado.destino[0].quantidade,2);
  assert.equal(resultado.item.nome,'Poção de Cura');
  assert.notEqual(resultado.destino[0].id,origem[0].id);
  assert.equal(resultado.destino[0].imagem,foto);
  assert.equal(resultado.destino[0].valor,'2d6');
  assert.equal(resultado.destino[0].consumivel,true);
  assert.equal(origem[0].quantidade,5);
  assert.equal(destino.length,0);
  assert.equal(resultado.origem[0].quantidade+resultado.destino[0].quantidade,5);
});

test('transfere o último item e mantém o identificador exclusivo do destinatário',()=>{
  const origem=[copiarParaInventario(faca,1)];
  const resultado=transferirItemInventario(origem,[],origem[0].id,1);
  assert.equal(resultado.origem.length,0);
  assert.equal(resultado.destino[0].imagem,foto);
  assert.equal(resultado.destino[0].nome,'Faca da Morgana');
  assert.notEqual(resultado.destino[0].id,origem[0].id);
  assert.equal(resultado.destino[0].equipado,false);
});

test('empilha apenas itens idênticos e preserva a pilha do destinatário',()=>{
  const o=copiarParaInventario(pocao,3);
  const d=copiarParaInventario(pocao,4);
  const r=transferirItemInventario([o],[d],o.id,2);
  assert.equal(r.origem[0].quantidade,1);
  assert.equal(r.destino.length,1);
  assert.equal(r.destino[0].id,d.id);
  assert.equal(r.destino[0].quantidade,6);
  const d2={...d,imagem:'data:image/png;base64,'+'B'.repeat(160)};
  const diferente=transferirItemInventario([o],[d2],o.id,1);
  assert.equal(diferente.destino.length,2);
  assert.equal(diferente.destino[1].imagem,foto);
  assert.notEqual(diferente.destino[1].id,d2.id);
});

test('não transfere quantidades inválidas, inexistentes ou excedentes',()=>{
  const o=copiarParaInventario(faca,2);
  for(const q of [0,-1,3,1.5,NaN,Infinity,10000])
    assert.throws(()=>transferirItemInventario([o],[],o.id,q),/quantidade|possui/);
  assert.throws(()=>transferirItemInventario([o],[],'item-inexistente',1),/não possui/);
  assert.throws(()=>transferirItemInventario([o],[{...o,id:'destino',quantidade:9999}],o.id,1),/limite de 9999/);
  assert.equal(o.quantidade,2);
});

test('categorias disponíveis cobrem armas, comida, acampamento e consumíveis',()=>{
  assert.equal(CATEGORIAS.arma,'Arma');
  assert.equal(CATEGORIAS.comida,'Comida');
  assert.equal(CATEGORIAS.acampamento,'Acampamento');
  assert.equal(CATEGORIAS.consumivel,'Consumível');
  assert.equal(acampamento.categoria,'acampamento');
});

test('UI mantém visual e uso de itens, permite filtrar/transferir e não exige equipamentos/raridades',()=>{
  const ui=readFileSync(new URL('../src/hexatombe/InventarioMesa.tsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(ui,/Filtrar inventário por categoria/);
  assert.match(ui,/itensFiltrados\.length/);
  assert.match(ui,/Confirmar entrega/);
  assert.match(ui,/ImagemItem/);
  assert.doesNotMatch(ui,/Equipado|Raridade/);
  assert.match(app,/transferirItemInventario/);
  assert.match(app,/destinatarios=\{campanha\.unidades\.filter/);
  assert.match(app,/onTransferir=\{transferirItem\}/);
});
