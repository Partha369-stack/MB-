import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS, STARTER_PACK } from '../constants';

const ProductHub: React.FC = () => {
    const { view, setView, user, cart, setCart, orderHistory, activeSubscription } = useAppContext();
    const navigate = useNavigate();

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const starterPackInCart = cart.some(item => item.product.id === STARTER_PACK.id);

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing) {
                let newQty = Math.max(0, existing.quantity + delta);
                if (productId === STARTER_PACK.id && newQty > 1) {
                    newQty = 1; // Limit Starter Pack to 1 unit
                }
                if (newQty === 0) return prev.filter(i => i.product.id !== productId);
                return prev.map(item => item.product.id === productId ? { ...item, quantity: newQty } : item);
            }
            if (delta > 0) {
                const product = PRODUCTS.find(p => p.id === productId) || (productId === STARTER_PACK.id ? STARTER_PACK : null);
                if (product) return [...prev, { product, quantity: 1 }];
            }
            return prev;
        });
    };

    const hasReceivedStarterPack = orderHistory.some(order => 
        ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered'].includes(order.status) && 
        order.items.some(item => item.product.id === STARTER_PACK.id)
    );

    return (
        <div className="bg-[#f6f8f6] font-display text-slate-900 min-h-screen flex flex-col selection:bg-[#2bee2b]/20">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center bg-white/95 backdrop-blur-sm p-4 border-b border-[#2bee2b]/10 justify-between">
                <button className="flex w-10 h-10 shrink-0 items-center justify-center">
                    <span className="material-symbols-outlined text-slate-700">menu</span>
                </button>
                <h1 className="text-xl font-bold leading-tight tracking-tight flex-1 text-center text-slate-900">
                    Mother Best
                </h1>
                <div className="flex w-10 h-10 items-center justify-end relative">
                    <button 
                        onClick={() => setView('CHECKOUT')}
                        className="flex cursor-pointer items-center justify-center rounded-full w-10 h-10 bg-[#2bee2b]/10 text-slate-900 transition-colors"
                    >
                        <span className="material-symbols-outlined">shopping_cart</span>
                    </button>
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2bee2b] text-[10px] font-bold text-slate-900 border-2 border-white">
                            {cartCount}
                        </span>
                    )}
                </div>
            </header>

            <main className="flex-1 pb-40">
                {/* Premium Membership - Stitch Design Match */}
                <div className="px-4 pt-4 pb-6">
                    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                        {/* Hero Image */}
                        <div 
                            className="w-full h-44 bg-center bg-cover" 
                            style={{ backgroundImage: `url("${STARTER_PACK.imageUrl}")` }}
                        ></div>
                        
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-slate-900 text-lg font-black tracking-tight">Premium Membership</h3>
                                    <span className="bg-[#2bee2b]/20 text-[#2bee2b] text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest leading-none">Pro</span>
                                </div>
                                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                    Unlock exclusive benefits and discounts on every order.
                                </p>
                            </div>
                            
                            {activeSubscription ? (
                                <button 
                                    onClick={() => setView('MANAGE_SUBSCRIPTION')}
                                    className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">settings</span>
                                    Manage Subscription
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setView('CHOOSE_PLAN_ITEMS')}
                                    className="w-full bg-[#2bee2b] text-slate-900 font-extrabold py-3.5 rounded-2xl shadow-lg shadow-[#2bee2b]/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                    Join Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Products List Title Card */}
                <div className="px-4 flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Our Products</h2>
                    <button className="text-[#2bee2b] text-xs font-black uppercase tracking-widest hover:brightness-90">See All</button>
                </div>

                <div className="px-4 space-y-3">
                    {PRODUCTS.map((product) => {
                        const cartItem = cart.find(i => i.product.id === product.id);
                        return (
                            <div key={product.id} className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-50">
                                <div className="w-16 h-16 shrink-0 rounded-full bg-[#f1f8f1] flex items-center justify-center overflow-hidden border border-[#2bee2b]/5">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover scale-110" />
                                    ) : (
                                        <span className="material-symbols-outlined text-[#2bee2b] text-2xl">cleaning_services</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                                    <p className="text-[#2bee2b] font-black text-xs">₹{product.price}<span className="text-[10px] text-slate-400 font-bold uppercase ml-0.5">/{product.unit}</span></p>
                                </div>
                                
                                {cartItem ? (
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1 border border-slate-200">
                                        <button 
                                            onClick={() => updateCartQuantity(product.id, -1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-500 hover:text-red-500 transition-colors shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-sm font-black">remove</span>
                                        </button>
                                        <span className="font-black text-slate-900 text-xs w-4 text-center">{cartItem.quantity}</span>
                                        <button 
                                            onClick={() => updateCartQuantity(product.id, 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2bee2b] text-slate-900 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-sm font-black">add</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => updateCartQuantity(product.id, 1)}
                                        className="px-5 py-2 bg-slate-50 text-slate-900 hover:bg-[#2bee2b] hover:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-slate-100"
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Fixed Bottom Summary & Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                {/* Summary Bar - Dark Navy Theme */}
                {cartCount > 0 && (
                    <div className="px-5 py-4 bg-[#0a0f1a] flex items-center justify-between mx-4 mb-2 rounded-[2rem] shadow-2xl border border-white/5 animate-fade-in-up">
                        <div className="flex flex-col">
                            <span className="text-white text-base font-black tracking-tight">{cartCount} items • ₹{total}</span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Taxes & delivery extra</span>
                        </div>
                        <button 
                            onClick={() => setView('CHECKOUT')}
                            className="flex items-center gap-2 bg-[#2bee2b] text-slate-900 font-black px-6 py-2.5 rounded-full hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#2bee2b]/20"
                        >
                            <span className="text-xs uppercase tracking-widest">Checkout</span>
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                )}
                
                {/* Navigation Bar */}
                <nav className="bg-white border-t border-slate-100 flex items-center justify-around py-2 px-4 pb-6">
                    <button onClick={() => { setView('LANDING'); navigate('/'); }} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                        <span className="material-symbols-outlined">home</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                    </button>
                    <button onClick={() => setView('CHOOSE_PLAN_ITEMS')} className={`flex flex-col items-center gap-1 ${view === 'CHOOSE_PLAN_ITEMS' ? 'text-[#2bee2b]' : 'text-slate-400 hover:text-[#2bee2b]'} transition-colors`}>
                        <span className="material-symbols-outlined" style={view === 'CHOOSE_PLAN_ITEMS' ? { fontVariationSettings: "'FILL' 1" } : {}}>check_box</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Plans</span>
                    </button>
                    <button onClick={() => setView('ORDER_HISTORY')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                        <span className="material-symbols-outlined">receipt_long</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
                    </button>
                    <button onClick={() => setView('PROFILE')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#2bee2b] hover:opacity-80 transition-colors">
                        <span className="material-symbols-outlined">person</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default ProductHub;

