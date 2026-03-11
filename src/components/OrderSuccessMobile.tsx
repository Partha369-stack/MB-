import React from 'react';
import { Order } from '../types';

interface OrderSuccessMobileProps {
    order: Order | null;
    onContinue: () => void;
    onBack: () => void;
}

const OrderSuccessMobile: React.FC<OrderSuccessMobileProps> = ({
    order,
    onContinue,
    onBack
}) => {
    // Derived states based on actual order or default fallbacks
    const totalAmount = order?.total || 704;
    const itemCount = order?.items?.reduce((acc, item) => acc + item.quantity, 0) || 6;
    const paymentMethod = (order?.paymentMethod === 'Online' || (order as any)?.paymentMethod === 'ONLINE') ? 'Online Payment' : 'Cash on Delivery';
    const deliveryOTP = order?.deliveryOTP || '1477';
    const orderId = order?.id || 'MB829141';

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f8f6] text-slate-900 overflow-x-hidden font-display">
            {/* Top Bar */}
            <div className="flex items-center bg-[#f6f8f6] p-4 pb-2 justify-between">
                <button 
                    onClick={onBack} 
                    className="text-slate-900 flex size-12 shrink-0 items-center justify-center rounded-full bg-white/50 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-slate-900">arrow_back</span>
                </button>
                <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
                    Order Success
                </h2>
            </div>

            {/* Success Illustration/Icon Area */}
            <div className="@container">
                <div className="@[480px]:px-4 @[480px]:py-3">
                    <div className="w-full flex flex-col items-center justify-center bg-[#2bee2b]/10 @[480px]:rounded-xl min-h-[260px] relative overflow-hidden">
                        {/* Abstract Decorative Gradients */}
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#2bee2b] via-transparent to-[#2bee2b]"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="size-24 rounded-full bg-[#2bee2b] flex items-center justify-center text-[#102210] mb-6 shadow-lg shadow-[#2bee2b]/40">
                                <span className="material-symbols-outlined !text-5xl">check_circle</span>
                            </div>
                            <h2 className="text-slate-900 tracking-light text-[28px] font-bold leading-tight px-4 text-center">
                                Order Placed Successfully!
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
                {/* Order Summary Text */}
                <p className="text-slate-600 text-base font-normal leading-normal text-center">
                    Your order for <span className="font-bold text-slate-900">₹{totalAmount} ({itemCount} items)</span> has been confirmed via <span className="text-[#2bee2b] font-semibold">{paymentMethod}</span>.
                </p>

                {/* OTP Display Card */}
                <div className="bg-white rounded-xl p-6 border-2 border-[#2bee2b]/20 flex flex-col items-center shadow-sm">
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Delivery OTP</p>
                    <div className="text-4xl font-bold tracking-[0.2em] text-slate-900">
                        {deliveryOTP}
                    </div>
                </div>

                {/* Order Details List */}
                <div className="bg-white rounded-xl overflow-hidden border border-[#2bee2b]/10 hover:border-[#2bee2b]/30 transition-colors">
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between gap-x-6 py-1 border-b border-slate-100 pb-3">
                            <p className="text-slate-500 text-sm font-medium">Order ID</p>
                            <p className="text-slate-900 text-sm font-bold text-right">{orderId.toUpperCase()}</p>
                        </div>
                        <div className="flex justify-between gap-x-6 py-1 border-b border-slate-100 pb-3">
                            <p className="text-slate-500 text-sm font-medium">Payment Method</p>
                            <p className="text-slate-900 text-sm font-bold text-right">{paymentMethod}</p>
                        </div>
                        <div className="flex justify-between gap-x-6 py-1">
                            <p className="text-slate-500 text-sm font-medium">Status</p>
                            <div className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-[#2bee2b] animate-pulse"></span>
                                <p className="text-[#2bee2b] text-sm font-bold text-right uppercase tracking-wide">Confirmed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions Box */}
                <div className="flex gap-3 bg-[#2bee2b]/5 p-4 rounded-xl border border-[#2bee2b]/10">
                    <span className="material-symbols-outlined text-[#2bee2b] shrink-0">info</span>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Our team will call you shortly to confirm the details. <span className="font-semibold text-slate-900">Share this OTP with the delivery person</span> when your order arrives.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 pb-8 flex flex-col gap-3">
                    <button 
                        onClick={onContinue}
                        className="w-full bg-[#2bee2b] hover:bg-[#2bee2b]/90 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-[#2bee2b]/20 transition-all active:scale-[0.98]"
                    >
                        Return to Home
                    </button>
                    <button 
                        className="w-full bg-transparent border border-[#2bee2b] text-[#2bee2b] font-semibold py-3 rounded-xl hover:bg-[#2bee2b]/5 transition-all"
                    >
                        Track Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessMobile;
