export type ArrastoRemoto={tipo:'arrasto-token';cenaId:string;id:string;x:number;y:number;final:boolean;sequencia:number};
export function assinarArrasto(cenaId:string,tokenId:string,receber:(movimento:ArrastoRemoto)=>void):()=>void;
export function publicarArrasto(movimento:ArrastoRemoto):void;
