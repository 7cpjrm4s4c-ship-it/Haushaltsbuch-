/* Neutrale Lifecycle-Schnittstelle für Kreditereignisse. Keine App-State- oder DOM-Abhängigkeiten. */
(function(root){
  'use strict';

  const deletedHandlers=new Set();

  function onDeleted(handler){
    if(typeof handler!=='function')throw new TypeError('Lifecycle-Handler muss eine Funktion sein');
    deletedHandlers.add(handler);
    return ()=>deletedHandlers.delete(handler);
  }

  function emitDeleted(payload){
    const event=Object.freeze({...payload,loanId:String(payload?.loanId||'')});
    for(const handler of [...deletedHandlers])handler(event);
  }

  function listenerCount(){return deletedHandlers.size;}

  root.LoanLifecycle=Object.freeze({onDeleted,emitDeleted,listenerCount});
})(typeof globalThis!=='undefined'?globalThis:window);
