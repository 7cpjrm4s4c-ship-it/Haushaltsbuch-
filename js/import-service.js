/* Reiner CSV-/TSV-Parser und Validator fuer den Import. Keine App-State- oder DOM-Abhaengigkeiten. */
'use strict';

(function(root){
  const MONTH_FULL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const MONTH_SHORT=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  function detectDelimiter(line){const counts={';':0,',':0,'\t':0,'|':0};for(const char of line)if(counts[char]!==undefined)counts[char]++;return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];}
  function splitLine(line,delimiter){const result=[];let current='',quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if((char==='"'||char==="'")&&!quoted){quoted=true;continue;}if((char==='"'||char==="'")&&quoted){quoted=false;continue;}if(char===delimiter&&!quoted){result.push(current);current='';continue;}current+=char;}result.push(current);return result;}
  function findColumn(headers,aliases){for(const alias of aliases){const index=headers.findIndex(header=>header===alias||header.includes(alias));if(index>=0)return index;}return -1;}
  function normalizeType(raw){return{E:'E',EINNAHME:'E',EINNAHMEN:'E',F:'F',FIX:'F',FIXKOSTEN:'F',V:'V',VAR:'V',VARIABEL:'V',K:'K',KREDIT:'K',S:'S',SPAR:'S',SPAREN:'S'}[String(raw||'').toUpperCase()]||null;}
  function resolveYears(raw,availableYears){
    const value=String(raw||'').trim();if(!value||/^(alle|all)$/i.test(value))return [...availableYears];
    const range=value.match(/^\s*(\d{4})\s*-\s*(\d{4})\s*$/);if(range){const start=Number(range[1]),end=Number(range[2]),years=[];for(let year=Math.min(start,end);year<=Math.max(start,end);year++)years.push(year);return years;}
    return [...new Set(value.split(/[,;\/\s]+/).map(Number).filter(year=>Number.isInteger(year)&&year>=2000&&year<=2100))].sort((a,b)=>a-b);
  }
  function resolveMonths(raw){
    const value=String(raw||'').trim();if(!value||/^(alle|all)$/i.test(value))return Array.from({length:12},(_,index)=>index);
    const map={};MONTH_FULL.forEach((name,index)=>{map[name.toLowerCase()]=index;});MONTH_SHORT.forEach((name,index)=>{map[name.toLowerCase()]=index;});
    const result=[];for(const part of value.split(/[,;\/\s]+/)){const token=part.trim().toLowerCase();if(map[token]!==undefined){result.push(map[token]);continue;}const number=Number(token);if(Number.isInteger(number)&&number>=1&&number<=12)result.push(number-1);}
    return result.length?[...new Set(result)].sort((a,b)=>a-b):Array.from({length:12},(_,index)=>index);
  }
  function createTemplate(availableYears=[]){
    const year=availableYears.find(value=>Number.isInteger(Number(value)))||'alle';
    return [
      'Position;Gruppe;Typ;Betrag;Jahr;Monat',
      'Gehalt (netto);Einnahmen;E;3500;alle;alle',
      'Miete / Wohnkosten;Wohnen;F;900;alle;alle',
      `Lebensmittel;Variable Ausgaben;V;400;${year};alle`,
      'Zusätzliche Kreditrate (nicht verknüpft);Kredite;K;350;alle;alle',
      'Zusätzliche Sparposition (nicht verknüpft);Sparen;S;200;alle;alle'
    ].join('\n');
  }
  function parse(raw,availableYears=[]){
    const lines=String(raw||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(line=>line.trim()).filter(Boolean);
    if(lines.length<2)return{rows:[],parsed:[],errors:['Weniger als 2 Zeilen']};
    const delimiter=detectDelimiter(lines[0]);
    const headers=splitLine(lines[0],delimiter).map(header=>header.toLowerCase().trim().replace(/["']/g,''));
    const columns={position:findColumn(headers,['position','pos','name','bezeichnung']),group:findColumn(headers,['gruppe','group','kategorie']),type:findColumn(headers,['typ','type','art']),amount:findColumn(headers,['betrag','amount','wert','preis','summe']),year:findColumn(headers,['jahr','year','jahre']),month:findColumn(headers,['monat','month','monate'])};
    const rows=lines.slice(1),parsed=[];
    for(const line of rows){
      const cells=splitLine(line,delimiter).map(cell=>cell.trim().replace(/^["']|["']$/g,''));const get=index=>index>=0&&index<cells.length?cells[index].trim():'';
      const position=get(columns.position),group=get(columns.group),typeRaw=get(columns.type).toUpperCase(),amountRaw=get(columns.amount).replace(',','.').replace(/[^\d.-]/g,'');
      let status='ok',message='';if(!position){status='err';message='Position fehlt';}
      const amount=Number.parseFloat(amountRaw);if(!Number.isFinite(amount)){status='err';message='Betrag ungültig';}
      const type=normalizeType(typeRaw);if(!type&&status!=='err'){status='warn';message=`Typ '${typeRaw}' unbekannt → F`;}
      const years=resolveYears(get(columns.year),availableYears);if(!years.length&&status==='ok'){status='warn';message=`Jahr '${get(columns.year)}' unbekannt → aktuelle Jahre`;}
      parsed.push({pos:position,gruppe:group||'Import',typ:type||'F',betrag:Number.isFinite(amount)?amount:null,jahre:years.length?years:[...availableYears],monate:resolveMonths(get(columns.month)),_status:status,_msg:message});
    }
    return{rows,parsed,errors:[]};
  }
  root.ImportService=Object.freeze({parse,resolveYears,resolveMonths,normalizeType,createTemplate});
})(typeof globalThis!=='undefined'?globalThis:window);
