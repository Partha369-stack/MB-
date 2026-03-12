import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import OrderSuccessMobile from '../components/OrderSuccessMobile';

const OrderSuccessPage: React.FC = () => {
    const { setView, lastCreatedOrder } = useAppContext();
    const navigate = useNavigate();

    const handleBack = () => {
        if (lastCreatedOrder?.subscriptionId || lastCreatedOrder?.orderType === 'Subscription') {
            setView('MANAGE_SUBSCRIPTION');
        } else {
            setView('PRODUCT_HUB');
        }
    };

    return (
        <OrderSuccessMobile
            order={lastCreatedOrder}
            onContinue={() => {
                if (lastCreatedOrder?.subscriptionId || lastCreatedOrder?.orderType === 'Subscription') {
                    setView('MANAGE_SUBSCRIPTION');
                } else {
                    setView('PRODUCT_HUB');
                }
            }}
            onBack={handleBack}
        />
    );
};

export default OrderSuccessPage;
