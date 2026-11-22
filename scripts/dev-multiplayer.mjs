/** Inicia o servidor de presença e o Vite juntos (Windows/Linux/macOS). */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const filhos=[];
let saindo=false;
function finalizar(codigo=0){
  if(saindo)return;saindo=true;
  for(const p of filhos){try{p.kill('SIGTERM');}catch{/* processo já encerrou */}}
  process.exitCode=codigo;
}
function iniciar(script,args){
  const filho=spawn(process.execPath,[resolve(raiz,script),...args],{cwd:raiz,stdio:'inherit',env:process.env});
  filhos.push(filho);
  filho.once('error',e=>{console.error(e.message);finalizar(1);});
  filho.once('exit',(code,signal)=>{
    if(!saindo){console.error(`${script} encerrou (${signal||code}).`);finalizar(code||1);}
  });
}
process.on('SIGINT',()=>finalizar());
process.on('SIGTERM',()=>finalizar());
iniciar('scripts/multiplayer-server.mjs',[]);
iniciar('node_modules/vite/bin/vite.js',['--host','127.0.0.1','--port','5173','--strictPort']);
