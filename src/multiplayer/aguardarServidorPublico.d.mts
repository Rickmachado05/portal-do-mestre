export function aguardarServidorPublico<T extends {ativo?:boolean}>(consultar:()=>Promise<T>,opcoes?:{tentativas?:number;intervalo?:number;esperar?:(ms:number)=>Promise<unknown>}):Promise<T>;
