import test from 'node:test';
import assert from 'node:assert/strict';

let sim;
try {
  sim = await import('./simulation.mjs');
} catch {
  sim = {};
}

function requireAPI(name) {
  assert.equal(typeof sim[name], 'function', `${name} must be implemented`);
}

function wellProvisioned(world) {
  world.survivor.needs.health = 92;
  world.survivor.needs.hunger = 10;
  world.survivor.needs.thirst = 10;
  world.survivor.needs.energy = 90;
  world.survivor.inventory.food = 4;
  world.survivor.inventory.water = 4;
  world.survivor.inventory.wood = 8;
  world.survivor.inventory.scrap = 2;
  world.shelter.integrity = 95;
  return world;
}

test('one real-world quarter hour advances exactly one simulated day', () => {
  requireAPI('createWorld');
  requireAPI('advanceElapsed');
  const world = sim.createWorld({ now: 0, seed: 11 });

  sim.advanceElapsed(world, 15 * 60 * 1000);

  assert.equal(world.day, 2);
  assert.equal(world.minute, 375);
});

test('critical thirst makes the survivor drink before lower-priority work', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  const world = sim.createWorld({ now: 0, seed: 12 });
  world.survivor.needs.thirst = 86;
  world.survivor.inventory.water = 1;

  assert.equal(sim.chooseAction(world), 'drink');
});

test('water collection takes time and consumes a real local source', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  requireAPI('advanceMinutes');
  const world = sim.createWorld({ now: 0, seed: 13 });
  world.survivor.needs.thirst = 88;
  world.survivor.inventory.water = 0;
  const sourceBefore = world.locations.find((location) => location.id === world.locationId).resources.water;

  assert.equal(sim.chooseAction(world), 'collectWater');
  sim.advanceMinutes(world, 44);
  assert.equal(world.survivor.inventory.water, 0);
  assert.equal(world.activeAction.remainingMinutes, 1);
  sim.advanceMinutes(world, 1);

  assert.equal(world.minute, 420);
  assert.equal(world.survivor.inventory.water, 1);
  assert.equal(world.locations.find((location) => location.id === world.locationId).resources.water, sourceBefore - 1);
  assert.equal(world.chronicle.at(-1).category, 'survival');
});

test('exploration reveals a connected location and records its discovery', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  requireAPI('advanceMinutes');
  const world = wellProvisioned(sim.createWorld({ now: 0, seed: 14 }));
  world.priority = 'explore';

  assert.equal(sim.chooseAction(world), 'explore');
  sim.advanceMinutes(world, 180);

  const road = world.locations.find((location) => location.id === 'old-village-road');
  assert.equal(road.exploration, 'known');
  assert.equal(world.locationId, 'old-village-road');
  assert.equal(world.discoveries.includes('old-village-road'), true);
  assert.equal(world.chronicle.some((event) => event.category === 'discovery' && event.locationId === 'old-village-road'), true);

  world.survivor.inventory.food = 0;
  world.survivor.needs.hunger = 80;
  const foodBefore = road.resources.food;
  assert.equal(sim.chooseAction(world), 'gatherFood');
  sim.advanceMinutes(world, 55);
  assert.equal(world.survivor.inventory.food, 1);
  assert.equal(road.resources.food, foodBefore - 1);
});

test('monsoon rain damages a weak shelter and raises exposure during outdoor work', () => {
  requireAPI('createWorld');
  requireAPI('advanceMinutes');
  const world = wellProvisioned(sim.createWorld({ now: 0, seed: 15 }));
  world.weather = 'rain';
  world.shelter.integrity = 58;
  world.priority = 'explore';
  world.survivor.needs.exposure = 0;
  world.activeAction = { type: 'explore', remainingMinutes: 180, totalMinutes: 180, targetLocationId: 'old-village-road' };

  sim.advanceMinutes(world, 60);

  assert.ok(world.shelter.integrity < 58);
  assert.ok(world.survivor.needs.exposure > 0);
});

test('offline catch-up is capped at seven simulated days', () => {
  requireAPI('createWorld');
  requireAPI('advanceElapsed');
  const world = sim.createWorld({ now: 0, seed: 16 });

  sim.advanceElapsed(world, 30 * 24 * 60 * 60 * 1000);

  assert.equal(world.day, 8);
  assert.equal(world.minute, 375);
});

test('a paused world ignores elapsed real time', () => {
  requireAPI('createWorld');
  requireAPI('advanceElapsed');
  requireAPI('pauseWorld');
  const world = sim.createWorld({ now: 1000, seed: 17 });
  sim.pauseWorld(world, true, 1000);
  const before = { day: world.day, minute: world.minute, hunger: world.survivor.needs.hunger };

  sim.advanceElapsed(world, 3 * 60 * 60 * 1000);

  assert.deepEqual({ day: world.day, minute: world.minute, hunger: world.survivor.needs.hunger }, before);
});

test('v4 browser saves migrate their survivor, explored region, and chronicle', () => {
  requireAPI('restoreWorld');
  const restored = sim.restoreWorld({
    day: 4,
    minute: 510,
    lastReal: 1000,
    paused: true,
    priority: 'water',
    health: 67,
    hunger: 32,
    thirst: 48,
    energy: 54,
    food: 2,
    water: 1,
    wood: 3,
    materials: 2,
    shelter: 1,
    fire: false,
    tools: true,
    exploredVillage: true,
    exploredBackwater: false,
    activity: 'Repairing the house',
    events: [{ time: '08:00', title: 'Patched the roof', text: 'Palm leaves covered a gap.', icon: '⚒' }]
  }, { now: 1000 });

  assert.equal(restored.migrated, true);
  assert.equal(restored.world.day, 4);
  assert.equal(restored.world.survivor.needs.health, 67);
  assert.equal(restored.world.survivor.inventory.water, 1);
  assert.equal(restored.world.survivor.inventory.materials, 2);
  assert.equal(restored.world.survivor.inventory.scrap, 0);
  assert.equal(restored.world.locations.find((location) => location.id === 'old-village-road').exploration, 'known');
  assert.equal(restored.world.chronicle.some((event) => event.title === 'Patched the roof'), true);
});

test('malformed saves recover to bounded, playable state instead of propagating invalid values', () => {
  requireAPI('restoreWorld');
  const restored = sim.restoreWorld({ schemaVersion: 1, day: 'not a day', minute: NaN }, { now: 0 });

  assert.ok(restored.warning);
  assert.equal(restored.world.day, 1);
  assert.ok(Number.isFinite(restored.world.minute));
  assert.ok(restored.world.survivor.needs.health >= 0 && restored.world.survivor.needs.health <= 100);
});

test('the same seed and elapsed time produce the same weather and world state', () => {
  requireAPI('createWorld');
  requireAPI('advanceMinutes');
  const first = sim.createWorld({ now: 0, seed: 91 });
  const second = sim.createWorld({ now: 0, seed: 91 });

  sim.advanceMinutes(first, 1440);
  sim.advanceMinutes(second, 1440);

  assert.equal(first.weather, second.weather);
  assert.equal(first.rng, second.rng);
  assert.notEqual(first.rng, 91);
});

test('v2 saves using the old minutes field retain the simulated clock and journal', () => {
  requireAPI('restoreWorld');
  const restored = sim.restoreWorld({
    day: 3,
    minutes: 900,
    lastSeen: 500,
    paused: true,
    health: 71,
    hunger: 33,
    thirst: 44,
    energy: 62,
    food: 1,
    water: 2,
    wood: 2,
    journal: [{ time: '14:00', title: 'Collected water', detail: 'The well still holds.', icon: '◉' }]
  }, { now: 500 });

  assert.equal(restored.migrated, true);
  assert.equal(restored.world.day, 3);
  assert.equal(restored.world.minute, 900);
  assert.equal(restored.world.survivor.needs.health, 71);
  assert.equal(restored.world.chronicle.some((event) => event.title === 'Collected water'), true);
});

test('known freshwater beyond the homestead prompts travel, then becomes usable', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  requireAPI('advanceMinutes');
  const world = wellProvisioned(sim.createWorld({ now: 0, seed: 92 }));
  const home = world.locations.find((location) => location.id === 'coastal-homestead');
  const road = world.locations.find((location) => location.id === 'old-village-road');
  const backwater = world.locations.find((location) => location.id === 'backwater-edge');
  road.exploration = 'known';
  backwater.exploration = 'known';
  backwater.freshwater = true;
  home.resources.water = 0;
  backwater.resources.water = 2;
  world.survivor.inventory.water = 0;
  world.survivor.needs.thirst = 70;

  assert.equal(sim.chooseAction(world), 'travel');
  sim.advanceMinutes(world, 420);

  assert.equal(world.locationId, 'backwater-edge');
  assert.equal(sim.chooseAction(world), 'collectWater');
});

test('an empty remote site sends the survivor back along a known route', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  requireAPI('advanceMinutes');
  const world = wellProvisioned(sim.createWorld({ now: 0, seed: 93 }));
  const road = world.locations.find((location) => location.id === 'old-village-road');
  road.exploration = 'known';
  road.resources.food = 0;
  road.resources.water = 0;
  road.resources.wood = 0;
  world.locationId = road.id;
  world.survivor.needs.hunger = 30;
  world.survivor.needs.thirst = 30;
  world.survivor.inventory.food = 0;
  world.survivor.inventory.water = 0;
  world.survivor.tools = true;
  world.survivor.inventory.materials = 0;
  world.survivor.inventory.scrap = 0;
  world.shelter.integrity = 96;

  assert.equal(sim.chooseAction(world), 'returnHome');
  sim.advanceMinutes(world, 180);

  assert.equal(world.locationId, 'coastal-homestead');
  assert.equal(world.chronicle.some((event) => event.category === 'exploration' && event.title === 'He returned to the homestead'), true);
});

test('a failed forage is remembered and a different viable strategy is preferred', () => {
  requireAPI('createWorld');
  requireAPI('chooseAction');
  requireAPI('advanceMinutes');
  const world = sim.createWorld({ now: 0, seed: 94 });
  world.survivor.inventory.food = 0;
  world.survivor.needs.hunger = 80;
  world.locations.find((location) => location.id === world.locationId).resources.food = 0;
  world.activeAction = { type: 'gatherFood', remainingMinutes: 55, totalMinutes: 55, targetLocationId: null };

  sim.advanceMinutes(world, 55);
  world.locations.find((location) => location.id === world.locationId).resources.food = 1;

  assert.equal(world.survivor.memory.failedSearches, 1);
  assert.equal(sim.chooseAction(world), 'collectWater');
});

test('reloading preserves the current discovered site and remembered failed actions', () => {
  requireAPI('createWorld');
  requireAPI('restoreWorld');
  const world = sim.createWorld({ now: 0, seed: 95 });
  const road = world.locations.find((location) => location.id === 'old-village-road');
  road.exploration = 'known';
  world.locationId = road.id;
  world.survivor.memory.actionFailures.gatherFood = 2;
  world.lastRealMs = 1000;

  const restored = sim.restoreWorld(JSON.stringify(world), { now: 1000 }).world;

  assert.equal(restored.locationId, 'old-village-road');
  assert.equal(restored.survivor.memory.actionFailures.gatherFood, 2);
});

test('a malformed location entry is backed away from instead of crashing save recovery', () => {
  requireAPI('createWorld');
  requireAPI('restoreWorld');
  const world = sim.createWorld({ now: 0, seed: 96 });
  world.locations[1] = null;

  let restored;
  assert.doesNotThrow(() => { restored = sim.restoreWorld(JSON.stringify(world), { now: 0 }); });
  assert.ok(restored.warning);
  assert.equal(restored.world.locationId, 'coastal-homestead');
});
