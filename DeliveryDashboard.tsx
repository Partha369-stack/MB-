
import React, { useState, useEffect } from 'react';
import {
    Package,
    MapPin,
    CheckCircle2,
    Clock,
    Search,
    Phone,
    User,
    LogOut,
    Truck,
    Navigation,
    ChevronDown,
    DollarSign,
    TrendingUp,
    Award,
    Target,
    Calendar,
    Star,
    RefreshCw,
    Bell,
    AlertCircle,
    Leaf,
    Sparkles,
    Wallet,
    IndianRupee
} from 'lucide-react';
import { Card, Button } from './components/Layout';
import { storageService } from './services/storageService';
import { User as UserType, Order, Subscription, Product, CODSettlement } from './types';
import { PRODUCTS } from './constants';

type DeliveryDashboardProps = {
    onLogout: () => void;
};

const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions' | 'cod' | 'progress'>('orders');
    const [orderView, setOrderView] = useState<'pending' | 'completed'>('pending');
    const [codView, setCodeView] = useState<'pending' | 'settled'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [orders, setOrders] = useState<Order[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [deliveryPerson, setDeliveryPerson] = useState<UserType | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
    const [codStats, setCodStats] = useState<{
        totalPending: number;
        totalSettled: number;
        pendingCount: number;
        settledCount: number;
        pendingSettlements: CODSettlement[];
        settledSettlements: CODSettlement[];
    }>({
        totalPending: 0,
        totalSettled: 0,
        pendingCount: 0,
        settledCount: 0,
        pendingSettlements: [],
        settledSettlements: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const currentUser = storageService.getUser();
            setDeliveryPerson(currentUser);

            const allOrders = await storageService.getAllOrders();
            // Filter orders to show only those assigned to this delivery person
            const myOrders = currentUser
                ? allOrders.filter(order => order.deliveryPersonId === currentUser.id)
                : [];
            setOrders(myOrders);

            const subs = await storageService.getAllSubscriptions();
            setSubscriptions(subs);

            const users = await storageService.getUsers() || [];
            setAllUsers(users);

            // Fetch COD stats
            if (currentUser) {
                const stats = storageService.getDeliveryPersonCODStats(currentUser.id);
                setCodStats(stats);
            }
        } catch (error) {
            console.error('Error fetching delivery data:', error);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'delivered') => {
        if (newStatus === 'delivered') {
            // Open OTP modal for verification
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setSelectedOrderForDelivery(order);
                setShowOtpModal(true);
                setOtpInput('');
                setOtpError('');
            }
        } else {
            // For other status changes, update directly
            const updatedOrders = orders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            );
            setOrders(updatedOrders);

            const orderToUpdate = updatedOrders.find(o => o.id === orderId);
            if (orderToUpdate) {
                await storageService.saveOrder(orderToUpdate);
            }
            setExpandedOrder(null);
        }
    };

    const handleVerifyOTP = async () => {
        if (!selectedOrderForDelivery) return;

        // Verify OTP
        if (otpInput !== selectedOrderForDelivery.deliveryOTP) {
            setOtpError('Invalid OTP! Please check and try again.');
            return;
        }

        // OTP is correct, mark as delivered
        const updatedOrders = orders.map(order =>
            order.id === selectedOrderForDelivery.id ? { ...order, status: 'delivered' as const } : order
        );
        setOrders(updatedOrders);

        const orderToUpdate = updatedOrders.find(o => o.id === selectedOrderForDelivery.id);
        if (orderToUpdate) {
            await storageService.saveOrder(orderToUpdate);

            // If order is marked as delivered and payment is COD, create settlement record
            if (orderToUpdate.paymentMethod === 'COD' && deliveryPerson) {
                const settlement: CODSettlement = {
                    id: `cod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    deliveryPersonId: deliveryPerson.id,
                    deliveryPersonName: deliveryPerson.name,
                    orderId: orderToUpdate.id,
                    amount: orderToUpdate.total,
                    collectedAt: new Date().toISOString(),
                    status: 'pending'
                };
                storageService.saveCODSettlement(settlement);

                // Refresh COD stats
                const stats = storageService.getDeliveryPersonCODStats(deliveryPerson.id);
                setCodStats(stats);
            }
        }

        // Close modal and reset
        setShowOtpModal(false);
        setSelectedOrderForDelivery(null);
        setOtpInput('');
        setOtpError('');
        setExpandedOrder(null);
    };

    const getNextDeliveryDate = (deliveryDate: number): string => {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let nextMonth = currentMonth;
        let nextYear = currentYear;

        if (currentDay >= deliveryDate) {
            nextMonth = currentMonth + 1;
            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear = currentYear + 1;
            }
        }

        const nextDate = new Date(nextYear, nextMonth, deliveryDate);
        return nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getDaysUntilDelivery = (deliveryDate: number): number => {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let targetMonth = currentMonth;
        let targetYear = currentYear;

        if (currentDay >= deliveryDate) {
            targetMonth = currentMonth + 1;
            if (targetMonth > 11) {
                targetMonth = 0;
                targetYear = currentYear + 1;
            }
        }

        const targetDate = new Date(targetYear, targetMonth, deliveryDate);
        const diffTime = targetDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'paused').length;
    const pausedSubscriptions = subscriptions.filter(s => s.status === 'paused').length;
    const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
    }).length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    const filteredOrders = orders
        .filter(o => o.status === orderView)
        .filter(o => {
            const user = allUsers.find(u => u.id === o.userId);
            const searchLower = searchQuery.toLowerCase();
            return (
                o.id.toLowerCase().includes(searchLower) ||
                user?.name?.toLowerCase().includes(searchLower) ||
                user?.phone?.toLowerCase().includes(searchLower) ||
                user?.address?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredSubscriptions = subscriptions
        .filter(s => s.status === 'active' || s.status === 'paused')
        .filter(s => {
            const user = allUsers.find(u => u.id === s.userId);
            const searchLower = searchQuery.toLowerCase();
            return (
                s.id.toLowerCase().includes(searchLower) ||
                user?.name?.toLowerCase().includes(searchLower) ||
                user?.phone?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => getDaysUntilDelivery(a.deliveryDate) - getDaysUntilDelivery(b.deliveryDate));

    const renderProfile = () => (
        <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-3xl p-6 text-white mb-4 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden border-3 border-white/40 shadow-xl">
                        {deliveryPerson?.profilePic ? (
                            <img src={deliveryPerson.profilePic} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <User className="w-10 h-10 text-white" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <Truck className="w-4 h-4 text-emerald-900" />
                    </div>
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                        {deliveryPerson?.name || 'Delivery Person'}
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                    </h2>
                    <p className="text-sm text-green-100 flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5" />
                        {deliveryPerson?.phone || 'N/A'}
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all active:scale-95 backdrop-blur-sm border border-white/20"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all">
                    <Package className="w-5 h-5 text-green-200 mb-2" />
                    <p className="text-3xl font-bold mb-0.5">{totalOrders}</p>
                    <p className="text-[11px] text-green-100 font-medium">Total</p>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all">
                    <Clock className="w-5 h-5 text-amber-300 mb-2" />
                    <p className="text-3xl font-bold mb-0.5">{pendingOrders}</p>
                    <p className="text-[11px] text-green-100 font-medium">Pending</p>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 mb-2" />
                    <p className="text-3xl font-bold mb-0.5">{completedOrders}</p>
                    <p className="text-[11px] text-green-100 font-medium">Done</p>
                </div>
                <div className={`bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all ${codStats.totalPending > 0 ? 'ring-2 ring-yellow-300' : ''
                    }`}>
                    <Wallet className="w-5 h-5 text-yellow-300 mb-2" />
                    <p className="text-2xl font-bold mb-0.5">₹{codStats.totalPending}</p>
                    <p className="text-[11px] text-green-100 font-medium">To Return</p>
                </div>
            </div>
        </div>
    );

    const renderSubscriptions = () => (
        <div className="space-y-4 pb-6">
            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-sm font-bold text-purple-900 mb-1">Monthly Subscriptions</p>
                    <p className="text-xs text-purple-700 leading-relaxed">Recurring deliveries on fixed dates. Paused subscriptions shown in gray. Cancelled subscriptions are hidden.</p>
                </div>
            </div>

            {/* Paused Count Indicator */}
            {pausedSubscriptions > 0 && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-slate-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">{pausedSubscriptions} subscription{pausedSubscriptions > 1 ? 's' : ''} paused</p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">No deliveries scheduled</p>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search subscriptions..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none text-sm font-medium transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Subscriptions List */}
            {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-slate-600 font-bold text-lg">No active subscriptions</p>
                    <p className="text-slate-500 text-sm mt-1">Subscription orders will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredSubscriptions.map((sub) => {
                        const customer = allUsers.find(u => u.id === sub.userId);
                        const isExpanded = expandedSub === sub.id;
                        const daysUntil = getDaysUntilDelivery(sub.deliveryDate);
                        const nextDate = getNextDeliveryDate(sub.deliveryDate);
                        const isUpcoming = daysUntil <= 3 && sub.status === 'active';
                        const isPaused = sub.status === 'paused';

                        return (
                            <div
                                key={sub.id}
                                className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all ${isPaused ? 'border-slate-300 bg-slate-50/50 opacity-75' :
                                    isUpcoming ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50' :
                                        'border-purple-200 hover:border-purple-300'
                                    }`}
                            >
                                <div
                                    onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                                    className="p-4 cursor-pointer active:bg-slate-50"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaused ? 'bg-slate-200' : 'bg-purple-100'
                                                    }`}>
                                                    <RefreshCw className={`w-4 h-4 ${isPaused ? 'text-slate-500' : 'text-purple-600'}`} />
                                                </div>
                                                <p className={`font-bold text-lg ${isPaused ? 'text-slate-600' : 'text-slate-900'}`}>
                                                    {customer?.name || 'Unknown'}
                                                </p>
                                                {isPaused && (
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-300 text-slate-700 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Paused
                                                    </span>
                                                )}
                                                {isUpcoming && !isPaused && (
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900 flex items-center gap-1 animate-pulse">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                                                <Phone className="w-3.5 h-3.5" />
                                                {customer?.phone || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-bold mb-1 ${isPaused ? 'text-slate-500' :
                                                isUpcoming ? 'text-amber-700' : 'text-purple-700'
                                                }`}>
                                                {isPaused ? 'Paused' : daysUntil === 0 ? 'Today!' : `${daysUntil} days`}
                                            </p>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isPaused ? 'bg-slate-100 border-slate-200' : 'bg-purple-50 border-purple-200'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            <Calendar className={`w-5 h-5 ${isPaused ? 'text-slate-500' : 'text-purple-600'}`} />
                                            <div>
                                                <p className={`text-xs font-bold ${isPaused ? 'text-slate-700' : 'text-purple-900'}`}>
                                                    {isPaused ? 'Subscription Paused' : 'Next Delivery'}
                                                </p>
                                                <p className={`text-sm font-semibold ${isPaused ? 'text-slate-600' : 'text-purple-700'}`}>
                                                    {isPaused ? 'No deliveries scheduled' : nextDate}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-bold ${isPaused ? 'text-slate-700' : 'text-purple-900'}`}>{sub.frequency}</p>
                                            <p className={`text-sm font-semibold ${isPaused ? 'text-slate-600' : 'text-purple-700'}`}>Every {sub.deliveryDate}th</p>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t-2 border-slate-100 p-4 space-y-4 bg-slate-50/50">
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                                            <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                Delivery Address
                                            </p>
                                            <p className="text-sm text-blue-800 font-medium leading-relaxed">{customer?.address || 'No address'}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Monthly Items</p>
                                            <div className="space-y-2">
                                                {sub.products.map((item, idx) => {
                                                    const product = PRODUCTS.find(p => p.id === item.productId);
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-3 rounded-xl border-2 border-slate-200 hover:border-purple-300 transition-all">
                                                            <span className="text-slate-700 flex items-center gap-2.5 font-medium">
                                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                                                    <Package className="w-4 h-4 text-purple-600" />
                                                                </div>
                                                                {product?.name || 'Unknown'} <span className="text-slate-400 font-bold">×{item.quantity}</span>
                                                            </span>
                                                            <span className="font-bold text-green-700 text-base">₹{(product?.price || 0) * item.quantity}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer?.address || '')}`, '_blank')}
                                                className="py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-200"
                                            >
                                                <Navigation className="w-4 h-4" />
                                                Navigate
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const phone = customer?.phone || '';
                                                    window.open(`tel:${phone}`, '_self');
                                                }}
                                                className="py-3.5 px-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-200"
                                            >
                                                <Phone className="w-4 h-4" />
                                                Call
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderProgress = () => (
        <div className="space-y-4 pb-6">
            {/* Performance Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                            Performance
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Your delivery statistics</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 rounded-xl border-2 border-green-200">
                        <Star className="w-5 h-5 text-green-600 fill-green-600" />
                        <span className="text-2xl font-bold text-green-700">{completionRate}%</span>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between text-sm font-bold mb-3">
                        <span className="text-slate-700">Completion Rate</span>
                        <span className="text-green-700">{completedOrders} / {totalOrders} orders</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 rounded-full transition-all duration-1000 shadow-lg"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Today</p>
                        </div>
                        <p className="text-3xl font-bold text-blue-900 mb-1">{todayOrders}</p>
                        <p className="text-sm text-blue-600 font-semibold">deliveries</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-xl border-2 border-purple-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Active Subs</p>
                        </div>
                        <p className="text-3xl font-bold text-purple-900 mb-1">{activeSubscriptions}</p>
                        <p className="text-sm text-purple-600 font-semibold">recurring</p>
                    </div>
                </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-600" />
                    Achievements
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base font-bold text-amber-900">Fast Delivery</p>
                            <p className="text-sm text-amber-700 font-semibold">{completedOrders} orders completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base font-bold text-green-900">Success Rate</p>
                            <p className="text-sm text-green-700 font-semibold">{completionRate}% completion</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <RefreshCw className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base font-bold text-purple-900">Subscription Pro</p>
                            <p className="text-sm text-purple-700 font-semibold">{activeSubscriptions} recurring customers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Summary */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border-2 border-slate-700">
                <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                    <Leaf className="w-6 h-6 text-green-400" />
                    This Month
                </h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-4xl font-bold mb-2">{completedOrders}</p>
                        <p className="text-sm text-slate-300 font-semibold">Completed Deliveries</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold mb-2 text-green-400">₹{totalRevenue.toLocaleString()}</p>
                        <p className="text-sm text-slate-300 font-semibold">Total Revenue</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="space-y-4 pb-6">
            {/* Order Type Tabs */}
            <div className="flex gap-3">
                <button
                    onClick={() => setOrderView('pending')}
                    className={`flex-1 py-4 px-5 rounded-xl font-bold text-sm transition-all shadow-sm ${orderView === 'pending'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                        : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-300'
                        }`}
                >
                    <Clock className="w-5 h-5 inline mr-2" />
                    Pending ({pendingOrders})
                </button>
                <button
                    onClick={() => setOrderView('completed')}
                    className={`flex-1 py-4 px-5 rounded-xl font-bold text-sm transition-all shadow-sm ${orderView === 'completed'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-200'
                        : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-green-300'
                        }`}
                >
                    <CheckCircle2 className="w-5 h-5 inline mr-2" />
                    Done ({completedOrders})
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search orders..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none text-sm font-medium transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-bold text-lg">No orders found</p>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your search</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map((order) => {
                        const customer = allUsers.find(u => u.id === order.userId);
                        const isExpanded = expandedOrder === order.id;

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all ${orderView === 'pending' ? 'border-amber-200 hover:border-amber-300' : 'border-green-200 hover:border-green-300'
                                    }`}
                            >
                                <div
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    className="p-4 cursor-pointer active:bg-slate-50"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orderView === 'pending' ? 'bg-amber-100' : 'bg-green-100'
                                                    }`}>
                                                    <Package className={`w-4 h-4 ${orderView === 'pending' ? 'text-amber-600' : 'text-green-600'}`} />
                                                </div>
                                                <p className="font-bold text-lg text-slate-900">{customer?.name || 'Unknown'}</p>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${orderView === 'pending'
                                                    ? 'bg-amber-200 text-amber-800'
                                                    : 'bg-green-200 text-green-800'
                                                    }`}>
                                                    #{order.id.slice(-4)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                                                <Phone className="w-3.5 h-3.5" />
                                                {customer?.phone || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-green-700 mb-1">₹{order.total}</p>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-200">
                                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-blue-800 font-medium line-clamp-1">{customer?.address || 'No address'}</p>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t-2 border-slate-100 p-4 space-y-4 bg-slate-50/50">
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                                            <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                Delivery Address
                                            </p>
                                            <p className="text-sm text-blue-800 font-medium leading-relaxed">{customer?.address}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Order Items</p>
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm bg-white p-3 rounded-xl border-2 border-slate-200">
                                                        <span className="text-slate-700 font-medium">
                                                            {item.product.name} <span className="text-slate-400 font-bold">×{item.quantity}</span>
                                                        </span>
                                                        <span className="font-bold text-green-700 text-base">₹{item.product.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm pt-3 border-t-2 border-slate-200 bg-white p-3 rounded-xl">
                                            <span className="text-slate-600 flex items-center gap-2 font-semibold">
                                                <DollarSign className="w-4 h-4" />
                                                {order.paymentMethod || 'COD'}
                                            </span>
                                            <span className="font-bold text-slate-900 text-base">Total: ₹{order.total}</span>
                                        </div>

                                        {orderView === 'pending' && (
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <button
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer?.address || '')}`, '_blank')}
                                                    className="py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-200"
                                                >
                                                    <Navigation className="w-4 h-4" />
                                                    Navigate
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                                    className="py-3.5 px-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-200"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Delivered
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderCOD = () => {
        const filteredSettlements = codView === 'pending'
            ? codStats.pendingSettlements
            : codStats.settledSettlements;

        return (
            <div className="space-y-4 pb-6">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900 mb-1">COD Cash Collection</p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Track cash collected from customers. Return pending amount: <span className="font-bold">₹{codStats.totalPending}</span>
                        </p>
                    </div>
                </div>

                {/* COD Type Tabs */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setCodeView('pending')}
                        className={`flex-1 py-4 px-5 rounded-xl font-bold text-sm transition-all shadow-sm ${codView === 'pending'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-300'
                            }`}
                    >
                        <IndianRupee className="w-5 h-5 inline mr-2" />
                        Pending ({codStats.pendingCount})
                    </button>
                    <button
                        onClick={() => setCodeView('settled')}
                        className={`flex-1 py-4 px-5 rounded-xl font-bold text-sm transition-all shadow-sm ${codView === 'settled'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-green-300'
                            }`}
                    >
                        <CheckCircle2 className="w-5 h-5 inline mr-2" />
                        Settled ({codStats.settledCount})
                    </button>
                </div>

                {/* Settlements List */}
                {filteredSettlements.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wallet className="w-10 h-10 text-amber-400" />
                        </div>
                        <p className="text-slate-600 font-bold text-lg">
                            {codView === 'pending' ? 'No pending settlements' : 'No settled payments'}
                        </p>
                        <p className="text-slate-500 text-sm mt-1">
                            {codView === 'pending' ? 'COD collections will appear here' : 'Settled payments history will appear here'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSettlements.map((settlement) => {
                            const order = orders.find(o => o.id === settlement.orderId);
                            const customer = order ? allUsers.find(u => u.id === order.userId) : null;
                            const collectedDate = new Date(settlement.collectedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            });
                            const settledDate = settlement.settledAt
                                ? new Date(settlement.settledAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })
                                : null;

                            return (
                                <div
                                    key={settlement.id}
                                    className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all ${codView === 'pending' ? 'border-amber-200' : 'border-green-200'
                                        }`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${codView === 'pending' ? 'bg-amber-100' : 'bg-green-100'
                                                        }`}>
                                                        <Wallet className={`w-4 h-4 ${codView === 'pending' ? 'text-amber-600' : 'text-green-600'}`} />
                                                    </div>
                                                    <p className="font-bold text-lg text-slate-900">{customer?.name || 'Unknown Customer'}</p>
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${codView === 'pending'
                                                        ? 'bg-amber-200 text-amber-800'
                                                        : 'bg-green-200 text-green-800'
                                                        }`}>
                                                        #{settlement.orderId.slice(-4)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Collected: {collectedDate}
                                                </p>
                                                {settledDate && (
                                                    <p className="text-sm text-green-600 flex items-center gap-1.5 font-medium mt-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Settled: {settledDate}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-bold mb-1 ${codView === 'pending' ? 'text-amber-700' : 'text-green-700'
                                                    }`}>
                                                    ₹{settlement.amount}
                                                </p>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${codView === 'pending'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {settlement.status}
                                                </span>
                                            </div>
                                        </div>

                                        {customer?.address && (
                                            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-200 mt-3">
                                                <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                                <p className="text-sm text-blue-800 font-medium line-clamp-1">{customer.address}</p>
                                            </div>
                                        )}

                                        {settlement.notes && (
                                            <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <p className="text-xs font-bold text-slate-600 mb-1">Notes:</p>
                                                <p className="text-sm text-slate-700">{settlement.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary Card */}
                {codView === 'pending' && codStats.totalPending > 0 && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-amber-100 mb-1">Total Cash to Return</p>
                                <p className="text-4xl font-bold">₹{codStats.totalPending}</p>
                                <p className="text-sm text-amber-100 mt-2">{codStats.pendingCount} pending settlement{codStats.pendingCount > 1 ? 's' : ''}</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Wallet className="w-8 h-8" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50">
            <main className="px-4 py-4 pb-24 max-w-4xl mx-auto">
                {renderProfile()}

                {/* Enhanced Main Tabs */}
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'orders'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-green-300'
                            }`}
                    >
                        <Truck className="w-5 h-5 inline mr-2" />
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('cod')}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all relative shadow-sm ${activeTab === 'cod'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-amber-300'
                            }`}
                    >
                        <Wallet className="w-5 h-5 inline mr-2" />
                        COD
                        {codStats.totalPending > 0 && (
                            <span className={`absolute -top-1 -right-1 px-2 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-lg ${activeTab === 'cod' ? 'bg-white text-amber-600' : 'bg-amber-600 text-white'
                                }`}>
                                ₹{codStats.totalPending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all relative shadow-sm ${activeTab === 'subscriptions'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-purple-300'
                            }`}
                    >
                        <RefreshCw className="w-5 h-5 inline mr-2" />
                        Subs
                        {activeSubscriptions > 0 && (
                            <span className={`absolute -top-1 -right-1 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-lg ${activeTab === 'subscriptions' ? 'bg-white text-purple-600' : 'bg-purple-600 text-white'
                                }`}>
                                {activeSubscriptions}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('progress')}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'progress'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-200'
                            : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-green-300'
                            }`}
                    >
                        <TrendingUp className="w-5 h-5 inline mr-2" />
                        Stats
                    </button>
                </div>

                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'cod' && renderCOD()}
                {activeTab === 'subscriptions' && renderSubscriptions()}
                {activeTab === 'progress' && renderProgress()}
            </main>

            {/* OTP Verification Modal */}
            {showOtpModal && selectedOrderForDelivery && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Verify Delivery OTP</h2>
                            <p className="text-sm text-slate-500 font-medium">
                                Enter the 4-digit OTP provided by the customer
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</span>
                                <span className="text-sm font-black text-slate-900">#{selectedOrderForDelivery.id.slice(-6)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</span>
                                <span className="text-lg font-black text-green-700">₹{selectedOrderForDelivery.total}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-3">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                maxLength={4}
                                value={otpInput}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setOtpInput(value);
                                    setOtpError('');
                                }}
                                placeholder="0000"
                                className={`w-full text-center text-3xl font-black tracking-[0.5em] px-6 py-4 rounded-2xl border-2 outline-none transition-all ${otpError
                                        ? 'border-red-300 bg-red-50 text-red-700'
                                        : 'border-slate-200 bg-white text-slate-900 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                    }`}
                                autoFocus
                            />
                            {otpError && (
                                <div className="mt-3 flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <p className="text-sm font-bold">{otpError}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowOtpModal(false);
                                    setSelectedOrderForDelivery(null);
                                    setOtpInput('');
                                    setOtpError('');
                                }}
                                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerifyOTP}
                                disabled={otpInput.length !== 4}
                                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${otpInput.length === 4
                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Verify & Deliver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryDashboard;
