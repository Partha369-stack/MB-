import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS } from '../constants';
import { ArrowLeft, Plus, Minus } from 'lucide-react';

const ChoosePlanItems: React.FC = () => {
    const { setView, planDraft, setPlanDraft } = useAppContext();

    const updateQuantity = (productId: string, delta: number) => {
        setPlanDraft({
            ...planDraft,
            [productId]: Math.max(0, (planDraft[productId] || 0) + delta)
        });
        // Clean up zero quantities
        if ((planDraft[productId] || 0) + delta <= 0) {
            const { [productId]: _, ...rest } = planDraft;
            setPlanDraft(rest);
        }
    };

    const hasItems = Object.keys(planDraft).length > 0;

    const handleBack = () => {
        setView('PRODUCT_HUB');
    };

    const handleNext = () => {
        // Here we could pass the selectedItems to the next view via state or context
        setView('AUTO_DELIVERY_FLOW');
    };

    return (
        <div className="bg-[#f6f8f6] min-h-screen pb-40 font-sans selection:bg-green-100">
            {/* Header matches Final Stitch Screenshot */}
            <header className="bg-white/95 backdrop-blur-sm px-6 py-5 sticky top-0 z-50 border-b border-slate-100 flex items-center justify-between">
                <button 
                    onClick={handleBack}
                    className="text-slate-900 active:scale-90 transition-all hover:opacity-70"
                >
                    <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
                </button>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">MOTHER BEST</h1>
                <div className="w-6" /> {/* Spacer for centering */}
            </header>

            <main className="px-6 py-10 max-w-xl mx-auto relative">
                <div className="mb-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#22C55E] mb-2">CHOOSEPLANITEMS</p>
                    <h2 className="text-[2rem] font-bold text-slate-900 leading-[1.1] tracking-tight mb-3">
                        Mother Best Pure & Simple
                    </h2>
                    <p className="text-slate-500 font-medium text-base opacity-70">
                        Select items for your regular monthly shipment.
                    </p>
                </div>

                {/* Product List matching Final Screenshot with Quantity */}
                <div className="space-y-4">
                    {PRODUCTS.map((product) => {
                        const qty = planDraft[product.id] || 0;
                        return (
                            <div 
                                key={product.id}
                                className="bg-white rounded-[2rem] p-4 flex items-center justify-between shadow-sm border border-slate-50 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Light Mint Background for Icon */}
                                    <div className="w-16 h-16 rounded-[1.2rem] bg-[#e8f6e9] flex items-center justify-center overflow-hidden shrink-0">
                                        <img 
                                            src={product.imageUrl || '/logo.jpg'} 
                                            className="w-[70%] h-[70%] object-contain group-hover:scale-110 transition-transform duration-500" 
                                            alt={product.name}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                                        <p className="text-slate-400 font-bold text-[11px] mt-0.5">
                                            ₹{product.price}/kg
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity Control / Add Button */}
                                <div className="flex items-center gap-3">
                                    {qty > 0 ? (
                                        <div className="flex items-center gap-3 bg-[#e8f6e9]/50 rounded-xl p-1 border border-[#22C55E]/10 animate-scale-in">
                                            <button 
                                                onClick={() => updateQuantity(product.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-red-500 shadow-sm transition-colors active:scale-90"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-black text-slate-900 text-sm w-4 text-center">{qty}</span>
                                            <button 
                                                onClick={() => updateQuantity(product.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#22C55E] text-slate-900 shadow-sm active:scale-90 transition-transform"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => updateQuantity(product.id, 1)}
                                            className="px-6 py-2 rounded-xl font-black text-[11px] bg-[#22C55E] text-slate-900 shadow-lg shadow-[#22C55E]/10 active:scale-95 transition-all"
                                        >
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pick Schedule Floating Button - Centered */}
                {hasItems && (
                    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up whitespace-nowrap">
                        <button 
                            onClick={handleNext}
                            className="flex items-center gap-2 bg-[#22C55E] text-slate-900 font-black px-6 py-4 rounded-2xl shadow-xl shadow-[#22C55E]/20 active:scale-95 transition-all text-sm"
                        >
                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                            Pick Schedule
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Nav matches Final Stitch design */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around py-4 pb-8 px-6 z-50">
                <button onClick={() => setView('LANDING')} className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-2xl">home</span>
                    <span className="text-[10px] font-bold text-slate-400">Home</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 text-[#22C55E]">
                    <span className="material-symbols-outlined text-2xl filled">package_2</span>
                    <span className="text-[10px] font-bold text-[#22C55E]">Plans</span>
                </button>
                <button onClick={() => setView('ORDER_HISTORY')} className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-2xl">receipt_long</span>
                    <span className="text-[10px] font-bold text-slate-400">Orders</span>
                </button>
                <button onClick={() => setView('PROFILE')} className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-2xl">person</span>
                    <span className="text-[10px] font-bold text-slate-400">Profile</span>
                </button>
            </nav>
        </div>
    );
};

export default ChoosePlanItems;
