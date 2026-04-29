export enum PlantStatus { HEALTHY = 'HEALTHY', THIRSTY = 'THIRSTY', SICK = 'SICK', UNKNOWN = 'UNKNOWN' }
export enum LightLevel { LOW = 'LOW', ADEQUATE = 'ADEQUATE', HIGH = 'HIGH', UNKNOWN = 'UNKNOWN' }
export interface GpsCoords { latitude: number; longitude: number; accuracy?: number; }
export type EucalyptusSpecies = 'E. globulus' | 'E. nitens' | 'E. camaldulensis' | 'desconhecida';
export type ThreatType = 'gonipterus' | 'phoracantha' | 'mycosphaerella' | 'deficiencia_N' | 'deficiencia_K' | 'deficiencia_Mg' | 'invasora' | 'nenhuma';
export const INVASIVE_SPECIES_PT = ['Acacia dealbata', 'Acacia melanoxylon', 'Acacia longifolia', 'Hakea sericea', 'Hakea salicifolia', 'Pittosporum undulatum', 'Robinia pseudoacacia'] as const;
export type SeverityLevel = 0 | 1 | 2 | 3;
export type HealthStatus = 'Saudável' | 'Em Stress' | 'Doente' | 'Crítico';
export type ForestryRisk = 'Baixo' | 'Médio' | 'Alto';
export interface EucalyptusAnalysis { species: EucalyptusSpecies | string; healthStatus: HealthStatus; threatDetected: ThreatType; severityLevel: SeverityLevel; forestryRisk: ForestryRisk; recommendations: string[]; raizReference: string; summary: string; lightLevel: LightLevel; confidence: number; isInvasive: boolean; invasiveSpecies: string | null; }
export interface AnalysisResult extends EucalyptusAnalysis { status: PlantStatus; recommendation: string; isPending?: boolean; imageBase64?: string; }
export interface HistoryItem extends AnalysisResult { id: string; analysisId: number; timestamp: number; imageUrl: string; coords: GpsCoords | null; isLegacy?: boolean; removedAt?: number | null; }
export interface VoiceState { isSpeaking: boolean; voiceName: string; }
