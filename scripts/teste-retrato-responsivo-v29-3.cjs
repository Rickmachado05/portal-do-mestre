const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const Module=require('node:module');
const raiz=path.join(__dirname,'..');
const ler=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const arquivo='src/lib/retratoAjuste.ts';
const compilado=ts.transpileModule(ler(arquivo),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(compilado.diagnostics?.length,0,'Compilação do motor de retratos');
const modulo=new Module(path.join(raiz,arquivo),module);modulo.filename=path.join(raiz,arquivo);modulo.paths=module.paths;modulo._compile(compilado.outputText,modulo.filename);
const {normalizarAjusteRetrato,encaixeAutomatico,AJUSTE_RETRATO_PADRAO}=modulo.exports;
let total=0;
function verificar(nome,fn){fn();total++;console.log('✓',nome);}
verificar('Retrato vertical da Morgana cabe inteiro em retrato quadrado',()=>assert.equal(encaixeAutomatico(267,477,100,100),'contain'));
verificar('Proporção semelhante preenche sem bordas',()=>assert.equal(encaixeAutomatico(267,477,56,100),'cover'));
verificar('Retrato vertical se adapta à ficha',()=>assert.equal(encaixeAutomatico(267,477,120,150),'contain'));
verificar('Modo padrão permite responsividade',()=>assert.equal(AJUSTE_RETRATO_PADRAO.modo,'automatico'));
verificar('Configuração de zoom antigo preservada',()=>assert.deepEqual(normalizarAjusteRetrato({x:14,y:-8,zoom:1.4}),{modo:'automatico',largura:100,altura:100,x:14,y:-8,zoom:1.4}));
verificar('Dimensões e modos personalizados sobrevivem à normalização',()=>assert.deepEqual(normalizarAjusteRetrato({modo:'conter',largura:135,altura:75,x:11,y:10,zoom:1.05}),{modo:'conter',largura:135,altura:75,x:11,y:10,zoom:1.05}));
verificar('Dados inválidos são limitados',()=>assert.deepEqual(normalizarAjusteRetrato({modo:'errado',largura:999,altura:-100,x:Infinity,y:-999,zoom:99}),{modo:'automatico',largura:250,altura:40,x:0,y:-100,zoom:3}));
for(const arquivo of ['src/EditorRetrato.tsx','src/lib/retratoResponsivo.tsx','src/lib/retratoAjuste.ts','src/hexatombe/fichasLibrary.ts','src/lib/mesaCompartilhada.ts','src/App.tsx','src/mesa3d/Mesa3DPrototipo.tsx','src/portal/GestaoPersonagens.tsx','src/multiplayer/MesaConvidado2D.tsx','src/multiplayer/FichaConvidado.tsx','src/multiplayer/PublicadorMesa.tsx','src/hexatombe/ChatMesaPainel.tsx','src/multiplayer/api.ts']){
 verificar('Sintaxe '+arquivo,()=>{
   const sf=ts.createSourceFile(arquivo,ler(arquivo),ts.ScriptTarget.Latest,true,arquivo.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   assert.equal(sf.parseDiagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(sf.parseDiagnostics,{getCurrentDirectory:()=>raiz,getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));
 });
}
verificar('Ajuste da biblioteca persistido na ficha',()=>assert.ok(ler('src/hexatombe/fichasLibrary.ts').includes('retratoAjuste:normalizarAjusteRetrato')));
verificar('Ajuste próprio persistido na campanha 2D/3D',()=>assert.ok(ler('src/lib/mesaCompartilhada.ts').includes('retratoEnquadramento:normalizarAjusteRetrato')));
verificar('Ajuste dos convidados é publicado',()=>assert.ok(ler('src/multiplayer/PublicadorMesa.tsx').includes('enquadramento:normalizarAjusteRetrato')));
verificar('GIF continua na tag img',()=>assert.ok(ler('src/lib/retratoResponsivo.tsx').includes('return <img')));
verificar('Biblioteca oferece ajustes manuais',()=>assert.ok(ler('src/portal/GestaoPersonagens.tsx').includes('Salvar enquadramento')));
verificar('Mesa oferece ajustes manuais',()=>assert.ok(ler('src/App.tsx').includes('Retrato da mesa (independente da biblioteca)')));
console.log(`OK: ${total} verificações v29.3`);
