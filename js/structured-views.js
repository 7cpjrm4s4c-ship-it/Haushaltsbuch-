/* Aufgeräumte Ansichten. Dashboard bleibt unverändert. */
'use strict';

S.ui = S.ui || { overviewType:'all', overviewGroup:'all', settingsGroup:'all', settingsType:'all', settingsSearch:'' };

function groupedCategoryOptions(types, selected=''){
  const groups=new Map();
  S.cats.filter(c=>types.includes(c.t)).forEach(c=>{if(!groups.has(c.g))groups.set(c.g,[]);groups.get(c.g).push(c);});
  return [...groups].map(([g,cats])=>`<optgroup label="${esc(g)}">${cats.map(c=>`<option value="${esc(c.id)}"${c.id===selected?' selected':''}>${esc(c.p)}</option>`).join('')}</optgroup>`).join('');
}

vAusgaben=function(){
  const y=S.year,mo=S.month;
  const recent=getBuchungenForMonth(y,mo).slice().reverse().slice(0,10);
  const yOpts=S.years.map(v=>`<option value="${v}"${v===y?' selected':''}>${v}</option>`).join('');
  const mOpts=MF.map((v,i)=>`<option value="${i}"${i===mo?' selected':''}>${v}</option>`).join('');
  const rows=recent.map(b=>{const c=S.cats.find(x=>x.id===b.catId);return `<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(b.bezeichnung||c?.p||'Ausgabe')}</div><div class="compact-sub">${esc(c?.p||'Ohne Kategorie')} · ${new Date(b.ts).toLocaleDateString('de-DE')}</div></div><div class="compact-value" style="color:var(--red)">-${fmt(b.betrag)}</div></div>`}).join('');
  return `<div class="desktop-page-title">Ausgaben</div>
    <div class="card form-card">
      <div class="card-title">Ausgabe erfassen</div>
      <div class="form-grid two">
        <div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${mOpts}</select></div></div>
        <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${yOpts}</select></div></div>
      </div>
      <div class="field"><div class="lbl">Betrag</div><input class="inp" id="quick-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${esc(S.ausgabeAmt||'')}"/></div>
      <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="quick-cat"><option value="">Bitte auswählen</option>${groupedCategoryOptions(['V','F'],S.ausgabeCatId)}</select></div><div class="field-hint">Die Kategorien sind nach Gruppen sortiert.</div></div>
      <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="quick-name" placeholder="z. B. REWE oder Tankstelle" value="${esc(S.ausgabeBezeichnung||'')}"/></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="addCat()">Neue Kategorie</button><button class="btn btn-green" onclick="saveStructuredExpense()">Speichern</button></div>
    </div>
    <div class="card list-card"><div class="list-head"><div class="card-title" style="margin:0">Letzte Buchungen</div><span style="font-size:11px;color:var(--t3)">${MF[mo]} ${y}</span></div><div class="list-body">${rows||'<div class="empty-state">Noch keine Buchungen in diesem Monat.</div>'}</div></div>`;
};

function saveStructuredExpense(){
  const amount=Number(document.getElementById('quick-amount')?.value);
  const catId=document.getElementById('quick-cat')?.value;
  const name=document.getElementById('quick-name')?.value.trim()||'';
  if(!Number.isFinite(amount)||amount<=0)return toast('Bitte Betrag eingeben','err');
  if(!catId)return toast('Bitte Kategorie auswählen','err');
  S.buchungen.push({id:uid(),catId,bezeichnung:name,betrag:amount,month:S.month,year:S.year,ts:Date.now()});
  S.ausgabeAmt='';S.ausgabeBezeichnung='';S.ausgabeCatId=catId;persist();render();toast('Ausgabe gespeichert');
}

vUebersicht=function(){
  const type=S.ui.overviewType||'all',group=S.ui.overviewGroup||'all';
  const cats=S.cats.filter(c=>(type==='all'||c.t===type)&&(group==='all'||c.g===group));
  const groups=[...new Set(S.cats.map(c=>c.g))];
  const rows=cats.map(c=>`<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(c.p)}</div><div class="compact-sub">${esc(c.g)} · ${TL[c.t]}</div></div><div class="compact-value">${fmtS(gv(S.year,S.month,c))}</div><button class="row-edit-btn" onclick="openEditValue('${esc(c.id)}','${S.year}','${S.month}')">✎</button></div>`).join('');
  return `<div class="desktop-page-title">Übersicht</div><div class="card"><div class="card-title">Filtern</div><div class="compact-toolbar"><div class="sw"><select class="sel" onchange="S.ui.overviewType=this.value;render()"><option value="all">Alle Typen</option>${Object.entries(TL).map(([k,v])=>`<option value="${k}"${k===type?' selected':''}>${v}</option>`).join('')}</select></div><div class="sw"><select class="sel" onchange="S.ui.overviewGroup=this.value;render()"><option value="all">Alle Gruppen</option>${groups.map(g=>`<option value="${esc(g)}"${g===group?' selected':''}>${esc(g)}</option>`).join('')}</select></div></div></div><div class="card list-card"><div class="list-head"><div class="card-title" style="margin:0">${MF[S.month]} ${S.year}</div><span style="font-size:11px;color:var(--t3)">${cats.length} Positionen</span></div><div class="list-body">${rows||'<div class="empty-state">Keine passenden Positionen.</div>'}</div></div>`;
};

vEinstellungen=function(){
  const groups=[...new Set(S.cats.map(c=>c.g))];
  const q=(S.ui.settingsSearch||'').toLowerCase(),g=S.ui.settingsGroup||'all',t=S.ui.settingsType||'all';
  const cats=S.cats.filter(c=>(g==='all'||c.g===g)&&(t==='all'||c.t===t)&&(!q||c.p.toLowerCase().includes(q)||c.g.toLowerCase().includes(q)));
  const catRows=cats.map(c=>`<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(c.p)}</div><div class="compact-sub">${esc(c.g)} · ${TL[c.t]} · ${fmt(c.d)}</div></div><button class="row-edit-btn" onclick="editCat('${esc(c.id)}')">✎</button></div>`).join('');
  const budgetRows=Object.entries(S.budgets).map(([id,val])=>{const c=S.cats.find(x=>x.id===id);return c?`<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(c.p)}</div><div class="compact-sub">Monatliches Limit</div></div><div class="compact-value">${fmt(val)}</div></div>`:''}).join('');
  return `<div class="desktop-page-title">Einstellungen</div>
    <div class="card"><div class="card-title">Kategorien</div><div class="compact-toolbar"><input class="inp wide" placeholder="Kategorie suchen" value="${esc(S.ui.settingsSearch||'')}" oninput="S.ui.settingsSearch=this.value;render()"/><div class="sw"><select class="sel" onchange="S.ui.settingsGroup=this.value;render()"><option value="all">Alle Gruppen</option>${groups.map(x=>`<option value="${esc(x)}"${x===g?' selected':''}>${esc(x)}</option>`).join('')}</select></div><div class="sw"><select class="sel" onchange="S.ui.settingsType=this.value;render()"><option value="all">Alle Typen</option>${Object.entries(TL).map(([k,v])=>`<option value="${k}"${k===t?' selected':''}>${v}</option>`).join('')}</select></div></div><button class="btn btn-primary btn-full" onclick="addCat()">Kategorie hinzufügen</button></div>
    <div class="card list-card"><div class="list-head"><div class="card-title" style="margin:0">Kategorien verwalten</div><span style="font-size:11px;color:var(--t3)">${cats.length} Treffer</span></div><div class="list-body">${catRows||'<div class="empty-state">Keine passenden Kategorien.</div>'}</div></div>
    <div class="card form-card"><div class="card-title">Budget festlegen</div><div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="budget-cat"><option value="">Bitte auswählen</option>${groupedCategoryOptions(['V','F'])}</select></div></div><div class="field"><div class="lbl">Monatliches Limit</div><input class="inp" id="budget-value" type="number" min="0" step="0.01" placeholder="0,00"/></div><button class="btn btn-primary btn-full" onclick="saveStructuredBudget()">Budget speichern</button>${budgetRows?`<div class="sheet-divider"></div>${budgetRows}`:''}</div>
    <div class="card"><div class="card-title">Jahre</div>${S.years.map(y=>`<div class="compact-row"><div class="compact-main"><div class="compact-title">${y}</div><div class="compact-sub">${y===S.year?'Aktives Jahr':'Planungsjahr'}</div></div>${y===S.year?'':`<button class="row-edit-btn" style="color:var(--red)" onclick="delYear(${y})">×</button>`}</div>`).join('')}<button class="btn btn-ghost btn-full mt12" onclick="openAddYear()">Jahr hinzufügen</button></div>
    ${automationCard()}
    <div class="card"><div class="card-title">Daten</div><div class="form-actions"><button class="btn btn-ghost" onclick="resetData()">Planwerte löschen</button><button class="btn btn-ghost" onclick="resetBuchungen()">Buchungen löschen</button></div><button class="btn btn-red btn-full mt8" onclick="resetAll()">App zurücksetzen</button></div>`;
};

function saveStructuredBudget(){const id=document.getElementById('budget-cat')?.value;const val=Number(document.getElementById('budget-value')?.value);if(!id||!Number.isFinite(val)||val<=0)return toast('Kategorie und Betrag prüfen','err');S.budgets[id]=val;persist();render();toast('Budget gespeichert');}
