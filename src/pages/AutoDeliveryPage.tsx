import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { storageService } from '../services/storageService';
import { Frequency, Subscription } from '../types';
import { authService } from '../services/authService';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Truck } from 'lucide-react';

const AutoDeliveryPage: React.FC = () => {
    const { user, setUser, setView, refreshUserData, planDraft, setPlanDraft, planDeliveryDate, setPlanDeliveryDate } = useAppContext();
    const navigate = useNavigate();
    
    // Delivery State
    const [currentMonth, setCurrentMonth] = useState(new Date(2023, 9, 1)); // Oct 2023 as per design

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setView('LANDING');
        navigate('/');
    };

    const handleBack = () => {
        setView('CHOOSE_PLAN_ITEMS');
    };

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = [];
        const firstDay = firstDayOfMonth(year, month);
        const totalDays = daysInMonth(year, month);

        // Add empty cells for days from previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Add days of current month
        for (let i = 1; i <= totalDays; i++) {
            days.push(i);
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    return (
        <div className="bg-[#f6f8f6] min-h-screen pb-32 font-sans selection:bg-green-100">
            {/* Header with Progress Bar */}
            <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100 shadow-sm">
                <div className="px-6 py-5 flex items-center justify-between">
                    <button onClick={handleBack} className="text-slate-900 active:scale-90 transition-all">
                        <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
                    </button>
                    <h1 className="text-sm font-black text-slate-900 tracking-tight">Delivery Schedule</h1>
                    <div className="w-6" /> 
                </div>
                {/* Progress Bar - 50% */}
                <div className="h-1 bg-slate-100 w-full">
                    <div className="h-full bg-[#22C55E] w-1/2 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                </div>
            </header>

            <main className="px-6 py-8 max-w-xl mx-auto space-y-10">
                {/* Calendar Section */}
                <section>
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Preferred Date</h3>
                        <p className="text-slate-400 text-xs font-semibold">Select your preferred date for monthly delivery</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="font-bold text-slate-900 text-sm">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </h4>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handlePrevMonth}
                                    className="p-1 text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleNextMonth}
                                    className="p-1 text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Week Days */}
                        <div className="grid grid-cols-7 mb-4">
                            {weekDays.map(day => (
                                <div key={day} className="text-[10px] font-black text-slate-300 text-center uppercase tracking-widest">{day}</div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-y-2">
                            {generateCalendarDays().map((day, idx) => (
                                <div key={idx} className="aspect-square flex items-center justify-center">
                                    {day && (
                                        <button 
                                            onClick={() => setPlanDeliveryDate(day)}
                                            className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                                                planDeliveryDate === day 
                                                    ? 'bg-[#22C55E] text-white shadow-lg shadow-green-100' 
                                                    : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Friendly Quote Card */}
                <div className="bg-[#e8f6e9] rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-3 border border-green-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-12 h-12 bg-[#22C55E] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200/50 relative z-10">
                        <Truck className="w-6 h-6 fill-white" />
                    </div>
                    <p className="text-slate-600 text-[13px] font-medium leading-relaxed italic opacity-80 z-10">
                        "Fresh from our home to yours, exactly when you need it."
                    </p>
                </div>
            </main>

            {/* Bottom Bar matching Stitch design */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 pb-10 z-50">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Next Delivery</span>
                        <span className="text-slate-900 font-black text-sm">Oct {planDeliveryDate}, 2023</span>
                    </div>
                    
                    <button 
                        onClick={() => setView('PAYMENT_METHOD')}
                        className="w-full bg-[#22C55E] text-slate-900 font-black py-5 rounded-[2rem] shadow-2xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
                    >
                        Confirm Membership
                        <Check className="w-5 h-5 stroke-[4px]" />
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 font-medium mt-6">
                        You can change your delivery preferences at any time in your profile settings.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AutoDeliveryPage;
