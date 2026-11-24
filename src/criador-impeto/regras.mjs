// Ímpeto RPG 1.0 — configuração introdutória do Livro Único M04.1, capítulos 2 e 5.
// As tabelas são candidatas de playtest. Este contrato é independente do Avatar A01.
export const FORMATO = 'impeto-rpg-ficha-universal-v1';
export const ATRIBUTOS = ['Força','Agilidade','Destreza','Vigor','Intelecto','Percepção','Vontade','Presença'];
export const GRUPOS = {
  'Físicas':['Atletismo','Acrobacia','Furtividade','Precisão Manual'],
  'Exploração':['Atenção','Investigação','Sobrevivência','Condução'],
  'Conhecimento':['Conhecimento','Engenharia','Medicina'],
  'Sociais':['Persuasão','Enganação','Intimidação','Empatia','Liderança']
};
export const PERICIAS = Object.values(GRUPOS).flat();
export const TALENTOS = {
  'Ofensivo': {
    'Abertura Tática':'1/combate, após acertar: +1 ao próximo ataque de um aliado contra o alvo.',
    'Correção de Golpe':'1/combate, repita um d20 de ataque que errou e aceite o novo resultado.',
    'Domínio Corporal':'1/cena, repita um teste malsucedido de Atletismo ou Acrobacia em manobra apropriada.'
  },
  'Defensor': {
    'Interposição':'1/combate, use sua reação antes de um ataque para se tornar o alvo no lugar de um aliado ao alcance.',
    'Absorção Instintiva':'1/combate, use sua reação para reduzir o dano de um impacto em 1d8, mínimo zero.',
    'Sentinela':'1/cena, repita um teste de Atenção ou Sobrevivência para identificar perigos.'
  },
  'Controlador': {
    'Janela de Oportunidade':'1/combate, ao aplicar condição negativa: +1 ao próximo ataque de outro aliado contra o alvo.',
    'Pressão Residual':'1/combate, quando inimigo resiste ou escapa do controle: impeça uma reação até o fim do próximo turno dele, se for possível afetá-lo.',
    'Leitura de Terreno':'1/cena, repita Atenção ou Investigação ao analisar rotas e obstáculos.'
  },
  'Suporte': {
    'Fluxo Eficiente':'1/combate, reduza em até 5 EN o custo de uma habilidade, mínimo 1 EN.',
    'Sustentação Técnica':'1/combate, prolongue por uma rodada um buff ou proteção própria, não controle severo, dano ou cura periódica.',
    'Análise Aplicada':'1/cena, repita um teste malsucedido de Medicina, Engenharia ou Investigação em procedimento especializado.'
  }
};
export const VANTAGENS = {
  'Preparado para Imprevistos':'1/cena, revele uma ferramenta mundana simples e plausível.',
  'Memória Treinada':'1/cena, recorde fielmente informação testemunhada.',
  'Sangue-Frio':'1/cena, atenue pequena penalidade situacional de medo ou pressão.',
  'Raciocínio Aplicado':'Numa falha próxima fora de combate, obtenha proposta de avanço com complicação, a critério do mestre.',
  'Articulação Social':'Identifique uma objeção importante numa negociação, sem controlar o NPC.',
  'Engenhosidade':'Improvise solução de pequeno obstáculo material em tarefa técnica plausível.',
  'Conhecimento Cruzado':'Use um treinamento relacionado em um teste, sem somar duas perícias.',
  'Explorador Preparado':'Prepare uma precaução prática perante perigo previsível.'
};
export const PADRAO = Object.freeze({ baseAtributo:8,tetoAtributo:14,pa:28,pr:20,pt:4,pc:80,px:25,hp:40,en:30,ca:8,tetoCa:13,dadosAtaque:2,fixoAtaque:2,regen:0,ativas:5,passivas:1,exploracao:3,tetoAtiva:24,tetoPassiva:20,tetoPX:16,vantagens:1,talento:true,derivacao:true,especialista:true });
export const LIMITES = {baseAtributo:[8,20],tetoAtributo:[8,20],pa:[0,500],pr:[0,500],pt:[0,32],pc:[0,1000],px:[0,1000],hp:[1,9999],en:[0,9999],ca:[8,13],tetoCa:[8,13],dadosAtaque:[1,20],fixoAtaque:[0,100],regen:[0,100],ativas:[0,20],passivas:[0,20],exploracao:[0,20],tetoAtiva:[0,1000],tetoPassiva:[0,1000],tetoPX:[0,1000],vantagens:[0,8]};
export const EFEITOS = {'dano':'Dano','cura':'Cura','escudo':'Escudo de absorção','mitigacao':'Mitigação','empurrao':'Empurrão','imobilizacao':'Imobilização','atordoamento':'Atordoamento C02','buffCa1':'Buff +1 CA efetiva','buffCa2':'Buff +2 CA efetiva'};
export const CLASSES_PX = {pontual:4,especializada:8,complexa:12,ampla:18,extraordinaria:28};
export const DADOS = {4:3,6:4,8:5,10:6,12:7};
const CA = [0,1,3,6,10,15], ATAQUE=[0,5,13], REGEN=[0,3,9];
export const habilidade = (tipo) => ({nome:'',descricao:'',limites:'',gatilho:'',teste:'',efeito:tipo==='passiva'?'mitigacao':'dano',dado:8,quantidade:1,fixo:0,ativacao:'principal',alvos:1,distante:false,rodadasExtras:0,empurraoAdicional:false,impactos:1,usos:1,classe:'pontual',categoria:'',alvosPX:1,alcance:'proximo',duracao:'cena',automatica:false,custoAlternativo:''});
export function novaFicha(){
  return {formato:FORMATO,versao:1,config:{...PADRAO},nome:'',ambientacao:'',manifestacao:'',conceito:'',historia:'',objetivo:'',motivacoes:'',aprendizados:'',relacoes:'',desvantagens:'',equipamentos:'',foto:'',arquetipo:'',talento:'',vantagens:[],atributos:Object.fromEntries(ATRIBUTOS.map(n=>[n,8])),pericias:Object.fromEntries(PERICIAS.map(n=>[n,0])),recursos:{hp:0,en:0,ca:8,ataque:0,regen:0},derivacao:{tipo:'',atributo:'',justificativa:''},ataqueNome:'Ataque básico',ataqueDescricao:'',ativas:[],passivas:[],exploracao:[]};
}
const inteiro=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
const objeto=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=x=>typeof x==='string'&&x.length<=16000;
export function custoAtributo(valor,base=8){
  let n=0;
  for(let v=base+1;v<=valor;v++)n+=v<=12?1:v<=14?2:v<=16?3:v<=18?4:5;
  return n;
}
export const custoPA=f=>ATRIBUTOS.reduce((s,n)=>s+custoAtributo(f.atributos[n],f.config.baseAtributo),0);
export const custoPT=f=>PERICIAS.reduce((s,n)=>s+f.pericias[n],0);
export const custoPR=f=>f.recursos.hp+f.recursos.en+CA[f.recursos.ca-8]-CA[f.config.ca-8]+ATAQUE[f.recursos.ataque]+REGEN[f.recursos.regen];
export function derivacaoValida(f){
  const d=f.derivacao;
  return !d.tipo||(f.config.derivacao&&ATRIBUTOS.includes(d.atributo)&&f.atributos[d.atributo]>=12&&d.justificativa.trim().length>0);
}
export function recursosFinais(f){
  const c=f.config,r=f.recursos,d=derivacaoValida(f)&&c.derivacao?f.derivacao.tipo:'';
  return {hp:c.hp+3*r.hp+(d==='resistencia'?3:0),en:c.en+5*r.en+(d==='reserva'?5:0),ca:r.ca,dados:c.dadosAtaque+r.ataque,fixo:c.fixoAtaque+(d==='potencia'?1:0),regen:c.regen+r.regen};
}
function efeitoBase(h){
  const v=DADOS[h.dado]*h.quantidade+2*h.fixo;
  switch(h.efeito){
    case 'dano':return v+(h.empurraoAdicional?4:0);
    case 'cura':return 1.5*v;
    case 'escudo':return 1.25*v;
    case 'mitigacao':return 1.25*v*h.impactos;
    case 'empurrao':return 4;
    case 'imobilizacao':return 8;
    case 'atordoamento':return 19;
    case 'buffCa1':return 8;
    case 'buffCa2':return 16;
    default:return 0;
  }
}
export const custoAtiva=h=>Math.ceil(efeitoBase(h)*(1+0.5*(h.alvos-1))*(h.ativacao==='principal'?1:1.5)*(h.distante?1.25:1))+3*h.rodadasExtras;
export const custoPassiva=h=>Math.ceil(Math.ceil(efeitoBase({...h,empurraoAdicional:false,impactos:1}))*1.5*[0,1,1.8,2.5][h.usos]);
export const custoExploracao=h=>{
  const subtotal=CLASSES_PX[h.classe]+(h.alvosPX===6?4:h.alvosPX===2?2:0)+(h.alcance==='remoto'?6:h.alcance==='distante'?2:0)+(h.duracao==='dia'?8:h.duracao==='duasCenas'?4:0)+(h.automatica?0:3*(h.usos-1));
  return h.automatica?Math.ceil(subtotal*1.5):subtotal;
};
export function energiaAtiva(h){
  const pc=custoAtiva(h);
  if(h.efeito==='atordoamento'&&pc===19)return 12;
  if(h.ativacao==='reacao'&&h.alvos===1&&!h.distante&&!h.rodadasExtras&&h.dado===8){
    if(h.efeito==='escudo'&&h.quantidade===1&&h.fixo===2&&pc===17)return 12;
    if(h.efeito==='mitigacao'&&!h.fixo&&pc===19){
      if(h.quantidade===1&&h.impactos===2)return 12;
      if(h.quantidade===2&&h.impactos===1)return 15;
    }
  }
  return pc<4?null:pc<=7?3:pc<=14?6:pc<=22?10:pc<=30?15:pc<=40?21:pc<=55?28:pc<=70?36:null;
}
export function energiaExploracao(h){
  if(h.automatica)return 0;
  const px=custoExploracao(h);
  return px<=4?1:px<=8?2:px<=12?4:px<=18?6:px<=28?10:null;
}
export const totais=f=>({pa:custoPA(f),pr:custoPR(f),pt:custoPT(f),pc:f.ativas.reduce((s,h)=>s+custoAtiva(h),0)+f.passivas.reduce((s,h)=>s+custoPassiva(h),0),px:f.exploracao.reduce((s,h)=>s+custoExploracao(h),0)});
export function revisar(f){
  const c=f.config,t=totais(f),erros=[];
  if(!f.nome.trim())erros.push('Informe o nome do personagem.');
  for(const k of ['pa','pr','pt','pc','px'])if(t[k]>c[k])erros.push(k.toUpperCase()+': orçamento excedido.');
  if(c.baseAtributo>c.tetoAtributo||c.ca>c.tetoCa)erros.push('Confira as bases e os tetos da campanha.');
  if(ATRIBUTOS.some(n=>f.atributos[n]<c.baseAtributo||f.atributos[n]>c.tetoAtributo))erros.push('Atributo fora da escala escolhida.');
  if(f.recursos.ca<c.ca||f.recursos.ca>c.tetoCa)erros.push('CA Base fora da escala escolhida.');
  if(!c.especialista&&PERICIAS.some(n=>f.pericias[n]===2))erros.push('A campanha não permite Especialista na criação.');
  if(!derivacaoValida(f))erros.push('D01: escolha um atributo 12+, justifique e confira o módulo.');
  if(c.talento&&(!TALENTOS[f.arquetipo]||!TALENTOS[f.arquetipo][f.talento]))erros.push('Escolha arquétipo e talento T02.');
  if(f.vantagens.length>c.vantagens)erros.push('Quantidade de vantagens excedida.');
  if(f.ativas.length>c.ativas||f.passivas.length>c.passivas||f.exploracao.length>c.exploracao)erros.push('Quantidade de habilidades acima dos espaços.');
  for(const [lista,limite,custo,tipo] of [[f.ativas,c.tetoAtiva,custoAtiva,'Ativa'],[f.passivas,c.tetoPassiva,custoPassiva,'Passiva'],[f.exploracao,c.tetoPX,custoExploracao,'Exploração']]){
    lista.forEach((h,i)=>{
      const nome=h.nome.trim()||tipo+' '+(i+1);
      if(!h.nome.trim()||!h.descricao.trim())erros.push(nome+': informe nome e descrição.');
      if(custo(h)>limite)erros.push(nome+': teto individual excedido.');
      if(tipo==='Passiva'&&!h.gatilho.trim())erros.push(nome+': registre o gatilho.');
      if(tipo==='Ativa'){
        if(h.ativacao==='buff'&&!h.efeito.startsWith('buffCa'))erros.push(nome+': buff rápido exige efeito de fortalecimento compatível.');
        if(h.ativacao==='reacao'&&(!['escudo','mitigacao','buffCa1','buffCa2'].includes(h.efeito)||!h.gatilho.trim()))erros.push(nome+': reação protetora exige efeito compatível e gatilho.');
        if(h.rodadasExtras&&['dano','cura','atordoamento','mitigacao','empurrao'].includes(h.efeito))erros.push(nome+': duração adicional exige revisão especial para este efeito.');
        if(h.efeito==='atordoamento'&&!h.teste.trim())erros.push(nome+': defina defesa inicial e escape C02.');
        if(energiaAtiva(h)===null&&!h.custoAlternativo.trim())erros.push(nome+': custo de uso requer avaliação do mestre.');
      }
      if(tipo==='Exploração'&&energiaExploracao(h)===null&&!h.custoAlternativo.trim())erros.push(nome+': custo de uso requer avaliação do mestre.');
    });
  }
  return erros;
}
// A importação aceita apenas o novo formato e valida a estrutura antes de alterar o rascunho.
export function importar(raw){
  if(!objeto(raw)||raw.formato!==FORMATO||raw.versao!==1)throw Error('Selecione um JSON do Criador Ímpeto universal. Fichas Avatar continuam no criador próprio.');
  const f=novaFicha();
  for(const k of Object.keys(f).filter(k=>typeof f[k]==='string'&&k!=='formato')){
    if(!str(raw[k])&&k!=='foto')throw Error('Campo inválido: '+k);
    if(k==='foto'&&!(typeof raw.foto==='string'&&(raw.foto===''||(/^data:image\/(png|jpeg|webp);base64,/i.test(raw.foto)&&raw.foto.length<2000000))))throw Error('Retrato inválido.');
    f[k]=raw[k];
  }
  if(!objeto(raw.config))throw Error('Configuração ausente.');
  for(const [k,[min,max]] of Object.entries(LIMITES)){
    if(!inteiro(raw.config[k],min,max))throw Error('Configuração inválida: '+k);
    f.config[k]=raw.config[k];
  }
  for(const k of ['talento','derivacao','especialista']){
    if(typeof raw.config[k]!=='boolean')throw Error('Módulo inválido: '+k);
    f.config[k]=raw.config[k];
  }
  for(const [k,nomes,min,max] of [['atributos',ATRIBUTOS,1,20],['pericias',PERICIAS,0,2]]){
    if(!objeto(raw[k])||!nomes.every(n=>inteiro(raw[k][n],min,max)))throw Error(k+' inválidos.');
    f[k]=Object.fromEntries(nomes.map(n=>[n,raw[k][n]]));
  }
  if(!objeto(raw.recursos))throw Error('Recursos ausentes.');
  for(const [k,min,max] of [['hp',0,500],['en',0,500],['ca',8,13],['ataque',0,2],['regen',0,2]]){
    if(!inteiro(raw.recursos[k],min,max))throw Error('Recurso inválido: '+k);
    f.recursos[k]=raw.recursos[k];
  }
  if(!objeto(raw.derivacao)||!['','resistencia','reserva','potencia'].includes(raw.derivacao.tipo)||!['',...ATRIBUTOS].includes(raw.derivacao.atributo)||!str(raw.derivacao.justificativa))throw Error('Derivação inválida.');
  f.derivacao={tipo:raw.derivacao.tipo,atributo:raw.derivacao.atributo,justificativa:raw.derivacao.justificativa};
  if(!['',...Object.keys(TALENTOS)].includes(f.arquetipo)||!['',...Object.values(TALENTOS).flatMap(Object.keys)].includes(f.talento))throw Error('Arquétipo/talento inválido.');
  if(!Array.isArray(raw.vantagens)||raw.vantagens.length>8||!raw.vantagens.every(v=>Object.hasOwn(VANTAGENS,v))||new Set(raw.vantagens).size!==raw.vantagens.length)throw Error('Vantagens inválidas.');
  f.vantagens=raw.vantagens.slice();
  for(const k of ['ativas','passivas','exploracao']){
    if(!Array.isArray(raw[k])||raw[k].length>20)throw Error('Lista inválida: '+k);
    f[k]=raw[k].map(h=>{
      if(!objeto(h))throw Error('Habilidade inválida.');
      const out=habilidade(k==='passivas'?'passiva':'ativa');
      for(const [key,v] of Object.entries(out)){
        if(typeof v==='string'&&!str(h[key]))throw Error('Habilidade: '+key);
        if(typeof v==='boolean'&&typeof h[key]!=='boolean')throw Error('Habilidade: '+key);
        if(typeof v==='number'&&!Number.isInteger(h[key]))throw Error('Habilidade: '+key);
        out[key]=h[key];
      }
      if(!Object.hasOwn(EFEITOS,out.efeito)||!Object.hasOwn(DADOS,out.dado)||!Object.hasOwn(CLASSES_PX,out.classe)||!inteiro(out.quantidade,1,20)||!inteiro(out.fixo,0,100)||!inteiro(out.alvos,1,4)||!inteiro(out.impactos,1,2)||!inteiro(out.usos,1,3)||!inteiro(out.rodadasExtras,0,20)||![1,2,6].includes(out.alvosPX)||!['principal','buff','reacao'].includes(out.ativacao)||!['proximo','distante','remoto'].includes(out.alcance)||!['cena','duasCenas','dia'].includes(out.duracao)||(k==='passivas'&&!['dano','escudo','mitigacao'].includes(out.efeito)))throw Error('Parâmetros de habilidade inválidos.');
      return out;
    });
  }
  return f;
}
