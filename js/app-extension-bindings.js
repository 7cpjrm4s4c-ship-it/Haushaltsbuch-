/* Composition Root: verdrahtet registrierte Module mit den verbleibenden Einstiegspunkten. */
'use strict';

(function(root){
  const registry=root.AppExtensionRegistry;
  if(!registry)throw new TypeError('AppExtensionRegistry fehlt');

  const calculations={gv:'gv',calcMonth:'calcMonth'};
  const views={ausgaben:'vAusgaben',uebersicht:'vUebersicht',einstellungen:'vEinstellungen',import:'vImport'};

  function bindCalculation(key){
    const globalName=calculations[key];
    if(!globalName)return;
    const implementation=registry.resolveCalculation(key);
    if(typeof implementation==='function')root[globalName]=implementation;
  }
  function bindView(key){
    const globalName=views[key];
    if(!globalName)return;
    const implementation=registry.resolveView(key);
    if(typeof implementation==='function')root[globalName]=implementation;
  }

  Object.keys(calculations).forEach(bindCalculation);
  Object.keys(views).forEach(bindView);

  const originalRegisterCalculation=registry.registerCalculation;
  registry.registerCalculation=function(key,implementation,priority){
    const result=originalRegisterCalculation.call(registry,key,implementation,priority);
    bindCalculation(key);
    return result;
  };
  const originalRegisterView=registry.registerView;
  registry.registerView=function(key,implementation,priority){
    const result=originalRegisterView.call(registry,key,implementation,priority);
    bindView(key);
    return result;
  };

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

  const dialog=root.AppDialogRuntime;
  if(dialog){
    root.openGenSheet=dialog.open;
    root.closeGenSheet=dialog.close;
  }
})(typeof globalThis!=='undefined'?globalThis:window);
