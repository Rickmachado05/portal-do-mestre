const assert=require('node:assert/strict');
const {Blob,File}=require('node:buffer');
global.File=File;
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src/portal');
const tsCache=new Map();
function loadTs(name){
 const filepath=path.join(root,name+'.ts');
 if(tsCache.has(filepath))return tsCache.get(filepath).exports;
 const mod=new Module(filepath,module);mod.filename=filepath;
 mod.paths=Module._nodeModulePaths(path.dirname(filepath));tsCache.set(filepath,mod);
 const originalRequire=mod.require.bind(mod);
 mod.require=id=>id==='./backupMestre'?loadTs('backupMestre'):id==='fflate'?{
  zipSync(){throw Error('Não usa compactação em backup v2');},
  unzipSync(){throw Error('Não usa descompactação em backup v2');}
 }:originalRequire(id);
 const compiled=ts.transpileModule(fs.readFileSync(filepath,'utf8'),{fileName:filepath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 mod._compile(compiled,filepath);return mod.exports;
}
const orig=loadTs('backupMestre');
const next=loadTs('backupStreaming');
const storage = new Map();
global.localStorage={get length(){return storage.size;},key:(i)=>[...storage.keys()][i]??null,setItem:(k,v)=>{storage.set(''+k,''+v)},getItem:k=>storage.get(k)??null,removeItem:k=>storage.delete(k)};
const dbMap=new Map();
function schedule(fn){queueMicrotask(fn);}
class Tx {
 constructor(db,names,mode){this.db=db;this.names=names;this.mode=mode;this.pending=0;this.oncomplete=null;this.onerror=null;this.onabort=null;this.scheduled=false;}
 start(){this.pending++;}
 done(){this.pending--;this.maybeDone();}
 maybeDone(){if(this.pending===0&&!this.scheduled){this.scheduled=true;setTimeout(()=>{if(this.pending===0)this.oncomplete?.();else this.scheduled=false;},0);}}
 objectStore(name){if(!this.names.includes(name))throw Error('not in tx');const source=this.db.data.get(name);if(!source)throw Error('no store');const tx=this;
    function reqJob(fn){const req={onsuccess:null,onerror:null,result:undefined,error:null};tx.start();schedule(()=>{try{req.result=fn();req.onsuccess?.();}catch(err){req.error=err;req.onerror?.();tx.onerror?.();}tx.done();});return req;}
    return {openCursor(){const req={onsuccess:null,onerror:null,result:undefined,error:null};const entries=[...source.values()];let i=0;tx.start();function next(){schedule(()=>{if(i<entries.length){const [key,value]=entries[i++];req.result={key,value,continue:next};req.onsuccess?.();}else{req.result=null;req.onsuccess?.();tx.done();}});}next();return req;},clear:()=>reqJob(()=>{source.clear();return undefined;}),put:(value,key)=>reqJob(()=>{const primary=key??value?.id??value?.chave;if(primary===undefined)throw Error('no key');source.set(primary,[primary,value]);return primary;})};
 }
}
function open(name,version){const req={result:null,onsuccess:null,onerror:null,onblocked:null,onupgradeneeded:null,error:null};schedule(()=>{let db=dbMap.get(name);const fresh=!db;if(!db){db={name,version:version||1,data:new Map(),objectStoreNames:{contains:n=>db.data.has(n)},createObjectStore:n=>db.data.set(n,new Map()),transaction:(n,m)=>new Tx(db,Array.isArray(n)?n:[n],m),close(){}};dbMap.set(name,db);}req.result=db;if(fresh)req.onupgradeneeded?.();req.onsuccess?.();});return req;}
global.indexedDB={open};
function add(name,store,key,value){dbMap.get(name).data.get(store).set(key,[key,value]);}
(async()=>{
 const profile=orig.lerPerfilMestre();
 storage.set('hexatombe-campanhas-v1',JSON.stringify({items:[{id:'c1',titulo:'Campanha'}]}));
 storage.set('portal-mestre-biblioteca-miniaturas3d-v1',JSON.stringify([{id:'mini-abcdef',nome:'Test',bytes:1400000}]));
 storage.set('portal-mestre-diario','bem');
 for(const [name,ver,stores] of [['hexatombe-mesa-arquivos',1,['arquivos']],['hexatombe-avatar-dados',2,['packs','collections']],['hexatombe-fichas-v1',1,['fichas']],['portal-mestre-rascunhos-fichas-v1',1,['rascunhos']]]) await new Promise(resolve=>{const r=indexedDB.open(name,ver);r.onupgradeneeded=()=>stores.forEach(s=>r.result.createObjectStore(s));r.onsuccess=resolve;});
 const png=new Blob([Buffer.from([0,1,255])],{type:'image/png'});
 const glb=new Blob([Buffer.alloc(1_400_000,0x56)],{type:'model/gltf-binary'});
 add('hexatombe-mesa-arquivos','arquivos','campanha:c1:img',png);
 add('hexatombe-mesa-arquivos','arquivos','portal-mestre-miniatura3d:mini-abcdef',glb);
 const shared={id:'f1',nome:'Morgana',meta:{tipo:'personagem'}};
 shared.again=shared.meta; // repeated shared ref, not cyclic
 add('hexatombe-fichas-v1','fichas','f1',shared);
 add('hexatombe-avatar-dados','packs','p1',{id:'p1',data:new Uint8Array([1,2,3]),buffer:new Uint8Array([4,5]).buffer});
 let bytes=[];
 const handle={createWritable:async()=>({write:async chunk=>bytes.push(Buffer.from(chunk)),close:async()=>{},abort:async()=>{bytes=[];}})};
 const labels=[];
 const manifesto=await next.salvarBackupStreaming(profile,Promise.resolve(handle),(label,progress)=>labels.push([label,progress]));
 assert.equal(manifesto.version,2);
 const backup=Buffer.concat(bytes);
 console.log('Created',backup.length, 'bytes,',bytes.length,'writes');
 // Python zipfile can open this: provide file for independent check
 // Arquivo gerado disponível para teste com leitor ZIP externo, se desejado.
 if(process.env.SALVAR_ZIP_TESTE==='1')fs.writeFileSync(path.resolve('backup-teste-v29-15-4.zip'),backup);
 const prepared=await next.prepararBackupStreaming(new File([backup],'backup.zip',{type:'application/zip'}));
 assert.equal(prepared.manifesto.resumo.campanhas,1);
 const rows=prepared.snapshot.databases.find(d=>d.name==='hexatombe-mesa-arquivos').stores.arquivos;
 assert.equal(rows.length,2);assert.equal(rows[1].value.size,glb.size);
 const dice=prepared.snapshot.databases.find(d=>d.name==='hexatombe-avatar-dados').stores.packs[0].value;
 assert.deepEqual([...dice.data],[1,2,3]);assert.deepEqual([...new Uint8Array(dice.buffer)],[4,5]);
 storage.set('hexatombe-campanhas-v1','corrompido');
 add('hexatombe-fichas-v1','fichas','garbage',{id:'garbage'});
 await orig.restaurarBackup(prepared);
 assert.equal(JSON.parse(storage.get('hexatombe-campanhas-v1')).items[0].titulo,'Campanha');
 assert.equal(dbMap.get('hexatombe-fichas-v1').data.get('fichas').size,1);
 const restored=dbMap.get('hexatombe-mesa-arquivos').data.get('arquivos').get('portal-mestre-miniatura3d:mini-abcdef')[1];
 assert.equal(restored.size,glb.size);
 assert.deepEqual(Buffer.from(await restored.slice(0,8).arrayBuffer()),Buffer.alloc(8,0x56));
 // corrupt a single byte in archive and confirm full validation blocks restore
 const tampered=Buffer.from(backup);tampered[1100000]^=255;
 await assert.rejects(()=>next.prepararBackupStreaming(new File([tampered],'damaged.zip')),/corrompido/);
 const legacyContent=fs.readFileSync(path.resolve(__dirname,'fixtures/backup-formato-v1-teste.zip'));
 const legacy=await next.prepararBackupStreaming(new File([legacyContent],'old.zip'));
 assert.equal(legacy.manifesto.version,1);
 assert.equal(legacy.snapshot.databases[0].stores.arquivos[0].value.size,8);
 console.log('PASS: stream zip, validate, restore, Blob, shared refs, binary buffers, CRC reject, legacy v1');
})().catch(e=>{console.error(e);process.exitCode=1;});
