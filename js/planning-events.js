/* Einheitliches internes Modell für Planungsereignisse. Keine DOM-Abhängigkeiten. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PlanningEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const TYPES=Object.freeze({
    RECURRING:'recurring',ABSOLUTE:'absolute',PERCENTAGE:'percentageIncrease',FIXED:'fixedIncrease',ONE_TIME:'oneTime',
  });
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  const round2=value=>Math.round((Number(value)||0)*100)/100;

  function fromLegacy(state={}){
    const events=[];
    for(const x of state.recurringRules||[])events.push({id:x.id,type:TYPES.RECURRING,catId:x.catId,amount:Number(x.amount)||0,intervalMonths:Math.max(1,Number(x.intervalMonths)||1),startYear:Number(x.startYear),startMonth:Number(x.startMonth)||0,endYear:x.endYear==null?null:Number(x.endYear),endMonth:x.endMonth==null?null:Number(x.endMonth)});
    for(const x of state.annualAdjustments||[])events.push({id:x.id,type:TYPES.ABSOLUTE,catId:x.catId,amount:Number(x.amount)||0,year:Number(x.year),month:Number(x.month)||0});
    for(const x of state.percentageAdjustments||[])events.push({id:x.id,type:TYPES.PERCENTAGE,catId:x.catId,percent:Number(x.percent)||0,year:Number(x.year),month:Number(x.month)||0,repeatAnnual:Boolean(x.repeatAnnual)});
    for(const x of state.amountAdjustments||[])events.push({id:x.id,type:TYPES.FIXED,catId:x.catId,amount:Number(x.amount)||0,year:Number(x.year),month:Number(x.month)||0});
    for(const x of state.oneTimeEntries||[])events.push({id:x.id,type:TYPES.ONE_TIME,catId:x.catId,amount:Number(x.amount)||0,year:Number(x.year),month:Number(x.month)||0,label:String(x.label||'')});
    return events;
  }

  function forCategory(events,catId){return (events||[]).filter(event=>event.catId===catId);}

  function recurringDue(event,year,month){
    const current=monthIndex(year,month),start=monthIndex(event.startYear,event.startMonth);
    if(current<start)return false;
    if(event.endYear!==null&&event.endYear!==undefined&&current>monthIndex(event.endYear,event.endMonth||0))return false;
    return (current-start)%Math.max(1,Number(event.intervalMonths)||1)===0;
  }

  function valueForMonth({events,catId,year,month,defaultValue=0,customValue}){
    const relevant=forCategory(events,catId);
    const recurring=relevant.find(event=>event.type===TYPES.RECURRING)||null;
    const oneTime=relevant.filter(event=>event.type===TYPES.ONE_TIME&&Number(event.year)===Number(year)&&Number(event.month)===Number(month)).reduce((sum,event)=>sum+Number(event.amount||0),0);
    if(customValue!==undefined)return round2(Number(customValue||0)+oneTime);
    if(recurring&&!recurringDue(recurring,year,month))return round2(oneTime);

    const current=monthIndex(year,month);
    const absolute=relevant.filter(event=>event.type===TYPES.ABSOLUTE&&monthIndex(event.year,event.month)<=current).sort((a,b)=>monthIndex(b.year,b.month)-monthIndex(a.year,a.month))[0];
    let value=absolute?Number(absolute.amount||0):Number(recurring?recurring.amount:defaultValue)||0;

    value+=relevant.filter(event=>event.type===TYPES.FIXED&&monthIndex(event.year,event.month)<=current).reduce((sum,event)=>sum+Number(event.amount||0),0);

    const percentages=relevant.filter(event=>event.type===TYPES.PERCENTAGE&&monthIndex(event.year,event.month)<=current).sort((a,b)=>monthIndex(a.year,a.month)-monthIndex(b.year,b.month));
    for(const event of percentages){
      const factor=1+Number(event.percent||0)/100;
      if(event.repeatAnnual){
        const occurrences=Number(year)-Number(event.year)+(Number(month)>=Number(event.month)?1:0);
        if(occurrences>0)value*=Math.pow(factor,occurrences);
      }else value*=factor;
    }
    return round2(value+oneTime);
  }

  return Object.freeze({TYPES,monthIndex,fromLegacy,forCategory,recurringDue,valueForMonth});
});
