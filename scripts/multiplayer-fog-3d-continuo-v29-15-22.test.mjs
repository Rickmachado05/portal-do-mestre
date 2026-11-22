import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');
const servidor=readFileSync(new URL('./multiplayer-server.mjs',import.meta.url),'utf8');

test('29.15.22: processamento de recorte contínuo não depende de 180 ms sem movimento',()=>{
  const src=ler('multiplayer/PublicadorMesa.tsx');
  assert.match(src,/window\.setInterval\(\(\)=>\{void publicar\(\);\},95\)/);
  assert.match(src,/await gerarVistasIndividuais\(parametros\)/);
  assert.match(src,/if\(modoVisao\)return/);
  assert.match(src,/emVoo=true/);
  assert.match(src,/revisaoEnviada=Math\.max\(quadro\.revisao,ultimaRevisaoVisao3DRef\.current\+1\)/);
});

test('29.15.22: arrasto e caminhada 3D do mestre alimentam a visão do convidado sem broadcast bruto',()=>{
  const mestre=ler('mesa3d/Mesa3DPrototipo.tsx');
  const pub=ler('multiplayer/PublicadorMesa.tsx');
  assert.match(mestre,/enviarPreviaToken\(idRef\.current,candidato\)/);
  assert.match(mestre,/\['total','nevoa','visao','nevoa_visao','exploracao'\]\.includes/);
  assert.match(pub,/window\.addEventListener\('portal-mp-previa-token-3d',receber\)/);
  assert.match(pub,/!visao3DRef\.current\.publico\.tokens\.some\(t=>t\.id===valor\.id&&t\.tipo==='jogador'\)/);
  assert.match(pub,/observadores:quadro\.parametros\.observadores\.map/);
  assert.match(pub,/tokens:quadro\.publico\.tokens\.map/);
  assert.match(pub,/if\(quadro\.politica!==visao3DRef\.current\.politica\)return/);
});

test('29.15.22: as imagens enviadas permanecem censuradas pelo mestre, por observador',()=>{
  const pub=ler('multiplayer/PublicadorMesa.tsx');
  const vista=ler('multiplayer/visaoIndividualPublicada.ts');
  assert.match(pub,/visibilidade:'restrita' as const,imagem:null/);
  assert.match(pub,/body:JSON\.stringify\(\{\.\.\.publico,vistas/);
  assert.match(vista,/ctx\.fillStyle='#050913'/);
  assert.match(vista,/ctx\.clip\(\)/);
  assert.match(vista,/serializarRecorteSeguro\(canvas\)/);
  assert.match(servidor,/vista\.objetos3DVisiveis\.includes\(o\.id\)/);
  assert.match(servidor,/vista\.miniaturas3DVisiveis\.includes\(m\.id\)/);
});

test('29.15.22: uma única textura Canvas 3D evita recriar piso a cada passo',()=>{
  const cena=ler('mesa3d/roomScene.ts');
  assert.match(cena,/const atualizarPisoRecorte=async\(blob:Blob\)/);
  assert.match(cena,/texturaPisoPublicado=new THREE\.CanvasTexture\(telaPisoPublicado\)/);
  assert.match(cena,/texturaPisoPublicado\.needsUpdate=true/);
  assert.match(cena,/atualizarPisoRecorte,visualizarObjeto/);
});
