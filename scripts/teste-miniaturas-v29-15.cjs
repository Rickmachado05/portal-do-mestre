/* Validação do contrato local das miniaturas sem WebGL/IndexedDB do navegador. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function transpilarArquivo(rel,mods={}){
 const source=fs.readFileSync(path.join(root,rel),'utf8');
 const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 const falhas=(result.diagnostics||[]).filter(v=>v.category===ts.DiagnosticCategory.Error);
 assert.equal(falhas.length,0,rel+': '+falhas.map(d=>d.messageText).join('; '));
 const module={exports:{}};
 new Function('require','module','exports',result.outputText)((id)=>{if(id in mods)return mods[id];throw Error('Dependência inesperada: '+id);},module,module.exports);
 return module.exports;
}
const helper=transpilarArquivo('src/mesa3d/animacoesMiniaturas3D.ts');
const scene=transpilarArquivo('src/mesa3d/miniaturasCena3D.ts',{'./animacoesMiniaturas3D':helper});
const registro=scene.criarInstanciaMiniatura3D('mini-123456','Conjurador',{x:1.5,z:-2});
assert.match(registro.id,/^inst-[\w-]{6,90}$/);
let miniaturas=scene.normalizarMiniaturasCena3D([{...registro,escala:3,altura:.25,rotacao:1.25,personagemId:'personagem-1'}]);
assert.equal(miniaturas.length,1);assert.equal(miniaturas[0].escala,3);assert.equal(miniaturas[0].personagemId,'personagem-1');
miniaturas=scene.normalizarMiniaturasCena3D([registro,{...registro,x:4},{...registro,id:'inst-outro-123',personagemId:'personagem-1'},{...registro,id:'inst-outro-456',personagemId:'personagem-1'},
 {...registro,id:'inst-outro-789',modeloId:'file:///segredo.glb'}],12,8);
assert.equal(miniaturas.length,2,'IDs duplicados e modelo externo não são aceitos');
const normal=scene.normalizarMiniaturasCena3D([{...registro,escala:99,x:999,z:-999,altura:-3,rotacao:99}],12,8)[0];
assert.equal(normal.escala,8);assert.equal(normal.altura,0);assert.equal(normal.x,12);assert.equal(normal.z,-8);
const arquivos=new Map();const armazenamento=new Map();
global.localStorage={getItem:k=>armazenamento.get(k)||null,setItem:(k,v)=>armazenamento.set(k,v)};
const bib=transpilarArquivo('src/lib/bibliotecaMiniaturas3D.ts',{'./storage':{
 salvarArquivo:async(k,b)=>{arquivos.set(k,b);},carregarArquivo:async k=>arquivos.get(k)||null}});
function montarGLB({external=false}={}){
 const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  buffers:[{byteLength:36,...(external?{uri:'https://example.com/model.bin'}:{})}]};
 const json=Buffer.from(JSON.stringify(gltf),'utf8'),padding=(4-json.length%4)%4,chunk=Buffer.concat([json,Buffer.alloc(padding,32)]);
 const binary=Buffer.alloc(36),total=12+8+chunk.length+8+binary.length;
 const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);
 const ch=Buffer.alloc(8);ch.writeUInt32LE(chunk.length);ch.writeUInt32LE(0x4e4f534a,4);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
 return new Blob([header,ch,chunk,bh,binary],{type:'model/gltf-binary'});
}
(async()=>{
 assert.equal((await bib.validarMiniaturaGLB(montarGLB())).triangulos,1);
 await assert.rejects(()=>bib.validarMiniaturaGLB(montarGLB({external:true})),/externos/);
 await assert.rejects(()=>bib.validarMiniaturaGLB(new Blob(['arquivo aleatório'])),/12 MB|inválido/);
 const arquivo=montarGLB();Object.defineProperty(arquivo,'name',{value:'Mago Azul.glb'});
 const reg=await bib.importarMiniatura3D(arquivo);
 assert.equal(reg.nome,'Mago Azul');assert.equal(bib.listarMiniaturas3D().length,1);
 assert.ok(await bib.carregarMiniatura3D(reg.id));assert.equal(await bib.carregarMiniatura3D('invalido'),null);
 const cenario=fs.readFileSync(path.join(root,'src/mesa3d/editorCena3D.ts'),'utf8');
 const mestre=fs.readFileSync(path.join(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
 const sala=fs.readFileSync(path.join(root,'src/mesa3d/roomScene.ts'),'utf8');
 const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
 assert.match(cenario,/miniaturas:normalizarMiniaturasCena3D/);assert.match(cenario,/miniaturas:\(cenario\.miniaturas/);
 assert.match(mestre,/configurarMiniaturas\(/);assert.match(mestre,/importarMiniatura3D/);
 assert.match(sala,/criarCamadaMiniaturas3D/);assert.match(app,/Miniaturas 3D/);
 console.log('v29.15: 14 verificações de importação GLB, biblioteca, normalização, cenas e interface aprovadas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
