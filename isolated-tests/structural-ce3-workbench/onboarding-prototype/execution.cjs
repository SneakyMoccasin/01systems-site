'use strict';
// A closed, deterministic translation for the authored warehouse demo only.
// Session/2 remains the sole authority for confirmation and evidence history.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process');
const C=require('../contracts/onboarding-v1/contract.cjs');
const {Session}=require('../onboarding-session/v2/session.cjs');
const W=require('./warehouse.cjs');
const need=(ok,message)=>{if(!ok)throw Error(message);};
const version='ce3-warehouse-experiment/1';
function binding(session) {
  const v=session.view();
  need(v.statuses.confirmation==='confirmed','Aktuell kundbekräftelse krävs före testkörning.');
  // Check the actual handoff gate, without creating a new confirmation.
  Session.restore(session.serialize()).createHandoff(`execution-check-${randomUUID()}`);
  return {session_id:v.id,proposal_digest:v.proposal_digest,evidence_digest:v.evidence_digest,context_digest:v.context_digest,
    confirmation:v.confirmations_v2.at(-1),review_binding:v.current_review.binding};
}
function translate(session, finishDay) {
  const b=binding(session),v=session.view(),p=v.proposals.at(-1),caseId=v.id.split('_')[0];
  need(W.cases.some(c=>c.id===caseId),'Körprovet stöder endast det syntetiska lagerexemplet.');
  const expected=W.proposal(v,caseId),semantic=x=>{const {revision,change,...rest}=x;return rest;};
  need(C.digest(semantic(p))===C.digest(semantic(expected)),'Förslaget innehåller uppgifter som den avgränsade översättningen inte stöder.');
  const day=W.analysisOptions.find(o=>o.question===p.analysis.question)===W.analysisOptions[0]?3:2;
  const approval=p.items.find(i=>i.id==='approval');
  need(approval.status==='known'&&approval.type==='requirement'&&typeof approval.value==='boolean','Kravet på klartecken måste vara uttryckligen känt.');
  need(Number.isInteger(finishDay)&&finishDay>=1&&finishDay<=day+1,'Välj en hel dag för funktionsprovet inom testets ram.');
  const horizon=day+1,effect=(field,value)=>({set:{[field]:value},add:{}}),guard=field=>({field,op:'eq',value:true});
  const assumptions={synthetic:true,analysis_day:day,function_test_start:0,function_test_finish:finishDay,
    approval_on_time:day,approval_late:day+1,horizon,start_attempts:[day,horizon],external_outcome:'received',
    initial:'Funktionsprov ej klart, klartecken ej mottaget, drift ej startad.',
    order:'Händelser före beslutsförsök varje dag; båda ordningar prövas om händelser sammanfaller.',
    money:'Ingen ekonomisk analys. Tekniska beslutskostnader är 0 eftersom modellen saknar budgetkonto; detta påstår inte att verksamheten är kostnadsfri.'};
  const coverage={
    translated:[{item:'plan',to:'decisions.start',meaning:p.items.find(i=>i.id==='plan').statement},
      {item:'criterion',to:'decisions.function_test → events.test_done → start.requires.test_done',meaning:'Funktionsprovet genomförs före start.'},
      {item:'approval',to:approval.value?'events.approval → start.requires.approval_received':'events.approval; inget klarteckenkrav på start',meaning:approval.statement}],
    observed:[{item:'target-day',value:p.items.find(i=>i.id==='target-day').value,meaning:'Önskat startmål bevaras som beskrivning; försöksdagen styrs separat av aktuell analysfråga.'},
      {item:'analysis',value:p.analysis,meaning:'Frågan styr analysdag och efterhandskontroll av faktiskt startförsök; ingen plansökning.'}],
    limitations:[...p.scope.excludes,'Den okända verkliga klarteckentiden är fortsatt okänd. De två beskedstiderna är endast testantaganden.',
      'Startögonblicket modelleras, inte systemets fortsatta drift eller funktionsprovets interna arbete.',
      'Beroendet till approval avser den uttryckliga regeln; ett nej gör inte mottaget klartecken till förvillkor.'],
    preserved:'Samtliga källor, referenser, klassificeringar, analys, omfattning, luckor och ändringshistorik bevaras i den bundna sessionen. De blir inte automatiskt motorregler.'};
  const scenarios=[['on_time','Klartecken i tid',day],['late','Klartecken senare',day+1]].map(([id,label,due])=>{
    const source=`${version}/${p.id}/${p.revision}`;
    const model={schema_version:'ce3-model/1',source,clock:{start:0,horizon,step:1,unit:'syntetisk dag',events_before_decisions:true,horizon_inclusive:true},
      domains:{test_done:{enum:[false,true]},approval_received:{enum:[false,true]},started:{enum:[false,true]}},
      initial:{test_done:false,approval_received:false,started:false},budget:null,
      decisions:{function_test:{requires:[],effects:{set:{},add:{}},cost:0,schedule:{event:'test_done',delay:finishDay},source:source+'/criterion'},
        start:{requires:[guard('test_done'),...(approval.value?[guard('approval_received')]:[])],effects:effect('started',true),cost:0,schedule:null,source:source+'/plan+approval'}},
      events:{test_done:{requires:[],kind:'timer',outcomes:{completed:effect('test_done',true)},absent:null,source:source+'/criterion+synthetic-duration'},
        approval:{requires:[],kind:'external',outcomes:{received:effect('approval_received',true),absent:effect('approval_received',false)},absent:{outcome:'absent',field:'approval_received',value:false,source:'Explicit waiting branch; not selected in these two scenarios'},source:source+'/approval+synthetic-arrival'}},
      initial_events:[{id:'approval',due,scheduled_at:0}],reference_event_order:['test_done','approval'],
      metadata:{assumption:'Syntetiska testförutsättningar, inga nya kundfakta. '+assumptions.money,time_basis:assumptions.order,deadlines:[]}};
    const input={schema_version:'ce3-run/1',profile:'fixed-replay/0.1',model,
      script:{schema_version:'ce3-script/1',source:'Explicit testplan: genomför prov dag 0, försök starta analysdagen, nytt försök vid horisonten endast om ej startat.',steps:{'0':[{decision:'function_test',mode:'attempt'}],[day]:[{decision:'start',mode:'attempt'}],[horizon]:[{decision:'start',mode:'if_not_taken'}]}},
      outcomes:{approval:'received'},sources:{proposal:b.proposal_digest,evidence:b.evidence_digest,confirmation:C.digest(b.confirmation),test_assumptions:C.digest(assumptions)}};
    return {id,label,approval_day:due,input};
  });
  return {version,binding:b,question:p.analysis.question,proposal_revision:p.revision,assumptions,coverage,scenarios};
}
function available(session) {
  try {const payload=translate(session,1);return {allowed:true,analysis_day:payload.assumptions.analysis_day};}
  catch(e){return {allowed:false,reason:e.message};}
}
function python(operation,folder,payload) {
  const r=spawnSync('python3',['-B',path.join(__dirname,'execution_bridge.py'),operation,folder],{input:JSON.stringify(payload),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,env:{PATH:process.env.PATH}});
  if(r.error)throw Error('Körprovet avbröts. Sparade försök bevaras; öppna historiken innan du provar på nytt.');
  let out;try{out=JSON.parse(r.stdout);}catch{throw Error('Körprovet saknar läsbart slutbesked. Tidigare data bevaras.');}
  need(r.status===0&&!out.error,out.error||'Körprovet misslyckades.');return out;
}
function readRequest(store,id,experiment) {
  need(/^[a-f0-9-]{36}$/.test(experiment),'Ogiltig testidentitet.');
  const folder=path.join(store.directory(id),'experiments',experiment),record=JSON.parse(fs.readFileSync(path.join(folder,'request.json'),'utf8'));
  const {checksum,...data}=record;need(checksum===C.digest(data)&&data.version===version&&data.id===experiment,'Testarkivets integritet stämmer inte.');
  const saved=store.load(id,data.snapshot);
  need(saved.session.serialize().checksum===data.session_checksum,'Testets ursprungliga sessionskopia stämmer inte.');
  need(C.digest(translate(saved.session,data.payload.assumptions.function_test_finish))===C.digest(data.payload),'Testets översättning eller versionsbindning har ändrats.');
  return {folder,record};
}
function list(store,id,session,latest) {
  const root=path.join(store.directory(id),'experiments');if(!fs.existsSync(root))return [];
  let currentBinding;try{currentBinding=C.digest(binding(session));}catch{}
  const rows=fs.readdirSync(root).filter(n=>/^[a-f0-9-]{36}$/.test(n)).map(name=>{
    try {const {folder,record}=readRequest(store,id,name);return {...record,result:python('read',folder,record.payload),matches:latest&&C.digest(record.payload.binding)===currentBinding};}
    catch(e){return {id:name,error:e.message,current:false};}
  }).sort((a,b)=>(a.created_at??'').localeCompare(b.created_at??''));
  const newest=rows.at(-1);
  return rows.map(r=>({...r,current:!rows.some(x=>x.error)&&r===newest&&r.matches===true}));
}
function prepare(store,session,snapshot,finishDay) {
  const payload=translate(session,finishDay);python('validate',store.directory(session.view().id),payload);
  const id=randomUUID(),record={version,id,created_at:new Date().toISOString(),snapshot,session_checksum:session.serialize().checksum,payload};
  const folder=path.join(store.directory(session.view().id),'experiments',id);fs.mkdirSync(folder,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(folder,'request.json'),JSON.stringify({...record,checksum:C.digest(record)}),{flag:'wx',mode:0o600});return id;
}
function run(store,session,experiment) {
  const id=session.view().id,{folder,record}=readRequest(store,id,experiment);
  need(C.digest(binding(session))===C.digest(record.payload.binding),'Bekräftelsen eller underlaget har ändrats. Förbered ett nytt test.');
  const rows=list(store,id,session,true);need(rows.at(-1)?.id===experiment&&rows.at(-1)?.current,'Testförutsättningarna är historiska. Förbered ett nytt test.');
  return python('run',folder,record.payload);
}
module.exports={translate,binding,available,list,prepare,run};
