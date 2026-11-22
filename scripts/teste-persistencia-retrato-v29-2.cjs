const fs = require('node:fs');
const vm = require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../src/hexatombe/fichasLibrary.ts'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const modObj={exports:{}};
vm.runInNewContext('(function(require,module,exports){'+js+'})',{}, {filename:'fichasLibrary.cjs'})(
  mod=>{
    if(mod.endsWith('iconesAcao'))return {normalizarIconeAcao:()=>undefined};
    if(mod.endsWith('retratoAjuste')){
      const codigo=fs.readFileSync(path.join(__dirname,'../src/lib/retratoAjuste.ts'),'utf8');
      const js=ts.transpileModule(codigo,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
      const m={exports:{}};
      vm.runInNewContext('(function(require,module,exports){'+js+'})',{})((nome)=>{throw Error('import não previsto: '+nome)},m,m.exports);
      return m.exports;
    }
    if(mod.endsWith('importador'))return {importarFichaHexatombe:()=>{throw Error('não precisa importar o contrato neste teste')}};
    throw Error('import desconhecido '+mod);
  },modObj,modObj.exports
);
const ficha={name:'Morgana',element:'agua',class:'suporte',hpMax:136,hpCurrent:136,manaMax:185,manaCurrent:185,ca:10,
 story:'teste',temTokenPadrao:true,tokenPadraoAnimado:true};
const gif='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const gifSalvo=modObj.exports.validarFicha({...ficha,photo:gif});
assert.equal(gifSalvo.photo,gif);assert.equal(gifSalvo.name,'Morgana');
assert.equal(gifSalvo.temTokenPadrao,true);assert.equal(gifSalvo.tokenPadraoAnimado,true);
assert.equal(modObj.exports.validarFicha({...ficha,photo:''}).photo,'');
assert.equal(modObj.exports.validarFicha({...ficha,photo:'data:image/png;base64,AA=='}).photo,'data:image/png;base64,AA==');
assert.equal(modObj.exports.validarFicha({...ficha,photo:'https://evil.example/x.gif'}).photo,'');
assert.equal(modObj.exports.validarFicha({...ficha,photo:'data:image/svg+xml;base64,AA=='}).photo,'');
console.log('OK — validação real: GIF, PNG, remoção, preservação do token padrão e rejeição de URL/SVG');
