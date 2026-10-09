'use strict';
const fs = require('node:fs'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const C = require('../contracts/onboarding-v1/contract.cjs');
const { need, integer } = require('./price.cjs');
const Price = require('./price.cjs');
const copy = x => structuredClone(x);
function configCheck(c) {
  need(c.schema_version === 'ce3-budget/1' && c.currency === 'USD' && ['offline', 'live'].includes(c.mode), 'BUDGET_FORMAT');
  need(integer(c.total_limit_nusd) && integer(c.per_run_limit_nusd) && c.total_limit_nusd >= c.per_run_limit_nusd && c.per_run_limit_nusd > 0, 'BUDGET_LIMITS');
  need(Object.keys(c).length === 5, 'BUDGET_FIELDS');
}
function liabilities(s) { return s.runs.reduce((n,r) => n + r.attempts.reduce((a,t) => a + t.liability_nusd,0),0); }
class Journal {
  #db;
  static create(file, config) {
    configCheck(config);
    const fd = fs.openSync(file, 'wx', 0o600); fs.closeSync(fd);
    const db = new DatabaseSync(file);
    try {
      db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE journal (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL, digest TEXT NOT NULL);');
      const s = { schema_version:'ce3-budget-journal/1', budget:copy(config), frozen:false, runs:[], events:[] };
      db.prepare('INSERT INTO journal VALUES(1,?,?)').run(JSON.stringify(s), C.digest(s));
    } finally { db.close(); }
    const dir = fs.openSync(path.dirname(path.resolve(file)), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    return new Journal(file, config);
  }
  constructor(file, config) {
    need(fs.existsSync(file), 'JOURNAL_MISSING');
    this.#db = new DatabaseSync(file);
    try {
      this.#db.exec('PRAGMA busy_timeout=10000; PRAGMA synchronous=FULL;');
      need(this.#db.prepare('PRAGMA quick_check').get().quick_check === 'ok', 'JOURNAL_CORRUPT');
      const s = this.read(); if (config) need(C.digest(config) === C.digest(s.budget), 'BUDGET_RECONFIGURATION_FORBIDDEN');
    } catch(error) {this.#db.close();throw error;}
  }
  close() { this.#db.close(); }
  read() {
    const row = this.#db.prepare('SELECT body,digest FROM journal WHERE id=1').get(); need(row, 'JOURNAL_UNINITIALIZED');
    const s = JSON.parse(row.body); need(C.digest(s) === row.digest, 'JOURNAL_DIGEST'); configCheck(s.budget);
    need(s.schema_version==='ce3-budget-journal/1','JOURNAL_VERSION');
    for(const [i,event] of s.events.entries()) {const {digest,...body}=event;need(event.sequence===i+1 && event.previous_digest===(s.events[i-1]?.digest??null) && C.digest(body)===digest,'JOURNAL_EVENT_CHAIN');}
    return s;
  }
  #change(type, fn) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const s = this.read(), detail = fn(s);
      const event = { sequence:s.events.length+1, type, at:new Date().toISOString(), detail, previous_digest:s.events.at(-1)?.digest ?? null };
      s.events.push({ ...event, digest:C.digest(event) });
      this.#db.prepare('UPDATE journal SET body=?,digest=? WHERE id=1').run(JSON.stringify(s),C.digest(s)); this.#db.exec('COMMIT'); return copy(detail);
    } catch(error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  begin(id, profile, plan, preparedDigest, requestContext = null) {
    return this.#change('reserve_run', s => {
      need(!s.frozen, 'JOURNAL_FROZEN'); need(/^[a-zA-Z0-9_.-]+$/.test(id), 'RUN_ID');
      Price.validate(profile,s.budget.mode);
      if(plan.schema_version==='ce3-transport-plan/2') require('./input.cjs').validatePolicy(plan.input_policy,profile,s.budget.mode);
      else need(plan.schema_version==='ce3-transport-plan/1' && !plan.input_policy,'PLAN_VERSION');
      const input=plan.input_policy?.token_limit??profile.input_token_bound, fee=plan.input_policy?.count_price.max_request_nusd??0;
      need(plan.currency===s.budget.currency && plan.slots.length===plan.maximum_calls && plan.slots.length>0,'PLAN_FORMAT');
      need(plan.slots.every(t=>integer(t.output_tokens) && t.output_tokens>0 && t.input_tokens===input && (t.count_reservation_nusd??0)===fee && t.reservation_nusd===Price.cost(profile,t.input_tokens,t.output_tokens)+fee) && plan.slots.reduce((n,t)=>n+t.reservation_nusd,0)===plan.maximum_nusd && integer(plan.maximum_nusd),'PLAN_COST');
      need(new Set(plan.slots.map(t=>t.stage+'/'+t.attempt)).size===plan.slots.length,'PLAN_DUPLICATE');
      need(!s.runs.some(r=>r.id===id), 'RUN_ALREADY_EXISTS_NO_AUTOMATIC_RESEND');
      need(plan.maximum_nusd <= s.budget.per_run_limit_nusd && liabilities(s)+plan.maximum_nusd <= s.budget.total_limit_nusd, 'BUDGET_STOP_BEFORE_CALL');
      need(profile.kind === (s.budget.mode === 'offline' ? 'synthetic' : 'verified-live'), 'BUDGET_PRICE_MODE');
      const attempts = plan.slots.map(x=>({ ...x, id:`${id}/${x.stage}/${x.attempt}`, state:'planned', liability_nusd:x.reservation_nusd, request:null, response:null, usage:null, usage_cost_upper_nusd:null, error:null }));
      s.runs.push({ id, mode:s.budget.mode, state:'running', profile:copy(profile), profile_digest:C.digest(profile), plan:copy(plan), prepared_digest:preparedDigest, request_context:copy(requestContext), attempts, result:null });
      return { run_id:id, reservation_nusd:plan.maximum_nusd };
    });
  }
  countDispatch(runId,stage,attempt,request) {
    return this.#change('input_count_intent',s=>{
      const r=s.runs.find(r=>r.id===runId),t=r?.attempts.find(t=>t.stage===stage && t.attempt===attempt);
      need(r?.state==='running' && !s.frozen && r.plan.input_policy && t?.state==='planned' && !t.input_count,'COUNT_NOT_DISPATCHABLE');
      need(!r.attempts.some(a=>a.input_count?.error),'INPUT_RUN_STOPPED');
      t.input_count={state:'uncertain',request:copy(request),response:null,error:null};
      t.count_liability_nusd=t.count_reservation_nusd;
      return {run_id:runId,attempt_id:t.id,request_digest:C.digest(request),reservation_nusd:t.count_reservation_nusd};
    });
  }
  countSettle(runId,stage,attempt,observation) {
    return this.#change('input_count_observation',s=>{
      const r=s.runs.find(r=>r.id===runId),t=r?.attempts.find(t=>t.stage===stage && t.attempt===attempt);
      need(t?.input_count?.state==='uncertain' && t.input_count.response===null,'COUNT_NOT_SETTLEABLE');
      Object.assign(t.input_count,copy(observation));
      // No usage receipt is provided by input_tokens. Its separately verified
      // maximum fee remains charged against the journal even after success.
      return {run_id:runId,attempt_id:t.id,input_count_digest:C.digest(t.input_count),error:t.input_count.error};
    });
  }
  dispatch(runId, stage, attempt, request) {
    return this.#change('dispatch_intent', s=>{
      const r=s.runs.find(r=>r.id===runId); need(r?.state==='running' && !s.frozen,'RUN_NOT_DISPATCHABLE');
      const t=r.attempts.find(t=>t.stage===stage && t.attempt===attempt); need(t?.state==='planned','ATTEMPT_ALREADY_USED_OR_UNPLANNED');
      if(r.plan.input_policy) {
        need(!r.attempts.some(a=>a.input_count?.error),'INPUT_RUN_STOPPED');
        const count=t.input_count?.count;
        need(t.input_count?.state==='observed' && count && integer(count.input_tokens) && count.input_tokens<=t.input_tokens && count.request_sha256===request.body_sha256 && C.hash(request.body)===request.body_sha256,'INPUT_COUNT_REQUIRED_BEFORE_DISPATCH');
      }
      t.state='uncertain'; t.request=copy(request); t.started_at=new Date().toISOString();
      return { run_id:runId, attempt_id:t.id, request_digest:C.digest(request), reservation_nusd:t.reservation_nusd };
    });
  }
  settle(runId, stage, attempt, observation) {
    return this.#change('observe_response', s=>{
      const r=s.runs.find(r=>r.id===runId), t=r?.attempts.find(t=>t.stage===stage && t.attempt===attempt);
      need(t?.state==='uncertain' && t.response===null && t.error===null,'ATTEMPT_NOT_SETTLEABLE');
      Object.assign(t,copy(observation),{ended_at:new Date().toISOString()});
      if(['BOUND_VIOLATION','MODEL_IDENTITY_MISMATCH'].includes(observation.error))s.frozen=true;
      if (observation.usage_cost_upper_nusd !== null) {
        need(integer(observation.usage_cost_upper_nusd),'COST_INTEGER');
        const total=observation.usage_cost_upper_nusd+(t.count_liability_nusd??0);
        if(total > t.reservation_nusd || observation.error === 'BOUND_VIOLATION') { s.frozen=true; t.liability_nusd=Math.max(t.reservation_nusd,total); }
        else { t.state='settled'; t.liability_nusd=total; }
      }
      return { run_id:runId, attempt_id:t.id, state:t.state, liability_nusd:t.liability_nusd, error:t.error };
    });
  }
  finish(runId, result) {
    return this.#change('finish_run', s=>{
      const r=s.runs.find(r=>r.id===runId); need(r?.state==='running','RUN_NOT_RUNNING');
      r.state='finished'; r.result=copy(result);
      for(const t of r.attempts) if(t.state==='planned') { t.state='not_sent'; t.liability_nusd=t.count_liability_nusd??0; }
      return {run_id:runId, result_digest:C.digest(result), liability_nusd:r.attempts.reduce((n,t)=>n+t.liability_nusd,0)};
    });
  }
  note(runId,code) { need(typeof code==='string' && /^[A-Z0-9_]{1,80}$/.test(code),'DIAGNOSTIC_CODE');return this.#change('run_diagnostic',()=>({run_id:runId,code})); }
  snapshot() { const s=this.read(); return {...s, liability_nusd:liabilities(s), digest:C.digest(s)}; }
}
module.exports={Journal,liabilities};
