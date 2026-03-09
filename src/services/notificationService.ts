
import { insforge } from '../lib/insforge';

export type NotificationType = 'order' | 'delivery' | 'sales' | 'system';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    relatedId?: string;
    relatedType?: string;
    createdAt: string;
}

export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string;
    relatedType?: string;
}

const mapRow = (row: any): Notification => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    relatedId: row.related_id,
    relatedType: row.related_type,
    createdAt: row.created_at,
});

export const notificationService = {
    /** Create a single notification for a user */
    createNotification: async (input: CreateNotificationInput): Promise<Notification | null> => {
        try {
            const { data, error } = await insforge.database
                .from('notifications')
                .insert([{
                    user_id: input.userId,
                    title: input.title,
                    message: input.message,
                    type: input.type,
                    is_read: false,
                    related_id: input.relatedId || null,
                    related_type: input.relatedType || null,
                    created_at: new Date().toISOString(),
                }])
                .select()
                .single();

            if (error) { console.error('[notificationService] createNotification error:', error); return null; }
            return mapRow(data);
        } catch (e) { console.error('[notificationService] createNotification exception:', e); return null; }
    },

    /** Create notifications for multiple users at once (e.g., notify all admins) */
    createBulkNotifications: async (inputs: CreateNotificationInput[]): Promise<void> => {
        if (!inputs.length) return;
        try {
            const rows = inputs.map(i => ({
                user_id: i.userId,
                title: i.title,
                message: i.message,
                type: i.type,
                is_read: false,
                related_id: i.relatedId || null,
                related_type: i.relatedType || null,
                created_at: new Date().toISOString(),
            }));
            const { error } = await insforge.database.from('notifications').insert(rows);
            if (error) console.error('[notificationService] createBulkNotifications error:', error);
        } catch (e) { console.error('[notificationService] createBulkNotifications exception:', e); }
    },

    /** Fetch all notifications for a user (newest first) */
    getNotifications: async (userId: string): Promise<Notification[]> => {
        try {
            const { data, error } = await insforge.database
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) { console.error('[notificationService] getNotifications error:', error); return []; }
            return (data || []).map(mapRow);
        } catch (e) { console.error('[notificationService] getNotifications exception:', e); return []; }
    },

    /** Mark a single notification as read */
    markAsRead: async (notificationId: string): Promise<void> => {
        try {
            const { error } = await insforge.database
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
            if (error) console.error('[notificationService] markAsRead error:', error);
        } catch (e) { console.error('[notificationService] markAsRead exception:', e); }
    },

    /** Mark all notifications as read for a user */
    markAllAsRead: async (userId: string): Promise<void> => {
        try {
            const { error } = await insforge.database
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) console.error('[notificationService] markAllAsRead error:', error);
        } catch (e) { console.error('[notificationService] markAllAsRead exception:', e); }
    },

    /** Delete a single notification */
    deleteNotification: async (notificationId: string): Promise<void> => {
        try {
            const { error } = await insforge.database
                .from('notifications')
                .delete()
                .eq('id', notificationId);
            if (error) console.error('[notificationService] deleteNotification error:', error);
        } catch (e) { console.error('[notificationService] deleteNotification exception:', e); }
    },

    /** Clear all notifications for a user */
    clearAll: async (userId: string): Promise<void> => {
        try {
            const { error } = await insforge.database
                .from('notifications')
                .delete()
                .eq('user_id', userId);
            if (error) console.error('[notificationService] clearAll error:', error);
        } catch (e) { console.error('[notificationService] clearAll exception:', e); }
    },

    /**
     * Subscribe to real-time notification inserts for a user.
     * Returns an unsubscribe function.
     * Falls back to polling every 30s if real-time is not supported.
     */
    subscribeToNotifications: (userId: string, onNew: (n: Notification) => void): (() => void) => {
        try {
            // Try Supabase-compatible realtime channel
            const channel = (insforge as any).channel?.(`notifications:${userId}`);
            if (channel && typeof channel.on === 'function') {
                channel
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    }, (payload: any) => {
                        if (payload.new) onNew(mapRow(payload.new));
                    })
                    .subscribe();
                return () => { try { (insforge as any).removeChannel?.(channel); } catch (_) { } };
            }
        } catch (_) { }

        // Fallback: polling every 30 seconds
        console.log('[notificationService] Falling back to polling for notifications');
        let lastFetch = new Date().toISOString();
        const interval = setInterval(async () => {
            try {
                const { data } = await insforge.database
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('is_read', false)
                    .gt('created_at', lastFetch)
                    .order('created_at', { ascending: false });
                lastFetch = new Date().toISOString();
                (data || []).forEach((row: any) => onNew(mapRow(row)));
            } catch (_) { }
        }, 30000);

        return () => clearInterval(interval);
    },
};

// ────────────────────────────────────────────────────────────────────
// Convenience helpers for triggering well-typed notifications
// ────────────────────────────────────────────────────────────────────

/** Notify a customer that their order was placed */
export const notifyOrderPlaced = (userId: string, orderId: string, total: number) =>
    notificationService.createNotification({
        userId,
        title: '🛒 Order Placed!',
        message: `Your order of ₹${total.toFixed(0)} has been placed successfully. We'll confirm it shortly.`,
        type: 'order',
        relatedId: orderId,
        relatedType: 'order',
    });

/** Notify admins about a new customer order */
export const notifyAdminsNewOrder = async (adminUserIds: string[], orderId: string, customerName: string, total: number) =>
    notificationService.createBulkNotifications(
        adminUserIds.map(uid => ({
            userId: uid,
            title: '📦 New Order Received',
            message: `${customerName} placed a new order worth ₹${total.toFixed(0)}.`,
            type: 'order',
            relatedId: orderId,
            relatedType: 'order',
        }))
    );

/** Notify customer that order status changed */
export const notifyOrderStatusChange = (userId: string, orderId: string, newStatus: string) => {
    const statusMessages: Record<string, { title: string; message: string }> = {
        confirmed: { title: '✅ Order Confirmed', message: 'Your order has been confirmed and is being prepared.' },
        assigned: { title: '👷 Delivery Assigned', message: 'A delivery person has been assigned to your order.' },
        out_for_delivery: { title: '🚚 Out for Delivery', message: 'Your order is on its way to you! Get ready.' },
        delivered: { title: '🎉 Order Delivered!', message: 'Your order has been delivered. Enjoy and thank you!' },
        attempted: { title: '⚠️ Delivery Attempted', message: 'We tried to deliver but couldn\'t reach you. We\'ll try again soon.' },
        returned: { title: '↩️ Order Returned', message: 'Your order has been returned. Please contact us for details.' },
        cancelled: { title: '❌ Order Cancelled', message: 'Your order has been cancelled. Contact us if this is an error.' },
    };

    const info = statusMessages[newStatus];
    if (!info) return Promise.resolve(null);

    return notificationService.createNotification({
        userId,
        title: info.title,
        message: info.message,
        type: 'order',
        relatedId: orderId,
        relatedType: 'order',
    });
};

/** Notify a delivery person that an order was assigned to them */
export const notifyDeliveryAssigned = (deliveryUserId: string, orderId: string, customerName: string) =>
    notificationService.createNotification({
        userId: deliveryUserId,
        title: '🚚 New Order Assigned',
        message: `An order for ${customerName} has been assigned to you. Check your dashboard.`,
        type: 'delivery',
        relatedId: orderId,
        relatedType: 'order',
    });

/** Notify a sales person that they have a follow-up due */
export const notifySalesFollowUp = (salesUserId: string, customerName: string, daysSince: number) =>
    notificationService.createNotification({
        userId: salesUserId,
        title: '📞 Follow-up Required',
        message: `${customerName} hasn't ordered in ${daysSince} days. Time for a follow-up!`,
        type: 'sales',
    });

/** Notify admin about a COD settlement */
export const notifyAdminCODSettlement = (adminUserId: string, deliveryPersonName: string, amount: number) =>
    notificationService.createNotification({
        userId: adminUserId,
        title: '💰 COD Settlement',
        message: `${deliveryPersonName} has submitted a COD settlement of ₹${amount.toFixed(0)}.`,
        type: 'system',
    });
