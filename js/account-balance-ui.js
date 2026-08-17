/* Bedienoberfläche für monatliche Kontostand-Stichtagswerte. */
'use strict';

(function(root){
  const HOLD_DURATION=600;
  const MOVE_TOLERANCE=12;
  let hold=null,suppressClick=false;

  function parseAmount(raw){
    let value=String(raw??'').trim().replace(/[\s€]/g,'');
    if(!value)return NaN;
    const comma=value.lastIndexOf(','),dot=value.lastIndexOf('.');
    if(comma>=0&&dot>=0)value=comma>dot?value.replace(/\./g,'').replace(',','.'):value.replace(/,/g,'');
    else if(comma>=0)value=value.replace(',','.');
    return Number(value);
  }
  function open(year,month){
    const value=root.AccountBalanceStore.get(year,month),hasValue=value!==null;
    root.openGenSheet(`<div class="sheet-title">Kontostand · ${MF[month]} ${year}</div><div class="field-hint">Der Wert gilt am Monatsanfang. Einnahmen und Ausgaben werden ab diesem Monat automatisch fortgeschrieben.</div><div class="field"><label class="lbl" for="account-balance-amount">Kontostand am Monatsanfang</label><div class="field-control-row"><input class="inp" id="account-balance-amount" type="text" inputmode="decimal" autocomplete="off" value="${hasValue?esc(String(value).replace('.',',')):''}" placeholder="0,00"/><button class="btn btn-ghost field-sign-toggle" type="button" aria-label="Vorzeichen wechseln" onclick="AccountBalanceUi.toggleSign()">+/−</button></div><div class="field-hint">Mit +/− kann auch ein negativer Anfangsbestand erfasst werden.</div></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button>${hasValue?`<button class="btn btn-danger-ghost" onclick="AccountBalanceUi.remove(${year},${month})">Löschen</button>`:''}<button class="btn btn-primary" onclick="AccountBalanceUi.save(${year},${month})">Speichern</button></div>`);
  }
  function toggleSign(){const input=document.getElementById('account-balance-amount');if(!input)return;const value=String(input.value||'').trim();input.value=value.startsWith('-')?value.slice(1):`-${value.replace(/^\+/,'')}`;input.focus({preventScroll:true});}
  function save(year,month){
    const amount=parseAmount(document.getElementById('account-balance-amount')?.value);
    if(!Number.isFinite(amount))return root.toast('Bitte einen gültigen Kontostand eingeben','err');
    root.AccountBalanceStore.set(year,month,amount);root.closeGenSheet();root.AppUiState.setMonth(month);root.render();root.toast('Kontostand gespeichert');
  }
  function remove(year,month){root.AccountBalanceStore.remove(year,month);root.closeGenSheet();root.AppUiState.setMonth(month);root.render();root.toast('Kontostand entfernt');}
  function cancelHold(){if(hold?.timer)root.clearTimeout(hold.timer);hold=null;}
  function begin(event){
    const chip=event.target.closest?.('[data-mi]');
    if(!chip||event.button>0)return;
    cancelHold();
    const year=root.AppUiState.year(),month=Number(chip.dataset.mi);
    hold={chip,year,month,x:event.clientX,y:event.clientY,timer:root.setTimeout(()=>{suppressClick=true;open(year,month);hold=null;},HOLD_DURATION)};
  }
  function move(event){if(!hold)return;if(Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>MOVE_TOLERANCE)cancelHold();}
  function finish(){cancelHold();}
  function blockTriggeredClick(event){if(!suppressClick||!event.target.closest?.('[data-mi]'))return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}
  function openFromKeyboard(event){const chip=event.target.closest?.('[data-mi]');if(!chip||!((event.shiftKey&&event.key==='Enter')||(event.shiftKey&&event.key==='F10')))return;event.preventDefault();cancelHold();open(root.AppUiState.year(),Number(chip.dataset.mi));}
  function bindMonthGrid(grid){
    if(!grid||grid.dataset.accountBalanceBound)return;
    grid.dataset.accountBalanceBound='1';
    grid.addEventListener('pointerdown',begin);
    grid.addEventListener('pointermove',move);
    grid.addEventListener('pointerup',finish);
    grid.addEventListener('pointercancel',finish);
    grid.addEventListener('contextmenu',event=>{const chip=event.target.closest?.('[data-mi]');if(!chip)return;event.preventDefault();cancelHold();if(suppressClick)return;open(root.AppUiState.year(),Number(chip.dataset.mi));});
    grid.addEventListener('keydown',openFromKeyboard);
    grid.addEventListener('click',blockTriggeredClick,true);
  }
  root.AccountBalanceUi=Object.freeze({bindMonthGrid,open,save,remove,parseAmount,toggleSign});
})(typeof globalThis!=='undefined'?globalThis:window);
