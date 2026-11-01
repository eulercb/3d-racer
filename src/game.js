import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CARS, COURSES, clamp, driftBoost, racePosition } from './racing.js';

const TAU = Math.PI * 2;
const palette = [0xc9fb45, 0xff704d, 0x63dcf2, 0xf6c959, 0xb58aff, 0xf58bbc];
const themes = [
  { sky: 0x9edee0, fog: 0xa8dfe0, ground: 0xc9bd8b, road: 0x4a5353, edge: 0xf5eee0, accent: 0x33bcb1, water: 0x40b7bd },
  { sky: 0xf5c594, fog: 0xe8b07f, ground: 0xc58a5c, road: 0x66534e, edge: 0xf7d7ae, accent: 0xf1844a, water: 0xc58a5c },
  { sky: 0x151632, fog: 0x25203c, ground: 0x302b45, road: 0x36394d, edge: 0xb7a9d7, accent: 0xe268db, water: 0x302b45 },
];
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
let trackVariant = 0;
function trackPoint(t) { const a = t * TAU; if(trackVariant===1) return new THREE.Vector3(Math.cos(a)*(100+13*Math.sin(2*a)),0,Math.sin(a)*(57+9*Math.cos(3*a))); if(trackVariant===2) return new THREE.Vector3(Math.cos(a)*(85+14*Math.cos(4*a)),0,Math.sin(a)*(70+8*Math.sin(3*a))); return new THREE.Vector3(Math.cos(a) * (92 + 9 * Math.sin(3*a)), 0, Math.sin(a) * (62 + 7 * Math.cos(2*a))); }
function frame(t) { const p = trackPoint(t); const tangent = trackPoint(t + 0.0001).sub(p).normalize(); return { p, tangent, side: new THREE.Vector3(-tangent.z, 0, tangent.x) }; }
function positionAt(t, offset = 0) { const f = frame(((t % 1) + 1) % 1); return f.p.addScaledVector(f.side, offset); }
function makeCar(color, style = 0) {
  const g = new THREE.Group();
  g.add(box(style===1?2.65:style===2?2.25:2.5, .55, style===1?4.6:4.1, color, 0, .75, 0));
  if(style===1) g.add(box(2.7,.15,.45,0x27313a,0,1.35,-1.9));
  if(style===2) g.add(box(1.5,.25,.6,color,0,1.05,1.8));
  g.add(box(2.1, .55, 1.8, color, 0, 1.28, -.15));
  g.add(box(1.8, .31, 1.1, 0x243443, 0, 1.48, -.1));
  g.add(box(2.2, .12, .45, 0x202b35, 0, .48, -2.1));
  g.add(box(1.7, .12, .18, 0xfff5c9, 0, .87, 2.08));
  for (const x of [-1.25, 1.25]) for (const z of [-1.3,1.3]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.36,12), mat(0x202329)); wheel.rotation.z = Math.PI/2; wheel.position.set(x,.45,z); g.add(wheel); }
  return g;
}
function ringMesh(width, color, y, segments = 300) {
  const vertices = [], indices = [];
  for (let i = 0; i <= segments; i++) { const f = frame(i / segments); for (const s of [-1,1]) { const p = f.p.clone().addScaledVector(f.side, width * s); vertices.push(p.x,y,p.z); } }
  for (let i = 0; i < segments; i++) { const n = i * 2; indices.push(n,n+2,n+1,n+1,n+2,n+3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3)); geo.setIndex(indices); geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo, mat(color, {side: THREE.DoubleSide})); mesh.receiveShadow = true; return mesh;
}
function addAt(scene, object, t, offset = 0, y = 0) { const f = frame(t); object.position.copy(f.p).addScaledVector(f.side, offset); object.position.y += y; object.rotation.y = Math.atan2(f.tangent.x, f.tangent.z); scene.add(object); return object; }
function random(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export class Game {
  constructor(container, { onUpdate = () => {}, onFinish = () => {} } = {}) {
    this.container = container; this.onUpdate = onUpdate; this.onFinish = onFinish; this.keys = {}; this.paused = false; this.running = false; this.disposed = false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.outputColorSpace = THREE.SRGBColorSpace; container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(54, 1, .1, 700); this.clock = new THREE.Clock();
    this.keydown = e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); if (!this.keys[e.code] && ['ShiftLeft','ShiftRight','KeyE'].includes(e.code)) this.useItem(); this.keys[e.code] = true; }; this.keyup = e => { this.keys[e.code] = false; };
    this.blur = () => { this.keys = {}; }; window.addEventListener('blur', this.blur); window.addEventListener('keydown', this.keydown); window.addEventListener('keyup', this.keyup); this.resize = () => { const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight; this.renderer.setSize(w,h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }; window.addEventListener('resize', this.resize); this.resize();
    this.courseIndex=0; this.carIndex=0; this.buildScene(); this.animate = this.animate.bind(this); this.raf = requestAnimationFrame(this.animate);
  }
  start(carIndex = 0, courseIndex = 0) {
    this.courseIndex = clamp(courseIndex,0,COURSES.length-1); trackVariant = this.courseIndex; this.carIndex = clamp(carIndex,0,CARS.length-1); this.elapsed = 0; this.countdown = 3; this.running = true; this.paused = false; this.finished = false; this.keys = {}; this.item = null; this.charge = 0; this.boostTime = 0; this.shieldTime = 0; this.wasDrifting = false; this.nextPickup = 0; this.lastPad = -1; this.lastShortcut = -1; this.buildScene(); this.clock.getDelta();
  }
  buildScene() {
    if (this.scene) this.clearScene(); const theme = themes[this.courseIndex]; const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(theme.sky); scene.fog = new THREE.Fog(theme.fog, 160, 400);
    scene.add(new THREE.HemisphereLight(0xffffff, theme.ground, 2.1)); const sun = new THREE.DirectionalLight(0xfff4d8, 2.6); sun.position.set(-60,100,40); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -140; sun.shadow.camera.right = sun.shadow.camera.top = 140; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900), mat(theme.water)); ground.rotation.x = -Math.PI/2; ground.position.y = -1.2; ground.receiveShadow = true; scene.add(ground);
    const island = new THREE.Mesh(new THREE.CylinderGeometry(126,135,2,64), mat(theme.ground)); island.scale.z = .72; island.position.y = -1; island.receiveShadow = true; scene.add(island);
    scene.add(ringMesh(13, theme.edge, .02), ringMesh(11.7, theme.road, .05));
    for (let i=0;i<100;i++) { if (i % 2) continue; addAt(scene, box(.18,.04,2.7,0xffffff), i/100, 0, .09); }
    for (let i=0;i<80;i++) for (const side of [-1,1]) { const curb = box(1.2,.18,3.5, i%2 ? 0xffffff : theme.accent); addAt(scene,curb,i/80,side*12.3,.14); }
    for (let i=0;i<4;i++) { const pad = box(7,.08,4,0x54e8e3); addAt(scene,pad, .13+i*.23, i%2 ? 4 : -4,.12); for (let j=-1;j<=1;j++) { const line = box(.4,.05,2.7,0xd8ffff); addAt(scene,line,.13+i*.23,(i%2 ? 4 : -4)+j*2,.18); } }
    // Side lanes reward taking the less obvious line beyond the curbs.
    for (let i=0;i<2;i++) { const t=i ? .68 : .33, side=i ? -1 : 1; for(let j=0;j<7;j++){ const marker=box(2.3,.09,3.4,theme.accent); addAt(scene,marker,t+j*.004,side*16,.08); } }
    this.pickups = []; for (let i=0;i<6;i++) { const t=.08+i/6; const obj = new THREE.Group(); const cube = box(1.8,1.8,1.8,0xf7d974); cube.rotation.y=Math.PI/4; obj.add(cube); addAt(scene,obj,t,i%2 ? -4:4,2); this.pickups.push({ t, offset:i%2 ? -4:4, obj, available:true }); }
    const start = new THREE.Group(); start.add(box(1,8,1,0xf6f1df,-13,4,0),box(1,8,1,0xf6f1df,13,4,0),box(27,1.5,1,0x20252b,0,8,0)); for(let i=0;i<13;i++) start.add(box(2,.35,.1,i%2?0xffffff:0x20252b,-12+i*2,8,.56)); addAt(scene,start,0,0,0);
    const rng = random(123 + this.courseIndex); for (let i=0;i<125;i++) { const angle=rng()*TAU, radius=25+rng()*135; const x=Math.cos(angle)*radius, z=Math.sin(angle)*radius*.72; let near=false; for(let j=0;j<80;j++){ const p=trackPoint(j/80); if(Math.hypot(p.x-x,p.z-z)<19){near=true;break;} } if(near) continue;
      if(this.courseIndex===0){ if(rng()<.52){ const trunk=box(.8,5,.8,0x806a4f,x,2.5,z); scene.add(trunk); const crown=new THREE.Mesh(new THREE.ConeGeometry(3.4,6,7),mat(0x668f70)); crown.position.set(x,7,z); scene.add(crown); } else { const house=box(4+rng()*4,3+rng()*4,4, rng()<.5?0xf1e6d1:0xf2b69b,x,2,z); scene.add(house); } }
      else if(this.courseIndex===1){ const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(2+rng()*4,0),mat(rng()<.5?0xa96d4b:0xdca26e)); rock.position.set(x,1,z); rock.scale.y=.7+rng(); scene.add(rock); }
      else { const h=4+rng()*18; scene.add(box(3+rng()*4,h,3+rng()*4,rng()<.5?0x3c385c:0x514061,x,h/2,z)); if(rng()<.4) scene.add(box(.2,h*.5,.2,0xee71d7,x,h*.55,z)); }
    }
    this.shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(3.3,16,12), new THREE.MeshBasicMaterial({color:0x76eaff, transparent:true, opacity:.22, wireframe:true})); scene.add(this.shieldBubble); this.shieldBubble.visible=false;
    this.sparks=[]; for(let i=0;i<6;i++){const spark=box(.25,.25,.9,0xffc753); scene.add(spark); spark.visible=false; this.sparks.push(spark);}
    // Batch static scenery by material to keep mobile draw calls low.
    scene.updateMatrixWorld(true);
    const batches = new Map();
    scene.traverse(obj => {
      if (!obj.isMesh || obj === this.shieldBubble || this.sparks.includes(obj) || this.pickups.some(p => p.obj === obj.parent)) return;
      const key = obj.material.color.getHex() + ':' + obj.material.side;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(obj);
    });
    for (const meshes of batches.values()) {
      const geometries = meshes.map(mesh => (mesh.geometry.index ? mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).toNonIndexed() : mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)));
      const merged = mergeGeometries(geometries);
      geometries.forEach(g => g.dispose());
      if (!merged) continue;
      const combined = new THREE.Mesh(merged, meshes[0].material.clone());
      combined.receiveShadow = true; combined.castShadow = true;
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
      scene.add(combined);
    }
    this.racers = []; for (let i=0;i<6;i++) { const car = makeCar(i===0 ? new THREE.Color(CARS[this.carIndex].color) : palette[i], i===0?this.carIndex:i%3); scene.add(car); this.racers.push({ name:i===0?'YOU':['','NOVA','JAX','MILO','ZIGGY','LUNA'][i], isPlayer:i===0, progress:-.012-Math.floor(i/2)*.012, offset:i%2 ? 3:-3, speed:0, car, finishTime:null, aiSpeed: 28 + (i%3)*1.1 }); }
    this.updateCars(); const initialFrame=frame(((this.racers[0].progress%1)+1)%1); this.camera.position.copy(this.racers[0].car.position).addScaledVector(initialFrame.tangent,-18).add(new THREE.Vector3(0,10,0)); this.camera.lookAt(this.racers[0].car.position.clone().addScaledVector(initialFrame.tangent,12));
  }
  updateCars() { for(const r of this.racers) { const f=frame(((r.progress%1)+1)%1); r.car.position.copy(f.p).addScaledVector(f.side,r.offset); r.car.position.y=.1; r.car.rotation.y=Math.atan2(f.tangent.x,f.tangent.z); } }
  useItem() { if (!this.running || this.paused || !this.item) return; if(this.item==='NITRO') this.boostTime=Math.max(this.boostTime,3); if(this.item==='SHIELD') this.shieldTime=5; if(this.item==='SHOCK') for(const r of this.racers.slice(1)) if(r.progress>this.racers[0].progress && r.progress-this.racers[0].progress<.3) r.slow=2.5; this.item=null; }
  tick(dt) {
    if(!this.running || this.paused || this.finished) return; if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt); this.onUpdate({speed:0,lap:1,position:racePosition(this.racers[0].progress,this.racers.slice(1)),totalRacers:this.racers.length,drift:0,boost:0,item:null,time:0,course:COURSES[this.courseIndex],countdown:Math.ceil(this.countdown),surface:'ROAD'}); return;} this.elapsed += dt; const p=this.racers[0], keys=this.keys; const accelerating=keys.ArrowUp||keys.KeyW; const braking=keys.ArrowDown||keys.KeyS; const steer=(keys.ArrowLeft||keys.KeyA?1:0)-(keys.ArrowRight||keys.KeyD?1:0); const drifting=!!keys.Space && Math.abs(steer)>0 && p.speed>10;
    if(drifting) this.charge=Math.min(3,this.charge+dt); if(this.wasDrifting&&!drifting){ this.boostTime=Math.max(this.boostTime,driftBoost(this.charge)); this.charge=0; } this.wasDrifting=drifting;
    this.boostTime=Math.max(0,this.boostTime-dt); this.shieldTime=Math.max(0,this.shieldTime-dt); const maxSpeed=31+CARS[this.carIndex].speed*1.5+(this.boostTime>0?13:0); const offroad=Math.abs(p.offset)>11; const target=accelerating&&!braking?maxSpeed*(offroad?.52:1):0; p.speed += clamp(target-p.speed,-(braking?35:12)*dt,(10+CARS[this.carIndex].acceleration*2)*dt); const current=frame(((p.progress%1)+1)%1), ahead=frame(((p.progress+.004)%1+1)%1); const bend=current.tangent.x*ahead.tangent.z-current.tangent.z*ahead.tangent.x; const cornerPush=clamp(bend*150,-5,5)*(p.speed/35)**2; p.offset=clamp(p.offset+(steer*(7+CARS[this.carIndex].handling*.8)*(p.speed/30)*(drifting?1.35:1)+cornerPush*(drifting?.45:1))*dt,-20,20); p.progress += p.speed*dt/510;
    for(const r of this.racers.slice(1)){ if(r.finishTime!==null) continue; r.slow=Math.max(0,(r.slow||0)-dt); r.speed += clamp((r.slow? r.aiSpeed*.55:r.aiSpeed)-r.speed,-15*dt,10*dt); r.progress += r.speed*dt/510; r.offset += (Math.sin(this.elapsed*.5+r.aiSpeed)*3-r.offset)*dt*.4; if(r.progress>=3) r.finishTime=this.elapsed; }
    for(const r of this.racers.slice(1)){ if(Math.abs(r.progress-p.progress)<.005 && Math.abs(r.offset-p.offset)<2.3 && !(r.contact>0)){ if(this.shieldTime<=0){ p.speed*=.72; p.offset=clamp(p.offset+(p.offset>=r.offset?2:-2),-20,20); } else r.slow=1.5; r.contact=1; } r.contact=Math.max(0,(r.contact||0)-dt); }
    for(let i=0;i<4;i++){ const t=.13+i*.23, pos=((p.progress%1)+1)%1; if(Math.abs(pos-t)<.008 && Math.abs(p.offset-(i%2?4:-4))<5 && this.lastPad!==i){ this.boostTime=Math.max(this.boostTime,1.5); this.lastPad=i; } if(Math.abs(pos-t)>.03 && this.lastPad===i) this.lastPad=-1; }
    for(let i=0;i<2;i++){ const t=i?.68:.33, side=i?-1:1, pos=((p.progress%1)+1)%1; if(Math.abs(pos-t)<.006 && p.offset*side>13 && this.lastShortcut!==i){ p.progress+=.025; this.boostTime=Math.max(this.boostTime,1); this.lastShortcut=i; } if(Math.abs(pos-t)>.06 && this.lastShortcut===i)this.lastShortcut=-1; }
    for(const pickup of this.pickups){ pickup.obj.rotation.y+=dt; pickup.obj.position.y=2+Math.sin(this.elapsed*3+pickup.t*10)*.3; if(!pickup.available && this.elapsed>pickup.respawn){pickup.available=true;pickup.obj.visible=true;} if(pickup.available&&!this.item&&Math.abs((p.progress%1)-pickup.t)<.008&&Math.abs(p.offset-pickup.offset)<4){ pickup.available=false;pickup.obj.visible=false;pickup.respawn=this.elapsed+8; this.item=['NITRO','SHIELD','SHOCK'][Math.floor(Math.random()*3)]; } }
    if(p.progress>=3){ p.finishTime=this.elapsed; this.finished=true; const sorted=[...this.racers].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:a.finishTime!==null?-1:b.finishTime!==null?1:b.progress-a.progress); this.onFinish(sorted.map((r,i)=>({name:r.name,position:i+1,time:r.finishTime??this.elapsed+(3-r.progress)*510/Math.max(r.speed,1),isPlayer:r.isPlayer}))); }
    this.updateCars(); p.car.rotation.y += drifting ? steer*.28 : 0; this.shieldBubble.visible=this.shieldTime>0; this.shieldBubble.position.copy(p.car.position).add(new THREE.Vector3(0,1,0)); for(let i=0;i<this.sparks.length;i++){const spark=this.sparks[i]; spark.visible=drifting || this.boostTime>0; if(spark.visible){ spark.position.copy(p.car.position).add(new THREE.Vector3((i%2?1:-1)*(1+i*.1),.3,-1-i*.5)); spark.material.color.setHex(this.boostTime>0?0x70f9ff:0xffc753); }} const f=frame(((p.progress%1)+1)%1); const desired=p.car.position.clone().addScaledVector(f.tangent,-18).add(new THREE.Vector3(0,10,0)); this.camera.position.lerp(desired,1-Math.exp(-dt*3)); const look=p.car.position.clone().addScaledVector(f.tangent,12); look.y=1; this.camera.lookAt(look);
    this.onUpdate({ speed:Math.round(p.speed*5), lap:Math.min(3,Math.max(1,Math.floor(p.progress)+1)), position:racePosition(p.progress,this.racers.slice(1)), totalRacers:this.racers.length, drift:this.charge, boost:this.boostTime, item:this.item, time:this.elapsed, course:COURSES[this.courseIndex], countdown:0, surface:offroad?'OFF ROAD':'ROAD' });
  }
  animate(){ if(this.disposed)return; const dt=Math.min(this.clock.getDelta(),.05); this.tick(dt); if(this.scene)this.renderer.render(this.scene,this.camera); this.raf=requestAnimationFrame(this.animate); }
  setPaused(value){ this.paused=!!value; this.clock.getDelta(); } pause(){this.setPaused(true);} resume(){this.setPaused(false);}
  clearScene(){ this.scene.traverse(obj=>{ if(obj.geometry)obj.geometry.dispose(); if(obj.material){ for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose(); } }); }
  dispose(){ this.disposed=true; this.running=false; cancelAnimationFrame(this.raf); window.removeEventListener('blur',this.blur); window.removeEventListener('keydown',this.keydown); window.removeEventListener('keyup',this.keyup); window.removeEventListener('resize',this.resize); if(this.scene)this.clearScene(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
