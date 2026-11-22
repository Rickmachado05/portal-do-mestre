// Verifica a retirada intencional do painel de dimensões da barra superior na v27.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.join(__dirname,'..');
const ler=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=ler('src/App.tsx'),viewer=ler('src/mesa3d/Mesa3DPrototipo.tsx');
const css=ler('src/App.css'),css3d=ler('src/mesa3d/visualizadorEmbutido.css');
let n=0;const test=(titulo,check)=>{check();console.log('✓',titulo);n++};
test('removido botão Tamanho 3D da barra do Portal',()=>assert(!app.includes('hx-token-dimensoes-topo')&&!app.includes('hx-token-dimensoes-gatilho')));
test('removido botão Tamanho 3D do visualizador independente',()=>assert(!viewer.includes('m3d-token-dimensions-topo')));
test('removidos estados e painéis da toolbar',()=>assert(!app.includes('dimensoes3DAbertasPara')&&!viewer.includes('dimensoesTopoAbertasPara')));
test('sem CSS do popover removido',()=>assert(!css.includes('.hx-token-dimensoes-popover')&&!css3d.includes('.m3d-token-dimensions-gatilho')));
test('ajuste de largura continua na aba Token da ficha',()=>assert(app.includes('aria-label="Largura do token na Mesa 3D"')));
test('ajuste de altura continua na aba Token da ficha',()=>assert(app.includes('aria-label="Altura do token na Mesa 3D"')));
test('botão de restaurar tamanho permanece na ficha',()=>assert(app.includes('largura3D:100,altura3D:100')));
test('Flip no topo permanece',()=>assert(app.includes('Flip token')&&viewer.includes('inverterTokenSelecionadoNo3D')));
test('Delete e GIF continuam no visualizador',()=>assert(viewer.includes('excluirTokenSelecionadoNo3D')&&viewer.includes('dimensionarToken')));
for(const nome of ['src/App.tsx','src/mesa3d/Mesa3DPrototipo.tsx']){
 const ast=ts.createSourceFile(nome,ler(nome),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 test('TSX válido: '+nome,()=>assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')));
}
console.log(`\n${n} verificações de remoção de botão aprovadas`);
