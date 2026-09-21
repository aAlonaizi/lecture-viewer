(function(root){
'use strict';
const REPO='/repos/aAlonaizi/lecture-viewer-notes';
const FILE=REPO+'/contents/chapter-03.json';
const LIMIT=25*1024*1024;
const encode=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);};
const decode=content=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
function create(request){
 return {
  async verify(){const repo=await request(REPO);if(repo.private!==true)throw Error('توقفت المزامنة: مساحة الملاحظات ليست خاصة.');if(repo.permissions?.push!==true)throw Error('الحساب لا يملك صلاحية تعديل مساحة المدرس.');},
  async read(){let file;try{file=await request(FILE);}catch(e){if(e.status===404)return {data:null,sha:null};throw e;}
   if(file.type!=='file'||file.size>LIMIT||typeof file.sha!=='string')throw Error('ملف الملاحظات غير صالح أو أكبر من حد التجربة.');
   let source=file;if(file.encoding!=='base64')source=await request(REPO+'/git/blobs/'+encodeURIComponent(file.sha));
   if(source.encoding!=='base64'||typeof source.content!=='string')throw Error('تعذّر قراءة نسخة الملاحظات.');
   return {data:JSON.parse(decode(source.content)),sha:file.sha};
  },
  async write(data,sha){const text=JSON.stringify(data);if(new TextEncoder().encode(text).length>LIMIT)throw Error('الملاحظات أكبر من 25 ميغابايت. نزّل نسخة احتياطية.');
   return request(FILE,{method:'PUT',body:JSON.stringify({message:'Sync private chapter 3 annotations',content:encode(text),...(sha?{sha}:{})})});
  }
 };
}
root.LectureGitHubStore={create};
})(globalThis);
