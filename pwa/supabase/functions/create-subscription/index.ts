// Edge Function: create-subscription
// Fuente: docs/api/contracts-and-data-mapping.md §4.1
//
// Crea un preapproval (suscripción) en MercadoPago en UYU y devuelve el checkout_url.
// El cliente abre checkout_url en nueva pestaña. La activación real la hace el
// webhook `mercadopago-webhook` (server→server) al autorizar el preapproval.
//
// SECRETS REQUERIDOS (supabase secrets set ...):
//   - MP_ACCESS_TOKEN        Access token de MercadoPago (privado; NUNCA en el cliente)
//   - SUPABASE_URL           (inyectado por la plataforma)
//   - SUPABASE_ANON_KEY      (inyectado por la plataforma)
//   - SUPABASE_SERVICE_ROLE_KEY (para leer subscriptions con RLS bypass)
//
// DEPLOY:
//   supabase functions deploy create-subscription
//   supabase secrets set MP_ACCESS_TOKEN=xxxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS = {
  monthly: { amount: 15, frequency: 1, frequency_type: 'months', reason: 'UruguAhorra Premium Mensual' },
  annual: { amount: 799, frequency: 12, frequency_type: 'months', reason: 'UruguAhorra Premium Anual' },
} as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!mpToken) return json({ error: 'MP no configurado' }, 500);

    // Validar JWT del usuario.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid token' }, 401);

    const { planType } = (await req.json()) as { planType: 'monthly' | 'annual' };
    const plan = PLANS[planType];
    if (!plan) return json({ error: 'Invalid planType' }, 400);

    // Rechazar si ya tiene suscripción active|trial (service role para saltar RLS).
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    if (existing) {
      return json(
        { error: 'User already has an active subscription', subscription_id: existing.id, status: existing.status },
        400,
      );
    }

    // back_urls (web).
    const origin = req.headers.get('origin') ?? 'https://uruguahorra.uy';
    const trialEnd = new Date(Date.now() + 7 * 86_400_000).toISOString();

    // Crear preapproval en MercadoPago (UYU, 7 días de trial).
    const mpResp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: plan.reason,
        external_reference: user.id,
        payer_email: user.email,
        back_url: `${origin}/subscription-success`,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: plan.frequency_type,
          transaction_amount: plan.amount,
          currency_id: 'UYU',
          free_trial: { frequency: 7, frequency_type: 'days' },
          start_date: trialEnd,
        },
        status: 'pending',
      }),
    });

    const mp = await mpResp.json();
    if (!mpResp.ok) {
      return json({ error: 'MercadoPago error', details: mp }, 502);
    }

    return json({
      success: true,
      checkout_url: mp.init_point,
      sandbox_url: mp.sandbox_init_point,
      subscription_id: mp.id,
      message: 'Preapproval creado',
    }, 200);
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
