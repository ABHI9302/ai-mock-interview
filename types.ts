export enum InterviewState {
  SETUP = 'SETUP',
  CONNECTING = 'CONNECTING',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

export interface InterviewConfig {
  jobRole: string;
  topic: string;
  difficulty: 'Junior' | 'Mid-Level' | 'Senior' | 'Expert';
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export type AudioVolumeCallback = (volume: number) => void;
