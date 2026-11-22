import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comporRecorteFogComoJogador3D} from '../src/mesa3d/recorteFogComoJogador3D.mjs';
const ler=(p)=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('v29.15.30.9: compõe arte e máscara na mesma dimensão sem projeção secundária',()=>{
  const chamadas=[];
  const mapa={id:'mapa'},mascara={id:'mascara'};
  const ctx={globalCompositeOperation:'',globalAlpha:0,
    save(){chamadas.push('save');},restore(){chamadas.push('restore');},
    clearRect(...args){chamadas.push(['clear',...args]);},
    drawImage(...args){chamadas.push(['draw',...args]);}};
  assert.equal(comporRecorteFogComoJogador3D(ctx,mapa,mascara,800,450),true);
  assert.deepEqual(chamadas,[ 'save',['clear',0,0,800,450],
    ['draw',mapa,0,0,800,450],['draw',mascara,0,0,800,450],'restore']);
  assert.equal(comporRecorteFogComoJogador3D(ctx,mapa,mascara,-1,450),false);
});

test('v29.15.30.9: restaura o contexto mesmo diante de imagem indisponível',()=>{
  let saves=0,restores=0;
  const ctx={save(){saves++},restore(){restores++},clearRect(){},
    drawImage(){throw new Error('Imagem indisponível')}};
  assert.throws(()=>comporRecorteFogComoJogador3D(ctx,{}, {},800,450));
  assert.equal(saves,restores);
});

test('v29.15.30.9: prévia modifica só o piso e nunca usa duas máscaras em camadas',()=>{
  const s=ler('mesa3d/roomScene.ts');
  const recorte=s.slice(s.indexOf('const comporFogNoPisoDoMestre='),s.indexOf('let visaoObservadorId:'));
  assert.match(recorte,/texturaPreviaFogMestre\.needsUpdate=true/);
  assert.match(recorte,/plantaMaterial\.map=texturaPreviaFogMestre/);
  assert.doesNotMatch(recorte,/malhaVisao\.visible=true/);
  const previa=s.slice(s.indexOf('const configurarVisaoIndividual='),s.indexOf('// Moldura discreta'));
  assert.match(previa,/if\(previewNoPiso\)malhaVisao\.visible=false/);
  assert.match(previa,/if\(!tokenObservado&&!fog\?\.ativo\)restaurarTexturaPisoAposObservar\(\)/);
  assert.match(previa,/camadaMiniaturas\.configurarFiltroPersonagensVisiveis/);
  const convidado=ler('multiplayer/MesaConvidado3D.tsx');
  assert.match(convidado,/sala\.configurarFogPublicado3D/);
  assert.match(convidado,/sala\.atualizarPisoRecorte\(blob\)/);
});

test('v29.15.30.9: proteção do convidado segue intacta',()=>{
  const gerador=ler('multiplayer/visaoIndividualPublicada.ts');
  assert.match(gerador,/ctx\.fillStyle='#050913'/);
  assert.match(gerador,/serializarRecorteSeguro\(canvas\)/);
});
