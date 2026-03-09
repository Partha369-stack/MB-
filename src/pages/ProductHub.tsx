import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS, STARTER_PACK } from '../constants';

const ProductHub: React.FC = () => {
    const { view, setView, user, cart, setCart, orderHistory } = useAppContext();
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
                {/* Limited Offer Hero */}
                {!hasReceivedStarterPack && (
                    <div className="p-4">
                        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm border border-[#2bee2b]/10">
                            <div 
                                className="w-full h-48 bg-center bg-cover" 
                                style={{ backgroundImage: `url("${STARTER_PACK.imageUrl}")` }}
                            ></div>
                            <div className="flex flex-col p-4 gap-2">
                                <span className="text-[#2bee2b] font-bold text-xs uppercase tracking-wider">Limited Offer</span>
                                <h2 className="text-lg font-bold text-slate-900">First Order Gift Box</h2>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-slate-900">₹{STARTER_PACK.price}</span>
                                        <span className="text-sm text-slate-400 line-through">Original ₹499</span>
                                    </div>
                                    {starterPackInCart ? (
                                        <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-100">
                                            <button 
                                                onClick={() => updateCartQuantity(STARTER_PACK.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:text-red-500"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                            <span className="font-bold text-slate-900 w-4 text-center">1</span>
                                            <button 
                                                disabled
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-400 shadow-sm opacity-50 cursor-not-allowed"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => updateCartQuantity(STARTER_PACK.id, 1)}
                                            className="bg-[#2bee2b] hover:bg-[#2bee2b]/90 text-slate-900 font-bold py-2 px-6 rounded-full text-sm transition-colors"
                                        >
                                            Add to Basket
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Premium Membership */}
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-[#2bee2b] bg-[#2bee2b]/5 p-5">
                        <div className="flex flex-col gap-1">
                            <p className="text-slate-900 text-base font-bold">Premium Membership</p>
                            <p className="text-slate-600 text-sm">Unlock exclusive benefits and discounts</p>
                        </div>
                        <button 
                            onClick={() => setView('AUTO_DELIVERY_FLOW')}
                            className="bg-[#2bee2b] text-slate-900 font-bold py-2 px-4 rounded-full text-sm whitespace-nowrap shadow-sm hover:brightness-95 transition-all"
                        >
                            Join Now
                        </button>
                    </div>
                </div>

                {/* Products List */}
                <div className="px-4">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Our Products</h2>
                    <div className="space-y-4">
                        {PRODUCTS.map((product) => {
                            const cartItem = cart.find(i => i.product.id === product.id);
                            return (
                                <div key={product.id} className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                    <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-400">inventory_2</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900">{product.name}</h3>
                                        <p className="text-[#2bee2b] font-bold">₹{product.price}<span className="text-xs text-slate-400 font-normal">/{product.unit}</span></p>
                                    </div>
                                    
                                    {cartItem ? (
                                        <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-100">
                                            <button 
                                                onClick={() => updateCartQuantity(product.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:text-red-500"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                            <span className="font-bold text-slate-900 w-4 text-center">{cartItem.quantity}</span>
                                            <button 
                                                onClick={() => updateCartQuantity(product.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2bee2b] text-slate-900 shadow-sm transition-colors hover:brightness-95"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => updateCartQuantity(product.id, 1)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2bee2b]/10 text-[#2bee2b] shadow-sm hover:bg-[#2bee2b]/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Fixed Bottom Summary & Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                {/* Summary Bar */}
                {cartCount > 0 && (
                    <div className="px-4 py-3 bg-[#102210] flex items-center justify-between mx-4 mb-2 rounded-xl shadow-lg border border-white/10 animate-fade-in-up">
                        <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">{cartCount} items • ₹{total}</span>
                            <span className="text-[#2bee2b] text-[10px] font-bold">Taxes & delivery extra</span>
                        </div>
                        <button 
                            onClick={() => setView('CHECKOUT')}
                            className="flex items-center gap-2 bg-[#2bee2b] text-slate-900 font-bold px-6 py-2 rounded-full hover:brightness-95 transition-all"
                        >
                            <span>Checkout</span>
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
                    <button onClick={() => setView('PRODUCT_HUB')} className="flex flex-col items-center gap-1 text-[#2bee2b]">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Shop</span>
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

