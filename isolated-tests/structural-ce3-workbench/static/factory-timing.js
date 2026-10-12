/* Observations only: real audited replay in, business-goal presentation out. */
const CE3FactoryTiming=(()=>{
 const MODEL='b2db6772571c4c3e6c198cdfd97d1a48413515cb567a7654a8817087407d7c8f';
 const enabled=p=>p?.model_identity===MODEL&&p?.factory_comparison==='factory-timing/1';
 const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 const equal=(a,b)=>canonical(a)===canonical(b);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const capable=s=>s.se_premises===true&&s.original_machine==='sweden_in_use'&&s.se_team===true;
 function intervals(model,rows,predicate){
  let active=predicate(model.initial),start=active?model.clock.start:null;
  const periods=[],transitions=[];
  for(const row of rows){
   // Audit has checked continuity. Read both sides, including zero-duration changes.
   for(const side of ['before','after']){
    const next=predicate(row[side].state);
    if(next===active)continue;
    transitions.push({step:row.step,index:row.index,action:row.action,side,from:active,to:next});
    if(next)start=row.step;
    else periods.push({start,end:row.step,length:row.step-start,open:false});
    active=next;
   }
  }
  if(active)periods.push({start,end:model.clock.horizon,length:model.clock.horizon-start,open:true});
  return {periods,duration:periods.reduce((n,p)=>n+p.length,0),transitions};
 }
 function observe(model,path){
  const rows=path.history.filter(r=>r.step>=model.clock.start&&r.step<=model.clock.horizon);
  const se=intervals(model,rows,capable),gap=intervals(model,rows,s=>!capable(s)&&!s.production_authorized);
  const loss=rows.flatMap(r=>['before','after'].map(side=>({step:r.step,state:r[side].state}))).find(x=>!capable(x.state));
  const start=rows.find(r=>r.kind==='decision_executed'&&r.action==='D8')?.step??null;
  const payments=rows.filter(r=>r.kind==='decision_executed').map(r=>({step:r.step,index:r.index,action:r.action,amount:r.before.state.budget-r.after.state.budget,
   before:Object.fromEntries(['bank','customer','quality'].map(k=>[k,r.before.state[k]]))}));
  const before=Object.fromEntries(['bank','customer','quality'].map(k=>[k,payments.filter(p=>p.before[k]!=='approved').reduce((n,p)=>n+p.amount,0)]));
  const blocked=rows.filter(r=>r.kind==='attempt_blocked').map(r=>({step:r.step,action:r.action,failures:r.failures}));
  return {metrics:{start,startGoal:start!==null&&start<=26,loss:capable(model.initial)?loss?.step??null:0,
   preserved:capable(model.initial)&&!loss,seWeeks:se.duration,sePeriods:se.periods,gapWeeks:gap.duration,gaps:gap.periods,
   before,spent:payments.reduce((n,p)=>n+p.amount,0),balance:rows.at(-1).after.state.budget,
   both:start!==null&&start<=26&&capable(model.initial)&&!loss,blocked},
   evidence:{machineArrival:rows.find(r=>r.action==='E_MOVED_MACHINE'&&r.kind==='event_applied')?.step??null,payments,seTransitions:se.transitions,gapTransitions:gap.transitions,
    decisions:rows.filter(r=>['decision_executed','attempt_blocked'].includes(r.kind)).map(r=>({step:r.step,index:r.index,action:r.action,kind:r.kind,failures:r.failures})),
    approvals:rows.filter(r=>['bank','customer','quality'].some(k=>r.before.state[k]!==r.after.state[k]&&r.after.state[k]==='approved')).map(r=>({step:r.step,index:r.index,action:r.action}))}};
 }
 function distribution(values){const map=new Map();for(const value of values){const key=canonical(value);if(!map.has(key))map.set(key,{value,count:0});map.get(key).count++;}return [...map.values()];}
 function assess(result,bundle,C){
  if(result.model_identity!==MODEL)throw Error('Fabriksmodellens identitet stämmer inte.');
  const spec={focus:{field:'production_authorized',op:'eq',value:true},gaps:[]};
  if(C.coverage(result,bundle,spec,{guard:spec.focus},26).status==='unknown')throw Error('Fullständiga och tekniskt granskade körspår för samtliga händelseordningar krävs.');
  const paths=bundle.paths.map(path=>observe(result.input.model,path));
  const metrics=Object.fromEntries(Object.keys(paths[0].metrics).map(key=>[key,distribution(paths.map(p=>p.metrics[key]))]));
  return {paths,metrics,varied:Object.values(metrics).some(v=>v.length>1),count:paths.length};
 }
 function expected(late,absent){
  const steps={'0':['D1','D2','D9','D7'],'2':['D3']};
  if(!late){steps['2'].push('D5');steps['6']=['D6'];steps['8']=['D8'];}
  else {if(!absent){steps['6']=['D5'];steps['10']=['D6'];}steps['12']=['D8'];}
  return Object.fromEntries(Object.entries(steps).map(([k,ids])=>[k,ids.map(decision=>({decision,mode:'attempt'}))]));
 }
 const periods=ps=>ps.length?ps.map(p=>`[${p.start}, ${p.end}${p.open?']':')'} · ${p.length} veckor${p.open?', kvarstår vid horisonten':''}${p.length===0?', endast övergångar inom samma vecka':''}`).join('; '):'Inga observerade glapp';
 const week=v=>v===null?'Inte genomförd till och med vecka 26':`Vecka ${v}`;
 const yes=v=>v?'Ja':'Nej';
 function summary(a,b,waiting=false){
  if(a.varied||b.varied)return 'I de här testade planerna varierar observationerna mellan händelseordningar. Tabellen och målstatusen visar samtliga värden och antal banor. Ingen enskild avvägning gäller för alla ordningar.';
  const x=a.paths[0].metrics,y=b.paths[0].metrics,d=y.seWeeks-x.seWeeks,z=x.before.customer-y.before.customer;
  const subject=waiting?'Den separat deklarerade väntplanen':'Senare flytt';
  const capacity=d===0?'Tiden med svensk produktionsförmåga är oförändrad.':`${subject} behåller svensk produktionsförmåga ${Math.abs(d)} veckor ${d>0?'längre':'kortare'}.`;
  const cost=z===0?'Utbetalningarna före kundgodkännande är oförändrade.':`Utbetalningarna före kundgodkännande ${z>0?'minskar':'ökar'} med ${Math.abs(z)} Mkr.`;
  const timing=x.start!==null&&y.start!==null?(x.start===y.start?'Polsk start godkänns samma vecka.':`Polsk start godkänns ${Math.abs(y.start-x.start)} veckor ${y.start>x.start?'senare':'tidigare'}.`):x.start===null&&y.start===null?'Ingen av planerna får polsk start godkänd till och med vecka 26.':`${x.start!==null?'Endast den tidiga planen':'Endast den senare planen'} får polsk start godkänd till och med vecka 26.`;
  const gap=x.gapWeeks===y.gapWeeks?(x.gapWeeks===0?(x.gaps.length||y.gaps.length?'Glapp med noll modellerad varaktighet observeras inom samma vecka.':'Inget glapp observeras.'):`Glappet är oförändrat: ${x.gapWeeks} veckor i båda planerna.`):`Till och med vecka 26 ${y.gapWeeks<x.gapWeeks?'minskar':'ökar'} glappet från ${x.gapWeeks} till ${y.gapWeeks} veckor.`;
  const startGoal=x.startGoal&&y.startGoal?'Båda klarar start senast vecka 26.':!x.startGoal&&!y.startGoal?'Ingen klarar startmålet.':`${x.startGoal?'Endast den tidiga':'Endast den senare'} planen klarar startmålet.`;
  const preservation=x.preserved&&y.preserved?'Båda bevarar svensk förmåga hela perioden.':!x.preserved&&!y.preserved?'Ingen bevarar svensk förmåga hela perioden.':`${x.preserved?'Endast den tidiga planen':waiting?'Endast väntplanen':'Endast den senare planen'} bevarar svensk förmåga hela perioden.`;
  return `I de här testade planerna: ${capacity} ${cost} ${timing} ${gap} ${startGoal} ${preservation}`;
 }
 function render(c,C,p){
  try{
   const results=[c.left,c.right],bundles=[c.allA,c.allB];
   for(const key of ['model','sources','outcomes'])if(!equal(c.left.input[key],c.right.input[key]))throw Error('Samma modell, budget, startläge, horisont och besked krävs.');
   const absent=c.left.input.outcomes.E_CUSTOMER==='absent';
   if(results.some(r=>r.input.outcomes.E_BANK!=='approved'||r.input.outcomes.E_QUALITY!=='approved'||!['approved','absent'].includes(r.input.outcomes.E_CUSTOMER)))throw Error('Öppna ett deklarerat tidsjämförelsescenario.');
   const early=results.findIndex(r=>equal(r.input.script.steps,expected(false,absent))),late=results.findIndex(r=>equal(r.input.script.steps,expected(true,absent)));
   if(early<0||late<0||early===late)throw Error('Planerna har ändrats. Körspåren finns i planvyn; denna jämförelse kräver de deklarerade tidsplanerna.');
   const checks=results.map((r,i)=>assess(r,bundles[i],C)),names=results.map(r=>r.record.plan_name);
   const values=(check,project)=>{const variants=distribution(check.paths.map(path=>project(path.metrics,path.evidence)));return variants.map(x=>`${esc(x.value)}${variants.length>1?` <small>(${x.count} av ${check.count} banor)</small>`:''}`).join('<br>');};
   const cell=(check,key,format)=>values(check,m=>format(m[key]));
   const row=(title,key,format)=>`<tr><th scope="row">${esc(title)}</th>${checks.map(o=>`<td>${cell(o,key,format)}</td>`).join('')}</tr>`;
   const combinedRow=(title,project)=>`<tr><th scope="row">${esc(title)}</th>${checks.map(o=>`<td>${values(o,project)}</td>`).join('')}</tr>`;
   const blocking=rows=>rows.length?rows.map(r=>`Vecka ${r.step}: saknar ${r.failures.map(f=>({customer:'kundgodkännande',quality:'godkänd kvalitet',pl_machines:'maskin i Polen'}[f.field]||p.failures([f]))).join(', ')}.`).join(' / '):'Inga blockerade försök';
   const plan=r=>Object.entries(r.input.script.steps).map(([t,rows])=>`<li>Vecka ${esc(t)}: ${rows.map((x,i)=>`${i+1}. ${esc(p.name(x.decision,'decisions'))}`).join(' → ')}</li>`).join('');
   const plainGaps=ps=>ps.length?ps.map(g=>`${g.length} veckor · vecka ${g.start}–${g.end}${g.open?', glappet kvarstår vid vecka '+g.end:''}${g.length===0?', inom samma vecka':''}`).join('; '):'Inget glapp till och med vecka 26';
   const causes=checks.map((o,i)=>`<div><h3>${esc(names[i])}</h3><p>${values(o,(m,ev)=>{
    const ds=ev.decisions,move=ds.find(d=>d.action==='D5'),quality=ds.find(d=>d.action==='D6'),approval=ev.approvals.find(d=>d.action==='E_QUALITY');
    const pieces=[move?.kind==='decision_executed'?`Maskinen flyttas vecka ${move.step}`:move?'Flyttförsöket blockeras':'Planen avstår från flytt och kvalitetsprövning inom perioden',m.loss===null?'svensk förmåga finns kvar till och med vecka 26':`svensk förmåga förloras första gången vecka ${m.loss}`,ev.machineArrival===null?'maskinen blir inte tillgänglig i Polen inom perioden':`maskinen tillgänglig i Polen vecka ${ev.machineArrival}`];
    if(quality)pieces.push(quality.kind==='decision_executed'?`kvalitetsprövning beställs vecka ${quality.step}`:`kvalitetsförsöket blockeras vecka ${quality.step}`);
    if(approval)pieces.push(`kvaliteten godkänns vecka ${approval.step}`);
    pieces.push(m.start===null?'ingen godkänd polsk start till och med vecka 26':`polsk start godkänns vecka ${m.start}`);
    return pieces.join(' → ')+'.';
   })}</p></div>`).join('');
   const goals=`<div class="timing-goals" aria-label="De två delmålen">${checks.map((o,i)=>`<div><strong>${esc(names[i])}</strong><p>Start senast vecka 26: <b>${cell(o,'startGoal',yes)}</b><br>Svensk förmåga hela vecka 0–26: <b>${cell(o,'preserved',yes)}</b></p></div>`).join('')}</div>`;
   return `<section class="panel factory-result timing-result"><p class="eyebrow">RESULTAT · ${absent?'KUNDBESKED UTEBLIR':'KUNDGODKÄNNANDE KOMMER'}</p><h2>Vad vinner och förlorar vi?</h2><p class="story-lead">${esc(summary(checks[early],checks[late],absent))}</p>${goals}<div class="table-scroll factory-table timing-main-table" tabindex="0" aria-label="Avvägningen mellan tidig och senare flytt"><table><thead><tr><th>Mått</th>${names.map(n=>`<th scope="col">${esc(n)}</th>`).join('')}</tr></thead><tbody>${row('Godkänd start i Polen','start',week)}${combinedRow('Svensk produktionsförmåga',m=>`${m.seWeeks} veckor · ${m.loss===null?'ingen förlust till och med vecka 26':`första förlust vecka ${m.loss}`}`)}${row('Glapp utan svensk förmåga eller godkänd polsk start','gaps',plainGaps)}${row('Utbetalt före kundgodkännande','before',v=>`${v.customer} Mkr`)}${row('Totalt utbetalt','spent',v=>`${v} Mkr`)}</tbody></table></div><p class="hint">Glappet är tiden då svensk produktionsförmåga saknas och polsk start ännu inte har godkänts. Det är ett modellerat tillståndsglapp, inte uppmätt produktionsförlust eller intäktsbortfall. ${absent?'När kundgodkännandet uteblir räknas utbetalningarna utan godkännande till och med vecka 26.':''}</p><h3>Varför blir det så?</h3><p>${absent?'Väntplanen avstår uttryckligen från att flytta maskinen och beställa kvalitetsprövning inom perioden. Detta är ett separat deklarerat planval; motorn har inte själv valt att vänta.':'Samma åtgärder prövas vid ändrade tidpunkter. Senare flytt gör att maskinen kan stanna längre i Sverige, men också att den blir tillgänglig senare för kvalitetsprövning i Polen.'}</p><div class="timing-causes">${causes}</div><details class="timing-details"><summary>Övriga mått, fullständiga planer och tekniska detaljer</summary><div class="table-scroll factory-table"><table><thead><tr><th>Detaljmått</th>${names.map(n=>`<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>${row('Glappens intervall','gaps',periods)}${row('Utbetalt utan godkänt bankbesked','before',v=>`${v.bank} Mkr`)}${row('Utbetalt utan godkänt kvalitetsbesked','before',v=>`${v.quality} Mkr`)}${row('Budget kvar','balance',v=>`${v} Mkr`)}${row('Antal blockerade försök','blocked',v=>v.length)}${row('Blockerade försök och saknade villkor','blocked',blocking)}${row('Båda ursprungliga delmålen','both',yes)}</tbody></table></div><p>${absent?'D5 och D6 försöks inte i väntplanen; D8 vecka 12 är ett diagnostiskt försök.':'D5 flyttas 2→6, D6 6→10 och D8 8→12. Övriga beslut och deras ordning är oförändrade.'}</p><p>Intervall [a,b) slutar vid övergången vecka b. Öppet intervall räknas bara till horisonten 26, utan antaget slut därefter. Förfluten modelltid 0–26 är 26 veckor; händelser samma vecka har noll modellerad tid emellan men kontrolleras i ordning.</p><p>Svensk förmåga = lokal + maskin i bruk i Sverige + arbetslag. Kontrollerat initialt samt före och efter varje övergång, inklusive vecka 26. Varaktigheter summerar intervall mellan övergångar; även tillfälliga förluster med noll varaktighet gör delmålet falskt.</p><p>Utbetalningar mäts från budgetminskningen i genomförda beslut. För varje besked räknas betalningar vars tillstånd <em>före beslutet</em> inte är approved. Godkänd händelse före ett beslut samma vecka räknas alltså först. Vid uteblivet eller ännu inte begärt besked räknas betalningar till horisonten. Raderna överlappar och ska inte summeras. Detta är varken förlustvärden eller påståenden om oåterkalleliga betalningar. Initialt 8 Mkr, banktillskott 6 Mkr; ingen drift eller lönsamhet modelleras.</p><p>Vald vecka 6: polskt arbetslag färdigt (D3 vecka 2 + 4), kundbesked vecka 3 och bankbesked vecka 2. D2 vecka 0 klarar sista avtalsvecka 4; D9 vecka 0 klarar sista säkringsvecka 6. Kvalitetsbesked kan inte inväntas före flytten: D6 kräver redan maskin i Polen. Inga nya motorförvillkor.</p><p>Profilen fixed-replay/0.1 stöder endast attempt och if_not_taken, inga allmänna villkorade planer. Uteblivet-besked-väntan väljs uttryckligen som separat fast skript; motorn väljer inte att vänta.</p>${results.map((r,i)=>`<h3>${esc(names[i])}</h3><ul>${plan(r)}</ul><p>${esc(r.input.script.source)}</p><p>${r.status==='COMPLETE'?'Slutförd körning (COMPLETE)':'Ej slutförd körning'} · ${r.audit.status==='PASS'?'Godkänd teknisk granskning (PASS)':'Teknisk granskning ej godkänd'}. ${checks[i].count} kontrollerade händelseordningar. ${checks[i].varied?'Måtten varierar; alla värden visas ovan.':'Tabellmåtten är lika i alla ordningar.'} Teknisk status betyder inte uppfyllda verksamhetsmål.</p>`).join('')}<details><summary>Samtliga observationer, identiteter och ursprungliga körspår</summary><pre>${esc(JSON.stringify(results.map((r,i)=>({record:r.record,input:r.input,audit:r.audit,observations:checks[i].paths,paths:bundles[i].paths})),null,2))}</pre></details></details><p class="hint">I de här testade planerna. Ingen sökning efter bästa plan, inga slutsatser om generell omöjlighet eller verifierad kundnytta.</p></section>`;
  }catch(e){return `<section class="panel story-warning"><h2>Jämförelsen kan inte styrkas</h2><p>${esc(e.message)}</p></section>`;}
 }
 function intro(project=null){
  const outcomes=project?.plans?.map(p=>p.outcomes.E_CUSTOMER)||[];
  const active=outcomes.length&&outcomes.every(v=>v===outcomes[0])?outcomes[0]:null;
  const choices=[['base','approved','Kundgodkännande kommer'],['customer_absent','absent','Kundbesked uteblir']];
  return `<section class="panel tint timing-intro"><p class="eyebrow">FABRIKEN · ÄNDRADE TIDPUNKTER FÖR SAMMA ÅTGÄRDER</p><${project?'h1':'h2'}>Vad vinner och förlorar vi på att flytta maskinen senare, och klarar den testade planen fortfarande godkänd produktionsstart i Polen senast vecka 26?</${project?'h1':'h2'}><p>Vi jämför flytt vecka 2 med flytt vecka 6, efter fler förberedelser och besked. Samma konstruerade fabriksfall, budget och horisont. Köp kontra flytt finns kvar som separat strategijämförelse.</p><fieldset class="timing-scenarios"><legend>Välj kundbesked · samma för båda planerna</legend><div class="actions">${choices.map(([id,value,label])=>`<button data-action="factory-timing" data-scenario="${id}" aria-pressed="${active===value}" ${active===value?'disabled':''}>${label}${active===value?' · valt':''}</button>`).join('')}</div></fieldset><p class="hint">${active==='absent'?'Aktuellt scenario: kundbeskedet uteblir. Den senare planen väntar uttryckligen med flytt och kvalitetsprövning; motorn väljer inte att vänta.':active==='approved'?'Aktuellt scenario: kundgodkännandet kommer. Bank- och kvalitetsbesked är också godkända.':'Välj ett scenario för att öppna två deklarerade planer. Tidigare sparade scenarier finns kvar på projektsidan.'}</p></section>`;
 }
 return {enabled,observe,intervals,assess,summary,render,intro,expected};
})();
if(typeof module!=='undefined')module.exports=CE3FactoryTiming;
