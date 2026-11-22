/** Publicação estática opcional da pasta dist; mesma origem da API e do WebSocket.
 * Evita expor Vite/HMR ou arquivos fonte aos participantes pela internet.
 */
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const TIPOS={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff',
  '.woff2':'font/woff2','.ttf':'font/ttf','.glb':'model/gltf-binary',
  '.wasm':'application/wasm','.bin':'application/octet-stream',
  '.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg',
  '.ogg':'audio/ogg','.hdr':'application/octet-stream',
  '.txt':'text/plain; charset=utf-8',
};
const CABECALHOS={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'SAMEORIGIN',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
};
function texto(res,status,mensagem){
  res.writeHead(status,{...CABECALHOS,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
  res.end(mensagem);
}
export async function servirSite(req,res,pasta){
  if(req.method!=='GET'&&req.method!=='HEAD')return texto(res,405,'Método não permitido.');
  let pathname;
  try{pathname=new URL(req.url||'/', 'http://localhost').pathname;pathname=decodeURIComponent(pathname);}catch{return texto(res,400,'Caminho inválido.');}
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.')))return texto(res,403,'Caminho bloqueado.');
  const raiz=resolve(pasta);
  const destino=resolve(raiz,`.${pathname.endsWith('/')?`${pathname}index.html`:pathname}`);
  if(destino!==raiz&&!destino.startsWith(raiz+sep))return texto(res,403,'Caminho bloqueado.');
  try{
    let arquivo=destino;
    let dados=await stat(arquivo);
    if(dados.isDirectory()){
      arquivo=resolve(arquivo,'index.html');dados=await stat(arquivo);
    }
    if(!dados.isFile())return texto(res,404,'Arquivo não encontrado.');
    const ext=extname(arquivo).toLowerCase(),tipo=TIPOS[ext];
    if(!tipo)return texto(res,404,'Formato não permitido.');
    res.writeHead(200,{...CABECALHOS,'Content-Type':tipo,'Content-Length':dados.size,
      'Cache-Control':ext==='.html'?'no-store':'public, max-age=3600'});
    if(req.method==='HEAD')return res.end();
    createReadStream(arquivo).on('error',()=>res.destroy()).pipe(res);
  }catch{return texto(res,404,'Arquivo não encontrado.');}
}
