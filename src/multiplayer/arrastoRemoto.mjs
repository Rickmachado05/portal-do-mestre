/**
 * Prévia transitória do arrasto: não altera o estado oficial da cena.
 * O servidor já filtra cena, dono do token e visibilidade antes de publicar.
 * O cliente também verifica se o token pertence ao mapa visível.
 */
const assinaturas = new Map();
export function assinarArrasto(cenaId,tokenId,receber){
  const chave=`${cenaId}\u0000${tokenId}`;
  let ouvintes=assinaturas.get(chave);
  if(!ouvintes){ouvintes=new Set();assinaturas.set(chave,ouvintes);}
  ouvintes.add(receber);
  return ()=>{ouvintes.delete(receber);if(!ouvintes.size)assinaturas.delete(chave);};
}
export function publicarArrasto(evento){
  if(!evento||typeof evento.cenaId!=='string'||typeof evento.id!=='string'||
    !Number.isFinite(evento.x)||!Number.isFinite(evento.y)||
    evento.x<0||evento.x>100||evento.y<0||evento.y>100||
    !Number.isSafeInteger(evento.sequencia)||evento.sequencia<1)return;
  const chave=`${evento.cenaId}\u0000${evento.id}`;
  for(const receber of assinaturas.get(chave)||[])receber(evento);
}
