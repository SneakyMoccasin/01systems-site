'use strict';
// Scripted provider responses, NOT detected findings, NOT saved live SR results.
// Actual SR extraction, assessment, adjudication code consumes these stage responses.
function selector(text,start,end) {
 const exactText=text.slice(start,end);let cursor=0,occurrenceIndex=0;
 while(text.indexOf(exactText,cursor)!==start){const next=text.indexOf(exactText,cursor);if(next<0)throw new Error('TEST_SELECTOR');cursor=next+exactText.length;occurrenceIndex++;}
 return {exactText,occurrenceIndex};
}
function tapeFor(prepared,{target=null,partial=false,omitUnit=null,outcome='contradicted'}={}) {
 const units=prepared.units.filter(u=>u.key!==omitUnit);
 const claims=units.map((u,index)=>({id:`claim-${index}`,statement:`TEST DATA: ${u.key}`,quote:selector(prepared.input.reviewText,u.start,partial?u.start+1:u.end)}));
 const assessments=claims.map((c,index)=>({id:`assessment-${index}`,claimId:c.id,claimQuote:c.quote,outcome:target!==null&&units[index].item_id===target?outcome:'supported',explanation:target!==null&&units[index].item_id===target?'TEST DATA: Förskriven invändning för adapterprovet.':'TEST DATA: Förskrivet stöd, ingen AI-bedömning.',sourceQuotes:[{exactText:prepared.request.snapshot.sources[0].content,occurrenceIndex:0}],recommendedAction:'TEST DATA: Be kunden förtydliga innebörden.',confidence:0.8}));
 const selected=assessments.filter(a=>a.outcome!=='supported');
 return [{stage:'grounded_claim_extraction',data:{claims}},{stage:'grounded_support_assessment',data:{assessments}},{stage:'grounded_adjudication',data:{findings:selected.map(a=>({id:`test-finding-${a.id}`,assessmentIds:[a.id],title:'TEST DATA: förskrivet fynd',explanation:a.explanation,recommendedAction:a.recommendedAction,confidence:0.8})),summary:{overview:'TEST DATA; verklig SR-kod med testdubbel, inte kvalitetsbevis.',supported:'Stöd är förskrivet i testdata.',nextStep:'Offlinekontroll av överföring och versionshantering.'}}}];
}
module.exports={tapeFor,selector};
