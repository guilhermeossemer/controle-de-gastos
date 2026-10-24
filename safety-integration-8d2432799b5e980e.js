/* Candidata 3N. Publicação exige autorização separada. */
'use strict';
const SF=SafeFinance;
const nativeLocalStorage=globalThis.localStorage;
let preferenceUid=null,preferenceStore=null,restoringPreferences=false;
const preferenceKeys=new Set(['theme','accentTheme','brandPalette','hideValues','dailyExpenseIdeal']);
const SafeLocalStorage={
 getItem(key){
   if(!preferenceKeys.has(key))return null; // Dados legados nunca são associados a uma conta.
   const durable=preferenceStore?.uid===preferenceUid?preferenceStore.getItem(key):null;if(durable!==null)return durable;
   const scoped=preferenceUid?nativeLocalStorage.getItem(`safe-finance:${SF.PROJECT}:${encodeURIComponent(preferenceUid)}:preference:${key}`):null;
   return scoped??nativeLocalStorage.getItem(key); // Apenas preferências visuais/configuração, somente leitura.
 },
 setItem(key,value){
   if(!preferenceKeys.has(key))throw SF.error('LEGACY_WRITE_BLOCKED');
   if(restoringPreferences)return; // Reapplying preferences must not consume exhausted legacy quota.
   if(preferenceUid&&preferenceStore?.uid===preferenceUid){const owner=preferenceUid;void preferenceStore.put(key,String(value)).catch(()=>{if(preferenceUid===owner&&typeof app!=='undefined')app.showNotification?.('Prefer�ncia aplicada somente nesta sess�o: n�o foi poss�vel salv�-la no dispositivo.','warning');});}
 }
};
function developmentRemote(owner){
 ProductionRuntime.environment();if(!db||!auth||firebase.app().options.projectId!==SF.PROJECT)throw SF.error('PROJECT_MISMATCH');
 const uid=owner.uid;
 const check=()=>{owner.assert();if(currentUser?.uid!==uid)throw SF.error('SESSION_CHANGED');};
 const ref=db.collection('users').doc(uid).collection('data').doc('gastos');
 const snapshot=s=>{
   if(s.metadata?.fromCache||s.metadata?.hasPendingWrites)throw SF.error('REMOTE_UNCONFIRMED');
   if(!s.exists)return {exists:false};
   const doc=s.data();if(!doc.controleGastos||typeof doc.controleGastos!=='object'||Array.isArray(doc.controleGastos))throw SF.error('INVALID_REMOTE');
   return {exists:true,data:SF.clone(doc.controleGastos),version:SF.clone(doc)};
 };
 return {
   async read(){check();const response=await ref.get({source:'server'});if(response.ref.path!==ref.path)throw SF.error('DOCUMENT_MISMATCH');const data=snapshot(response);check();return data;},
   validateSnapshot(value){check();if(auth.currentUser?.uid!==uid||auth.currentUser?.emailVerified!==true||firebase.app().options.projectId!==SF.PROJECT)throw SF.error('SESSION_CHANGED');return value?.exists===true&&value.version?.syncProtocol===1;},
   async commit(base,candidate,guard){
     ProductionRuntime.assertWrite();check();await db.runTransaction(async tx=>{
       ProductionRuntime.assertWrite();
       check();await guard();const remote=snapshot(await tx.get(ref));check();await guard();
       if(!SF.equal(remote,base))throw SF.error('CONFLICT');
       if(remote.version.syncProtocol!==1||!Number.isSafeInteger(remote.version.syncRevision)||remote.version.syncRevision<0||remote.version.syncRevision>=Number.MAX_SAFE_INTEGER)throw SF.error('REVISION_REQUIRED');
       // Só substitui o histórico após verificar conteúdo COMPLETO + metadados na transação.
       // Campos externos desconhecidos são preservados por update, não recriados.
       ProductionRuntime.assertWrite();tx.update(ref,{controleGastos:SF.clone(candidate),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),syncRevision:remote.version.syncRevision+1});
     });check();
   }
 };
}
const proto=ControleGastos.prototype;
const previous={};for(const name of Object.getOwnPropertyNames(proto))if(typeof proto[name]==='function')previous[name]=proto[name];
const statuses={CONFIRMED:'Salvo e confirmado na nuvem',PENDING:'Salvo apenas localmente — envio pendente',NO_BASE:'Sem base confirmada — envio bloqueado',LOCAL_CONFLICT:'Conflito entre abas — dados preservados; revisão necessária',CONFLICT:'Conflito com a nuvem — nenhuma versão escolhida',UNCERTAIN:'Resultado remoto incerto — conferir antes de reenviar',OFFLINE:'Sem conexão — alterações locais preservadas',REMOTE_ABSENT:'Documento ausente — criação automática bloqueada',LOCAL_WRITE_FAILED:'Falha local — mantenha esta aba aberta e exporte backup'};
statuses.REVISION_REQUIRED='Documento sem revisão compatível — envio bloqueado; transição explícita necessária';
Object.assign(statuses,{LOCAL_QUOTA:'Armazenamento local sem espaço — dados preservados.',LOCAL_ACCESS_DENIED:'Acesso ao armazenamento negado — dados preservados.',LOCAL_SERIALIZATION:'Não foi possível serializar o estado local.',LOCAL_STATE_UNPROVEN:'Persistência local ainda não comprovada.',LOCAL_COLLISION:'Colisão no diário — revisão necessária.',LOCAL_PARENT_MISSING:'Cadeia do diário incompleta — revisão necessária.',LOCAL_CORRUPT:'Diário local inválido — revisão necessária.',LOCAL_CHANGED:'Estado local mudou durante a verificação.'});
Object.assign(statuses,{LOCAL_MIGRATION_REQUIRED:'Cópia local validada necessária — nenhum envio autorizado.',LOCAL_LEGACY_CHANGED:'Uma versão antiga alterou o diário — feche escritores antigos e preserve as versões.',LOCAL_IDB_ABORT:'Transação local interrompida — dados anteriores preservados.',LOCAL_LOCK_BUSY:'Outra aba está usando o armazenamento.',LOCAL_IDB_CORRUPT:'Verificação local falhou — mantenha os backups.'});
statuses.LOCAL_RECERTIFICATION_REQUIRED='Persistência exige releitura integral protegida — dados preservados.';
proto.showSafetyStatus=function(code){if(code==='CONFIRMED'&&this.safeSession&&(!this.safeSession.persisted||this.safeSession.persistenceError))code=this.safeSession.persistenceError||'LOCAL_STATE_UNPROVEN';const text=statuses[code]||'Operação bloqueada — dados preservados; revisão necessária';this.atualizarStatusSincronizacao(text+(/^LOCAL_[A-Z_]+$/.test(code)?' ['+code+']':'')+(this.legacyUnassigned?' | Dados legados preservados, sem associação automática.':''),code==='CONFIRMED'?'success':'error');};
proto.deactivateUser=function(){
 this.desabilitarBotoesSincronizacao();
 if(this.safeSession){this.safeSession.close();this.suspendedSessions??=new Map();this.suspendedSessions.set(this.safeSession.uid,this.safeSession);}
 this.safeSession=null;this.userId=null;preferenceUid=null;preferenceStore=null;this.data={};this.rendaFamiliar=this.createMonthData().rendaFamiliar;this.editingItem=null;this.editingReference=null;this.actionReferences=new Map();this.isDataLoaded=false;this.clearInterface();
};
proto.activateUser=async function(uid){
 if(this.safeSession?.uid===uid&&this.safeSession.active)return;
 this.deactivateUser();preferenceUid=uid;this.userId=uid;
 this.legacyUnassigned=['controleGastos','rendaFamiliar','controleGastosBackups','backup_controleGastos'].some(key=>nativeLocalStorage.getItem(key)!==null);
 try{
   let session=this.suspendedSessions?.get(uid);
   if(session){session.active=true;}else {
     const user=auth.currentUser,guard=()=>auth.currentUser===user&&user?.uid===uid&&user.emailVerified===true&&currentUser?.uid===uid&&firebase.app().options.projectId===SF.PROJECT;
     let store;try{store=await DurableJournal.open({uid,legacy:nativeLocalStorage,guard});}catch(e){
       if(e.code!=='LOCAL_MIGRATION_REQUIRED')throw e;
       if(!confirm('Copiar e validar o diário para IndexedDB, preservando integralmente o armazenamento antigo? Prossiga somente com backup externo conferido, sem outras abas/versões antigas abertas e sem alterações pendentes fora do backup. Nenhum envio financeiro será feito por esta cópia.'))throw SF.error('LOCAL_MIGRATION_REQUIRED');
       store=await DurableJournal.open({uid,legacy:nativeLocalStorage,guard,allowMigration:true});
     }
     if(!guard())throw SF.error('SESSION_CHANGED');
     session=new SF.Session({storage:store,uid,uuid:()=>crypto.randomUUID(),lock:navigator.locks?((name,fn)=>navigator.locks.request(name,fn)):null});
   }
   this.safeSession=session;session.remote=developmentRemote(session);
   const loadedPreferences=await DurableJournal.preferences(uid);if(auth.currentUser?.uid!==uid||this.safeSession!==session)throw SF.error('SESSION_CHANGED');preferenceStore=loadedPreferences;
   this.habilitarBotoesSincronizacao();
   this.data=SF.clone(session.state.data);this.isDataLoaded=true;
   this.hideValues=SafeLocalStorage.getItem('hideValues')==='true';this.dailyExpenseIdeal=Number(SafeLocalStorage.getItem('dailyExpenseIdeal')??22);
   // Os listeners já foram registrados pelo construtor. Reaplicar só valores.
   restoringPreferences=true;try{
   this.setTheme(SafeLocalStorage.getItem('theme')||'light');
   this.setAccentTheme(SafeLocalStorage.getItem('accentTheme')||'default');
   this.setHideValues(this.hideValues,false);this.setDailyExpenseIdeal(this.dailyExpenseIdeal);
   }finally{restoringPreferences=false;}
   await this.loadUserData();
 }catch(e){this.showSafetyStatus(SF.classifyLocalError(e));}
};
proto.loadUserData=async function(){
 const session=this.safeSession;if(!session||session.persisting)return false;let failure=null;
 if(this.isDataLoaded&&!SF.equal(this.data,session.state.data))return false;
 try{await session.inspect();}catch(e){failure=e.code||session.state.status;}
 if(this.safeSession!==session||!session.active)return false;
 this.data=SF.clone(session.state.data);this.rendaFamiliar=this.loadRendaFamiliar();this.isDataLoaded=!session.blocked;
 this.showSafetyStatus(failure||session.state.status);if(this.isDataLoaded){this.renderRendaFamiliar();this.loadDailyExpenses();this.renderAll();}
 return session.state.status==='CONFIRMED'&&session.persisted&&!session.persistenceError;
};
proto.loadData=function(){return SF.clone(this.safeSession?.state.data||{});};
proto.loadLocalDataFallback=function(){this.data=this.loadData();this.showSafetyStatus('OFFLINE');};
proto.saveData=async function(){
 const session=this.safeSession;if(!session||!session.active||!this.isDataLoaded)return false;
 try{await session.edit(this.data);this.showSafetyStatus(session.state.status);return true;}
 catch(e){this.showSafetyStatus(e.code||'LOCAL_WRITE_FAILED');return false;}
};
proto.saveToFirestore=async function(){
 const session=this.safeSession;if(!session||!session.active)return false;
 try{if(!await this.saveData())return false;await session.upload();if(this.safeSession===session)this.showSafetyStatus(session.state.status);return true;}
 catch(e){if(this.safeSession===session)this.showSafetyStatus(e.code||session.state.status);return false;}
};
proto.sincronizarComNuvem=async function(){return this.saveToFirestore();};
proto.sincronizarAgora=async function(){return this.saveToFirestore();};
proto.baixarDaNuvem=async function(){return this.loadUserData();};
proto.verificarDadosNuvem=async function(){return this.loadUserData();};
proto.configurarSincronizacaoAutomatica=function(){};
proto.inicializarFirebase=async function(){await this.aguardarFirebase();if(currentUser)await this.activateUser(currentUser.uid);};
proto.createLocalBackupBeforeSync=function(){return !!this.safeSession?.persisted;};
proto.saveLocalSnapshotBeforeRestore=function(){return false;};
proto.restoreBackupData=function(){this.showNotification('Restauração exige conferência de origem e revisão; dados atuais preservados.','warning');};
proto.migrateOldData=function(){throw SF.error('LEGACY_ORIGIN_UNKNOWN');};
proto.getMonthData=function(year,month,createIfMissing=this._safeMutation===true){
 if(this._safeMutation&&createIfMissing){this.ensureMonthDataExists(year,month);return this.data[year][month];}
 const source=this.data?.[year]?.[month];if(!source)return this.createMonthData();
 const copy=SF.clone(source);
 for(const origin of ['expenses','creditCard','dailyExpenses'])for(const item of copy[origin]||[])Object.defineProperty(item,'_safeContext',{value:{year,month,origin},enumerable:false});
 return copy;
};
proto.getCurrentMonthData=function(){return this.getMonthData(this.currentYear,this.currentMonth,!!this._safeMutation);};
proto.ensureMonthDataExists=function(year=this.currentYear,month=this.currentMonth){
 if(!this._safeMutation)return;
 if(!/^\d{4}$/.test(String(year))||! /^(?:[1-9]|1[0-2])$/.test(String(month)))throw SF.error('INVALID_PERIOD');
 if(!this.data[year])this.data[year]={};if(!this.data[year][month])this.data[year][month]=this.createMonthData();
};
proto.loadRendaFamiliar=function(){
 const entry=this.data?.[this.currentYear]?.[this.currentMonth];
 return SF.clone(entry?.rendaFamiliar||(entry?{meuSalario:2000,salarioDela:2000,totalTransferido:1500}:this.createMonthData().rendaFamiliar));
};
proto.saveRendaFamiliar=async function(){
 if(!this.safeSession||this.currentMonth==='total')return false;
 this._safeMutation=true;try{this.ensureMonthDataExists();const month=this.data[this.currentYear][this.currentMonth];month.rendaFamiliar={...month.rendaFamiliar,...this.rendaFamiliar};}finally{this._safeMutation=false;}
 return this.saveData();
};
proto.updateCreditSummaries=function(){}; // Consulta não apaga status antigos nem grava.
proto.actionReference=function(item,origin){
 if(!this.safeSession?.active)return 0;
 const options=[];
 if(item._safeContext)options.push(item._safeContext);
 else for(const year of Object.keys(this.data).filter(y=>/^\d{4}$/.test(y)))for(const month of Object.keys(this.data[year]).filter(m=>/^(?:[1-9]|1[0-2])$/.test(m))){
   const list=this.data[year][month]?.[origin];if(list?.some(r=>r===item))options.push({year,month,origin});
 }
 // Somente caso unívoco na competência selecionada; nunca procurar para editar globalmente.
 if(!options.length&&this.currentMonth!=='total')options.push({year:this.currentYear,month:this.currentMonth,origin});
 if(options.length!==1)return 0;
 try{const context={...options[0],id:item.id};const found=SF.locate(this.data,context);const token=(this.actionCounter||0)+1;this.actionCounter=token;this.actionReferences??=new Map();this.actionReferences.set(token,{...context,fingerprint:SF.canonical(found.item),session:this.safeSession});return token;}catch{return 0;}
};
proto.resolveAction=function(token,origin){const ref=this.actionReferences?.get(token);if(!ref||ref.session!==this.safeSession||!ref.session.active||ref.origin!==origin)throw SF.error('STALE_RECORD');SF.locate(this.data,ref);return ref;};
const origins={expense:'expenses',credit:'creditCard',daily:'dailyExpenses'};
proto.editItem=function(type,token){
 try{const ref=this.resolveAction(token,origins[type]);this.editingReference=ref;const found=SF.locate(this.data,ref);this.editingItem=found.item;this.openModal(type);document.getElementById('description').value=found.item.description||'';document.getElementById('value').value=Number(found.item.value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});if(type==='daily')document.getElementById('date').value=found.item.date;else document.getElementById('category').value=found.item.category;}catch{this.showSafetyStatus('AMBIGUOUS_RECORD');}
};
proto.updateExistingItem=function(description,value){
 try{
   const ref=this.editingReference;if(ref?.session!==this.safeSession)throw SF.error('STALE_RECORD');const {item,list,index}=SF.locate(this.data,ref);
   const updated={...item,description,value};
   if(ref.origin==='dailyExpenses'){
     const date=document.getElementById('date').value,parsed=this.validarDataInput(date);if(!parsed)throw SF.error('INVALID_DATE');
     const dest=this.data?.[parsed.year]?.[parsed.month]?.dailyExpenses;
     if((String(parsed.year)!==String(ref.year)||String(parsed.month)!==String(ref.month))&&dest?.some(x=>x.id===item.id))throw SF.error('AMBIGUOUS_RECORD');
     Object.assign(updated,{date,month:parsed.month,year:parsed.year});
     this._safeMutation=true;try{this.ensureMonthDataExists(parsed.year,parsed.month);}finally{this._safeMutation=false;}
     list.splice(index,1);this.data[parsed.year][parsed.month].dailyExpenses.push(updated);
   }else{updated.category=document.getElementById('category').value;list[index]=updated;}
   this.editingItem=updated;return true;
 }catch{this.showSafetyStatus('AMBIGUOUS_RECORD');return false;}
};
proto.deleteItem=function(type,token){
 let ref;try{ref=this.resolveAction(token,origins[type]);}catch{this.showSafetyStatus('AMBIGUOUS_RECORD');return;}
 this.showConfirmModal('Excluir Item','Excluir somente este lançamento nesta competência?',async()=>{
   try{if(ref.session!==this.safeSession||!ref.session.active)throw SF.error('SESSION_CHANGED');SF.remove(this.data,ref);await this.saveData();this.renderAll();this.loadDailyExpenses();}catch{this.showSafetyStatus('AMBIGUOUS_RECORD');}
 });
};
proto.removerGastoDiario=function(token){this.deleteItem('daily',token);};
proto.limparGastosDia=function(){
 const session=this.safeSession;if(!session?.active)return;
 const months=this.currentMonth==='total'?this.getYearMonthKeys():[this.currentMonth];const refs=[];
 for(const month of months)for(const item of this.data?.[this.currentYear]?.[month]?.dailyExpenses||[])refs.push({year:this.currentYear,month,origin:'dailyExpenses',id:item.id,fingerprint:SF.canonical(item)});
 if(!refs.length)return;
 this.showConfirmModal('Limpar gastos',`Remover os ${refs.length} lançamentos exibidos?`,async()=>{
   try{if(this.safeSession!==session||!session.active)throw SF.error('SESSION_CHANGED');refs.forEach(ref=>SF.locate(this.data,ref));refs.forEach(ref=>SF.remove(this.data,ref));await this.saveData();this.renderAll();this.loadDailyExpenses();}catch{this.showSafetyStatus('AMBIGUOUS_RECORD');}
 });
};
proto.nextRecordId=function(){
 const used=new Set();for(const year of Object.values(this.data))if(year&&typeof year==='object')for(const month of Object.values(year))if(month&&typeof month==='object')for(const origin of ['expenses','creditCard','dailyExpenses'])for(const item of month[origin]||[])used.add(item.id);
 let id=Date.now();while(used.has(id))id++;return id;
};
proto.copyPreviousMonthExpenses=function(){
 const session=this.safeSession,year=this.currentYear,month=this.currentMonth;
 if(!session?.active||month==='total')return;
 const previousMonth=month===1?12:month-1,previousYear=month===1?year-1:year;
 const previous=this.data?.[previousYear]?.[previousMonth];if(!previous)return;
 const snapshot=SF.clone(previous);
 this.showConfirmModal('Copiar gastos','Copiar para esta competência somente se estiver vazia?',async()=>{
   if(this.safeSession!==session||!session.active||this.currentYear!==year||this.currentMonth!==month||!SF.equal(this.data?.[previousYear]?.[previousMonth],snapshot)){this.showSafetyStatus('STALE_RECORD');return;}
   await this.executarCopiadeGastos(snapshot);
 });
};
proto.togglePaidStatus=async function(type,token,paid){
 try{
   if(type==='credit'&&['credit-essential','credit-desire','credit-investment'].includes(token)){if(this.currentMonth==='total')throw SF.error('INVALID_PERIOD');this.setCreditSummaryStatus(token,paid);}
   else{const ref=this.resolveAction(token,'expenses');SF.locate(this.data,ref).item.paid=paid;}
   await this.saveData();this.renderAll();
 }catch{this.showSafetyStatus('AMBIGUOUS_RECORD');}
};
// Operações explícitas podem criar competência; renderizações nunca herdam essa permissão.
for(const name of ['addNewItem','adicionarGastoRapido']){
 const fn=previous[name];proto[name]=function(...args){if(!this.safeSession?.active||!this.isDataLoaded)return false;const old=this._safeMutation;this._safeMutation=true;try{return fn.apply(this,args);}finally{this._safeMutation=old;}};
}
// A cópia conserva complementos antigos; nunca substitui listas de destino preenchidas.
proto.executarCopiadeGastos=async function(previousMonthData){
 if(!this.safeSession?.active||this.currentMonth==='total')return;
 this._safeMutation=true;try{
   this.ensureMonthDataExists();const target=this.data[this.currentYear][this.currentMonth];
   if(target.expenses?.length||target.creditCard?.length)throw SF.error('DESTINATION_NOT_EMPTY');
   const used=new Set();for(const year of Object.values(this.data))if(year&&typeof year==='object')for(const month of Object.values(year))if(month&&typeof month==='object')for(const origin of ['expenses','creditCard','dailyExpenses'])for(const item of month[origin]||[])used.add(item.id);
   for(const origin of ['expenses','creditCard'])target[origin]=(previousMonthData[origin]||[]).map(item=>{let id=Date.now();while(used.has(id))id++;used.add(id);return {...SF.clone(item),id,paid:false,year:this.currentYear,month:this.currentMonth};});
 }catch{this.showSafetyStatus('DESTINATION_NOT_EMPTY');return;}finally{this._safeMutation=false;}
 await this.saveData();this.renderAll();
};
for(const name of Object.keys(previous).filter(n=>/^render|^exportar/.test(n)||['updateAnalysis','updateSummary','updateMonthStats','updateAnnualHeaderStats','loadDailyExpenses','changeYear'].includes(n))){
 const fn=proto[name];proto[name]=function(...args){const old=this._safeMutation;this._safeMutation=false;try{return fn.apply(this,args);}finally{this._safeMutation=old;}};
}
// Portas globais antigas também não enviam sem o mecanismo novo.
sincronizarDados=async function(){if(app)await app.saveToFirestore();};
criarBackupLocal=function(){return app?.safeSession?.persisted||false;};
window.addEventListener('beforeunload',event=>{if(app?.safeSession&&(app.safeSession.pending()||!app.safeSession.persisted||app.safeSession.persisting)){event.preventDefault();event.returnValue='';}});

// Automatic scheduling never writes remotely except through Session.upload().
(()=>{'use strict';
 const eligible=s=>!!s?.active&&!s.blocked&&!s.state.autoRetryBlocked&&s.persisted&&!s.persisting&&!!s.state.base&&['PENDING','OFFLINE','CONFIRMED'].includes(s.state.status)&&s.pending();
 function create({getSession,assertReady,isOnline=()=>navigator.onLine!==false,onStatus=()=>{},delay=350,setTimer=setTimeout,clearTimer=clearTimeout}){
  let timer=null,running=null,runningSession=null,stopped=false,retry=1000;
  const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;};
  function schedule(wait=delay){cancel();if(stopped||!eligible(getSession()))return;timer=setTimer(()=>{timer=null;void flush();},wait);}
  async function work(s){
   if(!eligible(s)||s.busy)return false;
   const check=()=>{if(stopped||getSession()!==s||!s.active)throw SafeFinance.error('SESSION_CHANGED');assertReady(s);s.current();};
   try{check();}catch(e){if(getSession()===s&&e.code==='LOCAL_CONFLICT'){s.state.status='LOCAL_CONFLICT';onStatus(s);}return false;}
   if(!isOnline()){s.state.status='OFFLINE';onStatus(s);return false;}
   const revision=s.revision;
   // This read is BEFORE upload/UNCERTAIN. Failure here is known to have no commit.
   let remote;try{remote=await s.remote.read();}catch{
    if(getSession()===s&&eligible(s)&&s.revision!==revision){schedule();return false;}if(getSession()===s&&eligible(s)&&s.revision===revision){const changed=s.state.status!=='OFFLINE';s.state.status='OFFLINE';if(changed){try{await s.persist();}catch{}}onStatus(s);schedule(retry);retry=Math.min(retry*2,30000);}return false;
   }
   try{check();}catch(e){if(getSession()===s&&e.code==='LOCAL_CONFLICT'){s.state.status='LOCAL_CONFLICT';onStatus(s);}return false;}
   if(s.revision!==revision){schedule();return false;}
   if(!eligible(s))return false;
   if(!remote.exists||!SafeFinance.equal(remote,s.state.base)){
    s.state.status='CONFLICT';try{await s.persist();}catch{}onStatus(s);return false;
   }
   try{
    await s.upload(); // owns lock, transaction, uncertainty journal and final read
    retry=1000;if(getSession()===s&&s.active){onStatus(s);if(eligible(s))schedule();}
    return true;
   }catch{
    // NEVER retry an upload failure, including a lost acknowledgement.
    s.state.autoRetryBlocked=true;if(s.active){try{await s.persist();}catch{}}cancel();if(getSession()===s&&s.active)onStatus(s);return false;
   }
  }
  async function flush(manual=false){cancel();const s=getSession();if(running)return runningSession===s?running:Promise.resolve(false);if(stopped||!s)return Promise.resolve(false);if(manual){try{if(await s.emergencyEvidence()){onStatus(s);return false;}}catch{onStatus(s);return false;}}if(manual&&s.state.autoRetryBlocked&&['PENDING','OFFLINE','CONFIRMED'].includes(s.state.status)){s.state.autoRetryBlocked=false;try{await s.persist();}catch{onStatus(s);return Promise.resolve(false);}}runningSession=s;running=work(s).finally(()=>{running=null;runningSession=null;});return running;}
  return {schedule,flush,cancel,stop(){stopped=true;cancel();},get running(){return running!==null;}};
 }
 globalThis.SafeAutoSync={create,eligible};
 if(typeof ControleGastos==='undefined')return;
 const proto=ControleGastos.prototype,localSave=proto.saveData,deactivate=proto.deactivateUser,load=proto.loadUserData,show=proto.showSafetyStatus;
 function scheduler(app){return app.safeAutoSync??=create({getSession:()=>app.safeSession,assertReady:s=>{ProductionRuntime.assertWrite();if(currentUser?.uid!==s.uid||auth.currentUser?.uid!==s.uid||firebase.app().options.projectId!==SafeFinance.PROJECT)throw SafeFinance.error('SESSION_CHANGED');},onStatus:s=>{if(app.safeSession===s)app.showSafetyStatus(s.state.status);}});}
 proto.saveData=async function(){const s=this.safeSession;const saved=await localSave.call(this);if(saved&&this.safeSession===s&&s?.persisted)scheduler(this).schedule();return saved;};
 proto.saveToFirestore=async function(){if(!await this.saveData())return false;return scheduler(this).flush(true);};
 // Inspect may reconcile an UNCERTAIN journal on startup. It must not itself
 // authorize a retry; only a later explicit manual action can release this hold.
 proto.loadUserData=async function(){if(this.safeSession?.state.status==='UNCERTAIN'){this.safeSession.state.autoRetryBlocked=true;try{await this.safeSession.persist();}catch{this.showSafetyStatus('UNCERTAIN');return false;}}return load.call(this);};
 proto.showSafetyStatus=function(code){show.call(this,code);if(this.safeSession?.state.autoRetryBlocked){const el=document.getElementById('sync-status-text');if(el)el.textContent+=' | Reenvio automático pausado; confira o resultado e use Sincronizar agora.';}};
 proto.deactivateUser=function(){this.safeAutoSync?.stop();this.safeAutoSync=null;return deactivate.call(this);};
 proto.configurarSincronizacaoAutomatica=function(){scheduler(this);};
 document.addEventListener('DOMContentLoaded',()=>{
  const resolve=proto.resolveConflict;if(typeof resolve!=='function')return;
  proto.resolveConflict=async function(...args){const s=this.safeSession;const result=await resolve.apply(this,args);if(result&&this.safeSession===s&&s.state.status==='CONFIRMED'){s.state.autoRetryBlocked=false;await s.persist();this.showSafetyStatus('CONFIRMED');}return result;};
 });
 const wake=()=>{if(typeof app!=='undefined'&&app?.safeSession)scheduler(app).schedule();};
 window.addEventListener('online',wake);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wake();});
})();
