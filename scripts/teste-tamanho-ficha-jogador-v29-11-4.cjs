const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = path => fs.readFileSync(path, 'utf8');
const files = [
  'src/multiplayer/FichaConvidado.css',
  'src/multiplayer/MesaConvidado2D.css',
  'src/multiplayer/MesaConvidado2DParity.css',
];
const sheet = Object.fromEntries(files.map(name=>[name,read(name)]));
const source = read('src/multiplayer/MesaConvidado2D.tsx');
const master = read('src/App.tsx');
let passed = 0;
function test(label, fn) {fn();console.log('OK:', label);passed++;}
test('A ficha do mestre inicia com 366px',()=>{
  assert.match(master,/larguraFichaPadrao\s*=\s*Math\.min\(366,/);
});
test('Convidado mantém classe da ficha e não fixa tamanho pelo style inline',()=>{
  assert.match(source,/id==='ficha'\?'janela-recursos'/);
  assert.match(source,/style=\{\{left:janela\.posicao\.x,top:janela\.posicao\.y,zIndex:janela\.z\+25,display:/);
});
test('Todas as folhas definem a largura inicial compacta',()=>{
  for(const name of files){
    const css = sheet[name];
    assert.match(css,/width:\s*min\(366px,calc\(100vw - 24px\)\)/, name);
    assert.doesNotMatch(css,/\.pm-jogo[^{}]*janela-recursos\s*\{[^}]*width:\s*min\((?:550|680|730)px/s,name);
  }
});
test('A última folha importada não repõe altura de 635px',()=>{
  const css = sheet['src/multiplayer/MesaConvidado2DParity.css'];
  const rule=css.match(/\.pm-jogo \.pm-jogo-janela\.janela-recursos\s*\{([^}]+)\}/);
  assert.ok(rule);
  assert.match(rule[1],/width:\s*min\(366px,/);
  assert.match(rule[1],/height:\s*auto/);
  assert.doesNotMatch(rule[1],/height:\s*min\(635px/);
  assert.match(source,/import '\.\/MesaConvidado2DParity\.css'/);
});
test('Abas são agrupadas em duas colunas na última folha',()=>{
  const css=sheet['src/multiplayer/MesaConvidado2DParity.css'];
  assert.match(css,/\.pm-jogo \.pm-jogo-janela\.janela-recursos \.hx-ficha-abas\s*\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.hx-ficha-abas button\s*\{[^}]*min-width:0/s);
});
test('A ficha continua redimensionável com scroll interno',()=>{
  assert.match(sheet['src/multiplayer/MesaConvidado2DParity.css'],/resize:both/);
  assert.match(sheet['src/multiplayer/MesaConvidado2DParity.css'],/\.pm-jogo \.pm-jogo-janela \.janela-conteudo\s*\{[^}]*overflow:auto/s);
});
console.log(`${passed} verificações passaram`);
