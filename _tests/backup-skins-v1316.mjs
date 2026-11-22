/** Teste funcional do backup v1.3.9 — Node com IndexedDB fake de semântica transacional.
 * Executar: node --experimental-strip-types _tests/backup-integracao-v139.mjs
 */
import assert from 'node:assert/strict';
import {
  lerPerfilMestre, renomearPerfilMestre, gerarBackupCompleto, prepararBackup,
  restaurarBackup,
} from '../src/portal/backupMestre.ts';

const storage = new Map();
globalThis.localStorage={
  get length(){return storage.size;},key:(i)=>[...storage.keys()][i]??null,
  setItem:(k,v)=>{storage.set(String(k),String(v));},
  getItem:(k)=>storage.get(k)??null,
  removeItem:(k)=>storage.delete(k),
};
const dbMap=new Map();
function schedule(fn){queueMicrotask(fn);}
class Tx {
  constructor(db,names,mode){this.db=db;this.names=names;this.mode=mode;this.pending=0;this.oncomplete=null;this.onerror=null;this.onabort=null;this.scheduled=false;}
  start(){this.pending++;}
  done(){this.pending--;this.maybeDone();}
  maybeDone(){if(this.pending===0&&!this.scheduled){this.scheduled=true;setTimeout(()=>{if(this.pending===0)this.oncomplete?.();else this.scheduled=false;},0);}}
  objectStore(name){if(!this.names.includes(name))throw Error('not in tx');const source=this.db.data.get(name);if(!source)throw Error('no store');const tx=this;
    function reqJob(fn){const req={onsuccess:null,onerror:null,result:undefined,error:null};tx.start();schedule(()=>{try{req.result=fn();req.onsuccess?.();}catch(err){req.error=err;req.onerror?.();tx.onerror?.();}tx.done();});return req;}
    return {
      openCursor(){const req={onsuccess:null,onerror:null,result:undefined,error:null};const entries=[...source.values()];let i=0;tx.start();function next(){schedule(()=>{if(i<entries.length){const [key,value]=entries[i++];req.result={key,value,continue:next};req.onsuccess?.();}else{req.result=null;req.onsuccess?.();tx.done();}});}next();return req;},
      clear:()=>reqJob(()=>{source.clear();return undefined;}),
      put:(value,key)=>reqJob(()=>{const primary=key??value?.id??value?.chave;if(primary===undefined)throw Error('no key');source.set(primary,[primary,value]);return primary;}),
    };
  }
}
function open(name,version){
  const request={result:null,onsuccess:null,onerror:null,onblocked:null,onupgradeneeded:null,error:null};
  schedule(()=>{
    let db=dbMap.get(name);let isNew=!db;
    if(!db){
      db={name,version,data:new Map(),objectStoreNames:{contains:(n)=>db.data.has(n)},createObjectStore:(n)=>{db.data.set(n,new Map());},transaction:(n,mode)=>new Tx(db,Array.isArray(n)?n:[n],mode),close(){}};
      dbMap.set(name,db);
    }
    request.result=db;
    if(isNew)request.onupgradeneeded?.();
    request.onsuccess?.();
  });
  return request;
}
globalThis.indexedDB={open};
function add(name,store,key,value){dbMap.get(name).data.get(store).set(key,[key,value]);}
function values(name,store){return [...dbMap.get(name).data.get(store).values()].map(([,value])=>value);}

// Primeira visita cria o perfil local, sem cadastro de jogador.
const profile=lerPerfilMestre();
assert(profile.id&&profile.nome);
renomearPerfilMestre('Mestre de Teste');
localStorage.setItem('hexatombe-campanhas-v1',JSON.stringify({schemaVersion:1,items:[{id:'camp-abc',titulo:'Aventura de Teste'}]}));
localStorage.setItem('rpg-painel-mestre-caderno-v2:camp-abc',JSON.stringify({schemaVersion:2,sessoes:[{titulo:'Sessão 1'}]}));
const arteItem='data:image/webp;base64,'+'A'.repeat(160);
localStorage.setItem('hexatombe-mesa-v2:camp-abc',JSON.stringify({unidades:[{id:'p1',escudo:7,skins:[{id:'combate',nome:'Combate'}],skinPadraoId:'combate',itens:[{nome:'Faca',quantidade:1,imagem:arteItem}]}],registros:[]}));
localStorage.setItem('portal-mestre-itens-v1',JSON.stringify([{id:'faca1',nome:'Faca',categoria:'arma',efeito:'dano',valor:'1d4',imagem:arteItem}]));
localStorage.setItem('outro-site:ignorar','intacto');
// O export cria os DBs necessários, então populamos antes de exportar.
for(const [name,ver,stores] of [
  ['hexatombe-mesa-arquivos',1,['arquivos']],
  ['hexatombe-avatar-dados',2,['packs','collections']],
  ['hexatombe-fichas-v1',1,['fichas']],
  ['portal-mestre-rascunhos-fichas-v1',1,['rascunhos']],
]){
  await new Promise(resolve=>{const req=indexedDB.open(name,ver);req.onupgradeneeded=()=>stores.forEach(s=>req.result.createObjectStore(s));req.onsuccess=resolve;});
}
add('hexatombe-mesa-arquivos','arquivos','campanha:camp-abc:mapa-1',new Blob([new Uint8Array([0,2,4,255,7])],{type:'image/png'}));
add('hexatombe-mesa-arquivos','arquivos','campanha:camp-abc:token-skin:p1:combate',new Blob([new Uint8Array([9,8,7,6])],{type:'image/webp'}));
add('hexatombe-fichas-v1','fichas','f1',{id:'f1',nome:'Personagem',dados:{name:'Personagem'}});
add('hexatombe-avatar-dados','packs','d6',{id:'d6',art:{name:'Dado',type:6}});
add('hexatombe-avatar-dados','collections','c1',{id:'c1',name:'Coleção',members:{'6':'d6'}});
add('portal-mestre-rascunhos-fichas-v1','rascunhos','nova',{chave:'nova',estado:{nome:'Rascunho'}});

const {arquivo,manifesto}=await gerarBackupCompleto(lerPerfilMestre());
assert(manifesto.resumo.campanhas===1);
assert(manifesto.resumo.cadernos===1);
assert(manifesto.resumo.arquivos===2);
assert(manifesto.resumo.fichas===1);
assert(manifesto.resumo.dados===1);
assert(manifesto.resumo.colecoes===1);
const prepared=await prepararBackup(new File([arquivo],'backup.zip',{type:'application/zip'}));
assert.equal(prepared.manifesto.perfil.nome,'Mestre de Teste');
localStorage.setItem('hexatombe-campanhas-v1','corrompido');
localStorage.setItem('portal-mestre-itens-v1','corrompido');
add('hexatombe-fichas-v1','fichas','f2',{id:'f2',nome:'Novo'});
await restaurarBackup(prepared);
assert.equal(JSON.parse(localStorage.getItem('hexatombe-campanhas-v1')).items[0].titulo,'Aventura de Teste');
assert.equal(JSON.parse(localStorage.getItem('portal-mestre-itens-v1'))[0].nome,'Faca');
assert.equal(JSON.parse(localStorage.getItem('portal-mestre-itens-v1'))[0].imagem,arteItem);
assert.equal(JSON.parse(localStorage.getItem('hexatombe-mesa-v2:camp-abc')).unidades[0].escudo,7);
assert.equal(JSON.parse(localStorage.getItem('hexatombe-mesa-v2:camp-abc')).unidades[0].skinPadraoId,'combate');
assert.equal(JSON.parse(localStorage.getItem('hexatombe-mesa-v2:camp-abc')).unidades[0].skins[0].nome,'Combate');
assert.equal(JSON.parse(localStorage.getItem('hexatombe-mesa-v2:camp-abc')).unidades[0].itens[0].nome,'Faca');
assert.equal(JSON.parse(localStorage.getItem('hexatombe-mesa-v2:camp-abc')).unidades[0].itens[0].imagem,arteItem);
assert.equal(localStorage.getItem('outro-site:ignorar'),'intacto');
assert.equal(values('hexatombe-fichas-v1','fichas').length,1);
assert.equal(values('hexatombe-avatar-dados','packs').length,1);
const [blob,skinBlob]=values('hexatombe-mesa-arquivos','arquivos');
assert(blob instanceof Blob);
assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[0,2,4,255,7]);
assert(skinBlob instanceof Blob);
assert.deepEqual([...new Uint8Array(await skinBlob.arrayBuffer())],[9,8,7,6]);
const notZip=await prepararBackup(new File([new Uint8Array([0,1,2])],'malicioso.zip')).then(()=>false,()=>true);
assert(notZip,'ZIP inválido deve ser rejeitado');
console.log('PASSOU: backup das skins, mapas e metadados dos tokens restaurado integralmente.');
