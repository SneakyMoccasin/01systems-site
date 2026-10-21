'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Store,Agent,describe}=require('./agent.cjs');
const {OfflineProvider,LocalCommandProvider}=require('./providers.cjs');
const {verifyCapabilities,need}=require('./protocol.cjs');
function createServer({data,provider=new OfflineProvider(),port=8877}){
  verifyCapabilities();const store=new Store(data),agent=new Agent(store,provider);
  const lock=path.join(store.root,'.server-lock'),token=crypto.randomBytes(32).toString('hex');
  const fd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,token}));fs.closeSync(fd);
  let queue=Promise.resolve();
  const server=http.createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try{
      need(req.headers.host===new URL(origin).host,'HOST_REJECTED');
      const url=new URL(req.url,origin);
      if(req.method==='GET'){
        if(url.pathname==='/api/sessions')return json(200,{sessions:store.list(),provider:provider.identity});
        if(url.pathname==='/api/session')return json(200,describe(store,url.searchParams.get('id'),url.searchParams.get('snapshot')||undefined));
        const assets={'/':['index.html','text/html'],'/app.js':['app.js','application/javascript'],'/style.css':['style.css','text/css']};
        const asset=assets[url.pathname];if(!asset)return json(404,{error:'NOT_FOUND'});
        res.writeHead(200,{'Content-Type':`${asset[1]}; charset=utf-8`});return res.end(fs.readFileSync(path.join(__dirname,'static',asset[0])));
      }
      need(req.method==='POST'&&url.pathname==='/api/command','ROUTE_REJECTED');
      need(req.headers.origin===origin&&req.headers['content-type']?.split(';')[0]==='application/json','ORIGIN_OR_CONTENT_TYPE');
      let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;need(size<=128000,'REQUEST_TOO_LARGE');chunks.push(chunk);}
      const command=JSON.parse(Buffer.concat(chunks));
      const job=queue.then(()=>agent.dispatch(command));queue=job.catch(()=>{});
      json(200,await job);
    }catch(error){json(error.message.startsWith('STALE_SNAPSHOT')?409:400,{error:error.message});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  const unlock=()=>{try{if(JSON.parse(fs.readFileSync(lock,'utf8')).token===token)fs.unlinkSync(lock);}catch{}};
  server.on('close',unlock);server.on('error',unlock);
  server.start=()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address()));});
  return server;
}
async function main(args){
  const opts={};for(let i=0;i<args.length;i+=2){need(['--data','--port','--model-command','--model-args','--model-id'].includes(args[i])&&args[i+1]!==undefined,'CLI_ARGUMENT');opts[args[i]]=args[i+1];}
  const port=Number(opts['--port']??8877);need(Number.isInteger(port)&&port>=0&&port<=65535,'PORT');
  const provider=opts['--model-command']?new LocalCommandProvider(opts['--model-command'],JSON.parse(opts['--model-args']??'[]'),opts['--model-id']):new OfflineProvider();
  const data=opts['--data']??path.join(__dirname,'../local-data/onboarding-agent');
  const server=createServer({data,port,provider});const address=await server.start();
  console.log(`CE3 onboarding: http://127.0.0.1:${address.port}\n${provider.identity.label}\nLagring: ${path.resolve(data)}`);
  for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>server.close(()=>process.exit(0)));
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={createServer};
