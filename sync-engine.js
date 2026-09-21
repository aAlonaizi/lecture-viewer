/* No credentials or annotation content are included in this public module. */
(function(root){
'use strict';
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
async function fingerprint(session){const {name,term,annotations}=session;const content=canonical({name,term,archived:session.archived===true,annotations});const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
async function fingerprints(data){const entries=await Promise.all(data.sessions.map(async s=>[s.id,await fingerprint(s)]));return Object.fromEntries(entries);}
async function merge(local,remote,base={},newId=()=>crypto.randomUUID()){
 const l=new Map(local.sessions.map(s=>[s.id,s])),r=new Map(remote.sessions.map(s=>[s.id,s]));
 const lh=await fingerprints(local),rh=await fingerprints(remote),sessions=[],conflicts=[];
 for(const id of new Set([...l.keys(),...r.keys()])){
  if(!l.has(id)){sessions.push(r.get(id));continue;}
  if(!r.has(id)){sessions.push(l.get(id));continue;}
  if(lh[id]===rh[id]||rh[id]===base[id]){sessions.push(l.get(id));continue;}
  if(lh[id]===base[id]){sessions.push(r.get(id));continue;}
  // Keep both complete versions. Never concatenate drawing strokes or discard an erasure.
  sessions.push(r.get(id));const copy={...l.get(id),id:newId(),name:(l.get(id).name.slice(0,45)+' · نسخة هذا الجهاز')};
  sessions.push(copy);conflicts.push({original:id,copy:copy.id});
 }
 return {data:{format:local.format,version:local.version,deck:local.deck,sessions},conflicts};
}
root.LectureSyncEngine={merge,fingerprints};
})(globalThis);
