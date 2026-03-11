import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Order, Subscription, Product } from '../types';
import { storageService } from '../services/storageService';

// Map Logic Removed

interface OrdersMobileProps {
    orders: Order[];
    activeSubscription: Subscription | null;
    products: Product[];
    onViewSubscription: () => void;
    onBack?: () => void;
    onNavigate?: (view: string) => void;
}

const STATUS_ICONS: Record<string, { label: string, icon: string, colorClass: string, isDone?: boolean, isNegative?: boolean }> = {
    pending: { label: 'Processing', icon: 'cycle', colorClass: 'text-[#2bee2b]' },
    confirmed: { label: 'Confirmed', icon: 'check_circle', colorClass: 'text-[#2bee2b]' },
    assigned: { label: 'Assigned', icon: 'person', colorClass: 'text-[#2bee2b]' },
    out_for_delivery: { label: 'Out for Delivery', icon: 'local_shipping', colorClass: 'text-[#2bee2b]' },
    delivered: { label: 'Delivered', icon: 'task_alt', colorClass: 'text-[#2bee2b]', isDone: true },
    cancelled: { label: 'Order Cancelled', icon: 'block', colorClass: 'text-rose-600', isDone: true, isNegative: true },
    returned: { label: 'Order Returned', icon: 'assignment_return', colorClass: 'text-amber-600', isDone: true, isNegative: true }
};

const getStatusMeta = (s: string) => STATUS_ICONS[s] || { label: s, icon: 'info', colorClass: 'text-slate-500' };

const OrdersMobile: React.FC<OrdersMobileProps> = ({
    orders: initialOrders,
    activeSubscription,
    products,
    onViewSubscription,
    onBack,
    onNavigate
}) => {
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [tab, setTab] = useState<'tracking' | 'past'>('tracking');
    const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
    const unsubRefs = useRef<Map<string, () => void>>(new Map());

    // Map Logic Removed

    useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

    const subscribeToOrder = useCallback(async (orderId: string) => {
        if (unsubRefs.current.has(orderId)) return;
        const unsub = await storageService.subscribeToOrderChannel(orderId, (payload) => {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: payload.status as any } : o));
        });
        unsubRefs.current.set(orderId, unsub);
    }, []);

    useEffect(() => {
        const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
        activeOrders.forEach(o => subscribeToOrder(o.id));
        return () => { unsubRefs.current.forEach(u => u()); unsubRefs.current.clear(); };
    }, [orders, subscribeToOrder]);

    const activeOrdersList = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
    const pastOrdersList = orders.filter(o => ['delivered', 'cancelled', 'returned'].includes(o.status)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const renderOrderItem = (order: Order) => {
        const statusMeta = getStatusMeta(order.status);
        const itemNames = order.items.map(i => i.product.name).join(', ');
        const truncatedItems = itemNames.length > 35 ? itemNames.substring(0, 35) + '...' : itemNames;

        return (
            <div key={order.id} className="flex flex-col gap-3 py-4 border-b border-[#2bee2b]/10 hover:bg-[#2bee2b]/5 transition-colors px-2 rounded-xl">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${statusMeta.isNegative ? 'bg-rose-50' : 'bg-[#2bee2b]/10'} ${statusMeta.colorClass}`}>
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {statusMeta.icon}
                            </span>
                            {statusMeta.label}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 ml-1">
                            Order #{order.id.toUpperCase()}
                        </h3>
                    </div>
                    <div className="text-right">
                        {order.deliveryOTP && !statusMeta.isDone && (
                            <p className="text-xs font-bold text-slate-500">
                                OTP: <span className="text-[#2bee2b]">{order.deliveryOTP}</span>
                            </p>
                        )}
                        {statusMeta.isDone && (
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest whitespace-nowrap">
                                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                        )}
                        <p className="text-base font-bold text-slate-900 mt-1">₹{order.total}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-500 truncate flex-1">{truncatedItems}</p>
                    <button 
                        onClick={() => setSelectedOrderId(order.id)}
                        className="px-4 py-1.5 bg-[#2bee2b]/10 hover:bg-[#2bee2b] hover:text-slate-900 text-[#2bee2b] border border-[#2bee2b]/20 rounded-full text-xs font-bold transition-colors whitespace-nowrap"
                    >
                        Details
                    </button>
                </div>
            </div>
        );
    };

    const renderOrdersList = () => (
        <div className="bg-[#f6f8f6] font-display text-slate-900 min-h-screen flex flex-col">
            {/* Header Section */}
            <header className="sticky top-0 z-50 bg-[#f6f8f6]/80 backdrop-blur-md border-b border-[#2bee2b]/10">
                <div className="flex items-center p-4 justify-between max-w-2xl mx-auto w-full">
                    <div 
                        onClick={onBack}
                        className="text-slate-900 flex size-10 items-center justify-center rounded-full hover:bg-[#2bee2b]/10 cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </div>
                    <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                        Orders History
                    </h1>
                </div>

                {/* Tabs */}
                <div className="max-w-2xl mx-auto w-full">
                    <div className="flex border-b border-[#2bee2b]/10 px-4 gap-8">
                        <button 
                            onClick={() => setTab('tracking')}
                            className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-all w-[100px] ${tab === 'tracking' ? 'border-[#2bee2b] text-slate-900' : 'border-transparent text-slate-500'}`}
                        >
                            <p className="text-sm font-bold tracking-wide">Tracking</p>
                        </button>
                        <button 
                            onClick={() => setTab('past')}
                            className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-all w-[100px] ${tab === 'past' ? 'border-[#2bee2b] text-slate-900' : 'border-transparent text-slate-500'}`}
                        >
                            <p className="text-sm font-bold tracking-wide">Past Orders</p>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-24 max-w-2xl mx-auto w-full px-4">
                {tab === 'tracking' ? (
                    <div className="py-6 space-y-0 animate-fade-in">
                        {activeOrdersList.length > 0 ? (
                            activeOrdersList.map(renderOrderItem)
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-[#2bee2b]/10 mt-8">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">package_2</span>
                                <p className="text-slate-400 text-sm font-medium">No active deliveries</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-6 space-y-0 animate-fade-in">
                        <h3 className="text-slate-900 text-base font-bold mb-4 px-2">Past Orders History</h3>
                        {pastOrdersList.length > 0 ? (
                            <div className="border-t border-[#2bee2b]/10 pt-2 space-y-0">
                                {pastOrdersList.map(renderOrderItem)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 mt-4 bg-white/50 rounded-2xl border-2 border-dashed border-[#2bee2b]/10">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
                                <p className="text-slate-400 text-sm font-medium">No history available</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f6f8f6] border-t border-[#2bee2b]/10">
                <div className="flex gap-2 px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
                    <button onClick={() => onNavigate?.('LANDING')} className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#2bee2b] transition-colors">
                        <span className="material-symbols-outlined">home</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Home</p>
                    </button>
                    <button onClick={() => onNavigate?.('PRODUCT_HUB')} className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#2bee2b] transition-colors">
                        <span className="material-symbols-outlined">storefront</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Shop</p>
                    </button>
                    <button onClick={() => onNavigate?.('ORDER_HISTORY')} className="flex flex-1 flex-col items-center justify-center gap-1 text-[#2bee2b]">
                        <span className="material-symbols-outlined fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Orders</p>
                    </button>
                    <button onClick={() => onNavigate?.('PROFILE')} className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#2bee2b] transition-colors">
                        <span className="material-symbols-outlined">person</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Profile</p>
                    </button>
                </div>
            </nav>
        </div>
    );

    const renderTracker = () => {
        if (!selectedOrderId) return null;
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return null;
        const statusMeta = getStatusMeta(order.status);
        const steps = ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered'];
        const currentIdx = steps.indexOf(order.status) === -1 ? 4 : steps.indexOf(order.status);

        return (
            <div className="bg-[#f6f8f6] min-h-screen pb-32 flex flex-col font-display text-slate-900">
                <header className="px-4 py-4 border-b border-[#2bee2b]/10 flex items-center justify-between sticky top-0 bg-[#f6f8f6]/90 backdrop-blur-md z-50">
                    <button 
                        onClick={() => setSelectedOrderId(null)} 
                        className="w-10 h-10 flex flex-col items-center justify-center rounded-full hover:bg-[#2bee2b]/10 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="text-center font-bold text-lg tracking-tight">Order Details</div>
                    <div className="w-10"></div>
                </header>
                <main className="flex-1 max-w-lg mx-auto w-full px-6 py-8">
                    <div className="flex items-center gap-4 mb-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-[#2bee2b]/10 ${statusMeta.colorClass}`}>
                            <span className="material-symbols-outlined text-3xl">{statusMeta.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#2bee2b] mb-1">
                                #{order.id.toUpperCase()}
                            </p>
                            <h2 className="text-2xl font-black leading-tight">{statusMeta.label}</h2>
                        </div>
                    </div>

                    <div className="space-y-10 relative pl-4 border-l-2 border-[#2bee2b]/20 ml-2">
                        {steps.map((step, i) => {
                            const isDone = i <= currentIdx || (statusMeta.isNegative && i < 4);
                            const isCurrent = i === currentIdx;
                            const meta = getStatusMeta(step);
                            
                            // If order is cancelled/returned, hide the path to "Delivered" if it's not reached
                            if (statusMeta.isNegative && i === 4) return null;

                            return (
                                <div key={step} className="flex gap-6 relative">
                                    <div className={`absolute -left-[27px] w-5 h-5 rounded-full border-4 border-[#f6f8f6] ${isDone ? 'bg-[#2bee2b] shadow-lg shadow-[#2bee2b]/40' : 'bg-slate-300'}`} />
                                    <div className={isDone ? 'opacity-100' : 'opacity-30'}>
                                        <h4 className="text-sm font-bold tracking-wide text-slate-900">{meta.label}</h4>
                                        {isCurrent && !meta.isDone && <p className="text-xs text-[#2bee2b] font-bold mt-1">Status Active Live</p>}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {statusMeta.isNegative && (
                            <div className="flex gap-6 relative">
                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full border-4 border-[#f6f8f6] bg-rose-500 shadow-lg shadow-rose-200`} />
                                <div className="opacity-100">
                                    <h4 className="text-sm font-bold tracking-wide text-rose-600">{statusMeta.label}</h4>
                                    <p className="text-xs text-rose-400 font-medium mt-1">
                                        {order.status === 'returned' ? 'Package returned to warehouse' : 'This order was cancelled'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>



                    <div className="mt-16 bg-white p-6 rounded-3xl border border-[#2bee2b]/10 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-2">Package Breakdown</h3>
                        <div className="space-y-4 mb-8">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                    <span className="text-sm font-bold text-slate-600 truncate mr-2">{item.product.name} <span className="text-[#2bee2b] ml-1 px-1 bg-[#2bee2b]/10 rounded-md">x{item.quantity}</span></span>
                                    <span className="text-sm font-black text-slate-900">₹{item.product.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-end border-t border-[#2bee2b]/10 pt-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bill</p>
                                <p className="text-3xl font-black leading-none">₹{order.total}</p>
                            </div>
                            <div className="bg-[#2bee2b]/10 text-[#2bee2b] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {order.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD'}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    };

    return selectedOrderId ? renderTracker() : renderOrdersList();
};

export default OrdersMobile;
