const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
try{
const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(root+'/index.html').href);await page.evaluate(()=>document.fonts.ready);
await page.locator('img[loading="lazy"]').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
const roles=['Data Analyst','Business Intelligence','Data Warehouse','AI Experimenter','Problem Solver'];
assert.equal(await page.locator('.site-header').count(),0);
assert.equal(await page.locator('.experience-list').count(),0);
const logos=page.locator('.logo-group:not([aria-hidden]) .company-logo');
assert.equal(await logos.count(),8);
assert.deepEqual(await logos.locator('img').evaluateAll(images=>images.map(i=>i.alt)),['Amartha','Sinar Mas Land','Universitas Indonesia','Knight Frank','Kementerian ATR/BPN','Pemerintah Provinsi DKI Jakarta','PT PAM Lyonnaise Jaya (PALYJA)','RevoU']);
assert.equal(await page.locator('.logo-group[aria-hidden="true"] a:not([tabindex="-1"])').count(),0);
assert.equal(await page.locator('.logo-group[aria-hidden="true"]').isVisible(),false);
assert.equal(await page.locator('.hero-description,.hero-bottom,.about-note,.tiny-label').count(),0);
assert.equal(await page.locator('.pending-label,#experience .section-heading>a').count(),0);
assert.equal(await page.locator('#motion-toggle').isVisible(),false);
assert.equal(await page.locator('.project-chrome h3').count(),7);
assert.equal(await page.locator('.project-body h3').count(),0);
assert.equal(await page.locator('.skill-row[open]').count(),0);
assert.equal(await page.locator('.project-bottom strong').count(),0);
assert.equal(await page.locator('.project-open', {hasText:'Explore project'}).count(),6);
assert.equal(await page.locator('#learning-title').textContent(),'Certificates & Training');
assert.equal(await page.locator('.certificate-grid:not(.certificate-copy) .certificate-card').count(),7);
assert.equal(await page.locator('.certificate-copy').isVisible(),false);
for(const width of [1920,1440,1024,800,768,560,390,320]){
await page.setViewportSize({width,height:width<600?844:960});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
const headingOverflow=await page.locator('.project-chrome h3,.skill-title,.skill-domain').evaluateAll(nodes=>nodes.some(e=>e.scrollWidth>e.clientWidth+1));assert.equal(headingOverflow,false,'title or toolkit overflow '+width);
assert.equal(await page.locator('.hero').evaluate(e=>e.getBoundingClientRect().top),0);
const portrait=await page.locator('.hero-photo').evaluate(e=>{const p=e.getBoundingClientRect(),c=document.querySelector('.hero-copy').getBoundingClientRect();return{round:getComputedStyle(e).borderRadius,square:Math.abs(p.width-p.height)<1,overlap:p.left<c.right&&p.right>c.left&&p.top<c.bottom&&p.bottom>c.top};});
assert.equal(portrait.round,'50%');assert.equal(portrait.square,true,'square portrait bounds '+width);assert.equal(portrait.overlap,false,'portrait overlaps title '+width);
for(const role of roles){await page.locator('#rotating-title').evaluate((e,role)=>e.textContent=role,role);assert.equal(await page.locator('.hero-role').evaluate(e=>e.scrollWidth>e.clientWidth),false,'role overflow '+width+' '+role);}
await page.locator('#rotating-title').evaluate(e=>e.textContent='Data Analyst');
await page.screenshot({path:require('node:os').tmpdir()+'/home-'+width+'.png',fullPage:true});
if([1440,390].includes(width))await page.screenshot({path:require('node:os').tmpdir()+'/home-hero-'+width+'.png'});
const badImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src));assert.deepEqual(badImages,[]);
}
await page.setViewportSize({width:1440,height:900});
await page.locator('#experience').evaluate(e=>e.scrollIntoView());
await page.screenshot({path:require('node:os').tmpdir()+'/home-logos-desktop.png'});
await page.setViewportSize({width:390,height:844});
await page.locator('#experience').evaluate(e=>e.scrollIntoView());
await page.screenshot({path:require('node:os').tmpdir()+'/home-logos-mobile.png'});
await page.locator('.logo-marquee').focus();
await page.keyboard.press('End');
await logos.last().focus();
assert.ok(await page.locator('.logo-marquee').evaluate(e=>e.scrollLeft>0),'last logo accessible by keyboard');
await page.locator('.company-logo:focus').evaluate(e=>e.blur());
await page.locator('.logo-marquee').evaluate(e=>e.scrollLeft=0);
await page.setViewportSize({width:1440,height:900});
for(const [filter,count] of [['analytics',3],['ml',2],['bi',1],['ai',1],['all',7]]){
await page.click('[data-filter="'+filter+'"]');assert.equal(await page.locator('.project-card:visible').count(),count);assert.equal(await page.locator('#project-count').textContent(),count+' project'+(count===1?'':'s'));
}
assert.equal(await page.locator('.project-card a[href^="projects/"]').count(),6);
await page.locator('.skill-row').nth(4).locator('summary').click();assert.equal(await page.locator('.skill-row').nth(4).getAttribute('open'),'');
await page.click('#toolkit-toggle');assert.equal(await page.locator('#toolkit-content').isVisible(),false);await page.keyboard.press('Enter');assert.equal(await page.locator('#toolkit-content').isVisible(),true);
await page.setViewportSize({width:390,height:844});await page.locator('#main-nav a[href="#projects"]').click();assert.equal(await page.evaluate(()=>location.hash),'#projects');
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
await page.locator('#copy-email').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent==='Email copied.');
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
await page.locator('#copy-email').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.includes('unavailable'));
assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.evaluate(()=>{
  window.typedFrames=[];
  new MutationObserver(()=>window.typedFrames.push(document.getElementById('rotating-title').textContent)).observe(document.getElementById('rotating-title'),{childList:true});
});
for(const role of [...roles.slice(1),roles[0]])await page.waitForFunction(role=>document.getElementById('rotating-title').textContent===role,role,{timeout:6500});
const typedFrames=await page.evaluate(()=>window.typedFrames);
assert.ok(typedFrames.includes('Data Analys'),'deletes letter by letter');
assert.ok(typedFrames.includes('B')&&typedFrames.includes('Bu'),'types letter by letter');
assert.ok(typedFrames.includes(''),'clears old title before typing');
for(let i=1;i<typedFrames.length;i++)assert.equal(Math.abs(typedFrames[i].length-typedFrames[i-1].length),1,'one character per frame');
await page.emulateMedia({reducedMotion:'reduce'});const paused=await page.locator('#rotating-title').textContent();await page.waitForTimeout(3700);assert.equal(await page.locator('#rotating-title').textContent(),paused);
assert.deepEqual(errors,[]);
await page.setViewportSize({width:1440,height:960});await page.locator('#projects').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-projects-desktop.png'});
await page.setViewportSize({width:390,height:844});await page.locator('.project-card').first().evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-project-mobile.png'});
await page.setViewportSize({width:1440,height:960});await page.locator('#skills').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-toolkit-desktop.png'});
const fixture=await browser.newPage({viewport:{width:390,height:844}});
await fixture.addInitScript(data=>Object.defineProperty(window,'PERSONAL_PROFILE',{get:()=>data,set:()=>{}}),{
experience:[{company:'Test company',role:'Test role',dates:'2020 - 2021',description:'Fixture content only.',logo:'images/profile.jpg'}],
certificates:[{title:'Test certificate',issuer:'Test issuer',year:'2021',image:'images/profile.jpg',url:'https://example.com/certificate'}]
});
await fixture.goto(pathToFileURL(root+'/index.html').href);
assert.equal(await fixture.locator('.pending-label').count(),0);
await fixture.locator('.experience-entry summary').click();assert.equal(await fixture.locator('.experience-entry').getAttribute('open'),'');
assert.equal(await fixture.locator('.certificate-grid:not(.certificate-copy) .certificate-card a').getAttribute('href'),'https://example.com/certificate');
assert.equal(await fixture.locator('.certificate-copy a').getAttribute('tabindex'),'-1');
assert.equal(await fixture.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await fixture.close();
const svgPage=await browser.newPage({viewport:{width:800,height:392}});
for(const name of ['lalafood','thelook','segmentation','campaign','abc','samba','smartlook']){
await svgPage.goto(pathToFileURL(root+'/assets/home/infographics/'+name+'.svg').href);
const clipped=await svgPage.locator('text').evaluateAll(nodes=>nodes.filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.top<0||r.right>800||r.bottom>392;}).map(e=>e.textContent));
assert.deepEqual(clipped,[],'infographic text bounds: '+name);
await svgPage.screenshot({path:require('node:os').tmpdir()+'/home-infographic-'+name+'.png'});
}
await svgPage.close();
await page.setViewportSize({width:1440,height:960});
await page.locator('#learning').evaluate(e=>e.scrollIntoView());
await page.screenshot({path:require('node:os').tmpdir()+'/home-certificates-desktop.png'});
await page.setViewportSize({width:390,height:844});
await page.locator('#learning').evaluate(e=>e.scrollIntoView());
await page.screenshot({path:require('node:os').tmpdir()+'/home-certificates-mobile.png'});
await page.mouse.move(0,0);
await page.emulateMedia({reducedMotion:'no-preference'});
await page.waitForFunction(()=>document.getElementById('certificate-content').scrollLeft>10);
await page.locator('#certificate-content').hover();
const hoverPosition=await page.locator('#certificate-content').evaluate(e=>e.scrollLeft);
await page.waitForTimeout(300);
assert.equal(await page.locator('#certificate-content').evaluate(e=>e.scrollLeft),hoverPosition,'hover pauses certificate row');
await page.mouse.move(0,0);await page.locator('#certificate-content').focus();
const focusPosition=await page.locator('#certificate-content').evaluate(e=>e.scrollLeft);
await page.waitForTimeout(300);
assert.equal(await page.locator('#certificate-content').evaluate(e=>e.scrollLeft),focusPosition,'focus pauses certificate row');
await page.locator('#certificate-content').evaluate(e=>{e.blur();e.scrollLeft=150;});
await page.emulateMedia({reducedMotion:'reduce'});
await page.waitForTimeout(100);
const reducedPosition=await page.locator('#certificate-content').evaluate(e=>e.scrollLeft);
await page.waitForTimeout(300);
assert.equal(await page.locator('#certificate-content').evaluate(e=>e.scrollLeft),reducedPosition,'reduced motion pauses certificate row');
assert.equal(await page.locator('.certificate-copy').isVisible(),false);
const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(pathToFileURL(root+'/index.html').href);assert.equal(await nojs.locator('.project-card').count(),7);assert.equal(await nojs.locator('.company-logo').count(),8);await nojs.close();
console.log('PASS: 8 widths, infographic assets, project filters, desktop icon links, keyboard toolkit controls, email feedback, full role sequence/pause, no-JS projects, populated profile fixtures, no browser errors.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
