export const CARS = [
  { name: 'VOLT', description: 'The all-rounder', color: '#c9fb45', speed: 4, acceleration: 4, handling: 4, stats: { speed: 4, acceleration: 4, handling: 4 } },
  { name: 'COMET', description: 'Built for pure speed', color: '#ff704d', speed: 5, acceleration: 3, handling: 3, stats: { speed: 5, acceleration: 3, handling: 3 } },
  { name: 'RIPTIDE', description: 'Made to find the line', color: '#58dcf2', speed: 3, acceleration: 4, handling: 5, stats: { speed: 3, acceleration: 4, handling: 5 } },
];
export const COURSES = [
  { name: 'COASTAL RUN', location: 'AMALFI COAST', description: 'Sea breeze, sweeping turns.', color: '#42c9c1', theme: 'coast' },
  { name: 'DUST VALLEY', location: 'SONORAN DESERT', description: 'Wide open and wild.', color: '#f4a559', theme: 'desert' },
  { name: 'NEON CIRCUIT', location: 'TOKYO AFTER DARK', description: 'Chase the city lights.', color: '#c77dff', theme: 'neon' },
];
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function driftBoost(charge) { return charge >= 1.8 ? 2.8 : charge >= 0.65 ? 1.5 : 0; }
export function racePosition(progress, racers) { return 1 + racers.filter(r => r.progress > progress).length; }
export function formatTime(seconds) { const m = Math.floor(seconds / 60); return `${m}:${(seconds % 60).toFixed(2).padStart(5, '0')}`; }
