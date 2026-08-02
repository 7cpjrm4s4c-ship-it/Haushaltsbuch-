'use strict';
const _loadPercentageAdjustments=load;
load=function(){
  _loadPercentageAdjustments();
  try{
    const saved=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
    S.percentageAdjustments=Array.isArray(saved.percentageAdjustments)?saved.percentageAdjustments:[];
  }catch(e){S.percentageAdjustments=[];}
};
