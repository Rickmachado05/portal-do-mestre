/** Projeção do Criador universal para os campos de jogo já usados no Portal.
 * O JSON original é a fonte de verdade; nunca é reprecificado como Avatar A01.
 */
import {FORMATO,importar,revisar,recursosFinais,custoAtiva,custoPassiva,custoExploracao,energiaAtiva,energiaExploracao,EFEITOS,TALENTOS,VANTAGENS} from '../criador-impeto/regras.mjs';
export const reconhecerUniversal=x=>!!x&&typeof x==='object'&&x.formato===FORMATO;
const formula=h=>['dano','cura','escudo','mitigacao'].includes(h.efeito)?h.quantidade+'d'+h.dado+(h.fixo?'+'+h.fixo:''):'';
const categoria=h=>({dano:'ofensiva',cura:'cura',escudo:'defesa',mitigacao:'defesa',empurrao:'controle',imobilizacao:'controle',atordoamento:'controle',buffCa1:'buff',buffCa2:'buff'}[h.efeito]||'utilidade');
const tipo=h=>({ofensiva:'Ofensiva',cura:'Cura',defesa:'Defesa',controle:'Controle',buff:'Buff',utilidade:'Utilidade'}[categoria(h)]);
const restricoes=h=>[h.gatilho&&'Gatilho: '+h.gatilho,h.teste&&'Resolução: '+h.teste,h.limites,h.custoAlternativo&&'Custo acordado: '+h.custoAlternativo].filter(Boolean).join(' · ');
function custoUso(h,automatico,custo){
 if(automatico)return {custo:0,enIndefinida:false};
 if(h.custoAlternativo.trim()){
  const m=h.custoAlternativo.trim().match(/^(\d+)\s*EN$/i);
  if(m&&Number.isSafeInteger(Number(m[1])))return {custo:Number(m[1]),enIndefinida:false};
  return {enIndefinida:true};
 }
 return custo===null?{enIndefinida:true}:{custo,enIndefinida:false};
}
export function acoesUniversais(ficha){
 const f=importar(ficha.impeto.origem),e=recursosFinais(f);
 return [
  {id:'ataque',titulo:f.ataqueNome||'Ataque básico',tipo:'Ataque básico',categoria:'basico',descricao:f.ataqueDescricao,valor:e.dados+'d6+'+e.fixo,custo:0,fonte:'universal',ativacao:'principal',exigeCA:true,icone:ficha.basicIcon},
  ...f.ativas.map((h,i)=>({id:'skill-'+i,titulo:h.nome||'Habilidade '+(i+1),tipo:tipo(h),categoria:categoria(h),descricao:h.descricao,restricoes:restricoes(h),valor:formula(h)||EFEITOS[h.efeito],...custoUso(h,false,energiaAtiva(h)),pc:custoAtiva(h),fonte:'universal',ativacao:h.ativacao,exigeCA:['dano','empurrao','imobilizacao'].includes(h.efeito),alvos:h.alvos,gatilho:h.gatilho,icone:ficha.skills?.[i]?.icon})),
  ...f.passivas.map((h,i)=>({id:i?'passiva-'+i:'passiva',titulo:h.nome||'Passiva '+(i+1),tipo:'Passiva',categoria:'passiva',descricao:h.descricao,restricoes:[restricoes(h),h.usos+' uso(s)/combate'].filter(Boolean).join(' · '),valor:formula(h),pc:custoPassiva(h),fonte:'universal',ativacao:'passiva',icone:i?undefined:ficha.passiveIcon})),
  ...f.exploracao.map((h,i)=>({id:'exploracao-'+i,titulo:h.nome||'Exploração '+(i+1),tipo:'Exploração · '+h.classe,categoria:'utilidade',descricao:h.descricao,restricoes:[restricoes(h),h.automatica?'Automática 1 vez/cena':h.usos+' uso(s)/cena',h.alcance,h.duracao].filter(Boolean).join(' · '),...custoUso(h,h.automatica,energiaExploracao(h)),px:custoExploracao(h),fonte:'universal',ativacao:'exploracao',alvos:h.alvosPX,gatilho:h.gatilho}))
 ];
}
export function converterUniversal(raw){
 const f=importar(raw),e=recursosFinais(f),avisos=revisar(f);
 if(!f.nome.trim())throw Error('Informe o nome do personagem.');
 if(Object.values(e).some(n=>!Number.isSafeInteger(n)||n<0)||e.hp<1)throw Error('Recursos fora da precisão numérica.');
 const impeto={contrato:1,sistema:'impeto',escala:'universal-v1',nome:f.nome.trim(),foto:f.foto,historia:f.historia,elemento:'neutro',atributos:f.atributos,pericias:f.pericias,recursosPR:{hp:f.recursos.hp,energia:f.recursos.en,ca:f.recursos.ca,ataqueDados:f.recursos.ataque,regeneracao:f.recursos.regen},arquetipo:f.config.talento?f.arquetipo:'',talento:f.config.talento?f.talento:'',vantagem:f.vantagens.join(' · '),derivacao:f.config.derivacao?f.derivacao:{tipo:'',atributo:'',justificativa:''},ataqueBasico:{nome:f.ataqueNome,descricao:f.ataqueDescricao},ativas:f.ativas,passiva:f.passivas[0]||{nome:'',efeito:'nenhum',dado:4,quantidade:1,fixo:0,usos:1,gatilho:'',descricao:'',limites:''},exploracao:f.exploracao.map(h=>({...h,alvos:h.alvosPX})),estatisticas:{hpMax:e.hp,hpAtual:e.hp,energiaReferencia:e.en,energiaAtual:e.en,caBase:e.ca,regeneracao:e.regen,ataqueBasicoDados:e.dados,ataqueBasicoFixo:e.fixo,bonusCaTemporario:0,penalidadeCaTemporaria:0},requerRevisao:avisos.length>0,avisos,origem:f};
 const acoes=acoesUniversais({impeto});
 return {sistemaId:'impeto',name:impeto.nome,element:f.manifestacao||'Universal',class:impeto.arquetipo||'Ímpeto',hpMax:e.hp,hpCurrent:e.hp,manaMax:e.en,manaCurrent:e.en,ca:e.ca,photo:f.foto,story:f.historia,objetivo:f.objetivo,regen:String(e.regen),basicName:f.ataqueNome||'Ataque básico',basicDamage:e.dados+'d6+'+e.fixo,basicDescription:f.ataqueDescricao,skills:acoes.filter(a=>a.id.startsWith('skill-')).map(a=>({name:a.titulo,type:a.tipo,cost:a.custo??0,damage:a.valor,effect:a.descricao,limits:a.restricoes})),passiveName:f.passivas.map(h=>h.nome).filter(Boolean).join(' · '),passiveEffect:f.passivas.map(h=>h.nome+': '+h.descricao).join('\n'),impeto};
}
export function descricaoEscolhasUniversal(ficha){
 const f=importar(ficha.origem);
 return {config:f.config,talento:f.config.talento?(TALENTOS[f.arquetipo]?.[f.talento]||''):'',vantagens:f.vantagens.map(nome=>({nome,descricao:VANTAGENS[nome]})),conceito:f.conceito,manifestacao:f.manifestacao,ambientacao:f.ambientacao,equipamentos:f.equipamentos};
}
