/* Pure display functions. No function constructs or changes replay input. */
const CE3Presentation = (() => {
  const typed = value => JSON.stringify(value);
  const primitive = value => value === null || value === undefined ? '—' :
    typeof value === 'boolean' ? (value ? 'Ja' : 'Nej') : String(value);
  function view(project, identity = project.model_identity, model = project.model) {
    const data = project.presentation?.[identity] || {};
    const title = {decisions: 'Beslut', events: 'Händelse', fields: 'Tillstånd'};
    function name(id, group) {
      group ||= Object.hasOwn(model.decisions,id) ? 'decisions' :
        Object.hasOwn(model.events,id) ? 'events' : 'fields';
      return data[group]?.[id] || `${title[group]} (ID: ${id})`;
    }
    const value = (field, v) => field === model.budget?.field ? money(v) : data.values?.[field]?.[typed(v)] || (typeof v==='string'&&model.domains[field]?.enum?`Värde (ID: ${v})`:primitive(v));
    const statement = (field, v) => data.values?.[field]?.[typed(v)] || `${name(field,'fields')} är ${value(field,v)}`;
    const outcome = (event, v) => data.outcomes?.[event]?.[v] || `Utfall (ID: ${v})`;
    const money = n => n === null || n === undefined ? '—' : `${n} ${data.budget_unit === 'miljoner' && Math.abs(n) === 1 ? 'miljon' : data.budget_unit || '(enhet saknas)'}`;
    const guard = g => g.op === 'eq' ? statement(g.field,g.value) :
      `${name(g.field,'fields')} är minst ${g.field === model.budget?.field ? money(g.value) : primitive(g.value)}`;
    function effects(e) {
      return [...Object.entries(e.set).map(([field,v])=>statement(field,v)),
        ...Object.entries(e.add).map(([field,v])=>`${name(field,'fields')} ${v < 0 ? 'minskar' : 'ökar'} med ${field === model.budget?.field ? money(Math.abs(v)) : Math.abs(v)}`)].join(' · ') || 'Ingen direkt tillståndsändring';
    }
    function failures(items) {
      return items.map(f => f.field === 'once_only' ? 'Beslutet är redan genomfört.' :
        `Kräver: ${guard({field:f.field,op:f.operator,value:f.required})}. Vid försöket: ${statement(f.field,f.actual)}.`).join(' ');
    }
    return {data,name,value,statement,outcome,money,guard,effects,failures};
  }
  function comparisonNeeds(project, runs, ids) {
    if (ids[0] === ids[1]) return ['Samma plan är vald på båda sidor. Välj två olika planer.'];
    const messages=[];
    for (const id of ids) {
      const plan=project.plans.find(p=>p.id===id);
      if(!plan){messages.push('Välj en plan på båda sidor.');continue;}
      const missing=Object.entries(project.model.events).filter(([event,rule])=>rule.kind==='external'&&!plan.outcomes[event]);
      if(missing.length)messages.push(`${plan.name}: välj ${missing.length} externa besked.`);
      const run=runs.filter(r=>r.plan_id===id).at(-1);
      if(!run){messages.push(`${plan.name}: planen behöver köras.`);continue;}
      const input=run.input_summary;
      if(!input || input.model_identity!==project.model_identity || stable(input.script)!==stable(plan.script) || stable(input.outcomes)!==stable(plan.outcomes) || stable(input.sources)!==stable(project.sources))
        messages.push(`${plan.name}: planen har ändrats och behöver köras om.`);
      if(run.run_status!=='COMPLETE'||run.audit_status!=='PASS')
        messages.push(`${plan.name}: körning ${run.run_status}, granskning ${run.audit_status}. En fullständig, godkänd granskning behövs.`);
    }
    const [a,b]=ids.map(id=>project.plans.find(p=>p.id===id));
    if(a&&b&&stable(a.outcomes)!==stable(b.outcomes))messages.push('Planerna har olika externa besked. Välj samma utfall före jämförelse.');
    return messages;
  }
  function stable(v) {
    if(v===null||typeof v!=='object')return JSON.stringify(v);
    return Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  }
  return {view,comparisonNeeds,stable};
})();
if(typeof module!=='undefined')module.exports=CE3Presentation;
