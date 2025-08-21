// Edge Function para limpiar suscripciones pendientes antiguas
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get MercadoPago access token
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('Missing MERCADOPAGO_ACCESS_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Find pending subscriptions older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingSubscriptions, error: queryError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', oneDayAgo);

    if (queryError) {
      console.error('Error querying pending subscriptions:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: queryError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Found ${pendingSubscriptions?.length || 0} pending subscriptions to clean up`
    );

    const results = {
      checked: pendingSubscriptions?.length || 0,
      cancelled: 0,
      deleted: 0,
      errors: [],
    };

    // Process each pending subscription
    for (const subscription of pendingSubscriptions || []) {
      try {
        const preapprovalId = subscription.provider_subscription_id;

        if (preapprovalId && subscription.provider === 'mercadopago') {
          // Check preapproval status in MercadoPago
          const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (mpResponse.ok) {
            const preapproval = await mpResponse.json();

            // If still pending or cancelled in MercadoPago, delete from our DB
            if (
              preapproval.status === 'pending' ||
              preapproval.status === 'cancelled'
            ) {
              const { error: deleteError } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', subscription.id);

              if (deleteError) {
                console.error(
                  `Error deleting subscription ${subscription.id}:`,
                  deleteError
                );
                results.errors.push(
                  `Failed to delete subscription ${subscription.id}`
                );
              } else {
                results.deleted++;
                console.log(`Deleted pending subscription ${subscription.id}`);
              }
            } else if (preapproval.status === 'authorized') {
              // If authorized, update status to active
              const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', subscription.id);

              if (updateError) {
                console.error(
                  `Error updating subscription ${subscription.id}:`,
                  updateError
                );
                results.errors.push(
                  `Failed to update subscription ${subscription.id}`
                );
              } else {
                console.log(
                  `Updated subscription ${subscription.id} to active`
                );
              }
            }
          } else {
            // If preapproval doesn't exist in MercadoPago, delete from our DB
            if (mpResponse.status === 404) {
              const { error: deleteError } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', subscription.id);

              if (deleteError) {
                console.error(
                  `Error deleting orphaned subscription ${subscription.id}:`,
                  deleteError
                );
                results.errors.push(
                  `Failed to delete orphaned subscription ${subscription.id}`
                );
              } else {
                results.deleted++;
                console.log(`Deleted orphaned subscription ${subscription.id}`);
              }
            }
          }
        } else {
          // No provider ID, just delete the orphaned record
          const { error: deleteError } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', subscription.id);

          if (deleteError) {
            console.error(
              `Error deleting orphaned subscription ${subscription.id}:`,
              deleteError
            );
            results.errors.push(
              `Failed to delete orphaned subscription ${subscription.id}`
            );
          } else {
            results.deleted++;
            console.log(
              `Deleted orphaned subscription ${subscription.id} (no provider ID)`
            );
          }
        }
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription.id}:`,
          error
        );
        results.errors.push(
          `Error processing subscription ${subscription.id}: ${error.message}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in cleanup:', error);
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
