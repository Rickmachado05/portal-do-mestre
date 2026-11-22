import { ESCALA_AVATAR_A01,ESCALA_LIVRO_IMPETO,atributosBase,periciasBase,ativaVazia,passivaVazia } from '../src/impeto/contrato';
import { importarFichaHexatombe,calcularRecursosCampanha } from '../src/impeto/importador';
import { custoPC,custoEN,custoPX } from '../src/impeto/custos';
import { criarEstadoTurno,iniciarRodada,iniciarAtivacao,gastarAcao,usarTecnica,
  caEfetiva,alterarEnergia,curarHP,receberDano,acertouCA,formulaDano,
  aplicarAtordoamentoC02,resolverEscapeC02,iniciativasChefe } from '../src/impeto/combate';

let count=0;
function ok(cond:boolean,txt:string){if(!cond)throw new Error('FALHA: '+txt);count++;}
function igual<T>(obtido:T,esperado:T,txt:string){ok(obtido===esperado,`${txt}: recebeu ${obtido}, esperado ${esperado}`);}
function falha(fn:()=>unknown,txt:string){let erro=false;try{fn();}catch(e){erro=e instanceof Error;}ok(erro,txt);}
const pacote={
  formato:'hexatombe-avatar-ficha',versaoFormato:1,
  exportadoEm:'2026-11-15T10:00:00.000Z',
  ficha:{
    versao:1,escalaAvatar:'piloto-a01',nome:'Nara',elemento:'agua',foto:'',historia:'História.',
    atributosImpeto:{...atributosBase(),Vigor:12},periciasImpeto:periciasBase(),
    recursosImpeto:{hp:2,energia:3,ca:10,ataqueDados:0,regeneracao:0},
    derivacaoD01:{tipo:'resistencia',atributo:'Vigor',justificativa:'Tenacidade'},
    ataqueBasico:{nome:'Jato',descricao:'Dobra água'},
    arquetipoImpeto:'Defensor',talentoArquetipo:'',vantagemUniversal:'memoriaTreinada',
    ativasImpeto:Array.from({length:5},()=>ativaVazia()),
    passivaImpeto:passivaVazia(),exploracaoImpeto:[],
  }
};
const ficha=importarFichaHexatombe(pacote);
igual(ficha.sistema,'impeto','Sistema identificador');
igual(ficha.escala,'avatar-a01','Escala identificadora');
igual(ficha.nome,'Nara','Nome');
igual(ficha.estatisticas.hpMax,139,'130 HP base + 6 PR + 3 D01');
igual(ficha.estatisticas.energiaReferencia,135,'120 EN + 15 EN PR');
igual(ficha.estatisticas.caBase,10,'CA Base de PR');
igual(ficha.ativas.length,5,'Cinco ativas');
igual(ficha.requerRevisao,false,'Novo formato sem aviso');
igual(ESCALA_AVATAR_A01.pc,100,'Orçamento Avatar PC');
igual(ESCALA_AVATAR_A01.px,35,'Orçamento Avatar PX');
igual(ESCALA_LIVRO_IMPETO.hpBase,40,'Livro M04.2 HP diferente do Avatar');
igual(ESCALA_LIVRO_IMPETO.energiaBase,30,'Livro M04.2 EN diferente do Avatar');
igual(ESCALA_LIVRO_IMPETO.pc,80,'PC do livro distinto do Avatar');
igual(calcularRecursosCampanha({hp:2,energia:1,ca:9,ataqueDados:0,regeneracao:0},
  {tipo:'',atributo:'',justificativa:''},ESCALA_LIVRO_IMPETO).hpMax,46,
  'Cálculo do livro é independente da escala Avatar');
const tecnicaDano={...ativaVazia(),efeito:'dano' as const,dado:8 as const,
  quantidade:3,fixo:2};
igual(custoPC(tecnicaDano),19,'H06 técnica 3d8+2 custa 19 PC');
igual(custoEN(custoPC(tecnicaDano),tecnicaDano),10,'H06 técnica 19 PC custa 10 EN');
const tecnicaDistante={...tecnicaDano,distante:true};
igual(custoPC(tecnicaDistante),24,'Alcance ampliado +25% custa 24 PC');
igual(custoEN(custoPC(tecnicaDistante),tecnicaDistante),15,
  'Alcance ampliado altera EN pelo PC final');
const controle={...ativaVazia(),efeito:'atordoamento' as const};
igual(custoPC(controle),19,'C02 custa 19 PC');
igual(custoEN(custoPC(controle),controle),12,'C02 exceção de 12 EN');
igual(custoPX({nome:'',classe:'complexa',categoria:'Percepção e investigação',alvos:1,
  alcance:'proximo',duracao:'cena',usos:1,automatica:false,descricao:'',limites:'',teste:''}),
  12,'Exploração PX complexa custa 12');
const fichaBruta=importarFichaHexatombe(pacote.ficha);
igual(fichaBruta.nome,ficha.nome,'Rascunho sem wrapper');
const fichaReserva={...pacote,ficha:{...pacote.ficha,derivacaoD01:{tipo:'reserva',atributo:'Vigor',justificativa:'Reserva'},
  recursosImpeto:{hp:0,energia:0,ca:8,ataqueDados:0,regeneracao:0}}};
igual(importarFichaHexatombe(fichaReserva).estatisticas.energiaReferencia,125,'D01 reserva +5');
const fichaPotencia={...pacote,ficha:{...fichaReserva.ficha,derivacaoD01:{tipo:'potencia',atributo:'Vigor',justificativa:''}}};
igual(importarFichaHexatombe(fichaPotencia).estatisticas.ataqueBasicoFixo,3,'D01 potencia +1');
falha(()=>importarFichaHexatombe({...pacote,ficha:{...pacote.ficha,derivacaoD01:{tipo:'potencia',atributo:'Força',justificativa:''}}}),
  'D01 não aceita atributo abaixo de 12');
const antigo={versao:1,nome:'Legado',elemento:'fogo',foto:'',historia:'Antiga',
  habilidades:[{nome:'Rajada',efeito:'Fogo visível',limitacoes:'Uma vez',modelo:'golpe'}],
  passiva:{nome:'Brasas',descricao:'Descrição histórica',modelo:'protecao'}};
const legado=importarFichaHexatombe(antigo);
igual(legado.requerRevisao,true,'Legado exige revisão');
igual(legado.ativas[0].nome,'Rajada','Conserva nome legado');
igual(legado.ativas[0].efeito,'nenhum','Não inventa dano H06');
igual(legado.passiva.nome,'Brasas','Conserva passiva');
igual(legado.origem,antigo,'Preserva original');
let turno=criarEstadoTurno('x',ficha);
turno=iniciarRodada(turno,1);
turno=iniciarAtivacao(turno);
turno=usarTecnica(turno,'principal',10);
igual(turno.estatisticas.energiaAtual,125,'Consumo de energia');
falha(()=>gastarAcao(turno,'principal'),'Somente uma ação principal');
turno=gastarAcao(turno,'buff');
falha(()=>gastarAcao(turno,'buff'),'Somente um buff por ativação');
turno=gastarAcao(turno,'reacao');
falha(()=>gastarAcao(turno,'reacao'),'Uma reação por rodada');
turno=iniciarAtivacao(turno,true);
falha(()=>gastarAcao(turno,'reacao'),'Chefe não ganha reação extra na mesma rodada');
turno=iniciarRodada(turno,2);
igual(turno.reacaoGasta,false,'Reação renova só na rodada seguinte');
turno=alterarEnergia(turno,999);
igual(turno.estatisticas.energiaAtual,1124,'Energia não possui teto');
turno=receberDano(turno,10000);
igual(turno.estatisticas.hpAtual,0,'HP mínimo zero');
turno=curarHP(turno,10000);
igual(turno.estatisticas.hpAtual,139,'Cura limitada ao HP máximo');
turno.estatisticas.bonusCaTemporario=9;
turno.estatisticas.penalidadeCaTemporaria=2;
igual(caEfetiva(turno.estatisticas),10,'CA temporária +/-2 e base imutável');
igual(acertouCA(12,12),true,'Ataque >= CA');
igual(acertouCA(11,12),false,'Ataque menor CA');
igual(formulaDano(2,8,10,true),'3d8+10','Crítico só adiciona um dado');
igual(iniciativasChefe(6),3,'Chefe com 6 jogadores');
let boss=criarEstadoTurno('boss',ficha);
boss=iniciarRodada(boss,1);
boss=aplicarAtordoamentoC02(boss,true);
boss=iniciarAtivacao(boss,true);
igual(boss.acaoPrincipalGasta,true,'C02 retira ação principal do chefe');
igual(boss.buffRapidoGasto,true,'C02 retira buff do chefe');
boss=resolverEscapeC02(boss,false);
boss=iniciarAtivacao(boss,true);
igual(boss.acaoPrincipalGasta,false,'Chefe perde máximo uma ativação por rodada');
boss=iniciarRodada(boss,2);
boss=iniciarAtivacao(boss,true);
igual(boss.acaoPrincipalGasta,true,'Segunda ativação C02 em rodada seguinte');
boss=resolverEscapeC02(boss,false);
igual(boss.atordoamento.ativo,false,'C02 encerra após duas ativações');
boss=aplicarAtordoamentoC02(boss,true);
igual(boss.atordoamento.ativo,false,'Imunidade temporária C02');
boss=iniciarRodada(boss,3);
boss=aplicarAtordoamentoC02(boss,true);
igual(boss.atordoamento.ativo,false,'Ainda imune até fim da rodada seguinte');
boss=iniciarRodada(boss,4);
boss=aplicarAtordoamentoC02(boss,true);
igual(boss.atordoamento.ativo,true,'C02 pode reaplicar após imunidade');
console.log(`OK — ${count} verificações da integração Ímpeto/Avatar`);
