'use strict';
// Read existing dependencies only. Never install or modify another worktree.
const fs=require('node:fs'),path=require('node:path'),{execFileSync,spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
let dependencyRoot=process.env.CE3_DEPENDENCY_ROOT??root;
if(!fs.existsSync(path.join(dependencyRoot,'node_modules/ajv/package.json'))&&!process.env.CE3_DEPENDENCY_ROOT){
  try{dependencyRoot=path.dirname(execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8'}).trim());}catch{}
}
if(!fs.existsSync(path.join(dependencyRoot,'node_modules/ajv/package.json'))){console.error('Ajv saknas. Ange CE3_DEPENDENCY_ROOT till en befintlig checkout med node_modules/ajv. Ingen installation görs.');process.exit(1);}
const args=process.argv.slice(2),test=args[0]==='--test';
const live=!test&&args.includes('--provider')&&args[args.indexOf('--provider')+1]==='openai'&&args.includes('--execute-live');
const child=spawn(process.execPath,test?['--test','--test-reporter=spec',...(args.slice(1).length?args.slice(1):[path.join(__dirname,'agent.test.cjs'),path.join(__dirname,'openai.test.cjs')])]:[path.join(__dirname,'server.cjs'),...args],
  {stdio:'inherit',cwd:root,env:{PATH:process.env.PATH,NODE_PATH:path.join(dependencyRoot,'node_modules'),...(live&&process.env.OPENAI_API_KEY?{OPENAI_API_KEY:process.env.OPENAI_API_KEY}:{})}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
