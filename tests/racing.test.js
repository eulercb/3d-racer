import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARS, COURSES, driftBoost, racePosition, formatTime } from '../src/racing.js';
test('drift rewards require charging and increase at the second tier',()=>{assert.equal(driftBoost(.64),0);assert.equal(driftBoost(.65),1.5);assert.equal(driftBoost(1.8),2.8);});
test('position counts racers ahead, including lapped opponents',()=>{assert.equal(racePosition(1.5,[{progress:2.1},{progress:1.6},{progress:1.4}]),3);});
test('garage offers distinct handling and speed tradeoffs',()=>{assert.equal(CARS.length,3);assert.equal(COURSES.length,3);assert.ok(new Set(CARS.map(c=>c.speed)).size===3);assert.ok(new Set(CARS.map(c=>c.handling)).size===3);});
test('race times preserve minutes and hundredths',()=>assert.equal(formatTime(125.25),'2:05.25'));
