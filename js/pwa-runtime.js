/**
 * Registriert den Service Worker und koordiniert dessen Update-Lebenszyklus.
 * @module PwaRuntime
 */
'use strict';

(function(root){
  async function register(){
    if(!('serviceWorker' in navigator))return null;
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      registration.update().catch(()=>{});
      return registration;
    }catch(error){
      console.warn('Service Worker konnte nicht registriert werden',error);
      return null;
    }
  }

  function start(){
    if(!('serviceWorker' in navigator))return;
    window.addEventListener('load',()=>{register();},{once:true,passive:true});
  }

  root.PwaRuntime=Object.freeze({register,start});
  start();
})(typeof globalThis!=='undefined'?globalThis:window);
