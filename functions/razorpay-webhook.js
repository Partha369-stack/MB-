
// createClient is provided globally by the InsForge runtime
const crypto = require('node:crypto');

const INSFORGE_URL = process.env.INSFORGE_URL;
const INSFORGE_SERVICE_ROLE_KEY = process.env.INSFORGE_SERVICE_ROLE_KEY;

const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_SERVICE_ROLE_KEY
});

/**
 * Fetches Razorpay webhook secret from the app_settings table.
 */
async function getWebhookSecret() {
    const { data, error } = await insforge.database
        .from('app_settings')
        .select('razorpay_webhook_secret')
        .eq('id', 'singleton')
        .single();

    if (error || !data || !data.razorpay_webhook_secret) {
        throw new Error('Razorpay webhook secret not configured in admin settings.');
    }
    return data.razorpay_webhook_secret;
}

/**
 * Razorpay Payment Webhook
 * Verifies the signature and updates the order payment_status + status in the DB.
 */
module.exports = async function(request) {
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, x-razorpay-signature',
            }
        });
    }

    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), { status: 401 });
    }

    try {
        const body = await request.text();

        // Fetch the webhook secret dynamically from the database
        const webhookSecret = await getWebhookSecret();

        // Verify the HMAC signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Webhook signature mismatch');
            return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
        }

        const payload = JSON.parse(body);
        const { event, payload: data } = payload;

        console.log('Razorpay Webhook Event:', event);

        if (event === 'payment.captured' || event === 'order.paid') {
            const razorpayOrderId = data.order
                ? data.order.entity.id
                : (data.payment ? data.payment.entity.order_id : null);
            const razorpayPaymentId = data.payment ? data.payment.entity.id : null;

            if (razorpayOrderId) {
                const { error: updateError } = await insforge.database
                    .from('orders')
                    .update({
                        status: 'confirmed',
                        payment_status: 'paid',
                        razorpay_payment_id: razorpayPaymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('razorpay_order_id', razorpayOrderId);

                if (updateError) {
                    console.error('DB update error:', updateError);
                    throw updateError;
                }
                console.log('Order updated to paid:', razorpayOrderId, razorpayPaymentId);
            }
        }

        if (event === 'payment.failed') {
            const razorpayOrderId = data.payment?.entity?.order_id;
            if (razorpayOrderId) {
                await insforge.database
                    .from('orders')
                    .update({
                        payment_status: 'failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('razorpay_order_id', razorpayOrderId);
                console.log('Order payment failed:', razorpayOrderId);
            }
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Webhook Error:', err.message);
        return new Response(JSON.stringify({ error: 'Internal Error', message: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
