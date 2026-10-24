// Local browser check. Supabase requests are mocked; no accounts are created.
const { chromium } = require(process.env.CHEMQUEST_PLAYWRIGHT_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const baseUrl = process.env.CHEMQUEST_TEST_URL || 'http://127.0.0.1:8097';
const screenshots = process.env.CHEMQUEST_SCREENSHOTS || path.join(os.tmpdir(), 'chemquest-journey-check');
fs.mkdirSync(screenshots, { recursive: true });
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
  const url=fs.readFileSync('.env.local','utf8').match(/^EXPO_PUBLIC_SUPABASE_URL=(.*)$/m)[1].trim().replace(/^['"]|['"]$/g,'');
  const project=new URL(url).hostname.split('.')[0];
  for(const width of [390,1280]) {
   const context = await browser.newContext({viewport:{width,height:900}});
   const page = await context.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'journey@example.test',created_at:'2026-01-01T00:00:00Z',user_metadata:{}};
   const exp=Math.floor(Date.now()/1000)+3600;
   const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp})).toString('base64url')+'.test-signature';
   await page.addInitScript(({project,user,exp,token})=>{localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user}));},{project,user,exp,token});
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};
   await page.route('**/auth/v1/**',r=>r.fulfill({status:200,headers,body:JSON.stringify({user})}));
   await page.route('**/rest/v1/profiles*',r=>r.fulfill({status:200,headers,body:JSON.stringify({id:user.id,email:user.email,nickname:'Journey Test',class_id:'beginner',xp:0,completed:{},created_at:user.created_at})}));
   await page.route('**/rest/v1/experiments*',r=>r.fulfill({status:200,headers,body:'[]'}));
   const click=(name)=>page.getByRole('button',{name,exact:true}).click();
   const visible=async(text)=>assert.ok(await page.getByText(text,{exact:true}).isVisible(),text);
   const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
   await page.goto(baseUrl + '/lessons');
   await click('Туршилтын хичээл нээх');
   await page.getByText('Катализатор гэж юу вэ?',{exact:true}).waitFor(); await overflow();
   await page.screenshot({path:path.join(screenshots, `journey-${width}-learn.png`)});
   await click('Нэр томьёо харах'); await visible('концентрац');
   await click('Үргэлжлүүлэх');
   assert.ok(await page.getByRole('button',{name:'Үргэлжлүүлэх',exact:true}).isDisabled());
   await page.getByRole('radio',{name:'Урвал бүрэн зогсоно'}).click();
   await click('Үргэлжлүүлэх');
   await page.getByText('Ажиглах аргаа сонгоорой',{exact:true}).waitFor();
   await click('3D лаборатори нээх'); await page.waitForURL('**/openlab'); await click('Back to the ChemQuest hub'); await page.getByText('Ажиглах аргаа сонгоорой',{exact:true}).waitFor();
   await click('Катализатор нэмэх');
   await page.getByRole('textbox',{name:'Ажиглалт',exact:true}).fill('Катализатор нэмэхэд хөөс огцом ихэссэн.');
   await page.getByText('Энэ төхөөрөмжид хадгалсан',{exact:true}).waitFor();
   await overflow(); await page.screenshot({path:path.join(screenshots, `journey-${width}-observe.png`)});
   await page.reload();
   await page.getByRole('textbox',{name:'Ажиглалт',exact:true}).waitFor();
   assert.equal(await page.getByRole('textbox',{name:'Ажиглалт',exact:true}).inputValue(),'Катализатор нэмэхэд хөөс огцом ихэссэн.');
   await click('Үргэлжлүүлэх');
   const reflection=page.getByRole('textbox',{name:'Яагаад хөөс хурдан үүссэн бэ? Катализаторын үүргийг тайлбарла.',exact:true});
   await reflection.fill('Катализатор бага энерги шаардсан өөр зам бий болгож урвалыг хурдасгасан.');
   await click('Тайлбарын шалгуур харах');
   await page.getByRole('checkbox').first().click();
   await click('Үргэлжлүүлэх');
   
   for(const [i,answer] of ['Урвалд зарцуулагдаж дуусна','Манганы диоксид','Урвал дууссан'].entries()) {
    await page.getByRole('radio',{name:answer,exact:true}).click();
    await click(i===2?'Дүнгээ харах':'Дараагийн асуулт');
   }
   await visible('3 / 3'); await click('Хичээлээ дуусгах');
   await page.getByText('Хичээл дууссан • Явц хадгалагдсан',{exact:true}).waitFor();
   await page.getByText('Энэ төхөөрөмжид хадгалсан',{exact:true}).waitFor();
   await page.reload();
   await page.getByText('Хичээл дууссан • Явц хадгалагдсан',{exact:true}).waitFor();
   await overflow(); await page.screenshot({path:path.join(screenshots, `journey-${width}-complete.png`)});
   await click('Хичээлийн танхим руу'); await click('Туршилтын хичээл нээх');
   await page.getByText('Хичээл дууссан • Явц хадгалагдсан',{exact:true}).waitFor();
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: Lesson Hall entry, glossary, gating, observation, reload, reflection, self-mark, quiz 3/3, completion persistence, return; no page errors or horizontal overflow.`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
