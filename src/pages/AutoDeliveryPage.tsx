import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Header, Card, Button } from '../components/Layout';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import { PRODUCTS, DELIVERY_DATES } from '../constants';
import { storageService } from '../services/storageService';
import { Frequency, Subscription } from '../types';
import { authService } from '../services/authService';

const AutoDeliveryPage: React.FC = () => {
    const { user, setUser, setView, refreshUserData } = useAppContext();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [subDraftProducts, setSubDraftProducts] = useState<{ productId: string; quantity: number }[]>([]);
    const [subDraftFreq, setSubDraftFreq] = useState<Frequency>(Frequency.MONTHLY);
    const [subDraftDate, setSubDraftDate] = useState<number>(5);

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setView('LANDING');
        navigate('/');
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else setView('PRODUCT_HUB');
    };

    if (step === 1) {
        return (
            <div className="bg-cream min-h-screen pb-44">
                <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => setView('PROFILE')} onBack={handleBack} />
                <main className="max-w-2xl mx-auto px-6 py-12">
                    <div className="mb-10">
                        <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">Choose Plan Items</h2>
                        <p className="text-slate-500 font-medium mt-2">Select items for your regular monthly shipment.</p>
                    </div>
                    <div className="space-y-4">
                        {PRODUCTS.map((product) => {
                            const draft = subDraftProducts.find(p => p.productId === product.id);
                            const qty = draft ? draft.quantity : 0;
                            return (
                                <Card key={product.id} className="p-5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <img src={product.imageUrl} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                                            <div>
                                                <h3 className="font-black text-slate-800 text-sm md:text-base">{product.name}</h3>
                                                <p className="text-green-700 font-black text-sm">₹{product.price} / {product.unit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {qty === 0 ? (
                                                <button onClick={() => setSubDraftProducts(prev => [...prev, { productId: product.id, quantity: 1 }])} className="px-6 py-2 bg-green-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">Add <Plus className="w-3.5 h-3.5 ml-1" /></button>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                                    <button onClick={() => setSubDraftProducts(prev => {
                                                        const existing = prev.find(p => p.productId === product.id);
                                                        if (existing?.quantity === 1) return prev.filter(p => p.productId !== product.id);
                                                        return prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity - 1 } : p);
                                                    })} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm"><Minus className="w-3.5 h-3.5" /></button>
                                                    <span className="font-black text-base w-5 text-center">{qty}</span>
                                                    <button onClick={() => setSubDraftProducts(prev => prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-green-700"><Plus className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </main>
                {subDraftProducts.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t z-50">
                        <Button fullWidth onClick={() => setStep(2)}>Next: Schedule Delivery <ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-cream min-h-screen pb-44">
            <Header user={user} onLogout={handleLogout} onGoHome={() => navigate('/')} onNavigate={setView} onEditProfile={() => setView('PROFILE')} onBack={handleBack} />
            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="mb-10">
                    <h2 className="font-serif text-3xl font-black text-slate-900 leading-tight">Delivery Schedule</h2>
                </div>
                <Card className="p-7 space-y-8">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Frequency</p>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.values(Frequency).map(f => (
                                <button key={f} onClick={() => setSubDraftFreq(f)} className={`py-5 rounded-2xl border-2 font-black text-xs uppercase transition-all ${subDraftFreq === f ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-50 text-slate-400 bg-white'}`}>{f}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Which day of the month?</p>
                        <div className="grid grid-cols-3 gap-4">
                            {DELIVERY_DATES.map(d => (
                                <button key={d} onClick={() => setSubDraftDate(d)} className={`py-5 rounded-2xl border-2 font-black text-lg transition-all ${subDraftDate === d ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-50 text-slate-400 bg-white'}`}>{d}th</button>
                            ))}
                        </div>
                    </div>
                </Card>
                <div className="mt-10">
                    <Button fullWidth onClick={async () => {
                        const sub: Omit<Subscription, 'id' | 'createdAt'> = {
                            userId: user!.id,
                            products: subDraftProducts,
                            frequency: subDraftFreq,
                            deliveryDate: subDraftDate,
                            status: 'active'
                        };
                        await storageService.saveSubscription(sub);
                        await refreshUserData(user!.id);
                        setView('ORDER_SUCCESS');
                    }}>Confirm Membership</Button>
                </div>
            </main>
        </div>
    );
};

export default AutoDeliveryPage;
