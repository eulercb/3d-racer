import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 const context=await browser.newContext({viewport:{width:640,height:480}});const page=await context.newPage();
 await page.goto('http://localhost:4173');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 console.log('Worker controls page');

 page.on('pageerror',e=>console.error(e.message));

 await context.setOffline(true);await page.reload();

 await page.locator('#start').waitFor();
 assert.equal(await page.locator('.car-card').count(),3);
 console.log('PASS: production shell and game assets load offline');
}finally{await browser.close()}
