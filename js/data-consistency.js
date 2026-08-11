/* Einheitliche Datenquelle für Buchungen, Fixkosten und Dashboard. Keine DOM-Abhängigkeiten. */
'use strict';

function planningEventsSnapshot(){return PlanningEvents.fromLegacy(S);}
function consistentValue(year,month,cat,events=planningEventsSnapshot()){
  const customKey=dkey(year,month,cat.id);
  return PlanningEvents.valueForMonth({events,catId:cat.id,year,month,defaultValue:cat.d,customValue:S.data[customKey]});
}
function consistentMonthCalculation(year,month){
  let e=0,f=0,k=0,s=0;
  const events=planningEventsSnapshot();
  for(const cat of S.cats){
    if(cat.t==='V')continue;
    const value=consistentValue(year,month,cat,events);
    if(cat.t==='E')e+=value;else if(cat.t==='F')f+=value;else if(cat.t==='K')k+=value;else if(cat.t==='S')s+=value;
  }
  const v=BookingStore.forMonth(year,month).reduce((sum,booking)=>sum+Number(booking.betrag||0),0);
  const aus=f+v+k+s;return{e,f,v,k,s,aus,saldo:e-aus};
}
AppExtensionRegistry.registerCalculation('gv',consistentValue,100);
AppExtensionRegistry.registerCalculation('calcMonth',consistentMonthCalculation,100);
