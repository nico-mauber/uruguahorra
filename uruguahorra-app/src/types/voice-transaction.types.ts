export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  error: string | null;
}

export interface AudioTranscription {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
}

export interface ParsedTransaction {
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description?: string;
  confidence: number;
  suggestedCategory?: {
    id: string;
    name: string;
    emoji: string;
  };
}

export interface VoiceTransactionResult {
  success: boolean;
  transcription?: AudioTranscription;
  parsedTransaction?: ParsedTransaction;
  error?: string;
  needsConfirmation: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  toolUsed?: string;
}

export interface VoiceTransactionConfig {
  maxRecordingDuration: number;
  audioQuality: 'low' | 'medium' | 'high';
  transcriptionTimeout: number;
  parsingTimeout: number;
  enableMCP: boolean;
  fallbackToDirectService: boolean;
}

export type VoiceTransactionStep =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'confirming'
  | 'creating'
  | 'success'
  | 'error';

export interface VoiceTransactionProgress {
  currentStep: VoiceTransactionStep;
  progress: number;
  message: string;
}
