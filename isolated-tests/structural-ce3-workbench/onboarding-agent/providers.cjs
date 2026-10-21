'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {C,roles,kinds,need,gap,resourceUnsupported}=require('./protocol.cjs');
const ask={requirement:'Vilka krav måste lösningen uppfylla?',goal:'Vad vill ni uppnå, och hur märker ni att målet är uppfyllt?',initial:'Hur ser läget ut innan ni fattar besluten – vad är redan klart och vad återstår?',decision:'Vilka konkreta beslut eller åtgärder kan ni välja?',dependency:'Vad måste vara uppfyllt innan respektive åtgärd kan genomföras?',external:'Vilka besked behövs från andra, och vad händer om de uteblir?',time:'Vilka tider är önskemål, vilka är fasta villkor, och vilka är fortfarande okända?',other:'Hur hör den här uppgiften ihop med målet eller besluten?'};
const prefix={krav:'requirement',mål:'goal',startläge:'initial',beslut:'decision',beroende:'dependency',beroenden:'dependency',besked:'external',tid:'time',tidsvillkor:'time',övrigt:'other'};
function classify(text, fallback) {
  const label=/^\s*([åäöa-z]+)\s*:/i.exec(text);
  if(label&&prefix[label[1].toLowerCase()])return prefix[label[1].toLowerCase()];
  if(fallback)return fallback;
  if(/vill |målet|mål |önskar|senast.*kunna/i.test(text))return 'goal';
  if(/nuläge|idag|i dag|redan|ännu|just nu|startläg/i.test(text))return 'initial';
  if(/innan|först när|förutsätt|kräver|beroende|måste.*före/i.test(text))return 'dependency';
  if(/besked|godkänn|tillstånd|klartecken|leverantör.*svar/i.test(text))return 'external';
  if(/dag\s*\d|veck[ao]\s*\d|timm|fördröj|deadline|datum/i.test(text))return 'time';
  if(/beslut|välja|alternativ|kan |ska |genomför|beställ|flytta|starta/i.test(text))return 'decision';
  return 'other';
}
function quote(source,text,start) {return {source_id:source.id,source_version:source.version,quote:text,start,end:start+text.length,location:`Inmatad text ${source.id}, version ${source.version}`};}
function missing(role) {return {id:`${role}-missing`,kind:kinds[role],statement:`${roles[role]} behöver beskrivas.`,type:'ai_proposal',status:'unknown',value:null,unit:null,refs:[],depends_on:[],supersedes:[],rationale:'Ingen entydig uppgift hittades av offlinehjälpen; detta är en fråga, inte en verksamhetsregel.',scenario_choice:null};}
function offline(req) {
  const current=req.sources.filter(s=>!req.sources.some(t=>s.id===t.id&&t.version>s.version));
  const items=[];
  for(const source of current) {
    const ans=req.dialogue.answers.find(a=>a.source_id===source.id&&a.source_version===source.version);
    const question=ans&&req.dialogue.questions.find(q=>q.id===ans.question_id||q.merged_from.includes(ans.question_id));
    const fallback=question?.target_ids[0]?.split('-')[0];
    let n=0;
    for(const m of source.content.matchAll(/[^\n.!?]+[.!?]?/g)) {
      const statement=m[0].trim();if(!statement)continue;
      const start=m.index+m[0].indexOf(statement),role=classify(statement,fallback);
      let id=`${role}-${source.id}-v${source.version}-${++n}`;
      if(question && n===1 && question.target_ids[0].startsWith(role+'-')) id=question.target_ids[0];
      const unknown=/vet inte|okän[dt]|osäker|saknas|inte bestämt|kanske/i.test(statement);
      const proposed=/antagande|föreslår|förslag|anta att|kanske/i.test(statement);
      const type=proposed?'ai_proposal':role==='goal'?'goal':['dependency','requirement'].includes(role)?'requirement':source.kind==='answer'?'user_fact':'document_fact';
      const priorIndex=items.findIndex(i=>i.id===id);if(priorIndex>=0)items.splice(priorIndex,1);
      items.push({id,kind:kinds[role],statement,type,status:unknown?'unknown':'known',value:unknown?null:statement,unit:null,
        refs:[quote(source,statement,start)],depends_on:[],supersedes:[],rationale:'Ordagrant utdrag. Kategorin är ett regelbaserat tolkningsförslag, inte AI- eller SR-granskning. Texten är ännu inte en motorregel.',scenario_choice:null});
    }
  }
  for(const role of Object.keys(roles).filter(r=>!['other','requirement'].includes(r)))if(!items.some(i=>i.id.startsWith(role+'-')))items.push(missing(role));
  // Detect only narrow, explicit contradictions. Different dates for different activities are not a conflict.
  const conflicting=(a,b)=>C.digest(a.match(/\d+/g)??[])!==C.digest(b.match(/\d+/g)??[]) || /\binte\b/i.test(a)!==/\binte\b/i.test(b);
  const skeleton=i=>i.statement.toLowerCase().replace(/\d+/g,'#').replace(/\binte\s+/g,'').replace(/[.!?]/g,'').trim();
  for(const a of items)for(const b of items)if(a.id<b.id&&a.refs.length&&b.refs.length&&skeleton(a)===skeleton(b)&&conflicting(a.statement,b.statement)) {
    a.status=b.status='conflict';a.value=b.value=null;
  }
  for(const old of req.previous_proposal?.items??[]) {
    const now=items.find(i=>i.id===old.id);
    if(now) {
      if(old.status==='superseded')Object.assign(now,old);
      // Do not declare a conflict resolved using the same evidence.
      else if(old.status==='conflict'&&now.status==='known'&&C.digest(old.refs)===C.digest(now.refs))Object.assign(now,{status:'conflict',value:null});
    } else if(old.status==='superseded')items.push(old);
    else {
      const replaced=old.id.endsWith('-missing') || (old.refs.length&&old.refs.every(r=>current.some(s=>s.id===r.source_id&&s.version>r.source_version)));
      items.push(replaced?{...old,status:'superseded'}:old);
    }
  }
  const active=items.filter(i=>i.status!=='superseded'),gaps=[],questions=[];
  for(const i of active) {
    const role=i.id.split('-')[0];let reason=null,kind='missing_data';
    if(i.status==='conflict'){reason='Underlaget anger motstridiga uppgifter. Båda citaten bevaras.';kind='conflict';}
    else if(i.status==='unknown')reason='Denna uppgift är ännu okänd.';
    else if(i.type==='ai_proposal')reason='Ett föreslaget antagande behöver prövas; det behandlas inte som fakta.';
    else if(role==='other')reason='Offlinehjälpen kan inte avgöra uppgiftens betydelse.';
    if(resourceUnsupported(i.statement)){reason='Kravet berör funktioner som inte täcks av den frysta kapabilitetsbasen. Villkoret bevaras utan förenkling.';kind='unsupported_profile';}
    if(reason) {
      gaps.push(gap(`agent-${i.id}`,[i.id],kind,reason));
      const text=kind==='conflict'?'Vilken uppgift ska gälla? Rätta den ursprungliga beskrivningen om den innehåller felet.':kind==='unsupported_profile'?'Vilken resursregel måste analysen bevara? Beskriv den; denna etapp kan inte räkna på resursfördelningen.':ask[role];
      questions.push({key:`clarify-${i.id}`,text,target_ids:[i.id],priority:kind==='conflict'||kind==='unsupported_profile'?1:['goal','decision','dependency'].includes(role)?2:3,reason});
    }
  }
  const goal=active.find(i=>i.id.startsWith('goal-')&&i.status==='known');
  return {schema_version:'ce3-onboarding-model-response/1',request_digest:req.digest,
    analysis:{kind:'check',question:goal?`Vilka förutsättningar och hinder gäller för: ${goal.statement}`:'Vilket mål ska beslutssituationen undersökas mot?',
      plan_ids:active.filter(i=>i.kind==='plan').map(i=>i.id),criterion_ids:active.filter(i=>i.kind==='criterion').map(i=>i.id),changed_assumption_ids:[]},
    scope:{includes:['Beskrivning av mål, startläge, beslut, beroenden, externa besked och tidsvillkor.'],
      excludes:['Kompilering, CE3-körning, fullständig SR-granskning och garanti om korrekt eller fullständigt underlag.','Offlinehjälpen gör ingen generell språkförståelse, optimering eller resursplanering.']},
    items,gaps,questions:questions.sort((a,b)=>a.priority-b.priority).slice(0,20)};
}
class OfflineProvider {
  identity={kind:'deterministic_offline',id:'swedish-intake-rules/1',model:null,label:'Regelbaserad offlinehjälp – ingen språkmodell, inga förskrivna fall'};
  async generate(req){return {response:offline(req),metadata:{...this.identity,model_calls:0}};}
}
class RecordedProvider {
  constructor(responses){this.responses=[...responses];}
  identity={kind:'scripted_test',id:'recorded-responses/1',model:null,label:'FÖRSKRIVNA TESTSVAR – INGEN MODELLKÖRNING'};
  async generate(req){need(this.responses.length,'TEST_TAPE_EXHAUSTED');const entry=this.responses.shift();return {response:typeof entry==='function'?entry(req):structuredClone(entry),metadata:{...this.identity,model_calls:0}};}
}
class LocalCommandProvider {
  constructor(command,args,model) {
    need(path.isAbsolute(command)&&Array.isArray(args)&&args.every(x=>typeof x==='string')&&typeof model==='string'&&model.trim(),'LOCAL_MODEL_CONFIGURATION');
    this.command=command;this.args=args;
    this.identity={kind:'local_model',id:'local-json-command/1',model,command_sha256:C.hash(fs.readFileSync(command)),label:`Lokalt modellprogram: ${model} (programmets identitet, ingen SR-granskning)`};
  }
  async generate(req) {
    need(C.hash(fs.readFileSync(this.command))===this.identity.command_sha256,'LOCAL_PROGRAM_CHANGED');
    const raw=await new Promise((resolve,reject)=>{
      const child=spawn(this.command,this.args,{shell:false,env:{PATH:process.env.PATH},stdio:['pipe','pipe','pipe']});
      let size=0,chunks=[],done=false;
      const end=(error,value)=>{if(done)return;done=true;clearTimeout(timer);if(error){child.kill('SIGKILL');reject(error);}else resolve(value);};
      const timer=setTimeout(()=>end(Error('LOCAL_MODEL_TIMEOUT')),45000);
      child.stdout.on('data',b=>{size+=b.length;if(size>1024*1024)end(Error('LOCAL_MODEL_OUTPUT_LIMIT'));else chunks.push(b);});
      child.stderr.resume(); // Do not persist arbitrary process diagnostics or environment details.
      child.on('error',()=>end(Error('LOCAL_MODEL_START_FAILED')));
      child.stdin.on('error',()=>end(Error('LOCAL_MODEL_INPUT_FAILED')));
      child.on('close',code=>end(code?Error('LOCAL_MODEL_FAILED'):null,Buffer.concat(chunks).toString('utf8')));
      child.stdin.end(JSON.stringify(req));
    });
    return {response:JSON.parse(raw),metadata:{...this.identity,model_calls:1}};
  }
}
module.exports={OfflineProvider,RecordedProvider,LocalCommandProvider,offline};
