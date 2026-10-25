export const DAY_MS = 15 * 60 * 1000;
export const MAX_CATCHUP_DAYS = 7;
export const MAX_CATCHUP_MS = MAX_CATCHUP_DAYS * DAY_MS;
export const SAVE_KEY = 'year-zero-world-v5';
export const LEGACY_SAVE_KEYS = ['year-zero-world-v4', 'year-zero-save-v2'];
export const SCHEMA_VERSION = 1;
export const MAX_CHRONICLE = 300;

const MAX_SIM_MINUTES = MAX_CATCHUP_DAYS * 1440;
export const RESOURCE_CAPS = { food: 12, water: 12, wood: 30, scrap: 12, materials: 12, seeds: 8 };
export const VALID_PRIORITIES = new Set(['balanced', 'food', 'water', 'shelter', 'explore', 'rest']);
export const WEATHER = new Set(['mist', 'breeze', 'rain', 'heat']);
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OUTDOOR_ACTIONS = new Set(['explore', 'travel', 'returnHome', 'gatherFood', 'gatherWood', 'collectWater', 'tendGarden']);

export const ACTION_LABELS = {
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
  makeFire: 'Lighting the hearth',
  tendGarden: 'Tending the homestead garden',
  treatInjury: 'Dressing wounds with clean cloth'
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

export function random(world) {
  let x = world.rng >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rng = x >>> 0 || 0x6d2b79f5;
  return world.rng / 0x100000000;
}

export function formatClock(minute) {
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

export function makeLocations() {
  return [
    {
      id: 'coastal-homestead',
      name: 'Coastal homestead',
      region: 'Kerala coast',
      terrain: 'Laterite rise above the Arabian Sea',
      vegetation: 'Coconut palms, betel vine, and an overgrown garden',
      exploration: 'known',
      neighbors: ['old-village-road', 'tidal-jetty'],
      travelMinutes: 0,
      risk: 0,
      freshwater: true,
      coords: { x: 26, y: 58 },
      resources: { food: 5, water: 10, wood: 14, scrap: 1, materials: 1, seeds: 1 },
      maxResources: { food: 8, water: 12, wood: 18, scrap: 2, materials: 2, seeds: 3 },
      discovery: 'An abandoned coastal house stands beside a stone-lined well.'
    },
    {
      id: 'old-village-road',
      name: 'Old village road',
      region: 'Kerala coast',
      terrain: 'Laterite lane beneath fallen tile roofs',
      vegetation: 'Wild banana, pepper vines, and rain-fed weeds',
      exploration: 'unseen',
      neighbors: ['coastal-homestead', 'backwater-edge', 'abandoned-clinic', 'laterite-quarry'],
      travelMinutes: 180,
      risk: 0.1,
      freshwater: false,
      coords: { x: 52, y: 46 },
      resources: { food: 4, water: 0, wood: 8, scrap: 3, materials: 3, seeds: 1 },
      maxResources: { food: 6, water: 2, wood: 12, scrap: 5, materials: 5, seeds: 2 },
      discovery: 'A rusted hand pump and a tin of salvaged fasteners lie beneath a collapsed awning.'
    },
    {
      id: 'backwater-edge',
      name: 'Backwater edge',
      region: 'Kerala coast',
      terrain: 'Brackish lagoon margin and reed beds',
      vegetation: 'Mangrove shoots, reeds, and wild taro',
      exploration: 'unseen',
      neighbors: ['old-village-road', 'tidal-jetty'],
      travelMinutes: 240,
      risk: 0.18,
      freshwater: true,
      coords: { x: 64, y: 74 },
      resources: { food: 6, water: 4, wood: 6, scrap: 0, materials: 2, seeds: 2 },
      maxResources: { food: 9, water: 8, wood: 10, scrap: 1, materials: 3, seeds: 4 },
      discovery: 'A weather-beaten fishing net and a rain-fed freshwater seep are tucked into the reeds.'
    },
    {
      id: 'abandoned-clinic',
      name: 'Abandoned clinic',
      region: 'Kerala coast',
      terrain: 'Cracked concrete at the edge of the village',
      vegetation: 'Moss, fern, and roots breaking the front steps',
      exploration: 'unseen',
      neighbors: ['old-village-road', 'laterite-quarry'],
      travelMinutes: 210,
      risk: 0.15,
      freshwater: false,
      coords: { x: 76, y: 28 },
      resources: { food: 1, water: 1, wood: 2, scrap: 3, materials: 4, seeds: 0 },
      maxResources: { food: 2, water: 2, wood: 4, scrap: 5, materials: 6, seeds: 1 },
      discovery: 'An intact cupboard holds bandages and a hand-drawn map of nearby wells.'
    },
    {
      id: 'tidal-jetty',
      name: 'Collapsed stone jetty',
      region: 'Kerala coast',
      terrain: 'Wave-cut basalt pilings and drift-strewn cove',
      vegetation: 'Salt-marsh grass and sea almond trees',
      exploration: 'unseen',
      neighbors: ['coastal-homestead', 'backwater-edge'],
      travelMinutes: 150,
      risk: 0.12,
      freshwater: false,
      coords: { x: 34, y: 82 },
      resources: { food: 5, water: 0, wood: 7, scrap: 2, materials: 2, seeds: 0 },
      maxResources: { food: 8, water: 0, wood: 11, scrap: 4, materials: 3, seeds: 0 },
      discovery: 'Barnacle-encrusted pilings trap driftwood timber and tidal shellfish in shallow pools.'
    },
    {
      id: 'laterite-quarry',
      name: 'Overgrown laterite quarry',
      region: 'Kerala coast',
      terrain: 'Terraced red-stone cuts filled with monsoon runoff',
      vegetation: 'Cashew trees, bamboo clumps, and wild turmeric',
      exploration: 'unseen',
      neighbors: ['old-village-road', 'abandoned-clinic'],
      travelMinutes: 220,
      risk: 0.16,
      freshwater: true,
      coords: { x: 82, y: 54 },
      resources: { food: 3, water: 6, wood: 9, scrap: 2, materials: 3, seeds: 2 },
      maxResources: { food: 5, water: 9, wood: 14, scrap: 3, materials: 4, seeds: 3 },
      discovery: 'Deep stone basins hold clear rainwater beneath a stand of old cashew and bamboo.'
    }
  ];
}

export function createWorld({ now = Date.now(), seed } = {}) {
  const normalizedSeed = integer(seed, Math.floor((now ^ (now >>> 16)) >>> 0), 1) || 0x6d2b79f5;
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
      needs: {
        health: 92,
        hunger: 25,
        thirst: 20,
        energy: 76,
        morale: 68,
        loneliness: 20,
        exposure: 0,
        injury: 0
      },
      inventory: {
        food: 3,
        water: 2,
        wood: 4,
        scrap: 1,
        materials: 1,
        seeds: 1
      },
      skills: {
        foraging: 0,
        repair: 0,
        navigation: 0,
        crafting: 0
      },
      memory: {
        failedSearches: 0,
        actionFailures: {},
        lastDiscovery: null,
        visited: ['coastal-homestead'],
        lastEvaluation: []
      }
    },
    shelter: {
      integrity: 48,
      fireMinutes: 0,
      gardenStage: 0
    },
    activeAction: null,
    actionCount: 0,
    chronicle: [
      {
        day: 1,
        minute: 375,
        time: '06:15',
        category: 'survival',
        importance: 'major',
        title: 'A solitary start',
        detail: 'He wakes in the abandoned coastal house. Monsoon rain has left the well full, but the palm thatch roof needs work.'
      }
    ]
  };
}

function getLocation(world, id = world.locationId) {
  return world.locations.find((loc) => loc.id === id) || world.locations[0];
}

function addEvent(world, category, title, detail, importance = 'normal') {
  world.chronicle.push({
    day: world.day,
    minute: Math.floor(world.minute),
    time: formatClock(world.minute),
    category,
    importance,
    title,
    detail
  });
  if (world.chronicle.length > MAX_CHRONICLE) {
    const majorEvents = world.chronicle.filter((e) => e.importance === 'major').slice(-80);
    const recentEvents = world.chronicle.slice(-(MAX_CHRONICLE - majorEvents.length));
    const merged = [...new Map([...majorEvents, ...recentEvents].map((e) => [`${e.day}:${e.minute}:${e.title}`, e])).values()];
    merged.sort((a, b) => (a.day - b.day) || (a.minute - b.minute));
    world.chronicle = merged.slice(-MAX_CHRONICLE);
  }
}

export function findKnownPath(world, fromId, toId) {
  if (fromId === toId) return [fromId];
  const knownIds = new Set(
    world.locations.filter((l) => l.exploration === 'known').map((l) => l.id)
  );
  knownIds.add(fromId);
  const queue = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];
    const loc = getLocation(world, curr);
    for (const nextId of loc.neighbors || []) {
      if (nextId === toId) return [...path, nextId];
      if (!visited.has(nextId) && knownIds.has(nextId)) {
        visited.add(nextId);
        queue.push([...path, nextId]);
      }
    }
  }
  return null;
}

function nextHomeStep(world) {
  if (world.locationId === 'coastal-homestead') return null;
  const path = findKnownPath(world, world.locationId, 'coastal-homestead');
  return path && path.length > 1 ? path[1] : 'coastal-homestead';
}

function nextDiscoveryTarget(world) {
  const here = getLocation(world);
  const unseenNeighbor = (here.neighbors || [])
    .map((id) => getLocation(world, id))
    .find((loc) => loc && loc.exploration !== 'known');
  if (unseenNeighbor) return unseenNeighbor;

  for (const loc of world.locations) {
    if (loc.exploration !== 'known') {
      const path = findKnownPath(world, world.locationId, loc.id);
      if (path && path.length > 1) return getLocation(world, path[1]);
    }
  }
  return null;
}

function findResourceRoute(world, resourceKey) {
  let bestTarget = null;
  let bestScore = 0;

  for (const loc of world.locations) {
    if (loc.id === world.locationId || loc.exploration !== 'known') continue;
    const amount = resourceKey === 'water'
      ? loc.resources.water + (loc.freshwater ? 3 : 0)
      : (loc.resources[resourceKey] || 0);
    if (amount <= 0) continue;
    const path = findKnownPath(world, world.locationId, loc.id);
    if (!path || path.length < 2) continue;
    const hops = path.length - 1;
    const score = amount / hops;
    if (score > bestScore) {
      bestScore = score;
      bestTarget = getLocation(world, path[1]);
    }
  }
  return bestTarget;
}

function priorityBonus(priority, actionType) {
  switch (priority) {
    case 'food':
      if (actionType === 'gatherFood' || actionType === 'eat' || actionType === 'tendGarden') return 22;
      if (actionType === 'travel') return 8;
      return 0;
    case 'water':
      if (actionType === 'collectWater' || actionType === 'drink') return 22;
      if (actionType === 'travel') return 8;
      return 0;
    case 'shelter':
      if (actionType === 'repairShelter' || actionType === 'gatherWood' || actionType === 'makeFire' || actionType === 'craftTool') return 22;
      if (actionType === 'returnHome') return 12;
      return 0;
    case 'explore':
      if (actionType === 'explore' || actionType === 'travel') return 24;
      return 0;
    case 'rest':
      if (actionType === 'rest' || actionType === 'makeFire' || actionType === 'treatInjury' || actionType === 'returnHome') return 24;
      return 0;
    default:
      return 0;
  }
}

export function evaluateActions(world) {
  const s = world.survivor;
  const n = s.needs;
  const inv = s.inventory;
  const loc = getLocation(world);
  const atHome = world.locationId === 'coastal-homestead';
  const isNight = world.minute < 330 || world.minute >= 1140;
  const isRain = world.weather === 'rain';
  const isHeat = world.weather === 'heat';
  const candidates = [];

  const addCandidate = (type, score, reason, targetLocationId = null) => {
    const failureCount = s.memory.actionFailures?.[type] || 0;
    const penalty = failureCount * 12;
    const pBonus = priorityBonus(world.priority, type);
    const total = Math.round((score + pBonus - penalty) * 10) / 10;
    candidates.push({
      type,
      score: total,
      baseScore: Math.round(score),
      priorityBonus: pBonus,
      penalty,
      reason,
      targetLocationId
    });
  };

  if (inv.water > 0 && n.thirst >= 18) {
    const urgency = n.thirst >= 65 ? 98 : n.thirst >= 40 ? 68 : 34;
    addCandidate('drink', urgency + n.thirst * 0.45, 'Thirst is rising and clean water is in reserve.');
  }

  if (inv.food > 0 && n.hunger >= 22) {
    const urgency = n.hunger >= 68 ? 92 : n.hunger >= 44 ? 62 : 30;
    addCandidate('eat', urgency + n.hunger * 0.4, 'Hunger is pressing and stored rations are available.');
  }

  if (n.injury >= 10 && inv.materials > 0) {
    addCandidate('treatInjury', 58 + n.injury * 0.8, 'Clean salvage cloth can bind and protect his injury.');
  }

  if ((loc.resources.water > 0 || loc.freshwater) && inv.water < RESOURCE_CAPS.water) {
    const needWater = Math.max(0, 6 - inv.water) * 11 + n.thirst * 0.45;
    const weatherMod = isRain ? 10 : isHeat ? 14 : 0;
    addCandidate('collectWater', 26 + needWater + weatherMod, `Freshwater can be drawn at ${loc.name}.`);
  }

  if (loc.resources.food > 0 && inv.food < RESOURCE_CAPS.food) {
    const needFood = Math.max(0, 6 - inv.food) * 10 + n.hunger * 0.4;
    const nightPenalty = isNight ? -18 : 0;
    addCandidate('gatherFood', 24 + needFood + nightPenalty, `Edible greens and fruit remain around ${loc.name}.`);
  }

  if (loc.resources.wood > 0 && inv.wood < RESOURCE_CAPS.wood) {
    const lowWood = Math.max(0, 8 - inv.wood) * 6;
    const roofNeed = world.shelter.integrity < 75 ? 16 : 4;
    const nightPenalty = isNight ? -16 : 0;
    addCandidate('gatherWood', 18 + lowWood + roofNeed + nightPenalty, `Fallen timber is available at ${loc.name}.`);
  }

  if (atHome && world.shelter.integrity < 95 && inv.wood >= 2) {
    const urgency = (100 - world.shelter.integrity) * 0.72 + (isRain ? 22 : 6);
    addCandidate('repairShelter', 22 + urgency, 'The palm-thatch roof and laterite walls need reinforcement.');
  }

  if (atHome && !s.tools && inv.wood >= 1 && (inv.scrap >= 1 || inv.materials >= 1)) {
    addCandidate('craftTool', 52, 'Salvaged metal and timber can be bound into a durable hand tool.');
  }

  if (atHome && world.shelter.fireMinutes <= 30 && inv.wood >= 1 && (n.exposure >= 18 || isRain || isNight || n.morale < 55)) {
    const warmthNeed = n.exposure * 0.75 + (isRain ? 20 : 0) + (isNight ? 16 : 0) + (65 - n.morale) * 0.3;
    addCandidate('makeFire', 26 + warmthNeed, 'A dry hearth fire will drive back dampness and lift spirits.');
  }

  if (atHome && inv.seeds > 0 && (world.shelter.gardenStage || 0) < 3 && !isNight && n.energy > 40) {
    addCandidate('tendGarden', 31 + inv.seeds * 4, 'Seeds from the coast can be planted beside the stone well.');
  }

  const fatigue = (100 - n.energy) * 0.75 + n.exposure * 0.35 + n.injury * 0.5 + (isNight ? 24 : 0);
  addCandidate('rest', 14 + fatigue, isNight ? 'Night has fallen over the coast; rest restores strength.' : 'Resting in the shade recovers energy and steadies breathing.');

  if (!atHome) {
    const homeUrgency = (isNight ? 34 : 10)
      + (n.energy < 42 ? 28 : 0)
      + (n.exposure > 35 ? 24 : 0)
      + (loc.resources.food + loc.resources.water + loc.resources.wood <= 2 ? 22 : 0);
    const stepId = nextHomeStep(world);
    if (stepId) {
      addCandidate('returnHome', 20 + homeUrgency, 'Retracing the path toward the coastal homestead before conditions worsen.', stepId);
    }
  }

  const canVenture = !isNight && n.energy >= 44 && n.health >= 45 && n.thirst < 62 && n.hunger < 62 && n.injury < 45;
  if (canVenture) {
    const unseenTarget = nextDiscoveryTarget(world);
    if (unseenTarget && inv.water >= 2 && inv.food >= 2 && world.shelter.integrity >= 45) {
      const curiosity = 34 + (atHome ? 8 : 12) - (isRain ? 14 : 0);
      addCandidate('explore', curiosity, `An unmapped path leads toward ${unseenTarget.name}.`, unseenTarget.id);
    }

    const scarceResource = inv.water <= 2 ? 'water' : inv.food <= 2 ? 'food' : inv.wood <= 3 ? 'wood' : 'materials';
    const routeTarget = findResourceRoute(world, scarceResource);
    if (routeTarget) {
      const scarcityBonus = (scarceResource === 'water' || scarceResource === 'food') ? 26 : 14;
      addCandidate('travel', 24 + scarcityBonus - (isRain ? 10 : 0), `Known route toward ${routeTarget.name} for ${scarceResource}.`, routeTarget.id);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function actionDuration(world, type, targetLocationId) {
  const hasTool = world.survivor.tools;
  switch (type) {
    case 'drink': return 15;
    case 'eat': return 25;
    case 'treatInjury': return 40;
    case 'collectWater': return 45;
    case 'gatherFood': return hasTool ? 65 : 85;
    case 'gatherWood': return hasTool ? 60 : 80;
    case 'repairShelter': return hasTool ? 75 : 95;
    case 'craftTool': return 70;
    case 'makeFire': return 35;
    case 'tendGarden': return 60;
    case 'rest': return world.minute < 330 || world.minute >= 1140 ? 180 : 95;
    case 'explore':
    case 'travel':
    case 'returnHome': {
      const target = getLocation(world, targetLocationId);
      const base = target?.travelMinutes || 150;
      const navBonus = Math.min(35, (world.survivor.skills.navigation || 0) * 6);
      const weatherPenalty = world.weather === 'rain' ? 25 : world.weather === 'heat' ? 15 : 0;
      return clamp(Math.round((base - navBonus + weatherPenalty) * 0.55), 55, 190);
    }
    default: return 60;
  }
}

function startNextAction(world) {
  const evaluated = evaluateActions(world);
  world.survivor.memory.lastEvaluation = evaluated.slice(0, 6);
  const chosen = evaluated[0] || { type: 'rest', score: 10, reason: 'Waiting quietly.' };
  const duration = actionDuration(world, chosen.type, chosen.targetLocationId);
  world.activeAction = {
    type: chosen.type,
    targetLocationId: chosen.targetLocationId || null,
    remainingMinutes: duration,
    totalMinutes: duration,
    reason: chosen.reason,
    score: chosen.score
  };
}

function checkMilestones(world) {
  const m = new Set(world.milestones);
  const s = world.survivor;

  if (!m.has('water-reserve') && s.inventory.water >= 6) {
    world.milestones.push('water-reserve');
    addEvent(world, 'milestone', 'Dependable water reserve', 'Six containers of clean freshwater now sit covered beside the inner wall.', 'major');
  }
  if (!m.has('weatherproof-roof') && world.shelter.integrity >= 80) {
    world.milestones.push('weatherproof-roof');
    addEvent(world, 'milestone', 'Weatherproof homestead', 'Woven palm thatch and braced rafters now hold back the heaviest coastal squalls.', 'major');
  }
  if (!m.has('first-tool') && s.tools) {
    world.milestones.push('first-tool');
    addEvent(world, 'milestone', 'First working tool', 'With a bound iron blade and hardwood haft, timber and repair work move faster.', 'major');
  }
  const knownCount = world.locations.filter((l) => l.exploration === 'known').length;
  if (!m.has('mapped-coast') && knownCount >= 4) {
    world.milestones.push('mapped-coast');
    addEvent(world, 'milestone', 'Known coastal territory', 'Paths linking the homestead, village road, backwaters, and stone ruins are now committed to memory.', 'major');
  }
  if (!m.has('homestead-garden') && (world.shelter.gardenStage || 0) >= 3) {
    world.milestones.push('homestead-garden');
    addEvent(world, 'milestone', 'Rooted garden plot', 'Taro and greens beside the well have taken root, yielding steady nourishment at home.', 'major');
  }
}

function completeAction(world) {
  const action = world.activeAction;
  if (!action) return;
  world.activeAction = null;
  world.actionCount = (world.actionCount || 0) + 1;

  const s = world.survivor;
  const n = s.needs;
  const inv = s.inventory;
  const loc = getLocation(world);
  const type = action.type;

  const clearFailure = (t) => {
    if (s.memory.actionFailures && s.memory.actionFailures[t]) {
      delete s.memory.actionFailures[t];
    }
  };
  const recordFailure = (t) => {
    if (!s.memory.actionFailures) s.memory.actionFailures = {};
    s.memory.actionFailures[t] = (s.memory.actionFailures[t] || 0) + 1;
  };

  switch (type) {
    case 'drink': {
      if (inv.water > 0) {
        inv.water -= 1;
        n.thirst = clamp(n.thirst - 38, 0, 100);
        n.health = clamp(n.health + 2, 0, 100);
        n.morale = clamp(n.morale + 2, 0, 100);
        clearFailure('drink');
        addEvent(world, 'survival', 'Drank stored water', `He drinks measured water at ${loc.name}. ${inv.water} container${inv.water === 1 ? '' : 's'} remain.`);
      }
      break;
    }
    case 'eat': {
      if (inv.food > 0) {
        inv.food -= 1;
        n.hunger = clamp(n.hunger - 36, 0, 100);
        n.energy = clamp(n.energy + 8, 0, 100);
        n.health = clamp(n.health + 3, 0, 100);
        n.morale = clamp(n.morale + 3, 0, 100);
        clearFailure('eat');
        addEvent(world, 'survival', 'Ate a stored meal', `He eats a simple meal of coastal provisions. ${inv.food} portion${inv.food === 1 ? '' : 's'} remain.`);
      }
      break;
    }
    case 'treatInjury': {
      if (inv.materials > 0 && n.injury > 0) {
        inv.materials -= 1;
        n.injury = clamp(n.injury - 28, 0, 100);
        n.health = clamp(n.health + 6, 0, 100);
        addEvent(world, 'survival', 'Dressed injury', 'He cleans and binds the wound using salvaged cloth and boiled water.');
      }
      break;
    }
    case 'collectWater': {
      const available = loc.resources.water + (loc.freshwater ? 2 : 0);
      if (available > 0 && inv.water < RESOURCE_CAPS.water) {
        const gain = clamp(loc.freshwater ? 3 : 2, 1, RESOURCE_CAPS.water - inv.water);
        inv.water += gain;
        loc.resources.water = Math.max(0, loc.resources.water - Math.min(loc.resources.water, gain));
        n.thirst = clamp(n.thirst - 12, 0, 100);
        clearFailure('collectWater');
        addEvent(world, 'survival', 'Collected freshwater', `He fills ${gain} container${gain === 1 ? '' : 's'} from ${loc.name}.`);
      } else {
        recordFailure('collectWater');
        addEvent(world, 'survival', 'Water source low', `The seep at ${loc.name} yielded little clean water.`);
      }
      break;
    }
    case 'gatherFood': {
      const skillBonus = Math.min(0.25, s.skills.foraging * 0.03);
      if (loc.resources.food > 0 && random(world) < 0.85 + skillBonus) {
        const gain = clamp(s.tools ? 3 : 2, 1, Math.min(loc.resources.food, RESOURCE_CAPS.food - inv.food));
        inv.food += gain;
        loc.resources.food -= gain;
        if (loc.resources.seeds > 0 && inv.seeds < RESOURCE_CAPS.seeds && random(world) < 0.4) {
          inv.seeds += 1;
          loc.resources.seeds -= 1;
        }
        s.skills.foraging += 1;
        clearFailure('gatherFood');
        addEvent(world, 'survival', 'Foraged coastal food', `He gathers ${gain} portion${gain === 1 ? '' : 's'} of jackfruit, taro root, and greens at ${loc.name}.`);
      } else {
        recordFailure('gatherFood');
        s.memory.failedSearches += 1;
        addEvent(world, 'survival', 'Sparse foraging', `A careful sweep around ${loc.name} turns up little edible growth.`);
      }
      break;
    }
    case 'gatherWood': {
      if (loc.resources.wood > 0) {
        const gain = clamp(s.tools ? 4 : 2, 1, Math.min(loc.resources.wood, RESOURCE_CAPS.wood - inv.wood));
        inv.wood += gain;
        loc.resources.wood -= gain;
        if (loc.resources.scrap > 0 && inv.scrap < RESOURCE_CAPS.scrap && random(world) < 0.45) {
          inv.scrap += 1;
          loc.resources.scrap -= 1;
        }
        if (loc.resources.materials > 0 && inv.materials < RESOURCE_CAPS.materials && random(world) < 0.45) {
          inv.materials += 1;
          loc.resources.materials -= 1;
        }
        clearFailure('gatherWood');
        addEvent(world, 'survival', 'Gathered timber and salvage', `He bundles ${gain} load${gain === 1 ? '' : 's'} of dry palm fronds and timber at ${loc.name}.`);
      } else {
        recordFailure('gatherWood');
      }
      break;
    }
    case 'repairShelter': {
      const cost = Math.min(inv.wood, 2);
      if (cost > 0) {
        inv.wood -= cost;
        const boost = (s.tools ? 18 : 13) + Math.min(10, s.skills.repair * 2);
        world.shelter.integrity = clamp(world.shelter.integrity + boost, 0, 100);
        s.skills.repair += 1;
        n.morale = clamp(n.morale + 4, 0, 100);
        clearFailure('repairShelter');
        addEvent(world, 'construction', 'Reinforced the shelter', `He weaves fresh palm thatch and braces the rafters. Shelter integrity is now ${Math.round(world.shelter.integrity)}%.`);
      }
      break;
    }
    case 'craftTool': {
      if (!s.tools && inv.wood >= 1 && (inv.scrap >= 1 || inv.materials >= 1)) {
        inv.wood -= 1;
        if (inv.scrap >= 1) inv.scrap -= 1;
        else inv.materials -= 1;
        s.tools = true;
        s.skills.crafting += 1;
        n.morale = clamp(n.morale + 8, 0, 100);
        addEvent(world, 'construction', 'Crafted a hand tool', 'He lashes salvaged iron to a shaped hardwood handle, improving foraging and shelter work.', 'major');
      }
      break;
    }
    case 'makeFire': {
      if (inv.wood >= 1) {
        inv.wood -= 1;
        world.shelter.fireMinutes = clamp((world.shelter.fireMinutes || 0) + 260, 0, 480);
        n.exposure = clamp(n.exposure - 26, 0, 100);
        n.morale = clamp(n.morale + 5, 0, 100);
        addEvent(world, 'construction', 'Lit the hearth fire', 'Dry coconut husk and timber catch flame, warming the damp laterite walls.');
      }
      break;
    }
    case 'tendGarden': {
      if (inv.seeds > 0) {
        inv.seeds -= 1;
        world.shelter.gardenStage = clamp((world.shelter.gardenStage || 0) + 1, 0, 3);
        s.skills.foraging += 1;
        n.morale = clamp(n.morale + 4, 0, 100);
        if (world.shelter.gardenStage >= 3) {
          const homeLoc = getLocation(world, 'coastal-homestead');
          homeLoc.resources.food = clamp(homeLoc.resources.food + 3, 0, RESOURCE_CAPS.food);
        }
        addEvent(world, 'construction', 'Tended the wellside garden', `He turns the damp red soil beside the well and sets tubers and seeds (Stage ${world.shelter.gardenStage}/3).`);
      }
      break;
    }
    case 'rest': {
      const shelterBonus = world.locationId === 'coastal-homestead' ? (world.shelter.integrity / 100) * 14 : 4;
      const fireBonus = world.shelter.fireMinutes > 0 ? 8 : 0;
      n.energy = clamp(n.energy + 28 + shelterBonus + fireBonus, 0, 100);
      n.exposure = clamp(n.exposure - (18 + fireBonus), 0, 100);
      if (n.injury > 0) n.injury = clamp(n.injury - 6, 0, 100);
      if (n.hunger < 65 && n.thirst < 65) {
        n.health = clamp(n.health + 4, 0, 100);
      }
      addEvent(world, 'survival', 'Rested and recovered', `He rests at ${loc.name}, letting his breathing slow and strength return.`);
      break;
    }
    case 'explore':
    case 'travel':
    case 'returnHome': {
      const target = getLocation(world, action.targetLocationId);
      if (target) {
        const wasUnseen = target.exploration !== 'known';
        world.locationId = target.id;
        target.exploration = 'known';
        if (!s.memory.visited.includes(target.id)) {
          s.memory.visited.push(target.id);
        }
        s.skills.navigation += 1;

        const hazardChance = (target.risk || 0.08) + (world.weather === 'rain' ? 0.08 : 0) - Math.min(0.08, s.skills.navigation * 0.01);
        if (random(world) < hazardChance) {
          n.injury = clamp(n.injury + 14, 0, 100);
          n.health = clamp(n.health - 5, 0, 100);
          addEvent(world, 'survival', 'Slippery footing on the trail', `Wet laterite stone gives way on the route to ${target.name}, leaving a scraped knee and strained ankle.`);
        }

        if (wasUnseen) {
          s.memory.lastDiscovery = target.id;
          if (!world.discoveries.includes(target.id)) world.discoveries.push(target.id);
          n.morale = clamp(n.morale + 10, 0, 100);
          addEvent(world, 'discovery', `Discovered ${target.name}`, `${target.terrain}. ${target.discovery}`, 'major');
        } else {
          const verb = type === 'returnHome' ? 'Returned to' : 'Traveled to';
          addEvent(world, 'exploration', `${verb} ${target.name}`, `He completes the journey along the known path to ${target.name}.`);
        }
      }
      break;
    }
  }

  checkMilestones(world);
}

function advanceNewDay(world) {
  world.day += 1;
  const roll = random(world);
  const prevWeather = world.weather;
  world.weather = roll < 0.28 ? 'mist' : roll < 0.58 ? 'breeze' : roll < 0.84 ? 'rain' : 'heat';

  if (world.weather === 'rain') {
    const wear = world.survivor.tools ? 4 : 6;
    world.shelter.integrity = clamp(world.shelter.integrity - wear, 0, 100);
  } else if (world.weather === 'heat') {
    world.shelter.integrity = clamp(world.shelter.integrity - 2, 0, 100);
  }

  for (const loc of world.locations) {
    const maxR = loc.maxResources || { food: 8, water: 10, wood: 14, scrap: 3, materials: 3, seeds: 2 };
    if (world.weather === 'rain' && (loc.freshwater || loc.id === 'old-village-road')) {
      loc.resources.water = clamp(loc.resources.water + 3, 0, maxR.water);
    } else if (loc.freshwater) {
      loc.resources.water = clamp(loc.resources.water + 1, 0, maxR.water);
    }
    if (random(world) < 0.65) {
      const gardenBonus = (loc.id === 'coastal-homestead' && (world.shelter.gardenStage || 0) >= 2) ? 2 : 1;
      loc.resources.food = clamp(loc.resources.food + gardenBonus, 0, maxR.food);
    }
    if (random(world) < 0.55) {
      loc.resources.wood = clamp(loc.resources.wood + (world.weather === 'rain' ? 2 : 1), 0, maxR.wood);
    }
  }

  if (world.survivor.memory.actionFailures) {
    for (const k of Object.keys(world.survivor.memory.actionFailures)) {
      world.survivor.memory.actionFailures[k] = Math.max(0, world.survivor.memory.actionFailures[k] - 1);
      if (world.survivor.memory.actionFailures[k] === 0) delete world.survivor.memory.actionFailures[k];
    }
  }

  if (world.weather !== prevWeather) {
    const desc = {
      mist: 'Cool coastal mist settles over the coconut groves at dawn.',
      breeze: 'A steady salt breeze clears the humid air along the shore.',
      rain: 'Heavy monsoon squalls sweep in from the Arabian Sea, replenishing wells and testing the roof.',
      heat: 'Hard equatorial sun bakes the laterite earth; shade and stored water grow precious.'
    }[world.weather];
    addEvent(world, 'environment', `Weather shifted to ${world.weather}`, desc);
  }
}

function stepMinutes(world, minutes) {
  if (!world.survivor.alive || minutes <= 0) return;

  const s = world.survivor;
  const n = s.needs;
  const activeType = world.activeAction?.type || 'rest';
  const outdoor = OUTDOOR_ACTIONS.has(activeType);
  const atHome = world.locationId === 'coastal-homestead';

  const hungerRate = 0.032 * (outdoor ? 1.2 : 0.9);
  const thirstRate = 0.042 * (world.weather === 'heat' ? 1.35 : 1.0) * (outdoor ? 1.2 : 0.9);
  const energyDrain = activeType === 'rest' ? -0.12 : 0.028 * (outdoor ? 1.25 : 0.95);

  n.hunger = clamp(n.hunger + hungerRate * minutes, 0, 100);
  n.thirst = clamp(n.thirst + thirstRate * minutes, 0, 100);
  n.energy = clamp(n.energy - energyDrain * minutes, 0, 100);

  if (world.shelter.fireMinutes > 0) {
    world.shelter.fireMinutes = Math.max(0, world.shelter.fireMinutes - minutes);
  }

  const shelterCover = atHome ? world.shelter.integrity / 100 : 0.25;
  const rainExposure = world.weather === 'rain' ? (outdoor ? 0.09 : (1 - shelterCover) * 0.05) : -0.04;
  const fireWarmth = (atHome && world.shelter.fireMinutes > 0) ? -0.08 : 0;
  n.exposure = clamp(n.exposure + (rainExposure + fireWarmth) * minutes, 0, 100);

  let healthDelta = 0;
  if (n.thirst >= 88) healthDelta -= 0.055;
  if (n.hunger >= 90) healthDelta -= 0.04;
  if (n.exposure >= 85) healthDelta -= 0.035;
  if (n.injury >= 50) healthDelta -= 0.025;
  if (n.thirst < 55 && n.hunger < 60 && n.exposure < 40 && n.energy > 35) {
    healthDelta += 0.018;
  }
  n.health = clamp(n.health + healthDelta * minutes, 0, 100);

  const moraleTarget = clamp(
    72 - n.hunger * 0.22 - n.thirst * 0.25 - n.exposure * 0.2 - n.injury * 0.2 + (world.shelter.fireMinutes > 0 ? 10 : 0),
    10,
    98
  );
  n.morale = clamp(n.morale + (moraleTarget - n.morale) * 0.015 * minutes, 0, 100);

  if (n.health <= 0) {
    n.health = 0;
    s.alive = false;
    world.activeAction = null;
    addEvent(world, 'survival', 'The coast falls silent', 'After days of endurance against the elements, his strength finally gives out.', 'major');
  }
}

export function advanceSimMinutes(world, totalMinutes) {
  if (!world || !world.survivor.alive) return world;
  let remaining = clamp(finite(totalMinutes, 0), 0, MAX_SIM_MINUTES);

  while (remaining > 0 && world.survivor.alive) {
    if (!world.activeAction) {
      startNextAction(world);
    }
    const toMidnight = 1440 - world.minute;
    const toActionEnd = world.activeAction ? world.activeAction.remainingMinutes : remaining;
    const step = Math.max(0.01, Math.min(remaining, toMidnight, toActionEnd, 15));

    stepMinutes(world, step);
    world.minute += step;
    remaining -= step;

    if (world.activeAction) {
      world.activeAction.remainingMinutes -= step;
      if (world.activeAction.remainingMinutes <= 0.001 && world.survivor.alive) {
        completeAction(world);
      }
    }

    if (world.minute >= 1440) {
      world.minute -= 1440;
      if (world.survivor.alive) {
        advanceNewDay(world);
      }
    }
  }

  return world;
}

export function advanceElapsed(world, elapsedRealMs) {
  if (!world || world.paused || !world.survivor.alive) return world;
  const clampedMs = clamp(finite(elapsedRealMs, 0), 0, MAX_CATCHUP_MS);
  if (clampedMs <= 0) return world;
  const simMinutes = (clampedMs / DAY_MS) * 1440;
  return advanceSimMinutes(world, simMinutes);
}

export function pauseWorld(world, paused, now = Date.now()) {
  if (!world) return world;
  const nextPaused = Boolean(paused);
  if (!world.paused && nextPaused) {
    advanceElapsed(world, now - world.lastRealMs);
  }
  world.paused = nextPaused;
  world.lastRealMs = finite(now, Date.now());
  return world;
}

export function getActionLabel(world) {
  if (!world?.survivor?.alive) return 'At rest forever';
  const type = world.activeAction?.type;
  if (!type) return 'Listening to the coast';
  if (['explore', 'travel', 'returnHome'].includes(type) && world.activeAction.targetLocationId) {
    const target = getLocation(world, world.activeAction.targetLocationId);
    if (type === 'explore') return `Exploring toward ${target.name}`;
    if (type === 'returnHome') return `Returning to ${target.name}`;
    return `Traveling to ${target.name}`;
  }
  return ACTION_LABELS[type] || 'Working quietly';
}

export function getLongTermGoal(world) {
  if (!world?.survivor?.alive) return 'Remembered in the chronicle';
  const s = world.survivor;
  if (s.needs.thirst >= 55 || s.inventory.water < 3) return 'Keep a dependable water supply';
  if (s.needs.hunger >= 55 || s.inventory.food < 3) return 'Build a reliable food reserve';
  if (world.shelter.integrity < 70) return 'Make the coastal house weatherproof';
  if (!s.tools) return 'Fashion a durable hand tool from salvage';
  const unseen = world.locations.some((l) => l.exploration !== 'known');
  if (unseen) return 'Chart the surrounding coastal paths';
  if ((world.shelter.gardenStage || 0) < 3) return 'Establish a self-sustaining wellside garden';
  return 'Maintain a quiet, self-reliant homestead';
}

export function restoreWorld(rawInput, { now = Date.now() } = {}) {
  try {
    const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    if (!parsed || typeof parsed !== 'object') {
      return { world: createWorld({ now }), migrated: false, warning: 'Saved data was not a valid world record.' };
    }

    const base = createWorld({ now, seed: parsed.rng || parsed.seed });
    const migrated = parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.locations);

    base.day = integer(parsed.day, 1, 1, 100000);
    base.minute = clamp(finite(parsed.minute, 375), 0, 1439);
    base.paused = Boolean(parsed.paused);
    base.priority = VALID_PRIORITIES.has(parsed.priority) ? parsed.priority : 'balanced';
    base.weather = WEATHER.has(parsed.weather) ? parsed.weather : 'mist';
    base.actionCount = integer(parsed.actionCount, 0, 0);

    if (parsed.survivor && typeof parsed.survivor === 'object') {
      base.survivor.alive = parsed.survivor.alive !== false;
      base.survivor.tools = Boolean(parsed.survivor.tools);
      for (const k of Object.keys(base.survivor.needs)) {
        base.survivor.needs[k] = clamp(finite(parsed.survivor.needs?.[k], base.survivor.needs[k]), 0, 100);
      }
      for (const k of Object.keys(base.survivor.inventory)) {
        base.survivor.inventory[k] = integer(parsed.survivor.inventory?.[k], base.survivor.inventory[k], 0, RESOURCE_CAPS[k]);
      }
      for (const k of Object.keys(base.survivor.skills)) {
        base.survivor.skills[k] = integer(parsed.survivor.skills?.[k], 0, 0, 10000);
      }
      if (parsed.survivor.memory && typeof parsed.survivor.memory === 'object') {
        base.survivor.memory.failedSearches = integer(parsed.survivor.memory.failedSearches, 0, 0);
        base.survivor.memory.lastDiscovery = parsed.survivor.memory.lastDiscovery || null;
        if (Array.isArray(parsed.survivor.memory.visited)) {
          base.survivor.memory.visited = parsed.survivor.memory.visited.filter((id) => typeof id === 'string');
        }
      }
    }

    if (parsed.shelter && typeof parsed.shelter === 'object') {
      base.shelter.integrity = clamp(finite(parsed.shelter.integrity, 48), 0, 100);
      base.shelter.fireMinutes = clamp(finite(parsed.shelter.fireMinutes, 0), 0, 600);
      base.shelter.gardenStage = integer(parsed.shelter.gardenStage, 0, 0, 3);
    }

    if (Array.isArray(parsed.locations)) {
      const defaultLocs = makeLocations();
      base.locations = defaultLocs.map((defLoc) => {
        const savedLoc = parsed.locations.find((l) => l && l.id === defLoc.id);
        if (!savedLoc) return defLoc;
        return {
          ...defLoc,
          exploration: savedLoc.exploration === 'known' ? 'known' : defLoc.exploration,
          resources: {
            food: integer(savedLoc.resources?.food, defLoc.resources.food, 0, 30),
            water: integer(savedLoc.resources?.water, defLoc.resources.water, 0, 30),
            wood: integer(savedLoc.resources?.wood, defLoc.resources.wood, 0, 40),
            scrap: integer(savedLoc.resources?.scrap, defLoc.resources.scrap, 0, 20),
            materials: integer(savedLoc.resources?.materials, defLoc.resources.materials, 0, 20),
            seeds: integer(savedLoc.resources?.seeds, defLoc.resources.seeds, 0, 20)
          }
        };
      });
    }

    const validIds = new Set(base.locations.map((l) => l.id));
    base.locationId = validIds.has(parsed.locationId) ? parsed.locationId : 'coastal-homestead';

    if (Array.isArray(parsed.chronicle) && parsed.chronicle.length > 0) {
      base.chronicle = parsed.chronicle.slice(-MAX_CHRONICLE).map((e) => ({
        day: integer(e?.day, 1, 1),
        minute: integer(e?.minute, 375, 0, 1439),
        time: typeof e?.time === 'string' ? e.time : formatClock(e?.minute || 375),
        category: typeof e?.category === 'string' ? e.category : 'survival',
        importance: e?.importance === 'major' ? 'major' : 'normal',
        title: String(e?.title || 'Recorded event'),
        detail: String(e?.detail || '')
      }));
    }

    const savedRealMs = finite(parsed.lastRealMs, now);
    base.lastRealMs = finite(now, Date.now());
    if (!base.paused && base.survivor.alive && now > savedRealMs) {
      advanceElapsed(base, now - savedRealMs);
    }

    return { world: base, migrated, warning: '' };
  } catch {
    return {
      world: createWorld({ now }),
      migrated: false,
      warning: 'The saved world data was unreadable.'
    };
  }
}
