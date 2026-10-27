import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, advanceSimMinutes, restoreWorld, evaluateActions, RESOURCE_CAPS, INVENTORY_CAPACITY, inventoryLoad, DAY_MS } from './simulation.mjs';
import {station,positionAt,actionPhase} from './world-geometry.mjs';
const world=()=>createWorld({seed:42,now:1000});
function fixtureAction(w,type,duration=60,target=null) {
  const from={...w.position},to=station(target||w.locationId,target?'arrival':type);
  w.activeAction={type,from,to,originLocationId:w.locationId,targetLocationId:target,totalMinutes:duration,remainingMinutes:duration,walkMinutes:target?duration:10,reason:'Test an actual completion',score:100};
}
function runDays(w,days){for(let d=0;d<days;d++)advanceSimMinutes(w,1440);}

test('work consumes duration, walks to actual well, then transfers finite water',()=>{
 const w=world();fixtureAction(w,'collectWater');const before=w.locations[0].resources.water,stored=w.survivor.inventory.water;
 advanceSimMinutes(w,5);assert.equal(actionPhase(w),'walking');assert.deepEqual(w.position,positionAt(w.activeAction));assert.notDeepEqual(w.position,w.activeAction.to);assert.equal(w.survivor.inventory.water,stored);
 advanceSimMinutes(w,10);assert.equal(actionPhase(w),'working');assert.deepEqual(w.position,station(w.locationId,'collectWater'));assert.equal(w.survivor.inventory.water,stored);
 advanceSimMinutes(w,45);assert.equal(w.survivor.inventory.water,stored+3);assert.equal(w.locations[0].resources.water,before-3);assert.match(w.chronicle.at(-1).title,/Collected/);
});
test('a freshwater label does not generate water in a depleted source',()=>{
 const w=world();w.locations[0].resources.water=0;w.survivor.inventory.water=0;assert.ok(!evaluateActions(w).some(a=>a.type==='collectWater'));
 fixtureAction(w,'collectWater');advanceSimMinutes(w,60);assert.equal(w.survivor.inventory.water,0);assert.match(w.chronicle.at(-1).title,/low/);
});
test('eating consumes a portion and repairs consume timber only at completion',()=>{
 const w=world();w.survivor.needs.hunger=65;fixtureAction(w,'eat');advanceSimMinutes(w,60);assert.equal(w.survivor.inventory.food,2);assert.ok(w.survivor.needs.hunger<35);
 const wood=w.survivor.inventory.wood,roof=w.shelter.integrity;fixtureAction(w,'repairShelter');advanceSimMinutes(w,30);assert.equal(w.shelter.integrity,roof);advanceSimMinutes(w,30);assert.equal(w.survivor.inventory.wood,wood-2);assert.ok(w.shelter.integrity>roof);
});
test('exploration travels continuously and unlocks a real connected location',()=>{
 const w=world();fixtureAction(w,'explore',100,'old-village-road');advanceSimMinutes(w,50);assert.equal(w.locationId,'coastal-homestead');assert.equal(w.locations[1].exploration,'unseen');assert.equal(actionPhase(w),'walking');advanceSimMinutes(w,50);assert.equal(w.locationId,'old-village-road');assert.equal(w.locations[1].exploration,'known');assert.ok(w.discoveries.includes(w.locationId));assert.equal(w.chronicle.at(-1).locationId,w.locationId);
});
test('save reload preserves unfinished movement, memories, reserves, structures and discoveries',()=>{
 const w=world();w.discoveries=['tidal-jetty'];w.milestones=['collector'];w.structures.collector=true;w.storage.food=7;w.survivor.memory.actionFailures={gatherFood:2};fixtureAction(w,'collectWater');advanceSimMinutes(w,4);
 const recovered=restoreWorld(JSON.stringify(w),{now:1000});assert.equal(recovered.warning,'');assert.deepEqual(recovered.world,w);
 const a=structuredClone(w),b=recovered.world;advanceSimMinutes(a,80);advanceSimMinutes(b,80);assert.deepEqual(a,b);
});
test('offline catch-up equals the same elapsed active simulation, without duplicate events',()=>{
 const w=world();advanceSimMinutes(w,40);const expected=structuredClone(w);advanceSimMinutes(expected,1440);
 const restored=restoreWorld(JSON.stringify(w),{now:1000+DAY_MS}).world;expected.lastRealMs=1000+DAY_MS;assert.deepEqual(restored,expected);
 const again=restoreWorld(JSON.stringify(restored),{now:1000+DAY_MS}).world;assert.deepEqual(again,restored);
});
test('paused reload does not catch up; corrupt and future saves warn',()=>{
 const w=world();w.paused=true;const r=restoreWorld(JSON.stringify(w),{now:10000000}).world;assert.equal(r.minute,w.minute);assert.deepEqual(r.position,w.position);
 assert.ok(restoreWorld('{oops').warning);assert.ok(restoreWorld('{}').warning);w.schemaVersion=999;assert.ok(restoreWorld(JSON.stringify(w)).warning);
});
test('storm discourages exploration and rain replenishes finite water and collector storage',()=>{
 const w=world();w.weather='storm';assert.ok(!evaluateActions(w).some(a=>a.type==='explore'));assert.ok(evaluateActions(w).find(a=>a.type==='collectWater').score<0);
 let rain=false;w.structures.collector=true;
 for(let d=0;d<20;d++){w.minute=1439;w.storage.water=0;w.locations[0].resources.water=0;fixtureAction(w,'rest',180);advanceSimMinutes(w,1);if(['rain','storm'].includes(w.weather)){rain=true;assert.equal(w.storage.water,4);assert.ok(w.locations[0].resources.water>0);break;}}
 assert.ok(rain);
});
test('construction spends its recipe and cannot run without prerequisites',()=>{
 const w=world();assert.ok(!evaluateActions(w).some(a=>a.type==='buildCollector'));w.survivor.tools=true;w.survivor.inventory.scrap=2;fixtureAction(w,'buildCollector');advanceSimMinutes(w,60);assert.ok(w.structures.collector);assert.equal(w.survivor.inventory.wood,0);assert.equal(w.survivor.inventory.scrap,0);
});
test('a planted crop grows over days and harvesting converts it into carried food',()=>{
 const w=world();w.shelter.gardenStage=1;w.garden.growth=99;w.garden.moisture=80;fixtureAction(w,'rest',100);advanceSimMinutes(w,60);assert.equal(w.garden.growth,100);
 const before=w.survivor.inventory.food;fixtureAction(w,'harvest');advanceSimMinutes(w,60);assert.equal(w.survivor.inventory.food,before+6);assert.equal(w.garden.growth,0);
});
test('urgent needs interrupt long work, preserve materials, and choose survival',()=>{
 const w=world();w.survivor.needs.thirst=83;fixtureAction(w,'repairShelter',150);const wood=w.survivor.inventory.wood;advanceSimMinutes(w,1);assert.equal(w.activeAction.type,'drink');assert.equal(w.survivor.inventory.wood,wood);assert.ok(w.chronicle.some(e=>e.title==='Work interrupted'));
});
test('60-day seeded runs stay bounded, discover sites, build and keep doing useful work',()=>{
 const histories=[];
 for(const seed of [1,42,77,99,31415]){
  const w=createWorld({seed,now:1000});runDays(w,60);assert.ok(w.survivor.alive);assert.equal(w.discoveries.length,5);assert.ok(w.structures.collector&&w.structures.workshop&&w.structures.archive);assert.ok(w.actionCount>150);assert.ok(w.chronicle.some(e=>e.title==='Harvested the wellside garden'));assert.ok(inventoryLoad(w)<=INVENTORY_CAPACITY);
  for(const [k,v] of Object.entries(w.survivor.inventory))assert.ok(v>=0&&v<=RESOURCE_CAPS[k],k);
  for(const loc of w.locations)for(const v of Object.values(loc.resources))assert.ok(v>=0&&Number.isFinite(v));
  histories.push(JSON.stringify(w.chronicle));
 }
 assert.ok(new Set(histories).size>1);
});

test('workshop and archived routes improve real action durations',()=>{
 const configure=w=>{w.survivor.tools=true;Object.assign(w.survivor.inventory,{food:6,water:6,wood:9,scrap:5,materials:5});w.survivor.needs.hunger=0;w.survivor.needs.thirst=0;w.shelter.integrity=10;};
 const basic=world(),workshop=world();configure(basic);configure(workshop);workshop.structures.workshop=true;
 advanceSimMinutes(basic,1);advanceSimMinutes(workshop,1);assert.equal(basic.activeAction.type,'repairShelter');assert.equal(workshop.activeAction.type,'repairShelter');assert.ok(workshop.activeAction.totalMinutes<basic.activeAction.totalMinutes);
 for(const w of [basic,workshop]){w.activeAction=null;w.shelter.integrity=100;w.structures.collector=true;w.structures.workshop=true;w.survivor.inventory.seeds=0;w.storage.food=12;w.storage.water=12;}
 workshop.structures.archive=true;advanceSimMinutes(basic,1);advanceSimMinutes(workshop,1);assert.equal(basic.activeAction.type,'explore');assert.equal(workshop.activeAction.type,'explore');assert.ok(workshop.activeAction.totalMinutes<basic.activeAction.totalMinutes);
});

test('fractional late-night time survives reload and midnight events have valid dates',()=>{
 const w=world();w.minute=1439.8;w.paused=true;fixtureAction(w,'rest',.2);w.activeAction.walkMinutes=0;
 const r=restoreWorld(JSON.stringify(w),{now:1000}).world;assert.equal(r.minute,w.minute);advanceSimMinutes(r,.2);assert.equal(r.day,2);assert.ok(r.chronicle.every(e=>e.minute>=0&&e.minute<1440));
});
