/* Optional: npm install --no-save playwright, then node tests/browser.cjs.
 * Serve the parent directory first: python3 -m http.server 8000
 * BASE_URL defaults to http://127.0.0.1:8000/Year-Zero/
 * CHROMIUM_PATH can select a preinstalled browser.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),ignoreDefaultArgs:['--enable-unsafe-swiftshader'],args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 let page=await context.newPage(); const errors=[], failed=[], checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 const base=process.env.BASE_URL || 'http://127.0.0.1:8000/Year-Zero/';
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('year-zero-world-v6')));
 const save=()=>page.locator('#saveButton').click();
 const check=(name)=>{checks.push(name);console.log('PASS '+name);};
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#livingCanvas').dataset.action==='collectWater');
 await page.locator('[data-speed="60"]').click();
 const p1=await page.locator('#livingCanvas').getAttribute('data-position');
 await page.waitForTimeout(700);
 const p2=await page.locator('#livingCanvas').getAttribute('data-position');
 assert.notEqual(p1,p2);await save();let w=await state();assert.ok(w.actionCount>0);check('Autonomous movement, timed work and completion in the actual canvas');
 await page.locator('#pauseButton').click();await page.waitForTimeout(200);await save();const paused=await state();const canvasPos=await page.locator('#livingCanvas').getAttribute('data-position');
 await page.waitForTimeout(500);await save();assert.equal((await state()).minute,paused.minute);assert.equal(await page.locator('#livingCanvas').getAttribute('data-position'),canvasPos);check('Pause freezes clock, survivor and animation state');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#pauseButton').textContent==='Resume time');await save();const restored=await state();
 assert.deepEqual(restored.activeAction,paused.activeAction);assert.deepEqual(restored.position,paused.position);assert.deepEqual(restored.chronicle,paused.chronicle);assert.deepEqual(restored.survivor.inventory,paused.survivor.inventory);check('Reload preserves unfinished work, position, inventory and chronicle');
 await page.locator('#stepHourButton').click();const stepped=await state();assert.ok(Math.abs((stepped.day-restored.day)*1440+stepped.minute-restored.minute-60)<.001);assert.ok(stepped.paused);check('Explicit hour step advances exactly 60 simulated minutes while paused');
 await page.locator('#cameraButton').click();assert.equal(await page.locator('#cameraButton').textContent(),'Follow survivor');await page.locator('#cameraButton').click();
 await page.locator('#lifeTab').click();assert.ok(await page.locator('#lifePanel').isVisible());assert.ok((await page.locator('#activity').textContent()).length>0);
 await page.locator('#worldTab').click();assert.ok(await page.locator('#territoryMap').isVisible());await page.locator('#chronicleTab').click();check('Observer camera and all information tabs work');
 fs.mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok(await page.locator('#livingCanvas').isVisible());assert.ok((await page.locator('.needs').boundingBox()).height>70);await page.screenshot({path:'test-artifacts/mobile.png',fullPage:true});check('390px mobile layout has no horizontal overflow; canvas, controls and needs visible');
 await page.setViewportSize({width:1440,height:1100});
 // Simulate a tab returning after a long absence, through the production loader.
 const sim=await import('../simulation.mjs');
 const offlineWorld=sim.createWorld({now:Date.now()-sim.DAY_MS*20,seed:42});
 await page.close(); page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(w=>{if(!sessionStorage.getItem('offline-fixture')){localStorage.setItem('year-zero-world-v6',JSON.stringify(w));sessionStorage.setItem('offline-fixture','set');}},offlineWorld);
 await page.goto(base);await page.waitForTimeout(300);await save();w=await state();assert.ok(w.day>=8&&w.day<=9);assert.ok(w.actionCount>40);check('Production reload catches up through the engine, capped at seven world days');
 await page.locator('#pauseButton').click();await save();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 if(!await page.evaluate(()=>!!navigator.serviceWorker.controller)){await page.reload();await page.waitForTimeout(200);}
 await context.setOffline(true);await page.reload();await page.waitForTimeout(300);assert.ok(await page.locator('#livingCanvas').isVisible());assert.ok((await page.locator('#livingCanvas').getAttribute('data-action')).length>0);await context.setOffline(false);check('Cached /Year-Zero/ page reloads offline with modules and assets');
 // Corrupt save recovery keeps the original and blocks automatic overwrite.
 await page.addInitScript(()=>{if(!sessionStorage.getItem('corrupt-fixture')){localStorage.setItem('year-zero-world-v6','{damaged');sessionStorage.setItem('corrupt-fixture','set');}});
 await page.reload();await page.waitForTimeout(300);assert.ok(await page.locator('#saveWarning').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('year-zero-world-v6')),'{damaged');assert.ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('year-zero-world-v6-damaged-'))));check('Corrupt save is backed up and protected from automatic overwrite');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);check('No fatal JavaScript errors or failed HTTP responses at the GitHub Pages subdirectory');
 fs.writeFileSync('test-artifacts/browser-results.json',JSON.stringify({browser:await browser.version(),base,checks,errors,failed},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
