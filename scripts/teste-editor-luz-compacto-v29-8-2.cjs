'use strict';
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {strict:assert}=require('node:assert');
const app=readFileSync(resolve(__dirname,'../src/App.tsx'),'utf8');
const three=readFileSync(resolve(__dirname,'../src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
const css=readFileSync(resolve(__dirname,'../src/App.css'),'utf8');
const threeCss=readFileSync(resolve(__dirname,'../src/mesa3d/visualizadorEmbutido.css'),'utf8');
const tests=[
 ['Fontes compartilhadas continuam preservadas',()=>assert.match(app,/const fontesLuz\s*=\s*cenaAtual\.fontesLuz\s*\?\?\s*\[\]/)],
 ['Lista do menu apenas resume e oferece ações rápidas',()=>{assert.match(app,/hx-fontes-luz-lista/);assert.match(app,/hx-fonte-luz-resumo/);assert.match(app,/Apagar'.*'Acender'/);assert.doesNotMatch(app,/className={`fonte-luz-item.*\n\s*<label className="rotulo-campo">Nome da luz/)}],
 ['Editar seleciona luz e fecha janela antiga',()=>{assert.match(app,/function editarFonteLuz\(luzId:string\)/);assert.match(app,/mudarJanela\('iluminacao',\{aberta:false\}\)/);assert.match(app,/setLuzSelecionadaId\(luzId\)/)}],
 ['Seleção 3D usa mensagem própria',()=>{assert.match(app,/enviar3D\('selecionar-luz',luzId\)/);assert.match(three,/if\(tipo==='selecionar-luz'&&typeof valor==='string'\)/)}],
 ['Editor flutuante 2D tem nome, liga/desliga, cor, alcance, posição e exclusão',()=>{assert.match(app,/hx-luz-editor-flutuante/);assert.match(app,/aria-label="Nome da fonte de luz"/);assert.match(app,/aria-label="Cor da fonte de luz"/);assert.match(app,/className="hx-luz-alcance"/);assert.match(app,/className="hx-luz-coordenadas"/);assert.match(app,/removerLuzSelecionada\(f\.id\)/)}],
 ['Editor 3D reutiliza o estilo compacto das paredes',()=>{assert.match(three,/m3d-selection-hud m3d-barreira-editor298/);assert.match(three,/m3d-luz-editor298/);assert.match(three,/setPainelVisivel\(false\)/);assert.match(threeCss,/\.m3d-luz-editor298/)}],
 ['Visual compacto evita barra horizontal no painel',()=>{assert.match(css,/\.janela-iluminacao \.janela-conteudo\{overflow-x:hidden\}/);assert.match(css,/\.hx-fontes-luz-lista\{overflow-x:hidden/)}],
 ['Nenhuma luz nova nem estrutura duplicada introduzida',()=>{assert.doesNotMatch(three,/cenaAtual\?\.fontesLuz\?\.filter\(l=>l\.id===luzEmEdicaoId\)/);assert.match(three,/alterarMesaCompartilhada\(campanhaId,raw=>/)}],
];
let ok=0;
for(const [name,fn] of tests){try{fn();console.log(`✓ ${name}`);ok++;}catch(e){console.error(`✕ ${name}: ${e.message}`);process.exitCode=1;}}
console.log(`Verificações: ${ok}/${tests.length}`);
