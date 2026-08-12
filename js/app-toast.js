/* Zentrale Toast-Runtime. */
'use strict';
let _toastTimer=null;
function toast(message,type='ok'){
  const target=document.getElementById('toast');if(!target)return;
  target.textContent=message;target.className=`toast ${type}`;void target.offsetWidth;target.classList.add('show');
  clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>target.classList.remove('show'),3000);
}
