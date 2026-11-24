/** Um Quick Tunnel registrado ainda pode estar propagando DNS/rota pública.
 * Retenta somente GET /saude; nunca repete POST /salas automaticamente. */
export async function aguardarServidorPublico(consultar, {tentativas=12, intervalo=1500, esperar=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let ultimaFalha;
 for(let i=0;i<tentativas;i++){
   try{
     const saude=await consultar();
     if(saude?.ativo===true)return saude;
     throw new Error('A rota de saúde não retornou a resposta esperada do Portal.');
   }catch(e){
     ultimaFalha=e;
     if(i+1<tentativas)await esperar(intervalo);
   }
 }
 const detalhe=ultimaFalha instanceof Error?ultimaFalha.message:'Sem resposta da API.';
 throw new Error('O servidor ainda não está acessível pelo endereço público. '+detalhe+' Use Tentar criar sala novamente ou confira a conexão do Cloudflare.');
}
