import './style.css';
import { Action, Direction, GamePhase, GameState, PlayerProgress, TrackDef, TrackId } from './core/types';
import { createInitialState, applyAction, tick, GameEvent } from './core/game-engine';
import { ALL_TRACKS, TRACK_GROUPS } from './core/levels/index';
import { generateLevel } from './core/procedural';
import { Renderer } from './render/renderer';
import { InputManager } from './input/input-manager';
import { LocalStorageService } from './data/local-storage';
import { defaultProgress, StorageService } from './data/storage-interface';
import { initAuth, onAuthChange, signInWithGoogle, signInWithApple, signOut, isAuthAvailable, AuthUser } from './auth/auth-service';

// ============ Dev Mode ============
// Activate via: ?dev=1 in the URL, or type "devmode" on the title screen

let devMode = new URLSearchParams(window.location.search).has('dev');
let devCodeBuffer = '';

window.addEventListener('keydown', (e) => {
  if (devMode) return;
  devCodeBuffer += e.key.toLowerCase();
  if (devCodeBuffer.length > 7) devCodeBuffer = devCodeBuffer.slice(-7);
  if (devCodeBuffer === 'devmode') {
    devMode = true;
    showDevToast('DEV MODE ACTIVATED');
  }
});

function showDevToast(msg: string) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:rgba(0,255,100,0.9);color:#000;padding:8px 20px;border-radius:6px;font-size:0.85rem;font-weight:bold;z-index:100;animation:fadeIn 0.3s ease-out;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ============ State ============

let gameState: GameState | null = null;
let progress: PlayerProgress = defaultProgress();
let storage: StorageService = new LocalStorageService();
let currentUser: AuthUser | null = null;
let currentTrack: TrackDef | null = null;
let lastLevelIndex = 0;
let pendingSwarmLevelIndex = 0; // level index waiting for swarm config
let lastSwarmLevel: import('./core/types').LevelDef | null = null; // cached swarm level with custom spawns
let rivalUseAstar = false;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputManager();

// ============ Screens ============

const titleScreen = document.getElementById('title-screen')!;
const trackScreen = document.getElementById('track-screen')!;
const levelScreen = document.getElementById('level-screen')!;
const pauseMenu = document.getElementById('pause-menu')!;
const gameoverScreen = document.getElementById('gameover-screen')!;
const btnGameMenu = document.getElementById('btn-game-menu')!;
const swarmConfig = document.getElementById('swarm-config')!;
const swarmSlider = document.getElementById('swarm-count') as HTMLInputElement;
const swarmCountVal = document.getElementById('swarm-count-val')!;
const allScreens = [titleScreen, trackScreen, levelScreen, pauseMenu, gameoverScreen, swarmConfig];

let activeScreen: HTMLElement | null = null;

function showScreen(screen: HTMLElement | null) {
  for (const s of allScreens) s.classList.add('hidden');
  if (screen) screen.classList.remove('hidden');
  const inGame = screen === null;
  btnGameMenu.classList.toggle('hidden', !inGame);
  activeScreen = screen;
  menuFocusIndex = 0;
  updateMenuFocus();
  input.enabled = (screen === null);
}

// ============ Keyboard Menu Navigation ============

let menuFocusIndex = 0;

function getMenuItems(): HTMLElement[] {
  if (!activeScreen) return [];
  if (activeScreen === trackScreen) {
    return Array.from(trackScreen.querySelectorAll<HTMLElement>('.track-card'));
  }
  if (activeScreen === levelScreen) {
    return Array.from(levelScreen.querySelectorAll<HTMLElement>('.level-card:not(.locked)'));
  }
  // For title, pause, gameover: return the visible buttons
  return Array.from(activeScreen.querySelectorAll<HTMLElement>('.btn:not(.btn-back)'));
}

function updateMenuFocus() {
  // Remove all existing focus highlights
  document.querySelectorAll('.kbd-focus').forEach(el => el.classList.remove('kbd-focus'));
  const items = getMenuItems();
  if (items.length === 0) return;
  if (menuFocusIndex < 0) menuFocusIndex = 0;
  if (menuFocusIndex >= items.length) menuFocusIndex = items.length - 1;
  items[menuFocusIndex].classList.add('kbd-focus');
  items[menuFocusIndex].scrollIntoView({ block: 'nearest' });
}

window.addEventListener('keydown', (e) => {
  if (!activeScreen) return;

  // Pause menu: Escape resumes
  if (activeScreen === pauseMenu && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
    e.preventDefault();
    hidePauseMenu();
    return;
  }

  // Game over screen: Escape goes to level select
  if (activeScreen === gameoverScreen && e.key === 'Escape') {
    e.preventDefault();
    document.getElementById('btn-gameover-levels')!.click();
    return;
  }

  // Track select: Escape goes back
  if (activeScreen === trackScreen && e.key === 'Escape') {
    e.preventDefault();
    showScreen(titleScreen);
    return;
  }

  // Level select: Escape goes back
  if (activeScreen === levelScreen && e.key === 'Escape') {
    e.preventDefault();
    showScreen(trackScreen);
    renderTrackSelect();
    return;
  }

  const items = getMenuItems();
  if (items.length === 0) return;

  const isGrid = activeScreen === levelScreen;
  const cols = isGrid ? 5 : 1;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      menuFocusIndex = Math.max(0, menuFocusIndex - cols);
      updateMenuFocus();
      break;
    case 'ArrowDown':
      e.preventDefault();
      menuFocusIndex = Math.min(items.length - 1, menuFocusIndex + cols);
      updateMenuFocus();
      break;
    case 'ArrowLeft':
      if (isGrid) {
        e.preventDefault();
        menuFocusIndex = Math.max(0, menuFocusIndex - 1);
        updateMenuFocus();
      }
      break;
    case 'ArrowRight':
      if (isGrid) {
        e.preventDefault();
        menuFocusIndex = Math.min(items.length - 1, menuFocusIndex + 1);
        updateMenuFocus();
      }
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      items[menuFocusIndex]?.click();
      break;
  }
});

function showPauseMenu() {
  if (!gameState) return;
  gameState = applyAction(gameState, Action.PAUSE);
  pauseMenu.classList.remove('hidden');
  btnGameMenu.classList.add('hidden');
  activeScreen = pauseMenu;
  menuFocusIndex = 0;
  updateMenuFocus();
  input.enabled = false;
  const info = document.getElementById('pause-level-info')!;
  const trackLabel = currentTrack ? currentTrack.name : '';
  info.textContent = `${trackLabel} - Level ${gameState.level.id}: ${gameState.level.name}  |  Score: ${gameState.score}  |  ${gameState.foodEaten}/${gameState.level.foodToWin} food`;
}

function hidePauseMenu() {
  if (!gameState) return;
  if (gameState.phase === GamePhase.PAUSED) {
    gameState = applyAction(gameState, Action.PAUSE);
  }
  pauseMenu.classList.add('hidden');
  btnGameMenu.classList.remove('hidden');
  activeScreen = null;
  input.enabled = true;
}

const GAMEOVER_MESSAGES = [
  'The snake sends its regards.',
  'Walls: undefeated since level 1.',
  'You tried your best. It wasn\'t enough.',
  'Plot twist: the food was eating YOU.',
  'Your snake is in another castle.',
  'Have you tried not hitting walls?',
  'The snake lived a short but meaningful life.',
  'RIP Snakey McSnakeface.',
  'Achievement unlocked: Game Over Expert.',
  'The floor is lava. And walls. And yourself.',
];

function showGameOver() {
  if (!gameState) return;
  const score = document.getElementById('gameover-score')!;
  const msg = document.getElementById('gameover-message')!;
  score.textContent = `Final Score: ${gameState.score}`;
  msg.textContent = GAMEOVER_MESSAGES[Math.floor(Math.random() * GAMEOVER_MESSAGES.length)];
  gameoverScreen.classList.remove('hidden');
  btnGameMenu.classList.add('hidden');
  activeScreen = gameoverScreen;
  menuFocusIndex = 0;
  updateMenuFocus();
  input.enabled = false;
}

// ============ Title Screen ============

const btnPlay = document.getElementById('btn-play-guest')!;
const authSection = document.getElementById('auth-section')!;
const playSvg = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

btnPlay.addEventListener('click', async () => {
  await loadProgress();
  showScreen(trackScreen);
  renderTrackSelect();
});

const btnGoogle = document.getElementById('btn-google')!;
const btnApple = document.getElementById('btn-apple')!;

const googleSvg = '<svg class="btn-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
const appleSvg = '<svg class="btn-icon" viewBox="0 0 24 24"><path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>';

function showAuthToast(msg: string) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(255,50,50,0.9);color:#fff;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:100;animation:fadeIn 0.3s ease-out;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

btnGoogle.addEventListener('click', async () => {
  if (!isAuthAvailable()) {
    showAuthToast('Google sign-in requires Firebase config (.env file)');
    return;
  }
  btnGoogle.textContent = 'Signing in...';
  try {
    const user = await signInWithGoogle();
    if (!user) {
      btnGoogle.innerHTML = `${googleSvg} Continue with Google`;
    }
  } catch (e) {
    console.error('Google sign-in error:', e);
    btnGoogle.innerHTML = `${googleSvg} Continue with Google`;
  }
});

btnApple.addEventListener('click', async () => {
  if (!isAuthAvailable()) {
    showAuthToast('Apple sign-in requires Firebase config (.env file)');
    return;
  }
  btnApple.textContent = 'Signing in...';
  const user = await signInWithApple();
  if (!user) {
    btnApple.innerHTML = `${appleSvg} Continue with Apple`;
  }
});

// ============ Auth ============

const userBar = document.getElementById('user-bar')!;

async function setupAuth() {
  await initAuth();

  onAuthChange(async (user) => {
    currentUser = user;
    updateUserBar();
    if (user) {
      try {
        const { getFirestore } = await import('firebase/firestore');
        const { getFirebaseApp } = await import('./auth/auth-service');
        const app = getFirebaseApp();
        if (app) {
          const db = getFirestore(app);
          const { CloudStorageService } = await import('./data/cloud-storage');
          const cloudStorage = new CloudStorageService(db, user.uid);
          const localProgress = await new LocalStorageService().loadProgress();

          // Timeout Firestore reads so a missing/disabled Firestore doesn't block the UI
          const cloudProgress = await Promise.race([
            cloudStorage.loadProgress(),
            new Promise<null>(r => setTimeout(() => r(null), 5000)),
          ]);

          if (localProgress && cloudProgress) {
            progress = mergeProgress(localProgress, cloudProgress);
          } else if (cloudProgress) {
            progress = cloudProgress;
          } else if (localProgress) {
            progress = localProgress;
          }
          storage = cloudStorage;
          await Promise.race([
            storage.saveProgress(progress),
            new Promise<void>(r => setTimeout(r, 5000)),
          ]);
        }
      } catch (e) {
        console.warn('Cloud storage setup failed, using local:', e);
      }
      await loadProgress();
      showScreen(trackScreen);
      renderTrackSelect();
    }
  });
}

function mergeProgress(a: PlayerProgress, b: PlayerProgress): PlayerProgress {
  const merged = defaultProgress();
  for (const id of Object.values(TrackId)) {
    const at = a.tracks[id] || { highestLevelUnlocked: 1, levelScores: {}, levelStars: {} };
    const bt = b.tracks[id] || { highestLevelUnlocked: 1, levelScores: {}, levelStars: {} };
    merged.tracks[id] = {
      highestLevelUnlocked: Math.max(at.highestLevelUnlocked, bt.highestLevelUnlocked),
      levelScores: {},
      levelStars: {},
    };
    const allIds = new Set([...Object.keys(at.levelScores).map(Number), ...Object.keys(bt.levelScores).map(Number)]);
    for (const lvlId of allIds) {
      merged.tracks[id].levelScores[lvlId] = Math.max(at.levelScores[lvlId] || 0, bt.levelScores[lvlId] || 0);
      merged.tracks[id].levelStars[lvlId] = Math.max(at.levelStars[lvlId] || 0, bt.levelStars[lvlId] || 0);
    }
  }
  merged.totalScore = Math.max(a.totalScore, b.totalScore);
  return merged;
}

function updateTitleScreen() {
  if (currentUser) {
    // Signed in: hide auth options, change button to "Play"
    authSection.classList.add('hidden');
    btnPlay.innerHTML = `${playSvg} Play`;
  } else {
    // Signed out: show auth options, change button back to "Play as Guest"
    authSection.classList.remove('hidden');
    btnPlay.innerHTML = `${playSvg} Play as Guest`;
    btnGoogle.innerHTML = `${googleSvg} Continue with Google`;
    btnApple.innerHTML = `${appleSvg} Continue with Apple`;
  }
}

function updateUserBar() {
  if (!currentUser) {
    userBar.classList.add('hidden');
    updateTitleScreen();
    return;
  }
  userBar.classList.remove('hidden');
  updateTitleScreen();
  userBar.innerHTML = `
    ${currentUser.photoURL ? `<img class="user-avatar" src="${currentUser.photoURL}" alt="">` : ''}
    <span class="user-name">${currentUser.displayName || currentUser.email || 'Player'}</span>
    <button class="btn-small" id="btn-signout">Sign Out</button>
  `;
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    await signOut();
    currentUser = null;
    storage = new LocalStorageService();
    updateUserBar();
    showScreen(titleScreen);
    gameState = null;
  });
}

// ============ Track Select ============

const trackGrid = document.getElementById('track-grid')!;

function getTrackProgressText(track: typeof ALL_TRACKS[0]): string {
  const tp = progress.tracks[track.id] || { highestLevelUnlocked: 1, levelScores: {}, levelStars: {} };
  const totalStars = Object.values(tp.levelStars).reduce((a, b) => a + b, 0);

  if (track.id === TrackId.INFINITE) {
    const levelsPlayed = Object.keys(tp.levelScores).length;
    if (levelsPlayed === 0) return 'Not started';
    return `${totalStars} \u2605 \u00B7 Level ${tp.highestLevelUnlocked} reached`;
  }

  const maxStars = track.levels.length * 3;
  if (totalStars === 0) return `${track.levels.length} levels`;
  return `${totalStars}/${maxStars} \u2605 \u00B7 ${track.levels.length} levels`;
}

function renderTrackSelect() {
  trackGrid.innerHTML = '';
  let animIndex = 0;

  for (const group of TRACK_GROUPS) {
    if (group.tracks.length === 0) continue;

    const groupLabel = document.createElement('div');
    groupLabel.className = 'track-group-label';
    groupLabel.textContent = group.label;
    trackGrid.appendChild(groupLabel);

    for (const track of group.tracks) {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.style.animationDelay = `${animIndex * 0.08}s`;
      card.dataset.color = track.color;

      const progressText = getTrackProgressText(track);

      card.innerHTML = `
        <div class="track-icon">${track.icon}</div>
        <div class="track-info">
          <div class="track-name" style="color: ${track.color}">${track.name}</div>
          <div class="track-desc">${track.description}</div>
        </div>
        <div class="track-progress-bar">${progressText}</div>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = track.color;
        card.style.boxShadow = `0 0 20px ${track.color}40`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      });
      card.addEventListener('click', () => {
        currentTrack = track;
        levelPage = 0;
        showScreen(levelScreen);
        renderLevelSelect();
      });

      trackGrid.appendChild(card);
      animIndex++;
    }
  }
}

document.getElementById('btn-back-title-from-tracks')!.addEventListener('click', () => {
  showScreen(titleScreen);
});

// ============ Level Select ============

const levelGrid = document.getElementById('level-grid')!;
const levelDesc = document.getElementById('level-description')!;

let levelPage = 0;
const LEVEL_PAGE_SIZE = 20;

function renderLevelSelect() {
  if (!currentTrack) return;
  const fixedLevels = currentTrack.levels;
  const fixedCount = fixedLevels.length;
  const tp = progress.tracks[currentTrack.id] || { highestLevelUnlocked: 1, levelScores: {}, levelStars: {} };
  const isInfiniteCapable = true;

  // In dev mode: show many levels and unlock all
  const highestUnlocked = devMode ? 9999 : tp.highestLevelUnlocked;
  const showUpTo = devMode
    ? Math.max(fixedCount, 100) // show first 100 in dev mode
    : Math.max(fixedCount, highestUnlocked + 5);

  // Pagination: only needed if we have more than LEVEL_PAGE_SIZE levels
  const needsPaging = showUpTo > LEVEL_PAGE_SIZE;
  const pageStart = needsPaging ? levelPage * LEVEL_PAGE_SIZE : 0;
  const pageEnd = needsPaging ? Math.min(pageStart + LEVEL_PAGE_SIZE, showUpTo) : showUpTo;

  // Title
  const titleEl = document.getElementById('level-screen-title')!;
  if (needsPaging) {
    titleEl.textContent = `${currentTrack.name} - LEVELS ${pageStart + 1}-${pageEnd}`;
  } else {
    titleEl.textContent = `${currentTrack.name} - SELECT LEVEL`;
  }
  titleEl.style.color = currentTrack.color;

  levelGrid.innerHTML = '';
  levelGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';

  // A* mode toggle for Rival track
  if (currentTrack.id === TrackId.RIVAL) {
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 0;';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-btn';
    toggleBtn.style.cssText = `font-size: 0.85rem; padding: 6px 18px; min-width: 160px; background: ${rivalUseAstar ? 'rgba(0,200,255,0.25)' : 'rgba(255,255,255,0.08)'}; border: 1px solid ${rivalUseAstar ? '#00c8ff' : 'rgba(255,255,255,0.2)'}; color: ${rivalUseAstar ? '#00c8ff' : '#888'};`;
    toggleBtn.textContent = `A\u2605 MODE: ${rivalUseAstar ? 'ON' : 'OFF'}`;
    toggleBtn.addEventListener('click', () => {
      rivalUseAstar = !rivalUseAstar;
      renderLevelSelect();
    });
    toggleRow.appendChild(toggleBtn);
    levelGrid.appendChild(toggleRow);
  }

  for (let i = pageStart; i < pageEnd; i++) {
    const levelNum = i + 1; // 1-based display number
    const isFixed = i < fixedCount;
    const unlocked = levelNum <= highestUnlocked;
    const stars = tp.levelStars[levelNum] || 0;
    const score = tp.levelScores[levelNum] || 0;
    const isProcedural = !isFixed && isInfiniteCapable;

    const card = document.createElement('div');
    card.className = `level-card${unlocked ? '' : ' locked'}`;
    card.style.animationDelay = `${(i - pageStart) * 0.03}s`;

    // Highlight procedural levels differently
    if (isProcedural && unlocked) {
      card.style.borderColor = 'rgba(0, 200, 255, 0.3)';
    }

    if (unlocked) {
      const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
      const label = isFixed ? fixedLevels[i].name : '';
      card.innerHTML = `
        <div class="level-number">${levelNum}</div>
        <div class="level-stars">${stars > 0 ? starStr : ''}</div>
        <div class="level-name-label">${label}</div>
      `;
      card.addEventListener('mouseenter', () => {
        if (isFixed) {
          levelDesc.textContent = fixedLevels[i].description + (score > 0 ? ` Best: ${score}` : '');
        } else {
          const gen = generateLevel(levelNum, currentTrack!.id);
          levelDesc.textContent = gen.description + (score > 0 ? ` Best: ${score}` : '');
        }
      });
      card.addEventListener('mouseleave', () => { levelDesc.textContent = ''; });
      card.addEventListener('click', () => startLevel(i));
    } else {
      card.innerHTML = `<div class="lock-icon">\u{1F512}</div>`;
    }

    levelGrid.appendChild(card);
  }

  // Page navigation
  if (needsPaging) {
    const navDiv = document.createElement('div');
    navDiv.style.cssText = 'display:flex;gap:12px;margin-top:8px;grid-column:1/-1;justify-content:center;';

    if (levelPage > 0) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn';
      prevBtn.style.cssText = 'width:auto;padding:8px 20px;font-size:0.8rem;';
      prevBtn.textContent = '\u25C0 Previous';
      prevBtn.addEventListener('click', () => { levelPage--; renderLevelSelect(); });
      navDiv.appendChild(prevBtn);
    }

    const maxPage = Math.floor((showUpTo - 1) / LEVEL_PAGE_SIZE);
    if (levelPage < maxPage) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn';
      nextBtn.style.cssText = 'width:auto;padding:8px 20px;font-size:0.8rem;';
      nextBtn.textContent = 'Next \u25B6';
      nextBtn.addEventListener('click', () => { levelPage++; renderLevelSelect(); });
      navDiv.appendChild(nextBtn);
    }

    if (navDiv.children.length > 0) {
      levelGrid.appendChild(navDiv);
    }
  }
}

document.getElementById('btn-back-tracks')!.addEventListener('click', () => {
  showScreen(trackScreen);
  renderTrackSelect();
});

function startProceduralLevel(levelNum: number) {
  if (!currentTrack) return;
  const level = generateLevel(levelNum, currentTrack.id);
  showScreen(null);
  lastLevelIndex = levelNum - 1;
  gameState = createInitialState(level, levelNum - 1, 3, 0, currentTrack.id);
  if (currentTrack.id === TrackId.RIVAL) gameState!.useAstar = rivalUseAstar;
  input.setMode(currentTrack.id);
  renderer.resize();
  renderer.getParticles().clear();
  renderer.clearFloatingTexts();
}

// ============ Game Logic ============

function startLevel(levelIndex: number) {
  if (!currentTrack) return;
  const fixedCount = currentTrack.levels.length;

  // If beyond fixed levels, use procedural generation
  if (levelIndex >= fixedCount) {
    const proceduralNum = levelIndex + 1; // 1-based level number for procedural
    startProceduralLevel(proceduralNum);
    return;
  }

  // Swarm track: show config modal to pick snake count
  if (currentTrack.id === TrackId.SWARM) {
    pendingSwarmLevelIndex = levelIndex;
    const level = currentTrack.levels[levelIndex];
    document.getElementById('swarm-level-name')!.textContent = `LV.${level.id} ${level.name} — ${level.description}`;
    showScreen(swarmConfig);
    return;
  }

  launchLevel(levelIndex);
}

function launchLevel(levelIndex: number, overrideLevel?: import('./core/types').LevelDef) {
  if (!currentTrack) return;
  showScreen(null);
  lastLevelIndex = levelIndex;
  // For swarm: use override or cached level with custom snake count
  let level: import('./core/types').LevelDef;
  if (overrideLevel) {
    level = overrideLevel;
    lastSwarmLevel = overrideLevel;
  } else if (currentTrack.id === TrackId.SWARM && lastSwarmLevel && lastSwarmLevel.id === currentTrack.levels[levelIndex].id) {
    level = lastSwarmLevel;
  } else {
    level = currentTrack.levels[levelIndex];
    lastSwarmLevel = null;
  }
  gameState = createInitialState(level, levelIndex, 3, 0, currentTrack.id);
  if (currentTrack.id === TrackId.RIVAL) gameState!.useAstar = rivalUseAstar;
  input.setMode(currentTrack.id);
  renderer.resize();
  renderer.getParticles().clear();
  renderer.clearFloatingTexts();
}

/** Generate N spawn positions distributed around the arena edges */
function generateSwarmSpawns(
  count: number, gridW: number, gridH: number, walls: { x: number; y: number }[],
): { pos: { x: number; y: number }; dir: Direction }[] {
  const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));
  const centerX = Math.floor(gridW / 2);
  const centerY = Math.floor(gridH / 2);
  // Player starts at center — avoid spawning within 5 cells of center
  const safeR = 5;
  const spawns: { pos: { x: number; y: number }; dir: Direction }[] = [];

  // Build candidate positions along inner edges (2 cells from wall)
  const candidates: { pos: { x: number; y: number }; dir: Direction }[] = [];
  const margin = 3; // distance from border wall
  // Top row
  for (let x = margin; x < gridW - margin; x += 2) {
    if (!wallSet.has(`${x},${margin}`)) candidates.push({ pos: { x, y: margin }, dir: Direction.DOWN });
  }
  // Bottom row
  for (let x = margin; x < gridW - margin; x += 2) {
    if (!wallSet.has(`${x},${gridH - margin - 1}`)) candidates.push({ pos: { x, y: gridH - margin - 1 }, dir: Direction.UP });
  }
  // Left col
  for (let y = margin + 2; y < gridH - margin - 2; y += 2) {
    if (!wallSet.has(`${margin},${y}`)) candidates.push({ pos: { x: margin, y }, dir: Direction.RIGHT });
  }
  // Right col
  for (let y = margin + 2; y < gridH - margin - 2; y += 2) {
    if (!wallSet.has(`${gridW - margin - 1},${y}`)) candidates.push({ pos: { x: gridW - margin - 1, y }, dir: Direction.LEFT });
  }

  // Filter out positions too close to center (player start)
  const safe = candidates.filter(c =>
    Math.abs(c.pos.x - centerX) > safeR || Math.abs(c.pos.y - centerY) > safeR
  );

  // Pick up to `count` positions, cycling through candidates if needed
  for (let i = 0; i < count; i++) {
    const pool = safe.length > 0 ? safe : candidates;
    spawns.push(pool[i % pool.length]);
  }
  return spawns;
}

async function loadProgress() {
  const loaded = await storage.loadProgress();
  if (loaded) progress = loaded;
}

async function saveProgress() {
  await storage.saveProgress(progress);
}

function handleEvents(events: GameEvent[]) {
  for (const ev of events) {
    switch (ev.type) {
      case 'food_eaten':
        renderer.emitFoodParticles(ev.pos);
        break;
      case 'special_food_eaten':
        renderer.emitSpecialFoodParticles(ev.pos);
        break;
      case 'death':
        if (ev.player === 'rival') {
          renderer.emitRivalDeathParticles(ev.pos);
        } else {
          renderer.emitDeathParticles(ev.pos);
        }
        break;
      case 'rival_ate_food':
        renderer.emitRivalAteParticles(ev.pos);
        break;
      case 'portal_used':
        renderer.emitPortalParticles(ev.from);
        renderer.emitPortalParticles(ev.to);
        break;
      case 'level_complete': {
        if (!gameState || !currentTrack) break;
        const lvl = gameState.level;
        const score = gameState.levelScore;
        let stars = 1;
        if (score >= lvl.foodToWin * 15) stars = 2;
        if (score >= lvl.foodToWin * 25) stars = 3;

        const tp = progress.tracks[currentTrack.id];
        if (!tp.levelScores[lvl.id] || score > tp.levelScores[lvl.id]) {
          tp.levelScores[lvl.id] = score;
        }
        if (!tp.levelStars[lvl.id] || stars > tp.levelStars[lvl.id]) {
          tp.levelStars[lvl.id] = stars;
        }
        const nextLevel = gameState.levelIndex + 2;
        if (nextLevel > tp.highestLevelUnlocked) {
          // No cap — all tracks can go infinite
          tp.highestLevelUnlocked = nextLevel;
        }
        progress.totalScore = Object.values(progress.tracks).reduce(
          (sum, t) => sum + Object.values(t.levelScores).reduce((a, b) => a + b, 0), 0
        );
        saveProgress();
        break;
      }
    }
  }
}

// ============ In-Game Menu Buttons ============

btnGameMenu.addEventListener('click', () => showPauseMenu());

document.getElementById('btn-resume')!.addEventListener('click', () => hidePauseMenu());

document.getElementById('btn-restart')!.addEventListener('click', () => {
  pauseMenu.classList.add('hidden');
  launchLevel(lastLevelIndex);
});

document.getElementById('btn-quit-to-levels')!.addEventListener('click', () => {
  gameState = null;
  showScreen(levelScreen);
  renderLevelSelect();
});

document.getElementById('btn-quit-to-title')!.addEventListener('click', () => {
  gameState = null;
  showScreen(titleScreen);
});

document.getElementById('btn-retry')!.addEventListener('click', () => {
  gameoverScreen.classList.add('hidden');
  launchLevel(lastLevelIndex);
});

document.getElementById('btn-gameover-levels')!.addEventListener('click', () => {
  gameState = null;
  showScreen(levelScreen);
  renderLevelSelect();
});

document.getElementById('btn-gameover-title')!.addEventListener('click', () => {
  gameState = null;
  showScreen(titleScreen);
});

// ============ Swarm Config ============

swarmSlider.addEventListener('input', () => {
  swarmCountVal.textContent = swarmSlider.value;
});

document.getElementById('btn-swarm-start')!.addEventListener('click', () => {
  if (!currentTrack) return;
  const count = Math.min(20, Math.max(1, parseInt(swarmSlider.value, 10) || 5));
  const level = { ...currentTrack.levels[pendingSwarmLevelIndex] };
  level.swarmSpawns = generateSwarmSpawns(count, level.gridWidth, level.gridHeight, level.walls);
  launchLevel(pendingSwarmLevelIndex, level);
});

document.getElementById('btn-swarm-back')!.addEventListener('click', () => {
  showScreen(levelScreen);
  renderLevelSelect();
});

// ============ Game Loop ============

let lastTime = 0;

function gameLoop(timestamp: number) {
  const dt = lastTime ? Math.min(timestamp - lastTime, 100) : 16;
  lastTime = timestamp;

  if (gameState) {
    const actions = input.drain();
    if (gameState.phase !== GamePhase.COUNTDOWN) {
      for (const action of actions) {
        if (action === Action.PAUSE) {
          if (gameState.phase === GamePhase.PLAYING) {
            showPauseMenu();
          } else if (gameState.phase === GamePhase.PAUSED) {
            hidePauseMenu();
          }
          continue;
        }
        gameState = applyAction(gameState, action);
      }
    }

    if (gameState.phase === GamePhase.COUNTDOWN || gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.DYING || gameState.phase === GamePhase.LEVEL_COMPLETE) {
      const result = tick(gameState, dt);
      gameState = result.state;
      handleEvents(result.events);
    }

    if (gameState.phase === GamePhase.TITLE) {
      showGameOver();
      renderer.getParticles().clear();
      renderer.clearFloatingTexts();
      gameState = null;
    } else if (gameState.phase === GamePhase.LEVEL_SELECT) {
      // Level complete — go back to level select for all tracks
      gameState = null;
      showScreen(levelScreen);
      renderLevelSelect();
    }

    if (gameState) {
      renderer.draw(gameState, dt);
      // Position the hamburger button to align with the top HUD panel
      const pos = renderer.getMenuButtonPosition();
      btnGameMenu.style.top = `${pos.y}px`;
      btnGameMenu.style.left = `${pos.x}px`;
    }
  }

  requestAnimationFrame(gameLoop);
}

// ============ Init ============

function init() {
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  showScreen(titleScreen);
  setupAuth();
  loadProgress();
  requestAnimationFrame(gameLoop);
}

init();
