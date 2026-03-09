import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import OrdersMobile from '../components/OrdersMobile';
import { PRODUCTS } from '../constants';

const OrderHistoryPage: React.FC = () => {
    const { view, setView, orderHistory, activeSubscription } = useAppContext();
    const navigate = useNavigate();

    const handleBack = () => {
        setView('PRODUCT_HUB');
    };

    return (
        <OrdersMobile
            orders={orderHistory}
            activeSubscription={activeSubscription}
            products={PRODUCTS}
            onViewSubscription={() => setView('MANAGE_SUBSCRIPTION')}
            onBack={handleBack}
            onNavigate={(v: any) => {
                if (v === 'LANDING') {
                    setView('LANDING');
                    navigate('/');
                } else if (v === 'PRODUCT_HUB') {
                    setView('PRODUCT_HUB');
                    navigate('/products');
                } else if (v === 'PROFILE') {
                    setView('PROFILE');
                } else {
                    setView(v);
                }
            }}
        />
    );
};

export default OrderHistoryPage;
