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
            const order: Omit<Order, 'id' | 'createdAt'> = {
                userId: session.user.id,
                items: cart,
                total: total,
                deliveryDate: 'Scheduled',
                status: 'pending',
                paymentMethod: (paymentMethod as any) || 'COD'
            };
            await storageService.saveOrder(order);

            const allOrders = await storageService.getAllOrders();
            const createdOrder = allOrders.find(o => o.userId === session.user.id && o.total === total);
            if (createdOrder) setLastCreatedOrder(createdOrder);

            await refreshUserData(session.user.id);
            setCart([]);
            setView('ORDER_SUCCESS');
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
