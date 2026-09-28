// Generate code-native infographic previews from the case studies' preserved data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets/home/infographics');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function data(project) {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', project, 'data.js'), 'utf8'), context);
  return Object.values(context.window)[0];
}
const text = (x,y,value,size=20,fill='#17202b',weight=400,anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;
const rect = (x,y,w,h,fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const line = (x1,y1,x2,y2,color='#cad1db') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}"/>`;
function frame({title,accent,pale,value,label,notes,chart,foot}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 392" role="img" aria-label="${esc(title)}"><rect width="800" height="392" fill="white"/><g font-family="Arial,Helvetica,sans-serif">${rect(0,0,800,8,accent)}<g transform="translate(0,-48)">${rect(24,72,236,310,pale)}${text(42,144,value,value.length > 7 ? 40 : 48,accent,700)}${text(42,180,label,21,'#17202b',700)}${notes.map((n,i)=>text(42,237+i*27,n,19)).join('')}${chart}${line(24,395,776,395)}${text(28,422,foot,17,'#465366')}</g></g></svg>`;
}
const results = {};
function chartFrame({title,accent,chart,foot}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 392" role="img" aria-label="${esc(title)}">${rect(0,0,800,392,'white')}<g font-family="Arial,Helvetica,sans-serif">${rect(0,0,800,8,accent)}${chart}${line(24,350,776,350)}${text(28,377,foot,17,'#465366')}</g></svg>`;
}
const lala = data('lalafood');
const conversion = (lala.segment.reduce((sum,s)=>sum+s.bookings,0)/lala.sessions*100).toFixed(2);
let chart = text(294,98,'Conversion by segment',21,'#17202b',700);
[0,20,40].forEach(t=>{const x=332+t/40*360;chart+=line(x,122,x,350)+text(x,377,t+'%',17,'#465366',400,'middle');});
lala.segment.forEach((s,i)=>{const y=136+i*43;chart+=text(299,y+21,s.label,20)+rect(332,y,s.rate/40*360,26,s.label==='D'?'#ee6565':s.label==='B'?'#008e11':'#6fc6e0')+text(341+s.rate/40*360,y+21,s.rate.toFixed(1)+'%',18,'#17202b',700);});
results.lalafood=frame({title:'Customer conversion / LalaFood',accent:'#008e11',pale:'#eff9ef',value:conversion+'%',label:'overall conversion',notes:['B converts best.','D has room','to improve.'],chart,foot:'329,590 sessions. Observed conversion, not causal impact.'});
const look = data('thelook');
chart=text(293,98,'Order activity by cohort',21,'#17202b',700);
for(let j=0;j<5;j++)chart+=text(398+j*76,133,'M'+(j+1),18,'#465366',400,'middle');
look.cohorts.slice(0,6).forEach((c,i)=>{const y=150+i*36;chart+=text(290,y+23,c.name,19);c.rates.slice(1,6).forEach((v,j)=>{chart+=rect(361+j*76,y,70,31,`rgb(${Math.round(236-v*12)},${Math.round(243-v*10)},250)`)+text(396+j*76,y+23,v.toFixed(1)+'%',17,'#132653',700,'middle');});});
results.thelook=frame({title:'Cohort analysis / TheLook',accent:'#1644d8',pale:'#edf2ff',value:look.summary.firstMonthRate.toFixed(2)+'%',label:'next-month activity',notes:['892 of 11,927','eligible buyers.','Jan-Nov cohorts.'],chart,foot:'2022 cohorts. Later activity includes orders of any status.'});
const seg = data('segmentation');
chart=text(28,44,'High-value users have the highest observed churn',25,'#843e47',700)
  +text(28,74,'Churn rate within each investor segment',18,'#465366');
[0,20,40,60].forEach(t=>{const x=217+t/60*480;chart+=line(x,99,x,294)+text(x,322,t+'%',17,'#465366',400,'middle');});
seg.segments.forEach((s,i)=>{const y=105+i*48;chart+=text(28,y+23,s.name,20)+rect(217,y,s.churn/60*480,30,s.id===3?'#843e47':'#d9bfc4')+text(228+s.churn/60*480,y+23,s.churn.toFixed(1)+'%',20,'#17202b',700);});
results.segmentation=chartFrame({title:'Investor churn by segment',accent:'#843e47',chart,foot:'Observed group rates, not model predictions or campaign impact.'});
const campaign = data('campaign');
chart=text(28,44,'Promotion 1 leads. Is the difference meaningful?',25,'#126b6d',700)
  +text(28,74,'Average weekly sales per store, thousands',18,'#465366');
[0,20,40,60].forEach(t=>{const x=177+t/60*510;chart+=line(x,98,x,274)+text(x,301,t,17,'#465366',400,'middle');});
[...campaign.promotions].sort((a,b)=>b.mean-a.mean).forEach((p,i)=>{const y=106+i*59;chart+=text(28,y+27,'Promotion '+p.id,20)+rect(177,y,p.mean/60*510,36,p.id===1?'#bc2058':'#80b6b3')+text(188+p.mean/60*510,y+27,p.mean.toFixed(2),23,'#17202b',700);});
const p13=campaign.tests.store.find(t=>t.a===1&&t.b===3);
chart+=text(28,333,`No clear difference between 1 and 3 (store-level p = ${p13.p.toFixed(3)}).`,19,'#126b6d',700);
results.campaign=chartFrame({title:'Campaign sales comparison',accent:'#126b6d',chart,foot:'137 stores / 4 weeks. Averages do not adjust for market mix.'});
const abc=data('abc');
const bands=Array(6).fill(0);
abc.listings.forEach(row=>bands[Math.min(5,Math.floor(row.price/1e6))]++);
const max=Math.ceil(Math.max(...bands)/500)*500;
chart=text(293,98,'Listings by price band',21,'#17202b',700);
[0,max/2,max].forEach(t=>{const y=338-t/max*205;chart+=line(335,y,770,y)+text(325,y+6,t.toLocaleString('en-US'),16,'#465366',400,'end');});
bands.forEach((count,i)=>{const x=351+i*69,h=count/max*205;chart+=rect(x,338-h,42,h,i===1?'#287953':'#abd4be')+text(x+21,329-h,count.toLocaleString('en-US'),16,'#17202b',700,'middle')+text(x+21,365,i===5?'5+':i+'-'+(i+1),16,'#465366',400,'middle');});
chart+=text(550,388,'Asking price / MYR millions',16,'#465366',400,'middle');
results.abc=frame({title:'Property prices / ABC Company',accent:'#287953',pale:'#eef6f0',value:'MYR 1.3m',label:'median asking price',notes:[abc.summary.count.toLocaleString('en-US')+' listings.','A market with','a long price tail.'],chart,foot:'Listing prices, not completed transactions.'});
const samba=data('samba');
const december=samba.months.find(m=>m.name==='2021-12');
const january=samba.months.find(m=>m.name==='2022-01');
const orderGrowth=((january.orders/december.orders-1)*100).toFixed(1);
const orderValue=m=>(m.paymentCents/100/m.orders).toFixed(2);
chart=text(28,44,'More orders. Almost the same basket value.',25,'#17784e',700)
  +text(28,74,'January 2022 compared with December 2021',18,'#465366')
  +rect(16,98,255,236,'#fffdf0')
  +text(28,147,'+'+orderGrowth+'%',49,'#f2cb24',700)
  +text(28,180,'order growth',21,'#17202b',700)
  +text(28,211,january.orders.toLocaleString('en-US')+' January orders',19,'#465366')
  +line(28,230,255,230)
  +text(28,260,'Average order value',19,'#465366')
  +text(28,290,'$'+orderValue(december)+' to $'+orderValue(january),22,'#17784e',700)
  +text(296,103,'Monthly orders',20,'#17202b',700);
[0,4000,8000].forEach(t=>{const y=292-t/8000*158;chart+=line(331,y,774,y)+text(320,y+5,t===0?'0':t/1000+'k',16,'#465366',400,'end');});
samba.months.forEach((m,i)=>{const x=337+i*34,h=m.orders/8000*158;chart+=rect(x,292-h,24,h,m.name==='2022-01'?'#f2cb24':'#17784e');});
chart+=text(337,321,'Jan 21',17,'#465366')+text(553,321,'Jul 21',17,'#465366',400,'middle')+text(769,321,'Jan 22',17,'#f2cb24',700,'end');
results.samba=chartFrame({title:'January order growth and average order value',accent:'#f2cb24',chart,foot:'More transactions drove payment growth; the cause is not established.'});
chart=text(28,44,'From a business question to a visual answer',25,'#1644d8',700)
  +text(28,74,'Natural-language analytics for e-commerce data',18,'#465366');
const steps=[['Ask','Business question','Natural language'],['Query','SQL query','Structured data'],['Explore','Visual answer','Charts and insights']];
steps.forEach(([verb,label,note],i)=>{const x=28+i*258;chart+=rect(x,118,228,158,i===1?'#e5edff':'#f0f3f8')+rect(x,118,228,4,'#1644d8')+text(x+18,161,verb,27,'#1644d8',700)+text(x+18,208,label,22,'#17202b',700)+text(x+18,245,note,18,'#465366');if(i<2)chart+=line(x+234,197,x+252,197,'#1644d8')+`<path d="M${x+246} 191 L${x+252} 197 L${x+246} 203" fill="none" stroke="#1644d8" stroke-width="2"/>`;});
chart+=text(28,321,'A connected workflow, from question to exploration.',21,'#1644d8',700);
results.smartlook=chartFrame({title:'AI analytics workflow',accent:'#1644d8',chart,foot:'Workflow overview / text-to-SQL and visual analysis.'});
fs.mkdirSync(out,{recursive:true});
for(const [name,svg] of Object.entries(results))fs.writeFileSync(path.join(out,name+'.svg'),svg+'\n');
console.log('Built 7 data-backed landscape infographics.');
