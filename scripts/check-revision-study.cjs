// Local browser check with mocked auth/profile requests; no cloud writes.
const { chromium } = require(process.env.CHEMQUEST_PLAYWRIGHT_PATH || 'playwright-core');
const fs=require('fs'); const assert=require('assert/strict'); const path=require('path'); const os=require('os');
const baseUrl=process.env.CHEMQUEST_TEST_URL || 'http://127.0.0.1:8098';
const screenshots=process.env.CHEMQUEST_SCREENSHOTS || path.join(os.tmpdir(),'chemquest-revision-check'); fs.mkdirSync(screenshots,{recursive:true});
const pack=JSON.parse(fs.readFileSync('src/data/revision-hub/g8-chem/content.json','utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
 const url=fs.readFileSync('.env.local','utf8').match(/^EXPO_PUBLIC_SUPABASE_URL=(.*)$/m)[1].trim().replace(/^['"]|['"]$/g,''); const project=new URL(url).hostname.split('.')[0];
 for(const width of (process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [390,1280])) {
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'revision@example.test',created_at:'2026-01-01T00:00:00Z',user_metadata:{}};
  const exp=Math.floor(Date.now()/1000)+3600;const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp})).toString('base64url')+'.test-signature';
  await page.addInitScript(({project,user,exp,token})=>{localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user}));},{project,user,exp,token});
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};
  await page.route('**/auth/v1/**',r=>r.fulfill({status:200,headers,body:JSON.stringify({user})}));
  await page.route('**/rest/v1/profiles*',r=>r.fulfill({status:200,headers,body:JSON.stringify({id:user.id,email:user.email,nickname:'Revision Test',class_id:'beginner',xp:0,completed:{},created_at:user.created_at})}));
  const go=async(path)=>{await page.goto(baseUrl+path);try {await page.getByRole('button',{name:'Төвлөрөх',exact:true}).waitFor();} catch(e) {console.log('FAILED ROUTE',path,errors,await page.locator('body').innerText());throw e;}};
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'document horizontal overflow');
  await page.goto(baseUrl+'/lessons');await page.getByRole('button',{name:'Давтлагын төв нээх',exact:true}).waitFor();
  await page.screenshot({path:path.join(screenshots, `revision-${width}-hall.png`)});
  await click('Давтлагын төв нээх');await page.getByText('Өөрийн хурдаар, сэдэв бүрээр',{exact:true}).waitFor();await overflow();
  await page.screenshot({path:path.join(screenshots, `revision-${width}-home.png`)});
  for(const topic of pack.topics) for(const tab of ['notes','cards','quiz','questions','prac']) {
   await go(`/hub/g8-chem/topic/${topic.id}/${tab}`);await page.getByText(topic.title,{exact:true}).first().waitFor(); await overflow();
  }
  console.log(`PASS ${width}px: all 11 topics × 5 tabs render.`);
  await go('/hub/g8-chem/topic/1.1/notes'); await page.getByRole('button',{name:'Уншсан гэж тэмдэглэх',exact:true}).first().click();
  await page.getByText('Төхөөрөмжид хадгалсан',{exact:true}).waitFor(); await page.reload();await page.getByRole('button',{name:'Уншсан ✓',exact:true}).waitFor();
  await click('Төвлөрөх');assert.equal(await page.getByText('Хими 8 • Бүлэг, сэдвээр суралцах',{exact:true}).count(),0);await click('Бүтэн харагдац');
  await go('/hub/g8-chem/topic/1.1/cards');await click('Карт эргүүлэх');await click('Мэднэ');
  await page.getByText(`Мэднэ: 1 / ${pack.topics[0].flashcards.length}`,{exact:true}).waitFor();
  await go('/hub/g8-chem/topic/1.1/quiz');
  for(const [i,q] of pack.topics[0].quiz.entries()) {await page.getByRole('radio').nth(q.answer).click();await click(i===pack.topics[0].quiz.length-1?'Тест дуусгах':'Дараагийн асуулт');}
  await page.getByText('100%',{exact:true}).waitFor();await page.getByText('Төхөөрөмжид хадгалсан',{exact:true}).waitFor();
  await go('/hub/g8-chem/topic/1.1/questions'); await page.getByRole('button',{name:'Загвар хариулт, схем харах',exact:true}).first().click();await page.getByRole('checkbox').first().click();
  await page.getByText('Төхөөрөмжид хадгалсан',{exact:true}).waitFor();
  for(const ref of ['review','mixed','tables','glossary','checklist','search','errata','progress','tools','periodic']) {await go('/hub/g8-chem/'+ref);await overflow();}
  await page.getByRole('button',{name:'58 Цери',exact:true}).first().click();await page.getByText('Цери',{exact:true}).waitFor();await click('Ахисан мэдээлэл');
  await page.screenshot({path:path.join(screenshots, `revision-${width}-periodic.png`)});
  await go('/hub/g8-chem/search');await page.getByRole('textbox',{name:'Агуулгаас хайх',exact:true}).fill('катализатор'); await page.getByText('Катализатор',{exact:true}).first().waitFor();
  await go('/hub/g8-chem/checklist'); await page.getByRole('button',{name:'Чадна',exact:true}).first().click();await page.getByText('Төхөөрөмжид хадгалсан',{exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'✓ Чадна',exact:true}).waitFor();
  await page.goto(baseUrl+'/lessons');await click('Суурь хичээлүүд нээх');await page.waitForURL('**/lessons/basics');await page.getByText('Lab Rookie',{exact:true}).waitFor();
  await page.goto(baseUrl+'/lessons');await click('Туршилтын хичээл нээх');await page.waitForURL('**/lessons/catalyst');await page.getByText('Катализатор гэж юу вэ?',{exact:true}).waitFor();
  assert.deepEqual(errors,[]); console.log(`PASS ${width}px: separate entries, note reload, cards, quiz 100%, question self-mark, references, element selection, search, checklist persistence, no page errors/overflow.`);
  await context.close();
 }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
