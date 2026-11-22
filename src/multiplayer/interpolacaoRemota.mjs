/**
 * Interpolação visual de posições autorizadas recebidas via SSE.
 * Atraso visual curto absorve a irregularidade do transporte sem deixar o
 * navegador depender de transições CSS que reiniciam a cada mensagem.
 * Não participa da validação de movimento nem altera a posição do servidor.
 */
export const ATRASO_VISUAL_MS = 18;
export const LIMITE_SALTO_PERCENTUAL = 24;

export function registrarPosicao(amostras, x, y, instante) {
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(instante))return amostras;
  const anterior=amostras[amostras.length-1];
  if(!anterior)return [{x,y,t:instante}];
  if(anterior.x===x&&anterior.y===y)return amostras;
  // Mudança de cena, teleporte intencional e correção administrativa não devem
  // atravessar o mapa lentamente, passando por paredes ou áreas ocultas.
  if(Math.hypot(x-anterior.x,y-anterior.y)>LIMITE_SALTO_PERCENTUAL)
    return [{x,y,t:instante}];
  const t=Math.max(instante,anterior.t+1);
  // Após uma pausa longa, não interpolar desde a posição de segundos atrás:
  // isso causava um salto imediato no primeiro frame do novo arrasto.
  const base=t-anterior.t>Math.max(120,ATRASO_VISUAL_MS*2)
    ?[{x:anterior.x,y:anterior.y,t:t-ATRASO_VISUAL_MS}]
    :amostras;
  return [...base,{x,y,t}].filter(p=>p.t>=t-450).slice(-18);
}

export function amostrarPosicao(amostras,agora,atraso=ATRASO_VISUAL_MS){
  if(!amostras.length)return null;
  if(amostras.length===1)return {x:amostras[0].x,y:amostras[0].y};
  const tempo=agora-atraso;
  if(tempo<=amostras[0].t)return {x:amostras[0].x,y:amostras[0].y};
  for(let i=1;i<amostras.length;i++){
    const antes=amostras[i-1],depois=amostras[i];
    if(tempo<=depois.t){
      const f=Math.max(0,Math.min(1,(tempo-antes.t)/Math.max(1,depois.t-antes.t)));
      return {x:antes.x+(depois.x-antes.x)*f,y:antes.y+(depois.y-antes.y)*f};
    }
  }
  const ultimo=amostras[amostras.length-1];
  return {x:ultimo.x,y:ultimo.y};
}
