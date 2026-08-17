import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const run=(source,context,name)=>{context.globalThis=context;context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:name});return context;};
const [controllerSource,renderersSource,composerSource]=await Promise.all([
  read('js/forecast-view-controller.js'),read('js/forecast-view-renderers.js'),read('js/forecast-view-composer.js')
]);

// Forecast-Controller: Konvertierung, Clamping, Persistenz und Render-Seiteneffekte.
{
  let saves=0,renders=0;
  let ui={lookbackMonths:3,endYear:2030,annualInflation:2};
  let assets={cash:100};
  let assumptions={annualReturns:{etf:5},purchasingPowerInflation:2,savingsTarget:'etf'};
  const c=run(controllerSource,{
    Number,Math,
    forecastUi:()=>({...ui}),forecastAssets:()=>({...assets}),forecastAssumptions:()=>({annualReturns:{...assumptions.annualReturns},purchasingPowerInflation:assumptions.purchasingPowerInflation,savingsTarget:assumptions.savingsTarget}),
    ForecastStateStore:{save:()=>saves++,setForecastUi:value=>{ui=value;},setAssets:value=>{assets=value;},setAssumptions:value=>{assumptions=value;}},
    render:()=>renders++
  },'js/forecast-view-controller.js');
  c.setForecastOption('lookbackMonths','12');assert.equal(ui.lookbackMonths,12);
  c.setForecastAsset('cash','-50');assert.equal(assets.cash,0);
  c.setForecastBucket('liquidity','250');assert.equal(assets.cash,250);
  c.setForecastReturn('etf','250');assert.equal(assumptions.annualReturns.etf,100);
  c.setForecastReturn('etf','-150');assert.equal(assumptions.annualReturns.etf,-99);
  c.setForecastAssumption('purchasingPowerInflation','80');assert.equal(assumptions.purchasingPowerInflation,50);
  c.setForecastAssumption('purchasingPowerInflation','-40');assert.equal(assumptions.purchasingPowerInflation,-20);
  c.setForecastAssumption('savingsTarget','cash');assert.equal(assumptions.savingsTarget,'cash');
  assert.equal(saves,8);assert.equal(renders,8);
}

// Reine Forecast-Renderer: Auswahl, Leerzustaende, Gruppierung, positive/negative Werte und Escaping.
{
  const c=run(renderersSource,{
    Object,Array,Math,Number,String,
    ForecastEngine:{SCENARIOS:{realistic:{key:'realistic',label:'Realistisch'},optimistic:{key:'optimistic',label:'Optimistisch'}}},
    FinancialEvents:{TYPES:{bonus:'Bonus'}},
    FORECAST_ASSET_LABELS:{cash:'Liquidität',etf:'ETF'},
    MF:['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    fmt:value=>`${Number(value).toFixed(2)} €`,fmtS:value=>String(Math.round(Number(value))),esc:value=>String(value).replaceAll('<','&lt;'),
    forecastAssets:()=>({cash:10,etf:20}),forecastAssumptions:()=>({annualReturns:{cash:0,etf:5}})
  },'js/forecast-view-renderers.js');
  const options=c.forecastScenarioOptions('optimistic');assert.match(options,/optimistic" selected/);assert.match(options,/Realistisch/);
  const years=c.forecastYearOptions(2028,2026);assert.match(years,/2028" selected/);assert.match(years,/2066/);
  assert.equal(c.forecastTimeline([]),'');
  const groupedYears=Array.from({length:6},(_,index)=>({year:2026+index,saldo:index===1?-50:100,endNetWorth:1000+index,eventCount:0,income:1000,fixed:200,variable:100,creditPayments:0,specialRepayment:0,savings:100,investmentReturn:20,endLiquidity:500,endInvestments:500,endDebt:0,endRealNetWorth:900}));
  const groups=c.forecastYearGroups(groupedYears);assert.equal(groups.length,2);assert.equal(groups[0].length,5);assert.equal(groups[1].length,1);
  const timeline=c.forecastTimeline(groupedYears);assert.match(timeline,/2026–2030/);assert.match(timeline,/2031–2031/);assert.equal((timeline.match(/forecast-period-card/g)||[]).length,2);assert.equal((timeline.match(/forecast-period-card" open/g)||[]).length,1);assert.match(timeline,/positive/);assert.match(timeline,/negative/);
  const details=c.forecastYearDetails(groupedYears,[]);assert.equal((details.match(/forecast-period-card/g)||[]).length,2);assert.equal((details.match(/forecast-year-card/g)||[]).length,6);assert.match(details,/2026–2030/);
  assert.match(c.forecastWealthChart([]),/Noch keine Prognosedaten/);
  const chart=c.forecastWealthChart([{liquidity:10,investments:20,debt:5,netWorth:25,realNetWorth:24},{liquidity:15,investments:25,debt:0,netWorth:40,realNetWorth:38}]);assert.match(chart,/forecast-chart-line/);assert.match(chart,/Nettovermögen real/);
  const badges=c.forecastEventBadges({financialEvents:[{type:'bonus',title:'Bonus <2026>'}]});assert.match(badges,/title="Bonus"/);assert.match(badges,/Bonus &lt;2026>/);
  assert.match(c.forecastAssetInputs(),/setForecastAsset\('cash'/);assert.match(c.forecastReturnInputs(),/setForecastReturn\('etf'/);
  assert.match(c.forecastSavingsTargetOptions('etf'),/etf" selected/);
  assert.equal(c.forecastLowPoint({minLiquidityYear:null,minLiquidityMonth:null}),'–');
  assert.equal(c.forecastLowPoint({minLiquidityYear:2027,minLiquidityMonth:2}),'Mär 2027');
  assert.match(c.forecastPrimaryResult('netWorth',{endYear:2030},[{year:2030,month:11,netWorth:1234}],{}),/1234\.00 €/);
  assert.match(c.forecastPrimaryResult('liquidity',{endYear:2030},[{year:2030,month:11,liquidity:-20}],{}),/forecast-negative/);
  assert.match(c.forecastPrimaryResult('debtFree',{endYear:2030},[{year:2031,month:4,debt:0}],{startDebt:100}),/Mai 2031/);
  assert.match(c.forecastPrimaryResult('debtFree',{endYear:2030},[],{startDebt:0}),/Bereits schuldenfrei/);
}

// Forecast-Komposition: Panels werden vor KPI-Anker eingefuegt, ohne Panel bleibt Basis unveraendert.
{
  let registered=null;
  const base='<div>Start</div><div class="forecast-events-slot"></div>';
  const c=run(composerSource,{
    Object,TypeError,
    vPrognose:()=>base,
    ForecastPanelRegistry:{render:()=>'<aside>Panel</aside>'},
    AppExtensionRegistry:{registerView:(key,fn,priority)=>{registered={key,fn,priority};}}
  },'js/forecast-view-composer.js');
  assert.equal(registered.key,'einstellungen');assert.equal(registered.priority,200);
  const html=registered.fn();assert.ok(html.includes('<aside>Panel</aside>'));assert.ok(!html.includes('forecast-events-slot'));

  let registeredEmpty=null;
  run(composerSource,{
    Object,TypeError,
    vPrognose:()=>base,
    ForecastPanelRegistry:{render:()=>''},
    AppExtensionRegistry:{registerView:(key,fn,priority)=>{registeredEmpty={key,fn,priority};}}
  },'js/forecast-view-composer.js');
  assert.equal(registeredEmpty.fn(),base);

  assert.throws(()=>run(composerSource,{Object,TypeError,vPrognose:null,ForecastPanelRegistry:{render:()=>''},AppExtensionRegistry:{registerView(){}}},'js/forecast-view-composer.js'),/Basis-Prognoseansicht fehlt/);
}

console.log('Phase-D-Forecast-UI-Abdeckung erfolgreich geprüft.');
