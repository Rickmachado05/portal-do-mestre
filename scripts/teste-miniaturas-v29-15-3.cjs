/* v29.15.3 — teste do idle real por instância, sem exigir WebGL no CI. */
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(rel,dep={}){
 const file=path.join(root,rel),text=fs.readFileSync(file,'utf8');
 const result=ts.transpileModule(text,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,rel+' sintaxe');
 const module={exports:{}};
 new Function('require','module','exports',result.outputText)(id=>{if(Object.hasOwn(dep,id))return dep[id];throw Error(`Dependência inesperada: ${id}`);},module,module.exports);
 return module.exports;
}
const helper=load('src/mesa3d/animacoesMiniaturas3D.ts');
assert.equal(helper.escolherIndiceIdle(['Attack','Idle Breathing','Magic Cast'],'automatico'),1);
assert.equal(helper.escolherIndiceIdle(['Attack','Run'],'automatico'),-1);
assert.equal(helper.escolherIndiceIdle(['Attack','Run'],'clip',1),1);
assert.equal(helper.escolherIndiceIdle(['Attack'],'clip',30),-1);
assert.equal(helper.escolherIndiceIdle(['Idle'],'desligado'),-1);
assert.equal(helper.normalizarVelocidadeAnimacao(100),2);
assert.equal(helper.normalizarVelocidadeAnimacao(-1),.25);
assert.equal(helper.normalizarVelocidadeAnimacao(NaN),1);
const mini=load('src/mesa3d/miniaturasCena3D.ts',{'./animacoesMiniaturas3D':helper});
const original=mini.criarInstanciaMiniatura3D('mini-123456','Conjurador',{x:0,z:0});
assert.equal(original.animacaoModo,'automatico');
const config=mini.normalizarMiniaturasCena3D([{...original,animacaoModo:'clip',animacaoIndice:1,animacaoVelocidade:1.3}])[0];
assert.equal(config.animacaoModo,'clip');assert.equal(config.animacaoIndice,1);assert.equal(config.animacaoVelocidade,1.3);
const corrupcao=mini.normalizarMiniaturasCena3D([{...original,animacaoModo:'qualquer',animacaoIndice:-8,animacaoVelocidade:99}])[0];
assert.equal(corrupcao.animacaoModo,'automatico');assert.equal(corrupcao.animacaoIndice,0);assert.equal(corrupcao.animacaoVelocidade,2);
const novos=mini.vincularModeloAoPersonagem3D([config],'mini-outro123','Forma 2','player-123',{x:1,z:2});
assert.equal(novos.length,2);
const trocados=mini.vincularModeloAoPersonagem3D(novos,'mini-outra567','Forma 3','player-123',{x:1,z:2});
assert.equal(trocados[1].animacaoModo,'automatico','Trocar GLB não preserva clipe potencialmente inexistente');
// Fake WebGL enough to execute all AnimationMixer lifecycle logic. Geometry/texture caches stay shared.
class V3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}}
class Objeto{constructor(){this.children=[];this.parent=null;this.userData={};this.position=new V3();this.rotation={x:0,y:0};this.scale={x:1,multiplyScalar(x){this.x*=x;return this;},setScalar(x){this.x=x;}};this.visible=true;}add(o){this.children.push(o);o.parent=this;}remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null;}removeFromParent(){this.parent?.remove(this);}clear(){for(const child of this.children)child.parent=null;this.children=[];}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}}
class Group extends Objeto{}
class BufferGeometry{dispose(){}}
class RingGeometry extends BufferGeometry{}
class Material{constructor(opts={}){this.userData={};this.opacity=1;this.transparent=false;this.needsUpdate=false;this.color=opts.color;}clone(){const o=new Material();Object.assign(o,this);o.userData={...this.userData};return o;}dispose(){}}
class Mesh extends Objeto{constructor(g=new BufferGeometry(),m=new Material()){super();this.geometry=g;this.material=m;}}
class Texture {dispose(){}}
class Box3{constructor(){this.min={x:-1,y:0,z:-1};this.max={x:1,y:2,z:1};}setFromObject(){return this;}getSize(out){out.set(2,2,2);}}
const eventos=[];
class AnimationMixer{constructor(root){this.root=root;this.updated=[];eventos.push({tipo:'novo',root});}clipAction(clip){eventos.push({tipo:'clip',nome:clip.name});return {setLoop(){return this;},play(){eventos.push({tipo:'play'});return this;}};}update(dt){this.updated.push(dt);eventos.push({tipo:'update',dt});}stopAllAction(){eventos.push({tipo:'stop'});}uncacheRoot(){eventos.push({tipo:'uncache'});}}
class GLTFLoader{parse(buffer,path,done){const scene=new Group();scene.add(new Mesh());done({scene,animations:[{name:'Attack',duration:2},{name:'Idle Breathing',duration:2},{name:'Magic Hold',duration:1}]});}}
const THREE={Group,Mesh,Box3,Vector3:V3,AnimationMixer,LoopRepeat:2201,MeshBasicMaterial:Material,Material,BufferGeometry,Texture,RingGeometry,DoubleSide:2};
function cloneSkeleton(obj){const novo=new Group();novo.add(new Mesh(obj.children[0].geometry,obj.children[0].material));return novo;}
const modelo=load('src/mesa3d/renderMiniaturas3D.ts',{'three':THREE,'three/addons/loaders/GLTFLoader.js':{GLTFLoader},'three/addons/utils/SkeletonUtils.js':{clone:cloneSkeleton},'../lib/bibliotecaMiniaturas3D':{carregarMiniatura3D:async()=>new Blob(['glb'])},'./animacoesMiniaturas3D':helper,'./mesaLivre3D':{percentualParaChao3D:()=>({x:0,z:0})}});
(async()=>{
 const render=new Group(),layer=modelo.criarCamadaMiniaturas3D(render);
 const entidade={...original,id:'inst-teste123',animacaoModo:'automatico'};
 const cena={};
 layer.sincronizar([entidade],cena,{},true);
 await new Promise(r=>setTimeout(r,20));
 assert.ok(eventos.some(e=>e.tipo==='clip'&&e.nome==='Idle Breathing'));
 layer.atualizarAnimacoes(.04);
 assert.ok(eventos.some(e=>e.tipo==='update'),'Idle atualiza enquanto o canvas está visível');
 let antes=eventos.filter(e=>e.tipo==='update').length;
 layer.sincronizar([{...entidade,animacaoModo:'desligado'}],cena,{},true);
 layer.atualizarAnimacoes(.04);
 assert.equal(eventos.filter(e=>e.tipo==='update').length,antes,'Modo estático não atualiza mixer');
 assert.ok(eventos.some(e=>e.tipo==='uncache'),'Libera mixer ao desligar');
 layer.sincronizar([{...entidade,animacaoModo:'clip',animacaoIndice:2,animacaoVelocidade:2}],cena,{},true);
 assert.ok(eventos.some(e=>e.tipo==='clip'&&e.nome==='Magic Hold'));
 antes=eventos.filter(e=>e.tipo==='update').length;layer.atualizarAnimacoes(.04);
 assert.equal(eventos.filter(e=>e.tipo==='update').length,antes+1);
 layer.sincronizar([{...entidade,animacaoModo:'clip',animacaoIndice:2,animacaoVelocidade:.25}],cena,{},false);
 antes=eventos.filter(e=>e.tipo==='update').length;layer.atualizarAnimacoes(.04);
 assert.equal(eventos.filter(e=>e.tipo==='update').length,antes,'Camada invisível não avança animação');
 layer.sincronizar([],cena,{},true);layer.dispose();
 const room=fs.readFileSync(path.join(root,'src/mesa3d/roomScene.ts'),'utf8');
 const comp=fs.readFileSync(path.join(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
 assert.match(room,/atualizarAnimacoesMiniaturas:camadaMiniaturas\.atualizarAnimacoes/);
 assert.match(comp,/sala\.atualizarAnimacoesMiniaturas\(dt\)/);
 assert.match(comp,/Animação idle \(opcional\)/);
 assert.match(comp,/nomesAnimacoesSelecionadas/);
 console.log('v29.15.3: seleção idle/ataque, persistência, clipes por instância, pausa e descarte: 24 verificações aprovadas.');
})().catch(err=>{console.error(err);process.exitCode=1;});
