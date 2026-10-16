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
const roles=['Data Scientist','Data Analyst','Business Intelligence','Data Warehouse','AI Experimenter','Problem Solver'];
assert.equal(await page.locator('#rotating-title').textContent(),roles[0]);
assert.equal(await page.locator('.site-header').count(),0);
assert.equal(await page.locator('.experience-list').count(),0);
const logos=page.locator('.logo-group:not([aria-hidden]) .company-logo');
assert.equal(await logos.count(),8);
const palette=await page.evaluate(()=>({
  projects:getComputedStyle(document.getElementById('projects')).backgroundColor,
  toolkit:getComputedStyle(document.querySelector('.workbench-bar')).backgroundColor,
  certificates:getComputedStyle(document.getElementById('learning')).backgroundColor,
  button:getComputedStyle(document.querySelector('.contact .button')).backgroundColor,
  certificateLabel:getComputedStyle(document.querySelector('.learning .section-index')).color,
  projectLabel:getComputedStyle(document.querySelector('#projects .section-index')).color,
  contact:getComputedStyle(document.getElementById('contact')).backgroundColor,
  logoFonts:[...document.querySelectorAll('.company-logo-label')].map(e=>getComputedStyle(e).fontFamily)
}));
assert.equal(palette.projects,'rgb(35, 188, 107)','projects stay green');
assert.equal(palette.toolkit,palette.certificates,'toolkit title bar uses certificate yellow');
assert.equal(palette.certificates,'rgb(255, 227, 75)','certificates stay yellow');
assert.equal(palette.button,palette.projects,'contact button uses project green');
assert.equal(await page.locator('.contact .button').getAttribute('href'),'https://www.linkedin.com/in/rafiqnaufal/');
assert.equal(await page.locator('.contact .button').getAttribute('target'),'_blank');
assert.equal(await page.locator('.contact .button').getAttribute('rel'),'noopener noreferrer');
assert.equal(palette.certificateLabel,'rgb(0, 0, 0)');
assert.equal(palette.projectLabel,'rgb(0, 0, 0)');
assert.equal(palette.contact,'rgb(36, 146, 255)');
assert.ok(palette.logoFonts.every(font=>font.startsWith('Arial')),'government logo labels use sans-serif');
assert.deepEqual(await logos.locator('img').evaluateAll(images=>images.map(i=>i.alt)),['Amartha','Sinar Mas Land','Universitas Indonesia','Knight Frank','Kementerian ATR/BPN','Pemerintah Provinsi DKI Jakarta','PT PAM Lyonnaise Jaya (PALYJA)','RevoU']);
assert.equal(await page.locator('.logo-group[aria-hidden="true"] a:not([tabindex="-1"])').count(),0);
assert.equal(await page.locator('.logo-group[aria-hidden="true"]').isVisible(),false);
assert.equal(await page.locator('.hero-description,.hero-bottom,.about-note,.tiny-label').count(),0);
assert.equal(await page.locator('.pending-label,#experience .section-heading>a').count(),0);
assert.equal(await page.locator('#motion-toggle').isVisible(),false);
assert.equal(await page.locator('.project-chrome h3').count(),8);
const featuredDestinations=['https://smartlook-ai-agent.vercel.app/','https://gis-ai-agent.vercel.app/'];
assert.deepEqual(await page.locator('.project-card').evaluateAll(cards=>cards.slice(0,2).map(card=>card.querySelector('a').href)),featuredDestinations);
assert.equal(await page.locator('#project-count').textContent(),'8 projects');
assert.equal(await page.locator('[data-filter="all"] span').textContent(),'08');
assert.equal(await page.locator('#main-nav a[href="#learning"] .shortcut-label').textContent(),'Certificates');
assert.equal(await page.locator('.project-open', {hasText:'Explore project'}).count(),8);
assert.equal(await page.locator('.project-open', {hasText:'Open repository'}).count(),0);
assert.deepEqual(await page.locator('.project-open').evaluateAll(links=>links.slice(0,2).map(a=>a.href)),featuredDestinations);
const demoVideos=page.locator('.project-video video');
assert.equal(await demoVideos.count(),8);
assert.equal(await page.locator('a video').count(),0);
await page.waitForFunction(()=>[...document.querySelectorAll('.project-video video')].every(v=>v.readyState>=2&&v.videoWidth>0),{},{timeout:30000});
assert.ok(await demoVideos.evaluateAll(videos=>videos.every(v=>v.controls&&v.playsInline&&v.muted&&v.autoplay&&v.loop)));
for(const video of await demoVideos.all()){
  await video.evaluate(async v=>{v.currentTime=1;await v.play();});
  await page.waitForFunction(()=>[...document.querySelectorAll('.project-video video')].some(v=>!v.paused&&v.currentTime>1.1));
}
await page.waitForFunction(()=>[...document.querySelectorAll('.project-video video')].every(v=>!v.paused&&v.currentTime>0));
await page.click('[data-filter="analytics"]');
assert.ok(await demoVideos.evaluateAll(videos=>videos.filter(v=>v.closest('.project-card').hidden).every(v=>v.paused)),'filtering out videos pauses playback');
await page.click('[data-filter="all"]');
await demoVideos.evaluateAll(videos=>videos.forEach(v=>v.currentTime=0));
assert.equal(await page.locator('.project-body h3').count(),0);
assert.equal(await page.locator('.skill-row[open]').count(),0);
assert.equal(await page.locator('.project-bottom strong').count(),0);
assert.equal(await page.locator('.project-open', {hasText:'Explore project'}).count(),8);
assert.equal(await page.locator('#learning-title').textContent(),'Certificates & Training');
const certificates=page.locator('.certificate-grid:not(.certificate-copy) .certificate-card');
assert.equal(await certificates.count(),9);
assert.equal(await certificates.locator('.certificate-info p').count(),0);
assert.equal(await certificates.first().locator('h3').textContent(),'RevoU Full Stack Data Analytics');
assert.equal(await certificates.nth(7).locator('h3').textContent(),'Internship in Spatial Planning For Regional and National Growth');
assert.equal(await page.locator('#about a').count(),0);
assert.match(await page.locator('.about-copy').textContent(),/SmartLook/);
assert.match(await page.locator('.about-copy').textContent(),/SQL, Python, dbt/);
const certificateContent=await certificates.evaluateAll(cards=>cards.map(card=>({title:card.querySelector('h3').textContent,issuer:card.querySelector('.mono').textContent,date:card.querySelector('p')?.textContent||'',pdf:card.querySelector('a').getAttribute('href'),image:card.querySelector('img').getAttribute('src')})));
assert.equal(new Set(certificateContent.map(c=>c.pdf)).size,9);
assert.ok(certificateContent.every(c=>c.pdf.endsWith('.pdf')&&c.image.endsWith('.png')));
assert.equal(await certificates.locator('a[target="_blank"][rel="noopener noreferrer"]').count(),9);
assert.equal(await page.locator('.certificate-copy a:not([tabindex="-1"])').count(),0);
assert.equal(await page.locator('.certificate-copy').isVisible(),false);
for(const width of [1920,1440,1024,800,768,700,600,560,390,320]){
await page.setViewportSize({width,height:width<600?844:960});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
if(width>1100){
  const widths=await page.locator('#projects>.wrap,#learning>.wrap').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().width));
  assert.ok(widths.every(value=>Math.abs(value-Math.min(1240,width-96))<1),'original project and certificate widths '+width);
  assert.ok(await page.locator('#about>.wrap').evaluate(e=>e.getBoundingClientRect().width<=1240),'about retains readable width');
}
assert.equal(await page.locator('.desktop-shortcut').evaluateAll(nodes=>nodes.some(e=>{
  const parent=e.getBoundingClientRect(),label=e.querySelector('.shortcut-label').getBoundingClientRect();
  return label.left<parent.left-1||label.right>parent.right+1;
})),false,'shortcut label containment '+width);
const headingOverflow=await page.locator('.project-chrome h3,.skill-title,.skill-domain,.certificate-info h3,.certificate-info p,.about-copy p,.shortcut-label').evaluateAll(nodes=>nodes.some(e=>e.scrollWidth>e.clientWidth+1));assert.equal(headingOverflow,false,'title or toolkit overflow '+width);
const certificateHeights=await certificates.evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().height));
assert.ok(await demoVideos.evaluateAll(videos=>videos.every(v=>{
  const media=v.getBoundingClientRect(),card=v.closest('.project-card').getBoundingClientRect();
  return media.width>0&&media.left>=card.left&&media.right<=card.right&&getComputedStyle(v).objectFit==='contain'&&Math.abs(media.width/media.height-v.videoWidth/v.videoHeight)<0.01&&parseFloat(getComputedStyle(v.parentElement).paddingTop)>=10;
})),'video framing '+width);
assert.ok(Math.max(...certificateHeights)-Math.min(...certificateHeights)<1,'consistent certificate heights '+width);
assert.equal(await page.locator('.hero').evaluate(e=>e.getBoundingClientRect().top),0);
const portrait=await page.locator('.hero-photo').evaluate(e=>{const p=e.getBoundingClientRect(),c=document.querySelector('.hero-copy').getBoundingClientRect();return{round:getComputedStyle(e).borderRadius,square:Math.abs(p.width-p.height)<1,overlap:p.left<c.right&&p.right>c.left&&p.top<c.bottom&&p.bottom>c.top};});
assert.equal(portrait.round,'50%');assert.equal(portrait.square,true,'square portrait bounds '+width);assert.equal(portrait.overlap,false,'portrait overlaps title '+width);
assert.equal(await page.locator('.hero-photo').evaluate(e=>{const p=e.getBoundingClientRect(),c=document.querySelector('.hero-copy').getBoundingClientRect();return p.left>=c.right&&p.top<c.bottom&&p.bottom>c.top;}),true,'horizontal hero layout '+width);
for(const role of roles){await page.locator('#rotating-title').evaluate((e,role)=>e.textContent=role,role);assert.equal(await page.locator('.hero-role').evaluate(e=>e.scrollWidth>e.clientWidth),false,'role overflow '+width+' '+role);}
await page.locator('#rotating-title').evaluate(e=>e.textContent='Data Scientist');
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
for(const [filter,count] of [['analytics',3],['ml',2],['bi',1],['ai',2],['all',8]]){
await page.click('[data-filter="'+filter+'"]');assert.equal(await page.locator('.project-card:visible').count(),count);assert.equal(await page.locator('#project-count').textContent(),count+' project'+(count===1?'':'s'));
}
assert.equal(await page.locator('.project-card .project-open[href^="projects/"]').count(),6);
assert.ok(await page.locator('.project-card a').evaluateAll(links=>links.every(a=>a.target==='_blank'&&a.relList.contains('noopener')&&a.relList.contains('noreferrer'))));
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
await demoVideos.first().evaluate(v=>v.dispatchEvent(new Event('error')));
assert.equal(await page.locator('.project-video .video-error').first().isVisible(),true);
assert.match(await page.locator('.project-video .video-error a').first().getAttribute('href'),/smartlook-ai-agent#demo$/);
await demoVideos.first().evaluate(v=>{v.hidden=false;v.parentElement.querySelector('.video-error').hidden=true;});
await page.setViewportSize({width:1440,height:960});await page.locator('#projects').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-projects-desktop.png'});
await page.setViewportSize({width:390,height:844});await page.locator('.project-card').first().evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-project-mobile.png'});
await page.setViewportSize({width:1440,height:960});await page.locator('#skills').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-toolkit-desktop.png'});
await page.setViewportSize({width:1920,height:1080});
await page.locator('#projects').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-projects-wide.png'});
await page.emulateMedia({reducedMotion:'reduce'});
await page.locator('#learning').evaluate(e=>e.scrollIntoView());
await page.locator('#certificate-content').evaluate(e=>e.scrollLeft=0);
await page.screenshot({path:require('node:os').tmpdir()+'/home-certificates-wide.png'});
await page.locator('#contact').evaluate(e=>e.scrollIntoView());await page.screenshot({path:require('node:os').tmpdir()+'/home-contact-colors.png'});
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
for(const name of ['lalafood','thelook','segmentation','campaign','abc','samba','smartlook','orbiview']){
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
const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(pathToFileURL(root+'/index.html').href);assert.equal(await nojs.locator('.project-card').count(),8);assert.equal(await nojs.locator('.company-logo').count(),8);
assert.deepEqual(await nojs.locator('.project-card').evaluateAll(cards=>cards.slice(0,2).map(card=>card.querySelector('a').href)),featuredDestinations);
const fallbackCertificates=await nojs.locator('.certificate-card').evaluateAll(cards=>cards.map(card=>({title:card.querySelector('h3').textContent,issuer:card.querySelector('.mono').textContent,date:card.querySelector('p')?.textContent||'',pdf:new URL(card.querySelector('a').getAttribute('href'),location.href).href,image:new URL(card.querySelector('img').getAttribute('src'),location.href).href})));
assert.deepEqual(fallbackCertificates,certificateContent,'no-JS certificates match the profile');
await nojs.close();
console.log('PASS: 10 widths, infographic assets, featured project order, project filters, desktop icon links, keyboard toolkit controls, email feedback, full role sequence/pause, no-JS projects, populated profile fixtures, no browser errors.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
