import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS } from '../constants';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { ArrowLeft, Settings, Calendar, History, TrendingUp, Edit2, Play, Pause, Trash2 } from 'lucide-react';

const ManageSubscriptionPage: React.FC = () => {
    const { user, setUser, activeSubscription, setActiveSubscription, setView, orderHistory, setPlanDraft, setPlanDeliveryDate } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setView('LANDING');
        navigate('/');
    };

    const handleBack = () => {
        setView('PRODUCT_HUB');
    };

    const subscriptionDetails = useMemo(() => {
        if (!activeSubscription) return null;

        let total = 0;
        const items = activeSubscription.products.map(p => {
            const product = PRODUCTS.find(prod => prod.id === p.productId);
            const subtotal = (product?.price || 0) * p.quantity;
            total += subtotal;
            return {
                ...product,
                quantity: p.quantity,
                subtotal
            };
        });

        // Calculate Successful Deliveries
        const successfulCount = orderHistory.filter(o => 
            o.subscriptionId === activeSubscription.id && o.status === 'delivered'
        ).length;

        // Calculate next delivery date
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const deliveryDay = activeSubscription.deliveryDate;
        
        let nextDate = new Date(currentYear, currentMonth, deliveryDay);
        if (today.getDate() >= deliveryDay) {
            nextDate = new Date(currentYear, currentMonth + 1, deliveryDay);
        }

        // Running since calculation
        const createdDate = new Date(activeSubscription.createdAt);
        const monthsRunning = Math.max(1, (today.getFullYear() - createdDate.getFullYear()) * 12 + (today.getMonth() - createdDate.getMonth()));

        return { items, total, successfulCount, nextDate, monthsRunning };
    }, [activeSubscription, orderHistory]);

    if (!activeSubscription || !subscriptionDetails) return null;

    const handleEdit = () => {
        // Prepare draft for editing
        const draft: { [key: string]: number } = {};
        activeSubscription.products.forEach(p => {
            draft[p.productId] = p.quantity;
        });
        setPlanDraft(draft);
        setPlanDeliveryDate(activeSubscription.deliveryDate);
        setView('CHOOSE_PLAN_ITEMS');
    };

    return (
        <div className="bg-[#f6f8f6] min-h-screen pb-32 font-sans selection:bg-green-100">
            {/* Header */}
            <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100 shadow-sm">
                <div className="px-6 py-5 flex items-center justify-between">
                    <button onClick={handleBack} className="text-slate-900 active:scale-90 transition-all">
                        <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
                    </button>
                    <h1 className="text-base font-black text-slate-900 tracking-tight">My Membership</h1>
                    <div className="w-6" />
                </div>
            </header>

            <main className="px-6 py-8 max-w-xl mx-auto space-y-6">
                {/* Membership Summary Card */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Pro</h2>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${activeSubscription.status === 'active' ? 'bg-green-100 text-[#22C55E]' : 'bg-amber-100 text-amber-600'}`}>
                                {activeSubscription.status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Premium Household Plan</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-6 border-y border-slate-50">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Next Delivery</p>
                            <p className="text-sm font-black text-slate-900">
                                {subscriptionDetails.nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                        <div className="space-y-1 px-4 border-x border-slate-50">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Months Run</p>
                            <p className="text-sm font-black text-slate-900">{subscriptionDetails.monthsRunning} Month</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Success</p>
                            <p className="text-sm font-black text-slate-900">{subscriptionDetails.successfulCount} Deliv.</p>
                        </div>
                    </div>
                </section>

                {/* Items in Plan */}
                <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Items in Plan</h3>
                    <div className="space-y-6">
                        {subscriptionDetails.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-[#f1f8f1] overflow-hidden flex items-center justify-center shrink-0">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover scale-110" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                            ₹{item.price} x {item.quantity}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-black text-slate-900 text-sm">₹{item.subtotal}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Subtotal</span>
                        <span className="text-xl font-black text-[#22C55E]">₹{subscriptionDetails.total}</span>
                    </div>
                </section>

                {/* Controls */}
                <section className="space-y-3">
                    <div className="flex gap-3">
                        <button 
                            onClick={async () => {
                                const newStatus = activeSubscription.status === 'active' ? 'paused' as const : 'active' as const;
                                await storageService.updateSubscription({ id: activeSubscription.id, status: newStatus });
                                setActiveSubscription({ ...activeSubscription, status: newStatus });
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-[1.25rem] font-black text-sm transition-all active:scale-95 ${
                                activeSubscription.status === 'active' 
                                ? 'bg-slate-100 text-slate-600' 
                                : 'bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20'
                            }`}
                        >
                            {activeSubscription.status === 'active' ? (
                                <><Pause className="w-4 h-4 fill-current" /> Pause Plan</>
                            ) : (
                                <><Play className="w-4 h-4 fill-current" /> Resume Plan</>
                            )}
                        </button>
                        <button 
                            onClick={handleEdit}
                            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-[1.25rem] bg-white border border-slate-100 font-black text-sm text-slate-900 transition-all active:scale-95"
                        >
                            <Edit2 className="w-4 h-4 text-[#22C55E]" />
                            Edit Items
                        </button>
                    </div>

                    <button 
                        onClick={async () => {
                            if (window.confirm('Are you sure? This will end your membership benefits.')) {
                                await storageService.deleteSubscription(activeSubscription.id);
                                setActiveSubscription(null);
                                setView('PRODUCT_HUB');
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 h-14 rounded-[1.25rem] bg-red-50 text-red-500 font-black text-sm transition-all active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" />
                        Cancel Membership
                    </button>
                </section>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around py-3 px-6 pb-8 z-50">
                <button onClick={() => setView('PRODUCT_HUB')} className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                </button>
                <button onClick={() => setView('ORDER_HISTORY')} className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">receipt_long</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-[#22C55E]">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Membership</span>
                </button>
                <button onClick={() => setView('PROFILE')} className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">person</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default ManageSubscriptionPage;

