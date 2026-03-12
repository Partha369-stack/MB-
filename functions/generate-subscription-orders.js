
// InsForge Edge Function: generate-subscription-orders
// Runs daily to automatically create subscription_orders for active subscriptions
// whose delivery_date (day of month) matches today's date.

const INSFORGE_URL = process.env.INSFORGE_URL;
const INSFORGE_SERVICE_ROLE_KEY = process.env.INSFORGE_SERVICE_ROLE_KEY;

const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_SERVICE_ROLE_KEY
});

// Static product catalog — mirrors src/constants.tsx
// Used to resolve shorthand product IDs ("1", "2" etc.) stored in subscriptions
const STATIC_PRODUCTS = [
    { id: '1', name: 'Detergent Powder', price: 85, unit: 'kg', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' },
    { id: '2', name: 'Liquid Dishwash', price: 120, unit: 'litre', imageUrl: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&q=80&w=400' },
    { id: '3', name: 'Liquid Handwash', price: 150, unit: 'litre', imageUrl: 'https://images.unsplash.com/photo-1603533871305-6490656360f2?auto=format&fit=crop&q=80&w=400' },
    { id: '4', name: 'Toilet Cleaner', price: 90, unit: 'litre', imageUrl: 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?auto=format&fit=crop&q=80&w=400' },
    { id: '5', name: 'White Phenyl', price: 60, unit: 'litre', imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=400' },
    { id: 'STARTER-PACK', name: 'Trial Starter Box', price: 199, unit: 'kg', imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=400' },
];

/**
 * Generate a unique MBS order ID
 */
function generateSubscriptionOrderId() {
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    return `MBS${digits}`;
}

/**
 * Get today's day-of-month in IST (UTC+5:30)
 */
function getTodayIST() {
    const now = new Date();
    // Convert to IST: UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    return {
        day: istNow.getUTCDate(),
        // Today's date string in IST (YYYY-MM-DD)
        todayISO: `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}-${String(istNow.getUTCDate()).padStart(2, '0')}`,
        // Delivery timestamp set to noon IST (06:30 UTC)
        deliveryTimestamp: new Date(Date.UTC(
            istNow.getUTCFullYear(),
            istNow.getUTCMonth(),
            istNow.getUTCDate(),
            6, 30, 0
        )).toISOString()
    };
}

/**
 * Resolve a product by its ID (supports both short IDs like "1" and UUIDs from DB)
 */
function resolveProduct(productId, dbProductMap) {
    // Try static catalog first (for subscription products stored as "1", "2" etc.)
    const staticProduct = STATIC_PRODUCTS.find(p => p.id === productId);
    if (staticProduct) return staticProduct;

    // Try DB products by UUID
    const dbProduct = dbProductMap[productId];
    if (dbProduct) {
        return {
            id: dbProduct.id,
            name: dbProduct.name,
            price: parseFloat(dbProduct.price) || 0,
            unit: dbProduct.unit,
            imageUrl: dbProduct.image_url
        };
    }

    return null;
}

module.exports = async function (request) {
    // Allow CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        const { day, todayISO, deliveryTimestamp } = getTodayIST();

        console.log(`[SubOrders] Running for IST date: ${todayISO} (day ${day} of month)`);

        // 1. Fetch all active subscriptions whose delivery_date matches today's day
        const { data: subscriptions, error: subError } = await insforge.database
            .from('subscriptions')
            .select('*')
            .eq('status', 'active')
            .eq('delivery_date', day);

        if (subError) {
            throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
        }

        console.log(`[SubOrders] Found ${subscriptions?.length || 0} active subscription(s) for day ${day}`);

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: `No active subscriptions due on day ${day}`,
                date: todayISO,
                day,
                created: 0,
                skipped: 0
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 2. Fetch all DB products to build a UUID map (fallback for UUID-based product IDs)
        const { data: dbProducts } = await insforge.database
            .from('products')
            .select('id, name, price, unit, image_url');

        const dbProductMap = {};
        (dbProducts || []).forEach(p => { dbProductMap[p.id] = p; });

        // 3. For each subscription, check if an order already exists today, if not — create one
        let created = 0;
        let skipped = 0;
        const errors = [];

        for (const sub of subscriptions) {
            try {
                // Check if a subscription_order already exists for today
                // Range covers full IST day expressed in UTC
                const todayStart = `${todayISO}T00:00:00+05:30`;
                const todayEnd   = `${todayISO}T23:59:59+05:30`;

                const { data: existing, error: existErr } = await insforge.database
                    .from('subscription_orders')
                    .select('id')
                    .eq('subscription_id', sub.id)
                    .gte('delivery_date', todayStart)
                    .lte('delivery_date', todayEnd)
                    .limit(1);

                if (existErr) {
                    console.error(`[SubOrders] Error checking existing for sub ${sub.id}:`, existErr.message);
                    errors.push({ subId: sub.id, error: existErr.message });
                    continue;
                }

                if (existing && existing.length > 0) {
                    console.log(`[SubOrders] Sub ${sub.id} already has order today (${existing[0].id}). Skipping.`);
                    skipped++;
                    continue;
                }

                // Resolve items with product details
                const subProducts = sub.products || [];
                const items = [];
                let total = 0;

                for (const sp of subProducts) {
                    const product = resolveProduct(sp.productId, dbProductMap);
                    if (!product) {
                        console.warn(`[SubOrders] Product "${sp.productId}" not found in catalog or DB, skipping item.`);
                        continue;
                    }
                    const price = parseFloat(product.price) || 0;
                    const quantity = sp.quantity || 1;
                    total += price * quantity;
                    items.push({
                        product: {
                            id: product.id,
                            name: product.name,
                            price: price,
                            unit: product.unit,
                            imageUrl: product.imageUrl
                        },
                        quantity
                    });
                }

                if (items.length === 0) {
                    console.warn(`[SubOrders] No valid items found for subscription ${sub.id}. Skipping.`);
                    skipped++;
                    continue;
                }

                const orderId = generateSubscriptionOrderId();
                const deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString();

                const { error: insertError } = await insforge.database
                    .from('subscription_orders')
                    .insert([{
                        id: orderId,
                        user_id: sub.user_id,
                        subscription_id: sub.id,
                        items,
                        total: Math.round(total * 100) / 100,
                        delivery_date: deliveryTimestamp,
                        status: 'pending',
                        payment_method: 'COD',
                        payment_status: 'pending',
                        delivery_otp: deliveryOTP,
                        return_confirmed: false,
                        created_at: new Date().toISOString()
                    }]);

                if (insertError) {
                    console.error(`[SubOrders] Failed to insert for sub ${sub.id}:`, insertError.message);
                    errors.push({ subId: sub.id, error: insertError.message });
                } else {
                    console.log(`[SubOrders] ✅ Created ${orderId} for sub ${sub.id} | user ${sub.user_id} | ₹${total}`);
                    created++;
                }

            } catch (innerErr) {
                console.error(`[SubOrders] Error processing sub ${sub.id}:`, innerErr.message);
                errors.push({ subId: sub.id, error: innerErr.message });
            }
        }

        const result = {
            success: true,
            date: todayISO,
            day,
            subscriptionsChecked: subscriptions.length,
            created,
            skipped,
            errors: errors.length > 0 ? errors : undefined
        };

        console.log(`[SubOrders] Done: ${created} created, ${skipped} skipped, ${errors.length} errors on ${todayISO}`);

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        console.error('[SubOrders] Fatal error:', err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
};
