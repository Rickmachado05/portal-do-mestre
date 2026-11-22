const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let ts;
try { ts=require('typescript'); } catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/lib/zoomMesa2D.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={};new Function('exports',code)(m);
const calc=m.zoomDaMesa2DNoCursor;
let ok=0;
const check=(name,fn)=>{fn();ok++;console.log('✓',name);};
const initial={zoom:1,pan:{x:0,y:0},cursor:{x:800,y:350},viewport:{largura:1000,altura:700},deltaY:-120};
const c=calc(initial);
check('roda para cima aproxima',()=>assert(c.zoom>1));
check('zoom ancorado no ponteiro horizontalmente',()=>assert(Math.abs((initial.cursor.x-500-c.pan.x)/c.zoom-(initial.cursor.x-500))<1e-8));
check('zoom ancorado no ponteiro verticalmente',()=>assert(Math.abs((initial.cursor.y-350-c.pan.y)/c.zoom-(initial.cursor.y-350))<1e-8));
check('o centro do viewport não altera o pan',()=>assert.deepEqual(calc({...initial,cursor:{x:500,y:350}}).pan,{x:0,y:0}));
check('roda para baixo afasta',()=>assert(calc({...initial,deltaY:120}).zoom<1));
check('limite máximo permanece em 350%',()=>assert.equal(calc({...initial,zoom:3.5,deltaY:-240}).zoom,3.5));
check('limite mínimo permanece em 35%',()=>assert.equal(calc({...initial,zoom:.35,deltaY:240}).zoom,.35));
check('deltaMode em linhas é convertido',()=>assert(calc({...initial,deltaY:-3,deltaMode:1}).zoom>1));
check('deltaMode em páginas é convertido',()=>assert(calc({...initial,deltaY:-1,deltaMode:2}).zoom>1));
check('deltaY zero preserva estado',()=>assert.deepEqual(calc({...initial,deltaY:0}),{zoom:1,pan:{x:0,y:0}}));
let state={zoom:1,pan:{x:20,y:-15}};
const focus={x:865,y:257},vp={largura:1100,altura:600};
const original={x:(focus.x-vp.largura/2-state.pan.x)/state.zoom,y:(focus.y-vp.altura/2-state.pan.y)/state.zoom};
for(let i=0;i<40;i++)state=calc({...state,cursor:focus,viewport:vp,deltaY:i%2?120:-120});
check('zoom repetido mantém ponto sob o cursor',()=>{
 assert(Math.abs((focus.x-vp.largura/2-state.pan.x)/state.zoom-original.x)<1e-7);
 assert(Math.abs((focus.y-vp.altura/2-state.pan.y)/state.zoom-original.y)<1e-7);
});
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
const mesa=fs.readFileSync(path.join(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
check('listener wheel não passivo no 2D',()=>assert(/area\.addEventListener\('wheel',aoRolar,\{passive:false\}\)/.test(app)));
check('2D usa cálculo de zoom ancorado',()=>assert(/zoomDaMesa2DNoCursor\(\{/.test(app)));
check('listener removido na desmontagem',()=>assert(/area\.removeEventListener\('wheel',aoRolar\)/.test(app)));
check('flip 3D escolhe o token sob clique direito',()=>assert(/tokenSobCliqueDireito=sala\.tokenAtingido\(raycaster\)/.test(mesa)));
check('3D só faz flip em clique curto, não em arrasto',()=>assert(/botaoMouse===2&&!arrastou&&ev\.type==='pointerup'&&alvoFlip/.test(mesa)));
check('3D aplica flip na mesma ficha compartilhada',()=>assert(/espelharTokenCompartilhado3D\(campanhaId,leituraCenaId\.current,alvo\)/.test(mesa)));
check('3D ainda gira a câmera com arrasto direito',()=>assert(/botaoMouse===2\)\{yawLivreRef\.current\+=dx\*\.007/.test(mesa)));
check('3D mantém botão alternativo de flip',()=>assert(/onClick=\{\(\)=>inverterTokenSelecionadoNo3D\(\)\}/.test(mesa)));
for(const name of ['src/App.tsx','src/mesa3d/Mesa3DPrototipo.tsx','src/lib/zoomMesa2D.ts']){
 const src=fs.readFileSync(path.join(root,name),'utf8');
 const sf=ts.createSourceFile(name,src,ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(`sintaxe ${name}`,()=>assert.equal(sf.parseDiagnostics.length,0,sf.parseDiagnostics.map(e=>e.messageText).join('; ')));
}
console.log(`\n${ok} verificações da navegação v24 aprovadas`);
