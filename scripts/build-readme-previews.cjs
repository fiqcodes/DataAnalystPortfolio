const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
  const output=path.join(root,'assets/home/readme');
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await page.goto(pathToFileURL(path.join(root,'projects/thelook/index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('#cohort-grid').evaluate(el=>{el.style.zoom=Math.min(1,el.parentElement.clientWidth/el.scrollWidth)});
    const figure=page.locator('#retention .cohort-figure');
    await figure.scrollIntoViewIfNeeded();
    const cohort=await figure.screenshot();
    for(const id of ['thelook','campaign','segmentation','samba','lalafood','abc']){
      if(process.argv[2] && process.argv[2]!==id) continue;
      const src=id==='thelook'?'data:image/png;base64,'+cohort.toString('base64'):pathToFileURL(path.join(root,id==='samba'?'assets/samba/looker-dashboard.jpg':`assets/home/demos/${id}.jpg`)).href;
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:${id==='samba'?'#e7efdf':'white'};width:1440px;height:1000px;display:flex;align-items:center;justify-content:center;padding:24px}img{display:block;max-width:100%;max-height:100%;object-fit:contain}</style><img src="${src}" alt="${id}">`);
      await page.locator('img').evaluate(i=>i.decode());
      await page.screenshot({path:path.join(output,id==='samba'?'samba-sage.png':id+'.png')});
    }
    console.log('PASS: requested previews rendered at 1440 x 1000');
  }finally{await browser.close()}
})();
