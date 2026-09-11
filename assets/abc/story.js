/* Narrative, source data, and chart behavior are kept separate for offline use. */
(() => {
  'use strict';
  const D = window.ABC_DATA;
  const $ = id => document.getElementById(id);
  if (!D || !window.d3) {
    document.querySelectorAll('.chart').forEach(el => { el.textContent = 'Chart data could not load. The study findings remain available in the article.'; });
    return;
  }
  const ink = '#152b27', green = '#235e51', coral = '#c0442e', muted = '#c5d4c9', lime = '#d9ef87';
  const num = new Intl.NumberFormat('en-MY', {maximumFractionDigits:0});
  const money = n => 'RM' + num.format(n);
  const short = n => Math.abs(n) >= 1e6 ? d3.format('.2~f')(n/1e6)+'m' : Math.abs(n) >= 1000 ? d3.format('.0f')(n/1000)+'k' : num.format(n);
  const label = {rooms:'Rooms',bathrooms:'Bathrooms',parking:'Parking spaces',size:'Size (sq ft)'};
  const state = {scale:'log', tier:'lower', group:'location', rank:'count', selected:'Cheras', feature:'size', view:'price', model:'full'};
  const values = (rows,key) => rows.map(r=>r[key]).filter(v=>typeof v === 'number' && Number.isFinite(v));
  const median = (rows,key) => d3.median(values(rows,key));
  const pressed = (selector,attribute,value) => document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attribute]===value)));
  function canvas(id,height,title) {
    const host = $(id), width = Math.max(240, host.clientWidth);
    const svg = d3.select(host).selectAll('svg').data([null]).join('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',title);
    svg.selectAll('*').remove();
    svg.append('title').text(title);
    return {svg,width,height};
  }
  function axes(svg,x,y,w,h,m,xFormat,yFormat) {
    svg.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(''));
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(x.ticks(Math.max(3,Math.floor(w/150)))).tickFormat(xFormat).tickSizeOuter(0));
    svg.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(yFormat).tickSizeOuter(0));
  }
  function distribution() {
    const ceiling = +$('budget').value;
    const prices = D.listings.map(r=>r.price);
    const selectedCount = prices.filter(p=>p<=ceiling).length;
    $('budget-value').textContent = money(ceiling);
    $('budget-share').textContent = (selectedCount/prices.length*100).toFixed(1)+'%';
    $('budget-count').textContent = `${num.format(selectedCount)} of ${num.format(prices.length)} listings at or below this price`;
    $('price-feedback').textContent = 'Range: RM1,150 to RM130,000,000. No price outliers removed.';
    const {svg,width:w,height:h} = canvas('price-chart',335,`Distribution of 4,801 asking prices. ${selectedCount} at or below ${money(ceiling)}. Median RM1.3 million, mean RM2.17 million.`);
    const m={l:44,r:18,t:33,b:78};
    const extent=d3.extent(prices);
    const x=(state.scale==='log'?d3.scaleLog():d3.scaleLinear()).domain(state.scale==='log'?extent:[0,extent[1]]).range([m.l,w-m.r]);
    const thresholds = state.scale==='log' ? d3.range(1,30).map(i=>extent[0]*Math.pow(extent[1]/extent[0],i/30)) : d3.range(1,30).map(i=>extent[1]*i/30);
    const bins=d3.bin().domain(x.domain()).thresholds(thresholds)(prices);
    const y=d3.scaleLinear().domain([0,d3.max(bins,b=>b.length)]).nice().range([h-m.b,m.t]);
    svg.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(''));
    const ticks=state.scale==='log'?(w<500?[1e4,1e5,1e6,1e7,1e8]:[1e3,1e4,1e5,1e6,1e7,1e8]).filter(v=>v>=extent[0]):x.ticks(w<500?3:6);
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(ticks).tickFormat(short).tickSizeOuter(0));
    svg.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
    svg.append('text').attr('class','axis-label').attr('x',m.l).attr('y',15).text('LISTINGS');
    svg.append('text').attr('class','axis-label').attr('x',w-m.r).attr('y',h-2).attr('text-anchor','end').text('ASKING PRICE / RM');
    const descriptions=b=>`${money(b.x0)} to ${money(b.x1)}${b===bins[bins.length-1]?' inclusive':''}: ${b.length} listings; ${b.filter(v=>v<=ceiling).length} within ceiling.`;
    const bars=svg.selectAll('.hist-bar').data(bins).join('g').attr('class','hist-bar').attr('tabindex',0).attr('role','img').attr('aria-label',descriptions)
      .on('pointerenter focus',(_,b)=>{$('price-feedback').textContent=descriptions(b);});
    bars.append('rect').attr('x',b=>x(b.x0)+1).attr('y',b=>y(b.length)).attr('width',b=>Math.max(1,x(b.x1)-x(b.x0)-2)).attr('height',b=>h-m.b-y(b.length)).attr('fill',muted);
    bars.append('rect').attr('x',b=>x(b.x0)+1).attr('y',b=>y(b.filter(v=>v<=ceiling).length)).attr('width',b=>Math.max(1,x(b.x1)-x(b.x0)-2)).attr('height',b=>h-m.b-y(b.filter(v=>v<=ceiling).length)).attr('fill',green);
    [[D.summary.median,'Median',coral,18],[D.summary.mean,'Mean',ink,34]].forEach(([v,name,color,offset])=>{
      svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',m.t).attr('y2',h-m.b).attr('stroke',color).attr('stroke-dasharray','3 3');
      svg.append('text').attr('class','marker-label').attr('x',Math.max(m.l,Math.min(w-100,x(v)))).attr('y',h-m.b+offset+14).attr('fill',color).text(`${name} ${short(v)}`);
    });
  }
  function groupRows() {
    const rows=D.listings.filter(r=>state.tier==='all'||(state.tier==='lower'?r.price<=D.threshold:r.price>D.threshold));
    const groups=d3.groups(rows,r=>r[state.group]||'Not recorded').map(([name,rows])=>({name,rows,count:rows.length,median:median(rows,'price'),mean:d3.mean(rows,r=>r.price)}));
    groups.sort((a,b)=>b[state.rank]-a[state.rank]||a.name.localeCompare(b.name));
    return {rows,groups};
  }
  function mostCommon(rows,key) {
    return d3.rollups(rows,v=>v.length,r=>r[key]||'Not recorded').sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])))[0];
  }
  function market() {
    const {rows,groups}=groupRows();
    const visible=$('all-groups').checked?groups:groups.slice(0,10);
    if(!visible.some(g=>g.name===state.selected)) state.selected=visible[0]?.name;
    $('market-total').textContent=`${num.format(rows.length)} listings`;
    $('rank-caption').textContent=`${$('all-groups').checked?'All '+groups.length:'Top '+Math.min(groups.length,10)} / ${state.rank==='count'?'Listing count':state.rank==='median'?'Median price':'Mean price'}`;
    const max=d3.max(groups,g=>g[state.rank]);
    const buttons=d3.select('#market-bars').selectAll('button').data(visible,g=>g.name).join('button').attr('type','button').attr('class','market-row').attr('aria-pressed',g=>String(g.name===state.selected)).attr('aria-label',g=>`${g.name}, ${state.rank==='count'?num.format(g.count)+' listings':state.rank+' asking price '+money(g[state.rank])}. View details.`).on('click',(_,g)=>{state.selected=g.name;market();});
    buttons.each(function(g){
      const b=d3.select(this);b.selectAll('*').remove();
      b.append('span').attr('class','name').text(g.name);
      b.append('span').attr('class','value').text(state.rank==='count'?num.format(g.count):'RM'+short(g[state.rank]));
      b.append('span').attr('class','track').attr('aria-hidden','true').append('span').attr('class','bar').style('width',(g[state.rank]/max*100)+'%');
    });
    const selected=groups.find(g=>g.name===state.selected);
    if(!selected)return;
    $('selected-name').textContent=selected.name;
    const common=mostCommon(selected.rows,'type');
    const fields=[['Listings',num.format(selected.count)],['Median asking price',money(selected.median)],['Mean asking price',money(selected.mean)],['Median size',num.format(median(selected.rows,'size'))+' sq ft'],['Median rooms',median(selected.rows,'rooms')??'Not recorded'],['Median bathrooms',median(selected.rows,'bathrooms')??'Not recorded'],['Most common property type',`${common[0]} (${common[1]})`]];
    const dl=$('selected-stats');dl.replaceChildren();
    for(const [name,value] of fields){const div=document.createElement('div');if(name==='Most common property type')div.className='wide';const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;div.append(dt,dd);dl.append(div);}
    $('selected-warning').textContent=selected.count<10?`Small sample: only ${selected.count} ${selected.count===1?'listing':'listings'}. Treat this price as a limited observation, not a market benchmark.`:'Counts describe available listings, not sales. Size may mix built-up and land-area measurements; missing features are excluded from their medians.';
  }
  function scatter() {
    const residual=state.view==='residual';
    const feature=state.feature;
    $('correlation').textContent=residual?'Full-model residuals':`Correlation: ${D.correlations[feature].toFixed(2)}`;
    const {svg,width:w,height:h}=canvas('scatter-chart',385,`${residual?'Model error':'Asking price'} versus ${label[feature]} for 177 Desa ParkCity listings.`);
    const m={l:w<450?48:62,r:18,t:30,b:48};
    const rows=D.modelRows.map((r,i)=>({...r,index:i,value:residual?D.models.full.residuals[i]:r.price}));
    const x=d3.scaleLinear().domain(d3.extent(rows,r=>r[feature])).nice().range([m.l,w-m.r]);
    const ye=d3.extent(rows,r=>r.value);
    const y=d3.scaleLinear().domain([Math.min(0,ye[0]),ye[1]]).nice().range([h-m.b,m.t]);
    axes(svg,x,y,w,h,m,feature==='size'?num.format:d3.format('d'),short);
    svg.append('text').attr('class','axis-label').attr('x',m.l).attr('y',14).text(residual?'ERROR / RM':'ASKING PRICE / RM');
    svg.append('text').attr('class','axis-label').attr('x',w-m.r).attr('y',h-3).attr('text-anchor','end').text(label[feature].toUpperCase());
    if(residual)svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',ink).attr('stroke-dasharray','4 4');
    svg.selectAll('.point').data(rows).join('circle').attr('class','point').attr('cx',r=>x(r[feature])).attr('cy',r=>y(r.value)).attr('r',4.5).attr('fill',residual?coral:green).attr('fill-opacity',.52).attr('stroke',residual?coral:green).attr('stroke-width',.4).on('pointerenter',function(_,r){
      d3.select(this).attr('r',7).attr('fill-opacity',1);
      $('scatter-feedback').textContent=`Listing ${r.index+1}: ${money(r.price)}; ${num.format(r.size)} sq ft; ${r.rooms} rooms, ${r.bathrooms} bathrooms, ${r.parking} parking. Model error ${money(D.models.full.residuals[r.index])}.`;
    }).on('pointerleave',function(){d3.select(this).attr('r',4.5).attr('fill-opacity',.52);}).append('title').text(r=>`Listing ${r.index+1}: ${label[feature]} ${num.format(r[feature])}; ${residual?'error':'price'} ${money(r.value)}`);
  }
  function coefficients() {
    if(!document.querySelector('.coefficient-details').open)return;
    const model=D.models[state.model];
    const entries=model.features.map((key,i)=>({key,name:key==='size'?'Size / 100 sq ft':label[key],value:model.coefficients[i+1]*(key==='size'?100:1),lo:model.coefficientCI[i+1][0]*(key==='size'?100:1),hi:model.coefficientCI[i+1][1]*(key==='size'?100:1),p:model.pValues[i+1]}));
    const {svg,width:w,height:h}=canvas('coefficient-chart',300,'Feature coefficients with conventional 95% confidence intervals. The rooms interval includes zero in the full model.');
    const compact=w<600,m={l:compact?8:170,r:30,t:compact?38:28,b:45};
    const x=d3.scaleLinear().domain([Math.min(-40000,d3.min(entries,r=>r.lo)),d3.max(entries,r=>r.hi)]).nice().range([m.l,w-m.r]);
    const y=d3.scalePoint().domain(entries.map(r=>r.key)).range([m.t,h-m.b-20]).padding(.25);
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(compact?3:6).tickFormat(short));
    svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',12).attr('y2',h-m.b).attr('stroke','#8a9f91').attr('stroke-dasharray','4 4');
    entries.forEach(r=>{
      svg.append('text').attr('x',compact?m.l:m.l-16).attr('y',y(r.key)-(compact?15:-4)).attr('text-anchor',compact?'start':'end').attr('fill','#edf4ef').attr('font-size',12).text(r.name);
      svg.append('line').attr('x1',x(r.lo)).attr('x2',x(r.hi)).attr('y1',y(r.key)).attr('y2',y(r.key)).attr('stroke',lime).attr('stroke-width',3);
      [r.lo,r.hi].forEach(v=>svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',y(r.key)-6).attr('y2',y(r.key)+6).attr('stroke',lime));
      svg.append('circle').attr('cx',x(r.value)).attr('cy',y(r.key)).attr('r',6).attr('fill',lime).append('title').text(`${r.name}: ${money(r.value)}, 95% CI ${money(r.lo)} to ${money(r.hi)}`);
    });
    const table=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody');
    const tr=document.createElement('tr');['Feature change','Coefficient (RM)','95% CI (RM)','p-value'].forEach(s=>{const th=document.createElement('th');th.scope='col';th.textContent=s;tr.append(th);});head.append(tr);
    entries.forEach(r=>{const tr=document.createElement('tr');[r.name,num.format(r.value),`${num.format(r.lo)} to ${num.format(r.hi)}`,r.p<.001?'<0.001':r.p.toFixed(3)].forEach(s=>{const td=document.createElement('td');td.textContent=s;tr.append(td);});body.append(tr);});
    table.append(head,body);$('coefficient-table').replaceChildren(table);
  }
  function scenario() {
    const model=D.models[state.model];
    const inputs=Object.fromEntries(['rooms','bathrooms','parking','size'].map(k=>[k,+$(k).value]));
    Object.entries(inputs).forEach(([k,v])=>{$(k+'-output').textContent=num.format(v)+(k==='size'?' sq ft':'');});
    $('rooms').disabled=state.model==='reduced';
    if(state.model==='reduced')$('rooms-output').textContent='Not in model';
    const parts=[{name:'Intercept',value:model.coefficients[0]},...model.features.map((key,i)=>({name:key==='size'?'Size':label[key],value:inputs[key]*model.coefficients[i+1]}))];
    const predicted=d3.sum(parts,p=>p.value);
    $('prediction').textContent=num.format(predicted);
    $('mobile-prediction').textContent=num.format(predicted);
    $('prediction').dataset.value=predicted;
    $('adjusted-r2').textContent=(model.adjustedR2*100).toFixed(1)+'%';
    $('residual-error').textContent=money(model.residualSE);
    const matching=D.modelRows.filter(r=>model.features.filter(k=>k!=='size').every(k=>r[k]===inputs[k])&&Math.abs(r.size-inputs.size)<=100).length;
    $('scenario-warning').textContent=predicted<=0?'Non-positive fitted price. This combination is not a usable estimate.':matching?`${matching} sample ${matching===1?'listing matches':'listings match'} these counts within 100 sq ft. This does not validate the estimate.`:'No sample listing matches these counts within 100 sq ft. Treat this combination with extra caution.';
    const partsDiv=$('contributions');partsDiv.replaceChildren();
    for(const part of parts){const div=document.createElement('div');div.className='contribution';const name=document.createElement('span'),value=document.createElement('span');name.textContent=part.name;value.textContent=(part.value>=0?'+':'-')+money(Math.abs(part.value));div.append(name,value);partsDiv.append(div);}
    coefficients();
  }
  document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>{state.scale=b.dataset.scale;pressed('[data-scale]','scale',state.scale);distribution();}));
  $('budget').addEventListener('input',distribution);
  ['tier','group','rank'].forEach(k=>$(k).addEventListener('change',()=>{state[k]=$(k).value;if(k!=='rank')state.selected='';$('market-bars').scrollTop=0;market();}));
  $('all-groups').addEventListener('change',market);
  $('feature').addEventListener('change',()=>{state.feature=$('feature').value;scatter();});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;pressed('[data-view]','view',state.view);$('scatter-feedback').textContent=state.view==='residual'?'Error = asking price minus fitted price. The dashed line marks zero error.':'177 listings. Each dot is one observation.';scatter();}));
  document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{state.model=b.dataset.model;pressed('[data-model]','model',state.model);scenario();}));
  ['rooms','bathrooms','parking','size'].forEach(k=>$(k).addEventListener('input',scenario));
  $('reset-scenario').addEventListener('click',()=>{Object.entries({rooms:3,bathrooms:4,parking:3,size:2200}).forEach(([k,v])=>$(k).value=v);scenario();});
  document.querySelector('.coefficient-details').addEventListener('toggle',coefficients);
  const links=[...document.querySelectorAll('.chapter-nav a')];
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)links.forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});});},{rootMargin:'-15% 0px -65% 0px',threshold:0});
  links.forEach(a=>observer.observe(document.querySelector(a.hash)));
  let resize;
  new ResizeObserver(()=>{clearTimeout(resize);resize=setTimeout(()=>{distribution();scatter();coefficients();},100);}).observe($('price-chart'));
  distribution();market();scatter();scenario();
})();
