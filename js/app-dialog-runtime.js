/* Generische Overlay-/Dialogsteuerung. Keine App-State- oder Persistenzabhaengigkeiten. */
'use strict';

(function(root){
  function open(html){
    const body=document.getElementById('genBody');
    const overlay=document.getElementById('genOverlay');
    if(!body||!overlay)return;
    body.innerHTML=String(html??'');
    overlay.classList.add('open');
    setTimeout(()=>{const field=document.querySelector('#genBody input, #genBody select');if(field)field.focus();},350);
  }
  function close(){document.getElementById('genOverlay')?.classList.remove('open');}
  root.AppDialogRuntime=Object.freeze({open,close});
})(typeof globalThis!=='undefined'?globalThis:window);
