'use strict';
let current=null,working=false;
const $=id=>document.getElementById(id);
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function button(text,handler,secondary=false){const b=el('button',text);b.type='button';if(secondary)b.className='secondary';b.addEventListener('click',handler);return b;}
function detail(title){const d=el('details');d.append(el('summary',title));return d;}
function card(title){const s=el('section',undefined,'card');s.append(el('h2',title));return s;}
async function api(url,body){const r=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
function busy(on){working=on;$('busy').hidden=!on;document.querySelectorAll('button').forEach(b=>b.disabled=on);}
async function command(action,extra={}){
  if(working)return;busy(true);$('error').hidden=true;
  try{const v=await api('/api/command',{action,...(current?{id:current.id,snapshot:current.snapshot,checksum:current.checksum}:{}),...extra});show(v);await list();}
  catch(e){if(current)await open(current.id);$('error').textContent=e.message;$('error').hidden=false;}
  finally{busy(false);}
}
async function open(id,snapshot){try{show(await api('/api/session?id='+encodeURIComponent(id)+(snapshot?'&snapshot='+encodeURIComponent(snapshot):'')));}catch(e){$('error').textContent=e.message;$('error').hidden=false;}}
async function list(){const v=await api('/api/sessions');$('offline-help').hidden=v.provider.kind==='openai_live';$('provider').textContent=v.provider.label+(v.budget?` · ${v.budget.dispatched}/${v.budget.maximum_calls} anrop skickade. Provets kostnadstak: ${v.budget.maximum_usd} USD. ${v.budget.stopped?'Provet har stoppats.':''}`:'. Ingen betald OpenAI-koppling är aktiverad.');const box=$('sessions');box.replaceChildren();v.sessions.forEach(s=>box.append(button(s.title,()=>open(s.id),true)));}
function download(value,name){const a=el('a');const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function textForm(container,label,value,onSubmit,submit='Spara'){
  const form=el('form'),id='input-'+crypto.randomUUID(),l=el('label',label);l.htmlFor=id;
  const input=el('textarea');input.id=id;input.value=value;input.rows=3;input.required=true;input.maxLength=20000;
  const b=el('button',submit);b.type='submit';form.append(l,input,b);form.addEventListener('submit',e=>{e.preventDefault();onSubmit(input.value);});container.append(form);
}
function show(v){
  current=v;$('create').hidden=true;$('result').hidden=false;const root=$('result');root.replaceChildren();
  const overview=card('Din sammanställning');overview.append(el('p',v.limitation,'notice'));
  overview.append(el('p',v.provenance?.label??'Inget godkänt utkastförsök för denna version.','small'));
  if(!v.latest)overview.append(el('p','Historisk kopia · endast läsning. Öppna senaste kopian för att fortsätta.','warning'));
  if(v.lifecycle==='paused')overview.append(el('p','Pausad. Du kan spara underlag; återuppta innan nästa utkast.','notice'));
  if(v.deferred_questions)overview.append(el('p',`${v.deferred_questions} uppskjutna frågor finns kvar under Alla frågor och svar.`, 'small'));
  if(v.pending_evidence)overview.append(el('p','Underlaget har ändrats. Sammanställningen nedan är inaktuell tills ett nytt utkast har godtagits.','warning'));
  if(v.last_attempt?.status!=='accepted')overview.append(el('p',v.last_attempt?.error??'Försöket saknar slutbesked. Ett nytt försök måste begäras uttryckligen.','warning'));
  const toolbar=el('div',undefined,'toolbar'),select=el('select');select.setAttribute('aria-label','Sparad sessionskopia');
  v.snapshots.forEach(s=>{const o=el('option','Kopia '+Number(s.slice(0,6)));o.value=s;o.selected=s===v.snapshot;select.append(o);});select.addEventListener('change',()=>open(v.id,select.value));toolbar.append(select);
  if(v.latest){if(v.lifecycle==='active')toolbar.append(button('Uppdatera utkast',()=>command('propose'),true));toolbar.append(button(v.lifecycle==='paused'?'Återuppta':'Pausa',()=>command(v.lifecycle==='paused'?'resume':'pause'),true));}
  toolbar.append(button('Exportera utkast och källor',()=>download({format:'ce3-agent-draft-export/1',capability_id:v.capability_id,capability_digest:v.capability_digest,base_commit:v.base_commit,proposal:v.proposal,session:v.session,producer:v.provenance,limitation:v.limitation},'ce3-utkast-'+v.id+'.json'),true));overview.append(toolbar);
  const labels={not_requested:'Inte begärd',stale:'Inaktuell',pending:'Väntar',incomplete:'Ofullständig',current:'Aktuell',confirmed:'Bekräftad'};
  overview.append(el('p',`Utkastversion ${v.proposal?.revision??0} · Granskning: ${labels[v.statuses.review]??v.statuses.review} · Bekräftelse: ${labels[v.statuses.confirmation]??v.statuses.confirmation}`,'small'));
  if(v.proposal)overview.append(el('p',v.proposal.analysis.question));
  const groups=el('div',undefined,'groups');
  v.summary.filter(g=>g.items.length).forEach(g=>{
    const group=el('div');group.append(el('h3',g.label));g.items.forEach(i=>{
      const box=el('div',undefined,'item');let label=i.status==='conflict'?'Motsägelse':i.status==='unknown'?'Okänt':i.type==='ai_proposal'?'Föreslaget antagande':i.type==='goal'?'Angivet mål':i.type==='requirement'?'Angivet villkor':'Uppgift ur underlaget';
      box.append(el('span',label,'badge'+(i.status!=='known'||i.type==='ai_proposal'?' open':'')),el('p',i.statement));
      const refs=detail(i.refs.length?'Visa källstöd och tolkning':'Källstöd saknas');refs.append(el('p',i.rationale,'small'));
      i.refs.forEach(r=>{refs.append(el('blockquote',r.quote),el('p',`${r.source_id} · version ${r.source_version} · tecken ${r.start}–${r.end}`,'small'));});
      if(i.depends_on.length)refs.append(el('p','Spårbarhetskopplingar: '+i.depends_on.join(', '),'small'));box.append(refs);group.append(box);
    });groups.append(group);
  });overview.append(groups);root.append(overview);
  const gaps=v.proposal?.gaps.filter(g=>g.status==='open')??[];
  if(gaps.length){const c=card('Det här är fortfarande öppet');gaps.forEach(g=>c.append(el('p',(g.kind==='unsupported_profile'?'Utanför kapabilitetsbasen: ':'')+g.explanation)));root.append(c);}
  if(v.questions.length){const c=card('Nästa frågor');c.append(el('p',`Högst tre frågor åt gången. ${v.remaining_questions?`${v.remaining_questions} ytterligare frågor finns kvar.`:''}`,'small'));
    v.questions.forEach(q=>{const row=el('div',undefined,'question');row.append(el('h3',q.text),el('p',q.reasons.join(' '),'small'));
      if(v.latest){textForm(row,'Ditt svar','',text=>command('answer',{question_id:q.id,text}),'Spara svar och uppdatera');row.append(button('Vet inte ännu',()=>command('answer',{question_id:q.id,text:'Jag vet inte ännu.'}),true));row.append(button('Skjut upp',()=>command('defer',{question_id:q.id,reason:'Kunden skjuter uttryckligen upp frågan; luckan är kvar.'}),true));}
      c.append(row);});if(v.suggest_pause)c.append(el('p','Du kan pausa och återkomma. Olösta frågor och uppgifter finns kvar.','notice'));root.append(c);
  }
  const history=card('Underlag och tidigare svar');const sources=detail('Läs eller rätta en inmatad text');
  v.sources.filter(s=>s.kind==='document'&&!v.sources.some(t=>s.id===t.id&&t.version>s.version)).forEach(s=>{const block=detail(s.id+' · version '+s.version);block.append(el('blockquote',s.content));if(v.latest)textForm(block,'Rätta denna text',s.content,text=>command('source',{source_id:s.id,text}),'Spara ny källversion');sources.append(block);});
  if(v.latest){const add=detail('Lägg till en dokumentpassage eller komplettering');add.append(el('p','Klistra in texten. Ingen filtolkning eller OCR görs; originalfilens identitet verifieras inte.','small'));textForm(add,'Textpassage','',text=>command('source',{text}),'Lägg till underlag');sources.append(add);}history.append(sources);
  const answers=detail('Alla frågor och svar');v.all_questions.forEach(q=>{const box=detail(q.text+' · '+q.status);const list=v.answers.filter(a=>a.question_id===q.id||q.merged_from.includes(a.question_id));list.forEach(a=>box.append(el('blockquote',a.text)));if(v.latest){if(list.length)textForm(box,'Rätta senaste svaret',list.at(-1).text,text=>command('answer',{question_id:q.id,text}),'Spara rättat svar');if(['open','deferred'].includes(q.status))textForm(box,'Motivera om frågan inte längre gäller','',reason=>command('withdraw',{question_id:q.id,reason}),'Återta frågan med motivering');}answers.append(box);});history.append(answers);
  if(v.review_findings.length){const f=detail('Bevarade granskningsfynd');v.review_findings.forEach(x=>f.append(el('p',x.explanation)));history.append(f);}
  const technical=detail('Strukturerat modellutkast och kapabilitetsbas');technical.append(el('p',`${v.capability_id} · bas ${v.base_commit}`,'small'),el('pre',JSON.stringify(v.proposal,null,2)),el('p','Senare motorinformation, inte införd i basen:','small'),el('pre',JSON.stringify(v.engine_information,null,2)));history.append(technical);root.append(history);
}
$('new').addEventListener('click',()=>{current=null;$('result').hidden=true;$('create').hidden=false;$('brief').value='';$('error').hidden=true;});
$('create-form').addEventListener('submit',e=>{e.preventDefault();command('create',{text:$('brief').value});});
$('example').addEventListener('click',()=>{$('brief').value='Mål: Vi vill börja använda ett nytt lagersystem senast dag 5.\nStartläge: Funktionsprovet är inte klart.\nBeslut: Vi kan beställa funktionsprovet.\nBeslut: Vi kan besluta om driftstart.\nBeroende: Funktionsprovet måste vara klart innan driftstart.\nBesked: Beställaren måste lämna klartecken.\nTid: Tidpunkten för klartecknet är okänd.';});
list().catch(e=>{$('error').textContent=e.message;$('error').hidden=false;});
