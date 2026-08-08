/* Verwaltung und Vergleich gespeicherter Prognoseszenarien. */
'use strict';

function storedForecastScenarios(){S.forecastScenarios=Array.isArray(S.forecastScenarios)?S.forecastScenarios:[];return S.forecastScenarios;}
function cloneForecastValue(value){return JSON.parse(JSON.stringify(value));}
function normalizedStoredScenario(value){return typeof ForecastScenarios!=='undefined'?ForecastScenarios.normalizeScenario(value,S.year):value;}

function openForecastScenarioDialog(id=''){
  const existing=storedForecastScenarios().find(item=>item.id===id),title=existing?.title||'';
  openGenSheet(`<div class="sheet-title">${id?'Szenario aktualisieren':'Szenario speichern'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="forecast-scenario-title" value="${esc(title)}" placeholder="z. B. Vorsichtig mit Autokauf"/></div><div class="forecast-note">Gespeichert werden Prognosezeitraum, Ausgabenannahmen, Renditen und Finanzereignisse. Das Startvermögen bleibt bewusst außerhalb des Szenarios.</div><div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveForecastScenario('${esc(id)}')">Speichern</button></div>`);
}

function saveForecastScenario(id=''){
  const title=document.getElementById('forecast-scenario-title')?.value.trim();if(!title)return toast('Bitte eine Bezeichnung eingeben','err');
  const ui=cloneForecastValue(forecastUi()),assumptions=cloneForecastValue(forecastAssumptions()),events=cloneForecastValue(S.financialEvents||[]),existing=storedForecastScenarios().find(item=>item.id===id),nowIso=new Date().toISOString();
  const next=existing?ForecastScenarios.update(existing,{title,ui,assumptions,financialEvents:events,baseYear:S.year,nowIso}):ForecastScenarios.snapshot({id:uid(),title,ui,assumptions,financialEvents:events,baseYear:S.year,nowIso});
  S.forecastScenarios=storedForecastScenarios().filter(item=>item.id!==id);S.forecastScenarios.push(next);persist();closeGenSheet();render();toast(existing?'Szenario aktualisiert':'Szenario gespeichert');
}

function loadForecastScenario(id){
  const scenario=storedForecastScenarios().find(item=>item.id===id);if(!scenario)return;
  const normalized=normalizedStoredScenario(scenario);S.ui=S.ui||{};S.ui.forecast=cloneForecastValue(normalized.ui);S.forecastAssumptions=cloneForecastValue(normalized.assumptions);S.financialEvents=cloneForecastValue(normalized.financialEvents);persist();render();toast(`Szenario „${normalized.title}“ geladen`);
}
function deleteForecastScenario(id){const scenario=storedForecastScenarios().find(item=>item.id===id);if(!scenario||!confirm(`Szenario „${scenario.title}“ wirklich löschen?`))return;S.forecastScenarios=storedForecastScenarios().filter(item=>item.id!==id);persist();render();toast('Szenario gelöscht');}
function duplicateForecastScenario(id){const scenario=storedForecastScenarios().find(item=>item.id===id);if(!scenario)return;const normalized=normalizedStoredScenario(scenario),copy=ForecastScenarios.snapshot({id:uid(),title:`${normalized.title} Kopie`,ui:normalized.ui,assumptions:normalized.assumptions,financialEvents:normalized.financialEvents,baseYear:S.year});S.forecastScenarios.push(copy);persist();render();}

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
  const scenarios=storedForecastScenarios().slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de',{sensitivity:'base'}));
  const cards=scenarios.map(raw=>{const scenario=normalizedStoredScenario(raw);return `<div class="forecast-event-row"><div class="forecast-event-main"><strong>${esc(scenario.title)}</strong><span>${esc(ForecastEngine.SCENARIOS[scenario.ui.scenarioKey]?.label||scenario.ui.scenarioKey)} · bis ${scenario.ui.endYear} · ${scenario.financialEvents.length} Ereignisse · ${forecastScenarioDate(scenario.updatedAt||scenario.createdAt)}</span></div><div class="forecast-event-actions"><button class="btn btn-ghost" onclick="loadForecastScenario('${esc(scenario.id)}')">Laden</button><button class="btn btn-ghost" onclick="openForecastScenarioDialog('${esc(scenario.id)}')">Aktualisieren</button><button class="btn btn-ghost" onclick="duplicateForecastScenario('${esc(scenario.id)}')">Duplizieren</button><button class="btn btn-red" onclick="deleteForecastScenario('${esc(scenario.id)}')">Löschen</button></div></div>`;}).join('');
  return `<section class="card"><div class="compact-toolbar"><div><div class="card-title">Szenarien</div><div class="field-hint">Varianten mit identischem Startvermögen speichern und direkt vergleichen.</div></div><button class="btn btn-primary" onclick="openForecastScenarioDialog()">+ Szenario speichern</button></div><div class="forecast-event-list">${cards||'<div class="forecast-note">Noch keine Szenarien gespeichert.</div>'}</div>${scenarios.length?`<div class="sheet-divider"></div><div class="card-title">Szenariovergleich</div>${forecastScenarioComparison(scenarios)}`:''}</section>`;
}
