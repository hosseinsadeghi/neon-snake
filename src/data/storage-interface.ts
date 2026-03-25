import { PlayerProgress, TrackId, TrackProgress } from '../core/types';

export interface StorageService {
  saveProgress(progress: PlayerProgress): Promise<void>;
  loadProgress(): Promise<PlayerProgress | null>;
}

function defaultTrackProgress(): TrackProgress {
  return {
    highestLevelUnlocked: 1,
    levelScores: {},
    levelStars: {},
  };
}

export function defaultProgress(): PlayerProgress {
  return {
    tracks: {
      [TrackId.CLASSIC]: defaultTrackProgress(),
      [TrackId.RIVAL]: defaultTrackProgress(),
      [TrackId.INFINITE]: defaultTrackProgress(),
      [TrackId.SWARM]: defaultTrackProgress(),
    },
    totalScore: 0,
  };
}

/** Migrate old flat progress format to new per-track format */
export function migrateProgress(data: any): PlayerProgress {
  // Already new format
  if (data.tracks) {
    // Ensure all tracks exist
    const p = data as PlayerProgress;
    for (const id of Object.values(TrackId)) {
      if (!p.tracks[id]) {
        p.tracks[id] = defaultTrackProgress();
      }
    }
    return p;
  }
  // Old flat format: migrate to classic track
  const progress = defaultProgress();
  if (data.highestLevelUnlocked) {
    progress.tracks[TrackId.CLASSIC] = {
      highestLevelUnlocked: data.highestLevelUnlocked,
      levelScores: data.levelScores || {},
      levelStars: data.levelStars || {},
    };
  }
  progress.totalScore = data.totalScore || 0;
  return progress;
}
