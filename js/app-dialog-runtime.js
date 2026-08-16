/* Generische Overlay-/Dialogsteuerung. Keine App-State- oder Persistenzabhaengigkeiten. */
'use strict';

(function(root){
  const LOCK_CLASS='dialog-open';

  function syncScrollLock(){
    const hasOpenDialog=Boolean(document.querySelector('.overlay.open'));
    document.documentElement.classList.toggle(LOCK_CLASS,hasOpenDialog);
    document.body?.classList.toggle(LOCK_CLASS,hasOpenDialog);
  }

  function openOverlay(overlay){
    if(!overlay)return;
    overlay.classList.add('open');
    syncScrollLock();
  }

  function closeOverlay(overlay){
    if(!overlay)return;
    overlay.classList.remove('open');
    syncScrollLock();
  }

  function open(html){
    const body=document.getElementById('genBody');
    const overlay=document.getElementById('genOverlay');
    if(!body||!overlay)return;
    body.innerHTML=String(html??'');
    openOverlay(overlay);
    setTimeout(()=>{const field=document.querySelector('#genBody input, #genBody select');if(field)field.focus();},350);
  }

  function close(){closeOverlay(document.getElementById('genOverlay'));}

  root.AppDialogRuntime=Object.freeze({open,close,openOverlay,closeOverlay,syncScrollLock});
})(typeof globalThis!=='undefined'?globalThis:window);
