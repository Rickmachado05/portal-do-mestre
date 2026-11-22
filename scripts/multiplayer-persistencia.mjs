/**
 * v29.15.27 — sessões locais recuperáveis do Portal do Mestre.
 * Os arquivos nunca são servidos estaticamente. Conteúdo privado e credenciais
 * ficam em diretório local com permissões restritas, fora do ZIP e do Git.
 */
import {mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, rmSync, existsSync, chmodSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';

const CODIGO=/^[A-Z2-9]{8}$/;
const ID_GIF=/^[a-f0-9]{32}$/;
const ID_GLB=/^mini-[a-z0-9-]{6,90}$/i;
const DURACAO=7*24*60*60*1000;
const par=(valor)=>Array.isArray(valor)?valor:[];
const reconstruirMapa=(valor)=>new Map(par(valor).filter(e=>Array.isArray(e)&&e.length===2));

function escreverAtomico(destino,dados){
  const temporario=`${destino}.${randomBytes(7).toString('hex')}.tmp`;
  try{
    writeFileSync(temporario,dados,{mode:0o600});
    renameSync(temporario,destino);
    try{chmodSync(destino,0o600);}catch{/* Windows não implementa todos os modos POSIX. */}
  }catch(e){try{rmSync(temporario,{force:true});}catch{/* ignorar */}throw e;}
}
function pasta(dir,codigo){if(!CODIGO.test(codigo))throw Error('Código de sala inválido.');return join(dir,codigo);}
function serializar(sala){
  const pessoa=p=>({id:p.id,apelido:p.apelido,papel:p.papel,token:p.token,
    ...(p.personagemId?{personagemId:p.personagemId}:{})});
  return {
    versao:1,codigo:sala.codigo,campanha:sala.campanha,campanhaId:sala.campanhaId,
    criadaEm:sala.criadaEm,ultimaAtividade:sala.ultimaAtividade,
    host:pessoa(sala.host),pessoas:[...sala.pessoas.values()].filter(p=>p.papel==='convidado').map(pessoa),
    mesa:sala.mesa, fichas:[...sala.fichas],inventarios:[...sala.inventarios],
    diario:sala.diario,diariosRecebidos:[...sala.diariosRecebidos],
    desenhosJogador:[...sala.desenhosJogador],rolagens:sala.rolagens,chat:sala.chat,
    revisaoAmbiente:sala.revisaoAmbiente||0,
  };
}
function reconstruir(valor,dir){
  if(valor?.versao!==1||!CODIGO.test(valor.codigo)||typeof valor.campanha!=='string'||
    typeof valor.campanhaId!=='string'||!Number.isFinite(valor.ultimaAtividade)||
    Date.now()-valor.ultimaAtividade>DURACAO)return null;
  const construir=(p,papel)=>{
    if(!p||typeof p.id!=='string'||typeof p.token!=='string'||p.token.length<20||
      typeof p.apelido!=='string'||p.papel!==papel)return null;
    return {id:p.id,papel,apelido:p.apelido,token:p.token,conexoes:new Set(),
      ...(papel==='convidado'&&typeof p.personagemId==='string'?{personagemId:p.personagemId}:{})};
  };
  const host=construir(valor.host,'mestre');if(!host)return null;
  const pessoas=new Map([[host.id,host]]);
  for(const candidato of par(valor.pessoas).slice(0,12)){
    const p=construir(candidato,'convidado');
    if(p&&!pessoas.has(p.id)&&![...pessoas.values()].some(x=>x.token===p.token))pessoas.set(p.id,p);
  }
  const midias=new Map(),modelos3D=new Map();
  const arquivoPasta=pasta(dir,valor.codigo);
  for(const arquivo of readdirSync(arquivoPasta)){
    const gif=/^gif-([a-f0-9]{32})\.bin$/.exec(arquivo);
    const glb=/^glb-(mini-[a-z0-9-]{6,90})\.bin$/i.exec(arquivo);
    if(!gif&&!glb)continue;
    const bytes=readFileSync(join(arquivoPasta,arquivo));
    if(gif&&bytes.length<=3_000_000)midias.set(gif[1],bytes);
    if(glb&&bytes.length<=35_000_000)modelos3D.set(glb[1],bytes);
  }
  // Nenhuma conexão, controle de cena, pedido transitório ou vídeo WebRTC
  // retorna após um reinício. O mestre republica a cena ao reconectar.
  return {
    codigo:valor.codigo,campanha:valor.campanha,campanhaId:valor.campanhaId,
    criadaEm:valor.criadaEm||Date.now(),ultimaAtividade:valor.ultimaAtividade,
    host,pessoas,controladores:new Set(),mesa:valor.mesa||null,
    fichas:reconstruirMapa(valor.fichas),inventarios:reconstruirMapa(valor.inventarios),
    diario:par(valor.diario),diariosRecebidos:reconstruirMapa(valor.diariosRecebidos),
    pedidosItens:new Map(),rolagens:par(valor.rolagens),chat:par(valor.chat),
    desenhosJogador:reconstruirMapa(valor.desenhosJogador),
    videosRolagens:new Map(),sessoesDadosAoVivo:new Map(),midias,modelos3D,
    revisaoAmbiente:valor.revisaoAmbiente||0,
  };
}
export function criarPersistenciaSalas(diretorio){
  if(!diretorio)return null;
  mkdirSync(diretorio,{recursive:true,mode:0o700});
  try{chmodSync(diretorio,0o700);}catch{/* Windows */}
  const pendentes=new Map();
  function salvar(sala){
    if(!sala||!CODIGO.test(sala.codigo))return;
    const dir=pasta(diretorio,sala.codigo);
    mkdirSync(dir,{recursive:true,mode:0o700});
    escreverAtomico(join(dir,'estado.json'),JSON.stringify(serializar(sala)));
  }
  function agendar(sala){
    if(pendentes.has(sala.codigo))return;
    // Janela fixa: movimentação contínua não posterga o salvamento indefinidamente.
    const id=setTimeout(()=>{
      pendentes.delete(sala.codigo);
      try{salvar(sala);}catch(e){console.error('[Portal] Falha ao preservar a sala:',e.message);}
    },1200);
    id.unref?.();pendentes.set(sala.codigo,id);
  }
  function carregar(){
    const resultado=[];
    for(const codigo of readdirSync(diretorio).filter(v=>CODIGO.test(v)).slice(0,20)){
      try{
        const caminho=join(pasta(diretorio,codigo),'estado.json');
        if(!existsSync(caminho))continue;
        const sala=reconstruir(JSON.parse(readFileSync(caminho,'utf8')),diretorio);
        if(sala&&sala.codigo===codigo)resultado.push(sala);
      }catch(e){console.warn('[Portal] Sala preservada indisponível:',codigo,e.message);}
    }
    return resultado;
  }
  function arquivo(sala,tipo,id,bytes){
    if(!CODIGO.test(sala.codigo)||!Buffer.isBuffer(bytes))throw Error('Arquivo de sessão inválido.');
    if(tipo==='gif'?!ID_GIF.test(id):tipo==='glb'?!ID_GLB.test(id):true)throw Error('Identificador de mídia inválido.');
    const dir=pasta(diretorio,sala.codigo);mkdirSync(dir,{recursive:true,mode:0o700});
    escreverAtomico(join(dir,`${tipo}-${id}.bin`),bytes);
  }
  function remover(codigo){
    const timer=pendentes.get(codigo);if(timer)clearTimeout(timer);pendentes.delete(codigo);
    rmSync(pasta(diretorio,codigo),{recursive:true,force:true});
  }
  function descarregar(salas){
    for(const timer of pendentes.values())clearTimeout(timer);
    pendentes.clear();
    for(const sala of salas)salvar(sala);
  }
  return {carregar,salvar,agendar,arquivo,remover,descarregar};
}
