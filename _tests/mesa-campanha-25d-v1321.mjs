import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizarEstadoMesa25D,dimensoesMapa,posicaoPct,posicaoMundo,moverTokenMesa25D, salvarPosicaoToken25D, nevoaReveladaNoPonto, dentroPoligono,skinDoToken25D} from '../src/exploracao/mesa25dData.ts';
const cena={id:'cena-1',nome:'Floresta',temMapa:true,camadas:{fundo:true,tokens:true},visibilidade:'nevoa_visao',nevoa:[{id:'a',acao:'revelar',raio:8,pontos:[{x:50,y:50}]}],tokens:{hero:{x:50,y:50,tamanho:72,rotacao:0,oculto:false,visao:20}},barreiras:[{id:'wall',tipo:'parede',x1:60,y1:20,x2:60,y2:80,aberta:false,trancada:false}],fontesLuz:[{id:'light',x:40,y:45,alcance:30,cor:'#abcdef',ativa:true}],iluminacao:{ativa:true,ambiente:20,colisao:true},clima:{tipo:'chuva',intensidade:65,vento:55,direcao:95}};
const estado={titulo:'Hexatombe',cenaAtivaId:'cena-1',unidades:[{id:'hero',nome:'Morgana',tipo:'jogador',cor:'#abcdef',temToken:true,skins:[{id:'battle',nome:'Combate'}],skinPadraoId:'battle'}],cenas:[cena]};
test('v1.3.21: a cena reaproveita mapa, clima, luzes, barreiras, skins e nevoa',()=>{
  const e=normalizarEstadoMesa25D(estado), c=e.cenas[0];
  assert.equal(c.temMapa,true);assert.equal(c.clima.tipo,'chuva');assert.equal(c.fontesLuz[0].cor,'#abcdef');
  assert.equal(c.iluminacao.ambiente,20);assert.equal(c.barreiras.length,1);
  assert.equal(c.nevoa.length,1);assert.equal(skinDoToken25D(e.unidades[0],c.tokens.hero),'battle');
});
test('coordenadas do token se mantém entre a mesa 2D e a projeção 2.5D',()=>{
  const dim=dimensoesMapa(1600,900);
  for(const p of [{x:0,y:0},{x:50,y:50},{x:83.5,y:79.2},{x:100,y:100}]){
    const world=posicaoMundo(p,dim),back=posicaoPct(world,dim);
    assert.ok(Math.abs(back.x-p.x)<1e-10);assert.ok(Math.abs(back.y-p.y)<1e-10);
  }
  assert.ok(Math.abs(dim.altura/28-900/1600)<.00001);
});
test('paredes e portas fechadas bloqueiam passagem; portas abertas não',()=>{
  const e=normalizarEstadoMesa25D(estado),dim=dimensoesMapa(1600,900);
  let p={x:59,y:50};
  p=moverTokenMesa25D(p,2,0,e.cenas[0],dim);assert.equal(p.x,59);
  e.cenas[0].barreiras[0].tipo='porta';e.cenas[0].barreiras[0].aberta=true;
  p=moverTokenMesa25D(p,2,0,e.cenas[0],dim);assert.ok(p.x>60);
});
test('movimento não atravessa bordas',()=>{
  const c=normalizarEstadoMesa25D(estado).cenas[0],dim=dimensoesMapa(1600,900);
  assert.equal(moverTokenMesa25D({x:1,y:50},-30,0,c,dim).x,1);
});
test('camadas de névoa preservam regiões abertas e áreas não reveladas',()=>{
  const c=normalizarEstadoMesa25D(estado).cenas[0];
  assert.equal(nevoaReveladaNoPonto(c,{x:50,y:50}),true);
  assert.equal(nevoaReveladaNoPonto(c,{x:95,y:95}),false);
  const p=[{x:10,y:10},{x:70,y:10},{x:70,y:70},{x:10,y:70}];
  assert.ok(dentroPoligono({x:50,y:50},p));assert.equal(dentroPoligono({x:90,y:90},p),false);
});
test('salvar posição altera somente o token na cena escolhida',()=>{
  const state={...estado,diario:'não tocar',cenas:[JSON.parse(JSON.stringify(cena)),{id:'cena-2',tokens:{hero:{x:80,y:80}},nevoa:[]}]};
  const mem=new Map([['hexatombe-mesa-v2:camp-teste',JSON.stringify(state)]]);
  const store={getItem:(k)=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
  assert.equal(salvarPosicaoToken25D('camp-teste','cena-1','hero',{x:55,y:57},store),true);
  const after=JSON.parse(mem.get('hexatombe-mesa-v2:camp-teste'));
  assert.equal(after.cenas[0].tokens.hero.x,55);assert.equal(after.cenas[1].tokens.hero.x,80);
  assert.equal(after.diario,'não tocar');assert.deepEqual(after.cenas[0].nevoa,cena.nevoa);
  assert.equal(salvarPosicaoToken25D('camp-teste','cena-1','desconhecido',{x:0,y:0},store),false);
  after.cenas[0].tokens.hero.travado=true;mem.set('hexatombe-mesa-v2:camp-teste',JSON.stringify(after));
  assert.equal(salvarPosicaoToken25D('camp-teste','cena-1','hero',{x:1,y:1},store),false);
});
test('cenas antigas e estado ausente têm valores padrão seguros',()=>{
  const c=normalizarEstadoMesa25D({cenas:[{id:'a',nome:'Antigo',tokens:{}}]}).cenas[0];
  assert.equal(c.visibilidade,'total');assert.equal(c.clima.tipo,'nenhum');assert.deepEqual(c.barreiras,[]);
  assert.deepEqual(normalizarEstadoMesa25D(null).cenas,[]);
});

test('a interface da mesa não oferece interagir, reiniciar posição ou diálogos do laboratório',async()=>{
  const {readFile}=await import('node:fs/promises');
  const src=await readFile(new URL('../src/exploracao/Exploracao25D.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(src, /KeyE|KeyR|Reiniciar posição|exp-dialog-backdrop|exp-interact/);
  assert.match(src, /WeatherLayer/);assert.match(src, /moverTokenMesa25D/);
});
