const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
for(const snippet of [
  "sistemaDaCampanha(metaFichasCampanha ?? {id: CAMPAIGN_ID}) === SISTEMA_IMPETO",
  "usaRegrasImpeto ? '♥' : '♟'",
  "usaRegrasImpeto && <span className=\"selo-ca\"",
  "{usaRegrasImpeto ? <>",
  "{modal==='condicao'&&usaRegrasImpeto&&<form",
  "usaRegrasImpeto ? hpNovo : 0",
  "usaRegrasImpeto ? caNovo : 0",
  "usaRegrasImpeto && <button onClick={()=>rolarIniciativa(u)}",
  "unidades: usaRegrasImpeto ? c.unidades.map",
  "{usaRegrasImpeto && <em>{u.hp}/{u.hpMax}</em>}",
  "{usaRegrasImpeto ? <p className=\"aviso-pequeno\">O documento mantém a arte original."
]) assert.ok(app.includes(snippet),'Missing scoped feature: '+snippet);
assert.ok(app.includes('"Detalhes do personagem"'));
assert.ok(app.includes("'Iniciar turnos'"));
console.log('COMBATE_POR_SISTEMA_OK: Impeto mechanics gated; generic details/PDF/token and manual turns retained');
