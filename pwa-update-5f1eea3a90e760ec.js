// Atualização sem ativação forçada ou limpeza de armazenamento.
(()=>{
 const identify=worker=>new Promise(resolve=>{if(!worker)return resolve('sem controlador');const channel=new MessageChannel();const timer=setTimeout(()=>resolve('versão antiga ou não comprovada'),1200);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data?.version||'versão não comprovada');channel.port1.close();};worker.postMessage({type:'GET_VERSION'},[channel.port2]);});
 function pending(){
  if(typeof app!=='undefined'&&app?.safeSession&&(app.safeSession.pending()||!app.safeSession.persisted||app.safeSession.state.status!=='CONFIRMED'))return true;
  // Includes suspended accounts and forks. Never erase them during update.
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('safe-finance:gastosmensais-ccd84:')||!key.includes(':journal:'))continue;try{const row=JSON.parse(localStorage.getItem(key));let child=false;for(let j=0;j<localStorage.length;j++){const k=localStorage.key(j);if(k?.startsWith('safe-finance:gastosmensais-ccd84:')&&k.includes(':journal:')&&JSON.parse(localStorage.getItem(k)).parents.includes(key)){child=true;break;}}if(!child&&row.state.status!=='CONFIRMED')return true;}catch{return true;}}
  return false;
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('safety-final-panel');if(!host)return;
  const button=document.createElement('button');button.id='check-test-update';button.type='button';button.textContent='Conferir atualização segura';const info=document.createElement('p');info.id='pwa-version';host.append(button,info);
  button.onclick=async()=>{try{
   ProductionRuntime.environment();if(firebase.app().options.projectId!=='gastosmensais-ccd84')throw Error('PROJECT_MISMATCH');
   if(pending()){info.textContent='Há pendências ou incertezas. Preserve e confira as versões antes de atualizar. Nenhuma ativação foi solicitada.';return;}
   const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();
   info.textContent='Controlador: '+await identify(navigator.serviceWorker.controller)+'. Nova versão aguarda o fechamento de todas as abas; não há troca forçada.';
   if(registration.waiting)info.textContent+=' Disponível: '+await identify(registration.waiting);
  }catch{info.textContent='Instalação não confirmada. Versão atual e dados preservados.';}};
 });
 globalThis.TestPWA={identify,pending};
})();
