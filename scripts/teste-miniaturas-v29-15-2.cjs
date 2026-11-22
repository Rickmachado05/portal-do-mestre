/* v29.15.2: limites 50/100 MB, biblioteca de 1 GB, inspeção GLB sem decodificar pixels. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/lib/bibliotecaMiniaturas3D.ts'),'utf8');
const result=ts.transpileModule(source,{fileName:'bibliotecaMiniaturas3D.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const armazenados=new Map(),arquivos=new Map(),mod={exports:{}};
global.localStorage={getItem:k=>armazenados.get(k)||null,setItem:(k,v)=>armazenados.set(k,v)};
new Function('require','module','exports',result.outputText)(id=>{
  assert.equal(id,'./storage');return {
    salvarArquivo:async(k,b)=>arquivos.set(k,b),
    carregarArquivo:async k=>arquivos.get(k)||null,
    excluirArquivo:async k=>arquivos.delete(k),
  };
},mod,mod.exports);
const bib=mod.exports;
const MB=1024*1024;
function glb({triangulos=1,imagens=[],animacoes=0}={}){
  const bin=Buffer.concat([Buffer.alloc(36),...imagens]);
  let offset=36;
  const views=[{buffer:0,byteOffset:0,byteLength:36}];
  const imgs=imagens.map((i)=>{const index=views.length;views.push({buffer:0,byteOffset:offset,byteLength:i.length});offset+=i.length;return {bufferView:index,mimeType:'image/png'};});
  const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0}}]}],
    accessors:[{bufferView:0,componentType:5126,count:triangulos*3,type:'VEC3'}],bufferViews:views,
    buffers:[{byteLength:bin.length}],images:imgs,animations:Array.from({length:animacoes},()=>({name:'Idle',channels:[],samplers:[]}))};
  const json=Buffer.from(JSON.stringify(gltf),'utf8'),padding=(4-json.length%4)%4;
  const chunk=Buffer.concat([json,Buffer.alloc(padding,32)]),bpad=(4-bin.length%4)%4;
  const binPadded=Buffer.concat([bin,Buffer.alloc(bpad)]);
  const total=12+8+chunk.length+8+binPadded.length;
  const hdr=Buffer.alloc(12);hdr.writeUInt32LE(0x46546c67);hdr.writeUInt32LE(2,4);hdr.writeUInt32LE(total,8);
  const jhdr=Buffer.alloc(8);jhdr.writeUInt32LE(chunk.length);jhdr.writeUInt32LE(0x4e4f534a,4);
  const bhdr=Buffer.alloc(8);bhdr.writeUInt32LE(binPadded.length);bhdr.writeUInt32LE(0x004e4942,4);
  return new Blob([hdr,jhdr,chunk,bhdr,binPadded],{type:'model/gltf-binary'});
}
function imagemPNG(largura,altura){const b=Buffer.alloc(32);b.writeUInt32BE(0x89504e47,0);b.writeUInt32BE(0x0d0a1a0a,4);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(largura,16);b.writeUInt32BE(altura,20);return b;}
function largeVirtual(file,size){return {size,slice:(start,end)=>{
  const b=file.slice(start,end);
  if(start===0&&end===20){return {arrayBuffer:async()=>{const raw=Buffer.from(await b.arrayBuffer());raw.writeUInt32LE(size,8);return raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}};}
  return b;
}};}
(async()=>{
  assert.equal(bib.LIMITE_GLB_BYTES,50*MB);
  assert.equal(bib.LIMITE_GLB_AVANCADO_BYTES,100*MB);
  assert.equal(bib.LIMITE_TOTAL_BIBLIOTECA_BYTES,1024*MB);
  let analise=await bib.validarMiniaturaGLB(glb({triangulos:180000,imagens:[imagemPNG(4096,2048)],animacoes:2}));
  assert.equal(analise.triangulos,180000);
  assert.equal(analise.texturas,1);
  assert.equal(analise.resolucoesTexturas[0].largura,4096);
  assert.equal(analise.resolucoesTexturas[0].altura,2048);
  assert.equal(analise.animacoes,2);
  assert.equal(analise.classificacao,'moderado');
  assert.ok(analise.avisos.some(x=>x.includes('150 mil')));
  assert.ok(analise.avisos.some(x=>x.includes('idle')));
  analise=await bib.validarMiniaturaGLB(glb({triangulos:300000,imagens:[imagemPNG(8192,8192)]}));
  assert.equal(analise.classificacao,'pesado');
  assert.ok(analise.avisos.some(x=>x.includes('4096')));
  await assert.rejects(()=>bib.validarMiniaturaGLB(glb({triangulos:1000001})),/1 milhão/);
  const virtual=largeVirtual(glb(),70*MB);
  await assert.rejects(()=>bib.validarMiniaturaGLB(virtual),/50 MB/);
  assert.equal((await bib.validarMiniaturaGLB(virtual,{modoAvancado:true})).triangulos,1);
  await assert.rejects(()=>bib.validarMiniaturaGLB(largeVirtual(glb(),101*MB),{modoAvancado:true}),/100 MB/);
  const mini=glb({triangulos:60000,imagens:[imagemPNG(512,1024)],animacoes:1});
  Object.defineProperty(mini,'name',{value:'Guardião.gLB'});
  const r=await bib.importarMiniatura3D(mini);
  assert.equal(r.triangulos,60000);assert.equal(r.texturas,1);assert.equal(r.animacoes,1);
  assert.equal(r.resolucoesTexturas[0].altura,1024);assert.equal(r.classificacao,'moderado');
  assert.equal((await bib.carregarMiniatura3D(r.id)).size,mini.size);
  const ui=fs.readFileSync(path.join(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
  assert.match(ui,/Modo avançado/);assert.match(ui,/Análise do modelo 3D antes da importação/);
  assert.match(ui,/Confirmar importação/);assert.match(ui,/resolucoesTexturas/);
  assert.match(ui,/modoAvancado:modoImportacaoAvancado/);
  console.log('v29.15.2: limites, análise de textura, triângulos, animações, classificação, importação, biblioteca e interface: 20 verificações aprovadas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
