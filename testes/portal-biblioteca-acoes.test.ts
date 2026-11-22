import { converterFichaParaBiblioteca } from '../src/impeto/integracaoPortal';
import { atributosBase,periciasBase,ativaVazia,passivaVazia } from '../src/impeto/contrato';
import { validarFicha } from '../src/hexatombe/fichasLibrary';
import { listarAcoesDaFicha } from '../src/hexatombe/acoesFichaDados';
import { usarTecnica,iniciarAtivacao,iniciarRodada,criarEstadoTurno } from '../src/impeto/combate';
const ativas=[{...ativaVazia(),nome:'Rajada',efeito:'dano' as const,quantidade:3,fixo:2},
  {...ativaVazia(),nome:'Benção',efeito:'buffCa1' as const,ativacao:'buff' as const},
  {...ativaVazia(),nome:'Reação',efeito:'mitigacao' as const,ativacao:'reacao' as const},
  {...ativaVazia(),nome:'Atordoar',efeito:'atordoamento' as const},
  ativaVazia()];
const pacote={formato:'hexatombe-avatar-ficha',versaoFormato:1,ficha:{
  versao:1,escalaAvatar:'piloto-a01',nome:'Yun',elemento:'agua',foto:'',historia:'Teste',
  atributosImpeto:{...atributosBase(),Vigor:12},periciasImpeto:{...periciasBase(),Atenção:2 as const},
  recursosImpeto:{hp:2,energia:2,ca:8,ataqueDados:0,regeneracao:0},
  derivacaoD01:{tipo:'reserva',atributo:'Vigor',justificativa:'Origem'},
  ataqueBasico:{nome:'Ataque básico',descricao:'Golpe'},
  ativasImpeto:ativas,passivaImpeto:passivaVazia(),
  exploracaoImpeto:[{nome:'Rastrear',classe:'pontual',categoria:'Percepção e investigação',alvos:1,alcance:'proximo',duracao:'cena',usos:1,automatica:false,descricao:'Localizar pista',limites:'',teste:'Percepção + Atenção'}]
 }};
let count=0;const yes=(c:boolean,t:string)=>{if(!c)throw Error(t);count++};
const convertido=converterFichaParaBiblioteca(pacote);
const dado=validarFicha(convertido);
yes(!!dado.impeto,'Contrato preservado IndexedDB');
yes(dado.manaMax===135,'EN referência com derivação D01');
yes(dado.skills?.[0].cost===10,'Dano 19 PC, 10 EN');
const lista=listarAcoesDaFicha(dado);
yes(lista[0].valor==='2d6+2','Ataque básico não usa dano de classe antiga');
yes(lista.find(a=>a.id==='skill-0')?.valor==='3d8+2','Dano H06');
yes(lista.find(a=>a.id==='skill-0')?.exigeCA===true,'Dano exige CA');
yes(lista.find(a=>a.id==='skill-1')?.exigeCA===false,'Buff dispensa CA');
yes(lista.find(a=>a.id==='skill-3')?.exigeCA===false,'C02 exige defesa/escape, não CA automático');
yes(lista.filter(a=>a.id.startsWith('skill')).length===4,'Habilidade vazia não ocupa card');
yes(lista.find(a=>a.id==='exploracao-0')?.px===4,'Técnica de exploração PX');
const over=validarFicha({...convertido,manaCurrent:convertido.manaMax+21});
yes(over.manaCurrent===156,'EN pode superar referência no save');
const old=validarFicha({
  name:'Antigo',element:'terra',class:'Lutador',hpMax:135,hpCurrent:130,manaMax:100,manaCurrent:80,ca:10,
  skills:[{name:'Ataque antigo',type:'Ofensiva',cost:15,damage:'2d8+2'}]
});
yes(!old.impeto,'Ficha antiga não reclassificada como Avatar');
yes(listarAcoesDaFicha(old).find(a=>a.id==='skill-0')?.custo===15,'Custo legado preservado');
let x=iniciarAtivacao(iniciarRodada(criarEstadoTurno('Ayla',dado.impeto!),1));
x=usarTecnica(x,'principal',10);
yes(x.estatisticas.energiaAtual===125,'Gasto EN combate');
try{usarTecnica(x,'principal',10);throw Error('Duplicou ação principal');}catch(err){yes(err instanceof Error,'Segunda ação principal bloqueada');}
console.log(`OK — ${count} verificações Portal, persistência e ações`);
