// Shared by the engine and renderer. Positions use a 100 x 100 local-region plane.
// New regions can supply their own node graph without ticking distant regions.
export const SITES = {
  'coastal-homestead': { x: 26, y: 58 },
  'old-village-road': { x: 52, y: 46 },
  'backwater-edge': { x: 64, y: 74 },
  'abandoned-clinic': { x: 76, y: 28 },
  'tidal-jetty': { x: 34, y: 82 },
  'laterite-quarry': { x: 82, y: 54 }
};
export function station(id, type) {
  const c = SITES[id] || SITES['coastal-homestead'];
  const offsets = {
    rest: [-2,0], eat:[-1,2], drink:[0,2], collectWater:[6,1],
    gatherFood:[-6,-6], gatherWood:[4,-7], repairShelter:[-2,-3],
    craftTool:[2,-1], makeFire:[-3,3], tendGarden:[-6,4], harvest:[-6,4], waterGarden:[-6,4],
    treatInjury:[-1,0], scavenge:[1,-3], buildCollector:[5,3],
    buildWorkshop:[2,-1], archive:[1,1], storeSupplies:[-1,1], resupply:[-1,1], arrival:[0,2]
  };
  const [x,y] = offsets[type] || [0,0];
  return {x:c.x+x, y:c.y+y};
}
export function positionAt(action) {
  const elapsed = action.totalMinutes - action.remainingMinutes;
  const t = Math.max(0,Math.min(1, elapsed / Math.max(.001,action.walkMinutes)));
  return {x:action.from.x+(action.to.x-action.from.x)*t, y:action.from.y+(action.to.y-action.from.y)*t};
}
export function actionPhase(world) {
  if (!world.survivor.alive) return 'ended';
  const a=world.activeAction;
  if (!a) return 'choosing';
  return a.walkMinutes-(a.totalMinutes-a.remainingMinutes) > 1e-7 ? 'walking' : 'working';
}
