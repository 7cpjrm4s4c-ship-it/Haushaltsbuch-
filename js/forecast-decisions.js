/* Neutrale Entscheidungsanalyse für Finanzziele. Keine DOM- oder App-Abhängigkeiten. */
(function(root){
  'use strict';
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  function cloneInput(input){return {...input,baseMonths:(input?.baseMonths||[]).map(row=>({...row,financialEvents:Array.isArray(row.financialEvents)?row.financialEvents.map(item=>({...item})):[]})),startAssetBreakdown:{...(input?.startAssetBreakdown||{})},annualReturns:{...(input?.annualReturns||{})}};}
  function targetIndex(goal){return monthIndex(goal.targetYear,goal.targetMonth);}
  function applyMonthlySurplus(input,goal,amount){
    const copy=cloneInput(input),limit=targetIndex(goal),value=Math.max(0,Number(amount)||0),invest=goal.type!=='minLiquidity';
    copy.baseMonths=copy.baseMonths.map(row=>monthIndex(row.year,row.month)<=limit?{...row,income:Number(row.income||0)+value,savings:Number(row.savings||0)+(invest?value:0)}:row);
    return copy;
  }
  function applyVariableReduction(input,goal,amount){
    const copy=cloneInput(input),limit=targetIndex(goal),value=Math.max(0,Number(amount)||0);
    copy.baseMonths=copy.baseMonths.map(row=>monthIndex(row.year,row.month)<=limit?{...row,variableReduction:Number(row.variableReduction||0)+value}:row);
    return copy;
  }
  function applyImmediateExpense(input,amount){
    const copy=cloneInput(input),value=Math.max(0,Number(amount)||0),cash=Math.max(0,Number(copy.startAssetBreakdown?.cash)||0);
    copy.startAssetBreakdown.cash=Math.max(0,cash-value);
    return copy;
  }
  function solveMinimum(goal,input,project,evaluate,apply,upperBound){
    const baseline=project(input),baseEvaluation=evaluate(goal,baseline);
    if(baseEvaluation.achieved)return {possible:true,amount:0,evaluation:baseEvaluation,result:baseline};
    if(baseEvaluation.status==='disabled'||baseEvaluation.status==='outside')return {possible:false,amount:null,evaluation:baseEvaluation,result:baseline};
    let high=Math.max(1,Number(upperBound)||1),candidateResult=null,candidateEvaluation=null;
    for(let attempt=0;attempt<24;attempt++){
      candidateResult=project(apply(input,goal,high));candidateEvaluation=evaluate(goal,candidateResult);
      if(candidateEvaluation.achieved)break;high*=2;
    }
    if(!candidateEvaluation?.achieved)return {possible:false,amount:null,evaluation:baseEvaluation,result:baseline};
    let low=0;
    for(let step=0;step<36;step++){
      const mid=(low+high)/2,result=project(apply(input,goal,mid)),evaluation=evaluate(goal,result);
      if(evaluation.achieved){high=mid;candidateResult=result;candidateEvaluation=evaluation;}else low=mid;
    }
    return {possible:true,amount:round2(high),evaluation:candidateEvaluation,result:candidateResult};
  }
  function monthlySurplus(goal,input,project,evaluate){
    if(goal.type==='debtFree')return {possible:false,amount:null,reason:'not-applicable'};
    return solveMinimum(goal,input,project,evaluate,applyMonthlySurplus,Math.max(100,Number(goal.targetAmount||0)/120));
  }
  function variableReduction(goal,input,project,evaluate){
    if(goal.type==='debtFree'||goal.type==='investments')return {possible:false,amount:null,reason:'not-applicable'};
    const baselineResult=project(input),baseEvaluation=evaluate(goal,baselineResult);
    if(baseEvaluation.achieved)return {possible:true,amount:0,evaluation:baseEvaluation,result:baselineResult};
    if(baseEvaluation.status==='disabled'||baseEvaluation.status==='outside')return {possible:false,amount:null,evaluation:baseEvaluation,result:baselineResult};
    const relevant=baselineResult.months.filter(row=>monthIndex(row.year,row.month)<=targetIndex(goal)),maximum=relevant.reduce((max,row)=>Math.max(max,Number(row.variable||0)),0);
    if(maximum<=0)return {possible:false,amount:null,evaluation:baseEvaluation,result:baselineResult};
    const fullResult=project(applyVariableReduction(input,goal,maximum)),fullEvaluation=evaluate(goal,fullResult);
    if(!fullEvaluation.achieved)return {possible:false,amount:null,evaluation:baseEvaluation,result:baselineResult};
    let low=0,high=maximum,candidateResult=fullResult,candidateEvaluation=fullEvaluation;
    for(let step=0;step<36;step++){
      const mid=(low+high)/2,result=project(applyVariableReduction(input,goal,mid)),evaluation=evaluate(goal,result);
      if(evaluation.achieved){high=mid;candidateResult=result;candidateEvaluation=evaluation;}else low=mid;
    }
    return {possible:true,amount:round2(high),evaluation:candidateEvaluation,result:candidateResult};
  }
  function maximumImmediateExpense(goal,input,project,evaluate){
    if(goal.type!=='minLiquidity')return {possible:false,amount:null,reason:'not-applicable'};
    const baseline=project(input),baseEvaluation=evaluate(goal,baseline);
    if(!baseEvaluation.achieved)return {possible:false,amount:0,evaluation:baseEvaluation,result:baseline};
    const availableCash=Math.max(0,Number(input?.startAssetBreakdown?.cash)||0);
    if(availableCash<=0)return {possible:true,amount:0,evaluation:baseEvaluation,result:baseline};
    const allCashEvaluation=evaluate(goal,project(applyImmediateExpense(input,availableCash)));
    if(allCashEvaluation.achieved)return {possible:true,amount:round2(availableCash),evaluation:baseEvaluation,result:baseline};
    let low=0,high=availableCash;
    for(let step=0;step<36;step++){
      const mid=(low+high)/2,evaluation=evaluate(goal,project(applyImmediateExpense(input,mid)));
      if(evaluation.achieved)low=mid;else high=mid;
    }
    return {possible:true,amount:round2(low),evaluation:baseEvaluation,result:baseline};
  }
  function debtPayoff(goal,forecast,evaluate){
    const evaluation=evaluate(goal,forecast);
    if(goal.type!=='debtFree')return {possible:false,amount:null,reason:'not-applicable',evaluation};
    if(evaluation.status==='disabled'||evaluation.status==='outside')return {possible:false,amount:null,evaluation};
    return {possible:true,amount:round2(Math.max(0,Number(evaluation.gap)||0)),evaluation};
  }
  function analyze(goal,input,project,evaluate){
    const forecast=project(input),evaluation=evaluate(goal,forecast);
    return {evaluation,monthlySurplus:monthlySurplus(goal,input,project,evaluate),variableReduction:variableReduction(goal,input,project,evaluate),maximumImmediateExpense:maximumImmediateExpense(goal,input,project,evaluate),debtPayoff:debtPayoff(goal,forecast,evaluate)};
  }
  root.ForecastDecisions=Object.freeze({cloneInput,applyMonthlySurplus,applyVariableReduction,applyImmediateExpense,monthlySurplus,variableReduction,maximumImmediateExpense,debtPayoff,analyze});
})(typeof globalThis!=='undefined'?globalThis:window);
