/* Ausführung gespeicherter Prognoseszenarien. Keine DOM-, Render- oder Persistenzabhängigkeiten. */
'use strict';

function forecastScenarioResult(raw){
  const scenario=ForecastScenarios.normalizeScenario(raw,ForecastStateStore.year());
  const input=buildForecastInput(scenario.ui,forecastAssets(),scenario.assumptions,scenario.financialEvents);
  return {scenario,result:ForecastEngine.project(input)};
}
