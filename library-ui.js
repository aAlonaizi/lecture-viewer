'use strict';
(()=>{
 const $=id=>document.getElementById(id),w=window.LectureWorkspace,all=window.LECTURE_SLIDES;
 let library={revision:0,courses:[{id:'dsa',name:'هياكل البيانات والخوارزميات باستخدام Python'}],hidden:[],links:{}},prefs={revision:0,terms:[]},chapter='all',coverMode=false;
 const clone=x=>JSON.parse(JSON.stringify(x)),admin=()=>w.account()?.role==='admin';
 function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
 function button(text,action){const b=el('button',text);b.type='button';b.onclick=action;return b;}
 function dialog(title){$('libraryDialogTitle').textContent=title;$('libraryDialogBody').replaceChildren();$('libraryDialog').showModal();return $('libraryDialogBody');}
 $('closeLibraryDialog').onclick=()=>$('libraryDialog').close();
 const term=()=>prefs.terms.find(t=>t.courseId===w.context().courseId&&t.name===w.context().term);
 function allTerms(){const list=clone(prefs.terms);for(const s of w.context().sessions)if(!list.some(t=>t.courseId===(s.courseId||'dsa')&&t.name===s.term))list.push({courseId:s.courseId||'dsa',name:s.term,active:w.context().sessions.some(x=>(x.courseId||'dsa')===(s.courseId||'dsa')&&x.term===s.term&&!x.archived),hidden:[]});return list;}
 async function persist(type,value){const result=await window.saveLectureSetting(type,value);if(type==='library')library=result.data;else prefs=result.data;w.refresh();renderHome();return result.data;}
 async function safely(action){try{await action();}catch(e){w.toast(e.message||'تعذّر حفظ التغيير.');}}
 function open(courseId,termName){if(!all.some(s=>s.courseId===courseId)){w.toast('المادة جاهزة؛ لم تضف شرائحها بعد.');return;}document.body.classList.remove('home-view');$('homePage').hidden=true;w.openCourse(courseId,termName);}
 function renderHome(){const courses=$('courseCards');courses.replaceChildren();for(const c of library.courses){const card=el('article',null,'course-card');card.append(el('h3',c.name),el('p',`${all.filter(s=>s.courseId===c.id).length} شريحة · ${allTerms().filter(t=>t.courseId===c.id&&t.active).length} فصل دراسي فعال`),button('فتح المادة',()=>open(c.id,allTerms().find(t=>t.courseId===c.id&&t.active)?.name)));courses.append(card);}
 $('addCourseBtn').hidden=!admin();$('termCards').replaceChildren();$('inactiveTerms').replaceChildren();for(const t of allTerms()){const card=el('article',null,'term-card');card.append(el('h3',t.name),el('p',library.courses.find(c=>c.id===t.courseId)?.name||t.courseId));if(t.active)card.append(button('فتح الشعب',()=>open(t.courseId,t.name)));card.append(button(t.active?'إنهاء الفصل الدراسي':'إعادة تفعيل الفصل',()=>safely(async()=>{if(t.active&&!confirm('سيختفي الفصل من السجل الفعال ويتوقف عرض روابط شعبه للطلبة. يمكنك إعادة تفعيله لاحقًا.'))return;const next={...clone(prefs),terms:allTerms()};next.terms.find(x=>x.courseId===t.courseId&&x.name===t.name).active=!t.active;await persist('preferences',next);})));$(t.active?'termCards':'inactiveTerms').append(card);}}
 function home(){document.body.classList.add('home-view');$('homePage').hidden=false;renderHome();}
 $('homeBtn').onclick=home;$('directPrintBtn').onclick=()=>w.print();
 $('addCourseBtn').onclick=()=>{const body=dialog('مادة جديدة');const input=el('input');input.placeholder='اسم المادة';input.maxLength=100;input.setAttribute('aria-label','اسم المادة');body.append(input,button('حفظ المادة',()=>safely(async()=>{if(!input.value.trim())throw Error('أدخل اسم المادة.');const next=clone(library);next.courses.push({id:'course-'+crypto.randomUUID(),name:input.value.trim()});await persist('library',next);$('libraryDialog').close();})));};
 $('addTermBtn').onclick=()=>{const body=dialog('فصل دراسي جديد');const select=el('select');select.setAttribute('aria-label','المادة');for(const c of library.courses)select.add(new Option(c.name,c.id));const input=el('input');input.placeholder='مثال: ربيع 2027';input.maxLength=70;input.setAttribute('aria-label','اسم الفصل الدراسي');body.append(select,input,button('إنشاء الفصل',()=>safely(async()=>{const name=input.value.trim();if(!name)throw Error('أدخل اسم الفصل الدراسي.');const terms=allTerms();if(terms.some(t=>t.courseId===select.value&&t.name===name))throw Error('هذا الفصل موجود لهذه المادة.');terms.push({courseId:select.value,name,active:true,hidden:[]});await persist('preferences',{...clone(prefs),terms});$('libraryDialog').close();})));};
 $('chapterSelect').onchange=e=>{chapter=e.target.value;w.refresh();};
 function visibility(){const body=dialog('ظهور الشرائح');body.append(el('p','إخفاء الفصل الدراسي يشمل جميع شعبك فيه. الإخفاء العام يعلو على الاختيار المحلي لدى جميع المدرسين.'));for(const s of all.filter(s=>s.courseId===w.context().courseId)){const row=el('div',null,'visibility-row');row.append(el('span',`الفصل ${s.chapter} · ${s.title}`));const localHidden=term()?.hidden.includes(s.id);const localButton=button(localHidden?'إظهار في الفصل الدراسي':'إخفاء في الفصل الدراسي',()=>safely(async()=>{const next={...clone(prefs),terms:allTerms()};let target=next.terms.find(t=>t.courseId===w.context().courseId&&t.name===w.context().term);if(!target){target={courseId:w.context().courseId,name:w.context().term,active:true,hidden:[]};next.terms.push(target);}target.hidden=target.hidden.includes(s.id)?target.hidden.filter(id=>id!==s.id):[...target.hidden,s.id];await persist('preferences',next);$('libraryDialog').close();visibility();}));localButton.disabled=!w.context().term;localButton.title=w.context().term?'':'أنشئ فصلًا دراسيًا أو فعّل فصلًا سابقًا أولًا';row.append(localButton);if(admin())row.append(button(library.hidden.includes(s.id)?'إظهار للجميع':'إخفاء عن الجميع',()=>safely(async()=>{const next=clone(library);next.hidden=next.hidden.includes(s.id)?next.hidden.filter(id=>id!==s.id):[...next.hidden,s.id];await persist('library',next);$('libraryDialog').close();visibility();})));else if(library.hidden.includes(s.id))row.append(el('small','مخفية من مالك المحتوى'));body.append(row);}}
 $('visibilityBtn').onclick=visibility;
 function linksDialog(notice=''){
  const slide=w.context().slide,body=dialog('روابط: '+slide.title);
  const status=el('p',notice,'link-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  const list=library.links[slide.id]||[];
  if(!list.length)body.append(el('p','لا توجد روابط لهذه الشريحة بعد.'));
  for(const [i,l] of list.entries()){
   const row=el('div',null,'resource-row'),a=el('a',l.label);a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';row.append(a,el('small',l.url,'resource-url'));
   if(admin())row.append(button('حذف الرابط',async()=>{try{const next=clone(library);next.links[slide.id].splice(i,1);await persist('library',next);$('libraryDialog').close();linksDialog('حُذف الرابط.');}catch(e){status.textContent=e.message;status.classList.add('error');}}));body.append(row);
  }
  if(!admin()){body.append(el('p','يدير مالك المحتوى الروابط المشتركة.'));return;}
  const form=el('form'),label=el('input'),url=el('input');label.maxLength=160;url.maxLength=2000;url.inputMode='url';url.dir='ltr';label.placeholder='مثال: ملف التمرين';url.placeholder='example.com أو https://example.com';
  const labelField=el('label','عنوان الرابط'),urlField=el('label','رابط الموقع أو الملف');labelField.append(label);urlField.append(url);
  const submit=el('button','إضافة الرابط');submit.type='submit';submit.className='primary';form.append(labelField,urlField,el('p','تُحفظ الروابط مباشرة وتظهر فوق الشريحة، وللطلبة عند تحديث رابط الشعبة.','subtle'),submit);body.append(form);
  form.onsubmit=async event=>{
   event.preventDefault();if(submit.disabled)return;status.classList.remove('error');
   try{
    if(!label.value.trim())throw Error('اكتب عنوانًا للرابط، مثل «ملف التمرين».');
    let address=url.value.trim();if(!address)throw Error('أدخل رابط الموقع أو الملف.');
    if(!/^[a-z][a-z0-9+.-]*:/i.test(address))address='https://'+address;
    let parsed;try{parsed=new URL(address);}catch{throw Error('الرابط غير صالح. الصق رابطًا من شريط عنوان المتصفح.');}
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('استخدم رابط موقع يبدأ بـ https:// أو http://، وليس مسار ملف على الجهاز.');
    if(!parsed.hostname.includes('.')&&parsed.hostname!=='localhost')throw Error('أدخل اسم الموقع كاملًا، مثل example.com.');
    if(list.length>=20)throw Error('بلغت هذه الشريحة الحد الأقصى: 20 رابطًا. احذف رابطًا قبل إضافة آخر.');
    if(list.some(l=>l.url===parsed.href))throw Error('هذا الرابط موجود بالفعل في القائمة أعلاه.');
    submit.disabled=true;submit.textContent='جارٍ الحفظ…';status.textContent='جارٍ حفظ الرابط…';
    const next=clone(library);(next.links[slide.id] ||= []).push({label:label.value.trim(),url:parsed.href});await persist('library',next);
    $('libraryDialog').close();linksDialog('تم حفظ الرابط. يمكنك فتحه من القائمة أدناه أو من الشريحة.');
   }catch(e){status.textContent=e.message||'تعذّر الحفظ. حاول مرة أخرى.';status.classList.add('error');}
   finally{submit.disabled=false;submit.textContent='إضافة الرابط';}
  };
 }

 $('linksBtn').onclick=()=>linksDialog();
 function renderCovers(){const layer=$('coverLayer');layer.replaceChildren();for(const [i,c] of w.covers().entries()){if(c.revealed)continue;const b=button('كشف الإجابة',()=>{const covers=w.covers();covers[i].revealed=true;w.setCovers(covers);renderCovers();});b.className='answer-cover';Object.assign(b.style,{left:c.x*100+'%',top:c.y*100+'%',width:c.w*100+'%',height:c.h*100+'%'});layer.append(b);}layer.classList.toggle('drawing-cover',coverMode);$('coverBtn').classList.toggle('selected',coverMode);}
 $('coverBtn').onclick=()=>{if(!w.current()){w.toast('أنشئ شعبة أولًا لحفظ الأغطية فيها.');return;}coverMode=!coverMode;renderCovers();w.toast(coverMode?'اسحب فوق الجزء المراد تغطيته، ثم انقر الغطاء لكشفه.':'انتهى وضع رسم الغطاء.');};
 $('resetCoversBtn').onclick=()=>{w.setCovers(w.covers().map(c=>({...c,revealed:false})));renderCovers();};
 $('manageCoversBtn').onclick=()=>{const body=dialog('أغطية الشريحة');w.covers().forEach((c,i)=>body.append(button(`حذف الغطاء ${i+1}`,()=>{w.setCovers(w.covers().filter((_,j)=>j!==i));renderCovers();$('libraryDialog').close();})));if(!w.covers().length)body.append(el('p','لم تضف أغطية لهذه الشريحة.'));};
 let drag=null;const layer=$('coverLayer');const point=e=>{const r=layer.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
 layer.onpointerdown=e=>{if(!coverMode||!w.current()||e.button!==0)return;e.preventDefault();layer.setPointerCapture(e.pointerId);drag={...point(e),id:e.pointerId};};
 layer.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;let preview=layer.querySelector('.cover-preview');if(!preview){preview=el('div',null,'answer-cover cover-preview');layer.append(preview);}const p=point(e);Object.assign(preview.style,{left:Math.min(p.x,drag.x)*100+'%',top:Math.min(p.y,drag.y)*100+'%',width:Math.abs(p.x-drag.x)*100+'%',height:Math.abs(p.y-drag.y)*100+'%'});};
 layer.onpointerup=e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e),c={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y),revealed:false};drag=null;coverMode=false;if(c.w>.01&&c.h>.01)w.setCovers([...w.covers(),c]);renderCovers();};layer.onpointercancel=()=>{drag=null;renderCovers();};
 window.LectureLibrary={activate:(lib,preferences)=>{library=lib;prefs=preferences;w.refresh();home();},termInactive:(courseId,name)=>allTerms().some(t=>t.courseId===courseId&&t.name===name&&!t.active),terms:id=>allTerms().filter(t=>t.courseId===id&&t.active).map(t=>t.name),selectSlides:(id,name)=>{const hidden=new Set([...library.hidden,...(prefs.terms.find(t=>t.courseId===id&&t.name===name)?.hidden||[])]);return all.filter(s=>s.courseId===id&&!hidden.has(s.id)&&(chapter==='all'||s.chapter===chapter));},isHidden:id=>library.hidden.includes(id)||!!term()?.hidden.includes(id),links:id=>library.links[id]||[],onSlide:slide=>{coverMode=false;renderCovers();$('slideLinks').replaceChildren();for(const l of library.links[slide.id]||[]){const a=el('a',l.label);a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';$('slideLinks').append(a);}$('linksBtn').disabled=slide.id==='empty';$('coverBtn').disabled=!w.current()||slide.id==='empty';}};
 // Shared visibility applies on the next refresh, including another teacher's open editor.
 setInterval(async()=>{if(!w.account())return;try{const response=await fetch(window.LECTURE_PUBLISHING.apiBase+'/api/library',{cache:'no-store'});if(!response.ok)return;const next=await response.json();if(next.revision!==library.revision){library=next;w.refresh();renderHome();}}catch{}},60000);
})();
