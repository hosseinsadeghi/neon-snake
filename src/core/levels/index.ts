import { LevelDef, TrackDef, TrackId } from '../types';
import { level01 } from './level-01';
import { level02 } from './level-02';
import { level03 } from './level-03';
import { level04 } from './level-04';
import { level05 } from './level-05';
import { level06 } from './level-06';
import { level07 } from './level-07';
import { level08 } from './level-08';
import { level09 } from './level-09';
import { level10 } from './level-10';
import { level11 } from './level-11';
import { level12 } from './level-12';
import { level13 } from './level-13';
import { level14 } from './level-14';
import { level15 } from './level-15';
import { RIVAL_LEVELS } from './rival-levels';
import { MULTIPLAYER_LEVELS } from './multiplayer-levels';
import { HAZARD_LEVELS } from './hazard-levels';
import { PREDATOR_LEVELS } from './predator-levels';
import { ASTAR_LEVELS } from './astar-levels';
import { SWARM_LEVELS } from './swarm-levels';
import { generateEndlessLevel } from '../procedural';

export const CLASSIC_LEVELS: LevelDef[] = [
  level01, level02, level03, level04, level05,
  level06, level07, level08, level09, level10,
  level11, level12, level13, level14, level15,
];

// Keep backward compat
export const ALL_LEVELS = CLASSIC_LEVELS;

// Placeholder single-level arrays for procedural/endless tracks
// The actual levels are generated on-demand in main.ts
const INFINITE_PLACEHOLDER: LevelDef[] = [];
const ENDLESS_PLACEHOLDER: LevelDef[] = [generateEndlessLevel()];

export type TrackCategory = 'solo' | 'ai' | 'special';

export interface TrackGroup {
  label: string;
  category: TrackCategory;
  tracks: TrackDef[];
}

export const ALL_TRACKS: TrackDef[] = [
  {
    id: TrackId.CLASSIC,
    name: 'CLASSIC',
    description: '15 hand-crafted levels of increasing challenge.',
    icon: '\u{1F40D}',
    color: '#00f5ff',
    levels: CLASSIC_LEVELS,
  },
  {
    id: TrackId.INFINITE,
    name: 'INFINITE',
    description: 'Procedural levels forever. New mechanics every 50 levels.',
    icon: '\u{267E}\u{FE0F}',
    color: '#00ddff',
    levels: INFINITE_PLACEHOLDER,
  },
  {
    id: TrackId.ENDLESS,
    name: 'ENDLESS',
    description: 'One life. Survive as long as you can.',
    icon: '\u{1F525}',
    color: '#ff4400',
    levels: ENDLESS_PLACEHOLDER,
  },
  {
    id: TrackId.RIVAL,
    name: 'RIVAL',
    description: 'Race an AI snake for food before time runs out.',
    icon: '\u{1F916}',
    color: '#ff6600',
    levels: RIVAL_LEVELS,
  },
  {
    id: TrackId.PREDATOR,
    name: 'PREDATOR',
    description: 'A pathfinding AI hunts you down.',
    icon: '\u{1F47E}',
    color: '#cc00ff',
    levels: PREDATOR_LEVELS,
  },
  {
    id: TrackId.MULTIPLAYER,
    name: 'VERSUS',
    description: '2 players, 1 screen. Last snake standing wins.',
    icon: '\u{1F3AE}',
    color: '#39ff14',
    levels: MULTIPLAYER_LEVELS,
  },
  {
    id: TrackId.HAZARDS,
    name: 'HAZARDS',
    description: 'Dodge deadly traps that spawn and vanish.',
    icon: '\u{1F480}',
    color: '#ff0044',
    levels: HAZARD_LEVELS,
  },
  {
    id: TrackId.ASTAR,
    name: 'A* HUNT',
    description: 'Beat an A* pathfinding algorithm to the food.',
    icon: '\u{1F9E0}',
    color: '#ffaa00',
    levels: ASTAR_LEVELS,
  },
  {
    id: TrackId.SWARM,
    name: 'SWARM',
    description: 'Survive a horde of crazy snakes that try to block you.',
    icon: '\u{1F40D}',
    color: '#ff2266',
    levels: SWARM_LEVELS,
  },
];

export const TRACK_GROUPS: TrackGroup[] = [
  {
    label: 'SOLO',
    category: 'solo',
    tracks: ALL_TRACKS.filter(t => [TrackId.CLASSIC, TrackId.INFINITE, TrackId.ENDLESS].includes(t.id)),
  },
  {
    label: 'VS AI',
    category: 'ai',
    tracks: ALL_TRACKS.filter(t => [TrackId.RIVAL, TrackId.PREDATOR, TrackId.ASTAR, TrackId.SWARM].includes(t.id)),
  },
  {
    label: 'SPECIAL',
    category: 'special',
    tracks: ALL_TRACKS.filter(t => [TrackId.HAZARDS, TrackId.MULTIPLAYER].includes(t.id)),
  },
];

export { RIVAL_LEVELS, MULTIPLAYER_LEVELS, HAZARD_LEVELS, PREDATOR_LEVELS, ASTAR_LEVELS, SWARM_LEVELS };
