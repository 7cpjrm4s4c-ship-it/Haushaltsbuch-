/**
 * State- und Persistenzgrenze für monatliche Kontostände am Monatsanfang.
 * @module AccountBalanceStore
 */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function key(year,month){
    const y=Number(year),m=Number(month);
    if(!Number.isInteger(y)||y<2000||y>2200||!Number.isInteger(m)||m<0||m>11)throw new RangeError('Ungültiger Kontostand-Zeitraum');
    return `${y}_${m}`;
  }
  /** @param {number} year Jahr. @param {number} month Monat (0–11). @returns {number|null} Gespeicherter Stichtagswert. */
  function get(year,month){const value=state().accountBalances?.[key(year,month)];return Number.isFinite(Number(value))?Number(value):null;}
  /** @param {number} year Jahr. @param {number} month Monat (0–11). @returns {boolean} Ob ein Wert existiert. */
  function has(year,month){return Object.prototype.hasOwnProperty.call(state().accountBalances||{},key(year,month));}
  /**
   * Schreibt den letzten bekannten Anfangsbestand bis zum Zielmonat fort.
   * Ein späterer manueller Anfangsbestand setzt die Fortschreibung ab diesem Monat neu auf.
   * @param {number} year Zieljahr.
   * @param {number} month Zielmonat (0–11).
   * @param {Function} monthlyNet Liefert den Netto-Saldo eines Monats.
   * @returns {number|null} Errechneter Kontostand am Ende des Zielmonats.
   */
  function projected(year,month,monthlyNet){
    const targetYear=Number(year),targetMonth=Number(month),targetIndex=targetYear*12+targetMonth;
    key(targetYear,targetMonth);
    if(typeof monthlyNet!=='function')throw new TypeError('Monatssaldo-Funktion fehlt');
    let anchor=null;
    for(const [entry,raw] of Object.entries(state().accountBalances||{})){
      const match=/^(\d{4})_(\d{1,2})$/.exec(entry),amount=Number(raw);
      if(!match||!Number.isFinite(amount))continue;
      const entryYear=Number(match[1]),entryMonth=Number(match[2]),index=entryYear*12+entryMonth;
      if(entryMonth<0||entryMonth>11||index>targetIndex||anchor&&index<=anchor.index)continue;
      anchor={index,amount};
    }
    if(!anchor)return null;
    let balance=anchor.amount;
    for(let index=anchor.index;index<=targetIndex;index++){
      const currentYear=Math.floor(index/12),currentMonth=index-currentYear*12,net=Number(monthlyNet(currentYear,currentMonth));
      if(Number.isFinite(net))balance+=net;
    }
    return balance;
  }
  /** @param {number} year Jahr. @param {number} month Monat. @param {number} amount Kontostand. @returns {number} Gespeicherter Wert. */
  function set(year,month,amount){const value=Number(amount);if(!Number.isFinite(value))throw new TypeError('Kontostand muss eine endliche Zahl sein');const s=state();s.accountBalances={...(s.accountBalances||{}),[key(year,month)]:value};save();return value;}
  /** @param {number} year Jahr. @param {number} month Monat. @returns {boolean} Ob ein Wert entfernt wurde. */
  function remove(year,month){const s=state(),entry=key(year,month);if(!Object.prototype.hasOwnProperty.call(s.accountBalances||{},entry))return false;const next={...(s.accountBalances||{})};delete next[entry];s.accountBalances=next;save();return true;}
  function save(){if(typeof root.persist!=='function')throw new Error('Persistenzschnittstelle ist nicht verfügbar');root.persist();}
  root.AccountBalanceStore=Object.freeze({get,has,projected,set,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
