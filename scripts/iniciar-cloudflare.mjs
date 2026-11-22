/** Site e multiplayer servidos na MESMA origem HTTP, por trás de HTTPS do Tunnel. */
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const diretorioPublico=resolve('dist');
const origemVercel=resolve('.portal-vercel-origem.local');
if(existsSync(origemVercel)){
  const configurada=readFileSync(origemVercel,'utf8').trim();
  try{
    const url=new URL(configurada);
    if(url.protocol!=='https:'||url.origin!==configurada)throw Error('Origem inválida');
    process.env.PORTAL_ORIGENS_VERCEL=configurada;
    console.log(`[Portal Vercel] Navegador autorizado: ${configurada}`);
  }catch{console.error('[Portal Vercel] Origem inválida no arquivo .portal-vercel-origem.local');process.exit(1);}
}

if(!existsSync(resolve(diretorioPublico,'index.html'))){
  console.error('[Portal] Site não compilado. Execute npm run cloudflare:build.');
  process.exit(1);
}
const app=criarAplicacaoMultiplayer({
  diretorioPersistencia:resolve('.portal-multiplayer-sessoes'),
  diretorioPublico,
});
let encerrando=false;
const encerrar=()=>{
  if(encerrando)return;encerrando=true;
  void app.fechar().catch(err=>console.error('[Portal] Erro ao encerrar:',err));
};
process.on('SIGINT',encerrar);
process.on('SIGTERM',encerrar);
const porta=Number(process.env.PORTAL_MULTIPLAYER_PORT)||8787;
try{
  await app.escutar(porta);
  console.log(`[Portal Cloudflare] Servidor local em http://127.0.0.1:${porta}`);
  console.log('Em outra janela abra: cloudflared tunnel --url http://127.0.0.1:8787');
}catch(e){console.error('[Portal] Não foi possível iniciar:',e);process.exitCode=1;}
