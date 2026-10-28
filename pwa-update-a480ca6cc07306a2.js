// Atualização sem ativação forçada ou limpeza de armazenamento.
(()=>{
 const identify=worker=>new Promise(resolve=>{if(!worker)return resolve('sem controlador');const channel=new MessageChannel();const timer=setTimeout(()=>resolve('versão antiga ou não comprovada'),1200);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data?.version||'versão não comprovada');channel.port1.close();};worker.postMessage({type:'GET_VERSION'},[channel.port2]);});
 function sessionPending(s){if(!s)return false;if(s.busy||s.persisting||s.inspecting||s.blocked||s.state.sent||s.state.autoRetryBlocked||s.persistenceError||!s.persisted||s.state.status!=='CONFIRMED'||s.pending())return true;try{SafeFinance.verifyPersistence(s.active?s:{...s,assert:()=>{if(s.blocked)throw Error('LOCAL_CONFLICT');}});}catch{return true;}return false;}
 async function pending(){
  const a=typeof app!=='undefined'?app:null;
  const sessions=()=>[...new Set([a?.safeSession,...(a?.suspendedSessions?.values()||[])].filter(Boolean))];
  const original=sessions();if(original.some(sessionPending))return true;
  const stamp=original.map(s=>SafeFinance.canonical({state:s.state,tip:s.tip,revision:s.revision,persisted:s.persisted}));
  if(await DurableJournal.hasPending())return true;
  const current=sessions();return current.length!==original.length||current.some((s,i)=>s!==original[i]||sessionPending(s)||SafeFinance.canonical({state:s.state,tip:s.tip,revision:s.revision,persisted:s.persisted})!==stamp[i]);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('safety-final-panel');if(!host)return;
  const button=document.createElement('button');button.id='check-test-update';button.type='button';button.textContent='Conferir atualização segura';const info=document.createElement('p');info.id='pwa-version';host.append(button,info);
  button.onclick=async()=>{try{
   ProductionRuntime.environment();if(firebase.app().options.projectId!=='gastosmensais-ccd84')throw Error('PROJECT_MISMATCH');
   if(typeof app!=='undefined'&&app?.safeSession)await app.safeSession.verifyDurable();
   if(await pending()){info.textContent='Há pendências ou incertezas. Preserve e confira as versões antes de atualizar. Nenhuma ativação foi solicitada.';return;}
   const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();
   const controller=navigator.serviceWorker.controller,active=await identify(controller);
   if(registration.waiting&&await identify(registration.waiting)!==active)info.textContent='Nova versão pronta. Preserve pendências e feche as abas e a janela do aplicativo para atualizar.';
   else if(registration.installing)info.textContent='Verificando e instalando arquivos da atualização. Confira novamente após a conclusão.';
   else if(await ProductionRuntime.refresh())info.textContent='Versão segura atual já está ativa. Nenhuma atualização aguarda fechamento de abas.';
   else info.textContent='Controlador ainda não confirmado. Feche e reabra após preservar pendências; os envios continuam bloqueados.';
  }catch{info.textContent='Instalação não confirmada. Versão atual e dados preservados.';}};
 });
 globalThis.TestPWA={identify,pending};
})();

// Presentation only: does not authorize reads, writes, activation or data removal.
document.addEventListener('DOMContentLoaded',()=>{
 const panel=document.getElementById('safety-final-panel');if(!panel)return;
 const details=document.createElement('section');details.id='protection-status';
 const heading=document.createElement('h4');heading.textContent='Conexão e versão';details.append(heading);panel.prepend(details);
 const warning=document.createElement('div');warning.id='protection-warning';warning.setAttribute('role','alert');warning.hidden=true;document.body.prepend(warning);
 let scheduled=false;
 function paint(){
  scheduled=false;
  for(const id of ['online-policy-status','online-policy-check','release-status']){const el=document.getElementById(id);if(el&&el.parentElement!==details)details.append(el);}
  const online=document.getElementById('online-policy-status'),release=document.getElementById('release-status');
  const authenticated=typeof app!=='undefined'&&app?.safeSession?.active;
  const messages=[];
  const checking=authenticated&&online?.dataset.ready==='false'&&online?.dataset.checking==='true';
  if(authenticated&&online?.dataset.ready==='false')messages.push(checking?'Conferindo servidor e segurança local. Aguarde para alterar dados.':'Alterações bloqueadas: confira internet, servidor e pendências em Configurações → Proteção dos dados.');
  if(authenticated&&release?.dataset.ready==='false')messages.push('Versão segura não confirmada. Envios bloqueados; confira a atualização em Configurações.');
  const text=messages.join(' ');if(warning.textContent!==text)warning.textContent=text;warning.hidden=!text;
  const normalCheck=checking&&release?.dataset.ready!=='false';warning.setAttribute('role',normalCheck?'status':'alert');warning.style.backgroundColor=normalCheck?'var(--card-bg, #202036)':'';warning.style.color=normalCheck?'var(--text-color, #ededf5)':'';
 }
 new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(paint);}}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-ready','data-checking']});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-period],#total-apply');if(!button)return;document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
 paint();
});

// Optional native install control. Does not suppress the browser's default prompt.
(()=>{'use strict';
 let offer=null,busy=false,installed=false,epoch=0,button,info;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let state='unavailable';
 const messages={unavailable:'Instalação pelo aplicativo indisponível neste navegador. Use o menu do navegador, se disponível.',available:'Instalação disponível. O navegador solicitará sua confirmação.',prompting:'Conclua a escolha na janela do navegador.',accepted:'Solicitação aceita. A instalação ainda não foi confirmada pelo navegador.',dismissed:'Instalação cancelada. Você pode continuar usando o navegador.',failed:'Não foi possível concluir a solicitação. Use o menu do navegador ou tente novamente quando uma nova opção estiver disponível.',installed:'O navegador informou a instalação concluída.',standalone:'Aplicativo aberto em modo independente.'};
 function paint(){if(!button)return;button.disabled=busy||!offer||installed||standalone();button.hidden=installed||standalone();info.textContent=messages[standalone()?'standalone':state];}
 window.addEventListener('beforeinstallprompt',event=>{if(installed||standalone())return;offer=event;if(!busy)state='available';paint();});
 window.addEventListener('appinstalled',()=>{installed=true;offer=null;busy=false;++epoch;state='installed';paint();});
 async function request(){
  if(busy||!offer||installed||standalone())return;
  const current=offer,token=++epoch;offer=null;busy=true;state='prompting';paint();
  try{
   // Called synchronously from the user's click; never request installation automatically.
   const result=await current.prompt();
   const choice=result&&result.outcome?result:await current.userChoice;
   if(token!==epoch)return;
   state=choice?.outcome==='accepted'?'accepted':'dismissed';
  }catch{if(token===epoch)state='failed';}
  finally{if(token===epoch){busy=false;if(offer)state='available';paint();}}
 }
 function mount(){const host=document.getElementById('safety-final-panel');if(!host||button)return;const box=document.createElement('section');box.id='pwa-install-control';const title=document.createElement('h4');title.textContent='Instalação do aplicativo';button=document.createElement('button');button.type='button';button.id='pwa-install-button';button.className='btn btn-primary';button.textContent='Instalar aplicativo';button.addEventListener('click',request);info=document.createElement('p');info.id='pwa-install-status';info.setAttribute('role','status');info.setAttribute('aria-live','polite');box.append(title,button,info);host.append(box);paint();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
