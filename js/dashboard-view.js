/* Dashboard ohne Schreibzugriffe auf App-State. */
'use strict';

function dashboardYear(year){
  const result={e:0,f:0,v:0,k:0,s:0,aus:0,saldo:0};
  for(let month=0;month<12;month++){const value=calcMonth(year,month);for(const key of Object.keys(result))result[key]+=Number(value[key]||0);}
  return result;
}
function vDashboard(){
  const y=AppUiState.year(),mo=AppUiState.month(),m=calcMonth(y,mo),yr=dashboardYear(y);
  const spPct=m.e>0?((m.s/m.e)*100).toFixed(0):0,krPct=m.e>0?((m.k/m.e)*100).toFixed(0):0;
  const standalone=window.navigator.standalone===true,ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const chips=MS.map((name,index)=>`<div class="mchip${index===mo?' active':''}" data-mi="${index}">${name}</div>`).join('');
  return `<div class="desktop-page-title">Dashboard</div><div class="layout-grid dashboard-grid"><div class="grid-primary">
    ${ios&&!standalone?`<div class="install-banner"><div class="install-banner-title">Als App installieren</div><div class="install-banner-text">Safari: Teilen-Symbol antippen, dann "Zum Home-Bildschirm" wählen</div></div>`:''}
    <div class="month-grid" id="monthGrid">${chips}</div><div class="hero"><div class="hero-bg"></div><div class="hero-content"><div class="hero-lbl">Netto-Saldo · ${MF[mo]} ${y}</div><div class="hero-val ${m.saldo>=0?'pos':'neg'}">${fmtS(m.saldo)}</div><div class="hero-sub"><div class="hsi"><div class="hsi-lbl">Einnahmen</div><div class="hsi-val">${fmtS(m.e)}</div></div><div class="hsi"><div class="hsi-lbl">Ausgaben</div><div class="hsi-val">${fmtS(m.aus)}</div></div><div class="hsi"><div class="hsi-lbl">Zeitraum</div><div class="hsi-val">${MS[mo]} ${y}</div></div></div></div></div>
    <div class="tile-grid"><div class="tile"><div class="tile-lbl">Fixkosten</div><div class="tile-val">${fmtS(m.f)}</div></div><div class="tile"><div class="tile-lbl">Variabel</div><div class="tile-val">${fmtS(m.v)}</div></div><div class="tile"><div class="tile-lbl">Kredite</div><div class="tile-val r">${fmtS(m.k)}</div></div><div class="tile"><div class="tile-lbl">Sparen</div><div class="tile-val b">${fmtS(m.s)}</div></div></div></div>
    <div class="grid-secondary"><div class="card annual-overview"><div class="card-title">Jahresübersicht ${y}</div><div class="row"><span class="row-name">Einnahmen gesamt</span><span class="row-amt e">${fmtS(yr.e)}</span></div><div class="row"><span class="row-name">Ausgaben gesamt</span><span class="row-amt">${fmtS(yr.aus)}</span></div><div class="row"><span class="row-name">Jahres-Saldo</span><span class="row-amt ${yr.saldo>=0?'e':'k'}">${fmtS(yr.saldo)}</span></div><div class="row"><span class="row-name">Sparquote (aktueller Monat)</span><span class="row-amt s">${spPct} %</span></div><div class="row"><span class="row-name">Kreditlast (aktueller Monat)</span><span class="row-amt k">${krPct} %</span></div></div></div></div>`;
}
AppExtensionRegistry.registerView('dashboard',vDashboard,200);
