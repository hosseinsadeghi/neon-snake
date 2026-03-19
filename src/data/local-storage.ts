import { PlayerProgress } from '../core/types';
import { StorageService, migrateProgress } from './storage-interface';

const STORAGE_KEY = 'neon_snake_progress';

export class LocalStorageService implements StorageService {
  async saveProgress(progress: PlayerProgress): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage full or unavailable
    }
  }

  async loadProgress(): Promise<PlayerProgress | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return migrateProgress(parsed);
      }
    } catch {
      // Corrupted data
    }
    return null;
  }
}
