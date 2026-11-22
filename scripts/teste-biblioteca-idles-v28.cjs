/* Teste isolado da biblioteca global v28 e das rotas de renderização das duas mesas. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const ler=(p)=>fs.readFileSync(path.join(root,p),'utf8');
let total=0;const ok=(v,m)=>{assert.ok(v,m);total++;};
const modulo=(file,imports={})=>{
  const src=ler(file);
  const result=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  ok(!result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error),`${file} syntax`);
  const exports={};
  const context={exports,require:(id)=>{if(!(id in imports))throw Error('Unexpected import '+id);return imports[id];},
    localStorage:fakeLocal,crypto:{randomUUID:()=> 'abc123def456'},Date,JSON,Number,Boolean,Set,Error,Array,Object,String};
  vm.runInNewContext(result.outputText,context,{filename:file});return exports;
};
const storage=new Map();const files=new Map();
const fakeLocal={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))};
const blobA={type:'image/gif',size:156,async arrayBuffer(){return new ArrayBuffer(8);}};
const blobB={type:'image/gif',size:430,async arrayBuffer(){return new ArrayBuffer(8);}};
const mockFiles={salvarArquivo:async(k,b)=>{files.set(k,b);},carregarArquivo:async k=>files.get(k)||null,excluirArquivo:async k=>{files.delete(k);}};
const lib=modulo('src/lib/bibliotecaIdle.ts',{'./storage':mockFiles,'./tokenIdleGif.mjs':{decodificarGifIdle:()=>({quadros:[{}]})}});
const skins=modulo('src/lib/tokenSkins.ts',{});
(async()=>{
  ok(lib.lerBibliotecaIdle(fakeLocal).length===0,'biblioteca vazia');
  const first=lib.criarRegistroIdle('  Guarda   ',156,'idle-abcdef123456');
  ok(first.nome==='Guarda','nome sanitizado');
  ok(first.id==='idle-abcdef123456','id estável');
  ok(lib.acrescentarRegistroIdle([],first).length===1,'inserir índice');
  ok(lib.acrescentarRegistroIdle([first],first).length===1,'não duplicar id');
  assert.throws(()=>lib.acrescentarRegistroIdle(Array(40).fill(first),first),/40/);total++;
  storage.set(lib.CHAVE_BIBLIOTECA_IDLE,JSON.stringify([first,{...first,id:'../../danger'}, {...first,id:'idle-inject00001'}]));
  ok(lib.lerBibliotecaIdle(fakeLocal).length===2,'ignora id inválido');
  storage.set(lib.CHAVE_BIBLIOTECA_IDLE,'[]');
  // Real operations: a removed global file must not touch a copied campaign skin.
  const item=await lib.adicionarIdleBiblioteca(blobA,'Morgana');
  ok(lib.lerBibliotecaIdle(fakeLocal).length===1,'índice global salvo');
  ok(await lib.carregarIdleBiblioteca(item.id)===blobA,'GIF global armazenado');
  files.set('campanha:test:token-skin:u:a',blobA);
  await lib.removerIdleBiblioteca(item.id);
  ok(lib.lerBibliotecaIdle(fakeLocal).length===0,'exclusão no índice');
  ok(files.has('campanha:test:token-skin:u:a'),'skin local preservada');
  await assert.rejects(()=>lib.carregarIdleBiblioteca(item.id),/não encontrado/);total++;
  await assert.rejects(()=>lib.adicionarIdleBiblioteca({...blobA,type:'image/png'},'inválido'),/GIF/);total++;
  const outro=await lib.adicionarIdleBiblioteca(blobB,'Chefe');
  ok(outro.tamanho===430,'tamanho correto');
  const u={tokenIdleGif:true,tokenIdlePausado:true,tokenIdleVelocidade:2,skins:[{id:'extra',nome:'Aura',idleGif:true,idleVelocidade:0.5}]};
  ok(skins.parametrosIdleAtivos(u,{skinId:'original'}).pausado,'pausar original');
  ok(skins.parametrosIdleAtivos(u,{skinId:'original'}).velocidade===2,'velocidade original');
  ok(skins.parametrosIdleAtivos(u,{skinId:'extra'}).velocidade===0.5,'velocidade skin');
  ok(!skins.parametrosIdleAtivos(u,{skinId:'extra'}).pausado,'skin não herda pausa do original');
  ok(skins.velocidadeIdle(12)===1,'valor inválido não causa aceleração');
  const component=ler('src/lib/BibliotecaIdleTokens.tsx');
  const app=ler('src/App.tsx');const idle2d=ler('src/lib/TokenIdle.tsx');
  const three=ler('src/mesa3d/roomScene.ts');const bridge=ler('src/mesa3d/Mesa3DPrototipo.tsx');
  ok(component.includes('onGuardarAtual')&&component.includes('onAplicar'),'fluxos globais');
  ok((app.includes('<BibliotecaIdleTokens')||app.includes('<BibliotecaTokens'))&&app.includes('definirPreferenciaIdle'),'UI de gerenciamento e preferência');
  ok(app.includes('parametrosIdleAtivos(u,p)'),'2D passa preferências');
  ok(idle2d.includes('pausado?0')&&idle2d.includes('tempo*velocidade'),'2D usa relógio e pausa');
  ok(three.includes('configurarIdleToken')&&three.includes('parametrosIdle.get(id)'),'3D usa preferências');
  ok(bridge.includes('sala.configurarIdleToken'),'preferência atualiza via bridge');
  for(const f of ['src/App.tsx','src/lib/TokenIdle.tsx','src/lib/BibliotecaIdleTokens.tsx','src/lib/bibliotecaIdle.ts','src/lib/tokenSkins.ts','src/lib/mesaCompartilhada.ts','src/mesa3d/roomScene.ts','src/mesa3d/Mesa3DPrototipo.tsx']){
    const src=ts.createSourceFile(f,ler(f),ts.ScriptTarget.Latest,true,f.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    ok(src.parseDiagnostics.length===0,`${f}: parse TS/TSX`);
  }
  process.stdout.write(`OK — ${total} verificações v28 da biblioteca global, reprodução 2D/3D e sintaxe\n`);
})().catch(e=>{console.error(e);process.exitCode=1;});
