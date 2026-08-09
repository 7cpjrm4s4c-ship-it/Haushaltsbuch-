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
})(typeof globalThis!=='undefined'?globalThis:window);
