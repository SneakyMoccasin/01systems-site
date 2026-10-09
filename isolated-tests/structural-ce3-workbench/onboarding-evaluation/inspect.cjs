'use strict';
// Human-readable offline view. No provider calls; evidence stays in original artifacts.
const fs=require('node:fs'),path=require('node:path');
for(const c of require('./cases.json').cases) for(let r=1;r<=2;r++) {
 const id=`${c.id}-r${r}`;if(process.argv[2]&&!id.startsWith(process.argv[2]))continue;
 console.log(`\n${id}`);
 for(const stage of ['draft','A','B']) {
  const dir=path.join(__dirname,'results',`${id}-${stage}`),file=path.join(dir,'parsed.json');if(!fs.existsSync(file))continue;
  const p=JSON.parse(fs.readFileSync(file));console.log(`\n${stage}`);
  if(stage==='draft') {
   console.log('ANALYSIS',JSON.stringify(p.analysis));console.log('SCOPE',JSON.stringify(p.scope));
   for(const i of p.items)console.log(JSON.stringify({id:i.id,type:i.type,status:i.status,statement:i.statement,value:i.value,supersedes:i.supersedes,refs:i.refs}));
   console.log('GAPS',JSON.stringify(p.gaps));
  } else {console.log('FINDINGS',JSON.stringify(p.findings));console.log('ASSESSMENTS',JSON.stringify(p.assessments));console.log('LIMITATIONS',JSON.stringify(p.limitations));}
  console.log('QUESTIONS',JSON.stringify(p.questions));
 }
}
