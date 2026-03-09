import { insforge } from './src/lib/insforge';
import { storageService } from './src/services/storageService';

async function reconcileSettlements() {
    try {
        console.log("Fetching all orders...");
        const { data: orders, error: ordersErr } = await insforge.database.from('orders').select('*');
        if (ordersErr) throw ordersErr;

        console.log(`Found ${orders?.length} orders.`);
        const { data: users, error: usersErr } = await insforge.database.from('profiles').select('id, name');
        if (usersErr) throw usersErr;
        const userMap = (users || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u.name }), {});

        const { data: existingSettlements } = await insforge.database.from('cod_settlements').select('order_id');
        const existingOrderIds = new Set((existingSettlements || []).map((s: any) => s.order_id));

        const missed = orders?.filter((o: any) =>
            o.status === 'delivered' &&
            (o.payment_method === 'COD' || !o.payment_method) &&
            o.delivery_person_id &&
            !existingOrderIds.has(o.id)
        );

        console.log(`Found ${missed?.length} delivered COD orders without settlement records.`);

        if (missed && missed.length > 0) {
            for (const order of missed) {
                console.log(`Reconciling order ${order.id} (₹${order.total})...`);
                await insforge.database.from('cod_settlements').insert([{
                    delivery_person_id: order.delivery_person_id,
                    delivery_person_name: userMap[order.delivery_person_id] || 'System Reconciled',
                    order_id: order.id,
                    amount: order.total,
                    collected_at: order.updated_at || order.created_at,
                    status: 'pending'
                }]);
            }
            console.log("Reconciliation complete.");
        } else {
            console.log("No missing settlements found.");
        }
    } catch (err) {
        console.error("Reconciliation Error:", err);
    }
}

reconcileSettlements();
