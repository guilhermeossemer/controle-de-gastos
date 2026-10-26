/* Online admission only. Does not replace the journal, conflict handler or uploader. */
(function(root){
 'use strict';
 const F=SafeFinance,p=ControleGastos.prototype,states=new WeakMap();
 function state(app){if(!states.has(app))states.set(app,{permit:0,busy:false,ready:false,check:0,code:null,stage:null});return states.get(app);}
 const disabledByPolicy=new Set();
 function sessionWorking(app){const s=app.safeSession,g=state(app);return !!(g.busy||g.loading||s?.busy||s?.persisting||s?.inspecting||app.safeAutoSync?.running);}
 function paintWorking(app){
  const g=state(app),busy=sessionWorking(app)||!!g.checking;
  const selector='button[onclick],input[onchange],#confirm-ok-btn,#online-policy-check,#item-form button[type="submit"]';
  for(const el of document.querySelectorAll(selector)){
   const action=(el.getAttribute('onclick')||el.getAttribute('onchange')||'');
   if(!['confirm-ok-btn','online-policy-check'].includes(el.id)&&!/(adicionar|remover|deleteItem|saveItem|saveRenda|atualizar|togglePaid|limparGastos|CopiadeGastos)/.test(action)&&!el.matches?.('#item-form button[type="submit"]'))continue;
   if(busy&&!el.disabled){el.disabled=true;disabledByPolicy.add(el);}
  }
  if(!busy){for(const el of disabledByPolicy)el.disabled=false;disabledByPolicy.clear();}
  let el=document.getElementById('operation-progress');if(!el){el=document.createElement('div');el.id='operation-progress';el.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;z-index:10050;padding:10px 14px;border-radius:10px;background:#382265;color:white;pointer-events:none;font:14px system-ui;max-width:650px;box-sizing:border-box';el.setAttribute('role','status');document.body.prepend(el);}
  el.hidden=!busy;el.textContent=busy?'Aguarde: conferindo ou salvando com segurança. Nenhuma nova alteração será iniciada.':'';
  if(busy&&!g.paintTimer){g.paintTimer=setTimeout(()=>{g.paintTimer=null;paintWorking(app);},100);g.paintTimer.unref?.();}
 }
 function deferConfirmation(app){const g=state(app);if(g.deferred)return;g.deferred=setTimeout(()=>{g.deferred=null;if(sessionWorking(app)){deferConfirmation(app);return;}const s=app.safeSession;if(s?.state.status==='CONFIRMED'&&!s.state.sent&&!s.state.autoRetryBlocked)void app.confirmOnlineAccess();paintWorking(app);},100);g.deferred.unref?.();}
 function notice(app,ready,code=null,stage=null){const g=state(app);g.ready=ready;g.code=ready?null:code;g.stage=stage;let el=document.getElementById('online-policy-status');if(!el){el=document.createElement('div');el.id='online-policy-status';el.setAttribute('role','status');document.body.prepend(el);}el.dataset.ready=String(ready);el.textContent=code==='CHECKING'?'Aguarde: conferindo ou salvando com segurança.':ready?'Servidor e persistência local conferidos. Cada alteração será verificada novamente.':'Operações financeiras bloqueadas: é preciso confirmar internet, sessão, servidor e persistência local, sem pendências ou conflitos. Consultas e backups continuam disponíveis.';if(!ready&&code&&code!=='CHECKING')el.textContent+=' Código: '+code+(stage?' — etapa: '+stage:'');let button=document.getElementById('online-policy-check');if(!button){button=document.createElement('button');button.id='online-policy-check';button.type='button';button.textContent='Conferir servidor e pendências';el.after(button);}paintWorking(app);button.onclick=async()=>{button.disabled=true;try{await app.loadUserData();}catch{}finally{button.disabled=false;}};}
 function fail(code='ONLINE_REQUIRED'){throw F.error(code);}
 function safeCode(e){const c=e?.code||e?.message;const allowed=['AMBIGUOUS_RECORD','STALE_RECORD','LOCAL_ACCESS_DENIED','LOCAL_ARCHIVE_HASH','LOCAL_ARCHIVE_INVALID','LOCAL_ARCHIVE_OWNER','LOCAL_ASYNC_REQUIRED','LOCAL_BUSY','LOCAL_CHANGED','LOCAL_COLLISION','LOCAL_CONFLICT','LOCAL_CORRUPT','LOCAL_DATABASE_ENUMERATION_REQUIRED','LOCAL_DELETE_FORBIDDEN','LOCAL_EMERGENCY_CHANGED','LOCAL_EMERGENCY_EVIDENCE','LOCAL_EMERGENCY_RESOLUTION','LOCAL_GENERATION_EXHAUSTED','LOCAL_HASH_COLLISION','LOCAL_IDB_ABORT','LOCAL_IDB_BLOCKED','LOCAL_IDB_CORRUPT','LOCAL_INVALID_PREFERENCE','LOCAL_LEGACY_CHANGED','LOCAL_LOCK_BUSY','LOCAL_LOCK_UNAVAILABLE','LOCAL_MIGRATION_MISMATCH','LOCAL_MIGRATION_REQUIRED','LOCAL_OWNER_REQUIRED','LOCAL_PARENT_MISSING','LOCAL_PREFERENCE_FAILED','LOCAL_QUOTA','LOCAL_RECERTIFICATION_REQUIRED','LOCAL_RECOVERY_BLOCKED','LOCAL_SERIALIZATION','LOCAL_STATE_UNPROVEN','LOCAL_WRITE_FAILED','CONFIRMED','CONFLICT','PENDING','UNCERTAIN','OFFLINE','LOCAL_CORRUPT','ONLINE_REQUIRED','ONLINE_TIMEOUT','NETWORK_OFFLINE','AUTH_REQUIRED','AUTH_UNVERIFIED','SESSION_CHANGED','SESSION_BUSY','SESSION_NOT_CONFIRMED','RETRY_BLOCKED','REMOTE_BASE_MISSING','LOCAL_PENDING','VIEW_DIVERGED','STATE_CHANGED','REMOTE_ABSENT','REMOTE_PROTOCOL','REMOTE_CHANGED','VERSION_INCOMPATIBLE','ORIGIN_OR_CONTEXT_BLOCKED','BUSY','LOCAL_QUOTA','LOCAL_STATE_UNPROVEN','LOCAL_CONFLICT','LOCAL_CHANGED','LOCAL_IDB_CORRUPT','LOCAL_IDB_BLOCKED','LOCAL_LOCK_BUSY','LOCAL_WRITE_FAILED','LOCAL_LEGACY_CHANGED','LOCAL_MIGRATION_MISMATCH','permission-denied','unavailable','auth/network-request-failed','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled'];return allowed.includes(c)?c:'CHECK_FAILED';}

 async function bounded(task){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(F.error('ONLINE_TIMEOUT')),8000);})]);}finally{clearTimeout(timer);}}
 function identity(app,s,user){if(!s.persisted||s.persistenceError)throw F.error(s.persistenceError||'LOCAL_STATE_UNPROVEN');try{F.verifyPersistence(s);}catch(e){s.persisted=false;s.persistenceError=F.classifyLocalError(e);throw F.error(s.persistenceError);}s.current();if(app.safeSession!==s||!s.active||auth.currentUser!==user||user.uid!==s.uid||firebase.app().options.projectId!==F.PROJECT)fail('SESSION_CHANGED');ProductionRuntime.assertWrite();}
 async function confirmServer(app){
  let stage='session';try{
  const s=app.safeSession,user=auth.currentUser;if(!s||!user)fail('AUTH_REQUIRED');if(navigator.onLine===false)fail('NETWORK_OFFLINE');
  const settled=()=>{if(s.busy||s.persisting||s.inspecting)fail('SESSION_BUSY');if(s.state.status!=='CONFIRMED')fail('SESSION_NOT_CONFIRMED');if(s.state.autoRetryBlocked)fail('RETRY_BLOCKED');if(!s.state.base)fail('REMOTE_BASE_MISSING');if(s.pending())fail('LOCAL_PENDING');if(!F.equal(app.data,s.state.data))fail('VIEW_DIVERGED');};
  stage='local-before';settled();await s.verifyDurable();identity(app,s,user);settled();
  const stamp={revision:s.revision,tip:s.tip,year:app.currentYear,month:app.currentMonth};
  // Both are read-only. Neither result authorizes a mutation on its own.
  // Collect both outcomes so late failures cannot escape or change a newer check.
  const outcomes=await Promise.allSettled([
   bounded(Promise.resolve().then(()=>user.reload())),
   bounded(Promise.resolve().then(()=>s.remote.read()))
  ]);
  stage='auth-reload';if(outcomes[0].status==='rejected')throw outcomes[0].reason;
  stage='local-after-auth';settled();identity(app,s,user);if(user.emailVerified!==true)fail('AUTH_UNVERIFIED');
  stage='server-read';if(outcomes[1].status==='rejected')throw outcomes[1].reason;
  const remote=outcomes[1].value;stage='local-after-server';settled();await s.verifyDurable();identity(app,s,user);
  stage='comparison';if(navigator.onLine===false)fail('NETWORK_OFFLINE');settled();if(s.revision!==stamp.revision||s.tip!==stamp.tip||app.currentYear!==stamp.year||app.currentMonth!==stamp.month)fail('STATE_CHANGED');if(!remote.exists)fail('REMOTE_ABSENT');if(remote.version?.syncProtocol!==1||!Number.isSafeInteger(remote.version?.syncRevision)||remote.version.syncRevision<0)fail('REMOTE_PROTOCOL');if(!F.equal(remote,s.state.base))fail('REMOTE_CHANGED');
  return s;
  }catch(e){const safe=F.error(safeCode(e));safe.onlineStage=stage;throw safe;}
 }
 async function run(app,fn){const g=state(app);if(sessionWorking(app)||g.checking){paintWorking(app);app.showNotification?.('Aguarde a operação atual terminar. Esta ação não foi executada.','info');return false;}g.check++;g.busy=true;notice(app,false,'CHECKING','mutation');try{await confirmServer(app);let result;g.permit++;try{result=fn();}finally{g.permit--;}return await result;}catch(e){g.check++;notice(app,false,safeCode(e),e.onlineStage||'mutation');app.showNotification?.('Alteração bloqueada. Código: '+safeCode(e)+' — etapa: '+(e.onlineStage||'mutation')+'. Dados preservados.','warning');return false;}finally{g.busy=false;paintWorking(app);}}
 const entry=['saveItem','saveRendaFamiliar','adicionarGastoRapido','atualizarSaldoMes','atualizarProximoPagamento','togglePaidStatus','deleteItem','limparGastosDia','copyPreviousMonthExpenses','executarCopiadeGastos'];
 const deleteDialog=p.deleteItem;
 for(const name of entry){if(name==='deleteItem')continue;const original=p[name];if(typeof original!=='function')throw Error('ONLINE_ENTRY_MISSING_'+name);p[name]=function(...args){if(state(this).permit)return original.apply(this,args);return run(this,()=>original.apply(this,args));};}
 // Opening this dialog does not mutate data. Its callback always gets fresh online admission.
 p.deleteItem=function(...args){const g=state(this),s=this.safeSession;
  if(sessionWorking(this)||g.checking){paintWorking(this);this.showNotification?.('Aguarde a operação atual terminar. Esta ação não foi executada.','info');return false;}
  if(!g.ready||!s||s.state.status!=='CONFIRMED'||s.state.sent||s.state.autoRetryBlocked||s.pending()||navigator.onLine===false)return run(this,()=>deleteDialog.apply(this,args));
  try{identity(this,s,auth.currentUser);g.dialogOnly=true;return deleteDialog.apply(this,args);}catch(e){notice(this,false,safeCode(e),'dialog');return false;}finally{g.dialogOnly=false;}
 };
 const income=p.atualizarRendaFamiliar;p.atualizarRendaFamiliar=function(save=true){if(!save||state(this).permit)return income.apply(this,arguments);return run(this,()=>income.apply(this,arguments));};
 // These helpers must stay synchronous: saveItem relies on their boolean result.
 for(const name of ['addNewItem','updateExistingItem','setCreditSummaryStatus']){const original=p[name];p[name]=function(...args){if(!state(this).permit){notice(this,false,'ONLINE_REQUIRED','helper');return false;}return original.apply(this,args);};}
 const save=p.saveData;p.saveData=function(...args){if(!state(this).permit&&!F.equal(this.data,this.safeSession?.state.data)){notice(this,false,'VIEW_DIVERGED','save');return Promise.resolve(false);}return save.apply(this,args);};
 // A dialog may stay open across a disconnection; confirm again at the actual mutation.
 const modal=p.showConfirmModal;p.showConfirmModal=function(title,message,callback){return modal.call(this,title,message,(state(this).permit||state(this).dialogOnly)?()=>run(this,callback):callback);};
 const load=p.loadUserData;p.loadUserData=function(...args){
  const g=state(this),session=this.safeSession;if(g.loading?.session===session)return g.loading.promise;
  const ticket=++g.check,task={session,promise:null};g.loading=task;notice(this,false,'CHECKING','load');paintWorking(this);
  task.promise=Promise.resolve().then(async()=>{try{const result=await load.apply(this,args);if(g.loading!==task||this.safeSession!==session)return false;await this.confirmOnlineAccess();return result;}catch(e){if(g.loading===task&&this.safeSession===session&&!g.ready)notice(this,false,safeCode(e),'load');return false;}finally{if(g.loading===task)g.loading=null;paintWorking(this);}});return task.promise;
 };
 p.confirmOnlineAccess=async function(){const g=state(this),check=++g.check,session=this.safeSession;g.checking=(g.checking||0)+1;paintWorking(this);try{await confirmServer(this);if(g.check!==check||this.safeSession!==session)return false;notice(this,true);return true;}catch(e){if(g.check!==check||this.safeSession!==session)return false;if(this.safeSession?.persistenceError)show.call(this,this.safeSession.persistenceError);notice(this,false,safeCode(e),e.onlineStage||'confirmation');return false;}finally{g.checking--;paintWorking(this);}};
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
 const show=p.showSafetyStatus;p.showSafetyStatus=function(code){const result=show.apply(this,arguments);const label=document.getElementById('sync-status-text');if(label&&label.textContent.startsWith('Operação bloqueada'))label.textContent+=' ['+safeCode({code})+'; etapa: status]';state(this).check++;notice(this,false,code==='CONFIRMED'?'CHECKING':safeCode({code}),'status');if(code==='CONFIRMED'&&!state(this).loading){if(sessionWorking(this))deferConfirmation(this);else void this.confirmOnlineAccess();}return result;};
 const deactivate=p.deactivateUser;p.deactivateUser=function(...args){state(this).check++;notice(this,false,'AUTH_REQUIRED','deactivate');return deactivate.apply(this,args);};
 document.addEventListener('DOMContentLoaded',()=>{const get=()=>typeof app!=='undefined'?app:null;const refresh=()=>{const a=get();if(a)void a.receiveRemoteUpdates();};root.addEventListener('offline',()=>{const a=get();if(a){state(a).check++;notice(a,false,'NETWORK_OFFLINE','offline');}});root.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});refresh();});
 root.OnlinePolicy={confirmServer,run,entries:entry,diagnostic:app=>{const g=state(app);return {ready:g.ready,code:g.code,stage:g.stage};}};
})(globalThis);
