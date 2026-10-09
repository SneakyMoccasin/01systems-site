'use strict';
// Prepares inputs without reading gold. Offline mode invokes real SR with scripted responses only.
const fs=require('node:fs'),path=require('node:path');
const C=require('../contracts/onboarding-v1/contract.cjs');
const A=require('./adapter.cjs');
const {tapeFor}=require('./test-tape.cjs');
function inputs(){return ['c3-r1-proposal.json','clear-proposal.json'].map(file=>{const proposal=JSON.parse(fs.readFileSync(path.join(__dirname,'diagnostic',file)));return {name:file.replace('-proposal.json',''),request:{proposal_digest:C.digest(proposal),snapshot:proposal,trigger:'first_draft',changed_item_ids:[],prior_finding_ids:[],trust:'data_only'}};});}
async function main(mode,directory){
 if(!['prepare','offline'].includes(mode)||!directory)throw new Error('Usage: node diagnostic.cjs prepare|offline NEW_OUTPUT_DIRECTORY. No live command exists.');
 fs.mkdirSync(directory); // Exclusive output directory; never overwrite previous runs.
 for(const {name,request} of inputs()) {
  const prepared=A.prepare(request);fs.writeFileSync(path.join(directory,`${name}.prepared.json`),JSON.stringify(prepared,null,2)+'\n',{flag:'wx'});
  if(mode==='offline') {
   const tape=tapeFor(prepared,name==='c3-r1'?{target:'assumption_test_day',outcome:'partially_supported'}:{});
   if(name==='c3-r1') {
    const source=request.snapshot.sources.find(s=>s.id==='answer-new');
    const assessment=tape[1].data.assessments.find(a=>a.outcome==='partially_supported');
    assessment.sourceQuotes=[{exactText:source.content,occurrenceIndex:0}];
    assessment.explanation='TEST DATA: Dag 4 stöds som rättad faktisk bokning; känt scenarioantagande saknar uttryckligt scenarioval. Detta svar är förskrivet, inte upptäckt av AI.';
    tape[2].data.findings[0].explanation=assessment.explanation;
   }
   fs.writeFileSync(path.join(directory,`${name}.test-tape.json`),JSON.stringify(tape,null,2)+'\n',{flag:'wx'});
   const receipt=await A.reviewRecorded(request,tape);A.saveReceipt(path.join(directory,`${name}.receipt.json`),receipt);
  }
 }
 console.log(`Saved ${mode} artifacts in ${directory}; external AI calls: 0.`);
}
if(require.main===module)main(process.argv[2],process.argv[3]).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={inputs};
