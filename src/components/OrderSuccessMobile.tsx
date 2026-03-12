import React from 'react';
import { Order } from '../types';
import { ArrowLeft, Check } from 'lucide-react';

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
    // If order is not loaded yet, show a clean loading state
    if (!order) {
        return (
            <div className="min-h-screen bg-[#f6f8f6] flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-16 h-16 border-4 border-[#2bee2b] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Finalizing Order...</p>
            </div>
        );
    }

    const totalAmount = order.total;
    const items = order.items || [];
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const paymentMethod = order.paymentMethod === 'Online' ? 'Online Payment' : 'Cash on Delivery';
    const isSubscription = !!order.subscriptionId;

    // --- SUBSCRIPTION SUCCESS VIEW ---
    if (isSubscription) {
        return (
            <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f8f6] text-slate-900 overflow-x-hidden font-sans">
                {/* Header */}
                <div className="flex items-center bg-[#f6f8f6] p-6 pb-2">
                    <button onClick={onBack} className="text-slate-900 bg-white p-2 rounded-full shadow-sm active:scale-90 transition-all">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="flex-1 text-center pr-10 text-base font-black text-slate-800 uppercase tracking-tight">Success</h2>
                </div>

                {/* Celebration Area */}
                <div className="px-6 py-8">
                    <div className="bg-white rounded-[3rem] p-10 flex flex-col items-center justify-center shadow-sm border border-slate-100 relative overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-full h-2 bg-purple-600" />
                        <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center mb-6">
                            <Check className="w-12 h-12 text-purple-600 stroke-[3px]" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">
                            {order.notes?.includes('Updated') ? 'Subscription Updated Successfully!' : 'Subscription Placed Successfully!'}
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            {order.notes?.includes('Updated') ? 'Your membership details have been updated' : 'Your monthly membership is now active'}
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <div className="px-6 space-y-6 pb-24 max-w-lg mx-auto w-full">
                    {/* Next Delivery Card */}
                    <div className="bg-white rounded-[2rem] p-8 border-2 border-purple-100/50 shadow-sm flex flex-col items-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">First Scheduled Delivery</p>
                        <div className="text-2xl font-black text-slate-900 uppercase">
                            {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                        </div>
                        <p className="mt-4 text-[10px] font-bold text-slate-400 text-center uppercase leading-relaxed">
                            No OTP required for your first delivery
                        </p>
                    </div>

                    {/* Simple Subtotal */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Plan Details</h3>
                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-900 text-sm font-bold truncate max-w-[200px]">{item.product.name}</span>
                                        <span className="text-slate-400 text-xs font-bold">x{item.quantity}</span>
                                    </div>
                                    <p className="text-slate-900 text-sm font-black">₹{item.product.price * item.quantity}</p>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 mt-2 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Plan Total</span>
                            <span className="text-2xl font-black text-purple-600">₹{totalAmount}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button 
                        onClick={onContinue}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]"
                    >
                        Go to Membership
                    </button>
                </div>
            </div>
        );
    }

    // --- REGULAR ORDER SUCCESS VIEW ---
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f8f6] text-slate-900 overflow-x-hidden font-display">
            {/* Top Bar */}
            <div className="flex items-center bg-[#f6f8f6] p-4 pb-2 justify-between">
                <button 
                    onClick={onBack} 
                    className="text-slate-900 flex size-12 shrink-0 items-center justify-center rounded-full bg-white active:scale-95 transition-all shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
                    Orders
                </h2>
            </div>

            {/* Success Illustration/Icon Area */}
            <div className="@container">
                <div className="@[480px]:px-4 @[480px]:py-3">
                    <div className="w-full flex flex-col items-center justify-center bg-[#2bee2b]/10 @[480px]:rounded-xl min-h-[260px] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#2bee2b] via-transparent to-[#2bee2b]"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="size-24 rounded-full bg-[#2bee2b] flex items-center justify-center text-[#102210] mb-6 shadow-lg shadow-[#2bee2b]/40">
                                <Check className="w-12 h-12 stroke-[3px]" />
                            </div>
                            <h2 className="text-slate-900 tracking-light text-[24px] font-black leading-snug px-8 text-center">
                                Order Placed Successfully!
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
                <div className="text-center space-y-2">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Order Summary</p>
                    <p className="text-slate-900 text-2xl font-black">₹{totalAmount}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{itemCount} Items • {paymentMethod}</p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border-2 border-[#2bee2b]/20 flex flex-col items-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#2bee2b]"></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Delivery OTP</p>
                    <div className="text-4xl font-black tracking-[0.3em] text-slate-900">
                        {order.deliveryOTP || '----'}
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-slate-400 text-center px-4 uppercase leading-relaxed">
                        Share this with our delivery partner during pickup
                    </p>
                </div>

                <div className="pt-4 pb-12 flex flex-col gap-4">
                    <button 
                        onClick={onContinue}
                        className="w-full bg-[#2bee2b] text-slate-900 font-black py-5 rounded-[1.5rem] shadow-lg shadow-[#2bee2b]/20 transition-all active:scale-95 uppercase text-xs tracking-widest"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessMobile;
