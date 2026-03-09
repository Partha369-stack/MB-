import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Header, Card, Button } from '../components/Layout';
import { PRODUCTS } from '../constants';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

const ManageSubscriptionPage: React.FC = () => {
    const { user, setUser, activeSubscription, setActiveSubscription, setView } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setView('LANDING');
        navigate('/');
    };

    const handleBack = () => {
        setView('ORDER_HISTORY');
    };

    if (!activeSubscription) return null;

    return (
        <div className="bg-cream min-h-screen pb-24">
            <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => setView('PROFILE')} onBack={handleBack} />
            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="mb-10">
                    <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">My Membership</h2>
                </div>
                <Card className="p-7 md:p-9">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</span>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${activeSubscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {activeSubscription.status}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule</span>
                            <p className="text-sm font-black text-slate-700 uppercase">{activeSubscription.frequency} ({activeSubscription.deliveryDate}th)</p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-10 border-t border-slate-50 pt-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Included Items</p>
                        {activeSubscription.products.map(p => {
                            const product = PRODUCTS.find(prod => prod.id === p.productId);
                            return (
                                <div key={p.productId} className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800 text-base">{product?.name}</span>
                                    <span className="font-black text-slate-400">x{p.quantity}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-col gap-4">
                        <Button fullWidth variant="outline" className="h-14 rounded-2xl" onClick={async () => {
                            const newStatus = activeSubscription.status === 'active' ? 'paused' as const : 'active' as const;
                            await storageService.updateSubscription({ id: activeSubscription.id, status: newStatus });
                            setActiveSubscription({ ...activeSubscription, status: newStatus });
                        }}>
                            {activeSubscription.status === 'active' ? 'Pause Membership' : 'Resume Membership'}
                        </Button>
                        <Button fullWidth variant="danger" onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel your membership?')) {
                                await storageService.deleteSubscription(activeSubscription.id);
                                setActiveSubscription(null);
                                setView('PRODUCT_HUB');
                            }
                        }}>
                            Cancel Membership
                        </Button>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default ManageSubscriptionPage;
