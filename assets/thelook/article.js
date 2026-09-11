(() => {
  'use strict';
  const D = window.THELOOK_DATA;
  const $ = id => document.getElementById(id);
  const number = d3.format(',.0f'), decimal = d3.format(',.2f');
  const blue = '#184dd6', red = '#bb3b30';
  const state = {metric:'revenueGrowth', scope:10, descending:false, category:'Jumpsuits & Rompers',
    portfolio:'Outerwear & Coats', focus:'All', cohortView:'rate', cohort:0, month:1, a:0, b:10, entry:false};
  const tip = $('tooltip');
  function showTip(node, heading, body, e) {
    tip.replaceChildren();
    const strong = document.createElement('strong'); strong.textContent = heading;
    tip.append(strong, document.createTextNode(body)); tip.hidden = false;
    const rect = node.getBoundingClientRect();
    const x = e?.clientX || rect.left+rect.width/2, y = e?.clientY || rect.top;
    tip.style.left = `${Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,x+12))}px`;
    tip.style.top = `${Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,y-tip.offsetHeight-12))}px`;
  }
  function hideTip() { tip.hidden = true; }
  function hover(nodes, heading, body) {
    nodes.on('pointerenter pointermove',function(e,d){showTip(this,heading(d),body(d),e);})
      .on('focus',function(e,d){showTip(this,heading(d),body(d));}).on('pointerleave blur',hideTip);
    nodes.append('title').text(d => `${heading(d)}. ${body(d)}`);
  }
  function roving(selection, onActivate) {
    const nodes = selection.nodes();
    selection.attr('tabindex',(_,i)=>i ? -1 : 0).on('keydown',function(e,d){
      if (onActivate && ['Enter',' '].includes(e.key)) {e.preventDefault();onActivate(d);return;}
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      e.preventDefault();
      let index = nodes.indexOf(this)+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1);
      if(e.key==='Home') index=0;
      if(e.key==='End') index=nodes.length-1;
      index=(index+nodes.length)%nodes.length;
      nodes.forEach((n,i)=>n.setAttribute('tabindex',i===index?'0':'-1')); nodes[index].focus();
    });
  }
  function canvas(id,height,margin={top:25,right:20,bottom:45,left:45}) {
    const mount=$(id), width=Math.max(240,mount.getBoundingClientRect().width);
    mount.replaceChildren();
    const root=d3.select(mount).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('width',width).attr('height',height);
    const g=root.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
    return {root,g,w:width-margin.left-margin.right,h:height-margin.top-margin.bottom,margin};
  }
  function yGrid(g,y,w,ticks=5) {
    g.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(ticks).tickSize(-w).tickFormat(''));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(ticks).tickSize(0).tickPadding(10));
  }
  function ranking() {
    const ordered=[...D.categories].sort((a,b)=>a[state.metric]-b[state.metric]);
    const data=ordered.slice(0,state.scope);
    if(state.descending) data.reverse();
    const chart=d3.select('#ranking-chart'); chart.selectAll('*').remove();
    const max=220;
    const rows=chart.selectAll('button').data(data).join('button').attr('type','button')
      .attr('class',d=>`rank-row ${d.priority==='Review'?'review':''}`)
      .attr('aria-pressed',d=>String(d.name===state.category))
      .attr('aria-label',d=>`${d.name}, ${state.metric==='revenueGrowth'?'revenue':'gross profit'} growth ${decimal(d[state.metric])} percent`)
      .on('click',(_,d)=>{state.category=d.name;categoryDetail();});
    rows.append('span').attr('class','rank-name').each(function(d){
      const el=d3.select(this); el.append('span').text(String(ordered.indexOf(d)+1).padStart(2,'0'));
      el.append('span').attr('class','category-name').style('font','inherit').style('color','inherit').text(d.name);
    });
    rows.append('span').attr('class','rank-track').attr('aria-hidden','true').append('span').attr('class','rank-fill').style('--width',d=>`${d[state.metric]/max*100}%`);
    rows.append('span').attr('class','rank-value').text(d=>`+${decimal(d[state.metric])}%`);
    categoryDetail();
  }
  function categoryDetail() {
    const c=D.categories.find(c=>c.name===state.category);
    d3.selectAll('.rank-row').attr('aria-pressed',d=>String(d.name===c.name));
    const out=$('category-detail');out.replaceChildren();
    const name=document.createElement('strong');name.textContent=c.name;
    out.append(name,document.createTextNode(`: revenue +${decimal(c.revenueGrowth)}%; gross profit +${decimal(c.profitGrowth)}%. Gross profit rose from ${decimal(c.profit21)} to ${decimal(c.profit22)} in the source's currency units.`));
  }
  function categoryColor(c) {return c.priority==='Invest'?blue:c.priority==='Review'?red:'#909bab';}
  function portfolio() {
    const {g,w,h,root,margin}=canvas('portfolio-chart',415,{top:35,right:20,bottom:60,left:45});
    const x=d3.scaleLinear().domain([0,14]).range([0,w]), y=d3.scaleLinear().domain([0,225]).range([h,0]);
    yGrid(g,y,w,5);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(innerWidth<560?4:7).tickFormat(d=>`${d}%`).tickSize(0).tickPadding(10));
    g.append('text').attr('x',0).attr('y',-19).text('Gross profit growth, %');
    root.append('text').attr('x',margin.left+w/2).attr('y',403).attr('text-anchor','middle').text(innerWidth<560?'Share of gross profit increase, %':'Contribution to the 2021-2022 increase in gross profit, %');
    if($('reference-lines').checked) {
      g.append('line').attr('class','reference').attr('x1',x(7.5)).attr('x2',x(7.5)).attr('y1',0).attr('y2',h);
      g.append('line').attr('class','reference').attr('x1',0).attr('x2',w).attr('y1',y(100)).attr('y2',y(100));
    }
    const points=g.selectAll('.portfolio-point').data(D.categories).join('circle').attr('class',d=>`portfolio-point ${d.name===state.portfolio?'selected-point':''}`)
      .attr('cx',d=>x(d.increaseShare)).attr('cy',d=>y(d.profitGrowth)).attr('r',d=>d.name===state.portfolio?9:6)
      .attr('fill',d=>categoryColor(d)).attr('fill-opacity',d=>state.focus==='All'||d.priority===state.focus||d.name===state.portfolio?1:.14)
      .attr('stroke','white').attr('stroke-width',1.2).attr('role','button')
      .attr('aria-label',d=>`${d.name}, ${decimal(d.increaseShare)} percent of profit increase, ${decimal(d.profitGrowth)} percent growth`)
      .on('click',(_,d)=>selectPortfolio(d.name));
    hover(points,d=>d.name,d=>`${decimal(d.profitGrowth)}% gross profit growth; ${decimal(d.increaseShare)}% of the total increase.`);
    roving(points,d=>selectPortfolio(d.name));
    portfolioReadout();
  }
  function selectPortfolio(name) {
    state.portfolio=name;$('portfolio-category').value=name;hideTip();
    // Update points in place so keyboard focus remains on the selected point.
    d3.selectAll('.portfolio-point').attr('class',d=>`portfolio-point ${d.name===name?'selected-point':''}`)
      .attr('r',d=>d.name===name?9:6).attr('fill-opacity',d=>state.focus==='All'||d.priority===state.focus||d.name===name?1:.14);
    portfolioReadout();
  }
  function portfolioReadout() {
    const c=D.categories.find(c=>c.name===state.portfolio), mount=d3.select('#portfolio-readout');mount.selectAll('*').remove();
    const title=mount.append('div');title.append('h4').text(c.name);title.append('span').text(`${c.priority==='Invest'?'Investment shortlist':c.priority==='Review'?'Lower-priority review':'Outside the two shortlists'} / 2021-2022`);
    const share=mount.append('div');share.append('strong').text(`${decimal(c.increaseShare)}%`);share.append('span').text('of the gross profit increase');
    const growth=mount.append('div');growth.append('strong').text(`+${decimal(c.profitGrowth)}%`);growth.append('span').text('gross profit growth');
  }
  function acquisition() {
    const mobile=innerWidth<560;
    const {g,w,h}=canvas('acquisition-chart',290,{top:35,right:10,bottom:40,left:45});
    const x=d3.scaleBand().domain(D.cohorts.map(c=>c.name)).range([0,w]).padding(.3), y=d3.scaleLinear().domain([0,2000]).range([h,0]);
    yGrid(g,y,w,4);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickSize(0).tickPadding(12).tickFormat((d,i)=>mobile?(i%2===0?d:''):d));
    const bars=g.selectAll('.cohort-bar').data(D.cohorts).join('rect').attr('class','cohort-bar').attr('x',d=>x(d.name)).attr('y',d=>y(d.size)).attr('height',d=>h-y(d.size)).attr('width',x.bandwidth())
      .attr('fill',d=>['Jan','Dec'].includes(d.name)?blue:'#b9c9ee');
    hover(bars,d=>`${d.name} 2022`,d=>`${number(d.size)} first-time completed-order buyers.`);roving(bars);
    D.cohorts.filter(c=>['Jan','Dec'].includes(c.name)).forEach(c=>g.append('text').attr('class','value-label').attr('x',x(c.name)+x.bandwidth()/2).attr('y',y(c.size)-12).attr('text-anchor','middle').text(number(c.size)));
  }
  function cellColor(value) {
    return d3.interpolateRgb('#edf2fc',blue)(Math.min(1,value/(state.cohortView==='rate'?15:200)));
  }
  function readableInk(fill) {
    const c=d3.rgb(fill), v=[c.r,c.g,c.b].map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    return 1.05/(.2126*v[0]+.7152*v[1]+.0722*v[2]+.05)>=4.5?'white':'#16191e';
  }
  function cohortGrid() {
    const grid=d3.select('#cohort-grid');grid.selectAll('*').remove();
    grid.append('div').attr('class','row-label col-label').text('Cohort / size');
    d3.range(12).forEach(m=>grid.append('div').attr('class','col-label').text(`M${m}`));
    D.cohorts.forEach((c,i)=>{
      const label=grid.append('div').attr('class','row-label');label.append('span').text(c.name);label.append('small').text(number(c.size));
      d3.range(12).forEach(m=>{
        if(m>=c.counts.length){grid.append('span').attr('class','unobserved').attr('aria-label',`${c.name}, month ${m}: not yet observed`).text('\u2014');return;}
        const value=state.cohortView==='rate'?c.rates[m]:c.counts[m],fill=cellColor(value);
        grid.append('button').datum({i,m}).attr('class',`cohort-cell ${m===0?'entry':''}`).attr('type','button')
          .attr('data-cohort',i).attr('data-month',m).attr('aria-pressed',String(i===state.cohort&&m===state.month))
          .attr('aria-label',`${c.name} 2022, month ${m}: ${c.counts[m]} of ${c.size} buyers, ${decimal(c.rates[m])} percent`)
          .style('background',fill).style('color',readableInk(fill)).text(state.cohortView==='rate'?`${c.rates[m].toFixed(1)}%`:number(c.counts[m]))
          .on('click',()=>selectCell(i,m));
      });
    });
    roving(grid.selectAll('button'));
    cohortReadout();scrollButtons();
  }
  function selectCell(i,m) {
    state.cohort=i;state.month=m;state.a=i;$('cohort-a').value=i;
    d3.selectAll('.cohort-cell').attr('aria-pressed',d=>String(d.i===i&&d.m===m));
    cohortReadout();trajectory();
  }
  function cohortReadout() {
    const c=D.cohorts[state.cohort], m=state.month;
    const date=new Date(Date.UTC(2022,state.cohort+m,1));
    const calendar=date.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
    const mount=d3.select('#cohort-readout');mount.selectAll('*').remove();
    const stat=mount.append('div');stat.append('span').attr('class','eyebrow').text(`${c.name} cohort / M${m}`);stat.append('strong').text(state.cohortView==='rate'?`${decimal(c.rates[m])}%`:number(c.counts[m]));
    mount.append('p').text(m===0?`${number(c.size)} buyers entered in ${calendar} with their first completed order. Month 0 is 100% by construction; it is not evidence of a second purchase.`:
      `${number(c.counts[m])} of ${number(c.size)} buyers recorded an order in ${calendar}, ${m} ${m===1?'month':'months'} after entry (${decimal(c.rates[m])}%). Order completion is not required for this activity count.`);
  }
  function scrollButtons() {
    const el=$('cohort-scroll');$('cohort-left').disabled=el.scrollLeft<2;
    $('cohort-right').disabled=el.scrollLeft>=el.scrollWidth-el.clientWidth-2;
  }
  function trajectory() {
    const a=D.cohorts[state.a],b=D.cohorts[state.b];
    const {g,w,h,root,margin}=canvas('trajectory-chart',280,{top:30,right:20,bottom:50,left:40});
    const start=state.entry?0:1, x=d3.scaleLinear().domain([start,11]).range([0,w]),y=d3.scaleLinear().domain([0,state.entry?100:15]).range([h,0]);
    yGrid(g,y,w,5);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickValues(innerWidth<560?(state.entry?[0,2,4,6,8,10]:[1,3,5,7,9,11]):d3.range(start,12)).tickFormat(d=>`M${d}`).tickSize(0).tickPadding(12));
    g.append('text').attr('x',0).attr('y',-15).text('Recorded order activity, %');
    root.append('text').attr('x',margin.left+w/2).attr('y',273).attr('text-anchor','middle').text('Months after first completed order');
    [[a,blue],[b,red]].forEach(([c,color])=>{
      const points=c.rates.map((rate,m)=>({rate,m})).filter(d=>d.m>=start);
      g.append('path').datum(points).attr('class','trajectory-line').attr('d',d3.line().x(d=>x(d.m)).y(d=>y(d.rate))).attr('fill','none').attr('stroke',color).attr('stroke-width',2);
      const dots=g.append('g').selectAll('circle').data(points).join('circle').attr('cx',d=>x(d.m)).attr('cy',d=>y(d.rate)).attr('r',4.5).attr('fill',color).attr('stroke','white').attr('stroke-width',1);
      hover(dots,d=>`${c.name} 2022 / M${d.m}`,d=>`${decimal(d.rate)}%, ${c.counts[d.m]} of ${c.size} buyers.`);roving(dots);
    });
    let text;
    if(a===b) text=`Both selections are the ${a.name} cohort. Its ${a.counts.length-1} observed follow-up months end in December 2022.`;
    else if(a.rates.length===1||b.rates.length===1) text='December has no observed follow-up month in this 2022 window. Its missing trajectory is not 0% activity.';
    else text=`Next-month activity: ${a.name} ${decimal(a.rates[1])}% (${a.counts[1]}/${number(a.size)}) versus ${b.name} ${decimal(b.rates[1])}% (${b.counts[1]}/${number(b.size)}). Both rates refer to M1; this is descriptive, not a causal comparison.`;
    $('trajectory-summary').textContent=text;$('trajectory-chart').setAttribute('aria-label',text);
  }
  function query() {
    const key=$('query-select').value, text=D.queries[key];
    const code=$('query-code');code.replaceChildren();
    // Token coloring only; SQL is displayed as text and never executed in the browser.
    const tokens=text.split(/(--[^\n]*|'[^']*'|`[^`]*`|\b(?:WITH|SELECT|AS|FROM|JOIN|LEFT|CROSS|ON|WHERE|AND|IN|GROUP BY|ORDER BY|DISTINCT|MIN|SUM|COUNT|ROUND|SAFE_DIVIDE|EXTRACT|DATE_TRUNC|DATE_DIFF|UNNEST|GENERATE_ARRAY)\b)/g);
    tokens.forEach(t=>{
      const span=document.createElement('span');span.textContent=t;
      if(t.startsWith('--'))span.className='sql-comment';else if(t.startsWith("'")||t.startsWith('`'))span.className='sql-string';else if(/^[A-Z_ ]+$/.test(t))span.className='sql-keyword';
      code.append(span);
    });
    $('download-query').href=`${key}.sql`;$('copy-status').textContent='';
    $('query-note').textContent=key==='retention-completed'?'Proposed follow-up only. This adds a completed-order filter and zero-filled eligible months. It must be rerun before any corrected retention rate can be reported.':key==='growth'?'Consolidated form of the documented growth logic. Completed items only; historical source tables have not been rerun.':'Documented cohort definition in a clearer form: first completed order for entry, any order status for later activity. This is the definition behind the displayed rates.';
  }
  async function copyQuery() {
    const text=D.queries[$('query-select').value];
    try {await navigator.clipboard.writeText(text);$('copy-status').textContent='SQL copied.';}
    catch {
      const range=document.createRange();range.selectNodeContents($('query-code'));
      const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
      const copied=document.execCommand('copy');selection.removeAllRanges();
      $('copy-status').textContent=copied?'SQL copied.':'Clipboard unavailable. The SQL download is available.';
    }
  }
  function group(selector,key,dataKey,draw) {
    document.querySelectorAll(selector).forEach(button=>button.addEventListener('click',()=>{
      state[key]=button.dataset[dataKey];document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));hideTip();draw();
    }));
  }
  group('[data-metric]','metric','metric',ranking);
  group('[data-focus]','focus','focus',portfolio);
  group('[data-cohort-view]','cohortView','cohortView',cohortGrid);
  $('rank-scope').addEventListener('change',e=>{state.scope=+e.target.value;ranking();});
  $('rank-sort').addEventListener('click',()=>{state.descending=!state.descending;const label=state.descending?'Show lowest growth first':'Show highest growth first';$('rank-sort').title=label;$('rank-sort').setAttribute('aria-label',label);ranking();});
  D.categories.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{const option=document.createElement('option');option.textContent=c.name;$('portfolio-category').append(option);});
  $('portfolio-category').value=state.portfolio;
  $('portfolio-category').addEventListener('change',e=>selectPortfolio(e.target.value));$('reference-lines').addEventListener('change',portfolio);
  ['cohort-a','cohort-b'].forEach(id=>{
    D.cohorts.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${c.name} 2022`;$(id).append(o);});
    $(id).value=id==='cohort-a'?state.a:state.b;
    $(id).addEventListener('change',e=>{state[id==='cohort-a'?'a':'b']=+e.target.value;trajectory();});
  });
  $('include-entry').addEventListener('change',e=>{state.entry=e.target.checked;trajectory();});
  $('cohort-scroll').addEventListener('scroll',scrollButtons,{passive:true});
  $('cohort-left').addEventListener('click',()=>$('cohort-scroll').scrollBy({left:-300,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  $('cohort-right').addEventListener('click',()=>$('cohort-scroll').scrollBy({left:300,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  $('query-select').addEventListener('change',query);$('copy-query').addEventListener('click',copyQuery);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
  let ticking=false;
  function progress() {
    const sections=[...document.querySelectorAll('.chapter')];let current=sections[0].id;
    sections.forEach(s=>{if(s.getBoundingClientRect().top<innerHeight*.38)current=s.id;});
    document.querySelectorAll('.rail a').forEach(a=>{const active=a.hash===`#${current}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    $('reading-progress').style.setProperty('--progress',`${Math.min(100,Math.max(0,scrollY/(document.documentElement.scrollHeight-innerHeight)*100))}%`);ticking=false;
  }
  addEventListener('scroll',()=>{hideTip();if(!ticking){ticking=true;requestAnimationFrame(progress);}},{passive:true});
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{hideTip();portfolio();acquisition();trajectory();scrollButtons();progress();},150);});
  ranking();portfolio();acquisition();cohortGrid();trajectory();query();progress();
})();
