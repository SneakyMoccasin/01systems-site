'use strict';
let catalog, current = null, selected = 'warehouse', screen = 'check';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'medium'}).format(new Date(value));
const errors = { STALE_SCREEN: 'En nyare sparad kopia finns. Öppna den innan du fortsätter.', CONFIRMATION_BLOCKED: 'Underlaget kan inte bekräftas ännu. Hantera uppgiften som visas först.', UNSCRIPTED_INPUT: 'Din text är sparad men inte tolkad. Den har inget förskrivet förslag.', ACKNOWLEDGEMENT_REQUIRED: 'Markera att sammanfattningen stämmer.', ANSWER_REQUIRED: 'Välj eller skriv ett svar innan du sparar.' };
async function api(data) {
  const response = await fetch('/api/onboarding', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  const body = await response.json();
  if (!response.ok) throw Error(errors[body.message] ?? 'Steget kunde inte sparas. Tidigare kopior finns kvar. Öppna senaste kopian och försök igen.');
  return body;
}
async function busy(task) {
  if (document.body.classList.contains('busy')) return;
  document.body.classList.add('busy'); $('#content').setAttribute('aria-busy','true'); $('#error').hidden=true; $('#status').textContent='Sparar lokalt…';
  try { await task(); } catch(e) { $('#error').textContent=e.message; $('#error').hidden=false; $('#status').textContent=''; }
  finally {document.body.classList.remove('busy'); $('#content').setAttribute('aria-busy','false');}
}
function focusTask() { $('#task-heading')?.focus(); }
function accept(value, message='Sparat på denna Mac') {
  current=value; screen='check';
  try {localStorage.setItem('ce3-onboarding-demo',JSON.stringify({id:current.id,snapshot:current.snapshot}));}catch{}
  render(); $('#status').textContent=message; focusTask();
}
async function refresh() {
  catalog=await api({action:'list'});
  $('#sessions').innerHTML=catalog.sessions.length?catalog.sessions.map((s,i)=>`<button class="secondary small" data-open="${esc(s.id)}">${esc(s.title)} · förslag ${s.revision || 'saknas'} · session ${i+1}</button>`).join(''):'<p>Inga sparade demofall ännu.</p>';
}
async function action(name,extra={}) {
  const value=await api({action:name,id:current.id,snapshot:current.snapshot,checksum:current.checksum,...extra}); await refresh();accept(value);
}
function steps(active) {return `<ol class="steps" aria-label="Onboardingsteg">${['Beskriv','Kontrollera','Komplettera vid behov','Bekräfta'].map((x,i)=>`<li ${i===active?'class="active" aria-current="step"':''}><span>${i+1}</span>${x}</li>`).join('')}</ol>`;}
function heading(text) {return `<h2 id="task-heading" tabindex="-1">${text}</h2>`;}
function intro() {
  const f=catalog.cases.find(c=>c.id===selected);
  $('#content').innerHTML=`${steps(0)}<section class="panel">${heading('Beskriv er situation')}<label for="case">Välj ett syntetiskt demofall</label><select id="case">${catalog.cases.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.title)}</option>`).join('')}</select><p class="hint">${esc(f.description)}</p><label for="situation">Vad planerar ni att göra?</label><textarea id="situation" rows="4" maxlength="5000">${esc(f.situation)}</textarea><label for="purpose">Vad vill du få svar på?</label><textarea id="purpose" rows="2" maxlength="5000">${esc(f.question)}</textarea><div class="actions"><button id="begin">Visa sammanfattningen →</button></div><p class="hint">Bara demotexten har ett förskrivet förslag. Ändrad fritext sparas utan automatisk tolkning.</p></section>`;
}
function summary({includeAnalysis=true}={}) {return `<dl class="summary ${current.legacy?'':'story'}">${current.summary.filter(f=>includeAnalysis||f.id!=='analysis').map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}${current.legacy?'<div><dt>Viktigt att känna till</dt><dd>Kostnad och faktisk godkännandetid är okända. Vi drar inga slutsatser om ekonomi eller färdigdatum.</dd></div>':''}</dl>${current.relationship?`<p class="notice">${esc(current.relationship)}</p>`:''}`;}
function changes() {return current.changes.length?`<div class="changes"><h3>Det här har ändrats</h3>${current.changes.map(c=>`<div class="change"><strong>${esc(c.label)}</strong><span class="before">Tidigare: ${esc(c.before)}</span><span class="after">Nu: ${esc(c.after)}</span></div>`).join('')}</div>`:'';}
function inputForm(gap) {
  const options=current.answer_options;
  return `<label for="reply-choice">${gap?'Välj det svar som gäller':'Vilken uppgift vill du använda i demonstrationen?'}</label><select id="reply-choice"><option value="">Välj ett svar</option>${options.map((a,i)=>`<option value="${i}">${esc(a)}</option>`).join('')}<option value="free">Egen text – sparas utan tolkning</option></select><div id="free-reply" hidden><label for="reply">Din rättelse</label><textarea id="reply" rows="2" maxlength="5000"></textarea></div><div class="actions"><button id="answer" disabled>Spara och visa uppdaterat förslag →</button><button class="secondary" data-screen="check">Till sammanfattningen</button></div><p class="hint">Förslaget och granskningen som följer är förskrivna. Ditt svar ändrar underlaget; äldre versioner finns kvar.</p>`;
}
function history() {
  return `<details class="history"><summary>Historik och sparade kopior</summary><p class="hint">Förslagsversionen ändras när modellen uppdateras. En sparad kopia bevarar hela sessionen vid ett steg. Tiderna visar när kopian sparades på denna Mac.</p><label for="history">Öppna ett sparat steg</label><div class="snapshot-row"><select id="history">${current.history.map(h=>`<option value="${h.snapshot}" ${h.snapshot===current.snapshot?'selected':''}>${esc(date(h.at))} · ${esc(h.label)} · kopia ${parseInt(h.snapshot,10)}</option>`).join('')}</select><button class="secondary small" id="open-snapshot">Öppna</button></div><div class="actions"><button class="secondary small" id="reopen">Återöppna visad kopia</button>${current.latest?'<button class="secondary small" data-action="save">Spara en extra kopia</button>':''}</div></details><details><summary>Tekniska detaljer</summary><p class="hint">Session/2 binder bekräftelsen till exakt underlag, modellförslag och SR-granskning. Förskrivna svar körs genom riktig SR-kod. Fälttäckning bevisar inte korrekthet. Ingen kompilering, profilvalidering eller CE3-körning har gjorts.</p><pre>${esc(JSON.stringify({statuses:current.view.statuses,confirmation_gate:current.gate,session:current.technical},null,2))}</pre></details>`;
}
function render() {
  document.body.classList.toggle('ongoing', Boolean(current));
  document.body.classList.toggle('confirmed', Boolean(current?.latest && current.view.statuses.confirmation==='confirmed' && screen!=='edit'));
  if (!current) return intro();
  const {view:v,gate,latest}=current, p=v.proposals.at(-1), gap=['gap','warehousegap'].includes(current.case_id), pending=v.statuses.pending_evidence;
  const confirmed=v.statuses.confirmation==='confirmed', review=v.current_review, bad=p?.items.find(i=>i.id==='approval').type==='document_fact';
  const openQuestion=v.questions.find(q=>['open','deferred'].includes(q.status));
  const active=screen==='edit'||current.analysis_choice?2:screen==='confirm'||confirmed?3:1;
  const historic=!latest?'<div class="alert"><strong>Historisk, skrivskyddad kopia.</strong><p>Du ser statusen när kopian sparades. Den kan vara inaktuell idag.</p><button class="secondary small" id="latest">Öppna senaste kopian</button></div>':'';
  const stale=v.statuses.confirmation==='stale'?'<p class="notice">Den tidigare bekräftelsen är inaktuell. Den uppdaterade sammanfattningen behöver bekräftas på nytt.</p>':'';
  let body;
  if (!p) body=`${heading(current.can_propose?'Underlaget är sparat':'Din text är sparad, men inte tolkad')}<p><strong>Din fråga:</strong> ${esc(v.sources.find(s=>s.id==='question').content)}</p><blockquote>${esc(v.sources.find(s=>s.id==='situation').content)}</blockquote><p>${current.can_propose?'Det finns ett förskrivet förslag för detta syntetiska underlag.':'Ingen AI är ansluten. Börja ett nytt demofall med den förskrivna texten för att prova resten av flödet.'}</p>${current.can_propose&&latest?'<button data-action="propose">Visa förskrivet förslag</button>':''}`;
  else if (!latest) body=`${heading(`Förslag ${p.revision} · historisk vy`)}${summary()}${changes()}<p>${confirmed?'Denna kopia innehåller en bekräftelse av den då visade versionen.':'Denna kopia har ingen aktuell bekräftelse.'}</p>`;
  else if (current.analysis_choice) body=`${heading('Vilken dag ska analysen undersöka?')}<p>${esc(current.analysis_choice.text)}</p><p class="hint">Tidigare granskning är inaktuell. Valet sparas i underlaget innan ett nytt förslag och en ny förskriven granskning visas.</p><div class="actions">${current.analysis_options.map((text,i)=>`<button data-analysis-choice="${i}">${esc(text)}</button>`).join('')}</div><details><summary>Visa tidigare sammanfattning</summary>${summary()}</details>`;
  else if (pending && screen!=='edit') body=`${heading('Kompletteringen är sparad')}<p>Tidigare granskning är inaktuell.</p>${current.can_propose?'<p>För in svaret i det förskrivna förslaget och visa den nya granskningen.</p><button data-action="update">Visa uppdaterad sammanfattning →</button>':'<p>Din fritext har inget förskrivet förslag och har inte tolkats. Inga uppgifter har fyllts i automatiskt.</p><button data-screen="edit">Välj ett demosvar</button>'}`;
  else if (screen==='edit') body=`${heading(gap&&openQuestion?'En uppgift behövs innan du bekräftar':'Rätta sammanfattningen')}<p>${gap?esc(current.question_template.text):'Du kan ändra tidsmålet med ett demosvar, eller spara en egen rättelse utan tolkning.'}</p>${gap?`<p>${current.case_id==='gap'?'Det äldre demot lade rollen som ett aktivt modellfält. Sessionskontraktet kräver att sådana fält är kända; det finns inget generellt krav på personnamn. ”Vet inte ännu” lämnar detta fält okänt.':esc(current.question_template.reasons.join(' '))}</p>`:''}${inputForm(gap)}`;
  else if (confirmed) body=`${heading('Du har bekräftat att sammanfattningen stämmer.')}<p class="lead">Underlaget är sparat. Ingen analys har körts ännu.</p><p>Nästa steg är att översätta underlaget till en modell, ange körindata och kontrollera modellen inför analysen. ${current.legacy?'':'Din bekräftelse är inte beställarens klartecken till driftstart.'}</p><details><summary>Visa den bekräftade sammanfattningen</summary><p class="hint">Förslag ${p.revision}</p>${summary({includeAnalysis:false})}<p><strong>Analysfråga:</strong> ${esc(p.analysis.question)}</p></details><div class="actions"><button class="secondary" data-screen="edit">Rätta en uppgift</button></div>`;
  else if (screen==='confirm'&&gate.allowed) body=`${heading('Stämmer detta med er situation?')}<p class="hint">Förslag ${p.revision} · aktuellt underlag</p>${current.legacy?`<p><strong>Analysfråga:</strong> ${esc(p.analysis.question)}</p>`:''}${summary()}<p class="hint">Omfattning: ${esc(p.scope.includes.join('. '))}. Tidpunkter fylls inte i automatiskt.</p><p>Du bekräftar beskrivningen inför analysen. ${current.legacy?'':'Det är inte beställarens klartecken till driftstart.'} Det är inget verksamhetsbeslut eller någon garanti för resultatet.</p><label class="check"><input id="ack" type="checkbox"><span>${esc(current.confirmation_text)}</span></label><div class="actions"><button id="confirm" disabled>Bekräfta underlaget</button><button class="secondary" data-screen="check">Till sammanfattningen</button></div>`;
  else body=`${heading('Har vi förstått rätt?')}<p class="hint">Förslag ${p.revision} · förskriven sammanfattning</p>${summary()}${changes()}${bad&&review&&['misread','warehouseerror'].includes(current.case_id)?'<div class="alert"><strong>Feltolkning i förslaget – ingen kunduppgift saknas.</strong><p>Förslaget behandlade dag 2 som ett godkännande. Underlaget beskriver det som ett tidsmål.</p><p class="hint">Den förskrivna SR-granskningen pekar ut felet. Ett separat, förskrivet förslag rättar det.</p></div><button data-action="correct">Visa rättat förslag →</button>':!review?'<p>Granskning av denna version återstår.</p><button data-action="review">Visa förskriven granskning →</button>':gate.allowed?`<p class="review-note">${p.revision>1?'Ny förskriven granskning:':'Förskriven granskning:'} inga olösta blockerare i denna version.</p><div class="actions"><button data-screen="confirm">Stämmer – gå till bekräftelse →</button><button class="secondary" data-screen="edit">Rätta en uppgift</button></div>`:`<p class="review-note">${p.revision>1?'Ny förskriven granskning':'Förskriven granskning'}: en blockerande uppgift återstår.</p><div class="alert"><strong>${current.case_id==='warehousegap'?'Det är inte bestämt om klartecken krävs före start.':gap?'Ett aktivt modellfält är fortfarande okänt.':'En blockerande uppgift återstår.'}</strong><p>${esc(current.case_id==='gap'?'Det äldre demot behöver komplettera sitt aktiva rollfält enligt sessionskontraktet. Detta är inget generellt krav på personnamn.':openQuestion?.reasons.join(' ')??'Underlaget kan ännu inte bekräftas.')}</p></div><button data-screen="edit">${gap?'Komplettera uppgiften':'Visa frågan'} →</button>`}<details><summary>Läs originalunderlaget</summary><blockquote>${esc(v.sources.find(s=>s.id==='situation').content)}</blockquote>${v.answers.length?`<p>Senaste komplettering:</p><blockquote>${esc(v.answers.at(-1).text)}</blockquote>`:''}</details>`;
  // Historical views never expose mutation forms; the server also rejects old snapshots.
  $('#content').innerHTML=`${steps(active)}${historic}${current.legacy?'<p class="notice">Äldre demoflöde, bevarat för historik. Välj ett nytt demofall för den uppdaterade kunddialogen.</p>':''}${stale}<section class="panel">${body}</section>${history()}`;
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled||document.body.classList.contains('busy'))return;
  if(b.id==='new'){current=null;screen='check';try{localStorage.removeItem('ce3-onboarding-demo');}catch{}$('#status').textContent='';$('#error').hidden=true;render();focusTask();return;}
  if(b.dataset.screen){screen=b.dataset.screen;render();focusTask();return;}
  busy(async()=>{
    if(b.id==='begin'){
      let value=await api({action:'create',case_id:selected,question:$('#purpose').value,situation:$('#situation').value});
      accept(value);
      if(value.can_propose){await action('propose');await action('review');}else await refresh();
    } else if(b.dataset.analysisChoice!==undefined){
      await action('analysis_choice',{question_id:current.analysis_choice.id,text:current.analysis_options[Number(b.dataset.analysisChoice)]});
      if(current.can_propose)await action('update');
    } else if(b.dataset.action) await action(b.dataset.action);
    else if(b.id==='answer'){
      const choice=$('#reply-choice').value, options=current.answer_options;
      const text=choice==='free'?$('#reply').value:options[Number(choice)];
      await action('answer',{text});
      if(current.can_propose)await action('update');
    } else if(b.id==='confirm')await action('confirm',{by:'Kund i offlinedemonstrationen',acknowledged:$('#ack').checked});
    else if(b.dataset.open)accept(await api({action:'open',id:b.dataset.open}),'Sparad session öppnad');
    else if(['reopen','open-snapshot','latest'].includes(b.id))accept(await api({action:'open',id:current.id,...(b.id==='latest'?{}:{snapshot:b.id==='reopen'?current.snapshot:$('#history').value})}),'Sparad kopia återöppnad och kontrollerad');
  });
});
document.addEventListener('change',event=>{
  if(event.target.id==='case'){selected=event.target.value;render();$('#case').focus();}
  if(event.target.id==='reply-choice'){$('#free-reply').hidden=event.target.value!=='free';$('#answer').disabled=!event.target.value;}
});
document.addEventListener('input',()=>{if($('#confirm'))$('#confirm').disabled=!(current?.gate.allowed&&current.latest&&$('#ack')?.checked);});
busy(async()=>{await refresh();let saved;try{saved=JSON.parse(localStorage.getItem('ce3-onboarding-demo'));}catch{}if(saved)accept(await api({action:'open',...saved}),'Senast visade kopia återöppnad');else{render();$('#status').textContent='';}});
