
const { createClient } = require('@insforge/sdk');
const crypto = require('node:crypto');

const INSFORGE_URL = process.env.INSFORGE_URL;
const INSFORGE_SERVICE_ROLE_KEY = process.env.INSFORGE_SERVICE_ROLE_KEY;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_SERVICE_ROLE_KEY
});

module.exports = async function(request) {
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.text();
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            return new Response('Invalid signature', { status: 401 });
        }

        const payload = JSON.parse(body);
        const { event, payload: data } = payload;

        if (event === 'order.paid' || event === 'payment.captured') {
            const razorpayOrderId = data.order ? data.order.entity.id : data.payment.entity.order_id;
            const razorpayPaymentId = data.payment ? data.payment.entity.id : null;

            if (razorpayOrderId) {
                // Update order to confirmed and paid
                const { error } = await insforge.database
                    .from('orders')
                    .update({ 
                        status: 'confirmed',
                        payment_status: 'paid',
                        razorpay_payment_id: razorpayPaymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('razorpay_order_id', razorpayOrderId);
                
                if (error) throw error;
            }
        }

        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('Webhook Error:', err);
        return new Response('Internal Error', { status: 500 });
    }
};
