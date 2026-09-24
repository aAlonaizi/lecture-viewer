(() => {
 let serial=0;
 window.LectureAssignments={async show(section,slide){
  const version=++serial;let box=document.getElementById('slideAssignments');
  if(!box){box=document.createElement('nav');box.id='slideAssignments';box.setAttribute('aria-label','واجبات الشريحة');document.getElementById('slideLinks').after(box);}
  box.replaceChildren();if(!section)return;
  try{const r=await fetch('/api/classroom/assignments?sectionId='+encodeURIComponent(section.id),{cache:'no-store'});if(!r.ok)return;const data=await r.json();if(version!==serial)return;
   for(const t of data.assignments.filter(t=>t.visible&&t.slideIds.includes(slide.id))){const a=document.createElement('a');a.className='button';a.textContent='واجب: '+t.title+' · '+t.maxGrade+' درجة';a.href='/classroom/?sectionId='+encodeURIComponent(section.id)+'&assignmentId='+encodeURIComponent(t.id);box.append(a);}
  }catch{}
 }};
})();
