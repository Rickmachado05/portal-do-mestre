import {useEffect,useState,useRef} from 'react';
import {aguardarVideoRolagem} from './videoRolagem';
import {assinarDadosAoVivo,receberEventoDadosAoVivo,type DadosAoVivoRecebidos} from './dadosAoVivo';
import DadosAoVivoOverlay from './DadosAoVivoOverlay';
import {createPortal} from 'react-dom';
import {
  assinarPresenca,autorizar,chaveMestre,credencialRevogada,limparCredencial,lerCredencial,
  salvarCredencial,solicitar,urlConvite,urlSala,urlRaizMultiplayer,
  type CredencialSala,type ResumoSala,type MesaPublica,type RolagemCompartilhada,
} from './api';
import HistoricoRolagens from './HistoricoRolagens';
import Rolagem3DMultiplayer from './Rolagem3DMultiplayer';
import './Multiplayer.css';
import {atualizarOrigemServidorMultiplayer,origemServidorMultiplayer} from './configuracaoServidor.mjs';
import {abrirAuxiliarInstalado,aguardarAuxiliarMestre,iniciarSessaoPeloAuxiliar,pararSessaoPeloAuxiliar,statusAuxiliarMestre,suportaAuxiliarMestre,explicarFalhaAuxiliar,type StatusAuxiliar} from './auxiliarMestre';

type Props={campanhaId:string;campanha:string;modo?:'cartao'|'cabecalho'};
/** O mestre guarda a credencial na sessão da aba; ela acompanha a navegação entre as mesas. */
export default function MultiplayerMestre({campanhaId,campanha,modo='cabecalho'}:Props){
  const chave=chaveMestre(campanhaId);
  const [aberto,setAberto]=useState(false);
  const [credencial,setCredencial]=useState<CredencialSala|null>(()=>lerCredencial(chave));
  const [sala,setSala]=useState<ResumoSala|null>(null);
  const [mesa,setMesa]=useState<MesaPublica|null>(null);
  const [rolagens,setRolagens]=useState<RolagemCompartilhada[]>([]);
  const [ultimaAnimacao,setUltimaAnimacao]=useState<RolagemCompartilhada|null>(null);
  const [videoAtual,setVideoAtual]=useState<{rolagemId:string;url:string}|null>(null);
  const [aoVivo,setAoVivo]=useState<DadosAoVivoRecebidos|null>(null);
  const [resultadoAoVivo,setResultadoAoVivo]=useState<RolagemCompartilhada|null>(null);
  const assistidasAoVivo=useRef(new Set<string>());
  const rolagensRef=useRef<RolagemCompartilhada[]>([]);
  const videoRef=useRef<string|null>(null);
  const [atribuindo,setAtribuindo]=useState<string|null>(null);
  const [status,setStatus]=useState('Desconectado');
  const [erro,setErro]=useState('');
  const [erroFichas,setErroFichas]=useState('');
  useEffect(()=>{
    const receber=(evento:Event)=>{const d=(evento as CustomEvent<{campanhaId:string;mensagem:string}>).detail;if(d?.campanhaId===campanhaId)setErroFichas(d.mensagem);};
    window.addEventListener('portal-mp-fichas-status',receber);
    return()=>window.removeEventListener('portal-mp-fichas-status',receber);
  },[campanhaId]);
  const [servidorDigitado,setServidorDigitado]=useState(()=>origemServidorMultiplayer());
  const [processando,setProcessando]=useState(false);
  const [abrindoAuxiliar,setAbrindoAuxiliar]=useState(false);
  const [auxiliar,setAuxiliar]=useState<StatusAuxiliar|null>(null);
  const [detalheAuxiliar,setDetalheAuxiliar]=useState('');
  const [verificandoAuxiliar,setVerificandoAuxiliar]=useState(false);
  const [desligandoAuxiliar,setDesligandoAuxiliar]=useState(false);
  const [auxiliarEncerrado,setAuxiliarEncerrado]=useState(false);
  const [copiado,setCopiado]=useState(false);
  const [pedidosItens,setPedidosItens]=useState(0);
  useEffect(()=>{
    if(!aberto||processando||desligandoAuxiliar||!suportaAuxiliarMestre())return;
    let ativo=true;
    setVerificandoAuxiliar(true);
    void statusAuxiliarMestre()
      .then(resposta=>{
        if(!ativo)return;
        setAuxiliar(resposta);setDetalheAuxiliar('');
      })
      .catch(()=>{
        if(!ativo)return;
        setAuxiliar(null);
        // A sondagem inicial também falha quando o auxiliar está fechado normalmente.
        setDetalheAuxiliar('');
      })
      .finally(()=>{if(ativo)setVerificandoAuxiliar(false);});
    return()=>{ativo=false;};
  },[aberto,credencial,processando,desligandoAuxiliar]);

  async function verificarAuxiliar(){
    setAuxiliarEncerrado(false);setVerificandoAuxiliar(true);setDetalheAuxiliar('');
    try{
      const resposta=await statusAuxiliarMestre();
      setAuxiliar(resposta);
    }catch(falha){
      setAuxiliar(null);
      setDetalheAuxiliar(explicarFalhaAuxiliar(falha));
    }finally{setVerificandoAuxiliar(false);}
  }

  useEffect(()=>{
    const aoMudar=(evento:Event)=>setPedidosItens((evento as CustomEvent<{quantidade:number}>).detail?.quantidade||0);
    window.addEventListener('portal-mp-pedidos',aoMudar);
    return()=>window.removeEventListener('portal-mp-pedidos',aoMudar);
  },[]);

  useEffect(()=>{
    if(!ultimaAnimacao||videoAtual?.rolagemId===ultimaAnimacao.id)return;
    const tempo=window.setTimeout(()=>setUltimaAnimacao(atual=>atual?.id===ultimaAnimacao.id?null:atual),17500);
    return()=>window.clearTimeout(tempo);
  },[ultimaAnimacao?.id,videoAtual?.rolagemId]);
  // A reprodução usa sempre o vídeo do lançamento físico original.
  // Aguardar o upload evita corrida entre 'rolagem' e 'video-rolagem' do SSE.
  useEffect(()=>{
    if(!credencial||!ultimaAnimacao||ultimaAnimacao.origem==='mestre'||
      videoAtual?.rolagemId===ultimaAnimacao.id)return;
    let ativo=true;
    const controller=new AbortController();
    const id=ultimaAnimacao.id;
    void aguardarVideoRolagem(credencial,id,controller.signal).then(url=>{
      if(!ativo){URL.revokeObjectURL(url);return;}
      if(videoRef.current)URL.revokeObjectURL(videoRef.current);
      videoRef.current=url;setVideoAtual({rolagemId:id,url});
    }).catch(e=>{if(ativo)console.warn('[Portal/Dados] Gravação do convidado não recebida:',e);});
    return()=>{ativo=false;controller.abort();};
  },[credencial?.codigo,credencial?.token,ultimaAnimacao?.id,videoAtual?.rolagemId]);
  useEffect(()=>()=>{if(videoRef.current)URL.revokeObjectURL(videoRef.current);},[]);
  useEffect(()=>{
    if(!aberto)return;
    const aoTeclado=(evento:KeyboardEvent)=>{if(evento.key==='Escape')setAberto(false);};
    document.addEventListener('keydown',aoTeclado);
    return()=>document.removeEventListener('keydown',aoTeclado);
  },[aberto]);
  useEffect(()=>{
    if(!credencial)return;
    let ativo=true;
    void solicitar<{sala:ResumoSala}>(`${urlSala(credencial.codigo)}/eu`,{headers:autorizar(credencial.token)})
      .then((res:{sala:ResumoSala})=>{if(ativo)setSala(res.sala);})
      .catch((e:unknown)=>{if(!ativo)return;if(credencialRevogada(e)){limparCredencial(chave);setCredencial(null);setSala(null);setStatus('Desconectado');window.dispatchEvent(new Event('portal-multiplayer-sala'));}else setStatus('Reconectando…');});
    return ()=>{ativo=false;};
  },[credencial?.codigo,credencial?.token,chave]);
  useEffect(()=>{
    if(!credencial)return;
    setStatus('Conectando…');
    void solicitar<{mesa:MesaPublica|null}>(`${urlSala(credencial.codigo)}/mesa`,{headers:autorizar(credencial.token)})
      .then(res=>setMesa(res.mesa)).catch(()=>undefined);
    let ativo=true;
    void solicitar<{rolagens:RolagemCompartilhada[]}>(`${urlSala(credencial.codigo)}/rolagens`,{headers:autorizar(credencial.token)})
      .then(res=>{if(ativo)setRolagens(prev=>[...new Map([...res.rolagens,...prev].map(r=>[r.id,r])).values()].slice(-80));}).catch(()=>undefined);
    const desassinarAoVivo=assinarDadosAoVivo(credencial,(estado,encerradaId)=>{
      setAoVivo(atual=>estado||(atual?.id===encerradaId?null:atual));
      if(estado)setResultadoAoVivo(null);
    });
    const desassinar=assinarPresenca(credencial,evento=>{
      if(evento.tipo==='dados-ao-vivo'){
        receberEventoDadosAoVivo(credencial,evento);return;
      }
      if(evento.tipo==='encerrada'){
        limparCredencial(chave);setCredencial(null);setSala(null);setRolagens([]);setUltimaAnimacao(null);setAoVivo(null);setStatus('Encerrada');window.dispatchEvent(new Event('portal-multiplayer-sala'));return;
      }
      if(evento.tipo==='mesa'){setMesa(evento.mesa);return;}
      if(evento.tipo==='presenca')setSala(evento.sala);
      if(evento.tipo==='rolagem'){
        rolagensRef.current=[...rolagensRef.current.filter(r=>r.id!==evento.rolagem.id),evento.rolagem].slice(-80);
        setRolagens(prev=>prev.some(r=>r.id===evento.rolagem.id)?prev:[...prev,evento.rolagem].slice(-80));
        if(assistidasAoVivo.current.has(evento.rolagem.origemId||evento.rolagem.id)){
          setResultadoAoVivo(evento.rolagem);
        }else if(evento.rolagem.origem!=='mestre'){
          setUltimaAnimacao(evento.rolagem);
        }
      }
    },conexao=>setStatus(conexao==='conectado'?'Conectado':'Reconectando…'));
    return()=>{ativo=false;desassinar();desassinarAoVivo();};
  },[credencial?.codigo,credencial?.token,chave]);

  async function criar(manual=false){
    if(processando||desligandoAuxiliar)return;
    setErro('');setErroFichas('');setProcessando(true);
    const usaAuxiliar=!manual && suportaAuxiliarMestre() && /\.vercel\.app$/i.test(window.location.hostname);
    // O protocolo externo precisa ser aberto diretamente no clique, antes de qualquer await.
    // Um Quick Tunnel salvo pode ter expirado. Só o botão manual escolhe esse modo.
    const abrirAgora=usaAuxiliar&&!auxiliar;
    let auxiliarOrigem:string|undefined;
    try{
      if(manual){
        if(!servidorDigitado.trim())throw new Error('Informe o endereço HTTPS do servidor manual.');
        atualizarOrigemServidorMultiplayer(servidorDigitado);
      }
      if(abrirAgora){
        setAbrindoAuxiliar(true);setAuxiliarEncerrado(false);setDetalheAuxiliar('');
        abrirAuxiliarInstalado();
      }
      // Na Vercel, o botão principal usa sempre o auxiliar local. Não reaproveita túnel antigo em caso de falha.
      if(usaAuxiliar){
        let auxiliarRespondeu=false;
        try{
          if(abrirAgora){
            const detectado=await aguardarAuxiliarMestre();
            auxiliarRespondeu=true;setAuxiliar(detectado);
            setAbrindoAuxiliar(false);
          }
          const tunnel=await iniciarSessaoPeloAuxiliar(status=>{
            auxiliarRespondeu=true;
            setAuxiliar(status);setDetalheAuxiliar('');
          });
          auxiliarOrigem=tunnel;
          setAuxiliarEncerrado(false);
          atualizarOrigemServidorMultiplayer(tunnel);
          setServidorDigitado(tunnel);
          
        }catch(falha){
          const detalhe=explicarFalhaAuxiliar(falha);
          
          setDetalheAuxiliar(detalhe);
          if(!auxiliarRespondeu)setAuxiliar(null);
          throw new Error(auxiliarRespondeu
            ? `O auxiliar foi detectado, mas não conseguiu iniciar a hospedagem: ${detalhe}`
            : `Não foi possível conectar ao auxiliar em 127.0.0.1:8790: ${detalhe} Confira a instalação e a permissão de acesso à rede local do seu navegador. Consulte Como hospedar / instalar se necessário.`);
        }
      }
      if(/\.vercel\.app$/i.test(window.location.hostname)&&!origemServidorMultiplayer())
        throw new Error('Configure o auxiliar do mestre ou informe o endereço HTTPS do Cloudflare Tunnel.');
      const saude=await solicitar<{recursos?:{fichaImpetoUniversal?:boolean}}>(`${urlRaizMultiplayer()}/saude`);
      if(saude.recursos?.fichaImpetoUniversal!==true)throw new Error('O servidor local está desatualizado e não aceita fichas Ímpeto Universal. Encerre o servidor e Tunnel, baixe o ZIP atualizado do Auxiliar, extraia substituindo os arquivos na pasta atual e inicie novamente.');
      const resposta=await solicitar<{codigo:string;token:string;sala:ResumoSala}>(`${urlRaizMultiplayer()}/salas`,{
        method:'POST',body:JSON.stringify({campanhaId,campanha}),
      });
      const nova:CredencialSala={codigo:resposta.codigo,token:resposta.token,papel:'mestre',...(auxiliarOrigem?{auxiliarOrigem}: {})};
      salvarCredencial(chaveMestre(campanhaId),nova);setCredencial(nova);setSala(resposta.sala);window.dispatchEvent(new Event('portal-multiplayer-sala'));
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível criar a sala.');}
    finally{setAbrindoAuxiliar(false);setProcessando(false);}
  }
  function limparSalaEncerrada(){
    limparCredencial(chave);setCredencial(null);setSala(null);setMesa(null);setRolagens([]);setUltimaAnimacao(null);setAoVivo(null);setErroFichas('');setStatus('Encerrada');window.dispatchEvent(new Event('portal-multiplayer-sala'));
  }
  async function desligarServidor(){
    if(processando||desligandoAuxiliar)return;
    const ativa=credencial;
    if(!window.confirm(ativa?'Encerrar a sala e desligar a hospedagem local, incluindo o auxiliar e o Cloudflare? Os convidados serão desconectados.':'Desligar o servidor, Cloudflare e auxiliar deste PC?'))return;
    setDesligandoAuxiliar(true);setErro('');
    try{
      const origem=origemServidorMultiplayer();
      let local:StatusAuxiliar|null=null;
      if(suportaAuxiliarMestre()){
        try{local=await statusAuxiliarMestre();}catch(e){if(ativa?.auxiliarOrigem||(!ativa&&auxiliar))throw new Error('Não foi possível acessar o auxiliar para confirmar o desligamento. '+explicarFalhaAuxiliar(e));}
      }
      // Uma sala manual não pode desligar um auxiliar que hospeda outro endereço.
      const pertence=Boolean(local && (ativa ? (local.tunnel && local.tunnel===origem) || (ativa.auxiliarOrigem===origem && !local.tunnel) : true));
      if(ativa?.auxiliarOrigem && !pertence)throw new Error('O auxiliar desta sala não foi localizado. Confira a hospedagem antes de encerrar.');
      if(pertence&&!local?.encerramentoCompleto)throw new Error('Atualize o ZIP do Auxiliar para permitir o encerramento completo.');
      if(ativa){
        try{await solicitar(`${urlSala(ativa.codigo)}/encerrar`,{method:'POST',headers:autorizar(ativa.token),signal:AbortSignal.timeout(6000)});}
        catch(e){if(!pertence&&!credencialRevogada(e))throw e;}
        limparSalaEncerrada();
      }
      if(pertence){
        const resposta=await pararSessaoPeloAuxiliar();
        if(resposta.estado==='erro')throw new Error(resposta.mensagem);
        if(local?.tunnel&&origem===local.tunnel){atualizarOrigemServidorMultiplayer('');setServidorDigitado('');}
        setAuxiliar(null);setAuxiliarEncerrado(true);setDetalheAuxiliar('');
      }else if(ativa){
        setDetalheAuxiliar('Sala encerrada. Se o servidor foi iniciado manualmente, feche-o no computador que o hospeda.');
      }
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível desligar a hospedagem.');}
    finally{setDesligandoAuxiliar(false);}
  }
  async function atribuir(pessoaId:string,personagemId:string){
    if(!credencial||atribuindo)return;
    setErro('');setAtribuindo(pessoaId);
    try{
      const resposta=await solicitar<{sala:ResumoSala}>(`${urlSala(credencial.codigo)}/atribuir`,{
        method:'POST',headers:autorizar(credencial.token),
        body:JSON.stringify({pessoaId,personagemId:personagemId||null}),
      });
      setSala(resposta.sala);
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível atribuir o personagem.');}
    finally{setAtribuindo(null);}
  }
  async function copiar(){
    if(!credencial)return;
    try{await navigator.clipboard.writeText(urlConvite(credencial.codigo));setCopiado(true);setTimeout(()=>setCopiado(false),1800);}
    catch{setErro('Não foi possível copiar automaticamente. Selecione o endereço e copie com Ctrl+C.');}
  }
  const convidados=sala?.participantes.filter(p=>p.papel==='convidado')||[];
  return <>
    {credencial&&aoVivo&&createPortal(<DadosAoVivoOverlay key={aoVivo.id} stream={aoVivo.stream} resultado={resultadoAoVivo} onPrimeiroFrame={()=>{assistidasAoVivo.current.add(aoVivo.id);setUltimaAnimacao(null);}} onFechar={()=>setAoVivo(null)}/>,document.body)}
    {credencial&&ultimaAnimacao&&createPortal(<Rolagem3DMultiplayer key={ultimaAnimacao.id} rolagem={ultimaAnimacao} videoUrl={videoAtual?.rolagemId===ultimaAnimacao.id?videoAtual.url:undefined} onFechar={()=>{setUltimaAnimacao(null);setVideoAtual(null);if(videoRef.current){URL.revokeObjectURL(videoRef.current);videoRef.current=null;}}}/>,document.body)}
    <button type="button" className={`pm-mp-trigger ${modo==='cartao'?'pm-mp-trigger-cartao':''}`} onClick={()=>setAberto(true)} title="Hospedar sala multiplayer">◉ <span>{credencial?'Multiplayer ativo':'Multiplayer'}{pedidosItens>0?` · ${pedidosItens} pedido(s)`:''}</span></button>
    {aberto&&createPortal(<div className="pm-mp-sobreposicao" onMouseDown={e=>{if(e.currentTarget===e.target)setAberto(false);}}>
      <section className="pm-mp-modal" role="dialog" aria-modal="true" aria-label="Multiplayer — painel do mestre">
        <header className="pm-mp-topo"><div><small>PORTAL DO MESTRE · MULTIPLAYER</small><h2>Multiplayer</h2></div><button type="button" aria-label="Fechar painel" onClick={()=>setAberto(false)}>×</button></header>
        <p className="pm-mp-campanha">Campanha: <strong>{campanha}</strong></p>
        {!credencial?<div className="pm-mp-vazio pm-mp-inicio">
          {suportaAuxiliarMestre()&&<div className="pm-mp-status-hospedagem" role="status">
            <span><i className={auxiliar?.estado==='pronto'?'online':''}/> <strong>Hospedagem no seu PC</strong></span>
            <p>{abrindoAuxiliar?'Abrindo auxiliar. Autorize a abertura, se solicitada.':desligandoAuxiliar?'Encerrando a hospedagem…':auxiliar?.estado==='pronto'?'Servidor conectado.':auxiliar?.estado==='iniciando'?auxiliar.mensagem:auxiliar?.estado==='erro'?auxiliar.mensagem:processando?'Iniciando servidor e sala…':auxiliarEncerrado?'Hospedagem encerrada.':verificandoAuxiliar?'Verificando conexão…':auxiliar?.estado==='parado'?'Auxiliar disponível.':'Hospedagem desligada. O auxiliar será aberto ao iniciar.'}</p>
          </div>}
          {auxiliar&&auxiliar.estado!=='parado'?<button type="button" className="pm-mp-encerrar" disabled={processando||desligandoAuxiliar||verificandoAuxiliar} onClick={()=>void desligarServidor()}>{desligandoAuxiliar?'Desligando…':'⏻ Desligar servidor e auxiliar'}</button>:<button type="button" disabled={processando||desligandoAuxiliar||verificandoAuxiliar} onClick={()=>void criar()}>{abrindoAuxiliar?'Abrindo auxiliar…':processando?'Iniciando servidor e sala…':'＋ Iniciar sala multiplayer'}</button>}
          <p className="pm-mp-inicio-ajuda">O convite será gerado automaticamente. Mantenha seu PC ligado durante a sessão.</p>
        </div>:<>
          <div className="pm-mp-indicadores"><span><i className={status==='Conectado'?'online':''}/> {status}</span><span>Código: <strong>{credencial.codigo}</strong></span></div>
          <button type="button" className="pm-mp-encerrar" disabled={processando||desligandoAuxiliar||verificandoAuxiliar} onClick={()=>void desligarServidor()}>{desligandoAuxiliar?'Desligando…':'⏻ Desligar servidor e auxiliar'}</button>
          <label className="pm-mp-link">Link de convite<input readOnly value={urlConvite(credencial.codigo)} onFocus={e=>e.currentTarget.select()} aria-label="Link para os convidados"/></label>
          <button type="button" className="pm-mp-copiar" onClick={()=>void copiar()}>{copiado?'✓ Link copiado':'▣ Copiar link'}</button>
          <div className="pm-mp-lista-titulo"><h3>Participantes</h3><span>{convidados.filter(p=>p.conectado).length} online</span></div>
          <ul className="pm-mp-participantes">
            {(sala?.participantes||[]).map(p=><li key={p.id}><i className={p.conectado?'online':''}/><span>{p.apelido}</span><small>{p.papel==='mestre'?'Mestre':p.conectado?'Conectado':'Desconectado'}</small></li>)}
          </ul>
          <div className="pm-mp-atribuicoes">
            <h3>Personagens e fichas dos convidados</h3>
            <p>O mestre decide quem controla cada personagem e quem recebe sua ficha. Um personagem só pode ser atribuído a um convidado por vez.</p>
            {convidados.map(p=><label key={p.id} className="pm-mp-atribuicao">
              <span>{p.apelido}</span>
              <select aria-label={`Personagem de ${p.apelido}`} value={p.personagemId||''}
                disabled={!mesa||Boolean(atribuindo)} onChange={e=>void atribuir(p.id,e.target.value)}>
                <option value="">Sem personagem</option>
                {mesa?.tokens.map(t=><option key={t.id} value={t.id}
                  disabled={convidados.some(outro=>outro.id!==p.id&&outro.personagemId===t.id)}>{t.nome}</option>)}
                {p.personagemId&&!mesa?.tokens.some(t=>t.id===p.personagemId)&&
                  <option value={p.personagemId} disabled>Personagem fora da cena atual</option>}
              </select>
            </label>)}
            {!mesa&&<p className="pm-mp-nota">Abra a Mesa 2D para disponibilizar os personagens da cena.</p>}
          </div>
          {pedidosItens>0&&<div className="pm-mp-pedidos-link" role="status">
            <strong>⚔ {pedidosItens} solicitação(ões) de itens aguardando aprovação</strong>
            <button type="button" onClick={()=>{setAberto(false);window.dispatchEvent(new Event('portal-mp-abrir-pedidos'));}}>Analisar pedidos</button>
          </div>}
          <p className="pm-mp-nota">✉ Use o botão <strong>Chat</strong> da Mesa 2D ou 3D para conversar com todos os participantes da sala.</p>
          <HistoricoRolagens rolagens={rolagens} compacto/>
        </>}
        {erro&&<p role="alert" className="pm-mp-erro">{erro}</p>}
        {credencial&&erroFichas&&<p role="alert" className="pm-mp-erro">{erroFichas} <a href="/como-hospedar.html" target="_blank" rel="noopener noreferrer">Como atualizar o Auxiliar</a></p>}
        <aside className="pm-mp-aviso-hospedagem" role="note">
          <strong>⚠ Encerre a hospedagem ao terminar</strong>
          <p>Fechar esta página, aba ou navegador não desliga o servidor, o Cloudflare nem o auxiliar. Use <b>Desligar servidor e auxiliar</b> antes de sair.</p>
        </aside>
        {credencial&&<p className="pm-mp-inicio-ajuda">Envie o convite aos jogadores para abrirem em seu navegador de preferência. Atribua um personagem a cada convidado e mantenha a mesa aberta durante a sessão.</p>}
        {!credencial&&<div className="pm-mp-ajuda-hospedagem">
          <a href="/como-hospedar.html" target="_blank" rel="noopener noreferrer">Como hospedar / instalar</a>
          <a href="/downloads/auxiliar-do-mestre-windows.zip" download="auxiliar-do-mestre-windows.zip">Baixar auxiliar (.zip)</a>
        </div>}
        {!credencial&&<details className="pm-mp-avancado">
          <summary>Opções avançadas e diagnóstico</summary>
          {suportaAuxiliarMestre()&&<div className="pm-mp-auxiliar">
            <button type="button" className="pm-mp-auxiliar-abrir" disabled={verificandoAuxiliar||processando||desligandoAuxiliar} onClick={()=>void verificarAuxiliar()}>{verificandoAuxiliar?'Verificando…':'Verificar auxiliar'}</button>
            {detalheAuxiliar&&<p className="pm-mp-nota">{detalheAuxiliar}</p>}
            {auxiliar?.estado==='parado'&&<button type="button" className="pm-mp-auxiliar-desligar" disabled={desligandoAuxiliar||processando||verificandoAuxiliar} onClick={()=>void desligarServidor()}>Fechar auxiliar em repouso</button>}
          </div>}
          <div className="pm-mp-config-servidor">
            <label className="pm-mp-link">Servidor manual (Cloudflare Tunnel)
              <input value={servidorDigitado} onChange={e=>setServidorDigitado(e.target.value)}
                placeholder="https://exemplo.trycloudflare.com" aria-label="Endereço HTTPS do servidor multiplayer" spellCheck={false}/>
            </label>
            <button type="button" className="pm-mp-copiar" disabled={processando||desligandoAuxiliar||!servidorDigitado.trim()} onClick={()=>void criar(true)}>Iniciar sala com servidor manual</button>
            <p className="pm-mp-inicio-ajuda">Somente para quem já iniciou o servidor e o túnel manualmente. Não é necessário no modo automático.</p>
          </div>
        </details>}
      </section>
    </div>,document.body)}
  </>;
}
