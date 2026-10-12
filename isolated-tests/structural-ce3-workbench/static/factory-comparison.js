/* Pure presentation of audited CE3 replay. No model or result generation. */
const CE3FactoryComparison=(()=>{
 const MODEL='b2db6772571c4c3e6c198cdfd97d1a48413515cb567a7654a8817087407d7c8f';
 const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 const equal=(a,b)=>canonical(a)===canonical(b);
 const enabled=p=>p?.model_identity===MODEL&&p?.factory_comparison==='factory-plans/1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const capable=s=>s.se_premises===true&&s.original_machine==='sweden_in_use'&&s.se_team===true;
 function observe(model,path){
  const rows=path.history.filter(r=>r.step>=0&&r.step<=26);
  const snapshots=rows.flatMap(r=>['before','after'].map(side=>({step:r.step,side,action:r.action,state:r[side].state})));
  const loss=snapshots.find(s=>!capable(s.state));
  const start=rows.find(r=>r.kind==='decision_executed'&&r.action==='D8')?.step??null;
  const executed=rows.filter(r=>r.kind==='decision_executed');
  const blocked=rows.filter(r=>r.kind==='attempt_blocked').map(r=>({step:r.step,action:r.action,failures:r.failures}));
  return {start,preserved:capable(model.initial)&&!loss,loss:loss?.step??null,
   both:start!==null&&capable(model.initial)&&!loss,
   spent:executed.reduce((n,r)=>n+r.before.state.budget-r.after.state.budget,0),
   inflow:rows.filter(r=>r.kind==='event_applied').reduce((n,r)=>n+Math.max(0,r.after.state.budget-r.before.state.budget),0),
   balance:rows.at(-1).after.state.budget,blocked,
   executed:executed.map(r=>({step:r.step,action:r.action})),
   machineChanges:rows.filter(r=>r.before.state.original_machine!==r.after.state.original_machine||r.before.state.new_machine!==r.after.state.new_machine).map(r=>({step:r.step,action:r.action,original:r.after.state.original_machine,newMachine:r.after.state.new_machine})),
   snapshots:snapshots.length};
 }
 function assess(result,bundle,C){
  if(result.model_identity!==MODEL)throw Error('Okänd fabriksmodell.');
  const coverage=C.coverage(result,bundle,{focus:{field:'production_authorized',op:'eq',value:true},gaps:[]},{guard:{field:'production_authorized',op:'eq',value:true}},26);
  if(coverage.status==='unknown')throw Error('Fullständigt granskade körspår saknas. Inga gemensamma slutsatser visas.');
  const values=bundle.paths.map(p=>observe(result.input.model,p));
  // Ignore number of snapshots, but compare every reported consequence, not only end state.
  const metric=v=>({...v,snapshots:undefined});
  if(!values.every(v=>equal(metric(v),metric(values[0]))))throw Error('Resultaten varierar mellan händelseordningar. Öppna körspåren i planvyn.');
  return {...values[0],paths:values.length};
 }
 function differences(a,b){return [...new Set([...Object.keys(a.steps),...Object.keys(b.steps)])].sort((x,y)=>+x-+y).filter(k=>!equal(a.steps[k]||[],b.steps[k]||[])).map(k=>({step:+k,left:a.steps[k]||[],right:b.steps[k]||[]}));}
 function render(c,C,p){
  const results=[c.left,c.right],bundles=[c.allA,c.allB];
  try{
   if(!equal(c.left.input.model,c.right.input.model)||!equal(c.left.input.sources,c.right.input.sources)||!equal(c.left.input.outcomes,c.right.input.outcomes))throw Error('Planerna måste ha samma modell, startläge, budget, horisont och externa besked.');
   const expected=machine=>({'0':[{decision:'D1',mode:'attempt'},{decision:'D2',mode:'attempt'},{decision:'D9',mode:'attempt'},{decision:'D7',mode:'attempt'}],'2':[{decision:'D3',mode:'attempt'},{decision:machine,mode:'attempt'}],'10':[{decision:'D6',mode:'attempt'}],'12':[{decision:'D8',mode:'attempt'}]});
   const variants=results.map(r=>['D4','D5'].find(id=>equal(r.input.script.steps,expected(id))));
   if(variants.some(v=>!v)||new Set(variants).size!==2||results.some(r=>r.input.outcomes.E_BANK!=='approved'||r.input.outcomes.E_QUALITY!=='approved'||!['approved','absent'].includes(r.input.outcomes.E_CUSTOMER)))throw Error('Planerna eller beskeden har ändrats från den avgränsade jämförelsen. Använd planvyn för deras körspår, eller öppna ett av fabriksscenarierna på nytt.');
   const observations=results.map((r,i)=>assess(r,bundles[i],C));
   const name=id=>p.name(id,'decisions');
   const headers=results.map(r=>r.record.plan_name);
   const absent=c.left.input.outcomes.E_CUSTOMER==='absent';
   const week=n=>n===null?'Inte genomförd inom testhorisonten':`Vecka ${n}`;
   const row=(title,fn)=>`<tr><th scope="row">${esc(title)}</th>${observations.map(o=>`<td>${esc(fn(o))}</td>`).join('')}</tr>`;
   const changes=differences(c.left.input.script,c.right.input.script);
   const steps=rows=>rows.map((r,i)=>`${i+1}. ${name(r.decision)}${r.mode==='skip'?' (hoppa över)':''}`).join(' → ')||'Inga försök';
   const plans=results.map((r,i)=>`<h3>${esc(headers[i])}</h3><ul>${Object.entries(r.input.script.steps).sort(([a],[b])=>+a-+b).map(([t,rows])=>`<li>Vecka ${esc(t)}: ${esc(steps(rows))}</li>`).join('')}</ul>`).join('');
   const blockers=o=>o.blocked.length?o.blocked.map(r=>r.action==='D8'&&r.failures.length===1&&r.failures[0].field==='customer'?`Vecka ${r.step}: kundens godkännande saknades vid startförsöket.`:`${name(r.action)}, vecka ${r.step}: ${p.failures(r.failures)}`).join(' / '):'Inget beslut i planen blockerades';
   const winner=observations.flatMap((o,i)=>o.both?[headers[i]]:[]);
   const reasons=observations.map((o,i)=>{
    const loss=o.machineChanges.find(x=>x.original==='in_transit');
    const purchase=o.machineChanges.find(x=>x.newMachine==='ordered');
    const arrival=o.machineChanges.find(x=>x.original==='poland'||x.newMachine==='installed');
    const quality=o.executed.find(x=>x.action==='D6');
    return `<p><strong>${esc(headers[i])}:</strong> ${loss?`När ${esc(name(loss.action))} genomfördes vecka ${loss.step} blev den svenska maskinen under transport. Svensk produktionsförmåga saknades från vecka ${o.loss}.`:purchase?`När ${esc(name(purchase.action))} genomfördes vecka ${purchase.step} beställdes en ny maskin. Den svenska maskinen flyttades inte av beslutet.`:'Se genomförda beslut i körspåret.'} ${arrival?`Maskinen var på plats i Polen vecka ${arrival.step}.`:''} ${quality?`Kvalitetsgranskningen kunde starta vid planens försök vecka ${quality.step}, när dess villkor var uppfyllda.`:''} ${o.start!==null?`Produktionsstart godkändes vid försöket vecka ${o.start}.`:esc(blockers(o))} ${o.preserved?'Svensk produktionsförmåga finns kvar under hela perioden.':'Den svenska reservförmågan är inte bevarad hela perioden; inga återflyttningsbeslut finns i denna modell.'}</p>`;
   }).join('');
   return `<section class="panel factory-result"><p class="eyebrow">${absent?'SEPARAT SCENARIO · UTEBLIVET KUNDBESKED':'GRUNDJÄMFÖRELSE'}</p><h2>Produktion i Polen och en svensk reserv</h2><p class="story-lead">I de här två testade planerna ${winner.length?`uppfyller ${esc(winner.join(' och '))} båda delmålen.`:'uppfyller ingen plan båda delmålen.'}</p><div class="table-scroll factory-table" tabindex="0" aria-label="Resultat för två handlingsplaner"><table><thead><tr><th>Mått till vecka 26</th>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${row('Produktionsstart i Polen¹',o=>week(o.start))}${row('Svensk förmåga bevarad vecka 0–26',o=>o.preserved?'Ja':'Nej')}${row('Första förlust av svensk förmåga',o=>o.loss===null?'Ingen under perioden':`Vecka ${o.loss}`)}${row('Budget: utbetalt / kvar (miljoner SEK)',o=>`${o.spent} / ${o.balance}`)}${row('Viktig blockering',blockers)}${row('Båda delmålen uppfyllda',o=>o.both?'Ja':'Nej')}</tbody></table></div><p class="hint">¹ Modellens D8 godkänner produktionsstart; faktisk produktionsvolym mäts inte. Budgeten är ett saldo: initialt 8 + bankbeskedets inflöde ${observations[0].inflow}, minus beslutens betalningar. Ingen lönsamhet eller löpande drift räknas.</p><h3>Varför skiljer sig planerna?</h3>${changes.length?`<p>Första skillnaden är vecka ${changes[0].step}. Planerna skiljer sig i åtgärd och kostnad, inte bara i ordning. Flytten kostar ${c.left.input.model.decisions.D5.cost} miljoner SEK; ny maskin kostar ${c.left.input.model.decisions.D4.cost}.</p>`:'<p>Planernas beslutsförsök är lika.</p>'}${reasons}<p class="hint">Alla ${observations.map(o=>o.paths).join(' respektive ')} händelseordningar har granskats. Svensk förmåga kräver lokal, maskin i bruk i Sverige och arbetslag, kontrollerat före och efter varje övergång vecka 0–26. Detta är inga påståenden om bästa plan eller generell omöjlighet.</p><details><summary>Planer, skillnader, antaganden och körspår</summary><h3>Exakta skillnader</h3>${changes.map(d=>`<p>Vecka ${d.step}<br>${esc(headers[0])}: ${esc(steps(d.left))}<br>${esc(headers[1])}: ${esc(steps(d.right))}</p>`).join('')||'<p>Inga skillnader.</p>'}${plans}<p>Inga andra beslut prövas. Händelser behandlas före beslut varje vecka till och med 26. Uteblivet kundbesked betyder att godkännandet inte kommer vid dess händelse vecka 3; modellen gör inget nytt försök. Samma val gäller båda planerna.</p>${results.map((r,i)=>`<details><summary>${esc(headers[i])} · genomförda åtgärder</summary><ul>${observations[i].executed.map(x=>`<li>Vecka ${x.step}: ${esc(name(x.action))}</li>`).join('')}</ul></details>`).join('')}<details><summary>Tekniska identiteter, antaganden och samtliga ursprungliga körspår</summary><pre>${esc(JSON.stringify(results.map((r,i)=>({record:r.record,input:r.input,audit:r.audit,paths:bundles[i].paths})),null,2))}</pre></details></details></section>`;
  }catch(e){return `<section class="panel story-warning"><h2>Jämförelsen kan inte styrkas</h2><p>${esc(e.message)}</p></section>`;}
 }
 const intro=()=>`<section class="panel tint"><p class="eyebrow">FABRIKEN · KONSTRUERADE ANTAGANDEN</p><h2>Vilken av de två testade planerna startar produktionen i Polen senast vecka 26 och bevarar svensk produktionsförmåga till och med vecka 26?</h2><p>En produktion förbereds i Polen. Flytta den svenska maskinen tidigt, eller köp en ny maskin och behåll den svenska under övergången. Fallet bygger på uttryckligen antagna premisser, inte verifierade kunddata eller AI-genererad kundtext.</p><p>Gemensamt: start vecka 0, horisont 26 och startbudget 8 miljoner SEK. Bank och kvalitetsbesked är godkända i båda scenarierna. Kunden godkänner i grundjämförelsen; i det separata scenariot uteblir kundbeskedet.</p><div class="actions"><button data-action="factory" data-scenario="base">Öppna grundjämförelse</button><button data-action="factory" data-scenario="customer_absent">Öppna separat scenario: uteblivet kundbesked</button></div><p class="hint">Varje scenario sparas separat. Kör båda planerna i valt scenario för att visa verkliga CE3-resultat. Ingen optimering eller AI används.</p></section>`;
 return {enabled,observe,assess,differences,render,intro};
})();
if(typeof module!=='undefined')module.exports=CE3FactoryComparison;
