// Local browser check; auth/profile requests are mocked and no cloud writes occur.
const { chromium } = require(process.env.CHEMQUEST_PLAYWRIGHT_PATH || 'playwright-core');
const fs=require('fs'); const assert=require('assert/strict'); const path=require('path'); const os=require('os');
const baseUrl=process.env.CHEMQUEST_TEST_URL || 'http://127.0.0.1:8096';
const screenshots=process.env.CHEMQUEST_SCREENSHOTS || path.join(os.tmpdir(),'chemquest-periodic-check'); fs.mkdirSync(screenshots,{recursive:true});
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
  await page.goto(baseUrl+'/lessons');
  await click('Үелэх хүснэгт судлах'); await page.waitForURL('**/periodic');
  await page.getByText('Натри',{exact:true}).waitFor(); await overflow();
  await page.screenshot({path:path.join(screenshots, `periodic-${width}-explore.png`)});
  await page.getByRole('textbox',{name:'Элемент хайх',exact:true}).fill('Cl');
  await click('17. Cl · Хлор'); await page.getByText('Хлор',{exact:true}).waitFor();
  await click('2-р давхраа: 8 электрон'); await page.getByText('Гаднах давхраа: 7 электрон. Тодруулсан цагираг: 2-р давхраа.',{exact:true}).waitFor();
  await page.screenshot({path:path.join(screenshots, `periodic-${width}-atom.png`)});
  await click('Ахисан мэдээлэл'); await click('Cl-37');
  await page.getByText('Cl-37: 17 протон, 20 нейтрон, саармаг үед 17 электрон.',{exact:true}).waitFor();
  await click('17-р бүлгийг тодруулах');
  await page.getByText('17-р бүлэг · Галогенууд',{exact:true}).waitFor(); await overflow();
  await click('Бүлэг ба үе');
  for(const name of ['Li · Лити','Na · Натри','K · Кали']) await page.getByText(name,{exact:true}).waitFor();
  await page.screenshot({path:path.join(screenshots, `periodic-${width}-groups.png`)});
  await click('18-р бүлэг'); await page.getByText('He · Гели',{exact:true}).waitFor();
  await click('Үеэр хөндлөн →'); await click('3-р үе');await click('Ar · 8 e⁻'); await overflow();
  await click('Цээжлэх'); await page.getByText('Цээжилсэн: 0 / 20',{exact:true}).waitFor();
  await click('Карт эргүүлэх'); await click('Элементийг мэднэ');
  await page.getByText('Цээжилсэн: 1 / 20',{exact:true}).waitFor();await page.waitForTimeout(300);
  await page.reload();await click('Цээжлэх');await page.getByText('Цээжилсэн: 1 / 20',{exact:true}).waitFor();
  await click('Өөрийгөө шалгах');
  for(let i=0;i<10;i++) {
    const marker=`Санах дасгал · ${i+1} / 10`;
    await page.getByText(marker,{exact:true}).waitFor();
    const prompt=await page.getByText(marker,{exact:true}).evaluate(el=>el.nextElementSibling.textContent);
    const kind=['name','number','shells','group','position'][i%5];
    const symbol=(kind==='number'||kind==='position')?prompt.match(/\(([A-Za-z]+)\)/)[1]:kind==='shells'?prompt.match(/^([A-Za-z]+)-ийн/)[1]:prompt.split(' ')[0];
    const element=pack.elements.find(e=>e.symbol===symbol);assert.ok(element,prompt);
    if(kind==='position') await click(`${element.period}-р үе, ${element.group}-р бүлэг`);
    else {
      const answer=kind==='name'?element.name:kind==='number'?String(element.z):kind==='shells'?element.shells.join(', '):String(element.group);
      if(i===0){const radios=page.getByRole('radio');let picked=false;for(let j=0;j<await radios.count();j++){if(await radios.nth(j).getAttribute('aria-label')!==answer){await radios.nth(j).click();picked=true;break;}}assert.ok(picked);}
      else await page.getByRole('radio',{name:answer,exact:true}).click();
    }
    await click(i===9?'Дүнгээ харах':'Дараагийн даалгавар');
  }
  await page.getByText('Тестийн дүн: 9 / 10',{exact:true}).waitFor();await overflow();
  await page.screenshot({path:path.join(screenshots, `periodic-${width}-result.png`)});
  await click('Алдсан элементүүдээ давтах');await page.getByText('Санах дасгал · 1 / 1',{exact:true}).waitFor();
  const prompt=await page.getByText('Санах дасгал · 1 / 1',{exact:true}).evaluate(el=>el.nextElementSibling.textContent);const element=pack.elements.find(e=>e.symbol===prompt.split(' ')[0]);
  await page.getByRole('radio',{name:element.name,exact:true}).click();await click('Дүнгээ харах');await page.getByText('Тестийн дүн: 1 / 1',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: separate entry, element search, shell selection, isotope counts, group/period comparisons, memorization reload, 10 recall tasks incl. blank placement, missed-element retry, no page errors/overflow.`);
  await context.close();
 }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
