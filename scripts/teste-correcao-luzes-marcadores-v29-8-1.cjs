/** Testes da correção v29.8.1, sem navegador e sem dependências instaladas. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
let ts;try{ts=require('typescript')}catch{ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}
const ler=x=>fs.readFileSync(path.join(__dirname,'../src',x),'utf8');
let n=0;function teste(nome,fn){fn();n++;console.log('✓',nome)}
const fonte=ler('lib/numeroDecimalPt.ts');
const convertido=ts.transpileModule(fonte,{fileName:'numeroDecimalPt.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const decimal={exports:{}};new Function('module','exports',convertido.outputText)(decimal,decimal.exports);
const {interpretarPercentualDecimal:parse,formatarPercentualDecimal:format}=decimal.exports;
teste('Decimais brasileiros são aceitos sem arredondar',()=>{
 assert.equal(parse('12,75'),12.75);assert.equal(parse('0,05'),.05);assert.equal(parse('99,9999'),99.9999);
});
teste('Decimais com ponto também são aceitos',()=>{
 assert.equal(parse('12.75'),12.75);assert.equal(parse('0.5'),.5);
});
teste('Coordenadas zero e cem são válidas',()=>{assert.equal(parse('0'),0);assert.equal(parse('100'),100);});
teste('Entradas incompletas, inválidas e fora da faixa não viram zero',()=>{
 for(const v of ['','12,','12.3.5','-1','100,01','abc','1,2,3', 'NaN', 'Infinity'])assert.equal(parse(v),null,v);
});
teste('Formatação usa padrão pt-BR com frações preservadas',()=>{
 assert.equal(format(12.75),'12,75');assert.equal(format(0.125),'0,125');
});
const app=ler('App.tsx'),m3=ler('mesa3d/Mesa3DPrototipo.tsx');
teste('Criar marcações no 2D não abre mais a janela de edição',()=>{
 assert.match(app,/if \(ferramentaMapa === 'marcador'\) \{\s*adicionarMarcacaoRapida\(p\)/);
 assert.match(app,/texto:`Marcação \$\{c\.marcadores\.length\+1\}`/);
});
teste('Marcações do 3D embutido chegam ao estado da cena sem modal',()=>{
 const a=app.slice(app.indexOf("if(e.data.tipo==='marcador-novo'"),app.indexOf("if(e.data.tipo==='marcador-editar'"));
 assert.ok(a.includes('setCampanha'));assert.ok(a.includes('registrarEdicao'));assert.ok(!a.includes("setModal('marcador')"));
});
teste('Criar marcações no 3D independente não solicita prompt',()=>{
 const bloco=m3.slice(m3.indexOf("if(anotacaoRef.current==='marcador'){"),m3.indexOf('desenhoLivre=',m3.indexOf("if(anotacaoRef.current==='marcador'){")));
 assert.ok(bloco.includes('Marcação ${atuais.length+1}'));
 assert.ok(!bloco.includes('window.prompt'));
});
teste('Edição opcional de marcações aceita texto decimal e vírgula',()=>{
 assert.match(app,/const x=interpretarPercentualDecimal\(coordenadasMarcadorTexto\.x\)/);
 assert.match(app,/const y=interpretarPercentualDecimal\(coordenadasMarcadorTexto\.y\)/);
 assert.match(app,/inputMode="decimal"/);
});
teste('A seleção 3D mostra imediatamente o editor compacto de luz',()=>{
 assert.ok(m3.includes('m3d-luz-editor298'));
 assert.ok(m3.includes('luzSelecionadaNoChao'));
 assert.ok(m3.includes("if(tipo==='selecionar-luz'&&typeof valor==='string')"));
 assert.ok(app.includes("enviar3D('selecionar-luz',luzId)"));
});
teste('Edição das luzes 3D modifica nome, cor, alcance e posição',()=>{
 for(const v of ['alterarLuz3D(luzSelecionadaNoChao.id,{nome:e.target.value})','alterarLuz3D(luzSelecionadaNoChao.id,{cor:e.target.value})','alterarLuz3D(luzSelecionadaNoChao.id,{alcance:Number(e.target.value)})','alterarLuz3D(luzSelecionadaNoChao.id,{x:Number(e.target.value)})','alterarLuz3D(luzSelecionadaNoChao.id,{y:Number(e.target.value)})']) assert.ok(m3.includes(v),v);
});
teste('Janela principal destaca a fonte e abre edição flutuante',()=>{
 assert.ok(app.includes('data-luz-id={f.id}'));
 assert.ok(app.includes('luzEdicaoId===luzSelecionadaId'));
 assert.ok(app.includes('editarFonteLuz(f.id)'));
 assert.ok(app.includes('hx-luz-editor-flutuante'));
});
teste('Arquivos TypeScript modificados mantêm sintaxe válida',()=>{
 for(const arquivo of ['App.tsx','mesa3d/Mesa3DPrototipo.tsx','lib/numeroDecimalPt.ts']){
  const resp=ts.transpileModule(ler(arquivo),{fileName:arquivo,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((resp.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,arquivo);
 }
});
console.log(`OK: ${n}/${n} verificações v29.8.1`);
