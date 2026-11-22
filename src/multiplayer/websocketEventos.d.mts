type ConexaoEventos={onopen:(()=>void)|null;onerror:(()=>void)|null;onmessage:((evento:{data:string})=>void)|null;close:()=>void};
export function criarConexaoWebSocket(url:string):ConexaoEventos;
export function usarWebSocketNoHost(hostname:string):boolean;
