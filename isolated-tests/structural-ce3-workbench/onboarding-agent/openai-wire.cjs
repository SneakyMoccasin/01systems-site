'use strict';
const {need}=require('./protocol.cjs');
const Ajv=require('ajv');
const citation={type:'object',additionalProperties:false,required:['source_id','source_version','quote','occurrence'],properties:{source_id:{type:'string'},source_version:{type:'integer',minimum:1},quote:{type:'string'},occurrence:{type:'integer',minimum:1}}};
// Translate only the model's wire schema. The original onboarding contract still
// validates the complete proposal, references and transition after conversion.
function schemaFor(req){
  function convert(node){
    if(Array.isArray(node))return node.map(convert);
    if(!node||typeof node!=='object')return node;
    if(node.$ref){
      const [id,pointer]=node.$ref.split('#'),doc=req.referenced_schemas.find(s=>s.$id===id);
      need(doc&&pointer?.startsWith('/'),'WIRE_SCHEMA_REFERENCE');
      if(pointer==='/definitions/reference')return structuredClone(citation);
      return convert(pointer.slice(1).split('/').reduce((v,k)=>v[k],doc));
    }
    const result={};
    for(const [key,value] of Object.entries(node)){
      if(['$id','$schema','minLength','maxLength','uniqueItems'].includes(key))continue;
      if(key==='const'){result.enum=[value];result.type=typeof value;continue;}
      result[key]=convert(value);
    }
    if(result.enum&&!result.type)result.type=typeof result.enum[0];
    if(Array.isArray(result.type)){const types=result.type;delete result.type;result.anyOf=types.map(type=>({type}));}
    if(result.type==='object'){result.required=Object.keys(result.properties);result.additionalProperties=false;}
    return result;
  }
  const result=convert(req.response_schema);result.properties.questions.maxItems=3;return result;
}
function wireRequest(req,policy){
  const {instructions,response_schema,referenced_schemas,...context}=req;
  return {model:policy.price.model,store:false,service_tier:'default',truncation:'disabled',
    reasoning:{effort:'low'},max_output_tokens:policy.output_tokens,
    instructions:instructions+`\nTransportundantag: ange aldrig start/end/location i refs. Använd source_id, source_version, ett exakt citat och occurrence (1-baserad förekomst av exakt citat i källtexten). Lokalkoden löser UTF-16-positioner. Bevara gamla citat även för historiska items. Svara enligt API:ets JSON-schema.\nBevara ID:n, tidigare uppgifter och öppna luckor. Markera bara en gammal uppgift superseded när dess källa ersatts, dess ID slutar -missing eller vid den innehållsbevarande omklassificering som instruktionen beskriver. Ett svar på en fråga kan uppdatera det befintliga target-ID:t med referens till den nya svarskällan. Utelämnade öppna luckor förs tillbaka av sessionslagret; markera dem inte resolved på eget initiativ.`,
    input:JSON.stringify(context),text:{format:{type:'json_schema',name:'ce3_onboarding_draft_v1',strict:true,schema:schemaFor(req)}}};
}
function resolveResponse(req,wire){
  const validate=new Ajv({allErrors:true}).compile(schemaFor(req));
  need(validate(wire),'OPENAI_WIRE_SCHEMA');
  const result=structuredClone(wire);
  function resolve(ref){
    const source=req.sources.find(s=>s.id===ref.source_id&&s.version===ref.source_version);
    need(source&&ref.quote.length,'CITATION_SOURCE_OR_EMPTY');
    let start=-1;
    for(let n=0;n<ref.occurrence;n++){start=source.content.indexOf(ref.quote,start+1);need(start>=0,'CITATION_NOT_FOUND');}
    const old=req.previous_proposal?.items.flatMap(i=>[...i.refs,...(i.scenario_choice?[i.scenario_choice]:[])]).find(r=>r.source_id===ref.source_id&&r.source_version===ref.source_version&&r.quote===ref.quote&&r.start===start);
    return old?structuredClone(old):{source_id:ref.source_id,source_version:ref.source_version,quote:ref.quote,start,end:start+ref.quote.length,location:`Text ${ref.source_id}, version ${ref.source_version}`};
  }
  for(const item of result.items){item.refs=item.refs.map(resolve);if(item.scenario_choice)item.scenario_choice=resolve(item.scenario_choice);}
  return result;
}
module.exports={schemaFor,wireRequest,resolveResponse};
