import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';

const read=(rel)=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const editor=read('src/mesa3d/Mesa3DPrototipo.tsx');
const camp=read('src/portal/GestaoCampanhas.tsx');
const css=read('src/mesa3d/Mesa3DPrototipo.css');
const style=read('src/portal/Portal.css');
const source2d=read('src/App.tsx');
const scene=read('src/mesa3d/roomScene.ts');

// Proteção especial contra as regressões da 1.3.38: o refino de UI não pode alterar renderizador nem cenas.
test('editor apresenta Mapa e Construção, sem Ambiente duplicado',()=>{
  for(const id of ['mapa','construcao']){
    assert.ok(editor.includes(`{id:'${id}',rotulo:`),id);
    assert.ok(editor.includes(`abaEditor==='${id}'`),id);
    assert.ok(editor.includes(`m3d-conteudo-${id}`),id);
  }
  assert.match(editor,/role="tablist" aria-label="Seções do Terreno 3D"/);
  assert.match(editor,/role="tabpanel"/);
  assert.match(editor,/aria-selected=\{abaEditor===aba.id\}/);
});

test('o céu validado na 1.3.36 segue em Iluminação, sem mudar o renderizador',()=>{
  assert.doesNotMatch(editor,/abaEditor==='ambiente'/);
  assert.match(source2d,/CÉU E HORÁRIO · MESA 3D/);
  assert.match(source2d,/PERIODOS_DIA_3D\.map/);
  assert.match(source2d,/escolherPeriodoDia3D\(periodo\)/);
  assert.match(scene,/configurarIluminacao/);
});

test('importação é opcional e painel Mapa contém ajustes legados protegidos',()=>{
  const inicio=editor.indexOf("{abaEditor==='mapa'&&");
  const fim=editor.indexOf("{abaEditor==='mapa'&&<section className=\"m3d-editor-tab-content m3d-editor-mapa-config",inicio);
  const bloco=editor.slice(inicio,fim);
  assert.match(bloco,/importarPiso/);
  assert.match(bloco,/usarMapaDaMesa2D/);
  assert.match(bloco,/Importar mapa para as duas mesas/);
  assert.match(bloco,/confirmarRascunhoPlanta\('largura'/);
  assert.match(bloco,/confirmarRascunhoPlanta\('profundidade'/);
  assert.doesNotMatch(bloco,/m3d-terreno-material/);
});

test('configurações legadas protegidas; mapa único permite escala proporcional',()=>{
  const inicio=editor.indexOf("{abaEditor==='mapa'&&<section className=\"m3d-editor-tab-content m3d-editor-mapa-config");
  const fim=editor.indexOf("{abaEditor==='construcao'&&",inicio);
  const bloco=editor.slice(inicio,fim);
  assert.match(bloco,/m3d-terreno-material/);
  assert.match(bloco,/rascunhoLarguraTerreno/);
  assert.match(bloco,/rascunhoProfundidadeTerreno/);
  assert.match(editor,/const confirmarRascunhoTerreno=/);
  assert.match(editor,/Existem objetos fora dessa medida/);
  assert.match(editor,/O terreno não pode ficar menor que a imagem da planta/);
  assert.match(bloco,/Expandir terreno/); // somente para cenários anteriores
  assert.match(bloco,/Tamanho do mapa compartilhado/);
  assert.match(bloco,/cenario.mapaUnico/);
});

test('construção mantém ferramentas e seleção de objetos apenas na sua aba',()=>{
  const bloco=editor.slice(editor.indexOf("{abaEditor==='construcao'&&"), editor.indexOf("{modoMestre&&painelAtivo==='mesa'"));
  for(const texto of ['encaixarGrade','TIPOS_OBJETO_3D.map','selecionadoObjeto','Duplicar objeto','Remover objeto selecionado','Limpar personalizações'])assert.ok(bloco.includes(texto),texto);
  assert.match(css,/\.m3d-editor-tabs/);
  assert.match(css,/\.m3d-editor-tab-content/);
});

test('criação de campanha oferece duas modalidades sem exigir a outra',()=>{
  assert.match(camp,/Formato principal da campanha/);
  assert.match(camp,/type="radio" name="modoMesa" value="2d"/);
  assert.match(camp,/type="radio" name="modoMesa" value="3d"/);
  assert.match(camp,/urlMesaPreferidaCampanha\(m\)/);
  assert.match(camp,/modoMesa:'2d'/);
  assert.match(camp,/sem excluir suas cenas, fichas ou construções/);
  assert.doesNotMatch(camp,/href=\{urlMesaCampanha\(m.id\)\}/);
  assert.match(style,/\.hp-modo-opcoes/);
  assert.match(source2d,/MODO_3D \? <div className="mapa-viewport mapa-viewport-3d"/);
});

test('JSX continua sintaticamente válido e o editor não usa dialog nativo de exclusão',()=>{
  for(const [arq,conteudo] of [['editor',editor],['campanha',camp]]){
    const file=ts.createSourceFile(arq+'.tsx',conteudo,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
    assert.equal(file.parseDiagnostics.length,0,arq);
  }
  assert.doesNotMatch(editor,/window\.confirm|window\.prompt|window\.alert/);
});
