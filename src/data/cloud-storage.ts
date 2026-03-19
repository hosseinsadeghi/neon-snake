import { PlayerProgress } from '../core/types';
import { StorageService, migrateProgress } from './storage-interface';

// Firebase Firestore implementation
// Requires Firebase to be initialized in main.ts
export class CloudStorageService implements StorageService {
  private db: any;
  private uid: string;

  constructor(db: any, uid: string) {
    this.db = db;
    this.uid = uid;
  }

  async saveProgress(progress: PlayerProgress): Promise<void> {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(this.db, 'users', this.uid), {
        progress,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.error('Cloud save failed:', e);
    }
  }

  async loadProgress(): Promise<PlayerProgress | null> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(this.db, 'users', this.uid));
      if (snap.exists()) {
        return migrateProgress(snap.data().progress);
      }
    } catch (e) {
      console.error('Cloud load failed:', e);
    }
    return null;
  }
}
