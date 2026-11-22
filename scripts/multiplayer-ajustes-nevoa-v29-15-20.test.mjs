import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const codigo=arquivo=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');

test('v29.15.20: alternar Fog não força o convidado da Mesa 3D para 2D',()=>{
 const s=codigo('multiplayer/MesaConvidado2D.tsx');
 assert.match(s,/setVisualizacao\(modoMestre==='3d'\?'3d':'2d'\)/);
 assert.doesNotMatch(s,/setVisualizacao\(modoMestre==='3d'&&mesa\?\.visibilidade==='total'/);
 assert.match(s,/\[mesa\?\.cenaId\]/);
 assert.match(s,/Boolean\(mesa\?\.cenario3D\)/);
});

test('v29.15.20: publicação de recortes individuais espera o processamento concluir',()=>{
 const s=codigo('multiplayer/PublicadorMesa.tsx');
 assert.match(s,/if\(modoVisao&&!vistaDaCenaPronta\)return;/);
 assert.match(s,/\[assinaturaEstrutura,campanhaId,revisaoSala,modoVisao,vistaDaCenaPronta,modoMesa\]/);
 assert.match(s,/vistasProntas\?\.assinatura===assinaturaVisao\?vistasProntas.vistas:\[\]/);
 assert.match(s,/visibilidade:cena.visibilidade==='total'\?'total':modoVisao\?'individual':'restrita'/);
});

test('v29.15.20: névoa manual é publicada como recorte censurado, sem imagem original',()=>{
 const pub=codigo('multiplayer/PublicadorMesa.tsx');
 const vista=codigo('multiplayer/visaoIndividualPublicada.ts');
 assert.match(pub,/\['nevoa','visao','nevoa_visao','exploracao'\]/);
 assert.match(vista,/const manualPuro=args.modo==='nevoa'/);
 assert.match(vista,/manualPuro\?new Uint8Array\(TOTAL_FOG\)/);
 assert.match(vista,/ctxConteudo.globalCompositeOperation='destination-in'/);
 assert.match(vista,/serializarRecorteSeguro\(canvas\)/);
 assert.match(vista,/liberadoPelosPinceis\(.+!manualPuro\)/);
 assert.doesNotMatch(pub,/imagem:cena.visibilidade==='nevoa'\?imagemPublicada/);
});

test('v29.15.20: pincel tem raio percentual e permite revelar/cobrir na Mesa 3D',()=>{
 const vista=codigo('multiplayer/visaoIndividualPublicada.ts');
 const mestre=codigo('mesa3d/Mesa3DPrototipo.tsx');
 const app=codigo('App.tsx');
 const pincelCompartilhado=codigo('multiplayer/pinceisVisao3D.ts');
 assert.match(vista,/import \{liberadoPelosPinceis\} from '\.\/pinceisVisao3D'/);
 assert.match(pincelCompartilhado,/normalizado=\{x:p.x\/largura\*100,y:p.y\/altura\*100\}/);
 assert.match(vista,/ctx.scale\(largura\/100,altura\/100\)/);
 assert.match(mestre,/\['nevoa','nevoa_visao','exploracao'\]\.includes\(cenaAtual\?\.visibilidade\|\|''\)/);
 assert.match(mestre,/manualSomente:cena\?\.visibilidade==='nevoa'/);
 assert.match(app,/\['nevoa','nevoa_visao','exploracao'\]\.includes\(cenaAtual.visibilidade\)/);
});

test('v29.15.20: névoa manual do mestre usa a mesma máscara segura do renderizador 3D',()=>{
 const s=codigo('mesa3d/roomScene.ts');
 assert.match(s,/fog\.manualSomente\?new Uint8Array\(COLUNAS_FOG\*LINHAS_FOG\)/);
 assert.match(s,/mapaEstadosFog\(fog.memoria,idsFog,visiveisFog,fog.pinceis\)/);
 const servidor=readFileSync(new URL('./multiplayer-server.mjs',import.meta.url),'utf8');
 assert.match(servidor,/vista\.objetos3DVisiveis\.includes\(o.id\)/);
 assert.match(servidor,/vista\.miniaturas3DVisiveis\.includes\(m.id\)/);
});
