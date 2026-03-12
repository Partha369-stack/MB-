import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PRODUCTS } from '../constants';
import { ArrowLeft, Check, CreditCard, Banknote, ShieldCheck, CheckCircle, ShoppingBag } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Subscription, Frequency } from '../types';
import { insforge } from '../lib/insforge';

// Razorpay checkout.js types (loaded via script tag in index.html)
declare global {
    interface Window { Razorpay: any; }
}

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL;

const PaymentMethodPage: React.FC = () => {
    const { user, setView, planDraft, setPlanDraft, refreshUserData, planDeliveryDate, setLastCreatedOrder, activeSubscription } = useAppContext();
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRazorpayAvailable, setIsRazorpayAvailable] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const isEditing = !!activeSubscription;

    React.useEffect(() => {
        const checkRazorpay = async () => {
            const settings = await storageService.getAppSettings();
            if (!settings.razorpayKeyId) {
                setIsRazorpayAvailable(false);
                setPaymentMethod('cod'); // Default to COD if unavailable
            }
        };
        checkRazorpay();
    }, []);

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
        if (!user || isProcessing || showSuccess) return;
        setIsProcessing(true);

        try {
            const subItems = Object.entries(planDraft).map(([productId, quantity]) => ({
                productId,
                quantity: Number(quantity)
            }));

            const total = calculateTotal();

            // 1. Create/Update the Subscription record
            const sub: any = {
                userId: user.id,
                products: subItems,
                frequency: Frequency.MONTHLY,
                deliveryDate: planDeliveryDate,
                status: 'active'
            };

            // If we are editing an existing subscription, keep the same ID and creation date
            if (activeSubscription) {
                sub.id = activeSubscription.id;
                sub.createdAt = activeSubscription.createdAt;
            }

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
                paymentStatus: 'pending' as const,
                orderType: 'Subscription' as const,
                deliveryDate: firstOrderDate.toISOString(),
                subscriptionId: savedSub.id,
                notes: isEditing ? `Subscription Updated (${savedSub.id})` : `Subscription First Order (${savedSub.id})`
            };

            if (paymentMethod === 'online') {
                // ──────────────────────────────────────────────────
                // Razorpay Online Payment Flow
                // ──────────────────────────────────────────────────
                try {
                    // 1. Create the Order first in "pending" status
                    const savedOrder = await storageService.saveOrder(orderData);

                    // 2. Create a Razorpay payment order via our edge function
                    const fnUrl = `${INSFORGE_URL}/functions/create-razorpay-order`;
                    const response = await fetch(fnUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: total,
                            currency: 'INR',
                            receipt: savedOrder.id
                        })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || `Payment gateway error (${response.status})`);
                    }

                    const rzpOrder = await response.json();

                    if (!rzpOrder.id || !rzpOrder.key_id) {
                        throw new Error(rzpOrder.error || 'Failed to create payment order. Check admin Razorpay settings.');
                    }

                    // 3. Store Razorpay order ID in our DB order
                    await storageService.updateOrder(savedOrder.id, { razorpay_order_id: rzpOrder.id });

                    // 4. Open the Razorpay checkout widget
                    const rzpOptions = {
                        key: rzpOrder.key_id,
                        amount: rzpOrder.amount,
                        currency: rzpOrder.currency,
                        name: 'Mother Best',
                        description: `Subscription Plan - Monthly`,
                        image: '/logo.jpg',
                        order_id: rzpOrder.id,
                        prefill: {
                            name: user?.name || '',
                            contact: user?.phone || '',
                            email: user?.email || '',
                        },
                        theme: { color: '#22C55E' },
                        handler: async (paymentResponse: any) => {
                            // 5. Payment success — refresh data and navigate
                            await storageService.updateOrder(savedOrder.id, {
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                                status: 'confirmed',
                                payment_status: 'paid'
                            });

                            const finalizedOrder = {
                                ...savedOrder,
                                paymentStatus: 'paid' as const,
                                status: 'confirmed' as const,
                                notes: orderData.notes
                            };
                            setLastCreatedOrder(finalizedOrder);

                            await refreshUserData(user.id);
                            setPlanDraft({});
                            setIsProcessing(false);
                            setShowSuccess(true);
                            
                            // Visual confirmation delay — matches 3s countdown overlay
                            setTimeout(() => {
                                setView(isEditing ? 'PRODUCT_HUB' : 'ORDER_SUCCESS');
                            }, 3000);
                        },
                        modal: {
                            ondismiss: () => {
                                setIsProcessing(false);
                            }
                        }
                    };

                    if (!window.Razorpay) {
                        throw new Error('Razorpay SDK not loaded. Please reload the page.');
                    }

                    const rzp = new window.Razorpay(rzpOptions);
                    rzp.on('payment.failed', (resp: any) => {
                        console.error('Payment failed:', resp.error);
                        alert(`Payment failed: ${resp.error.description || 'Please try again.'}`);
                        setIsProcessing(false);
                    });
                    rzp.open();
                    return;

                } catch (error: any) {
                    console.error('Payment Error:', error);
                    alert("Payment setup failed: " + (error.message || "Please try again."));
                    setIsProcessing(false);
                    return;
                }
            } else {
                // COD Flow
                const finalOrder = await storageService.saveOrder(orderData);
                // Ensure notes are correct for logic
                finalOrder.notes = orderData.notes;
                
                setLastCreatedOrder(finalOrder);
                await refreshUserData(user.id);
                setPlanDraft({});
                setIsProcessing(false);
                setShowSuccess(true);
                
                // Visual confirmation delay — matches 3s countdown overlay
                setTimeout(() => {
                    setView(isEditing ? 'PRODUCT_HUB' : 'ORDER_SUCCESS');
                }, 3000);
            }
        } catch (error) {
            console.error('Setup failed:', error);
            setIsProcessing(false);
        }
    };

    // Countdown for auto-redirect after success (edit mode)
    const [countdown, setCountdown] = useState(3);
    useEffect(() => {
        if (showSuccess && isEditing) {
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [showSuccess, isEditing]);

    // Number of items & total for success overlay
    const planItemCount = Object.values(planDraft).reduce((sum: number, qty) => sum + Number(qty as unknown as number), 0);
    const planTotal = calculateTotal();
    const nextDelivery = (() => {
        const d = new Date();
        d.setDate(planDeliveryDate);
        if (d <= new Date()) d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    return (
        <div className="bg-[#f6f8f6] min-h-screen pb-32 font-sans selection:bg-green-100">

            {/* ── SUCCESS OVERLAY (Edit / Update Plan mode) ── */}
            {showSuccess && isEditing && (
                <div
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6"
                    style={{
                        background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)'
                    }}
                >
                    {/* Animated radial glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at 50% 40%, rgba(34,197,94,0.25) 0%, transparent 65%)'
                        }}
                    />

                    {/* Floating sparkle dots */}
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1.5 h-1.5 rounded-full bg-green-400 opacity-60"
                            style={{
                                top: `${15 + i * 12}%`,
                                left: `${10 + i * 15}%`,
                                animation: `pulse ${1.2 + i * 0.3}s ease-in-out infinite alternate`
                            }}
                        />
                    ))}

                    {/* Check Icon */}
                    <div className="relative mb-8">
                        <div
                            className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                boxShadow: '0 0 60px rgba(34,197,94,0.5), 0 20px 40px rgba(0,0,0,0.3)'
                            }}
                        >
                            <Check className="w-14 h-14 text-white" strokeWidth={3.5} />
                        </div>
                        {/* Pulse ring */}
                        <div
                            className="absolute inset-0 rounded-full border-2 border-green-400 opacity-40"
                            style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
                        />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2">
                        Plan Updated!
                    </h2>
                    <p className="text-green-300 text-sm font-medium text-center mb-8">
                        Your subscription has been updated successfully.
                    </p>

                    {/* Order Info Card */}
                    <div
                        className="w-full max-w-sm rounded-[2rem] p-6 mb-8"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-green-300" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Order Info</p>
                                <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest">Monthly Subscription</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2.5 border-b border-white/10">
                                <span className="text-green-200 text-xs font-medium">Products</span>
                                <span className="text-white text-xs font-black">{planItemCount} items</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-white/10">
                                <span className="text-green-200 text-xs font-medium">Monthly Total</span>
                                <span className="text-white text-sm font-black">₹{planTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-green-200 text-xs font-medium">Next Delivery</span>
                                <span className="text-white text-xs font-black">{nextDelivery}</span>
                            </div>
                        </div>
                    </div>

                    {/* Countdown redirect notice */}
                    <div className="flex items-center gap-2">
                        {/* Progress ring */}
                        <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
                            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                            <circle
                                cx="14" cy="14" r="11"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="2"
                                strokeDasharray={`${2 * Math.PI * 11}`}
                                strokeDashoffset={`${2 * Math.PI * 11 * (countdown / 3)}`}
                                strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '14px 14px', transition: 'stroke-dashoffset 1s linear' }}
                            />
                            <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="900" fill="white">{countdown}</text>
                        </svg>
                        <p className="text-green-200 text-xs font-medium">
                            Returning to shop in <span className="text-white font-black">{countdown}s</span>…
                        </p>
                    </div>
                </div>
            )}

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
                            onClick={() => isRazorpayAvailable && setPaymentMethod('online')}
                            className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative flex items-center gap-5 ${
                                !isRazorpayAvailable ? 'opacity-50 grayscale cursor-not-allowed border-slate-50 bg-white' :
                                paymentMethod === 'online' ? 'border-[#22C55E] bg-white shadow-xl shadow-green-100/50' : 'border-slate-50 bg-white opacity-80 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                !isRazorpayAvailable ? 'bg-slate-100 text-slate-300' :
                                paymentMethod === 'online' ? 'bg-[#22C55E] text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900">UPI Payment</h4>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {isRazorpayAvailable ? 'Pay via GPay, PhonePe, Paytm, etc.' : 'Online Payments are now unavailable. Please try COD payment!'}
                                </p>
                                {!isRazorpayAvailable && (
                                    <div className="mt-1 px-2 py-0.5 bg-orange-100 inline-block rounded text-[10px] font-bold text-orange-600 uppercase tracking-tight">
                                        Temporarily Disabled
                                    </div>
                                )}
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
                        disabled={isProcessing || showSuccess}
                        className={`w-full ${showSuccess ? 'bg-green-600' : 'bg-[#22C55E]'} text-slate-900 font-black py-5 rounded-[2rem] shadow-2xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest ${(isProcessing || showSuccess) ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {showSuccess ? 'Subscription Updated!' : (isProcessing ? 'Processing...' : (isEditing ? 'Update Plan' : 'Confirm Membership'))}
                        {(showSuccess || (!isProcessing && !showSuccess)) && <Check className="w-5 h-5 stroke-[4px]" />}
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
