/** Suite focada em anotacoes/luzes. Nao depende de Vite, navegador ou servidor. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// Funciona tanto com npm ci local (Windows) quanto com TypeScript global (CI).
let ts;
try { ts=require('typescript'); }
catch {
  const {execFileSync}=require('node:child_process');
  const npm=process.platform==='win32'?'npm.cmd':'npm';
  const raizGlobal=execFileSync(npm,['root','-g'],{encoding:'utf8'}).trim();
  ts=require(path.join(raizGlobal,'typescript'));
}
const fonte=fs.readFileSync(path.join(__dirname,'../src/lib/anotacoesMesa.ts'),'utf8');
const output=ts.transpileModule(fonte,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.equal(output.diagnostics?.length||0,0,'Erro na sintaxe TS do modulo de anotacoes');
const api={exports:{}};
new Function('module','exports',output.outputText)(api,api.exports);
const {normalizarDesenhos,normalizarMarcadores,fonteLuzPadrao,luz3DParaFonte}=api.exports;
let testes=0;function verifica(nome,fn){fn();console.log('✓ '+nome);testes++;}
verifica('Normaliza apenas tracos validos e preserva coordenadas',()=>{
  assert.deepEqual(normalizarDesenhos([{id:'t1',pontos:[{x:12,y:34},{x:102,y:-10}],cor:'#abcdef',espessura:4}]),[{id:'t1',pontos:[{x:12,y:34},{x:100,y:0}],cor:'#abcdef',espessura:4}]);
});
verifica('Ignora valores falsos, infinitos e IDs duplicados',()=>{
  const r=normalizarDesenhos([{id:'t1',pontos:[{x:NaN,y:4},{x:45,y:5}]},{id:'t1',pontos:[{x:4,y:4}]},{id:'',pontos:[]}]);
  assert.equal(r.length,1);assert.equal(r[0].pontos.length,1);
});
verifica('Traços limitados a 200 e 500 pontos; largura e cor protegidas',()=>{
  const r=normalizarDesenhos(Array.from({length:220},(_,i)=>({id:'d'+i,pontos:Array.from({length:750},()=>({x:50,y:50})),espessura:999,cor:'red'})));
  assert.equal(r.length,200);assert.equal(r[0].pontos.length,500);assert.equal(r[0].cor,'#f1bb78');assert.equal(r[0].espessura,16);
});
verifica('Marcadores preservam nome e posicao, limitados ao terreno',()=>{
  assert.deepEqual(normalizarMarcadores([{id:'m1',texto:'Ruina',x:-12,y:123}]),[{id:'m1',texto:'Ruina',x:0,y:100}]);
});
verifica('Marcadores excluem coordenadas incorretas',()=>{
  assert.equal(normalizarMarcadores([{id:'a',texto:'x',x:'50',y:80},{id:'b',x:Infinity,y:4}]).length,0);
});
verifica('Luz quente nova usa fonte unica compartilhada',()=>{
  assert.deepEqual(fonteLuzPadrao('l1',{x:33,y:67}),{id:'l1',x:33,y:67,nome:'Luz quente',cor:'#ffd48b',alcance:17,ativa:true});
});
verifica('Migração legada 3D converte o centro corretamente',()=>{
  const r=luz3DParaFonte({id:'old',nome:'Tocha',x:0,z:0},{largura:18,profundidade:20,minX:-9,minZ:-10});
  assert.equal(r.id,'luz3d-old');assert.equal(r.x,50);assert.equal(r.y,50);assert.equal(r.nome,'Tocha');
});
verifica('Migração limita lâmpadas antigas fora do terreno',()=>{
  const r=luz3DParaFonte({id:'old',nome:'',x:700,z:-500},{largura:18,profundidade:20,minX:-9,minZ:-10});
  assert.equal(r.x,100);assert.equal(r.y,0);assert.equal(r.nome,'Luz quente');
});
verifica('Marcadores podem ser renomeados e reposicionados sem mudar o ID',()=>{
  const txt=fs.readFileSync(path.join(__dirname,'../src/lib/pontosInteresse.ts'),'utf8');
  const compiled=ts.transpileModule(txt,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}});
  const out={exports:{}};new Function('module','exports',compiled.outputText)(out,out.exports);
  const original=[{id:'m1',texto:'Entrada',x:25,y:40}];
  const changed=out.exports.atualizarPontosInteresse(original,{id:'discard',texto:'Nova localização',x:92,y:18},'m1');
  assert.deepEqual(changed,[{id:'m1',texto:'Nova localização',x:92,y:18}]);
  assert.deepEqual(original,[{id:'m1',texto:'Entrada',x:25,y:40}]);
});
const ler=p=>fs.readFileSync(path.join(__dirname,'../',p),'utf8');
verifica('Mesa 2D oferece marcador editável, desenho e controle superior',()=>{
  const app=ler('src/App.tsx');assert.match(app,/hx-selecao-topo/);assert.match(app,/hx-marcador-editavel/);assert.match(app,/hx-desenhos-mapa/);assert.match(app,/Gerenciar/);assert.match(app,/onClick=\{\(\)=>usarFerramenta\('desenhar'\)\}/);
});
verifica('Mesa 3D preserva fontes e anotacoes em coordenadas compartilhadas',()=>{
  const viewer=ler('src/mesa3d/Mesa3DPrototipo.tsx');const three=ler('src/mesa3d/roomScene.ts');
  assert.match(viewer,/luz3DParaFonte/);assert.match(viewer,/configurarFontesLuz/);assert.match(viewer,/configurarAnotacoes/);assert.match(viewer,/previsualizarDesenho/);assert.match(three,/camadaDesenhos/);assert.match(three,/camadaMarcadores/);
});
verifica('Normalização compartilhada conserva os novos dados por cena',()=>{
  const estado=ler('src/lib/mesaCompartilhada.ts');assert.match(estado,/desenhos:normalizarDesenhos\(c\.desenhos\)/);assert.match(estado,/marcadores:normalizarMarcadores\(c\.marcadores\)/);
});
verifica('Sintaxe dos componentes alterados e do gerenciador é válida',()=>{
  for(const p of ['src/App.tsx','src/mesa3d/Mesa3DPrototipo.tsx','src/mesa3d/roomScene.ts','src/lib/mesaCompartilhada.ts']){
    const src=ler(p);const result=ts.transpileModule(src,{fileName:p,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
    assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,'Sintaxe inválida '+p);
  }
});
console.log(`OK: ${testes}/${testes} verificações v29.7`);
