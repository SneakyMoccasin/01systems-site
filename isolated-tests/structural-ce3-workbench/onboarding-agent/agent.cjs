'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {Session}=require('../onboarding-session/v2/session.cjs');
const P=require('./protocol.cjs');
const {C,need}=P;
function writeNew(file,value) {
  const fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function text(value){need(typeof value==='string'&&value.trim()&&value.length<=20000,'Ange 1–20 000 tecken.');return value;}
// Storage follows the prototype's immutable snapshot + optimistic checksum pattern.
// Session/2 alone owns evidence, proposals, reviews, questions and confirmation state.
class Store {
  constructor(root){this.root=path.resolve(root);fs.mkdirSync(this.root,{recursive:true,mode:0o700});}
  directory(id){need(/^agent-[a-f0-9-]{36}$/.test(id),'INVALID_SESSION_ID');return path.join(this.root,id);}
  snapshots(id){return fs.readdirSync(this.directory(id)).filter(n=>/^\d{6}\.json$/.test(n)).sort();}
  create(){
    const s=new Session(`agent-${randomUUID()}`),folder=this.directory(s.view().id);fs.mkdirSync(folder,{mode:0o700});
    writeNew(path.join(folder,'capability-binding.json'),{schema_version:'ce3-agent-capability-binding/1',capabilities:P.capabilities,digest:C.digest(P.capabilities)});
    this.save(s);return s;
  }
  load(id,snapshot){
    const names=this.snapshots(id),name=snapshot??names.at(-1);need(names.includes(name),'SNAPSHOT_NOT_FOUND');
    const binding=read(path.join(this.directory(id),'capability-binding.json'));
    need(binding.digest===C.digest(binding.capabilities)&&binding.digest===C.digest(P.capabilities),'CAPABILITY_BINDING_CHANGED');
    return {session:Session.load(path.join(this.directory(id),name)),snapshot:name,latest:name===names.at(-1),snapshots:names};
  }
  save(s){const id=s.view().id,names=this.snapshots(id);const name=String(Number(names.at(-1)?.slice(0,6)??0)+1).padStart(6,'0')+'.json';s.save(path.join(this.directory(id),name));return name;}
  list(){return fs.readdirSync(this.root).filter(n=>/^agent-[a-f0-9-]{36}$/.test(n)).map(id=>{try{const {session}=this.load(id);const v=session.view();return {id,title:v.sources[0]?.content.slice(0,80)??'Ny beskrivning',revision:v.proposals.at(-1)?.revision??0};}catch{return {id,title:'Skadad eller inkompatibel session',error:true};}});}
  attempts(id){const root=path.join(this.directory(id),'attempts');if(!fs.existsSync(root))return [];
    return fs.readdirSync(root).sort().map(name=>{const folder=path.join(root,name);const request=read(path.join(folder,'request.json'));
      const {digest,...requestBody}=request.request;need(digest===C.digest(requestBody),'REQUEST_INTEGRITY');
      const outcome=fs.existsSync(path.join(folder,'outcome.json'))?read(path.join(folder,'outcome.json')):{status:'interrupted',error:'Modellförsöket saknar slutbesked. Ingen automatisk omsändning.'};
      if(outcome.checksum){const {checksum,...body}=outcome;need(checksum===C.digest(body)&&body.request_digest===request.request.digest,'ATTEMPT_INTEGRITY');if(body.response_sha256)need(C.hash(fs.readFileSync(path.join(folder,'response.json')))===body.response_sha256,'RESPONSE_INTEGRITY');}
      return {id:name,request,outcome};});}
}
function describe(store,id,snapshot){
  const saved=store.load(id,snapshot),s=saved.session,v=s.view(),p=v.proposals.at(-1)??null;
  const pending=v.questions.filter(q=>q.status==='open').sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
  const attempts=store.attempts(id),last=attempts.at(-1);
  const provenance=[...attempts].reverse().find(a=>a.outcome.proposal_digest===v.proposal_digest&&a.outcome.status==='accepted')?.outcome.producer??null;
  return {id,snapshot:saved.snapshot,snapshots:saved.snapshots,latest:saved.latest,checksum:s.serialize().checksum,
    lifecycle:v.lifecycle,statuses:v.statuses,pending_evidence:v.statuses.pending_evidence,proposal:p,
    summary:Object.entries(P.roles).map(([role,label])=>({role,label,items:p?.items.filter(i=>i.status!=='superseded'&&i.id.startsWith(role+'-'))??[]})),
    questions:pending.slice(0,3),deferred_questions:v.questions.filter(q=>q.status==='deferred').length,remaining_questions:Math.max(0,pending.length-3),all_questions:v.questions,answers:v.answers,sources:v.sources,
    review_findings:v.reviews.flatMap(r=>r.result.findings.map(f=>({...f,review_id:r.id}))),
    draft_status:v.statuses.pending_evidence?'needs_update':p?.gaps.some(g=>g.status==='open')?'open_questions':'draft_only',
    limitation:'Modellutkast för fortsatt arbete. Inte kompilerat, CE3-validerat, körklart eller fullständigt SR-granskat.',
    provenance,last_attempt:last?{id:last.id,status:last.outcome.status,error:last.outcome.error??null}:null,
    capability_id:P.capabilities.id,capability_digest:C.digest(P.capabilities),base_commit:P.BASE,
    engine_information:require('./engine-information.json'),
    suggest_pause:v.answers.length>=2,session:s.serialize()};
}
class Agent {
  constructor(store,provider){this.store=store;this.provider=provider;}
  check(command){const saved=this.store.load(command.id);need(saved.snapshot===command.snapshot&&saved.session.serialize().checksum===command.checksum,'STALE_SNAPSHOT: Öppna senaste kopian innan du ändrar.');return saved.session;}
  async propose(session){
    const req=P.request(session),folder=path.join(this.store.directory(session.view().id),'attempts',`${String(Date.now())}-${randomUUID()}`);
    fs.mkdirSync(folder,{recursive:true,mode:0o700});writeNew(path.join(folder,'request.json'),{request:req,producer:this.provider.identity});
    let outcome;
    try {
      const generated=await this.provider.generate(structuredClone(req));
      writeNew(path.join(folder,'response.json'),generated);
      need(Object.entries(this.provider.identity).every(([k,value])=>P.same(generated.metadata[k],value)),'PRODUCER_BINDING');
      const {proposal,questions}=P.build(session,req,generated.response);
      const trial=Session.restore(session.serialize());trial.submitProposal(proposal);
      const previous=trial.view().questions;
      const fresh=questions.filter(q=>!previous.some(old=>old.equivalence_key===q.equivalence_key&&P.same(old.target_ids,q.target_ids)&&['open','deferred'].includes(old.status)));
      trial.addQuestions(fresh);
      // Only explicit customer input can withdraw questions or dispose of SR findings.
      const snapshot=this.store.save(trial);
      outcome={status:'accepted',snapshot,session_checksum:trial.serialize().checksum,proposal_digest:C.digest(proposal),request_digest:req.digest,producer:generated.metadata,error:null};
    }catch(error){outcome={status:'rejected',request_digest:req.digest,producer:this.provider.identity,error:String(error.message).slice(0,2000)};}
    outcome.response_sha256=fs.existsSync(path.join(folder,'response.json'))?C.hash(fs.readFileSync(path.join(folder,'response.json'))):null;
    writeNew(path.join(folder,'outcome.json'),{...outcome,checksum:C.digest(outcome)});
    return describe(this.store,session.view().id);
  }
  async dispatch(command){
    need(command&&typeof command.action==='string','COMMAND_REQUIRED');
    if(command.action==='create'){
      const source=text(command.text);const s=this.store.create();s.registerSource({id:'description',text:source,replaces_version:null});this.store.save(s);return this.propose(s);
    }
    const s=this.check(command),v=s.view();
    if(command.action==='propose')return this.propose(s);
    if(command.action==='answer'){
      const q=v.questions.find(q=>q.id===command.question_id);need(q,'QUESTION_NOT_FOUND');
      const old=v.answers.filter(a=>a.question_id===q.id||q.merged_from.includes(a.question_id)).at(-1);
      s.answer({id:`a-${randomUUID()}`,question_id:q.id,text:text(command.text),replaces_answer_id:old?.id??null});
    }else if(command.action==='source'){
      const old=v.sources.filter(x=>x.id===command.source_id).at(-1);
      need(!old||old.kind==='document','Ändra svaret via dess fråga.');
      const id=old?.id??`document-${randomUUID()}`;
      s.registerSource({id,text:text(command.text),replaces_version:old?.version??null});
    }else if(command.action==='defer'||command.action==='withdraw'){
      s.setQuestionStatus({id:command.question_id,status:command.action==='defer'?'deferred':'withdrawn',reason:text(command.reason)});
    }else if(command.action==='pause'||command.action==='resume'){
      s.setLifecycle(command.action==='pause'?'paused':'active',command.action==='pause'?'Kunden pausar med synliga olösta frågor.':'Kunden återupptar beskrivningen.');
    }else throw Error('UNSUPPORTED_ACTION: ingen SR-granskning, bekräftelse eller körning i denna etapp.');
    this.store.save(s); // Evidence survives provider failure and immediately stales prior reviews/confirmations.
    if(['answer','source'].includes(command.action)&&v.lifecycle==='active')return this.propose(s);
    return describe(this.store,v.id);
  }
}
module.exports={Session,Store,Agent,describe,writeNew};
