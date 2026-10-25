import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  MAX_CATCHUP_MS,
  advanceElapsed,
  advanceSimMinutes,
  createWorld,
  evaluateActions,
  formatSimDate,
  pauseWorld,
  restoreWorld
} from './simulation.mjs';

test('one simulated day equals 15 real minutes', () => {
  const world = createWorld({ now: 1000, seed: 42 });
  const startDay = world.day;
  const startMinute = world.minute;
  advanceElapsed(world, DAY_MS);
  assert.equal(world.day, startDay + 1);
  assert.equal(Math.round(world.minute), startMinute);
});

test('autonomous utility engine prioritizes drinking when thirst is critical', () => {
  const world = createWorld({ now: 1000, seed: 99 });
  world.survivor.needs.thirst = 82;
  world.survivor.inventory.water = 3;
  const ranked = evaluateActions(world);
  assert.equal(ranked[0].type, 'drink');
});

test('priority bias gently weights choices without overriding critical survival', () => {
  const world = createWorld({ now: 1000, seed: 123 });
  world.priority = 'shelter';
  const shelterEval = evaluateActions(world).find((a) => a.type === 'repairShelter');
  assert.ok(shelterEval.priorityBonus > 0);
});

test('offline catch-up caps at 7 simulated days and preserves state', () => {
  const startMs = 1_000_000;
  const world = createWorld({ now: startMs, seed: 77 });
  const raw = JSON.stringify(world);
  const restored = restoreWorld(raw, { now: startMs + MAX_CATCHUP_MS * 3 });
  assert.equal(restored.warning, '');
  assert.ok(restored.world.day <= 9);
  assert.ok(restored.world.actionCount > 0);
});

test('pauseWorld freezes elapsed progression while paused', () => {
  const world = createWorld({ now: 5000, seed: 12 });
  pauseWorld(world, true, 5000);
  const minuteBefore = world.minute;
  advanceElapsed(world, 60000);
  assert.equal(world.minute, minuteBefore);
});

test('formatSimDate formats calendar transitions accurately', () => {
  assert.equal(formatSimDate(1), 'Year 1 · 1 January');
  assert.equal(formatSimDate(32), 'Year 1 · 1 February');
  assert.equal(formatSimDate(366), 'Year 2 · 1 January');
});

test('exploration discovers connected Kerala coast locations', () => {
  const world = createWorld({ now: 1000, seed: 31415 });
  world.priority = 'explore';
  world.survivor.inventory.water = 6;
  world.survivor.inventory.food = 6;
  world.shelter.integrity = 80;
  advanceSimMinutes(world, 1440 * 2);
  const known = world.locations.filter((l) => l.exploration === 'known');
  assert.ok(known.length >= 2);
});
