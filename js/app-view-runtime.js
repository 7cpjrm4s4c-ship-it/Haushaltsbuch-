/**
 * Zentrale UI-Runtime für Rendering und Navigation; Datenzugriffe erfolgen ausschließlich über AppUiState.
 * @module AppViewRuntime
 */
'use strict';

(function(root){
  const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const VIEW_TITLES={dashboard:'Haushaltsplan',ausgaben:'Ausgaben',uebersicht:'Fixkosten',kredite:'Kredite',savings:'Sparanlagen',einstellungen:'Prognose',import:'Import'};
  const VIEW_FUNCTIONS={dashboard:'vDashboard',ausgaben:'vAusgaben',uebersicht:'vUebersicht',kredite:'vKredite',savings:'vSavings',einstellungen:'vEinstellungen',import:'vImport'};

  function uiState(){if(!root.AppUiState)throw new Error('AppUiState fehlt');return root.AppUiState;}
  /** @param {string} name View-Schlüssel. @returns {Function} Registrierte oder kompatible Legacy-View. */
  function resolveView(name){const registered=root.AppExtensionRegistry?.resolveView?.(name);if(typeof registered==='function')return registered;const fn=root[VIEW_FUNCTIONS[name]];if(typeof fn!=='function')throw new Error(`View ${name} ist nicht registriert`);return fn;}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  /** Rendert die aktive View und synchronisiert Navigation sowie Header. @returns {void} */
  function render(){const state=uiState(),view=state.view(),year=state.year(),month=state.month();let html='';try{html=resolveView(view)();}catch(err){html='<div class="boot-error">Fehler: '+String(err&&err.message||err)+'</div>';console.error('render error:',err);}const main=document.getElementById('main');if(main)main.innerHTML=html;document.querySelectorAll('.bnav-btn').forEach(button=>button.classList.toggle('active',button.dataset.v===view));setText('yearPill',year);setText('headerTitle',VIEW_TITLES[view]||'Haushaltsplan');setText('headerSub',`${MONTHS[month]||''} ${year}`.trim());setText('sidebarYear',`${year} ▾`);setText('sidebarSub',`${MONTHS[month]||''} ${year}`.trim());const grid=document.getElementById('monthGrid');if(grid&&!grid.dataset.runtimeBound){grid.dataset.runtimeBound='1';root.AccountBalanceUi?.bindMonthGrid?.(grid);grid.addEventListener('click',event=>{const chip=event.target.closest('[data-mi]');if(chip)selectMonth(chip.dataset.mi);},{passive:true});}}
  /** @param {string} view Ziel-View. @returns {void} */
  function nav(view){uiState().setView(view);render();window.scrollTo({top:0,behavior:'instant'});document.getElementById('appHeader')?.classList.remove('hidden');requestAnimationFrame(()=>requestAnimationFrame(()=>{const bnav=document.getElementById('bnav'),slider=document.getElementById('bnavSlider'),active=bnav?.querySelector('.bnav-btn.active');if(!bnav||!slider||!active)return;const navRect=bnav.getBoundingClientRect(),btnRect=active.getBoundingClientRect();slider.style.transition='';slider.style.left=(btnRect.left-navRect.left)+'px';slider.style.width=btnRect.width+'px';}));}
  /** @param {number|string} value Jahr. @returns {void} */
  function selectYear(value){uiState().setYear(value);render();}
  /** @param {number|string} value Monat (0–11). @returns {void} */
  function selectMonth(value){uiState().setMonth(value);render();}
  root.AppViewRuntime=Object.freeze({render,nav,selectYear,selectMonth});
})(typeof globalThis!=='undefined'?globalThis:window);
