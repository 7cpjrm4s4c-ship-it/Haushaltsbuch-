import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,RangeError,TypeError};context.globalThis=context;vm.createContext(context);
for(const path of ['js/forecast-engine.js','js/forecast-goals.js','js/forecast-decisions.js'])vm.runInContext(await read(path),context,{filename:path});
const {ForecastEngine,ForecastGoals,ForecastDecisions}=context;
const months=(count,values={})=>Array.from({length:count},(_,month)=>({year:2026,month,income:Number(values.income||0),fixed:Number(values.fixed||0),savings:0,creditPayments:0,specialRepayment:0,debt:Number(values.debt||0),financialEvents:[]}));
const project=input=>ForecastEngine.project(input),evaluate=(goal,result)=>ForecastGoals.evaluateGoal(goal,result);

const investmentInput={baseMonths:months(12),variableBaseline:0,annualInflation:0,scenarioKey:'realistic',startAssetBreakdown:{cash:0,etf:0},annualReturns:{},purchasingPowerInflation:0,savingsTarget:'etf'};
const investmentGoal={id:'i',title:'Depot',type:'investments',targetAmount:1200,targetYear:2026,targetMonth:11,enabled:true};
const investmentDecision=ForecastDecisions.monthlySurplus(investmentGoal,investmentInput,project,evaluate);
assert.equal(investmentDecision.possible,true);assert.ok(Math.abs(investmentDecision.amount-100)<0.02,'1200 € Anlageziel in 12 Monaten benötigt rund 100 € zusätzlichen Monatsüberschuss');
assert.equal(investmentInput.baseMonths[0].income,0,'Analyse darf den Input nicht verändern');assert.equal(investmentInput.baseMonths[0].savings,0);

const liquidityInput={...investmentInput,baseMonths:months(2)};
const liquidityGoal={id:'l',title:'Reserve',type:'minLiquidity',targetAmount:100,targetYear:2026,targetMonth:1,enabled:true};
const liquidityDecision=ForecastDecisions.monthlySurplus(liquidityGoal,liquidityInput,project,evaluate);
assert.equal(liquidityDecision.possible,true);assert.ok(Math.abs(liquidityDecision.amount-100)<0.02,'Liquiditätsüberschuss muss als Cash verbleiben');

const variableInput={...investmentInput,baseMonths:months(6,{income:100}),variableBaseline:100};
const netWorthGoal={id:'n',title:'Vermögen',type:'netWorth',targetAmount:600,targetYear:2026,targetMonth:5,enabled:true};
const reduction=ForecastDecisions.variableReduction(netWorthGoal,variableInput,project,evaluate);
assert.equal(reduction.possible,true);assert.ok(Math.abs(reduction.amount-100)<0.02,'Vollständige Reduzierung der 100 € variablen Kosten muss 600 € Vermögen aufbauen');

// Die angezeigte Reduktion ist ein echter Eurobetrag pro Prognosemonat und wird nicht mit dem Szenariofaktor multipliziert.
const cautiousInput={...investmentInput,baseMonths:months(6,{income:100}),variableBaseline:100,scenarioKey:'cautious'};
const breakEvenGoal={id:'c',title:'Ausgleich',type:'netWorth',targetAmount:0,targetYear:2026,targetMonth:5,enabled:true};
const cautiousReduction=ForecastDecisions.variableReduction(breakEvenGoal,cautiousInput,project,evaluate);
assert.equal(cautiousReduction.possible,true);assert.ok(Math.abs(cautiousReduction.amount-10)<0.02,'Bei 110 € prognostizierten variablen Kosten müssen exakt rund 10 € pro Monat reduziert werden');
const reducedForecast=project(ForecastDecisions.applyVariableReduction(cautiousInput,breakEvenGoal,10));assert.equal(reducedForecast.months[0].variable,100);

// „Heute ausgebbar“ darf kommende Monatseinnahmen nicht vorwegnehmen, sondern reduziert ausschließlich vorhandenes Start-Cash.
const reserveInput={...investmentInput,baseMonths:months(6,{income:1000}),startAssetBreakdown:{cash:1000}};
const reserveGoal={id:'r',title:'Notgroschen',type:'minLiquidity',targetAmount:500,targetYear:2026,targetMonth:5,enabled:true};
const expense=ForecastDecisions.maximumImmediateExpense(reserveGoal,reserveInput,project,evaluate);
assert.equal(expense.possible,true);assert.ok(Math.abs(expense.amount-500)<0.02,'Trotz 1000 € kommender Monatseinnahmen dürfen von 1000 € Start-Cash nur 500 € heute ausgegeben werden');
const spent=ForecastDecisions.applyImmediateExpense(reserveInput,500);assert.equal(spent.startAssetBreakdown.cash,500);assert.equal(spent.baseMonths[0].fixed,0);assert.equal(reserveInput.startAssetBreakdown.cash,1000,'Analyse darf Start-Cash nicht mutieren');

const debtForecast=project({...investmentInput,baseMonths:months(2,{debt:300}),startAssetBreakdown:{cash:1000}});
const debtGoal={id:'d',title:'Schuldenfrei',type:'debtFree',targetAmount:0,targetYear:2026,targetMonth:1,enabled:true};
const payoff=ForecastDecisions.debtPayoff(debtGoal,debtForecast,evaluate);assert.equal(payoff.possible,true);assert.equal(payoff.amount,300);

const outsideGoal={...investmentGoal,targetYear:2027,targetMonth:0};
const outside=ForecastDecisions.monthlySurplus(outsideGoal,investmentInput,project,evaluate);assert.equal(outside.possible,false);assert.equal(outside.evaluation.status,'outside');
const disabledGoal={...investmentGoal,id:'disabled',enabled:false};const disabledAnalysis=ForecastDecisions.analyze(disabledGoal,investmentInput,project,evaluate);assert.equal(disabledAnalysis.evaluation.status,'disabled');assert.equal(disabledAnalysis.monthlySurplus.possible,false);

const source=await read('js/forecast-decisions.js');for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bpersist\s*\(/,/\brender\s*\(/,/\btoast\s*\(/])assert.ok(!forbidden.test(source),'ForecastDecisions muss reine Fachlogik bleiben');
const [index,ui,goalUi]=await Promise.all([read('index.html'),read('js/forecast-decisions-ui.js'),read('js/forecast-goals-ui.js')]);assert.ok(index.includes('js/forecast-decisions.js'));assert.ok(index.includes('js/forecast-decisions-ui.js'));assert.ok(index.indexOf('js/forecast-decisions.js')<index.indexOf('js/forecast-decisions-ui.js'));assert.ok(ui.includes('openForecastGoalDecision'));assert.ok(ui.includes('ForecastDecisions.analyze'));assert.ok(ui.includes('Ziel ist deaktiviert'));assert.ok(goalUi.includes('disabled title="Ziel zuerst aktivieren"'));
console.log('Phase-C-Entscheidungsanalyse erfolgreich geprüft.');
