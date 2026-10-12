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
  if(a.varied||b.varied)return 'I de här testade planerna varierar observationerna mellan händelseordningar. Tabellen visar samtliga värden och antal banor; ingen enskild differens gäller för alla ordningar.';
  const x=a.paths[0].metrics,y=b.paths[0].metrics,d=y.seWeeks-x.seWeeks,z=x.before.customer-y.before.customer;
  const timing=x.start!==null&&y.start!==null?(x.start===y.start?'Godkänd start i Polen sker samma vecka.':`Godkänd start i Polen sker ${Math.abs(y.start-x.start)} veckor ${y.start>x.start?'senare':'tidigare'}.`):x.start===null&&y.start===null?'Ingen av planerna får produktionsstart godkänd inom horisonten.':'Bara en av planerna får produktionsstart godkänd inom horisonten.';
  return `I de här testade planerna ${d===0?'är antalet veckor med svensk förmåga oförändrat':`bevarar ${waiting?'den separat deklarerade väntplanen':'senare flytt'} svensk förmåga ${Math.abs(d)} veckor ${d>0?'längre':'kortare'}`}. ${timing} Utbetalningar utan godkänt kundbesked ${z===0?'är oförändrade':`${z>0?'minskar':'ökar'} med ${Math.abs(z)} Mkr`}.`;
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
   const cell=(check,key,format)=>{const values=distribution(check.paths.map(p=>format(p.metrics[key])));return values.map(x=>`${esc(x.value)}${values.length>1?` <small>(${x.count} av ${check.count} banor)</small>`:''}`).join('<br>');};
   const row=(title,key,format)=>`<tr><th scope="row">${esc(title)}</th>${checks.map(o=>`<td>${cell(o,key,format)}</td>`).join('')}</tr>`;
   const blocking=rows=>rows.length?rows.map(r=>`Vecka ${r.step}: saknar ${r.failures.map(f=>({customer:'kundgodkännande',quality:'godkänd kvalitet',pl_machines:'maskin i Polen'}[f.field]||p.failures([f]))).join(', ')}.`).join(' / '):'Inga blockerade försök';
   const plan=r=>Object.entries(r.input.script.steps).map(([t,rows])=>`<li>Vecka ${esc(t)}: ${rows.map((x,i)=>`${i+1}. ${esc(p.name(x.decision,'decisions'))}`).join(' → ')}</li>`).join('');
   const explanations=checks.map((o,i)=>{
    const variants=distribution(o.paths.map(path=>({decisions:path.evidence.decisions,arrival:path.evidence.machineArrival})));
    return `<h3>${esc(names[i])}</h3>${variants.map(({value:ev,count})=>{const ds=ev.decisions;
     const move=ds.find(d=>d.action==='D5'),quality=ds.find(d=>d.action==='D6'),start=ds.find(d=>d.action==='D8');
     return `<p>${move?.kind==='decision_executed'?`Flyttbeslutet genomförs vecka ${move.step}: maskinen går från svensk drift till transport. Svensk förmåga upphör då. Körspåret visar maskinens ankomst i Polen ${ev.arrival===null?'inte inom horisonten':`vecka ${ev.arrival}`}.`:move?`Flyttförsöket vecka ${move.step} blockeras: ${esc(p.failures(move.failures))}.`:'Ingen flytt prövas: avsiktlig väntan i den separat deklarerade planen, inte en motorblockering.'} ${quality?.kind==='decision_executed'?`Kvalitetsprövningen kan beställas vecka ${quality.step}, när lokal, maskin, arbetslag och budget uppfyller förvillkoren.`:quality?`Kvalitetsförsöket blockeras: ${esc(p.failures(quality.failures))}`:'Ingen kvalitetsprövning beställs i väntplanen.'} ${start?.kind==='decision_executed'?`Start godkänns vecka ${start.step}.`:start?`Startförsöket vecka ${start.step} blockeras: ${esc(p.failures(start.failures))}`:'Inget startförsök.'}${variants.length>1?` (${count} av ${o.count} banor)` :''}</p>`;
    }).join('')}`;
   }).join('');
   return `<section class="panel factory-result timing-result"><p class="eyebrow">TIDPUNKTSJÄMFÖRELSE · ${absent?'UTEBLIVET KUNDBESKED':'GRUNDSCENARIO'}</p><h2>Värdet av att flytta senare</h2><p class="story-lead">${esc(summary(checks[early],checks[late],absent))}</p><p><strong>Båda ursprungliga delmålen?</strong> ${checks.map((o,i)=>`${esc(names[i])}: ${cell(o,'both',yes)}`).join(' · ')}. Senare förlust är inte bevarad svensk förmåga hela vecka 0–26.</p><div class="table-scroll factory-table" tabindex="0" aria-label="Värdet av ändrad flyttidpunkt"><table><thead><tr><th>Mått</th>${names.map(n=>`<th scope="col">${esc(n)}</th>`).join('')}</tr></thead><tbody>${row('Godkänd start i Polen','start',week)}${row('Startmålet senast vecka 26','startGoal',yes)}${row('Första förlust av svensk förmåga','loss',v=>v===null?'Ingen till och med vecka 26':week(v))}${row('Modellerade veckor med svensk förmåga','seWeeks',v=>`${v} veckor`)}${row('Svensk förmåga hela vecka 0–26','preserved',yes)}${row('Varken svensk förmåga eller godkänd polsk start','gaps',periods)}${row('Utbetalt utan godkänt bankbesked','before',v=>`${v.bank} Mkr`)}${row('Utbetalt utan godkänt kundbesked','before',v=>`${v.customer} Mkr`)}${row('Utbetalt utan godkänt kvalitetsbesked','before',v=>`${v.quality} Mkr`)}${row('Totalt utbetalt','spent',v=>`${v} Mkr`)}${row('Budget kvar','balance',v=>`${v} Mkr`)}${row('Blockerade beslutsförsök','blocked',blocking)}${row('Båda ursprungliga delmålen','both',yes)}</tbody></table></div><p class="hint">Tidsmått avser förfluten modelltid 0–26: maximalt 26 veckor, inte 27 veckopunkter. [2, 8) slutar vid övergången vecka 8. Ett öppet glapp räknas bara till 26. Händelser och beslut samma vecka har noll modellerad tid emellan; deras ordning kontrolleras ändå. Glapp är tillståndsglapp, inte uppmätt produktionsförlust eller intäktsbortfall.</p><h3>Vad ändrades och varför?</h3><p>${absent?'Den tidiga planen är oförändrad. Den senare är en separat scenarioplan: D5 och D6 utgår inom horisonten; D8 vecka 12 är ett diagnostiskt försök. Samma avsedda etableringsåtgärder kvarstår, men de två körda skripten är därför inte längre en ren tidsförskjutning.':'D5 flyttas från vecka 2 till 6, D6 från 6 till 10 och D8 från 8 till 12. Alla andra försök och deras ordning är lika. Samma åtgärder och kostnadsregler; både tidpunkter och beslutens placering i förhållande till händelser ändras.'}</p>${explanations}<details><summary>Definitioner, fullständiga planer och teknisk kontroll</summary><p>Svensk förmåga = lokal + maskin i bruk i Sverige + arbetslag. Kontrollerat initialt samt före och efter varje övergång, inklusive vecka 26. Varaktigheter summerar intervall mellan övergångar; även tillfälliga förluster med noll varaktighet gör delmålet falskt.</p><p>Utbetalningar mäts från budgetminskningen i genomförda beslut. För varje besked räknas betalningar vars tillstånd <em>före beslutet</em> inte är approved. Godkänd händelse före ett beslut samma vecka räknas alltså först. Vid uteblivet eller ännu inte begärt besked räknas betalningar till horisonten. Raderna överlappar och ska inte summeras. Detta är varken förlustvärden eller påståenden om oåterkalleliga betalningar. Initialt 8 Mkr, banktillskott 6 Mkr; ingen drift eller lönsamhet modelleras.</p><p>Vald vecka 6: polskt arbetslag färdigt (D3 vecka 2 + 4), kundbesked vecka 3 och bankbesked vecka 2. D2 vecka 0 klarar sista avtalsvecka 4; D9 vecka 0 klarar sista säkringsvecka 6. Kvalitetsbesked kan inte inväntas före flytten: D6 kräver redan maskin i Polen. Inga nya motorförvillkor.</p><p>Profilen fixed-replay/0.1 stöder endast attempt och if_not_taken, inga allmänna villkorade planer. Uteblivet-besked-väntan väljs uttryckligen som separat fast skript; motorn väljer inte att vänta.</p>${results.map((r,i)=>`<h3>${esc(names[i])}</h3><ul>${plan(r)}</ul><p>${esc(r.input.script.source)}</p><p>${r.status==='COMPLETE'?'Slutförd körning (COMPLETE)':'Ej slutförd körning'} · ${r.audit.status==='PASS'?'Godkänd teknisk granskning (PASS)':'Teknisk granskning ej godkänd'}. ${checks[i].count} kontrollerade händelseordningar. ${checks[i].varied?'Måtten varierar; alla värden visas ovan.':'Tabellmåtten är lika i alla ordningar.'} Teknisk status betyder inte uppfyllda verksamhetsmål.</p>`).join('')}<details><summary>Samtliga observationer, identiteter och ursprungliga körspår</summary><pre>${esc(JSON.stringify(results.map((r,i)=>({record:r.record,input:r.input,audit:r.audit,observations:checks[i].paths,paths:bundles[i].paths})),null,2))}</pre></details></details><p class="hint">I de här testade planerna. Ingen sökning efter bästa plan, inga slutsatser om generell omöjlighet eller verifierad kundnytta.</p></section>`;
  }catch(e){return `<section class="panel story-warning"><h2>Jämförelsen kan inte styrkas</h2><p>${esc(e.message)}</p></section>`;}
 }
 const intro=()=>`<section class="panel tint"><p class="eyebrow">FABRIKEN · SAMMA ÅTGÄRDER, ÄNDRADE TIDPUNKTER</p><h2>Vad vinner och förlorar vi på att flytta maskinen senare, och klarar den testade planen fortfarande godkänd produktionsstart i Polen senast vecka 26?</h2><p>Konstruerade antaganden. Samma frysta modell, startläge, 8 Mkr initialt, besked och horisont vecka 26. Tidig flytt vecka 2 jämförs med flytt vecka 6 efter arbetslagets förberedelser och bank- och kundbesked. Kvalitetsprövningen kräver redan maskin på plats.</p><div class="actions"><button data-action="factory-timing" data-scenario="base">Öppna tidsjämförelse</button><button data-action="factory-timing" data-scenario="customer_absent">Tidsjämförelse: uteblivet kundbesked</button></div><p class="hint">Köp kontra flytt är en separat strategijämförelse på projektsidan. Vid uteblivet kundbesked väljs en uttrycklig väntplan, inte ett automatiskt motorbeslut. Ingen AI eller optimering.</p></section>`;
 return {enabled,observe,intervals,assess,summary,render,intro,expected};
})();
if(typeof module!=='undefined')module.exports=CE3FactoryTiming;
