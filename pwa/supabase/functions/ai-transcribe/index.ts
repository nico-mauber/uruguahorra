// Edge Function: ai-transcribe
// Fuente: docs/api/contracts-and-data-mapping.md §4.4, features/transactions §CU-5.
//
// Proxy de voz → texto → transacción estructurada. NUNCA se llama a Groq desde
// el cliente (la API key vive sólo como secret de esta función).
//
// Request:  multipart/form-data { audio: webm/opus ≤30s ≤2MB } + Authorization Bearer <jwt>
// Response: { transcript, parsed: { amount, description, type, category_hint, confidence }, confidence }
//
// SECRETS: GROQ_API_KEY (transcripción + parseo), SUPABASE_URL, SUPABASE_ANON_KEY
// DEPLOY:  supabase functions deploy ai-transcribe
//          supabase secrets set GROQ_API_KEY=gsk_...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BYTES = 2 * 1024 * 1024;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) return json({ error: 'IA no configurada' }, 500);

    // Validar JWT.
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supa.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid token' }, 401);

    const form = await req.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File)) return json({ error: 'Falta el audio' }, 400);
    if (audio.size > MAX_BYTES) return json({ error: 'Audio demasiado grande' }, 413);

    // 1) Whisper (Groq): transcribir en español.
    const whisperForm = new FormData();
    whisperForm.append('file', audio, 'audio.webm');
    whisperForm.append('model', 'whisper-large-v3-turbo');
    whisperForm.append('language', 'es');

    const wResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: whisperForm,
    });
    if (!wResp.ok) return json({ error: 'Fallo de transcripción', details: await wResp.text() }, 502);
    const { text: transcript } = await wResp.json();

    // 2) Llama (Groq): parsear a transacción estructurada.
    const cResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extrae de la frase del usuario una transacción financiera en JSON con estas claves EXACTAS: ' +
              'amount (number), description (string), type ("expense"|"income"), category_hint (string), confidence (0-1). ' +
              'Moneda: pesos uruguayos. Si no estás seguro de un campo, baja la confidence. Responde SOLO el JSON.',
          },
          { role: 'user', content: transcript ?? '' },
        ],
      }),
    });
    if (!cResp.ok) return json({ error: 'Fallo de parseo', details: await cResp.text() }, 502);
    const completion = await cResp.json();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = {};
    }

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    return json({ transcript, parsed, confidence }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
