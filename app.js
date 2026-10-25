import {
  DAY_MS,
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  advanceElapsed,
  createWorld,
  formatSimDate,
  getActionLabel,
  getLongTermGoal,
  pauseWorld,
  restoreWorld
} from './simulation.mjs';

const $ = (id) => document.getElementById(id);
const weatherText = {
  mist: ['Coastal mist', 'The air is still over the palms.', '≈'],
  breeze: ['Sea breeze', 'Salt wind moves through the palms.', '≋'],
  rain: ['Monsoon rain', 'Rain is working at the roof and the paths.', '⌁'],
  heat: ['Dry heat', 'The sun is drawing water from the soil.', '○']
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
  drink: 'He measures out some of the water he has stored.',
  collectWater: 'He draws from the freshwater source at this location.',
  eat: 'He uses one of the portions he has kept in reserve.',
  gatherFood: 'He searches nearby ground for edible greens and fallen fruit.',
  gatherWood: 'He gathers usable timber from this site.',
  repairShelter: 'He works palm thatch and salvaged timber into the weakened roof.',
  rest: 'He sits in the shade and lets his strength return.',
  explore: 'He follows an overgrown path into unfamiliar ground.',
  travel: 'He follows a mapped route toward a known source of supplies.',
  returnHome: 'He retraces the known route toward the homestead.',
  craftTool: 'He binds a piece of old-world salvage to a straight branch.',
  makeFire: 'He shelters dry branches under the eaves and tends the small hearth.'
};

function getStorage() {
  try { return window.localStorage; } catch { return null; }
}

const storage = getStorage();
let saveBlocked = false;
let storageWarning = '';
let migrationToast = '';

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
    try { raw = storage.getItem(key); } catch {
      return { world: createWorld({ now }), warning: 'Browser storage could not be read. This world may not persist after you leave.', blocked: true };
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
        storageWarning = 'Your saved world loaded, but the updated save could not be written. Check this browser’s available storage.';
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
let announcedEventKey = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function latestEventKey() {
  const event = world.chronicle.at(-1);
  return event ? `${event.day}:${event.minute}:${event.category}:${event.title}` : '';
}

function setSaveStatus(text, warning = false) {
  const label = $('saveLabel');
  const detail = $('saveWarning');
  label.textContent = warning ? 'Save needs attention' : text;
  detail.textContent = warning ? text : '';
  detail.hidden = !warning;
}

function saveWorld({ sync = false } = {}) {
  const now = Date.now();
  if (sync && !world.paused) advanceElapsed(world, now - world.lastRealMs);
  world.lastRealMs = now;
  if (saveBlocked || !storage) {
    if (!storageWarning) storageWarning = 'Automatic saving is paused until the damaged save is backed up or you confirm a restart.';
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
      ? 'This browser is out of storage space. Free some space before relying on a save.'
      : 'This browser could not save the world. It will remain in memory until you leave.';
    setSaveStatus(storageWarning, true);
    return false;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function setMeter(name, value) {
  const rounded = Math.round(Math.max(0, Math.min(100, value)));
  const meter = $(`${name}Meter`);
  meter.value = rounded;
  meter.setAttribute('aria-valuenow', String(rounded));
  $(`${name}Value`).textContent = String(rounded);
}

function shelterName(integrity) {
  if (integrity < 28) return 'Leaking coastal house';
  if (integrity < 55) return 'Worn coastal house';
  if (integrity < 80) return 'Patched coastal house';
  return 'Weatherproof homestead';
}

function eventMatches(event) {
  if (filter === 'all') return true;
  if (filter === 'discovery') return event.category === 'discovery' || event.category === 'exploration';
  return event.category === filter;
}

function renderEvents() {
  const key = `${filter}|${world.chronicle.map((event) => `${event.day}:${event.minute}:${event.category}:${event.title}`).join('|')}`;
  if (key === renderedEventsKey) return;
  renderedEventsKey = key;
  const entries = world.chronicle.slice().reverse().filter(eventMatches);
  const list = $('eventList');
  const scrollTop = list.scrollTop;
  list.innerHTML = entries.map((event) => {
    const category = categoryNames[event.category] || 'Survival';
    return `<article class="event${event.importance === 'major' ? ' major' : ''}">
      <time>${escapeHtml(formatSimDate(event.day))} · ${escapeHtml(event.time)}</time>
      <div class="event-copy"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.detail)}</p><span class="event-category">${escapeHtml(category)}</span></div>
    </article>`;
  }).join('');
  list.scrollTop = scrollTop;
  $('emptyEvents').hidden = entries.length !== 0;
}

function renderRegions() {
  const key = `${world.locationId}|${world.locations.map((location) => `${location.id}:${location.exploration}:${JSON.stringify(location.resources)}`).join('|')}`;
  if (key === renderedRegionsKey) return;
  renderedRegionsKey = key;
  $('regionList').innerHTML = world.locations.map((location) => {
    const known = location.exploration === 'known';
    const here = location.id === world.locationId;
    const availability = known
      ? `Available nearby: ${location.resources.food} food, ${location.resources.water} water, ${location.resources.wood} wood.`
      : 'Not yet explored';
    return `<article class="region${known ? ' known' : ' unknown'}${here ? ' current' : ''}">
      <span class="region-mark" aria-hidden="true"></span>
      <div class="region-copy"><strong>${escapeHtml(location.name)}</strong><span>${known ? `${here ? 'Here now · ' : ''}Known · ${escapeHtml(location.region)}` : 'Unexplored'}</span>
      ${known ? `<small>${escapeHtml(location.terrain)}. ${escapeHtml(location.discovery)} ${escapeHtml(availability)}</small>` : '<small>The path beyond the known coast remains unrecorded.</small>'}</div>
    </article>`;
  }).join('');
}

function render({ announce = false } = {}) {
  const weather = weatherText[world.weather] || weatherText.mist;
  const location = world.locations.find((item) => item.id === world.locationId) || world.locations[0];
  const activeType = world.activeAction?.type;
  const activity = getActionLabel(world);
  const newest = latestEventKey();

  $('dateLabel').textContent = `${formatSimDate(world.day)} · Day ${world.day}`;
  $('clock').textContent = `${String(Math.floor(world.minute / 60)).padStart(2, '0')}:${String(Math.floor(world.minute % 60)).padStart(2, '0')}`;
  $('dayPart').textContent = world.minute < 300 || world.minute >= 1140 ? 'Night' : world.minute < 660 ? 'Morning' : world.minute < 960 ? 'Afternoon' : 'Evening';
  $('weatherBlock').dataset.weather = world.weather;
  document.querySelector('.world').dataset.weather = world.weather;
  $('weatherName').textContent = weather[0];
  $('weatherNote').textContent = weather[1];
  $('weatherIcon').textContent = weather[2];
  $('worldHeading').textContent = location.id === 'coastal-homestead' ? 'Kerala coast' : location.name;
  $('statusText').textContent = !world.survivor.alive
    ? 'His life has ended.'
    : world.paused ? 'Time has stopped.'
      : world.survivor.needs.health < 28 ? 'His condition is critical.'
        : activeType ? activity
          : 'The coast is quiet.';
  $('observation').textContent = !world.survivor.alive
    ? 'The house is quiet. His last days remain in the chronicle.'
    : ['explore', 'travel', 'returnHome'].includes(activeType) && world.activeAction.targetLocationId
      ? `${activeType === 'explore' ? 'He is following an unfamiliar path toward' : activeType === 'travel' ? 'He is following the mapped route toward' : 'He is retracing the route toward'} ${world.locations.find((item) => item.id === world.activeAction.targetLocationId)?.name || 'the next location'}.`
      : activeType ? observationText[activeType] || activity
        : world.weather === 'rain' ? 'Rain works at the roof while he waits beneath the eaves.'
          : world.weather === 'heat' ? 'Dry heat settles over the coast. The water stores matter more now.'
            : 'He listens to the surf and the wind moving through the palms.';

  for (const name of ['health', 'hunger', 'thirst', 'energy']) setMeter(name, world.survivor.needs[name]);
  $('activity').textContent = activity;
  $('goal').textContent = getLongTermGoal(world);
  $('morale').textContent = `${Math.round(world.survivor.needs.morale)} / 100`;
  $('exposure').textContent = `${Math.round(world.survivor.needs.exposure)} / 100`;
  $('injury').textContent = world.survivor.needs.injury < 3 ? 'None' : `Recovering · ${Math.round(world.survivor.needs.injury)} / 100`;
  $('shelter').textContent = `${shelterName(world.shelter.integrity)} · ${Math.round(world.shelter.integrity)}%`;
  $('fire').textContent = world.shelter.fireMinutes > 0 ? `Burning · ${Math.ceil(world.shelter.fireMinutes)} min left` : 'Cold';
  const inventory = world.survivor.inventory;
  $('food').textContent = `${inventory.food} portion${inventory.food === 1 ? '' : 's'}`;
  $('water').textContent = `${inventory.water} container${inventory.water === 1 ? '' : 's'}`;
  $('wood').textContent = `${inventory.wood} bundle${inventory.wood === 1 ? '' : 's'}`;
  $('materials').textContent = `${inventory.materials} salvage · ${inventory.scrap} scrap`;
  $('tools').textContent = world.survivor.tools ? 'Crude hand tool' : 'Not made';
  $('foragingSkill').textContent = `${world.survivor.skills.foraging} task${world.survivor.skills.foraging === 1 ? '' : 's'}`;
  $('repairSkill').textContent = `${world.survivor.skills.repair} task${world.survivor.skills.repair === 1 ? '' : 's'}`;
  $('navigationSkill').textContent = `${world.survivor.skills.navigation} route${world.survivor.skills.navigation === 1 ? '' : 's'}`;
  $('craftingSkill').textContent = `${world.survivor.skills.crafting} tool${world.survivor.skills.crafting === 1 ? '' : 's'}`;
  $('prioritySelect').value = world.priority;

  $('daysSurvived').textContent = String(world.day);
  $('placesKnown').textContent = String(world.locations.filter((item) => item.exploration === 'known').length);
  const discovery = world.survivor.memory.lastDiscovery && world.locations.find((item) => item.id === world.survivor.memory.lastDiscovery);
  $('lastDiscovery').textContent = discovery?.name || 'None yet';
  $('simulationState').textContent = !world.survivor.alive ? 'Life ended' : world.paused ? 'World paused' : 'World simulating';
  $('stateLed').classList.toggle('paused', world.paused);
  $('stateLed').classList.toggle('dead', !world.survivor.alive);
  $('pauseButton').textContent = world.paused ? 'Resume time' : 'Pause time';
  $('pauseButton').disabled = !world.survivor.alive;
  renderEvents();
  renderRegions();

  if (announce && newest && newest !== announcedEventKey) {
    const event = world.chronicle.at(-1);
    $('announcer').textContent = `${formatSimDate(event.day)}, ${event.time}. ${event.title}. ${event.detail}`;
  }
  announcedEventKey = newest;
}

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

$('prioritySelect').addEventListener('change', (event) => {
  world.priority = event.target.value;
  saveWorld();
  showToast('Priority updated. He still chooses his own actions.');
  render();
});

$('pauseButton').addEventListener('click', () => {
  pauseWorld(world, !world.paused, Date.now());
  saveWorld();
  render();
});

$('saveButton').addEventListener('click', () => {
  const saved = saveWorld({ sync: true });
  render();
  showToast(saved ? 'World saved in this browser.' : 'The world could not be saved. See the notice below.');
});

$('resetButton').addEventListener('click', () => {
  if (!window.confirm('Restart Year Zero? This replaces the saved world in this browser.')) return;
  world = createWorld({ now: Date.now() });
  saveBlocked = false;
  storageWarning = '';
  if (storage) {
    for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
      try { storage.removeItem(key); } catch {}
    }
  }
  setSaveStatus('A new world is ready.');
  saveWorld();
  render();
  showToast('A new beginning on the Kerala coast.');
});

function update() {
  const now = Date.now();
  const previousEvent = latestEventKey();
  if (!world.paused && world.survivor.alive) advanceElapsed(world, now - world.lastRealMs);
  world.lastRealMs = now;
  const currentEvent = latestEventKey();
  render({ announce: currentEvent !== previousEvent });
  if (now - lastSaveAt >= 5000) saveWorld();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveWorld({ sync: true });
});
window.addEventListener('pagehide', () => saveWorld({ sync: true }));

if (storageWarning) setSaveStatus(storageWarning, true);
render();
if (migrationToast) showToast(migrationToast);
else if (loaded.warning) showToast(loaded.warning);
setInterval(update, 1000);
