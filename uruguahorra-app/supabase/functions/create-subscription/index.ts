// Edge Function para crear suscripciones con Mercado Pago
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateSubscriptionRequest {
  userId: string;
  userEmail: string;
  planType: 'monthly' | 'annual';
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize client with user token for authentication
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { planType } = await req.json() as CreateSubscriptionRequest;

    // Check for existing active subscriptions only (no pending since we don't create them anymore)
    const { data: existingSubscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (subError) {
      console.error('Error checking subscriptions:', subError);
    }

    // If user has an active subscription, return error
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      const subscription = existingSubscriptions[0];
      
      return new Response(
        JSON.stringify({ 
          error: 'User already has an active subscription',
          subscription_id: subscription.id,
          status: subscription.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Mercado Pago access token
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('Missing MERCADOPAGO_ACCESS_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define plan details (montos en UYU - mínimo $15)
    const plans = {
      monthly: {
        reason: 'Uruguahorra Premium - Plan Mensual',
        transaction_amount: 99, // $99 UYU por mes
        frequency: 1,
        frequency_type: 'months',
        free_trial: 7 // 7 días de prueba gratis
      },
      annual: {
        reason: 'Uruguahorra Premium - Plan Anual (33% descuento)',
        transaction_amount: 799, // $799 UYU por año (ahorro de ~$400)
        frequency: 12,
        frequency_type: 'months',
        free_trial: 7 // 7 días de prueba gratis
      }
    };

    const selectedPlan = plans[planType];

    // Calculate dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + selectedPlan.free_trial); // Start after trial
    
    const endDate = new Date(startDate);
    if (planType === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Get the origin URL and validate it
    const origin = req.headers.get('origin') || '';
    
    // For local development, use a placeholder URL that MercadoPago will accept
    // In production, use the actual origin
    let backUrl = 'https://uruguahorra.com/subscription-success';
    
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      // Use the actual origin if it's not localhost
      backUrl = `${origin}/subscription-success`;
    } else {
      // For local development, you can use your Supabase URL or any valid HTTPS URL
      backUrl = `${supabaseUrl}/subscription-success`;
    }
    
    console.log('Using back_url:', backUrl);

    // Create preapproval in Mercado Pago with metadata for webhook
    const preapprovalData = {
      reason: selectedPlan.reason,
      external_reference: user.id, // User ID for webhook reference
      payer_email: user.email,
      auto_recurring: {
        frequency: selectedPlan.frequency,
        frequency_type: selectedPlan.frequency_type,
        transaction_amount: selectedPlan.transaction_amount,
        currency_id: 'UYU', // Pesos uruguayos
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      back_url: backUrl,
      status: 'pending',
      // Add metadata for webhook to create subscription later
      metadata: {
        plan_type: planType,
        user_email: user.email,
        user_id: user.id,
        plan_name: 'premium'
      }
    };

    console.log('Creating preapproval for user:', user.id, 'plan:', planType);

    // Call Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-${Date.now()}` // Prevent duplicates
      },
      body: JSON.stringify(preapprovalData)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Mercado Pago API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription', details: errorData }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await mpResponse.json();

    console.log('Preapproval created successfully:', result.id);
    console.log('Subscription will be created after payment confirmation via webhook');

    // Return checkout URL without creating subscription in DB
    // The webhook will create the subscription when payment is confirmed
    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: result.init_point, // Production URL
        sandbox_url: result.sandbox_init_point, // Test URL
        subscription_id: result.id,
        message: 'Preapproval created. Subscription will be activated after payment confirmation.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});