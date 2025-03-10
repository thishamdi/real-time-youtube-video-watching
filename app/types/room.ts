export interface RoomState {
    videoUrl: string;
    isPlaying: boolean;
    currentTime: number;
  }
  
  export interface Message {
    sender: string;
    message: string;
    timestamp: Date;
  }
  
  export type VideoControls = {
    play: (time: number) => void;
    pause: (time: number) => void;
    seek: (time: number) => void;
  };