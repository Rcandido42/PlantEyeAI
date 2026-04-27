
export enum PlantStatus {
  HEALTHY = 'HEALTHY',
  THIRSTY = 'THIRSTY',
  SICK = 'SICK',
  UNKNOWN = 'UNKNOWN'
}

export enum LightLevel {
  LOW = 'LOW',
  ADEQUATE = 'ADEQUATE',
  HIGH = 'HIGH',
  UNKNOWN = 'UNKNOWN'
}

export interface AnalysisResult {
  species: string;
  status: PlantStatus;
  lightLevel: LightLevel;
  summary: string;
  recommendation: string;
  confidence: number;
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
  imageUrl: string;
}

export interface VoiceState {
  isSpeaking: boolean;
  voiceName: string;
}
