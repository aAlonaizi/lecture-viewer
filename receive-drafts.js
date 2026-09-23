'use strict';
(()=>{
 const raw=sessionStorage.getItem('lecture-draft-transfer');if(!raw)return;
 try{
 for(const [key,value] of Object.entries(JSON.parse(raw))){
  const old=localStorage.getItem(key);if(!old){localStorage.setItem(key,value);continue;}if(old===value)continue;
  const imported=JSON.parse(value),current=JSON.parse(old);current.sessions ||= [];
  for(const s of imported.sessions){const existing=current.sessions.find(x=>x.id===s.id);if(!existing)current.sessions.push(s);else if(JSON.stringify(existing.annotations)!==JSON.stringify(s.annotations)||JSON.stringify(existing.covers||{})!==JSON.stringify(s.covers||{})){
   const duplicate=current.sessions.some(x=>x.migratedFrom===s.id&&JSON.stringify(x.annotations)===JSON.stringify(s.annotations)&&JSON.stringify(x.covers||{})===JSON.stringify(s.covers||{}));
   if(!duplicate)current.sessions.push({...s,id:crypto.randomUUID(),migratedFrom:s.id,name:(s.name+' · مسودة الرابط السابق').slice(0,70)});
  }}
  current.publishInfo={...(imported.publishInfo||{}),...(current.publishInfo||{})};localStorage.setItem(key,JSON.stringify(current));
 }
 sessionStorage.removeItem('lecture-draft-transfer');
 }catch{window.lectureTransferFailed=true;}
})();
