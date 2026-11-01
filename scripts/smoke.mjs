import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
const page = await browser.newPage({viewport:{width:960,height:720}});
const errors=[];console.log('Loading game');page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
await page.goto(process.env.GAME_URL || 'http://localhost:5173');
await page.locator('#start').waitFor();
await page.evaluate(async()=>{const {Game}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game.js')).name);const start=Game.prototype.start;Game.prototype.start=function(...a){window.testGame=this;this.renderer.setPixelRatio(.5);this.renderer.shadowMap.enabled=false;return start.apply(this,a)};});
await page.screenshot({path:'/tmp/apex-menu.png'});
console.log('Starting race');await page.click('#start');
await page.evaluate(()=>{const g=window.testGame;cancelAnimationFrame(g.raf);for(let i=0;i<61;i++)g.tick(.05)});console.log('Countdown complete');
await page.keyboard.down('ArrowUp');await page.evaluate(()=>{for(let i=0;i<30;i++)window.testGame.tick(.05)});await page.keyboard.up('ArrowUp');
assert.ok(Number(await page.locator('#speed').textContent())>0,'keyboard accelerates');
await page.keyboard.press('Escape');assert.ok(await page.locator('#resume').isVisible());await page.click('#resume');
const physics=await page.evaluate(()=>{const g=window.testGame;g.countdown=0;g.keys={ArrowUp:true};g.racers[0].speed=30;g.keys.Space=true;g.keys.ArrowLeft=true;for(let i=0;i<30;i++)g.tick(.05);const charge=g.charge;g.keys.Space=false;g.tick(.05);const boost=g.boostTime;g.item='NITRO';g.useItem();return {charge,boost,nitro:g.boostTime,item:g.item}});
assert.ok(physics.charge>.65);assert.ok(physics.boost>0);assert.ok(physics.nitro>=3);assert.equal(physics.item,null);
await page.screenshot({path:'/tmp/apex-race.png'});
for(let course=0;course<3;course++){
 await page.evaluate(()=>{const g=window.testGame;g.countdown=0;g.racers[0].progress=3;g.tick(.05)});
 await page.locator('#next').waitFor();
 assert.equal(await page.locator('.standings > div').count(),6);
 if(course<2) await page.click('#next');
}
assert.ok((await page.locator('#overlay').textContent()).includes('PTS'));
await page.setViewportSize({width:390,height:844});await page.click('#quit');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
assert.deepEqual(errors,[]);console.log('PASS: render, accelerate, pause/resume, drift, item, three-course tournament, mobile layout');
}finally{await browser.close()}
