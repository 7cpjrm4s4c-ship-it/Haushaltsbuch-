/* Generische Overlay-/Dialogsteuerung. Keine App-State- oder Persistenzabhaengigkeiten. */
'use strict';

(function(root){
  const LOCK_CLASS='dialog-open';

  function hasOpenDialog(){return Boolean(document.querySelector('.overlay.open'));}

  function syncScrollLock(){
    const locked=hasOpenDialog();
    document.documentElement.classList.toggle(LOCK_CLASS,locked);
    document.body?.classList.toggle(LOCK_CLASS,locked);
  }

  function isDialogScroller(target){
    return target instanceof Element&&Boolean(target.closest('.overlay.open .sheet'));
  }

  function blockBackgroundScroll(event){
    if(!hasOpenDialog()||isDialogScroller(event.target))return;
    event.preventDefault();
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

  document.addEventListener('touchmove',blockBackgroundScroll,{passive:false});
  document.addEventListener('wheel',blockBackgroundScroll,{passive:false});

  root.AppDialogRuntime=Object.freeze({open,close,openOverlay,closeOverlay,syncScrollLock});
})(typeof globalThis!=='undefined'?globalThis:window);
