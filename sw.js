// Versioned, integrity-checked static cache. No deletion or forced activation.
const VERSION="controle-gastos-total4-indexeddb-r2-e6c5e579d60319f995a8db743af7358cc0b9d85b5e4b99237bda781795cdb53a", ASSETS=[{"file":"favicon.png","sha256":"32e2ac2ddae41289c7781423c3ae56a96c5085c4f1b71ecc360514482ab79105"},{"file":"icon-192.png","sha256":"46cd8fd9c56fe6d69389c8ba22a903f537e622eceba74d2a2040e226400c447c"},{"file":"icon-512.png","sha256":"66bde86d0a5492d6e1d32dcf77c0fcf8fbb201a2ad0025c3aeed66465f036aa5"},{"file":"index.html","sha256":"8c4f1a5565079a535ca0e6d5a53c22f1e38cfc100e785d394f3913484a372bc1"},{"file":"manifest.json","sha256":"216af749657a1b11f330bba6bd40d9c485c2f500d94463d3459e50d230c3418f"},{"file":"release.json","sha256":"67c7733e65674bbcfb187a9c1b392863e8a5a029f7c24313090eb8e2ce8f8e90"},{"file":"styles.css","sha256":"321d8473f30519e4c8c72aae4a6bd60c2748f639032614bc852fdc457d198284"},{"file":"total-model-43b9dc34eb0a9431.js","sha256":"43b9dc34eb0a943157b60f66419ed03b4ed78d58ca7aa82e352bd5fd93b8e70e"},{"file":"total-ui-07d401e6274ec225.js","sha256":"07d401e6274ec225a38e3c19f6cff924d2fa7022c6a9cae7d891164f35a2aad2"},{"file":"vendor/chart.js","sha256":"fbc45926e6b46845a0f905552a0e0b1331049bff1115ecf94dbe0904d895e710"},{"file":"vendor/firebase-app.js","sha256":"273b741af11961339d182710b1c7bb33924181a1cd3c05b897be7712feb41629"},{"file":"vendor/firebase-auth.js","sha256":"1ece084575e3fdb00db1bf7ee32db65d18cb1df5a8d6e1e68e8da2b660c7e76e"},{"file":"vendor/firebase-firestore.js","sha256":"eed019bf1e09ec91e781eb34d50c54c40f137644c61bf958b99b7bd20accf90e"},{"file":"vendor/fontawesome.css","sha256":"8d321d88cb97fdedc3189506c25de9292c6e73a60ebaab496243346c6404480e"},{"file":"vendor/jspdf-autotable.js","sha256":"e3110cab56ebf44f0a9943ab90f3f92275a4afc3bb85b9797e57835a8378d280"},{"file":"vendor/jspdf.js","sha256":"98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875"},{"file":"webfonts/fa-brands-400.ttf","sha256":"9e122861bc5f7d6190d580b22acc5b1c3f8cdba9f495593cccd3b47d2cbfa2fd"},{"file":"webfonts/fa-brands-400.woff2","sha256":"29bc44694c394921d1f00271128a2e4cd8293516216e24eac07a73fa821fc1f5"},{"file":"webfonts/fa-regular-400.ttf","sha256":"709034805d10429d24862ad685d561808328329debdbca4f70487b508320a3ff"},{"file":"webfonts/fa-regular-400.woff2","sha256":"fa79fc4f2559112ff3dd27cf5be216d9b5f88066ceef728264f5a3a1a195fc1e"},{"file":"webfonts/fa-solid-900.ttf","sha256":"1782156bfa2054db429277b42f143298a1ce03437c05e2779ca7875112b19d3c"},{"file":"webfonts/fa-solid-900.woff2","sha256":"1b099f88c06ed0869872561c157f0ec9cbe133a0939d9ece4ee1e1f54bd4683d"},{"file":"webfonts/fa-v4compatibility.ttf","sha256":"fde941c0964fab984f6af0697b3fec92e7df384eec9941babfd3e4cbbd6211c2"},{"file":"webfonts/fa-v4compatibility.woff2","sha256":"b3abfccce275536beaaeba990e900a0c08ed2fefbabf4a8bcbb2e2ffe3f2431f"},{"file":"script-afa4304767448d44.js","sha256":"afa4304767448d442d6d7e3ebd471a1aee56f7a952b5c2bfbd16fc9418997bed"},{"file":"safety-core-b0157c39fb571700.js","sha256":"b0157c39fb57170016a82a0675eceb8d9c9d5cb31a3523cf2a32af30248c30ac"},{"file":"safety-integration-7997a09061e34b7b.js","sha256":"7997a09061e34b7b77b3b8916ede5cb564d565caa6902b4d5c2552ffebf24f41"},{"file":"safety-final-d7c0c5819780bae3.js","sha256":"d7c0c5819780bae316097dd7c8abdf164cc950c195116df44a147f4446dfeeb3"},{"file":"online-policy-7a208fd173be63be.js","sha256":"7a208fd173be63be57fd5e39ac9c23b365c69d3097a0123cec3491ecb5bc18a5"},{"file":"pwa-update-0019dea9a6646b28.js","sha256":"0019dea9a6646b28e81c8ed079b94157c57c783751f1433efd548bd4d770f51d"},{"file":"durable-journal-e5a5643efa4a3083.js","sha256":"e5a5643efa4a3083c83cdc469e60618192938c03872e26170b545ba0c3f0b37f"},{"file":"runtime-ff4a21b25acc6f49.js","sha256":"ff4a21b25acc6f4971747251c24ce4266f2df8f617d8e281fedb08fa21e03f9d"}];
const root=new URL('./',self.location.href);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function verifiedFetch(asset){
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('STATIC_TIMEOUT'));},15000);});
 try{return await Promise.race([deadline,(async()=>{
  const response=await fetch(new URL(asset.file,root).href,{cache:'no-store',redirect:'error',signal:controller.signal});
  if(!response.ok)throw Error('STATIC_FETCH_FAILED');
  const bytes=await response.arrayBuffer();
  if(hex(await crypto.subtle.digest('SHA-256',bytes))!==asset.sha256)throw Error('STATIC_HASH_MISMATCH');
  if(controller.signal.aborted)throw Error('STATIC_TIMEOUT');
  // Return the fully read, verified bytes. No late network completion can enter the cache.
  // Fetch has decoded the body. Transport encoding/length no longer describe these bytes.
  const headers=new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.delete('Transfer-Encoding');
  return new Response(bytes,{status:response.status,statusText:response.statusText,headers});
 })()]);}finally{clearTimeout(timer);}
}
function recovery(){return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controle de Gastos — conexão necessária</title><style>body{margin:0;box-sizing:border-box;min-height:100vh;padding:24px;background:#101425;color:#fff;font:16px system-ui;display:grid;place-content:center}main{max-width:32rem;min-width:0;overflow-wrap:anywhere}button{padding:12px 18px;background:#6b32cf;color:white;border:1px solid #b48cff;border-radius:12px;font:inherit;cursor:pointer}p{line-height:1.6}</style><main><h1>Não foi possível abrir a versão segura</h1><p>Conecte-se à internet e tente novamente. Seus dados locais foram preservados. Nenhum lançamento está liberado nesta tela.</p><button id="retry">Tentar novamente</button><p id="status" role="status"></p></main><script>document.getElementById("retry").onclick=async function(){this.disabled=true;try{var r=await navigator.serviceWorker.getRegistration();if(r){await r.update();if(r.waiting){document.getElementById("status").textContent="Atualização disponível. Feche as abas e a janela do aplicativo e abra novamente. Nenhum dado será apagado.";return;}}location.reload();}catch(e){document.getElementById("status").textContent="Conexão indisponível. Tente novamente quando estiver online.";}finally{this.disabled=false;}};</script></html>',{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'"}});}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(VERSION);
 for(const asset of ASSETS){
  const url=new URL(asset.file,root).href;
  const response=await verifiedFetch(asset);
  await cache.put(url,response);
 }
})()));
self.addEventListener('message',event=>{if(event.data?.type==='GET_VERSION')event.ports[0]?.postMessage({version:VERSION});});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
 let name=url.pathname.slice(root.pathname.length)||'index.html';
 if(!ASSETS.some(a=>a.file===name))return;
 // Repair only with bytes matching THIS worker's pinned hash. Never mix releases.
 event.respondWith((async()=>{
  try{
   let cache;try{cache=await caches.open(VERSION);const hit=await cache.match(new URL(name,root).href);if(hit)return hit;}catch{}
   const response=await verifiedFetch(ASSETS.find(a=>a.file===name));
   if(cache)try{await cache.put(new URL(name,root).href,response.clone());}catch{}
   return response;
  }catch{return event.request.mode==='navigate'?recovery():new Response('Recurso seguro indisponível',{status:503});}
 })());
});
