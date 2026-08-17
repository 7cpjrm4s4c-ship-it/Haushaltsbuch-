'use strict';
(() => {
  const SESSION_PROMPT_KEY='hp5_backup_prompted';
  let pendingBackup=null;
  const store=globalThis.BackupStore;
  if(!store)throw new TypeError('BackupStore fehlt');

  globalThis.onStatePersistRequested=()=>store.markDirty();

  const dateText=value=>value?new Date(value).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'Noch kein Backup erstellt';
  const assetTotal=d=>Object.values(d?.forecastAssets||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const downloadJson=payload=>{
    const stamp=new Date().toISOString().slice(0,10),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`Haushaltsbuch_Backup_${stamp}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  window.createHouseholdBackup=function(){
    const payload=store.snapshot();downloadJson(payload);store.markBackedUp(payload.createdAt);toast('Backup wurde erstellt');render();
  };

  function previewMarkup(payload){
    const d=payload.appData||payload,created=payload.createdAt||payload.exportedAt,rules=(d.recurringRules?.length||0)+(d.annualAdjustments?.length||0)+(d.percentageAdjustments?.length||0)+(d.amountAdjustments?.length||0)+(d.oneTimeEntries?.length||0);
    return `<div class="sheet-title">Backup prüfen</div><div class="backup-preview"><div><span>Erstellt</span><strong>${esc(dateText(created))}</strong></div><div><span>Kategorien</span><strong>${d.cats?.length||0}</strong></div><div><span>Kredite</span><strong>${d.kredite?.length||0}</strong></div><div><span>Buchungen</span><strong>${d.buchungen?.length||0}</strong></div><div><span>Planungsregeln</span><strong>${rules}</strong></div><div><span>Finanzereignisse</span><strong>${d.financialEvents?.length||0}</strong></div><div><span>Prognoseszenarien</span><strong>${d.forecastScenarios?.length||0}</strong></div><div><span>Finanzziele</span><strong>${d.forecastGoals?.length||0}</strong></div><div><span>Prognose-Startvermögen</span><strong>${fmt(assetTotal(d))}</strong></div></div><p class="backup-note">„Ersetzen“ überschreibt die lokalen Daten. „Zusammenführen“ ergänzt Datensätze anhand ihrer ID.</p><div class="backup-actions"><button class="btn btn-primary" onclick="applyHouseholdBackup('replace')">Alle Daten ersetzen</button><button class="btn" onclick="applyHouseholdBackup('merge')">Zusammenführen</button><button class="btn" onclick="closeGenSheet()">Abbrechen</button></div>`;
  }

  window.chooseHouseholdBackup=function(){
    let input=document.getElementById('householdBackupInput');
    if(!input){
      input=document.createElement('input');input.id='householdBackupInput';input.type='file';input.accept='application/json,.json';input.hidden=true;
      input.addEventListener('change',async event=>{
        const file=event.target.files?.[0];event.target.value='';if(!file)return;
        try{const payload=JSON.parse(await file.text());if(!store.valid(payload))throw new Error('invalid');pendingBackup=payload;openGenSheet(previewMarkup(payload));}
        catch(_){toast('Die Datei ist kein gültiges Haushaltsbuch-Backup','err');}
      });document.body.appendChild(input);
    }
    input.click();
  };

  window.applyHouseholdBackup=function(mode){
    if(!pendingBackup)return;
    const applied=store.apply(pendingBackup,mode);pendingBackup=null;closeGenSheet();render();toast(applied==='replace'?'Backup wurde geladen':'Backup wurde zusammengeführt');
  };

  window.setBackupReminderEnabled=function(enabled){
    const active=store.setReminderEnabled(enabled);closeGenSheet();render();toast(active?'Backup-Erinnerung aktiviert':'Backup-Erinnerung deaktiviert');
  };

  function backupPanel(){
    const meta=store.readMeta(),count=Number(meta.changesSinceBackup||0),reminderEnabled=store.isReminderEnabled();
    return `<section class="backup-card"><div class="backup-title">Datensicherung</div><div class="backup-status"><span>Letztes Backup</span><strong>${esc(dateText(meta.lastBackupAt))}</strong></div><div class="backup-status"><span>Status</span><strong>${count?`${count} Änderungen nicht gesichert`:'Backup aktuell'}</strong></div><div class="backup-status"><span>Automatische Erinnerung</span><strong>${reminderEnabled?'Aktiv':'Deaktiviert'}</strong></div><div class="backup-actions backup-actions-row"><button class="btn btn-primary" onclick="createHouseholdBackup()">Backup erstellen</button><button class="btn" onclick="chooseHouseholdBackup()">Backup laden</button></div><button class="btn btn-ghost backup-reminder-toggle" onclick="setBackupReminderEnabled(${reminderEnabled?'false':'true'})">${reminderEnabled?'Nicht mehr automatisch erinnern':'Backup-Erinnerung aktivieren'}</button></section>`;
  }

  globalThis.BackupManager=Object.freeze({panel:backupPanel});

  function showStartupPrompt(){
    if(!store.isReminderEnabled()||sessionStorage.getItem(SESSION_PROMPT_KEY))return;sessionStorage.setItem(SESSION_PROMPT_KEY,'1');
    setTimeout(()=>openGenSheet(`<div class="sheet-title">Vorhandenes Backup laden?</div><p class="backup-note">Falls du auf einem anderen Gerät gearbeitet hast, kannst du jetzt die aktuelle JSON-Datei laden.</p><div class="backup-actions"><button class="btn btn-primary" onclick="closeGenSheet();chooseHouseholdBackup()">Backup laden</button><button class="btn" onclick="closeGenSheet()">Lokale Daten verwenden</button><button class="btn btn-ghost" onclick="setBackupReminderEnabled(false)">Nicht mehr erinnern</button></div>`),500);
  }

  window.addEventListener('beforeunload',event=>{if(!store.isReminderEnabled()||!store.isDirty())return;event.preventDefault();event.returnValue='';});
  window.addEventListener('load',showStartupPrompt,{once:true});
})();
