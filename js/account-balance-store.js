/**
 * State- und Persistenzgrenze für monatliche Kontostand-Stichtagswerte.
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
  /** @param {number} year Jahr. @param {number} month Monat. @param {number} amount Kontostand. @returns {number} Gespeicherter Wert. */
  function set(year,month,amount){const value=Number(amount);if(!Number.isFinite(value))throw new TypeError('Kontostand muss eine endliche Zahl sein');const s=state();s.accountBalances={...(s.accountBalances||{}),[key(year,month)]:value};save();return value;}
  /** @param {number} year Jahr. @param {number} month Monat. @returns {boolean} Ob ein Wert entfernt wurde. */
  function remove(year,month){const s=state(),entry=key(year,month);if(!Object.prototype.hasOwnProperty.call(s.accountBalances||{},entry))return false;const next={...(s.accountBalances||{})};delete next[entry];s.accountBalances=next;save();return true;}
  function save(){if(typeof root.persist!=='function')throw new Error('Persistenzschnittstelle ist nicht verfügbar');root.persist();}
  root.AccountBalanceStore=Object.freeze({get,has,set,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
