const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
const viewer=fs.readFileSync(path.join(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/App.css'),'utf8');
const viewerCss=fs.readFileSync(path.join(root,'src/mesa3d/visualizadorEmbutido.css'),'utf8');
let count=0;
function test(name,fn){fn();count++;console.log('✓',name)}
test('barra superior do Portal oferece flip 3D',()=>assert(/MODO_3D&&cameraMesa3D==='mestre'&&ferramentaMapa==='mover'/.test(app)&&/Flip token/.test(app)));
test('flip na barra superior troca espelhadoX',()=>assert(/MODO_3D[\s\S]*?onClick=\{\(\)=>alterarToken\(tokenEmEdicaoId,p=>\(\{\.\.\.p,espelhadoX:!p\.espelhadoX\}\)\)\}/.test(app)));
test('flip não altera tokens bloqueados',()=>assert(/disabled=\{Boolean\(cenaAtual\.tokens\[tokenEmEdicaoId\]\.travado\)\}/.test(app)));
test('toolbar 3D não contém o botão de tamanho removido por solicitação',()=>assert(!app.includes('hx-token-dimensoes-topo')&&!app.includes('Tamanho 3D')));
test('remoção do menu inferior de token',()=>assert(!viewer.includes('m3d-token-selection-hud" role="group"')));
test('menus de parede e objeto permanecem',()=>assert(viewer.includes('m3d-barreira-hud')&&viewer.includes('selecionadoObjeto&&!ferramenta')));
test('Flip do 3D independente também fica no topo',()=>{const i=viewer.indexOf('m3d-map-tools barra-ferramentas-mapa'),f=viewer.indexOf('inverterTokenSelecionadoNo3D()',i),end=viewer.indexOf('m3d-vision-preview',i);assert(i>=0&&f>i&&f<end)});
test('visualizador 3D também não apresenta botão de tamanho no topo',()=>assert(!viewer.includes('m3d-token-dimensions-topo')));
test('Delete permanece funcional',()=>assert(viewer.includes('excluirTokenSelecionadoNo3D')));
test('botão direito ainda faz flip direto no token',()=>assert(/botaoMouse===2&&!arrastou&&ev\.type==='pointerup'&&alvoFlip/.test(viewer)));
test('arrastar a câmera continua preservado',()=>assert(/botaoMouse===2\)\{yawLivreRef\.current\+=dx\*\.007/.test(viewer)));
test('CSS antigo de botão de tamanho foi removido',()=>assert(!css.includes('.hx-token-dimensoes-popover')));
test('CSS antigo do visualizador foi removido',()=>assert(!viewerCss.includes('.m3d-map-tools .m3d-token-dimensions-topo')));
test('preview de visão continua acessível',()=>assert(viewer.includes('Testar visão do token')&&app.includes('Testar visão do token')));
for(const file of ['src/App.tsx','src/mesa3d/Mesa3DPrototipo.tsx']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 test(`sintaxe TSX de ${file}`,()=>assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')));
}
console.log(`\n${count} verificações da toolbar v25 aprovadas`);
