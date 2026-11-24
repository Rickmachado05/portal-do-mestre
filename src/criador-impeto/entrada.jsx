// O editor Avatar antigo não é mais oferecido para criar fichas novas.
 // Preserva exclusivamente a edição de registros antigos que já existem na biblioteca.
import {buscarFicha} from '../hexatombe/fichasLibrary';
const p=new URLSearchParams(location.search);
const id=p.has('nova')?null:p.get('ficha');
async function iniciar(){
 if(id){
  try{const ficha=await buscarFicha(id);if(ficha?.dados.impeto?.escala==='universal-v1'){await import('./main.jsx');return;}if(ficha&&!ficha.dados.impeto){await import('../criador/main.tsx');return;}}catch{}
  location.replace('/personagens/');return;
 }
 await import('./main.jsx');
}
void iniciar();
