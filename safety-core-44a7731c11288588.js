/* Desenvolvimento isolado. Nenhuma dependência de rede. */
(function(root){
 'use strict';
 const PROJECT='gastosmensais-ccd84';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>{
   if(x===null||typeof x!=='object')return JSON.stringify(x);
   if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
   return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 };
 const equal=(a,b)=>canonical(a)===canonical(b);
 const error=code=>Object.assign(new Error(code),{code});
 const raise=code=>{throw error(code);};
 const parsedProofs=new WeakMap();
 function snapshot(s){
  const storage=s.journal.storage,prefix=s.journal.prefix,rows=new Map(),raw=new Map();
  let proofs=parsedProofs.get(storage);if(!proofs){proofs=new Map();parsedProofs.set(storage,proofs);}
  const length=storage.length;
  for(let i=0;i<length;i++){
   const key=storage.key(i);if(!key?.startsWith(prefix))continue;
   if(raw.has(key))raise('LOCAL_CHANGED');
   const text=storage.getItem(key),cached=proofs.get(key);let row;if(cached&&cached.text===text&&cached.uid===s.uid)row=cached.row;else {try{row=JSON.parse(text);}catch{raise('LOCAL_CORRUPT');}
   if(!row||row.key!==key||row.uid!==s.uid||row.project!==PROJECT||!Array.isArray(row.parents)||new Set(row.parents).size!==row.parents.length||row.parents.some(p=>typeof p!=='string'||!p.startsWith(prefix))||!row.state||typeof row.state!=='object'||Array.isArray(row.state))raise('LOCAL_CORRUPT');
   row={key:row.key,parents:[...row.parents]};proofs.set(key,{text,uid:s.uid,row});}
   rows.set(key,row);raw.set(key,text);
  }
  if(storage.length!==length)raise('LOCAL_CHANGED');
  const parents=new Set();for(const row of rows.values())for(const p of row.parents){if(!rows.has(p))raise('LOCAL_PARENT_MISSING');parents.add(p);}
  const tips=[...rows.keys()].filter(k=>!parents.has(k));
  if(tips.length!==1||tips[0]!==s.tip)raise('LOCAL_CONFLICT');
  // Kahn walk validates all nodes, including a disconnected cycle.
  const counts=new Map([...rows].map(([k,r])=>[k,r.parents.length])),children=new Map();
  for(const [k,r]of rows)for(const p of r.parents){if(!children.has(p))children.set(p,[]);children.get(p).push(k);}
  const queue=[...counts].filter(([,n])=>n===0).map(([k])=>k);let walked=0;
  for(let i=0;i<queue.length;i++){const k=queue[i];walked++;for(const c of children.get(k)||[]){counts.set(c,counts.get(c)-1);if(counts.get(c)===0)queue.push(c);}}
  if(walked!==rows.size)raise('LOCAL_CORRUPT');
  const terminal=JSON.parse(raw.get(s.tip));if(!equal(terminal.state,s.state))raise('LOCAL_STATE_UNPROVEN');
  return raw;
 }
 function verify(s){s.assert();const tip=s.tip,revision=s.revision,state=canonical(s.state),uid=s.uid;const first=snapshot(s),second=snapshot(s);s.assert();if(first.size!==second.size||[...first].some(([k,v])=>second.get(k)!==v)||s.tip!==tip||s.revision!==revision||s.uid!==uid||canonical(s.state)!==state)raise('LOCAL_CHANGED');return true;}
 function classify(e){
  if(e?.name==='QuotaExceededError'||e?.code===22||e?.code===1014)return 'LOCAL_QUOTA';
  if(e?.name==='SecurityError')return 'LOCAL_ACCESS_DENIED';
  if(e?.name==='TypeError')return 'LOCAL_SERIALIZATION';
  return typeof e?.code==='string'&&/^LOCAL_[A-Z_]+$/.test(e.code)?e.code:'LOCAL_WRITE_FAILED';
 }

 class Journal {
   constructor(storage,uid,uuid){this.storage=storage;this.uid=uid;this.uuid=uuid;this.prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:journal:`;}
   entries(){const rows=[];for(let i=0;i<this.storage.length;i++){const k=this.storage.key(i);if(k?.startsWith(this.prefix)){let v;try{v=JSON.parse(this.storage.getItem(k));}catch{throw error('LOCAL_CORRUPT');}if(v.uid!==this.uid||v.project!==PROJECT||v.key!==k)throw error('LOCAL_CORRUPT');rows.push(v);}}return rows;}
   tips(){const rows=this.entries(),parents=new Set(rows.flatMap(v=>v.parents));return rows.filter(v=>!parents.has(v.key));}
   async append(state,parent){
     const key=this.prefix+this.uuid();if(this.storage.getItem(key)!==null)throw error('LOCAL_COLLISION');
     const text=JSON.stringify({key,parents:parent?[parent]:[],uid:this.uid,project:PROJECT,state:clone(state)});
     await this.storage.put(key,text);if(this.storage.getItem(key)!==text)throw error('LOCAL_WRITE_FAILED');return key;
   }
 }
 class Session {
   constructor({storage,uid,uuid,remote,lock}){
     this.uid=uid;this.remote=remote;this.lock=lock;this.journal=new Journal(storage,uid,uuid);this.active=true;this.busy=false;this.revision=0;this.tip=null;this.persisted=false;
     this.state={data:{},base:null,status:'NO_BASE',sent:null};
     const tips=this.journal.tips();if(tips.length>1){this.state.status='LOCAL_CONFLICT';this.blocked=true;}else if(tips.length===1){this.tip=tips[0].key;this.state=clone(tips[0].state);this.persisted=true;try{verify(this);}catch(e){this.persisted=false;this.persistenceError=classify(e);}}
   }
   assert(){if(!this.active)throw error('SESSION_CHANGED');if(this.blocked)throw error('LOCAL_CONFLICT');}
   current(){this.assert();const tips=this.journal.tips();if(tips.length>1||tips.length===1&&tips[0].key!==this.tip)throw error('LOCAL_CONFLICT');}
   async persist(){
     this.assert();if(this.persisting)throw error('LOCAL_BUSY');this.persisting=true;const wasPersisted=this.persisted;this.persisted=false;
     try{
       await this.journal.storage.verify();this.assert();
       if(this.tip){
         try{verify(this);if(!wasPersisted)throw error('LOCAL_RECERTIFICATION_REQUIRED');this.persisted=true;this.persistenceError=null;return;}
         catch(e){if(e.code!=='LOCAL_STATE_UNPROVEN')throw e;}
       }
       this.current();this.persisted=false;
       const saving=clone(this.state),revision=this.revision;const key=await this.journal.append(saving,this.tip);this.assert();if(revision!==this.revision||!equal(saving,this.state))throw error('LOCAL_CHANGED');this.tip=key;verify(this);
       this.persisted=true;this.persistenceError=null;
     }catch(e){this.persisted=false;this.persistenceError=classify(e);throw error(this.persistenceError);}finally{this.persisting=false;}
   }
   async verifyDurable(){
     if(this.persisting)throw error('LOCAL_BUSY');
     const tip=this.tip,revision=this.revision,stamp=canonical(this.state),uid=this.uid;
     const changed=()=>this.persisting||this.tip!==tip||this.revision!==revision||this.uid!==uid||canonical(this.state)!==stamp;
     try{await this.journal.storage.verify();this.assert();if(changed())throw error('LOCAL_CHANGED');verify(this);return true;}
     catch(e){if(changed())throw error('LOCAL_CHANGED');this.persisted=false;this.persistenceError=classify(e);throw error(this.persistenceError);}
   }
   async recertify(guard){
     if(!this.lock||typeof guard!=='function')throw error('LOCAL_LOCK_UNAVAILABLE');
     const stamp=canonical(this.state),tip=this.tip,revision=this.revision,uid=this.uid;
     return this.lock(`safe-finance:${PROJECT}:${uid}`,async()=>{
       const check=()=>{this.assert();if(guard()!==true||this.uid!==uid||this.tip!==tip||this.revision!==revision||canonical(this.state)!==stamp)throw error('LOCAL_CHANGED');if(this.busy||this.state.status!=='CONFIRMED'||this.state.sent||this.state.autoRetryBlocked||!this.state.base?.exists||this.pending()||this.state.base.version?.syncProtocol!==1||!Number.isSafeInteger(this.state.base.version.syncRevision)||this.state.base.version.syncRevision<0)throw error('LOCAL_RECOVERY_BLOCKED');};
       check();await this.verifyDurable();check();await this.verifyDurable();check();
       this.persisted=true;this.persistenceError=null;return true;
     });
   }
   async emergencyEvidence(){
     this.assert();const stamp=canonical(this.state),tip=this.tip,revision=this.revision;
     const rows=this.journal.entries();if(!rows.some(r=>r.evidenceKey?.startsWith(`safe-finance:${PROJECT}:${encodeURIComponent(this.uid)}:3l:emergency:`)))return null;
     await this.verifyDurable();this.current();
     const map=new Map(rows.map(r=>[r.key,r])),chain=[],seen=new Set();let node=map.get(this.tip);
     while(node){if(seen.has(node.key)||node.parents.length>1)throw error('LOCAL_CONFLICT');seen.add(node.key);chain.push(node);node=node.parents.length?map.get(node.parents[0]):null;}
     const emergency=chain.find(r=>r.evidenceKey?.startsWith(`safe-finance:${PROJECT}:${encodeURIComponent(this.uid)}:3l:emergency:`));
     if(!emergency)return null;
     const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
     const bundle=JSON.parse(this.journal.storage.getItem(emergency.evidenceKey)||'null');
     if(!bundle||await sha(canonical(bundle.payload))!==bundle.sha256||bundle.sha256!==emergency.evidenceHash||!emergency.evidenceKey.endsWith(bundle.sha256)||emergency.state.status!=='CONFLICT'||!emergency.state.autoRetryBlocked||emergency.state.sent||!equal(emergency.state.data,bundle.payload.pending)||!equal(emergency.state.base?.data,bundle.payload.base))throw error('LOCAL_EMERGENCY_EVIDENCE');
     const path=chain.slice(0,chain.indexOf(emergency));let resolved=false;
     for(const row of [...path].reverse()){if(!row.decision)continue;
       const d=JSON.parse(this.journal.storage.getItem(row.evidenceKey)||'null');
       if(!row.evidenceKey?.startsWith(`safe-finance:${PROJECT}:${encodeURIComponent(this.uid)}:3l:conflict:`)||!d||await sha(canonical(d.payload))!==d.sha256||d.sha256!==row.evidenceHash||d.payload.uid!==this.uid||d.payload.project!==PROJECT||row.decision.confirmed!==true||row.decision.choice!=='remote'||row.state.status!=='CONFIRMED'||row.state.sent||!equal(row.state.data,bundle.payload.pending)||!equal(row.state.base,d.payload.remote)||!equal(d.payload.remote.data,bundle.payload.pending)||d.payload.remote.version.syncProtocol!==1||d.payload.remote.version.syncRevision<=emergency.state.base.version.syncRevision)throw error('LOCAL_EMERGENCY_RESOLUTION');
       let verified=false;for(let i=0;i<this.journal.storage.length;i++){const k=this.journal.storage.key(i);if(k?.startsWith(`safe-finance:${PROJECT}:${encodeURIComponent(this.uid)}:3l:verified:`)){const proof=JSON.parse(this.journal.storage.getItem(k));if(proof.evidenceKey===row.evidenceKey&&proof.sha256===d.sha256)verified=true;}}if(!verified)throw error('LOCAL_EMERGENCY_RESOLUTION');
       resolved=true;break;
     }
     if(!resolved){for(const row of chain.slice(0,chain.indexOf(emergency)+1))if(!equal(row.state.data,bundle.payload.pending)||!equal(row.state.base,emergency.state.base)||row.state.sent||row.state.autoRetryBlocked!==true)throw error('LOCAL_EMERGENCY_CHANGED');
       if(!equal(this.state.data,bundle.payload.pending)||!equal(this.state.base,emergency.state.base)||this.state.sent||!this.state.autoRetryBlocked)throw error('LOCAL_EMERGENCY_CHANGED');}
     await this.verifyDurable();this.current();if(this.tip!==tip||this.revision!==revision||canonical(this.state)!==stamp)throw error('LOCAL_CHANGED');
     return resolved?null:{pending:clone(bundle.payload.pending),base:clone(emergency.state.base)};
   }
   pending(){return !this.state.base||!equal(this.state.data,this.state.base.data);}
   close(){this.active=false;}
   async edit(data){this.assert();if(this.busy||this.persisting||this.inspecting)throw error('BUSY');if(await this.emergencyEvidence())throw error('EMERGENCY_REVIEW_REQUIRED');if(this.busy||this.persisting||this.inspecting)throw error('BUSY');this.state.data=clone(data);this.revision++;if(!['UNCERTAIN','CONFLICT'].includes(this.state.status))this.state.status=this.pending()?'PENDING':'CONFIRMED';try{await this.persist();}catch(e){this.state.status=e.code||'LOCAL_WRITE_FAILED';throw e;}}
   async inspect(){if(this.inspecting||this.busy||this.persisting)throw error('BUSY');this.inspecting=true;try{return await this.inspectHeld();}finally{this.inspecting=false;}}
   async inspectHeld(){
     this.assert();this.current();if(this.busy||this.persisting)throw error('BUSY');await this.journal.storage.verify();const emergency=await this.emergencyEvidence();const revision=this.revision;
     let remote;try{remote=await this.remote.read();}catch{this.assert();if(emergency)throw error('OFFLINE');if(this.state.status!=='UNCERTAIN')this.state.status='OFFLINE';throw error(this.state.status==='UNCERTAIN'?'UNCERTAIN':'OFFLINE');}
     this.assert();this.current();if(revision!==this.revision)throw error('LOCAL_CHANGED');
     if(emergency){await this.emergencyEvidence();return false;}
     if(!remote.exists){this.state.status='REMOTE_ABSENT';return false;}
     if(!this.state.base){
       if(Object.keys(this.state.data).length){this.state.status='NO_BASE';return false;}
       this.state.data=clone(remote.data);this.state.base=clone(remote);this.state.status='CONFIRMED';await this.persist();return true;
     }
     if(this.state.status==='UNCERTAIN'&&this.state.sent&&equal(remote.data,this.state.sent)){
       this.state.base=clone(remote);this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';await this.persist();return true;
     }
     if(!equal(remote,this.state.base)){
       if(this.state.status==='UNCERTAIN'||this.state.status==='LOCAL_WRITE_FAILED'||this.state.sent||this.state.autoRetryBlocked)return false;
       const clean=()=>!this.busy&&this.persisted&&['CONFIRMED','OFFLINE','CONFLICT'].includes(this.state.status)&&!this.state.sent&&!this.state.autoRetryBlocked&&!this.pending();
       const valid=v=>v?.syncProtocol===1&&Number.isSafeInteger(v.syncRevision)&&v.syncRevision>=0;
       if(clean()&&valid(this.state.base.version)&&valid(remote.version)&&remote.version.syncRevision>this.state.base.version.syncRevision){
         if(!this.lock||typeof this.remote.validateSnapshot!=='function')throw error('REMOTE_UNCONFIRMED');
         return await this.lock(`safe-finance:${PROJECT}:${this.uid}`,async()=>{
           this.assert();await this.journal.storage.verify();this.current();
           if(revision!==this.revision||!clean())throw error('LOCAL_CHANGED');
           if(this.remote.validateSnapshot(remote)!==true)throw error('REMOTE_UNCONFIRMED');
           const next={...clone(this.state),data:clone(remote.data),base:clone(remote),status:'CONFIRMED',sent:null};
           // Append and verify the new journal tip BEFORE replacing visible/local state.
           let key;
           try{
             key=await this.journal.append(next,this.tip);
             const tips=this.journal.tips();
             if(tips.length!==1||tips[0].key!==key)throw error('LOCAL_CONFLICT');
             verify({...this,state:next,tip:key,assert:()=>this.assert()});
           }catch(e){
             this.state.status=e.code==='LOCAL_CONFLICT'?'LOCAL_CONFLICT':'LOCAL_WRITE_FAILED';
             if(e.code==='LOCAL_CONFLICT')this.blocked=true;
             this.persisted=false;this.persistenceError=classify(e);throw error(this.persistenceError);
           }
           this.tip=key;this.state=next;this.persisted=true;this.persistenceError=null;this.revision++;return true;
         });
       }
       this.state.status='CONFLICT';await this.persist();return false;
     }
     if(this.state.status==='CONFIRMED'&&!this.state.sent&&!this.state.autoRetryBlocked&&!this.pending()){
       if(!this.persisted){
         if(typeof this.remote.validateSnapshot!=='function')throw error('LOCAL_RECERTIFICATION_REQUIRED');
         return this.recertify(()=>this.remote.validateSnapshot(remote)===true&&equal(remote,this.state.base));
       }
       try{verify(this);}catch(e){this.persisted=false;this.persistenceError=classify(e);throw error(this.persistenceError);}
       return true;
     }
     this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';await this.persist();return true;
   }
   async upload(){
     this.assert();if(this.busy||this.persisting||this.inspecting)throw error('BUSY');if(!this.lock)throw error('LOCAL_LOCK_UNAVAILABLE');this.busy=true;
     try{return await this.lock(`safe-finance:${PROJECT}:${this.uid}`,async()=>{
       await this.verifyDurable();this.current();if(await this.emergencyEvidence())throw error('EMERGENCY_REVIEW_REQUIRED');if(!this.persisted||!this.state.base)throw error('NO_BASE');
       if(this.state.status==='UNCERTAIN')throw error('UNCERTAIN');
       if(this.state.status==='CONFLICT')throw error('CONFLICT');
       const base=clone(this.state.base),candidate=clone(this.state.data);
       if(equal(base.data,candidate)){this.state.status='CONFIRMED';return true;}
       // Persistir a incerteza ANTES de iniciar o commit; reabertura nunca reenvia cegamente.
       this.state.sent=candidate;this.state.status='UNCERTAIN';await this.persist();
       try{
         // Callback repetível: SEM mutação local, UI, IDs ou logs.
         await this.remote.commit(base,candidate,async()=>{this.assert();await this.verifyDurable();this.current();});
       }catch(e){
         const outcome=['CONFLICT','REVISION_REQUIRED'].includes(e.code)?e.code:'UNCERTAIN';
         if(this.active){this.state.status=outcome;try{await this.persist();}catch{}}
         throw error(outcome);
       }
       this.assert();
       // Commit confirmado; nova leitura confirma o estado exato, incluindo serverTimestamp.
       let confirmed;try{confirmed=await this.remote.read();}catch{this.state.status='UNCERTAIN';await this.persist();throw error('UNCERTAIN');}
       this.assert();if(!confirmed.exists||!equal(confirmed.data,candidate)){this.state.status='CONFLICT';await this.persist();throw error('CONFLICT');}
       this.state.base=clone(confirmed);this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';await this.persist();return true;
     });}finally{this.busy=false;}
   }
 }
 function locate(data,ref){
   if(!ref||!/^\d{4}$/.test(String(ref.year))||! /^(?:[1-9]|1[0-2])$/.test(String(ref.month))||!['expenses','creditCard','dailyExpenses'].includes(ref.origin))throw error('INVALID_REFERENCE');
   const list=data?.[ref.year]?.[ref.month]?.[ref.origin];if(!Array.isArray(list))throw error('RECORD_MISSING');
   const matches=list.map((item,index)=>({item,index})).filter(x=>Object.hasOwn(x.item,'id')&&x.item.id===ref.id);
   if(matches.length!==1)throw error('AMBIGUOUS_RECORD');const result=matches[0];
   if(ref.fingerprint&&canonical(result.item)!==ref.fingerprint)throw error('STALE_RECORD');return {list,...result};
 }
 function remove(data,ref){const found=locate(data,ref);found.list.splice(found.index,1);}
 root.SafeFinance={PROJECT,clone,canonical,equal,Journal,Session,locate,remove,error,verifyPersistence:verify,classifyLocalError:classify};
})(globalThis);
