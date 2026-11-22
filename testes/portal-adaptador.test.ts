import { converterFichaParaBiblioteca, reconhecerFichaCriador } from '../src/impeto/integracaoPortal';
import { atributosBase, periciasBase,ativaVazia,passivaVazia } from '../src/impeto/contrato';
import { importarFichaHexatombe } from '../src/impeto/importador';
const foto='';
const pacote={formato:'hexatombe-avatar-ficha',versaoFormato:1, ficha:{
  versao:1,escalaAvatar:'piloto-a01',nome:'Ayla',elemento:'agua',foto,historia:'Exemplo',
  atributosImpeto:{...atributosBase(),Vigor:12},periciasImpeto:periciasBase(),
  recursosImpeto:{hp:2,energia:2,ca:8,ataqueDados:0,regeneracao:0},
  derivacaoD01:{tipo:'reserva',atributo:'Vigor',justificativa:'Espírito'},
  ataqueBasico:{nome:'Jato',descricao:'Jato de água'},
  ativasImpeto:[{...ativaVazia(),nome:'Lança',efeito:'dano',quantidade:3,fixo:2},...Array.from({length:4},()=>ativaVazia())],
  passivaImpeto:passivaVazia(),exploracaoImpeto:[],
 }};
let count=0;
const assert=(cond:boolean,msg:string)=>{if(!cond)throw Error(msg);count++};
assert(reconhecerFichaCriador(pacote),'reconhece envelope');
const dados=converterFichaParaBiblioteca(pacote);
assert(dados.name==='Ayla','nome');
assert(dados.manaMax===135,'energia com D01');
assert(dados.hpMax===136,'hp com PR');
assert(dados.basicDamage==='2d6+2','ataque básico');
assert(dados.skills[0].damage==='3d8+2','dano formula');
assert(dados.skills[0].cost===10,'custo EN de 19 PC');
assert(importarFichaHexatombe(dados.impeto.origem).estatisticas.hpMax===136,'reabrir origem');
assert(dados.impeto.ativas.length===5,'cinco ativas');
console.log(`OK — ${count} verificações do adaptador Portal/Biblioteca`);
