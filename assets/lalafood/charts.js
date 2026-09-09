/* D3 renderers use only aggregate observations and saved model outputs. */
(() => {
  'use strict';
  const D = window.LALAFOOD_DATA;
  const C = { green:'#13795c', blue:'#2589a2', red:'#d35d63', ink:'#20392f', lime:'#c7eb70', faint:'#e1e9e4' };
  const fmt = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const month = m => new Date(m+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'});
  const pct = n => fmt(n)+'%';
  const readable = label => label.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace('Aneka Nasi','Rice dishes').replace('Minuman','Beverages').replace('Snacks Jajanan','Snacks');
  function frame(c,height=330) {
    const w=Math.max(250,c.chart.clientWidth),h=height;
    const svg=d3.select(c.chart).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',c.title).style('height',h+'px');
    svg.append('title').text(c.title);
    return {svg,w,h};
  }
  function text(g,x,y,value,cls='',anchor='start') {return g.append('text').attr('x',x).attr('y',y).attr('class',cls).attr('text-anchor',anchor).text(value);}
  function wrap(selection,chars) {
    selection.each(function(){const e=d3.select(this),words=e.text().split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).length>chars&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}lines.push(line);e.text(null);lines.forEach((s,i)=>e.append('tspan').attr('x',e.attr('x')).attr('dy',i?'1.05em':`${-.5*(lines.length-1)}em`).text(s));});
  }
  function interactive(selection,c,label,select) {
    selection.attr('tabindex',0).attr('role',select?'button':'img').attr('aria-label',label)
      .on('pointerenter focus',(event,d)=>c.tip(label(d),event))
      .on('pointermove',(event,d)=>c.tip(label(d),event))
      .on('pointerleave blur',()=>c.hideTip())
      .on('click',(event,d)=>{c.hideTip();if(select)select(d);else c.detail.textContent=label(d);})
      .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(select)select(d);else c.detail.textContent=label(d);}});
    selection.append('title').text(label);
  }
  function axis(g,fn){g.call(fn);g.select('.domain').remove();return g;}
  function barChart(c,rows,key='rate',options={}) {
    const {svg,w,h}=frame(c,Math.max(230,rows.length*33+50));
    const left=Math.min(w*.43,190),right=65;
    const x=d3.scaleLinear().domain([0,options.max||d3.max(rows,d=>d[key])*1.05||1]).nice().range([left,w-right]);
    const y=d3.scaleBand().domain(rows.map(d=>d.label)).range([14,h-34]).padding(.38);
    axis(svg.append('g').attr('transform',`translate(0,${h-34})`),d3.axisBottom(x).ticks(3).tickSize(-(h-48)).tickFormat(v=>options.count?d3.format('~s')(v):v+'%'));
    const marks=svg.selectAll('.bar').data(rows).join('rect').attr('class','bar').attr('x',left).attr('y',d=>y(d.label)).attr('height',y.bandwidth()).attr('width',d=>x(d[key])-left).attr('rx',2).attr('fill',(d,i)=>d.color|| (i===0?C.green:C.blue));
    interactive(marks,c,d=>`${d.label}: ${options.count?fmt(d[key],0):pct(d[key])}${d.count&&!options.count?`; ${fmt(d.count,0)} sessions`:''}.`);
    rows.forEach(d=>{wrap(text(svg,left-12,y(d.label)+y.bandwidth()/2+4,d.label,'','end'),Math.floor((left-14)/6.5));text(svg,x(d[key])+7,y(d.label)+y.bandwidth()/2+4,options.count?fmt(d[key],0):pct(d[key]),'value');});
  }
  function heat(c,rows,cols,lookup,options={}) {
    const table=document.createElement('table');table.className='heat-table'+(cols.length>5?' cohort-table':'');
    const head=table.createTHead().insertRow();head.append(document.createElement('th'));
    cols.forEach(col=>{const th=document.createElement('th');th.scope='col';th.textContent=col;head.append(th);});
    const body=table.createTBody();
    for(const row of rows){const tr=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=options.rowLabel?options.rowLabel(row):row;tr.append(th);
      for(const col of cols){const td=tr.insertCell(),d=lookup(row,col);if(!d){td.textContent='—';td.setAttribute('aria-label','Not observed');continue;}
        const v=d.value,t=Math.min(1,v/(options.max||35));td.style.background=d3.interpolateRgb('#eef5ee',C.green)(t);td.style.color=t>.55?'white':C.ink;
        const button=document.createElement('button');button.type='button';button.textContent=fmt(v,cols.length>5?1:2);button.setAttribute('aria-label',d.label);button.title=d.label;
        button.addEventListener('click',()=>{if(options.select)options.select(row,col);else c.detail.textContent=d.label;});
        ['pointerenter','focus'].forEach(e=>button.addEventListener(e,event=>c.tip(d.label,event)));['pointerleave','blur'].forEach(e=>button.addEventListener(e,()=>c.hideTip()));td.append(button);
      }
    }
    const scroll=document.createElement('div');scroll.className='heat-scroll';scroll.append(table);c.chart.append(scroll);
  }
  const renderers={
    objective(c,s){
      const target=s.view==='goal',count=target?28:25;
      const stat=document.createElement('div');stat.className='goal-statement';stat.innerHTML=`<strong>${count}<span> / 100</span></strong><p>${target?'The year-end goal':'The October baseline'}</p>`;c.chart.append(stat);
      const grid=document.createElement('div');grid.className='waffle';grid.setAttribute('role','img');grid.setAttribute('aria-label',`${count} bookings per 100 sessions`);
      for(let i=0;i<100;i++){const el=document.createElement('i');el.className=i<25?'converted':i<28&&target?'target-cell':'';grid.append(el);}c.chart.append(grid);
      c.detail.textContent=target?'Three additional bookings per 100 visits. A 12% relative increase.':'One in four sessions converts to a booking.';
      c.caption.textContent='Business target: 25% to 28% conversion by the end of 2024.';
    },
    audience(c,s){
      const cuisine=s.view==='cuisine';
      const rows=(cuisine?D.cuisine.filter(d=>d.count>=Number(s.sample||0)):D.segment).map(d=>({...d,name:cuisine?readable(d.label):'Segment '+d.label}));
      const {svg,w,h}=frame(c,350),m={l:42,r:28,t:35,b:48};
      const x=d3.scaleLinear().domain([0,cuisine?32:50]).range([m.l,w-m.r]);
      const y=d3.scaleLinear().domain([10,50]).range([h-m.b,m.t]);
      const r=d3.scaleSqrt().domain([0,d3.max(rows,d=>d.count)]).range([4,cuisine?16:22]);
      axis(svg.append('g').attr('transform',`translate(0,${h-m.b})`),d3.axisBottom(x).ticks(4).tickFormat(d=>d+'%'));
      axis(svg.append('g').attr('transform',`translate(${m.l},0)`),d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(d=>d+'%'));
      svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(25)).attr('y2',y(25)).attr('stroke',C.red).attr('stroke-dasharray','4 5');text(svg,w-m.r,y(25)-8,'25% baseline','annotation','end');
      const marks=svg.selectAll('.bubble').data(rows).join('circle').attr('class','bubble').attr('cx',d=>x(d.share)).attr('cy',d=>y(d.rate)).attr('r',d=>r(d.count)).attr('fill',d=>d.label==='D'?C.red:C.green).attr('fill-opacity',.75).attr('stroke','white').attr('stroke-width',2);
      interactive(marks,c,d=>`${d.name}: ${pct(d.rate)} conversion · ${pct(d.share)} of sessions · n=${fmt(d.count,0)}.`);
      const labelled=cuisine?rows.filter(d=>['ANEKA NASI','THAI','MINUMAN'].includes(d.label)):rows;
      labelled.forEach(d=>{
        const nearLeft=x(d.share)<m.l+45,nearRight=x(d.share)>w-m.r-40;
        let lx=x(d.share),ly=y(d.rate)-r(d.count)-10,anchor='middle';
        if(cuisine){anchor=nearLeft?'start':nearRight?'end':'middle';lx=nearLeft?m.l+5:nearRight?w-m.r-4:lx;}
        if(!cuisine&&['A','C','E'].includes(d.label)){ly=y(d.rate)+(d.label==='E'?32:d.label==='C'?32:-22);lx=x(d.share);}
        text(svg,lx,ly,cuisine?d.name:d.label,'point-label',anchor);
      });
      text(svg,m.l,16,'Conversion rate','axis-title');text(svg,(m.l+w-m.r)/2,h-5,'Share of all sessions','axis-title','middle');
      c.detail.textContent=cuisine?'Rice dishes: 93,416 sessions. Thai food: 90 sessions. Sample size changes how confidently a rate can be read.':'B combines high volume with high conversion; D combines high volume with room to improve.';
      c.caption.textContent='Each circle is a customer segment or cuisine. Circle area represents session count.';
    },
    discovery(c,s){
      if(s.view==='ratings'){
        heat(c,['0-3 stars','3-4 stars','4-5 stars'],['0-10','10-50','50-100','100+'],(row,col)=>{const d=D.rating.find(d=>d.label===`${row.replace(' stars','')} / ${col}`);return d?{value:d.rate,label:`${row}, ${col} reviews: ${pct(d.rate)} conversion; ${fmt(d.count,0)} sessions.`}:null;});
        c.detail.textContent='4-5 stars and 100+ reviews: 32.62% conversion.';c.caption.textContent='Columns: number of reviews. Cells: conversion rate (%). A dash means no observations.';
      }else if(s.view==='price'){
        barChart(c,D.price,s.metric==='share'?'share':'rate');c.detail.textContent='40-50k: 30.31% conversion. 110-120k: 31.41%. Most sessions are in lower price bands.';c.caption.textContent='Restaurant price bands in IDR thousands. Rates describe the sessions in each band.';
      }else{
        const {svg,w,h}=frame(c,330),m={l:42,r:38,t:45,b:60};
        const x=d3.scalePoint().domain(D.distance.map(d=>d.label)).range([m.l,w-m.r]),y=d3.scaleLinear().domain([0,35]).range([h-m.b,m.t]);
        axis(svg.append('g').attr('transform',`translate(${m.l},0)`),d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(v=>v+'%'));
        axis(svg.append('g').attr('transform',`translate(0,${h-m.b})`),d3.axisBottom(x).tickSize(0));
        svg.append('path').datum(D.distance).attr('d',d3.area().x(d=>x(d.label)).y0(h-m.b).y1(d=>y(d.rate))).attr('fill','#e5f1e9');
        svg.append('path').datum(D.distance).attr('d',d3.line().x(d=>x(d.label)).y(d=>y(d.rate))).attr('stroke',C.green).attr('stroke-width',3).attr('fill','none');
        const dots=svg.selectAll('circle').data(D.distance).join('circle').attr('cx',d=>x(d.label)).attr('cy',d=>y(d.rate)).attr('r',7).attr('fill',C.green).attr('stroke','white').attr('stroke-width',2);
        interactive(dots,c,d=>`${d.label}: ${pct(d.rate)} conversion; ${pct(d.share)} session share.`);
        D.distance.forEach(d=>text(svg,x(d.label),y(d.rate)-16,pct(d.rate),'value','middle'));
        text(svg,m.l,18,'Conversion rate','axis-title');c.detail.textContent='More than half of sessions are within 2 km, where conversion is highest.';c.caption.textContent='Distance from customer to restaurant, observed in 329,019 sessions.';
      }
    },
    promotions(c,s){
      if(s.view==='types'){
        const rows=D.promo.filter(d=>d.label.endsWith('True')).map(d=>({...d,label:d.label.split(' / ')[0].replace('RPL and MFP Only','RPL & MFP').replace('RPL, MFP, and Bank Promo','RPL, MFP & bank').replace('Bank Promo Only','Bank only')}));
        barChart(c,rows);c.detail.textContent='RPL & MFP promotions: 31.03% conversion when shown.';
      }else{
        const member=s.view==='membership',rows=(member?D.membership:D.visibility).map(d=>({...d,label:member?(d.label==='True'?'GoJek Plus':'Non-member'):(d.label==='True'?'Offer shown':'No offer shown')}));
        const {svg,w,h}=frame(c,290),left=34,right=30,y0=125;
        const x=d3.scaleLinear().domain([0,35]).range([left,w-right]);
        axis(svg.append('g').attr('transform',`translate(0,${y0+65})`),d3.axisBottom(x).ticks(4).tickSize(0).tickFormat(v=>v+'%'));
        svg.append('line').attr('x1',x(rows[0].rate)).attr('x2',x(rows[1].rate)).attr('y1',y0).attr('y2',y0).attr('stroke',C.faint).attr('stroke-width',9).attr('stroke-linecap','round');
        const marks=svg.selectAll('circle').data(rows).join('circle').attr('cx',d=>x(d.rate)).attr('cy',y0).attr('r',11).attr('fill',(_,i)=>i?C.green:C.red).attr('stroke','white').attr('stroke-width',2);
        interactive(marks,c,d=>`${d.label}: ${pct(d.rate)} conversion; ${pct(d.share)} of sessions.`);
        rows.forEach((d,i)=>{const anchor=member?(i?'start':'end'):(i?'end':'start');const lx=member?x(d.rate)+(i?7:-7):x(d.rate);text(svg,lx,y0+(member&&i?40:-28),pct(d.rate),'big-value',anchor);text(svg,lx,y0+(member&&i?58:-8),d.label,'',anchor);});
        text(svg,w/2,h-26,'Conversion rate','axis-title','middle');
        c.detail.textContent=member?'GoJek Plus members represent 18.06% of sessions and convert 8.91% more often, in relative terms.':'Conversion is over 14 times higher in sessions where a promotion is shown.';
      }
      c.caption.textContent='Observed differences between groups. Testing is needed to establish incremental impact.';
    },
    timing(c,s){
      const key=s.metric==='share'?'share':'rate';
      heat(c,['Breakfast','Lunch','Afternoon snack','Dinner','Supper'],['Weekday','Weekend'],(row,col)=>{const d=D.time.find(d=>d.label.toLowerCase()===`${row} / ${col}`.toLowerCase());return {value:d[key],label:`${col} ${row.toLowerCase()}: ${pct(d[key])} ${key==='rate'?'conversion':'session share'}; ${fmt(d.count,0)} sessions.`};},{max:30});
      c.detail.textContent='Weekday dinner: 27.01% conversion and 23.06% of sessions.';c.caption.textContent=key==='rate'?'Booking conversion within each day-and-meal group (%).':'Each cell shows its share of all sessions (%).';
    },
    modeling(c,s){
      const key=s.metric||'recall',rows=D.models.map((d,i)=>({...d,rate:d[key]*100,color:i===2?C.green:C.blue}));
      barChart(c,rows,'rate',{max:100});
      const explain={recall:'Of actual bookings, how many did the model identify?',precision:'Of predicted bookings, how many were actual bookings?',accuracy:'What share of all sessions did the model classify correctly?'};
      c.detail.textContent=explain[key];c.caption.textContent='Test-set performance. More recall can come at the cost of more false positives.';
    },
    shap(c,s){
      let rows=D.shap.filter(d=>(s.category==='all'||d.category===s.category)&&(s.includeLead||d.id!=='44'));
      rows.sort(s.sort==='name'?(a,b)=>a.label.localeCompare(b.label):(a,b)=>b.value-a.value);
      if(!rows.some(d=>d.id===s.feature))s.feature=rows[0]?.id;
      if(!rows.length){c.chart.textContent='No features match these filters.';return;}
      const {svg,w,h}=frame(c,Math.max(200,rows.length*34+42)),left=Math.min(w*.5,220),right=58;
      const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d.value)*1.04]).range([left,w-right]);
      const y=d3.scaleBand().domain(rows.map(d=>d.id)).range([8,h-35]).padding(.25);
      axis(svg.append('g').attr('transform',`translate(0,${h-35})`),d3.axisBottom(x).ticks(3).tickSize(-(h-43)).tickFormat(v=>fmt(v,v<.1?2:1)));
      const groups=svg.selectAll('.shap-row').data(rows).join('g').attr('class',d=>'shap-row'+(d.id===s.feature?' selected':'')).attr('data-feature',d=>d.id);
      groups.append('rect').attr('x',0).attr('y',d=>y(d.id)-4).attr('width',w).attr('height',y.bandwidth()+8).attr('fill',d=>d.id===s.feature?'#edf4ed':'transparent');
      groups.append('line').attr('x1',left).attr('x2',d=>x(d.value)).attr('y1',d=>y(d.id)+y.bandwidth()/2).attr('y2',d=>y(d.id)+y.bandwidth()/2).attr('stroke',d=>d.category==='Promotion'?C.blue:C.green).attr('stroke-width',3);
      groups.append('circle').attr('cx',d=>x(d.value)).attr('cy',d=>y(d.id)+y.bandwidth()/2).attr('r',5).attr('fill',d=>d.category==='Promotion'?C.blue:C.green);
      groups.each(function(d){const g=d3.select(this);wrap(text(g,left-12,y(d.id)+y.bandwidth()/2+4,d.label,'feature-name','end'),Math.floor((left-15)/6.5));text(g,x(d.value)+8,y(d.id)+y.bandwidth()/2+4,fmt(d.value,3),'value');});
      const select=d=>{s.feature=d.id;c.redraw();c.chart.querySelector(`[data-feature="${d.id}"]`)?.focus({preventScroll:true});};
      interactive(groups,c,d=>`${d.label}: ${fmt(d.value,6)} mean absolute SHAP. ${d.direction}.`,select);
      groups.attr('aria-pressed',d=>String(d.id===s.feature));
      const d=rows.find(d=>d.id===s.feature);
      c.detail.replaceChildren();const title=document.createElement('strong');title.textContent=d.label;const p=document.createElement('span');p.textContent=d.description;c.detail.append(title,p);
      c.caption.textContent='Mean absolute SHAP across the test set, in model log-odds units. Larger means more influence; these values are not probabilities.';
    },
    retention(c,s){
      if(s.view==='acquisition'){
        barChart(c,D.cohorts.filter(d=>d.age===0).map(d=>({label:month(d.month),count:d.size})),'count',{count:true});c.detail.textContent='New cohort sizes decline across the observation window. March 2025 ends on March 20.';
      }else if(s.view==='matrix'){
        heat(c,[...new Set(D.cohorts.map(d=>d.month))],Array.from({length:10},(_,i)=>'M'+i),(row,col)=>{const d=D.cohorts.find(d=>d.month===row&&d.age===+col.slice(1));return d?{value:d.rate,label:`${month(row)}, month ${d.age}: ${pct(d.rate)} retained; ${fmt(d.active,0)} of ${fmt(d.size,0)} users.`}:null;},{rowLabel:month,max:40,select:row=>{s.cohort=row;s.view='curve';c.redraw();}});
        c.detail.textContent='The biggest drop appears between Month 0 and Month 1, across every cohort.';
      }else{
        const {svg,w,h}=frame(c,330),m={l:42,r:24,t:20,b:40},x=d3.scaleLinear().domain([0,9]).range([m.l,w-m.r]),y=d3.scaleLinear().domain([0,100]).range([h-m.b,m.t]);
        axis(svg.append('g').attr('transform',`translate(${m.l},0)`),d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(v=>v+'%'));
        axis(svg.append('g').attr('transform',`translate(0,${h-m.b})`),d3.axisBottom(x).ticks(w<400?5:9).tickFormat(v=>'M'+v));
        const groups=d3.group(D.cohorts,d=>d.month),line=d3.line().x(d=>x(d.age)).y(d=>y(d.rate));
        for(const [key,values] of groups)svg.append('path').datum(values).attr('d',line).attr('stroke',key===s.cohort?C.green:'#d9e3dc').attr('stroke-width',key===s.cohort?3:1.4).attr('fill','none');
        const rows=groups.get(s.cohort),marks=svg.selectAll('circle').data(rows).join('circle').attr('cx',d=>x(d.age)).attr('cy',d=>y(d.rate)).attr('r',5).attr('fill',C.green).attr('stroke','white').attr('stroke-width',1.5);
        interactive(marks,c,d=>`${month(d.month)}, month ${d.age}: ${pct(d.rate)} retained; ${fmt(d.active,0)} users.`);
        c.detail.textContent=`${month(s.cohort)}: ${fmt(rows[0].size,0)} new users.${rows[1]?` Month 1 retention is ${pct(rows[1].rate)}.`:' No later month is observed.'}`;
      }
      c.caption.textContent=s.view==='curve'?'Selected cohort in green; other cohorts in grey. Month 0 is the first transaction month.':'Cohorts: June 2024-March 2025. Blank cells have no follow-up observation.';
    },
    conclusion(c,s){
      const phases=[['discover','First order'],['repeat','Second order'],['loyal','Long-term']];
      const {svg,w}=frame(c,95);const x=d3.scalePoint().domain(phases.map(d=>d[0])).range([42,w-42]);
      svg.append('line').attr('x1',42).attr('x2',w-42).attr('y1',30).attr('y2',30).attr('stroke',C.faint).attr('stroke-width',3);
      const dots=svg.selectAll('circle').data(phases).join('circle').attr('cx',d=>x(d[0])).attr('cy',30).attr('r',12).attr('fill',d=>d[0]===s.phase?C.green:'#e2eae4');interactive(dots,c,d=>d[1],d=>{s.phase=d[0];c.redraw();});
      phases.forEach(d=>text(svg,x(d[0]),65,d[1],'point-label','middle'));
      const actions={discover:[['Nearby & trusted','Prioritize restaurants within 2 km with strong ratings and reviews.'],['Visible incentives','Test relevant offers, Weekday Dinner Deals, and GoJek Plus trials.']],repeat:[['A reason to return','Reward the second transaction and simplify repeat ordering.'],['Better first experience','Investigate feedback and remove pain points after the first order.']],loyal:[['Re-engage at months 4-5','Personalize reminders and loyalty offers before customers drift away.'],['Lasting benefits','Offer exclusive benefits and subscription value to returning customers.']]};
      const list=document.createElement('div');list.className='action-list';for(const [heading,body] of actions[s.phase]){const item=document.createElement('div'),title=document.createElement('strong'),p=document.createElement('p');title.textContent=heading;p.textContent=body;item.append(title,p);list.append(item);}c.chart.append(list);
      c.detail.textContent='Start small. A/B test the change. Measure bookings and repeat orders before scaling.';c.caption.textContent='Proposed product and retention actions based on the observed behavior.';
    }
  };
  window.LalaCharts={renderers,fmt,month};
})();
