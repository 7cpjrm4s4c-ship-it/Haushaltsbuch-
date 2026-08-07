/* Zentrale Lade- und Speicherlogik. Ersetzt die historisch gewachsene load()/persist()-Wrapperkette. */
'use strict';

(function(){
  function statePayload(){
    return {
      data:S.data||{},
      cats:Array.isArray(S.cats)?S.cats:[],
      kredite:Array.isArray(S.kredite)?S.kredite:[],
      years:Array.isArray(S.years)?S.years:[],
      buchungen:Array.isArray(S.buchungen)?S.buchungen:[],
      budgets:S.budgets||{},
      recurringRules:Array.isArray(S.recurringRules)?S.recurringRules:[],
      annualAdjustments:Array.isArray(S.annualAdjustments)?S.annualAdjustments:[],
      percentageAdjustments:Array.isArray(S.percentageAdjustments)?S.percentageAdjustments:[],
    };
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
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(raw)saved=JSON.parse(raw);
    }catch(e){
      console.warn('load failed',e);
    }

    if(!saved){
      applyFactoryState();
    }else{
      S.data=saved.data&&typeof saved.data==='object'?saved.data:{};
      S.cats=Array.isArray(saved.cats)?saved.cats:[];
      S.kredite=Array.isArray(saved.kredite)?saved.kredite:[];
      S.years=Array.isArray(saved.years)&&saved.years.length?saved.years:defaultYears();
      S.buchungen=Array.isArray(saved.buchungen)?saved.buchungen:[];
      S.budgets=saved.budgets&&typeof saved.budgets==='object'?saved.budgets:{};
      S.recurringRules=Array.isArray(saved.recurringRules)?saved.recurringRules:[];
      S.annualAdjustments=Array.isArray(saved.annualAdjustments)?saved.annualAdjustments:[];
      S.percentageAdjustments=Array.isArray(saved.percentageAdjustments)?saved.percentageAdjustments:[];
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

    // Migrationen und Werkseinstellungen ohne künstlichen Backup-Änderungszähler sichern.
    saveStateNow();
  };
})();
