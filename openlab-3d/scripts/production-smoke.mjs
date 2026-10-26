/** Smoke-test the actual embedded bundle, not Vite's development module loader. No npm browser dependency. */
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,access,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../public/',import.meta.url));
const candidates=[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let executable;for(const path of candidates){try{await access(path);executable=path;break;}catch{}}
assert.ok(executable,'Chrome/Chromium is required; set CHROME_PATH to its executable.');
const failures=[],mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));assert.ok(path.startsWith(root.endsWith(sep)?root:root+sep));res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{failures.push(req.url);res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(resolve(tmpdir(),'openlab-production-'));
const browser=spawn(executable,['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let socket;
try{
 const endpoint=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Chrome did not start within 20 seconds')),20000);browser.once('error',reject);browser.stderr.on('data',data=>{output+=data;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});browser.once('exit',code=>reject(Error(`Chrome exited early (${code})`)));});
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let counter=0;const pending=new Map(),exceptions=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);if(p){clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 for(const {width,experiment} of [{width:1280,experiment:'g10-nylon'},{width:390,experiment:'g10-nylon'},{width:390,experiment:'g9-filtration'},{width:390,experiment:'g10-galvanic'},{width:390,experiment:'g9-carbonate-co2'},{width:390,experiment:'g7-phenolphthalein'},{width:1280,experiment:'g9-precipitation'},{width:390,experiment:'g9-liquid-diffusion'},{width:1280,experiment:'nacl'}].filter(c=>(!process.env.OPENLAB_SMOKE_EXPERIMENT||c.experiment===process.env.OPENLAB_SMOKE_EXPERIMENT)&&(!process.env.OPENLAB_SMOKE_WIDTH||c.width===Number(process.env.OPENLAB_SMOKE_WIDTH)))){
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params)=>send(method,params,sessionId);
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width,height:980,deviceScaleFactor:1,mobile:width===390});
  await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('openlab3d-settings',JSON.stringify({state:{quality:'low',lookMode:'keyboard',reducedMotion:true},version:1}))"});
  await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/openlab/index.html?experiment=${experiment}`});
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true})).result.value;
  const waitFor=async(expression,label)=>{const deadline=Date.now()+600000;while(Date.now()<deadline){assert.deepEqual(exceptions,[],`Production JavaScript error: ${exceptions.join('\n')}`);if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,250));}throw Error(`Production page did not reach ${label}: ${await evaluate("document.querySelector('[aria-label=\"Тодорхой тунтай алхамчилсан заавар\"]')?.innerText")}`);};
  await waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Лабораторид орох')",'entry screen');
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Энэ туршилтын 3D үзүүлбэр"]')`),false,'No demo option before entering an experiment');
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Лабораторид орох').click()");
  await waitFor("document.querySelector('canvas') && Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Ширээнээс гарах')",'3D bench');
  await waitFor("document.querySelector('[aria-label=\"Энэ туршилтын 3D үзүүлбэр\"]')",'showcase launch button');
  const button=await evaluate("(()=>{const b=document.querySelector('[aria-label=\"Энэ туршилтын 3D үзүүлбэр\"]'),r=b.getBoundingClientRect();return {color:getComputedStyle(b).backgroundColor,top:r.top,bottom:r.bottom,height:r.height};})()");
  assert.equal(await evaluate(`!!document.querySelector('[aria-labelledby="showcase-chooser-title"]')`),false,'No cross-experiment chooser');
  assert.equal(button.color,'rgb(245, 184, 0)');assert.ok(button.top>=0&&button.bottom<=980&&button.height>=56,'Bright button must be visible without scrolling');
  await evaluate("document.querySelector('[aria-label=\"Энэ туршилтын 3D үзүүлбэр\"]').click()");
  await waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Авто үзүүлбэрийг түр зогсоох')",'running physical showcase');
  if(experiment==='g10-nylon'){
   await waitFor("document.querySelector('[aria-label=\"Багажийн нэр ба идэвхтэй хэсэг\"]')",'readable apparatus labels');
   assert.ok(await evaluate("document.querySelector('[aria-label=\"Багажийн хэсгүүдийн тайлбар\"]')?.innerText.includes('Усан диамин')"));
  }
  if(experiment==='g10-galvanic'){
   await waitFor("document.querySelector('[aria-label=\"Багажийн нэр ба идэвхтэй хэсэг\"]')",'electrical apparatus labels');
   assert.ok(await evaluate("Boolean(document.querySelector('[aria-label=\"3. Давсан гүүр\"]'))"));
  }
  if(process.env.OPENLAB_SMOKE_SCREENSHOTS){
   await new Promise(r=>setTimeout(r,3500));await mkdir(process.env.OPENLAB_SMOKE_SCREENSHOTS,{recursive:true});
   const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(resolve(process.env.OPENLAB_SMOKE_SCREENSHOTS,`${experiment}-${width}-pour.png`),Buffer.from(shot.data,'base64'));
  }
  await waitFor(`document.querySelector('[aria-label="Тодорхой тунтай алхамчилсан заавар"]')?.innerText.includes('2 /')`,'first measured transfer to complete');
  if(experiment==='g10-galvanic'||experiment==='g9-carbonate-co2'){
   await waitFor(`document.querySelector('[aria-label="Хөдөлж буй багажийн үйлдэл"]')`,'physical apparatus action');
   if(process.env.OPENLAB_SMOKE_SCREENSHOTS){await new Promise(r=>setTimeout(r,1600));const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(resolve(process.env.OPENLAB_SMOKE_SCREENSHOTS,`${experiment}-${width}-connection.png`),Buffer.from(shot.data,'base64'));}
  }
  const observation=experiment==='g10-nylon'?'найлон хальс':experiment==='g9-precipitation'?'Тунадас':experiment==='g9-liquid-diffusion'?'аажмаар тархана':null;
  if(observation){
   await waitFor(`document.querySelector('[aria-label="Харагдаж буй өөрчлөлтийн тайлбар"]')?.innerText.includes(${JSON.stringify(observation)})`,'reaction-specific observable state');
   if(experiment==='g9-precipitation'){const step=await evaluate("document.querySelector('[aria-label=\"Тодорхой тунтай алхамчилсан заавар\"]')?.innerText");assert.ok(!step.includes('1 / 14'),'No visible precipitate should be announced while adding only the first solution');}
   if(process.env.OPENLAB_SMOKE_SCREENSHOTS){const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(resolve(process.env.OPENLAB_SMOKE_SCREENSHOTS,`${experiment}-${width}-reaction.png`),Buffer.from(shot.data,'base64'));}
  }
  await waitFor(`document.querySelector('[aria-label="Туршилтын баталгаажсан үр дүн"]')`,'the complete verified experiment');
  assert.equal(await evaluate(`!!document.querySelector('[aria-labelledby="showcase-chooser-title"]')`),false,'Demo must stay in the selected experiment');
  if(process.env.OPENLAB_SMOKE_SCREENSHOTS){
   await mkdir(process.env.OPENLAB_SMOKE_SCREENSHOTS,{recursive:true});
   const shot=await call('Page.captureScreenshot',{format:'png'});
   await writeFile(resolve(process.env.OPENLAB_SMOKE_SCREENSHOTS,`${experiment}-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(exceptions,[]);assert.deepEqual(failures,[],'Missing production assets');
  console.log(`PASS production ${width}px: 3D bench loads; ${experiment}: the current guide completes its full protocol and verifies the final result; no JavaScript errors or missing assets.`);await send('Target.closeTarget',{targetId});
 }
}finally{socket?.close();browser.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
