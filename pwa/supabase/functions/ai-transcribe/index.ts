// Edge Function: ai-transcribe
// Fuente: docs/api/contracts-and-data-mapping.md §4.4, features/transactions §CU-5.
//
// Proxy de voz → texto → transacción estructurada. NUNCA se llama a Groq desde
// el cliente (la API key vive sólo como secret de esta función).
//
// Request:  multipart/form-data { audio: webm/opus ≤30s ≤2MB } + Authorization Bearer <jwt>
// Response: { transcript, parsed: { amount, description, type, category_hint, confidence }, confidence }
//
// Modelos Groq: whisper-large-v3-turbo (STT) + llama-3.3-70b-versatile (parseo).
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
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extrae de la frase del usuario una transacción financiera en JSON con estas claves EXACTAS: ' +
              'amount (number), description (string), type ("expense"|"income"), category_hint (string), confidence (0-1). ' +
              'Moneda: pesos uruguayos. amount es solo el número, sin símbolos.\n' +
              'description es un concepto CORTO (1 a 3 palabras), NUNCA la frase completa.\n' +
              'TIPO: "me pagaron", "cobré", "sueldo", "me depositaron", "me transfirieron" => income. ' +
              '"gasté", "pagué", "compré", "me costó" => expense.\n' +
              'Si no estás seguro de un campo, baja la confidence. Responde SOLO el JSON.',
          },
          { role: 'user', content: 'Me pagaron ciento treinta mil quinientos cuarenta pesos de sueldo' },
          {
            role: 'assistant',
            content:
              '{"amount":130540,"description":"Sueldo","type":"income","category_hint":"Sueldo","confidence":0.95}',
          },
          { role: 'user', content: 'Gasté doscientos cincuenta pesos en el supermercado' },
          {
            role: 'assistant',
            content:
              '{"amount":250,"description":"Supermercado","type":"expense","category_hint":"Supermercado","confidence":0.95}',
          },
          { role: 'user', content: 'Tuve una ganancia de quince mil pesos' },
          {
            role: 'assistant',
            content:
              '{"amount":15000,"description":"Ganancia","type":"income","category_hint":"Ingresos","confidence":0.9}',
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

    // Overrides determinísticos: el LLM 8b se equivoca con montos y con ingreso/gasto.
    // Monto: parseamos el número directo de la transcripción (exacto).
    const codeAmount = spanishAmount(transcript ?? '');
    if (codeAmount !== null) parsed.amount = codeAmount;

    // Tipo: keywords español (más confiable que el LLM).
    const codeType = detectType(transcript ?? '');
    if (codeType !== null) parsed.type = codeType;

    // Descripción: si el LLM volcó la transcripción entera (falla común), usar la
    // categoría sugerida como concepto corto.
    const desc = String(parsed.description ?? '').trim();
    const hint = String(parsed.category_hint ?? '').trim();
    const dumpedTranscript = desc.split(/\s+/).length > 5;
    if ((!desc || dumpedTranscript) && hint) parsed.description = hint;

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    return json({ transcript, parsed, confidence }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// Minúsculas + sin acentos. Base para el parseo determinístico.
function normalizeEs(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Detecta ingreso/gasto por palabras clave. Determinístico: el LLM se equivoca seguido.
// Devuelve null si no hay señal clara (se deja lo que dijo el LLM).
function detectType(text: string): 'income' | 'expense' | null {
  const t = ' ' + normalizeEs(text).replace(/[^a-z0-9]+/g, ' ') + ' ';
  const INCOME = [
    'pagaron', 'cobre', 'cobro', 'cobraron', 'sueldo', 'salario', 'aguinaldo',
    'deposito', 'depositaron', 'ingreso', 'ingrese', 'ingresaron', 'transfirieron',
    'recibi', 'gane', 'ganancia', 'ganancias', 'jubilacion', 'propina', 'premio',
    'bono', 'reembolso', 'reintegro', 'devolvieron', 'vendi', 'venta', 'ventas',
    'honorarios', 'entro', 'entraron',
  ];
  const EXPENSE = [
    'gaste', 'pague', 'compre', 'compra', 'compras', 'gasto', 'costo', 'abone',
    'inverti', 'gastando', 'comprando', 'pagando',
  ];
  for (const k of INCOME) if (t.includes(' ' + k + ' ')) return 'income';
  for (const k of EXPENSE) if (t.includes(' ' + k + ' ')) return 'expense';
  return null;
}

// Convierte un monto en español (palabras o dígitos) a número. Determinístico.
// Ej: "ciento treinta mil quinientos cuarenta" -> 130540. Devuelve null si no hay número.
function spanishAmount(text: string): number | null {
  // OJO: "un"/"una" NO van acá (suelen ser artículo: "un sueldo"). Se manejan aparte.
  const UNITS: Record<string, number> = {
    cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
    siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
    quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
    veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
    veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
    veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
    ochenta: 80, noventa: 90,
  };
  const HUNDREDS: Record<string, number> = {
    cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300,
    trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500,
    quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700,
    setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900,
    novecientas: 900,
  };

  // Normaliza y limpia formato numérico ANTES de tokenizar:
  // - "130.540" -> "130540" (Whisper escribe el separador de miles como ".")
  // - "1.500,50" -> "1500" (colapsa miles, descarta centavos; pesos enteros)
  const clean = normalizeEs(text)
    .replace(/(?<=\d)\.(?=\d{3})/g, '') // separador de miles
    .replace(/(?<=\d),\d+/g, ''); // centavos
  const tokens = clean.split(/[^a-z0-9]+/).filter(Boolean);

  const isScale = (t?: string) => t === 'mil' || t === 'millon' || t === 'millones';

  let total = 0;
  let current = 0;
  let found = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'y') continue;

    // "un"/"una": artículo, salvo que preceda a mil/millón ("treinta y un mil" = 31000).
    if (t === 'un' || t === 'una') {
      if (isScale(tokens[i + 1])) { current += 1; found = true; }
      continue;
    }

    if (/^\d+$/.test(t)) {
      current += parseInt(t, 10);
      found = true;
    } else if (t in UNITS) {
      current += UNITS[t];
      found = true;
    } else if (t in HUNDREDS) {
      current += HUNDREDS[t];
      found = true;
    } else if (t === 'mil') {
      current = (current === 0 ? 1 : current) * 1000;
      total += current;
      current = 0;
      found = true;
    } else if (t === 'millon' || t === 'millones') {
      current = (current === 0 ? 1 : current) * 1000000;
      total += current;
      current = 0;
      found = true;
    }
    // Palabras no numéricas: se ignoran sin resetear.
  }

  return found ? total + current : null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
