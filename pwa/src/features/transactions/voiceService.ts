import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';

/**
 * Cliente de la Edge Function `ai-transcribe`. Fuente: features/transactions §CU-5,
 * api §4.4. NUNCA llama a OpenAI directo; sólo a la Edge Function.
 */
export interface ParsedVoice {
  amount: number;
  description: string;
  type: 'expense' | 'income';
  category_hint: string;
  confidence: number;
}

export interface VoiceResult {
  transcript: string;
  parsed: ParsedVoice;
  confidence: number;
}

export async function transcribeAudio(blob: Blob): Promise<VoiceResult> {
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');

  const { data, error } = await supabase.functions.invoke<VoiceResult>('ai-transcribe', {
    body: form,
  });
  if (error) {
    logger.error(LogModule.API, 'Error en ai-transcribe', error);
    throw error;
  }
  if (!data) throw new Error('Sin respuesta de transcripción');
  return data;
}
