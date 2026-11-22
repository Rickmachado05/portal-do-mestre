/**
 * Compartilha uma única conexão SSE entre chat, publicação e painel da mesma
 * sessão dentro de uma janela. Em HTTP/1.1 conexões SSE extras concorrem com
 * o download da própria mesa e do visualizador 3D.
 *
 * Não compartilha entre credenciais diferentes, nem entrega dados de outra sala.
 */
export function criarGerenciadorEventosCompartilhados(criarConexao){
  const conexoes=new Map();
  const chave=(cred)=>`${cred.codigo}\u0000${cred.token}\u0000${cred.papel}`;

  function abrir(item){
    const controle=[...item.ouvintes].some(o=>o.controlador);
    const url=`${item.urlBase}/eventos?token=${encodeURIComponent(item.credencial.token)}${controle?'&controlador=1':''}`;
    item.controlador=controle;
    item.estado='reconectando';
    const conexao=criarConexao(url);
    item.conexao=conexao;
    conexao.onopen=()=>{
      if(item.conexao!==conexao)return;
      item.estado='conectado';
      for(const o of [...item.ouvintes]){
        try{o.onStatus('conectado');}catch(e){console.error('[Portal SSE] Ouvinte:',e);}
      }
    };
    conexao.onerror=()=>{
      if(item.conexao!==conexao)return;
      item.estado='reconectando';
      for(const o of [...item.ouvintes]){
        try{o.onStatus('reconectando');}catch(e){console.error('[Portal SSE] Ouvinte:',e);}
      }
    };
    conexao.onmessage=(evento)=>{
      if(item.conexao!==conexao)return;
      let dados;
      try{dados=JSON.parse(evento.data);}catch{return;}
      if(!dados||typeof dados!=='object'||!item.validos.has(dados.tipo))return;
      // A mesma mensagem (inclusive mapas grandes) é analisada apenas uma vez.
      for(const o of [...item.ouvintes]){
        try{o.onEvento(dados);}catch(e){console.error('[Portal SSE] Ouvinte:',e);}
      }
    };
  }
  function fechar(item){
    const conexao=item.conexao;
    item.conexao=null;
    if(conexao){
      conexao.onopen=null;conexao.onerror=null;conexao.onmessage=null;
      conexao.close();
    }
  }
  return {
    assinar(credencial,urlBase,validos,onEvento,onStatus,controlador=false){
      const id=chave(credencial);
      let item=conexoes.get(id);
      if(!item){
        item={credencial,urlBase,validos:new Set(validos),ouvintes:new Set(),conexao:null,controlador:false,estado:'reconectando'};
        conexoes.set(id,item);
      }
      const ouvinte={onEvento,onStatus,controlador:Boolean(controlador)};
      item.ouvintes.add(ouvinte);
      const precisaControle=[...item.ouvintes].some(o=>o.controlador);
      if(!item.conexao)abrir(item);
      else if(precisaControle!==item.controlador){fechar(item);abrir(item);}
      else if(item.estado==='conectado')onStatus('conectado');
      let removido=false;
      return ()=>{
        if(removido)return;
        removido=true;
        item.ouvintes.delete(ouvinte);
        if(!item.ouvintes.size){fechar(item);conexoes.delete(id);return;}
        const aindaControle=[...item.ouvintes].some(o=>o.controlador);
        if(aindaControle!==item.controlador){fechar(item);abrir(item);}
      };
    },
    quantidade(){return conexoes.size;},
  };
}
