import { Action, TrackId } from '../core/types';

export class InputManager {
  private actionQueue: Action[] = [];
  private touchStartX = 0;
  private touchStartY = 0;
  private mode: TrackId = TrackId.CLASSIC;
  enabled = true;

  private onKeyDownBound = this.onKeyDown.bind(this);
  private onTouchStartBound = this.onTouchStart.bind(this);
  private onTouchEndBound = this.onTouchEnd.bind(this);

  constructor() {
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    window.addEventListener('touchend', this.onTouchEndBound, { passive: false });
  }

  setMode(mode: TrackId) {
    this.mode = mode;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;

    switch (e.key) {
      // Arrow keys: always P1
      case 'ArrowUp':
        e.preventDefault();
        this.actionQueue.push(Action.UP);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.actionQueue.push(Action.DOWN);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.actionQueue.push(Action.LEFT);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.actionQueue.push(Action.RIGHT);
        break;

      // WASD: always P1
      case 'w': case 'W':
        e.preventDefault();
        this.actionQueue.push(Action.UP);
        break;
      case 's': case 'S':
        e.preventDefault();
        this.actionQueue.push(Action.DOWN);
        break;
      case 'a': case 'A':
        e.preventDefault();
        this.actionQueue.push(Action.LEFT);
        break;
      case 'd': case 'D':
        e.preventDefault();
        this.actionQueue.push(Action.RIGHT);
        break;

      case 'Escape':
      case 'p':
      case 'P':
        this.actionQueue.push(Action.PAUSE);
        break;
      case 'Enter':
      case ' ':
        this.actionQueue.push(Action.CONFIRM);
        break;
    }
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
      this.actionQueue.push(Action.CONFIRM);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.actionQueue.push(dx > 0 ? Action.RIGHT : Action.LEFT);
    } else {
      this.actionQueue.push(dy > 0 ? Action.DOWN : Action.UP);
    }
  }

  drain(): Action[] {
    const actions = [...this.actionQueue];
    this.actionQueue = [];
    return actions;
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('touchstart', this.onTouchStartBound);
    window.removeEventListener('touchend', this.onTouchEndBound);
  }
}
