import type {FichaDados} from '../hexatombe/fichasLibrary';
import type {FichaPortalImpeto} from './contrato';
import type {AcaoDaFicha} from '../hexatombe/acoesFichaDados';
export function reconhecerUniversal(x:unknown):boolean;
export function converterUniversal(raw:unknown):FichaDados & {impeto:FichaPortalImpeto;skills:NonNullable<FichaDados['skills']>};
export function acoesUniversais(ficha:FichaDados):AcaoDaFicha[];
export function descricaoEscolhasUniversal(ficha:FichaPortalImpeto):{config:Record<string,number|boolean>;talento:string;vantagens:{nome:string;descricao:string}[];conceito:string;manifestacao:string;ambientacao:string;equipamentos:string};
