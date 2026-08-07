/* Prognoseansicht auf Basis der bestehenden Finanzlogik. */
'use strict';

VIEW_TITLES.prognose='Prognose';

function forecastUi(){
  S.ui=S.ui||{};
  const current=S.ui.forecast||{};
  const minEnd=S.year+1;
  S.ui.forecast={
    scenarioKey:current.scenarioKey||'realistic',
    lookbackMonths:[3,6,12].includes(Number(current.lookbackMonths))?Number(current.lookbackMonths):3,
    annualInflation:Number.isFinite(Number(current.annualInflation))?Number(current.annualInflation):0,
    endYear:Math.max(minEnd,Number(current.endYear)||S.year+5),
  };
  return S.ui.forecast;
}

function setForecastOption(key,value){
  const ui=forecastUi();
  if(key==='lookbackMonths'||key==='endYear'||key==='annualInflation')value=Number(value);
  ui[key]=value;
  render();
}

function forecastData(){
  const ui=forecastUi();
  const variableIds=S.cats.filter(cat=>cat.t==='V').map(cat=>cat.id);
  const baseline=ForecastEngine.historicalVariableAverage({
    bookings:S.buchungen,
    variableCategoryIds:variableIds,
    baseYear:S.year,
    baseMonth:S.month,
    lookbackMonths:ui.lookbackMonths,
  });
  const months=ForecastEngine.project({
    startYear:S.year,
    startMonth:S.month,
    endYear:ui.endYear,
    endMonth:11,
    categories:S.cats,
    credits:S.kredite,
    categoryValue:(year,month,cat)=>gv(year,month,cat),
    creditBalanceAt,
    creditInterestAt,
    variableBaseline:baseline,
    annualInflation:ui.annualInflation,
    scenarioKey:ui.scenarioKey,
  });
  return {ui,baseline,months,years:ForecastEngine.aggregateYears(months)};
}

function forecastScenarioOptions(selected){
  return Object.values(ForecastEngine.SCENARIOS).map(item=>
    `<option value="${item.key}"${item.key===selected?' selected':''}>${item.label}</option>`
  ).join('');
}

function forecastYearOptions(selected){
  const years=Array.from({length:20},(_,index)=>S.year+index+1);
  return years.map(year=>`<option value="${year}"${year===selected?' selected':''}>${year}</option>`).join('');
}

function forecastTimeline(years){
  if(!years.length)return '';
  const max=Math.max(1,...years.map(row=>Math.abs(row.saldo)));
  return `<div class="forecast-timeline">${years.map(row=>{
    const width=Math.max(3,Math.round(Math.abs(row.saldo)/max*100));
    const cls=row.saldo>=0?'positive':'negative';
    return `<div class="forecast-timeline-row">
      <div class="forecast-year">${row.year}</div>
      <div class="forecast-bar-track"><div class="forecast-bar ${cls}" style="width:${width}%"></div></div>
      <div class="forecast-bar-value ${cls}">${row.saldo>=0?'+':''}${fmtS(row.saldo)}</div>
    </div>`;
  }).join('')}</div>`;
}

function forecastYearDetails(years,months){
  return years.map(row=>{
    const rows=months.filter(item=>item.year===row.year).map(item=>`<div class="forecast-month-row">
      <span>${MF[item.month]}</span>
      <span>${fmtS(item.income)}</span>
      <span>${fmtS(item.expenses)}</span>
      <strong class="${item.saldo>=0?'forecast-positive':'forecast-negative'}">${item.saldo>=0?'+':''}${fmtS(item.saldo)}</strong>
    </div>`).join('');
    return `<details class="forecast-year-card">
      <summary>
        <div><strong>${row.year}</strong><span>Jahressaldo</span></div>
        <div class="${row.saldo>=0?'forecast-positive':'forecast-negative'}">${row.saldo>=0?'+':''}${fmt(row.saldo)}</div>
      </summary>
      <div class="forecast-year-metrics">
        <div><span>Einnahmen</span><strong>${fmt(row.income)}</strong></div>
        <div><span>Fixkosten</span><strong>${fmt(row.fixed)}</strong></div>
        <div><span>Variable Kosten</span><strong>${fmt(row.variable)}</strong></div>
        <div><span>Kreditraten</span><strong>${fmt(row.creditPayments)}</strong></div>
        <div><span>Sparen</span><strong>${fmt(row.savings)}</strong></div>
        <div><span>Restschuld Jahresende</span><strong>${fmt(row.endDebt)}</strong></div>
      </div>
      <div class="forecast-month-head"><span>Monat</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
      ${rows}
    </details>`;
  }).join('');
}

function vPrognose(){
  const {ui,baseline,months,years}=forecastData();
  const first=months[0]||{debt:0};
  const last=months[months.length-1]||{cumulative:0,debt:0};
  const totalSavings=months.reduce((sum,item)=>sum+item.savings,0);
  const debtReduction=Math.max(0,first.debt-last.debt);
  const scenario=ForecastEngine.SCENARIOS[ui.scenarioKey]||ForecastEngine.SCENARIOS.realistic;

  return `<div class="desktop-page-title">Finanzprognose</div>
    <div class="forecast-layout">
      <section class="card forecast-controls">
        <div class="card-title">Prognose einstellen</div>
        <div class="form-grid two">
          <div class="field"><div class="lbl">Szenario</div><div class="sw"><select class="sel" onchange="setForecastOption('scenarioKey',this.value)">${forecastScenarioOptions(ui.scenarioKey)}</select></div></div>
          <div class="field"><div class="lbl">Prognose bis</div><div class="sw"><select class="sel" onchange="setForecastOption('endYear',this.value)">${forecastYearOptions(ui.endYear)}</select></div></div>
          <div class="field"><div class="lbl">Variable Kosten · Durchschnitt</div><div class="sw"><select class="sel" onchange="setForecastOption('lookbackMonths',this.value)">${[3,6,12].map(n=>`<option value="${n}"${n===ui.lookbackMonths?' selected':''}>letzte ${n} Monate</option>`).join('')}</select></div></div>
          <div class="field"><div class="lbl">Inflation variable Kosten (% p.a.)</div><input class="inp" type="number" step="0.1" min="-10" max="20" value="${ui.annualInflation}" onchange="setForecastOption('annualInflation',this.value)"/></div>
        </div>
        <div class="forecast-note">${scenario.label}: variable Ausgaben werden mit ${Math.round(scenario.variableFactor*100)} % des historischen Durchschnitts angesetzt. Eingetragene Fixkosten, Enddaten und jährliche Erhöhungen werden unverändert aus der Finanzplanung übernommen.</div>
      </section>

      <section class="forecast-kpis">
        <div class="forecast-kpi"><span>Variable Basis</span><strong>${fmt(baseline)}</strong><small>pro Monat</small></div>
        <div class="forecast-kpi"><span>Kumuliertes Plansaldo</span><strong class="${last.cumulative>=0?'forecast-positive':'forecast-negative'}">${last.cumulative>=0?'+':''}${fmt(last.cumulative)}</strong><small>ab ${MF[S.month]} ${S.year}</small></div>
        <div class="forecast-kpi"><span>Schuldenabbau</span><strong>${fmt(debtReduction)}</strong><small>bis Ende ${ui.endYear}</small></div>
        <div class="forecast-kpi"><span>Geplantes Sparen</span><strong>${fmt(totalSavings)}</strong><small>im Zeitraum</small></div>
      </section>

      <section class="card">
        <div class="card-title">Jährlicher Finanzierungsspielraum</div>
        ${forecastTimeline(years)}
      </section>

      <section class="card">
        <div class="card-title">Jahres- und Monatsdetails</div>
        <div class="forecast-year-list">${forecastYearDetails(years,months)}</div>
      </section>
    </div>`;
}
