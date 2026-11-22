const fs=require('node:fs');const assert=require('node:assert/strict');const path=require('node:path');
const base=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const css3=read('src/mesa3d/Mesa3DPrototipo.css');const room=read('src/mesa3d/roomScene.ts');const m3=read('src/mesa3d/Mesa3DPrototipo.tsx');const b=read('src/portal/GestaoPersonagens.tsx');const cssB=read('src/portal/GestaoPersonagens.css');
let total=0;const ok=(test,msg)=>{assert.ok(test,msg);total++;};
ok(css3.includes('.m3d-editor-tabs{') && css3.includes('position:static;background:#15212b'), 'abas de terreno sem sticky');
ok(!css3.includes('.m3d-editor-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;border-bottom:1px solid #a5845366;padding:0 0 10px;position:sticky'), 'sticky original removido');
ok(room.includes('plantaMaterial.opacity=1;')&&room.includes('plantaMaterial.transparent=false'), 'mapa opaco no editor');
ok(!room.includes('plantaMaterial.opacity=construindo?'), 'sem reduzir opacidade na construção');
ok(m3.includes('if(tipo===\'cinematica-iniciar\'')&&m3.includes('selecionarTokenNoChao(null);setItemMesaSelecionado(null);'),'clear ao iniciar tática/personagem');
ok(m3.includes('salaRef.current?.selecionarToken(null);'), 'limpa alças 3d');
ok(!m3.includes('m3d-map-opacity'), 'sem slider de opacidade inoperante');
ok(m3.includes('!cinematicaRef.current?tokenSelecionadoId:null'), 'não realça durante câmera');
ok(!b.includes('className="hx-character-atalhos"'), 'sem atalhos duplicados no resumo');
ok(b.includes("['resumo','Visão geral']")&&b.includes("['atributos','Atributos']"), 'abas superiores preservadas');
ok(cssB.includes('tons de grafite, bronze acinzentado'), 'cores suavizadas');
ok(cssB.includes('background:#39363b'), 'filtros coerentes');
// Verify syntax for the two edited TS/TSX sources without needing React/Vite.
const ts=require('typescript');for(const filename of ['src/mesa3d/Mesa3DPrototipo.tsx','src/mesa3d/roomScene.ts','src/portal/GestaoPersonagens.tsx']){const code=read(filename);const ast=ts.createSourceFile(filename,code,ts.ScriptTarget.Latest,true,filename.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,'syntax: '+filename);}
console.log('OK',total,'testes de polimento pré-v28');
