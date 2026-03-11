import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import CheckoutMobile from '../components/CheckoutMobile';
import { storageService } from '../services/storageService';
import { insforge } from '../lib/insforge';
import { Order } from '../types';

const CheckoutPage: React.FC = () => {
    const { user, cart, setCart, setView, setLastCreatedOrder, refreshUserData } = useAppContext();
    const navigate = useNavigate();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const handleBack = () => {
        setView('PRODUCT_HUB');
    };

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
                paymentMethod: normalizedMethod as 'Online' | 'COD'
            };

            if (paymentMethod.toUpperCase() === 'ONLINE') {
                // Online Payment Flow (UPI Redirect)
                try {
                    // 1. Create the Order first in "pending" status
                    const savedOrder = await storageService.saveOrder(orderData);
                    setLastCreatedOrder(savedOrder);

                    // 2. Construct UPI URL for redirecting to UPI Apps (GPay, PhonePe, Paytm, etc.)
                    // pa: VPA/UPI ID, pn: Payee Name, am: Amount, cu: Currency, tn: Transaction Note
                    const upiUrl = `upi://pay?pa=pradhanparthasarthi3@okicici&pn=Mother%20Best&am=${total}&cu=INR&tn=MotherBestOrder_${savedOrder.id}`;

                    // 3. Clear state and refresh before redirect
                    await refreshUserData(session.user.id);
                    setCart([]);
                    
                    // 4. Redirect to UPI App
                    window.location.href = upiUrl;
                    
                    // 5. Navigate to success view (so it's ready when they come back to browser)
                    setView('ORDER_SUCCESS');
                    
                } catch (error: any) {
                    console.error('Payment Error:', error);
                    alert("Order placement failed. Please try again.");
                    setIsPlacingOrder(false);
                    return;
                }
            } else {
                // COD Flow
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
