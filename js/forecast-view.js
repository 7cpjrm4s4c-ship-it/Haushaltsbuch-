/* Basis-Komposition der Prognoseansicht. Zustandslogik und Renderer liegen in eigenen Modulen. */
'use strict';

VIEW_TITLES.einstellungen='Prognose';

function vPrognose(){
  const {baseYear,ui,buckets,assumptions,baseline,months,summary}=forecastData();
  const first=months[0]||{debt:0},startDebt=Number(summary.startDebt??first.openingDebt??first.debt??0);
  const targetYear=ui.focus==='debtFree'?'':`<div class="field"><div class="lbl">Zieljahr</div><div class="sw"><select class="sel" onchange="setForecastOption('endYear',this.value)">${forecastYearOptions(ui.endYear,baseYear)}</select></div></div>`;
  return `<div class="desktop-page-title">Prognose</div><div class="forecast-layout">
    <section class="card forecast-controls"><div class="card-title">Was möchtest du wissen?</div><div class="form-grid ${ui.focus==='debtFree'?'':'two'}"><div class="field"><div class="lbl">Ergebnis</div><div class="sw"><select class="sel" onchange="setForecastOption('focus',this.value)"><option value="netWorth"${ui.focus==='netWorth'?' selected':''}>Vermögen</option><option value="debtFree"${ui.focus==='debtFree'?' selected':''}>Wann bin ich schuldenfrei?</option><option value="liquidity"${ui.focus==='liquidity'?' selected':''}>Liquidität</option></select></div></div>${targetYear}</div></section>
    ${forecastPrimaryResult(ui.focus,ui,months,summary)}
    <section class="card forecast-controls"><div class="card-title">Ausgangslage</div><div class="forecast-account-summaries"><button class="forecast-account-summary" onclick="openForecastAccounts('liquidity')"><span>Liquidität heute</span><strong>${fmt(buckets.liquidity)}</strong><small>Konten und Zinsen verwalten</small></button><button class="forecast-account-summary" onclick="openForecastAccounts('investments')"><span>Anlagevermögen heute</span><strong>${fmt(buckets.investments)}</strong><small>Anlagen und Renditen verwalten</small></button></div><div class="forecast-start-summary"><span>Restschulden heute</span><strong>${fmt(startDebt)}</strong></div><div class="forecast-note">Berechnet aus deinen bestehenden Einnahmen, Ausgaben, Sparraten und Krediten. Konten und Anlagen werden ausschließlich für die Prognose verwendet.</div></section>
    <section class="card forecast-controls"><div class="card-title">Annahmen pro Jahr</div><div class="form-grid two"><div class="field"><div class="lbl">Kaufkraftverlust (%)</div><input class="inp" type="number" min="-20" max="50" step="0.1" inputmode="decimal" value="${assumptions.purchasingPowerInflation}" onchange="setForecastAssumption('purchasingPowerInflation',this.value)"/></div><div class="field"><div class="lbl">Variable Ausgaben (%)</div><input class="inp" type="number" min="-10" max="20" step="0.1" inputmode="decimal" value="${ui.annualInflation}" onchange="setForecastOption('annualInflation',this.value)"/><div class="field-hint">Monatsbasis: ${fmt(baseline)}</div></div></div><div class="forecast-note">Zinsen und Renditen werden je Konto monatlich mit Zinseszinseffekt berechnet. Der Kaufkraftverlust verändert nur den Vergleichswert in heutigen Euro. Steigende variable Ausgaben verringern Liquidität und Vermögen, nicht den errechneten Kredit-Endtermin.</div></section>
    <div class="forecast-events-slot"></div>
  </div>`;
}
