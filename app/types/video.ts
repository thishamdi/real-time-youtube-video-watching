export interface VideoPlayerProps {
    url: string;
    isPlaying: boolean;
    currentTime: number;
    onPlay: (time: number) => void;
    onPause: (time: number) => void;
    onSeek: (time: number) => void;
    onTimeUpdate: (time: number, isPlaying: boolean) => void;
}

export interface ReactPlayerProgress {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
}

export interface SyncUpdate {
    currentTime: number;
    isPlaying: boolean;
}

export enum YouTubePlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5
}
