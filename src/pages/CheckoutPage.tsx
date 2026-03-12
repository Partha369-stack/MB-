import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import CheckoutMobile from '../components/CheckoutMobile';
import { storageService } from '../services/storageService';
import { insforge } from '../lib/insforge';
import { Order } from '../types';

// Razorpay checkout.js types (loaded via script tag in index.html)
declare global {
    interface Window {
        Razorpay: any;
    }
}

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL;

const CheckoutPage: React.FC = () => {
    const { user, cart, setCart, setView, setLastCreatedOrder, refreshUserData } = useAppContext();
    const navigate = useNavigate();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isRazorpayAvailable, setIsRazorpayAvailable] = useState(true);

    const handleBack = () => {
        setView('PRODUCT_HUB');
    };

    React.useEffect(() => {
        const checkRazorpay = async () => {
            const settings = await storageService.getAppSettings();
            if (!settings.razorpayKeyId) {
                setIsRazorpayAvailable(false);
            }
        };
        checkRazorpay();
    }, []);

    const handlePlaceOrder = async (paymentMethod: string) => {
        if (isPlacingOrder) return;
        setIsPlacingOrder(true);
        try {
            const { data: { session } } = await insforge.auth.getCurrentSession();
            if (!session) throw new Error("Your session has expired. Please log in again.");

            const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

            // Normalize payment method for storage (Online or COD)
            const normalizedMethod = paymentMethod.toUpperCase() === 'ONLINE' ? 'Online' : 'COD';

            const orderData = {
                userId: session.user.id,
                items: cart,
                total: total,
                deliveryDate: 'Scheduled',
                status: 'pending' as const,
                paymentMethod: normalizedMethod as 'Online' | 'COD',
                orderType: 'Regular' as const
            };

            if (paymentMethod.toUpperCase() === 'ONLINE') {
                // ──────────────────────────────────────────────────
                // Razorpay Online Payment Flow
                // ──────────────────────────────────────────────────

                // 1. Create Order record in DB (pending payment)
                const savedOrder = await storageService.saveOrder(orderData);
                setLastCreatedOrder(savedOrder);

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
                await insforge.database
                    .from('orders')
                    .update({ razorpay_order_id: rzpOrder.id })
                    .eq('id', savedOrder.id);

                // 4. Open the Razorpay checkout widget
                const rzpOptions = {
                    key: rzpOrder.key_id,
                    amount: rzpOrder.amount, // in paise
                    currency: rzpOrder.currency,
                    name: 'Mother Best',
                    description: `Order #${savedOrder.id}`,
                    image: '/logo.jpg',
                    order_id: rzpOrder.id,
                    prefill: {
                        name: user?.name || '',
                        contact: user?.phone || '',
                        email: user?.email || '',
                    },
                    theme: { color: '#22C55E' },
                    handler: async (paymentResponse: any) => {
                        // 5. Payment success — update local order state & navigate
                        await storageService.updateOrder(savedOrder.id, {
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                            status: 'confirmed',
                            payment_status: 'paid'
                        });
                        
                        setLastCreatedOrder({
                            ...savedOrder,
                            paymentStatus: 'paid' as const,
                            status: 'confirmed' as const
                        });

                        await refreshUserData(session.user.id);
                        setCart([]);
                        setIsPlacingOrder(false);
                        setView('ORDER_SUCCESS');
                    },
                    modal: {
                        ondismiss: () => {
                            // User closed the modal without paying
                            setIsPlacingOrder(false);
                        }
                    }
                };

                if (!window.Razorpay) {
                    throw new Error('Razorpay SDK not loaded. Check your internet connection and reload the page.');
                }

                const rzp = new window.Razorpay(rzpOptions);
                rzp.on('payment.failed', async (resp: any) => {
                    console.error('Razorpay payment failed:', resp.error);
                    alert(`Payment failed: ${resp.error.description || 'Please try again.'}`);
                    setIsPlacingOrder(false);
                });
                rzp.open();

                // Don't set isPlacingOrder false here — the modal handler/dismiss does it
                return;

            } else {
                // ──────────────────────────────────────────────────
                // COD Flow
                // ──────────────────────────────────────────────────
                const savedOrder = await storageService.saveOrder(orderData);
                setLastCreatedOrder(savedOrder);
                await refreshUserData(session.user.id);
                setCart([]);
                setView('ORDER_SUCCESS');
            }
        } catch (error: any) {
            console.error("Failed to place order:", error);
            alert("Failed to place order: " + (error.message || "Unknown error"));
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <CheckoutMobile
            user={user}
            cart={cart}
            isPlacingOrder={isPlacingOrder}
            isRazorpayAvailable={isRazorpayAvailable}
            deliveryPhone={user?.phone || ''}
            onBack={handleBack}
            onChangeAddress={() => {
                setView('PROFILE');
            }}
            onPlaceOrder={handlePlaceOrder}
        />
    );
};

export default CheckoutPage;
