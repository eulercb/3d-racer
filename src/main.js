import './style.css';
import { Game } from './game.js';
import { CARS, COURSES } from './racing.js';

const app = document.querySelector('#app');
let carIndex = 0, courseIndex = 0, game, paused = false, racing = false;
let scores = {}, tournament = false;
const carNames = ['THE ROCKET', 'THE DRIFTER', 'THE TANK'];
const courseNames = ['SUNSET CIRCUIT', 'ALPINE PASS', 'NEON HARBOR'];
const carSub = ['Quick off the line', 'Made for the corners', 'Built to hold the road'];
const courseSub = ['A fast and flowing opener', 'High altitude, higher stakes', 'One last ride after dark'];
const names = ['YOU', 'BLAZE', 'NOVA', 'MAVERICK'];
const value = (obj, keys, fallback) => { for (const key of keys) if (obj?.[key] != null) return obj[key]; return fallback; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title = (item, fallback) => esc(value(item, ['name', 'title'], fallback));
const timeFormat = seconds => { seconds = Math.max(0, Number(seconds) || 0); return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}.${String(Math.floor(seconds % 1 * 100)).padStart(2,'0')}`; };
const stat = (v, fallback) => { v = Number(v); if (!Number.isFinite(v)) return fallback; return Math.max(15, Math.min(100, v <= 1 ? v * 100 : v <= 5 ? v * 20 : v <= 10 ? v * 10 : v)); };

app.innerHTML = `
  <div id="world" aria-label="3D race scene"></div>
  <div class="grain"></div>
  <div id="menu" class="menu">
    <header class="topbar"><a class="brand" href="#" aria-label="Apex Drift home"><span class="brand-mark">A<span>↗</span></span><span>APEX<span class="brand-accent"> DRIFT</span><small>THE GRAND PRIX</small></span></a><div class="top-right"><span class="live-dot"></span> YOUR NEXT OBSESSION <span class="top-number">NO. 001 / 003</span></div></header>
    <main class="menu-main">
      <section class="intro"><div class="eyebrow"><span class="eyebrow-line"></span> THE GRAND PRIX IS ON <span class="issue">EST. 2025</span></div><h1>GOOD<br>VIBES.<br><em>GREAT</em><br>DRIFTS<span class="period">.</span></h1><p>Three tracks. One trophy. A whole lot of sideways. Pick your ride and let’s make some noise.</p><div class="intro-foot"><span>↓ &nbsp; BUILD YOUR RACE</span><span>01 — 03</span></div></section>
      <section class="setup"><div class="setup-top"><div><div class="section-kicker">YOUR RACE STARTS HERE <span>✳</span></div><h2>GET IN <em>GEAR.</em></h2></div><div class="setup-index">THE<br>STARTING<br>LINE <b>↘</b></div></div>
        <div class="selector-head"><span><b>01</b> CHOOSE YOUR RIDE</span><span>THE GARAGE / ${String(CARS.length).padStart(2,'0')}</span></div>
        <div class="car-grid" id="car-grid"></div>
        <div class="selector-head course-heading"><span><b>02</b> PICK YOUR TRACK</span><span>THE TOUR / ${String(COURSES.length).padStart(2,'0')}</span></div>
        <div class="course-list" id="course-list"></div>
        <button class="race-button" id="start"><span>START GRAND PRIX <small>THREE TRACKS. ONE TROPHY.</small></span><span class="button-arrow">↗</span></button>
        <button class="practice-button" id="practice">RACE SELECTED TRACK <span>↗</span></button><div class="controls-note"><span>⌨</span><p><b>KNOW THE MOVES</b> &nbsp; WASD / ARROWS TO DRIVE &nbsp;·&nbsp; SPACE TO DRIFT &nbsp;·&nbsp; E FOR POWER-UP</p></div>
      </section>
    </main><footer class="menu-footer"><span>© APEX DRIFT RACING CLUB</span><span>MADE FOR THE LONG WAY ROUND <b>✳</b></span><span>FAST IS A FEELING™</span></footer>
  </div>
  <div id="hud" class="hud hidden"><div class="hud-top"><div class="hud-brand"><span class="mini-mark">A↗</span><span>APEX <i>DRIFT</i><small>GRAND PRIX</small></span></div><div class="race-location"><small>NOW RACING</small><strong id="hud-course">SUNSET CIRCUIT</strong></div><button id="pause-button" class="pause-button" aria-label="Pause race">Ⅱ</button></div><div class="hud-info"><div class="hud-card position"><small>POSITION</small><strong><span id="position">1</span><i> / 6</i></strong><span class="hud-card-foot">MAKE IT COUNT ↗</span></div><div class="hud-card lap"><small>LAP</small><strong><span id="lap">1</span><i> / 3</i></strong><span class="hud-card-foot" id="timer">00:00.00</span></div></div><div id="countdown" class="countdown hidden"></div><div class="hud-bottom"><div class="power"><span class="power-icon">✳</span><span><small>POWER-UP &nbsp; [E]</small><strong id="powerup">PICK ONE UP</strong></span></div><div class="drift-meter"><div><small>DRIFT CHARGE</small><b id="drift-label">LET IT SLIDE</b></div><span><i id="drift-fill"></i></span></div><div class="speed"><strong id="speed">0</strong><span>KM<br>/ H</span></div></div><div class="touch-controls"><div><button data-key="ArrowLeft" aria-label="Steer left">◀</button><button data-key="ArrowRight" aria-label="Steer right">▶</button></div><div><button data-key="Space" aria-label="Drift">DRIFT</button><button data-key="KeyE" aria-label="Use power-up">ITEM</button><button data-key="ArrowDown" aria-label="Brake">▼</button><button data-key="ArrowUp" aria-label="Accelerate">▲</button></div></div><div class="race-hint">WASD / ARROWS &nbsp; DRIVE &nbsp;·&nbsp; SPACE &nbsp; DRIFT &nbsp;·&nbsp; E &nbsp; POWER-UP &nbsp;·&nbsp; ESC &nbsp; PAUSE</div></div>
  <div id="overlay" class="overlay hidden"></div>`;

function renderSelection() {
  document.querySelector('#car-grid').innerHTML = CARS.map((car, i) => {
    const speed = stat(value(car.stats, ['speed'], value(car, ['speed','maxSpeed'], null)), [88,68,55][i] || 70);
    const handling = stat(value(car.stats, ['handling'], value(car, ['handling','turn'], null)), [55,92,65][i] || 70);
    return `<button class="car-card ${i === carIndex ? 'selected' : ''}" data-car="${i}" aria-pressed="${i === carIndex}"><span class="card-number">0${i+1} <span>${i === carIndex ? '● SELECTED' : '○ SELECT'}</span></span><span class="car-art car-art-${i}"><span class="car-shadow"></span><span class="car-body"><i></i></span><span class="wheel wheel-one"></span><span class="wheel wheel-two"></span></span><span class="car-name">${title(car, carNames[i])}</span><span class="car-description">${esc(value(car,['description','tagline'],carSub[i]))}</span><span class="stats"><span>SPEED <i><b style="width:${speed}%"></b></i></span><span>HANDLING <i><b style="width:${handling}%"></b></i></span></span></button>`;
  }).join('');
  document.querySelector('#course-list').innerHTML = COURSES.map((course,i) => `<button class="course-row ${i === courseIndex ? 'selected' : ''}" data-course="${i}" aria-pressed="${i === courseIndex}"><span class="course-num">0${i+1}</span><span class="course-icon course-icon-${i}">${['☀','▲','✳'][i] || '✳'}</span><span class="course-name">${title(course,courseNames[i])}<small>${esc(value(course,['description','tagline'],courseSub[i]))}</small></span><span class="course-laps">3 LAPS</span><span class="course-select">${i === courseIndex ? '●' : '○'}</span></button>`).join('');
}
renderSelection();
game = new Game(document.querySelector('#world'), {onUpdate:update,onFinish:finish});
document.querySelector('#car-grid').addEventListener('click', e => { const card=e.target.closest('[data-car]'); if(card){carIndex=+card.dataset.car;renderSelection();} });
document.querySelector('#course-list').addEventListener('click', e => { const row=e.target.closest('[data-course]'); if(row){courseIndex=+row.dataset.course;renderSelection();} });

function update(data = {}) {
  const set = (id, v) => { if(v != null) document.querySelector(id).textContent = v; };
  set('#speed', Math.round(Number(value(data,['speed','speedKmh'],0)) || 0));
  set('#position', value(data,['position','place','rank'],1));
  set('#lap', value(data,['lap','currentLap'],1));
  set('#timer', timeFormat(value(data,['time','elapsed','elapsedTime'],0)));
  const power = value(data,['powerup','powerUp','item'],null);
  set('#powerup', power && typeof power === 'object' ? (power.name || 'READY') : (power || 'PICK ONE UP'));
  let charge = Number(value(data,['driftCharge','drift','charge'],0)) || 0; charge = charge / 3 * 100;
  document.querySelector('#drift-fill').style.width = `${Math.max(0,Math.min(100,charge))}%`;
  set('#drift-label', data.boost > 0 ? 'BOOST ACTIVE' : data.surface === 'OFF ROAD' ? 'OFF ROAD · SLOW' : charge >= 60 ? 'RELEASE TO BOOST' : charge > 0 ? 'CHARGE IT UP' : 'LET IT SLIDE');
  const count = value(data,['countdown'],null); const counter=document.querySelector('#countdown');
  counter.classList.toggle('hidden', count == null || count === false || count === 0);
  if(count != null) counter.textContent = count === true ? 'GO!' : count;
}
function startRace() {
  paused=false; racing=true; document.querySelector('#menu').classList.add('hidden'); document.querySelector('#overlay').classList.add('hidden'); document.querySelector('#hud').classList.remove('hidden');
  document.querySelector('#hud-course').textContent = value(COURSES[courseIndex],['name','title'],courseNames[courseIndex]);
  if(!game) game = new Game(document.querySelector('#world'), {onUpdate:update,onFinish:finish});
  game.start(carIndex,courseIndex);
}
function pause() {
  if(!racing) return; paused=!paused; game?.setPaused(paused); const overlay=document.querySelector('#overlay');
  if(paused){overlay.innerHTML=`<div class="modal"><div class="modal-kicker">PIT STOP <span>✳</span></div><h2>TAKE A<br><em>BREATHER.</em></h2><p>Even legends need a moment.</p><button class="race-button" id="resume"><span>BACK TO IT <small>RESUME RACE</small></span><span class="button-arrow">↗</span></button><button class="text-button" id="quit">← &nbsp; BACK TO GARAGE</button></div>`;overlay.classList.remove('hidden');document.querySelector('#resume').onclick=pause;document.querySelector('#quit').onclick=quit;} else overlay.classList.add('hidden');
}
function quit(){racing=false;paused=false;game?.setPaused(true);document.querySelector('#overlay').classList.add('hidden');document.querySelector('#hud').classList.add('hidden');document.querySelector('#menu').classList.remove('hidden');}
function finish(result = {}) {
  racing=false; const player = Array.isArray(result) ? result.find(r => r.isPlayer) : result; const position=Number(value(player,['position','place','rank'],1)) || 1; const final=!tournament || courseIndex >= COURSES.length-1;
  const standings = Array.isArray(result) ? result : value(result,['standings','results'],null); if (tournament && Array.isArray(standings)) standings.forEach((r, i) => { const n=r.name || names[i]; scores[n]=(scores[n] || 0) + [10,8,6,4,2,1][i]; }); const rows = tournament ? Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([name,points])=>({name,points})) : Array.isArray(standings) && standings.length ? standings : names.map((name,i)=>({name,position:i+1}));
  const winner = rows[0]?.name || 'RACER'; const overlay=document.querySelector('#overlay'); overlay.innerHTML=`<div class="modal results"><div class="modal-kicker">${final && tournament ? 'THE GRAND FINALE' : 'RACE COMPLETE'} <span>✳</span></div><div class="result-heading"><div><h2>${position === 1 ? 'THAT’S<br><em>THE SPIRIT.</em>' : 'WHAT A<br><em>RIDE.</em>'}</h2><p>${final && tournament ? `🏆 ${esc(winner)} wins the Grand Prix!` : final ? 'What a ride. Ready to go again?' : 'A little dust, a lot of glory. Ready for the next one?'}</p></div><div class="result-place">${position}<sup>${position === 1 ? 'ST' : position === 2 ? 'ND' : position === 3 ? 'RD' : 'TH'}</sup><small>PLACE</small></div></div><div class="standings-title">THE FINISHING ORDER <span>✳</span></div><div class="standings">${rows.map((r,i)=>`<div><b>0${i+1}</b><span>${esc(typeof r === 'string' ? r : value(r,['name','driver'],names[i] || 'RACER'))}</span><strong>${r.points != null ? r.points + ' PTS' : i === 0 ? '★' : '—'}</strong></div>`).join('')}</div><button class="race-button" id="next"><span>${final ? 'RACE AGAIN' : 'NEXT RACE'} <small>${final ? 'BACK TO THE START' : 'KEEP THE GOOD TIMES ROLLING'}</small></span><span class="button-arrow">↗</span></button><button class="text-button" id="quit">← &nbsp; BACK TO GARAGE</button></div>`;overlay.classList.remove('hidden');document.querySelector('#next').onclick=()=>{if(final && tournament){courseIndex=0;scores={};}else if (!final) courseIndex++;renderSelection();startRace();};document.querySelector('#quit').onclick=quit;
}
document.querySelector('#start').onclick=()=>{tournament=true;courseIndex=0;scores={};startRace();};
document.querySelector('#practice').onclick=()=>{tournament=false;startRace();};
document.querySelector('#pause-button').onclick=pause;
document.querySelectorAll('[data-key]').forEach(button => { const send = (type) => window.dispatchEvent(new KeyboardEvent(type, {code:button.dataset.key, bubbles:true})); button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); send('keydown'); }); button.addEventListener('pointerup', () => send('keyup')); button.addEventListener('pointercancel', () => send('keyup')); button.addEventListener('lostpointercapture', () => send('keyup')); });
window.addEventListener('keydown',e=>{if(e.key==='Escape' && racing){e.preventDefault();pause();}});
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
