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
    specialRepayment:'Kreditsondertilgung',
  });
  const TYPE_KEYS=Object.freeze(Object.keys(TYPES));
  const ONE_TIME_TYPES=new Set(['oneTimeIncome','oneTimeExpense','assetInflow','assetOutflow','specialRepayment']);
  const absMonth=(year,month)=>Number(year)*12+Number(month);
  const round2=value=>Math.round((Number(value)||0)*100)/100;

  function normalizeEvent(value){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const type=TYPE_KEYS.includes(source.type)?source.type:'oneTimeExpense';
    const startYear=Number(source.startYear),startMonth=Math.min(11,Math.max(0,Number(source.startMonth)||0));
    const rawEndYear=source.endYear===null||source.endYear===undefined||source.endYear===''?null:Number(source.endYear);
    const endYear=Number.isFinite(rawEndYear)?rawEndYear:null;
    const endMonth=endYear===null?null:Math.min(11,Math.max(0,Number(source.endMonth)||0));
    const metadata=source.metadata&&typeof source.metadata==='object'&&!Array.isArray(source.metadata)?{...source.metadata}:{};
    return {
      id:String(source.id||''),type,title:String(source.title||TYPES[type]),
      startYear:Number.isFinite(startYear)?startYear:new Date().getFullYear(),startMonth,
      endYear,endMonth,amount:round2(Math.max(0,Number(source.amount)||0)),
      enabled:source.enabled!==false,metadata,
    };
  }

  function isActive(event,year,month){
    if(!event.enabled)return false;
    const current=absMonth(year,month),start=absMonth(event.startYear,event.startMonth);
    if(current<start)return false;
    if(ONE_TIME_TYPES.has(event.type))return current===start;
    if(event.endYear!==null&&current>absMonth(event.endYear,event.endMonth??11))return false;
    return true;
  }

  function monthImpact(events,year,month){
    const impact={income:0,expense:0,specialRepayments:[],items:[]};
    for(const raw of events||[]){
      const event=normalizeEvent(raw);if(!isActive(event,year,month))continue;
      if(event.type==='specialRepayment')impact.specialRepayments.push({loanId:String(event.metadata?.loanId||''),amount:event.amount,event});
      else if(['oneTimeIncome','incomeDelta','assetInflow'].includes(event.type))impact.income+=event.amount;
      else impact.expense+=event.amount;
      impact.items.push(event);
    }
    impact.income=round2(impact.income);impact.expense=round2(impact.expense);return impact;
  }

  function specialRepaymentForLoan(events,loanId,year,month){
    return round2(monthImpact(events,year,month).specialRepayments.filter(item=>item.loanId===String(loanId||'')).reduce((sum,item)=>sum+item.amount,0));
  }

  function applyToBaseMonths(baseMonths,events){
    return (baseMonths||[]).map(row=>{
      const impact=monthImpact(events,row.year,row.month);
      return {...row,
        income:round2(Number(row.income||0)+impact.income),
        fixed:round2(Number(row.fixed||0)+impact.expense),
        specialRepayment:round2(impact.specialRepayments.reduce((sum,item)=>sum+item.amount,0)),
        financialEvents:impact.items.map(item=>({id:item.id,type:item.type,title:item.title,amount:item.amount,loanId:String(item.metadata?.loanId||'')})),
      };
    });
  }

  root.FinancialEvents=Object.freeze({TYPES,TYPE_KEYS,ONE_TIME_TYPES,normalizeEvent,isActive,monthImpact,specialRepaymentForLoan,applyToBaseMonths});
})(typeof globalThis!=='undefined'?globalThis:window);
