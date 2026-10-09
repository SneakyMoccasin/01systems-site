'use strict';
// Scripted HTTP outputs. Never used by live.cjs; no gold-file reader.
const {tapeFor}=require('../onboarding-sr/structured/test-tape.cjs');
function fixture(prepared,profile,{problems=[],repairs=[]}={}) {
  const tape=tapeFor(prepared,problems),responses=[];
  const response=data=>({status:200,body:JSON.stringify({status:'completed',model:profile.model,output_text:JSON.stringify(data),usage:{input_tokens:200,output_tokens:300,total_tokens:500}})});
  for(const [i,step] of tape.steps.entries()) {
    if(repairs.includes(i)) {
      const bad=structuredClone(step.data);
      if(i===0) bad.claims[0].statement=42;
      else if(i===1) bad.assessments[0].explanation=42;
      else bad.summary.overview=42;
      responses.push(response(bad));
    }
    responses.push(response(step.data));
  }
  return {label:'SYNTHETIC HTTP RESPONSES — NO NETWORK',responses};
}
module.exports={fixture};
