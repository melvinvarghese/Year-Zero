import { station, actionPhase } from './world-geometry.mjs';
import { getActionLabel } from './simulation.mjs';
const TAU = Math.PI * 2;
const mix=(a,b,t)=>a+(b-a)*t;
const px=p=>({x:p.x*10,y:p.y*7.6});

// This is a renderer only: it never advances time, rolls the world's PRNG,
// chooses an action, moves the survivor, or edits resources.
export function createLivingScene(canvas, readWorld) {
  const ctx=canvas.getContext('2d');
  let follow=true, lastDescription='';
  const cameraButton=document.getElementById('cameraButton');
  cameraButton.addEventListener('click',()=>{
    follow=!follow;
    cameraButton.textContent=follow?'View whole coast':'Follow survivor';
    cameraButton.setAttribute('aria-pressed',String(follow));
  });
  function ellipse(x,y,rx,ry,color) {ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  function line(points,color,width=2,dash=[]) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function text(str,x,y,size=10,color='#d8dfbd',align='center'){ctx.font=`${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(str,x,y);}
  function palm(x,y,size=1,seed=0,t=0) {
    ellipse(x+7,y+3,15*size,5*size,'#102e2266');
    const bend=Math.sin(t*.03+seed)*2;
    line([{x,y},{x:x+3,y:y-23*size}], '#9e8961',4*size);
    for(let j=0;j<6;j++) {
      const a=j*TAU/6+seed;
      const bx=x+3+Math.cos(a)*24*size+bend, by=y-23*size+Math.sin(a)*12*size;
      line([{x:x+3,y:y-23*size},{x:mix(x+3,bx,.6),y:by-4},{x:bx,y:by+5}],j%2?'#648452':'#426943',4*size);
    }
  }
  function house(x,y,integrity=60,clinic=false) {
    ellipse(x+10,y+12,36,12,'#09281f77');
    rect(x-23,y-8,46,29,clinic?'#b4b8a0':'#b0a27a');
    rect(x-26,y-29,52,30,clinic?'#7c877d':'#785143');
    for(let i=0;i<7;i++) line([{x:x-24+i*8,y:y-28},{x:x-24+i*8,y}],clinic?'#94a08f':'#a57552',1);
    rect(x-6,y+3,12,18,'#192f29');rect(x-18,y+3,7,7,'#28463b');rect(x+12,y+3,7,7,'#28463b');
    if(integrity<70) {rect(x+6,y-24,(100-integrity)*.23,10,'#283b2d');line([{x:x-20,y:y-20},{x:x-6,y:y-5}],'#423e2c',3);}
    if(clinic){rect(x-2,y-22,4,15,'#d0b3a1');rect(x-8,y-17,16,4,'#d0b3a1');}
  }
  function well(x,y,water){
    ellipse(x,y+4,13,8,'#172f27');ellipse(x,y,13,8,'#a1a48a');ellipse(x,y,9,5,water>0?'#548f8d':'#343c32');
    line([{x:x-12,y},{x:x-12,y:y-18},{x:x+12,y:y-18},{x:x+12,y}],'#a89c77',2);line([{x,y:y-18},{x,y:y+1}],'#d0bd89',1);
  }
  function garden(world,x,y,t) {
    rect(x-22,y-10,44,24,'#573c2c');
    for(let k=0;k<3;k++)line([{x:x-22,y:y-6+k*8},{x:x+22,y:y-6+k*8}],'#8b6140',2);
    if(world.shelter.gardenStage>0)for(let k=0;k<12;k++){
      const xx=x-16+(k%4)*10,yy=y-6+Math.floor(k/4)*8;
      const size=2+world.garden.growth*.04;
      ellipse(xx-size*.5,yy,size,2,'#74a15a');ellipse(xx+size*.5,yy-2,2,size,'#8eaf60');
    }
  }
  function site(world,loc,t) {
    const c=px(loc.coords),home=loc.id==='coastal-homestead';
    if(loc.exploration!=='known'){
      ellipse(c.x,c.y,62,43,'#173329');ellipse(c.x-16,c.y-15,44,32,'#1a3a2b');
      text('?',c.x,c.y,20,'#779079');text('Unexplored',c.x,c.y+20,9,'#82947a');return;
    }
    ellipse(c.x,c.y,69,43,'#88825744');
    if(loc.id==='tidal-jetty'){
      for(let k=0;k<6;k++)rect(c.x-22+k*9,c.y-10,6,28,'#81877a');
    }else if(loc.id==='laterite-quarry'){
      for(let k=0;k<4;k++)rect(c.x-28+k*5,c.y-20+k*8,56-k*10,24,'#9d6c4a');
    }else if(loc.id==='backwater-edge'){
      ellipse(c.x,c.y-10,33,17,'#3b7771');line([{x:c.x-30,y:c.y+4},{x:c.x+30,y:c.y+4}],'#b5ab78',4);
    }else house(c.x-8,c.y-10,home?world.shelter.integrity:35,loc.id==='abandoned-clinic');
    const water=px(station(loc.id,'collectWater'));
    if(loc.freshwater)well(water.x,water.y,loc.resources.water);
    const food=px(station(loc.id,'gatherFood'));
    for(let j=0;j<3;j++){
      ellipse(food.x-12+j*10,food.y-3+(j%2)*6,12,8,loc.resources.food>0?'#6c8746':'#415f3e');
      if(loc.resources.food>0)ellipse(food.x-9+j*10,food.y-4+(j%2)*6,2,2,'#d5af66');
    }
    const wood=px(station(loc.id,'gatherWood'));
    for(let j=0;j<Math.min(4,loc.resources.wood);j++)line([{x:wood.x-10,y:wood.y+j*3},{x:wood.x+10,y:wood.y-3+j*3}],'#a28b61',3);
    if(home){
      const g=px(station(loc.id,'tendGarden'));garden(world,g.x,g.y,t);
      if(world.structures.collector){rect(c.x+43,c.y+16,16,15,'#527e7b');line([{x:c.x+36,y:c.y+12},{x:c.x+65,y:c.y+12}],'#bac3a0',3);}
      if(world.structures.workshop){rect(c.x+10,c.y-12,20,8,'#9b724f');rect(c.x+12,c.y-4,3,10,'#705638');rect(c.x+26,c.y-4,3,10,'#705638');}
      if(world.structures.archive){rect(c.x+9,c.y+9,13,10,'#b7955e');rect(c.x+10,c.y+10,11,2,'#e1d2a3');}
      if(world.storage.food+world.storage.water>0){rect(c.x-23,c.y+8,9,9,'#c09c61');rect(c.x-25,c.y+16,9,5,'#817657');}
      if(world.shelter.fireMinutes>0){ellipse(c.x-29,c.y+23,9,5,'#be6e3a');ellipse(c.x-29,c.y+20+Math.sin(t)*2,4,7,'#edba66');}
    }
    const short={'coastal-homestead':'THE HOMESTEAD','old-village-road':'VILLAGE ROAD','backwater-edge':'BACKWATER','abandoned-clinic':'OLD CLINIC','tidal-jetty':'STONE JETTY','laterite-quarry':'LATERITE QUARRY'};
    text(short[loc.id]||loc.name,c.x,c.y+49,10,'#e2d9b1');
    if(loc.id===world.locationId)text(`${loc.resources.food} food · ${loc.resources.water} water · ${loc.resources.wood} wood`,c.x,c.y+62,8,'#acb99b');
  }
  function survivor(world,t) {
    const a=world.activeAction,phase=actionPhase(world),p=px(world.position);
    const elapsed=a?a.totalMinutes-a.remainingMinutes:0;
    const walk=phase==='walking', rest=a?.type==='rest'&& !walk;
    const swing=Math.sin(elapsed*1.5);
    const working=phase==='working'&& !rest;
    ctx.save();ctx.translate(p.x,p.y);
    ellipse(0,4,10,4,'#071e1c99');
    if(!world.survivor.alive){rect(-9,-2,18,5,'#b6b490');ellipse(10,-1,3,3,'#c59e73');ctx.restore();return;}
    // A cream shirt, dark lungi, visible limbs and an ochre travelling pack.
    if(rest){rect(-11,-3,17,6,'#d3ccb0');ellipse(9,-3,4,4,'#c69b70');line([{x:-12,y:0},{x:-18,y:0}],'#526a63',4);}
    else{
      line([{x:-3,y:-2},{x:-4+(walk?swing*4:0),y:8}],'#414e47',4);
      line([{x:3,y:-2},{x:4-(walk?swing*4:0),y:8}],'#414e47',4);
      rect(-5,-15,10,14,'#d9d2b2');rect(-7,-12,4,9,'#b0844f');
      ellipse(0,-20,5,5,'#c69b70');ellipse(-1,-23,5,3,'#292d25');
      line([{x:-5,y:-12},{x:-8,y:-3+(walk?-swing*4:0)}],'#c69b70',3);
      const handY=working?-12+Math.sin(elapsed*2)*4:-3+(walk?swing*4:0);
      line([{x:5,y:-12},{x:10,y:handY}],'#c69b70',3);
      if(working){
        const type=a.type;
        if(type==='collectWater'||type==='drink'||type==='waterGarden'){rect(9,handY,7,7,'#6caaa5');line([{x:9,y:handY},{x:12,y:handY-4},{x:16,y:handY}],'#becab5',1);}
        else if(type==='makeFire'){ellipse(12,handY+3,4,6,'#e5b05e');}
        else if(type==='scavenge'||type==='storeSupplies'||type==='resupply'){rect(8,handY+1,10,8,'#b49760');line([{x:8,y:handY+4},{x:18,y:handY+4}],'#776e45',1);}
        else if(type==='eat')ellipse(12,handY,5,2,'#d1ae66');
        else if(type==='gatherFood'||type==='harvest'||type==='tendGarden'){line([{x:10,y:handY},{x:15,y:6}],'#9e8b5c',2);ellipse(15,5,4,2,'#9ca18a');}
        else if(type==='treatInjury'){rect(6,0,8,3,'#e1ddc5');}
        else {line([{x:10,y:handY},{x:16,y:handY-9}],'#b39260',2);rect(12,handY-12,9,4,'#a9b7a1');}
      }
    }
    ctx.strokeStyle='#e4c886';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,3,13,7,0,0,TAU);ctx.stroke();
    if(a){ctx.strokeStyle='#f0dc99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-10,22,-Math.PI/2,-Math.PI/2+TAU*elapsed/a.totalMinutes);ctx.stroke();}
    text('THE SURVIVOR',0,-40,8,'#f7e9b6');
    ctx.restore();
  }
  function draw() {
    const world=readWorld();
    const box=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(w/1000,0,0,h/760,0,0);
    rect(0,0,1000,760,'#233f30');
    const t=(world.day*1440+world.minute);
    ctx.save();
    const zoom=follow?(box.width < 600 ? 3 : 1.85):1;
    const p=px(world.position);
    const cx=follow?Math.max(1000/(2*zoom),Math.min(1000-1000/(2*zoom),p.x)):500;
    const cy=follow?Math.max(760/(2*zoom),Math.min(760-760/(2*zoom),p.y)):380;
    ctx.translate(500,380);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
    // Arabian sea and pale, winding sand. Land is a continuous regional plane.
    rect(0,0,1000,760,'#36513a');
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(174,0);ctx.bezierCurveTo(110,230,210,480,247,760);ctx.lineTo(0,760);ctx.closePath();ctx.fillStyle='#ab9c6c';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(146,0);ctx.bezierCurveTo(80,230,180,480,217,760);ctx.lineTo(0,760);ctx.closePath();ctx.fillStyle='#315e5b';ctx.fill();
    for(let j=0;j<22;j++){const y=j*38+Math.sin(t*.1+j)*3;line([{x:5,y},{x:100+(y/760)*55,y:y+5}],'#86aaa34b',2);}
    text('ARABIAN SEA',80,400,12,'#b9cbb4');
    // Seeded decoration, no state or gameplay randomness.
    for(let i=0;i<155;i++){
      const x=190+(i*137%800),y=15+(i*97%730);
      if(world.locations.some(l=>Math.hypot(x-l.coords.x*10,y-l.coords.y*7.6)<82))continue;
      if(i%3===0)palm(x,y,.7+(i%4)*.1,i,t);
      else ellipse(x,y,10+i%7,5+i%5,i%2?'#466b40':'#2c4834');
    }
    const seen=new Set();
    for(const l of world.locations)for(const id of l.neighbors){
      const key=[l.id,id].sort().join('|');if(seen.has(key))continue;seen.add(key);
      const other=world.locations.find(n=>n.id===id);
      if(l.exploration==='known'||other.exploration==='known'){
        const known=l.exploration==='known'&&other.exploration==='known';
        line([px(l.coords),px(other.coords)],known?'#a28d6180':'#7b8c5d66',known?9:4,known?[]:[5,8]);
        if(known)line([px(l.coords),px(other.coords)],'#b3a17655',2,[3,7]);
      }
    }
    for(const l of [...world.locations].sort((a,b)=>a.coords.y-b.coords.y))site(world,l,t);
    const a=world.activeAction;
    if(a&&actionPhase(world)==='walking')line([px(world.position),px(a.to)],'#e6cf9588',1,[3,5]);
    survivor(world,t);
    ctx.restore();
    const night=world.minute<330||world.minute>=1140;
    if(night){rect(0,0,1000,760,'#07152988');text('NIGHT · The paths are quiet',24,35,12,'#bfcab0','left');}
    if(world.weather==='rain'||world.weather==='storm'){
      rect(0,0,1000,760,world.weather==='storm'?'#142f3e55':'#30535722');
      for(let i=0;i<100;i++){
        const x=(i*137+t*12)%1040-20,y=(i*71+t*40)%800-20;
        line([{x,y},{x:x-5,y:y+14}],'#c7ded84f',1);
      }
    }
    if(world.weather==='mist')for(let i=0;i<3;i++)ellipse(200+i*330+Math.sin(t*.02)*40,140+i*210,300,22,'#c2ceb010');
    const phase=actionPhase(world);
    const desc=`${getActionLabel(world)} · ${phase==='walking'?'walking to the work site':phase==='working'?'at work':phase}. ${a?.reason||'He is considering his surroundings.'}`;
    if(desc!==lastDescription){canvas.setAttribute('aria-label',desc);document.getElementById('sceneReason').textContent=desc;lastDescription=desc;}
    canvas.dataset.action=a?.type||'idle';canvas.dataset.phase=phase;
    canvas.dataset.position=`${world.position.x.toFixed(3)},${world.position.y.toFixed(3)}`;
    requestAnimationFrame(draw);
  }
  draw();
}
