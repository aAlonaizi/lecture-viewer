'use strict';
(async()=>{
 const $=id=>document.getElementById(id),share=new URL(location.href).searchParams.get('section');
 const fail=text=>{$('pages').replaceChildren();$('pages').hidden=true;$('controls').hidden=true;$('status').hidden=false;$('status').textContent=text;$('updated').textContent='';};
 if(!/^[a-f0-9]{48}$/.test(share||'')){fail('رابط الشعبة غير صحيح. استخدم الرابط الذي أرسله المدرس.');return;}
 try{
  const response=await fetch(window.LECTURE_PUBLISHING.apiBase+'/api/student/'+share,{cache:'no-store',credentials:'omit'});
  if(!response.ok){fail(response.status===404?'شرح هذه الشعبة غير متاح حاليًا. قد يكون المدرس أوقف مشاركته.':'تعذّر تحميل آخر نسخة. حاول تحديث الصفحة.');return;}
  const data=await response.json(),session=data.session;let index=0;
  $('name').textContent=session.term+' / '+session.name;$('updated').textContent='آخر نشر: '+new Date(data.updatedAt).toLocaleString('ar-KW')+' · حدّث الصفحة للحصول على أحدث شرح.';
  const svgInk=(strokes,w,h)=>{const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');for(const s of strokes){if(!['#6d28d9','#dc2626','#2563eb','#172033'].includes(s.color))continue;for(let i=0;i<s.points.length;i++){const a=s.points[Math.max(0,i-1)],b=s.points[i],p=document.createElementNS(ns,'path');p.setAttribute('d',`M${a.x*w} ${a.y*h} L${b.x*w+.001} ${b.y*h}`);p.setAttribute('fill','none');p.setAttribute('stroke',s.color);p.setAttribute('stroke-width',s.width*(.6+.4*(b.p||.5)));p.setAttribute('stroke-linecap','round');svg.append(p);}}return svg;};
  const pages=window.LECTURE_SLIDES.map((slide,i)=>{const a=session.annotations[slide.id]||{slide:[],note:[]},page=document.createElement('section');page.className='page';const title=document.createElement('h2');title.textContent=`${i+1}. ${slide.title}`;const sheet=document.createElement('div');sheet.className='sheet'+(a.note.length?' with-notes':'');const surface=document.createElement('div');surface.className='slide';const img=document.createElement('img');img.src=slide.src;img.alt=slide.title;surface.append(img,svgInk(a.slide,slide.ratio*900,900));sheet.append(surface);if(a.note.length){const note=document.createElement('div');note.className='note';note.append(svgInk(a.note,slide.ratio*900*.42,900));sheet.append(note);}page.append(title,sheet);$('pages').append(page);return page;});
  const show=()=>{pages.forEach((p,i)=>p.hidden=i!==index);$('counter').textContent=`${index+1} / ${pages.length}`;$('prev').disabled=index===0;$('next').disabled=index===pages.length-1;};
  $('prev').onclick=()=>{index=Math.max(0,index-1);show();};$('next').onclick=()=>{index=Math.min(pages.length-1,index+1);show();};$('toggle').onclick=()=>{document.body.classList.toggle('hide-ink');$('toggle').textContent=document.body.classList.contains('hide-ink')?'إظهار الملاحظات':'إخفاء الملاحظات';};$('print').onclick=()=>window.print();
  show();$('status').hidden=true;$('pages').hidden=false;$('controls').hidden=false;
  // Reload a restored tab as well, so browser history cannot silently show a revoked copy.
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 }catch{fail('تعذّر الاتصال. حدّث الصفحة عند عودة الإنترنت لعرض آخر نسخة نشرها المدرس.');}
})();
