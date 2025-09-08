import { Platform } from 'react-native';
import { logger, LogModule } from '@/utils/logger';
import {
  AudioTranscription,
  VoiceTransactionConfig,
} from '@/types/voice-transaction.types';
import { AI_CONFIG } from '@/config/ai.config';

export class AITranscriptionService {
  private static readonly OPENAI_API_URL = `${AI_CONFIG.OPENAI_BASE_URL}/audio/transcriptions`;
  private static readonly DEFAULT_CONFIG: Partial<VoiceTransactionConfig> = {
    transcriptionTimeout: AI_CONFIG.TRANSCRIPTION_TIMEOUT,
    audioQuality: AI_CONFIG.AUDIO_QUALITY,
  };

  /**
   * Prepare audio file for transcription based on platform
   */
  private static async prepareAudioFile(audioUri: string): Promise<{
    uri: string;
    type: string;
    name: string;
  }> {
    try {
      if (Platform.OS === 'web') {
        // On web, we need to handle the audio file differently
        logger.info(LogModule.TRANSACTIONS, 'Preparing web audio file', {
          originalUri: audioUri.substring(0, 100) + '...',
        });

        // For web, try to read the file as a blob and ensure correct format
        const response = await fetch(audioUri);
        if (!response.ok) {
          throw new Error(`Failed to read audio file: ${response.status}`);
        }

        const blob = await response.blob();
        logger.info(LogModule.TRANSACTIONS, 'Audio blob details', {
          size: blob.size,
          type: blob.type,
        });

        // Ensure we have some audio data
        if (blob.size === 0) {
          throw new Error('Audio file is empty');
        }

        // For OpenAI Whisper, we need to support: mp3, mp4, mpeg, mpga, m4a, wav, or webm
        let mimeType = blob.type;
        let extension = 'wav';

        if (mimeType.includes('webm')) {
          extension = 'webm';
        } else if (mimeType.includes('wav')) {
          extension = 'wav';
        } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
          extension = 'm4a';
        } else {
          // Default to wav for web
          extension = 'wav';
          mimeType = 'audio/wav';
        }

        return {
          uri: audioUri,
          type: mimeType,
          name: `voice_transaction.${extension}`,
        };
      } else {
        // Mobile platforms (iOS/Android)
        return {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'voice_transaction.m4a',
        };
      }
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error preparing audio file', error);
      throw new Error('Archivo de audio inválido');
    }
  }

  /**
   * Transcribe audio to text using OpenAI Whisper (GPT-4o-mini-transcribe)
   */
  static async transcribeAudio(
    audioUri: string,
    config?: Partial<VoiceTransactionConfig>
  ): Promise<AudioTranscription> {
    try {
      logger.info(LogModule.TRANSACTIONS, 'Iniciando transcripción de audio', {
        audioUri: audioUri.substring(0, 50) + '...',
        config,
      });

      const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

      // Use configured API key
      const apiKey = AI_CONFIG.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Prepare audio file for the specific platform
      const audioFile = await this.prepareAudioFile(audioUri);
      logger.info(
        LogModule.TRANSACTIONS,
        'Audio file prepared for transcription',
        {
          platform: Platform.OS,
          type: audioFile.type,
          name: audioFile.name,
          uriLength: audioFile.uri.length,
        }
      );

      // Prepare form data for audio file
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // For web, we need to handle the file as a blob
        const response = await fetch(audioFile.uri);
        const blob = await response.blob();
        logger.info(LogModule.TRANSACTIONS, 'Web audio blob created', {
          size: blob.size,
          type: blob.type,
        });
        formData.append('file', blob, audioFile.name);
      } else {
        // For mobile platforms
        formData.append('file', {
          uri: audioFile.uri,
          type: audioFile.type,
          name: audioFile.name,
        } as any);
      }

      formData.append('model', AI_CONFIG.TRANSCRIPTION_MODEL);
      formData.append('language', AI_CONFIG.TRANSCRIPTION_LANGUAGE);
      formData.append('response_format', 'verbose_json');

      const startTime = Date.now();

      // Make API request with timeout
      const response = await this.makeTranscriptionRequest(
        formData,
        apiKey,
        mergedConfig.transcriptionTimeout!
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      const transcription: AudioTranscription = {
        text: result.text?.trim() || '',
        confidence: this.calculateConfidence(result),
        language: result.language || 'es',
        duration,
      };

      logger.success(LogModule.TRANSACTIONS, 'Transcripción completada', {
        text: transcription.text,
        confidence: transcription.confidence,
        duration: transcription.duration,
      });

      return transcription;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error en transcripción de audio',
        error
      );
      throw this.handleTranscriptionError(error);
    }
  }

  /**
   * Validate audio file before transcription
   */
  static async validateAudioFile(audioUri: string): Promise<boolean> {
    try {
      logger.info(LogModule.TRANSACTIONS, 'Validating audio file', {
        audioUri: audioUri.substring(0, 100) + '...',
        platform: Platform.OS,
      });

      // Basic validation - check if URI exists
      if (!audioUri || audioUri.length === 0) {
        logger.warn(LogModule.TRANSACTIONS, 'Audio URI is empty');
        return false;
      }

      // Platform-specific URI validation
      if (Platform.OS === 'web') {
        // Web uses blob: or data: URLs
        if (!audioUri.startsWith('blob:') && !audioUri.startsWith('data:')) {
          logger.warn(LogModule.TRANSACTIONS, 'Web audio URI invalid format', {
            audioUri,
          });
          return false;
        }
      } else {
        // Mobile uses file:// URIs
        if (!audioUri.includes('file://')) {
          logger.warn(
            LogModule.TRANSACTIONS,
            'Mobile audio URI invalid format',
            { audioUri }
          );
          return false;
        }
      }

      // For web, try to validate the blob/data URL by fetching it
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(audioUri);
          if (!response.ok) {
            logger.warn(LogModule.TRANSACTIONS, 'Web audio URL fetch failed', {
              status: response.status,
            });
            return false;
          }

          const blob = await response.blob();
          if (blob.size === 0) {
            logger.warn(LogModule.TRANSACTIONS, 'Web audio blob is empty');
            return false;
          }

          logger.info(
            LogModule.TRANSACTIONS,
            'Web audio validation successful',
            {
              blobSize: blob.size,
              blobType: blob.type,
            }
          );
        } catch (fetchError) {
          logger.warn(
            LogModule.TRANSACTIONS,
            'Web audio fetch validation failed',
            fetchError
          );
          return false;
        }
      }

      logger.info(LogModule.TRANSACTIONS, 'Audio file validation successful');
      return true;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error validating audio file',
        error
      );
      return false;
    }
  }

  /**
   * Get audio duration from file (if available)
   */
  static async getAudioDuration(audioUri: string): Promise<number> {
    try {
      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      if (status.isLoaded && status.durationMillis) {
        return status.durationMillis;
      }
      return 0;
    } catch (error) {
      logger.warn(
        LogModule.TRANSACTIONS,
        'Could not get audio duration',
        error
      );
      return 0;
    }
  }

  private static async makeTranscriptionRequest(
    formData: FormData,
    apiKey: string,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private static calculateConfidence(result: any): number {
    // OpenAI Whisper doesn't provide direct confidence scores
    // We estimate confidence based on available data
    try {
      // Factors that might indicate confidence:
      // - Length of transcription
      // - Presence of unclear markers
      // - Language detection certainty

      const text = result.text || '';
      const hasLanguage = !!result.language;
      const hasWords = text.split(' ').length > 1;

      let confidence = 0.7; // Base confidence

      if (hasLanguage) confidence += 0.1;
      if (hasWords) confidence += 0.1;
      if (text.length > 10) confidence += 0.1;

      // Reduce confidence if text seems unclear
      if (text.includes('[inaudible]') || text.includes('...')) {
        confidence -= 0.2;
      }

      return Math.max(0, Math.min(1, confidence));
    } catch (error) {
      return 0.5; // Default confidence
    }
  }

  private static handleTranscriptionError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error(
        'Transcription timed out. Please try a shorter audio clip.'
      );
    }

    if (error.message?.includes('API key')) {
      return new Error('OpenAI API not configured. Please contact support.');
    }

    if (error.message?.includes('file format')) {
      return new Error('Audio format not supported. Please try again.');
    }

    return new Error(
      `Transcription failed: ${error.message || 'Unknown error'}`
    );
  }
}
