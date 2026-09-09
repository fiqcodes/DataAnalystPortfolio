/* Narrative, chart configuration, and scroll orchestration stay independent. */
(() => {
  'use strict';
  const D=window.LALAFOOD_DATA,Charts=window.LalaCharts;
  if(!D||!Charts||!window.d3)return;
  const steps=[...document.querySelectorAll('.story-step')],desktop=document.getElementById('visual-stage');
  const template=desktop.cloneNode(true);template.removeAttribute('id');
  const mobile=()=>matchMedia('(max-width:900px)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const definitions={
    objective:{title:'Three more bookings per hundred',category:'The opportunity',defaults:{view:'goal'}},
    audience:{title:'Where volume meets conversion',category:'Customer behavior',defaults:{view:'segments',sample:'0'}},
    discovery:{title:'A shorter distance to a decision',category:'Restaurant discovery',defaults:{view:'distance',metric:'rate'}},
    promotions:{title:'The incentive gap',category:'Offers & membership',defaults:{view:'visibility'}},
    timing:{title:'The dinner window',category:'Time & intent',defaults:{metric:'rate'}},
    modeling:{title:'What does the model catch?',category:'Test-set comparison',defaults:{metric:'recall'}},
    shap:{title:'Inside the booking prediction',category:'Feature explorer',defaults:{category:'all',sort:'impact',includeLead:true,feature:'44'}},
    retention:{title:'The second-order challenge',category:'Cohort explorer',defaults:{view:'curve',cohort:'2024-06'}},
    conclusion:{title:'A plan for the customer journey',category:'What to test next',defaults:{phase:'discover'}}
  };
  const states=new Map(Object.entries(definitions).map(([id,d])=>[id,{...d.defaults}])),contexts=new Map();
  let active='',framePending=false;
  function createContext(stage,id){
    const part=name=>stage.querySelector(`[data-ui="${name}"]`),def=definitions[id];
    const c={id,stage,title:def.title,part,chart:part('chart'),controls:part('controls'),detail:part('detail'),caption:part('caption')};
    part('title').textContent=def.title;part('category').textContent=def.category;part('index').textContent=`${String(steps.findIndex(e=>e.dataset.viz===id)+1).padStart(2,'0')} / 09`;
    let tooltip=stage.querySelector('.chart-tooltip');if(!tooltip){tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;stage.append(tooltip);}
    c.hideTip=()=>{tooltip.hidden=true;};
    c.tip=(text,event)=>{
      tooltip.textContent=text;tooltip.hidden=false;
      const box=stage.getBoundingClientRect(),target=event.target.getBoundingClientRect();
      const x=event.clientX||target.x+target.width/2,y=event.clientY||target.y;
      tooltip.style.left=Math.max(0,Math.min(box.width-tooltip.offsetWidth,x-box.x+10))+'px';
      tooltip.style.top=Math.max(0,Math.min(box.height-tooltip.offsetHeight,y-box.y-tooltip.offsetHeight-12))+'px';
    };
    c.redraw=()=>{
      c.hideTip();const focus=document.activeElement,controlKey=focus?.dataset.control,focusValue=focus?.value;
      c.controls.replaceChildren();c.chart.replaceChildren();c.detail.replaceChildren();setupControls(c);Charts.renderers[id](c,states.get(id));
      if(controlKey){const candidates=[...c.controls.querySelectorAll('[data-control]')];const next=candidates.find(e=>e.dataset.control===controlKey&&(!focusValue||e.value===focusValue));next?.focus({preventScroll:true});}
      if(!reduced)c.chart.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'ease-out'});
    };
    c.redraw();return c;
  }
  function segments(c,key,options){
    const group=document.createElement('div');group.className='segmented';group.setAttribute('role','group');group.setAttribute('aria-label',key);
    for(const [value,label] of options){const b=document.createElement('button');b.type='button';b.value=value;b.dataset.control=key;b.textContent=label;b.setAttribute('aria-pressed',String(states.get(c.id)[key]===value));b.onclick=()=>{states.get(c.id)[key]=value;c.redraw();};group.append(b);}c.controls.append(group);
  }
  function select(c,key,label,options){
    const wrapper=document.createElement('label');wrapper.textContent=label;const el=document.createElement('select');el.dataset.control=key;el.setAttribute('aria-label',label);options.forEach(([v,t])=>el.add(new Option(t,v)));el.value=states.get(c.id)[key];el.onchange=()=>{states.get(c.id)[key]=el.value;c.redraw();};wrapper.append(el);c.controls.append(wrapper);
  }
  function setupControls(c){
    const s=states.get(c.id),metric=[['rate','Conversion'],['share','Session share']];
    switch(c.id){
      case 'objective':segments(c,'view',[['baseline','Baseline'],['goal','Goal']]);break;
      case 'audience':segments(c,'view',[['segments','Segments'],['cuisine','Cuisine']]);if(s.view==='cuisine')select(c,'sample','Sessions',[['0','All sample sizes'],['100','100 or more'],['1000','1,000 or more']]);break;
      case 'discovery':segments(c,'view',[['distance','Distance'],['ratings','Reviews'],['price','Price']]);if(s.view==='price')select(c,'metric','Measure',metric);break;
      case 'promotions':segments(c,'view',[['visibility','Visibility'],['types','Offer type'],['membership','Membership']]);break;
      case 'timing':segments(c,'metric',metric);break;
      case 'modeling':select(c,'metric','Measure',[['recall','Recall'],['precision','Precision'],['accuracy','Accuracy']]);break;
      case 'shap':
        select(c,'category','Features',[['all','All types'],['Restaurant','Restaurant'],['Promotion','Promotion'],['Customer','Customer'],['Cuisine','Cuisine']]);
        select(c,'sort','Sort',[['impact','Strongest first'],['name','Name']]);
        {const label=document.createElement('label');label.className='check-control';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=s.includeLead;checkbox.dataset.control='includeLead';checkbox.onchange=()=>{s.includeLead=checkbox.checked;c.redraw();};label.append(checkbox,document.createTextNode('Include co-branding'));c.controls.append(label);}break;
      case 'retention':segments(c,'view',[['curve','Retention'],['matrix','All cohorts'],['acquisition','New users']]);if(s.view==='curve')select(c,'cohort','Cohort',[...new Set(D.cohorts.map(d=>d.month))].map(m=>[m,Charts.month(m)]));break;
    }
  }
  function ensureMobile(step){const id=step.dataset.viz;if(contexts.has(id))return;let stage=step.querySelector('.visual-stage');if(!stage){stage=template.cloneNode(true);step.querySelector('.mobile-viz-slot').append(stage);}contexts.set(id,createContext(stage,id));}
  function activate(id){if(id===active)return;active=id;steps.forEach(e=>e.classList.toggle('is-active',e.dataset.viz===id));document.querySelectorAll('#contents [data-section]').forEach(a=>{if(a.dataset.section===id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});if(mobile())ensureMobile(steps.find(e=>e.dataset.viz===id));else createContext(desktop,id);}
  function sync(){framePending=false;const pivot=innerHeight*.42;let current=steps[0];for(const step of steps)if(step.getBoundingClientRect().top<=pivot)current=step;activate(current.dataset.viz);const start=steps[0].getBoundingClientRect().top+scrollY,end=document.querySelector('#method').offsetTop-innerHeight;const pct=Math.max(0,Math.min(100,(scrollY-start)/Math.max(1,end-start)*100));document.querySelector('.reading-progress span').style.width=pct+'%';document.querySelector('.reading-progress').setAttribute('aria-valuenow',Math.round(pct));}
  addEventListener('scroll',()=>{if(!framePending){framePending=true;requestAnimationFrame(sync);}},{passive:true});
  const observer=new IntersectionObserver(entries=>{if(mobile())entries.filter(e=>e.isIntersecting).forEach(e=>ensureMobile(e.target));},{rootMargin:'300px'});steps.forEach(e=>observer.observe(e));
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>{contexts.clear();active='';sync();if(mobile())steps.filter(e=>e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight+300).forEach(ensureMobile);},150);});
  const menu=document.getElementById('contents'),toggle=document.getElementById('contents-toggle');
  const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();toggle.focus();}});document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!toggle.contains(e.target))close();});
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.getElementById(a.hash.slice(1));if(!target)return;e.preventDefault();close();history.pushState(null,'',a.hash);target.scrollIntoView({behavior:reduced?'instant':'smooth'});target.tabIndex=-1;target.focus({preventScroll:true});}));
  // Keep existing section links useful after the story is reorganized.
  const aliases={segments:'audience',cuisines:'audience',distance:'discovery',ratings:'discovery',price:'discovery',membership:'promotions',drivers:'shap',recommendations:'conclusion',strategy:'conclusion',acquisition:'retention',sources:'method'};
  const key=location.hash.replace('#section-','');if(aliases[key])history.replaceState(null,'','#section-'+aliases[key]);
  const target=document.getElementById(location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant'}));sync();
})();
