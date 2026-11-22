/**
 * Leitor GIF89a/87a local para os tokens idle do Portal do Mestre.
 * A animação é decodificada uma vez em quadros RGBA; o tempo da reprodução
 * é calculado pelo relógio da mesa, não pelo decodificador nativo de GIF.
 * Implementa transparência, tabelas locais, LZW, interlace e disposal 2/3.
 * Não altera campanhas nem faz requisições externas.
 */
// v22: não reduzir o GIF de 512 px para 192 px: a textura 3D precisa
// receber a resolução original para conservar contornos e detalhes finos.
export const LIMITES_IDLE = Object.freeze({bytes:4*1024*1024, lado:512, quadros:40, ladoRender:512, fpsMax:12});
const restricao=(condicao,mensagem)=>{if(!condicao)throw new Error(mensagem);};
const u16=(b,p)=>b[p]|(b[p+1]<<8);
function tabela(b,estado,tamanho){
  restricao(estado.p+tamanho*3<=b.length,'GIF com tabela de cores incompleta.');
  const tabela=b.subarray(estado.p,estado.p+tamanho*3);estado.p+=tamanho*3;return tabela;
}
function blocos(b,estado){
  const blocos=[];let tamanho=0;
  while(true){restricao(estado.p<b.length,'GIF truncado na leitura dos quadros.');const n=b[estado.p++];if(!n)break;
    restricao(estado.p+n<=b.length,'GIF com bloco de dados incompleto.');
    blocos.push(b.subarray(estado.p,estado.p+n));estado.p+=n;tamanho+=n;
  }
  const buffer=new Uint8Array(tamanho);let p=0;
  for(const parte of blocos){buffer.set(parte,p);p+=parte.length;}return buffer;
}
function lzw(indices,menor,esperado){
  restricao(menor>=2&&menor<=8,'GIF com compressão não suportada.');
  const clear=1<<menor,end=clear+1,dicionario=new Array(4096);
  let bits=menor+1,proximo=end+1,anterior=null,leitura=0;
  const reset=()=>{dicionario.fill(undefined);for(let i=0;i<clear;i++)dicionario[i]=[i];bits=menor+1;proximo=end+1;anterior=null;};
  const saida=new Uint8Array(esperado);let pos=0;
  reset();
  while(leitura+bits<=indices.length*8&&pos<esperado){
    let codigo=0;for(let i=0;i<bits;i++){const bit=leitura+i;codigo|=((indices[bit>>3]>>(bit&7))&1)<<i;}leitura+=bits;
    if(codigo===clear){reset();continue;}if(codigo===end)break;
    let entrada;
    if(codigo<proximo&&dicionario[codigo])entrada=dicionario[codigo];
    else if(codigo===proximo&&anterior)entrada=[...anterior,anterior[0]];
    else throw new Error('GIF com sequência de cores inválida.');
    for(const valor of entrada){if(pos<esperado)saida[pos++]=valor;}
    if(anterior&&proximo<4096){dicionario[proximo++]=[...anterior,entrada[0]];
      if(proximo===(1<<bits)&&bits<12)bits++;
    }
    anterior=entrada;
  }
  restricao(pos===esperado,'Quadro GIF não pôde ser decodificado completamente.');
  return saida;
}
function indiceImagem(dados,w,h,interlace){
  if(!interlace)return dados;
  const saida=new Uint8Array(dados.length);let pos=0;
  for(const [inicio,salto] of [[0,8],[4,8],[2,4],[1,2]])for(let y=inicio;y<h;y+=salto){
    saida.set(dados.subarray(pos,pos+w),y*w);pos+=w;
  }
  return saida;
}
function reduzirQuadro(pixels,w,h,max){
  const fator=Math.min(1,max/Math.max(w,h)),lw=Math.max(1,Math.round(w*fator)),lh=Math.max(1,Math.round(h*fator));
  // Caminho sem perda: a imagem original já cabe no limite da textura.
  // slice() cria uma cópia independente do canvas de composição reutilizado.
  if(lw===w&&lh===h)return {largura:w,altura:h,pixels:pixels.slice()};
  const reduzido=new Uint8ClampedArray(lw*lh*4);
  for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
    const ox=Math.min(w-1,Math.floor(x*w/lw)),oy=Math.min(h-1,Math.floor(y*h/lh));
    const fonte=(oy*w+ox)*4,destino=(y*lw+x)*4;
    reduzido[destino]=pixels[fonte];reduzido[destino+1]=pixels[fonte+1];
    reduzido[destino+2]=pixels[fonte+2];reduzido[destino+3]=pixels[fonte+3];
  }
  return {largura:lw,altura:lh,pixels:reduzido};
}
/** @param {ArrayBuffer | Uint8Array} arquivo */
export function decodificarGifIdle(arquivo){
  const b=arquivo instanceof Uint8Array?arquivo:new Uint8Array(arquivo);
  restricao(b.length>20&&b.length<=LIMITES_IDLE.bytes,'GIF idle deve ter até 4 MB.');
  const header=String.fromCharCode(...b.subarray(0,6));
  restricao(header==='GIF89a'||header==='GIF87a','O arquivo não é um GIF válido.');
  const w=u16(b,6),h=u16(b,8),packed=b[10];
  restricao(w>0&&h>0&&w<=LIMITES_IDLE.lado&&h<=LIMITES_IDLE.lado,
    `O GIF deve ter até ${LIMITES_IDLE.lado} × ${LIMITES_IDLE.lado} pixels.`);
  const estado={p:13};
  const global=(packed&0x80)?tabela(b,estado,1<<((packed&7)+1)):null;
  const canvas=new Uint8ClampedArray(w*h*4),quadros=[];
  let anterior=null,transparencia=null,delay=100,disposal=0,quadroAnterior=null;
  while(estado.p<b.length){
    const bloco=b[estado.p++];
    if(bloco===0x3b)break;
    if(bloco===0x21){ // extensão
      restricao(estado.p<b.length,'GIF truncado na extensão.');const tipo=b[estado.p++];
      if(tipo===0xf9){
        restricao(estado.p+6<=b.length&&b[estado.p]===4,'Extensão de transparência GIF inválida.');
        estado.p++;const flag=b[estado.p++];disposal=(flag>>2)&7;
        delay=Math.max(1000/LIMITES_IDLE.fpsMax,Math.min(1500,u16(b,estado.p)*10||100));estado.p+=2;
        const transparente=b[estado.p++];transparencia=(flag&1)?transparente:null;
        restricao(b[estado.p++]===0,'Extensão gráfica GIF incompleta.');
      } else blocos(b,estado);
      continue;
    }
    restricao(bloco===0x2c,'GIF contém dados de imagem não suportados.');
    restricao(quadros.length<LIMITES_IDLE.quadros,'GIF excede o limite de 40 quadros.');
    restricao(estado.p+9<=b.length,'Quadro GIF incompleto.');
    const x=u16(b,estado.p),y=u16(b,estado.p+2),fw=u16(b,estado.p+4),fh=u16(b,estado.p+6),opcoes=b[estado.p+8];estado.p+=9;
    restricao(fw>0&&fh>0&&x+fw<=w&&y+fh<=h,'Quadro GIF fora da imagem.');
    const cores=(opcoes&0x80)?tabela(b,estado,1<<((opcoes&7)+1)):global;
    restricao(cores!==null,'GIF sem tabela de cores.');
    restricao(estado.p<b.length,'GIF sem compressão do quadro.');
    const min=b[estado.p++],raw=blocos(b,estado);
    // Primeiro descarta o quadro anterior conforme sua própria regra de disposal.
    if(anterior?.disposal===2){for(let py=anterior.y;py<anterior.y+anterior.h;py++)for(let px=anterior.x;px<anterior.x+anterior.w;px++){
      canvas.fill(0,(py*w+px)*4,(py*w+px)*4+4);
    }}else if(anterior?.disposal===3&&quadroAnterior)canvas.set(quadroAnterior);
    quadroAnterior=disposal===3?canvas.slice():null;
    const raster=indiceImagem(lzw(raw,min,fw*fh),fw,fh,Boolean(opcoes&0x40));
    for(let py=0;py<fh;py++)for(let px=0;px<fw;px++){
      const cor=raster[py*fw+px];if(cor===transparencia)continue;
      const indice=cor*3;restricao(indice+2<cores.length,'GIF com índice de cor inválido.');
      const alvo=((py+y)*w+px+x)*4;
      canvas[alvo]=cores[indice];canvas[alvo+1]=cores[indice+1];canvas[alvo+2]=cores[indice+2];canvas[alvo+3]=255;
    }
    const pequeno=reduzirQuadro(canvas,w,h,LIMITES_IDLE.ladoRender);
    quadros.push({pixels:pequeno.pixels,duracaoMs:delay});
    anterior={x,y,w:fw,h:fh,disposal};transparencia=null;delay=100;disposal=0;
  }
  restricao(quadros.length>0,'GIF não contém quadros.');
  const fator=Math.min(1,LIMITES_IDLE.ladoRender/Math.max(w,h));
  return {largura:Math.max(1,Math.round(w*fator)),altura:Math.max(1,Math.round(h*fator)),quadros,
    duracaoTotal:quadros.reduce((s,q)=>s+q.duracaoMs,0)};
}
export function quadroNoTempo(animacao,tempoMs){
  const total=animacao.duracaoTotal;
  if(!total||animacao.quadros.length===1)return 0;
  let restante=((tempoMs%total)+total)%total;
  for(let i=0;i<animacao.quadros.length;i++){
    restante-=animacao.quadros[i].duracaoMs;if(restante<0)return i;
  }
  return 0;
}

// Um único worker compartilha a fila de decodificação; o fallback é o leitor
// anterior, para navegadores sem workers ou testes em Node/offline.
let gifWorker = null;
let workerIndisponivel = false;
let sequenciaGif = 0;
const pendentesGif = new Map();
function decodificarSemBloquear(dados) {
  if (workerIndisponivel || typeof Worker === 'undefined')
    return Promise.resolve().then(() => decodificarGifIdle(dados));
  try {
    if (!gifWorker) {
      gifWorker = new Worker(new URL('./tokenIdleWorker.mjs', import.meta.url), {type:'module'});
      gifWorker.onmessage = ({data}) => {
        const pedido = pendentesGif.get(data.id);
        if (!pedido) return;
        pendentesGif.delete(data.id);
        if (data.erro) pedido.reject(new Error(data.erro));
        else pedido.resolve(data.animacao);
      };
      gifWorker.onerror = () => {
        workerIndisponivel = true;
        for(const pedido of pendentesGif.values()) pedido.reject(new Error('Worker GIF indisponível'));
        pendentesGif.clear();gifWorker?.terminate();gifWorker=null;
      };
    }
    return new Promise((resolve, reject) => {
      const id=++sequenciaGif;
      pendentesGif.set(id, {resolve,reject});
      // Conserva os bytes originais para o fallback, caso o worker falhe.
      const copia=dados.slice();
      try { gifWorker.postMessage({id, dados:copia.buffer}, [copia.buffer]); }
      catch(erro){ pendentesGif.delete(id);reject(erro); }
    }).catch(()=>decodificarGifIdle(dados));
  } catch {
    workerIndisponivel=true;
    return Promise.resolve().then(()=>decodificarGifIdle(dados));
  }
}

// Várias cópias do mesmo guarda reutilizam os quadros decodificados. O cache
// pequeno não acumula as texturas WebGL nem referencia tokens removidos.
const cachePorConteudo=new Map();
let tamanhoCacheGif=0;
const LIMITE_CACHE_GIF=48*1024*1024;
function reduzirCacheGif() {
  while(tamanhoCacheGif>LIMITE_CACHE_GIF && cachePorConteudo.size>1){
    const primeira=cachePorConteudo.keys().next().value;
    const anterior=cachePorConteudo.get(primeira);
    tamanhoCacheGif-=anterior.bytes;
    cachePorConteudo.delete(primeira);
  }
}
export async function decodificarBlobGifIdle(blob){
  const buffer=await blob.arrayBuffer();
  const dados=new Uint8Array(buffer);
  restricao(dados.length<=LIMITES_IDLE.bytes,'GIF idle deve ter até 4 MB.');
  // Localhost/HTTPS têm WebCrypto; acesso por IP em HTTP pode não ter.
  // O fallback mantém o recurso funcionando offline na rede local.
  let chave;
  if(globalThis.crypto?.subtle){
    const digest=await globalThis.crypto.subtle.digest('SHA-256',dados);
    chave=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }else{
    let h1=2166136261,h2=2246822519;
    for(const byte of dados){h1=Math.imul(h1^byte,16777619);h2=Math.imul(h2+byte,3266489917);}
    chave=`local:${dados.length}:${h1>>>0}:${h2>>>0}`;
  }
  const salvo=cachePorConteudo.get(chave);
  if(salvo){cachePorConteudo.delete(chave);cachePorConteudo.set(chave,salvo);return salvo.promessa;}
  const registro={promessa:null,bytes:0};
  const promessa=decodificarSemBloquear(dados);
  registro.promessa=promessa;
  cachePorConteudo.set(chave,registro);
  promessa.then(animacao=>{
    if(cachePorConteudo.get(chave)!==registro)return;
    registro.bytes=animacao.quadros.reduce((total,q)=>total+q.pixels.byteLength,0);
    tamanhoCacheGif+=registro.bytes;
    reduzirCacheGif();
  }).catch(()=>{
    if(cachePorConteudo.get(chave)===registro){cachePorConteudo.delete(chave);tamanhoCacheGif-=registro.bytes;}
  });
  return promessa;
}
