import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Execute na raiz do Hexatombe: Mesa, depois de copiar os arquivos src/ do ZIP.
// Atualiza APENAS dois arquivos antigos e cria backups separados.
const appPath = resolve('src/App.tsx');
const dadosPath = resolve('src/Dados3D.tsx');
for (const arquivo of [appPath,dadosPath]) {
  if (!existsSync(arquivo)) throw new Error('Arquivo ausente: '+arquivo+'\nExecute na pasta do projeto.');
}
for (const nome of ['src/DadosPersonalizacao.ts','src/EditorDados.tsx','src/EditorDados.css']) {
  if(!existsSync(resolve(nome))) throw new Error('Falta '+nome+'. Copie a pasta src do ZIP primeiro.');
}
const app = readFileSync(appPath,'utf8');
const dados = readFileSync(dadosPath,'utf8');
let novoApp = app;
let novoDados = dados;
if (!novoApp.includes("import EditorDados from './EditorDados';")) {
  const ancora = "import Dados3D from './Dados3D';";
  if(novoApp.split(ancora).length !== 2) throw new Error('Não localizei uma importação única de Dados3D no App.tsx. Nada foi modificado.');
  novoApp = novoApp.replace(ancora, ancora+"\nimport EditorDados from './EditorDados';");
}
if (!novoApp.includes('<EditorDados />')) {
  const ancora = '<div className="mesa-app">';
  if(novoApp.split(ancora).length !== 2) throw new Error('Não localizei a raiz da mesa no App.tsx. Nada foi modificado.');
  novoApp = novoApp.replace(ancora, ancora+"\n      <EditorDados />");
}
if (!novoDados.includes("import { carregarConfigDados, opcoesDiceBox } from './DadosPersonalizacao';")) {
  const ancora = "import './Dados3D.css';";
  if(novoDados.split(ancora).length !== 2) throw new Error('Não localizei a importação do CSS em Dados3D.tsx. Nada foi modificado.');
  novoDados = novoDados.replace(ancora, ancora+"\nimport { carregarConfigDados, opcoesDiceBox } from './DadosPersonalizacao';");
}
const antigo = 'await motor.updateConfig({ themeColor: CORES[acabamento] });';
const novo = 'await motor.updateConfig(opcoesDiceBox(carregarConfigDados(), faces, CORES[acabamento]));';
if (!novoDados.includes(novo)) {
  if(novoDados.split(antigo).length !== 2) throw new Error('Não localizei a configuração antiga de cor em Dados3D.tsx. Nada foi modificado.');
  novoDados = novoDados.replace(antigo, novo);
}
if (!novoApp.includes('<EditorDados />') || !novoDados.includes(novo)) throw new Error('Integração incompleta. Nada foi modificado.');
if(process.argv.includes('--verificar')) {
  if(app !== novoApp || dados !== novoDados) {
    console.log('PENDENTE: execute node instalar-atelie-v041.mjs');
    process.exit(1);
  }
  console.log('OK: EditorDados está no App.tsx e as preferências chegam ao Dice Box.');
  process.exit(0);
}
const mudouApp = app !== novoApp;
const mudouDados = dados !== novoDados;
if(!mudouApp && !mudouDados) { console.log('Ateliê já integrado; nada a fazer.'); process.exit(0); }
const data = new Date().toISOString().replace(/[:.]/g,'-');
if(mudouApp) { const backup = appPath+'.backup-antes-atelie-'+data; copyFileSync(appPath,backup); writeFileSync(appPath,novoApp); console.log('App.tsx atualizado. Backup:',backup); }
if(mudouDados) { const backup = dadosPath+'.backup-antes-atelie-'+data; copyFileSync(dadosPath,backup); writeFileSync(dadosPath,novoDados); console.log('Dados3D.tsx atualizado. Backup:',backup); }
console.log('Ateliê instalado. Execute: node instalar-atelie-v041.mjs --verificar');
console.log('Depois: npm run build && npm run dev');
