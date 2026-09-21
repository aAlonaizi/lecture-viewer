(function(){
'use strict';
const $=id=>document.getElementById(id),workspace=window.LectureWorkspace;
let credential='',busy=false;
const message=text=>{$('syncMessage').textContent=text;};
function controls(){
 $('syncConnect').hidden=!!credential;$('syncCredentials').hidden=!!credential;
 $('syncNow').hidden=!credential;$('syncDisconnect').hidden=!credential;
 for(const id of ['syncConnect','syncNow','syncDisconnect','syncClose'])$(id).disabled=busy;
 $('syncNow').textContent=busy?'جارٍ المزامنة…':'مزامنة الآن';
}
function disconnect(){credential='';$('syncToken').value='';controls();}
async function request(path,options={}){
 if(!credential)throw Error('اربط حساب المدرس أولًا.');
 // Only this fixed private repository is reachable with the supplied credential.
 if(path!=='/repos/aAlonaizi/lecture-viewer-notes'&&!path.startsWith('/repos/aAlonaizi/lecture-viewer-notes/'))throw Error('مسار غير مسموح.');
 let response;
 try{response=await fetch('https://api.github.com'+path,{...options,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Authorization':'Bearer '+credential,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000)});}
 catch{throw Error('تعذّر الاتصال أو انتهت مهلة الانتظار. ملاحظات جهازك محفوظة؛ حاول المزامنة مجددًا.');}
 if(!response.ok){const status=response.status;let text=status===401?'انتهت صلاحية الربط. أدخل رمزًا جديدًا.':status===403?'رفض GitHub العملية. تحقق من صلاحية Contents: Read and write، أو انتظر إذا بلغ الاتصال حد الاستخدام.':status===404?'تعذّر الوصول إلى مساحة المدرس. تحقق من اختيار المستودع الخاص عند إنشاء الرمز.':status===409||status===422?'تغيّرت النسخة أثناء الحفظ. لم نستبدلها؛ اضغط المزامنة مجددًا لدمج النسختين.':'تعذّرت المزامنة. ملاحظات جهازك لم تُحذف.';if(status===401)disconnect();const error=new Error(text);error.status=status;throw error;}
 return response.json();
}
const store=window.LectureGitHubStore.create(request);
$('syncBtn').onclick=()=>{workspace.snapshot();controls();message(credential?'الحساب مربوط لهذه الصفحة. المزامنة تجمع ملاحظات جهازك والمساحة الخاصة، ولا تنشرها للطلبة.':'اربط مساحة المدرس الخاصة مرة واحدة لكل فتح للصفحة، ثم اضغط «مزامنة الآن».');$('syncDialog').showModal();};
$('syncClose').onclick=()=>{if(!busy)$('syncDialog').close();};
$('syncDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('syncConnect').onclick=async()=>{
 const value=$('syncToken').value.trim();$('syncToken').value='';
 if(!value.startsWith('github_pat_')){message('استخدم رمزًا محدود الصلاحية (Fine-grained)، مخصصًا لمستودع الملاحظات فقط.');return;}
 credential=value;busy=true;controls();message('جارٍ التحقق من المساحة الخاصة…');
 try{await store.verify();message('تم الربط. اضغط «مزامنة الآن» لحفظ واستعادة جميع الشعب، بما فيها الأرشيف.');}
 catch(e){disconnect();message(e.message);}
 finally{busy=false;controls();}
};
$('syncNow').onclick=async()=>{
 if(busy)return;busy=true;controls();message('جارٍ قراءة النسخة الخاصة ودمج التعديلات…');
 try{
  await store.verify();const local=workspace.snapshot(),base=workspace.base(),remote=await store.read();
  if(!remote.data&&Object.keys(base).length)throw Error('النسخة الخاصة السابقة غير موجودة. لم نُنشئ بديلًا تلقائيًا؛ احتفظ بنسخة احتياطية وتحقق من المستودع.');
  const other=remote.data?workspace.validate(remote.data):{...local,sessions:[]};
  const merged=await window.LectureSyncEngine.merge(local,other,base);
  const validated=workspace.validate(merged.data),fingerprints=await window.LectureSyncEngine.fingerprints(validated);
  // GitHub compares the SHA atomically: a concurrent writer cannot be overwritten.
  await store.write(validated,remote.sha);
  workspace.apply(validated,fingerprints,merged.conflicts);
  const detail=merged.conflicts.length?'\nوُجدت تعديلات مختلفة؛ حُفظت النسختان، ونسخة جهازك تحمل اسم «نسخة هذا الجهاز».':'';
  message('تمت مزامنة '+validated.sessions.length+' شعبة في المساحة الخاصة. لا يستطيع زائر موقع الشرائح قراءة هذا الأرشيف.'+detail);
  $('syncBtn').textContent='↻ مزامنة';
 }catch(e){message(e.message);}
 finally{busy=false;controls();}
};
$('syncDisconnect').onclick=()=>{disconnect();message('أُلغي الربط من هذه الصفحة. تبقى ملاحظات جهازك محفوظة محليًا.');};
window.addEventListener('pagehide',disconnect);
})();
