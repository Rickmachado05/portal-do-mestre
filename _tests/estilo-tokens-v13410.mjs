import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aparenciaTokenAtiva,normalizarAparenciaToken,corFundoToken} from '../src/lib/aparenciaToken.ts';
import {normalizarEstadoCompartilhado} from '../src/lib/mesaCompartilhada.ts';
const fonte=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('legado: aro herda cor da unidade e fundo cinza/preto',()=>{
  assert.deepEqual(aparenciaTokenAtiva({cor:'#aabbcc'}),{corBorda:'#aabbcc',fundo:'escuro',corFundo:'#22252d'});
  assert.equal(corFundoToken(normalizarAparenciaToken()),'#22252d');
});
test('validação de cores rejeita CSS e valores inválidos',()=>{
  assert.equal(normalizarAparenciaToken({corBorda:'red',fundo:'transparente',corFundo:'url(bad)'}).corBorda,'#b99570');
  assert.equal(normalizarAparenciaToken({corBorda:'#ABCDEF',fundo:'personalizado',corFundo:'#ABCDEF'}).corBorda,'#abcdef');
});
test('cada skin herda ou preserva seu próprio aro e fundo',()=>{
  const u={cor:'#adeabb',tokenAparencia:{corBorda:'#112233',fundo:'transparente',corFundo:'#445566'},skinPadraoId:'fogo',
    skins:[{id:'fogo',nome:'Fogo',aparencia:{corBorda:'#ff0000',fundo:'personalizado',corFundo:'#333333'}},{id:'agua',nome:'Água'}]};
  assert.equal(aparenciaTokenAtiva(u).corBorda,'#ff0000');
  assert.equal(aparenciaTokenAtiva(u,{skinId:'original'}).fundo,'transparente');
  assert.equal(aparenciaTokenAtiva(u,{skinId:'agua'}).corBorda,'#adeabb');
  assert.equal(aparenciaTokenAtiva(u,{skinId:'fogo'}).corFundo,'#333333');
  assert.equal(aparenciaTokenAtiva(u,{skinId:'fogo'}).fundo,'personalizado');
});
test('normalizador da mesa 3D conserva a aparência mesmo em cenas distintas',()=>{
  const u={id:'ana',nome:'Ana',cor:'#ff00aa',tokenAparencia:{corBorda:'#001122',fundo:'transparente',corFundo:'#333333'},
    skins:[{id:'espada',nome:'Espada',aparencia:{corBorda:'#eeddcc',fundo:'personalizado',corFundo:'#010101'}}]};
  const token={x:40,y:60,skinId:'espada'};
  const modelo=normalizarEstadoCompartilhado({unidades:[u],cenas:[{id:'a',tokens:{ana:token}},{id:'b',tokens:{ana:{x:20,y:30}}}]});
  assert.equal(aparenciaTokenAtiva(modelo.unidades[0],modelo.cenas[0].tokens.ana).corBorda,'#eeddcc');
  assert.equal(aparenciaTokenAtiva(modelo.unidades[0],modelo.cenas[1].tokens.ana).fundo,'transparente');
  assert.equal(modelo.unidades[0].tokenAparencia?.corBorda,'#001122');
});
test('mesa 2D usa as variáveis de borda e fundo e o editor exibe suas opções',()=>{
  const app=fonte('src/App.tsx');const css=fonte('src/App.css'),editor=fonte('src/EditorEnquadramento.tsx');
  assert.match(app,/--fundo-token/);assert.match(css,/\.token \.token-arte\{background:var\(--fundo-token/);
  assert.match(editor,/aoAlterarAparencia/);assert.match(editor,/Cor da borda/);assert.match(editor,/Fundo do círculo/);
  assert.match(editor,/value="transparente"/);assert.match(editor,/value="personalizado"/);
});
test('mesa 3D altera a base sem reconstruir miniaturas ao editar a aparência',()=>{
  const sala=fonte('src/mesa3d/roomScene.ts'),mesa=fonte('src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(sala,/definirAparenciaToken=/);assert.match(sala,/base\.fundo\.visible=visual\.fundo!=='transparente'/);
  assert.match(sala,/materialAro\.color\.set\(visual\.corBorda\)/);
  assert.match(mesa,/sala\.definirAparenciaToken/);
  assert.doesNotMatch(mesa.match(/const visuaisCena=.*?;\n/)?.[0]||'',/aparencia/);
});
