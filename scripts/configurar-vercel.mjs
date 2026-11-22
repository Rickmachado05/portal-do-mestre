/** Configura o domínio único de frontend autorizado para conexões à sessão local. */
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {writeFileSync} from 'node:fs';
const rl=createInterface({input,output});
try{
  const resposta=(await rl.question('Cole o endereço HTTPS do seu Portal publicado na Vercel (sem / no final): ')).trim().replace(/\/$/,'');
  const url=new URL(resposta);
  if(url.protocol!=='https:'||url.origin!==resposta)throw new Error('Informe a origem HTTPS, sem caminhos, usuário, ou parâmetros.');
  writeFileSync('.portal-vercel-origem.local',url.origin+'\n','utf8');
  console.log(`Origem autorizada: ${url.origin}`);
  console.log('Reinicie 02_INICIAR_SERVIDOR_CLOUDFLARE.bat para aplicar.');
}catch(e){console.error('Configuração não salva:',e.message);process.exitCode=1;}
finally{rl.close();}
