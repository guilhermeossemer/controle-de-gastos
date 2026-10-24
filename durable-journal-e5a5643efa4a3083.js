/* Append-only, lossless content-addressed journal. No Firebase and no deletion. */
(function(root){
 'use strict';
 const PROJECT='gastosmensais-ccd84', fail=code=>{throw Object.assign(Error(code),{code});};
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
 const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 function transaction(db,mode,fn){return new Promise((resolve,reject)=>{
  let tx;try{tx=db.transaction(['meta','entries','blocks'],mode,mode==='readwrite'?{durability:'strict'}:undefined);}catch(e){reject(e);return;}
  let value,error;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(error||tx.error||Object.assign(Error('LOCAL_IDB_ABORT'),{code:'LOCAL_IDB_ABORT'}));tx.onerror=()=>{};
  Promise.resolve().then(()=>fn(tx)).then(v=>value=v,e=>{error=e;try{tx.abort();}catch{reject(e);}});
 });}
 function scan(storage,prefix){const rows=new Map(),length=storage.length;for(let i=0;i<length;i++){const k=storage.key(i);if(k?.startsWith(prefix+'journal:')||k?.startsWith(prefix+'3l:')){if(rows.has(k))fail('LOCAL_CHANGED');rows.set(k,storage.getItem(k));}}if(storage.length!==length)fail('LOCAL_CHANGED');return rows;}
 const fingerprint=rows=>JSON.stringify([...rows].sort(([a],[b])=>a.localeCompare(b)));
 function validate(rows,uid){
  const prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:journal:`,nodes=new Map();
  for(const [k,text]of rows){let v;try{v=JSON.parse(text);}catch{fail('LOCAL_CORRUPT');}if(!k.startsWith(prefix))continue;
   if(!v||v.key!==k||v.uid!==uid||v.project!==PROJECT||!Array.isArray(v.parents)||new Set(v.parents).size!==v.parents.length||!v.state||typeof v.state!=='object')fail('LOCAL_CORRUPT');nodes.set(k,v);
  }
  const degree=new Map(),children=new Map();for(const [k,v]of nodes){degree.set(k,v.parents.length);for(const p of v.parents){if(!nodes.has(p))fail('LOCAL_PARENT_MISSING');if(!children.has(p))children.set(p,[]);children.get(p).push(k);}}
  const queue=[...degree].filter(([,n])=>!n).map(([k])=>k);for(let i=0;i<queue.length;i++)for(const k of children.get(queue[i])||[]){degree.set(k,degree.get(k)-1);if(!degree.get(k))queue.push(k);}if(queue.length!==nodes.size)fail('LOCAL_CORRUPT');
  // Multiple tips are preserved as conflict, never silently collapsed.
  return true;
 }
 async function pack(rows){const blocks=new Map(),entries=[];for(const [key,text]of rows){const parts=[];for(const token of text.match(/[^,]*,|[^,]+$/g)||[]){for(let i=0;i<token.length;i+=1024){const part=token.slice(i,i+1024);parts.push(part);}}const refs=[];for(const part of parts){let h=blocks.get(part);if(!h){h=await hash(part);blocks.set(part,h);}refs.push(h);}const groups=[];for(let i=0;i<refs.length;i+=64){const sequence=JSON.stringify(refs.slice(i,i+64));let h=blocks.get(sequence);if(!h){h=await hash(sequence);blocks.set(sequence,h);}groups.push(h);}entries.push({key,refs:groups,layout:'groups-v1',hash:await hash(text),length:text.length});}return {entries,blocks};}
 async function read(db){const data=await transaction(db,'readonly',async tx=>{const m=tx.objectStore('meta').get('head'),e=tx.objectStore('entries').getAll(),b=tx.objectStore('blocks').getAll();return {meta:await request(m),entries:await request(e),blocks:await request(b)};});
  if(data.meta&&(!['staged','validated'].includes(data.meta.phase)||data.meta.project!==PROJECT||typeof data.meta.uid!=='string'||!Number.isSafeInteger(data.meta.generation)||data.meta.generation<0||!/^[a-f0-9]{64}$/.test(data.meta.legacy)))fail('LOCAL_IDB_CORRUPT');
  const chunks=new Map(data.blocks.map(b=>[b.hash,b.text])),rows=new Map();
  for(const e of data.entries){if(rows.has(e.key)||e.refs.some(h=>!chunks.has(h)))fail('LOCAL_IDB_CORRUPT');if(e.layout!=='groups-v1')fail('LOCAL_IDB_CORRUPT');let refs;try{refs=e.refs.flatMap(h=>{const group=JSON.parse(chunks.get(h));if(!Array.isArray(group)||group.some(k=>typeof k!=='string'||!chunks.has(k)))fail('LOCAL_IDB_CORRUPT');return group;});}catch{fail('LOCAL_IDB_CORRUPT');}const text=refs.map(h=>chunks.get(h)).join('');if(text.length!==e.length||await hash(text)!==e.hash)fail('LOCAL_IDB_CORRUPT');rows.set(e.key,text);}
  return {meta:data.meta,rows};
 }
 async function writePacked(tx,packed){const bs=tx.objectStore('blocks'),es=tx.objectStore('entries');for(const [text,h]of packed.blocks){const prior=await request(bs.get(h));if(prior&&prior.text!==text)fail('LOCAL_HASH_COLLISION');if(!prior)bs.add({hash:h,text});}for(const e of packed.entries){if(await request(es.get(e.key)))fail('LOCAL_COLLISION');es.add(e);}}
 class Store{
  constructor(db,uid,legacy,rows,meta,original){this.db=db;this.uid=uid;this.legacy=legacy;this.prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:`;this.rows=rows;this.meta=meta;this.legacyText=original;this.durable=true;}
  get length(){return this.rows.size;}key(i){return [...this.rows.keys()][i]??null;}getItem(k){return this.rows.get(k)??null;}
  setItem(){fail('LOCAL_ASYNC_REQUIRED');}removeItem(){fail('LOCAL_DELETE_FORBIDDEN');}clear(){fail('LOCAL_DELETE_FORBIDDEN');}
  legacyUnchanged(){if(fingerprint(scan(this.legacy,this.prefix))!==this.legacyText)fail('LOCAL_LEGACY_CHANGED');}
  async verify(){this.legacyUnchanged();const data=await read(this.db);this.legacyUnchanged();if(data.meta?.phase!=='validated'||data.meta.uid!==this.uid||data.meta.project!==PROJECT||data.meta.legacy!==this.meta.legacy||data.meta.generation!==this.meta.generation||fingerprint(data.rows)!==fingerprint(this.rows))fail('LOCAL_CONFLICT');validate(data.rows,this.uid);return true;}
  async put(key,text){return navigator.locks.request(`safe-finance-local:${PROJECT}:${this.uid}`,()=>this.commitPut(key,text));}
  async commitPut(key,text){
   if(!key.startsWith(this.prefix)||this.rows.has(key))fail('LOCAL_COLLISION');this.legacyUnchanged();const packed=await pack(new Map([[key,text]])),generation=this.meta.generation;if(generation>=Number.MAX_SAFE_INTEGER)fail('LOCAL_GENERATION_EXHAUSTED');
   const next=await transaction(this.db,'readwrite',async tx=>{const ms=tx.objectStore('meta'),head=await request(ms.get('head'));if(head?.phase!=='validated'||head.uid!==this.uid||head.project!==PROJECT||head.legacy!==this.meta.legacy||head.generation!==generation)fail('LOCAL_CONFLICT');this.legacyUnchanged();await writePacked(tx,packed);const n={...head,generation:generation+1};ms.put(n);return n;});
   // Never publish an optimistic memory cache. Re-read committed bytes first.
   const data=await read(this.db);if(data.meta?.generation!==next.generation||data.rows.get(key)!==text)fail('LOCAL_WRITE_FAILED');validate(data.rows,this.uid);this.legacyUnchanged();this.rows=data.rows;this.meta=data.meta;return true;
  }
  async exportArchive(){return navigator.locks.request(`safe-finance:${PROJECT}:${this.uid}`,{mode:'exclusive',ifAvailable:true},async held=>{if(!held)fail('LOCAL_LOCK_BUSY');await this.verify();const payload=JSON.stringify({project:PROJECT,uid:this.uid,meta:this.meta,rows:[...this.rows],legacy:[...scan(this.legacy,this.prefix)]});const result=JSON.stringify({format:'safe-finance-archive-v1',payload,sha256:await hash(payload)});await this.verify();await verifyArchive(result,this.uid);return result;});}
  close(){this.db.close();}
 }
 async function open({uid,legacy=localStorage,allowMigration=false,guard=()=>false,locks=navigator.locks,hook=()=>{}}){
  if(typeof uid!=='string'||!uid||!locks?.request)fail('LOCAL_LOCK_UNAVAILABLE');
  const prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:`,lock=`safe-finance:${PROJECT}:${uid}`;
  return locks.request(lock,{mode:'exclusive',ifAvailable:true},async held=>{
   if(!held)fail('LOCAL_LOCK_BUSY');if(!guard())fail('SESSION_CHANGED');
   const opening=indexedDB.open('safe-finance-v2:'+PROJECT+':'+encodeURIComponent(uid),1);
   opening.onupgradeneeded=()=>{const db=opening.result;db.createObjectStore('meta',{keyPath:'key'});db.createObjectStore('entries',{keyPath:'key'});db.createObjectStore('blocks',{keyPath:'hash'});};
   const db=await new Promise((resolve,reject)=>{let ended=false;const stop=()=>{if(!ended){ended=true;reject(Object.assign(Error('LOCAL_IDB_BLOCKED'),{code:'LOCAL_IDB_BLOCKED'}));}};const timer=setTimeout(stop,15000);opening.onblocked=stop;opening.onerror=()=>{clearTimeout(timer);if(!ended){ended=true;reject(opening.error);}};opening.onsuccess=()=>{clearTimeout(timer);if(ended)opening.result.close();else{ended=true;resolve(opening.result);}};});db.onversionchange=()=>db.close();
   try{
    const before=scan(legacy,prefix),original=fingerprint(before),signature=await hash(original);if(fingerprint(scan(legacy,prefix))!==original)fail('LOCAL_CHANGED');validate(before,uid);
    let data=await read(db);
    if(data.meta?.phase==='validated'){if(data.meta.project!==PROJECT||data.meta.uid!==uid||data.meta.legacy!==signature)fail('LOCAL_LEGACY_CHANGED');for(const [k,v]of before)if(data.rows.get(k)!==v)fail('LOCAL_MIGRATION_MISMATCH');validate(data.rows,uid);if(!guard())fail('SESSION_CHANGED');return new Store(db,uid,legacy,data.rows,data.meta,original);}
    if(!allowMigration)fail('LOCAL_MIGRATION_REQUIRED');
    if(!data.meta){const packed=await pack(before);if(!guard()||fingerprint(scan(legacy,prefix))!==original)fail('LOCAL_CHANGED');
     await transaction(db,'readwrite',async tx=>{const ms=tx.objectStore('meta');if(await request(ms.get('head')))fail('LOCAL_CONFLICT');await writePacked(tx,packed);ms.add({key:'head',phase:'staged',project:PROJECT,uid,legacy:signature,generation:0});});await hook('staged');data=await read(db);
    }
    if(data.meta?.phase!=='staged'||data.meta.project!==PROJECT||data.meta.uid!==uid||data.meta.legacy!==signature||fingerprint(data.rows)!==original)fail('LOCAL_MIGRATION_MISMATCH');validate(data.rows,uid);
    if(!guard()||fingerprint(scan(legacy,prefix))!==original)fail('LOCAL_CHANGED');
    await transaction(db,'readwrite',async tx=>{const ms=tx.objectStore('meta'),head=await request(ms.get('head'));if(head.phase!=='staged'||head.legacy!==signature||!guard()||fingerprint(scan(legacy,prefix))!==original)fail('LOCAL_CHANGED');ms.put({...head,phase:'validated'});});
    await hook('activated');data=await read(db);if(data.meta.phase!=='validated'||fingerprint(data.rows)!==original||!guard())fail('LOCAL_MIGRATION_MISMATCH');
    return new Store(db,uid,legacy,data.rows,data.meta,original);
   }catch(e){db.close();throw e;}
  });
 }

 async function verifyArchive(text,uid){
  const bundle=JSON.parse(text);if(bundle.format!=='safe-finance-archive-v1'||typeof bundle.payload!=='string'||await hash(bundle.payload)!==bundle.sha256)fail('LOCAL_ARCHIVE_HASH');
  const data=JSON.parse(bundle.payload);if(data.project!==PROJECT||data.uid!==uid||data.meta?.uid!==uid||data.meta.project!==PROJECT||data.meta.phase!=='validated')fail('LOCAL_ARCHIVE_OWNER');
  const rows=new Map(data.rows),legacy=new Map(data.legacy);if(rows.size!==data.rows.length||legacy.size!==data.legacy.length||await hash(fingerprint(legacy))!==data.meta.legacy)fail('LOCAL_ARCHIVE_INVALID');
  validate(rows,uid);for(const [k,v]of legacy)if(rows.get(k)!==v)fail('LOCAL_ARCHIVE_INVALID');return {validated:true,entries:rows.size,sha256:bundle.sha256};
 }
 function legacyAccounts(storage){
  const all=new Map(),uids=new Set(),prefix='safe-finance:'+PROJECT+':',length=storage.length;
  for(let i=0;i<length;i++){const k=storage.key(i);if(!k?.startsWith(prefix))continue;const tail=k.slice(prefix.length),pos=tail.indexOf(':');if(pos<1)fail('LOCAL_CORRUPT');const type=tail.slice(pos+1);if(!type.startsWith('journal:')&&!type.startsWith('3l:'))continue;const uid=decodeURIComponent(tail.slice(0,pos));if(!uid||encodeURIComponent(uid)!==tail.slice(0,pos)||all.has(k))fail('LOCAL_CORRUPT');uids.add(uid);all.set(k,storage.getItem(k));}
  if(storage.length!==length)fail('LOCAL_CHANGED');return {all,uids};
 }
 function confirmedTip(rows,uid){
  validate(rows,uid);const prefix=`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:journal:`;
  const nodes=[...rows].filter(([key])=>key.startsWith(prefix)).map(([,text])=>JSON.parse(text)),parents=new Set(nodes.flatMap(r=>r.parents)),tips=nodes.filter(r=>!parents.has(r.key));
  if(!nodes.length)return rows.size===0;
  if(tips.length!==1)return false;const s=tips[0].state;
  return s.status==='CONFIRMED'&&!s.sent&&!s.autoRetryBlocked&&s.base?.exists===true&&s.base.version?.syncProtocol===1&&Number.isSafeInteger(s.base.version.syncRevision)&&s.base.version.syncRevision>=0&&root.SafeFinance.equal(s.data,s.base.data);
 }
 async function auditPending(legacy){
  if(typeof indexedDB.databases!=='function')fail('LOCAL_DATABASE_ENUMERATION_REQUIRED');
  const names=async()=>(await indexedDB.databases()).map(x=>x.name).filter(n=>n?.startsWith('safe-finance-v2:'+PROJECT+':')).sort();
  const initial=legacyAccounts(legacy),before=fingerprint(initial.all),list=await names(),covered=new Set();
  for(const name of list){const uid=decodeURIComponent(name.slice(('safe-finance-v2:'+PROJECT+':').length));if(name!=='safe-finance-v2:'+PROJECT+':'+encodeURIComponent(uid))fail('LOCAL_CORRUPT');
   const db=await request(indexedDB.open(name));try{
    const first=await read(db),source=scan(legacy,`safe-finance:${PROJECT}:${encodeURIComponent(uid)}:`);
    if(first.meta?.phase!=='validated'||first.meta.uid!==uid||first.meta.legacy!==await hash(fingerprint(source)))return true;
    for(const [k,v]of source)if(first.rows.get(k)!==v)return true;
    if(!confirmedTip(first.rows,uid))return true;
    const second=await read(db);if(JSON.stringify(first.meta)!==JSON.stringify(second.meta)||fingerprint(first.rows)!==fingerprint(second.rows))return true;
    covered.add(uid);
   }finally{db.close();}
  }
  if([...initial.uids].some(uid=>!covered.has(uid)))return true;
  return before!==fingerprint(legacyAccounts(legacy).all)||JSON.stringify(list)!==JSON.stringify(await names());
 }
 async function hasPending({legacy=localStorage}={}){try{
  if(!navigator.locks?.request||typeof indexedDB.databases!=='function')return true;
  const inventory=async()=>(await indexedDB.databases()).map(x=>x.name).filter(n=>n?.startsWith('safe-finance-v2:'+PROJECT+':')).sort();const before=await inventory();
  const uids=before.map(n=>decodeURIComponent(n.slice(('safe-finance-v2:'+PROJECT+':').length))).sort();
  const locked=async i=>i===uids.length?(JSON.stringify(before)!==JSON.stringify(await inventory())?true:await auditPending(legacy)):navigator.locks.request(`safe-finance-local:${PROJECT}:${uids[i]}`,{mode:'shared',ifAvailable:true},held=>held?locked(i+1):true);
  return await locked(0);
 }catch{return true;}}
 // Preferences have a separate, bounded key-value store. No journal append and no legacy writes.
 async function preferences(uid){
  if(typeof uid!=='string'||!uid)fail('LOCAL_OWNER_REQUIRED');const allowed=new Set(['theme','accentTheme','brandPalette','hideValues','dailyExpenseIdeal']);
  const opening=indexedDB.open('safe-preferences:'+PROJECT+':'+encodeURIComponent(uid),1);opening.onupgradeneeded=()=>opening.result.createObjectStore('values');const db=await request(opening);db.onversionchange=()=>db.close();
  const cache=new Map();await new Promise((resolve,reject)=>{const tx=db.transaction('values'),q=tx.objectStore('values').openCursor();q.onsuccess=()=>{const c=q.result;if(c){if(allowed.has(c.key))cache.set(c.key,c.value);c.continue();}};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
  let queue=Promise.resolve();return {uid,getItem:k=>cache.get(k)??null,flush:()=>queue,
   put(k,v){if(!allowed.has(k)||typeof v!=='string')fail('LOCAL_INVALID_PREFERENCE');cache.set(k,v);const saving=queue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{let tx;try{tx=db.transaction('values','readwrite',{durability:'strict'});tx.objectStore('values').put(v,k);}catch(e){reject(e);return;}tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('LOCAL_PREFERENCE_FAILED'));}));queue=saving;return saving;}
  };
 }
 root.DurableJournal={open,validate,hash,hasPending,preferences,verifyArchive};
})(globalThis);
