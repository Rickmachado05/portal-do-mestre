/**
 * Portal do Mestre — multiplayer fase 8: Mesa 2D do jogador, chat unificado e publicação filtrada.
 * Servidor HTTP/SSE + WebSocket de leitura sem dependências externas. Histórico de chat só em memória.
 * A exposição pela internet exige a pasta dist compilada e autenticação por convite.
 */
import http from 'node:http';
import { randomBytes, randomUUID, randomInt, timingSafeEqual, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarPersistenciaSalas } from './multiplayer-persistencia.mjs';
import { aceitarWebSocket, recusarWebSocket } from './multiplayer-websocket.mjs';
import { servirSite } from './multiplayer-static.mjs';

const PREFIXO = '/api/multiplayer';
// Publicação estática: aceitar apenas a origem Vercel explicitamente autorizada no PC do mestre.
const origensPermitidas=()=>new Set((process.env.PORTAL_ORIGENS_VERCEL||'').split(',').map(x=>x.trim()).filter(Boolean));
const origemSegura=(origem,host)=>{
  if(!origem)return true; // CLI e cliente nativo sem cabeçalho Origin
  try{
    const url=new URL(origem);
    return (url.protocol==='https:'||url.protocol==='http:')&&
      (url.host===host||origensPermitidas().has(url.origin));
  }catch{return false;}
};

const LIMITE_SALAS = 20;
const LIMITE_CONVIDADOS = 12;
const LIMITE_BODY = 4096;
const LIMITE_FICHAS = 160_000; // só recursos e habilidades de combate, sem anexos
const LIMITE_HISTORICO = 80;
const LIMITE_CHAT = 200;
// Impede que uma aba suspensa acumule indefinidamente quadros SSE da mesa.
// Ao voltar, o EventSource reconecta e recebe o estado autorizado mais recente.
const LIMITE_FILA_SSE = 8 * 1024 * 1024;
const LIMITE_TEXTO_CHAT = 1200;
const INTERVALO_CHAT_MS = 400;
const INTERVALO_DESENHO_MS=300;
const LIMITE_DESENHOS_JOGADOR=100;


const LIMITE_INVENTARIOS = 2_500_000;
const LIMITE_DIARIO = 8_000_000; // páginas compartilhadas apenas; nenhuma anotação privada
const LIMITE_PAGINA_PERSONAGEM = 700_000;
const LIMITE_ENTREGAS_DIARIO = 80;
const LIMITE_PENDENCIA_ITEM_MS = 5 * 60_000; // tempo para o mestre avaliar; não aprovar automaticamente
const INTERVALO_ROLAGEM_MS = 350;
const LIMITE_ROLAGEM_JSON = 950_000;
const LIMITE_VIDEO_BYTES = 5_000_000;
const LIMITE_VIDEOS = 8; // até 40 MB por sala para capturas recentes
const DURACAO_DADOS_AO_VIVO_MS = 35_000;
const LIMITE_SINAL_DADOS = 16_000; // SDP/ICE transitórios; nunca armazenar vídeo no servidor
async function lerVideo(req){
 const partes=[];let total=0;
 for await(const parte of req){
  total+=parte.length;if(total>LIMITE_VIDEO_BYTES)throw Error('Vídeo maior que 5 MB.');
  partes.push(parte);
 }
 if(total<100)throw Error('Vídeo vazio.');
 return Buffer.concat(partes);
}
 // Arte otimizada do dado, não a biblioteca do participante.
const LIMITE_GLB_3D = 35_000_000; // O GLB só pode ser enviado pelo mestre; sem URLs externas.
const LIMITE_GLB_SALA = 110_000_000;
const LIMITE_GIF_ANIMADO = 3_000_000; // GIF separado da publicação da cena: download autenticado e cacheado
const LIMITE_GIFS_SALA = 36_000_000;
const LIMITE_AUDIO_SESSAO = 45_000_000; // áudio de uso temporário, não incorpora MP3 ao backup da campanha
const LIMITE_MESA = 2_500_000; // mapa convertido para WebP/JPEG pequeno; nunca enviar anexos da campanha
const CODIGOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const padrao = (v, max) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const tokenAleatorio = () => randomBytes(32).toString('base64url');
const igualToken = (a,b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
};
const codigoAleatorio = () => Array.from(randomBytes(8), byte=>CODIGOS[byte % CODIGOS.length]).join('');

function enviar(res,status,valor){
  if (res.writableEnded) return;
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(valor));
}
const erro = (res,status,mensagem) => enviar(res,status,{erro:mensagem});
async function lerJson(req,limite=LIMITE_BODY){
  const partes=[];let total=0;
  for await (const parte of req){ total+=parte.length;if(total>limite)throw new Error('Requisição muito grande.');partes.push(parte); }
  try {return JSON.parse(Buffer.concat(partes).toString('utf8'));}catch{throw new Error('JSON inválido.');}
}
// Nunca aceitar o objeto inteiro da cena: apenas campos ambientais exibíveis.
function normalizarAmbiente(entrada,visibilidade){
  if(visibilidade==='restrita'||!entrada||typeof entrada!=='object'||Array.isArray(entrada))return undefined;
  const climaOrigem=entrada.clima||{};
  const clima={
    tipo:['nenhum','chuva','neve','neblina','cinzas','areia','folhas'].includes(climaOrigem.tipo)?climaOrigem.tipo:'nenhum',
    intensidade:Number.isFinite(climaOrigem.intensidade)?Math.max(0,Math.min(100,Math.round(climaOrigem.intensidade))):45,
    vento:Number.isFinite(climaOrigem.vento)?Math.max(0,Math.min(100,Math.round(climaOrigem.vento))):35,
    direcao:Number.isFinite(climaOrigem.direcao)?Math.max(0,Math.min(359,Math.round(climaOrigem.direcao))):0,
  };
  // Na visão individual, apenas clima é permitido; qualquer outra geometria
  // é segredo e deve ser incorporada aos pixels censurados no computador mestre.
  if(visibilidade==='individual')return {clima};
  const iluminacao={ativa:entrada.iluminacao?.ativa===true,
    ambiente:Number.isFinite(entrada.iluminacao?.ambiente)?Math.max(0,Math.min(100,entrada.iluminacao.ambiente)):40};
  const ponto=valor=>Number.isFinite(valor?.x)&&Number.isFinite(valor?.y)&&valor.x>=0&&valor.x<=100&&valor.y>=0&&valor.y<=100;
  const cor=valor=>typeof valor==='string'&&/^#[0-9a-f]{6}$/i.test(valor)?valor:'#f1bb78';
  const luzes=(Array.isArray(entrada.luzes)?entrada.luzes:[]).slice(0,45).flatMap(l=>ponto(l)?[{
    x:l.x,y:l.y,cor:cor(l.cor),alcance:Number.isFinite(l.alcance)?Math.max(2,Math.min(70,l.alcance)):17,ativa:l.ativa===true,
    // Formato autorizado em cenas totais: silhueta da LUZ, nunca linhas de paredes.
    ...(Array.isArray(l.pontos)&&l.pontos.length>=3&&l.pontos.length<=300&&l.pontos.every(ponto)
      ?{pontos:l.pontos.map(p=>({x:p.x,y:p.y}))}:{})}]:[]);
  const marcadores=(Array.isArray(entrada.marcadores)?entrada.marcadores:[]).slice(0,100).flatMap(m=>ponto(m)?[{
    id:padrao(m.id,100),texto:padrao(m.texto,90),x:m.x,y:m.y}]:[]);
  const desenhos=(Array.isArray(entrada.desenhos)?entrada.desenhos:[]).slice(0,80).flatMap(d=>{
    if(!d||typeof d!=='object'||!Array.isArray(d.pontos))return [];
    const pontos=d.pontos.slice(0,151).filter(ponto).map(p=>({x:p.x,y:p.y}));
    return pontos.length?[{id:padrao(d.id,100),pontos,cor:cor(d.cor),
      espessura:Number.isFinite(d.espessura)?Math.max(.5,Math.min(16,d.espessura)):3}]:[];
  });
  return {clima,iluminacao,luzes,marcadores,desenhos};
}

/** Revalidar a projeção de cena 3D no servidor, rejeitando campos privados. */
function normalizarCenario3D(entrada,modelos,idsVisiveis){
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))return undefined;
  const num=(v,p,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):p;
  const piso=['madeira','pedra','grama','imagem'].includes(entrada.piso)?entrada.piso:'madeira';
  const base=entrada.base==='arquivos'?'arquivos':'vazia';
  const opcoes=['parede','porta','mesa','estante','caixa','barril','coluna','tapete','luz','cadeira','balcao','vaso'];
  const ids=new Set();
  const objetos=(Array.isArray(entrada.objetos)?entrada.objetos:[]).slice(0,160).flatMap(o=>{
    if(!o||typeof o!=='object'||o.oculto===true||!opcoes.includes(o.tipo))return [];
    const id=padrao(o.id,100);if(!id||ids.has(id))return [];ids.add(id);
    const obj={id,tipo:o.tipo,nome:padrao(o.nome,65),x:num(o.x,0,-60,60),z:num(o.z,0,-60,60),rotacao:num(o.rotacao,0,-Math.PI*2,Math.PI*2)};
    if(o.estilo==='pixel')obj.estilo='pixel';
    for(const campo of ['comprimento','largura','profundidade','altura'])if(Number.isFinite(o[campo]))obj[campo]=num(o[campo],1,.1,120);
    return [obj];
  });
  const idsMini=new Set(),vinculosMini=new Set();
  const miniaturas=(Array.isArray(entrada.miniaturas)?entrada.miniaturas:[]).slice(0,40).flatMap(m=>{
    if(!m||typeof m!=='object'||m.oculto===true)return [];
    const id=padrao(m.id,100),modeloId=padrao(m.modeloId,100);
    if(!/^inst-[\w-]{6,90}$/.test(id)||!/^mini-[\w-]{6,90}$/.test(modeloId)||idsMini.has(id)||!modelos.has(modeloId))return [];
    if(m.personagemId&&(!idsVisiveis.has(m.personagemId)||vinculosMini.has(m.personagemId)))return [];
    idsMini.add(id);if(m.personagemId)vinculosMini.add(m.personagemId);
    return [{id,modeloId,nome:padrao(m.nome,70),x:num(m.x,0,-60,60),z:num(m.z,0,-60,60),
      altura:num(m.altura,0,0,25),escala:num(m.escala,1,.1,8),rotacao:num(m.rotacao,0,-Math.PI*2,Math.PI*2),
      ...(m.personagemId?{personagemId:m.personagemId}:{}),
      animacaoModo:['automatico','clip','desligado'].includes(m.animacaoModo)?m.animacaoModo:'automatico',
      animacaoIndice:num(m.animacaoIndice,0,0,127),animacaoVelocidade:num(m.animacaoVelocidade,1,.25,2)}];
  });
  return {versao:1,base,piso,objetos,miniaturas,
    mapaUnico:entrada.mapaUnico===true,larguraTerreno:num(entrada.larguraTerreno,18,4,120),
    profundidadeTerreno:num(entrada.profundidadeTerreno,17,4,120),
    larguraPlanta:num(entrada.larguraPlanta,18,4,120),profundidadePlanta:num(entrada.profundidadePlanta,17,4,120),
    ajusteLivrePlanta:entrada.ajusteLivrePlanta===true,aspectoPlanta:num(entrada.aspectoPlanta,1,.05,20),
    periodoDia:['dia','entardecer','noite'].includes(entrada.periodoDia)?entrada.periodoDia:'dia',
    ajusteMapa:entrada.ajusteMapa==='cobrir'?'cobrir':'conter',escalaMapa:num(entrada.escalaMapa,1,.5,2),
    deslocamentoMapaX:num(entrada.deslocamentoMapaX,0,-.5,.5),deslocamentoMapaZ:num(entrada.deslocamentoMapaZ,0,-.5,.5),
    opacidadePlanta:num(entrada.opacidadePlanta,1,.15,1),mostrarGrade:entrada.mostrarGrade===true,
    encaixarGrade:entrada.encaixarGrade===true,passoGrade:[.25,.5,1].includes(entrada.passoGrade)?entrada.passoGrade:.5};
}

// Somente campos explicitamente públicos deixam a máquina do mestre.
// O servidor recebe apenas projeções específicas autorizadas; nunca recebe o backup integral nem o Caderno do Mestre.
function normalizarMesa(entrada,midias=new Map(),modelos3D=new Map()){
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new Error('Estado de mesa inválido.');
  const cenaId=padrao(entrada.cenaId,100);
  if (!cenaId) throw new Error('Informe a cena.');
  const visibilidade=entrada.visibilidade==='total'?'total':entrada.visibilidade==='individual'?'individual':'restrita';
  const modoMesa=entrada.modoMesa==='3d'?'3d':'2d';
  const permitirDesenhoJogadores=entrada.permitirDesenhoJogadores!==false;
  const escalaMapa=Number.isFinite(entrada.escalaMapa)?Math.max(1,Math.min(5,entrada.escalaMapa)):1;
  const aspecto=typeof entrada.aspecto==='number'&&Number.isFinite(entrada.aspecto)&&entrada.aspecto>=.3&&entrada.aspecto<=4?Math.round(entrada.aspecto*1_000_000)/1_000_000:1.6;
  const imagem=visibilidade==='total' && typeof entrada.imagem==='string' &&
    /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(entrada.imagem) && entrada.imagem.length<=2_000_000
    ? entrada.imagem : null;
  const tokens=(Array.isArray(entrada.tokens)?entrada.tokens:[]).slice(0,60).flatMap(token=>{
    if(!token || typeof token!=='object' || token.oculto ||
       !['jogador','npc','inimigo'].includes(token.tipo) ||
       (token.tipo!=='jogador' && token.publicado!==true)) return [];
    const x=Number(token.x),y=Number(token.y);
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>100||y<0||y>100)return [];
    const id=padrao(token.id,120),nome=padrao(token.nome,75);
    if(!id||!nome)return [];
    const cor=typeof token.cor==='string' && /^#[0-9a-f]{6}$/i.test(token.cor)?token.cor:'#c6ab79';
    const imagemToken=typeof token.imagem==='string'&&token.imagem.length<=50_000&&/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(token.imagem)?token.imagem:undefined;
    const animacao=typeof token.animacao==='string'&&/^[a-f0-9]{32}$/.test(token.animacao)&&midias.has(token.animacao)?token.animacao:undefined;
    // Somente campos de apresentação com limites estritos. A aplicação nunca
    // envia skins completas, imagens originais ou dados privados da campanha.
    const limite=(valor,min,max,padrao)=>typeof valor==='number'&&Number.isFinite(valor)?Math.max(min,Math.min(max,valor)):padrao;
    const corValida=valor=>typeof valor==='string'&&/^#[0-9a-f]{6}$/i.test(valor);
    const quadro=token.enquadramento;
    const enquadramento=quadro&&typeof quadro==='object'&&!Array.isArray(quadro)?{
      x:limite(quadro.x,-100,100,0),y:limite(quadro.y,-100,100,0),zoom:limite(quadro.zoom,.6,3,1),
    }:{x:0,y:0,zoom:1};
    const fundo=token.fundo==='transparent'?'transparent':corValida(token.fundo)?token.fundo:'#22252d';
    const tamanho=limite(token.tamanho,18,300,70);
    const rotacao=limite(token.rotacao,-36000,36000,0)%360;
    const idleVelocidade=[0.5,1,1.5,2].includes(token.idleVelocidade)?token.idleVelocidade:1;
    return [{id,nome,x,y,cor,tipo:token.tipo,travado:token.travado===true,
      topview:token.topview===true,tamanho,largura3D:limite(token.largura3D,40,300,100),altura3D:limite(token.altura3D,40,300,100),rotacao,espelhadoX:token.espelhadoX===true,
      ocultarNome:token.ocultarNome===true,fundo,enquadramento,
      idlePausado:token.idlePausado===true,idleVelocidade,
      ...(imagemToken?{imagem:imagemToken}:{}),...(animacao?{animacao}:{})}];
  });
  // Recortes visuais JÁ CENSURADOS no computador do mestre. Não reter a
  // imagem original em cenas individuais. O ID do convidado nunca é aceito
  // como parâmetro de consulta: o servidor usa a atribuição autenticada.
  const vistos=new Set();
  const vistas=visibilidade==='individual'?(Array.isArray(entrada.vistas)?entrada.vistas:[]).slice(0,24).flatMap(v=>{
    if(!v||typeof v!=='object'||Array.isArray(v))return [];
    const personagemId=padrao(v.personagemId,120);
    if(!personagemId||vistos.has(personagemId)||!tokens.some(t=>t.id===personagemId&&t.tipo==='jogador'))return [];
    vistos.add(personagemId);
    const imagemFiltrada=typeof v.imagem==='string'&&v.imagem.length<=320_000&&
      /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v.imagem)?v.imagem:null;
    const idsPermitidos=new Set((Array.isArray(v.idsVisiveis)?v.idsVisiveis:[]).slice(0,60).filter(id=>typeof id==='string'));
    idsPermitidos.add(personagemId);
    const mascara3D=typeof v.mascara3D==='string'&&/^[012]{2304}$/.test(v.mascara3D)?v.mascara3D:null;
    // Contorno da linha de visão JÁ autorizada por personagem. Valores
    // normalizados; não publica barreiras, objetos ocultos ou geometria geral.
    const poligono3D=mascara3D&&Array.isArray(v.poligono3D)&&v.poligono3D.length>=3&&v.poligono3D.length<=512&&
      v.poligono3D.every(p=>p&&typeof p==='object'&&
        Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100)
      ?v.poligono3D.map(p=>({x:p.x,y:p.y})):undefined;
    const ids3D=(valor)=>[...new Set((Array.isArray(valor)?valor:[]).slice(0,180)
      .filter(id=>typeof id==='string'&&id.length<=100))];
    return [{personagemId,imagem:imagemFiltrada,tokens:tokens.filter(t=>idsPermitidos.has(t.id)),
      mascara3D,poligono3D,objetos3DVisiveis:ids3D(v.objetos3DVisiveis),miniaturas3DVisiveis:ids3D(v.miniaturas3DVisiveis)}];
  }):[];
  // Os retratos do grupo são dados públicos da equipe, não tokens visíveis:
  // não incluem posição, fichas, inventário, NPCs ou inimigos.
  const grupo=(Array.isArray(entrada.grupo)?entrada.grupo:[]).slice(0,24).flatMap(pessoa=>{
    if(!pessoa || typeof pessoa!=='object' || Array.isArray(pessoa) || pessoa.tipo!=='jogador')return [];
    const id=padrao(pessoa.id,120),nome=padrao(pessoa.nome,75);
    if(!id||!nome)return [];
    const cor=typeof pessoa.cor==='string'&&/^#[0-9a-f]{6}$/i.test(pessoa.cor)?pessoa.cor:'#c6ab79';
    const animacao=typeof pessoa.animacao==='string'&&/^[a-f0-9]{32}$/.test(pessoa.animacao)&&midias.has(pessoa.animacao)?pessoa.animacao:undefined;
    const mini=typeof pessoa.imagem==='string' && pessoa.imagem.length<=50_000 &&
      /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(pessoa.imagem)?pessoa.imagem:undefined;
    const quadro=pessoa.enquadramento;
    // Mesmo contrato de retrato usado no cliente: o convidado não pode perder
    // o modo, a largura ou a altura definidos na biblioteca / mesa do mestre.
    // Nunca repassar propriedades inesperadas recebidas pela API.
    const limite=(valor,min,max,padrao)=>typeof valor==='number'&&Number.isFinite(valor)
      ?Math.max(min,Math.min(max,valor)):padrao;
    const enquadramento=quadro && typeof quadro==='object' && !Array.isArray(quadro) ? {
      modo:quadro.modo==='preencher'||quadro.modo==='conter'?quadro.modo:'automatico',
      largura:limite(quadro.largura,40,250,100),
      altura:limite(quadro.altura,40,250,100),
      x:limite(quadro.x,-100,100,0),
      y:limite(quadro.y,-100,100,0),
      zoom:limite(quadro.zoom,.5,3,1),
    }:undefined;
    return [{id,nome,tipo:'jogador',cor,...(mini?{imagem:mini}:{}),...(animacao?{animacao}:{}),...(enquadramento?{enquadramento}:{})}];
  });
  const revisao=Number.isSafeInteger(entrada.revisao)&&entrada.revisao>=0?entrada.revisao:0;
  // Iniciativa de leitura: jamais confiar em nomes, HP ou efeitos enviados no campo combate.
  // O turno oculto não denuncia identidade para quem não o enxerga.
  const entradaCombate=entrada.combate&&typeof entrada.combate==='object'?entrada.combate:null;
  const idsToken=new Set(tokens.map(t=>t.id));
  const ordemCombate=Array.isArray(entradaCombate?.ordem)?[...new Set(entradaCombate.ordem.filter(id=>typeof id==='string'&&idsToken.has(id)))].slice(0,60):[];
  // Valores são publicados somente para participantes que possuem tokens autorizados.
  // Não retransmitir valores de IDs ocultos nem campos arbitrários do cliente.
  const entradaValores=entradaCombate?.valores&&typeof entradaCombate.valores==='object'&&!Array.isArray(entradaCombate.valores)
    ?entradaCombate.valores:null;
  const valores=entradaValores?Object.fromEntries(ordemCombate.flatMap(id=>
    Number.isSafeInteger(entradaValores[id])&&entradaValores[id]>=-1000&&entradaValores[id]<=1000
      ?[[id,entradaValores[id]]]:[])):undefined;
  const combate={ativo:entradaCombate?.ativo===true,rodada:Number.isSafeInteger(entradaCombate?.rodada)?Math.max(0,Math.min(9999,entradaCombate.rodada)):0,
    turnoId:typeof entradaCombate?.turnoId==='string'&&ordemCombate.includes(entradaCombate.turnoId)?entradaCombate.turnoId:null,
    ordem:ordemCombate,...(valores?{valores}:{})};
  const cenario3D=visibilidade!=='restrita'&&entrada.cenario3D
    ?normalizarCenario3D(entrada.cenario3D,modelos3D,new Set(tokens.map(t=>t.id))):undefined;
  return {cenaId,revisao,cenaNome:padrao(entrada.cenaNome,80)||'Cena',modoMesa,permitirDesenhoJogadores,visibilidade,aspecto,escalaMapa,imagem,tokens,grupo,vistas,combate,
    ...(cenario3D?{cenario3D}:{}),
    ...(normalizarAmbiente(entrada.ambiente,visibilidade)?{ambiente:normalizarAmbiente(entrada.ambiente,visibilidade)}:{})};
}

// O mestre envia uma projeção limitada, nunca o conteúdo integral da biblioteca.
// O servidor normaliza novamente para que campos extras não vazem pela API privada.
function normalizarFichas(entrada){
  if(!entrada || !Array.isArray(entrada.personagens) || entrada.personagens.length>100)
    throw new Error('Lista de fichas inválida.');
  const numeros=(obj,chave,max)=>{
    const numero=obj[chave];
    if(typeof numero!=='number'||!Number.isFinite(numero)||numero<0||numero>max)
      throw new Error(`Valor inválido na ficha: ${chave}.`);
    return Math.round(numero);
  };
  const nomesAtributos=['Força','Agilidade','Destreza','Vigor','Intelecto','Percepção','Vontade','Presença'];
  const nomesPericias=['Atletismo','Acrobacia','Furtividade','Precisão Manual','Atenção','Investigação',
    'Sobrevivência','Condução','Conhecimento','Engenharia','Medicina','Persuasão','Enganação','Intimidação','Empatia','Liderança'];
  const entre=(valor,min,max,campo)=>{
    if(!Number.isInteger(valor)||valor<min||valor>max)throw new Error(`Valor inválido: ${campo}.`);
    return valor;
  };
  function normalizarImpeto(i){
    if(!i || typeof i!=='object' || Array.isArray(i) || i.escala!=='avatar-a01')throw new Error('Contrato Ímpeto inválido.');
    const lista=(v,nomes,max,campo)=>{
      if(!Array.isArray(v)||v.length!==nomes.length)throw new Error(`${campo} incompletos.`);
      return nomes.map((nome,indice)=>{
        const e=v[indice];
        if(!e||e.nome!==nome)throw new Error(`Nome inválido em ${campo}.`);
        return {nome, [campo==='atributos'?'valor':'bonus']:entre(e[campo==='atributos'?'valor':'bonus'],0,max,campo)};
      });
    };
    const d=i.derivacao||{};const r=i.investimento||{};
    const tipo=['','resistencia','reserva','potencia'].includes(d.tipo)?d.tipo:'';
    return {
      escala:'avatar-a01',
      atributos:lista(i.atributos,nomesAtributos,99,'atributos'),
      pericias:lista(i.pericias,nomesPericias,4,'pericias'),
      arquetipo:padrao(i.arquetipo,65),talento:padrao(i.talento,65),vantagem:padrao(i.vantagem,65),
      derivacao:{tipo,atributo:nomesAtributos.includes(d.atributo)?d.atributo:'',justificativa:padrao(d.justificativa,240)},
      investimento:{hp:entre(r.hp,0,99,'PR HP'),energia:entre(r.energia,0,99,'PR EN'),
        ca:entre(r.ca,0,99,'PR CA'),ataqueDados:entre(r.ataqueDados,0,20,'PR ataque'),
        regeneracao:entre(r.regeneracao,0,20,'PR regeneração')},
    };
  }
  function normalizarCondicoes(v){
    if(!Array.isArray(v)||v.length>40)throw new Error('Efeitos inválidos.');
    return v.map(e=>{
      if(!e||typeof e!=='object'||Array.isArray(e))throw new Error('Efeito inválido.');
      const id=padrao(e.id,120),nome=padrao(e.nome,80);
      if(!id||!nome)throw new Error('Efeito sem identificação.');
      const tipo=['buff','debuff'].includes(e.tipo)?e.tipo:'condicao';
      return {id,nome,turnos:entre(e.turnos,0,99,'duração do efeito'),tipo,
        ...(e.origem?{origem:padrao(e.origem,75)}:{})};
    });
  }
  const categorias=new Set(['basico','ofensiva','buff','cura','controle','defesa','utilidade','passiva']);
  const resultado=new Map();
  for(const f of entrada.personagens){
    if(!f || typeof f!=='object' || Array.isArray(f))throw new Error('Ficha inválida.');
    const id=padrao(f.id,120),nome=padrao(f.nome,80);
    if(!id||!nome||resultado.has(id))throw new Error('Personagem duplicado ou inválido.');
    if(!Array.isArray(f.acoes)||f.acoes.length>12)throw new Error('Habilidades inválidas.');
    const acoes=f.acoes.map(a=>{
      if(!a || typeof a!=='object'||Array.isArray(a))throw new Error('Habilidade inválida.');
      const categoria=padrao(a.categoria,25);
      if(!categorias.has(categoria))throw new Error('Categoria de habilidade inválida.');
      const acao={id:padrao(a.id,60),nome:padrao(a.nome,85),tipo:padrao(a.tipo,45),categoria};
      if(!acao.id||!acao.nome)throw new Error('Habilidade sem identificação.');
      if(a.custo!==undefined)acao.custo=numeros(a,'custo',9999);
      if(a.valor!==undefined)acao.valor=padrao(a.valor,100);
      if(a.descricao!==undefined)acao.descricao=padrao(a.descricao,1500);
      if(a.restricoes!==undefined)acao.restricoes=padrao(a.restricoes,750);
      if(['a01','legado','manual'].includes(a.fonte))acao.fonte=a.fonte;
      if(['principal','buff','reacao','exploracao','passiva'].includes(a.ativacao))acao.ativacao=a.ativacao;
      if(a.pc!==undefined)acao.pc=numeros(a,'pc',9999);
      if(a.px!==undefined)acao.px=numeros(a,'px',9999);
      if(a.enIndefinida!==undefined)acao.enIndefinida=a.enIndefinida===true;
      if(a.exigeCA!==undefined)acao.exigeCA=a.exigeCA===true;
      return acao;
    });
    resultado.set(id,{
      id,nome,elemento:padrao(f.elemento,45),classe:padrao(f.classe,45),
      hp:numeros(f,'hp',99999),hpMax:numeros(f,'hpMax',99999),
      mana:numeros(f,'mana',99999),manaMax:numeros(f,'manaMax',99999),
      ca:numeros(f,'ca',999),escudo:numeros(f,'escudo',99999),
      temFicha:f.temFicha===true,acoes,
      ...(f.impeto!==undefined?{impeto:normalizarImpeto(f.impeto)}:{}),
      ...(f.condicoes!==undefined?{condicoes:normalizarCondicoes(f.condicoes)}:{}),
    });
  }
  return resultado;
}

/** Itens são cópias privadas e limitadas; imagens grandes nunca passam pelo servidor.
 * Nenhum dado de outro inventário pode ser selecionado via parâmetros do convidado.
 */
function normalizarInventarios(entrada){
  if(!entrada || !Array.isArray(entrada.personagens) || entrada.personagens.length>100)
    throw new Error('Lista de inventários inválida.');
  const categorias=new Set(['arma','consumivel','comida','acampamento','equipamento','material','documento','outro']);
  const efeitos=new Set(['nenhum','cura','mana','escudo','dano']);
  const resultado=new Map();
  const pequena=(valor)=>typeof valor==='string'&&valor.length<=180_000&&
    /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(valor)?valor:undefined;
  for(const p of entrada.personagens){
    if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Inventário inválido.');
    const id=padrao(p.id,120),nome=padrao(p.nome,80);
    if(!id||!nome||resultado.has(id)||!Array.isArray(p.itens)||p.itens.length>120)throw new Error('Personagem ou itens inválidos.');
    const ids=new Set();
    const itens=p.itens.map(item=>{
      if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Item inválido.');
      const iid=padrao(item.id,120),titulo=padrao(item.nome,80),categoria=padrao(item.categoria,25),efeito=padrao(item.efeito,25);
      const quantidade=item.quantidade;
      if(!iid||!titulo||ids.has(iid)||!categorias.has(categoria)||!efeitos.has(efeito)||
        !Number.isSafeInteger(quantidade)||quantidade<1||quantidade>9999)throw new Error('Item ou quantidade inválida.');
      ids.add(iid);
      return {id:iid,nome:titulo,categoria,efeito,valor:padrao(item.valor,40),descricao:padrao(item.descricao,650),
        consumivel:item.consumivel===true,quantidade,
        ...(pequena(item.imagem)?{imagem:pequena(item.imagem)}:{}),
        ...(categoria==='documento'&&typeof item.conteudo==='string'?{conteudo:item.conteudo.slice(0,12000)}:{}),
        ...(categoria==='documento'&&pequena(item.imagemConteudo)?{imagemConteudo:pequena(item.imagemConteudo)}:{})};
    });
    resultado.set(id,{id,nome,itens});
  }
  return resultado;
}

/** Entrada do Diário fornecida somente pelo mestre: filtrar ainda no servidor para
 * impedir que um convidado consulte páginas de outro personagem alterando a URL.
 */
function normalizarDiario(entrada){
  if(!entrada||!Array.isArray(entrada.paginas)||entrada.paginas.length>120)
    throw Error('Publicação do Diário inválida.');
  const ids=new Set();
  return entrada.paginas.map(p=>{
    if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Página inválida.');
    const id=padrao(p.id,120),titulo=padrao(p.titulo,110);
    if(!id||ids.has(id))throw Error('Documento duplicado ou inválido.');
    ids.add(id);
    const compartilhadoCom={};
    if(p.compartilhadoCom && typeof p.compartilhadoCom==='object' && !Array.isArray(p.compartilhadoCom)){
      for(const [chave,acesso] of Object.entries(p.compartilhadoCom).slice(0,80)){
        if(chave.length<=120&&(acesso==='ver'||acesso==='editar'))compartilhadoCom[chave]=acesso;
      }
    }
    const imagem=typeof p.imagem==='string'&&p.imagem.length<=600_000&&
      /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(p.imagem)?p.imagem:'';
    return {id,titulo,categoria:padrao(p.categoria,30),conteudo:typeof p.conteudo==='string'?p.conteudo.slice(0,40000):'',
      tipo:p.tipo==='pasta'?'pasta':p.tipo==='imagem'?'imagem':'nota',
      pastaId:padrao(p.pastaId,120),formato:p.formato==='html'?'html':'texto',imagem,
      fixada:p.fixada===true,atualizadaEm:padrao(p.atualizadaEm,40),criadaEm:padrao(p.criadaEm,40),compartilhadoCom};
  });
}

// O servidor determina os dados da habilidade; o cliente nunca pode informar
// um resultado pronto ou uma fórmula diferente da ficha atribuída.
function interpretarFormula(valor,comSufixo=false,maximo=8){
  if(typeof valor!=='string')return null;
  const sufixo=comSufixo?'(?:\\s*(?:HP|pontos? de vida|pontos? de escudo|escudo|dano|cura))?':'';
  const expressao=new RegExp(`^\\s*(\\d{1,2})\\s*d\\s*(4|6|8|10|12|20|100)\\s*([+-]\\s*\\d{1,4})?${sufixo}\\s*$`,'i');
  const achado=expressao.exec(valor);
  if(!achado)return null;
  const quantidade=Number(achado[1]),faces=Number(achado[2]);
  const modificador=achado[3]?Number(achado[3].replace(/\s+/g,'')):0;
  if(quantidade<1||quantidade>maximo||!Number.isInteger(modificador)||Math.abs(modificador)>9999)return null;
  const formula=`${quantidade}d${faces}${modificador>0?'+'+modificador:modificador<0?modificador:''}`;
  return {quantidade,faces,modificador,formula};
}
/** Aparência da rolagem, limitada e validada. É decorativa, não determina o resultado. */
function normalizarAparenciaDados(valor, faces){
  if(!valor || typeof valor!=='object'||Array.isArray(valor))return undefined;
  if(valor.tipo==='preset'){
    const id=padrao(valor.id,30);
    return ['marmore','obsidiana','jade','oceano','brasa'].includes(id)?{tipo:'preset',id}:undefined;
  }
  if(valor.tipo!=='custom')return undefined;
  const entrada=valor.arte;
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada)||entrada.format!=='hexatombe-dice-art'||
    ![1,2,3].includes(Number(entrada.version))||Number(entrada.type)!==faces)return undefined;
  const baseColor=padrao(entrada.baseColor,10);
  if(!/^#[0-9a-f]{6}$/i.test(baseColor))return undefined;
  const imagens={};
  if(entrada.artworkPNG&&typeof entrada.artworkPNG==='object'&&!Array.isArray(entrada.artworkPNG)){
    for(const [chave,img] of Object.entries(entrada.artworkPNG)){
      if(!/^\d{1,3}$/.test(chave)||Number(chave)<1||Number(chave)>(faces===100?10:faces)||
        typeof img!=='string'||img.length>85000||!/^data:image\/png;base64,[a-zA-Z0-9+/]+=*$/.test(img))continue;
      imagens[chave]=img;
    }
  }
  const arte={format:'hexatombe-dice-art',version:1,name:padrao(entrada.name,80)||'Dado personalizado',type:faces,
    material:padrao(entrada.material,35),baseColor,
    showNumbers:entrada.showNumbers!==false,
    artworkPNG:imagens};
  if(entrada.border&&typeof entrada.border==='object')arte.border={
    style:padrao(entrada.border.style,24),
    color:/^#[0-9a-f]{6}$/i.test(String(entrada.border.color))?entrada.border.color:'#d9aa70',
    width:Number.isFinite(entrada.border.width)?Math.max(1,Math.min(40,entrada.border.width)):10,
  };
  if(entrada.numbering&&typeof entrada.numbering==='object')arte.numbering={
    color:/^#[0-9a-f]{6}$/i.test(String(entrada.numbering.color))?entrada.numbering.color:'#ffe5b5',
    size:Number.isFinite(entrada.numbering.size)?Math.max(40,Math.min(150,entrada.numbering.size)):100,
  };
  if(Array.isArray(entrada.faceLabels))arte.faceLabels=entrada.faceLabels.slice(0,faces===100?10:faces).map(v=>padrao(v,24));
  if(JSON.stringify(arte).length>600_000)throw new Error('A aparência do dado excede o limite multiplayer.');
  return {tipo:'custom',arte};
}
function prepararRolagem(ficha,corpo){
  if(!corpo||typeof corpo!=='object'||Array.isArray(corpo))return {erro:'Rolagem inválida.'};
  if(!ficha)return {erro:'Aguarde o mestre atribuir uma ficha ao seu personagem.'};
  if(corpo.tipo==='livre'){
    const dados=interpretarFormula(corpo.formula);
    if(!dados)return {erro:'Use uma fórmula de 1 a 8 dados, como 2d8+3.'};
    return {dados,acaoNome:'Rolagem livre',categoria:'livre'};
  }
  if(corpo.tipo!=='acao')return {erro:'Tipo de rolagem inválido.'};
  const acao=ficha.acoes.find(a=>a.id===corpo.acaoId);
  if(!acao)return {erro:'Esta habilidade não pertence à sua ficha.'};
  if(acao.categoria==='passiva')return {erro:'Passivas não exigem rolagem.'};
  if(corpo.modalidade==='teste'){
    if(!['basico','ofensiva','controle'].includes(acao.categoria))
      return {erro:'Esta ação não exige teste de acerto.'};
    return {dados:interpretarFormula('1d20'),acaoNome:`Acerto · ${acao.nome}`,categoria:'teste'};
  }
  if(corpo.modalidade!=='valor')return {erro:'Modalidade de rolagem inválida.'};
  const dados=interpretarFormula(acao.valor,true);
  if(!dados)return {erro:'Esta habilidade não possui uma fórmula de dados rolável.'};
  return {dados,acaoNome:acao.nome,categoria:acao.categoria};
}

function credencial(req,url){
  const h=req.headers.authorization || '';
  if (h.startsWith('Bearer '))return h.slice(7);
  // EventSource não suporta Authorization; segredo restrito ao URL local de eventos.
  return url.searchParams.get('token') || '';
}

export function criarAplicacaoMultiplayer({diretorioPersistencia=null,diretorioPublico=null}={}){
  const persistencia=criarPersistenciaSalas(diretorioPersistencia);
  const salas=new Map((persistencia?.carregar()||[]).map(sala=>[sala.codigo,sala]));
  // Áudio é efêmero. Depois de reiniciar o servidor o mestre republica a faixa atual.
  for(const sala of salas.values()){sala.musicaAtual=null;sala.arquivoMusica=null;}
  if(salas.size)console.log(`[Portal] ${salas.size} sala(s) preservada(s) recuperada(s).`);
  const agendarPersistencia=sala=>persistencia?.agendar(sala);
  const preservarIdentidade=sala=>{
    try{persistencia?.salvar(sala);}catch(e){console.error('[Portal] Falha ao preservar identidade local:',e.message);}
  };
  let manutencao;
  // A associação é definida pelo mestre. Nunca confiar num nome de personagem enviado pelo convidado.
  function nomePersonagemAtribuido(sala,pessoa){
    if(pessoa.papel!=='convidado'||!pessoa.personagemId)return null;
    return sala.mesa?.tokens.find(token=>token.id===pessoa.personagemId)?.nome||
      sala.fichas.get(pessoa.personagemId)?.nome||null;
  }
  function nomeExibicaoChat(sala,pessoa){
    const personagem=nomePersonagemAtribuido(sala,pessoa);
    return personagem?`${pessoa.apelido} (${personagem})`:pessoa.apelido;
  }
  function participantes(sala){
    return [...sala.pessoas.values()].map(p=>({
      id:p.id,apelido:p.apelido,papel:p.papel,conectado:p.conexoes.size>0,
      personagemId:p.personagemId||null,personagemNome:nomePersonagemAtribuido(sala,p),
    }));
  }
  function snapshot(sala){
    return {codigo:sala.codigo,campanha:sala.campanha,hostOnline:sala.host.conexoes.size>0,mesaControlada:sala.controladores.size>0,participantes:participantes(sala),limiteConvidados:LIMITE_CONVIDADOS};
  }
  function publicar(sala,tipo='presenca'){
    const mensagem=`data: ${JSON.stringify({tipo,sala:snapshot(sala)})}\n\n`;
    for(const p of sala.pessoas.values())for(const res of p.conexoes){
      try{res.write(mensagem);}catch{p.conexoes.delete(res);}
    }
  }
  function publicarSomenteControlador(sala,evento){
    const conexao=[...sala.controladores].find(c=>!c.writableEnded);
    if(conexao){try{conexao.write(`data: ${JSON.stringify(evento)}\n\n`);}catch{sala.controladores.delete(conexao);}}
  }
  function mensagensChatVisiveis(sala,pessoa){
    return sala.chat.filter(m=>!m.destinatarioId || m.autorId===pessoa.id || m.destinatarioId===pessoa.id);
  }
  function publicarMensagemChat(sala,mensagem){
    const evento=`data: ${JSON.stringify({tipo:'chat',mensagem})}\n\n`;
    for(const participante of sala.pessoas.values()){
      if(mensagem.destinatarioId&&mensagem.autorId!==participante.id&&mensagem.destinatarioId!==participante.id)continue;
      for(const conexao of participante.conexoes){
        try{conexao.write(evento);}catch{participante.conexoes.delete(conexao);}
      }
    }
  }
  function publicarSomenteMestre(sala,evento){
    const mensagem=`data: ${JSON.stringify(evento)}\n\n`;
    for(const res of sala.host.conexoes){
      try{res.write(mensagem);}catch{sala.host.conexoes.delete(res);}
    }
  }
  function inventarioDaPessoa(sala,pessoa){
    if(pessoa.papel!=='convidado'||!pessoa.personagemId)return null;
    const inventario=sala.inventarios.get(pessoa.personagemId);
    if(!inventario)return null;
    return {...inventario,destinatarios:[...sala.inventarios.values()]
      .filter(outro=>outro.id!==inventario.id).map(outro=>({id:outro.id,nome:outro.nome}))};
  }
  function publicarInventarioParaPessoa(sala,pessoa){
    if(pessoa.papel!=='convidado')return;
    const mensagem=`data: ${JSON.stringify({tipo:'inventario',inventario:inventarioDaPessoa(sala,pessoa)})}\n\n`;
    for(const res of pessoa.conexoes){
      try{res.write(mensagem);}catch{pessoa.conexoes.delete(res);}
    }
  }
  // O Diario compartilhado e um acervo de permissoes, nao uma caixa de entrada paralela.
  // IDs de origem externa sao opacos: duas notas de pessoas distintas nunca colidem.
  function paginaCompartilhada(sala,recebido,permissao,personagemId){
    const p=recebido.pagina;
    const pasta=[...sala.diariosRecebidos.values()].find(r=>r.pessoaId===recebido.pessoaId&&
      r.personagemId===recebido.personagemId&&r.pagina.id===p.pastaId&&r.pagina.tipo==='pasta'&&r.permissoes?.[personagemId]);
    return {...p,id:`externo:${recebido.id}`,pastaId:pasta?`externo:${pasta.id}`:'',fixada:false,
      criadaEm:p.criadaEm||p.atualizadaEm,origem:'personagem',proprietario:`${recebido.personagemNome} (${recebido.apelido})`,
      permissao};
  }
  function entregasParaMestre(sala){return [...sala.diariosRecebidos.values()]
    .filter(r=>r.permissoes?.mestre).sort((a,b)=>b.recebidoEm.localeCompare(a.recebidoEm))
    .map(r=>({...r,permissao:r.permissoes.mestre}));}
  function publicarEntregasDiario(sala){publicarSomenteMestre(sala,{tipo:'diario-personagem',recebidos:entregasParaMestre(sala)});}
  function diarioDaPessoa(sala,pessoa){
    if(pessoa.papel!=='convidado'||!pessoa.personagemId)return [];
    const id=pessoa.personagemId, paginas=sala.diario;
    const doMestre=paginas.filter(p=>p.compartilhadoCom[id]||
      paginas.find(outra=>outra.id===p.pastaId&&outra.tipo==='pasta')?.compartilhadoCom[id])
      .map(({compartilhadoCom,...dados})=>{
        const pasta=paginas.find(p=>p.id===dados.pastaId&&p.tipo==='pasta'&&p.compartilhadoCom[id]);
        return {...dados,pastaId:pasta?dados.pastaId:'',origem:'mestre',proprietario:'Mestre',
          permissao:compartilhadoCom[id]||pasta?.compartilhadoCom[id]||'ver'};
      });
    const dosPersonagens=[...sala.diariosRecebidos.values()].filter(r=>r.permissoes?.[id]&&r.pessoaId!==pessoa.id)
      .map(r=>paginaCompartilhada(sala,r,r.permissoes[id],id));
    return [...doMestre,...dosPersonagens];
  }
  function normalizarPaginaEnviada(pagina){
    if(!pagina||typeof pagina!=='object'||Array.isArray(pagina))throw Error('Documento inválido.');
    const id=padrao(pagina.id,120),titulo=padrao(pagina.titulo,110);
    if(!id||!titulo)throw Error('Escolha um documento com título para compartilhar.');
    const imagem=pagina.imagem||'';
    if(typeof imagem!=='string'||imagem.length>550_000||(imagem&&!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(imagem)))throw Error('Imagem do diário inválida ou muito grande.');
    if(typeof pagina.conteudo!=='string'||pagina.conteudo.length>40_000)throw Error('Conteúdo do diário muito grande.');
    return {id,titulo,conteudo:pagina.conteudo,categoria:padrao(pagina.categoria,30)||'outro',
      tipo:pagina.tipo==='pasta'?'pasta':pagina.tipo==='imagem'?'imagem':'nota',
      pastaId:padrao(pagina.pastaId,120),formato:pagina.formato==='html'?'html':'texto',imagem,
      criadaEm:padrao(pagina.criadaEm,40)||new Date().toISOString(),atualizadaEm:padrao(pagina.atualizadaEm,40)||new Date().toISOString()};
  }
  function normalizarPermissoesPersonagem(sala,pessoa,entrada){
    const resultado={};
    if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))return resultado;
    for(const [id,permissao] of Object.entries(entrada).slice(0,80)){
      if(permissao!=='ver'&&permissao!=='editar')continue;
      if(id==='mestre'){resultado.mestre=permissao;continue;}
      if(id===pessoa.personagemId)continue;
      if(sala.mesa?.grupo?.some(g=>g.id===id&&g.tipo==='jogador')||[...sala.pessoas.values()].some(g=>g.personagemId===id))resultado[id]=permissao;
    }
    return resultado;
  }
  function publicarDiarios(sala){
    publicarEntregasDiario(sala);
    for(const convidado of sala.pessoas.values())publicarDiarioParaPessoa(sala,convidado);
  }
  function publicarDiarioParaPessoa(sala,pessoa){
    if(pessoa.papel!=='convidado')return;
    const mensagem=`data: ${JSON.stringify({tipo:'diario',paginas:diarioDaPessoa(sala,pessoa)})}\n\n`;
    for(const res of pessoa.conexoes){
      if(res.writableEnded){pessoa.conexoes.delete(res);continue;}
      try{res.write(mensagem);}catch{pessoa.conexoes.delete(res);}
    }
  }
  function informarResultadoItem(sala,pessoa,resultado){
    // Convidado recebe resposta privada; mestre remove o pedido da própria fila.
    if(pessoa){
      const mensagem=`data: ${JSON.stringify({tipo:'resultado-item',resultado})}\n\n`;
      for(const res of pessoa.conexoes){
        try{res.write(mensagem);}catch{pessoa.conexoes.delete(res);}
      }
    }
    publicarSomenteMestre(sala,{tipo:'resultado-item',resultado});
  }
  function detalharPedidoItem(sala,pedido){
    const inventario=sala.inventarios.get(pedido.personagemId);
    const item=inventario?.itens.find(item=>item.id===pedido.itemId);
    return {tipo:'pedido-item',...pedido,
      solicitante:sala.pessoas.get(pedido.pessoaId)?.apelido||'Jogador',
      personagemNome:inventario?.nome||'Personagem',
      itemNome:item?.nome||'Item indisponível',
      itemCategoria:item?.categoria||'',
      destinoNome:pedido.destinatarioId?sala.inventarios.get(pedido.destinatarioId)?.nome||'Destinatário indisponível':null,
    };
  }
  function expirarPedidosItens(sala){
    const agora=Date.now();
    for(const [pid,pedido] of sala.pedidosItens){
      if(agora-(pedido.iniciadoEm||pedido.criadoEm)<=LIMITE_PENDENCIA_ITEM_MS)continue;
      sala.pedidosItens.delete(pid);
      informarResultadoItem(sala,sala.pessoas.get(pedido.pessoaId),{
        pedidoId:pid,ok:false,mensagem:'O prazo para autorização terminou. Solicite novamente.'
      });
    }
  }
  function fichaDaPessoa(sala,pessoa){
    return pessoa.papel==='convidado'&&pessoa.personagemId
      ? sala.fichas.get(pessoa.personagemId)||null : null;
  }
  function publicarFichaParaPessoa(sala,pessoa){
    if(pessoa.papel!=='convidado')return;
    const mensagem=`data: ${JSON.stringify({tipo:'ficha',ficha:fichaDaPessoa(sala,pessoa)})}\n\n`;
    for(const res of pessoa.conexoes){
      try{res.write(mensagem);}catch{pessoa.conexoes.delete(res);}
    }
  }
  // Proteção por destinatário: a cena restrita nunca fornece as posições dos
  // outros jogadores ao convidado. A visão individual completa será posterior.
  function mesaParaPessoa(sala,pessoa){
    const mesa=sala.mesa;
    if(!mesa)return mesa;
    // Nem o mestre precisa receber de volta os bitmaps por personagem.
    if(pessoa.papel==='mestre')return {...mesa,vistas:undefined};
    if(mesa.visibilidade==='total')return {...mesa,vistas:undefined};
    if(mesa.visibilidade==='individual'){
      const vista=mesa.vistas.find(v=>v.personagemId===pessoa.personagemId);
      const ids=new Set((vista?.tokens||[]).map(t=>t.id));
      const ordem=mesa.combate.ordem.filter(id=>ids.has(id));
      const combate={...mesa.combate,ordem,turnoId:ids.has(mesa.combate.turnoId)?mesa.combate.turnoId:null,
        ...(mesa.combate.valores?{valores:Object.fromEntries(ordem.filter(id=>Object.hasOwn(mesa.combate.valores,id))
          .map(id=>[id,mesa.combate.valores[id]]))}:{})};
      // Não encaminhar a geometria geral ao convidado: o mestre fornece a
      // lista de objetos e GLBs autorizados para ESTE observador.
      const cenario3D=vista?.mascara3D&&mesa.cenario3D?{
        ...mesa.cenario3D,base:'vazia',
        objetos:mesa.cenario3D.objetos.filter(o=>vista.objetos3DVisiveis.includes(o.id)),
        miniaturas:mesa.cenario3D.miniaturas.filter(m=>vista.miniaturas3DVisiveis.includes(m.id)&&
          (!m.personagemId||ids.has(m.personagemId)))
      }:undefined;
      return {cenaId:mesa.cenaId,revisao:mesa.revisao,cenaNome:mesa.cenaNome,modoMesa:mesa.modoMesa,permitirDesenhoJogadores:mesa.permitirDesenhoJogadores,
        visibilidade:'individual',aspecto:mesa.aspecto,escalaMapa:mesa.escalaMapa,imagem:vista?.imagem??null,
        tokens:vista?.tokens??[],grupo:mesa.grupo,combate,ambiente:mesa.ambiente?{clima:mesa.ambiente.clima}:undefined,
        ...(cenario3D?{cenario3D,mascara3D:vista.mascara3D,
          ...(vista.poligono3D?{poligono3D:vista.poligono3D}:{})}:{} )};
    }
    return {...mesa,vistas:undefined,imagem:null,tokens:mesa.tokens.filter(t=>t.id===pessoa.personagemId),
      combate:{...mesa.combate,ordem:[],turnoId:null,...(mesa.combate.valores?{valores:{}}:{})}};
  }
  function enviarQuadroMesa(pessoa,res,mensagem,tamanho){
    if(res.writableEnded||res.destroyed){pessoa.conexoes.delete(res);return;}
    // Uma conexão com leitura parada não pode reter infinitos mapas, nem
    // atrasar os demais convidados. O navegador recuperará o último estado
    // ao abrir uma nova conexão de eventos.
    if(res.writableLength+tamanho>LIMITE_FILA_SSE){
      pessoa.conexoes.delete(res);
      try{res.destroy();}catch{/* conexão já encerrada */}
      return;
    }
    try{res.write(mensagem);}catch{pessoa.conexoes.delete(res);}
  }
  function publicarMesaParaPessoa(sala,pessoa){
    const mensagem=`data: ${JSON.stringify({tipo:'mesa',mesa:mesaParaPessoa(sala,pessoa)})}\n\n`;
    const tamanho=Buffer.byteLength(mensagem,'utf8');
    for(const res of pessoa.conexoes)enviarQuadroMesa(pessoa,res,mensagem,tamanho);
  }
  function publicarMesa(sala){
    // Em visibilidade total, a projeção pública é IDÊNTICA para todos:
    // serializar uma vez evita trabalho e alocações repetidas com seis jogadores.
    // Na visão individual, cada recorte continua sendo filtrado por destinatário.
    const mensagemComum=sala.mesa?.visibilidade==='total'
      ?`data: ${JSON.stringify({tipo:'mesa',mesa:mesaParaPessoa(sala,sala.host)})}\n\n`:null;
    const tamanhoComum=mensagemComum?Buffer.byteLength(mensagemComum,'utf8'):0;
    for(const p of sala.pessoas.values()){
      const mensagem=mensagemComum??`data: ${JSON.stringify({tipo:'mesa',mesa:mesaParaPessoa(sala,p)})}\n\n`;
      const tamanho=mensagemComum?tamanhoComum:Buffer.byteLength(mensagem,'utf8');
      for(const res of p.conexoes)enviarQuadroMesa(p,res,mensagem,tamanho);
    }
  }
  function encerrarSala(sala){
    publicar(sala,'encerrada');
    for(const p of sala.pessoas.values())for(const res of p.conexoes){
      try{res.end();}catch{/* já fechou */}
    }
    sala.pedidosItens.clear();
    salas.delete(sala.codigo);
    persistencia?.remover(sala.codigo);
  }
  function encontrarPessoa(sala,token){
    for(const p of sala.pessoas.values())if(igualToken(p.token,token))return p;
    return null;
  }
  function conectarEventos(sala,pessoa,conexao,controlador=false){
    pessoa.conexoes.add(conexao);
    if(pessoa.papel==='mestre'&&controlador){
      sala.controladores.add(conexao);
      // Ao reconectar, retomar desenhos entregues mas ainda não confirmados.
      for(const registro of sala.desenhosJogador.values()){
        if(!registro.confirmado&&registro.traco&&registro.cenaId===sala.mesa?.cenaId){
          conexao.write(`data: ${JSON.stringify({tipo:'desenho-jogador',acao:'adicionar',cenaId:registro.cenaId,traco:registro.traco})}\n\n`);
        }
      }
    }
    publicar(sala);
    if(sala.mesa)conexao.write(`data: ${JSON.stringify({tipo:'mesa',mesa:mesaParaPessoa(sala,pessoa)})}\n\n`);
    conexao.write(`data: ${JSON.stringify({tipo:'musica',musica:sala.musicaAtual||null})}\n\n`);
    if(pessoa.papel==='convidado'){
      publicarFichaParaPessoa(sala,pessoa);
      publicarInventarioParaPessoa(sala,pessoa);
      publicarDiarioParaPessoa(sala,pessoa);
    }
    const pulso=setInterval(()=>{
      if(!conexao.writableEnded){try{conexao.write(': pulso\n\n');}catch{/* desconectado */}}
    },20000);
    conexao.on('close',()=>{
      clearInterval(pulso);pessoa.conexoes.delete(conexao);sala.controladores.delete(conexao);
      if(salas.has(sala.codigo))publicar(sala);
    });
  }
  const servidor=http.createServer(async(req,res)=>{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    const rota=url.pathname;
    if(rota.startsWith(PREFIXO)){
      const origem=req.headers.origin;
      if(!origemSegura(origem,req.headers.host||'')){
        erro(res,403,'Origem de navegador não autorizada para este servidor.');return;
      }
      if(origem){
        res.setHeader('Access-Control-Allow-Origin',origem);
        res.setHeader('Vary','Origin');
        res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
        res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Max-Age','600');
      }
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    }
    if(!rota.startsWith(PREFIXO)){
      if(diretorioPublico)return servirSite(req,res,diretorioPublico);
      erro(res,404,'Rota inexistente.');return;
    }
    if(req.method==='GET' && rota===`${PREFIXO}/saude`){enviar(res,200,{ativo:true,etapa:8,versao:'29.15.28',recursos:{desenhoJogador:true,confirmacaoDesenhos:true,movimentoContinuo:true}});return;}
    if(req.method==='POST' && rota===`${PREFIXO}/salas`){
      if(salas.size>=LIMITE_SALAS){erro(res,429,'Limite de salas de teste atingido.');return;}
      try{
        const corpo=await lerJson(req);
        const campanha=padrao(corpo?.campanha,80);
        const campanhaId=padrao(corpo?.campanhaId,150);
        if(!campanha||!campanhaId){erro(res,400,'Informe a campanha.');return;}
        let codigo;
        do{codigo=codigoAleatorio();}while(salas.has(codigo));
        const host={id:randomUUID(),apelido:'Mestre',papel:'mestre',token:tokenAleatorio(),conexoes:new Set()};
        const sala={codigo,campanha,campanhaId,midias:new Map(),modelos3D:new Map(),host,pessoas:new Map([[host.id,host]]),controladores:new Set(),mesa:null,fichas:new Map(),inventarios:new Map(),diario:[],diariosRecebidos:new Map(),pedidosItens:new Map(),rolagens:[],videosRolagens:new Map(),sessoesDadosAoVivo:new Map(),musicaAtual:null,arquivoMusica:null,desenhosJogador:new Map(),chat:[],criadaEm:Date.now(),ultimaAtividade:Date.now()};
        salas.set(codigo,sala);
        preservarIdentidade(sala);
        enviar(res,201,{codigo,token:host.token,papel:'mestre',sala:snapshot(sala)});
      }catch(e){erro(res,400,e.message);}
      return;
    }
    const m=rota.match(/^\/api\/multiplayer\/salas\/([A-Z2-9]{8})(?:\/(entrar|eu|eventos|sair|encerrar|mesa|ambiente|posicoes|ficha|fichas|inventario|inventarios|item|pedidos-itens|validar-item|resultado-item|diario|diario-personagem|atribuir|mover|bloqueio-arrasto|previa-3d|desenho|rolagens|rolar|chat|dados-ao-vivo|musica|musicas\/[a-f0-9-]{36}|midias|midias\/[a-f0-9]{32}|modelos3d\/mini-[a-zA-Z0-9-]{6,90}|rolagens\/[a-zA-Z0-9._-]{1,90}\/video))?$/);
    if(!m){erro(res,404,'Rota inexistente.');return;}
    const sala=salas.get(m[1]);
    if(!sala){erro(res,404,'Esta sala não existe ou foi encerrada.');return;}
    const acao=m[2]||'';
    sala.ultimaAtividade=Date.now();
    // Salvar somente mutações autenticadas e concluídas; nunca repetir os
    // temporários de mídia ao vivo, movimento prévio ou pedidos de câmera.
    if((req.method==='POST'||req.method==='PATCH'||req.method==='DELETE')&&
      !['previa-3d','dados-ao-vivo','bloqueio-arrasto','musica'].includes(acao)&&!acao.startsWith('musicas/')&&!/^rolagens\//.test(acao)){
      res.once('finish',()=>{
        if(res.statusCode>=200&&res.statusCode<300&&salas.get(sala.codigo)===sala)
          agendarPersistencia(sala);
      });
    }
    if(req.method==='GET' && !acao){
      const {codigo,campanha,hostOnline,participantes:lista,limiteConvidados}=snapshot(sala);
      enviar(res,200,{codigo,campanha,hostOnline,quantidadeConvidados:lista.filter(p=>p.papel==='convidado').length,limiteConvidados});return;
    }
    if(req.method==='POST' && acao==='entrar'){
      const total=[...sala.pessoas.values()].filter(p=>p.papel==='convidado').length;
      if(total>=LIMITE_CONVIDADOS){erro(res,403,'Esta sala já atingiu o limite de convidados.');return;}
      try{
        const corpo=await lerJson(req);
        const apelido=padrao(corpo?.apelido,24).replace(/[\u0000-\u001F\u007F]/g,'');
        if(apelido.length<2){erro(res,400,'Escolha um apelido de pelo menos dois caracteres.');return;}
        const pessoa={id:randomUUID(),apelido,papel:'convidado',token:tokenAleatorio(),conexoes:new Set()};
        sala.pessoas.set(pessoa.id,pessoa);
        preservarIdentidade(sala);
        enviar(res,201,{codigo:sala.codigo,token:pessoa.token,id:pessoa.id,apelido,papel:'convidado',sala:snapshot(sala)});
        publicar(sala);
      }catch(e){erro(res,400,e.message);}
      return;
    }
    const pessoa=encontrarPessoa(sala,credencial(req,url));
    if(!pessoa){erro(res,401,'Acesso à sala inválido.');return;}
    // Trilha compartilhada da sessão. O áudio fica só na RAM do servidor e é
    // acessível exclusivamente a participantes autenticados, inclusive por Range.
    // O navegador do mestre conserva a biblioteca original no IndexedDB.
    const faixaArquivo=/^musicas\/([a-f0-9-]{36})$/.exec(acao);
    if(faixaArquivo&&req.method==='POST'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Só o mestre pode publicar a trilha.');return;}
      const tipo=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
      if(!['audio/mpeg','audio/mp3','audio/x-mpeg','audio/ogg','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac','audio/x-aac','audio/flac','audio/x-flac','audio/webm','audio/opus','application/ogg','application/octet-stream'].includes(tipo)){
        erro(res,415,'Formato de áudio não aceito pelo servidor.');return;
      }
      try{
        const partes=[];let tamanho=0;
        for await(const parte of req){tamanho+=parte.length;if(tamanho>LIMITE_AUDIO_SESSAO)throw Error('Música acima de 45 MB; use um arquivo menor.');partes.push(parte);}
        if(tamanho<128)throw Error('Arquivo de áudio vazio.');
        sala.arquivoMusica={id:faixaArquivo[1],tipo:tipo==='application/octet-stream'?'audio/mpeg':tipo,bytes:Buffer.concat(partes)};
        enviar(res,201,{ok:true,id:faixaArquivo[1]});
      }catch(e){erro(res,400,e.message||'Falha ao publicar áudio.');}
      return;
    }
    if(faixaArquivo&&req.method==='GET'){
      const atual=sala.arquivoMusica;
      if(!atual||atual.id!==faixaArquivo[1]||sala.musicaAtual?.id!==atual.id){erro(res,404,'Faixa não disponível na sessão.');return;}
      const bytes=atual.bytes, tamanho=bytes.length;
      const cabecalhos={'Content-Type':atual.tipo,'Accept-Ranges':'bytes','Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
      const intervalo=String(req.headers.range||'').match(/^bytes=(\d*)-(\d*)$/);
      if(intervalo){
        const inicio=intervalo[1]?Number(intervalo[1]):Math.max(0,tamanho-Number(intervalo[2]||0));
        const fim=intervalo[1]?(intervalo[2]?Number(intervalo[2]):tamanho-1):tamanho-1;
        if(inicio>=tamanho||inicio>fim||fim<0){res.writeHead(416,{...cabecalhos,'Content-Range':`bytes */${tamanho}`});res.end();return;}
        const ultimo=Math.min(fim,tamanho-1);
        res.writeHead(206,{...cabecalhos,'Content-Range':`bytes ${inicio}-${ultimo}/${tamanho}`,'Content-Length':ultimo-inicio+1});
        res.end(bytes.subarray(inicio,ultimo+1));return;
      }
      res.writeHead(200,{...cabecalhos,'Content-Length':tamanho});res.end(bytes);return;
    }
    if(acao==='musica'&&req.method==='GET'){
      enviar(res,200,{musica:sala.musicaAtual||null});return;
    }
    if(acao==='musica'&&req.method==='POST'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre controla a música.');return;}
      try{
        const corpo=await lerJson(req,2048);
        let musica=null;
        if(corpo?.id!==null){
          const id=padrao(corpo?.id,36),titulo=padrao(corpo?.titulo,120);
          const origem=corpo?.origem;
          if(!/^[a-f0-9-]{36}$/.test(id)||!titulo||!['arquivo','url'].includes(origem))throw Error('Faixa inválida.');
          let endereco;
          if(origem==='arquivo'&&sala.arquivoMusica?.id!==id)throw Error('Envie o arquivo da faixa antes de reproduzi-la.');
          if(origem==='url'){
            const candidata=new URL(padrao(corpo.endereco,2048));
            if(candidata.protocol!=='https:'&&candidata.protocol!=='http:')throw Error('Link inválido.');
            endereco=candidata.href;
          }
          musica={id,titulo,origem,...(endereco?{endereco}:{}),tocando:corpo.tocando===true,
            posicao:Number.isFinite(corpo.posicao)?Math.max(0,Math.min(86400,corpo.posicao)):0,
            atualizadoEm:Date.now()};
        }
        sala.musicaAtual=musica;
        if(!musica||musica.origem==='url')sala.arquivoMusica=null;
        const mensagem=`data: ${JSON.stringify({tipo:'musica',musica})}\n\n`;
        for(const destino of sala.pessoas.values()){
          if(destino.papel!=='convidado')continue;
          for(const conexao of destino.conexoes){try{conexao.write(mensagem);}catch{destino.conexoes.delete(conexao);}}
        }
        enviar(res,200,{ok:true,musica});
      }catch(e){erro(res,400,e.message||'Falha ao atualizar a música.');}
      return;
    }
    // Arquivos GIF nunca entram nos quadros SSE. O cliente recebe só a referência
    // e baixa a animação uma vez, usando a própria credencial da sala.
    if(req.method==='POST' && acao==='midias'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre publica mídias.');return;}
      if(req.headers['content-type']!=='image/gif'){erro(res,415,'Apenas GIF animado é aceito.');return;}
      try{
        const partes=[];let tamanho=0;
        for await(const parte of req){tamanho+=parte.length;if(tamanho>LIMITE_GIF_ANIMADO)throw Error('GIF ultrapassa 3 MB.');partes.push(parte);}
        const dados=Buffer.concat(partes);
        if(dados.length<20||!['GIF87a','GIF89a'].includes(dados.subarray(0,6).toString('ascii')))throw Error('GIF inválido.');
        const id=createHash('sha256').update(dados).digest('hex').slice(0,32);
        if(!sala.midias.has(id)){
          const total=[...sala.midias.values()].reduce((n,m)=>n+m.length,0);
          if(total+dados.length>LIMITE_GIFS_SALA)throw Error('Limite de 36 MB de GIFs por sala.');
          persistencia?.arquivo(sala,'gif',id,dados);
          sala.midias.set(id,dados);
        }
        enviar(res,201,{id});
      }catch(e){erro(res,400,e.message||'Não foi possível enviar o GIF.');}
      return;
    }
    const caminhoMidia=/^midias\/([a-f0-9]{32})$/.exec(acao);
    if(req.method==='GET'&&caminhoMidia){
      const id=caminhoMidia[1];const gif=sala.midias.get(id);
      const autorizada=pessoa.papel==='mestre'||Boolean(mesaParaPessoa(sala,pessoa)?.grupo?.some(g=>g.animacao===id)||
        mesaParaPessoa(sala,pessoa)?.tokens?.some(t=>t.animacao===id));
      if(!gif||!autorizada){erro(res,404,'Animação indisponível nesta cena.');return;}
      res.writeHead(200,{'Content-Type':'image/gif','Content-Length':gif.length,
        'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
      res.end(gif);return;
    }
    // v29.15.13: transmissão local e autenticada dos GLBs efetivamente usados
    // na cena revelada. Nada é exposto por URL sem autorização de convidado.
    const caminhoModelo=/^modelos3d\/(mini-[a-z0-9-]{6,90})$/i.exec(acao);
    if(caminhoModelo&&req.method==='POST'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre publica miniaturas.');return;}
      if(String(req.headers['content-type']).split(';')[0]!=='model/gltf-binary'){
        erro(res,415,'Miniatura deve ser um GLB.');return;
      }
      try{
        const partes=[];let tamanho=0;
        for await(const parte of req){tamanho+=parte.length;if(tamanho>LIMITE_GLB_3D)throw Error('GLB acima de 35 MB.');partes.push(parte);}
        const bytes=Buffer.concat(partes);
        if(bytes.length<32||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)
          throw Error('GLB 2.0 inválido.');
        const anterior=sala.modelos3D.get(caminhoModelo[1]);
        const total=[...sala.modelos3D.values()].reduce((t,v)=>t+v.length,0)-(anterior?.length||0);
        if(total+bytes.length>LIMITE_GLB_SALA)throw Error('Limite de 110 MB de modelos nesta sessão.');
        persistencia?.arquivo(sala,'glb',caminhoModelo[1],bytes);
        sala.modelos3D.set(caminhoModelo[1],bytes);
        enviar(res,201,{modeloId:caminhoModelo[1]});
      }catch(e){erro(res,400,e.message||'Não foi possível publicar o modelo.');}
      return;
    }
    if(caminhoModelo&&req.method==='GET'){
      const id=caminhoModelo[1];const modelo=sala.modelos3D.get(id);
      const cenaAutorizada=mesaParaPessoa(sala,pessoa);
      const autorizado=pessoa.papel==='mestre'||Boolean(cenaAutorizada?.visibilidade!=='restrita'&&
        cenaAutorizada?.cenario3D?.miniaturas?.some(m=>m.modeloId===id));
      if(!modelo||!autorizado){erro(res,404,'Modelo não autorizado nesta cena.');return;}
      res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':modelo.length,
        'Cache-Control':'private, max-age=600','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
      res.end(modelo);return;
    }
    // Sinalização WebRTC somente entre participantes autorizados. O servidor
    // nunca recebe frames: apenas encaminha SDP/ICE. A captura gravada continua
    // disponível como alternativa quando a conexão direta não acontece.
    if(req.method==='POST' && acao==='dados-ao-vivo'){
      try{
        const corpo=await lerJson(req,LIMITE_SINAL_DADOS);
        const id=padrao(corpo?.id,90);
        if(!/^[a-zA-Z0-9._-]{1,90}$/.test(id)){erro(res,400,'Identificador de transmissão inválido.');return;}
        const agora=Date.now();
        for(const [chave,atual] of sala.sessoesDadosAoVivo){
          if(agora-atual.criadaEm>DURACAO_DADOS_AO_VIVO_MS)sala.sessoesDadosAoVivo.delete(chave);
        }
        const transmitir=(destinatario,evento)=>{
          const texto=`data: ${JSON.stringify(evento)}\n\n`;
          for(const conexao of destinatario.conexoes){
            try{conexao.write(texto);}catch{destinatario.conexoes.delete(conexao);}
          }
        };
        if(corpo.acao==='iniciar'){
          const pendente=pessoa.rolagemFisicaPendente;
          const autorizado=pessoa.papel==='mestre'||(pendente&&pendente.id===id&&
            agora-pendente.criadaEm<25_000&&pendente.personagemId===pessoa.personagemId);
          if(!autorizado){erro(res,403,'Apenas o autor de uma rolagem preparada pode transmitir.');return;}
          const existente=sala.sessoesDadosAoVivo.get(id);
          if(existente){
            if(existente.emissorId!==pessoa.id){erro(res,409,'Transmissão já em andamento.');return;}
            enviar(res,200,{destinatarios:[...existente.destinatarios]});return;
          }
          const visibilidade=pessoa.papel==='mestre'
            ?(corpo.visibilidade==='mestre'?'mestre':'publica')
            :pendente.visibilidade;
          const destinatarios=new Set([...sala.pessoas.values()].filter(outro=>
            outro.id!==pessoa.id && outro.conexoes.size>0 &&
            (visibilidade==='publica'||outro.papel==='mestre')).map(outro=>outro.id));
          const sessao={id,emissorId:pessoa.id,visibilidade,destinatarios,criadaEm:agora};
          sala.sessoesDadosAoVivo.set(id,sessao);
          for(const destinoId of destinatarios){
            const destino=sala.pessoas.get(destinoId);
            if(destino)transmitir(destino,{tipo:'dados-ao-vivo',acao:'inicio',id,emissorId:pessoa.id});
          }
          enviar(res,200,{destinatarios:[...destinatarios]});return;
        }
        const sessao=sala.sessoesDadosAoVivo.get(id);
        if(!sessao){erro(res,404,'Transmissão expirada ou inexistente.');return;}
        if(corpo.acao==='encerrar'){
          if(sessao.emissorId!==pessoa.id){erro(res,403,'Só o autor pode encerrar a transmissão.');return;}
          sala.sessoesDadosAoVivo.delete(id);
          for(const destinoId of sessao.destinatarios){
            const destino=sala.pessoas.get(destinoId);
            if(destino)transmitir(destino,{tipo:'dados-ao-vivo',acao:'fim',id,emissorId:pessoa.id});
          }
          enviar(res,200,{ok:true});return;
        }
        if(corpo.acao!=='sinal'){erro(res,400,'Ação de transmissão inválida.');return;}
        const destinoId=padrao(corpo.destinatarioId,90);
        const sinal=corpo.sinal;
        const ida=pessoa.id===sessao.emissorId && sessao.destinatarios.has(destinoId);
        const volta=destinoId===sessao.emissorId && sessao.destinatarios.has(pessoa.id);
        if(!ida&&!volta){erro(res,403,'Sinalização não autorizada.');return;}
        if(!sinal||typeof sinal!=='object'||Array.isArray(sinal)||
          !['oferta','resposta','ice'].includes(sinal.tipo)||
          (ida&&sinal.tipo==='resposta')||(volta&&sinal.tipo==='oferta')){
          erro(res,400,'Sinal WebRTC inválido.');return;
        }
        if(sinal.tipo==='ice'){
          if(!sinal.candidato||typeof sinal.candidato!=='object'||
            typeof sinal.candidato.candidate!=='string'||sinal.candidato.candidate.length>1800){
            erro(res,400,'Candidato ICE inválido.');return;
          }
        }else if(typeof sinal.sdp!=='string'||sinal.sdp.length<10||sinal.sdp.length>12_000){
          erro(res,400,'Descrição SDP inválida.');return;
        }
        const destino=sala.pessoas.get(destinoId);
        if(!destino||!destino.conexoes.size){erro(res,404,'Destinatário desconectado.');return;}
        transmitir(destino,{tipo:'dados-ao-vivo',acao:'sinal',id,
          emissorId:sessao.emissorId,remetenteId:pessoa.id,sinal});
        enviar(res,200,{ok:true});return;
      }catch(e){erro(res,400,e.message||'Falha na sinalização dos dados.');}
      return;
    }
    // A mídia é enviada somente pelo navegador que lançou os dados, após
    // registrar as faces físicas no servidor. O espectador não relança nada.
    const caminhoVideo=/^rolagens\/([a-zA-Z0-9._-]{1,90})\/video$/.exec(acao);
    if(caminhoVideo&&(req.method==='GET'||req.method==='POST')){
      // O autor envia a captura pelo ID do lançamento físico (origemId),
      // enquanto o evento SSE anuncia o ID definitivo salvo no histórico.
      // Os espectadores recuperam pelo ID definitivo: ambos devem localizar
      // a MESMA rolagem, sem reexecutar o Dice Box.
      const r=sala.rolagens.find(r=>r.id===caminhoVideo[1]) ||
        sala.rolagens.find(r=>r.origemId===caminhoVideo[1]);
      if(!r){erro(res,404,'A rolagem ainda não foi registrada.');return;}
      if(r.visibilidade==='mestre'&&pessoa.papel!=='mestre'&&pessoa.id!==r.participanteId){
        erro(res,403,'Gravação privada.');return;
      }
      if(req.method==='POST'){
        if(r.participanteId!==pessoa.id){erro(res,403,'Apenas quem lançou pode enviar a gravação.');return;}
        const mime=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
        if(!['video/webm','video/mp4'].includes(mime)){erro(res,415,'Tipo de vídeo inválido.');return;}
        if(sala.videosRolagens.has(r.id)){enviar(res,200,{ok:true,duplicado:true});return;}
        try{
          const bytes=await lerVideo(req);
          sala.videosRolagens.set(r.id,{bytes,mime,criadaEm:Date.now()});
          while(sala.videosRolagens.size>LIMITE_VIDEOS){
            sala.videosRolagens.delete(sala.videosRolagens.keys().next().value);
          }
          const evento=`data: ${JSON.stringify({tipo:'video-rolagem',rolagemId:r.id})}\n\n`;
          for(const destino of sala.pessoas.values()){
            if(destino.id===r.participanteId)continue;
            if(r.visibilidade==='mestre'&&destino.papel!=='mestre')continue;
            for(const conexao of destino.conexoes){
              try{conexao.write(evento);}catch{destino.conexoes.delete(conexao);}
            }
          }
          enviar(res,201,{ok:true});
        }catch(e){erro(res,413,e.message||'Gravação inválida.');}
        return;
      }
      const video=sala.videosRolagens.get(r.id);
      if(!video){erro(res,404,'Gravação indisponível.');return;}
      res.writeHead(200,{'Content-Type':video.mime,'Content-Length':video.bytes.length,
        'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      res.end(video.bytes);return;
    }
    if(req.method==='GET' && acao==='eu'){
      enviar(res,200,{codigo:sala.codigo,id:pessoa.id,papel:pessoa.papel,apelido:pessoa.apelido,sala:snapshot(sala)});return;
    }
    if(req.method==='GET' && acao==='mesa'){
      enviar(res,200,{mesa:mesaParaPessoa(sala,pessoa)});return;
    }
    if(req.method==='POST' && acao==='mesa'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Apenas o mestre pode publicar a cena.');return;}
      try{
        const conteudo=await lerJson(req,LIMITE_MESA);
        const proxima=normalizarMesa(conteudo,sala.midias,sala.modelos3D);
        // Atualizações HTTP antigas podem terminar depois das posições novas.
        if(sala.mesa?.cenaId===proxima.cenaId&&proxima.revisao<sala.mesa.revisao){
          enviar(res,200,{ok:true,antiga:true});return;
        }
        sala.mesa=proxima;
        publicarMesa(sala);
        // Confirmações vão SOMENTE para o autor. O mestre sinaliza IDs já
        // incorporados à campanha local; não se publica geometria adicional.
        const idsConfirmados=Array.isArray(conteudo.idsDesenhosConfirmados)
          ?conteudo.idsDesenhosConfirmados.slice(-200):[];
        for(const id of idsConfirmados){
          if(typeof id!=='string')continue;
          const registro=sala.desenhosJogador.get(id);
          if(!registro||registro.confirmado||registro.cenaId!==sala.mesa.cenaId)continue;
          registro.confirmado=true;
          const autor=sala.pessoas.get(registro.pessoaId);
          if(autor){
            const evento=`data: ${JSON.stringify({tipo:'desenho-confirmado',cenaId:registro.cenaId,id})}\n\n`;
            for(const conexao of autor.conexoes){
              try{conexao.write(evento);}catch{autor.conexoes.delete(conexao);}
            }
          }
        }
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Falha ao publicar a cena.');}
      return;
    }
    // Prévia visual do ARRASTO 3D do mestre. Não altera a posição oficial nem
    // publica NPCs ocultos, mapas restritos, colisões ou dados de campanha.
    if(req.method==='POST' && acao==='previa-3d'){
      if(pessoa.papel!=='mestre'){erro(res,403,'A prévia 3D é exclusiva do mestre.');return;}
      if(!sala.mesa||sala.mesa.visibilidade!=='total'){
        erro(res,409,'A cena não permite prévias públicas.');return;
      }
      try{
        const corpo=await lerJson(req,1600);
        if(corpo?.cenaId!==sala.mesa.cenaId){erro(res,409,'Cena diferente da publicada.');return;}
        const token=sala.mesa.tokens.find(t=>t.id===corpo?.id);
        if(!token||!['jogador','npc','inimigo'].includes(token.tipo)||
          typeof corpo.x!=='number'||typeof corpo.y!=='number'||
          !Number.isFinite(corpo.x)||!Number.isFinite(corpo.y)||
          corpo.x<0||corpo.x>100||corpo.y<0||corpo.y>100||
          typeof corpo.final!=='boolean'){
          erro(res,400,'Token ou posição não pública.');return;
        }
        const agora=Date.now();
        if(!corpo.final&&agora-(pessoa.ultimaPrevia3D||0)<16){
          enviar(res,200,{ok:true,descartado:true});return;
        }
        pessoa.ultimaPrevia3D=agora;
        sala.sequenciasArrasto??=new Map();
        const sequencia=(sala.sequenciasArrasto.get(token.id)||0)+1;
        sala.sequenciasArrasto.set(token.id,sequencia);
        const mensagem=`data: ${JSON.stringify({tipo:'arrasto-token',cenaId:sala.mesa.cenaId,
          id:token.id,x:corpo.x,y:corpo.y,final:corpo.final,sequencia})}\n\n`;
        for(const destino of sala.pessoas.values()){
          if(destino.papel!=='convidado')continue;
          for(const conexao of destino.conexoes){
            try{conexao.write(mensagem);}catch{destino.conexoes.delete(conexao);}
          }
        }
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Falha na prévia 3D.');}
      return;
    }
    if(req.method==='POST' && acao==='ambiente'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Apenas o mestre pode alterar o ambiente.');return;}
      if(!sala.mesa){erro(res,409,'Publique a cena antes de alterar o ambiente.');return;}
      try{
        const corpo=await lerJson(req,22000);
        if(corpo?.cenaId!==sala.mesa.cenaId){erro(res,409,'A cena foi alterada.');return;}
        const ambiente=normalizarAmbiente(corpo.ambiente,sala.mesa.visibilidade);
        if(!ambiente){erro(res,400,'Ambiente indisponível ou inválido.');return;}
        const revisaoAmbiente=Number.isSafeInteger(corpo.revisaoAmbiente)&&corpo.revisaoAmbiente>=0?
          corpo.revisaoAmbiente:Date.now()*1000;
        if(revisaoAmbiente<(sala.revisaoAmbiente||0)){
          enviar(res,200,{ok:true,antiga:true});return;
        }
        sala.revisaoAmbiente=revisaoAmbiente;
        const periodo=['dia','entardecer','noite'].includes(corpo.periodoDia3D)?corpo.periodoDia3D:undefined;
        sala.mesa.ambiente=ambiente;
        if(periodo&&sala.mesa.cenario3D)sala.mesa.cenario3D.periodoDia=periodo;
        // Evento curto, sem reencaminhar mapa, máscaras individuais ou GLBs.
        for(const destino of sala.pessoas.values()){
          if(destino.papel!=='convidado')continue;
          const evento={tipo:'ambiente-mesa',cenaId:sala.mesa.cenaId,
            ambiente:ambiente?.clima&&sala.mesa.visibilidade==='individual'?{clima:ambiente.clima}:ambiente,
            ...(periodo?{periodoDia3D:periodo}:{})};
          const mensagem=`data: ${JSON.stringify(evento)}\n\n`;
          for(const conexao of destino.conexoes){
            try{conexao.write(mensagem);}catch{destino.conexoes.delete(conexao);}
          }
        }
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Não foi possível atualizar o ambiente.');}
      return;
    }
    if(req.method==='POST' && acao==='posicoes'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Apenas o mestre pode mover tokens publicados.');return;}
      if(!sala.mesa||sala.mesa.visibilidade!=='total'){erro(res,409,'Cena não disponível para atualizações leves.');return;}
      try{
        const corpo=await lerJson(req,12000);
        if(corpo?.cenaId!==sala.mesa.cenaId){erro(res,409,'A cena foi alterada.');return;}
        if(!Number.isSafeInteger(corpo.revisao)||corpo.revisao<0||
          !Array.isArray(corpo.posicoes)||corpo.posicoes.length>60){erro(res,400,'Posições inválidas.');return;}
        if(corpo.revisao<sala.mesa.revisao){enviar(res,200,{ok:true,antiga:true});return;}
        const permitidos=new Map(sala.mesa.tokens.map(token=>[token.id,token]));
        const alteracoes=[];
        for(const valor of corpo.posicoes){
          const id=padrao(valor?.id,120);
          const token=permitidos.get(id),x=valor?.x,y=valor?.y;
          if(!token||typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y)||
            x<0||x>100||y<0||y>100)continue;
          if(token.x===x&&token.y===y)continue;
          token.x=x;token.y=y;
          alteracoes.push({id,x,y});
        }
        sala.mesa.revisao=corpo.revisao;
        // Enviar APENAS deltas de tokens já publicados: não enviar mapas,
        // personagens novos, NPCs ocultos ou recortes individuais.
        if(alteracoes.length){
          const mensagem=`data: ${JSON.stringify({tipo:'posicoes-tokens',cenaId:sala.mesa.cenaId,
            revisao:corpo.revisao,posicoes:alteracoes})}\n\n`;
          for(const destino of sala.pessoas.values()){
            if(destino.papel!=='convidado')continue;
            for(const conexao of destino.conexoes){
              try{conexao.write(mensagem);}catch{destino.conexoes.delete(conexao);}
            }
          }
        }
        enviar(res,200,{ok:true,alterados:alteracoes.length});
      }catch(e){erro(res,400,e.message||'Falha ao atualizar posições.');}
      return;
    }
    if(req.method==='POST' && acao==='desenho'){
      if(pessoa.papel!=='convidado'||!sala.mesa){erro(res,403,'Somente convidados em uma cena publicada podem desenhar.');return;}
      if(sala.mesa.permitirDesenhoJogadores===false){erro(res,403,'O mestre desativou o desenho dos jogadores nesta cena.');return;}
      if(sala.mesa.visibilidade==='restrita'){erro(res,403,'Desenho indisponível em cena completamente restrita.');return;}
      if(sala.mesa.visibilidade==='individual' &&
        (!pessoa.personagemId||!sala.mesa.vistas.some(v=>v.personagemId===pessoa.personagemId&&(v.imagem||(sala.mesa.cenario3D&&v.mascara3D))))){
        erro(res,403,'Aguarde o mestre atribuir seu personagem e publicar sua visão.');return;
      }
      try{
        const corpo=await lerJson(req,14_000);
        if(corpo?.cenaId!==sala.mesa.cenaId){erro(res,409,'A cena foi alterada.');return;}
        if(corpo.acao==='remover'){
          const id=padrao(corpo.id,100),registrado=sala.desenhosJogador.get(id);
          if(!registrado||registrado.pessoaId!==pessoa.id||registrado.cenaId!==sala.mesa.cenaId){
            erro(res,403,'Você só pode apagar seus próprios desenhos desta cena.');return;
          }
          if(![...sala.controladores].some(conexao=>!conexao.writableEnded)){erro(res,503,'O editor do mestre não está disponível para salvar o desenho.');return;}
          sala.desenhosJogador.delete(id);
          publicarSomenteControlador(sala,{tipo:'desenho-jogador',acao:'remover',id,cenaId:sala.mesa.cenaId});
          enviar(res,200,{ok:true});return;
        }
        if(corpo.acao!=='adicionar'){erro(res,400,'Ação de desenho inválida.');return;}
        if(Date.now()-(pessoa.ultimoDesenhoEm||0)<INTERVALO_DESENHO_MS){erro(res,429,'Aguarde antes de enviar outro desenho.');return;}
        const pontosOriginais=corpo.pontos;
        if(!Array.isArray(pontosOriginais)||pontosOriginais.length<1||pontosOriginais.length>180||
          !pontosOriginais.every(pt=>pt&&Number.isFinite(pt.x)&&Number.isFinite(pt.y)&&pt.x>=0&&pt.x<=100&&pt.y>=0&&pt.y<=100)){
          erro(res,400,'O traço precisa permanecer dentro dos limites do mapa.');return;
        }
        const cor=typeof corpo.cor==='string'&&/^#[0-9a-f]{6}$/i.test(corpo.cor)?corpo.cor:'#f1bb78';
        const espessura=Number.isFinite(corpo.espessura)?Math.min(12,Math.max(1,corpo.espessura)):3;
        const pontos=pontosOriginais.map(pt=>({x:Math.round(pt.x*100)/100,y:Math.round(pt.y*100)/100}));
        const traco={id:`jogador-${randomUUID()}`,pontos,cor,espessura};
        if(![...sala.controladores].some(conexao=>!conexao.writableEnded)){erro(res,503,'O editor do mestre não está disponível para salvar o desenho.');return;}
        pessoa.ultimoDesenhoEm=Date.now();
        sala.desenhosJogador.set(traco.id,{pessoaId:pessoa.id,cenaId:sala.mesa.cenaId,traco,confirmado:false});
        while(sala.desenhosJogador.size>LIMITE_DESENHOS_JOGADOR)sala.desenhosJogador.delete(sala.desenhosJogador.keys().next().value);
        // O mestre persiste no próprio arquivo da campanha e republica a mesa.
        // Não transmitir coordenadas a outros convidados: em visão individual
        // os desenhos só aparecem após serem recortados no computador mestre.
        publicarSomenteControlador(sala,{tipo:'desenho-jogador',acao:'adicionar',cenaId:sala.mesa.cenaId,traco});
        enviar(res,201,{ok:true,id:traco.id});
      }catch(e){erro(res,400,e.message||'Não foi possível desenhar.');}
      return;
    }
    if(req.method==='GET' && acao==='diario'){
      if(pessoa.papel!=='convidado'){erro(res,403,'O Diário remoto é exclusivo dos jogadores.');return;}
      enviar(res,200,{paginas:diarioDaPessoa(sala,pessoa)});return;
    }
    if(req.method==='POST' && acao==='diario'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Apenas o mestre publica o Diário.');return;}
      try{
        const corpo=await lerJson(req,LIMITE_DIARIO);
        sala.diario=normalizarDiario(corpo);
        for(const convidado of sala.pessoas.values())publicarDiarioParaPessoa(sala,convidado);
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Falha ao publicar o Diário.');}
      return;
    }
    if(req.method==='GET' && acao==='diario-personagem'){
      if(pessoa.papel==='mestre'){enviar(res,200,{recebidos:entregasParaMestre(sala)});return;}
      // Recupera edições remotas do próprio personagem após uma reconexão.
      enviar(res,200,{proprios:[...sala.diariosRecebidos.values()].filter(r=>r.pessoaId===pessoa.id&&r.personagemId===pessoa.personagemId)
        .map(r=>r.pagina)});return;
    }
    if(req.method==='POST' && acao==='diario-personagem'){
      if(pessoa.papel!=='convidado'||!pessoa.personagemId){erro(res,403,'Atribuição de personagem necessária para compartilhar.');return;}
      try{
        const corpo=await lerJson(req,LIMITE_PAGINA_PERSONAGEM);
        if(corpo?.personagemId && corpo.personagemId!==pessoa.personagemId){erro(res,403,'Personagem atribuído mudou.');return;}
        const pagina=normalizarPaginaEnviada(corpo?.pagina);
        const permissoes=normalizarPermissoesPersonagem(sala,pessoa,corpo?.compartilhadoCom);
        const chave=`${pessoa.id}:${pessoa.personagemId}:${pagina.id}`;
        if(!Object.keys(permissoes).length){sala.diariosRecebidos.delete(chave);publicarDiarios(sala);enviar(res,200,{ok:true});return;}
        if(!sala.diariosRecebidos.has(chave)&&sala.diariosRecebidos.size>=LIMITE_ENTREGAS_DIARIO){erro(res,409,'Limite de documentos compartilhados nesta sala.');return;}
        const anterior=sala.diariosRecebidos.get(chave);
        // Edições remotas mais recentes não podem ser perdidas por uma republicação atrasada.
        if(anterior&&Date.parse(anterior.pagina.atualizadaEm)>Date.parse(pagina.atualizadaEm)){
          anterior.permissoes=permissoes;
        }else{
          sala.diariosRecebidos.set(chave,{id:anterior?.id||randomUUID(),pessoaId:pessoa.id,apelido:pessoa.apelido,
            personagemId:pessoa.personagemId,personagemNome:nomePersonagemAtribuido(sala,pessoa)||'Personagem',
            recebidoEm:new Date().toISOString(),pagina,permissoes});
        }
        publicarDiarios(sala);
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Falha ao compartilhar documento.');}
      return;
    }
    if(req.method==='DELETE' && acao==='diario-personagem'){
      if(pessoa.papel!=='convidado'||!pessoa.personagemId){erro(res,403,'Somente o dono pode revogar o compartilhamento.');return;}
      try{
        const corpo=await lerJson(req);
        if(corpo?.personagemId && corpo.personagemId!==pessoa.personagemId){erro(res,403,'Personagem atribuído mudou.');return;}
        const id=padrao(corpo?.id,120);
        if(!id){erro(res,400,'Documento inválido.');return;}
        sala.diariosRecebidos.delete(`${pessoa.id}:${pessoa.personagemId}:${id}`);
        publicarDiarios(sala);enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message);}
      return;
    }
    if(req.method==='PATCH' && acao==='diario-personagem'){
      try{
        const corpo=await lerJson(req,LIMITE_PAGINA_PERSONAGEM);
        const id=padrao(corpo?.id,140);
        const recebido=[...sala.diariosRecebidos.values()].find(r=>r.id===id);
        if(!recebido){erro(res,404,'Documento compartilhado não encontrado.');return;}
        const acesso=pessoa.papel==='mestre'?recebido.permissoes?.mestre:
          pessoa.personagemId&&pessoa.id!==recebido.pessoaId?recebido.permissoes?.[pessoa.personagemId]:null;
        if(acesso!=='editar'){erro(res,403,'Você não tem permissão para editar este documento.');return;}
        const campos=corpo?.campos;
        if(!campos||typeof campos!=='object'||Array.isArray(campos)||Object.keys(campos).some(k=>!['titulo','conteudo','formato','imagem'].includes(k))){
          erro(res,400,'Somente o conteúdo pode ser editado.');return;
        }
        const novo=normalizarPaginaEnviada({...recebido.pagina,...campos,atualizadaEm:new Date().toISOString()});
        recebido.pagina=novo;recebido.recebidoEm=new Date().toISOString();
        const dono=sala.pessoas.get(recebido.pessoaId);
        if(dono){for(const conexao of dono.conexoes){
          try{conexao.write(`data: ${JSON.stringify({tipo:'diario-pessoal-editado',paginaId:novo.id,campos:{...campos,atualizadaEm:novo.atualizadaEm}})}\n\n`);}catch{dono.conexoes.delete(conexao);}
        }}
        publicarDiarios(sala);enviar(res,200,{ok:true,pagina:novo});
      }catch(e){erro(res,400,e.message||'Não foi possível editar o documento.');}
      return;
    }
    if(req.method==='GET' && acao==='chat'){
      enviar(res,200,{mensagens:mensagensChatVisiveis(sala,pessoa)});return;
    }
    if(req.method==='POST' && acao==='chat'){
      const agora=Date.now();
      if(agora-(pessoa.ultimoChat||0)<INTERVALO_CHAT_MS){erro(res,429,'Aguarde antes de enviar outra mensagem.');return;}
      try{
        const corpo=await lerJson(req,30_000);
        const conteudo=corpo?.texto;
        if(typeof conteudo!=='string'||conteudo.length>LIMITE_TEXTO_CHAT||!conteudo.trim()){
          erro(res,400,`Digite uma mensagem de até ${LIMITE_TEXTO_CHAT} caracteres.`);return;
        }
        const destinoId=corpo?.destinatarioId==null?'':padrao(corpo.destinatarioId,100);
        if(corpo?.destinatarioId!=null&&typeof corpo.destinatarioId!=='string'){
          erro(res,400,'Destinatário inválido.');return;
        }
        if(destinoId && (!sala.pessoas.has(destinoId)||destinoId===pessoa.id)){
          erro(res,400,'Destinatário não está disponível na sala.');return;
        }
        // Somente o mestre autenticado pode falar como NPC/inimigo. A identidade real
        // (autorId) permanece a do mestre, inclusive na filtragem de particulares.
        let persona;
        if(corpo?.persona!==undefined){
          if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre pode falar como NPC.');return;}
          const p=corpo.persona;
          if(!p||typeof p!=='object'||Array.isArray(p)||!['npc','inimigo'].includes(p.tipo)||
             typeof p.id!=='string'||!p.id.trim()||p.id.length>120||
             typeof p.nome!=='string'||!p.nome.trim()||p.nome.length>80){
            erro(res,400,'Identidade de NPC inválida.');return;
          }
          const cor=typeof p.cor==='string'&&/^#[0-9a-f]{6}$/i.test(p.cor)?p.cor:'#a48d68';
          const foto=typeof p.foto==='string'&&p.foto.length<=25_000&&
            /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.foto)?p.foto:undefined;
          persona={id:p.id.trim(),nome:p.nome.trim(),tipo:p.tipo,cor,...(foto?{foto}:{})};
        }
        pessoa.ultimoChat=agora;
        const destino=destinoId?sala.pessoas.get(destinoId):null;
        const mensagem={id:randomUUID(),autorId:pessoa.id,autorNome:nomeExibicaoChat(sala,pessoa),
          texto:conteudo.replace(/\r\n?/g,'\n').trim(),criadaEm:agora,
          ...(pessoa.papel==='convidado'&&pessoa.personagemId?{personagemId:pessoa.personagemId}:{}),
          ...(persona?{persona}:{}),
          ...(destino?{destinatarioId:destino.id,destinatarioNome:nomeExibicaoChat(sala,destino)}:{})};
        sala.chat.push(mensagem);
        if(sala.chat.length>LIMITE_CHAT)sala.chat.splice(0,sala.chat.length-LIMITE_CHAT);
        publicarMensagemChat(sala,mensagem);
        enviar(res,201,{mensagem});
      }catch(e){erro(res,400,e.message||'Não foi possível enviar a mensagem.');}
      return;
    }
    if(req.method==='GET' && acao==='rolagens'){
      enviar(res,200,{rolagens:sala.rolagens.filter(lance=>lance.visibilidade!=='mestre'||pessoa.papel==='mestre'||lance.participanteId===pessoa.id)});return;
    }
    if(req.method==='POST' && acao==='rolar'){
      const agora=Date.now();
      try{
        const corpo=await lerJson(req,LIMITE_ROLAGEM_JSON);
        // O convidado primeiro pede autorização para uma fórmula validada pela ficha.
        // Só depois envia o resultado obtido pelo MESMO Dice Box físico que está vendo.
        // Não existe segunda simulação física nos outros navegadores.
        if(pessoa.papel==='convidado' && corpo.tipo==='cancelar'){
          if(pessoa.rolagemFisicaPendente?.id===corpo.id)pessoa.rolagemFisicaPendente=null;
          enviar(res,200,{ok:true});return;
        }
        if(pessoa.papel==='convidado' && corpo.tipo==='preparar'){
          if(agora-(pessoa.ultimaRolagem||0)<INTERVALO_ROLAGEM_MS){erro(res,429,'Aguarde antes de rolar novamente.');return;}
          if(pessoa.rolagemFisicaPendente && agora-pessoa.rolagemFisicaPendente.criadaEm<25_000){
            erro(res,409,'Finalize a rolagem em andamento antes de iniciar outra.');return;
          }
          const ficha=fichaDaPessoa(sala,pessoa);
          const preparacao=prepararRolagem(ficha,corpo.comando);
          if(preparacao.erro){erro(res,400,preparacao.erro);return;}
          const aparencia=normalizarAparenciaDados(corpo.aparencia,preparacao.dados.faces);
          const id=randomUUID();
          pessoa.rolagemFisicaPendente={id,criadaEm:agora,personagemId:pessoa.personagemId,
            ...preparacao,visibilidade:corpo.visibilidade==='mestre'?'mestre':'publica',aparencia};
          enviar(res,200,{preparacao:{id,formula:preparacao.dados.formula,
            faces:preparacao.dados.faces,quantidade:preparacao.dados.quantidade,
            modificador:preparacao.dados.modificador,acaoNome:preparacao.acaoNome}});return;
        }
        if(corpo.tipo!=='concluir'&&agora-(pessoa.ultimaRolagem||0)<INTERVALO_ROLAGEM_MS){
          erro(res,429,'Aguarde antes de rolar novamente.');return;
        }
        let dados,acaoNome,categoria,valores,personagem,personagemId,origem;
        let aparencia,visibilidadePendente,origemFisicaId;
        if(pessoa.papel==='mestre'){
          // O resultado físico vem do Dice Box do mestre. Apenas a credencial
          // autenticada do host pode publicar faces previamente calculadas.
          if(corpo.tipo!=='mestre'){erro(res,403,'Tipo de rolagem do mestre inválido.');return;}
          dados=interpretarFormula(corpo.formula,false,12);
          if(!dados || !Array.isArray(corpo.dados)||corpo.dados.length!==dados.quantidade ||
            corpo.dados.some(v=>!Number.isInteger(v)||v<1||v>dados.faces)){
            erro(res,400,'As faces informadas não correspondem à fórmula.');return;
          }
          // Não permitir um cliente que não seja o host enviar valores escolhidos.
          valores=[...corpo.dados];
          personagem=padrao(corpo.personagem,90)||'Mestre';
          personagemId='__mestre__';
          acaoNome=padrao(corpo.acaoNome,90)||'Rolagem livre';
          categoria='livre';origem='mestre';
          aparencia=normalizarAparenciaDados(corpo.aparencia,dados.faces);
          const origemId=padrao(corpo.rolagemId,80);
          if(origemId&&sala.rolagens.some(r=>r.origem==='mestre'&&r.origemId===origemId)){
            enviar(res,200,{rolagem:sala.rolagens.find(r=>r.origem==='mestre'&&r.origemId===origemId)});return;
          }
        }else if(corpo.tipo==='concluir'){
          const pendente=pessoa.rolagemFisicaPendente;
          if(!pendente||pendente.id!==corpo.id || agora-pendente.criadaEm>25_000 ||
            pendente.personagemId!==pessoa.personagemId){
            erro(res,409,'Rolagem física expirada ou não autorizada. Inicie outra rolagem.');return;
          }
          dados=pendente.dados;acaoNome=pendente.acaoNome;categoria=pendente.categoria;
          if(!Array.isArray(corpo.dados)||corpo.dados.length!==dados.quantidade||
            corpo.dados.some(v=>!Number.isInteger(v)||v<1||v>dados.faces)){
            erro(res,400,'O Dice Box retornou faces incompatíveis com a fórmula autorizada.');return;
          }
          valores=[...corpo.dados];
          origemFisicaId=pendente.id;
          const ficha=fichaDaPessoa(sala,pessoa);
          if(!ficha){erro(res,409,'O personagem perdeu a ficha durante a rolagem.');return;}
          personagem=ficha.nome;personagemId=pessoa.personagemId;origem='convidado';
          aparencia=pendente.aparencia;visibilidadePendente=pendente.visibilidade;
          // Autoriza exatamente uma conclusão por lançamento, mesmo após reconexão.
          pessoa.rolagemFisicaPendente=null;
        }else{
          // Compatibilidade com clientes das versões anteriores: a rolagem
          // legada ainda usa o sorteio do servidor, mas não é mais a UI padrão.
          if(!fichaDaPessoa(sala,pessoa)){erro(res,400,'Aguarde o mestre atribuir uma ficha ao seu personagem.');return;}
          const preparacao=prepararRolagem(fichaDaPessoa(sala,pessoa),corpo);
          if(preparacao.erro){erro(res,400,preparacao.erro);return;}
          ({dados,acaoNome,categoria}=preparacao);
          valores=Array.from({length:dados.quantidade},()=>randomInt(1,dados.faces+1));
          personagem=fichaDaPessoa(sala,pessoa).nome;
          personagemId=pessoa.personagemId;origem='convidado';
          aparencia=normalizarAparenciaDados(corpo.aparencia,dados.faces);
        }
        pessoa.ultimaRolagem=agora;
        const rolagem={id:randomUUID(),hora:new Date().toISOString(),participante:pessoa.apelido,
          personagemId,personagem,acaoNome,categoria,formula:dados.formula,dados:valores,
          participanteId:pessoa.id,visibilidade:visibilidadePendente??(corpo.visibilidade==='mestre'?'mestre':'publica'),origem,
          ...(origem==='mestre'&&corpo.rolagemId?{origemId:padrao(corpo.rolagemId,80)}:{}),
          ...(origemFisicaId?{origemId:origemFisicaId}:{}),
          ...(aparencia?{aparencia}:{}),
          modificador:dados.modificador,total:valores.reduce((a,b)=>a+b,0)+dados.modificador};
        sala.rolagens.push(rolagem);
        if(sala.rolagens.length>LIMITE_HISTORICO)sala.rolagens.shift();
        const mensagem=`data: ${JSON.stringify({tipo:'rolagem',rolagem})}\n\n`;
        for(const participante of sala.pessoas.values()){
          if(rolagem.visibilidade==='mestre'&&participante.papel!=='mestre'&&participante.id!==pessoa.id)continue;
          for(const conexao of participante.conexoes){
            try{conexao.write(mensagem);}catch{participante.conexoes.delete(conexao);}
          }
        }
        enviar(res,201,{rolagem});
      }catch(e){erro(res,400,e.message||'Não foi possível realizar a rolagem.');}
      return;
    }
    if(req.method==='GET' && acao==='inventario'){
      if(pessoa.papel!=='convidado'){erro(res,403,'Inventário privado exclusivo dos convidados.');return;}
      enviar(res,200,{inventario:inventarioDaPessoa(sala,pessoa)});return;
    }
    if(req.method==='POST' && acao==='inventarios'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Apenas o mestre publica inventários.');return;}
      try{
        const corpo=await lerJson(req,LIMITE_INVENTARIOS);
        sala.inventarios=normalizarInventarios(corpo);
        for(const convidado of sala.pessoas.values())publicarInventarioParaPessoa(sala,convidado);
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Inventários inválidos.');}
      return;
    }
    // Apenas o mestre enxerga a fila, que é recuperada após reconexões.
    if(req.method==='GET' && acao==='pedidos-itens'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre pode consultar pedidos.');return;}
      expirarPedidosItens(sala);
      enviar(res,200,{pedidos:[...sala.pedidosItens.values()].map(p=>detalharPedidoItem(sala,p))});return;
    }
    // Pedidos não alteram o servidor nem o armazenamento do mestre.
    // O controlador da mesa SÓ aplica a ação após aprovação manual do mestre.
    if(req.method==='POST' && acao==='item'){
      if(pessoa.papel!=='convidado'||!pessoa.personagemId){erro(res,403,'É necessário ter um personagem atribuído.');return;}
      if(!sala.controladores.size){erro(res,409,'Abra a mesa do mestre para usar ou transferir itens.');return;}
      const inventario=inventarioDaPessoa(sala,pessoa);
      if(!inventario){erro(res,409,'O inventário ainda não foi publicado pelo mestre.');return;}
      try{
        const corpo=await lerJson(req,800);
        const tipo=corpo?.tipo,itemId=padrao(corpo?.itemId,120);
        if(!['usar','transferir'].includes(tipo)||!itemId){erro(res,400,'Pedido de item inválido.');return;}
        const item=inventario.itens.find(item=>item.id===itemId&&item.quantidade>0);
        if(!item){erro(res,409,'Você não possui esse item.');return;}
        if(tipo==='usar'&&item.categoria==='documento'){erro(res,400,'Documentos são apenas para leitura.');return;}
        const quantidade=tipo==='usar'?1:corpo.quantidade;
        const destinatarioId=tipo==='transferir'?padrao(corpo.destinatarioId,120):null;
        if(!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>item.quantidade||
          (tipo==='transferir'&&(!destinatarioId||destinatarioId===inventario.id||!sala.inventarios.has(destinatarioId)))){
          erro(res,400,'Quantidade ou destinatário inválido.');return;
        }
        const agora=Date.now();
        expirarPedidosItens(sala);
        if([...sala.pedidosItens.values()].some(p=>p.pessoaId===pessoa.id)){
          erro(res,409,'Aguarde a conclusão do seu pedido anterior.');return;
        }
        const pedido={pedidoId:randomUUID(),pessoaId:pessoa.id,personagemId:pessoa.personagemId,
          itemId,operacao:tipo,quantidade,destinatarioId,criadoEm:agora};
        sala.pedidosItens.set(pedido.pedidoId,pedido);
        publicarSomenteControlador(sala,detalharPedidoItem(sala,pedido));
        enviar(res,202,{ok:true,pendente:true,pedidoId:pedido.pedidoId});
      }catch(e){erro(res,400,e.message||'Pedido inválido.');}
      return;
    }
    if(req.method==='POST' && acao==='validar-item'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre autoriza itens.');return;}
      try{
        const corpo=await lerJson(req,300);
        expirarPedidosItens(sala);
        const pedidoId=padrao(corpo?.pedidoId,70),pedido=sala.pedidosItens.get(pedidoId);
        if(!pedido){erro(res,404,'Pedido expirado ou cancelado.');return;}
        if(pedido.iniciadoEm){erro(res,409,'Este pedido já está sendo processado.');return;}
        const convidado=sala.pessoas.get(pedido.pessoaId);
        const inventario=sala.inventarios.get(pedido.personagemId);
        const item=inventario?.itens.find(i=>i.id===pedido.itemId);
        if(convidado?.personagemId!==pedido.personagemId||!item||item.quantidade<pedido.quantidade||
          (pedido.operacao==='transferir'&&!sala.inventarios.has(pedido.destinatarioId))){
          sala.pedidosItens.delete(pedidoId);
          informarResultadoItem(sala,convidado,{pedidoId,ok:false,mensagem:'Pedido desatualizado. Faça uma nova solicitação.'});
          erro(res,409,'Pedido desatualizado.');return;
        }
        // Trava contra aprovações duplicadas antes de alterar a campanha local.
        pedido.iniciadoEm=Date.now();
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Não foi possível autorizar.');}
      return;
    }
    if(req.method==='POST' && acao==='resultado-item'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre confirma uso ou transferência.');return;}
      try{
        const corpo=await lerJson(req,800);
        expirarPedidosItens(sala);
        const pedidoId=padrao(corpo?.pedidoId,70),pedido=sala.pedidosItens.get(pedidoId);
        if(!pedido){erro(res,404,'Pedido não está pendente.');return;}
        if(corpo.ok===true&&!pedido.iniciadoEm){erro(res,409,'O mestre precisa aprovar antes de aplicar o item.');return;}
        sala.pedidosItens.delete(pedidoId);
        const convidado=sala.pessoas.get(pedido.pessoaId);
        informarResultadoItem(sala,convidado,{pedidoId,ok:corpo.ok===true,mensagem:padrao(corpo.mensagem,200)});
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Resposta inválida.');}
      return;
    }
    // Consulta privada: não aceita id escolhido pelo convidado; usa somente
    // o personagem vinculado à credencial temporária pelo mestre.
    if(req.method==='GET' && acao==='ficha'){
      if(pessoa.papel!=='convidado'){erro(res,403,'Somente o convidado consulta sua ficha remota.');return;}
      enviar(res,200,{ficha:fichaDaPessoa(sala,pessoa)});return;
    }
    if(req.method==='POST' && acao==='fichas'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre pode atualizar fichas.');return;}
      try{
        const corpo=await lerJson(req,LIMITE_FICHAS);
        sala.fichas=normalizarFichas(corpo);
        for(const convidado of sala.pessoas.values())publicarFichaParaPessoa(sala,convidado);
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Falha ao publicar fichas.');}
      return;
    }
    // O mestre associa convidados a tokens públicos (um token por convidado).
    // O convidado não pode escolher, trocar nem falsificar seu personagem.
    if(req.method==='POST' && acao==='atribuir'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre pode atribuir personagens.');return;}
      try{
        const corpo=await lerJson(req);
        const pessoaId=padrao(corpo?.pessoaId,100);
        const personagemId=corpo?.personagemId===null?'':padrao(corpo?.personagemId,120);
        const convidado=[...sala.pessoas.values()].find(p=>p.id===pessoaId&&p.papel==='convidado');
        if(!convidado){erro(res,404,'Convidado não encontrado.');return;}
        if(personagemId && !sala.mesa?.tokens.some(t=>t.id===personagemId&&t.tipo==='jogador')){
          erro(res,409,'O token precisa estar visível na cena publicada.');return;
        }
        if(personagemId && [...sala.pessoas.values()].some(p=>p.id!==pessoaId&&p.personagemId===personagemId)){
          erro(res,409,'Este personagem já está atribuído a outro convidado.');return;
        }
        if(convidado.personagemId!==(personagemId||null)){
          for(const [chave,entrada] of sala.diariosRecebidos)if(entrada.pessoaId===convidado.id)sala.diariosRecebidos.delete(chave);
          publicarDiarios(sala);
          for(const [pid,pedido] of sala.pedidosItens)if(pedido.pessoaId===convidado.id){
            sala.pedidosItens.delete(pid);
            informarResultadoItem(sala,convidado,{pedidoId:pid,ok:false,mensagem:'O mestre mudou seu personagem antes de processar o pedido.'});
          }
        }
        convidado.personagemId=personagemId||null;
        preservarIdentidade(sala);
        publicar(sala);
        // Atribuição altera a visão somente do convidado atribuído. Evita
        // retransmitir mapas pesados para toda a sala.
        publicarMesaParaPessoa(sala,convidado);
        publicarFichaParaPessoa(sala,convidado);
        publicarInventarioParaPessoa(sala,convidado);
        publicarDiarioParaPessoa(sala,convidado);
        enviar(res,200,{ok:true,sala:snapshot(sala)});
      }catch(e){erro(res,400,e.message);}
      return;
    }
    // O mestre valida as paredes privadas e informa apenas que o gesto terminou.
    // Nenhuma geometria, localização da colisão ou barreira é compartilhada.
    if(req.method==='POST' && acao==='bloqueio-arrasto'){
      if(pessoa.papel!=='mestre'){erro(res,403,'Somente o mestre pode encerrar um arrasto por colisão.');return;}
      try{
        const corpo=await lerJson(req,1000);
        const gestoId=padrao(corpo?.gestoId,96);
        if(!sala.mesa || corpo?.cenaId!==sala.mesa.cenaId || !/^[a-zA-Z0-9_-]{8,96}$/.test(gestoId)){
          erro(res,400,'Cena ou gesto inválido.');return;
        }
        const alvo=[...sala.pessoas.values()].find(p=>p.papel==='convidado' && p.personagemId===corpo.personagemId);
        if(!alvo){erro(res,404,'Personagem não está atribuído a um jogador.');return;}
        sala.gestosBloqueados??=new Map();
        sala.gestosBloqueados.set(alvo.id,{gestoId,ate:Date.now()+60000});
        const mensagem=`data: ${JSON.stringify({tipo:'arrasto-bloqueado',cenaId:sala.mesa.cenaId,gestoId})}\n\n`;
        for(const conexao of alvo.conexoes){
          try{conexao.write(mensagem);}catch{alvo.conexoes.delete(conexao);}
        }
        enviar(res,200,{ok:true});
      }catch(e){erro(res,400,e.message||'Não foi possível encerrar o arrasto.');}
      return;
    }
    // O servidor valida a permissão e transmite o PEDIDO apenas ao mestre.
    // Somente a mesa do mestre aplica colisões, grade e salva as posições reais.
    if(req.method==='POST' && acao==='mover'){
      if(pessoa.papel!=='convidado'){erro(res,403,'A movimentação remota é exclusiva dos convidados.');return;}
      if(!pessoa.personagemId){erro(res,403,'O mestre ainda não atribuiu um personagem.');return;}
      if(!sala.controladores.size){erro(res,409,'A Mesa 2D/3D do mestre precisa estar aberta para receber movimentos.');return;}
      if(!sala.mesa || !['total','individual'].includes(sala.mesa.visibilidade)){
        erro(res,409,'O movimento não está permitido nesta cena.');return;
      }
      const token=sala.mesa.tokens.find(t=>t.id===pessoa.personagemId&&t.tipo==='jogador');
      if(!token || token.travado || (sala.mesa.visibilidade==='individual' &&
          !sala.mesa.vistas.some(v=>v.personagemId===pessoa.personagemId&&v.tokens.some(t=>t.id===pessoa.personagemId)))){
        erro(res,403,'O token não está disponível para movimentação.');return;
      }
      try{
        const corpo=await lerJson(req);
        const x=corpo?.x,y=corpo?.y;
        if(corpo?.cenaId!==sala.mesa.cenaId || typeof x!=='number'||typeof y!=='number'||
           !Number.isFinite(x)||!Number.isFinite(y)||x<1||x>99||y<1||y>99){
          erro(res,400,'Posição ou cena inválida.');return;
        }
        // Proteção simples contra envio excessivo (mantém a fluidez sem lotar a sala).
        const agora=Date.now();
        if(corpo.final!==true && agora-(pessoa.ultimoMovimento||0)<14){enviar(res,200,{ok:true,descartado:true});return;}
        pessoa.ultimoMovimento=agora;
        const gestoId=typeof corpo.gestoId==='string' && /^[a-zA-Z0-9_-]{8,96}$/.test(corpo.gestoId)
          ?corpo.gestoId:null;
        const bloqueado=sala.gestosBloqueados?.get(pessoa.id);
        if(bloqueado&&bloqueado.ate<Date.now())sala.gestosBloqueados.delete(pessoa.id);
        if(gestoId&&bloqueado?.gestoId===gestoId&&bloqueado.ate>=Date.now()){
          enviar(res,200,{ok:true,bloqueado:true});return;
        }
        // A posição definitiva continua sob responsabilidade do mestre.
        // Em cenas abertas, os demais convidados podem observar o gesto do
        // mouse IMEDIATAMENTE, sem esperar o caminho servidor -> mestre -> servidor.
        // Nunca encaminhar prévias em cenas com visão individual ou restrita.
        if(sala.mesa.visibilidade==='total'){
          sala.sequenciasArrasto??=new Map();
          const sequencia=(sala.sequenciasArrasto.get(pessoa.personagemId)||0)+1;
          sala.sequenciasArrasto.set(pessoa.personagemId,sequencia);
          const previa=`data: ${JSON.stringify({tipo:'arrasto-token',cenaId:sala.mesa.cenaId,
            id:pessoa.personagemId,x,y,final:corpo.final===true,sequencia})}\n\n`;
          for(const destino of sala.pessoas.values()){
            if(destino.papel!=='convidado'||destino.id===pessoa.id)continue;
            for(const conexao of destino.conexoes){
              try{conexao.write(previa);}catch{destino.conexoes.delete(conexao);}
            }
          }
        }
        publicarSomenteMestre(sala,{tipo:'pedido-movimento',cenaId:sala.mesa.cenaId,personagemId:pessoa.personagemId,x,y,...(gestoId?{gestoId}:{})});
        enviar(res,202,{ok:true,pendente:true});
      }catch(e){erro(res,400,e.message);}
      return;
    }
    if(req.method==='GET' && acao==='eventos'){
      res.writeHead(200,{
        'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'no-cache, no-transform',
        'Connection':'keep-alive',
        'X-Accel-Buffering':'no',
        'X-Content-Type-Options':'nosniff',
      });
      res.write(': conectado\n\n');
      conectarEventos(sala,pessoa,res,url.searchParams.get('controlador')==='1');
      return;
    }
    if(req.method==='POST' && acao==='sair' && pessoa.papel==='convidado'){
      for(const conexao of pessoa.conexoes)conexao.end();
      pessoa.conexoes.clear();
      sala.pessoas.delete(pessoa.id);
      for(const [pid,pedido] of sala.pedidosItens)if(pedido.pessoaId===pessoa.id){sala.pedidosItens.delete(pid);informarResultadoItem(sala,pessoa,{pedidoId:pid,ok:false,mensagem:'Participante saiu da sala.'});}
      for(const [chave,entrada] of sala.diariosRecebidos)if(entrada.pessoaId===pessoa.id)sala.diariosRecebidos.delete(chave);
      publicarDiarios(sala);
      preservarIdentidade(sala);
      enviar(res,200,{ok:true});publicar(sala);return;
    }
    if(req.method==='POST' && acao==='encerrar' && pessoa.papel==='mestre'){
      enviar(res,200,{ok:true});encerrarSala(sala);return;
    }
    erro(res,403,'Ação não permitida.');
  });
  // Cloudflare Quick Tunnel não suporta EventSource; canal WebSocket de leitura
  // na mesma origem, autenticado pela credencial que o SSE já utiliza.
  servidor.on('upgrade',(req,socket,head)=>{
    let url;
    try{url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{return recusarWebSocket(socket,400);}
    const match=url.pathname.match(/^\/api\/multiplayer\/salas\/([A-Z2-9]{8})\/eventos-ws$/);
    if(!match)return recusarWebSocket(socket,404);
    // Bloqueia WebSocket de páginas de outra origem (cross-site hijacking).
    const origem=req.headers.origin;
    try{
      if(!origemSegura(origem,req.headers.host||''))return recusarWebSocket(socket,403);
    }catch{return recusarWebSocket(socket,403);}
    const sala=salas.get(match[1]);
    const pessoa=sala&&encontrarPessoa(sala,url.searchParams.get('token'));
    if(!sala||!pessoa)return recusarWebSocket(socket,401);
    const conexao=aceitarWebSocket(req,socket,head);
    if(!conexao)return;
    sala.ultimaAtividade=Date.now();
    conectarEventos(sala,pessoa,conexao,url.searchParams.get('controlador')==='1');
  });
  manutencao=setInterval(()=>{
    const agora=Date.now();
    for(const sala of salas.values()){
      expirarPedidosItens(sala);
      for(const [id,v] of sala.videosRolagens)if(agora-v.criadaEm>10*60_000)sala.videosRolagens.delete(id);
      if(agora-sala.ultimaAtividade>7*24*60*60*1000)encerrarSala(sala);
    }
  },10_000);
  manutencao.unref?.();
  return {
    servidor,
    escutar(porta=8787,host='127.0.0.1'){
      return new Promise((resolve,reject)=>{
        servidor.once('error',reject);
        servidor.listen(porta,host,()=>{servidor.off('error',reject);resolve(servidor.address());});
      });
    },
    async fechar(){
      clearInterval(manutencao);
      // Fechar o processo NÃO é a ação administrativa "Encerrar sala".
      // Convidados recebem a desconexão SSE e preservam as credenciais.
      persistencia?.descarregar(salas.values());
      for(const sala of salas.values())for(const pessoa of sala.pessoas.values()){
        for(const conexao of pessoa.conexoes){try{conexao.end();}catch{/* encerrando */}}
        pessoa.conexoes.clear();
      }
      await new Promise((resolve,reject)=>servidor.close(e=>e?reject(e):resolve()));
    },
  };
}

if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const app=criarAplicacaoMultiplayer({
    diretorioPersistencia:resolve(process.cwd(),'.portal-multiplayer-sessoes'),
    diretorioPublico:process.env.PORTAL_SERVIR_SITE==='1'?resolve(process.cwd(),'dist'):null,
  });
  let encerrando=false;
  const parar=()=>{
    if(encerrando)return;encerrando=true;
    void app.fechar().then(()=>{process.exitCode=0;}).catch(e=>{
      console.error('[Portal] Falha ao encerrar:',e);process.exitCode=1;
    });
  };
  process.once('SIGINT',parar);
  process.once('SIGTERM',parar);
  const porta=Number(process.env.PORTAL_MULTIPLAYER_PORT)||8787;
  app.escutar(porta).then(()=>{
    console.log(`[Portal multiplayer - etapa 8] Servidor local em http://127.0.0.1:${porta}`);
    console.log('Use npm run dev:multiplayer para iniciar a interface e o servidor juntos.');
  }).catch(e=>{console.error('Falha ao iniciar multiplayer:',e.message);process.exitCode=1;});
}
