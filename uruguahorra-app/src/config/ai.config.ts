/**
 * AI Services Configuration
 */

export const AI_CONFIG = {
  // OpenAI Configuration
  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY || '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',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',

  // Transcription Configuration
  TRANSCRIPTION_MODEL: 'whisper-1',
  TRANSCRIPTION_TIMEOUT: 15000, // 15 seconds
  TRANSCRIPTION_LANGUAGE: 'es', // Spanish

  // Chat/Parsing Configuration
  CHAT_MODEL: 'gpt-4o-mini', // Using GPT-4o-mini as requested
  PARSING_TIMEOUT: 10000, // 10 seconds
  PARSING_TEMPERATURE: 0.1, // Low temperature for consistent parsing

  // Audio Configuration
  MAX_RECORDING_DURATION: 30000, // 30 seconds
  AUDIO_QUALITY: 'medium' as const,

  // Confidence Thresholds
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,
  MIN_CONFIDENCE_THRESHOLD: 0.3,

  // MCP Configuration
  MCP_ENABLED: true,
  MCP_BASE_URL: 'http://localhost:8080/mcp',
  MCP_TIMEOUT: 15000,
  MCP_FALLBACK_ENABLED: true,
} as const;
