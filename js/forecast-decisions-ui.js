/* Entscheidungsanalyse für Finanzziele. Verändert keine Prognosedaten. */
'use strict';

function forecastDecisionInput(ui=forecastUi(),assumptions=forecastAssumptions(),events=S.financialEvents||[]){return buildForecastInput(ui,forecastAssets(),assumptions,events);}
function forecastDecisionAnalysis(goal,input){return ForecastDecisions.analyze(goal,input,ForecastEngine.project,ForecastGoals.evaluateGoal);}
function forecastDecisionAmount(value){return value===null||value===undefined?'–':fmt(value);}
function forecastDecisionAdvice(goal,analysis){
  const items=[];
  if(analysis.evaluation.status==='disabled')items.push(['Status','Ziel ist deaktiviert']);
  else if(analysis.evaluation.achieved)items.push(['Status','Ziel wird bereits erreicht']);
  else if(analysis.evaluation.status==='outside')items.push(['Status','Prognosezeitraum endet vor dem Zieltermin']);
  else if(goal.type==='debtFree')items.push(['Zusätzlicher Tilgungsbedarf zum Zieltermin',forecastDecisionAmount(analysis.debtPayoff.amount)]);
  else{
    if(analysis.monthlySurplus.possible)items.push(['Zusätzlicher Überschuss pro Monat',forecastDecisionAmount(analysis.monthlySurplus.amount)]);
    if(analysis.variableReduction.possible)items.push(['Alternative: variable Ausgaben reduzieren',`${forecastDecisionAmount(analysis.variableReduction.amount)} / Monat`]);
    if(goal.type==='minLiquidity'&&analysis.maximumImmediateExpense.possible)items.push(['Zusätzliche Einmalausgabe heute noch möglich',forecastDecisionAmount(analysis.maximumImmediateExpense.amount)]);
  }
  if(!items.length)items.push(['Analyse','Mit den verfügbaren Stellgrößen ist das Ziel im eingestellten Zeitraum nicht erreichbar.']);
  return `<div class="forecast-decision-grid">${items.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}
function forecastDecisionScenarioRows(goal){
  if(goal.enabled===false)return '';
  const scenarios=typeof storedForecastScenarios==='function'?storedForecastScenarios():[];
  if(!scenarios.length)return '';
  const rows=scenarios.map(raw=>{
    const scenario=normalizedStoredScenario(raw),input=forecastDecisionInput(scenario.ui,scenario.assumptions,scenario.financialEvents),analysis=forecastDecisionAnalysis(goal,input);
    let need='–';
    if(analysis.evaluation.achieved)need='bereits erreicht';
    else if(analysis.evaluation.status==='outside')need='Zeitraum zu kurz';
    else if(goal.type==='debtFree'&&analysis.debtPayoff.possible)need=`${fmt(analysis.debtPayoff.amount)} Tilgung`;
    else if(analysis.monthlySurplus.possible)need=`${fmt(analysis.monthlySurplus.amount)} / Monat`;
    return {title:scenario.title,need,amount:analysis.evaluation.achieved?0:analysis.monthlySurplus?.amount??analysis.debtPayoff?.amount??Number.POSITIVE_INFINITY};
  }).sort((a,b)=>a.amount-b.amount||String(a.title).localeCompare(String(b.title),'de'));
  return `<div class="sheet-divider"></div><div class="sheet-subtitle">Gespeicherte Szenarien</div><div class="forecast-decision-scenarios">${rows.map((row,index)=>`<div class="forecast-decision-scenario${index===0&&Number.isFinite(row.amount)?' is-best':''}"><span>${esc(row.title)}${index===0&&Number.isFinite(row.amount)?' · geringster Bedarf':''}</span><strong>${esc(row.need)}</strong></div>`).join('')}</div>`;
}
function openForecastGoalDecision(id){
  const raw=storedForecastGoals().find(item=>item.id===id);if(!raw)return;
  const goal=normalizedForecastGoal(raw),input=forecastDecisionInput(),analysis=forecastDecisionAnalysis(goal,input);
  openGenSheet(`<div class="sheet-title">Entscheidungsanalyse</div><div class="forecast-decision-head"><strong>${esc(goal.title)}</strong><span>${esc(ForecastGoals.TYPES[goal.type])} · ${forecastGoalTargetText(goal)}</span></div>${forecastDecisionAdvice(goal,analysis)}${forecastDecisionScenarioRows(goal)}<div class="forecast-note">Die Werte sind reine Szenariorechnungen. Es werden keine Buchungen, Sparraten, Kredite oder Finanzereignisse automatisch geändert.</div><div class="dialog-actions"><button class="btn btn-primary" onclick="closeGenSheet()">Schließen</button></div>`);
}
