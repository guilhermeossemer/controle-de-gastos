/* Online admission only. Does not replace the journal, conflict handler or uploader. */
(function(root){
 'use strict';
 const F=SafeFinance,p=ControleGastos.prototype,states=new WeakMap();
 function state(app){if(!states.has(app))states.set(app,{permit:0,busy:false,ready:false,check:0,code:null,stage:null});return states.get(app);}
 function notice(app,ready,code=null,stage=null){const g=state(app);g.ready=ready;g.code=ready?null:code;g.stage=stage;let el=document.getElementById('online-policy-status');if(!el){el=document.createElement('div');el.id='online-policy-status';el.setAttribute('role','status');document.body.prepend(el);}el.dataset.ready=String(ready);el.textContent=ready?'Servidor e persistência local conferidos. Cada alteração será verificada novamente.':'Operações financeiras bloqueadas: é preciso confirmar internet, sessão, servidor e persistência local, sem pendências ou conflitos. Consultas e backups continuam disponíveis.';if(!ready&&code)el.textContent+=' Código: '+code+(stage?' — etapa: '+stage:'');let button=document.getElementById('online-policy-check');if(!button){button=document.createElement('button');button.id='online-policy-check';button.type='button';button.textContent='Conferir servidor e pendências';el.after(button);}button.onclick=async()=>{button.disabled=true;try{await app.loadUserData();}catch{}finally{button.disabled=false;}};}
 function fail(code='ONLINE_REQUIRED'){throw F.error(code);}
 function safeCode(e){const c=e?.code||e?.message;const allowed=['AMBIGUOUS_RECORD','STALE_RECORD','LOCAL_ACCESS_DENIED','LOCAL_ARCHIVE_HASH','LOCAL_ARCHIVE_INVALID','LOCAL_ARCHIVE_OWNER','LOCAL_ASYNC_REQUIRED','LOCAL_BUSY','LOCAL_CHANGED','LOCAL_COLLISION','LOCAL_CONFLICT','LOCAL_CORRUPT','LOCAL_DATABASE_ENUMERATION_REQUIRED','LOCAL_DELETE_FORBIDDEN','LOCAL_EMERGENCY_CHANGED','LOCAL_EMERGENCY_EVIDENCE','LOCAL_EMERGENCY_RESOLUTION','LOCAL_GENERATION_EXHAUSTED','LOCAL_HASH_COLLISION','LOCAL_IDB_ABORT','LOCAL_IDB_BLOCKED','LOCAL_IDB_CORRUPT','LOCAL_INVALID_PREFERENCE','LOCAL_LEGACY_CHANGED','LOCAL_LOCK_BUSY','LOCAL_LOCK_UNAVAILABLE','LOCAL_MIGRATION_MISMATCH','LOCAL_MIGRATION_REQUIRED','LOCAL_OWNER_REQUIRED','LOCAL_PARENT_MISSING','LOCAL_PREFERENCE_FAILED','LOCAL_QUOTA','LOCAL_RECERTIFICATION_REQUIRED','LOCAL_RECOVERY_BLOCKED','LOCAL_SERIALIZATION','LOCAL_STATE_UNPROVEN','LOCAL_WRITE_FAILED','CONFIRMED','CONFLICT','PENDING','UNCERTAIN','OFFLINE','LOCAL_CORRUPT','ONLINE_REQUIRED','ONLINE_TIMEOUT','NETWORK_OFFLINE','AUTH_REQUIRED','AUTH_UNVERIFIED','SESSION_CHANGED','SESSION_BUSY','SESSION_NOT_CONFIRMED','RETRY_BLOCKED','REMOTE_BASE_MISSING','LOCAL_PENDING','VIEW_DIVERGED','STATE_CHANGED','REMOTE_ABSENT','REMOTE_PROTOCOL','REMOTE_CHANGED','VERSION_INCOMPATIBLE','ORIGIN_OR_CONTEXT_BLOCKED','BUSY','LOCAL_QUOTA','LOCAL_STATE_UNPROVEN','LOCAL_CONFLICT','LOCAL_CHANGED','LOCAL_IDB_CORRUPT','LOCAL_IDB_BLOCKED','LOCAL_LOCK_BUSY','LOCAL_WRITE_FAILED','LOCAL_LEGACY_CHANGED','LOCAL_MIGRATION_MISMATCH','permission-denied','unavailable','auth/network-request-failed','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled'];return allowed.includes(c)?c:'CHECK_FAILED';}

 async function bounded(task){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(F.error('ONLINE_TIMEOUT')),8000);})]);}finally{clearTimeout(timer);}}
 function identity(app,s,user){if(!s.persisted||s.persistenceError)throw F.error(s.persistenceError||'LOCAL_STATE_UNPROVEN');try{F.verifyPersistence(s);}catch(e){s.persisted=false;s.persistenceError=F.classifyLocalError(e);throw F.error(s.persistenceError);}s.current();if(app.safeSession!==s||!s.active||auth.currentUser!==user||user.uid!==s.uid||firebase.app().options.projectId!==F.PROJECT)fail('SESSION_CHANGED');ProductionRuntime.assertWrite();}
 async function confirmServer(app){
  let stage='session';try{
  const s=app.safeSession,user=auth.currentUser;if(!s||!user)fail('AUTH_REQUIRED');if(navigator.onLine===false)fail('NETWORK_OFFLINE');
  const settled=()=>{if(s.busy||s.persisting||s.inspecting)fail('SESSION_BUSY');if(s.state.status!=='CONFIRMED')fail('SESSION_NOT_CONFIRMED');if(s.state.autoRetryBlocked)fail('RETRY_BLOCKED');if(!s.state.base)fail('REMOTE_BASE_MISSING');if(s.pending())fail('LOCAL_PENDING');if(!F.equal(app.data,s.state.data))fail('VIEW_DIVERGED');};
  stage='local-before';await s.verifyDurable();identity(app,s,user);settled();
  const stamp={revision:s.revision,tip:s.tip,year:app.currentYear,month:app.currentMonth};
  stage='auth-reload';await bounded(user.reload());stage='local-after-auth';await s.verifyDurable();identity(app,s,user);if(user.emailVerified!==true)fail('AUTH_UNVERIFIED');
  stage='server-read';const remote=await bounded(s.remote.read());stage='local-after-server';await s.verifyDurable();identity(app,s,user);
  stage='comparison';if(navigator.onLine===false)fail('NETWORK_OFFLINE');settled();if(s.revision!==stamp.revision||s.tip!==stamp.tip||app.currentYear!==stamp.year||app.currentMonth!==stamp.month)fail('STATE_CHANGED');if(!remote.exists)fail('REMOTE_ABSENT');if(remote.version?.syncProtocol!==1||!Number.isSafeInteger(remote.version?.syncRevision)||remote.version.syncRevision<0)fail('REMOTE_PROTOCOL');if(!F.equal(remote,s.state.base))fail('REMOTE_CHANGED');
  return s;
  }catch(e){const safe=F.error(safeCode(e));safe.onlineStage=stage;throw safe;}
 }
 async function run(app,fn){const g=state(app);if(g.busy){return false;}g.check++;g.busy=true;notice(app,false,'CHECKING','mutation');try{await confirmServer(app);let result;g.permit++;try{result=fn();}finally{g.permit--;}return await result;}catch(e){g.check++;notice(app,false,safeCode(e),e.onlineStage||'mutation');app.showNotification?.('Alteração bloqueada. Código: '+safeCode(e)+' — etapa: '+(e.onlineStage||'mutation')+'. Dados preservados.','warning');return false;}finally{g.busy=false;}}
 const entry=['saveItem','saveRendaFamiliar','adicionarGastoRapido','atualizarSaldoMes','atualizarProximoPagamento','togglePaidStatus','deleteItem','limparGastosDia','copyPreviousMonthExpenses','executarCopiadeGastos'];
 for(const name of entry){const original=p[name];if(typeof original!=='function')throw Error('ONLINE_ENTRY_MISSING_'+name);p[name]=function(...args){if(state(this).permit)return original.apply(this,args);return run(this,()=>original.apply(this,args));};}
 const income=p.atualizarRendaFamiliar;p.atualizarRendaFamiliar=function(save=true){if(!save||state(this).permit)return income.apply(this,arguments);return run(this,()=>income.apply(this,arguments));};
 // These helpers must stay synchronous: saveItem relies on their boolean result.
 for(const name of ['addNewItem','updateExistingItem','setCreditSummaryStatus']){const original=p[name];p[name]=function(...args){if(!state(this).permit){notice(this,false,'ONLINE_REQUIRED','helper');return false;}return original.apply(this,args);};}
 const save=p.saveData;p.saveData=function(...args){if(!state(this).permit&&!F.equal(this.data,this.safeSession?.state.data)){notice(this,false,'VIEW_DIVERGED','save');return Promise.resolve(false);}return save.apply(this,args);};
 // A dialog may stay open across a disconnection; confirm again at the actual mutation.
 const modal=p.showConfirmModal;p.showConfirmModal=function(title,message,callback){return modal.call(this,title,message,state(this).permit?()=>run(this,callback):callback);};
 const load=p.loadUserData;p.loadUserData=function(...args){
  const g=state(this),session=this.safeSession;if(g.loading?.session===session)return g.loading.promise;
  const ticket=++g.check,task={session,promise:null};g.loading=task;notice(this,false,'CHECKING','load');
  task.promise=Promise.resolve().then(async()=>{try{const result=await load.apply(this,args);if(g.loading!==task||this.safeSession!==session)return false;await this.confirmOnlineAccess();return result;}catch(e){if(g.loading===task&&this.safeSession===session&&!g.ready)notice(this,false,safeCode(e),'load');return false;}finally{if(g.loading===task)g.loading=null;}});return task.promise;
 };
 p.confirmOnlineAccess=async function(){const g=state(this),check=++g.check,session=this.safeSession;try{await confirmServer(this);if(g.check!==check||this.safeSession!==session)return false;notice(this,true);return true;}catch(e){if(g.check!==check||this.safeSession!==session)return false;if(this.safeSession?.persistenceError)show.call(this,this.safeSession.persistenceError);notice(this,false,safeCode(e),e.onlineStage||'confirmation');return false;}};
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
 const show=p.showSafetyStatus;p.showSafetyStatus=function(code){const result=show.apply(this,arguments);const label=document.getElementById('sync-status-text');if(label&&label.textContent.startsWith('Operação bloqueada'))label.textContent+=' ['+safeCode({code})+'; etapa: status]';state(this).check++;notice(this,false,code==='CONFIRMED'?'CHECKING':safeCode({code}),'status');if(code==='CONFIRMED'&&!state(this).loading)void this.confirmOnlineAccess();return result;};
 const deactivate=p.deactivateUser;p.deactivateUser=function(...args){state(this).check++;notice(this,false,'AUTH_REQUIRED','deactivate');return deactivate.apply(this,args);};
 document.addEventListener('DOMContentLoaded',()=>{const get=()=>typeof app!=='undefined'?app:null;const refresh=()=>{const a=get();if(a)void a.receiveRemoteUpdates();};root.addEventListener('offline',()=>{const a=get();if(a){state(a).check++;notice(a,false,'NETWORK_OFFLINE','offline');}});root.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});refresh();});
 root.OnlinePolicy={confirmServer,run,entries:entry,diagnostic:app=>{const g=state(app);return {ready:g.ready,code:g.code,stage:g.stage};}};
})(globalThis);
