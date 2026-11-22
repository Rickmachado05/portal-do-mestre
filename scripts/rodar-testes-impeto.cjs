// Usa apenas o compilador TypeScript e o Node.js; sem depender do browser.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pasta=path.join(root,'.test-impeto-dist');
fs.writeFileSync(path.join(pasta,'package.json'),JSON.stringify({type:'commonjs'}));
for(const arquivo of ['impeto-kit.test.js','portal-adaptador.test.js','portal-biblioteca-acoes.test.js','biblioteca-mestre.test.js']){
  require(path.join(pasta,'testes',arquivo));
}
