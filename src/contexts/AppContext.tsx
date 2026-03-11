import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CartItem, Order, Subscription, Authority, Frequency } from '../types';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

type View = 'LANDING' | 'AUTH' | 'PRODUCT_HUB' | 'ONE_TIME_ORDER' | 'CHECKOUT' | 'AUTO_DELIVERY_FLOW' | 'MANAGE_SUBSCRIPTION' | 'ORDER_SUCCESS' | 'ORDER_HISTORY' | 'PROFILE' | 'CHOOSE_PLAN_ITEMS' | 'PAYMENT_METHOD';

interface AppContextType {
    view: View;
    setView: (view: View) => void;
    user: User | null;
    setUser: (user: User | null) => void;
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    orderHistory: Order[];
    setOrderHistory: React.Dispatch<React.SetStateAction<Order[]>>;
    lastCreatedOrder: Order | null;
    setLastCreatedOrder: (order: Order | null) => void;
    activeSubscription: Subscription | null;
    setActiveSubscription: (sub: Subscription | null) => void;
    allAuthorities: Authority[];
    setAllAuthorities: (auths: Authority[]) => void;
    refreshUserData: (uid: string) => Promise<void>;
    isInitializing: boolean;
    planDraft: { [key: string]: number };
    setPlanDraft: (draft: { [key: string]: number }) => void;
    planDeliveryDate: number;
    setPlanDeliveryDate: (date: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [view, setView] = useState<View>('LANDING');
    const [user, setUser] = useState<User | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
    const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
    const [allAuthorities, setAllAuthorities] = useState<Authority[]>([]);
    const [planDraft, setPlanDraft] = useState<{ [key: string]: number }>({});
    const [planDeliveryDate, setPlanDeliveryDate] = useState<number>(15);
    const [isInitializing, setIsInitializing] = useState(true);

    const refreshUserData = async (uid: string) => {
        const subs = await storageService.getSubscriptions(uid);
        if (subs.length > 0) setActiveSubscription(subs[0]);
        else setActiveSubscription(null);

        const orders = await storageService.getOrders(uid);
        setOrderHistory(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    useEffect(() => {
        const init = async () => {
            try {
                const activeUser = await authService.initializeSession();
                if (activeUser) {
                    setUser(activeUser);
                    storageService.setUser(activeUser);
                    await refreshUserData(activeUser.id);
                } else {
                    if (localStorage.getItem('force_auth_view') === 'true') {
                        setView('AUTH');
                        localStorage.removeItem('force_auth_view');
                    }
                }
            } catch (err) {
                console.error("Session init failed:", err);
            }
            const auths = await storageService.getAuthorities();
            setAllAuthorities(auths);
            setIsInitializing(false);
        };
        init();
    }, []);

    return (
        <AppContext.Provider value={{
            view, setView,
            user, setUser,
            cart, setCart,
            orderHistory, setOrderHistory,
            lastCreatedOrder, setLastCreatedOrder,
            activeSubscription, setActiveSubscription,
            allAuthorities, setAllAuthorities,
            refreshUserData,
            isInitializing,
            planDraft,
            setPlanDraft,
            planDeliveryDate,
            setPlanDeliveryDate
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
