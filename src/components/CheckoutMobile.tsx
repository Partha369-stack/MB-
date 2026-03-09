import React from 'react';
import { CartItem, User } from '../types';

interface CheckoutMobileProps {
    user: User | null;
    cart: CartItem[];
    deliveryPhone: string;
    onPlaceOrder: (paymentMethod: 'COD' | 'ONLINE') => void;
    onChangeAddress: () => void;
    onBack?: () => void;
    isPlacingOrder?: boolean;
}

const CheckoutMobile: React.FC<CheckoutMobileProps> = ({
    user,
    cart,
    deliveryPhone,
    onPlaceOrder,
    onChangeAddress,
    onBack,
    isPlacingOrder = false
}) => {
    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const [paymentMethod, setPaymentMethod] = React.useState<'COD' | 'ONLINE'>('COD');

    return (
        <div className="bg-[#f6f8f6] text-slate-900 min-h-screen">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#2bee2b]/10">
                <div className="flex items-center justify-between px-4 h-16">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#2bee2b]/10 transition-colors">
                        <span className="material-symbols-outlined text-slate-900">arrow_back</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Mother Best</h1>
                        <span className="text-[10px] uppercase tracking-widest text-[#2bee2b] font-bold">Pure & Simple</span>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#2bee2b]/10 transition-colors">
                        <span className="material-symbols-outlined text-slate-900">more_vert</span>
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto pb-40">
                {/* Title Section */}
                <div className="px-6 py-6">
                    <h2 className="text-3xl font-bold text-slate-900">Confirm Order</h2>
                    <p className="text-slate-500 mt-1">Review your items and delivery details</p>
                </div>

                {/* Order Items Section */}
                <div className="px-4 space-y-3">
                    <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-[#2bee2b]/5">
                        <h3 className="text-sm font-bold text-[#2bee2b] mb-4 uppercase tracking-wider">Order Summary</h3>
                        <div className="space-y-4">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-[#2bee2b]/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.product.imageUrl ? (
                                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[#2bee2b]">inventory_2</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900 line-clamp-1">{item.product.name} x{item.quantity}</p>
                                        <p className="text-xs text-slate-500">{item.product.category || 'Home Care'}</p>
                                    </div>
                                    <p className="font-bold text-slate-900">₹{item.product.price * item.quantity}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <p className="text-lg font-bold text-slate-900">Final Amount</p>
                            <p className="text-2xl font-bold text-[#2bee2b]">₹{total}</p>
                        </div>
                    </div>
                </div>

                {/* Delivery Address Section */}
                <div className="px-4 mt-6">
                    <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-[#2bee2b]/5">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#2bee2b]">local_shipping</span>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delivery Address</h3>
                            </div>
                            <button onClick={onChangeAddress} className="text-[#2bee2b] text-sm font-bold hover:underline">Change</button>
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-900 font-medium">{user?.address || 'No address provided'}</p>
                            {deliveryPhone && (
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <span className="material-symbols-outlined text-base">call</span>
                                    <span>{deliveryPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Method Section */}
                <div className="px-4 mt-6">
                    <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-[#2bee2b]/5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#2bee2b]">payments</span>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment Method</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-[#2bee2b] bg-[#2bee2b]/5' : 'border-slate-100'}`}>
                                <input 
                                    type="radio" 
                                    name="payment" 
                                    className="w-5 h-5 text-[#2bee2b] border-[#2bee2b] focus:ring-[#2bee2b]" 
                                    checked={paymentMethod === 'COD'}
                                    onChange={() => setPaymentMethod('COD')}
                                />
                                <div className="ml-3">
                                    <p className="font-bold text-slate-900">Cash on Delivery</p>
                                </div>
                            </label>

                            <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'ONLINE' ? 'border-[#2bee2b] bg-[#2bee2b]/5' : 'border-slate-100'}`}>
                                <input 
                                    type="radio" 
                                    name="payment" 
                                    className="w-5 h-5 text-[#2bee2b] border-[#2bee2b] focus:ring-[#2bee2b]" 
                                    checked={paymentMethod === 'ONLINE'}
                                    onChange={() => setPaymentMethod('ONLINE')}
                                />
                                <div className="ml-3">
                                    <p className="font-bold text-slate-900">Online Payment</p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-4 p-4 bg-[#2bee2b]/10 rounded-lg flex gap-3 border border-[#2bee2b]/20">
                            <span className="material-symbols-outlined text-[#2bee2b] shrink-0">info</span>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {paymentMethod === 'COD' 
                                    ? "Payment will be collected at your doorstep. Please ensure someone is available to receive the order."
                                    : "Pay securely via UPI, Cards or Net Banking. Your order will be processed immediately after payment."}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-[#2bee2b]/10 max-w-2xl mx-auto rounded-t-lg">
                <div className="mb-4 text-center">
                    <p className="text-[10px] text-slate-400">
                        By placing this order, you agree to Mother Best's <a href="#" className="text-[#2bee2b] underline">Terms of Service</a> and <a href="#" className="text-[#2bee2b] underline">Privacy Policy</a>.
                    </p>
                </div>
                <button 
                    onClick={() => onPlaceOrder(paymentMethod)}
                    disabled={isPlacingOrder}
                    className={`w-full bg-[#2bee2b] text-[#102210] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-all shadow-lg shadow-[#2bee2b]/20 ${isPlacingOrder ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isPlacingOrder ? (
                        <>
                            <div className="w-6 h-6 border-4 border-[#102210] border-t-transparent rounded-full animate-spin"></div>
                            <span>Placing Order...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">{paymentMethod === 'COD' ? 'shopping_bag' : 'security'}</span>
                            {paymentMethod === 'COD' ? 'Place COD Order' : 'Pay & Place Order'}
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};

export default CheckoutMobile;

