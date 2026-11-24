/** Gera o ZIP de hospedagem pública a partir do código-fonte versionado.
 * Executado automaticamente antes do vite build, sem baixar binários externos.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapa = {
  'INSTALAR_AUXILIAR_DO_MESTRE.ps1': 'INSTALAR_AUXILIAR_DO_MESTRE.ps1',
  'DESINSTALAR_AUXILIAR_DO_MESTRE.ps1': 'DESINSTALAR_AUXILIAR_DO_MESTRE.ps1',
  'ENCERRAR_AUXILIAR_DO_MESTRE.ps1': 'ENCERRAR_AUXILIAR_DO_MESTRE.ps1',
  'BAIXAR_CLOUDFLARED.ps1': 'scripts/auxiliar-mestre/kit/BAIXAR_CLOUDFLARED.ps1',
  'LEIA-ME-PRIMEIRO.txt': 'scripts/auxiliar-mestre/kit/LEIA-ME-PRIMEIRO.txt',
  'scripts/auxiliar-mestre/abrir-auxiliar.ps1': 'scripts/auxiliar-mestre/abrir-auxiliar.ps1',
  'scripts/auxiliar-mestre/auxiliar-mestre.mjs': 'scripts/auxiliar-mestre/auxiliar-mestre.mjs',
  'scripts/multiplayer-server.mjs': 'scripts/multiplayer-server.mjs',
  'scripts/multiplayer-persistencia.mjs': 'scripts/multiplayer-persistencia.mjs',
  'scripts/multiplayer-static.mjs': 'scripts/multiplayer-static.mjs',
  'scripts/multiplayer-websocket.mjs': 'scripts/multiplayer-websocket.mjs',
};
const arquivos = Object.fromEntries(
  Object.entries(mapa).map(([destino, origem]) => [destino, readFileSync(resolve(raiz, origem))]),
);
const destino = resolve(raiz, 'public', 'downloads', 'auxiliar-do-mestre-windows.zip');
mkdirSync(dirname(destino), {recursive:true});
const zip = zipSync(arquivos, {level:6});
writeFileSync(destino, zip);
console.log(`[Portal] Kit público do auxiliar: ${Object.keys(mapa).length} arquivos, ${zip.length} bytes.`);
