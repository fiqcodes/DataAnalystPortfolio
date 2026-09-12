(() => {
  'use strict';
  const data = window.SAMBA_DATA;
  const $ = id => document.getElementById(id);
  const integer = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
  const decimal = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const count = n => integer.format(n);
  const money = n => '$' + decimal.format(n);
  const aov = r => r.paymentCents / 100 / r.orders;
  const qty = r => r.items / r.orders;
  const share = n => n > 0 && n / data.summary.orders * 100 < .1 ? '<0.1%' : (n / data.summary.orders * 100).toFixed(1) + '%';
  const shortMonth = name => new Date(name + '-01T12:00:00').toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
  const stateNames = {SP:'S\u00e3o Paulo',RJ:'Rio de Janeiro',MG:'Minas Gerais',RS:'Rio Grande do Sul',PR:'Paran\u00e1',SC:'Santa Catarina',BA:'Bahia',ES:'Esp\u00edrito Santo',GO:'Goi\u00e1s',DF:'Federal District',PE:'Pernambuco',CE:'Cear\u00e1',PA:'Par\u00e1',MT:'Mato Grosso',MA:'Maranh\u00e3o',MS:'Mato Grosso do Sul',PB:'Para\u00edba',PI:'Piau\u00ed',RN:'Rio Grande do Norte',AL:'Alagoas',SE:'Sergipe',TO:'Tocantins',RO:'Rond\u00f4nia',AM:'Amazonas',AC:'Acre',AP:'Amap\u00e1',RR:'Roraima'};
  const categoryNames = {'Bed Table Bath':'Bed, Table & Bath','Sport Leisure':'Sports & Leisure','Health Beauty':'Health & Beauty','Furniture Decoration':'Furniture & Decor','Computer Accessories':'Computer Accessories','Hygiene Diapers':'Hygiene & Diapers','Arts and Crafts':'Arts & Crafts','Casa Construcao':'Home Construction','Furniture Office':'Office Furniture','Watches Present':'Watches & Gifts','House Comfort':'Home Comfort','House Comfort 2':'Home Comfort 2','Signalization and Safety':'Signage & Safety','Garden Tools':'Garden Tools','Bags Accessories':'Luggage & Accessories','Pet Shop':'Pet Supplies','Fashion Bags and Accessories':'Fashion Bags & Accessories'};
  const categoryName = name => categoryNames[name] || name;
  const cityName = name => {
    const [city, state] = name.split(', ');
    const title = city.replace(/\b\w/g, c => c.toUpperCase()).replace(/\b(Do|Da|De|Dos|Das)\b/g, s => s.toLowerCase()).replace(/Sao/g, 'S\u00e3o').replace(/Brasilia/g, 'Bras\u00edlia');
    return title + ', ' + state;
  };
  const colors = {green:'#007d45',blue:'#244bc2',red:'#cf391e',line:'#cbd5ce',ink:'#143b2b'};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function options(select, rows, label) {
    select.replaceChildren(...rows.map(r => new Option(label(r), r.name)));
  }
  function pressed(selector, attribute, selected) {
    document.querySelectorAll(selector).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[attribute] === selected)));
  }
  function stats(items) {
    return '<dl>' + items.map(([name, value]) => '<div><dt>' + esc(name) + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>';
  }
  function svgFrame(id, label, margin) {
    const host = $(id), w = host.clientWidth, h = host.clientHeight;
    d3.select(host).selectAll('*').remove();
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role','group').attr('aria-label',label);
    svg.append('title').text(label);
    return {svg, w, h, m:margin};
  }

  const dashboards = {
    looker:{name:'Looker Studio', file:'looker-dashboard.jpg', width:1500, height:752, link:'https://lookerstudio.google.com/reporting/829c13ff-e17f-46f5-80bd-b2876aa372bb'},
    tableau:{name:'Tableau', file:'tableau-dashboard.jpg', width:1351, height:601, link:'https://public.tableau.com/views/SambaEcomerce/Dashboard4?:language=en-US&publish=yes&:display_count=n&:origin=viz_share_link'}
  };
  let dashboard = 'looker', zoom = 1;
  document.querySelectorAll('[data-dashboard]').forEach(button => button.addEventListener('click', () => {
    dashboard = button.dataset.dashboard;
    const d = dashboards[dashboard];
    pressed('[data-dashboard]','dashboard',dashboard);
    $('dashboard-image').src = '../../assets/samba/' + d.file;
    $('dashboard-image').alt = 'Samba ' + d.name + ' executive dashboard, January 2021 to January 2022';
    $('dashboard-image').width = d.width;
    $('dashboard-image').height = d.height;
    $('dashboard-caption').textContent = d.name;
    $('dashboard-link').href = d.link;
    $('dashboard-link').title = 'Open ' + d.name + ' dashboard';
    $('dashboard-link').setAttribute('aria-label', $('dashboard-link').title);
  }));
  function updateZoom() {
    $('zoom-image').style.width = zoom * 100 + '%';
    $('zoom-level').value = Math.round(zoom * 100) + '%';
    $('zoom-out').disabled = zoom <= 1;
    $('zoom-in').disabled = zoom >= 3;
  }
  $('expand-dashboard').addEventListener('click', () => {
    const d = dashboards[dashboard];
    $('dialog-title').textContent = d.name + ' dashboard';
    $('zoom-image').src = '../../assets/samba/' + d.file;
    $('zoom-image').alt = 'Enlarged Samba ' + d.name + ' dashboard';
    zoom = 1; updateZoom();
    $('dashboard-dialog').showModal();
    $('zoom-viewport').scrollTo(0,0);
    $('close-dashboard').focus();
    document.body.style.overflow = 'hidden';
  });
  $('zoom-in').addEventListener('click', () => {zoom = Math.min(3, zoom + .5); updateZoom();});
  $('zoom-out').addEventListener('click', () => {zoom = Math.max(1, zoom - .5); updateZoom();});
  $('close-dashboard').addEventListener('click', () => $('dashboard-dialog').close());
  $('dashboard-dialog').addEventListener('close', () => {document.body.style.overflow = ''; $('expand-dashboard').focus();});

  let trend = 'orders', month = data.months.length - 1;
  options($('month'), data.months, r => shortMonth(r.name));
  $('month').value = data.months[month].name;
  const value = r => trend === 'orders' ? r.orders : trend === 'payment' ? r.paymentCents / 100 : aov(r);
  const metricName = () => ({orders:'Orders',payment:'Payments ($)',aov:'Average order value ($)'}[trend]);
  function selectMonth(i) {
    month = i;
    const r = data.months[month], previous = data.months[month - 1];
    $('month').value = r.name;
    $('month-detail').innerHTML = '<h4>' + shortMonth(r.name) + '</h4>' + stats([['Orders', count(r.orders)],['Customers',count(r.customers)],['Sellers',count(r.sellers)],['Order value',money(aov(r))]]) + '<p class="change">Payments: ' + money(r.paymentCents / 100) + '. ' + (previous ? ((value(r) / value(previous) - 1) * 100 >= 0 ? '+' : '') + ((value(r) / value(previous) - 1) * 100).toFixed(1) + '% ' + ({orders:'orders',payment:'payments',aov:'AOV'}[trend]) + ' versus the previous month.' : 'First observed month; no prior-month comparison.') + '</p>';
    d3.selectAll('#trend-chart .mark').attr('fill', (r,j) => j === month ? colors.blue : colors.green).attr('aria-pressed', (r,j) => String(j === month));
  }
  function renderTrend() {
    const {svg,w,h,m} = svgFrame('trend-chart', 'Monthly ' + metricName() + ', January 2021 to January 2022', {top:30,right:12,bottom:34,left:48});
    const x = d3.scaleBand().domain(data.months.map(r => r.name)).range([m.left,w-m.right]).padding(.3);
    const y = d3.scaleLinear().domain([0,d3.max(data.months,value)*1.08]).nice().range([h-m.bottom,m.top]);
    svg.append('g').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-m.left-m.right)).tickFormat(d3.format('~s'))).call(g => g.select('.domain').remove()).call(g => g.selectAll('.tick line').attr('stroke-dasharray','3,4'));
    const visible = data.months.filter((r,i) => i % (w < 480 ? 4 : 2) === 0).map(r => r.name);
    svg.append('g').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues(visible).tickSize(0).tickPadding(12).tickFormat(s => shortMonth(s).replace('202','2')));
    svg.append('text').attr('class','axis-title').attr('x',m.left).attr('y',13).text(metricName());
    let marks;
    if (trend === 'aov') {
      svg.append('path').datum(data.months).attr('fill','none').attr('stroke',colors.green).attr('stroke-width',2.5).attr('d',d3.line().x(r=>x(r.name)+x.bandwidth()/2).y(r=>y(value(r))));
      marks = svg.selectAll('.mark').data(data.months).join('circle').attr('cx',r=>x(r.name)+x.bandwidth()/2).attr('cy',r=>y(value(r))).attr('r',7).attr('stroke','#fff').attr('stroke-width',2);
    } else {
      marks = svg.selectAll('.mark').data(data.months).join('rect').attr('x',r=>x(r.name)).attr('y',r=>y(value(r))).attr('width',x.bandwidth()).attr('height',r=>y(0)-y(value(r)));
    }
    marks.attr('class','mark').attr('tabindex',0).attr('role','button')
      .attr('aria-label',r=>shortMonth(r.name)+': '+(trend==='orders'?count(value(r)):money(value(r))))
      .on('pointerenter',(_,r)=>selectMonth(data.months.indexOf(r)))
      .on('focus',(_,r)=>selectMonth(data.months.indexOf(r)))
      .on('click',(_,r)=>selectMonth(data.months.indexOf(r)))
      .on('keydown',(e,r)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectMonth(data.months.indexOf(r));}})
      .append('title').text(r=>shortMonth(r.name)+': '+(trend==='orders'?count(value(r))+' orders':money(value(r))));
    selectMonth(month);
  }
  document.querySelectorAll('[data-trend]').forEach(button => button.addEventListener('click', () => {trend = button.dataset.trend; pressed('[data-trend]','trend',trend); renderTrend();}));
  $('month').addEventListener('change', () => selectMonth(data.months.findIndex(r => r.name === $('month').value)));
  $('monthly-table').innerHTML = data.months.map(r=>'<tr><th scope="row">'+shortMonth(r.name)+'</th><td>'+count(r.orders)+'</td><td>'+count(r.customers)+'</td><td>'+count(r.sellers)+'</td><td>'+decimal.format(r.paymentCents/100)+'</td><td>'+decimal.format(aov(r))+'</td></tr>').join('');

  function renderMarket() {
    const view = $('market-view').value, isState = view === 'state';
    $('city-filter').hidden = view !== 'aov';
    const candidates = (isState ? data.states : data.cities).filter(r=>view!=='aov'||!$('city-min').checked||r.orders>=30);
    const measure = r => view==='state'?r.customers:view==='city'?r.orders:aov(r);
    const ranked = candidates.slice().sort((a,b)=>measure(b)-measure(a)||a.name.localeCompare(b.name)).slice(0,10);
    $('market-scope').textContent = 'Top 10 of ' + count(candidates.length) + (isState ? ' states' : ' city-state groups');
    const rows = d3.select('#market-chart').selectAll('button').data(ranked,r=>r.name).join('button').attr('type','button').attr('class','rank-row').style('--bar',r=>(measure(r)/measure(ranked[0])*100)+'%');
    rows.html((r,i)=>'<span class="rank">'+String(i+1).padStart(2,'0')+'</span><span class="place">'+esc(isState?stateNames[r.name]||r.name:cityName(r.name))+'</span><span class="value">'+(view==='aov'?money(measure(r)):count(measure(r)))+'</span>');
    function select(r) {
      rows.attr('aria-pressed',d=>String(d.name===r.name));
      $('market-detail').innerHTML='<h4>'+esc(isState?stateNames[r.name]||r.name:cityName(r.name))+'</h4>'+stats([['Orders',count(r.orders)],['Customers',count(r.customers)],['Order value',money(aov(r))]])+'<p class="change">'+(r.orders<30?'Small sample: '+count(r.orders)+' order'+(r.orders===1?'':'s')+'. ': '')+esc(share(r.orders))+' of all orders in the dataset.</p>';
    }
    rows.attr('aria-label',r=>(isState?stateNames[r.name]:cityName(r.name))+': '+(view==='aov'?money(measure(r))+' average order value':count(measure(r))+(isState?' customers':' orders'))).on('click',(_,r)=>select(r)).on('focus',(_,r)=>select(r));
    select(ranked[0]);
  }
  $('market-view').addEventListener('change',renderMarket);
  $('city-min').addEventListener('change',renderMarket);

  let category = 'Hygiene Diapers';
  function categoryRows() {return data.categories.filter(r=>!$('category-min').checked||r.orders>=30);}
  function updateCategoryOptions() {
    const rows=categoryRows();
    if(!rows.some(r=>r.name===category)) category='Bed Table Bath';
    options($('category'),rows.slice().sort((a,b)=>categoryName(a.name).localeCompare(categoryName(b.name))),r=>categoryName(r.name));
    $('category').value=category;
    $('category-count').textContent=rows.length+' of '+data.categories.length+' categories';
  }
  function selectCategory(name) {
    category=name;
    const r=data.categories.find(r=>r.name===name);
    $('category').value=name;
    $('category-detail').innerHTML='<h4>'+esc(categoryName(name))+'</h4>'+stats([['Orders',count(r.orders)],['Share of all orders',share(r.orders)],['Mean item quantity',qty(r).toFixed(2)]])+'<p class="change">'+count(r.items)+' recorded items across '+count(r.orders)+' orders.'+(r.orders<30?' Small sample: fewer than 30 orders.':'')+'</p>';
    d3.selectAll('#product-chart .mark').attr('fill',r=>r.name===name?colors.red:r.orders>=3000?colors.green:colors.blue).attr('fill-opacity',r=>r.name===name?1:.5).attr('r',r=>r.name===name?9:6).attr('aria-pressed',r=>String(r.name===name));
  }
  function renderProducts() {
    const rows=categoryRows();
    const {svg,w,h,m}=svgFrame('product-chart','Category orders versus average item quantity; logarithmic order scale',{top:30,right:24,bottom:48,left:42});
    const x=d3.scaleLog().domain([1,8000]).range([m.left,w-m.right]);
    const y=d3.scaleLinear().domain([0,4]).range([h-m.bottom,m.top]);
    svg.append('g').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([0,1,2,3,4]).tickSize(-(w-m.left-m.right))).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('.tick line').attr('stroke-dasharray','3,4'));
    svg.append('g').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues([1,10,100,1000,5000]).tickFormat(count).tickSize(0).tickPadding(10));
    svg.append('text').attr('class','axis-title').attr('x',m.left).attr('y',13).text('Mean item quantity');
    svg.append('text').attr('class','axis-title').attr('x',w-m.right).attr('y',h-3).attr('text-anchor','end').text('Orders (log scale)');
    svg.selectAll('.mark').data(rows).join('circle').attr('class','mark').attr('cx',r=>x(r.orders)).attr('cy',r=>y(qty(r))).attr('stroke','white').attr('stroke-width',1.5).attr('tabindex',0).attr('role','button')
      .attr('aria-label',r=>categoryName(r.name)+': '+count(r.orders)+' orders, '+qty(r).toFixed(2)+' mean item quantity')
      .on('pointerenter',(_,r)=>selectCategory(r.name)).on('focus',(_,r)=>selectCategory(r.name)).on('click',(_,r)=>selectCategory(r.name))
      .on('keydown',(e,r)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCategory(r.name);}})
      .append('title').text(r=>categoryName(r.name)+': '+count(r.orders)+' orders, '+qty(r).toFixed(2)+' mean item quantity');
    const high=rows.find(r=>r.name==='Hygiene Diapers');
    if(high) svg.append('text').attr('x',x(high.orders)+15).attr('y',y(qty(high))-12).attr('fill',colors.red).text('Hygiene & Diapers: 2 orders');
    svg.append('text').attr('x',x(5052)-9).attr('y',y(qty(data.categories.find(r=>r.name==='Bed Table Bath')))-17).attr('text-anchor','end').text('Bed, Table & Bath');
    selectCategory(category);
  }
  $('category').addEventListener('change',()=>selectCategory($('category').value));
  $('category-min').addEventListener('change',()=>{updateCategoryOptions();renderProducts();});
  renderTrend();renderMarket();updateCategoryOptions();renderProducts();
  let width=window.innerWidth, resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(width!==window.innerWidth){width=window.innerWidth;renderTrend();renderProducts();}},100);});
  const sections=[...document.querySelectorAll('.chapter-nav a')].map(a=>({a,node:document.querySelector(a.getAttribute('href'))}));
  const updateNav=()=>{
    let current=null;
    sections.forEach(s=>{if(s.node.getBoundingClientRect().top<innerHeight*.4)current=s;});
    sections.forEach(s=>{if(s===current)s.a.setAttribute('aria-current','location');else s.a.removeAttribute('aria-current');});
  };
  window.addEventListener('scroll',updateNav,{passive:true});updateNav();
})();
