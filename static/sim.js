/* Position-based V2V traffic simulation. Speeds drive positions; cars in the same lane
   are collision-checked every frame. Educational demo, not a real ADAS controller. */
const $=id=>document.getElementById(id);
const ROAD_H=620,CAR_H=142,EGO_Y=430,PX=5,DT=.05;
const laneX={1:16.666,2:50,3:83.333};
const names={merge:'Cooperative lane merge',overtake:'Safe overtaking',redlight:'Red-light stop and restart',brake:'Emergency braking / obstacle'};
let scenario='merge',timer=null,paused=false,phase='ready',t=0,ego,cars,signal='green',stopPos=46;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(x,target,a)=>x<target?Math.min(target,x+a*DT):Math.max(target,x-a*DT);
function car(id,lane,pos,speed,el){return {id,lane,fromLane:lane,toLane:lane,blend:0,pos,speed,el};}
function init(){
 ego={id:'YOU',lane:2,pos:0,speed:42};
 cars=[car('AV-02',3,65,36,'av02'),car('AV-03',1,105,38,'av03'),car('AV-04',3,-48,32,'av04')];
 stopPos=46;
 if(scenario==='overtake'){cars[0]=car('AV-02',1,-38,50,'av02');cars[1]=car('AV-03',3,88,36,'av03');cars[2]=car('AV-04',3,-85,31,'av04');}
 if(scenario==='brake'){cars[0]=car('AV-02',2,58,0,'av02');cars[1]=car('AV-03',1,90,38,'av03');cars[2]=car('AV-04',3,-65,32,'av04');}
}
const get=id=>cars.find(v=>v.id===id);
function log(from,msg){const a=document.createElement('article'),b=document.createElement('b'),p=document.createElement('p');b.textContent=from+' → YOU';p.textContent=new Date().toLocaleTimeString()+' · '+msg;a.append(b,p);$('log').prepend(a);while($('log').children.length>18)$('log').lastElementChild.remove();}
function setSignal(s){signal=s;$('signal').style.display=scenario==='redlight'?'flex':'none';$('stopLine').style.display=scenario==='redlight'?'block':'none';$('signal').className='signal '+s;$('signalText').textContent=s.toUpperCase();}
function laneValue(v){return v.fromLane+(v.toLane-v.fromLane)*v.blend;}
function screenY(pos){return EGO_Y-(pos-ego.pos)*PX;}
function render(){
 $('you').style.left=`calc(${laneX[ego.lane]}% - 46px)`;$('you').style.top=(EGO_Y-CAR_H/2)+'px';
 $('youSpeed').textContent=ego.speed.toFixed(1)+' km/h';$('speedStat').textContent=ego.speed.toFixed(1)+' km/h';$('laneStat').textContent=ego.lane;
 for(const v of cars){const el=$(v.el),y=screenY(v.pos)-CAR_H/2;const lx=laneX[v.fromLane]+(laneX[v.toLane]-laneX[v.fromLane])*v.blend;el.style.left=`calc(${lx}% - 46px)`;el.style.top=y+'px';el.style.visibility=(y>-CAR_H&&y<ROAD_H)?'visible':'hidden';$(v.el+'Speed').textContent=v.speed.toFixed(1)+' km/h';$('list'+v.id.slice(-2)).textContent=`Lane ${Math.round(laneValue(v))} · ${v.speed.toFixed(1)} km/h`;}
 const ahead=cars.filter(v=>Math.round(laneValue(v))===ego.lane&&v.pos>ego.pos).sort((a,b)=>a.pos-b.pos)[0];
 $('gapStat').textContent=ahead?Math.max(0,ahead.pos-ego.pos-14).toFixed(1)+' m':'—';
 $('targetStat').textContent=['approach','merge','follow','braking','wait','stop'].includes(phase)?(scenario==='redlight'?'SIGNAL':'AV-02'):'NONE';
 $('brakeStat').textContent=['braking','wait','stop'].includes(phase)?'ON':'OFF';
 $('mode').textContent=phase==='ready'?'READY':phase==='stop'?'STOPPED':['braking','wait'].includes(phase)?'BRAKING':phase==='complete'?'COMPLETE':'V2V ACTIVE';
 const messages={ready:'Ready — press Start scenario',approach:'Monitoring traffic and exchanging V2V data',merge:'AV-02 changing lane after safe-gap check',follow:'Coordinating speed and maintaining following gap',pass:'AV-02 passing in the adjacent lane',clear:'Overtake complete — vehicle remains in passing lane',stop:'Stopped before the red signal',go:'Green signal — accelerating smoothly',braking:'Obstacle detected — controlled braking',wait:'Stopped behind obstacle — waiting for clearance',complete:'Scenario complete — reset to replay'};
 $('decision').textContent=messages[phase]||'Monitoring connected traffic';$('decision').className='decision'+(['braking','wait','stop'].includes(phase)?' warn':'');
 $('phaseText').textContent=names[scenario]+' · '+phase.toUpperCase();$('mergeArrow').style.opacity=phase==='merge'?1:0;
 if(scenario==='redlight'){$('stopLine').style.top=(EGO_Y-(stopPos-ego.pos)*PX-2)+'px';}
}
function startLaneChange(v,to){v.fromLane=Math.round(laneValue(v));v.toLane=to;v.blend=0;}
function tickLaneChange(v){if(v.blend<1){v.blend=Math.min(1,v.blend+DT/2.2);if(v.blend>=1){v.fromLane=v.toLane;v.blend=0;v.lane=v.toLane;}}}
function move(v){v.pos+=v.speed/3.6*DT;}
function enforceSpacing(){
 // During a lane change, reserve both source and destination lanes.
 for(let lane=1;lane<=3;lane++){
  const group=[ego,...cars].filter(v=>v===ego?v.lane===lane:(v.blend>0?(v.fromLane===lane||v.toLane===lane):v.lane===lane)).sort((a,b)=>a.pos-b.pos);
  for(let i=1;i<group.length;i++){
   const rear=group[i-1],front=group[i],gap=front.pos-rear.pos;
   if(gap<23){rear.pos=front.pos-23;rear.speed=Math.min(rear.speed,front.speed);}
  }
 }
}
function finish(){phase='complete';$('start').disabled=false;$('pause').disabled=true;if(timer)clearInterval(timer);timer=null;log('SYSTEM','Scenario completed. Reset to replay.');render();}
function reset(){if(timer)clearInterval(timer);timer=null;paused=false;t=0;phase='ready';init();$('start').disabled=false;$('pause').disabled=true;$('pause').textContent='Ⅱ Pause';$('log').innerHTML='';setSignal('green');log('SYSTEM',names[scenario]+' ready. Press Start.');render();}
function tick(){
 if(paused)return;t+=DT;const a=get('AV-02'),b=get('AV-03'),c=get('AV-04');
 // Background traffic speed changes gradually and positions always follow their speeds.
 b.speed=approach(b.speed,36+3*Math.sin(t*.35),.8);c.speed=approach(c.speed,31+2.5*Math.sin(t*.28+1),.7);
 if(scenario==='merge'){
  if(phase==='ready'){phase='approach';a.lane=3;a.pos=ego.pos+65;a.speed=36;log('AV-02','Merge request received from Lane 3.');}
  if(phase==='approach'){a.speed=approach(a.speed,39,1.1);ego.speed=approach(ego.speed,37,1.2);if(t>3){const clear=cars.every(v=>v===a||Math.abs(v.pos-a.pos)>26||Math.round(laneValue(v))!==2);if(clear){startLaneChange(a,2);phase='merge';log('YOU','Safe gap confirmed; AV-02 begins gradual lane change.');}}}
  else if(phase==='merge'){tickLaneChange(a);a.speed=approach(a.speed,39,1);ego.speed=approach(ego.speed,35,1);if(a.blend===0&&a.lane===2){phase='follow';t=0;log('AV-02','Lane change complete. Speed coordination active.');}}
  else if(phase==='follow'){a.speed=approach(a.speed,46,1.5);ego.speed=approach(ego.speed,Math.min(42,Math.max(32,a.speed-3)),1.2);if(a.pos-ego.pos>90)finish();}
 }else if(scenario==='overtake'){
  a.lane=1;a.speed=approach(a.speed,54,1.4);ego.speed=approach(ego.speed,42,.8);
  if(phase==='ready'){phase='approach';log('AV-02','Approaching from behind in adjacent Lane 1.');}
  if(phase==='approach'&&a.pos>ego.pos+12){phase='pass';log('AV-02','Passing your vehicle in Lane 1; no lane cut-in.');}
  if(phase==='pass'&&a.pos>ego.pos+48){phase='clear';log('SYSTEM','Safe overtake completed; AV-02 remains in Lane 1.');}
  if(phase==='clear'){a.speed=approach(a.speed,49,1);if(t>13)finish();}
 }else if(scenario==='redlight'){
  if(phase==='ready'){phase='approach';stopPos=ego.pos+46;setSignal('yellow');log('SIGNAL','Yellow signal. Vehicle begins controlled deceleration.');}
  if(phase==='approach'){
   const remaining=stopPos-ego.pos;
   const target=remaining>0?Math.min(42,Math.sqrt(2*2.6*remaining)*3.6):0;
   ego.speed=approach(ego.speed,target,7.5);
   if(remaining<=1.2|| (ego.speed<1&&remaining<7)){ego.pos=stopPos-1.2;ego.speed=0;phase='stop';t=0;setSignal('red');log('YOU','Stopped before the stop line.');}
  }else if(phase==='stop'){ego.speed=0;if(t>4){phase='go';t=0;setSignal('green');log('SIGNAL','Green signal received; junction clear.');}}
  else if(phase==='go'){ego.speed=approach(ego.speed,36,2.0);if(ego.speed>35.5)finish();}
 }else if(scenario==='brake'){
  if(phase==='ready'){phase='braking';log('AV-02','Stationary obstacle vehicle detected ahead in Lane 2. Warning sent.');}
  if(phase==='braking'){
   const gap=a.pos-ego.pos-14,desired=gap>24?Math.sqrt(2*4.5*(gap-22))*3.6:0;
   ego.speed=approach(ego.speed,Math.min(42,desired),10);
   if(gap<=24||ego.speed<.5){ego.pos=a.pos-24;ego.speed=0;phase='wait';t=0;log('YOU','Stopped with 24 m clearance behind obstacle.');}
  }else if(phase==='wait'){ego.speed=0;if(t>4){phase='clear';t=0;a.speed=22;log('AV-02','Obstacle vehicle moves away; lane clearance confirmed.');}}
  else if(phase==='clear'){a.speed=approach(a.speed,34,1);ego.speed=approach(ego.speed,38,1.8);if(ego.speed>37.5)finish();}
 }
 // Advance every vehicle from its own speed, exactly once per frame.
 if(ego.speed>0)move(ego);
 for(const v of cars){if(v===a&&scenario==='brake'&&phase==='wait')continue;move(v);}
 // Enforce collision-free same-lane spacing after integration.
 enforceSpacing();render();
}
$('scenarioSelect').addEventListener('change',e=>{scenario=e.target.value;reset();});
$('start').onclick=()=>{if(timer)return;$('start').disabled=true;$('pause').disabled=false;t=0;log('SYSTEM',names[scenario]+' started.');timer=setInterval(tick,DT*1000);};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ Resume':'Ⅱ Pause';log('SYSTEM',paused?'Simulation paused.':'Simulation resumed.');};
$('reset').onclick=reset;reset();
