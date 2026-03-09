
import React from 'react';
import { Product, CartItem } from '../types';
import { STARTER_PACK } from '../constants';

interface ShopMobileProps {
    products: Product[];
    cart: CartItem[];
    onAddToCart: (product: Product) => void;
    onRemoveFromCart: (productId: string) => void;
    onCheckout: () => void;
    activeSubscription: any;
    onJoinPremium: () => void;
}

const ShopMobile: React.FC<ShopMobileProps> = ({
    products,
    cart,
    onAddToCart,
    onRemoveFromCart,
    onCheckout,
    activeSubscription,
    onJoinPremium
}) => {
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalCart = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    // Check if starter pack is in cart or has been ordered
    const isStarterPackInCart = cart.some(item => item.product.id === 'STARTER-PACK');

    return (
        <div className="flex flex-col bg-[#F9FAFB] min-h-screen pb-60 font-sans overflow-x-hidden">
            <style>{`
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                .material-symbols-outlined.filled {
                    font-variation-settings: 'FILL' 1;
                }
            `}</style>
            {/* Top Navigation */}
            <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-50 border-b border-slate-100">
                <button className="p-2">
                    <span className="material-symbols-outlined text-slate-900 text-2xl">menu</span>
                </button>
                <h1 className="text-lg font-bold text-slate-900">Mother Best Shop</h1>
                <button className="p-2 relative" onClick={onCheckout}>
                    <span className="material-symbols-outlined text-slate-900 text-2xl">shopping_cart</span>
                    {cartCount > 0 && (
                        <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Hero Section - First Order Gift Box */}
            <div className="px-4 pt-4">
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-50">
                    <div className="relative aspect-[16/9] w-full">
                        <img
                            src="/first_order_gift_box.png"
                            alt="First Order Gift Box"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4">
                            <span className="bg-[#22C55E] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                LIMITED OFFER
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-[#22C55E] text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                            SPECIAL WELCOME OFFER
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">First Order Gift Box</h2>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-slate-900">₹{STARTER_PACK.price}</span>
                                <span className="text-xs text-slate-400 line-through">Original Price ₹499</span>
                            </div>
                            <button
                                onClick={() => onAddToCart(STARTER_PACK)}
                                className="bg-[#22C55E] text-white font-black px-8 py-3 rounded-full shadow-lg shadow-green-100 uppercase tracking-widest text-xs active:scale-95 transition-all"
                            >
                                Add to Basket
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Membership Banner */}
            <div className="px-4 pt-6">
                <div className="bg-[#F0FDF4] rounded-[2rem] p-6 relative overflow-hidden border border-green-100/50">
                    {/* Background faint checkmark */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none translate-x-1/4">
                        <span className="material-symbols-outlined text-[10rem] font-black">check_circle</span>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-lg filled ${activeSubscription?.status === 'paused' ? 'text-amber-500' : 'text-[#22C55E]'}`}>
                                {activeSubscription?.status === 'paused' ? 'pause_circle' : 'crown'}
                            </span>
                            <h3 className="font-bold text-slate-900 text-base">
                                {activeSubscription
                                    ? (activeSubscription.status === 'paused' ? 'Membership Paused' : 'Your Premium Membership')
                                    : 'Premium Membership'}
                            </h3>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                            {activeSubscription
                                ? (activeSubscription.status === 'paused'
                                    ? 'Your routine is currently on hold. Resume anytime to continue saving 40%.'
                                    : 'You are saving 40% on every order! Your next delivery is scheduled soon.')
                                : 'Join now and save 40% on every order! Get early access to new products.'}
                        </p>
                        <button
                            onClick={onJoinPremium}
                            className={`font-black px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg ${activeSubscription
                                    ? (activeSubscription.status === 'paused'
                                        ? 'bg-amber-500 text-white shadow-amber-100'
                                        : 'bg-[#22C55E] text-white shadow-green-100')
                                    : 'bg-black text-white shadow-slate-200'
                                }`}
                        >
                            {activeSubscription
                                ? (activeSubscription.status === 'paused' ? 'Manage & Resume' : 'View My Routine')
                                : 'Join Now'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Section */}
            <div className="px-4 pt-10 pb-4">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Our Products</h3>
                <div className="grid grid-cols-2 gap-4">
                    {products.map((product) => {
                        const cartItem = cart.find(c => c.product.id === product.id);
                        const qty = cartItem?.quantity ?? 0;

                        return (
                            <div
                                key={product.id}
                                className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-50 flex flex-col active:scale-[0.98] transition-all"
                            >
                                {/* Product Image */}
                                <div className="relative w-full aspect-square bg-[#F8FDF9]">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#22C55E] text-5xl">
                                                {getProductIcon(product.id)}
                                            </span>
                                        </div>
                                    )}
                                    {/* In-cart badge */}
                                    {qty > 0 && (
                                        <div className="absolute top-2 right-2 bg-[#22C55E] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                                            {qty}
                                        </div>
                                    )}
                                </div>

                                {/* Info + Controls */}
                                <div className="p-3 flex flex-col gap-2">
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm leading-tight truncate">{product.name}</h4>
                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">₹{product.price} / {product.unit}</p>
                                    </div>

                                    {qty === 0 ? (
                                        /* ADD button */
                                        <button
                                            onClick={() => onAddToCart(product)}
                                            className="w-full bg-[#22C55E] text-white font-black py-2.5 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-green-100 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">add</span>
                                            Add
                                        </button>
                                    ) : (
                                        /* +/- stepper */
                                        <div className="flex items-center justify-between bg-[#F0FDF4] rounded-2xl p-1 border border-green-100">
                                            <button
                                                onClick={() => onRemoveFromCart(product.id)}
                                                className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#22C55E] font-black active:scale-90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">remove</span>
                                            </button>
                                            <span className="text-base font-black text-slate-900 w-6 text-center">{qty}</span>
                                            <button
                                                onClick={() => onAddToCart(product)}
                                                className="w-9 h-9 bg-[#22C55E] rounded-xl flex items-center justify-center shadow-sm text-white font-black active:scale-90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">add</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action Bar if cart has items */}
            {cartCount > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50">
                    <button
                        onClick={onCheckout}
                        className="w-full bg-[#22C55E] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex flex-col items-start px-2">
                            <span className="text-[10px] font-black uppercase text-green-100 tracking-widest">{cartCount} Items</span>
                            <span className="text-xl font-black">₹{totalCart}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                            <span className="font-black uppercase text-sm tracking-widest">Checkout</span>
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

const getProductIcon = (productId: string) => {
    switch (productId) {
        case '1': return 'eco'; // Detergent
        case '2': return 'cleaning_services'; // Dishwash
        case '3': return 'soap'; // Handwash
        case '4': return 'wash'; // Toilet Cleaner
        case '5': return 'water_drop'; // White Phenyl
        default: return 'package_2';
    }
};

export default ShopMobile;
