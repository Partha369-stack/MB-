
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ShoppingBag, Truck, BarChart3, Settings } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification, NotificationType } from '../services/notificationService';

// ─── Time formatting helper ───────────────────────────────────────────────────
const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

// ─── Icon per notification type ───────────────────────────────────────────────
const TypeIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const base = 'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0';
    switch (type) {
        case 'order': return <div className={`${base} bg-green-100`}><ShoppingBag className="w-4 h-4 text-green-700" /></div>;
        case 'delivery': return <div className={`${base} bg-blue-100`}><Truck className="w-4 h-4 text-blue-700" /></div>;
        case 'sales': return <div className={`${base} bg-amber-100`}><BarChart3 className="w-4 h-4 text-amber-700" /></div>;
        default: return <div className={`${base} bg-slate-100`}><Settings className="w-4 h-4 text-slate-600" /></div>;
    }
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotificationRow: React.FC<{ n: Notification }> = ({ n }) => {
    const { markAsRead, deleteNotification } = useNotifications();

    return (
        <div
            onClick={() => { if (!n.isRead) markAsRead(n.id); }}
            className={`
        group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200
        ${n.isRead
                    ? 'bg-white hover:bg-slate-50'
                    : 'bg-green-50/60 hover:bg-green-50 border-l-[3px] border-green-500'}
      `}
        >
            <TypeIcon type={n.type} />
            <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-black leading-tight mb-0.5 ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                    {n.title}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-snug line-clamp-2">{n.message}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{timeAgo(n.createdAt)}</p>
            </div>
            {/* Delete button – shown on hover */}
            <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 shrink-0"
                title="Dismiss"
            >
                <X className="w-3.5 h-3.5" />
            </button>
            {/* Unread dot */}
            {!n.isRead && (
                <div className="absolute top-3.5 right-10 w-1.5 h-1.5 bg-green-500 rounded-full" />
            )}
        </div>
    );
};

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4 border border-green-100">
            <Bell className="w-7 h-7 text-green-400" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1.5">All clear!</p>
        <p className="text-[10px] text-slate-400 font-medium max-w-[180px] leading-relaxed">
            You're up to date — no notifications right now.
        </p>
    </div>
);

// ─── Main Bell Component ──────────────────────────────────────────────────────
export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAllAsRead, clearAll, isLoading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevUnreadRef = useRef(unreadCount);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Shake bell when a new notification arrives
    useEffect(() => {
        if (unreadCount > prevUnreadRef.current) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
        }
        prevUnreadRef.current = unreadCount;
    }, [unreadCount]);

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell button */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={`
          relative p-2.5 rounded-2xl transition-all duration-200 border
          ${isOpen
                        ? 'bg-green-700 text-white border-green-800 shadow-md shadow-green-200'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-green-50 hover:text-green-700 hover:border-green-100'}
          ${isShaking ? 'animate-bell-shake' : ''}
        `}
                title="Notifications"
            >
                <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[999] animate-notification-drop">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50 bg-slate-50/30">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Inbox</p>
                            <p className="text-xs font-black text-slate-900">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-green-100 text-green-800 text-[9px] font-black rounded-full px-1">
                                        {unreadCount}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-green-700 hover:bg-green-50 transition-all"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    title="Clear all"
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {isLoading ? (
                            <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                                <div className="w-4 h-4 border-2 border-slate-200 border-t-green-500 rounded-full animate-spin" />
                                <span className="text-[10px] font-medium">Loading…</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <EmptyState />
                        ) : (
                            notifications.map(n => <NotificationRow key={n.id} n={n} />)
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </p>
                            {unreadCount === 0 && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-widest">
                                    <Check className="w-3 h-3" /> All read
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
