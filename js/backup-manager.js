'use strict';

(() => {
  const META_KEY='hp5_backup_meta';
  const SESSION_PROMPT_KEY='hp5_backup_prompted';
  let dirty=false,pendingBackup=null;
  const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}');}catch(_){return {};}};
  const writeMeta=patch=>{const next={...readMeta(),...patch};localStorage.setItem(META_KEY,JSON.stringify(next));return next;};

  globalThis.onStatePersistRequested=function backupPersistRequested(){
    dirty=true;const meta=readMeta();writeMeta({changesSinceBackup:Number(meta.changesSinceBackup||0)+1});
  };

  function normalizeBackupData(value){
    if(typeof StateSchema!=='undefined')return StateSchema.normalize(value,{defaultYears});
    const d=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    return {
      data:d.data||{},cats:Array.isArray(d.cats)?d.cats:[],kredite:Array.isArray(d.kredite)?d.kredite:[],
      years:Array.isArray(d.years)&&d.years.length?d.years:defaultYears(),buchungen:Array.isArray(d.buchungen)?d.buchungen:[],budgets:d.budgets||{},
      recurringRules:Array.isArray(d.recurringRules)?d.recurringRules:[],annualAdjustments:Array.isArray(d.annualAdjustments)?d.annualAdjustments:[],
      percentageAdjustments:Array.isArray(d.percentageAdjustments)?d.percentageAdjustments:[],amountAdjustments:Array.isArray(d.amountAdjustments)?d.amountAdjustments:[],
      oneTimeEntries:Array.isArray(d.oneTimeEntries)?d.oneTimeEntries:[],forecastAssets:d.forecastAssets||{},
    };
  }

  const snapshot=()=>({
    format:'haushaltsbuch-backup',version:3,schemaVersion:typeof StateSchema!=='undefined'?StateSchema.CURRENT_VERSION:2,createdAt:new Date().toISOString(),appData:{
      data:S.data,cats:S.cats,kredite:S.kredite,years:S.years,buchungen:S.buchungen,budgets:S.budgets,
      recurringRules:S.recurringRules||[],annualAdjustments:S.annualAdjustments||[],percentageAdjustments:S.percentageAdjustments||[],
      amountAdjustments:S.amountAdjustments||[],oneTimeEntries:S.oneTimeEntries||[],forecastAssets:S.forecastAssets||{},
    },
  });
  const dateText=value=>value?new Date(value).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'Noch kein Backup erstellt';
  const assetTotal=d=>Object.values(d?.forecastAssets||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const downloadJson=payload=>{
    const stamp=new Date().toISOString().slice(0,10),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`Haushaltsbuch_Backup_${stamp}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  window.createHouseholdBackup=function(){const payload=snapshot();downloadJson(payload);dirty=false;writeMeta({lastBackupAt:payload.createdAt,changesSinceBackup:0});toast('Backup wurde erstellt');render();};
  function validBackup(payload){const d=payload?.appData||payload;return d&&typeof d==='object'&&Array.isArray(d.cats)&&Array.isArray(d.kredite);}
  function previewMarkup(payload){
    const d=payload.appData||payload,created=payload.createdAt||payload.exportedAt;
    const rules=(d.recurringRules?.length||0)+(d.annualAdjustments?.length||0)+(d.percentageAdjustments?.length||0)+(d.amountAdjustments?.length||0)+(d.oneTimeEntries?.length||0);
    return `<div class="sheet-title">Backup prüfen</div><div class="backup-preview"><div><span>Erstellt</span><strong>${esc(dateText(created))}</strong></div><div><span>Kategorien</span><strong>${d.cats?.length||0}</strong></div><div><span>Kredite</span><strong>${d.kredite?.length||0}</strong></div><div><span>Buchungen</span><strong>${d.buchungen?.length||0}</strong></div><div><span>Haushaltsjahre</span><strong>${d.years?.length||0}</strong></div><div><span>Planungsregeln</span><strong>${rules}</strong></div><div><span>Prognose-Startvermögen</span><strong>${fmt(assetTotal(d))}</strong></div></div><p class="backup-note">„Ersetzen“ überschreibt die lokalen Daten. „Zusammenführen“ ergänzt Datensätze anhand ihrer ID.</p><div class="backup-actions"><button class="btn btn-primary" onclick="applyHouseholdBackup('replace')">Alle Daten ersetzen</button><button class="btn" onclick="applyHouseholdBackup('merge')">Zusammenführen</button><button class="btn" onclick="closeGenSheet()">Abbrechen</button></div>`;
  }
  window.chooseHouseholdBackup=function(){
    let input=document.getElementById('householdBackupInput');
    if(!input){input=document.createElement('input');input.id='householdBackupInput';input.type='file';input.accept='application/json,.json';input.hidden=true;input.addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const payload=JSON.parse(await file.text());if(!validBackup(payload))throw new Error('invalid');pendingBackup=payload;openGenSheet(previewMarkup(payload));}catch(_){toast('Die Datei ist kein gültiges Haushaltsbuch-Backup','err');}});document.body.appendChild(input);}input.click();
  };
  const mergeById=(local,incoming)=>{const map=new Map((local||[]).map(item=>[item.id,item]));(incoming||[]).forEach(item=>map.set(item.id,{...(map.get(item.id)||{}),...item}));return [...map.values()];};
  window.applyHouseholdBackup=function(mode){
    if(!pendingBackup)return;
    const d=normalizeBackupData(pendingBackup.appData||pendingBackup);
    if(mode==='replace'){
      S.data=d.data;S.cats=d.cats;S.kredite=d.kredite;S.years=d.years;S.buchungen=d.buchungen;S.budgets=d.budgets;
      S.recurringRules=d.recurringRules;S.annualAdjustments=d.annualAdjustments;S.percentageAdjustments=d.percentageAdjustments;
      S.amountAdjustments=d.amountAdjustments;S.oneTimeEntries=d.oneTimeEntries;S.forecastAssets=d.forecastAssets;
    }else{
      S.data={...(S.data||{}),...(d.data||{})};S.cats=mergeById(S.cats,d.cats);S.kredite=mergeById(S.kredite,d.kredite);S.years=[...new Set([...(S.years||[]),...(d.years||[])])].sort((a,b)=>a-b);
      S.buchungen=mergeById(S.buchungen,d.buchungen);S.budgets={...(S.budgets||{}),...(d.budgets||{})};S.recurringRules=mergeById(S.recurringRules,d.recurringRules);S.annualAdjustments=mergeById(S.annualAdjustments,d.annualAdjustments);S.percentageAdjustments=mergeById(S.percentageAdjustments,d.percentageAdjustments);S.amountAdjustments=mergeById(S.amountAdjustments,d.amountAdjustments);S.oneTimeEntries=mergeById(S.oneTimeEntries,d.oneTimeEntries);S.forecastAssets={...(S.forecastAssets||{}),...(d.forecastAssets||{})};
      if(typeof StateSchema!=='undefined')S.forecastAssets=StateSchema.normalize({forecastAssets:S.forecastAssets,years:S.years},{defaultYears}).forecastAssets;
    }
    if(typeof syncAllLoans==='function')syncAllLoans();if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();persist();dirty=false;writeMeta({lastImportAt:new Date().toISOString(),changesSinceBackup:0});pendingBackup=null;closeGenSheet();render();toast(mode==='replace'?'Backup wurde geladen':'Backup wurde zusammengeführt');
  };
  function backupPanel(){const meta=readMeta(),count=Number(meta.changesSinceBackup||0);return `<section class="backup-card"><div class="backup-title">Datensicherung</div><div class="backup-status"><span>Letztes Backup</span><strong>${esc(dateText(meta.lastBackupAt))}</strong></div><div class="backup-status"><span>Status</span><strong>${count?`${count} Änderungen nicht gesichert`:'Backup aktuell'}</strong></div><div class="backup-actions backup-actions-row"><button class="btn btn-primary" onclick="createHouseholdBackup()">Backup erstellen</button><button class="btn" onclick="chooseHouseholdBackup()">Backup laden</button></div></section>`;}
  if(typeof vImport==='function'){const baseImportView=vImport;vImport=function backupImportView(){return backupPanel()+baseImportView();};}
  function showStartupPrompt(){if(sessionStorage.getItem(SESSION_PROMPT_KEY))return;sessionStorage.setItem(SESSION_PROMPT_KEY,'1');setTimeout(()=>openGenSheet(`<div class="sheet-title">Vorhandenes Backup laden?</div><p class="backup-note">Falls du auf einem anderen Gerät gearbeitet hast, kannst du jetzt die aktuelle JSON-Datei laden.</p><div class="backup-actions"><button class="btn btn-primary" onclick="closeGenSheet();chooseHouseholdBackup()">Backup laden</button><button class="btn" onclick="closeGenSheet()">Lokale Daten verwenden</button></div>`),500);}
  window.addEventListener('beforeunload',event=>{if(!dirty)return;event.preventDefault();event.returnValue='';});
  window.addEventListener('load',showStartupPrompt,{once:true});
})();
