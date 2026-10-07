/* Read-only observations of audited histories. No replay or plan mutation. */
const CE3Comparison = (() => {
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const matches=(state,g)=>g.op==='eq'?equal(state[g.field],g.value):state[g.field]>=g.value;
  function validGuard(model,g){
    if(!g||!Object.hasOwn(model.domains,g.field)||!['eq','ge'].includes(g.op))return false;
    const domain=model.domains[g.field];
    if(g.op==='ge')return Number.isInteger(g.value)&&(domain.integer||domain.enum?.every(v=>typeof v==='number'));
    return domain.enum?domain.enum.some(v=>equal(v,g.value)):Number.isInteger(g.value)&&g.value>=domain.integer[0]&&g.value<=domain.integer[1];
  }
  function definition(model,value){
    if(!value)return {focus:null,gaps:[],note:'Det saknas källkopplade glappdefinitioner för modellen. Tider och betalningar kan jämföras, men verksamhetsglapp kan inte härledas enbart ur variabelnamnen.'};
    if((value.focus&&!validGuard(model,value.focus))||!Array.isArray(value.gaps)||value.gaps.some(g=>!g||!g.name||!validGuard(model,g.after)||!validGuard(model,g.until)))
      return {focus:null,gaps:[],note:'Glappdefinitionerna passar inte denna modell. Inga glapp har beräknats.'};
    return value;
  }
  function first(rows,guard){return rows.find(r=>matches(r.after.state,guard))?.step??null;}
  function intervals(rows,model,spec,time){
    // Length is elapsed time, not a count of inclusive weekly observations.
    // Week-end sampling avoids turning transient same-week ordering into a week.
    const ends=rows.filter(r=>r.kind==='step_end');
    const periods=[];let open=null;
    for(const r of ends){
      const missing=matches(r.after.state,spec.after)&&!matches(r.after.state,spec.until);
      if(missing&&open===null)open=r.step;
      if(!missing&&open!==null){periods.push({start:open,end:r.step,length:r.step-open,ongoing:false});open=null;}
    }
    if(open!==null)periods.push({start:open,end:null,length:time-open,ongoing:true});
    const initial=rows[0]?.after.state;
    const leftCensored=initial&&matches(initial,spec.after)&&!matches(initial,spec.until);
    if(leftCensored&&periods[0]?.start===model.clock.start)periods[0].leftCensored=true;
    const anchorRow=rows.find(r=>matches(r.after.state,spec.after));
    return {...spec,anchor:anchorRow?.step??null,anchorValue:anchorRow?.after.state[spec.after.field],periods,total:periods.reduce((n,p)=>n+p.length,0)};
  }
  function analyse(model,path,rawDefinition,time=model.clock.horizon){
    const spec=definition(model,rawDefinition),rows=path.history.filter(r=>r.step<=time);
    const state=rows.filter(r=>r.kind==='step_end').at(-1)?.after.state||model.initial;
    const field=model.budget?.field;
    const decisions=Object.entries(model.decisions).map(([id,rule])=>{
      const executed=rows.filter(r=>r.action===id&&r.kind==='decision_executed');
      // Only observed decision-phase snapshots, never a hypothetical replay.
      const ready=rows.flatMap(r=>[{step:r.step,s:r.before},{step:r.step,s:r.after}]).find(({s})=>
        s.phase==='decisions'&&!s.taken.includes(id)&&rule.requires.every(g=>matches(s.state,g))&&(!field||s.state[field]>=rule.cost));
      const blocked=rows.filter(r=>r.action===id&&r.kind==='attempt_blocked').map(row=>({step:row.step,index:row.index,failures:row.failures.map(f=>{
        const guard={field:f.field,op:f.operator,value:f.required};
        const met=f.field==='once_only'?null:rows.find(r=>r.index>row.index&&matches(r.after.state,guard));
        return {...f,met:met?.step??null,metIndex:met?.index??null};
      })}));
      return {id,executed:executed.map(r=>r.step),ready:ready?.step??null,blocked};
    });
    const payments=field?rows.filter(r=>r.kind==='decision_executed').map(r=>({id:r.action,step:r.step,amount:model.decisions[r.action].cost,index:r.index})):[];
    const adjustments=field?rows.filter(r=>['decision_executed','event_applied'].includes(r.kind)).map(r=>({id:r.action,step:r.step,amount:r.after.state[field]-r.before.state[field]+(r.kind==='decision_executed'?model.decisions[r.action].cost:0)})).filter(r=>r.amount!==0):[];
    return {time,state,spec,decisions,gaps:spec.gaps.map(g=>intervals(rows,model,g,time)),
      focus:spec.focus?{first:first(rows,spec.focus),atEnd:matches(state,spec.focus)}:null,
      payments,adjustments,spent:field?payments.reduce((n,r)=>n+r.amount,0):null,
      remaining:field?state[field]:null};
  }
  function focus(model,a,b){
    if(a.spec.focus){
      const g=a.spec.focus;
      const linked=Object.entries(model.decisions).filter(([,r])=>g.op==='eq'&&Object.hasOwn(r.effects.set,g.field)&&equal(r.effects.set[g.field],g.value));
      return {guard:g,id:linked.length===1?linked[0][0]:null,left:a.focus.first,right:b.focus.first,defined:true};
    }
    const candidates=a.decisions.map(d=>{
      const other=b.decisions.find(x=>x.id===d.id);const left=d.executed[0]??null,right=other.executed[0]??null;
      return {id:d.id,left,right,difference:left===null||right===null?(left!==right?Infinity:0):Math.abs(left-right)};
    }).filter(d=>d.difference>0).sort((x,y)=>y.difference-x.difference||x.id.localeCompare(y.id));
    return candidates[0]||null;
  }
  return {analyse,focus,matches,definition};
})();
if(typeof module!=='undefined')module.exports=CE3Comparison;
