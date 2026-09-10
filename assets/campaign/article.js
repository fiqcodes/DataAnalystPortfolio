(() => {
  'use strict';
  const D = window.CAMPAIGN_DATA;
  const colors = {1: '#be235b', 2: '#067c80', 3: '#92700b'};
  const $ = id => document.getElementById(id);
  const num = d3.format(',.2f');
  const signed = d3.format('+.2f');
  const pformat = p => p < .001 ? p.toExponential(2) : p.toFixed(3);
  const state = {measure: 'mean', analysis: 'weekly', comparison: 2, holm: false, market: 2, promotion: 3, ageMarket: 'All'};
  const tip = $('tooltip');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tooltip(node, title, lines, event) {
    tip.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = title;
    tip.append(heading, document.createTextNode(lines));
    tip.hidden = false;
    const box = node.getBoundingClientRect();
    const x = event && event.clientX ? event.clientX : box.x + box.width/2;
    const y = event && event.clientY ? event.clientY : box.y;
    tip.style.left = `${Math.max(10, Math.min(innerWidth-tip.offsetWidth-10, x+13))}px`;
    tip.style.top = `${Math.max(10, Math.min(innerHeight-tip.offsetHeight-10, y-tip.offsetHeight-12))}px`;
  }
  function hideTip() { tip.hidden = true; }
  function hover(selection, title, detail) {
    selection.on('pointerenter pointermove', function(e, d) { tooltip(this, title(d), detail(d), e); })
      .on('focus', function(e, d) { tooltip(this, title(d), detail(d)); })
      .on('pointerleave blur', hideTip);
    selection.append('title').text(d => `${title(d)}. ${detail(d)}`);
  }
  function roving(selection) {
    const nodes = selection.nodes();
    selection.attr('tabindex', (_, i) => i ? -1 : 0).on('keydown', function(e) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let next = nodes.indexOf(this) + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1);
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = nodes.length-1;
      next = (next+nodes.length)%nodes.length;
      nodes.forEach((n, i) => n.setAttribute('tabindex', i === next ? '0' : '-1'));
      nodes[next].focus();
    });
  }
  function svg(id, height, margin = {top: 25, right: 25, bottom: 40, left: 45}) {
    const mount = $(id);
    const width = Math.max(240, mount.getBoundingClientRect().width);
    mount.replaceChildren();
    const root = d3.select(mount).append('svg').attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width).attr('height', height);
    const g = root.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    return {root, g, w: width-margin.left-margin.right, h: height-margin.top-margin.bottom, margin};
  }
  function axis(g, x, y, w, h, ticks = 5) {
    g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(ticks).tickSize(-w).tickFormat(''));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(ticks).tickSize(0).tickPadding(10));
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5).tickSize(0).tickPadding(12));
  }

  function allocation() {
    const mount = d3.select('#allocation-chart');
    D.promotions.forEach(p => {
      const group = mount.append('div').attr('class', 'allocation-group').style('--color', colors[p.id]);
      const top = group.append('div').attr('class', 'allocation-top');
      top.append('h4').text(`Promotion ${p.id}`);
      top.append('strong').text(p.stores);
      const marks = group.append('div').attr('class', 'store-dots').selectAll('button')
        .data(D.stores.filter(s => s.promotion === p.id)).join('button').attr('class', 'store-dot')
        .attr('type', 'button').attr('aria-label', d => `Store ${d.id}, ${d.market} market, ${num(d.sales)} thousand average weekly sales`)
        .on('click', function(e, d) { tooltip(this, `Store ${d.id}`, `${d.market} market. ${d.age} years old. Average weekly sales: ${num(d.sales)} thousand.`, e); });
      hover(marks, d => `Store ${d.id}`, d => `${d.market} market. ${d.age} years old. Average weekly sales: ${num(d.sales)} thousand.`);
      roving(marks);
    });
  }

  function sales() {
    const {g, w, h} = svg('sales-chart', 285, {top: 18, right: 68, bottom: 34, left: innerWidth < 560 ? 72 : 108});
    const metric = state.measure;
    const data = [...D.promotions].sort((a, b) => b[metric]-a[metric]);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d[metric])*1.04]).nice().range([0, w]);
    const y = d3.scaleBand().domain(data.map(d => d.id)).range([0, h]).padding(.38);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(innerWidth < 560 ? 3 : 6).tickSize(-h).tickPadding(12));
    const bars = g.selectAll('.bar').data(data).join('rect').attr('x', 0).attr('y', d => y(d.id))
      .attr('height', y.bandwidth()).attr('fill', d => colors[d.id]).attr('width', 0);
    bars.transition().duration(reducedMotion ? 0 : 450).attr('width', d => x(d[metric]));
    hover(bars.attr('tabindex', 0), d => `Promotion ${d.id}`, d => `${num(d.mean)} thousand per store per week; ${num(d.total)} thousand total; ${d.stores} stores.`);
    g.selectAll('.campaign-name').data(data).join('text').attr('class', 'chart-label').attr('x', -12)
      .attr('y', d => y(d.id)+y.bandwidth()/2+5).attr('text-anchor', 'end').text(d => innerWidth < 560 ? `Promo ${d.id}` : `Promotion ${d.id}`);
    g.selectAll('.number').data(data).join('text').attr('class', 'value').attr('x', d => x(d[metric])+10)
      .attr('y', d => y(d.id)+y.bandwidth()/2+7).style('font-size', metric === 'total' ? '16px' : null)
      .text(d => metric === 'stores' ? d.stores : metric === 'total' ? d3.format(',.0f')(d.total) : num(d.mean));
    const copy = {
      mean: ['Average weekly sales per store, thousands', 'A fairer starting point', 'Promotion 1 leads at 58.10 thousand per store per week, followed by 3 at 55.36 and 2 at 47.33. These averages do not adjust for market mix.'],
      total: ['All stores and all four weeks, thousands', 'More stores can mean more sales', 'Promotion 3 totals 10,408.52 thousand, ahead of Promotion 1 at 9,993.03. It also has 47 stores versus 43, so totals alone are not a fair performance comparison.'],
      stores: ['Distinct stores assigned to each promotion', 'The groups are not the same size', 'Promotion 1 has 43 stores (172 weekly records). Promotions 2 and 3 each have 47 stores (188 weekly records). Every store contributes four weeks.']
    }[metric];
    $('sales-unit').textContent = copy[0]; $('sales-title').textContent = copy[1]; $('sales-caption').textContent = copy[2];
    $('sales-chart').setAttribute('aria-label', copy[2]);
  }

  function weekly() {
    const {g, w, h} = svg('weekly-chart', 245, {top: 20, right: 35, bottom: 40, left: 40});
    const x = d3.scaleLinear().domain([1,4]).range([0,w]);
    const y = d3.scaleLinear().domain([40,65]).range([h,0]);
    g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(9));
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickValues([1,2,3,4]).tickFormat(d => `W${d}`).tickSize(0).tickPadding(12));
    const line = d3.line().x((d,i) => x(i+1)).y(d => y(d));
    D.promotions.forEach(p => {
      g.append('path').datum(p.weeks).attr('d', line).attr('fill','none').attr('stroke',colors[p.id]).attr('stroke-width',2.5);
      const points = g.append('g').selectAll('circle').data(p.weeks.map((sales,i) => ({sales,week:i+1}))).join('circle')
        .attr('cx',d => x(d.week)).attr('cy',d => y(d.sales)).attr('r',5).attr('fill',colors[p.id]).attr('stroke','white').attr('stroke-width',2);
      hover(points, d => `Promotion ${p.id}, week ${d.week}`, d => `${num(d.sales)} thousand per store.`); roving(points);
      g.append('text').attr('x',w+12).attr('y',y(p.weeks[3])+4).style('fill',colors[p.id]).style('font-weight',700).text(p.id);
    });
  }

  function evidence() {
    const t = D.tests[state.analysis][state.comparison];
    const p = state.holm ? t.holm : t.p;
    $('difference').textContent = signed(t.difference);
    $('p-value').textContent = pformat(p);
    $('p-value').classList.toggle('scientific',p < .001);
    $('p-label').textContent = state.holm ? 'Holm-adjusted p-value' : 'Two-sided p-value';
    $('verdict').textContent = p < .05 ? 'Clear difference at the 5% threshold' : 'No clear difference at the 5% threshold';
    const {g,w,h} = svg('interval-chart', 122, {top:30,right:22,bottom:38,left:22});
    const x = d3.scaleLinear().domain([-8,20]).range([0,w]);
    g.append('line').attr('class','zero').attr('x1',x(0)).attr('x2',x(0)).attr('y1',-15).attr('y2',h);
    g.append('line').attr('x1',x(t.low)).attr('x2',x(t.high)).attr('y1',13).attr('y2',13).attr('stroke',colors[t.a]).attr('stroke-width',5);
    [t.low,t.high].forEach(v => g.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',4).attr('y2',22).attr('stroke',colors[t.a]).attr('stroke-width',2));
    g.append('circle').attr('cx',x(t.difference)).attr('cy',13).attr('r',8).attr('fill',colors[t.a]).attr('stroke','white').attr('stroke-width',2);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).tickValues(innerWidth < 560 ? [-5,0,5,10,15,20] : [-5,0,5,10,15,20]).tickSize(0).tickPadding(12));
    const note = `95% interval: ${signed(t.low)} to ${signed(t.high)} thousand (Promotion ${t.a} minus ${t.b}). ${t.low <= 0 && t.high >= 0 ? 'It includes zero: either promotion could have the higher true mean.' : `It stays above zero, favoring Promotion ${t.a}.`}${state.holm ? ' This individual interval is not adjusted for multiple comparisons.' : ''}`;
    $('interval-note').textContent = note;
    $('interval-chart').setAttribute('aria-label', note);
    $('test-caption').textContent = state.analysis === 'weekly'
      ? `Documented analysis: pooled, equal-variance t-test on ${t.n[0]} and ${t.n[1]} weekly records. It treats repeat observations of the same store as independent. Statistical significance is not a measure of commercial value.`
      : `Additional sensitivity check: Welch's t-test on ${t.n[0]} and ${t.n[1]} store-level four-week means. It avoids counting the same store four times, but does not model market-level clustering.`;
    density();
  }

  function density() {
    if (!document.querySelector('.distribution').open) return;
    const t = D.tests[state.analysis][state.comparison];
    const {g,w,h} = svg('density-chart',220,{top:20,right:20,bottom:40,left:20});
    const x = d3.scaleLinear().domain([-8,8]).range([0,w]);
    const y = d3.scaleLinear().domain([0,.43]).range([h,0]);
    const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));
    const area = d3.area().x(d => x(d[0])).y0(h).y1(d => y(d[1]));
    g.append('path').datum(t.density).attr('d',area).attr('fill','#e9f7f6');
    [-1,1].forEach(side => {
      const tail = t.density.filter(d => side < 0 ? d[0] <= -Math.abs(t.t) : d[0] >= Math.abs(t.t));
      g.append('path').datum(tail).attr('d',area).attr('fill',colors[t.a]).attr('opacity',.65);
      g.append('line').attr('x1',x(side*Math.abs(t.t))).attr('x2',x(side*Math.abs(t.t))).attr('y1',8).attr('y2',h).attr('stroke',colors[t.a]).attr('stroke-dasharray','4 4');
    });
    g.append('path').datum(t.density).attr('d',line).attr('fill','none').attr('stroke','#172a2b').attr('stroke-width',1.5);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(8).tickSize(0).tickPadding(12));
    $('density-note').textContent = `Null t distribution; ${num(t.df)} degrees of freedom. Observed t = ${signed(t.t)}. The two shaded tails represent the unadjusted p-value of ${pformat(t.p)}; very small tails may be barely visible. ${state.holm ? 'Holm adjustment changes the reported p-value, not this null distribution.' : ''}`;
  }

  function matrix() {
    const mount = d3.select('#market-matrix'); mount.selectAll('*').remove();
    mount.append('span').attr('aria-hidden','true');
    [1,2,3].forEach(i => mount.append('div').attr('class','column-head').style('color',colors[i]).text(`Promotion ${i}`));
    const fill = d3.scaleSequential(d3.interpolateRgb('#f1f8f7','#218787')).domain([35,80]);
    function cellInk(value) {
      const c = d3.rgb(fill(value));
      const linear = [c.r,c.g,c.b].map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
      const luminance = .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
      return 1.05/(luminance+.05) >= 4.5 ? 'white' : '#102425';
    }
    D.markets.forEach((m, i) => {
      mount.append('div').attr('class','row-head').text(m.name);
      m.promotions.forEach(p => {
        const button = mount.append('button').attr('type','button').attr('data-market',i).attr('data-promotion',p.id)
          .attr('aria-pressed',i === state.market && p.id === state.promotion ? 'true' : 'false')
          .attr('aria-label',`${m.name} market, Promotion ${p.id}: ${num(p.mean)} thousand, ${p.stores} stores`)
          .style('background',fill(p.mean)).style('color',cellInk(p.mean))
          .on('click',() => {state.market=i;state.promotion=p.id;marketDetail();});
        button.append('strong').text(num(p.mean)); button.append('span').text(`${p.stores} stores`);
      });
    });
    marketDetail();
    const tbody = d3.select('#market-table');
    D.markets.forEach(m => {
      const row = tbody.append('tr');
      [m.name,m.stores,`${m.age.toFixed(1)} years`,num(m.mean)].forEach(v => row.append('td').text(v));
    });
  }
  function marketDetail() {
    d3.selectAll('#market-matrix button').attr('aria-pressed',function() {return +this.dataset.market === state.market && +this.dataset.promotion === state.promotion ? 'true' : 'false';});
    const m = D.markets[state.market];
    const p = m.promotions.find(p => p.id === state.promotion);
    const ranking = [...m.promotions].sort((a,b) => b.mean-a.mean);
    const rank = ranking.findIndex(d => d.id === p.id)+1;
    $('market-detail').replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = `${m.name} / Promotion ${p.id}`;
    const detail = document.createElement('p'); detail.textContent = `${num(p.mean)} thousand per store per week, from ${p.stores} stores. Rank ${rank} of 3 within this market size. ${rank === 1 ? 'The highest observed mean here, not a confirmed statistical winner.' : `${num(ranking[0].mean-p.mean)} thousand below Promotion ${ranking[0].id}'s observed mean.`}`;
    $('market-detail').append(heading,detail);
  }

  function age() {
    const data = D.stores.filter(d => state.ageMarket === 'All' || d.market === state.ageMarket);
    const {g,w,h,root,margin} = svg('age-chart',365,{top:30,right:20,bottom:50,left:43});
    const x = d3.scaleLinear().domain([0,30]).range([0,w]);
    const y = d3.scaleLinear().domain([0,110]).range([h,0]);
    axis(g,x,y,w,h);
    g.append('text').attr('x',0).attr('y',-15).text('Weekly sales, thousands');
    root.append('text').attr('x',margin.left+w/2).attr('y',355).attr('text-anchor','middle').text('Store age, years');
    const points = g.selectAll('.point').data(data).join('circle').attr('cx',d => x(d.age)).attr('cy',d => y(d.sales))
      .attr('r',innerWidth < 560 ? 4.5 : 5.5).attr('fill',d => colors[d.promotion]).attr('fill-opacity',.74).attr('stroke','white').attr('stroke-width',.7);
    hover(points,d => `Store ${d.id} / Promotion ${d.promotion}`,d => `${d.market} market, ${d.age} years old. Average weekly sales: ${num(d.sales)} thousand.`); roving(points);
    $('age-caption').textContent = `${data.length} stores${state.ageMarket === 'All' ? ', all markets' : ` in ${state.ageMarket.toLowerCase()} markets`}. Each point is one store's four-week average; exact overlaps are possible. The reported correlation uses all 548 weekly records, not the filtered points.`;
    $('age-chart').setAttribute('aria-label',`Age versus weekly sales for ${data.length} stores. No clear overall linear relationship.`);
  }
  function model() {
    const age = +$('model-age').value, market = +$('model-market').value;
    const c = D.model.coefficients;
    $('model-age-value').textContent = `${age} ${age === 1 ? 'year' : 'years'}`;
    $('model-value').textContent = num(c[0]+c[1]*market+c[2]*age);
  }
  function group(selector,key,callback) {
    document.querySelectorAll(selector).forEach(button => button.addEventListener('click',() => {
      state[key] = button.dataset[key];
      document.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed',b === button ? 'true' : 'false'));
      hideTip(); callback();
    }));
  }
  group('[data-measure]','measure',sales); group('[data-analysis]','analysis',evidence);
  $('comparison').addEventListener('change',e => {state.comparison=+e.target.value;evidence();});
  $('holm').addEventListener('change',e => {state.holm=e.target.checked;evidence();});
  $('age-market').addEventListener('change',e => {state.ageMarket=e.target.value;age();});
  $('model-age').addEventListener('input',model); $('model-market').addEventListener('change',model);
  document.querySelector('.distribution').addEventListener('toggle',density);
  document.addEventListener('keydown',e => {if(e.key === 'Escape') hideTip();});
  addEventListener('scroll',hideTip,{passive:true});
  const sections = [...document.querySelectorAll('.chapter')];
  const nav = [...document.querySelectorAll('.contents a')];
  let ticking = false;
  function scrollState() {
    let current = sections[0].id;
    sections.forEach(s => {if(s.getBoundingClientRect().top < innerHeight*.4) current=s.id;});
    nav.forEach(a => {const active=a.hash === `#${current}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    $('progress').style.width = `${Math.min(100,Math.max(0,scrollY/(document.documentElement.scrollHeight-innerHeight)*100))}%`;
    ticking=false;
  }
  addEventListener('scroll',() => {if(!ticking){ticking=true;requestAnimationFrame(scrollState);}},{passive:true});
  let resizeTimer;
  addEventListener('resize',() => {clearTimeout(resizeTimer);resizeTimer=setTimeout(() => {hideTip();sales();weekly();evidence();age();scrollState();},150);});
  allocation();sales();weekly();evidence();matrix();age();model();scrollState();
})();
