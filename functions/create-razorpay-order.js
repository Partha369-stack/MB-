
// createClient is provided globally by the InsForge runtime
const INSFORGE_URL = process.env.INSFORGE_URL;
const INSFORGE_SERVICE_ROLE_KEY = process.env.INSFORGE_SERVICE_ROLE_KEY;

const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_SERVICE_ROLE_KEY
});

/**
 * Fetches Razorpay credentials from the app_settings table.
 * This allows the admin to update keys without redeploying the function.
 */
async function getRazorpayCredentials() {
    const { data, error } = await insforge.database
        .from('app_settings')
        .select('razorpay_key_id, razorpay_key_secret')
        .eq('id', 'singleton')
        .single();

    if (error || !data) {
        throw new Error(`Could not fetch Razorpay credentials: ${error?.message || 'Row not found'}`);
    }
    if (!data.razorpay_key_id || !data.razorpay_key_secret) {
        throw new Error('Razorpay Key ID or Secret is not configured. Please set them in Admin Settings.');
    }
    return { keyId: data.razorpay_key_id, keySecret: data.razorpay_key_secret };
}

/**
 * Creates a Razorpay Order
 * POST body: { amount: number (INR), currency?: string, receipt: string }
 */
module.exports = async function(request) {
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        const body = await request.json();
        const { amount, currency = 'INR', receipt } = body;

        if (!amount || !receipt) {
            return new Response(JSON.stringify({ error: 'Missing required fields: amount, receipt' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const { keyId, keySecret } = await getRazorpayCredentials();
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Amount in paise
                currency,
                receipt
            })
        });

        const order = await response.json();

        if (!response.ok) {
            console.error('Razorpay API Error:', order);
            return new Response(JSON.stringify({ error: order.error?.description || 'Razorpay API error', details: order }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Return the Razorpay order AND the key_id so the frontend can open the checkout widget
        return new Response(JSON.stringify({ ...order, key_id: keyId }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        console.error('Function Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
};
