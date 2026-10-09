'use strict';
const path=require('node:path');
const C=require('../contracts/onboarding-v1/contract.cjs');
const {setup,correctedProposal,confirm}=require('../onboarding-session/manual-example.cjs');
const {prepare,reviewRecorded,attachOffline,customerQuestion}=require('./adapter.cjs');
const {tapeFor}=require('./test-tape.cjs');
const bundle=require('./bundle.cjs');
async function demonstrate() {
 const session=setup(),receipts=[],checkpoints=[];
 const take=label=>checkpoints.push({label,...session.view().statuses});
 const first=session.requestReview('sr-first');
 const receipt1=await reviewRecorded(first.request,tapeFor(prepare(first.request),{target:'approval'}));
 attachOffline(session,first.id,receipt1);receipts.push({job_id:first.id,receipt:receipt1});
 const finding=receipt1.result.findings[0];
 session.addQuestions([customerQuestion(receipt1,first.id,finding.id,'Är dag 2 ett mål, och kräver godkännande ett separat besked?','approval-question')]);
 confirm(session,'early-confirmation');take('Första granskningen och tidig bekräftelse; fynd blockerar');
 let blocked=false;try{session.createHandoff('premature');}catch{blocked=true;}
 if(!blocked)throw new Error('Premature handoff');
 session.answer({id:'clarification',question_id:'approval-question',text:'Dag 2 är ett mål. Godkännande kräver ett separat besked.',replaces_answer_id:null});
 take('Kundsvaret gör granskning och bekräftelse inaktuella; fynd kvarstår');
 session.submitProposal(correctedProposal(session.view()));
 const second=session.requestReview('sr-second');
 const receipt2=await reviewRecorded(second.request,tapeFor(prepare(second.request)));
 attachOffline(session,second.id,receipt2);receipts.push({job_id:second.id,receipt:receipt2});
 take('Ny SR-kodkörning med förskrivna svar; gammalt fynd fortfarande öppet');
 // A correction plus a partial review cannot certify resolution. Preserve the original finding.
 session.handleFinding({review_id:first.id,finding_id:finding.id,status:'accepted',reason:'Korrigeringen finns uttryckligen i version 2, men full SR-fälttäckning återstår. Fyndet hålls öppet.',by:'Syntetisk testgranskare'});
 confirm(session,'current-confirmation');take('Kunden bekräftar exakt aktuell version och granskningskontext');
 let handoff_error;try{session.createHandoff('separate-validation-only');}catch(e){handoff_error=e.message;}
 if(!handoff_error)throw new Error('Partial review must block handoff');
 return {session,receipts,checkpoints,handoff_error};
}
if(require.main===module)demonstrate().then(({session,receipts,checkpoints,handoff_error})=>{
 if(process.argv[2])bundle.save(path.resolve(process.argv[2]),session,receipts);
 console.log(JSON.stringify({mode:'OFFLINE: real SR code, scripted provider responses',checkpoints,handoff_blocked:handoff_error,sr_steps:receipts.map(r=>r.receipt.stage_trace.map(t=>t.stage))},null,2));
}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={demonstrate};
