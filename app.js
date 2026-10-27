import { createLivingScene } from './living-scene.mjs';
import { actionPhase } from './world-geometry.mjs';
import {
  ACTION_LABELS,
  DAY_MS,
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  advanceElapsed,
  advanceSimMinutes,
  createWorld,
  evaluateActions,
  formatSimDate,
  getActionLabel,
  getLongTermGoal,
  pauseWorld,
  restoreWorld
} from './simulation.mjs';

const $ = (id) => document.getElementById(id);

const weatherText = {
  storm: ['Coastal squall', 'Exposed paths are dangerous. Shelter matters.', '⁚'],
  mist: ['Coastal mist', 'The air is still over the palms.', '≈'],
  breeze: ['Sea breeze', 'Salt wind moves through the palms.', '≈'],
  rain: ['Monsoon rain', 'Rain is working at the roof and the paths.', '⁚'],
  heat: ['Dry heat', 'The sun is drawing water from the soil.', '∘']
};

const categoryNames = {
  survival: 'Survival',
  exploration: 'Exploration',
  discovery: 'Discovery',
  construction: 'Building',
  environment: 'Weather',
  milestone: 'Milestone'
};

const observationText = {
  drink: 'He measures out some of the clean water he has stored.',
  collectWater: 'He draws from the freshwater source at this location.',
  eat: 'He uses one of the portions he has kept in reserve.',
  gatherFood: 'He searches nearby ground for edible greens, taro, and fallen fruit.',
  gatherWood: 'He gathers usable timber and palm fronds from this site.',
  repairShelter: 'He works palm thatch and salvaged timber into the weakened roof.',
  rest: 'He sits in the shade and lets his strength return.',
  explore: 'He follows an overgrown path into unfamiliar coastal ground.',
  travel: 'He follows a mapped route toward a known source of supplies.',
  returnHome: 'He retraces the known route toward the homestead.',
  craftTool: 'He binds a piece of old-world salvage to a shaped hardwood branch.',
  makeFire: 'He shelters dry branches under the eaves and tends the small hearth.',
  tendGarden: 'He turns the damp red earth beside the stone well and plants coastal tubers.',
  treatInjury: 'He cleans and binds the scrape using salvaged cloth and boiled water.'
};

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = getStorage();
let saveBlocked = false;
let storageWarning = '';
let migrationToast = '';
let speedMultiplier = 1;

function preserveDamagedSave(key, raw, now) {
  if (!storage) return false;
  try {
    storage.setItem(`${key}-damaged-${now}`, raw);
    return true;
  } catch {
    return false;
  }
}

function loadWorld(now = Date.now()) {
  if (!storage) {
    return {
      world: createWorld({ now }),
      warning: 'Browser storage is unavailable. The world can run, but it cannot be saved on this device.',
      blocked: true
    };
  }

  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch {
      return {
        world: createWorld({ now }),
        warning: 'Browser storage could not be read. This world may not persist.',
        blocked: true
      };
    }
    if (raw === null) continue;

    const restored = restoreWorld(raw, { now });
    if (restored.warning) {
      const backedUp = preserveDamagedSave(key, raw, now);
      return {
        world: restored.world,
        warning: backedUp
          ? `${restored.warning} A protected copy of the damaged save was kept; a fresh world is ready to save.`
          : `${restored.warning} Automatic saving is paused so the damaged save is not replaced.`,
        blocked: !backedUp
      };
    }

    if (restored.migrated || key !== SAVE_KEY) {
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(restored.world));
        if (key !== SAVE_KEY) storage.removeItem(key);
        migrationToast = 'Your previous world was carried forward into the new save format.';
      } catch {
        storageWarning = 'Your saved world loaded, but the updated save could not be written.';
      }
    }
    return { world: restored.world, warning: storageWarning, blocked: false };
  }

  return { world: createWorld({ now }), warning: '', blocked: false };
}

const loaded = loadWorld();
let world = loaded.world;
saveBlocked = loaded.blocked;
storageWarning = loaded.warning;
let filter = 'all';
let toastTimer;
let lastSaveAt = Date.now();
let renderedEventsKey = '';
let renderedRegionsKey = '';
let renderedUtilityKey = '';
let announcedEventKey = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function latestEventKey() {
  const event = world.chronicle.at(-1);
  return event ? `${event.day}:${event.minute}:${event.category}:${event.title}` : '';
}

function setSaveStatus(text, warning = false) {
  const label = $('saveLabel');
  const detail = $('saveWarning');
  if (label) label.textContent = warning ? 'Save needs attention' : text;
  if (detail) {
    detail.textContent = warning ? text : '';
    detail.hidden = !warning;
  }
}

function saveWorld({ sync = false } = {}) {
  const now = Date.now();
  if (sync && !world.paused) {
    advanceElapsed(world, (now - world.lastRealMs) * (document.hidden || now-world.lastRealMs > 5000 ? 1 : speedMultiplier));
  }
  world.lastRealMs = now;
  if (saveBlocked || !storage) {
    if (!storageWarning) storageWarning = 'Automatic saving is paused until storage is available.';
    setSaveStatus(storageWarning, true);
    return false;
  }

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(world));
    lastSaveAt = now;
    setSaveStatus(`Saved in this browser · ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    return true;
  } catch (error) {
    storageWarning = error?.name === 'QuotaExceededError'
      ? 'This browser is out of storage space.'
      : 'This browser could not save the world.';
    setSaveStatus(storageWarning, true);
    return false;
  }
}

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function setMeter(name, value) {
  const rounded = Math.round(Math.max(0, Math.min(100, value)));
  const meter = $(`${name}Meter`);
  const out = $(`${name}Value`);
  if (meter) {
    meter.value = rounded;
    meter.setAttribute('aria-valuenow', String(rounded));
  }
  if (out) out.textContent = String(rounded);
}

function shelterName(integrity) {
  if (integrity < 28) return 'Leaking coastal house';
  if (integrity < 55) return 'Worn coastal house';
  if (integrity < 80) return 'Patched coastal house';
  return 'Weatherproof homestead';
}

function gardenStageLabel(stage) {
  if (!stage || stage <= 0) return 'Unplanted';
  if (stage === 1) return 'Seeded beds (1/3)';
  if (stage === 2) return 'Sprouting taro & greens (2/3)';
  return 'Established plot (+food yield)';
}

function eventMatches(event) {
  if (filter === 'all') return true;
  if (filter === 'discovery') return event.category === 'discovery' || event.category === 'exploration';
  return event.category === filter;
}

function renderEvents() {
  const key = `${filter}|${world.chronicle.length}|${latestEventKey()}`;
  if (key === renderedEventsKey) return;
  renderedEventsKey = key;
  const entries = world.chronicle.slice().reverse().filter(eventMatches);
  const list = $('eventList');
  if (!list) return;
  const scrollTop = list.scrollTop;
  list.innerHTML = entries.map((event) => {
    const category = categoryNames[event.category] || 'Survival';
    return `<article class="event${event.importance === 'major' ? ' major' : ''}">
      <time>${escapeHtml(formatSimDate(event.day))} · ${escapeHtml(event.time)}</time>
      <div class="event-copy"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.detail)}</p><span class="event-tag">${escapeHtml(category)}</span></div>
    </article>`;
  }).join('');
  list.scrollTop = scrollTop;
  const empty = $('emptyEvents');
  if (empty) empty.hidden = entries.length !== 0;
}

function renderUtilityBreakdown() {
  const container = $('utilityList');
  if (!container) return;
  const ranked = evaluateActions(world).slice(0, 5);
  const key = ranked.map((r) => `${r.type}:${r.score}:${r.targetLocationId || ''}`).join('|');
  if (key === renderedUtilityKey) return;
  renderedUtilityKey = key;

  container.innerHTML = ranked.map((item, idx) => {
    const label = ACTION_LABELS[item.type] || item.type;
    const bonusBadge = item.priorityBonus > 0 ? ` (+${item.priorityBonus} bias)` : '';
    return `<div class="utility-item${idx === 0 ? ' top' : ''}">
      <div class="utility-row">
        <span>${idx === 0 ? '▸ ' : ''}${escapeHtml(label)}</span>
        <span class="utility-score">${item.score.toFixed(1)} pts${escapeHtml(bonusBadge)}</span>
      </div>
      <p class="utility-reason">${escapeHtml(item.reason)}</p>
    </div>`;
  }).join('');
}

function renderRegionsAndMap() {
  const key = `${world.locationId}|${world.activeAction?.targetLocationId || ''}|${world.locations.map((loc) => `${loc.id}:${loc.exploration}:${loc.resources.food}:${loc.resources.water}:${loc.resources.wood}:${loc.resources.materials}`).join('|')}`;
  if (key === renderedRegionsKey) return;
  renderedRegionsKey = key;

  const list = $('regionList');
  if (list) {
    list.innerHTML = world.locations.map((location) => {
      const known = location.exploration === 'known';
      const here = location.id === world.locationId;
      const availability = known
        ? `Available: ${location.resources.food} food, ${location.resources.water} water, ${location.resources.wood} wood, ${location.resources.materials} salvage`
        : 'Not yet explored';
      return `<article class="region${known ? ' known' : ' unknown'}${here ? ' current' : ''}">
        <span class="region-mark" aria-hidden="true"></span>
        <div class="region-copy">
          <strong>${escapeHtml(location.name)}</strong>
          <span>${known ? `${here ? 'Here now · ' : ''}${escapeHtml(location.terrain)}` : 'Unmapped territory'}</span>
          <p>${known ? `${escapeHtml(location.discovery)} ${escapeHtml(availability)}.` : 'He has not traveled to this site yet.'}</p>
        </div>
      </article>`;
    }).join('');
  }

  const svg = $('territoryMap');
  if (svg) {
    const edges = [];
    const seenPairs = new Set();
    for (const loc of world.locations) {
      const c1 = loc.coords || { x: 50, y: 50 };
      for (const nId of loc.neighbors || []) {
        const pairKey = [loc.id, nId].sort().join('--');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        const target = world.locations.find((l) => l.id === nId);
        if (!target) continue;
        const c2 = target.coords || { x: 50, y: 50 };
        const bothKnown = loc.exploration === 'known' && target.exploration === 'known';
        const activeRoute = (
          (world.locationId === loc.id && world.activeAction?.targetLocationId === target.id) ||
          (world.locationId === target.id && world.activeAction?.targetLocationId === loc.id)
        );
        edges.push(`<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${activeRoute ? '#d8bc86' : bothKnown ? 'rgba(143,179,137,0.55)' : 'rgba(231,232,215,0.16)'}" stroke-width="${activeRoute ? '1.6' : '0.9'}" stroke-dasharray="${bothKnown ? 'none' : '2 2'}" />`);
      }
    }

    const nodes = world.locations.map((loc) => {
      const c = loc.coords || { x: 50, y: 50 };
      const known = loc.exploration === 'known';
      const here = loc.id === world.locationId;
      const fill = here ? '#d8bc86' : known ? '#8fb389' : '#4a564f';
      const r = here ? 4.2 : 3.0;
      const shortName = loc.name.split(' ')[0];
      return `<g>
        ${here ? `<circle cx="${c.x}" cy="${c.y}" r="7.2" fill="rgba(216,188,134,0.2)" />` : ''}
        <circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${fill}" />
        <text x="${c.x}" y="${c.y - 6}" text-anchor="middle" fill="${known ? '#eee9dc' : '#8b968e'}" font-size="5.2" font-family="sans-serif">${escapeHtml(known ? loc.name : `${shortName} (?)`)}</text>
      </g>`;
    });

    svg.innerHTML = `<rect x="0" y="0" width="100" height="100" fill="rgba(12,20,17,0.5)" rx="4" />
      <path d="M 0 18 Q 18 45 14 100 L 0 100 Z" fill="rgba(127,178,172,0.12)" />
      <text x="4" y="92" fill="rgba(127,178,172,0.45)" font-size="4.5" font-family="sans-serif">Arabian Sea</text>
      ${edges.join('')}
      ${nodes.join('')}`;
  }
}

function render({ announce = false } = {}) {
  const weather = weatherText[world.weather] || weatherText.mist;
  const location = world.locations.find((item) => item.id === world.locationId) || world.locations[0];
  const activeType = world.activeAction?.type;
  const activity = getActionLabel(world);
  const newest = latestEventKey();
  const dayPart = world.minute < 330 || world.minute >= 1140 ? 'Night' : world.minute < 660 ? 'Morning' : world.minute < 1020 ? 'Afternoon' : 'Evening';

  $('dateLabel').textContent = `${formatSimDate(world.day)} · Day ${world.day}`;
  $('clock').textContent = `${String(Math.floor(world.minute / 60)).padStart(2, '0')}:${String(Math.floor(world.minute % 60)).padStart(2, '0')}`;
  $('dayPart').textContent = dayPart;
  $('weatherBlock').dataset.weather = world.weather;
  const worldEl = $('worldSection');
  if (worldEl) {
    worldEl.dataset.weather = world.weather;
    worldEl.dataset.daypart = dayPart;
  }
  $('weatherName').textContent = weather[0];
  $('weatherNote').textContent = weather[1];
  $('weatherIcon').textContent = weather[2];
  $('worldHeading').textContent = location.id === 'coastal-homestead' ? 'Kerala coast' : location.name;
  $('statusText').textContent = !world.survivor.alive
    ? 'His life has ended.'
    : world.paused ? 'Time is paused.'
    : world.survivor.needs.health < 28 ? 'His condition is critical.'
    : activeType ? activity
    : 'The coast is quiet.';

  $('observation').textContent = !world.survivor.alive
    ? 'The house is quiet. His last days remain in the chronicle.'
    : ['explore', 'travel', 'returnHome'].includes(activeType) && world.activeAction.targetLocationId
    ? `${activeType === 'explore' ? 'He is following an unfamiliar path toward' : activeType === 'travel' ? 'He is taking the known route toward' : 'He is returning along the known path toward'} ${world.locations.find((item) => item.id === world.activeAction.targetLocationId)?.name || 'a new area'}.`
    : activeType ? `${actionPhase(world) === 'walking' ? 'He walks to the work site. ' : ''}${observationText[activeType] || activity}. ${world.activeAction.reason}`
    : world.weather === 'rain' ? 'Rain works at the roof while he waits beneath the eaves.'
    : world.weather === 'heat' ? 'Dry heat settles over the coast. The water stores matter more now.'
    : 'He listens to the surf and the wind moving through the palms.';

  const timerEl = $('actionTimer');
  const progressEl = $('actionProgressBar');
  if (world.activeAction && world.survivor.alive) {
    const rem = Math.max(0, Math.ceil(world.activeAction.remainingMinutes));
    const tot = Math.max(1, world.activeAction.totalMinutes || 60);
    const pct = Math.max(0, Math.min(100, ((tot - world.activeAction.remainingMinutes) / tot) * 100));
    if (timerEl) timerEl.textContent = `${rem} sim min left`;
    if (progressEl) progressEl.style.width = `${pct.toFixed(1)}%`;
  } else {
    if (timerEl) timerEl.textContent = world.survivor.alive ? 'Evaluating needs' : 'Ended';
    if (progressEl) progressEl.style.width = '0%';
  }

  for (const name of ['health', 'hunger', 'thirst', 'energy']) {
    setMeter(name, world.survivor.needs[name]);
  }

  $('activity').textContent = `${activity} · ${actionPhase(world)}`;
  $('homeReserves').textContent = `${world.storage.food} food · ${world.storage.water} water`;
  $('structures').textContent = Object.entries(world.structures).filter(([,v]) => v).map(([k])=>k).join(' · ') || 'None yet';
  $('cropGrowth').textContent = world.shelter.gardenStage ? `${Math.floor(world.garden.growth)}% grown · ${Math.floor(world.garden.moisture)}% moisture` : 'No crop planted';
  $('goal').textContent = getLongTermGoal(world);
  $('morale').textContent = `${Math.round(world.survivor.needs.morale)} / 100`;
  $('exposure').textContent = `${Math.round(world.survivor.needs.exposure)} / 100`;
  $('injury').textContent = world.survivor.needs.injury < 3 ? 'None' : `Recovering · ${Math.round(world.survivor.needs.injury)} / 100`;
  $('shelter').textContent = `${shelterName(world.shelter.integrity)} · ${Math.round(world.shelter.integrity)}%`;
  $('fire').textContent = world.shelter.fireMinutes > 0 ? `Burning · ${Math.ceil(world.shelter.fireMinutes)} min left` : 'Cold';
  const gardenEl = $('garden');
  if (gardenEl) gardenEl.textContent = gardenStageLabel(world.shelter.gardenStage);

  const inventory = world.survivor.inventory;
  $('food').textContent = `${inventory.food} portion${inventory.food === 1 ? '' : 's'}`;
  $('water').textContent = `${inventory.water} container${inventory.water === 1 ? '' : 's'}`;
  $('wood').textContent = `${inventory.wood} bundle${inventory.wood === 1 ? '' : 's'}`;
  $('materials').textContent = `${inventory.materials} salvage · ${inventory.scrap} scrap · ${inventory.seeds || 0} seed${inventory.seeds === 1 ? '' : 's'}`;
  $('tools').textContent = world.survivor.tools ? 'Bound iron hand tool' : 'Not made';
  $('foragingSkill').textContent = `${world.survivor.skills.foraging} task${world.survivor.skills.foraging === 1 ? '' : 's'}`;
  $('repairSkill').textContent = `${world.survivor.skills.repair} task${world.survivor.skills.repair === 1 ? '' : 's'}`;
  $('navigationSkill').textContent = `${world.survivor.skills.navigation} route${world.survivor.skills.navigation === 1 ? '' : 's'}`;
  $('craftingSkill').textContent = `${world.survivor.skills.crafting} tool${world.survivor.skills.crafting === 1 ? '' : 's'}`;
  $('prioritySelect').value = world.priority;

  const knownCount = world.locations.filter((item) => item.exploration === 'known').length;
  $('daysSurvived').textContent = String(world.day);
  $('placesKnown').textContent = `${knownCount} / ${world.locations.length}`;
  const discovery = world.survivor.memory.lastDiscovery && world.locations.find((item) => item.id === world.survivor.memory.lastDiscovery);
  $('lastDiscovery').textContent = discovery?.name || 'None yet';
  $('simulationState').textContent = !world.survivor.alive
    ? 'Life ended'
    : world.paused
    ? 'World paused'
    : `World simulating (${speedMultiplier}×)`;
  $('stateLed').classList.toggle('paused', world.paused);
  $('stateLed').classList.toggle('dead', !world.survivor.alive);
  $('pauseButton').textContent = world.paused ? 'Resume time' : 'Pause time';
  $('pauseButton').disabled = !world.survivor.alive;

  renderEvents();
  renderUtilityBreakdown();
  renderRegionsAndMap();

  if (announce && newest && newest !== announcedEventKey) {
    const event = world.chronicle.at(-1);
    $('announcer').textContent = `${formatSimDate(event.day)}, ${event.time}. ${event.title}. ${event.detail}`;
  }
  announcedEventKey = newest;
}

/* Tab & Filter Controls */
function selectTab(button) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const selected = tab === button;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of document.querySelectorAll('[data-panel]')) {
    const selected = panel.dataset.panel === button.dataset.tab;
    panel.hidden = !selected;
  }
}

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => selectTab(button));
  button.addEventListener('keydown', (event) => {
    const tabs = [...document.querySelectorAll('[data-tab]')];
    const index = tabs.indexOf(button);
    const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
      : event.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length]
      : event.key === 'Home' ? tabs[0]
      : event.key === 'End' ? tabs.at(-1) : null;
    if (next) {
      event.preventDefault();
      next.focus();
      selectTab(next);
    }
  });
});

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    for (const option of document.querySelectorAll('[data-filter]')) {
      const active = option === button;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', String(active));
    }
    renderEvents();
  });
});

/* Speed & Step Controls */
document.querySelectorAll('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    const now = Date.now();
    if (!world.paused && world.survivor.alive) {
      advanceElapsed(world, (now - world.lastRealMs) * (document.hidden || now-world.lastRealMs > 5000 ? 1 : speedMultiplier));
    }
    world.lastRealMs = now;
    speedMultiplier = Number(button.dataset.speed) || 1;
    for (const btn of document.querySelectorAll('[data-speed]')) {
      const active = btn === button;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    render();
    showToast(`Simulation pace set to ${speedMultiplier}×.`);
  });
});

$('stepHourButton')?.addEventListener('click', () => {
  if (!world.survivor.alive) return;
  advanceSimMinutes(world, 60);
  world.lastRealMs = Date.now();
  saveWorld();
  render({ announce: true });
  showToast('Advanced 1 simulated hour.');
});

$('prioritySelect').addEventListener('change', (event) => {
  world.priority = event.target.value;
  renderedUtilityKey = '';
  saveWorld();
  showToast('Priority updated. He still chooses his own actions.');
  render();
});

$('pauseButton').addEventListener('click', () => {
  saveWorld({ sync: true });
  pauseWorld(world, !world.paused, Date.now());
  saveWorld();
  render();
});

$('saveButton').addEventListener('click', () => {
  const saved = saveWorld({ sync: true });
  render();
  showToast(saved ? 'World saved in this browser.' : 'The world could not be saved.');
});

$('exportButton')?.addEventListener('click', () => {
  try {
    const data = JSON.stringify(world, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `year-zero-day-${world.day}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported world snapshot JSON.');
  } catch {
    showToast('Could not export snapshot.');
  }
});

$('resetButton').addEventListener('click', () => {
  const bar = $('resetConfirmBar');
  if (bar) bar.hidden = !bar.hidden;
});

$('confirmResetNo')?.addEventListener('click', () => {
  const bar = $('resetConfirmBar');
  if (bar) bar.hidden = true;
});

$('confirmResetYes')?.addEventListener('click', () => {
  const bar = $('resetConfirmBar');
  if (bar) bar.hidden = true;
  world = createWorld({ now: Date.now() });
  saveBlocked = false;
  storageWarning = '';
  renderedEventsKey = '';
  renderedRegionsKey = '';
  renderedUtilityKey = '';
  saveWorld({ sync: true });
  render();
  showToast('A new world has begun on Day 1.');
});

/* Synthesized Web Audio Coastal Soundscape (Zero external audio files) */
let audioCtx = null;
let audioGain = null;
let audioEnabled = false;

function toggleCoastalAudio() {
  const btn = $('audioToggleButton');
  if (!audioEnabled) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        showToast('Web Audio is not supported in this browser.');
        return;
      }
      if (!audioCtx) {
        audioCtx = new Ctx();
        const bufferSize = audioCtx.sampleRate * 3;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.997 * b0 + white * 0.029;
          b1 = 0.985 * b1 + white * 0.032;
          b2 = 0.950 * b2 + white * 0.048;
          output[i] = (b0 + b1 + b2) * 0.35;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;

        audioGain = audioCtx.createGain();
        audioGain.gain.value = 0.12;

        noise.connect(filter);
        filter.connect(audioGain);
        audioGain.connect(audioCtx.destination);
        noise.start();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (audioGain) audioGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.2);
      audioEnabled = true;
      if (btn) {
        btn.textContent = 'Sound: On';
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      showToast('Coastal surf & rain soundscape active.');
    } catch {
      showToast('Audio could not be started.');
    }
  } else {
    if (audioGain && audioCtx) {
      audioGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.15);
    }
    audioEnabled = false;
    if (btn) {
      btn.textContent = 'Sound: Off';
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  }
}

$('audioToggleButton')?.addEventListener('click', toggleCoastalAudio);

createLivingScene($('livingCanvas'), () => world);

function update() {
  const now = Date.now();
  if (!world.paused && world.survivor.alive) {
    const elapsed = now - world.lastRealMs;
    const deltaMs = elapsed * (elapsed > 5000 || document.hidden ? 1 : speedMultiplier);
    advanceElapsed(world, deltaMs);
    render({ announce: true });
  }
  world.lastRealMs = now;
  if (now - lastSaveAt >= 10000 && !world.paused && world.survivor.alive) {
    saveWorld();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveWorld({ sync: true });
});
window.addEventListener('pagehide', () => saveWorld({ sync: true }));

if (storageWarning) setSaveStatus(storageWarning, true);
render();
if (migrationToast) showToast(migrationToast);
else if (loaded.warning) showToast(loaded.warning);
setInterval(update, 250);

// A static cache makes a previously opened world available without a connection.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
