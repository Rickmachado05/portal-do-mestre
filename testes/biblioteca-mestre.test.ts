import { validarFicha, papelDaFicha, ROTULOS_PAPEL } from '../src/hexatombe/fichasLibrary';
import { listarAcoesDaFicha } from '../src/hexatombe/acoesFichaDados';

let count=0;
const testar=(ok:boolean,mensagem:string)=>{if(!ok)throw Error(mensagem);count++;};
const base={
  name:'Guardião da Aurora',element:'fogo',class:'Vigia do portal',
  hpMax:65,hpCurrent:65,manaMax:30,manaCurrent:30,ca:10,
  basicName:'Investida',basicDamage:'2d6+2',basicDescription:'Ataque básico',
  skills:[{name:'Chama',type:'Ofensiva',cost:6,damage:'2d8',effect:'Explosão no alvo',limits:'Uma ação'}],
  story:'Protege a passagem.'
};
for(const papel of ['npc','inimigo','chefe'] as const){
  const dados=validarFicha({...base,papel,objetivo:'Defender o santuário',comportamento:'Protege os aliados',
    notasMestre:'Verificar iniciativa',fasesChefe:'Mudança aos 50% HP',planoEncontro:'Dois reforços'});
  testar(papelDaFicha(dados)===papel,`${papel}: mantém categoria`);
  testar(dados.objetivo==='Defender o santuário',`${papel}: mantém objetivo`);
  testar(dados.fasesChefe==='Mudança aos 50% HP',`${papel}: mantém fase`);
  testar(dados.planoEncontro==='Dois reforços',`${papel}: mantém reforços`);
  testar(dados.notasMestre==='Verificar iniciativa',`${papel}: preserva anotações`);
  const acoes=listarAcoesDaFicha(dados);
  testar(acoes.find(a=>a.id==='skill-0')?.custo===6,`${papel}: conserva custo manual`);
  testar(acoes.find(a=>a.id==='skill-0')?.fonte==='manual',`${papel}: custo em EN, não moedas legadas`);
  testar(acoes.find(a=>a.id==='skill-0')?.categoria==='ofensiva',`${papel}: classificação de técnica`);
}
const legado=validarFicha(base);
testar(papelDaFicha(legado)==='jogador','Registros anteriores continuam Jogadores');
testar(ROTULOS_PAPEL.chefe==='Chefe','Rótulo de chefe');
testar(papelDaFicha({papel:'categoria-desconhecida'})==='jogador','Categoria não suportada usa fallback seguro');
testar(validarFicha({...base,papel:'invalido'}).papel==='jogador','Importação neutraliza categoria inválida');
let invalido=false;try{validarFicha({...base,hpMax:0});}catch{invalido=true;}
testar(invalido,'HP inválido permanece proibido');
const narrativo=validarFicha({
  name:'Mensageiro',element:'neutro',class:'Informante',papel:'npc',
  hpMax:1,hpCurrent:1,manaMax:30,manaCurrent:48,ca:0,skills:[],story:'Guarda um segredo',
});
testar(narrativo.manaCurrent===48,'NPC Ímpeto pode acumular Energia acima da referência');
testar(listarAcoesDaFicha(narrativo).length===0,'NPC puramente narrativo não recebe ataque básico fictício');

console.log(`OK — ${count} verificações da Biblioteca do Mestre v19`);
