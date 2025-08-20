// Webhook handler for MercadoPago billing events
// Processes subscription creation, updates, and cancellations
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MercadoPagoWebhookEvent {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
  version: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    return await handleMercadoPagoWebhook(req, supabase);
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleMercadoPagoWebhook(req: Request, supabase: any) {
  const body = await req.text();
  const event: MercadoPagoWebhookEvent = JSON.parse(body);

  console.log('Processing MercadoPago event:', event.type, event.action);

  try {
    switch (event.type) {
      case 'preapproval':
        if (event.action === 'created' || event.action === 'updated') {
          await handleMercadoPagoPreapprovalUpdate(event, supabase);
        } else if (event.action === 'cancelled') {
          await handleMercadoPagoPreapprovalCancelled(event, supabase);
        }
        break;
      
      case 'payment':
        if (event.action === 'created') {
          await handleMercadoPagoPayment(event, supabase);
        }
        break;
      
      default:
        console.log(`Unhandled MercadoPago event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing MercadoPago webhook:', error);
    return new Response('Processing error', { status: 500, headers: corsHeaders });
  }
}



// MercadoPago event handlers
async function handleMercadoPagoPreapprovalUpdate(event: MercadoPagoWebhookEvent, supabase: any) {
  const preapprovalId = event.data.id;
  
  // Fetch preapproval details from MercadoPago API
  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  
  const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch preapproval details');
    return;
  }

  const preapproval = await response.json();
  const userId = preapproval.external_reference;

  if (!userId) {
    console.error('Missing external_reference in preapproval');
    return;
  }

  console.log(`Processing MercadoPago preapproval for user ${userId}`);

  if (event.action === 'created' && preapproval.status === 'authorized') {
    // Create subscription
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: 'premium',
      status: 'active',
      provider: 'mercadopago',
      provider_subscription_id: preapprovalId,
      start_date: new Date().toISOString(),
      end_date: new Date(preapproval.auto_recurring.end_date).toISOString(),
    });

    if (error) {
      console.error('Error creating MercadoPago subscription:', error);
      throw error;
    }
  } else {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: preapproval.status === 'authorized' ? 'active' : 'cancelled',
      })
      .eq('provider_subscription_id', preapprovalId);

    if (error) {
      console.error('Error updating MercadoPago subscription:', error);
      throw error;
    }
  }

  console.log('MercadoPago subscription processed successfully');
}

async function handleMercadoPagoPreapprovalCancelled(event: MercadoPagoWebhookEvent, supabase: any) {
  const preapprovalId = event.data.id;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('provider_subscription_id', preapprovalId);

  if (error) {
    console.error('Error cancelling MercadoPago subscription:', error);
    throw error;
  }

  console.log('MercadoPago subscription cancelled successfully');
}

async function handleMercadoPagoPayment(event: MercadoPagoWebhookEvent, supabase: any) {
  console.log('MercadoPago payment received:', event.data.id);
  // Additional logic for payment tracking if needed
}
