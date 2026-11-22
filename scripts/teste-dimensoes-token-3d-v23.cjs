const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..');
const ler=file=>fs.readFileSync(path.join(root,file),'utf8');
const fonte=ler('src/lib/dimensoesToken3D.ts');
const codigo=ts.transpileModule(fonte,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const out={};vm.runInNewContext(codigo,{exports:out,console});
const {dimensoesToken3D,escalaVisualToken3D,normalizarDimensaoToken3D}=out;
let checks=0;
function eq(a,b,label){assert.equal(a,b,label);checks++}
function ok(value,label){assert.ok(value,label);checks++}
eq(dimensoesToken3D(null).largura3D,100,'legado sem largura continua 100%');
eq(dimensoesToken3D({}).altura3D,100,'legado sem altura continua 100%');
eq(normalizarDimensaoToken3D(Infinity),100,'ignora valores não finitos');
eq(normalizarDimensaoToken3D(-5),40,'limita mínimo');
eq(normalizarDimensaoToken3D(999),300,'limita máximo');
const atual=escalaVisualToken3D(1.35,{largura3D:100,altura3D:100});
eq(atual.x,1,'padrão mantém largura antiga');eq(atual.y,1,'padrão mantém altura antiga');eq(atual.centroY,1.03,'padrão mantém posição original');
const w=escalaVisualToken3D(1.35,{largura3D:200,altura3D:100});eq(w.x,2,'largura independente');eq(w.y,1,'altura independente');
const h=escalaVisualToken3D(1.35,{largura3D:100,altura3D:200});eq(h.x,1,'largura intacta');eq(h.y,2,'altura independente');eq(h.centroY,2.005,'base fixa ao chão com figura mais alta');
const f=escalaVisualToken3D(1.35,{largura3D:150,altura3D:80},true);eq(f.x,-1.5,'flip preservado');eq(f.y,.8,'flip não interfere na altura');
const shared=ler('src/lib/mesaCompartilhada.ts'),app=ler('src/App.tsx'),room=ler('src/mesa3d/roomScene.ts'),mesa=ler('src/mesa3d/Mesa3DPrototipo.tsx');
ok(shared.includes('...dimensoesToken3D(t as'), 'normalizador preserva dimensões no modelo compartilhado');
ok(app.includes('...dimensoesToken3D(value)'), 'normalizador da cena do Portal preserva dimensões');
ok(app.includes('Largura do token na Mesa 3D')&&app.includes('Altura do token na Mesa 3D'),'campos na ficha');
ok(!mesa.includes('m3d-token-dimensions-topo')&&app.includes('Largura do token na Mesa 3D'),'ajuste fica só na ficha, sem botão superior');
ok(mesa.includes('sala.dimensionarToken(tokenId,dimensoesToken3D(registro))'),'alterações visuais sem remontagem');
ok(room.includes('const dimensionarToken=')&&room.includes('visual.position.y=s.centroY'),'render e pés no chão');
ok(room.includes('largurasNaturais.set(id,1.95*ratio)'),'proporção da imagem preservada');
ok(room.includes('dimensionarToken(id,dimensoes3D.get(id)'), 'troca de GIF/skin preserva ajustes');
ok(!room.includes('figura.scale.y=1;'),'não reseta altura durante troca de skin');
// Toda TS/TSX tocada precisa ser sintaticamente válida, mesmo sem npm install.
for(const file of ['src/lib/dimensoesToken3D.ts','src/lib/mesaCompartilhada.ts','src/App.tsx','src/mesa3d/roomScene.ts','src/mesa3d/Mesa3DPrototipo.tsx']){
 const syntax=ts.createSourceFile(file,ler(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 eq(syntax.parseDiagnostics.length,0,`sintaxe: ${file}`);
}
console.log(`OK — ${checks} verificações de dimensões independentes do token 3D (v23)`);
