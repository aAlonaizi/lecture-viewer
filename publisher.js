(function(){
'use strict';
const config=window.LECTURE_PUBLISHING,workspace=window.LectureWorkspace;
const apiOrigin=new URL(config.apiBase).origin;
let busy=false;
const info=id=>workspace.publishInfo()[id];
const link=share=>config.studentBase+'?section='+encodeURIComponent(share);
async function transact(operation,session={}){
 if(busy)throw Error('انتظر اكتمال العملية الحالية.');
 if(location.origin!==apiOrigin)throw Error('افتح دفتر المدرس للمتابعة.');
 busy=true;document.getElementById('syncBtn').disabled=true;
 try{
  const auth=await fetch(config.apiBase+'/api/teacher/session',{cache:'no-store'});
  if(!auth.ok){if(operation==='logout'){await fetch(config.apiBase+'/api/account/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return {};}throw Error('انتهت جلسة الدخول. اضغط خروج ثم ادخل مجددًا؛ مسودتك محفوظة.');}
  const identity=await auth.json();
  if(operation!=='connect'&&identity.account?.id!==workspace.account()?.id)throw Error('تغير الحساب. اضغط خروج ثم ادخل مجددًا.');
  const endpoint=operation==='connect'?'/api/teacher/sections':operation==='logout'?'/api/account/logout':'/api/teacher/'+operation;
  const response=await fetch(config.apiBase+endpoint,operation==='connect'?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json','X-Lecture-Account':workspace.account()?.id||''},body:JSON.stringify(operation==='publish'?{session,revision:info(session.id)?.revision||0}:['library','preferences'].includes(operation)?session:{id:session.id})});
  const result=await response.json();if(!response.ok)throw Error(response.status===409?'توجد نسخة أحدث. اخرج وافتح دفترك مجددًا؛ سنحتفظ بمسودتك.':'تعذّرت العملية. مسودتك محفوظة.');if(operation==='connect'&&!result.account?.id)throw Error('حدّث الصفحة لتحميل بيانات الحساب بأمان.');return {...result,account:operation==='connect'?result.account:identity.account};
 }finally{busy=false;document.getElementById('syncBtn').disabled=false;}
}
function enterTeacher(){
 if(location.origin===apiOrigin){location.assign(config.apiBase+'/account.html?return=teacher');return;}
 // Submit in this tab; drafts never enter the URL or browser history.
 const drafts={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(/^lecture-viewer:chapter3:v1(?::account:[A-Za-z0-9-]+)?$/.test(key))drafts[key]=localStorage.getItem(key);}
 const form=document.createElement('form');form.method='POST';form.action=config.apiBase+'/teacher-entry';const input=document.createElement('input');input.type='hidden';input.name='drafts';input.value=JSON.stringify(drafts);form.append(input);document.body.append(form);form.submit();
}
async function connect(){const result=await transact('connect');const ids=workspace.localSectionIds(result.account);let forbidden=[];if(ids.length){const check=await fetch(config.apiBase+'/api/teacher/check-sections',{method:'POST',headers:{'Content-Type':'application/json','X-Lecture-Account':result.account.id},body:JSON.stringify({ids})});if(!check.ok)throw Error('تعذّر التحقق من ملكية المسودات. أعد فتح دفترك.');forbidden=(await check.json()).forbidden;}workspace.activate(result.account,result.sections,forbidden);document.querySelector('.brand p').textContent=result.account.name+(result.account.role==='admin'?' · مدير المشروع':' · مدرس');window.LectureLibrary.activate(result.library,result.preferences);document.getElementById('accountGate').hidden=true;document.body.classList.remove('account-locked');document.getElementById('accountBtn').textContent=result.account.role==='admin'?'إدارة المدرسين':'حسابي';}
window.saveLectureSetting=(type,data)=>transact(type,data);
document.getElementById('connectBtn').onclick=enterTeacher;
document.getElementById('accountBtn').onclick=()=>location.assign(config.apiBase+'/account.html');
document.getElementById('logoutBtn').onclick=async()=>{try{await transact('logout');workspace.lock();document.getElementById('accountGate').hidden=false;document.body.classList.add('account-locked');document.getElementById('connectStatus').textContent='تم تسجيل الخروج.';}catch(e){workspace.toast(e.message);}};
document.getElementById('syncBtn').onclick=async()=>{
 const session=workspace.current();if(!session||session.archived){workspace.toast('اختر شعبة نشطة لنشر ملاحظاتها.');return;}
 try{const result=await transact('publish',session);workspace.setPublishInfo(session.id,{share:result.share,revision:result.revision,published:true});workspace.toast('نُشرت الملاحظات. يكفي أن يحدّث الطلبة رابط الشعبة.');}
 catch(e){workspace.toast(e.message);}
};
document.getElementById('studentLinkBtn').onclick=async()=>{const session=workspace.current(),published=session&&info(session.id);if(!published?.published){workspace.toast('انشر ملاحظات هذه الشعبة أولًا ليصبح رابطها متاحًا.');return;}const url=link(published.share);try{await navigator.clipboard.writeText(url);workspace.toast('نُسخ رابط الشعبة. أرسله للطلبة.');}catch{window.prompt('رابط الشعبة',url);}};
window.revokeLectureSection=async id=>{
 // Always ask the service, including on devices without local publication metadata.
 const result=await transact('revoke',{id});workspace.setPublishInfo(id,{...(info(id)||{}),revision:result.revision,published:false});
};
let checkingIdentity=false;
async function checkIdentity(event){if(checkingIdentity||!workspace.account()||document.hidden)return;checkingIdentity=true;const expected=workspace.account().id;if(event){document.getElementById('accountGate').hidden=false;document.body.classList.add('account-locked');}try{const response=await fetch(config.apiBase+'/api/teacher/session',{cache:'no-store'});const identity=response.ok?await response.json():null;if(!identity||identity.account?.id!==expected){workspace.lock();document.getElementById('accountGate').hidden=false;document.body.classList.add('account-locked');document.getElementById('connectStatus').textContent='تغير حساب الدخول أو انتهت جلسته. افتح دفترك بالحساب المطلوب؛ مسودات الحساب السابق محفوظة منفصلة.';}else if(workspace.account()?.id===expected){document.getElementById('accountGate').hidden=true;document.body.classList.remove('account-locked');}}catch{}finally{checkingIdentity=false;}}
window.addEventListener('focus',checkIdentity);document.addEventListener('visibilitychange',checkIdentity);setInterval(checkIdentity,30000);
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
if(location.origin===apiOrigin){
 if(window.lectureTransferFailed){document.getElementById('connectStatus').textContent='تعذّر استيراد المسودة القديمة. بقيت محفوظة في الرابط السابق.';}
 else fetch(config.apiBase+'/api/teacher/session',{cache:'no-store'}).then(r=>{if(r.ok)return connect();}).catch(e=>{document.getElementById('connectStatus').textContent=e.message;});
}
})();
