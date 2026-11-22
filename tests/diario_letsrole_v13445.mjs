import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 criarPaginaDiario,normalizarPaginasDiario,aplicarOperacaoDiario,permissaoEfetivaDiario,
 conteudosCompartilhadosDiario,normalizarPermissoesDiario,MAX_IMAGEM_DIARIO,exportarDiarioMarkdown
} from '../src/hexatombe/registrosDiario.ts';
const fonte=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('anotações antigas são preservadas como notas da biblioteca',()=>{
 const v=normalizarPaginasDiario(undefined,'Texto do mestre');
 assert.equal(v.length,1);assert.equal(v[0].tipo,'nota');assert.equal(v[0].conteudo,'Texto do mestre');
 assert.deepEqual(normalizarPaginasDiario(v,'Texto do mestre'),v);
});
test('biblioteca cria pastas e mantém os documentos ao excluir uma pasta',()=>{
 const pasta={...criarPaginaDiario('Lore'),tipo:'pasta'};
 const nota={...criarPaginaDiario('Segredo'),pastaId:pasta.id};
 let v=aplicarOperacaoDiario([],{tipo:'criar',pagina:pasta});
 v=aplicarOperacaoDiario(v,{tipo:'criar',pagina:nota});
 assert.equal(v[1].pastaId,pasta.id);
 v=aplicarOperacaoDiario(v,{tipo:'excluir',id:pasta.id});
 assert.equal(v.length,1);assert.equal(v[0].id,nota.id);assert.equal(v[0].pastaId,'');
});
test('permissão por personagem: ver, editar e compartilhar pastas com seus documentos',()=>{
 const pasta={...criarPaginaDiario('História'),tipo:'pasta',compartilhadoCom:{morgana:'ver'}};
 const a={...criarPaginaDiario('Mapa'),pastaId:pasta.id};
 const b={...criarPaginaDiario('Segredo'),compartilhadoCom:{naeris:'editar'}};
 let paginas=[pasta,a,b];
 assert.equal(permissaoEfetivaDiario(a,paginas,'morgana'),'ver');
 assert.deepEqual(conteudosCompartilhadosDiario(paginas,'morgana').map(p=>p.id),[pasta.id,a.id]);
 assert.deepEqual(conteudosCompartilhadosDiario(paginas,'naeris').map(p=>p.id),[b.id]);
 paginas=aplicarOperacaoDiario(paginas,{tipo:'alterar',id:a.id,campos:{compartilhadoCom:{morgana:'editar'}}});
 assert.equal(permissaoEfetivaDiario(paginas[1],paginas,'morgana'),'editar');
});
test('permissões inválidas e imagens inseguras não entram no armazenamento',()=>{
 assert.deepEqual(normalizarPermissoesDiario({a:'ver',b:'editar',c:'admin',d:42}),{a:'ver',b:'editar'});
 const pagina=criarPaginaDiario('Imagem');
 const v=normalizarPaginasDiario([{...pagina,tipo:'imagem',imagem:'data:image/svg+xml;base64,PHN2Zz4='}]);
 assert.equal(v[0].imagem,'');
 const segura='data:image/png;base64,'+'a'.repeat(512);
 assert.equal(normalizarPaginasDiario([{...pagina,imagem:segura}])[0].imagem,segura);
 assert.equal(normalizarPaginasDiario([{...pagina,imagem:'data:image/png;base64,'+'a'.repeat(MAX_IMAGEM_DIARIO)}])[0].imagem,'');
});
test('editor mantém notas rich text e exportação não embute imagens pesadas',()=>{
 const p={...criarPaginaDiario('Panfleto'),tipo:'imagem',imagem:'data:image/png;base64,AAAA',formato:'html',conteudo:'<h2>Verdade</h2><p>Uma pista</p>'};
 const v=normalizarPaginasDiario([p]);assert.equal(v[0].formato,'html');
 const md=exportarDiarioMarkdown(v,'Portal');
 assert.match(md,/Verdade/);assert.match(md,/Uma pista/);assert.doesNotMatch(md,/data:image\/png/);
});
test('o mesmo Diário em 2D/3D recebe personagens e o modo biblioteca do vídeo',()=>{
 const app=fonte('App.tsx'),mesa=fonte('mesa3d/Mesa3DPrototipo.tsx'),componente=fonte('hexatombe/DiarioCampanha.tsx');
 assert.match(app,/<DiarioCampanha paginas=\{campanha.paginasDiario\}/);
 assert.match(mesa,/<DiarioCampanha compacto paginas=\{paginasDiario3D\}/);
 assert.match(app,/personagens=\{campanha\.unidades/);
 assert.match(mesa,/personagens=\{estado\.unidades/);
 for(const texto of ['Meu conteúdo','Compartilhado comigo','Visualizar','Editar','Compartilhar','createPortal','contentEditable','prepararImagem'])assert.ok(componente.includes(texto),texto);
});
