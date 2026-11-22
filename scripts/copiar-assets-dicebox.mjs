import { cpSync, existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Execute na RAIZ do hexatombe-mesa: node scripts/copiar-assets-dicebox.mjs
const raiz = resolve('node_modules/@3d-dice/dice-box');
const destino = resolve('public/assets/dice-box');
const contar = pasta => {
  if (!existsSync(pasta) || !statSync(pasta).isDirectory()) return 0;
  return readdirSync(pasta, { withFileTypes: true }).reduce((total, item) =>
    total + (item.isDirectory() ? contar(join(pasta, item.name)) : item.isFile() ? 1 : 0), 0);
};

if (!existsSync(raiz)) {
  console.error('Pacote ausente. Execute primeiro: npm install @3d-dice/dice-box@1.1.4');
  process.exit(1);
}

const atuais = contar(destino);
if (atuais >= 5) {
  console.log(`Assets já presentes (${atuais} arquivos): ${destino}`);
  process.exit(0);
}

const candidatos = [
  join(raiz, 'src/assets/dice-box'),
  join(raiz, 'src/assets'),
  join(raiz, 'public/assets/dice-box'),
  join(raiz, 'assets/dice-box'),
  join(raiz, 'assets'),
];
const origem = candidatos.find(p => contar(p) >= 5);
if (!origem) {
  console.error('Não encontrei os assets no pacote instalado.');
  console.error('Pastas verificadas:', candidatos.join('\n - '));
  console.error('Consulte a estrutura real de node_modules/@3d-dice/dice-box para localizar modelos/texturas.');
  process.exit(1);
}
mkdirSync(destino, {recursive:true});
cpSync(origem, destino, {recursive:true, force:true});
console.log(`Assets copiados (${contar(destino)} arquivos):`);
console.log(`  de ${origem}\n  para ${destino}`);
const arquivoApp = resolve('src/App.tsx');
if (existsSync(arquivoApp) && !readFileSync(arquivoApp, 'utf8').includes('onResultado=')) {
  console.warn('ATENÇÃO: src/App.tsx não parece usar onResultado. A integração pode precisar da versão da v0.3.11 ou posterior.');
}
console.log('Agora execute npm run build e npm run dev.');
