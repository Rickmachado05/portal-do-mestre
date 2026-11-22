export type AreaPlanta3D={x:number;z:number;largura:number;altura:number};
export type AreaVisao3D={minX:number;minZ:number;largura:number;altura:number};
export type ProjecaoFog3D={x:number;y:number;largura:number;altura:number};
export function projetarFogNaPlanta3D(planta:AreaPlanta3D,visao:AreaVisao3D,larguraImagem:number,alturaImagem:number):ProjecaoFog3D|null;
export function comporFogNaPlanta3D(ctx:CanvasRenderingContext2D,origem:CanvasImageSource,mascara:CanvasImageSource,projecao:ProjecaoFog3D|null,largura:number,altura:number):boolean;
