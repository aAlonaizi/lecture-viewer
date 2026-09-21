(function(){
'use strict';
const config=window.LECTURE_PUBLISHING,workspace=window.LectureWorkspace;
const apiOrigin=new URL(config.apiBase).origin;
let busy=false;
const info=id=>workspace.publishInfo()[id];
const link=share=>config.studentBase+'?section='+encodeURIComponent(share);
function transact(operation,session={}){
 if(busy)return Promise.reject(Error('انتظر اكتمال النشر الحالي.'));
 const popup=window.open(config.apiBase+'/bridge.html'+(operation==='connect'?'?connect=1':''),'lecture-publisher','width=560,height=460');
 if(!popup)return Promise.reject(Error('اسمح بفتح نافذة النشر لهذا الموقع، ثم حاول مرة أخرى.'));
 busy=true;document.getElementById('syncBtn').disabled=true;
 return new Promise((resolve,reject)=>{
  const nonce=crypto.randomUUID();let sent=false;
  const finish=(error,result)=>{clearTimeout(timer);clearInterval(closed);window.removeEventListener('message',receive);busy=false;document.getElementById('syncBtn').disabled=false;error?reject(error):resolve(result);};
  const receive=event=>{
   if(event.origin!==apiOrigin||event.source!==popup)return;
   const data=event.data;
   if(data?.type==='lecture:auth-needed'){finish(Error('سجل الدخول بحساب Google ثم حاول مرة أخرى.'));return;}
   if(data?.type==='lecture:publisher-ready'&&!sent){sent=true;popup.postMessage({type:'lecture:publish-request',operation,session,id:session.id,revision:info(session.id)?.revision||0,accountId:workspace.account()?.id,nonce},apiOrigin);}
   if(data?.type==='lecture:publish-result'&&data.nonce===nonce)finish(data.ok?null:Error(data.error),data);
  };
  window.addEventListener('message',receive);
  const timer=setTimeout(()=>finish(Error('انتهت مهلة الاتصال. تحقق من رابط الشعبة قبل إعادة النشر.')),300000);
  const closed=setInterval(()=>{if(popup.closed)finish(Error('أُغلقت نافذة النشر قبل اكتماله.'));},1500);
 });
}
window.saveLectureSetting=(type,data)=>transact(type,data);
document.getElementById('connectBtn').onclick=async()=>{try{document.getElementById('connectStatus').textContent='أكمل الدخول في النافذة المفتوحة…';const result=await transact('connect');workspace.activate(result.account,result.sections);window.LectureLibrary.activate(result.library,result.preferences);document.getElementById('accountGate').hidden=true;document.body.classList.remove('account-locked');document.getElementById('accountBtn').textContent=result.account.role==='admin'?'إدارة المدرسين':'حسابي';}catch(e){document.getElementById('connectStatus').textContent=e.message;}};
document.getElementById('accountBtn').onclick=()=>window.open(config.apiBase+'/account.html','lecture-account','width=780,height=750');
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
})();
