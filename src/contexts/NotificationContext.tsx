
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationContextValue {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: async () => { },
    markAllAsRead: async () => { },
    deleteNotification: async () => { },
    clearAll: async () => { },
    refresh: async () => { },
});

export const useNotifications = () => useContext(NotificationContext);

interface Props {
    userId: string | null;
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<Props> = ({ userId, children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const load = useCallback(async () => {
        if (!userId) { setNotifications([]); return; }
        setIsLoading(true);
        try {
            const data = await notificationService.getNotifications(userId);
            setNotifications(data);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Load & subscribe to real-time when userId changes
    useEffect(() => {
        if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
        if (!userId) { setNotifications([]); return; }

        load();

        const unsub = notificationService.subscribeToNotifications(userId, (newNotif) => {
            setNotifications(prev => {
                // Avoid duplicates
                if (prev.some(n => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
            });
        });

        unsubscribeRef.current = unsub;
        return () => { if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; } };
    }, [userId, load]);

    const markAsRead = useCallback(async (id: string) => {
        await notificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        await notificationService.markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, [userId]);

    const deleteNotification = useCallback(async (id: string) => {
        await notificationService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(async () => {
        if (!userId) return;
        await notificationService.clearAll(userId);
        setNotifications([]);
    }, [userId]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            clearAll,
            refresh: load,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
