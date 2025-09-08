import { logger, LogModule } from '@/utils/logger';
import {
  ParsedTransaction,
  AudioTranscription,
  VoiceTransactionConfig,
} from '@/types/voice-transaction.types';
import { TransactionsService } from '@/services/transactions.service';
import { AI_CONFIG } from '@/config/ai.config';

export class AITransactionParserService {
  private static readonly OPENAI_CHAT_API_URL = `${AI_CONFIG.OPENAI_BASE_URL}/chat/completions`;
  private static readonly DEFAULT_CONFIG: Partial<VoiceTransactionConfig> = {
    parsingTimeout: AI_CONFIG.PARSING_TIMEOUT,
  };

  /**
   * Parse transcribed text to extract transaction information using GPT-5-nano
   */
  static async parseTransaction(
    transcription: AudioTranscription,
    config?: Partial<VoiceTransactionConfig>
  ): Promise<ParsedTransaction> {
    try {
      logger.info(LogModule.TRANSACTIONS, 'Iniciando parsing de transacción', {
        text: transcription.text,
        confidence: transcription.confidence,
      });

      const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

      // Use configured API key
      const apiKey = AI_CONFIG.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Get available categories to help with parsing
      const categories = await TransactionsService.getCategories();
      const categoriesPrompt = this.formatCategoriesForPrompt(categories);

      // Create parsing prompt
      const systemPrompt = this.createSystemPrompt(categoriesPrompt);
      const userPrompt = transcription.text;

      const startTime = Date.now();

      // Make API request
      const response = await this.makeParsingRequest(
        systemPrompt,
        userPrompt,
        apiKey,
        mergedConfig.parsingTimeout!
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      // Parse the AI response
      const parsedTransaction = this.extractTransactionData(
        result,
        categories,
        transcription.confidence
      );

      logger.success(LogModule.TRANSACTIONS, 'Parsing completado', {
        amount: parsedTransaction.amount,
        type: parsedTransaction.type,
        category: parsedTransaction.category,
        confidence: parsedTransaction.confidence,
        duration,
      });

      return parsedTransaction;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error en parsing de transacción',
        error
      );
      throw this.handleParsingError(error);
    }
  }

  /**
   * Create system prompt for transaction parsing
   */
  private static createSystemPrompt(categoriesPrompt: string): string {
    return `Eres un asistente especializado en extraer información de transacciones financieras de texto en español.

Tu tarea es analizar el texto del usuario y extraer:
1. MONTO: El valor numérico de la transacción
2. TIPO: Si es "expense" (gasto) o "income" (ingreso)
3. CATEGORÍA: La categoría más apropiada de las disponibles
4. DESCRIPCIÓN: Una descripción clara y concisa

CATEGORÍAS DISPONIBLES:
${categoriesPrompt}

REGLAS IMPORTANTES:
- Si no se menciona el tipo, asume que es un gasto ("expense")
- Si el monto no está claro, usa tu mejor estimación
- Si la categoría no está clara, elige la más probable
- La descripción debe ser concisa pero informativa
- Responde ÚNICAMENTE con un JSON válido

FORMATO DE RESPUESTA (JSON):
{
  "amount": number,
  "type": "expense" | "income",
  "category": "nombre_categoria_exacto",
  "description": "descripción breve",
  "confidence": number between 0 and 1,
  "reasoning": "breve explicación del análisis"
}

EJEMPLOS:
Usuario: "Gasté 50 pesos en almuerzo"
Respuesta: {"amount": 50, "type": "expense", "category": "Alimentación", "description": "Almuerzo", "confidence": 0.95, "reasoning": "Monto claro, categoría obvia"}

Usuario: "Me pagaron 2000 por el trabajo freelance"
Respuesta: {"amount": 2000, "type": "income", "category": "Trabajo", "description": "Trabajo freelance", "confidence": 0.9, "reasoning": "Ingreso claro de trabajo"}`;
  }

  /**
   * Format categories for the prompt
   */
  private static formatCategoriesForPrompt(categories: any[]): string {
    return categories
      .map((cat) => `- ${cat.name} (${cat.emoji}) - Tipo: ${cat.type}`)
      .join('\n');
  }

  /**
   * Make parsing request to OpenAI
   */
  private static async makeParsingRequest(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestBody = {
      model: AI_CONFIG.CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: AI_CONFIG.PARSING_TEMPERATURE,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    };

    try {
      const response = await fetch(this.OPENAI_CHAT_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Extract transaction data from AI response
   */
  private static extractTransactionData(
    apiResult: any,
    categories: any[],
    originalConfidence: number
  ): ParsedTransaction {
    try {
      const choice = apiResult.choices?.[0];
      const content = choice?.message?.content;

      if (!content) {
        throw new Error('No content in AI response');
      }

      const parsed = JSON.parse(content);

      // Find matching category
      const matchingCategory = categories.find(
        (cat) => cat.name.toLowerCase() === parsed.category.toLowerCase()
      );

      // Calculate final confidence based on AI confidence and transcription confidence
      const aiConfidence = parsed.confidence || 0.5;
      const finalConfidence = Math.min(aiConfidence, originalConfidence);

      const result: ParsedTransaction = {
        amount: Math.abs(Number(parsed.amount) || 0),
        type: parsed.type === 'income' ? 'income' : 'expense',
        category: parsed.category || 'Sin categoría',
        description: parsed.description || '',
        confidence: finalConfidence,
        suggestedCategory: matchingCategory
          ? {
              id: matchingCategory.id,
              name: matchingCategory.name,
              emoji: matchingCategory.emoji,
            }
          : undefined,
      };

      // Validate result
      if (result.amount <= 0) {
        throw new Error('Invalid amount extracted');
      }

      return result;
    } catch (error) {
      logger.error(
        LogModule.TRANSACTIONS,
        'Error extracting transaction data',
        error
      );

      // Return a fallback transaction
      return {
        amount: 0,
        type: 'expense',
        category: 'Sin categoría',
        description: 'Transacción no procesable',
        confidence: 0.1,
      };
    }
  }

  /**
   * Handle parsing errors
   */
  private static handleParsingError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error('Transaction parsing timed out. Please try again.');
    }

    if (error.message?.includes('API key')) {
      return new Error('AI service not configured. Please contact support.');
    }

    if (error.message?.includes('JSON')) {
      return new Error(
        'Failed to understand the transaction. Please try again with clearer speech.'
      );
    }

    return new Error(
      `Transaction parsing failed: ${error.message || 'Unknown error'}`
    );
  }

  /**
   * Validate parsed transaction before returning
   */
  static validateParsedTransaction(transaction: ParsedTransaction): boolean {
    return (
      transaction.amount > 0 &&
      ['expense', 'income'].includes(transaction.type) &&
      transaction.category &&
      transaction.confidence >= 0.3 // Minimum confidence threshold
    );
  }
}
