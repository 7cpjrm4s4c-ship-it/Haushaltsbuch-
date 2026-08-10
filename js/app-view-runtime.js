/* Zentrale UI-Runtime für Rendering und Navigation. Datenzugriffe erfolgen nur über AppUiState. */
'use strict';

(function(root){
  const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const VIEW_TITLES={dashboard:'Haushaltsplan',ausgaben:'Ausgaben',uebersicht:'Übersicht',kredite:'Kredite',einstellungen:'Einstellungen',import:'Import'};
  const VIEW_FUNCTIONS={dashboard:'vDashboard',ausgaben:'vAusgaben',uebersicht:'vUebersicht',kredite:'vKredite',einstellungen:'vEinstellungen',import:'vImport'};

  function uiState(){
    if(!root.AppUiState)throw new Error('AppUiState fehlt');
    return root.AppUiState;
  }
  function resolveView(name){
    const fn=root[VIEW_FUNCTIONS[name]];
    if(typeof fn!=='function')throw new Error(`View ${name} ist nicht registriert`);
    return fn;
  }
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  function render(){
    const state=uiState();
    const view=state.view();
    const year=state.year();
    const month=state.month();
    let html='';
    try{html=resolveView(view)();}
    catch(err){html='<div style="padding:20px;color:#f87171;font-family:Arial">Fehler: '+String(err&&err.message||err)+'</div>';console.error('render error:',err);}
    const main=document.getElementById('main');if(main)main.innerHTML=html;
    document.querySelectorAll('.bnav-btn').forEach(button=>button.classList.toggle('active',button.dataset.v===view));
    setText('yearPill',year);
    setText('headerTitle',VIEW_TITLES[view]||'Haushaltsplan');
    setText('headerSub',`${MONTHS[month]||''} ${year}`.trim());
    setText('sidebarYear',`${year} ▾`);
    setText('sidebarSub',`${MONTHS[month]||''} ${year}`.trim());
    const grid=document.getElementById('monthGrid');
    if(grid&&!grid.dataset.runtimeBound){
      grid.dataset.runtimeBound='1';
      grid.addEventListener('click',event=>{const chip=event.target.closest('[data-mi]');if(chip)selectMonth(chip.dataset.mi);},{passive:true});
    }
  }
  function nav(view){
    uiState().setView(view);
    render();
    window.scrollTo({top:0,behavior:'instant'});
    document.getElementById('appHeader')?.classList.remove('hidden');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const bnav=document.getElementById('bnav');
      const slider=document.getElementById('bnavSlider');
      const active=bnav?.querySelector('.bnav-btn.active');
      if(!bnav||!slider||!active)return;
      const navRect=bnav.getBoundingClientRect(),btnRect=active.getBoundingClientRect();
      slider.style.transition='';slider.style.left=(btnRect.left-navRect.left)+'px';slider.style.width=btnRect.width+'px';
    }));
  }
  function selectYear(value){uiState().setYear(value);render();}
  function selectMonth(value){uiState().setMonth(value);render();}

  root.AppViewRuntime=Object.freeze({render,nav,selectYear,selectMonth});
})(typeof globalThis!=='undefined'?globalThis:window);
