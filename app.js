(() => {
  "use strict";
  const DAY_MS = 15 * 60 * 1000; // One simulated day per 15 real minutes.
  const SAVE_KEY = "year-zero-save-v2";
  const $ = (id) => document.getElementById(id);
  const initialState = () => ({
    startedAt: Date.now(), lastSeen: Date.now(), paused: false,
    day: 1, minutes: 375, health: 92, hunger: 28, thirst: 24, energy: 74,
    food: 3, water: 2, wood: 4, scrap: 1, shelter: 1, fire: false, tools: false,
    exploredVillage: false, exploredBackwater: false, actionCount: 0,
    journal: [
      {time:"06:15", icon:"⌂", title:"Woke beneath a leaking roof", detail:"The house is quiet. The rain has moved out to sea, for now."},
      {time:"06:40", icon:"♨", title:"Checked the remaining supplies", detail:"A few portions of food, two containers of water, and little else."},
      {time:"07:05", icon:"◉", title:"Listened to the coast", detail:"Waves, birds, wind through the palms. No voices."}
    ],
    memories: [
      {time:"06:15", title:"Awakening", detail:"The survivor wakes in the abandoned house.", action:"rest"},
      {time:"08:20", title:"Collecting water", detail:"He checks the old well for clean water.", action:"gather"},
      {time:"10:40", title:"Along the shore", detail:"The tide has left something useful behind.", action:"explore"},
      {time:"13:00", title:"Finding supplies", detail:"He searches the green edge of the village.", action:"gather"},
      {time:"18:20", title:"Evening fire", detail:"He tries to make a fire before dark.", action:"fire"}
    ]
  });
  let state = load();
  let toastTimer = null;
  let soundEnabled = false;
  let audioContext = null;

  function load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return initialState();
      const s = {...initialState(), ...JSON.parse(saved)};
      const now = Date.now();
      if (!s.paused && s.lastSeen && now > s.lastSeen) advance(Math.min(now - s.lastSeen, 7 * DAY_MS), s, false);
      s.lastSeen = now;
      return s;
    } catch { return initialState(); }
  }
  function save() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }
  function addJournal(title, detail, icon="•") {
    state.journal.unshift({time:formatClock(state.minutes), icon, title, detail});
    state.journal = state.journal.slice(0, 14);
  }
  function formatClock(mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    return String(Math.floor(m/60)).padStart(2,"0") + ":" + String(m%60).padStart(2,"0");
  }
  function dayPart(mins) {
    const h = Math.floor(mins/60)%24;
    if (h < 5) return "Night";
    if (h < 11) return "Morning";
    if (h < 16) return "Afternoon";
    if (h < 19) return "Evening";
    return "Night";
  }
  function advance(ms, target=state, log=true) {
    if (ms <= 0) return;
    const beforeDay = target.day;
    const simulatedMinutes = ms / DAY_MS * 1440;
    const oldHour = Math.floor(target.minutes / 60);
    target.minutes += simulatedMinutes;
    while (target.minutes >= 1440) {
      target.minutes -= 1440;
      target.day++;
      target.hunger = Math.min(100, target.hunger + 28);
      target.thirst = Math.min(100, target.thirst + 34);
      target.energy = Math.max(15, target.energy - 12);
      if (target.food > 0) { target.food--; target.hunger = Math.max(5, target.hunger - 24); }
      if (target.water > 0) { target.water--; target.thirst = Math.max(5, target.thirst - 29); }
      if (target.hunger > 88 || target.thirst > 90) target.health = Math.max(8, target.health - 5);
      if (target.energy < 30) target.health = Math.max(8, target.health - 2);
      if (target.day % 3 === 0 && target.shelter < 3) target.wood = Math.max(0,target.wood);
      if (log) addJournal("Daybreak, again", "The world kept turning while he slept. Hunger and thirst are harder to ignore.", "☼");
    }
    const newHour = Math.floor(target.minutes/60);
    if (log && oldHour !== newHour) {
      if (newHour === 7) autonomous("morning", target, log);
      else if (newHour === 12) autonomous("midday", target, log);
      else if (newHour === 18) autonomous("evening", target, log);
      else if (newHour === 22) autonomous("night", target, log);
    }
    target.lastSeen = Date.now();
  }
  function autonomous(period, target=state, log=true) {
    if (target.paused) return;
    if (target.thirst > 62 && target.water < 3) {
      target.water++; target.thirst = Math.max(5,target.thirst-25);
      if(log) addJournal("Went to the well", "He filled a container before the walk became harder.", "◉");
    } else if (target.hunger > 65 && target.food < 3) {
      target.food++; target.hunger = Math.max(5,target.hunger-20);
      if(log) addJournal("Found something to eat", "A small meal, gathered carefully from the overgrown garden.", "♧");
    } else if (period === "morning" && target.energy > 35) {
      target.wood = Math.min(12,target.wood+1); target.energy = Math.max(10,target.energy-8);
      if(log) addJournal("Worked around the house", "He collected fallen branches and cleared the path to the well.", "⚒");
    } else if (period === "midday" && target.energy < 65) {
      target.energy = Math.min(100,target.energy+15);
      if(log) addJournal("Rested in the shade", "The heat rose. He chose to conserve his strength.", "☼");
    } else if (period === "evening" && !target.fire && target.wood > 0) {
      target.fire = true; target.wood--; target.energy = Math.max(5,target.energy-4);
      if(log) addJournal("Made a small fire", "The light makes the empty house feel a little less empty.", "♨");
    } else if (period === "night") {
      target.energy = Math.min(100,target.energy+18);
      if(log) addJournal("Settled in for the night", "The shutters creak in the wind. Tomorrow will bring its own work.", "⌂");
    }
  }
  function act(type) {
    state.actionCount++;
    const actions = {
      shelter() {
        if (state.wood >= 2) { state.wood -= 2; state.shelter = Math.min(3,state.shelter+1); state.health=Math.min(100,state.health+2); addJournal("Repaired the shelter","Palm fronds and salvaged timber patch a gap in the roof.","⌂"); notify("Shelter improved. A little more protection from the weather."); }
        else { addJournal("Inspected the shelter","The roof needs more wood before it can be repaired.","⌂"); notify("Not enough wood yet. Gather some fallen branches first."); }
      },
      fire() {
        if (state.wood > 0) { state.wood--; state.fire=true; state.energy=Math.max(0,state.energy-3); addJournal("Built a small fire","Dry leaves catch. Smoke rises through a gap in the roof.","♨"); notify("A small fire is burning."); }
        else { addJournal("Looked for firewood","The ground is damp and the nearby woodpile is empty.","♨"); notify("No firewood left. Try gathering supplies."); }
      },
      tools() {
        if (!state.tools && state.scrap > 0) { state.tools=true; state.scrap--; state.energy=Math.max(0,state.energy-5); addJournal("Made a crude hand tool","A piece of salvaged metal and a sturdy branch make a rough tool.","⚒"); notify("A crude tool should make future work easier."); }
        else if (state.tools) { addJournal("Maintained the hand tool","He tightened its binding and checked the edge.","⚒"); notify("The tool is already made. It will help with future tasks."); }
        else { addJournal("Searched for useful materials","Nothing suitable turned up in the house.","⚒"); notify("No scrap metal available yet. Explore the shore."); }
      },
      gather() {
        const roll = Math.random();
        if (roll < .45) { state.food=Math.min(10,state.food+1); state.hunger=Math.max(0,state.hunger-7); addJournal("Gathered edible greens","He found a small amount of food near the old garden.","♧"); notify("Found a little food."); }
        else if (roll < .76) { state.wood=Math.min(12,state.wood+2); addJournal("Collected fallen branches","Two armfuls of wood, dry enough to store under the eaves.","♧"); notify("Collected wood for repairs or a fire."); }
        else { state.water=Math.min(8,state.water+1); state.thirst=Math.max(0,state.thirst-10); addJournal("Collected water","He cleaned and filled a container at the well.","◉"); notify("Water stores replenished."); }
        state.energy=Math.max(0,state.energy-7);
      },
      explore() {
        state.energy=Math.max(0,state.energy-12);
        if (!state.exploredVillage) {
          state.exploredVillage=true; state.scrap=Math.min(5,state.scrap+1); state.wood=Math.min(12,state.wood+1);
          addJournal("Followed the old village road","He found a rusted tin box and a few usable pieces of metal beneath a fallen awning.","⌖");
          notify("New area discovered: Old village road.");
        } else if (!state.exploredBackwater) {
          state.exploredBackwater=true; state.food=Math.min(10,state.food+2); state.water=Math.min(8,state.water+1);
          addJournal("Reached the backwater edge","The water is calm here. A weather-beaten fishing net lies tangled in reeds.","⌖");
          notify("New area discovered: Backwater edge.");
        } else {
          state.wood=Math.min(12,state.wood+1); state.food=Math.min(10,state.food+1);
          addJournal("Explored farther along the coast","He marked a safe path through the palms and returned before dark.","⌖");
          notify("The coastline is becoming familiar.");
        }
      }
    };
    (actions[type] || actions.gather)();
    save(); render(); tone();
  }
  function notify(message) {
    const t=$("toast"); t.textContent=message; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2800);
  }
  function tone() {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc=audioContext.createOscillator(), gain=audioContext.createGain();
      osc.type="sine"; osc.frequency.value=440; gain.gain.value=.025;
      osc.connect(gain); gain.connect(audioContext.destination); osc.start();
      gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12); osc.stop(audioContext.currentTime+.12);
    } catch {}
  }
  function render() {
    $("dateLabel").textContent=`YEAR ${Math.floor((state.day-1)/365)+1}  ·  DAY ${state.day}`;
    $("clock").textContent=formatClock(state.minutes);
    $("dayPart").textContent=dayPart(state.minutes);
    $("weatherName").textContent=state.day%4===0?"Monsoon showers":state.day%3===0?"Sea breeze":"Coastal mist";
    $("weatherNote").textContent=state.day%4===0?"Heavy rain later":"Clouds gathering offshore";
    $("weatherIcon").textContent=state.day%4===0?"☂":state.day%3===0?"≋":"☁";
    $("statusText").textContent=state.paused?"Time has stopped":state.health<35?"He is growing weaker":state.actionCount>4?"A quiet rhythm is forming":"The world is quiet";
    $("sceneCaption").textContent=state.day>4?"The days are beginning to find a rhythm.":"A new day waits beyond the trees.";
    setMeter("health",state.health); setMeter("hunger",state.hunger); setMeter("thirst",state.thirst); setMeter("energy",state.energy);
    $("condition").textContent=state.health>75?"Stable":state.health>40?"Worn down":"Critical";
    $("shelterState").textContent=["Open shelter","Patched roof","Reinforced house","Secure homestead"][state.shelter] || "Abandoned house";
    $("fireState").textContent=state.fire?"Burning / ready":"Cold";
    $("toolsState").textContent=state.tools?"Hand tool made":"Makeshift";
    $("foodState").textContent=`${state.food} portion${state.food===1?"":"s"}`;
    $("waterState").textContent=`${state.water} container${state.water===1?"":"s"}`;
    $("villageState").textContent=state.exploredVillage?"Explored · salvage found":"Not yet explored";
    $("backwaterState").textContent=state.exploredBackwater?"Explored · fishing net found":"Beyond the palms";
    $("simulationState").textContent=state.paused?"WORLD PAUSED":"WORLD SIMULATING";
    $("stateLed").classList.toggle("paused",state.paused);
    $("pauseBtn").textContent=state.paused?"Resume time":"Pause time";
    $("journalList").innerHTML=state.journal.map(e=>`<article class="journal-entry"><time>${escapeHtml(e.time)}</time><span class="entry-icon">${escapeHtml(e.icon)}</span><div><div class="entry-title">${escapeHtml(e.title)}</div><div class="entry-detail">${escapeHtml(e.detail)}</div></div></article>`).join("");
    $("elapsedLabel").textContent=`Day ${state.day} · ${dayPart(state.minutes).toLowerCase()}`;
    save();
  }
  function setMeter(name,val) { const n=Math.max(0,Math.min(100,Math.round(val))); $(name+"Bar").style.width=n+"%"; $(name+"Value").textContent=n; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>act(btn.dataset.action)));
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(b=>{const active=b===btn;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
    document.querySelectorAll("[data-panel]").forEach(p=>{const active=p.dataset.panel===btn.dataset.tab;p.hidden=!active;p.classList.toggle("active",active);});
  }));
  document.querySelectorAll(".memory").forEach((btn,i)=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".memory").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
    const labels=["The house is still. He wakes and listens.","He checks the old well and brings water back.","The tide has left scraps along the shore.","He searches the edge of the village for supplies.","A small fire keeps the dark at a distance."];
    $("sceneCaption").textContent=labels[i]; notify(btn.querySelector("span:last-child").textContent+" · remembered moment");
  }));
  $("pauseBtn").addEventListener("click",()=>{state.paused=!state.paused;addJournal(state.paused?"Time paused":"Time resumed",state.paused?"The world holds its breath.":"The day begins moving again.",state.paused?"Ⅱ":"▶");save();render();});
  $("soundBtn").addEventListener("click",()=>{soundEnabled=!soundEnabled;$("soundBtn").textContent=soundEnabled?"Sound on":"Sound off";$("soundBtn").setAttribute("aria-pressed",String(soundEnabled));if(soundEnabled)tone();});
  $("resetBtn").addEventListener("click",()=>{if(confirm("Reset Year Zero? The saved world in this browser will be replaced with a new beginning.")){state=initialState();save();render();notify("A new beginning. Day one.");}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)save();});
  window.addEventListener("pagehide",save);
  setInterval(()=>{if(!state.paused){advance(1000);render();}},1000);
  render();
})();