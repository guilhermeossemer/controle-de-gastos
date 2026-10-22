/* Online admission only. Does not replace the journal, conflict handler or uploader. */
(function(root){
 'use strict';
 const F=SafeFinance,p=ControleGastos.prototype,states=new WeakMap();
 function state(app){if(!states.has(app))states.set(app,{permit:0,busy:false,ready:false});return states.get(app);}
 function notice(app,ready){const g=state(app);g.ready=ready;let el=document.getElementById('online-policy-status');if(!el){el=document.createElement('div');el.id='online-policy-status';el.setAttribute('role','status');document.body.prepend(el);}el.dataset.ready=String(ready);el.textContent=ready?'Servidor e persistência local conferidos. Cada alteração será verificada novamente.':'Operações financeiras bloqueadas: é preciso confirmar internet, sessão, servidor e persistência local, sem pendências ou conflitos. Consultas e backups continuam disponíveis.';let button=document.getElementById('online-policy-check');if(!button){button=document.createElement('button');button.id='online-policy-check';button.type='button';button.textContent='Conferir servidor e pendências';el.after(button);}button.onclick=async()=>{button.disabled=true;try{await app.loadUserData();}catch{notice(app,false);}finally{button.disabled=false;}};}
 function fail(){throw F.error('ONLINE_REQUIRED');}
 async function bounded(task){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(F.error('ONLINE_TIMEOUT')),8000);})]);}finally{clearTimeout(timer);}}
 function identity(app,s,user){if(!s.persisted||s.persistenceError)throw F.error(s.persistenceError||'LOCAL_STATE_UNPROVEN');try{F.verifyPersistence(s);}catch(e){s.persisted=false;s.persistenceError=F.classifyLocalError(e);throw F.error(s.persistenceError);}s.current();if(app.safeSession!==s||!s.active||auth.currentUser!==user||user.uid!==s.uid||firebase.app().options.projectId!==F.PROJECT)fail();ProductionRuntime.assertWrite();}
 async function confirmServer(app){
  const s=app.safeSession,user=auth.currentUser;if(!s||!user||navigator.onLine===false)fail();
  identity(app,s,user);
  if(s.busy||s.state.status!=='CONFIRMED'||s.state.autoRetryBlocked||!s.state.base||s.pending()||!F.equal(app.data,s.state.data))fail();
  const stamp={revision:s.revision,tip:s.tip,year:app.currentYear,month:app.currentMonth};
  await bounded(user.reload());identity(app,s,user);if(user.emailVerified!==true)fail();
  const remote=await bounded(s.remote.read());identity(app,s,user);
  if(navigator.onLine===false||s.busy||s.revision!==stamp.revision||s.tip!==stamp.tip||app.currentYear!==stamp.year||app.currentMonth!==stamp.month||s.state.status!=='CONFIRMED'||s.state.autoRetryBlocked||s.pending()||!F.equal(app.data,s.state.data)||!remote.exists||remote.version?.syncProtocol!==1||!Number.isSafeInteger(remote.version?.syncRevision)||remote.version.syncRevision<0||!F.equal(remote,s.state.base))fail();
  return s;
 }
 async function run(app,fn){const g=state(app);if(g.busy){notice(app,false);return false;}g.busy=true;notice(app,false);try{await confirmServer(app);let result;g.permit++;try{result=fn();}finally{g.permit--;}return await result;}catch{notice(app,false);app.showNotification?.('Alteração bloqueada. Confirme a conexão e resolva pendências ou conflitos antes de tentar novamente.','warning');return false;}finally{g.busy=false;}}
 const entry=['saveItem','saveRendaFamiliar','adicionarGastoRapido','atualizarSaldoMes','atualizarProximoPagamento','togglePaidStatus','deleteItem','limparGastosDia','copyPreviousMonthExpenses','executarCopiadeGastos'];
 for(const name of entry){const original=p[name];if(typeof original!=='function')throw Error('ONLINE_ENTRY_MISSING_'+name);p[name]=function(...args){if(state(this).permit)return original.apply(this,args);return run(this,()=>original.apply(this,args));};}
 const income=p.atualizarRendaFamiliar;p.atualizarRendaFamiliar=function(save=true){if(!save||state(this).permit)return income.apply(this,arguments);return run(this,()=>income.apply(this,arguments));};
 // These helpers must stay synchronous: saveItem relies on their boolean result.
 for(const name of ['addNewItem','updateExistingItem','setCreditSummaryStatus']){const original=p[name];p[name]=function(...args){if(!state(this).permit){notice(this,false);return false;}return original.apply(this,args);};}
 const save=p.saveData;p.saveData=function(...args){if(!state(this).permit&&!F.equal(this.data,this.safeSession?.state.data)){notice(this,false);return Promise.resolve(false);}return save.apply(this,args);};
 // A dialog may stay open across a disconnection; confirm again at the actual mutation.
 const modal=p.showConfirmModal;p.showConfirmModal=function(title,message,callback){return modal.call(this,title,message,state(this).permit?()=>run(this,callback):callback);};
 const load=p.loadUserData;p.loadUserData=async function(...args){notice(this,false);const result=await load.apply(this,args);await this.confirmOnlineAccess();return result;};
 p.confirmOnlineAccess=async function(){try{await confirmServer(this);notice(this,true);return true;}catch(e){notice(this,false);if(this.safeSession?.persistenceError)this.showSafetyStatus(this.safeSession.persistenceError);return false;}};
 p.receiveRemoteUpdates=async function(){
  const s=this.safeSession;if(!s||this.receivingRemote||s.busy||state(this).busy||this.safeAutoSync?.running)return false;
  // Do not discard unsaved form/modal contents while the user is editing.
  const focused=document.activeElement;
  if(focused&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName))return false;
  if([...document.querySelectorAll('.modal')].some(e=>getComputedStyle(e).display!=='none'))return false;
  if(!F.equal(this.data,s.state.data)||s.state.sent||s.state.autoRetryBlocked||s.pending()||!['CONFIRMED','OFFLINE','CONFLICT'].includes(s.state.status))return false;
  this.receivingRemote=true;
  try{return await this.loadUserData();}catch{return false;}finally{this.receivingRemote=false;}
 };
 const show=p.showSafetyStatus;p.showSafetyStatus=function(code){const result=show.apply(this,arguments);notice(this,false);if(code==='CONFIRMED')void this.confirmOnlineAccess();return result;};
 const deactivate=p.deactivateUser;p.deactivateUser=function(...args){notice(this,false);return deactivate.apply(this,args);};
 document.addEventListener('DOMContentLoaded',()=>{const get=()=>typeof app!=='undefined'?app:null;const refresh=()=>{const a=get();if(a)void a.receiveRemoteUpdates();};root.addEventListener('offline',()=>{const a=get();if(a)notice(a,false);});root.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});refresh();});
 root.OnlinePolicy={confirmServer,run,entries:entry};
})(globalThis);
