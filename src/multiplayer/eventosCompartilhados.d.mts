import type {CredencialSala,EventoSala} from './api';
type Estado = 'conectado'|'reconectando';
type Conexao=Pick<EventSource,'onopen'|'onerror'|'onmessage'|'close'>;
export function criarGerenciadorEventosCompartilhados(criarConexao:(url:string)=>Conexao):{
  assinar(credencial:CredencialSala,urlBase:string,validos:readonly string[],onEvento:(evento:EventoSala)=>void,onStatus:(estado:Estado)=>void,controlador?:boolean):()=>void;
  quantidade():number;
};
