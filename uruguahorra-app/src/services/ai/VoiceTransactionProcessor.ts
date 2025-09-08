import { logger, LogModule } from '@/utils/logger';
import { AITranscriptionService } from './AITranscriptionService';
import { AITransactionParserService } from './AITransactionParserService';
import { MCPService } from '../mcp/MCPService';
import { TransactionsService } from '../transactions.service';
import { AI_CONFIG } from '@/config/ai.config';
import {
  VoiceTransactionResult,
  VoiceTransactionProgress,
  VoiceTransactionStep,
  VoiceTransactionConfig,
  AudioTranscription,
  ParsedTransaction,
} from '@/types/voice-transaction.types';
import { Transaction } from '@/schemas';

export class VoiceTransactionProcessor {
  private static readonly DEFAULT_CONFIG: VoiceTransactionConfig = {
    maxRecordingDuration: AI_CONFIG.MAX_RECORDING_DURATION,
    audioQuality: AI_CONFIG.AUDIO_QUALITY,
    transcriptionTimeout: AI_CONFIG.TRANSCRIPTION_TIMEOUT,
    parsingTimeout: AI_CONFIG.PARSING_TIMEOUT,
    enableMCP: AI_CONFIG.MCP_ENABLED,
    fallbackToDirectService: AI_CONFIG.MCP_FALLBACK_ENABLED,
  };

  private static config: VoiceTransactionConfig = { ...this.DEFAULT_CONFIG };
  private static progressCallback:
    | ((progress: VoiceTransactionProgress) => void)
    | null = null;

  /**
   * Configure the voice transaction processor
   */
  static configure(config: Partial<VoiceTransactionConfig>): void {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    logger.info(
      LogModule.TRANSACTIONS,
      'VoiceTransactionProcessor configured',
      this.config
    );
  }

  /**
   * Set progress callback to receive updates during processing
   */
  static setProgressCallback(
    callback: (progress: VoiceTransactionProgress) => void
  ): void {
    this.progressCallback = callback;
  }

  /**
   * Main method to process voice transaction from audio URI to created transaction
   */
  static async processVoiceTransaction(
    audioUri: string,
    userId: string,
    config?: Partial<VoiceTransactionConfig>
  ): Promise<VoiceTransactionResult> {
    const mergedConfig = { ...this.config, ...config };

    try {
      logger.info(
        LogModule.TRANSACTIONS,
        'Starting voice transaction processing',
        {
          userId,
          audioUri: audioUri.substring(0, 50) + '...',
          config: mergedConfig,
        }
      );

      this.updateProgress('transcribing', 10, 'Transcribiendo audio...');

      // Step 1: Transcribe audio
      const transcription = await this.transcribeAudio(audioUri, mergedConfig);

      if (!transcription.text || transcription.text.trim().length === 0) {
        throw new Error(
          'No se pudo transcribir el audio. Intenta hablar más claro.'
        );
      }

      this.updateProgress('parsing', 40, 'Analizando transacción...');

      // Step 2: Parse transaction from transcription
      const parsedTransaction = await this.parseTransaction(
        transcription,
        mergedConfig
      );

      if (
        !AITransactionParserService.validateParsedTransaction(parsedTransaction)
      ) {
        return {
          success: false,
          transcription,
          parsedTransaction,
          error:
            'No se pudo entender la transacción. Intenta ser más específico.',
          needsConfirmation: true,
        };
      }

      this.updateProgress('confirming', 60, 'Validando información...');

      // Step 3: Check if confirmation is needed based on confidence
      const needsConfirmation = this.shouldRequestConfirmation(
        parsedTransaction,
        transcription
      );

      if (needsConfirmation) {
        return {
          success: false,
          transcription,
          parsedTransaction,
          needsConfirmation: true,
        };
      }

      this.updateProgress('creating', 80, 'Creando transacción...');

      // Step 4: Create transaction via MCP or direct service
      const transaction = await this.createTransaction(
        parsedTransaction,
        userId,
        mergedConfig
      );

      this.updateProgress('success', 100, '¡Transacción creada exitosamente!');

      logger.success(
        LogModule.TRANSACTIONS,
        'Voice transaction processed successfully',
        {
          transactionId: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
        }
      );

      return {
        success: true,
        transcription,
        parsedTransaction,
        needsConfirmation: false,
      };
    } catch (error) {
      this.updateProgress('error', 0, 'Error procesando transacción');

      logger.error(
        LogModule.TRANSACTIONS,
        'Voice transaction processing failed',
        error
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido procesando transacción',
        needsConfirmation: false,
      };
    }
  }

  /**
   * Create transaction with confirmation (bypasses confidence checks)
   */
  static async createConfirmedTransaction(
    parsedTransaction: ParsedTransaction,
    userId: string,
    config?: Partial<VoiceTransactionConfig>
  ): Promise<Transaction> {
    const mergedConfig = { ...this.config, ...config };

    this.updateProgress('creating', 90, 'Creando transacción confirmada...');

    const transaction = await this.createTransaction(
      parsedTransaction,
      userId,
      mergedConfig
    );

    this.updateProgress('success', 100, '¡Transacción creada exitosamente!');

    return transaction;
  }

  /**
   * Step 1: Transcribe audio to text
   */
  private static async transcribeAudio(
    audioUri: string,
    config: VoiceTransactionConfig
  ): Promise<AudioTranscription> {
    try {
      // Validate audio file first
      const isValid = await AITranscriptionService.validateAudioFile(audioUri);
      if (!isValid) {
        throw new Error('Archivo de audio inválido');
      }

      return await AITranscriptionService.transcribeAudio(audioUri, config);
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Transcription failed', error);
      throw new Error(
        `Error de transcripción: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  /**
   * Step 2: Parse transaction from transcription
   */
  private static async parseTransaction(
    transcription: AudioTranscription,
    config: VoiceTransactionConfig
  ): Promise<ParsedTransaction> {
    try {
      return await AITransactionParserService.parseTransaction(
        transcription,
        config
      );
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Parsing failed', error);
      throw new Error(
        `Error de análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  /**
   * Step 3: Determine if user confirmation is needed
   */
  private static shouldRequestConfirmation(
    parsedTransaction: ParsedTransaction,
    transcription: AudioTranscription
  ): boolean {
    // Request confirmation if:
    // - Overall confidence is low
    // - Amount is very high (potential mistake)
    // - Transcription confidence is low
    // - Category is uncertain

    if (parsedTransaction.confidence < AI_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
      logger.info(
        LogModule.TRANSACTIONS,
        'Confirmation needed: Low parsing confidence'
      );
      return true;
    }

    if (transcription.confidence < AI_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
      logger.info(
        LogModule.TRANSACTIONS,
        'Confirmation needed: Low transcription confidence'
      );
      return true;
    }

    if (parsedTransaction.amount > 10000) {
      logger.info(LogModule.TRANSACTIONS, 'Confirmation needed: High amount');
      return true;
    }

    if (!parsedTransaction.suggestedCategory) {
      logger.info(
        LogModule.TRANSACTIONS,
        'Confirmation needed: No category match'
      );
      return true;
    }

    return false;
  }

  /**
   * Step 4: Create transaction via MCP or direct service
   */
  private static async createTransaction(
    parsedTransaction: ParsedTransaction,
    userId: string,
    config: VoiceTransactionConfig
  ): Promise<Transaction> {
    try {
      if (config.enableMCP) {
        // Try MCP first
        const mcpResponse =
          parsedTransaction.type === 'expense'
            ? await MCPService.createExpense({
                user_id: userId,
                amount: parsedTransaction.amount,
                description: parsedTransaction.description,
                category_id: parsedTransaction.suggestedCategory?.id,
                category_name: parsedTransaction.category,
              })
            : await MCPService.createIncome({
                user_id: userId,
                amount: parsedTransaction.amount,
                description: parsedTransaction.description,
                category_id: parsedTransaction.suggestedCategory?.id,
                category_name: parsedTransaction.category,
              });

        if (mcpResponse.success) {
          logger.info(LogModule.TRANSACTIONS, 'Transaction created via MCP', {
            toolUsed: mcpResponse.toolUsed,
          });
          return mcpResponse.data as Transaction;
        } else if (config.fallbackToDirectService) {
          logger.warn(
            LogModule.TRANSACTIONS,
            'MCP failed, using fallback',
            mcpResponse.error
          );
        } else {
          throw new Error(mcpResponse.error?.message || 'MCP service failed');
        }
      }

      // Fallback to direct service
      logger.info(
        LogModule.TRANSACTIONS,
        'Creating transaction via direct service'
      );

      return await TransactionsService.createTransaction(userId, {
        amount: parsedTransaction.amount,
        type: parsedTransaction.type,
        description: parsedTransaction.description || 'Transacción por voz',
        category_id: parsedTransaction.suggestedCategory?.id,
        category_name: parsedTransaction.category,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: `Creada por comando de voz (confianza: ${Math.round(parsedTransaction.confidence * 100)}%)`,
      });
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Transaction creation failed',
        error
      );
      throw new Error(
        `Error creando transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  /**
   * Update progress and notify callback
   */
  private static updateProgress(
    step: VoiceTransactionStep,
    progress: number,
    message: string
  ): void {
    const progressUpdate: VoiceTransactionProgress = {
      currentStep: step,
      progress,
      message,
    };

    logger.debug(
      LogModule.TRANSACTIONS,
      'Voice transaction progress',
      progressUpdate
    );

    if (this.progressCallback) {
      this.progressCallback(progressUpdate);
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): VoiceTransactionConfig {
    return { ...this.config };
  }

  /**
   * Validate user permissions and setup
   */
  static async validateSetup(): Promise<{
    hasAudioPermissions: boolean;
    hasOpenAIKey: boolean;
    hasMCPServer: boolean;
    canUseFallback: boolean;
  }> {
    try {
      // Check audio permissions
      let hasAudioPermissions = false;
      try {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.getPermissionsAsync();
        hasAudioPermissions = status === 'granted';
      } catch (error) {
        hasAudioPermissions = false;
      }

      // Check OpenAI API key
      const hasOpenAIKey = !!AI_CONFIG.OPENAI_API_KEY;

      // Check MCP server availability
      let hasMCPServer = false;
      try {
        const response = await MCPService.getCategories();
        hasMCPServer = response.success;
      } catch {
        hasMCPServer = false;
      }

      const canUseFallback = this.config.fallbackToDirectService;

      return {
        hasAudioPermissions,
        hasOpenAIKey,
        hasMCPServer,
        canUseFallback,
      };
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Setup validation failed', error);
      return {
        hasAudioPermissions: false,
        hasOpenAIKey: false,
        hasMCPServer: false,
        canUseFallback: false,
      };
    }
  }
}
