(() => {
  'use strict';
  const D = window.SEGMENTATION_DATA;
  const $ = (id) => document.getElementById(id);
  const colors = D.segments.map(d => d.color).concat('#9460a5');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 0 : 320;
  const nf = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
  const count = v => nf.format(v);
  const pct = (v, digits = 1) => v.toFixed(digits) + '%';
  const rp = v => (v < 0 ? '-' : '') + 'Rp' + count(Math.abs(v));
  const compact = v => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'm' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : String(Math.round(v)));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {segment:0, audience:'Age', k:4, step:0, metric:'balance', risk:'targeted', sort:'segment', signal:'Transaction activity'};
  const tooltip = $('tooltip');

  function tip(event, html, element) {
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const box = element.getBoundingClientRect();
    const x = event.clientX || box.left + Math.min(box.width / 2, 80);
    const y = event.clientY || box.top;
    tooltip.style.left = Math.max(8, Math.min(innerWidth - tooltip.offsetWidth - 8, x + 15)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(innerHeight - tooltip.offsetHeight - 8, y - tooltip.offsetHeight - 12)) + 'px';
  }
  const hideTip = () => { tooltip.hidden = true; };
  function interactive(selection, describe, activate) {
    selection.attr('tabindex', 0).attr('role', activate ? 'button' : 'img').attr('aria-label', d => describe(d).replace(/<[^>]*>/g, ' '))
      .on('pointerenter', function(e, d) { tip(e, describe(d), this); })
      .on('pointermove', function(e, d) { tip(e, describe(d), this); })
      .on('focus', function(e, d) { tip(e, describe(d), this); })
      .on('pointerleave blur', hideTip);
    if (activate) selection.on('click', (e,d) => {hideTip(); activate(d);}).on('keydown', (e,d) => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); hideTip(); activate(d);}});
  }
  function chart(id, height, title) {
    const mount = $(id);
    const width = Math.max(250, mount.clientWidth);
    const svg = d3.select(mount).selectAll('svg').data([0]).join('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('aria-label', title).attr('role', 'group');
    svg.selectAll('*').remove();
    svg.append('title').text(title);
    return {svg,width,height};
  }
  function text(svg,x,y,label,options={}) {
    return svg.append('text').attr('x',x).attr('y',y).attr('font-size', options.size || 12).attr('font-weight',options.bold ? 600 : 400).attr('text-anchor',options.anchor || 'start').style('fill',options.color || null).text(label);
  }
  function rows(id, data, options) {
    const rowHeight = options.rowHeight || 65;
    const {svg,width} = chart(id,data.length * rowHeight + 31,options.title);
    const x = d3.scaleLinear().domain([0,options.max || d3.max(data,d=>d.value)*1.1]).range([0,width-4]);
    const group = svg.selectAll('.data-row').data(data).join('g').attr('class','data-row').attr('transform',(d,i)=>`translate(0,${i*rowHeight+17})`);
    group.append('text').attr('font-size',13).attr('font-weight',500).text(d=>d.label);
    group.append('text').attr('x',width).attr('text-anchor','end').attr('font-size',13).attr('font-weight',600).text(d=>options.format(d.value));
    group.append('rect').attr('y',14).attr('height',options.thin ? 6 : 13).attr('width',width).attr('fill','#dddde2');
    group.append('rect').attr('y',14).attr('height',options.thin ? 6 : 13).attr('width',0).attr('fill',d=>d.color || colors[0]).attr('opacity',d=>options.selected == null || options.selected === d.id ? 1 : .45)
      .transition().duration(duration).attr('width',d=>Math.max(1,x(d.value)));
    if (options.sub) group.append('text').attr('y',43).attr('font-size',10).style('fill','#626269').text(options.sub);
    group.append('rect').attr('y',-16).attr('width',width).attr('height',rowHeight-3).attr('fill','transparent').attr('class','data-hit');
    interactive(group,options.tip || (d=>`<strong>${esc(d.label)}</strong><br>${options.format(d.value)}`),options.activate);
    return {svg,width,x};
  }

  function audience() {
    const data = D.demographics[state.audience].map((d,i)=>({...d,value:d.share,color:i===0?colors[0]:'#8f8f99'}));
    rows('audience-chart',data,{title:state.audience+' distribution',max:100,format:v=>pct(v),sub:d=>count(d.count)+' users',rowHeight:62,tip:d=>`<strong>${esc(d.label)}</strong><br>${count(d.count)} of 8,277 users<br>${pct(d.share,2)}`});
  }
  function transactions() {
    const {svg,width,height} = chart('transactions-chart',320,'Daily buying and selling transaction totals');
    const m = {left:46,right:15,top:22,bottom:40};
    const mode = $('transaction-mode').value;
    const data = D.daily.map(d=>({...d,time:new Date(d.date+'T00:00:00')}));
    const x = d3.scaleTime().domain(d3.extent(data,d=>d.time)).range([m.left,width-m.right]);
    const y = d3.scaleLinear().domain([0,d3.max(data,d=>Math.max(d.buy,d.sell))]).nice().range([height-m.bottom,m.top]);
    svg.append('g').attr('class','grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width-m.left-m.right)).tickFormat(''));
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-m.bottom})`).call(d3.axisBottom(x).ticks(width<500?3:6).tickFormat(d3.timeFormat('%d %b')));
    svg.append('g').attr('class','axis').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v=>compact(v)));
    text(svg,m.left,12,'Rp');
    for (const key of ['buy','sell']) if (mode === 'both' || mode === key) {
      const color = key==='buy'?colors[1]:colors[0];
      svg.append('path').datum(data).attr('d',d3.line().x(d=>x(d.time)).y(d=>y(d[key]))).attr('fill','none').attr('stroke',color).attr('stroke-width',2.5);
      const dots=svg.selectAll('.'+key).data(data).join('circle').attr('cx',d=>x(d.time)).attr('cy',d=>y(d[key])).attr('r',4).attr('fill',color).attr('fill-opacity',.4);
      interactive(dots,d=>`<strong>${esc(d.date)}</strong><br>${key==='buy'?'Buy':'Sell'}: ${rp(d[key])}`);
    }
    text(svg,width-75,12,'Buy',{color:colors[1]});text(svg,width-32,12,'Sell',{color:colors[0]});
  }

  function kmeans() {
    const points = D.demo.points;
    const run = D.demo.runs[state.k];
    const frame = state.step ? run.frames[state.step-1] : null;
    const centers = frame ? frame.centers : run.initial;
    const {svg,width,height} = chart('kmeans-chart',390,'Illustrative K-means grouping, step '+state.step);
    const m=30, x=d3.scaleLinear().domain([0,1]).range([m,width-m]), y=d3.scaleLinear().domain([0,1]).range([height-m,m]);
    // Partition in feature space before projecting into a responsive rectangle.
    const voronoi = d3.Delaunay.from(centers).voronoi([0,0,1,1]);
    if (frame) {
      const regions=svg.append('g').attr('transform',`translate(${m},${height-m}) scale(${width-2*m},${-(height-2*m)})`);
      centers.forEach((_,i)=>regions.append('path').attr('d',voronoi.renderCell(i)).attr('fill',colors[i]).attr('opacity',.08));
    }
    for(const v of [0,.25,.5,.75,1]){
      svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',m).attr('y2',height-m).attr('stroke','#cccdd2').attr('stroke-width',.5);
      svg.append('line').attr('x1',m).attr('x2',width-m).attr('y1',y(v)).attr('y2',y(v)).attr('stroke','#cccdd2').attr('stroke-width',.5);
    }
    if (frame && state.step===1) svg.selectAll('.assignment').data(points).join('line').attr('x1',d=>x(d[0])).attr('y1',d=>y(d[1])).attr('x2',(d,i)=>x(centers[frame.labels[i]][0])).attr('y2',(d,i)=>y(centers[frame.labels[i]][1])).attr('stroke',(d,i)=>colors[frame.labels[i]]).attr('opacity',.2);
    svg.selectAll('.point').data(points).join('circle').attr('class','point').attr('cx',d=>x(d[0])).attr('cy',d=>y(d[1])).attr('r',4.5).attr('fill',(d,i)=>frame?colors[frame.labels[i]]:'#929299').attr('stroke','#fff').attr('stroke-width',1);
    const marks=svg.selectAll('.center').data(centers).join('g').attr('class','center').attr('transform',d=>`translate(${x(d[0])},${y(d[1])})`);
    marks.append('circle').attr('r',11).attr('fill','#fff');
    marks.append('path').attr('d','M-7,0H7M0,-7V7').attr('stroke',(d,i)=>colors[i]).attr('stroke-width',3);
    const finished = state.step >= 2 && Math.abs(run.frames[state.step-1].inertia-run.frames[state.step-2].inertia)<.00001;
    $('kmeans-step-title').textContent = !frame ? `Start with ${['zero','one','two','three','four','five'][state.k]} centers` : finished ? 'The groups have settled' : 'Assign, average, repeat';
    $('kmeans-step-copy').textContent = !frame ? 'The cross marks are initial centers. Their starting positions influence where the groups settle.' : finished ? 'Assignments and centers have stopped changing. More groups can reduce distance, but may make a campaign harder to use.' : 'Each point joins its nearest center. Each center moves to its group average. Repeating this reduces the within-group distances.';
    $('kmeans-step-count').textContent = frame ? 'Iteration '+state.step : 'Initial centers';
    $('kmeans-inertia').textContent = frame ? 'Inertia '+frame.inertia.toFixed(2) : '80 illustrative points';
    $('kmeans-next').disabled = state.step >= 8 || finished;
  }

  const profiles = [
    'A large, younger group with small balances and infrequent transactions. Make the next investment feel achievable.',
    'A step up in invested balance, but still low transaction frequency. Help turn an occasional investment into a repeat habit.',
    'The most active group. Frequent buying and selling creates different needs from simply holding a large balance.',
    'The largest average balances, but not the most frequent transactions. Premium service is a hypothesis to test, not a guarantee of retention.'
  ];
  function selectSegment(id) {
    state.segment=Number(id);
    segmentProfile(); segmentChart();
    document.querySelectorAll('.segment-tile').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.segment)===state.segment)));
  }
  function segmentSelector() {
    $('segment-selector').style.setProperty('--segment-columns',D.segments.map(d=>`minmax(0,${d.count}fr)`).join(' '));
    $('segment-selector').innerHTML=D.segments.map(d=>`<button type="button" class="segment-tile" data-segment="${d.id}" style="background:${d.color}" aria-pressed="${d.id===state.segment}"><span class="segment-name">${d.name}</span><span><span class="tile-count">${count(d.count)}</span><br><span class="tile-share">${pct(d.share)} of users</span></span><i class="fas fa-arrow-down" aria-hidden="true"></i></button>`).join('');
    $('segment-selector').addEventListener('click',e=>{const b=e.target.closest('button');if(b)selectSegment(b.dataset.segment);});
  }
  function segmentProfile() {
    const d=D.segments[state.segment];
    $('segment-profile').style.setProperty('--selected',d.color);
    $('segment-profile').innerHTML=`<span class="micro">Segment 0${d.id+1} / ${count(d.count)} users</span><h3>${d.name}</h3><p>${profiles[d.id]}</p><div class="profile-stats"><div><strong>${rp(d.balance)}</strong><span>Average invested balance</span></div><div><strong>${d.frequency.toFixed(2)}</strong><span>Average buy/sell day count</span></div><div><strong>${d.age.toFixed(1)} years</strong><span>Average age</span></div><div><strong>${pct(d.churn)}</strong><span>Observed segment churn</span></div></div>`;
  }
  const metricFormat = key => ['balance','buy','sell'].includes(key)?rp:key==='churn'?v=>pct(v):key==='age'?v=>v.toFixed(1)+' years':v=>v.toFixed(2);
  function segmentChart() {
    const key=state.metric,format=metricFormat(key);
    rows('segment-chart',D.segments.map(d=>({...d,label:d.name,value:d[key]})),{title:'Segment comparison: '+key,format,selected:state.segment,thin:true,rowHeight:58,activate:d=>{selectSegment(d.id);const target=$('segment-selector').querySelector(`[data-segment="${d.id}"]`);target.focus({preventScroll:true});},tip:d=>`<strong>${d.name}</strong><br>${format(d.value)}<br>${count(d.count)} users`});
    $('segment-caption').textContent = key==='churn' ? 'Observed churn across all users in each reconstructed segment. Not a predicted probability.' : key==='frequency' ? 'Mean buy-day count + sell-day count in the observation period. A day with both counts twice.' : key==='age' ? 'Mean age in each original campaign segment.' : key==='balance' ? 'Mean last recorded invested balance per user. This is not average transaction size.' : `Mean total ${key} amount per user. Sell values are positive magnitudes.`;
  }
  function risk() {
    const data=D.segments.map(d=>({...d,label:d.name,value:state.risk==='targeted'?d.campaign.risk*100:d.churn}));
    if(state.sort==='risk')data.sort((a,b)=>b.value-a.value);
    const {svg,width,x}=rows('risk-chart',data,{title:'Observed churn by segment',max:100,format:v=>pct(v,2),rowHeight:72,sub:d=>state.risk==='targeted'?`30% campaign reach / ${count(d.count)} users in the segment`:`${count(d.churnCount)} churned / ${count(d.count)} users`,tip:d=>`<strong>${d.name}</strong><br>${pct(d.value,2)} observed churn<br>${state.risk==='targeted'?'Highest-risk campaign group':'All users in this segment'}`});
    const overall=D.churn/D.segmented*100;
    svg.append('line').attr('x1',x(overall)).attr('x2',x(overall)).attr('y1',8).attr('y2',data.length*72-4).attr('stroke','#1b1b1e').attr('stroke-dasharray','3 4').attr('opacity',.6);
    text(svg,width,data.length*72+19,'All-user baseline: '+pct(overall,2),{anchor:'end',size:11});
    $('risk-caption').textContent = state.risk==='targeted' ? 'Historical targeted-group rates. These are neither average predicted probabilities nor held-out model accuracy.' : 'Reconstructed original campaign cohort. Segment churn ranges from 33.52% to 50.29%; targeting enriches for risk within each group.';
  }
  const signalCopy = {
    'Transaction activity':['Activity is not the same as loyalty','Users with four or more buy/sell days have 49.4% observed churn, compared with 32.7% for one day. Frequent trading alone is not a retention guarantee.'],
    'Invested balance':['A balance is not a loyalty score','The recorded churn label rises sharply with positive balances. The unusually low zero-balance rate needs a label-definition and timing check before this pattern becomes a targeting rule.'],
    'Age':['Risk differs across age groups','In this cohort, observed churn is higher in older age groups. This is a descriptive pattern, not proof that age causes churn or a recommendation to target by age.'],
    'Referral':['Referral users show lower churn','Observed churn is 32.2% among referral users and 44.8% among non-referral users. Selection effects may explain the difference; this does not prove a referral incentive prevents churn.']
  };
  function signals() {
    const data=D.signals[state.signal].map(d=>({...d,value:d.rate,color:colors[1]}));
    rows('signal-chart',data,{title:'Observed churn by '+state.signal,max:100,format:v=>pct(v),rowHeight:70,sub:d=>`${count(d.churn)} churned / ${count(d.count)} users`,tip:d=>`<strong>${esc(d.label)}</strong><br>${pct(d.rate,2)} observed churn<br>n = ${count(d.count)}`});
    $('signal-title').textContent=signalCopy[state.signal][0];$('signal-insight').textContent=signalCopy[state.signal][1];
  }
  function logistic() {
    const score=+$('logistic-score').value;
    const probability=1/(1+Math.exp(-score));
    const {svg,width,height}=chart('logistic-chart',310,'Logistic score-to-probability curve');
    const m={left:40,right:15,top:15,bottom:35};
    const x=d3.scaleLinear().domain([-5,5]).range([m.left,width-m.right]);
    const y=d3.scaleLinear().domain([0,1]).range([height-m.bottom,m.top]);
    svg.append('g').attr('class','grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width-m.left-m.right)).tickFormat(''));
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-m.bottom})`).call(d3.axisBottom(x).ticks(5));
    svg.append('g').attr('class','axis').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v=>v*100+'%'));
    const line=d3.line().x(d=>x(d)).y(d=>y(1/(1+Math.exp(-d))));
    svg.append('path').datum(d3.range(-5,5.01,.05)).attr('d',line).attr('fill','none').attr('stroke',colors[0]).attr('stroke-width',3);
    svg.append('line').attr('x1',x(score)).attr('x2',x(score)).attr('y1',y(0)).attr('y2',y(probability)).attr('stroke','#777').attr('stroke-dasharray','3 4');
    svg.append('circle').attr('cx',x(score)).attr('cy',y(probability)).attr('r',7).attr('fill',colors[0]).attr('stroke','#fff').attr('stroke-width',2);
    $('logistic-score-value').textContent=score.toFixed(1);$('logistic-probability').textContent=pct(probability*100);
    $('logistic-explanation').textContent=score===0?'At a score of zero, the model gives both outcomes equal probability.':score>0?'A positive combined score pushes the estimated probability toward churn. It does not make churn inevitable.':'A negative combined score pushes the estimated probability toward staying. It does not make retention certain.';
  }
  function validation() {
    const threshold=+$('decision-threshold').value/100;
    const v=D.validation.thresholds.find(d=>Math.abs(d.threshold-threshold)<.001);
    $('decision-threshold-value').textContent=pct(threshold*100,0);
    $('validation-sample').textContent=count(D.validation.n)+' held-out users';
    const [[tn,fp],[fn,tp]]=v.matrix;
    const cells=[{value:tn,label:'Stayed, correctly unflagged',good:true,detail:'True negative: predicted stay, actually stayed.'},{value:fp,label:'Stayed, but flagged',good:false,detail:'False positive: predicted churn, actually stayed.'},{value:fn,label:'Churned, but missed',good:false,detail:'False negative: predicted stay, actually churned.'},{value:tp,label:'Churned, correctly flagged',good:true,detail:'True positive: predicted churn, actually churned.'}];
    $('confusion-matrix').innerHTML=cells.map(d=>`<div class="matrix-cell ${d.good?'good':'bad'}" tabindex="0" title="${d.detail}"><strong>${count(d.value)}</strong><span>${d.label}</span></div>`).join('');
    $('validation-metrics').innerHTML=[['Accuracy',pct(v.accuracy*100,1),'Share of all test users classified correctly.'],['Precision',pct(v.precision*100,1),'Share of flagged test users who churned.'],['Recall',pct(v.recall*100,1),'Share of actual churners the model flagged.'],['ROC AUC',D.validation.auc.toFixed(3),'Ranking quality; independent of this threshold.']].map(([label,value,note])=>`<div><strong>${value}</strong><span>${label}</span><p>${note}</p></div>`).join('');
  }
  function coefficients() {
    const data=D.coefficients.filter(d=>d.kind==='Numeric');
    if($('coefficient-sort').value==='name')data.sort((a,b)=>a.label.localeCompare(b.label));else data.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
    const {svg,width}=chart('coefficient-chart',data.length*64+35,'Numeric coefficients of the revalidated model');
    const limit=Math.max(1,d3.max(data,d=>Math.abs(d.value))*1.15);
    const x=d3.scaleLinear().domain([-limit,limit]).range([4,width-4]);
    svg.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',20).attr('y2',data.length*64).attr('stroke','#999');
    const groups=svg.selectAll('.coefficient-row').data(data).join('g').attr('class','coefficient-row').attr('transform',(d,i)=>`translate(0,${i*64+18})`);
    groups.append('text').attr('font-size',12).text(d=>d.label);
    groups.append('text').attr('x',width).attr('text-anchor','end').attr('font-size',12).attr('font-weight',600).text(d=>(d.value>0?'+':'')+d.value.toFixed(3));
    groups.append('line').attr('x1',x(0)).attr('x2',d=>x(d.value)).attr('y1',22).attr('y2',22).attr('stroke',d=>d.value>0?colors[0]:colors[1]).attr('stroke-width',5);
    groups.append('circle').attr('cx',d=>x(d.value)).attr('cy',22).attr('r',5).attr('fill',d=>d.value>0?colors[0]:colors[1]);
    groups.append('rect').attr('width',width).attr('height',58).attr('y',-15).attr('fill','transparent');
    interactive(groups,d=>`<strong>${esc(d.label)}</strong><br>${d.value>0?'Higher':'Lower'} churn score as this input rises.<br>Weight ${d.value.toFixed(4)} per standard deviation.<br>${esc(d.basis)}`);
    text(svg,0,data.length*64+25,'Lower churn score',{color:colors[1],size:11});text(svg,width,data.length*64+25,'Higher churn score',{color:colors[0],size:11,anchor:'end'});
  }

  function campaign(segment,reduction,cost) {
    const c=segment.campaign;
    const churn=Math.max(0,c.churn-c.target*reduction/100);
    const retained=(c.target-churn)*c.transaction*c.fee*c.multiplier;
    const lost=churn*c.transaction*c.fee;
    const spend=c.target*cost;
    const net=retained-lost-spend;
    const breakRisk=(c.transaction*c.fee*c.multiplier-cost)/(c.transaction*c.fee*(c.multiplier+1));
    return {retained,lost,spend,net,churn,breakRisk,needed:Math.max(0,(c.churn/c.target-breakRisk)*100)};
  }
  function economics() {
    const id=+$('economics-segment').value, reduction=+$('churn-reduction').value,cost=+$('campaign-cost').value;
    const segment=D.segments[id],c=segment.campaign,v=campaign(segment,reduction,cost);
    $('churn-reduction-value').textContent=reduction+' pp';$('campaign-cost-value').textContent=rp(cost);
    $('scenario-net').textContent=rp(v.net);$('scenario-net').style.color=v.net>=0?colors[3]:'#b13225';
    $('scenario-break-even').textContent=v.net>=0?'This scenario covers its modeled costs. Whether the campaign can achieve that change still needs a controlled test.':v.breakRisk<0?'At this cost, even zero churn would not break even under the transaction assumptions.':`At ${rp(cost)} per user, break-even requires about ${v.needed.toFixed(1)} percentage points less churn than baseline.`;
    const {svg,width}=chart('economics-chart',285,'Campaign net-return calculation for '+segment.name);
    const data=[{label:'Retained-user fees',value:v.retained,start:0,end:v.retained,color:colors[3]},{label:'Churned-user loss',value:-v.lost,start:v.retained,end:v.retained-v.lost,color:colors[0]},{label:'Campaign cost',value:-v.spend,start:v.retained-v.lost,end:v.net,color:'#898994'},{label:'Net return',value:v.net,start:0,end:v.net,color:v.net>=0?colors[3]:colors[0]}];
    const m={top:28,bottom:47,left:4,right:4}, low=Math.min(0,...data.map(d=>d.end)),high=d3.max(data,d=>Math.max(d.start,d.end));
    const y=d3.scaleLinear().domain([low-(high-low)*.1,high+(high-low)*.12]).range([285-m.bottom,m.top]);
    const x=d3.scaleBand().domain(data.map(d=>d.label)).range([m.left,width-m.right]).padding(.22);
    svg.append('line').attr('x1',0).attr('x2',width).attr('y1',y(0)).attr('y2',y(0)).attr('stroke','#a89c97');
    const groups=svg.selectAll('.waterfall-step').data(data).join('g').attr('class','waterfall-step');
    groups.append('rect').attr('x',d=>x(d.label)).attr('width',x.bandwidth()).attr('y',d=>y(Math.max(d.start,d.end))).attr('height',d=>Math.max(1,Math.abs(y(d.start)-y(d.end)))).attr('fill',d=>d.color);
    groups.each(function(d){const g=d3.select(this),cx=x(d.label)+x.bandwidth()/2; text(g,cx,y(Math.max(d.start,d.end))-10,(d.value<0?'-':'')+compact(Math.abs(d.value)),{anchor:'middle',size:11,bold:true});const words=d.label.split('-').join(' ').split(' ');words.forEach((word,i)=>text(g,cx,260+i*12,word,{anchor:'middle',size:10}));});
    interactive(groups,d=>`<strong>${d.label}</strong><br>${rp(d.value)}`);
    $('economics-caption').textContent=`${segment.name}: ${c.target.toLocaleString('en-US',{maximumFractionDigits:1})} planned contacts; assumed transaction value ${rp(c.transaction)}. Amounts in rupiah.`;
    $('campaign-comparison').innerHTML=D.segments.map(s=>{const out=campaign(s,reduction,cost);return `<button type="button" class="campaign-result" data-campaign="${s.id}" aria-pressed="${s.id===id}"><span>${s.name}</span><strong style="color:${out.net>=0?colors[3]:'#b13225'}">${rp(out.net)}</strong><small>${reduction===0&&cost===1000?'Baseline net return':'Scenario net return'}</small></button>`;}).join('');
  }

  function cover() {
    const canvas=$('cover-canvas'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2),ctx=canvas.getContext('2d');
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
    const mobile=w<=1100, cols=mobile?190:140, pitch=mobile?1.2:3.8, startX=mobile?(w-cols*pitch)/2:w-cols*pitch-70,startY=mobile?h-88:h-270;
    let index=0;
    D.segments.forEach(segment=>{ctx.fillStyle=segment.color;for(let i=0;i<segment.count;i++,index++){const px=index%cols,py=Math.floor(index/cols);ctx.globalAlpha=mobile?.5:.85;ctx.fillRect(startX+px*pitch,startY+py*pitch,pitch*.65,pitch*.65);}});
    ctx.globalAlpha=1;ctx.fillStyle='#c1c1c9';ctx.font='10px monospace';ctx.fillText('7,667 INVESTORS / FOUR SEGMENTS',startX,startY-16);
  }

  const renderers={audience,clustering:kmeans,segments:()=>{segmentProfile();segmentChart();},risk:()=>{risk();signals();},prediction:()=>{logistic();validation();},economics};
  const mounted=new Set();
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!mounted.has(e.target.id)){renderers[e.target.id]?.();mounted.add(e.target.id);}}),{rootMargin:'300px 0px'});
  document.querySelectorAll('.chapter').forEach(s=>observer.observe(s));
  document.querySelectorAll('[data-audience]').forEach(b=>b.addEventListener('click',()=>{state.audience=b.dataset.audience;document.querySelectorAll('[data-audience]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));audience();}));
  $('transaction-mode').addEventListener('change',transactions);
  $('transactions-chart').closest('details').addEventListener('toggle',e=>{if(e.target.open)transactions();});
  $('kmeans-k').addEventListener('change',()=>{state.k=+$('kmeans-k').value;state.step=0;kmeans();});
  $('kmeans-reset').addEventListener('click',()=>{state.step=0;kmeans();});
  $('kmeans-next').addEventListener('click',()=>{state.step=Math.min(8,state.step+1);kmeans();});
  $('segment-metric').addEventListener('change',()=>{state.metric=$('segment-metric').value;segmentChart();});
  $('risk-population').addEventListener('change',()=>{state.risk=$('risk-population').value;risk();});
  $('risk-sort').addEventListener('change',()=>{state.sort=$('risk-sort').value;risk();});
  $('signal-feature').addEventListener('change',()=>{state.signal=$('signal-feature').value;signals();});
  $('logistic-score').addEventListener('input',logistic);
  $('decision-threshold').addEventListener('input',validation);
  $('coefficient-sort').addEventListener('change',coefficients);
  $('coefficient-details').addEventListener('toggle',e=>{if(e.target.open)coefficients();});
  $('economics-segment').addEventListener('change',economics);
  ['churn-reduction','campaign-cost'].forEach(id=>$(id).addEventListener('input',economics));
  $('scenario-reset').addEventListener('click',()=>{$('churn-reduction').value=0;$('campaign-cost').value=1000;economics();});
  $('campaign-comparison').addEventListener('click',e=>{const b=e.target.closest('button');if(b){$('economics-segment').value=b.dataset.campaign;economics();$('campaign-comparison').querySelector(`[data-campaign="${b.dataset.campaign}"]`).focus({preventScroll:true});}});
  let ticking=false;
  function scrollState(){
    const sections=[...document.querySelectorAll('.chapter')];
    const active=sections.filter(s=>s.getBoundingClientRect().top<innerHeight*.36).at(-1);
    document.querySelectorAll('.chapter-nav a').forEach(a=>{if(a.hash==='#'+active?.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    const max=document.documentElement.scrollHeight-innerHeight;$('reading-progress').style.width=Math.max(0,Math.min(100,scrollY/max*100))+'%';ticking=false;
  }
  addEventListener('scroll',()=>{hideTip();if(!ticking){requestAnimationFrame(scrollState);ticking=true;}},{passive:true});
  addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{cover();mounted.forEach(id=>renderers[id]?.());if($('coefficient-details').open)coefficients();if($('transactions-chart').closest('details').open)transactions();},150);});
  segmentSelector();cover();scrollState();
  window.SegmentationStory={campaign};
})();
