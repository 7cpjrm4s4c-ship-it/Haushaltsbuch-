/* Kompakte, nach Kategorien sortierte Eintragsverwaltung. */
'use strict';

function fixedCostTypeOptions(selected){
  return [
    ['all','Alle Bereiche'],
    ['E','Einnahmen'],
    ['F','Fixkosten'],
    ['K','Kredite'],
    ['S','Sparen'],
  ].map(([value,label])=>`<option value="${value}"${value===selected?' selected':''}>${label}</option>`).join('');
}

function fixedCostGroups(selected){
  const groups=[...new Set(CategoryStore.fixedPositions().map(cat=>cat.g))].sort((a,b)=>a.localeCompare(b,'de'));
  if(typeof SavingsStore!=='undefined'&&SavingsStore.accounts().some(account=>Number(account.monthlyAmount)>0)&&!groups.includes('Sparanlagen'))groups.push('Sparanlagen');
  if(typeof LoanStore!=='undefined'&&LoanStore.all().some(loan=>creditType(loan)==='revolving')&&!groups.includes('Kredite'))groups.push('Kredite');
  return `<option value="all">Alle Kategorien</option>`+groups.map(group=>
    `<option value="${esc(group)}"${group===selected?' selected':''}>${esc(group)}</option>`
  ).join('');
}

function variableCategoryOptionsForManager(selected=''){
  return CategoryStore.variable().map(cat=>`<option value="${esc(cat.id)}"${cat.id===selected?' selected':''}>${esc(cat.p)}</option>`).join('');
}

function saveStructuredExpense(){
  const amount=Number(document.getElementById('quick-amount')?.value);
  const catId=document.getElementById('quick-cat')?.value;
  const name=document.getElementById('quick-name')?.value.trim()||'';
  if(!Number.isFinite(amount)||amount<=0)return toast('Bitte Betrag eingeben','err');
  if(!catId)return toast('Bitte Kategorie auswählen','err');
  BookingStore.add({id:uid(),catId,bezeichnung:name,betrag:amount,month:AppUiState.month(),year:AppUiState.year(),ts:Date.now()});
  ManagerUiState.setExpenseCategory(catId);
  render();
  toast('Ausgabe gespeichert');
}

function managerButton(label, action, danger=false){
  return `<button class="btn ${danger?'btn-cancel':'btn-ghost'}" type="button" onclick="event.stopPropagation();${action}">${label}</button>`;
}

function variableBookingGroups(year, month){
  const categories=CategoryStore.variable();
  const categoryIds=new Set(categories.map(cat=>cat.id));
  const bookings=BookingStore.forMonth(year,month);
  const regular=categories.map(cat=>{
    const items=bookings.filter(item=>item.catId===cat.id).slice().sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
    if(!items.length)return '';
    const total=items.reduce((sum,item)=>sum+Number(item.betrag||0),0);
    return `<details class="manager-group">
      <summary><div class="manager-group-title">${esc(cat.p)}</div><div class="manager-group-meta">${items.length} · <span class="manager-total">${fmt(total)}</span></div><span class="manager-chevron">▼</span></summary>
      <div class="manager-group-body">${items.map(item=>`<details class="manager-entry">
        <summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.bezeichnung||cat.p)}</div><div class="manager-entry-sub">${new Date(item.ts).toLocaleDateString('de-DE')} · ${MF[item.month]} ${item.year}</div></div><div class="manager-entry-value is-expense">-${fmt(item.betrag)}</div><span class="manager-chevron">▼</span></summary>
        <div class="manager-entry-actions">${managerButton('Bearbeiten',`openBookingDialog('${esc(item.id)}')`)}${managerButton('Löschen',`deleteBooking('${esc(item.id)}')`,true)}</div>
      </details>`).join('')}</div>
    </details>`;
  }).join('');

  const orphaned=bookings.filter(item=>!categoryIds.has(item.catId));
  if(!orphaned.length)return regular;
  const orphanTotal=orphaned.reduce((sum,item)=>sum+Number(item.betrag||0),0);
  const orphanRows=orphaned.map(item=>`<details class="manager-entry">
    <summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.bezeichnung||'Ausgabe')}</div><div class="manager-entry-sub">Kategorie nicht mehr vorhanden · ${MF[item.month]} ${item.year}</div></div><div class="manager-entry-value is-expense">-${fmt(item.betrag)}</div><span class="manager-chevron">▼</span></summary>
    <div class="manager-entry-actions">${managerButton('Bearbeiten',`openBookingDialog('${esc(item.id)}')`)}${managerButton('Löschen',`deleteBooking('${esc(item.id)}')`,true)}</div>
  </details>`).join('');
  return regular+`<details class="manager-group" open><summary><div class="manager-group-title">Ohne Kategorie</div><div class="manager-group-meta">${orphaned.length} · <span class="manager-total">${fmt(orphanTotal)}</span></div><span class="manager-chevron">▼</span></summary><div class="manager-group-body">${orphanRows}</div></details>`;
}

function individualSavingsTransferGroup(year,month){
  if(typeof SavingsStore==='undefined')return '';
  const accounts=new Map(SavingsStore.accounts().map(account=>[account.id,account]));
  const items=SavingsStore.transfers().filter(item=>Number(item.year)===Number(year)&&Number(item.month)===Number(month));
  if(!items.length)return '';
  const total=items.reduce((sum,item)=>sum+(item.direction==='withdrawal'?-1:1)*Number(item.amount||0),0);
  return `<details class="manager-group"><summary><div class="manager-group-title">Sparanlagen</div><div class="manager-group-meta">${items.length} · Netto <span class="manager-total">${total>0?'-':total<0?'+':''}${fmt(Math.abs(total))}</span></div><span class="manager-chevron">▼</span></summary><div class="manager-group-body">${items.map(item=>{const account=accounts.get(item.accountId),withdrawal=item.direction==='withdrawal',label=withdrawal?'Auszahlung vom Sparkonto':'Einzahlung auf Sparkonto';return `<details class="manager-entry"><summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.note||label)}</div><div class="manager-entry-sub">${label} · ${esc(account?.name||'Sparanlage')} · ${MF[item.month]} ${item.year}</div></div><div class="manager-entry-value ${withdrawal?'savings-transfer-income':'is-expense'}">${withdrawal?'+':'-'}${fmt(item.amount)}</div><span class="manager-chevron">▼</span></summary><div class="manager-entry-actions">${managerButton('Sparanlage öffnen',`nav('savings')`)}${managerButton('Löschen',`deleteSavingsTransfer('${esc(item.id)}')`,true)}</div></details>`;}).join('')}</div></details>`;
}

function deleteSavingsTransfer(id){if(!confirm('Einzeltransfer wirklich löschen?'))return;if(SavingsStore.removeTransfer(id)){render();toast('Transfer gelöscht');}}

function creditMovementGroup(year,month){
  if(typeof CreditMovementStore==='undefined')return '';
  const items=CreditMovementStore.displayEntries(year,month);if(!items.length)return '';
  const totals=CreditMovementStore.monthlyTotals(year,month),labels=typeof CreditUi!=='undefined'?CreditUi.MOVEMENT_LABELS:{},net=totals.variableNetMainAccount;
  return `<details class="manager-group"><summary><div class="manager-group-title">Kreditbewegungen</div><div class="manager-group-meta">${items.length} · Hauptkonto <span class="manager-total">${net>0?'+':net<0?'-':''}${fmt(Math.abs(net))}</span></div><span class="manager-chevron">▼</span></summary><div class="manager-group-body">${items.map(item=>{const inflow=item.type==='drawdown',label=labels[item.type]||'Kreditbewegung',date=new Date(`${item.date}T12:00:00`).toLocaleDateString('de-DE');return `<details class="manager-entry"><summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.note||label)}</div><div class="manager-entry-sub">${esc(label)} · ${esc(item.loanName)} · ${date}</div></div><div class="manager-entry-value ${inflow?'savings-transfer-income':'is-expense'}">${inflow?'+':'-'}${fmt(item.amount)}</div><span class="manager-chevron">▼</span></summary><div class="manager-entry-actions">${managerButton('Kredit öffnen',`nav('kredite')`)}${item.derived?'':managerButton('Löschen',`LoanActionsController.removeMovement('${esc(item.id)}')`,true)}</div></details>`;}).join('')}</div></details>`;
}

function recurringCreditFixedGroup(year,month,ui){
  if(typeof CreditMovementStore==='undefined')return {count:0,html:''};
  const search=ui.fixedSearch.trim().toLowerCase(),visible=(ui.fixedType==='all'||ui.fixedType==='K')&&(ui.fixedGroup==='all'||ui.fixedGroup==='Kredite');
  const items=visible?CreditMovementStore.fixedPaymentEntries(year,month).filter(item=>!search||item.loanName.toLowerCase().includes(search)):[];
  if(!items.length)return {count:0,html:''};
  const total=items.reduce((sum,item)=>sum+Number(item.amount||0),0),rows=items.map(item=>`<details class="manager-entry"><summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(item.loanName)}</div><div class="manager-entry-sub">Monatsrate · davon ${fmt(item.interest)} Zinsen und ${fmt(item.principal)} Tilgung</div></div><div class="manager-entry-value ${RC.K||''}">${fmtS(item.amount)}</div><span class="manager-chevron">▼</span></summary><div class="manager-entry-actions">${managerButton('Kredit öffnen',`nav('kredite')`)}</div></details>`).join('');
  return {count:items.length,html:`<details class="manager-group"><summary><div class="manager-group-title">Kredite</div><div class="manager-group-meta">Kredit · ${items.length} · <span class="manager-total">${fmtS(total)}</span></div><span class="manager-chevron">▼</span></summary><div class="manager-group-body">${rows}</div></details>`};
}

function recurringSavingsFixedGroup(year,month,ui){
  if(typeof SavingsStore==='undefined')return {count:0,html:''};
  const search=ui.fixedSearch.trim().toLowerCase(),visible=(ui.fixedType==='all'||ui.fixedType==='F')&&(ui.fixedGroup==='all'||ui.fixedGroup==='Sparanlagen');
  const accounts=visible?SavingsStore.accounts().filter(account=>Number(account.monthlyAmount)>0&&(!search||account.name.toLowerCase().includes(search))):[];
  if(!accounts.length)return {count:0,html:''};
  const total=accounts.reduce((sum,account)=>sum+SavingsStore.due(account,year,month),0);
  const rows=accounts.map(account=>{const interval=INTERVALS.find(([months])=>months===Number(account.intervalMonths||1))?.[1]||'Monatlich',amount=SavingsStore.due(account,year,month);return `<details class="manager-entry"><summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(account.name)}</div><div class="manager-entry-sub">${interval} · ab ${MF[account.startMonth]} ${account.startYear}</div></div><div class="manager-entry-value">${fmtS(amount)}</div><span class="manager-chevron">▼</span></summary><div class="manager-entry-actions">${managerButton('Bearbeiten',`SavingsUi.openAccount('${esc(account.id)}')`)}</div></details>`;}).join('');
  return {count:accounts.length,html:`<details class="manager-group"><summary><div class="manager-group-title">Sparanlagen</div><div class="manager-group-meta">Fixkosten · ${accounts.length} · <span class="manager-total">${fmtS(total)}</span></div><span class="manager-chevron">▼</span></summary><div class="manager-group-body">${rows}</div></details>`};
}

function fixedManagerGroups(categories){
  const typeOrder={E:0,F:1,K:2,S:3};
  const groups=new Map();
  categories.slice().sort((a,b)=>(typeOrder[a.t]-typeOrder[b.t])||a.g.localeCompare(b.g,'de')||a.p.localeCompare(b.p,'de')).forEach(cat=>{
    const key=`${cat.t}|${cat.g}`;
    if(!groups.has(key))groups.set(key,{type:cat.t,name:cat.g,items:[]});
    groups.get(key).items.push(cat);
  });
  const year=AppUiState.year(),month=AppUiState.month();
  return [...groups.values()].map(group=>{
    const total=group.items.reduce((sum,cat)=>sum+gv(year,month,cat),0);
    return `<details class="manager-group">
      <summary><div class="manager-group-title">${esc(group.name)}</div><div class="manager-group-meta">${TL[group.type]} · ${group.items.length} · <span class="manager-total">${fmtS(total)}</span></div><span class="manager-chevron">▼</span></summary>
      <div class="manager-group-body">${group.items.map(cat=>{
        const rule=findRecurringRule(cat.id);
        const interval=INTERVALS.find(([months])=>months===Number(rule?.intervalMonths||1))?.[1]||'Monatlich';
        return `<details class="manager-entry">
          <summary><div class="manager-entry-main"><div class="manager-entry-title">${esc(cat.p)}</div><div class="manager-entry-sub">${interval}${rule?` · ab ${MF[rule.startMonth]} ${rule.startYear}`:''}</div></div><div class="manager-entry-value ${RC[cat.t]||''}">${fmtS(gv(year,month,cat))}</div><span class="manager-chevron">▼</span></summary>
          <div class="manager-entry-actions">${managerButton('Bearbeiten',`openPositionDialog('${esc(cat.id)}')`)}${managerButton('Löschen',`deleteFixedPosition('${esc(cat.id)}')`,true)}</div>
        </details>`;
      }).join('')}</div>
    </details>`;
  }).join('');
}

function applyManagerFixedSearch(){
  ManagerUiState.setFixedSearch(document.getElementById('fixed-search')?.value||'');
  render();
}

function compactExpensesView(){
  const y=AppUiState.year(),mo=AppUiState.month();
  const managerState=ManagerUiState.snapshot();
  const groups=variableBookingGroups(y,mo)+individualSavingsTransferGroup(y,mo)+creditMovementGroup(y,mo);
  return `<div class="desktop-page-title">Ausgaben</div>
    <div class="layout-grid expenses-grid">
    <div class="grid-primary"><div class="card form-card"><div class="card-title">Variable Ausgabe erfassen</div>
      <div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===mo?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${AppUiState.years().map(x=>`<option value="${x}"${x===y?' selected':''}>${x}</option>`).join('')}</select></div></div></div>
      <div class="field"><div class="lbl">Betrag</div><input class="inp" id="quick-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
      <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="quick-cat" onchange="ManagerUiState.setExpenseCategory(this.value)"><option value="">Bitte auswählen</option>${variableCategoryOptionsForManager(managerState.expenseCategoryId)}</select></div></div>
      <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="quick-name" placeholder="z. B. REWE oder Freizeitpark"/></div>
      <div class="category-tools"><button class="btn btn-ghost" type="button" onclick="openVariableCategoryManager()">Kategorien verwalten</button></div>
      <div class="dialog-actions"><button class="btn btn-cancel" onclick="clearExpenseForm();ManagerUiState.resetExpense()">Abbrechen</button><button class="btn btn-green" onclick="saveStructuredExpense()">Speichern</button></div>
    </div></div>
    <div class="grid-secondary"><div class="card"><div class="list-head"><div class="card-title">Gespeicherte Ausgaben</div><span class="muted">${MF[mo]} ${y}</span></div><div class="manager-groups">${groups||'<div class="manager-empty">Noch keine Ausgaben in diesem Monat.</div>'}</div></div></div>
    </div>`;
}

function compactFixedCostsView(){
  const ui=ManagerUiState.snapshot(),type=ui.fixedType,group=ui.fixedGroup,search=ui.fixedSearch.trim().toLowerCase();
  const all=CategoryStore.fixedPositions();
  const categories=all.filter(c=>(type==='all'||c.t===type)&&(group==='all'||c.g===group)&&(!search||c.p.toLowerCase().includes(search)||c.g.toLowerCase().includes(search)));
  const year=AppUiState.year(),month=AppUiState.month(),savings=recurringSavingsFixedGroup(year,month,ui),credits=recurringCreditFixedGroup(year,month,ui);
  return `<div class="desktop-page-title">Fixkosten</div>
    <div class="layout-grid fixed-costs-grid">
    <div class="grid-primary"><div class="card form-card"><div class="card-title">Zeitraum und Filter</div><div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===month?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${AppUiState.years().map(y=>`<option value="${y}"${y===year?' selected':''}>${y}</option>`).join('')}</select></div></div></div>
      <div class="compact-toolbar"><input class="inp wide" id="fixed-search" placeholder="Position suchen" value="${esc(ui.fixedSearch)}"/><button class="btn btn-ghost" onclick="applyManagerFixedSearch()">Suchen</button><div class="sw"><select class="sel" onchange="ManagerUiState.setFixedType(this.value);render()">${fixedCostTypeOptions(type)}</select></div><div class="sw"><select class="sel" onchange="ManagerUiState.setFixedGroup(this.value);render()">${fixedCostGroups(group)}</select></div></div>
      <button class="btn btn-primary btn-full" onclick="openPositionDialog('')">Position hinzufügen</button><div class="category-tools"><button class="btn btn-ghost" type="button" onclick="openFixedCategoryManager()">Kategorien verwalten</button></div>
    </div></div>
    <div class="grid-secondary"><div class="card"><div class="list-head"><div class="card-title">Gespeicherte Positionen</div><span class="muted">${categories.length+savings.count+credits.count} Einträge</span></div><div class="manager-groups">${fixedManagerGroups(categories)+savings.html+credits.html||'<div class="manager-empty">Keine passenden Positionen.</div>'}</div></div>
    <div class="card"><div class="card-title">Verwaltung</div><div class="form-actions"><button class="btn btn-ghost" onclick="openAddYear()">Jahr hinzufügen</button><button class="btn btn-ghost" onclick="openFixedDataActions()">Daten verwalten</button></div></div></div>
    </div>`;
}

AppExtensionRegistry.registerView('ausgaben',compactExpensesView,100);
AppExtensionRegistry.registerView('uebersicht',compactFixedCostsView,100);
AppExtensionRegistry.registerView('einstellungen',compactFixedCostsView,100);
