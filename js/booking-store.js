/* State-Grenze fuer variable Buchungen. Keine DOM- oder UI-Abhaengigkeiten. */
'use strict';

(function(root){
  const MAX_CURRENCY_AMOUNT=Number.MAX_SAFE_INTEGER/100;
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function round2(value){return Math.round(Number(value)*100)/100;}
  function save(){if(typeof root.persist==='function')root.persist();}
  function normalize(input){
    const item=clone(input)||{},direction=item.direction==='income'?'income':'expense',amount=Number(item.betrag),year=Number(item.year),month=Number(item.month);
    if(!item.id)throw new TypeError('Buchungs-ID fehlt');
    if(!Number.isFinite(amount)||amount<=0||amount>MAX_CURRENCY_AMOUNT)throw new RangeError('Betrag muss größer als null und als Centbetrag sicher berechenbar sein');
    if(!Number.isInteger(year)||year<2000||year>2200||!Number.isInteger(month)||month<0||month>11)throw new RangeError('Gültiger Buchungsmonat erforderlich');
    if(direction==='expense'&&!String(item.catId||''))throw new RangeError('Kategorie für Ausgabe erforderlich');
    return {...item,id:String(item.id),direction,catId:direction==='income'?'':String(item.catId||''),bezeichnung:String(item.bezeichnung||'').slice(0,120),betrag:round2(amount),year,month};
  }
  function all(){return clone(Array.isArray(state().buchungen)?state().buchungen:[]);}
  function find(id){return clone((state().buchungen||[]).find(item=>item.id===id)||null);}
  function forMonth(year,month){return clone((state().buchungen||[]).filter(item=>Number(item.year)===Number(year)&&Number(item.month)===Number(month)));}
  function add(input){
    const item=normalize(input);
    state().buchungen=Array.isArray(state().buchungen)?state().buchungen:[];
    state().buchungen.push(item);save();return clone(item);
  }
  function update(id,changes){
    const item=(state().buchungen||[]).find(entry=>entry.id===id);if(!item)return null;
    Object.assign(item,normalize({...item,...clone(changes),id:item.id}));save();return clone(item);
  }
  function remove(id){
    const before=(state().buchungen||[]).length;
    state().buchungen=(state().buchungen||[]).filter(item=>item.id!==id);
    const removed=state().buchungen.length!==before;if(removed)save();return removed;
  }
  function clear(){state().buchungen=[];save();}
  function monthlyTotals(year,month){let expenses=0,inflows=0;for(const item of state().buchungen||[]){if(Number(item.year)!==Number(year)||Number(item.month)!==Number(month))continue;if(item.direction==='income')inflows+=Number(item.betrag||0);else expenses+=Number(item.betrag||0);}return{expenses:round2(expenses),inflows:round2(inflows)};}
  function inflowsByMonth(){const totals=new Map();for(const item of state().buchungen||[]){if(item.direction!=='income')continue;const amount=Number(item.betrag),year=Number(item.year),month=Number(item.month);if(!Number.isFinite(amount)||!Number.isInteger(year)||!Number.isInteger(month))continue;const key=`${year}_${month}`;totals.set(key,(totals.get(key)||0)+amount);}for(const [key,total] of totals)totals.set(key,round2(total));return totals;}

  root.BookingStore=Object.freeze({all,find,forMonth,add,update,remove,clear,monthlyTotals,inflowsByMonth});
})(typeof globalThis!=='undefined'?globalThis:window);
