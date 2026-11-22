/** Regressão v29.8 — sem Vite, sem janela gráfica; cobre o histórico e contratos UI. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
let ts;try{ts=require('typescript')}catch{ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}
const pasta=path.join(__dirname,'../src');
const ler=x=>fs.readFileSync(path.join(pasta,x),'utf8');
let n=0;
function teste(t,fn){fn();n++;console.log('✓',t)}
function apiTS(file){const output=ts.transpileModule(ler(file),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});assert.equal(output.diagnostics?.length||0,0);const mod={exports:{}};new Function('module','exports',output.outputText)(mod,mod.exports);return mod.exports}
const store=new Map();global.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{store.set(k,v)}};
const h=apiTS('lib/historicoEdicaoMesa.ts');
const cena={tokens:{a:{x:10,y:20}},barreiras:[],fontesLuz:[],marcadores:[],desenhos:[],nevoa:[],hp:120,mana:30,inventario:['adaga']};
const nova={...cena,marcadores:[{id:'m1',texto:'Entrada',x:20,y:30}],hp:80,mana:12};
teste('O histórico ignora atributos de combate e inventário',()=>{
  const snap=h.extrairEdicaoCena(nova);assert.equal('hp' in snap,false);assert.equal('mana' in snap,false);assert.equal('inventario' in snap,false);
  const restaurada=h.aplicarEdicaoCena({...nova,hp:66,mana:8,inventario:['pergaminho']},h.extrairEdicaoCena(cena));
  assert.equal(restaurada.hp,66);assert.equal(restaurada.mana,8);assert.deepEqual(restaurada.inventario,['pergaminho']);assert.equal(restaurada.marcadores.length,0);
});
teste('Registrar, desfazer e refazer mantém um único passo por ação',()=>{
  const antes=h.extrairEdicaoCena(cena),depois=h.extrairEdicaoCena(nova);
  assert.equal(h.registrarEdicao('camp','cena','cena',antes,depois),true);
  assert.equal(h.registrarEdicao('camp','cena','cena',antes,depois),false);
  assert.deepEqual(h.historicoDisponivel('camp','cena'),{desfazer:1,refazer:0});
  const undo=h.passoEdicao('camp','cena','desfazer');assert.equal(undo.tipo,'cena');assert.deepEqual(undo.valor,antes);
  assert.deepEqual(h.historicoDisponivel('camp','cena'),{desfazer:0,refazer:1});
  const redo=h.passoEdicao('camp','cena','refazer');assert.equal(redo.tipo,'cena');assert.deepEqual(redo.valor,depois);
});
teste('Nenhum histórico é criado para mudanças sem alteração gráfica',()=>{
  assert.equal(h.registrarEdicao('camp','outra','cena',h.extrairEdicaoCena(cena),h.extrairEdicaoCena({...cena,hp:5})),false);
});
teste('Um traço de névoa é uma ação única no Ctrl+Z',()=>{
  const a={...cena,nevoa:[]};
  const b={...cena,nevoa:[{id:'traco-a',acao:'revelar',raio:5,pontos:[{x:20,y:30}]}]};
  const c={...cena,nevoa:[{id:'traco-a',acao:'revelar',raio:5,pontos:[{x:20,y:30},{x:21,y:31}]}]};
  const d={...cena,nevoa:[{id:'traco-a',acao:'revelar',raio:5,pontos:[{x:20,y:30},{x:21,y:31},{x:22,y:32}]}]};
  for(const [antes,depois] of [[a,b],[b,c],[c,d]])h.registrarEdicao('camp','fog','cena',h.extrairEdicaoCena(antes),h.extrairEdicaoCena(depois));
  assert.deepEqual(h.historicoDisponivel('camp','fog'),{desfazer:1,refazer:0});
  assert.deepEqual(h.passoEdicao('camp','fog','desfazer').valor.nevoa,[]);
  assert.equal(h.passoEdicao('camp','fog','refazer').valor.nevoa[0].pontos.length,3);
});
teste('Nova edição invalida a pilha Refazer',()=>{
  h.passoEdicao('camp','cena','desfazer');
  h.registrarEdicao('camp','cena','cena',h.extrairEdicaoCena(cena),h.extrairEdicaoCena({...cena,desenhos:[{id:'t1',pontos:[{x:1,y:1}]}]}));
  assert.equal(h.historicoDisponivel('camp','cena').refazer,0);
});
teste('Histórico de terreno 3D também aceita Undo e Redo',()=>{
  const a={base:'vazia',objetos:[]},b={base:'vazia',objetos:[{id:'parede'}]};
  h.registrarEdicao('camp','cena','cenario3d',a,b);
  assert.deepEqual(h.passoEdicao('camp','cena','desfazer'),{tipo:'cenario3d',valor:a});
  assert.deepEqual(h.passoEdicao('camp','cena','refazer'),{tipo:'cenario3d',valor:b});
});
teste('O histórico mantém 35 ações no máximo por cena',()=>{
  for(let i=0;i<90;i++)h.registrarEdicao('camp','testeLimite','cena',{i},{i:i+1});
  assert.equal(h.historicoDisponivel('camp','testeLimite').desfazer,35);
});
teste('As três unidades TypeScript principais têm sintaxe válida',()=>{
  for(const arquivo of ['App.tsx','mesa3d/Mesa3DPrototipo.tsx','mesa3d/roomScene.ts','lib/historicoEdicaoMesa.ts']){
    const p=ler(arquivo);const out=ts.transpileModule(p,{fileName:arquivo,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
    assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`TS inválido: ${arquivo}`);
  }
});
teste('A Mesa 2D tem seleção e arrasto para desenhos, marcações e luzes',()=>{
  const a=ler('App.tsx');
  for(const v of ['selecionarMarcador2D','moverMarcador2D','encerrarMarcador2D','selecionarLuz2D','moverLuz2D','hx-traco-alvo','excluirItemSelecionado2D','desenhoSelecionadoId'])assert.ok(a.includes(v),v);
  assert.equal(a.includes('<strong>Gerenciar</strong>'),false);
});
teste('A Mesa 3D possui raycast e arrasto com exclusão de anotações',()=>{
  const a=ler('mesa3d/Mesa3DPrototipo.tsx'),r=ler('mesa3d/roomScene.ts');
  for(const v of ['luzAtingida','desenhoAtingido','moverMarcadorVisual','moverLuzVisual','excluirAnotacao3D','m3d-barreira-editor298']){
    assert.ok(a.includes(v)||r.includes(v),v);
  }
  assert.ok(a.includes('editarBarreiraCompartilhada3DBruto'));
});
teste('Os caminhos de inserção de elementos 3D usam a variável correta',()=>{
  const a=ler('mesa3d/Mesa3DPrototipo.tsx');
  assert.equal(a.includes('const cena=(raw.cenas as Record<string,unknown>[]).find(c=>c.id===leituraCenaId.current);if(!c)return'),false);
  assert.equal(a.includes('const c=(raw.cenas as Record<string,unknown>[]).find(c=>c.id===leituraCenaId.current);if(!cena)return'),false);
});
teste('Desfazer/refazer só ocorre no modo mestre e fora de campos de texto',()=>{
  const a=ler('App.tsx'),b=ler('mesa3d/Mesa3DPrototipo.tsx');
  assert.ok(a.includes("evento.key.toLowerCase()==='y'||evento.shiftKey"));
  assert.ok(b.includes("campoDeFormulario(ev.target)"));
  assert.ok(b.includes("modoMestreRef.current||visaoIndividualRef.current"));
});
console.log(`OK: ${n}/${n} verificações v29.8`);
