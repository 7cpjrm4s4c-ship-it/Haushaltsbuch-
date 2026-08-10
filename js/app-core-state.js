'use strict';

const MS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MF=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const TL={E:'Einnahmen',F:'Fixkosten',V:'Variabel',K:'Kredit',S:'Sparen'};
const RC={E:'e',K:'k',S:'s'};
const now=new Date();
const LS_KEY='hp5';
let S={view:'dashboard',year:now.getFullYear(),month:now.getMonth(),years:[],data:{},cats:[],kredite:[],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],forecastAssets:{},forecastAssumptions:{},financialEvents:[],forecastScenarios:[],forecastGoals:[],ui:{}};
function defaultYears(){const year=now.getFullYear();return[year,year+1,year+2];}
function deepClone(value){return JSON.parse(JSON.stringify(value));}
function uid(){return'x'+Math.random().toString(36).slice(2,9);}
function esc(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
const _fmtFull=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const _fmtShort=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function fmt(value){return _fmtFull.format(value);}
function fmtS(value){return Math.abs(value)>=1000?_fmtShort.format(value):_fmtFull.format(value);}
const dkey=(year,month,id)=>`${year}_${month}_${id}`;
