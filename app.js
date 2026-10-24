(() => {
  "use strict";
  const SAVE_KEY = "yearZeroSaveV1";
  const DAY_MS = 15 * 60 * 1000;
  const HOUR_MS = DAY_MS / 24;
  const MAX_OFFLINE_MS = 7 * DAY_MS;
  const $ = (id) => document.getElementById(id);
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

  const initialState = () => ({
    version: 1,
    createdAt: Date.now(),
    lastRealTime: Date.now(),
    simMs: 6 * HOUR_MS,
    paused: false,
    soundOn: false,
    survivor: { name: "The survivor", hunger: 34, thirst: 27, health: 100, energy: 78, food: 3, water: 2, wood: 0, scrap: 0, mood: "Quietly determined", alive: true },
    world: { weather: "Overcast", temperature: 29, rain: false, shelter: "Abandoned house", foodSource: "Foraging", waterSource: "Old well", structures: ["Abandoned house"], knownRegions: ["Coastal Kerala"], discoveries: [], dayCount: 1, build: null, currentLocation: "The old house" },
    log: [
      { at: 6, day: 1, type: "BEGINNING", title: "The first morning", text: "He wakes beneath a roof that leaks in three places. Beyond the veranda, the village is quiet. He has not yet decided whether quiet is a comfort or a warning." },
      { at: 6.4, day: 1, type: "OBSERVATION", title: "The well", text: "The old well is still there, half-hidden by weeds. He tests the rope before drawing water. It holds." }
    ],
    nextEventAt: 7.2,
    eventCount: 2,
    lastAction: "Looking over the abandoned yard",
    historyExpanded: false
  });

  let state;
  let audioContext = null;
  let toastTimer = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return initialState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.survivor || !parsed.world || !Array.isArray(parsed.log)) return initialState();
      return parsed;
    } catch (_) { return initialState(); }
  }
  function saveState() {
    state.lastRealTime = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function dateParts(simMs) {
    const totalHours = Math.floor(simMs / HOUR_MS);
    return { day: Math.floor(totalHours / 24) + 1, hour: totalHours % 24, minute: Math.floor((simMs % HOUR_MS) / HOUR_MS * 60) };
  }
  function timeString(simMs) {
    const p = dateParts(simMs);
    return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  }
  function dayPart(hour) {
    if (hour < 5) return "NIGHT";
    if (hour < 8) return "DAWN";
    if (hour < 12) return "MORNING";
    if (hour < 16) return "AFTERNOON";
    if (hour < 19) return "DUSK";
    return "NIGHT";
  }
  function addEvent(type, title, text, at = state.simMs / HOUR_MS) {
    const p = dateParts(at * HOUR_MS);
    state.log.unshift({ at, day: p.day, type, title, text });
    if (state.log.length > 250) state.log.length = 250;
    state.eventCount++;
    if (state.log.length % 5 === 0) saveState();
  }
  function changeMood() {
    const s = state.survivor;
    if (s.health < 30 || s.thirst > 80 || s.hunger > 85) s.mood = "Struggling";
    else if (s.energy < 20) s.mood = "Exhausted";
    else if (state.world.discoveries.length > 2) s.mood = "Quietly hopeful";
    else s.mood = "Quietly determined";
  }

  function actionEvent(action) {
    const s = state.survivor, w = state.world;
    const hour = dateParts(state.simMs).hour;
    const at = state.simMs / HOUR_MS;
    switch (action) {
      case "drink":
        if (s.water > 0) {
          s.water--; s.thirst = clamp(s.thirst - 35);
          addEvent("SURVIVAL", "A little water", "He drinks slowly, saving what remains. The old well is useful, but he will need a safer way to store water.", at);
        } else if (w.rain) {
          s.thirst = clamp(s.thirst - 18);
          addEvent("WEATHER", "Rainwater", "He catches rain in a dented metal bowl and drinks what he can. The rain will not last forever.", at);
        } else {
          addEvent("NEED", "The empty vessel", "He checks the water container again. It is empty. He turns toward the old well.", at);
        }
        break;
      case "eat":
        if (s.food > 0) {
          s.food--; s.hunger = clamp(s.hunger - 32);
          addEvent("SURVIVAL", "A simple meal", "He eats what he has saved. It is not much, but the ache in his stomach eases.", at);
        } else {
          addEvent("NEED", "Nothing left to eat", "He searches his bag, then the kitchen shelf. There is nothing useful left. Tomorrow's food will have to be found outside.", at);
        }
        break;
      case "forage":
        s.energy = clamp(s.energy - 8); s.hunger = clamp(s.hunger + 5);
        if (Math.random() < 0.74) {
          const found = 1 + (Math.random() < .24 ? 1 : 0);
          s.food += found;
          addEvent("GATHERING", "Food from the overgrowth", `He searches the neglected garden and the trees beyond it. He finds ${found} ${found === 1 ? "small portion" : "portions"} of edible food, after checking carefully what is safe.`, at);
        } else {
          addEvent("GATHERING", "A wasted morning", "He searches the garden and the edges of the village, but finds nothing he trusts enough to eat.", at);
        }
        break;
      case "collect-water":
        s.energy = clamp(s.energy - 5);
        if (Math.random() < .8) {
          const found = 1 + (w.rain ? 2 : (Math.random() < .3 ? 1 : 0));
          s.water += found;
          addEvent("GATHERING", "Water recovered", `He draws water from the old well and sets aside ${found} ${found === 1 ? "container" : "containers"}. The rope creaks, but holds.`, at);
        } else {
          addEvent("DISCOVERY", "The well needs work", "The water looks cloudy. He decides not to drink it until he can boil it or find a better way to filter it.", at);
        }
        break;
      case "gather-wood": {
        const amount = 1 + (Math.random() < .45 ? 1 : 0);
        s.wood += amount; s.energy = clamp(s.energy - 11); s.hunger = clamp(s.hunger + 4);
        addEvent("GATHERING", "Wood for repairs", `He gathers ${amount} ${amount === 1 ? "bundle" : "bundles"} of fallen branches and usable timber. He avoids the rotten beams inside the nearest ruined house.`, at);
        break;
      }
      case "search-ruins":
        s.energy = clamp(s.energy - 13); s.hunger = clamp(s.hunger + 5);
        if (Math.random() < .66) {
          const scrap = 1 + (Math.random() < .35 ? 1 : 0);
          s.scrap += scrap;
          addEvent("EXPLORATION", "Something worth keeping", `Inside a house half-swallowed by vines, he finds ${scrap} ${scrap === 1 ? "piece" : "pieces"} of metal and hardware. The rest has rusted beyond use.`, at);
          if (!w.discoveries.includes("Abandoned village")) {
            w.discoveries.push("Abandoned village");
            addEvent("DISCOVERY", "The village has a name", "A cracked sign lies beside the road. Most of the lettering is gone, but the place is now a little less anonymous.", at + .01);
          }
        } else {
          addEvent("EXPLORATION", "The ruined house", "He searches a nearby house. The roof has collapsed and the rooms smell of wet timber. He leaves with nothing but dust on his hands.", at);
        }
        break;
      case "rest":
        s.energy = clamp(s.energy + 28); s.health = clamp(s.health + 2);
        addEvent("REST", "Rest beneath the old roof", "He lies down while rain ticks against the tiles. For a while, there is no work to do and nowhere he needs to be.", at);
        break;
      case "repair":
        if (s.wood >= 2) {
          s.wood -= 2; s.energy = clamp(s.energy - 9); w.shelter = "Repaired house";
          if (!w.structures.includes("Repaired house")) w.structures.push("Repaired house");
          addEvent("CONSTRUCTION", "The roof holds", "He replaces two rotten supports and patches a gap in the roof. The house is still old, but the next rain may stay outside.", at);
        } else {
          addEvent("WORK", "A repair postponed", "He inspects the damaged roof. He needs more sound timber before he can make a repair that will last.", at);
        }
        break;
      case "rain-collector":
        if (s.wood >= 3 && s.scrap >= 1) {
          s.wood -= 3; s.scrap -= 1; s.energy = clamp(s.energy - 12);
          w.structures.push("Rainwater collector");
          w.waterSource = "Well + rain collector";
          addEvent("CONSTRUCTION", "A rainwater collector", "Using timber, scrap metal and a piece of guttering, he builds a crude collector beside the house. It will only help when the rain returns.", at);
        } else {
          addEvent("WORK", "A plan for rain", "He studies the roofline and imagines a way to catch rainwater. He needs three bundles of wood and a usable piece of scrap metal.", at);
        }
        break;
      case "travel":
        s.energy = clamp(s.energy - 18); s.hunger = clamp(s.hunger + 8); s.thirst = clamp(s.thirst + 6);
        if (!w.knownRegions.includes("The inland road")) {
          w.knownRegions.push("The inland road");
          w.currentLocation = "The inland road";
          addEvent("EXPLORATION", "Beyond the last houses", "He follows the broken road inland, past empty courtyards and a bus tilted into the weeds. For the first time, the abandoned village is behind him.", at);
          addEvent("DISCOVERY", "The inland road", "A road leads toward the hills. It is cracked and overgrown, but it still points somewhere. The world may be larger than this village.", at + .02);
        } else if (!w.knownRegions.includes("The old market town")) {
          w.knownRegions.push("The old market town");
          w.currentLocation = "The old market town";
          addEvent("EXPLORATION", "The old market town", "After a long walk, he reaches a small market town. Shopfronts stand open to the weather. He will need to plan carefully before coming this far again.", at);
          addEvent("DISCOVERY", "A wider world", "The town opens a new horizon: more buildings, more possible supplies, and a longer journey home.", at + .02);
        } else {
          w.currentLocation = pick(["The old house", "The inland road", "The old market town"], state.eventCount);
          addEvent("TRAVEL", "A road walked again", `He travels back toward ${w.currentLocation.toLowerCase()}, carrying what he can and leaving the rest for another day.`, at);
        }
        break;
      case "sleep":
        s.energy = clamp(s.energy + 45); s.hunger = clamp(s.hunger + 8); s.thirst = clamp(s.thirst + 7);
        addEvent("REST", "Night settles", "He makes the house as secure as he can, then sleeps. Outside, the palms move in the wind and the empty road remains empty.", at);
        break;
      case "weather":
        addEvent("WEATHER", w.rain ? "The monsoon returns" : "The rain passes", w.rain ? "Rain moves in from the sea, soaking the red earth and dripping from the broken eaves." : "The rain thins to a distant grey curtain. The air remains heavy and warm.", at);
        break;
      case "autonomous":
        autonomousAction();
        break;
    }
    changeMood();
    updateSceneForLocation();
  }

  function autonomousAction() {
    const s = state.survivor, w = state.world, hour = dateParts(state.simMs).hour;
    // Priorities are needs first, then safety, then useful work and exploration.
    if (s.thirst > 68) { actionEvent("drink"); if (s.thirst > 60 && s.water === 0) actionEvent("collect-water"); return; }
    if (s.hunger > 70) { actionEvent("eat"); if (s.food === 0) actionEvent("forage"); return; }
    if (s.energy < 18) { actionEvent("sleep"); return; }
    if (s.health < 55 && s.energy < 50) { actionEvent("rest"); return; }
    if (hour >= 21 || hour < 5) { actionEvent("sleep"); return; }
    if (w.shelter === "Abandoned house" && s.wood >= 2 && Math.random() < .65) { actionEvent("repair"); return; }
    if (!w.structures.includes("Rainwater collector") && s.wood >= 3 && s.scrap >= 1 && Math.random() < .55) { actionEvent("rain-collector"); return; }
    const roll = Math.random();
    if (s.water < 2 || (w.rain && Math.random() < .25)) actionEvent("collect-water");
    else if (s.food < 3) actionEvent("forage");
    else if (s.wood < 3 && Math.random() < .6) actionEvent("gather-wood");
    else if (s.scrap < 1 || roll < .24) actionEvent("search-ruins");
    else if (!w.knownRegions.includes("The inland road") && state.eventCount > 10 && s.energy > 45 && Math.random() < .24) actionEvent("travel");
    else if (roll < .62) actionEvent("gather-wood");
    else actionEvent("rest");
  }

  function processHour() {
    const s = state.survivor, w = state.world;
    const p = dateParts(state.simMs);
    // Passive survival costs per simulated hour.
    s.hunger = clamp(s.hunger + 1.45);
    s.thirst = clamp(s.thirst + (w.temperature >= 31 ? 2.1 : 1.55));
    if (s.hunger >= 92) s.health = clamp(s.health - 1.4);
    if (s.thirst >= 90) s.health = clamp(s.health - 2.3);
    if (w.rain && w.structures.includes("Rainwater collector")) {
      if (Math.random() < .16) { s.water += 1; addEvent("WORLD", "The collector fills", "Rainwater drips into the container beside the house. A small improvement, quietly doing its work.", state.simMs / HOUR_MS); }
    }
    if (w.build) {
      w.build.progress += 1;
      if (w.build.progress >= w.build.hours) {
        const name = w.build.name;
        if (!w.structures.includes(name)) w.structures.push(name);
        w.build = null;
        addEvent("CONSTRUCTION", `${name} completed`, `After hours of steady work, he finishes ${name.toLowerCase()}. The settlement is a little more capable than it was yesterday.`, state.simMs / HOUR_MS);
      }
    }
    if (Math.random() < .08) {
      const wasRain = w.rain;
      w.rain = Math.random() < .34;
      w.weather = w.rain ? "Monsoon rain" : pick(["Overcast", "Humid", "Clearing"], p.day + p.hour);
      w.temperature = w.rain ? 26 + Math.floor(Math.random() * 3) : 28 + Math.floor(Math.random() * 5);
      if (wasRain !== w.rain) actionEvent("weather");
    }
    // The survivor makes a meaningful decision roughly every 1–2.5 simulated hours.
    if (state.simMs / HOUR_MS >= state.nextEventAt) {
      autonomousAction();
      state.nextEventAt = state.simMs / HOUR_MS + 1.1 + Math.random() * 1.5;
    }
    if (p.hour === 0) {
      w.dayCount = p.day;
      if (p.day % 7 === 0) addEvent("PASSAGE OF TIME", `A week without a voice`, `Seven days have passed. The weather has changed, supplies have been used, and the world remains without an answer.`, state.simMs / HOUR_MS);
    }
  }

  function advanceSimulation(deltaMs) {
    if (deltaMs <= 0 || state.paused) return;
    const startMs = state.simMs;
    const targetMs = startMs + deltaMs;
    const beforeHour = Math.floor(startMs / HOUR_MS);
    const afterHour = Math.floor(targetMs / HOUR_MS);
    const steps = Math.min(afterHour - beforeHour, 7 * 24);
    for (let i = 1; i <= steps; i++) {
      // Process at each crossed hour; this also keeps offline catch-up bounded.
      const simulatedHour = beforeHour + i;
      state.simMs = simulatedHour * HOUR_MS;
      processHour();
    }
    state.simMs = targetMs;
    changeMood();
  }

  function updateSceneForLocation() {
    const w = state.world;
    const map = {
      "The old house": ["KERALA · COASTAL SETTLEMENT", "The old house", "A red-tiled roof. A well gone green. The sea beyond the palms, with no ship on it.", "LOCATION 001 · ORIGIN"],
      "The inland road": ["KERALA · INLAND ROAD", "Beyond the last houses", "The road leads inland through weeds and abandoned courtyards. Somewhere beyond the trees, the hills rise.", "LOCATION 002 · DISCOVERED"],
      "The old market town": ["KERALA · OLD MARKET TOWN", "The silent market", "Shopfronts stand open to the weather. A place built for crowds, now waiting for footsteps.", "LOCATION 003 · DISCOVERED"]
    };
    const view = map[w.currentLocation] || map["The old house"];
    $("region-label").textContent = view[0];
    $("scene-title").textContent = view[1];
    $("scene-description").textContent = view[2];
    $("scene-kicker").textContent = view[3];
    $("weather-label").textContent = `${w.weather.toUpperCase()} · ${w.temperature}°C`;
    const figure = $("figure");
    if (w.currentLocation === "The inland road") figure.style.left = "68%";
    else if (w.currentLocation === "The old market town") figure.style.left = "49%";
    else figure.style.left = "57%";
    document.querySelector(".world-stage").classList.toggle("rainy", w.rain);
  }

  function renderEvents() {
    const target = $("chronicle");
    const events = state.log.slice(0, state.historyExpanded ? 50 : 6);
    target.innerHTML = events.map(e => {
      const at = Math.max(0, e.at * HOUR_MS);
      const p = dateParts(at);
      return `<article class="event"><div class="event-time">DAY ${String(e.day).padStart(2,"0")}<span class="event-type">${escapeHtml(e.type)}</span></div><div><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.text)}</p></div></article>`;
    }).join("");
    $("show-history").textContent = state.historyExpanded ? "SHOW RECENT EVENTS ↑" : "VIEW EARLIER EVENTS ↗";
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  }
  function renderRegions() {
    const known = state.world.knownRegions;
    const cards = known.map((name, i) => {
      const desc = name === "Coastal Kerala" ? "The old house, well, village gardens and the edge of the sea." : name === "The inland road" ? "A broken road leading away from the coast, lined with empty homes." : "A small town of abandoned shops, storage rooms and weathered buildings.";
      return `<article class="region-card"><span class="region-number">KNOWN REGION 00${i+1}</span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(desc)}</p></article>`;
    });
    if (known.length < 3) cards.push(`<article class="region-card unknown"><span class="region-number">BEYOND THE HORIZON</span><h3>Unknown</h3><p>No record yet. The world ends where his knowledge does.</p></article>`);
    $("regions").innerHTML = cards.join("");
    $("regions-count").textContent = `${known.length} REGION${known.length === 1 ? "" : "S"} KNOWN`;
  }
  function render() {
    const s = state.survivor, w = state.world, p = dateParts(state.simMs);
    $("sim-date").textContent = `YEAR ${Math.floor((p.day - 1) / 365) + 1} · DAY ${p.day}`;
    $("time-label").textContent = timeString(state.simMs);
    $("day-progress").style.width = `${(state.simMs % DAY_MS) / DAY_MS * 100}%`;
    $("hunger-value").textContent = `${Math.round(s.hunger)}%`; $("hunger-bar").style.width = `${s.hunger}%`;
    $("thirst-value").textContent = `${Math.round(s.thirst)}%`; $("thirst-bar").style.width = `${s.thirst}%`;
    $("health-value").textContent = `${Math.round(s.health)}%`; $("health-bar").style.width = `${s.health}%`;
    $("energy-value").textContent = `${Math.round(s.energy)}%`; $("energy-bar").style.width = `${s.energy}%`;
    ["food","water","wood","scrap"].forEach(k => $(`${k}-value`).textContent = s[k]);
    $("survivor-mood").textContent = s.mood;
    $("shelter-value").textContent = w.shelter;
    $("food-source").textContent = w.foodSource;
    $("water-source").textContent = w.waterSource;
    $("structure-count").textContent = w.structures.length;
    $("pause-button").textContent = state.paused ? "RESUME" : "PAUSE";
    $("sound-button").textContent = state.soundOn ? "SOUND ON" : "SOUND OFF";
    $("world-status").textContent = state.paused ? "WORLD PAUSED" : "WORLD SIMULATING";
    $("real-clock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    if (w.build) {
      $("build-progress-wrap").hidden = false;
      $("build-name").textContent = w.build.name;
      const percent = Math.min(100, Math.round(w.build.progress / w.build.hours * 100));
      $("build-percent").textContent = `${percent}%`; $("build-bar").style.width = `${percent}%`;
    } else $("build-progress-wrap").hidden = true;
    updateSceneForLocation(); renderEvents(); renderRegions();
  }

  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function catchUp() {
    const now = Date.now();
    const last = Number(state.lastRealTime || now);
    const elapsed = Math.max(0, Math.min(now - last, MAX_OFFLINE_MS));
    if (elapsed > 60 * 1000 && !state.paused) {
      advanceSimulation(elapsed);
      const days = elapsed / DAY_MS;
      if (days >= .95) addEvent("RETURN", "Time passed without a witness", `While nobody was here, approximately ${days.toFixed(1)} simulated day${days >= 1.95 ? "s" : ""} passed. He continued with the work and needs of an ordinary life.`, state.simMs / HOUR_MS);
      else addEvent("RETURN", "The world kept time", "Some time passed while the page was closed. His needs and the world have been updated from the elapsed time.", state.simMs / HOUR_MS);
    }
    state.lastRealTime = now;
    saveState();
  }
  function resetWorld() {
    if (!confirm("Start a new world? This permanently erases the saved Year Zero simulation in this browser.")) return;
    state = initialState(); saveState(); render(); toast("A new world begins.");
  }
  function toggleSound() {
    state.soundOn = !state.soundOn;
    if (state.soundOn) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioContext = audioContext || new AudioCtx();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = "sine"; oscillator.frequency.value = 68;
          gain.gain.value = 0.018; oscillator.connect(gain); gain.connect(audioContext.destination);
          oscillator.start(); oscillator.stop(audioContext.currentTime + 0.18);
        }
      } catch (_) {}
      toast("Ambient sound is experimental and minimal.");
    }
    saveState(); render();
  }

  state = loadState();
  catchUp();
  render();

  $("pause-button").addEventListener("click", () => {
    state.paused = !state.paused; saveState(); render();
    toast(state.paused ? "The simulation is paused." : "The world resumes.");
  });
  $("sound-button").addEventListener("click", toggleSound);
  $("reset-button").addEventListener("click", resetWorld);
  $("show-history").addEventListener("click", () => { state.historyExpanded = !state.historyExpanded; renderEvents(); });
  window.addEventListener("beforeunload", saveState);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveState(); });

  let lastFrame = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delta = Math.min(now - lastFrame, 60 * 1000);
    lastFrame = now;
    if (!state.paused) {
      advanceSimulation(delta);
      saveState();
      render();
    } else {
      state.lastRealTime = now;
      render();
    }
  }, 5000);

  // Seed an early, low-frequency scene event so the world is not a static dashboard.
  if (!state._firstRunObserved) {
    state._firstRunObserved = true;
    saveState();
  }
})();