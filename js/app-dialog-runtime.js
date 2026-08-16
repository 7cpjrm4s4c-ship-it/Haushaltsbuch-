/* Generische Overlay-/Dialogsteuerung. Keine App-State- oder Persistenzabhaengigkeiten. */
'use strict';

(function(root){
  const LOCK_CLASS='dialog-open';
  const CLOSE_DISTANCE=140;
  const document=root.document;

  function hasOpenDialog(){return Boolean(document?.querySelector?.('.overlay.open'));}

  function syncScrollLock(){
    const locked=hasOpenDialog();
    document?.documentElement?.classList?.toggle(LOCK_CLASS,locked);
    document?.body?.classList?.toggle(LOCK_CLASS,locked);
  }

  function isDialogScroller(target){
    const ElementType=root.Element;
    return typeof ElementType==='function'&&target instanceof ElementType&&Boolean(target.closest('.overlay.open .sheet'));
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
    const body=document?.getElementById?.('genBody');
    const overlay=document?.getElementById?.('genOverlay');
    if(!body||!overlay)return;
    body.innerHTML=String(html??'');
    openOverlay(overlay);
    setTimeout(()=>{const field=document?.querySelector?.('#genBody input, #genBody select');if(field)field.focus();},350);
  }

  function close(){closeOverlay(document?.getElementById?.('genOverlay'));}

  let drag=null;
  function beginHandleDrag(event){
    const handle=event.target?.closest?.('.overlay.open .sheet-handle');
    const touch=event.touches?.[0];
    if(!handle||!touch)return;
    drag={overlay:handle.closest('.overlay'),startX:touch.clientX,startY:touch.clientY};
  }
  function moveHandleDrag(event){
    if(!drag)return;
    const touch=event.touches?.[0];
    if(!touch)return;
    const dx=touch.clientX-drag.startX,dy=touch.clientY-drag.startY;
    if(dy>0&&dy>=Math.abs(dx))event.preventDefault();
  }
  function endHandleDrag(event){
    if(!drag)return;
    const touch=event.changedTouches?.[0],active=drag;
    drag=null;
    if(!touch)return;
    const dx=touch.clientX-active.startX,dy=touch.clientY-active.startY;
    if(dy>=CLOSE_DISTANCE&&dy>=Math.abs(dx))closeOverlay(active.overlay);
  }
  function cancelHandleDrag(){drag=null;}

  document?.addEventListener?.('touchstart',beginHandleDrag,{passive:true});
  document?.addEventListener?.('touchmove',moveHandleDrag,{passive:false});
  document?.addEventListener?.('touchend',endHandleDrag,{passive:true});
  document?.addEventListener?.('touchcancel',cancelHandleDrag,{passive:true});
  document?.addEventListener?.('touchmove',blockBackgroundScroll,{passive:false});
  document?.addEventListener?.('wheel',blockBackgroundScroll,{passive:false});

  root.AppDialogRuntime=Object.freeze({open,close,openOverlay,closeOverlay,syncScrollLock});
})(typeof globalThis!=='undefined'?globalThis:window);
