'use strict';
// Synthetic, explicitly authored proposals. No inference, compilation or execution.
const C = require('../contracts/onboarding-v1/contract.cjs');
const { ref } = require('../onboarding-session/manual-example.cjs');
const question = 'Kan vi börja dag 2? Vad måste vara klart först, och vad händer om klartecknet kommer senare?';
// Whole, authored questions: never replace dates inside customer text.
const analysisOptions = [
  { text: 'Undersök om vi kan börja dag 3.', question: 'Kan vi börja dag 3? Vad måste vara klart först, och vad händer om klartecknet kommer senare?' },
  { text: 'Behåll frågan om vi kan börja dag 2.', question },
];
const choicePrefix = 'analysis-day-';
function pendingChoice(v) { return v.questions.find(q => q.id.startsWith(choicePrefix) && ['open', 'deferred'].includes(q.status)) ?? null; }
function analysisQuestion(v) {
  const choice = v.answers.filter(a => a.question_id.startsWith(choicePrefix)).at(-1);
  if (!choice) return question;
  const option = analysisOptions.find(o => o.text === choice.text);
  if (!option) throw Error('UNSCRIPTED_ANALYSIS_CHOICE');
  return option.question;
}
function relationship(p) {
  return p?.id === 'warehouse-demo' && p.items.find(i => i.id === 'target-day').value === 3 && p.analysis.question === question
    ? 'Önskad start är dag 3. Analysen ska fortfarande undersöka om start redan dag 2 är möjlig.' : null;
}
const situation = 'Vi vill börja använda ett nytt lagerdatasystem. Först behöver vi genomföra ett funktionsprov och få ett separat klartecken från beställaren. Vi hoppas kunna börja dag 2, men vet ännu inte när klartecknet kommer.';
const gapSituation = 'Vi vill börja använda ett nytt lagerdatasystem. Först behöver vi genomföra ett funktionsprov. Beställaren lämnar ett separat klartecken, men det är inte bestämt om det krävs före starten. Vi hoppas kunna börja dag 2, men vet ännu inte när klartecknet kommer.';
const cases = [
  {id:'warehouse',title:'Lagerdatasystem · tydligt underlag',description:'Syntetiskt exempel: kontrollera startvillkor och önskad start.',question,situation},
  {id:'warehouseerror',title:'Lagerdatasystem · feltolkning i förslaget',description:'Syntetiskt exempel: ett tidsmål blir felaktigt ett godkännande.',question,situation},
  {id:'warehousegap',title:'Lagerdatasystem · ett startvillkor är oklart',description:'Separat syntetiskt exempel: krävs klartecken före start?',question,situation:gapSituation},
];
const timingAnswers = ['Önskad start är dag 2.','Önskad start är dag 3.'];
const conditionAnswers = ['Ja, beställarens klartecken krävs före start.','Nej, funktionsprovet måste vara genomfört men klartecknet behöver inte komma före start.','Vet inte ännu.'];
function proposal(v,id) {
  const fixture=cases.find(c=>c.id===id), brief=v.sources.find(s=>s.id==='situation'), goal=v.sources.find(s=>s.id==='question');
  if (!fixture || brief.content!==fixture.situation || goal.content!==fixture.question) throw Error('UNSCRIPTED_INPUT');
  const prev=v.proposals.at(-1), gap=id==='warehousegap';
  const last=v.answers.filter(a => a.question_id === (gap ? 'start-condition' : 'timing')).at(-1);
  if (pendingChoice(v)) throw Error('ANALYSIS_CHOICE_REQUIRED');
  if(last && !(gap?conditionAnswers:timingAnswers).includes(last.text)) throw Error('UNSCRIPTED_ANSWER');
  const source=last?v.sources.find(s=>s.id===last.source_id&&s.version===last.source_version):brief;
  const unknown=gap&&(!last||last.text===conditionAnswers[2]), required=gap?(!unknown&&last.text===conditionAnswers[0]):true;
  const bad=id==='warehouseerror'&&!prev, day=last?.text===timingAnswers[1]?3:2;
  const rule=(key,kind,statement,type,value,src,quote,depends_on=[])=>({id:key,kind,statement,type,status:'known',value,unit:null,refs:[ref(src,quote)],depends_on,supersedes:[],rationale:'Förskrivet syntetiskt exempel, inte AI-genererat.',scenario_choice:null});
  const items=[
    rule('plan','plan','börja använda det nya lagerdatasystemet','user_fact','Lagerdatasystem',brief,'Vi vill börja använda ett nytt lagerdatasystem.',['criterion','approval']),
    rule('criterion','criterion','funktionsprovet genomföras','requirement',true,brief,gap?'Först behöver vi genomföra ett funktionsprov.':'Först behöver vi genomföra ett funktionsprov och få ett separat klartecken från beställaren.'),
    {...rule('approval','rule',bad?'Godkänt dag 2':unknown?'det är inte bestämt om beställarens klartecken krävs före start':required?'beställaren lämna klartecken':'beställarens klartecken behöver inte komma före start',bad?'document_fact':'requirement',bad?'Godkänt dag 2':unknown?null:required,gap&&last?source:brief,bad?'Vi hoppas kunna börja dag 2':gap?(last?last.text:'Beställaren lämnar ett separat klartecken, men det är inte bestämt om det krävs före starten.'):'Först behöver vi genomföra ett funktionsprov och få ett separat klartecken från beställaren.'),status:unknown?'unknown':'known'},
    {...rule('target-day','value',`dag ${day}`,'goal',day,!gap&&last?source:brief,!gap&&last?last.text:'Vi hoppas kunna börja dag 2'),unit:'dag enligt underlaget'},
  ];
  return {schema_version:'ce3-onboarding-proposal/1',id:'warehouse-demo',revision:(prev?.revision??0)+1,profile:'fixed-replay/0.1',
    analysis:{kind:'check',question:analysisQuestion(v),plan_ids:['plan'],criterion_ids:['criterion'],changed_assumption_ids:[]},
    scope:{includes:['Villkor före start och önskad startdag; senare klartecken kan undersökas med uttryckliga fasta antaganden'],excludes:['Prognos för när klartecknet faktiskt kommer','Resursbeläggning, sannolikheter och ekonomisk kalkyl']},
    sources:structuredClone(v.sources),items,
    gaps:[{id:'arrival-time',item_ids:['approval'],kind:'scope_limit',impact:'limits_conclusion',status:'accepted_limit',explanation:'när klartecknet kommer',resolution:'Tidpunkten är okänd enligt originalunderlaget. Beskrivningen kan bekräftas med denna begränsning. Ingen tid fylls i; fasta tidsantaganden och övriga körindata måste anges separat inför en senare analys.'}],
    change:{parent_digest:prev?C.digest(prev):null,changed_item_ids:prev?items.map(i=>i.id):[],affected_finding_ids:v.reviews.flatMap(r=>r.result.findings.map(f=>`${r.id}/${f.id}`)),reason:prev?'Uttryckligt förskrivet nytt förslag; ursprungliga källor och tidigare resultat bevaras.':'Syntetiskt lagerdatasystemfall. Inga utförda prov, lämnade klartecken eller verkliga starttider påstås.'}};
}
function summary(p) {
  const get=id=>p.items.find(i=>i.id===id), approval=get('approval');
  const condition=approval.type==='document_fact'?`${get('criterion').statement}. Förslaget påstår: ${approval.statement}.`:approval.status==='unknown'?`${get('criterion').statement}; ${approval.statement}.`:approval.value?`${get('criterion').statement} och ${approval.statement}.`:`${get('criterion').statement}; ${approval.statement}.`;
  return [
    {id:'plan',label:'Ni vill',text:get('plan').statement+'.'},
    {id:'condition',label:'Först måste',text:condition},
    {id:'time',label:'Önskad start',text:get('target-day').statement+'.'},
    {id:'unknown',label:'Fortfarande okänt',text:p.gaps.find(g=>g.id==='arrival-time').explanation+'.'},
    {id:'analysis',label:'Analysen ska undersöka',text:p.analysis.question},
  ];
}
module.exports={cases,proposal,summary,timingAnswers,conditionAnswers,analysisOptions,choicePrefix,pendingChoice,relationship};
