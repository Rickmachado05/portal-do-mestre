/** URL do servidor multiplayer externo, exclusivamente para a publicação estática na Vercel.
 * Em localhost ou no Tunnel clássico, vazio = API da mesma origem (modo legado).
 * Um convite pode incluir a URL do servidor temporário do mestre.
 */
const CHAVE='portal-multiplayer-origem-remota-v1';
export function normalizarOrigemServidor(valor){
  if(typeof valor!=='string'||!valor.trim())return '';
  try{
    const url=new URL(valor.trim());
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/'&&url.pathname!=='')return '';
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return '';
    return url.origin;
  }catch{return '';}
}
let origemMemoria='';
function lerGuardado(){try{return normalizarOrigemServidor(localStorage.getItem(CHAVE)||'')||origemMemoria;}catch{return origemMemoria;}}
const enderecoConvite=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('servidor'):null;
if(enderecoConvite){
  const origem=normalizarOrigemServidor(enderecoConvite);
  if(origem){origemMemoria=origem;try{localStorage.setItem(CHAVE,origem);}catch{/*modo privado*/}}
}
export function origemServidorMultiplayer(){return typeof window!=='undefined'?lerGuardado():'';}
export function raizServidorMultiplayer(){return `${origemServidorMultiplayer()}/api/multiplayer`;}
export function atualizarOrigemServidorMultiplayer(valor){
  const normalizada=normalizarOrigemServidor(valor);
  if(valor.trim()&&!normalizada)throw new Error('Informe uma URL HTTPS válida, sem caminho, parâmetros ou usuário.');
  origemMemoria=normalizada;
  try{if(normalizada)localStorage.setItem(CHAVE,normalizada);else localStorage.removeItem(CHAVE);}catch{/*modo privado: preserva ao menos na aba atual*/}
  return normalizada;
}
