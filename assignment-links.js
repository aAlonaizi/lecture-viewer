(() => {
 let serial=0,tick;
 window.LectureAssignments={async show(section,slide){
  const version=++serial;clearInterval(tick);let box=document.getElementById('slideAssignments');
  if(!box){box=document.createElement('nav');box.id='slideAssignments';box.setAttribute('aria-label','واجبات الشريحة');document.getElementById('slideLinks').after(box);}
  box.replaceChildren();if(!section)return;
  try{const r=await fetch('/api/classroom/assignments?sectionId='+encodeURIComponent(section.id),{cache:'no-store'});if(!r.ok)return;const data=await r.json();if(version!==serial)return;
   const clocks=[],offset=(data.serverTime||Date.now())-Date.now();
   for(const t of data.assignments.filter(t=>t.slideIds.includes(slide.id))){
    const row=document.createElement('div'),a=document.createElement('a');a.className='button';a.textContent='واجب: '+t.title+' · '+t.maxGrade+' درجة'+(t.bonusMaxGrade?' + '+t.bonusMaxGrade+' بونص':'');a.href='/classroom/?sectionId='+encodeURIComponent(section.id)+'&assignmentId='+encodeURIComponent(t.id);row.append(a);
    const label=document.createElement('label'),minutes=document.createElement('input');label.textContent=t.timed?'إضافة دقائق: ':'المدة بالدقائق: ';minutes.type='number';minutes.min=1;minutes.max=240;minutes.value=t.timed?'5':String(t.suggestedMinutes||15);minutes.style.width='5em';label.append(minutes);
    const start=document.createElement('button');start.textContent=t.timed?'تمديد الوقت / إعادة الفتح':'تفعيل المهمة';const status=document.createElement('span');status.setAttribute('role','status');
    start.onclick=async()=>{const duration=Number(minutes.value);if(!Number.isInteger(duration)||duration<1||duration>240){status.textContent='اختر مدة من 1 إلى 240 دقيقة.';return;}start.disabled=true;try{const response=await fetch('/api/classroom/timer',{method:'POST',headers:{'Content-Type':'application/json','X-Lecture-Account':window.LectureWorkspace.account()?.id||''},body:JSON.stringify({sectionId:section.id,assignmentId:t.id,minutes:duration})});if(!response.ok)throw Error('تعذّر التفعيل. تأكد من نشر الشعبة وتسجيل دخولك.');await window.LectureAssignments.show(section,slide);}catch(e){status.textContent=e.message;start.disabled=false;}};
    const cancel=document.createElement('button');cancel.textContent='إلغاء التفعيل';cancel.disabled=!t.enabled;
    const lateLabel=document.createElement('label'),late=document.createElement('input');late.type='checkbox';late.checked=!!t.allowLate;lateLabel.append(late,document.createTextNode('السماح بالتسليم المتأخر'));
    const policy=async change=>{const response=await fetch('/api/classroom/policy',{method:'POST',headers:{'Content-Type':'application/json','X-Lecture-Account':window.LectureWorkspace.account()?.id||''},body:JSON.stringify({sectionId:section.id,assignmentId:t.id,...change})});if(!response.ok)throw Error('تعذّر حفظ الخيار. حدّث الصفحة وحاول مجددًا.');await window.LectureAssignments.show(section,slide);};
    cancel.onclick=async()=>{cancel.disabled=true;try{await policy({deactivate:true});}catch(e){status.textContent=e.message;cancel.disabled=false;}};
    late.onchange=async()=>{late.disabled=true;try{await policy({allowLate:late.checked});}catch(e){status.textContent=e.message;late.disabled=false;late.checked=!!t.allowLate;}};
    row.append(label,start,cancel,lateLabel,status);box.append(row);clocks.push(()=>{if(!t.enabled){status.textContent='التفعيل ملغى';return;}if(!t.timed){status.textContent=t.visible?'متاحة حاليًا — فعّل المؤقّت للتسليم التلقائي':'مخفية عن الطلبة حتى التفعيل';return;}const seconds=Math.max(0,Math.ceil((Date.parse(t.deadline)-Date.now()-offset)/1000));status.textContent=seconds?' المتبقي '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):t.allowLate?' انتهى الوقت — التسليم المتأخر مسموح':' انتهى الوقت — متاحة للمراجعة';});
   }
   const update=()=>clocks.forEach(fn=>fn());update();tick=setInterval(update,1000);
  }catch{}
 }};
})();
