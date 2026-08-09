/* Reine Szenario-Logik für die Prognose. Keine DOM-, Persistenz- oder App-State-Abhängigkeiten. */
(function(root){
  'use strict';
  const SCENARIO_KEYS=new Set(['optimistic','realistic','cautious']);
  const LOOKBACKS=new Set([3,6,12]);
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.min(max,Math.max(min,Number.isFinite(n)?n:fallback));};
  const clone=value=>JSON.parse(JSON.stringify(value));

  function normalizeScenario(value,baseYear){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const currentYear=Number.isFinite(Number(baseYear))?Number(baseYear):new Date().getFullYear();
    const ui=source.ui&&typeof source.ui==='object'?source.ui:{};
    const assumptions=source.assumptions&&typeof source.assumptions==='object'?source.assumptions:{};
    const events=Array.isArray(source.financialEvents)?source.financialEvents:[];
    return {
      id:String(source.id||''),
      title:String(source.title||'Szenario'),
      ui:{
        scenarioKey:SCENARIO_KEYS.has(ui.scenarioKey)?ui.scenarioKey:'realistic',
        lookbackMonths:LOOKBACKS.has(Number(ui.lookbackMonths))?Number(ui.lookbackMonths):3,
        annualInflation:clamp(ui.annualInflation,-10,20,0),
        endYear:Math.max(currentYear+1,Math.min(currentYear+40,Number(ui.endYear)||currentYear+5)),
      },
      assumptions:clone(assumptions),
      financialEvents:clone(events),
      createdAt:String(source.createdAt||''),
      updatedAt:String(source.updatedAt||''),
    };
  }

  function snapshot({id,title,ui,assumptions,financialEvents,baseYear,nowIso}){
    const stamp=String(nowIso||new Date().toISOString());
    return normalizeScenario({id,title,ui,assumptions,financialEvents,createdAt:stamp,updatedAt:stamp},baseYear);
  }

  function update(existing,{title,ui,assumptions,financialEvents,baseYear,nowIso}){
    const normalized=normalizeScenario(existing,baseYear),stamp=String(nowIso||new Date().toISOString());
    return normalizeScenario({...normalized,title:title??normalized.title,ui:ui??normalized.ui,assumptions:assumptions??normalized.assumptions,financialEvents:financialEvents??normalized.financialEvents,createdAt:normalized.createdAt||stamp,updatedAt:stamp},baseYear);
  }

  root.ForecastScenarios=Object.freeze({normalizeScenario,snapshot,update});
})(typeof globalThis!=='undefined'?globalThis:window);
