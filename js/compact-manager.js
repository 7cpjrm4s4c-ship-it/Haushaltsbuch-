/* Kompakte, nach Kategorien sortierte Eintragsverwaltung. */
'use strict';

function managerButton(label, action, danger=false){
  return `<button class="btn ${danger?'btn-cancel':'btn-ghost'}" type="button" onclick="event.stopPropagation();${action}">${label}</button>`;
}

function variableBookingGroups(year, month){
  const categories=S.cats
    .filter(cat=>cat.t==='V')
    .slice()
    .sort((a,b)=>String(a.p||'').localeCompare(String(b.p||''),'de',{sensitivity:'base'}));
  const bookings=getBuchungenForMonth(year,month);
  return categories.map(cat=>{
    const items=bookings.filter(item=>item.catId===cat.id).slice().sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
    if(!items.length)return '';
    const total=items.reduce((sum,item)=>sum+Number(item.betrag||0),0);
    return `<details class="manager-group">
      <summary><div class="manager-group-title">${esc(cat.p)}</div><div class="manager-group-meta">${items.length} · <span class="manager-total">${fmt(total)}</span></div><span class="manager-chevron">▼</span></summary>
      <div class="manager-group-body">${items.map(item=>`<details class="manager-entry">
        <summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.bezeichnung||cat.p)}</div><div class="manager-entry-sub">${new Date(item.ts).toLocaleDateString('de-DE')} · ${MF[item.month]} ${item.year}</div></div><div class="manager-entry-value" style="color:var(--red)">-${fmt(item.betrag)}</div><span class="manager-chevron">▼</span></summary>
        <div class="manager-entry-actions">${managerButton('Bearbeiten',`editBooking('${esc(item.id)}')`)}${managerButton('Löschen',`deleteBooking('${esc(item.id)}')`,true)}</div>
      </details>`).join('')}</div>
    </details>`;
  }).join('');
}

function fixedManagerGroups(categories){
  const typeOrder={E:0,F:1,K:2,S:3};
  const groups=new Map();
  categories.slice().sort((a,b)=>(typeOrder[a.t]-typeOrder[b.t])||a.g.localeCompare(b.g,'de')||a.p.localeCompare(b.p,'de')).forEach(cat=>{
    const key=`${cat.t}|${cat.g}`;
    if(!groups.has(key))groups.set(key,{type:cat.t,name:cat.g,items:[]});
    groups.get(key).items.push(cat);
  });
  return [...groups.values()].map(group=>{
    const total=group.items.reduce((sum,cat)=>sum+gv(S.year,S.month,cat),0);
    return `<details class="manager-group">
      <summary><div class="manager-group-title">${esc(group.name)}</div><div class="manager-group-meta">${TL[group.type]} · ${group.items.length} · <span class="manager-total">${fmtS(total)}</span></div><span class="manager-chevron">▼</span></summary>
      <div class="manager-group-body">${group.items.map(cat=>{
        const rule=findRecurringRule(cat.id);
        const interval=INTERVALS.find(([months])=>months===Number(rule?.intervalMonths||1))?.[1]||'Monatlich';
        return `<details class="manager-entry">
          <summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(cat.p)}</div><div class="manager-entry-sub">${interval}${rule?` · ab ${MF[rule.startMonth]} ${rule.startYear}`:''}</div></div><div class="manager-entry-value ${RC[cat.t]||''}">${fmtS(gv(S.year,S.month,cat))}</div><span class="manager-chevron">▼</span></summary>
          <div class="manager-entry-actions">${managerButton('Bearbeiten',`openPositionDialog('${esc(cat.id)}')`)}${managerButton('Löschen',`deleteFixedCost('${esc(cat.id)}')`,true)}</div>
        </details>`;
      }).join('')}</div>
    </details>`;
  }).join('');
}

vAusgaben=function(){
  const y=S.year,mo=S.month;
  const groups=variableBookingGroups(y,mo);
  return `<div class="desktop-page-title">Ausgaben</div>
    <div class="layout-grid expenses-grid">
    <div class="grid-primary"><div class="card form-card"><div class="card-title">Variable Ausgabe erfassen</div>
      <div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===mo?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${S.years.map(x=>`<option value="${x}"${x===y?' selected':''}>${x}</option>`).join('')}</select></div></div></div>
      <div class="field"><div class="lbl">Betrag</div><input class="inp" id="quick-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
      <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="quick-cat"><option value="">Bitte auswählen</option>${variableCategoryOptions(S.ausgabeCatId)}</select></div></div>
      <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="quick-name" placeholder="z. B. REWE oder Freizeitpark"/></div>
      <div class="dialog-actions"><button class="btn btn-cancel" onclick="clearExpenseForm()">Abbrechen</button><button class="btn btn-green" onclick="saveStructuredExpense()">Speichern</button></div>
    </div></div>
    <div class="grid-secondary"><div class="card"><div class="list-head"><div class="card-title" style="margin:0">Gespeicherte Ausgaben</div><span class="muted">${MF[mo]} ${y}</span></div><div class="manager-groups">${groups||'<div class="manager-empty">Noch keine Ausgaben in diesem Monat.</div>'}</div></div></div>
    </div>`;
};

vUebersicht=function(){
  const type=S.ui.fixedType||'all',group=S.ui.fixedGroup||'all',search=(S.ui.fixedSearch||'').trim().toLowerCase();
  const all=fixedCostCategories();
  const categories=all.filter(c=>(type==='all'||c.t===type)&&(group==='all'||c.g===group)&&(!search||c.p.toLowerCase().includes(search)||c.g.toLowerCase().includes(search)));
  return `<div class="desktop-page-title">Fixkosten</div>
    <div class="layout-grid fixed-costs-grid">
    <div class="grid-primary"><div class="card form-card"><div class="card-title">Zeitraum und Filter</div><div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===S.month?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${S.years.map(y=>`<option value="${y}"${y===S.year?' selected':''}>${y}</option>`).join('')}</select></div></div></div>
      <div class="compact-toolbar"><input class="inp wide" id="fixed-search" placeholder="Position suchen" value="${esc(S.ui.fixedSearch||'')}"/><button class="btn btn-ghost" onclick="applyFixedSearch()">Suchen</button><div class="sw"><select class="sel" onchange="S.ui.fixedType=this.value;render()">${fixedCostTypeOptions(type)}</select></div><div class="sw"><select class="sel" onchange="S.ui.fixedGroup=this.value;render()">${fixedCostGroups(group)}</select></div></div><button class="btn btn-primary btn-full" onclick="openPositionDialog('')">Position hinzufügen</button>
    </div></div>
    <div class="grid-secondary"><div class="card"><div class="list-head"><div class="card-title" style="margin:0">Gespeicherte Positionen</div><span class="muted">${categories.length} Einträge</span></div><div class="manager-groups">${fixedManagerGroups(categories)||'<div class="manager-empty">Keine passenden Positionen.</div>'}</div></div>
    <div class="card"><div class="card-title">Verwaltung</div><div class="form-actions"><button class="btn btn-ghost" onclick="openAddYear()">Jahr hinzufügen</button><button class="btn btn-ghost" onclick="openFixedDataActions()">Daten verwalten</button></div></div></div>
    </div>`;
};
vEinstellungen=vUebersicht;
