/* Verwaltung und Vergleich gespeicherter Prognoseszenarien. */
'use strict';

function storedForecastScenarios(){return ForecastStateStore.scenarios();}
function cloneForecastValue(value){return JSON.parse(JSON.stringify(value));}
function normalizedStoredScenario(value){return typeof ForecastScenarios!=='undefined'?ForecastScenarios.normalizeScenario(value,ForecastStateStore.year()):value;}

function openForecastScenarioDialog(id=''){
  const existing=storedForecastScenarios().find(item=>item.id===id),title=existing?.title||'';
  openGenSheet(`<div class="sheet-title">${id?'Szenario aktualisieren':'Szenario speichern'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="forecast-scenario-title" value="${esc(title)}" placeholder="z. B. Vorsichtig mit Autokauf"/></div><div class="forecast-note">Gespeichert werden Prognosezeitraum, Ausgabenannahmen, Renditen und Finanzereignisse. Das Startvermögen bleibt bewusst außerhalb des Szenarios.</div><div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveForecastScenario('${esc(id)}')">Speichern</button></div>`);
}

function saveForecastScenario(id=''){
  const title=document.getElementById('forecast-scenario-title')?.value.trim();if(!title)return toast('Bitte eine Bezeichnung eingeben','err');
  const baseYear=ForecastStateStore.year(),ui=cloneForecastValue(forecastUi()),assumptions=cloneForecastValue(forecastAssumptions()),events=ForecastStateStore.financialEvents(),scenarios=storedForecastScenarios(),existing=scenarios.find(item=>item.id===id),nowIso=new Date().toISOString();
  const next=existing?ForecastScenarios.update(existing,{title,ui,assumptions,financialEvents:events,baseYear,nowIso}):ForecastScenarios.snapshot({id:uid(),title,ui,assumptions,financialEvents:events,baseYear,nowIso});
  const updated=scenarios.filter(item=>item.id!==id);updated.push(next);ForecastStateStore.setScenarios(updated);ForecastStateStore.save();closeGenSheet();render();toast(existing?'Szenario aktualisiert':'Szenario gespeichert');
}

function loadForecastScenario(id){
  const scenario=storedForecastScenarios().find(item=>item.id===id);if(!scenario)return;
  const normalized=normalizedStoredScenario(scenario);ForecastStateStore.setForecastUi(normalized.ui);ForecastStateStore.setAssumptions(normalized.assumptions);ForecastStateStore.setFinancialEvents(normalized.financialEvents);ForecastStateStore.save();render();toast(`Szenario „${normalized.title}“ geladen`);
}
function deleteForecastScenario(id){const scenarios=storedForecastScenarios(),scenario=scenarios.find(item=>item.id===id);if(!scenario||!confirm(`Szenario „${scenario.title}“ wirklich löschen?`))return;ForecastStateStore.setScenarios(scenarios.filter(item=>item.id!==id));ForecastStateStore.save();render();toast('Szenario gelöscht');}
function duplicateForecastScenario(id){const scenarios=storedForecastScenarios(),scenario=scenarios.find(item=>item.id===id);if(!scenario)return;const normalized=normalizedStoredScenario(scenario),copy=ForecastScenarios.snapshot({id:uid(),title:`${normalized.title} Kopie`,ui:normalized.ui,assumptions:normalized.assumptions,financialEvents:normalized.financialEvents,baseYear:ForecastStateStore.year()});scenarios.push(copy);ForecastStateStore.setScenarios(scenarios);ForecastStateStore.save();render();}

function forecastScenarioResult(raw){
  const scenario=normalizedStoredScenario(raw),assets=forecastAssets();
  const input=buildForecastInput(scenario.ui,assets,scenario.assumptions,scenario.financialEvents);
  return {scenario,result:ForecastEngine.project(input)};
}
function forecastScenarioDate(value){if(!value)return '–';const date=new Date(value);return Number.isNaN(date.getTime())?'–':date.toLocaleDateString('de-DE');}

function forecastScenarioComparison(scenarios){
  if(!scenarios.length)return '<div class="forecast-note">Noch keine gespeicherten Szenarien vorhanden.</div>';
  const rows=scenarios.map(raw=>forecastScenarioResult(raw)).map(({scenario,result})=>`<div class="forecast-scenario-compare-row"><div><strong>${esc(scenario.title)}</strong><span>bis ${scenario.ui.endYear} · ${esc(ForecastEngine.SCENARIOS[scenario.ui.scenarioKey]?.label||scenario.ui.scenarioKey)}</span></div><span>${fmt(result.summary.endLiquidity)}</span><span>${fmt(result.summary.endDebt)}</span><span class="${result.summary.endNetWorth>=0?'forecast-positive':'forecast-negative'}">${fmt(result.summary.endNetWorth)}</span><span class="${result.summary.minLiquidity>=0?'forecast-positive':'forecast-negative'}">${fmt(result.summary.minLiquidity)}</span></div>`).join('');
  return `<div class="forecast-scenario-compare"><div class="forecast-scenario-compare-head"><span>Szenario</span><span>Liquidität</span><span>Restschuld</span><span>Nettovermögen</span><span>Min. Liquidität</span></div>${rows}</div>`;
}

function forecastScenariosPanel(){
  const scenarios=storedForecastScenarios().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de',{sensitivity:'base'}));
  const cards=scenarios.map(raw=>{const scenario=normalizedStoredScenario(raw);return `<div class="forecast-event-row"><div class="forecast-event-main"><strong>${esc(scenario.title)}</strong><span>${esc(ForecastEngine.SCENARIOS[scenario.ui.scenarioKey]?.label||scenario.ui.scenarioKey)} · bis ${scenario.ui.endYear} · ${scenario.financialEvents.length} Ereignisse · ${forecastScenarioDate(scenario.updatedAt||scenario.createdAt)}</span></div><div class="forecast-event-actions"><button class="btn btn-ghost" onclick="loadForecastScenario('${esc(scenario.id)}')">Laden</button><button class="btn btn-ghost" onclick="openForecastScenarioDialog('${esc(scenario.id)}')">Aktualisieren</button><button class="btn btn-ghost" onclick="duplicateForecastScenario('${esc(scenario.id)}')">Duplizieren</button><button class="btn btn-red" onclick="deleteForecastScenario('${esc(scenario.id)}')">Löschen</button></div></div>`;}).join('');
  return `<section class="card"><div class="compact-toolbar"><div><div class="card-title">Szenarien</div><div class="field-hint">Varianten mit identischem Startvermögen speichern und direkt vergleichen.</div></div><button class="btn btn-primary" onclick="openForecastScenarioDialog()">+ Szenario speichern</button></div><div class="forecast-event-list">${cards||'<div class="forecast-note">Noch keine Szenarien gespeichert.</div>'}</div>${scenarios.length?`<div class="sheet-divider"></div><div class="card-title">Szenariovergleich</div>${forecastScenarioComparison(scenarios)}`:''}</section>`;
}

ForecastPanelRegistry.register('beforeKpis','forecast-scenarios',forecastScenariosPanel,200);
