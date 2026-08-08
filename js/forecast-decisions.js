/* Neutrale Entscheidungsanalyse für Finanzziele. Keine DOM- oder App-Abhängigkeiten. */
(function(root){
  'use strict';
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  function cloneInput(input){return {...input,baseMonths:(input?.baseMonths||[]).map(row=>({...row,financialEvents:Array.isArray(row.financialEvents)?row.financialEvents.map(item=>({...item})):[]})),startAssetBreakdown:{...(input?.startAssetBreakdown||{})},annualReturns:{...(input?.annualReturns||{})}};}
  function targetIndex(goal){return monthIndex(goal.targetYear,goal.targetMonth);}
  function applyMonthlySurplus(input,goal,amount){
    const copy=cloneInput(input),limit=targetIndex(goal),value=Math.max(0,Number(amount)||0);
    copy.baseMonths=copy.baseMonths.map(row=>monthIndex(row.year,row.month)<=limit?{...row,income:Number(row.income||0)+value,savings:Number(row.savings||0)+value}:row);
    return copy;
  }
  function applyVariableReduction(input,amount){const copy=cloneInput(input);copy.variableBaseline=Math.max(0,Number(copy.variableBaseline||0)-Math.max(0,Number(amount)||0));return copy;}
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
    const baseline=Math.max(0,Number(input?.variableBaseline)||0),baseResult=project(input),baseEvaluation=evaluate(goal,baseResult);
    if(baseEvaluation.achieved)return {possible:true,amount:0,evaluation:baseEvaluation,result:baseResult};
    if(baseEvaluation.status==='disabled'||baseEvaluation.status==='outside'||baseline<=0)return {possible:false,amount:null,evaluation:baseEvaluation,result:baseResult};
    const fullResult=project(applyVariableReduction(input,baseline)),fullEvaluation=evaluate(goal,fullResult);
    if(!fullEvaluation.achieved)return {possible:false,amount:null,evaluation:baseEvaluation,result:baseResult};
    let low=0,high=baseline,candidateResult=fullResult,candidateEvaluation=fullEvaluation;
    for(let step=0;step<36;step++){
      const mid=(low+high)/2,result=project(applyVariableReduction(input,mid)),evaluation=evaluate(goal,result);
      if(evaluation.achieved){high=mid;candidateResult=result;candidateEvaluation=evaluation;}else low=mid;
    }
    return {possible:true,amount:round2(high),evaluation:candidateEvaluation,result:candidateResult};
  }
  function debtPayoff(goal,forecast,evaluate){
    const evaluation=evaluate(goal,forecast);
    if(goal.type!=='debtFree')return {possible:false,amount:null,reason:'not-applicable',evaluation};
    if(evaluation.status==='disabled'||evaluation.status==='outside')return {possible:false,amount:null,evaluation};
    return {possible:true,amount:round2(Math.max(0,Number(evaluation.gap)||0)),evaluation};
  }
  function analyze(goal,input,project,evaluate){
    const forecast=project(input),evaluation=evaluate(goal,forecast);
    return {evaluation,monthlySurplus:monthlySurplus(goal,input,project,evaluate),variableReduction:variableReduction(goal,input,project,evaluate),debtPayoff:debtPayoff(goal,forecast,evaluate)};
  }
  root.ForecastDecisions=Object.freeze({cloneInput,applyMonthlySurplus,applyVariableReduction,monthlySurplus,variableReduction,debtPayoff,analyze});
})(typeof globalThis!=='undefined'?globalThis:window);
