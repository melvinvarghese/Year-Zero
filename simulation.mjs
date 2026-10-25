export const DAY_MS = 15 * 60 * 1000;
export const MAX_CATCHUP_DAYS = 7;
export const MAX_CATCHUP_MS = MAX_CATCHUP_DAYS * DAY_MS;
export const SAVE_KEY = 'year-zero-world-v5';
export const LEGACY_SAVE_KEYS = ['year-zero-world-v4', 'year-zero-save-v2'];
export const SCHEMA_VERSION = 1;
export const MAX_CHRONICLE = 300;

const MAX_SIM_MINUTES = MAX_CATCHUP_DAYS * 1440;
const RESOURCE_CAPS = { food: 12, water: 12, wood: 30, scrap: 12, materials: 12, seeds: 8 };
const VALID_PRIORITIES = new Set(['balanced', 'food', 'water', 'shelter', 'explore', 'rest']);
const WEATHER = new Set(['mist', 'breeze', 'rain', 'heat']);
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OUTDOOR_ACTIONS = new Set(['explore', 'travel', 'returnHome', 'gatherFood', 'gatherWood', 'collectWater']);
const ACTION_LABELS = {
  drink: 'Drinking stored water',
  collectWater: 'Drawing water at this site',
  eat: 'Eating a stored meal',
  gatherFood: 'Foraging for food',
  gatherWood: 'Gathering fallen timber',
  repairShelter: 'Repairing the roof',
  rest: 'Resting in the shade',
  explore: 'Exploring nearby ground',
  travel: 'Following a known route',
  returnHome: 'Returning along a known route',
  craftTool: 'Making a hand tool',
  makeFire: 'Lighting the hearth'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function integer(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return clamp(Math.floor(finite(value, fallback)), min, max);
}

function random(world) {
  let x = world.rng >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rng = x >>> 0 || 0x6d2b79f5;
  return world.rng / 0x100000000;
}

function formatClock(minute) {
  const m = clamp(Math.floor(minute), 0, 1439);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatSimDate(day) {
  const dayNumber = integer(day, 1, 1);
  const year = Math.floor((dayNumber - 1) / 365) + 1;
  let dayOfYear = (dayNumber - 1) % 365;
  let month = 0;
  while (dayOfYear >= MONTH_LENGTHS[month]) {
    dayOfYear -= MONTH_LENGTHS[month];
    month += 1;
  }
  return `Year ${year} · ${dayOfYear + 1} ${MONTH_NAMES[month]}`;
}

function makeLocations() {
  return [
    {
      id: 'coastal-homestead',
      name: 'Coastal homestead',
      region: 'Kerala coast',
      terrain: 'Laterite rise above the Arabian Sea',
      vegetation: 'Coconut palms, betel vine, and an overgrown garden',
      exploration: 'known',
      neighbors: ['old-village-road'],
      travelMinutes: 0,
      risk: 0,
      freshwater: true,
      resources: { food: 5, water: 10, wood: 14, scrap: 1, materials: 1, seeds: 0 },
      discovery: 'An abandoned coastal house stands beside a stone-lined well.'
    },
    {
      id: 'old-village-road',
      name: 'Old village road',
      region: 'Kerala coast',
      terrain: 'Laterite lane beneath fallen tile roofs',
      vegetation: 'Wild banana, pepper vines, and rain-fed weeds',
      exploration: 'unseen',
      neighbors: ['coastal-homestead', 'backwater-edge', 'abandoned-clinic'],
      travelMinutes: 180,
      risk: 0.1,
      freshwater: false,
      resources: { food: 4, water: 0, wood: 8, scrap: 3, materials: 3, seeds: 1 },
      discovery: 'A rusted hand pump and a tin of salvaged fasteners lie beneath a collapsed awning.'
    },
    {
      id: 'backwater-edge',
      name: 'Backwater edge',
      region: 'Kerala coast',
      terrain: 'Brackish lagoon margin and reed beds',
      vegetation: 'Mangrove shoots, reeds, and wild taro',
      exploration: 'unseen',
      neighbors: ['old-village-road'],
      travelMinutes: 240,
      risk: 0.18,
      freshwater: true,
      resources: { food: 5, water: 2, wood: 5, scrap: 0, materials: 1, seeds: 2 },
      discovery: 'A weather-beaten fishing net and a rain-fed freshwater seep are tucked into the reeds.'
    },
    {
      id: 'abandoned-clinic',
      name: 'Abandoned clinic',
      region: 'Kerala coast',
      terrain: 'Cracked concrete at the edge of the village',
      vegetation: 'Moss, fern, and roots breaking the front steps',
      exploration: 'unseen',
      neighbors: ['old-village-road'],
      travelMinutes: 210,
      risk: 0.15,
      freshwater: false,
      resources: { food: 0, water: 0, wood: 2, scrap: 2, materials: 2, seeds: 0 },
      discovery: 'An intact cupboard holds bandages and a hand-drawn map of nearby wells.'
    }
  ];
}

function initialChronicle() {
  return [{
    day: 1,
    minute: 375,
    time: '06:15',
    category: 'survival',
    kind: 'arrival',
    importance: 'major',
    title: 'He wakes in the coastal house',
    detail: 'The roof leaks above the old kitchen. Two containers of water and a small food store remain.',
    locationId: 'coastal-homestead'
  }];
}

export function createWorld({ now = Date.now(), seed = 0x5eed1234 } = {}) {
  const normalizedSeed = integer(seed, 0x5eed1234, 1, 0xffffffff) >>> 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    day: 1,
    minute: 375,
    lastRealMs: finite(now, Date.now()),
    paused: false,
    priority: 'balanced',
    rng: normalizedSeed,
    weather: 'mist',
    locationId: 'coastal-homestead',
    locations: makeLocations(),
    discoveries: [],
    milestones: [],
    survivor: {
      alive: true,
      tools: false,
      needs: { health: 92, hunger: 25, thirst: 20, energy: 76, morale: 68, loneliness: 20, exposure: 0, injury: 0 },
      inventory: { food: 3, water: 2, wood: 4, scrap: 1, materials: 1, seeds: 0 },
      skills: { foraging: 0, repair: 0, navigation: 0, crafting: 0 },
      memory: { failedSearches: 0, actionFailures: {}, lastDiscovery: null, visited: ['coastal-homestead'] }
    },
    shelter: { integrity: 48, fireMinutes: 0 },
    activeAction: null,
    actionCount: 0,
    chronicle: initialChronicle()
  };
}

function currentLocation(world) {
  return world.locations.find((location) => location.id === world.locationId) || world.locations[0];
}

function findKnownPath(world, fromId, toId) {
  const byId = new Map(world.locations.map((location) => [location.id, location]));
  if (fromId === toId) return [fromId];
  const queue = [[fromId]];
  const visited = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift();
    const last = byId.get(path.at(-1));
    for (const neighborId of last?.neighbors || []) {
      if (neighborId === toId) return [...path, neighborId];
      const neighbor = byId.get(neighborId);
      if (neighbor?.exploration === 'known' && !visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    }
  }
  return null;
}

function knownPathMinutes(world, path) {
  if (!path) return Number.POSITIVE_INFINITY;
  const byId = new Map(world.locations.map((location) => [location.id, location]));
  return path.slice(1).reduce((sum, id) => sum + Math.max(15, byId.get(id)?.travelMinutes || 0), 0);
}

function nextDiscovery(world) {
  const location = currentLocation(world);
  return location.neighbors
    .map((id) => world.locations.find((item) => item.id === id))
    .find((item) => item && item.exploration !== 'known') || null;
}

function nextHomeStep(world) {
  if (world.locationId === 'coastal-homestead') return null;
  const path = findKnownPath(world, world.locationId, 'coastal-homestead');
  return path?.length > 1 ? world.locations.find((location) => location.id === path[1]) || null : null;
}

function remoteResourceGoal(world) {
  const location = currentLocation(world);
  const inventory = world.survivor.inventory;
  const needs = world.survivor.needs;
  const candidates = [];

  const addSites = (resource, scoreFor) => {
    for (const target of world.locations) {
      if (target.id === location.id || target.exploration !== 'known' || target.resources[resource] < 1) continue;
      const path = findKnownPath(world, location.id, target.id);
      if (!path) continue;
      const minutes = knownPathMinutes(world, path);
      candidates.push({ target, minutes, score: scoreFor() - minutes / 75 - target.risk * 12 });
    }
  };

  if (location.resources.water < 1 && inventory.water < 2 && (needs.thirst > 35 || inventory.water === 0)) {
    addSites('water', () => 42 + Math.max(0, needs.thirst - 35) * 0.75 + (2 - inventory.water) * 9);
  }
  if (location.resources.food < 1 && inventory.food < 2 && (needs.hunger > 35 || inventory.food === 0)) {
    addSites('food', () => 35 + Math.max(0, needs.hunger - 35) * 0.65 + (2 - inventory.food) * 10);
  }
  if (location.resources.wood < 1 && inventory.wood < 2 && world.shelter.integrity < 55) {
    addSites('wood', () => 28 + (55 - world.shelter.integrity) * 0.4 + (2 - inventory.wood) * 8);
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function priorityBonus(world, action) {
  const map = {
    food: { eat: 8, gatherFood: 20 },
    water: { drink: 8, collectWater: 20 },
    shelter: { repairShelter: 24, gatherWood: 8 },
    explore: { explore: 24 },
    rest: { rest: 22 }
  };
  return map[world.priority]?.[action] || 0;
}

export function chooseAction(world) {
  const survivor = world.survivor;
  const needs = survivor.needs;
  const inventory = survivor.inventory;
  if (!survivor.alive || needs.health <= 0) return null;

  const location = currentLocation(world);
  const candidates = [];
  const offer = (action, score, possible = true) => {
    if (possible && Number.isFinite(score)) {
      const failedAttempts = survivor.memory.actionFailures?.[action] || 0;
      const failurePenalty = Math.min(32, failedAttempts * 25);
      candidates.push({ action, score: score + priorityBonus(world, action) - failurePenalty });
    }
  };

  offer('drink', 30 + Math.max(0, needs.thirst - 30) * 1.25, inventory.water > 0 && needs.thirst > 30);
  offer('collectWater', 29 + (4 - inventory.water) * 8 + needs.thirst * 0.25, inventory.water < 4 && location.resources.water > 0);
  offer('eat', 30 + Math.max(0, needs.hunger - 30) * 1.2, inventory.food > 0 && needs.hunger > 30);
  offer('gatherFood', 31 + (3 - inventory.food) * 8 + needs.hunger * 0.25, inventory.food < 3 && location.resources.food > 0);
  offer('rest', 18 + (78 - needs.energy) * 0.9 + (needs.health < 55 ? 24 : 0), needs.energy < 78 || needs.health < 55 || needs.injury > 0);
  offer('repairShelter', 20 + (72 - world.shelter.integrity) * 0.8 + (world.weather === 'rain' ? 18 : 0), location.id === 'coastal-homestead' && world.shelter.integrity < 72 && inventory.wood >= 2);
  offer('gatherWood', 20 + (5 - inventory.wood) * 8, inventory.wood < 5 && location.resources.wood > 0);
  offer('craftTool', 27 + (survivor.skills.crafting === 0 ? 3 : 0), !survivor.tools && inventory.materials > 0 && inventory.wood > 0);
  offer('makeFire', 14 + (world.minute >= 1080 ? 12 : 0), location.id === 'coastal-homestead' && world.shelter.fireMinutes <= 0 && inventory.wood > 0 && needs.energy > 18);

  const target = nextDiscovery(world);
  const readyToExplore = target && needs.health >= 30 && needs.energy >= (world.priority === 'explore' ? 35 : 48) && needs.injury < 75 && inventory.food >= 1 && inventory.water >= 1;
  const provisions = Math.min(inventory.food, inventory.water);
  const explorationScore = 17 + (provisions >= 2 ? 10 : -18) + (needs.energy > 72 ? 5 : 0) + survivor.skills.navigation * 2 - (world.weather === 'rain' ? 14 : 0) - (world.weather === 'heat' ? 8 : 0);
  offer('explore', explorationScore, Boolean(readyToExplore));

  const remoteGoal = remoteResourceGoal(world);
  offer('travel', remoteGoal?.score || 0, Boolean(remoteGoal));
  const homeStep = nextHomeStep(world);
  const returnScore = 28 + (inventory.water <= 1 ? 20 : 0) + (inventory.food <= 1 ? 18 : 0) + (needs.energy < 45 ? 20 : 0) + (needs.health < 55 ? 30 : 0) + (needs.injury > 0 ? 10 : 0) + (world.weather === 'rain' ? 8 : 0);
  offer('returnHome', returnScore, Boolean(homeStep));

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.action || (needs.energy < 75 ? 'rest' : null);
}

function actionDuration(world, action, target) {
  const base = {
    drink: 12,
    collectWater: 45,
    eat: 15,
    gatherFood: 55,
    gatherWood: 50,
    repairShelter: 90,
    rest: 60,
    craftTool: 105,
    makeFire: 30
  };
  if (action === 'explore') return target?.travelMinutes || 180;
  if (action === 'travel') return knownPathMinutes(world, findKnownPath(world, world.locationId, target?.id));
  if (action === 'returnHome') return Math.max(30, currentLocation(world).travelMinutes || 180);
  const skill = action === 'gatherFood' || action === 'gatherWood' || action === 'collectWater'
    ? world.survivor.skills.foraging
    : action === 'repairShelter' ? world.survivor.skills.repair : 0;
  return Math.max(10, (base[action] || 30) * Math.max(0.7, 1 - skill * 0.04));
}

function startAction(world, action) {
  const target = action === 'explore' ? nextDiscovery(world)
    : action === 'travel' ? remoteResourceGoal(world)?.target
      : action === 'returnHome' ? nextHomeStep(world)
        : null;
  const duration = actionDuration(world, action, target);
  if (!duration || !Number.isFinite(duration)) return false;
  world.activeAction = {
    type: action,
    remainingMinutes: duration,
    totalMinutes: duration,
    targetLocationId: target?.id || null
  };
  world.actionCount += 1;
  return true;
}

function addEvent(world, category, title, detail, { importance = 'ordinary', kind = 'activity', locationId = world.locationId } = {}) {
  world.chronicle.push({
    day: world.day,
    minute: Math.floor(world.minute),
    time: formatClock(world.minute),
    category,
    kind,
    importance,
    title,
    detail,
    locationId
  });
  if (world.chronicle.length > MAX_CHRONICLE) world.chronicle.splice(0, world.chronicle.length - MAX_CHRONICLE);
}

function maybeMilestone(world, key, title, detail) {
  if (world.milestones.includes(key)) return;
  world.milestones.push(key);
  addEvent(world, 'milestone', title, detail, { importance: 'major', kind: 'milestone' });
}

function checkMilestones(world) {
  const inventory = world.survivor.inventory;
  const knownCount = world.locations.filter((location) => location.exploration === 'known').length;
  if (inventory.water >= 3 && currentLocation(world).freshwater) {
    maybeMilestone(world, 'water-in-reserve', 'Water kept in reserve', 'He is carrying enough stored water to get through a short interruption at a freshwater source.');
  }
  if (world.shelter.integrity >= 80) {
    maybeMilestone(world, 'weatherproof-shelter', 'The roof holds', 'Repairs have brought the shelter above 80% integrity; it offers substantially better protection in rain.');
  }
  if (world.survivor.skills.crafting > 0) {
    maybeMilestone(world, 'first-tool', 'A first tool is made', 'Salvaged material and timber have become a reusable hand tool.');
  }
  if (knownCount >= 3) {
    maybeMilestone(world, 'three-places-known', 'Three places are known', 'The survivor has recorded a route beyond the homestead and the old village road.');
  }
}

function recordActionFailure(world, actionType, title, detail, category, record) {
  world.survivor.memory.failedSearches += 1;
  world.survivor.memory.actionFailures ||= {};
  if (actionType) world.survivor.memory.actionFailures[actionType] = Math.min(10, (world.survivor.memory.actionFailures[actionType] || 0) + 1);
  if (record) addEvent(world, category, title, detail, { kind: 'setback' });
}

function resolveTravelRisk(world, location, baseRisk, record) {
  const weatherMultiplier = world.weather === 'rain' ? 1.6 : world.weather === 'heat' ? 1.25 : 1;
  if (random(world) < Math.min(0.8, baseRisk * weatherMultiplier)) {
    world.survivor.needs.injury = clamp(world.survivor.needs.injury + 10, 0, 100);
    world.survivor.needs.health = clamp(world.survivor.needs.health - 5, 0, 100);
    if (record) addEvent(world, 'survival', 'The rough route left him hurt', 'Loose stones and roots slowed the journey. The injury will make future travel harder until it heals.', { kind: 'injury', locationId: location.id });
  }
}

function completeAction(world, action, record) {
  const survivor = world.survivor;
  const needs = survivor.needs;
  const inventory = survivor.inventory;
  const location = currentLocation(world);
  const add = (category, title, detail, options = {}) => {
    if (record) addEvent(world, category, title, detail, options);
  };
  const reject = (title, detail, category = 'survival') => recordActionFailure(world, action.type, title, detail, category, record);

  switch (action.type) {
    case 'drink':
      if (inventory.water < 1) return reject('The water is gone', 'The last container was used before he could drink again.');
      inventory.water -= 1;
      needs.thirst = clamp(needs.thirst - 42, 0, 100);
      add('survival', 'He drank from the last container', 'A measured drink eased his thirst; the remaining stores are smaller now.');
      break;
    case 'collectWater':
      if (location.resources.water < 1 || inventory.water >= RESOURCE_CAPS.water) {
        return reject('The water source gave nothing', 'The source is empty for now, so he will need another way to replenish his stores.');
      }
      location.resources.water -= 1;
      inventory.water += 1;
      needs.thirst = clamp(needs.thirst - 4, 0, 100);
      survivor.skills.foraging += 1;
      add('survival', `He drew water at ${location.name.toLowerCase()}`, `One container was filled here. The source has less available water until it recovers.`, { locationId: location.id });
      break;
    case 'eat':
      if (inventory.food < 1) return reject('There was no stored food', 'He searched the container but found it empty.');
      inventory.food -= 1;
      needs.hunger = clamp(needs.hunger - 38, 0, 100);
      needs.morale = clamp(needs.morale + 1, 0, 100);
      add('survival', 'He ate one of the stored portions', 'The meal eased his hunger, but the food store is smaller now.');
      break;
    case 'gatherFood': {
      if (location.resources.food < 1 || inventory.food >= RESOURCE_CAPS.food) {
        return reject('There was no food left to gather', 'The patch he searched was picked clean. He will need to wait for it to recover or range farther.');
      }
      const amount = (survivor.skills.foraging >= 4 || survivor.tools) && location.resources.food >= 2 ? 2 : 1;
      const gathered = Math.min(amount, location.resources.food, RESOURCE_CAPS.food - inventory.food);
      location.resources.food -= gathered;
      inventory.food += gathered;
      survivor.skills.foraging += 1;
      needs.hunger = clamp(needs.hunger - 5, 0, 100);
      add('survival', `He gathered food at ${location.name.toLowerCase()}`, `He brought back ${gathered} portion${gathered === 1 ? '' : 's'} of edible greens and fruit.`, { locationId: location.id });
      break;
    }
    case 'gatherWood': {
      if (location.resources.wood < 1 || inventory.wood >= RESOURCE_CAPS.wood) {
        return reject('The fallen timber was exhausted', 'No usable branches remained where he searched.');
      }
      const amount = survivor.skills.foraging >= 3 || survivor.tools ? 2 : 1;
      const gathered = Math.min(amount, location.resources.wood, RESOURCE_CAPS.wood - inventory.wood);
      location.resources.wood -= gathered;
      inventory.wood += gathered;
      survivor.skills.foraging += 1;
      add('survival', `He gathered timber at ${location.name.toLowerCase()}`, `He carried ${gathered} bundle${gathered === 1 ? '' : 's'} of wood from the site.`, { locationId: location.id });
      break;
    }
    case 'repairShelter':
      if (world.locationId !== 'coastal-homestead' || inventory.wood < 2 || world.shelter.integrity >= 100) {
        return reject('The roof repair had to wait', 'The shelter cannot be repaired from here, or there was not enough timber for a useful repair.', 'construction');
      }
      inventory.wood -= 2;
      world.shelter.integrity = clamp(world.shelter.integrity + 24, 0, 100);
      survivor.skills.repair += 1;
      add('construction', 'He repaired the leaking roof', 'Two bundles of timber and palm thatch closed part of the gap. The shelter is safer in rain.');
      break;
    case 'rest':
      if (needs.energy >= 98 && needs.injury <= 0) {
        add('survival', 'He rested through the heat', 'The shade kept him out of the worst sun, though he was already close to rested.');
      } else {
        needs.energy = clamp(needs.energy + 4, 0, 100);
        if (needs.health < 85 && needs.hunger < 75 && needs.thirst < 75) needs.health = clamp(needs.health + 1, 0, 100);
        add('survival', 'He stopped to recover', 'An hour in the shade restored some strength before he returned to work.');
      }
      if (world.locationId === 'coastal-homestead') needs.exposure = clamp(needs.exposure - 8, 0, 100);
      break;
    case 'explore': {
      const target = world.locations.find((item) => item.id === action.targetLocationId);
      if (!target || target.exploration === 'known' || !location.neighbors.includes(target.id)) return reject('The route could not be found', 'He returned to the last known place without making a new discovery.', 'exploration');
      target.exploration = 'known';
      if (!survivor.memory.visited.includes(target.id)) survivor.memory.visited.push(target.id);
      survivor.memory.lastDiscovery = target.id;
      survivor.skills.navigation += 1;
      needs.morale = clamp(needs.morale + 7, 0, 100);
      needs.loneliness = clamp(needs.loneliness - 6, 0, 100);
      world.discoveries.push(target.id);
      if (target.id === 'old-village-road') {
        const salvage = Math.min(1, target.resources.scrap, RESOURCE_CAPS.scrap - inventory.scrap);
        target.resources.scrap -= salvage;
        inventory.scrap = clamp(inventory.scrap + salvage, 0, RESOURCE_CAPS.scrap);
        const timber = Math.min(1, target.resources.wood, RESOURCE_CAPS.wood - inventory.wood);
        target.resources.wood -= timber;
        inventory.wood = clamp(inventory.wood + timber, 0, RESOURCE_CAPS.wood);
      } else if (target.id === 'backwater-edge') {
        const food = Math.min(1, target.resources.food, RESOURCE_CAPS.food - inventory.food);
        const water = Math.min(1, target.resources.water, RESOURCE_CAPS.water - inventory.water);
        target.resources.food -= food;
        target.resources.water -= water;
        inventory.food = clamp(inventory.food + food, 0, RESOURCE_CAPS.food);
        inventory.water = clamp(inventory.water + water, 0, RESOURCE_CAPS.water);
      } else if (target.id === 'abandoned-clinic') {
        const materials = Math.min(1, target.resources.materials, RESOURCE_CAPS.materials - inventory.materials);
        target.resources.materials -= materials;
        inventory.materials = clamp(inventory.materials + materials, 0, RESOURCE_CAPS.materials);
        needs.health = clamp(needs.health + 8, 0, 100);
      }
      world.locationId = target.id;
      add('discovery', `He found ${target.name.toLowerCase()}`, target.discovery, { importance: 'major', kind: 'discovery', locationId: target.id });
      resolveTravelRisk(world, target, target.risk, record);
      if (!world.milestones.includes('first-place')) maybeMilestone(world, 'first-place', 'A place beyond the homestead is known', `He reached ${target.name.toLowerCase()} and recorded its route and resources.`);
      break;
    }
    case 'travel':
    case 'returnHome': {
      const target = world.locations.find((item) => item.id === action.targetLocationId);
      const returning = action.type === 'returnHome';
      const reachable = returning
        ? target && location.neighbors.includes(target.id)
        : target && target.exploration === 'known' && findKnownPath(world, location.id, target.id);
      if (!reachable || target.id === location.id) return reject('The known route could not be followed', 'The path was no longer accessible, so he stayed where he was.', 'exploration');
      world.locationId = target.id;
      if (!survivor.memory.visited.includes(target.id)) survivor.memory.visited.push(target.id);
      if (returning && target.id === 'coastal-homestead') {
        add('exploration', 'He returned to the homestead', `He followed the route back from ${location.name.toLowerCase()} with his supplies and discoveries.`, { kind: 'travel', locationId: target.id });
        if (!world.milestones.includes('first-route')) maybeMilestone(world, 'first-route', 'The way back is known', `He made it back to the homestead from ${location.name.toLowerCase()}.`);
      } else {
        const title = returning ? 'He moved back toward the homestead' : `He followed a known route to ${target.name.toLowerCase()}`;
        add('exploration', title, `The journey ended at ${target.name.toLowerCase()}; its local resources are now within reach.`, { kind: 'travel', locationId: target.id });
      }
      resolveTravelRisk(world, returning ? location : target, returning ? location.risk : target.risk, record);
      break;
    }
    case 'craftTool':
      if (inventory.materials < 1 || inventory.wood < 1 || survivor.tools) return reject('The tool could not be finished', 'He lacked the salvage or timber needed to bind a usable hand tool.', 'construction');
      inventory.materials -= 1;
      inventory.wood -= 1;
      survivor.tools = true;
      survivor.skills.crafting += 1;
      add('construction', 'He made a crude hand tool', 'A piece of salvage and a straight branch became a simple, reusable tool.');
      break;
    case 'makeFire':
      if (world.locationId !== 'coastal-homestead' || inventory.wood < 1 || world.shelter.fireMinutes > 0) return reject('The hearth stayed cold', 'There was no dry fuel ready for another fire at the homestead.');
      inventory.wood -= 1;
      world.shelter.fireMinutes = 180;
      needs.morale = clamp(needs.morale + 2, 0, 100);
      add('survival', 'He lit a small hearth fire', 'Dry branches caught under the sheltered eaves. The fire will last for about three hours.');
      break;
    default:
      return reject('The action could not be completed', 'The survivor changed course before the work began.');
  }

  if (survivor.memory.actionFailures?.[action.type]) delete survivor.memory.actionFailures[action.type];
  checkMilestones(world);
}

function changeWeather(world, record) {
  const dayOfYear = ((world.day - 1) % 365) + 1;
  const monsoon = dayOfYear >= 150 && dayOfYear <= 275;
  const roll = random(world);
  const next = monsoon
    ? (roll < 0.58 ? 'rain' : roll < 0.76 ? 'mist' : roll < 0.9 ? 'breeze' : 'heat')
    : (roll < 0.12 ? 'rain' : roll < 0.36 ? 'heat' : roll < 0.67 ? 'breeze' : 'mist');
  const previous = world.weather;
  world.weather = next;
  if (record && previous !== next && (next === 'rain' || next === 'heat')) {
    const title = next === 'rain' ? 'Monsoon rain reaches the coast' : 'Heat settles over the homestead';
    const detail = next === 'rain'
      ? 'Rain is falling on the weakened roof. He will need to keep the shelter in repair.'
      : 'The air has turned hot and dry; thirst will rise faster while he is outside.';
    addEvent(world, 'environment', title, detail, { importance: 'major', kind: 'weather' });
  }
}

function dawn(world, record) {
  world.day += 1;
  world.minute = 0;
  for (const location of world.locations) {
    location.resources.food = clamp(location.resources.food + (location.exploration === 'known' ? 1 : 0), 0, 12);
    location.resources.water = clamp(location.resources.water + (location.freshwater ? 2 : 1), 0, 12);
    location.resources.wood = clamp(location.resources.wood + 1, 0, 30);
  }
  for (const [action, failures] of Object.entries(world.survivor.memory.actionFailures || {})) {
    if (failures <= 1) delete world.survivor.memory.actionFailures[action];
    else world.survivor.memory.actionFailures[action] = failures - 1;
  }
  world.survivor.needs.loneliness = clamp(world.survivor.needs.loneliness + 5, 0, 100);
  world.survivor.needs.morale = clamp(world.survivor.needs.morale - (world.survivor.needs.loneliness > 75 ? 3 : 1), 0, 100);
  changeWeather(world, record);
  if (record) addEvent(world, 'survival', 'Daybreak on the coast', `Day ${world.day} begins. Food and water are replenishing slowly in the nearby landscape.`, { kind: 'daybreak' });
  checkMilestones(world);
}

function applyNeeds(world, minutes) {
  const survivor = world.survivor;
  const needs = survivor.needs;
  const action = world.activeAction?.type || 'idle';
  const location = currentLocation(world);
  const sheltered = location.id === 'coastal-homestead' && world.shelter.integrity > 25;
  const outside = OUTDOOR_ACTIONS.has(action);
  const heat = world.weather === 'heat';
  const rain = world.weather === 'rain';

  needs.hunger = clamp(needs.hunger + minutes * 0.03, 0, 100);
  needs.thirst = clamp(needs.thirst + minutes * (heat ? 0.055 : rain ? 0.032 : 0.04), 0, 100);
  if (action === 'rest') needs.energy = clamp(needs.energy + minutes * 0.28, 0, 100);
  else if (action === 'makeFire') needs.energy = clamp(needs.energy - minutes * 0.04, 0, 100);
  else needs.energy = clamp(needs.energy - minutes * (outside ? 0.075 * (rain ? 1.2 : heat ? 1.1 : 1) : sheltered ? 0.035 : 0.055), 0, 100);

  needs.loneliness = clamp(needs.loneliness + minutes * 0.006, 0, 100);
  if (needs.loneliness > 78) needs.morale = clamp(needs.morale - minutes * 0.006, 0, 100);
  if (outside || !sheltered) {
    needs.exposure = clamp(needs.exposure + minutes * (rain ? 0.12 : heat ? 0.09 : 0.055), 0, 100);
  } else {
    needs.exposure = clamp(needs.exposure - minutes * (world.shelter.fireMinutes > 0 ? 0.18 : 0.1), 0, 100);
  }

  if (rain && world.shelter.integrity < 100) world.shelter.integrity = clamp(world.shelter.integrity - minutes * 0.002, 0, 100);
  if (heat && outside) needs.thirst = clamp(needs.thirst + minutes * 0.008, 0, 100);
  if (world.shelter.fireMinutes > 0) world.shelter.fireMinutes = Math.max(0, world.shelter.fireMinutes - minutes);
  if (needs.exposure > 45) needs.health = clamp(needs.health - minutes * 0.006, 0, 100);
  if (needs.thirst > 92) needs.health = clamp(needs.health - minutes * 0.018, 0, 100);
  if (needs.hunger > 94) needs.health = clamp(needs.health - minutes * 0.014, 0, 100);
  if (needs.injury > 0 && !outside) needs.injury = clamp(needs.injury - minutes * 0.015, 0, 100);
  if (needs.health <= 0 && survivor.alive) {
    survivor.alive = false;
    world.activeAction = null;
    addEvent(world, 'survival', `His life ended at ${location.name.toLowerCase()}`, 'The accumulated strain became too much. The world keeps its record, but he can no longer act.', { importance: 'major', kind: 'death', locationId: location.id });
  }
}

export function advanceMinutes(world, minutes, { record = true } = {}) {
  let remaining = clamp(finite(minutes, 0), 0, MAX_SIM_MINUTES);
  if (remaining <= 0 || world.paused) return 0;
  const advanced = remaining;
  let guard = 0;

  while (remaining > 1e-8 && guard < 20000) {
    guard += 1;
    if (!world.activeAction && world.survivor.alive) {
      const action = chooseAction(world);
      if (action) startAction(world, action);
    }
    const action = world.activeAction;
    const toMidnight = 1440 - world.minute;
    const toActionEnd = action ? action.remainingMinutes : 10;
    const slice = Math.min(remaining, 10, toMidnight, toActionEnd > 1e-8 ? toActionEnd : 10);
    if (slice <= 0) break;

    applyNeeds(world, slice);
    world.minute += slice;
    remaining -= slice;
    if (action) action.remainingMinutes = Math.max(0, action.remainingMinutes - slice);

    if (world.minute >= 1440 - 1e-7) dawn(world, record);
    if (action && action.remainingMinutes <= 1e-7 && world.activeAction === action) {
      world.activeAction = null;
      completeAction(world, action, record);
    }
  }
  if (guard >= 20000) throw new Error('Simulation step guard reached; check action duration and clock state.');
  world.minute = Math.round(world.minute * 1e9) / 1e9;
  return advanced - remaining;
}

export function advanceElapsed(world, elapsedRealMs, { record = true } = {}) {
  if (world.paused) return 0;
  const elapsed = Math.max(0, finite(elapsedRealMs, 0));
  const boundedMs = Math.min(elapsed, MAX_CATCHUP_MS);
  const minutes = boundedMs * 1440 / DAY_MS;
  const advanced = advanceMinutes(world, minutes, { record });
  if (elapsed > MAX_CATCHUP_MS && record) {
    addEvent(world, 'environment', 'Some time passed beyond the catch-up window', 'This browser can safely simulate at most seven days after an absence; earlier elapsed time was not simulated.', { importance: 'major', kind: 'catch-up-limit' });
  }
  return advanced;
}

export function pauseWorld(world, paused, now = Date.now()) {
  const timestamp = finite(now, Date.now());
  if (paused && !world.paused) {
    advanceElapsed(world, timestamp - world.lastRealMs);
  }
  world.paused = Boolean(paused);
  world.lastRealMs = timestamp;
  return world;
}

function legacyCategory(entry) {
  const text = `${entry.title || ''} ${entry.text || entry.detail || ''}`.toLowerCase();
  if (/explor|discov|road|backwater|clinic|found/.test(text)) return 'discovery';
  if (/repair|shelter|roof|tool|built|crafted/.test(text)) return 'construction';
  if (/rain|storm|heat|weather|wind/.test(text)) return 'environment';
  return 'survival';
}

function migrateLegacy(saved, now) {
  const world = createWorld({ now, seed: integer(saved.seed, 0x5eed1234, 1, 0xffffffff) });
  world.day = integer(saved.day, 1, 1);
  world.minute = clamp(finite(saved.minute ?? saved.minutes, 375), 0, 1439.999999);
  world.paused = Boolean(saved.paused);
  world.priority = VALID_PRIORITIES.has(saved.priority) ? saved.priority : 'balanced';
  world.lastRealMs = finite(saved.lastReal ?? saved.lastSeen, now);
  world.survivor.needs.health = clamp(finite(saved.health, 92), 0, 100);
  world.survivor.needs.hunger = clamp(finite(saved.hunger, 25), 0, 100);
  world.survivor.needs.thirst = clamp(finite(saved.thirst, 20), 0, 100);
  world.survivor.needs.energy = clamp(finite(saved.energy, 76), 0, 100);
  world.survivor.inventory.food = integer(saved.food, 3, 0, RESOURCE_CAPS.food);
  world.survivor.inventory.water = integer(saved.water, 2, 0, RESOURCE_CAPS.water);
  world.survivor.inventory.wood = integer(saved.wood, 4, 0, RESOURCE_CAPS.wood);
  world.survivor.inventory.scrap = integer(saved.scrap, 0, 0, RESOURCE_CAPS.scrap);
  world.survivor.inventory.materials = integer(saved.materials, 1, 0, RESOURCE_CAPS.materials);
  world.survivor.tools = Boolean(saved.tools);
  world.shelter.integrity = clamp(finite(saved.shelterIntegrity, 24 + integer(saved.shelter, 0, 0, 3) * 20), 0, 100);
  world.shelter.fireMinutes = saved.fire ? 90 : 0;
  world.actionCount = integer(saved.actionCount, 0, 0);
  world.locations.find((location) => location.id === 'old-village-road').exploration = saved.exploredVillage ? 'known' : 'unseen';
  world.locations.find((location) => location.id === 'backwater-edge').exploration = saved.exploredBackwater ? 'known' : 'unseen';
  world.survivor.memory.visited = world.locations.filter((location) => location.exploration === 'known').map((location) => location.id);
  world.discoveries = world.survivor.memory.visited.filter((id) => id !== 'coastal-homestead');
  world.survivor.needs.morale = clamp(finite(saved.morale, 68), 0, 100);
  world.survivor.needs.loneliness = clamp(finite(saved.loneliness, 20), 0, 100);
  const oldEntries = Array.isArray(saved.events) ? saved.events.slice().reverse() : Array.isArray(saved.journal) ? saved.journal.slice().reverse() : [];
  const migratedEntries = oldEntries.map((entry) => {
    const [hour, minute] = String(entry.time || '06:15').split(':').map(Number);
    return {
      day: integer(entry.day, world.day, 1),
      minute: clamp(Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 375, 0, 1439),
      time: String(entry.time || '06:15').slice(0, 5),
      category: legacyCategory(entry),
      kind: 'legacy-record',
      importance: 'ordinary',
      title: String(entry.title || 'Earlier activity').slice(0, 160),
      detail: String(entry.text || entry.detail || '').slice(0, 600),
      locationId: world.locationId
    };
  });
  world.chronicle = [...initialChronicle(), ...migratedEntries].slice(-MAX_CHRONICLE);
  const activity = String(saved.activity || '').toLowerCase();
  const translated = activity.includes('rest') ? 'rest' : activity.includes('explor') ? 'explore' : activity.includes('repair') ? 'repairShelter' : activity.includes('water') ? 'collectWater' : activity.includes('food') ? 'gatherFood' : null;
  if (translated) world.activeAction = { type: translated, remainingMinutes: 1, totalMinutes: 1, targetLocationId: translated === 'explore' ? nextDiscovery(world)?.id || null : null };
  return world;
}

function normalizeCurrent(saved, now) {
  if (saved.schemaVersion !== SCHEMA_VERSION || !Number.isFinite(Number(saved.day)) || !Number.isFinite(Number(saved.minute))) return null;
  if (!saved.survivor || typeof saved.survivor !== 'object' || !saved.survivor.needs || !saved.survivor.inventory || !Array.isArray(saved.locations) || !Array.isArray(saved.chronicle)) return null;
  if (saved.locations.some((location) => !location || typeof location !== 'object' || typeof location.id !== 'string')) return null;
  const world = structuredClone(saved);
  world.day = integer(world.day, 1, 1);
  world.minute = clamp(finite(world.minute, 375), 0, 1439.999999);
  world.lastRealMs = finite(world.lastRealMs, now);
  world.paused = Boolean(world.paused);
  world.priority = VALID_PRIORITIES.has(world.priority) ? world.priority : 'balanced';
  world.rng = integer(world.rng, 0x5eed1234, 1, 0xffffffff) >>> 0;
  world.weather = WEATHER.has(world.weather) ? world.weather : 'mist';
  world.shelter ||= { integrity: 48, fireMinutes: 0 };
  world.shelter.integrity = clamp(finite(world.shelter.integrity, 48), 0, 100);
  world.shelter.fireMinutes = clamp(finite(world.shelter.fireMinutes, 0), 0, 360);
  world.survivor.alive = Boolean(world.survivor.alive) && finite(world.survivor.needs.health, 0) > 0;
  for (const key of ['health', 'hunger', 'thirst', 'energy', 'morale', 'loneliness', 'exposure', 'injury']) {
    world.survivor.needs[key] = clamp(finite(world.survivor.needs[key], key === 'health' ? 92 : 0), 0, 100);
  }
  for (const key of Object.keys(RESOURCE_CAPS)) {
    world.survivor.inventory[key] = integer(world.survivor.inventory[key], 0, 0, RESOURCE_CAPS[key]);
  }
  world.survivor.skills ||= { foraging: 0, repair: 0, navigation: 0, crafting: 0 };
  for (const key of ['foraging', 'repair', 'navigation', 'crafting']) world.survivor.skills[key] = integer(world.survivor.skills[key], 0, 0, 10000);
  world.survivor.memory ||= { failedSearches: 0, lastDiscovery: null, visited: [world.locationId] };
  world.survivor.memory.failedSearches = integer(world.survivor.memory.failedSearches, 0, 0);
  const failureMemory = world.survivor.memory.actionFailures && typeof world.survivor.memory.actionFailures === 'object' && !Array.isArray(world.survivor.memory.actionFailures)
    ? world.survivor.memory.actionFailures : {};
  world.survivor.memory.actionFailures = Object.fromEntries(Object.entries(failureMemory)
    .filter(([action]) => Boolean(ACTION_LABELS[action]))
    .map(([action, count]) => [action, integer(count, 0, 0, 10)])
    .filter(([, count]) => count > 0));
  world.survivor.memory.visited = Array.isArray(world.survivor.memory.visited) ? world.survivor.memory.visited.filter((id) => world.locations.some((location) => location.id === id)) : [world.locationId];
  world.survivor.tools = Boolean(world.survivor.tools);
  world.locations = world.locations.map((location) => ({
    ...location,
    exploration: location.exploration === 'known' ? 'known' : 'unseen',
    freshwater: Boolean(location.freshwater),
    travelMinutes: integer(location.travelMinutes, 180, 0, 1440),
    risk: clamp(finite(location.risk, 0.1), 0, 1),
    neighbors: Array.isArray(location.neighbors) ? location.neighbors.filter((id) => typeof id === 'string') : [],
    resources: Object.fromEntries(Object.keys(RESOURCE_CAPS).map((key) => [key, integer(location.resources?.[key], 0, 0, RESOURCE_CAPS[key])]))
  }));
  if (!world.locations.some((location) => location.id === world.locationId && location.exploration === 'known')) {
    world.locationId = world.locations.find((location) => location.id === 'coastal-homestead')?.id || world.locations.find((location) => location.exploration === 'known')?.id;
  }
  if (!world.locationId) return null;
  world.discoveries = Array.isArray(world.discoveries) ? world.discoveries.filter((id) => world.locations.some((location) => location.id === id)) : [];
  world.milestones = Array.isArray(world.milestones) ? world.milestones.filter((id) => typeof id === 'string') : [];
  world.chronicle = world.chronicle.filter((event) => event && typeof event.title === 'string' && typeof event.detail === 'string').slice(-MAX_CHRONICLE).map((event) => ({
    day: integer(event.day, world.day, 1),
    minute: clamp(finite(event.minute, 375), 0, 1439),
    time: String(event.time || formatClock(event.minute || 375)).slice(0, 5),
    category: ['survival', 'exploration', 'construction', 'discovery', 'environment', 'milestone'].includes(event.category) ? event.category : 'survival',
    kind: String(event.kind || 'activity').slice(0, 40),
    importance: event.importance === 'major' ? 'major' : 'ordinary',
    title: String(event.title).slice(0, 160),
    detail: String(event.detail).slice(0, 600),
    locationId: world.locations.some((location) => location.id === event.locationId) ? event.locationId : world.locationId
  }));
  if (world.activeAction) {
    if (!ACTION_LABELS[world.activeAction.type] || !Number.isFinite(Number(world.activeAction.remainingMinutes))) world.activeAction = null;
    else {
      world.activeAction.remainingMinutes = clamp(finite(world.activeAction.remainingMinutes, 0), 0.001, 1000);
      world.activeAction.totalMinutes = clamp(finite(world.activeAction.totalMinutes, world.activeAction.remainingMinutes), world.activeAction.remainingMinutes, 2000);
      if (!world.locations.some((location) => location.id === world.activeAction.targetLocationId)) world.activeAction.targetLocationId = null;
    }
  }
  world.actionCount = integer(world.actionCount, 0, 0);
  world.lastRealMs = finite(world.lastRealMs, now);
  return world;
}

export function restoreWorld(saved, { now = Date.now() } = {}) {
  const timestamp = finite(now, Date.now());
  let data = saved;
  try {
    if (typeof data === 'string') data = JSON.parse(data);
  } catch {
    return { world: createWorld({ now: timestamp }), migrated: false, warning: 'The saved world could not be read. A new beginning is ready; the damaged save has not been overwritten yet.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { world: createWorld({ now: timestamp }), migrated: false, warning: 'The saved world was not valid. A new beginning is ready; the damaged save has not been overwritten yet.' };
  }

  let world;
  let migrated = false;
  if (data.schemaVersion === SCHEMA_VERSION) world = normalizeCurrent(data, timestamp);
  else if (Number.isFinite(Number(data.day)) && Number.isFinite(Number(data.minute ?? data.minutes))) {
    world = migrateLegacy(data, timestamp);
    migrated = true;
  }
  if (!world) {
    return { world: createWorld({ now: timestamp }), migrated: false, warning: 'The saved world was incomplete or damaged. A new beginning is ready; the damaged save has not been overwritten yet.' };
  }

  const lastReal = finite(world.lastRealMs, timestamp);
  if (world.paused) world.lastRealMs = timestamp;
  else if (timestamp < lastReal) world.lastRealMs = timestamp;
  else {
    const elapsed = timestamp - lastReal;
    advanceElapsed(world, elapsed);
    world.lastRealMs = timestamp;
  }
  return { world, migrated, warning: '' };
}

export function getActionLabel(world) {
  if (!world.survivor.alive) return 'No longer moving';
  return ACTION_LABELS[world.activeAction?.type] || 'Listening to the coast';
}

export function getLongTermGoal(world) {
  const { needs, inventory } = world.survivor;
  const location = currentLocation(world);
  const remote = remoteResourceGoal(world);
  if (needs.thirst > 60 || inventory.water < 2) {
    if (location.resources.water > 0) return 'Replenish water at this site';
    if (remote?.target.resources.water > 0) return `Reach ${remote.target.name} for freshwater`;
    return 'Find a dependable freshwater source';
  }
  if (needs.hunger > 60 || inventory.food < 2) {
    if (location.resources.food > 0) return 'Gather food from this site';
    if (remote?.target.resources.food > 0) return `Reach ${remote.target.name} for food`;
    return 'Find food that will last';
  }
  if (world.shelter.integrity < 72) return location.id === 'coastal-homestead' ? 'Make the roof safer before the next storm' : 'Return to the homestead to repair the roof';
  if (!world.survivor.tools) return 'Turn salvage into a useful tool';
  if (nextDiscovery(world)) return 'Learn the paths beyond the homestead';
  if (location.id !== 'coastal-homestead') return 'Return along a known route to the homestead';
  if (inventory.food < 5) return 'Build a modest reserve of food';
  return 'Maintain the homestead and its supplies';
}
