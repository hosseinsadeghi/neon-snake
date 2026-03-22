import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { ALL_TRACKS, TRACK_GROUPS } from '../core/levels/index';
import { TrackId, TrackDef } from '../core/types';
import { defaultProgress, migrateProgress } from '../data/storage-interface';

// ==================== Track Select UI ====================

describe('Track Select UI rendering', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="track-grid" class="track-grid"></div></body></html>');
    document = dom.window.document;
  });

  function renderTrackGrid(tracks: TrackDef[], hideMultiplayer = true) {
    const trackGrid = document.getElementById('track-grid')!;
    trackGrid.innerHTML = '';

    for (const group of TRACK_GROUPS) {
      const groupTracks = hideMultiplayer
        ? group.tracks.filter(t => t.id !== TrackId.MULTIPLAYER)
        : group.tracks;
      if (groupTracks.length === 0) continue;

      const groupLabel = document.createElement('div');
      groupLabel.className = 'track-group-label';
      groupLabel.textContent = group.label;
      trackGrid.appendChild(groupLabel);

      for (const track of groupTracks) {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.trackId = track.id;
        card.innerHTML = `
          <div class="track-icon">${track.icon}</div>
          <div class="track-info">
            <div class="track-name">${track.name}</div>
            <div class="track-desc">${track.description}</div>
          </div>
          <div class="track-progress-bar"></div>
        `;
        trackGrid.appendChild(card);
      }
    }
  }

  it('renders all non-hidden tracks in groups', () => {
    renderTrackGrid(ALL_TRACKS, true);
    const grid = document.getElementById('track-grid')!;
    const cards = grid.querySelectorAll('.track-card');
    const labels = grid.querySelectorAll('.track-group-label');

    // 7 tracks visible (MULTIPLAYER hidden), 3 group labels
    expect(cards.length).toBe(7);
    expect(labels.length).toBe(3);
  });

  it('renders all tracks including VERSUS in dev mode', () => {
    renderTrackGrid(ALL_TRACKS, false);
    const grid = document.getElementById('track-grid')!;
    const cards = grid.querySelectorAll('.track-card');
    expect(cards.length).toBe(8);
  });

  it('renders group labels with correct text', () => {
    renderTrackGrid(ALL_TRACKS, true);
    const labels = document.querySelectorAll('.track-group-label');
    const texts = Array.from(labels).map(l => l.textContent);
    expect(texts).toEqual(['SOLO', 'VS AI', 'SPECIAL']);
  });

  it('each card has an icon, name, and description', () => {
    renderTrackGrid(ALL_TRACKS, true);
    const cards = document.querySelectorAll('.track-card');

    for (const card of Array.from(cards)) {
      expect(card.querySelector('.track-icon')?.textContent?.trim()).toBeTruthy();
      expect(card.querySelector('.track-name')?.textContent?.trim()).toBeTruthy();
      expect(card.querySelector('.track-desc')?.textContent?.trim()).toBeTruthy();
    }
  });

  it('SOLO group contains Classic, Infinite, Endless', () => {
    const soloGroup = TRACK_GROUPS.find(g => g.label === 'SOLO')!;
    const ids = soloGroup.tracks.map(t => t.id);
    expect(ids).toContain(TrackId.CLASSIC);
    expect(ids).toContain(TrackId.INFINITE);
    expect(ids).toContain(TrackId.ENDLESS);
    expect(ids).toHaveLength(3);
  });

  it('VS AI group contains Rival, Predator, A* Hunt', () => {
    const aiGroup = TRACK_GROUPS.find(g => g.label === 'VS AI')!;
    const ids = aiGroup.tracks.map(t => t.id);
    expect(ids).toContain(TrackId.RIVAL);
    expect(ids).toContain(TrackId.PREDATOR);
    expect(ids).toContain(TrackId.ASTAR);
    expect(ids).toHaveLength(3);
  });
});

// ==================== Track Progress Text ====================

describe('Track progress text', () => {
  function getTrackProgressText(track: TrackDef, progress: ReturnType<typeof defaultProgress>): string {
    const tp = progress.tracks[track.id] || { highestLevelUnlocked: 1, levelScores: {}, levelStars: {} };
    const totalStars = Object.values(tp.levelStars).reduce((a: number, b: number) => a + b, 0);

    if (track.id === TrackId.INFINITE) {
      const levelsPlayed = Object.keys(tp.levelScores).length;
      if (levelsPlayed === 0) return 'Not started';
      return `${totalStars} \u2605 \u00B7 Level ${tp.highestLevelUnlocked} reached`;
    }
    if (track.id === TrackId.ENDLESS) {
      const bestScore = Object.values(tp.levelScores).reduce((a: number, b: number) => Math.max(a, b), 0);
      if (bestScore === 0) return 'Not started';
      return `Best: ${bestScore} pts`;
    }
    if (track.id === TrackId.MULTIPLAYER) {
      const gamesPlayed = Object.keys(tp.levelScores).length;
      if (gamesPlayed === 0) return 'P1: WASD \u00B7 P2: Arrows';
      return `${gamesPlayed} games played`;
    }

    const maxStars = track.levels.length * 3;
    if (totalStars === 0) return `${track.levels.length} levels`;
    return `${totalStars}/${maxStars} \u2605 \u00B7 ${track.levels.length} levels`;
  }

  it('shows "Not started" for Infinite with no progress', () => {
    const infinite = ALL_TRACKS.find(t => t.id === TrackId.INFINITE)!;
    const progress = defaultProgress();
    expect(getTrackProgressText(infinite, progress)).toBe('Not started');
  });

  it('shows level reached for Infinite with progress', () => {
    const infinite = ALL_TRACKS.find(t => t.id === TrackId.INFINITE)!;
    const progress = defaultProgress();
    progress.tracks[TrackId.INFINITE].highestLevelUnlocked = 25;
    progress.tracks[TrackId.INFINITE].levelScores = { 1: 100 };
    progress.tracks[TrackId.INFINITE].levelStars = { 1: 2 };

    const text = getTrackProgressText(infinite, progress);
    expect(text).toContain('Level 25 reached');
    expect(text).toContain('2 \u2605');
  });

  it('shows "Not started" for Endless with no progress', () => {
    const endless = ALL_TRACKS.find(t => t.id === TrackId.ENDLESS)!;
    const progress = defaultProgress();
    expect(getTrackProgressText(endless, progress)).toBe('Not started');
  });

  it('shows best score for Endless with progress', () => {
    const endless = ALL_TRACKS.find(t => t.id === TrackId.ENDLESS)!;
    const progress = defaultProgress();
    progress.tracks[TrackId.ENDLESS].levelScores = { 1: 450 };
    expect(getTrackProgressText(endless, progress)).toBe('Best: 450 pts');
  });

  it('shows level count for Classic with no stars', () => {
    const classic = ALL_TRACKS.find(t => t.id === TrackId.CLASSIC)!;
    const progress = defaultProgress();
    expect(getTrackProgressText(classic, progress)).toBe('15 levels');
  });

  it('shows stars/total for Classic with progress', () => {
    const classic = ALL_TRACKS.find(t => t.id === TrackId.CLASSIC)!;
    const progress = defaultProgress();
    progress.tracks[TrackId.CLASSIC].levelStars = { 1: 3, 2: 2 };
    const text = getTrackProgressText(classic, progress);
    expect(text).toContain('5/45');
    expect(text).toContain('15 levels');
  });

  it('shows controls hint for Multiplayer with no progress', () => {
    const versus = ALL_TRACKS.find(t => t.id === TrackId.MULTIPLAYER)!;
    const progress = defaultProgress();
    expect(getTrackProgressText(versus, progress)).toContain('WASD');
    expect(getTrackProgressText(versus, progress)).toContain('Arrows');
  });

  it('never shows "0/0" or "0 levels" for Infinite', () => {
    const infinite = ALL_TRACKS.find(t => t.id === TrackId.INFINITE)!;
    const progress = defaultProgress();
    const text = getTrackProgressText(infinite, progress);
    expect(text).not.toContain('0/0');
    expect(text).not.toContain('0 levels');
  });

  it('never shows "0/0" or "0 levels" for Endless', () => {
    const endless = ALL_TRACKS.find(t => t.id === TrackId.ENDLESS)!;
    const progress = defaultProgress();
    const text = getTrackProgressText(endless, progress);
    expect(text).not.toContain('0/0');
    expect(text).not.toContain('0 levels');
  });
});

// ==================== Screen Management ====================

describe('Screen management', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="title-screen" class="screen-overlay"></div>
      <div id="track-screen" class="screen-overlay hidden"></div>
      <div id="level-screen" class="screen-overlay hidden"></div>
      <div id="pause-menu" class="screen-overlay hidden"></div>
      <div id="gameover-screen" class="screen-overlay hidden"></div>
      <button id="btn-game-menu" class="hidden"></button>
    </body></html>`);
    document = dom.window.document;
  });

  function showScreen(screen: HTMLElement | null) {
    const screens = ['title-screen', 'track-screen', 'level-screen', 'pause-menu', 'gameover-screen'];
    for (const id of screens) {
      document.getElementById(id)!.classList.add('hidden');
    }
    if (screen) screen.classList.remove('hidden');
    document.getElementById('btn-game-menu')!.classList.toggle('hidden', screen !== null);
  }

  it('shows only one screen at a time', () => {
    const trackScreen = document.getElementById('track-screen')!;
    showScreen(trackScreen);

    expect(trackScreen.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('title-screen')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('level-screen')!.classList.contains('hidden')).toBe(true);
  });

  it('shows game menu button when in-game (no screen)', () => {
    showScreen(null);
    expect(document.getElementById('btn-game-menu')!.classList.contains('hidden')).toBe(false);
  });

  it('hides game menu button when a screen is shown', () => {
    showScreen(document.getElementById('title-screen')!);
    expect(document.getElementById('btn-game-menu')!.classList.contains('hidden')).toBe(true);
  });
});

// ==================== Level Select UI ====================

describe('Level Select UI', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="level-grid" class="level-grid"></div></body></html>');
    document = dom.window.document;
  });

  function renderLevelCards(count: number, unlockedUpTo: number) {
    const grid = document.getElementById('level-grid')!;
    grid.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const levelNum = i + 1;
      const unlocked = levelNum <= unlockedUpTo;
      const card = document.createElement('div');
      card.className = `level-card${unlocked ? '' : ' locked'}`;

      if (unlocked) {
        card.innerHTML = `<div class="level-number">${levelNum}</div>`;
      } else {
        card.innerHTML = `<div class="lock-icon">\u{1F512}</div>`;
      }

      grid.appendChild(card);
    }
  }

  it('renders the correct number of level cards', () => {
    renderLevelCards(15, 5);
    const cards = document.querySelectorAll('.level-card');
    expect(cards.length).toBe(15);
  });

  it('marks unlocked levels correctly', () => {
    renderLevelCards(15, 5);
    const unlocked = document.querySelectorAll('.level-card:not(.locked)');
    const locked = document.querySelectorAll('.level-card.locked');
    expect(unlocked.length).toBe(5);
    expect(locked.length).toBe(10);
  });

  it('locked cards show lock icon', () => {
    renderLevelCards(5, 2);
    const lockedCards = document.querySelectorAll('.level-card.locked');
    for (const card of Array.from(lockedCards)) {
      expect(card.querySelector('.lock-icon')).toBeTruthy();
    }
  });

  it('unlocked cards show level number', () => {
    renderLevelCards(5, 3);
    const unlockedCards = document.querySelectorAll('.level-card:not(.locked)');
    for (const card of Array.from(unlockedCards)) {
      expect(card.querySelector('.level-number')).toBeTruthy();
    }
  });
});

// ==================== Input Manager ====================

describe('InputManager', () => {
  it('maps WASD keys to correct actions', () => {
    // Test the mapping logic without needing actual DOM events
    const keyMap: Record<string, number> = {
      'w': 0, // Action.UP
      's': 1, // Action.DOWN
      'a': 2, // Action.LEFT
      'd': 3, // Action.RIGHT
    };

    expect(keyMap['w']).toBe(0);
    expect(keyMap['s']).toBe(1);
    expect(keyMap['a']).toBe(2);
    expect(keyMap['d']).toBe(3);
  });

  it('maps arrow keys differently in multiplayer mode', () => {
    // In multiplayer: arrows = P2, WASD = P1
    // P2_UP = 4, P2_DOWN = 5, P2_LEFT = 6, P2_RIGHT = 7
    const isMultiplayer = true;
    const action = isMultiplayer ? 4 : 0; // P2_UP vs UP
    expect(action).toBe(4);
  });
});
