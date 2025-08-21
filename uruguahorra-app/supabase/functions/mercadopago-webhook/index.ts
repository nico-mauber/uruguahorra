// Webhook handler for MercadoPago - No auth required version
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MercadoPagoWebhookEvent {
  action: string;
  api_version?: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id?: string;
  version?: number;
}

// Main handler - Deno Deploy style without auth requirement
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Parse webhook payload
    const body = await req.text();
    let event: MercadoPagoWebhookEvent;

    try {
      event = JSON.parse(body);
    } catch (e) {
      console.error('Invalid JSON payload:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing MercadoPago event:', event.type, event.action);

    // Handle different event types
    switch (event.type) {
      case 'preapproval':
        if (event.action === 'created' || event.action === 'updated') {
          await handlePreapprovalUpdate(event, supabase);
        } else if (event.action === 'cancelled') {
          await handlePreapprovalCancelled(event, supabase);
        }
        break;

      case 'payment':
        if (event.action === 'created') {
          await handlePayment(event, supabase);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true, event_id: event.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Handler functions
async function handlePreapprovalUpdate(
  event: MercadoPagoWebhookEvent,
  supabase: any
) {
  const preapprovalId = event.data.id;

  // Get MercadoPago access token
  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

  if (!accessToken) {
    console.error('Missing MERCADOPAGO_ACCESS_TOKEN');
    return;
  }

  // Fetch preapproval details from MercadoPago
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch preapproval details:', response.status);
    return;
  }

  const preapproval = await response.json();
  const userId = preapproval.external_reference;

  if (!userId) {
    console.error('Missing external_reference in preapproval');
    return;
  }

  console.log(
    `Processing preapproval for user ${userId}, status: ${preapproval.status}, action: ${event.action}`
  );

  // Map MercadoPago status to app status
  let appStatus = 'pending';
  switch (preapproval.status) {
    case 'authorized':
      appStatus = 'active';
      break;
    case 'paused':
      appStatus = 'paused';
      break;
    case 'cancelled':
      appStatus = 'cancelled';
      break;
    case 'pending':
      appStatus = 'pending';
      break;
  }

  // Check if subscription already exists
  const { data: existingSub, error: checkError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('provider_subscription_id', preapprovalId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 means no rows found
    console.error('Error checking existing subscription:', checkError);
    return;
  }

  // If subscription doesn't exist and preapproval is authorized, create it
  if (!existingSub && preapproval.status === 'authorized') {
    console.log('Creating new subscription for authorized preapproval');

    // Extract metadata if available, or use defaults
    const metadata = preapproval.metadata || {};
    const planType =
      metadata.plan_type ||
      (preapproval.auto_recurring?.frequency === 12 ? 'annual' : 'monthly');

    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: metadata.plan_name || 'premium',
      status: appStatus,
      provider: 'mercadopago',
      provider_subscription_id: preapprovalId,
      start_date: new Date().toISOString(),
      current_period_end: preapproval.auto_recurring?.end_date
        ? new Date(preapproval.auto_recurring.end_date).toISOString()
        : null,
      metadata: {
        plan_type: planType,
        frequency: preapproval.auto_recurring?.frequency,
        frequency_type: preapproval.auto_recurring?.frequency_type,
        transaction_amount: preapproval.auto_recurring?.transaction_amount,
        currency_id: preapproval.auto_recurring?.currency_id,
        payer_email: preapproval.payer_email,
        init_point: preapproval.init_point,
        sandbox_init_point: preapproval.sandbox_init_point,
      },
    });

    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }

    console.log('Subscription created successfully');
  } else if (existingSub) {
    // Update existing subscription
    console.log('Updating existing subscription');

    const updateData: any = {
      status: appStatus,
      updated_at: new Date().toISOString(),
    };

    // If status is paused, add paused_at timestamp
    if (appStatus === 'paused') {
      updateData.paused_at = new Date().toISOString();
    }

    // If status is cancelled, add cancelled_at timestamp
    if (appStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('provider_subscription_id', preapprovalId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log('Subscription updated successfully');
  } else {
    // Preapproval not authorized yet and no existing subscription
    console.log(
      `Preapproval status is ${preapproval.status}, not creating subscription yet`
    );
  }
}

async function handlePreapprovalCancelled(
  event: MercadoPagoWebhookEvent,
  supabase: any
) {
  const preapprovalId = event.data.id;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_subscription_id', preapprovalId);

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }

  console.log('Subscription cancelled successfully');
}

async function handlePayment(event: MercadoPagoWebhookEvent, supabase: any) {
  console.log('Payment received:', event.data.id);

  // You can add payment tracking logic here
  // For example, create a payments table entry:
  /*
  const { error } = await supabase.from('payments').insert({
    payment_id: event.data.id,
    created_at: event.date_created,
    status: 'completed',
  });
  */
}
