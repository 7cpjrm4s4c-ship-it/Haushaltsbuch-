/* Optionales Enddatum für Abonnements und zeitlich begrenzte Finanzierungen. */
'use strict';

(function(){
  const originalOpenPositionDialog = openPositionDialog;
  openPositionDialog = function positionDialogWithEndDate(catId=''){
    originalOpenPositionDialog(catId);

    const rule = findRecurringRule(catId);
    const startYear = Number(rule?.startYear ?? S.year);
    const endMonth = rule?.endMonth;
    const endYear = rule?.endYear;
    const startYearField = document.getElementById('pos-start-year')?.closest('.field');
    if(!startYearField || document.getElementById('pos-end-enabled')) return;

    const yearSet = new Set(S.years.map(Number));
    for(let year=startYear; year<=startYear+20; year++) yearSet.add(year);
    if(Number.isFinite(Number(endYear))) yearSet.add(Number(endYear));
    const years = [...yearSet].sort((a,b)=>a-b);
    const enabled = Number.isFinite(Number(endYear));

    startYearField.insertAdjacentHTML('afterend', `
      <div class="sheet-divider"></div>
      <div class="card-title">Optionale Laufzeitbegrenzung</div>
      <label class="compact-row" style="cursor:pointer;margin-bottom:12px">
        <div class="compact-main">
          <div class="compact-title">Endmonat festlegen</div>
          <div class="compact-sub">Danach wird die Position nicht mehr berücksichtigt.</div>
        </div>
        <input id="pos-end-enabled" type="checkbox" ${enabled?'checked':''} onchange="togglePositionEndDate(this.checked)"/>
      </label>
      <div id="pos-end-fields" class="form-grid two" ${enabled?'':'hidden'}>
        <div class="field"><div class="lbl">Endmonat</div><div class="sw"><select class="sel" id="pos-end-month">${MF.map((name,index)=>`<option value="${index}"${Number(endMonth??11)===index?' selected':''}>${name}</option>`).join('')}</select></div></div>
        <div class="field"><div class="lbl">Endjahr</div><div class="sw"><select class="sel" id="pos-end-year">${years.map(year=>`<option value="${year}"${Number(endYear??startYear)===year?' selected':''}>${year}</option>`).join('')}</select></div></div>
      </div>`);
  };

  window.togglePositionEndDate = function togglePositionEndDate(enabled){
    const fields = document.getElementById('pos-end-fields');
    if(fields) fields.hidden = !enabled;
  };

  const originalSavePositionDialog = savePositionDialog;
  savePositionDialog = function savePositionWithEndDate(catId){
    const enabled = Boolean(document.getElementById('pos-end-enabled')?.checked);
    const startMonth = Number(document.getElementById('pos-start-month')?.value);
    const startYear = Number(document.getElementById('pos-start-year')?.value);
    const endMonth = enabled ? Number(document.getElementById('pos-end-month')?.value) : null;
    const endYear = enabled ? Number(document.getElementById('pos-end-year')?.value) : null;

    if(enabled && monthNo(endYear,endMonth) < monthNo(startYear,startMonth)){
      return toast('Endmonat darf nicht vor dem Startmonat liegen','err');
    }

    const name = document.getElementById('pos-name')?.value.trim();
    const type = document.getElementById('pos-type')?.value;
    originalSavePositionDialog(catId);

    const category = S.cats.find(cat => cat.id===catId)
      || S.cats.find(cat => cat.p===name && cat.t===type);
    if(!category) return;
    const rule = findRecurringRule(category.id);
    if(!rule) return;

    rule.endMonth = enabled ? endMonth : null;
    rule.endYear = enabled ? endYear : null;
    persist();
  };
})();
