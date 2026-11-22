export type AmostraPosicao = {x:number;y:number;t:number};
export const ATRASO_VISUAL_MS:number;
export const LIMITE_SALTO_PERCENTUAL:number;
export function registrarPosicao(amostras:AmostraPosicao[],x:number,y:number,instante:number):AmostraPosicao[];
export function amostrarPosicao(amostras:AmostraPosicao[],agora:number,atraso?:number):{x:number;y:number}|null;
