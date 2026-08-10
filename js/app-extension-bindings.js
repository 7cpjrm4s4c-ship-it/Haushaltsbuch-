/* Composition Root: verdrahtet registrierte Module einmalig mit den Legacy-Einstiegspunkten. */
'use strict';

(function(root){
  const registry=root.AppExtensionRegistry;
  if(!registry)throw new TypeError('AppExtensionRegistry fehlt');

  const calculations={gv:'gv',calcMonth:'calcMonth'};
  const views={ausgaben:'vAusgaben',uebersicht:'vUebersicht',einstellungen:'vEinstellungen'};

  for(const [key,globalName] of Object.entries(calculations)){
    const implementation=registry.resolveCalculation(key);
    if(typeof implementation==='function')root[globalName]=implementation;
  }
  for(const [key,globalName] of Object.entries(views)){
    const implementation=registry.resolveView(key);
    if(typeof implementation==='function')root[globalName]=implementation;
  }

  const storage=root.StateStorage;
  if(storage){
    if(typeof storage.save==='function')root.persist=storage.save;
    if(typeof storage.load==='function')root.load=storage.load;
  }

  const runtime=root.AppViewRuntime;
  if(runtime){
    root.render=runtime.render;
    root.nav=runtime.nav;
    root.selYear=runtime.selectYear;
    root.selMonth=runtime.selectMonth;
  }

  const loanActions=root.LoanActionsController;
  if(loanActions){
    root.saveNewKredit=loanActions.create;
    root.saveEditKredit=loanActions.update;
    root.delKredit=loanActions.remove;
  }
})(typeof globalThis!=='undefined'?globalThis:window);
