const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const raiz=path.resolve(__dirname,'..');
const ler=p=>fs.readFileSync(path.join(raiz,p),'utf8');
const paths=['src/App.tsx','src/portal/GestaoPersonagens.tsx','src/portal/EditorPersonagemMestre.tsx','src/mesa3d/Mesa3DPrototipo.tsx','src/hexatombe/fichasLibrary.ts','src/hexatombe/acoesFichaDados.ts','src/lib/mesaCompartilhada.ts'];
for(const arq of paths){
  const src=ler(arq);
  const ast=ts.createSourceFile(arq,src,ts.ScriptTarget.Latest,true,arq.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,arq+' deve ter TS/TSX válido');
  const result=ts.transpileModule(src,{fileName:arq,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,arq+' transpile');
}
const bb=ler('src/hexatombe/fichasLibrary.ts');
const portal=ler('src/portal/GestaoPersonagens.tsx');
const mesa2d=ler('src/App.tsx');
const mesa3d=ler('src/mesa3d/Mesa3DPrototipo.tsx');
const form=ler('src/portal/EditorPersonagemMestre.tsx');
for(const role of ['npc','inimigo','chefe']){
  assert.ok(bb.includes(role),role+' deve existir no esquema');
  assert.ok(portal.includes(`papel:'${role}'`),role+' precisa de botão de criação');
}
assert.ok(bb.includes("papel: papelDaFicha(v as {papel?:string})"),'persistência valida categoria');
assert.ok(portal.includes('salvarOuAtualizarFicha(dados,id)'),'editar sem duplicar');
assert.ok(portal.includes('hx-mestre-categorias'),'filtro de categorias');
assert.ok(portal.includes('Duplicar ficha'),'duplicação');
assert.ok(form.includes('Fases e mudanças de comportamento'),'editor de fases');
assert.ok(form.includes('Reforços e objetivo do encontro'),'editor de objetivo');
assert.ok(mesa2d.includes("chefe:papel==='chefe'"),'chefe entra com proteção C02');
assert.ok(mesa2d.includes("papel==='jogador'?campanha.unidades.find"),'jogador único, adversários múltiplos');
assert.ok(mesa3d.includes('colocarFichaDaBiblioteca3D'),'mesa 3D permite inserir da biblioteca');
assert.ok(mesa3d.includes("chefe:papel==='chefe'"),'mesa 3D reconhece chefes');
assert.ok(mesa3d.includes('fichaId:registro.id'),'mesa 3D vincula origem da ficha');
assert.ok(!form.includes('setAtivasImpeto'),'editor manual não finge construir habilidades H06');
const shared=ler('src/lib/mesaCompartilhada.ts');
assert.ok(shared.includes('fichaId?:string;chefe?:boolean'), 'tipo da unidade 3D preserva ficha e chefe');
assert.ok(shared.includes("fichaId:typeof u.fichaId==='string'"),'Mesa 3D normaliza referência da Biblioteca');
assert.ok(shared.includes('chefe:u.chefe===true'),'Mesa 3D mantém a indicação de chefe C02');
const publico=ler('src/multiplayer/fichaCompartilhada.ts');
assert.ok(publico.includes("unidades.filter(u=>u.tipo==='jogador')"),'fichas NPC/inimigo não são publicadas como jogadores');
assert.ok(!publico.includes('notasMestre'),'notas do mestre não fazem parte do recorte público');
console.log(`OK — ${paths.length} arquivos TS/TSX e 19+ verificações de integração da Biblioteca do Mestre`);
