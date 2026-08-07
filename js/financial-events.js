/* Neutrale Finanzereignisse für die Prognose. Keine DOM- oder Persistenzabhängigkeiten. */
(function(root){
  'use strict';
  const TYPES=Object.freeze({
    oneTimeIncome:'Einmalige Einnahme',
    oneTimeExpense:'Einmalige Ausgabe',
    incomeDelta:'Dauerhafte Einnahmeänderung',
    expenseDelta:'Dauerhafte Ausgabeänderung',
    assetInflow:'Vermögenszugang',
    assetOutflow:'Vermögensabgang',
  });
  const TYPE_KEYS=Object.freeze(Object.keys(TYPES));
  const absMonth=(year,month)=>Number(year)*12+Number(month);
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  function normalizeEvent(value){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const type=TYPE_KEYS.includes(source.type)?source.type:'oneTimeExpense';
    const startYear=Number(source.startYear),startMonth=Math.min(11,Math.max(0,Number(source.startMonth)||0));
    const endYear=source.endYear===null||source.endYear===undefined||source.endYear===''?null:Number(source.endYear);
    const endMonth=endYear===null?null:Math.min(11,Math.max(0,Number(source.endMonth)||0));
    return {id:String(source.id||''),type,title:String(source.title||TYPES[type]),startYear:Number.isFinite(startYear)?startYear:new Date().getFullYear(),startMonth,endYear:Number.isFinite(endYear)?endYear:null,endMonth,amount:round2(Math.max(0,Number(source.amount)||0)),enabled:source.enabled!==false,metadata:source.metadata&&typeof source.metadata==='object'&&!Array.isArray(source.metadata)?source.metadata:{}};
  }
  function isActive(event,year,month){
    if(!event.enabled)return false;
    const current=absMonth(year,month),start=absMonth(event.startYear,event.startMonth);
    if(current<start)return false;
    if(event.type==='oneTimeIncome'||event.type==='oneTimeExpense'||event.type==='assetInflow'||event.type==='assetOutflow')return current===start;
    if(event.endYear!==null&&current>absMonth(event.endYear,event.endMonth??11))return false;
    return true;
  }
  function monthImpact(events,year,month){
    const impact={income:0,expense:0,items:[]};
    for(const raw of events||[]){
      const event=normalizeEvent(raw);if(!isActive(event,year,month))continue;
      const income=['oneTimeIncome','incomeDelta','assetInflow'].includes(event.type);
      if(income)impact.income+=event.amount;else impact.expense+=event.amount;
      impact.items.push(event);
    }
    impact.income=round2(impact.income);impact.expense=round2(impact.expense);return impact;
  }
  function applyToBaseMonths(baseMonths,events){
    return (baseMonths||[]).map(row=>{const impact=monthImpact(events,row.year,row.month);return {...row,income:round2(Number(row.income||0)+impact.income),fixed:round2(Number(row.fixed||0)+impact.expense),financialEvents:impact.items.map(item=>({id:item.id,type:item.type,title:item.title,amount:item.amount}))};});
  }
  root.FinancialEvents=Object.freeze({TYPES,TYPE_KEYS,normalizeEvent,isActive,monthImpact,applyToBaseMonths});
})(typeof globalThis!=='undefined'?globalThis:window);
