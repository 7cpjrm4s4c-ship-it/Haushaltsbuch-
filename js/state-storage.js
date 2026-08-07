/* Zentrale Lade- und Speicherlogik. */
'use strict';

(function(){
  const CORRUPT_BACKUP_KEY = `${LS_KEY}_corrupt_backup`;

  function normalizeState(raw){
    if(typeof StateSchema !== 'undefined'){
      return StateSchema.normalize(raw,{defaultYears});
    }
    const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {
      schemaVersion:1,
      data:source.data&&typeof source.data==='object'&&!Array.isArray(source.data)?source.data:{},
      cats:Array.isArray(source.cats)?source.cats:[],
      kredite:Array.isArray(source.kredite)?source.kredite:[],
      years:Array.isArray(source.years)&&source.years.length?source.years:defaultYears(),
      buchungen:Array.isArray(source.buchungen)?source.buchungen:[],
      budgets:source.budgets&&typeof source.budgets==='object'&&!Array.isArray(source.budgets)?source.budgets:{},
      recurringRules:Array.isArray(source.recurringRules)?source.recurringRules:[],
      annualAdjustments:Array.isArray(source.annualAdjustments)?source.annualAdjustments:[],
      percentageAdjustments:Array.isArray(source.percentageAdjustments)?source.percentageAdjustments:[],
    };
  }

  function statePayload(){
    return normalizeState({
      data:S.data,
      cats:S.cats,
      kredite:S.kredite,
      years:S.years,
      buchungen:S.buchungen,
      budgets:S.budgets,
      recurringRules:S.recurringRules,
      annualAdjustments:S.annualAdjustments,
      percentageAdjustments:S.percentageAdjustments,
    });
  }

  function saveStateNow(){
    try{
      localStorage.setItem(LS_KEY,JSON.stringify(statePayload()));
    }catch(e){
      console.warn('persist failed',e);
    }
  }

  persist=function persistState(){
    clearTimeout(_pTimer);
    _pTimer=setTimeout(saveStateNow,300);
  };

  load=function loadState(){
    let saved=null;
    const raw=localStorage.getItem(LS_KEY);

    if(raw){
      try{
        saved=normalizeState(JSON.parse(raw));
      }catch(e){
        console.warn('load failed',e);
        try{ localStorage.setItem(CORRUPT_BACKUP_KEY,raw); }catch(_){}
      }
    }

    if(!saved){
      applyFactoryState();
    }else{
      S.data=saved.data;
      S.cats=saved.cats;
      S.kredite=saved.kredite;
      S.years=saved.years;
      S.buchungen=saved.buchungen;
      S.budgets=saved.budgets;
      S.recurringRules=saved.recurringRules;
      S.annualAdjustments=saved.annualAdjustments;
      S.percentageAdjustments=saved.percentageAdjustments;
      normalizeVariableCategories();
    }

    S.kredite=(S.kredite||[]).map(k=>({
      ...k,
      s:creditStartAmount(k),
      balanceYear:creditReferenceYear(k),
      balanceMonth:creditReferenceMonth(k),
    }));

    if(typeof syncAllLoans==='function')syncAllLoans();
    if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
    if(!Array.isArray(S.years)||!S.years.length)S.years=defaultYears();
    if(!S.years.includes(S.year))S.year=S.years[0]||now.getFullYear();

    // Migrationen und Werkseinstellungen direkt im aktuellen Schema sichern.
    saveStateNow();
  };
})();
