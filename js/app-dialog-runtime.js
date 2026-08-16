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
  function clearDragGeometry(sheet){
    if(!sheet)return;
    sheet.style.transform='';
    sheet.style.transition='';
  }
  function settleSheet(active,close){
    const sheet=active?.sheet;
    if(!sheet)return;
    sheet.style.transition='transform .22s cubic-bezier(.32,.72,0,1)';
    sheet.style.transform=close?'translateY(100%)':'translateY(0)';
    root.setTimeout?.(()=>{
      if(close)closeOverlay(active.overlay);
      clearDragGeometry(sheet);
    },220);
  }
  function beginHandleDrag(event){
    const handle=event.target?.closest?.('.overlay.open .sheet-handle');
    const touch=event.touches?.[0],sheet=handle?.closest?.('.sheet');
    if(!handle||!sheet||!touch)return;
    sheet.style.transition='none';
    drag={overlay:handle.closest('.overlay'),sheet,startX:touch.clientX,startY:touch.clientY};
  }
  function moveHandleDrag(event){
    if(!drag)return;
    const touch=event.touches?.[0];
    if(!touch)return;
    const dx=touch.clientX-drag.startX,dy=Math.max(0,touch.clientY-drag.startY);
    if(dy>=Math.abs(dx)){
      event.preventDefault();
      drag.sheet.style.transform=`translateY(${dy}px)`;
    }
  }
  function endHandleDrag(event){
    if(!drag)return;
    const touch=event.changedTouches?.[0],active=drag;
    drag=null;
    if(!touch){settleSheet(active,false);return;}
    const dx=touch.clientX-active.startX,dy=touch.clientY-active.startY;
    settleSheet(active,dy>=CLOSE_DISTANCE&&dy>=Math.abs(dx));
  }
  function cancelHandleDrag(){
    const active=drag;
    drag=null;
    settleSheet(active,false);
  }

  document?.addEventListener?.('touchstart',beginHandleDrag,{passive:true});
  document?.addEventListener?.('touchmove',moveHandleDrag,{passive:false});
  document?.addEventListener?.('touchend',endHandleDrag,{passive:true});
  document?.addEventListener?.('touchcancel',cancelHandleDrag,{passive:true});
  document?.addEventListener?.('touchmove',blockBackgroundScroll,{passive:false});
  document?.addEventListener?.('wheel',blockBackgroundScroll,{passive:false});

  root.AppDialogRuntime=Object.freeze({open,close,openOverlay,closeOverlay,syncScrollLock});
})(typeof globalThis!=='undefined'?globalThis:window);
