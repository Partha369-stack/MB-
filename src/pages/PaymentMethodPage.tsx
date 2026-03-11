import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS } from '../constants';
import { ArrowLeft, Check, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Subscription, Frequency } from '../types';
import { insforge } from '../lib/insforge';

const PaymentMethodPage: React.FC = () => {
    const { user, setView, planDraft, setPlanDraft, refreshUserData, planDeliveryDate } = useAppContext();
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
    const [isProcessing, setIsProcessing] = useState(false);

    const calculateTotal = () => {
        return Object.entries(planDraft).reduce((total, [id, qty]) => {
            const product = PRODUCTS.find(p => p.id === id);
            return total + (product ? product.price * Number(qty) : 0);
        }, 0);
    };

    const handleBack = () => {
        setView('AUTO_DELIVERY_FLOW');
    };

    const handleCompleteSetup = async () => {
        if (!user || isProcessing) return;
        setIsProcessing(true);

        try {
            const subItems = Object.entries(planDraft).map(([productId, quantity]) => ({
                productId,
                quantity: Number(quantity)
            }));

            const total = calculateTotal();

            // 1. Create the Subscription record
            const sub: Omit<Subscription, 'id' | 'createdAt'> = {
                userId: user.id,
                products: subItems,
                frequency: Frequency.MONTHLY,
                deliveryDate: planDeliveryDate,
                status: 'active'
            };

            const savedSub = await storageService.saveSubscription(sub);

            // 2. Base Order Data
            const firstOrderDate = new Date();
            firstOrderDate.setHours(9, 0, 0, 0);
            firstOrderDate.setDate(planDeliveryDate);

            const now = new Date();
            if (firstOrderDate <= now) {
                firstOrderDate.setMonth(firstOrderDate.getMonth() + 1);
            }

            const orderData = {
                userId: user.id,
                items: subItems.map(item => {
                    const prod = PRODUCTS.find(p => p.id === item.productId)!;
                    return {
                        product: prod,
                        quantity: item.quantity
                    };
                }),
                total: total,
                status: 'pending' as const,
                paymentMethod: (paymentMethod === 'online' ? 'Online' : 'COD') as 'Online' | 'COD',
                paymentStatus: 'pending',
                deliveryDate: firstOrderDate.toISOString(),
                subscriptionId: savedSub.id,
                notes: `Subscription First Order (${savedSub.id})`
            };

            if (paymentMethod === 'online') {
                // UPI Redirect Integration
                try {
                    // 1. Create the Order first in "pending" status
                    // @ts-ignore
                    const savedOrder = await storageService.saveOrder({
                        ...orderData,
                        status: 'pending',
                        paymentStatus: 'pending'
                    });

                    // 2. Construct UPI URL for redirecting to UPI Apps (GPay, PhonePe, Paytm, etc.)
                    const upiUrl = `upi://pay?pa=pradhanparthasarthi3@okicici&pn=Mother%20Best&am=${total}&cu=INR&tn=MotherBestOrder_${savedOrder.id}`;

                    // 3. Clear state and refresh before redirect
                    await refreshUserData(user.id);
                    setPlanDraft({});

                    // 4. Redirect to UPI App
                    window.location.href = upiUrl;

                    // 5. Navigate to success view (so it's ready when they come back to browser)
                    setView('ORDER_SUCCESS');

                } catch (error: any) {
                    console.error('Payment Error:', error);
                    alert("Order placement failed. Please try again.");
                    setIsProcessing(false);
                    return;
                }
            } else {
                // COD Flow
                await storageService.saveOrder(orderData);
                await refreshUserData(user.id);
                setPlanDraft({});
                setIsProcessing(false);
                setView('ORDER_SUCCESS');
            }
        } catch (error) {
            console.error('Setup failed:', error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-[#f6f8f6] min-h-screen pb-32 font-sans selection:bg-green-100">
            {/* Header with Progress Bar */}
            <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100 shadow-sm">
                <div className="px-6 py-5 flex items-center justify-between">
                    <button onClick={handleBack} className="text-slate-900 active:scale-90 transition-all">
                        <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
                    </button>
                    <h1 className="text-sm font-black text-slate-900 tracking-tight">Payment Method</h1>
                    <div className="w-6" />
                </div>
                {/* Progress Bar - 75% */}
                <div className="h-1 bg-slate-100 w-full">
                    <div className="h-full bg-[#22C55E] w-3/4 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                </div>
            </header>

            <main className="px-6 py-10 max-w-xl mx-auto space-y-10">
                {/* Confirm Plan Section */}
                <section>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Confirm Plan</h2>
                        <p className="text-slate-400 text-sm font-medium mt-1">Review your selected subscription before payment</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#e8f6e9] flex items-center justify-center text-[#22C55E]">
                                <span className="material-symbols-outlined text-2xl">calendar_month</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Monthly Subscription</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Auto-renews every 30 days</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-black text-slate-900">₹{calculateTotal()}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per Month</div>
                        </div>
                    </div>
                </section>

                {/* Select Payment Method Section */}
                <section>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Select Payment Method</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Online Payment Option */}
                        <div
                            onClick={() => setPaymentMethod('online')}
                            className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative flex items-center gap-5 ${paymentMethod === 'online' ? 'border-[#22C55E] bg-white shadow-xl shadow-green-100/50' : 'border-slate-50 bg-white opacity-80 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${paymentMethod === 'online' ? 'bg-[#22C55E] text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900">UPI Payment</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Pay via GPay, PhonePe, Paytm, etc.</p>
                                {/* Payment Logos Placeholder */}
                                <div className="flex gap-2 mt-2 opacity-40">
                                    <div className="w-6 h-4 bg-slate-200 rounded" />
                                    <div className="w-6 h-4 bg-slate-200 rounded" />
                                    <div className="w-6 h-4 bg-slate-200 rounded" />
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-[#22C55E] bg-[#22C55E]' : 'border-slate-200'
                                }`}>
                                {paymentMethod === 'online' && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                            </div>
                        </div>

                        {/* COD Option */}
                        <div
                            onClick={() => setPaymentMethod('cod')}
                            className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative flex items-center gap-5 ${paymentMethod === 'cod' ? 'border-[#22C55E] bg-white shadow-xl shadow-green-100/50' : 'border-slate-50 bg-white opacity-80 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${paymentMethod === 'cod' ? 'bg-[#22C55E] text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <Banknote className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900">Cash on Delivery</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Pay when you receive your delivery</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-[#22C55E] bg-[#22C55E]' : 'border-slate-200'
                                }`}>
                                {paymentMethod === 'cod' && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Button Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 pb-10 z-50">
                <div className="max-w-xl mx-auto flex flex-col items-center">
                    <button
                        onClick={handleCompleteSetup}
                        disabled={isProcessing}
                        className={`w-full bg-[#22C55E] text-slate-900 font-black py-5 rounded-[2rem] shadow-2xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isProcessing ? 'Processing...' : 'Complete Setup'}
                        {!isProcessing && <Check className="w-5 h-5 stroke-[4px]" />}
                    </button>

                    <button
                        onClick={handleBack}
                        className="mt-4 text-slate-400 text-xs font-bold hover:text-slate-900 transition-colors"
                    >
                        Go Back
                    </button>

                    <p className="text-center text-[10px] text-slate-300 font-medium mt-6 leading-relaxed">
                        By completing setup, you agree to Mother Best's<br />
                        <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodPage;
