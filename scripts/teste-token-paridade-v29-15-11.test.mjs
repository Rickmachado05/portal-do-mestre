import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const r=(f)=>readFileSync(resolve(process.cwd(),f),'utf8');
const fonte=r('src/multiplayer/TokenConvidadoFluido.tsx');
const editor=r('src/EditorEnquadramento.tsx');
const master=r('src/App.tsx');
test('não aplicar as dimensões/bordas antigas a qualquer span, incluindo a etiqueta do nome',()=>{
  for(const p of ['src/multiplayer/Multiplayer.css','src/multiplayer/MesaConvidado2D.css','src/multiplayer/MesaConvidado2DParity.css']){
    const css=r(p);
    assert.doesNotMatch(css,/\.pm-mp-token\s*>\s*span\s*\{/);
    assert.doesNotMatch(css,/\.pm-jogo-token(?:\.meu)?\s*>\s*span\s*\{/);
    assert.doesNotMatch(css,/\.pm-jogo-token-npc\s*>\s*span\s*\{/);
  }
  assert.match(r('src/multiplayer/MesaConvidado2DParity.css'),/\.pm-jogo-token>\.token-nome\{[\s\S]*?width:auto;height:auto/);
  assert.match(fonte,/<span className="token-nome">\{token.nome\}<\/span>/);
});
test('mestre, convidado e prévia compartilham token-rosto > token-arte com as mesmas variáveis de enquadramento',()=>{
  assert.match(master,/className="token-rosto">[\s\S]*?className="token-arte" style=\{estiloEnquadramento\(enquadramentoTokenAtivo/);
  assert.match(fonte,/className="token-rosto">[\s\S]*?className="token-arte" style=\{estiloEnquadramento\(token.enquadramento\)/);
  assert.match(editor,/className="token-rosto">[\s\S]*?className="token-arte" style=\{estiloEnquadramento\(a\)/);
  assert.match(editor,/TokenIdle src=\{imagem\}/);
  assert.match(editor,/--cor-token/);
  assert.match(editor,/--fundo-token/);
  assert.match(editor,/--rotacao-token/);
  assert.match(editor,/--espelhamento-token/);
  assert.match(editor,/--tamanho-token/);
});
test('o editor recebe o idle, a skin, rotação e espelhamento da cena atual',()=>{
  for(const prop of ['topview','rotacao','espelhadoX','animado','idlePausado','idleVelocidade'])
    assert.match(master,new RegExp(`\\b${prop}=\\{`));
  assert.match(master,/valor=\{enquadramentoTokenAtivo\(selecionado,cenaAtual.tokens/);
  assert.match(master,/aparencia=\{aparenciaTokenAtiva\(selecionado,cenaAtual.tokens/);
});
test('sintaxe TSX atualizada sem erros de parse',()=>{
  const require=createRequire(import.meta.url);
  const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
  for(const file of ['src/EditorEnquadramento.tsx','src/App.tsx','src/multiplayer/TokenConvidadoFluido.tsx']){
    const out=ts.transpileModule(r(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}});
    assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>d.messageText)||[],[],file);
  }
});
