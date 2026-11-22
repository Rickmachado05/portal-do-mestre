/** Adapter de WebSocket para a interface EventSource usada pelo multiplayer.
 * O Quick Tunnel não suporta SSE. O servidor continua validando TODAS as ações via HTTP.
 */
export function criarConexaoWebSocket(url,criarSocket=(destino)=>new WebSocket(destino)){
  let cancelado=false, socket=null, tentativa=0, reconexao=null;
  const con={onopen:null,onerror:null,onmessage:null,close};
  function close(){
    cancelado=true;
    if(reconexao!==null)clearTimeout(reconexao);
    reconexao=null;
    if(socket){socket.onopen=socket.onmessage=socket.onclose=socket.onerror=null;socket.close();socket=null;}
  }
  function conectar(){
    if(cancelado)return;
    const origem=new URL(url,window.location.href);
    origem.protocol=origem.protocol==='https:'?'wss:':'ws:';
    origem.pathname=origem.pathname.replace(/\/eventos$/,'/eventos-ws');
    const atual=criarSocket(origem.toString());
    socket=atual;
    atual.onopen=()=>{if(socket!==atual||cancelado)return;tentativa=0;con.onopen?.();};
    atual.onmessage=e=>{if(socket===atual&&!cancelado)con.onmessage?.(e);};
    const falhou=()=>{
      if(socket!==atual||cancelado)return;
      socket=null;
      con.onerror?.();
      const atraso=Math.min(10000,500*Math.pow(2,Math.min(tentativa++,5)));
      reconexao=setTimeout(()=>{reconexao=null;conectar();},atraso);
    };
    atual.onerror=()=>{/* onclose também chega; notificar uma única vez */};
    atual.onclose=falhou;
  }
  conectar();
  return con;
}
export function usarWebSocketNoHost(hostname){
  return hostname!=='localhost'&&hostname!=='127.0.0.1'&&hostname!=='[::1]';
}
