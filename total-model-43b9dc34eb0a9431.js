/* Read-only projections. Never use these projections as a persisted history. */
(() => {
 'use strict';
 const origins=['expenses','creditCard','dailyExpenses'],categories=['essential','desire','investment'];
 const index=s=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s))throw Error('INVALID_PERIOD');const [y,m]=s.split('-').map(Number);if(y<1)throw Error('INVALID_PERIOD');return y*12+m-1;};
 const key=i=>`${String(Math.floor(i/12)).padStart(4,'0')}-${String(i%12+1).padStart(2,'0')}`;
 const range=(start,end)=>{const a=index(start),b=index(end);if(a>b)throw Error('INVERTED_PERIOD');return Array.from({length:b-a+1},(_,i)=>key(a+i));};
 const months=data=>Object.keys(data||{}).filter(y=>/^\d{4}$/.test(y)).flatMap(y=>Object.keys(data[y]||{}).filter(m=>/^(?:[1-9]|1[0-2])$/.test(m)).map(m=>`${y}-${m.padStart(2,'0')}`)).sort();
 function quick(data,kind,now=new Date()) {const y=now.getFullYear(),m=now.getMonth()+1,end=`${y}-${String(m).padStart(2,'0')}`;if(kind==='history'){const all=months(data);return {start:all[0]||end,end:all.at(-1)||end};}if(kind==='year')return {start:`${y}-01`,end:`${y}-12`};if(![3,6,12].includes(Number(kind)))throw Error('INVALID_PERIOD');return {start:key(index(end)-Number(kind)+1),end};}
 const sum=rows=>rows.reduce((s,r)=>s+r.value,0);
 function project(data,period){
  const rows=[],monthly=[],warnings=[];let mirrors=0;const real={essential:0,desire:0,investment:0};let my=0,her=0,transferred=0;
  for(const k of range(period.start,period.end)){
   const [year,mm]=k.split('-'),month=String(Number(mm)),source=data?.[year]?.[month],d=source||{},raw={};
   for(const o of origins){raw[o]=Array.isArray(d[o])?d[o]:[];const ids=new Set();for(const r of raw[o]){if(!Number.isFinite(r.value))throw Error('INVALID_VALUE');if(r.id===undefined||ids.has(typeof r.id+':'+r.id))warnings.push(`${k}/${o}: identificador ausente ou repetido`);ids.add(typeof r.id+':'+r.id);}}
   // Only suppress an explicit credit mirror with the same ID and financial payload.
   // Equal descriptions/amounts alone never prove duplication.
   const available=raw.creditCard.slice();const expenses=raw.expenses.filter(e=>{if(e.source!=='credit')return true;const i=available.findIndex(c=>c.id===e.id&&c.value===e.value&&c.description===e.description&&c.category===e.category);if(i<0)return true;available.splice(i,1);mirrors++;return false;});
   const income=d.rendaFamiliar||{},managed=(income.meuSalario||0)+(income.totalTransferido||0);
   my+=income.meuSalario||0;her+=income.salarioJoceline||income.salarioDela||0;transferred+=income.totalTransferido||0;
   const creditByCategory=categories.map(c=>sum(raw.creditCard.filter(r=>r.category===c)));
   const traditional=sum(raw.expenses)+(creditByCategory[0]+creditByCategory[1]+creditByCategory[2]);
   for(const r of [...raw.expenses,...raw.creditCard])if(categories.includes(r.category))real[r.category]+=r.value;
   const amounts={expenses:sum(expenses),creditCard:sum(raw.creditCard),dailyExpenses:sum(raw.dailyExpenses)};
   monthly.push({key:k,label:`${mm}/${year}`,present:!!source,...amounts,general:amounts.expenses+amounts.creditCard+amounts.dailyExpenses,managed,traditional,surplus:managed-traditional});
   for(const o of origins)for(const r of o==='expenses'?expenses:raw[o])rows.push({...r,origin:o,period:k,exportMonth:`${mm}/${year}`});
  }
  const total=field=>monthly.reduce((s,m)=>s+m[field],0),surplus=total('managed')-total('traditional');
  return {period:{...period},label:`${period.start.slice(5)}/${period.start.slice(0,4)} a ${period.end.slice(5)}/${period.end.slice(0,4)}`,monthly,rows,ranking:rows.slice().sort((a,b)=>b.value-a.value||a.period.localeCompare(b.period)).slice(0,10),mirrors,warnings,my,her,transferred,managed:my+transferred,real,ideal:{essential:(my+transferred)*.5,desire:(my+transferred)*.3,investment:(my+transferred)*.2},general:total('general'),traditional:total('traditional'),surplus,average:surplus/monthly.length,count:monthly.length,present:monthly.filter(m=>m.present).length};
 }
 globalThis.TotalQuery=Object.freeze({range,months,quick,project});
})();
