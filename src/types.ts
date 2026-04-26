export type RiskLevel = 'low' | 'medium' | 'high';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type TargetType = 'phone' | 'username';
export type ReportStatus = 'pending' | 'under_review' | 'action_taken' | 'dismissed';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
}

export interface AIAnalysis {
  type: string;
  severity: RiskLevel;
  confidence: number;
  extractedText?: string;
  sttResult?: string;
  consistencyFlag?: 'consistent' | 'inconsistent' | 'verified';
  sentiment?: string;
  intent?: string;
  threatLevel?: ThreatLevel;
}

export interface Report {
  id: string;
  userId: string;
  targetValue: string;
  targetType: TargetType;
  description: string;
  imageUrl?: string;
  audioUrl?: string;
  aiAnalysis?: AIAnalysis;
  extractedText?: string;
  consistencyFlag?: string;
  isManual?: boolean;
  status?: ReportStatus;
  createdAt: number;
}
