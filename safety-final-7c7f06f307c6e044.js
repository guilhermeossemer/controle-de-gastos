/* Candidata 3N. Sem restauração, migração ou resolução automática. */
(() => {
 'use strict';
 const F=SafeFinance;
 const storage={getItem:key=>app.safeSession.journal.storage.getItem(key)};
 const fail=code=>{throw F.error(code);};
 const scoped=uid=>`safe-finance:${F.PROJECT}:${encodeURIComponent(uid)}:3l:`;
 const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
 async function put(key,value){if(storage.getItem(key)!==null)fail('EVIDENCE_EXISTS');const text=JSON.stringify(value);await app.safeSession.journal.storage.put(key,text);if(storage.getItem(key)!==text)fail('LOCAL_WRITE_FAILED');return text;}
 function check(s){ProductionRuntime.environment();if(firebase.app().options.projectId!==F.PROJECT)fail('PROJECT_MISMATCH');if(!s?.active||app.safeSession!==s||auth.currentUser?.uid!==s.uid||currentUser?.uid!==s.uid)fail('SESSION_CHANGED');}
 function diff(a,b,p='$'){
  if(F.equal(a,b))return [];
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return [p];
  return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>!Object.hasOwn(a,k)||!Object.hasOwn(b,k)?[p+'['+JSON.stringify(k)+']']:diff(a[k],b[k],p+'['+JSON.stringify(k)+']'));
 }
 function validate(data){
  const map=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const numeric=v=>typeof v==='number'&&Number.isFinite(v);
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  function json(v){if(typeof v==='number'&&!Number.isFinite(v))fail('INVALID_NUMBER');if(v&&typeof v==='object'){for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))fail('UNSAFE_KEY');json(v[k]);}}else if(!['string','number','boolean','object'].includes(typeof v))fail('INVALID_JSON');}
  json(data);if(!map(data))fail('INVALID_HISTORY');
  for(const [year,months] of Object.entries(data)){
   if(!/^\d{4}$/.test(year))continue;if(!map(months))fail('INVALID_YEAR');
   for(const [month,entry]of Object.entries(months)){
    if(month==='total')continue; // Opaque legacy key, never a calendar month.
    if(!/^(?:[1-9]|1[0-2])$/.test(month)||!map(entry))fail('INVALID_MONTH');
    for(const origin of ['expenses','creditCard','dailyExpenses']){
     if(!Object.hasOwn(entry,origin))continue;if(!Array.isArray(entry[origin]))fail('INVALID_RECORDS');
     const ids=new Set();for(const record of entry[origin]){
      if(!map(record)||!Object.hasOwn(record,'id')||!(numeric(record.id)||(typeof record.id==='string'&&record.id.length>0)))fail('INVALID_ID');
      const key=typeof record.id+':'+record.id;if(ids.has(key))fail('DUPLICATE_ID');ids.add(key);
      if(!numeric(record.value))fail('INVALID_VALUE');
      if(Object.hasOwn(record,'description')&&typeof record.description!=='string')fail('INVALID_DESCRIPTION');
      if(Object.hasOwn(record,'category')&&typeof record.category!=='string')fail('INVALID_CATEGORY');
      if(Object.hasOwn(record,'paid')&&typeof record.paid!=='boolean')fail('INVALID_STATUS');
      if(Object.hasOwn(record,'date')&&(typeof record.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||new Date(record.date+'T00:00:00Z').toISOString().slice(0,10)!==record.date))fail('INVALID_DATE');
     }
    }
    if(Object.hasOwn(entry,'rendaFamiliar')){if(!map(entry.rendaFamiliar))fail('INVALID_INCOME');for(const key of ['meuSalario','salarioDela','salarioJoceline','totalTransferido'])if(Object.hasOwn(entry.rendaFamiliar,key)&&!numeric(entry.rendaFamiliar[key]))fail('INVALID_INCOME');}
   }
  }
  if(Object.hasOwn(data,'monthBalance')){if(!map(data.monthBalance)||Object.values(data.monthBalance).some(v=>!numeric(v)))fail('INVALID_BALANCE');}
  if(Object.hasOwn(data,'nextPaymentDates')){if(!map(data.nextPaymentDates)||Object.values(data.nextPaymentDates).some(v=>v!==''&&!validDate(v)))fail('INVALID_PAYMENT');}
  if(Object.hasOwn(data,'creditSummaryStatus')&&!map(data.creditSummaryStatus))fail('INVALID_STATUS');
  return true;
 }
 const journalRows=s=>s.journal.entries().sort((a,b)=>a.key.localeCompare(b.key));
 function independentRemote(s){return developmentRemote({uid:s.uid,assert:()=>check(s)});}
 function preserveUnknown(candidate,sources){
  const objects=values=>values.filter(v=>v&&typeof v==='object'&&!Array.isArray(v));
  function extra(c,ss,known){ss=objects(ss);const keys=new Set([...Object.keys(c||{}),...ss.flatMap(Object.keys)]);for(const k of keys)if(!known(k)&&(!Object.hasOwn(c||{},k)||!ss.some(s=>Object.hasOwn(s,k)&&F.equal(s[k],c[k]))))fail('UNKNOWN_FIELD_CHANGED');}
  for(const source of sources)for(const y of Object.keys(source||{}))if(/^\d{4}$/.test(y)&&Object.hasOwn(source[y]||{},'total')&&!Object.hasOwn(candidate[y]||{},'total'))fail('UNKNOWN_FIELD_CHANGED');
  extra(candidate,sources,k=>/^\d{4}$/.test(k)||['monthBalance','nextPaymentDates','creditSummaryStatus'].includes(k));
  for(const y of Object.keys(candidate).filter(k=>/^\d{4}$/.test(k))){const ys=objects(sources.map(s=>s?.[y]));extra(candidate[y],ys,k=>k!=='total');for(const [m,entry]of Object.entries(candidate[y])){if(m==='total')continue;const ms=objects(ys.map(s=>s[m]));extra(entry,ms,k=>['expenses','creditCard','dailyExpenses','rendaFamiliar'].includes(k));
   if(entry.rendaFamiliar)extra(entry.rendaFamiliar,ms.map(s=>s.rendaFamiliar),k=>['meuSalario','salarioDela','salarioJoceline','totalTransferido'].includes(k));
   for(const origin of ['expenses','creditCard','dailyExpenses'])for(const row of entry[origin]||[]){const rs=ms.flatMap(s=>s[origin]||[]).filter(r=>r.id===row.id);extra(row,rs,k=>['id','value','description','category','paid','date','year','month'].includes(k));}
  }}
  // Opaque legacy status extensions must come from a preserved source unchanged.
  if(candidate.creditSummaryStatus&&!sources.some(s=>F.equal(s?.creditSummaryStatus,candidate.creditSummaryStatus)))fail('UNKNOWN_STATUS_CHANGED');
 }
 let dossier=null,verifiedHash=null;
 const p=ControleGastos.prototype;
 p.provisionFirst=async function(confirmed){
  const s=this.safeSession;ProductionRuntime.assertWrite();check(s);if(!confirmed)fail('EXPLICIT_CONFIRMATION_REQUIRED');
  if(!navigator.locks)fail('LOCAL_LOCK_UNAVAILABLE');
  return navigator.locks.request(`safe-finance:${F.PROJECT}:${s.uid}`,async()=>{
   check(s);await s.journal.storage.verify();s.current();if(Object.keys(s.state.data).length||s.state.base)fail('LOCAL_OR_LEGACY_DATA_PRESENT');
   const user=auth.currentUser;await user.reload();const token=await user.getIdTokenResult(true);check(s);if(token.claims.email_verified!==true)fail('VERIFIED_OWNER_REQUIRED');
   const remote=independentRemote(s),before=await remote.read();check(s);if(before.exists)fail('DOCUMENT_EXISTS');
   // A confirmed server absence + explicit click is required on EVERY attempt.
   // An uncertain intent is preserved, never replayed automatically on reconnect.
   await put(scoped(s.uid)+'provision:'+crypto.randomUUID(),{uid:s.uid,project:F.PROJECT,status:'ATTEMPT_REQUIRES_SERVER_CHECK',createdAt:new Date().toISOString()});
   const ref=db.doc(`users/${s.uid}/data/gastos`);
   try{await db.runTransaction(async tx=>{ProductionRuntime.assertWrite();check(s);s.current();const snap=await tx.get(ref);check(s);if(snap.exists)fail('DOCUMENT_EXISTS');if(Object.keys(s.state.data).length||s.state.base)fail('LOCAL_CHANGED');ProductionRuntime.assertWrite();tx.set(ref,{controleGastos:{monthBalance:{},nextPaymentDates:{},creditSummaryStatus:{}},syncProtocol:1,syncRevision:0,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});});}
   catch(e){if(s.active){s.state.status='UNCERTAIN';this.showSafetyStatus('UNCERTAIN');}throw e;}
   check(s);await this.loadUserData();if(s.state.status!=='CONFIRMED')fail('UNCERTAIN');return true;
  });
 };
 p.preserveConflict=async function(){
  const s=this.safeSession;check(s);const emergency=await s.emergencyEvidence();if(!emergency&&!['CONFLICT','LOCAL_CONFLICT'].includes(s.state.status))fail('NO_CONFLICT');if(!navigator.locks)fail('LOCAL_LOCK_UNAVAILABLE');
  return navigator.locks.request(`safe-finance:${F.PROJECT}:${s.uid}`,async()=>{
   check(s);await s.journal.storage.verify();const journal=journalRows(s),local=F.clone(s.state.data),remote=await independentRemote(s).read();check(s);
   if(!remote.exists||!F.equal(journalRows(s),journal)||!F.equal(s.state.data,local))fail('STATE_CHANGED');
   if(remote.version.syncProtocol!==1||!Number.isSafeInteger(remote.version.syncRevision))fail('REVISION_REQUIRED');
   if(emergency&&(!F.equal(remote.data,emergency.pending)||remote.version.syncRevision<=emergency.base.version.syncRevision))fail('EMERGENCY_REMOTE_NOT_RECOVERED');
   const payload={project:F.PROJECT,uid:s.uid,base:F.clone(s.state.base),local,remote,journal,tip:s.tip,blocked:!!s.blocked,status:s.state.status,createdAt:new Date().toISOString()};
   const checksum=await sha(F.canonical(payload));check(s);const key=scoped(s.uid)+'conflict:'+crypto.randomUUID();await put(key,{payload,sha256:checksum});
   dossier={key,sha256:checksum,uid:s.uid};verifiedHash=null;return {key,sha256:checksum,paths:diff(local,remote.data),branches:journal.filter(e=>!journal.some(v=>v.parents.includes(e.key))).length};
  });
 };
 function evidence(){const s=app.safeSession;check(s);if(!dossier||dossier.uid!==s.uid||!dossier.key.startsWith(scoped(s.uid)))fail('EVIDENCE_MISSING');const bundle=JSON.parse(storage.getItem(dossier.key));if(!bundle||bundle.sha256!==dossier.sha256||bundle.payload.uid!==s.uid||bundle.payload.project!==F.PROJECT)fail('EVIDENCE_CHANGED');return bundle;}
 p.exportConflict=async function(){const session=this.safeSession,b=evidence();if(await sha(F.canonical(b.payload))!==b.sha256)fail('EVIDENCE_CHANGED');check(session);const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='conflito-preservado-'+b.sha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return b.sha256;};
 p.verifyConflictFile=async function(file){const session=this.safeSession,b=evidence(),read=JSON.parse(await file.text());if(!F.equal(read,b)||await sha(F.canonical(read.payload))!==b.sha256)fail('BACKUP_MISMATCH');check(session);if(dossier?.sha256!==b.sha256)fail('EVIDENCE_CHANGED');verifiedHash=b.sha256;await put(scoped(b.payload.uid)+'verified:'+crypto.randomUUID(),{evidenceKey:dossier.key,sha256:b.sha256,verifiedAt:new Date().toISOString()});return true;};
 p.resolveConflict=async function(choice,manual,confirmed){
  const s=this.safeSession;check(s);const emergency=await s.emergencyEvidence();if(!confirmed)fail('EXPLICIT_CONFIRMATION_REQUIRED');const b=evidence();if(verifiedHash!==b.sha256||await sha(F.canonical(b.payload))!==b.sha256)fail('VERIFIED_EXPORT_REQUIRED');
  if(!['local','remote','manual'].includes(choice))fail('INVALID_CHOICE');const candidate=F.clone(choice==='local'?b.payload.local:choice==='remote'?b.payload.remote.data:manual);if(emergency&&(choice!=='remote'||!F.equal(candidate,emergency.pending)||!F.equal(b.payload.remote.data,emergency.pending)||b.payload.remote.version.syncRevision<=emergency.base.version.syncRevision))fail('EMERGENCY_REMOTE_NOT_RECOVERED');validate(candidate);preserveUnknown(candidate,[b.payload.local,b.payload.remote.data,...b.payload.journal.map(row=>row.state.data)]);
  // Preserve unknown fields and every version in evidence; any omission remains visible
  // in the review diff. Explicit confirmation covers replacing/removing information.
  await navigator.locks.request(`safe-finance:${F.PROJECT}:${s.uid}`,async()=>{
   check(s);await s.journal.storage.verify();if(!F.equal(journalRows(s),b.payload.journal)||!F.equal(s.state.data,b.payload.local)||s.tip!==b.payload.tip)fail('LOCAL_CHANGED');
   const latest=await independentRemote(s).read();check(s);if(!F.equal(latest,b.payload.remote))fail('CONFLICT');
   if(!F.equal(journalRows(s),b.payload.journal)||!F.equal(s.state.data,b.payload.local))fail('LOCAL_CHANGED');
   const key=s.journal.prefix+crypto.randomUUID(),state={data:candidate,base:F.clone(latest),status:F.equal(candidate,latest.data)?'CONFIRMED':'PENDING',sent:null};
   await put(key,{key,parents:s.journal.tips().map(t=>t.key),uid:s.uid,project:F.PROJECT,state,evidenceKey:dossier.key,evidenceHash:b.sha256,decision:{choice,confirmed:true,differences:diff(latest.data,candidate)}});
   s.blocked=false;s.state=state;s.tip=key;s.persisted=true;s.revision++;s.current();this.data=F.clone(candidate);dossier=null;verifiedHash=null;
  });
  // Existing upload rechecks entire remote document and revision INSIDE transaction.
  if(!emergency)await s.upload();check(s);await this.loadUserData();check(s);if(s.state.status!=='CONFIRMED')fail(s.state.status==='OFFLINE'?'UNCERTAIN':'CONFLICT');return true;
 };
 const oldDeactivate=p.deactivateUser;p.deactivateUser=function(){dossier=null;verifiedHash=null;const view=document.getElementById('safety-review');if(view)view.remove();return oldDeactivate.apply(this,arguments);};
 document.addEventListener('DOMContentLoaded',()=>{
  const verification=document.getElementById('verification-form');
  if(verification){const button=document.createElement('button');button.type='button';button.id='complete-registration';button.textContent='Já verifiquei o e-mail — continuar cadastro';verification.append(button);const feedback=document.createElement('p');feedback.id='registration-status';verification.append(feedback);button.onclick=async()=>{try{const user=auth.currentUser;if(!user)fail('SESSION_CHANGED');await user.reload();await user.getIdToken(true);if(auth.currentUser?.uid!==user.uid)fail('SESSION_CHANGED');if(!user.emailVerified){feedback.textContent='E-mail ainda não verificado. Nenhum histórico foi criado.';return;}showLogin();await handleAuthStateChanged(user);}catch{feedback.textContent='Não foi possível confirmar a conta. Nenhum histórico foi criado.';}};}
  const host=document.getElementById('sync-now-btn')?.closest('.settings-section');if(!host)return;
  const panel=document.createElement('section');panel.id='safety-final-panel';panel.innerHTML='<p><strong>Proteção dos dados</strong></p><button type="button" id="first-document">Concluir cadastro: criar histórico vazio</button> <button type="button" id="review-conflict">Revisar conflito preservando versões</button><p id="final-status" role="status"></p>';host.append(panel);
  const status=message=>document.getElementById('final-status').textContent=message;
  const messages={VERIFIED_EXPORT_REQUIRED:'Exporte o dossiê e selecione o arquivo baixado para conferência.',LOCAL_CHANGED:'Dados locais mudaram. Preserve um novo dossiê.',CONFLICT:'Dados remotos mudaram. Preserve um novo dossiê.',BACKUP_MISMATCH:'Arquivo diferente ou incompleto; envio bloqueado.',DOCUMENT_EXISTS:'Documento já existe; nada foi substituído. Use Conferir nuvem.',LOCAL_OR_LEGACY_DATA_PRESENT:'Há dados locais ou documento legado; criação bloqueada.',NO_CONFLICT:'Nenhum conflito confirmado. Confira a nuvem antes de prosseguir.'};
  const error=e=>status(messages[e.code||e.message]||'Operação bloqueada. Dados preservados. Código: '+(e.code||e.message));
  document.getElementById('first-document').onclick=async()=>{try{if(!confirm('Criar somente um histórico vazio para esta conta verificada nesta conta? Documentos existentes não serão substituídos.'))return;await app.provisionFirst(true);status('Cadastro financeiro concluído e confirmado na nuvem.');}catch(e){error(e);}};
  document.getElementById('review-conflict').onclick=async()=>{try{
   const info=await app.preserveConflict(),b=evidence();document.getElementById('safety-review')?.remove();const view=document.createElement('section');view.id='safety-review';
   view.innerHTML='<h3>Revisão assistida</h3><p>Base, local, remoto e todos os ramos do diário estão preservados. Antes da decisão, baixe o dossiê e confira o arquivo. Escolher uma versão pode omitir informações da outra.</p><pre id="conflict-paths"></pre><button type="button" id="export-conflict">Exportar dossiê completo</button><label> Conferir arquivo exportado <input id="verify-conflict" type="file" accept="application/json"></label><p><select id="conflict-choice"><option value="local">Preparar versão local</option><option value="remote">Preparar versão remota</option><option value="manual">Editar candidato manualmente</option></select></p><label>Candidato completo para revisão<textarea id="conflict-candidate" rows="8" cols="70"></textarea></label><pre id="candidate-diff"></pre><p><label><input id="confirm-conflict" type="checkbox">Conferi as diferenças e autorizo explicitamente as substituições e omissões deste candidato; as fontes continuam no dossiê.</label></p><button type="button" id="apply-conflict">Validar e enviar candidato</button>';
   panel.append(view);const branches=b.payload.journal.filter(row=>!b.payload.journal.some(child=>child.parents.includes(row.key)));document.getElementById('conflict-paths').textContent=info.paths.join('\n')+'\nRamos preservados: '+info.branches+branches.map((row,i)=>'\nRamo '+(i+1)+' → remoto:\n'+diff(row.state.data,b.payload.remote.data).join('\n')).join('');
   const area=document.getElementById('conflict-candidate'),choice=document.getElementById('conflict-choice');
   branches.forEach((row,i)=>{const option=document.createElement('option');option.value='branch-'+i;option.textContent='Preparar ramo local '+(i+1);choice.append(option);});
   const show=()=>{document.getElementById('confirm-conflict').checked=false;try{const candidate=JSON.parse(area.value);document.getElementById('candidate-diff').textContent='Diferenças local → candidato:\n'+diff(b.payload.local,candidate).join('\n')+'\nDiferenças remoto → candidato:\n'+diff(b.payload.remote.data,candidate).join('\n')+branches.map((row,i)=>'\nRamo '+(i+1)+' → candidato:\n'+diff(row.state.data,candidate).join('\n')).join('');}catch{document.getElementById('candidate-diff').textContent='JSON inválido; envio bloqueado.';}};
   area.value=JSON.stringify(b.payload.local,null,2);show();area.oninput=()=>{choice.value='manual';show();};choice.onchange=()=>{area.value=JSON.stringify(choice.value.startsWith('branch-')?branches[Number(choice.value.slice(7))].state.data:choice.value==='remote'?b.payload.remote.data:b.payload.local,null,2);show();};
   document.getElementById('export-conflict').onclick=async()=>{try{await app.exportConflict();status('Download iniciado; selecione o arquivo baixado para validar seu conteúdo.');}catch(e){error(e);}};
   document.getElementById('verify-conflict').onchange=async e=>{try{await app.verifyConflictFile(e.target.files[0]);status('Arquivo exportado conferido integralmente por conteúdo e SHA-256.');}catch(e){error(e);}};
   document.getElementById('apply-conflict').onclick=async()=>{try{const candidate=JSON.parse(area.value),selected=choice.value==='remote'?'remote':'manual';if(selected==='remote'&&!F.equal(candidate,b.payload.remote.data))fail('REMOTE_CANDIDATE_MISMATCH');await app.resolveConflict(selected,candidate,document.getElementById('confirm-conflict').checked);view.remove();status('Decisão confirmada remotamente; fontes e diário preservados.');}catch(e){error(e);}};
   status('Dossiê salvo localmente. Envio continua bloqueado até exportação, conferência e decisão.');
  }catch(e){error(e);}};
 });
 globalThis.SafeFinal={validate,preserveUnknown,diff,sha};
})();
