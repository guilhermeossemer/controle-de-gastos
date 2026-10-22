
(()=>{'use strict';
const VERSION="controle-gastos-total4-persistence-26f3a5f99a35b0a3582d9491b89737971e2be7b1309dec7cf07361aeadec0fa5",ORIGIN="https://guilhermeossemer.github.io",PROJECT="gastosmensais-ccd84",PATH='/controle-de-gastos/';
let verified=null,activeVersion=null;
function environment(){if(location.origin!==ORIGIN||!location.pathname.startsWith(PATH)||!isSecureContext)throw Error('ORIGIN_OR_CONTEXT_BLOCKED');}
function assertWrite(){environment();if(!verified||navigator.serviceWorker.controller!==verified||activeVersion!==VERSION)throw Object.assign(Error('VERSION_INCOMPATIBLE'),{code:'VERSION_INCOMPATIBLE'});}
function identify(worker){return new Promise(resolve=>{if(!worker)return resolve(null);const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(null);},1500);c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data?.version||null);};worker.postMessage({type:'GET_VERSION'},[c.port2]);});}
async function refresh(){verified=null;activeVersion=null;const worker=navigator.serviceWorker?.controller;const v=await identify(worker);if(worker&&navigator.serviceWorker.controller===worker&&v===VERSION){verified=worker;activeVersion=v;}const el=document.getElementById('release-status');if(el)el.dataset.ready=String(!!verified);if(el)el.textContent=verified?'Versão segura ativa: '+VERSION:'Envio bloqueado: versão ativa antiga ou não comprovada. Preserve pendências, feche todas as abas desta aplicação e reabra. Versão esperada: '+VERSION;return !!verified;}
globalThis.ProductionRuntime=Object.freeze({version:VERSION,project:PROJECT,environment,assertWrite,identify,refresh});
document.addEventListener('DOMContentLoaded',async()=>{const status=document.createElement('p');status.id='release-status';status.setAttribute('role','status');document.body.prepend(status);try{environment();navigator.serviceWorker.addEventListener('controllerchange',()=>{verified=null;activeVersion=null;void refresh();});await refresh();await navigator.serviceWorker.register('./sw.js',{scope:PATH,updateViaCache:'none'});await refresh();}catch{status.textContent='Versão não confirmada; envio bloqueado. Dados locais preservados.';}});
})();
