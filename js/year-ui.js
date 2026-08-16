/* UI fuer Jahresauswahl. State-Zugriffe nur ueber YearStore. */
'use strict';
function openYearSheet(){
  const years=YearStore.years(),current=YearStore.current();
  document.getElementById('yearSheetBody').innerHTML=years.map(year=>`<div class="year-item${year===current?' active-year':''}" onclick="selYear(${year});closeYearSheet()"><span class="year-item-num">${year}</span>${year===current?'<span class="forecast-positive">✓ Aktiv</span>':''}</div>`).join('');
  document.getElementById('yearSheetFooter').innerHTML='<button class="btn btn-ghost btn-full" onclick="openAddYear()">+ Jahr hinzufügen</button>';
  AppDialogRuntime.openOverlay(document.getElementById('yearOverlay'));
}
function closeYearSheet(){AppDialogRuntime.closeOverlay(document.getElementById('yearOverlay'));}
function openAddYear(){
  const existing=new Set(YearStore.years());const available=Array.from({length:28},(_,index)=>2025+index).filter(year=>!existing.has(year));
  if(!available.length)return toast('Alle Jahre bereits vorhanden','err');
  openGenSheet(`<div class="sheet-title">Jahr hinzufügen</div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" id="add-year">${available.map(year=>`<option value="${year}">${year}</option>`).join('')}</select></div></div><button class="btn btn-primary btn-full" onclick="saveAddYear()">Hinzufügen</button>`);
}
function saveAddYear(){const year=parseInt(document.getElementById('add-year')?.value);if(!year)return;YearStore.add(year);closeGenSheet();closeYearSheet();render();toast(`Jahr ${year} hinzugefügt`);}
function delYear(year){const result=YearStore.remove(year);if(!result.ok&&result.reason==='minimum')return toast('Mindestens ein Jahr muss vorhanden sein','err');render();toast(`Jahr ${year} entfernt`);}
document.getElementById('yearOverlay')?.addEventListener('click',event=>{if(event.target===document.getElementById('yearOverlay'))closeYearSheet();},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeGenSheet();closeYearSheet();}});
