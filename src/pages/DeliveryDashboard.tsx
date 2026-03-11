import React, { useState, useEffect } from 'react';
import {
    Truck, CheckCircle2, Phone,
    Clock, LogOut, ChevronRight,
    ArrowLeft, Search, Filter, AlertCircle,
    RotateCcw, CreditCard, ChevronDown,
    Check, Activity, Power, User, History, UserCheck, ShieldCheck, Copy, IndianRupee,
    Home, Package, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { User as UserType, Order, CODSettlement, Subscription } from '../types';

// Custom Icons
// Removed Map Logic

interface DeliveryDashboardProps {
    user: UserType;
    onLogout: () => void;
    onUserUpdate?: (user: UserType) => void;
}

const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ user, onLogout, onUserUpdate }) => {
    if (!user) return null;
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settlements'>('home');
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [isAvailable, setIsAvailable] = useState(user.isAvailable || false);
    const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
    const [codStats, setCodStats] = useState({
        totalPending: 0,
        totalSettled: 0,
        pendingCount: 0,
        settledCount: 0,
        pendingSettlements: [] as CODSettlement[],
        settledSettlements: [] as CODSettlement[]
    });

    // Real-time Map States - Removed

    // Modals
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        setIsAvailable(user.isAvailable || false);
    }, [user.isAvailable]);

    const fetchData = async () => {
        try {
            const [usersData, ordersData, subsData, statsData] = await Promise.all([
                storageService.getUsers(),
                storageService.getAllOrders(),
                storageService.getAllSubscriptions(),
                storageService.getDeliveryPersonCODStats(user.id)
            ]);

            setAllUsers(usersData);

            const myOrders = ordersData.filter(o => {
                const isExplicitlyMine = o.deliveryPersonId === user.id;
                const isAssignedPartner = usersData.find(u => u.id === o.userId)?.assignedDeliveryPersonId === user.id;

                if (['confirmed', 'out_for_delivery', 'attempted'].includes(o.status)) {
                    return isExplicitlyMine || (isAssignedPartner && o.status === 'confirmed');
                }

                if (['delivered', 'returned', 'cancelled'].includes(o.status)) {
                    return isExplicitlyMine;
                }

                return false;
            });

            setOrders(myOrders);

            const mySubs = subsData.filter(s =>
                usersData.find(u => u.id === s.userId)?.assignedDeliveryPersonId === user.id
            );
            setSubscriptions(mySubs);

            setCodStats(statsData);
            setLoading(false);
        } catch (err) {
            console.error("Fetch Data Error:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const tables = ['orders', 'subscriptions', 'profiles', 'cod_settlements'];
        const cleanupPromises = tables.map(table =>
            storageService.subscribeToRealtimeTable(table, () => { fetchData(); })
        );
        return () => {
            cleanupPromises.forEach(p => p.then(cleanup => cleanup && cleanup()));
        };
    }, [user.id]);

    const toggleAvailability = async () => {
        if (isToggling) return;
        const nextStatus = !isAvailable;
        setIsAvailable(nextStatus);
        setIsToggling(true);
        try {
            storageService.publishRealtimeEvent('delivery_status', 'change', {
                userId: user.id,
                isAvailable: nextStatus,
                timestamp: new Date().toISOString()
            }).catch(e => console.warn("[Toggle Status] Broadcast Error:", e));

            const { error } = await storageService.updateDeliveryAvailability(user.id, nextStatus);
            if (error) throw error;
            if (onUserUpdate) onUserUpdate({ ...user, isAvailable: nextStatus });
        } catch (err: any) {
            setIsAvailable(user.isAvailable || false);
            alert(`Could not update status: ${err.message || "Network Error"}`);
        } finally {
            setIsToggling(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        try {
            const updatedOrder = { ...order, status: newStatus, deliveryPersonId: user.id };
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            storageService.publishOrderStatusUpdate(orderId, newStatus, order.userId).catch(() => { });
            await storageService.saveOrder(updatedOrder);

            if (newStatus === 'delivered' && (order.paymentMethod === 'COD' || !order.paymentMethod)) {
                try {
                    await storageService.saveCODSettlement({
                        id: '',
                        deliveryPersonId: user.id,
                        deliveryPersonName: user.name,
                        orderId: order.id,
                        amount: order.total,
                        collectedAt: new Date().toISOString(),
                        status: 'pending'
                    });
                    storageService.publishRealtimeEvent('cod_settlements', 'insert', {
                        deliveryPersonId: user.id,
                        orderId: order.id
                    }).catch(() => { });
                } catch (settleErr) { console.error("Vault Settlement Failed:", settleErr); }
            }

            if (['delivered', 'returned'].includes(newStatus)) {
                setExpandedOrderId(null);
                fetchData();
            }
        } catch (err) {
            console.error("Status Update Failed:", err);
            fetchData();
        }
    };

    const handleVerifyOTP = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const typedOtp = otpInputs[orderId];
        if (typedOtp === order.deliveryOTP) {
            await handleUpdateOrderStatus(orderId, 'delivered');
        } else {
            alert("Invalid Mission Code. Please verify with the customer.");
        }
    };

    const handleReturn = async () => {
        if (!selectedOrderForReturn || !returnReason.trim()) return;
        try {
            const updatedOrder = { ...selectedOrderForReturn, status: 'returned' as const, notes: returnReason };
            await storageService.saveOrder(updatedOrder);
            storageService.publishOrderStatusUpdate(selectedOrderForReturn.id, 'returned', selectedOrderForReturn.userId).catch(() => { });
            setShowReturnModal(false);
            setReturnReason('');
            setSelectedOrderForReturn(null);
            fetchData();
        } catch (err) { console.error("Return failed:", err); }
    };

    const handleAcceptAllTasks = async () => {
        const confirmedOrders = activeMissions.filter(o => o.status === 'confirmed');
        if (confirmedOrders.length === 0) return;

        setLoading(true);
        try {
            // Sequential updates to ensure each order gets its OTP and correct processing via saveOrder
            for (const order of confirmedOrders) {
                await storageService.saveOrder({
                    ...order,
                    status: 'out_for_delivery',
                    deliveryPersonId: user.id
                });
                storageService.publishOrderStatusUpdate(order.id, 'out_for_delivery', order.userId).catch(() => { });
            }
            alert(`Successfully accepted ${confirmedOrders.length} tasks!`);
            setShowQueueModal(false);
            fetchData();
        } catch (err: any) {
            console.error("Accept All Failed:", err);
            alert(`Some tasks could not be accepted: ${err.message || 'Unknown error'}`);
            fetchData();
        } finally {
            setLoading(false);
        }
    };

    const cleanSearch = searchQuery.toLowerCase().replace(/^#?mb/, '');

    const activeMissions = orders.filter(o => {
        const customer = allUsers.find(u => u.id === o.userId);
        const isReturnPending = ['returned', 'attempted', 'cancelled'].includes(o.status) && !o.returnConfirmed;
        const matchesStatus = ['confirmed', 'out_for_delivery'].includes(o.status) || isReturnPending;
        const matchesSearch = !cleanSearch ||
            o.id.toLowerCase().includes(cleanSearch) ||
            (customer?.name?.toLowerCase().includes(cleanSearch)) ||
            (customer?.phone?.includes(cleanSearch));
        return matchesStatus && matchesSearch;
    });

    const missionHistory = orders.filter(o => {
        const customer = allUsers.find(u => u.id === o.userId);
        const isReturnComplete = ['returned', 'attempted', 'cancelled'].includes(o.status) && o.returnConfirmed;
        const matchesStatus = o.status === 'delivered' || isReturnComplete;
        const matchesSearch = !cleanSearch ||
            o.id.toLowerCase().includes(cleanSearch) ||
            (customer?.name?.toLowerCase().includes(cleanSearch));
        return matchesStatus && matchesSearch;
    });

    // Active delivery = first out_for_delivery, else first confirmed
    const activeDelivery = activeMissions.find(o => o.status === 'out_for_delivery') || activeMissions.find(o => o.status === 'confirmed') || null;
    const activeCustomer = activeDelivery ? allUsers.find(u => u.id === activeDelivery.userId) : null;

    // Next tasks = remaining active missions (excluding the activeDelivery)
    const nextTasks = activeMissions.filter(o => o.id !== activeDelivery?.id);

    // Map logic removed

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full animate-spin" />
                    <Truck className="w-6 h-6 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="font-black text-green-900 uppercase tracking-widest text-sm">Loading Dashboard</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F7F5] font-sans flex flex-col max-w-md mx-auto relative">

            {/* ── TOP HEADER: Profile + Online Toggle ── */}
            <header className="bg-white px-5 pt-10 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Back to Landing Page */}
                    <button
                        onClick={() => { window.location.href = '/'; }}
                        className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-green-50 hover:text-green-600 hover:border-green-100 transition-all active:scale-90 shadow-sm"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-11 h-11 rounded-full bg-green-50 border-2 border-green-100 overflow-hidden flex-shrink-0 shadow-sm">
                        {user.profilePic
                            ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-green-400"><User className="w-5 h-5" /></div>
                        }
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-900 leading-none">{user.name}</p>
                        <p className="text-[10px] font-semibold text-green-500 mt-0.5 uppercase tracking-wide">
                            {isAvailable ? 'Active Partner' : 'Offline Partner'}
                        </p>
                    </div>
                </div>

                {/* Online Toggle — pill switch style matching Stitch */}
                <button
                    onClick={toggleAvailability}
                    disabled={isToggling}
                    className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border transition-all active:scale-95 shadow-sm ${isAvailable ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
                >
                    <span className={`text-[11px] font-black tracking-wide ${isAvailable ? 'text-green-600' : 'text-slate-400'}`}>
                        {isToggling ? '...' : (isAvailable ? 'Online' : 'Offline')}
                    </span>
                    {/* Toggle pill */}
                    <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${isAvailable ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`absolute w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${isAvailable ? 'left-[22px]' : 'left-[2px]'}`} />
                    </div>
                </button>
            </header>



            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 px-5 pt-5 pb-28 space-y-5 overflow-y-auto">

                {activeTab === 'home' && (
                    <>
                        {/* Active Delivery Card */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center">
                                    <Truck className="w-3 h-3 text-green-600" />
                                </div>
                                <h2 className="text-sm font-black text-slate-800">Active Delivery</h2>
                            </div>

                            {activeDelivery && activeCustomer ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                                    {/* Order ID + Status Badge */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Order #{activeDelivery.id.toUpperCase()}
                                        </span>
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${activeDelivery.status === 'out_for_delivery' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {activeDelivery.status === 'out_for_delivery' ? 'Out for Delivery' : 'Pick up Ready'}
                                        </span>
                                    </div>

                                    {/* Customer Name */}
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 leading-tight">{activeCustomer.name || 'Customer'}</h3>
                                    </div>

                                    {/* Delivery Address */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Delivery Address</p>
                                            <p className="text-xs font-semibold text-slate-700 mt-0.5">{activeCustomer.address || 'Address not available'}</p>
                                        </div>
                                    </div>

                                    {/* Package Details */}
                                    <div className="flex items-start gap-2.5">
                                        <Package className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Package Details</p>
                                            <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                                {activeDelivery.items?.map(i => `${i.product?.name || 'Item'} ×${i.quantity}`).join(', ') || 'No items'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* OTP Section (only when out_for_delivery) */}
                                    {activeDelivery.status === 'out_for_delivery' && expandedOrderId === activeDelivery.id && (
                                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                                <span className="text-[10px] font-black uppercase text-green-900 tracking-widest">Client Mission Code</span>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={4}
                                                placeholder="0000"
                                                value={otpInputs[activeDelivery.id] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setOtpInputs(prev => ({ ...prev, [activeDelivery.id]: val }));
                                                }}
                                                className="w-full bg-white border-2 border-green-100 rounded-2xl py-5 text-center text-4xl font-black tracking-[0.5em] indent-[0.25em] font-mono text-green-600 focus:ring-8 focus:ring-green-500/5 focus:border-green-500 outline-none placeholder:text-slate-100 transition-all shadow-inner"
                                            />
                                            <button
                                                onClick={() => handleVerifyOTP(activeDelivery.id)}
                                                disabled={!otpInputs[activeDelivery.id] || otpInputs[activeDelivery.id].length < 4}
                                                className="w-full bg-green-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-200"
                                            >
                                                Finalize Delivery
                                            </button>
                                            <div className="flex items-center gap-3 pt-1">
                                                <a
                                                    href={`tel:${activeCustomer.phone}`}
                                                    className="flex-1 bg-white border border-slate-100 text-slate-600 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Phone className="w-3.5 h-3.5" /> Call
                                                </a>
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrderForReturn(activeDelivery);
                                                        setShowReturnModal(true);
                                                    }}
                                                    className="flex-1 bg-white border border-rose-100 text-rose-500 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <AlertCircle className="w-3.5 h-3.5" /> Issue
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-1">
                                        {activeDelivery.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleUpdateOrderStatus(activeDelivery.id, 'out_for_delivery')}
                                                className="flex-1 bg-green-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-200"
                                            >
                                                <Truck className="w-4 h-4" /> Accept Task
                                            </button>
                                        )}
                                        {activeDelivery.status === 'out_for_delivery' && expandedOrderId !== activeDelivery.id && (
                                            <button
                                                onClick={() => setExpandedOrderId(activeDelivery.id)}
                                                className="flex-1 bg-green-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-200"
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Complete Delivery
                                            </button>
                                        )}
                                        {activeDelivery.status === 'out_for_delivery' && expandedOrderId === activeDelivery.id && (
                                            <button
                                                onClick={() => setExpandedOrderId(null)}
                                                className="flex-1 bg-slate-100 text-slate-500 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                                            >
                                                Collapse
                                            </button>
                                        )}
                                        <a
                                            href={`tel:${activeCustomer.phone}`}
                                            className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm hover:text-green-600 transition-colors shrink-0"
                                        >
                                            <Phone className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center text-center space-y-3">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                                        <CheckCircle2 className="w-7 h-7 text-green-300" />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Delivery</p>
                                    <p className="text-[10px] text-slate-300 font-semibold">Waiting for dispatch</p>
                                </div>
                            )}
                        </div>

                        {/* Next Tasks */}
                        {nextTasks.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-black text-slate-800">Next Tasks</h2>
                                    <button 
                                        onClick={() => setShowQueueModal(true)}
                                        className="text-[10px] font-bold text-green-500 uppercase tracking-wide hover:text-green-700 transition-colors"
                                    >
                                        View Queue
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {nextTasks.slice(0, 5).map(order => {
                                        const customer = allUsers.find(u => u.id === order.userId);
                                        return (
                                            <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {customer?.profilePic
                                                        ? <img src={customer.profilePic} className="w-full h-full object-cover" alt="" />
                                                        : <Package className="w-5 h-5 text-green-400" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-900 truncate">{customer?.name || 'Customer'}</p>
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{customer?.address || 'No Address'}</p>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 tracking-wide shrink-0">
                                                    #{order.id.toUpperCase().slice(-6)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Stats row when no active delivery */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed Today</p>
                                <p className="text-2xl font-black text-slate-900">{missionHistory.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length}</p>
                                <p className="text-[9px] text-green-500 font-bold mt-1 uppercase">Deliveries</p>
                            </div>
                            <div
                                className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => setActiveTab('settlements')}
                            >
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending COD</p>
                                <p className="text-2xl font-black text-white">₹{codStats.totalPending}</p>
                                <p className="text-[9px] text-green-400 font-bold mt-1 uppercase">{codStats.pendingCount} Settlements</p>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800">Delivery Log</h3>
                            <span className="text-[10px] font-bold text-slate-400">{missionHistory.length} sessions</span>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search by name or order ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-green-500/5 focus:border-green-400 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                            />
                        </div>

                        {missionHistory.length === 0 ? (
                            <div className="py-16 flex flex-col items-center text-center space-y-3">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center"><Check className="w-6 h-6 text-slate-200" /></div>
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No History Yet</p>
                            </div>
                        ) : (
                            missionHistory.map(order => {
                                const customer = allUsers.find(u => u.id === order.userId);
                                return (
                                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === 'delivered' ? 'bg-green-50 text-green-500' : 'bg-rose-50 text-rose-500'}`}>
                                                {order.status === 'delivered' ? <Check className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800 truncate">{customer?.name || 'Guest'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-black text-slate-900">₹{order.total}</p>
                                            <p className={`text-[9px] font-black uppercase mt-1 ${order.status === 'delivered' ? 'text-green-500' : 'text-rose-500'}`}>
                                                {order.status === 'delivered' ? 'Delivered' : 'Returned'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'settlements' && (
                    <div className="space-y-4">
                        {/* Vault Card */}
                        <div className="bg-green-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-green-200">
                            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Your COD Vault</p>
                            <h2 className="text-4xl font-black tracking-tight">₹{codStats.totalPending}</h2>
                            <div className="flex items-center gap-2 mt-3 text-white/70">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{codStats.pendingCount} pending reconciliations</span>
                            </div>
                        </div>

                        {codStats.pendingSettlements.length === 0 ? (
                            <div className="py-14 flex flex-col items-center gap-3 text-center">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-green-50 shadow text-green-400">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Settlements Clear</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pending Settlements</p>
                                {codStats.pendingSettlements.map(item => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                                <IndianRupee className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{item.orderId.toUpperCase()}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(item.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-green-600">₹{item.amount}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── BOTTOM NAVIGATION — matching Stitch design ── */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-around z-50 safe-area-bottom">
                {[
                    { id: 'home', icon: Home, label: 'Home' },
                    { id: 'history', icon: History, label: 'History' },
                    { id: 'settlements', icon: Wallet, label: 'Collect Amount' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'text-green-500' : 'text-slate-400'}`}
                    >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-wide ${activeTab === tab.id ? 'text-green-500' : 'text-slate-400'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* ── RETURN MODAL ── */}
            {showReturnModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-slate-100 rounded-full" />
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Report Issue</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Why couldn't you deliver?</p>
                        </div>
                        <div className="space-y-4">
                            <textarea
                                placeholder="E.g. Customer not at home, wrong address..."
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-xs font-bold text-slate-900 focus:border-rose-400 focus:bg-white outline-none placeholder:text-slate-300 min-h-[120px]"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowReturnModal(false)}
                                    className="bg-slate-50 text-slate-400 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReturn}
                                    disabled={!returnReason.trim()}
                                    className="bg-rose-500 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                                >
                                    Log Issue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <QueueModal 
                isOpen={showQueueModal}
                onClose={() => setShowQueueModal(false)}
                missions={activeMissions}
                users={allUsers}
                onAcceptAll={handleAcceptAllTasks}
                onAcceptOrder={(id) => handleUpdateOrderStatus(id, 'out_for_delivery')}
            />
        </div>
    );
};

const QueueModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    missions: Order[];
    users: UserType[];
    onAcceptAll: () => void;
    onAcceptOrder: (id: string) => void;
}> = ({ isOpen, onClose, missions, users, onAcceptAll, onAcceptOrder }) => {
    if (!isOpen) return null;

    const confirmedMissions = missions.filter(m => m.status === 'confirmed');
    const inProgressMissions = missions.filter(m => m.status === 'out_for_delivery');

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center px-4 pb-8 overflow-hidden" onClick={onClose}>
            <div 
                className="bg-[#F5F7F5] w-full max-w-sm rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300" 
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 flex-shrink-0" />

                <div className="px-6 pb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Task Queue</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {missions.length} active assignments
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-all shadow-sm"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-8">
                    {/* Confirm Button for All */}
                    {confirmedMissions.length > 1 && (
                        <button
                            onClick={onAcceptAll}
                            className="w-full bg-green-500 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-[0.98] transition-all"
                        >
                            <Truck className="w-4 h-4" /> Accept All ({confirmedMissions.length})
                        </button>
                    )}

                    {/* Pending Section */}
                    {confirmedMissions.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Waiting Acceptance</p>
                            {confirmedMissions.map(m => {
                                const customer = users.find(u => u.id === m.userId);
                                return (
                                    <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                                            <Package className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-900 truncate">{customer?.name || 'Customer'}</p>
                                            <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{customer?.address || 'No address'}</p>
                                        </div>
                                        <button 
                                            onClick={() => onAcceptOrder(m.id)}
                                            className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 active:scale-90 transition-all"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* In Progress Section */}
                    {inProgressMissions.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Out for Delivery</p>
                            {inProgressMissions.map(m => {
                                const customer = users.find(u => u.id === m.userId);
                                return (
                                    <div key={m.id} className="bg-white/60 rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                                            <Truck className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-900 truncate">{customer?.name || 'Customer'}</p>
                                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{customer?.address || 'No address'}</p>
                                        </div>
                                        <div className="px-2 py-1 rounded-md bg-green-100 text-[8px] font-black text-green-700 uppercase tracking-wide">
                                            Active
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {missions.length === 0 && (
                        <div className="py-12 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                                <Package className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Your queue is empty</p>
                        </div>
                    )}
                </div>
                
                {/* Safe area spacer */}
                <div className="h-4 flex-shrink-0" />
            </div>
        </div>
    );
};

export default DeliveryDashboard;
