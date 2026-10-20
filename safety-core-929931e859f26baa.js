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
 class Journal {
   constructor(storage,uid,uuid){this.storage=storage;this.uid=uid;this.uuid=uuid;this.prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:journal:`;}
   entries(){const rows=[];for(let i=0;i<this.storage.length;i++){const k=this.storage.key(i);if(k?.startsWith(this.prefix)){let v;try{v=JSON.parse(this.storage.getItem(k));}catch{throw error('LOCAL_CORRUPT');}if(v.uid!==this.uid||v.project!==PROJECT||v.key!==k)throw error('LOCAL_CORRUPT');rows.push(v);}}return rows;}
   tips(){const rows=this.entries(),parents=new Set(rows.flatMap(v=>v.parents));return rows.filter(v=>!parents.has(v.key));}
   append(state,parent){
     const key=this.prefix+this.uuid();if(this.storage.getItem(key)!==null)throw error('LOCAL_COLLISION');
     const text=JSON.stringify({key,parents:parent?[parent]:[],uid:this.uid,project:PROJECT,state:clone(state)});
     this.storage.setItem(key,text);if(this.storage.getItem(key)!==text)throw error('LOCAL_WRITE_FAILED');return key;
   }
 }
 class Session {
   constructor({storage,uid,uuid,remote,lock}){
     this.uid=uid;this.remote=remote;this.lock=lock;this.journal=new Journal(storage,uid,uuid);this.active=true;this.busy=false;this.revision=0;this.tip=null;this.persisted=false;
     this.state={data:{},base:null,status:'NO_BASE',sent:null};
     const tips=this.journal.tips();if(tips.length>1){this.state.status='LOCAL_CONFLICT';this.blocked=true;}else if(tips.length===1){this.tip=tips[0].key;this.state=clone(tips[0].state);this.persisted=true;}
   }
   assert(){if(!this.active)throw error('SESSION_CHANGED');if(this.blocked)throw error('LOCAL_CONFLICT');}
   current(){this.assert();const tips=this.journal.tips();if(tips.length>1||tips.length===1&&tips[0].key!==this.tip)throw error('LOCAL_CONFLICT');}
   persist(){this.assert();this.persisted=false;this.tip=this.journal.append(this.state,this.tip);this.persisted=true;this.current();}
   pending(){return !this.state.base||!equal(this.state.data,this.state.base.data);}
   close(){this.active=false;}
   edit(data){this.assert();this.state.data=clone(data);this.revision++;if(!['UNCERTAIN','CONFLICT'].includes(this.state.status))this.state.status=this.pending()?'PENDING':'CONFIRMED';try{this.persist();}catch(e){this.state.status=e.code||'LOCAL_WRITE_FAILED';throw e;}}
   async inspect(){
     this.assert();this.current();if(this.busy)throw error('BUSY');const revision=this.revision;
     let remote;try{remote=await this.remote.read();}catch{this.assert();if(this.state.status!=='UNCERTAIN')this.state.status='OFFLINE';throw error(this.state.status==='UNCERTAIN'?'UNCERTAIN':'OFFLINE');}
     this.assert();this.current();if(revision!==this.revision)throw error('LOCAL_CHANGED');
     if(!remote.exists){this.state.status='REMOTE_ABSENT';return false;}
     if(!this.state.base){
       if(Object.keys(this.state.data).length){this.state.status='NO_BASE';return false;}
       this.state.data=clone(remote.data);this.state.base=clone(remote);this.state.status='CONFIRMED';this.persist();return true;
     }
     if(this.state.status==='UNCERTAIN'&&this.state.sent&&equal(remote.data,this.state.sent)){
       this.state.base=clone(remote);this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';this.persist();return true;
     }
     if(!equal(remote,this.state.base)){
       if(this.state.status==='UNCERTAIN'||this.state.status==='LOCAL_WRITE_FAILED'||this.state.sent||this.state.autoRetryBlocked)return false;
       const clean=()=>!this.busy&&this.persisted&&['CONFIRMED','OFFLINE','CONFLICT'].includes(this.state.status)&&!this.state.sent&&!this.state.autoRetryBlocked&&!this.pending();
       const valid=v=>v?.syncProtocol===1&&Number.isSafeInteger(v.syncRevision)&&v.syncRevision>=0;
       if(clean()&&valid(this.state.base.version)&&valid(remote.version)&&remote.version.syncRevision>this.state.base.version.syncRevision){
         if(!this.lock||typeof this.remote.validateSnapshot!=='function')throw error('REMOTE_UNCONFIRMED');
         return await this.lock(`safe-finance:${PROJECT}:${this.uid}`,async()=>{
           this.assert();this.current();
           if(revision!==this.revision||!clean())throw error('LOCAL_CHANGED');
           if(this.remote.validateSnapshot(remote)!==true)throw error('REMOTE_UNCONFIRMED');
           const next={...clone(this.state),data:clone(remote.data),base:clone(remote),status:'CONFIRMED',sent:null};
           // Append and verify the new journal tip BEFORE replacing visible/local state.
           let key;
           try{
             key=this.journal.append(next,this.tip);
             const tips=this.journal.tips();
             if(tips.length!==1||tips[0].key!==key)throw error('LOCAL_CONFLICT');
           }catch(e){
             this.state.status=e.code==='LOCAL_CONFLICT'?'LOCAL_CONFLICT':'LOCAL_WRITE_FAILED';
             if(e.code==='LOCAL_CONFLICT')this.blocked=true;
             this.persisted=false;throw error(this.state.status);
           }
           this.tip=key;this.state=next;this.persisted=true;this.revision++;return true;
         });
       }
       this.state.status='CONFLICT';this.persist();return false;
     }
     this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';this.persist();return true;
   }
   async upload(){
     this.assert();if(this.busy)throw error('BUSY');if(!this.lock)throw error('LOCAL_LOCK_UNAVAILABLE');this.busy=true;
     try{return await this.lock(`safe-finance:${PROJECT}:${this.uid}`,async()=>{
       this.current();if(!this.persisted||!this.state.base)throw error('NO_BASE');
       if(this.state.status==='UNCERTAIN')throw error('UNCERTAIN');
       if(this.state.status==='CONFLICT')throw error('CONFLICT');
       const base=clone(this.state.base),candidate=clone(this.state.data);
       if(equal(base.data,candidate)){this.state.status='CONFIRMED';return true;}
       // Persistir a incerteza ANTES de iniciar o commit; reabertura nunca reenvia cegamente.
       this.state.sent=candidate;this.state.status='UNCERTAIN';this.persist();
       try{
         // Callback repetível: SEM mutação local, UI, IDs ou logs.
         await this.remote.commit(base,candidate,()=>{this.assert();this.current();});
       }catch(e){
         const outcome=['CONFLICT','REVISION_REQUIRED'].includes(e.code)?e.code:'UNCERTAIN';
         if(this.active){this.state.status=outcome;try{this.persist();}catch{}}
         throw error(outcome);
       }
       this.assert();
       // Commit confirmado; nova leitura confirma o estado exato, incluindo serverTimestamp.
       let confirmed;try{confirmed=await this.remote.read();}catch{this.state.status='UNCERTAIN';this.persist();throw error('UNCERTAIN');}
       this.assert();if(!confirmed.exists||!equal(confirmed.data,candidate)){this.state.status='CONFLICT';this.persist();throw error('CONFLICT');}
       this.state.base=clone(confirmed);this.state.sent=null;this.state.status=this.pending()?'PENDING':'CONFIRMED';this.persist();return true;
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
 root.SafeFinance={PROJECT,clone,canonical,equal,Journal,Session,locate,remove,error};
})(globalThis);
