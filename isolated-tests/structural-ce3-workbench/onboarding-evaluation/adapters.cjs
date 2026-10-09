'use strict';
// Isolated wire adapter. No SR imports, session mutation, CE compilation or replay.
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const C = require('../contracts/onboarding-v1/contract.cjs');
const root = path.join(__dirname, '../contracts/onboarding-v1/schemas');
const contracts = Object.fromEntries(['proposal', 'review'].map(n => [n, JSON.parse(fs.readFileSync(path.join(root, `${n}.schema.json`)))]));
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const string = { type: 'string' }, strings = { type: 'array', items: string };
const quote = object({ source_id: string, source_version: { type: 'integer' }, quote: string, occurrence: { type: 'integer', minimum: 0 } });
function wireSchema(node) {
  if (Array.isArray(node)) return node.map(wireSchema);
  if (!node || typeof node !== 'object') return node;
  if (node.$ref) {
    const [urn, pointer = ''] = node.$ref.split('#');
    if (pointer === '/definitions/reference') return structuredClone(quote);
    let target = contracts[urn.split(':')[3]];
    for (const part of pointer.split('/').filter(Boolean)) target = target[part];
    return wireSchema(target);
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (['$id', '$schema', 'definitions', 'title'].includes(key)) continue;
    out[key] = wireSchema(value);
  }
  if (out.enum && !out.type) out.type = 'string';
  return out;
}
const question = object({ id: string, text: string, target_ids: strings, finding_ids: strings, reason: string, impact: {type:'string',enum:['blocks_handoff','limits_conclusion']} });
const questions = { type: 'array', items: question };
const draftSchema = object({ ...Object.fromEntries(['analysis', 'scope', 'items', 'gaps'].map(k => [k, wireSchema(contracts.proposal.properties[k])])), questions });
const assessment = object({ item_id: string, outcome: {type:'string',enum:['supported','partially_supported','unsupported','contradicted','cannot_determine']}, refs: { type:'array',items:quote }, explanation:string });
const reviewSchema = object({ status:wireSchema(contracts.review.properties.result.properties.status), assessments:{type:'array',items:assessment}, findings:wireSchema(contracts.review.properties.result.properties.findings), limitations:strings, questions });
const ajv = new Ajv({allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
const validators = {draft:ajv.compile(draftSchema),review:ajv.compile(reviewSchema)};
function validateWire(stage, value) {
  if (!validators[stage](value)) throw new Error(`WIRE_SCHEMA: ${ajv.errorsText(validators[stage].errors)}`);
}
function resolveReference(r, sources) {
  const source = sources.find(s => s.id === r.source_id && s.version === r.source_version);
  if (!source || !r.quote || !Number.isInteger(r.occurrence) || r.occurrence < 0) throw new Error('EXACT_QUOTE: invalid reference');
  let start = -1;
  for (let n = 0; n <= r.occurrence; n++) {
    start = source.content.indexOf(r.quote, start + 1);
    if (start < 0) throw new Error(`EXACT_QUOTE: ${r.source_id}`);
  }
  return { source_id:r.source_id,source_version:r.source_version,quote:r.quote,start,end:start+r.quote.length,location:null };
}
function sourcesFor(c) {
  return c.sources.map(s => ({id:s.id,version:1,kind:s.kind,original_ref:`synthetic://${c.id}/${s.id}`,original_sha256:C.hash(s.text),extraction:'complete',content:s.text,content_sha256:C.hash(s.text),extraction_note:null,trust:'data_only'}));
}
function proposalFrom(c, repetition, wire) {
  validateWire('draft', wire);
  const sources = sourcesFor(c), items = wire.items.map(i => ({...i,refs:i.refs.map(r=>resolveReference(r,sources)),scenario_choice:i.scenario_choice && resolveReference(i.scenario_choice,sources)}));
  return {schema_version:'ce3-onboarding-proposal/1',id:`${c.id}-r${repetition}`,revision:1,profile:'fixed-replay/0.1',analysis:structuredClone(wire.analysis),scope:structuredClone(wire.scope),sources,items,gaps:structuredClone(wire.gaps),change:{parent_digest:null,changed_item_ids:[],affected_finding_ids:[],reason:'First live draft; immutable evaluation snapshot.'}};
}
function reviewFrom(proposal, arm, wire, model) {
  validateWire('review', wire);
  // Resolve every assessment citation too; never silently drop an invalid record.
  wire.assessments.forEach(a => a.refs.forEach(r => resolveReference(r,proposal.sources)));
  return {schema_version:'ce3-onboarding-review/1',id:`${proposal.id}-${arm}`,request:{proposal_digest:C.digest(proposal),snapshot:structuredClone(proposal),trigger:'first_draft',changed_item_ids:[],prior_finding_ids:[],trust:'data_only'},result:{status:wire.status,assessed_item_ids:wire.assessments.map(a=>a.item_id),findings:wire.findings.map(f=>({...f,refs:f.refs.map(r=>resolveReference(r,proposal.sources))})),limitations:structuredClone(wire.limitations),producer:{mode:'live',adapter:`ce3-eval-${arm}/1`,model,prompt_version:'ce3-eval-prompts/1'}}};
}
function packet(proposal, reviews = []) {
  const d = C.digest(proposal);
  return {proposal,reviews,dialogue:{schema_version:'ce3-onboarding-dialogue/1',proposal_digest:d,questions:[],answers:[]},handoff:{schema_version:'ce3-onboarding-handoff/1',proposal_digest:d,review_status:C.reviewStatus(proposal,reviews),dispositions:[],confirmation:{status:'not_requested',proposal_digest:null,item_ids:[],scope_acknowledged:false,by:null,record:null},dialogue_status:'active',summary:'Evaluation only; no customer confirmation, compilation, or run.',unresolved_question_ids:[],unresolved_finding_ids:reviews.flatMap(r=>r.result.findings.map(f=>`${r.id}/${f.id}`)),readiness:'not_assessed',ce3_validation_status:'not_run',ce3_run_status:'not_run'}};
}
function validateQuestions(questions, proposal, review) {
  const ids = new Set(proposal.items.map(i=>i.id)), findings = new Set(review?.result.findings.map(f=>f.id) || []);
  if (new Set(questions.map(q=>q.id)).size !== questions.length) throw new Error('QUESTION_DUPLICATE');
  for (const q of questions) {
    if (!q.text.trim() || !q.reason.trim() || !q.target_ids.length || q.target_ids.some(id=>!ids.has(id)) || q.finding_ids.some(id=>!findings.has(id))) throw new Error('QUESTION_REFERENCE');
  }
}
function checks(proposal, review, questions) {
  const result = {};
  for (const [name, fn] of Object.entries({schema:()=>{C.schema('proposal',proposal);if(review) C.schema('review',review);},contract:()=>C.validatePacket(packet(proposal,review?[review]:[])),questions:()=>validateQuestions(questions,proposal,review)})) {
    try {fn();result[name]={valid:true};} catch(e) {result[name]={valid:false,error:e.message};}
  }
  return result;
}
module.exports = {draftSchema,reviewSchema,validateWire,resolveReference,sourcesFor,proposalFrom,reviewFrom,packet,checks};
