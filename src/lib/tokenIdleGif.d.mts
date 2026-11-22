export type QuadroGifIdle = { pixels: Uint8ClampedArray<ArrayBuffer>; duracaoMs: number };
export type AnimacaoGifIdle = { largura:number; altura:number; quadros:QuadroGifIdle[]; duracaoTotal:number };
export const LIMITES_IDLE:Readonly<{bytes:number;lado:number;quadros:number;ladoRender:number;fpsMax:number}>;
export function decodificarGifIdle(arquivo:ArrayBuffer|Uint8Array):AnimacaoGifIdle;
export function quadroNoTempo(animacao:AnimacaoGifIdle,tempoMs:number):number;
export function decodificarBlobGifIdle(blob:Blob):Promise<AnimacaoGifIdle>;
