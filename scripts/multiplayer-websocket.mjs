/** WebSocket de SAÍDA: transporta os mesmos eventos filtrados pelo servidor SSE.
 * Sem dependências e sem mensagens de jogo do cliente; ações continuam via HTTP autenticado.
 * Proteções: upgrade validado, payload limitado, máscara obrigatória no sentido navegador->servidor.
 */
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';

const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PENDENTE=8*1024*1024;
function quadro(payload,opcode=1){
  const dados=Buffer.isBuffer(payload)?payload:Buffer.from(payload,'utf8');
  const n=dados.length, cab=n<126?2:n<=65535?4:10;
  const buf=Buffer.allocUnsafe(cab+n);
  buf[0]=0x80 | opcode;
  if(n<126)buf[1]=n;
  else if(n<=65535){buf[1]=126;buf.writeUInt16BE(n,2);}
  else {buf[1]=127;buf.writeBigUInt64BE(BigInt(n),2);}
  dados.copy(buf,cab);
  return buf;
}
export function recusarWebSocket(socket,status=403){
  try{socket.end(`HTTP/1.1 ${status} ${status===401?'Unauthorized':'Forbidden'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);}catch{socket.destroy();}
}
export function aceitarWebSocket(req,socket,head=Buffer.alloc(0)){
  const chave=req.headers['sec-websocket-key'];
  const validado=typeof chave==='string' && /^[A-Za-z0-9+/]{22}==$/.test(chave)&&Buffer.from(chave,'base64').length===16;
  const upgrade=String(req.headers.upgrade||'').toLowerCase()==='websocket';
  const conexao=String(req.headers.connection||'').toLowerCase().split(',').map(s=>s.trim()).includes('upgrade');
  if(!validado||!upgrade||!conexao||req.headers['sec-websocket-version']!=='13'){
    recusarWebSocket(socket,400);return null;
  }
  const accept=createHash('sha1').update(chave+GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  socket.setNoDelay(true);
  const emitter=new EventEmitter();
  let closed=false, recebido=Buffer.alloc(0);
  const encerrar=()=>{
    if(closed)return;
    closed=true;
    emitter.emit('close');
  };
  const fechar=()=>{if(!closed){try{socket.end(quadro(Buffer.from([0x03,0xE8]),8));}catch{socket.destroy();}}encerrar();};
  const con={
    get writableEnded(){return closed||socket.writableEnded;},
    get destroyed(){return closed||socket.destroyed;},
    get writableLength(){return socket.writableLength;},
    on:eventEmitterOn,
    write(texto){
      if(closed||socket.destroyed)return false;
      // Todos os eventos existentes são uma única linha data: JSON em SSE.
      // Comentários/pulsos de SSE viram quadros ping WebSocket.
      const valor=String(texto);
      let data;
      if(valor.startsWith('data: '))data=valor.slice(6).trimEnd();
      else if(valor.startsWith(':'))return socket.write(quadro(Buffer.alloc(0),9));
      else throw new Error('Formato de evento não suportado no WebSocket.');
      if(Buffer.byteLength(data,'utf8')+socket.writableLength>MAX_PENDENTE){fechar();return false;}
      return socket.write(quadro(data));
    },
    end:fechar,
    destroy(){socket.destroy();encerrar();},
  };
  function eventEmitterOn(nome,callback){emitter.on(nome,callback);return con;}
  socket.once('close',encerrar);
  socket.once('error',()=>{socket.destroy();encerrar();});
  socket.on('data',buf=>{
    recebido=Buffer.concat([recebido,buf]);
    if(recebido.length>65536){fechar();return;}
    while(recebido.length>=2&&!closed){
      const b0=recebido[0], b1=recebido[1];
      const opcode=b0&0xf, mascarado=(b1&0x80)!==0;
      let n=b1&0x7f, pos=2;
      if((b0&0x70)!==0||(b0&0x80)===0||!mascarado){fechar();return;}
      if(n===126){if(recebido.length<4)return;n=recebido.readUInt16BE(2);pos=4;}
      else if(n===127){
        if(recebido.length<10)return;
        const tamanho=recebido.readBigUInt64BE(2);
        if(tamanho>65536n){fechar();return;}
        n=Number(tamanho);pos=10;
      }
      if(n>65536||((opcode&8)!==0&&n>125)){fechar();return;}
      if(recebido.length<pos+4+n)return;
      const mascara=recebido.subarray(pos,pos+4),payload=Buffer.from(recebido.subarray(pos+4,pos+4+n));
      for(let i=0;i<n;i++)payload[i]^=mascara[i%4];
      recebido=recebido.subarray(pos+4+n);
      if(opcode===8){fechar();return;}
      if(opcode===9){socket.write(quadro(payload,10));continue;}
      if(opcode===10)continue;
      // Este canal é estritamente servidor -> navegador.
      fechar();return;
    }
  });
  if(head?.length)socket.emit('data',head);
  return con;
}
