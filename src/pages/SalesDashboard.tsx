
import React, { useState, useEffect } from 'react';
import {
    Users,
    UserCheck,
    BarChart3,
    Search,
    Clock,
    XCircle,
    ChevronRight,
    Target,
    Phone,
    MapPin,
    Plus,
    Calendar,
    ExternalLink,
    AlertTriangle,
    X,
    TrendingUp,
    MessageSquare,
    CheckCircle2,
    Mail,
    Home
} from 'lucide-react';
import { Card, Button } from '../components/Layout';
import { NotificationBell } from '../components/NotificationBell';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { User, SalesTarget, SalesActivity, CustomerFollowUp } from '../types';

import { useNavigate } from 'react-router-dom';

interface SalesDashboardProps {
    user: User;
    onLogout: () => void;
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    if (!user) return null;
    const [targets, setTargets] = useState<SalesTarget[]>([]);
    const [activities, setActivities] = useState<SalesActivity[]>([]);
    const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'clients'>('dashboard');
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<SalesActivity>>({
        activityType: 'visit',
        notes: '',
        personName: '',
        personPhone: '',
        personAddress: '',
        convertedToCustomer: false,
        userId: ''
    });
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();

            // 🔄 Real-time: subscribe to sales data tables for instant updates
            let cleanup: (() => void) | null = null;
            const setupRealtime = async () => {
                const unsubFns = await Promise.all([
                    storageService.subscribeToRealtimeTable('sales_activities', () => { loadData(); }),
                    storageService.subscribeToRealtimeTable('sales_targets', () => { loadData(); }),
                    storageService.subscribeToRealtimeTable('customer_follow_ups', () => { loadData(); }),
                    storageService.subscribeToRealtimeTable('profiles', () => { loadData(); }),
                ]);
                cleanup = () => unsubFns.forEach(fn => fn());
            };
            setupRealtime();

            // Polling fallback every 30 seconds
            const interval = setInterval(loadData, 30000);
            return () => {
                clearInterval(interval);
                if (cleanup) cleanup();
            };
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isProfileDropdownOpen && !target.closest('.profile-dropdown-container')) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileDropdownOpen]);


    const handleAuthError = (err: any) => {
        if (err.message?.includes('JWT expired')) {
            alert('Your session has expired. Please log in again.');
            onLogout();
            return true;
        }
        return false;
    };

    const loadData = async () => {
        if (!user) return;
        try {
            // Load Targets
            const allTargets = await storageService.getSalesTargets(user.id);
            setTargets(allTargets);

            // Load Activities
            const allActivities = await storageService.getSalesActivities(user.id);
            setActivities([...allActivities].reverse());

            // Load Follow-ups
            const followUpData = await storageService.getCustomerFollowUpData(user.id);
            setFollowUps(followUpData);
        } catch (error) {
            console.error("Error loading sales data:", error);
            handleAuthError(error);
        }
    };

    const activeTarget = targets.find(t => t.status === 'active');

    const stats = {
        totalVisits: activities.filter(a => a.activityType === 'visit').length,
        totalConversions: activities.filter(a => a.convertedToCustomer).length,
        totalFollowUps: activities.filter(a => a.activityType === 'follow_up').length,
        totalCustomers: followUps.length,
        emergencyFollowUps: followUps.filter(f => f.needsEmergencyFollowUp).length,
        visitProgress: activeTarget ? (activities.filter(a => a.activityType === 'visit').length / activeTarget.targetVisits) * 100 : 0,
        conversionProgress: activeTarget ? (activities.filter(a => a.convertedToCustomer).length / activeTarget.targetConversions) * 100 : 0
    };

    const handleLogActivity = async () => {
        if (!newActivity.personName || !newActivity.personPhone || !newActivity.notes) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const activity: SalesActivity = {
                id: 'ACT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                salesPersonId: user.id,
                personName: newActivity.personName!,
                personPhone: newActivity.personPhone!,
                personAddress: newActivity.personAddress || '',
                activityType: newActivity.activityType as 'visit' | 'follow_up',
                convertedToCustomer: newActivity.convertedToCustomer || false,
                notes: newActivity.notes!,
                timestamp: new Date().toISOString(),
                userId: newActivity.userId
            };

            await storageService.saveSalesActivity(activity);

            // Stats updated automatically via DB Trigger on sales_activities insert/update
            // if (activeTarget) ... logic removed

            setIsActivityModalOpen(false);
            setNewActivity({
                activityType: 'visit',
                notes: '',
                personName: '',
                personPhone: '',
                personAddress: '',
                convertedToCustomer: false,
                userId: ''
            });
            await loadData();
            alert('Activity logged successfully!');
        } catch (error: any) {
            console.error("Error logging activity:", error);
            if (!handleAuthError(error)) {
                alert('Failed to log activity: ' + (error.message || 'Unknown error'));
            }
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in font-['Plus_Jakarta_Sans']">
            {/* Greeting Section */}
            <section className="px-1 pt-2">
                <h2 className="text-2xl font-bold leading-tight text-slate-900">
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user.name.split(' ')[0]}
                </h2>
                <p className="text-slate-500 text-sm">Welcome back to your dashboard.</p>
            </section>

            {/* Official Mission Card */}
            {activeTarget && (
                <section className="bg-white rounded-2xl p-5 border border-[#2bee2b]/10 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Official Mission</h3>
                            <p className="text-sm text-slate-500 italic">{activeTarget.instructions}</p>
                        </div>
                        <div className="bg-[#2bee2b]/20 text-slate-900 px-3 py-1 rounded-full text-[10px] font-bold">
                            Target: {new Date(activeTarget.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion</span>
                            <span className="text-xs font-bold text-[#2bee2b] text-green-600">
                                {Math.round(((stats.visitProgress + stats.conversionProgress) / 2))}%
                            </span>
                        </div>
                        <div className="w-full bg-[#2bee2b]/10 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-[#2bee2b] h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min((stats.visitProgress + stats.conversionProgress) / 2, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500 relative z-10">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span className="text-xs font-medium">Remaining: {Math.max(0, Math.ceil((new Date(activeTarget.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days</span>
                    </div>
                </section>
            )}

            {/* Goal Cards Grid */}
            <div className="grid grid-cols-2 gap-4 px-1">
                <div className="bg-white p-4 rounded-2xl border border-[#2bee2b]/10 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#2bee2b]">location_on</span>
                        <h4 className="text-sm font-bold">Visits Goal</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {activeTarget ? activeTarget.currentVisits : 0}<span className="text-slate-400 text-lg">/{activeTarget ? activeTarget.targetVisits : 100}</span>
                    </p>
                    <div className="mt-2 w-full bg-[#2bee2b]/5 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-[#2bee2b]/30 h-full transition-all duration-700"
                            style={{ width: `${activeTarget ? Math.min((activeTarget.currentVisits / activeTarget.targetVisits) * 100, 100) : 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#2bee2b]/10 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#2bee2b]">shopping_cart</span>
                        <h4 className="text-sm font-bold">Sales Goal</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {activeTarget ? activeTarget.currentConversions : 0}<span className="text-slate-400 text-lg">/{activeTarget ? activeTarget.targetConversions : 43}</span>
                    </p>
                    <div className="mt-2 w-full bg-[#2bee2b]/5 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-[#2bee2b]/30 h-full transition-all duration-700"
                            style={{ width: `${activeTarget ? Math.min((activeTarget.currentConversions / activeTarget.targetConversions) * 100, 100) : 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="px-1 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Daily Summary</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div
                        onClick={() => setActiveTab('clients')}
                        className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#2bee2b]/10 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#2bee2b]/10 flex items-center justify-center text-[#2bee2b]">
                                <span className="material-symbols-outlined">group</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Clients</p>
                                <p className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">{stats.totalCustomers}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>

                    <div
                        onClick={() => setActiveTab('history')}
                        className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#2bee2b]/10 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#2bee2b]/10 flex items-center justify-center text-[#2bee2b]">
                                <span className="material-symbols-outlined">analytics</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Visits</p>
                                <p className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">{stats.totalVisits}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                </div>
            </div>
            {/* Added spacing at the bottom to account for the fixed actions */}
            <div className="h-32"></div>
        </div>
    );


    const renderClients = () => {
        const filteredClients = followUps.filter(c => {
            const matchesSearch = c.customerName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                c.customerPhone?.includes(clientSearchTerm) ||
                (c.customerAddress && c.customerAddress.toLowerCase().includes(clientSearchTerm.toLowerCase()));

            if (filterNeedsAttention) {
                return matchesSearch && c.needsEmergencyFollowUp;
            }
            return matchesSearch;
        });

        return (
            <div className="space-y-4 animate-fade-in pb-32 font-['Plus_Jakarta_Sans']">
                {/* Search & Filter Header */}
                <div className="px-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Client Base</h2>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                            {followUps.length} Total
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#2bee2b] transition-all shadow-sm"
                                placeholder="Search Relations..."
                                value={clientSearchTerm}
                                onChange={(e) => setClientSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setFilterNeedsAttention(!filterNeedsAttention)}
                            className={`h-11 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${filterNeedsAttention
                                ? 'bg-red-50 text-red-600 border-red-100'
                                : 'bg-white text-slate-500 border-slate-200'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-lg ${filterNeedsAttention ? 'animate-pulse' : ''}`}>warning</span>
                            <span className="hidden sm:inline">Alerts</span>
                            {followUps.filter(f => f.needsEmergencyFollowUp).length > 0 && (
                                <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[8px] ${filterNeedsAttention ? 'bg-red-600 text-white' : 'bg-slate-200'}`}>
                                    {followUps.filter(f => f.needsEmergencyFollowUp).length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Client List */}
                <div className="space-y-3 px-1">
                    {filteredClients.length === 0 ? (
                        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No matching relations</p>
                        </div>
                    ) : (
                        filteredClients.map(customer => (
                            <div
                                key={customer.id}
                                className={`bg-white rounded-2xl border transition-all active:scale-[0.98] p-4 ${customer.needsEmergencyFollowUp
                                    ? 'border-red-100'
                                    : 'border-[#2bee2b]/10 hover:border-[#2bee2b]/30 shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${customer.needsEmergencyFollowUp ? 'bg-red-500' : 'bg-[#2bee2b] text-slate-900'} overflow-hidden shadow-sm`}>
                                            {customer.customerProfilePic ? (
                                                <img src={customer.customerProfilePic} alt={customer.customerName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg">{customer.customerName?.charAt(0) ?? '?'}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-bold text-slate-800 truncate leading-none">{customer.customerName}</h4>
                                            {customer.needsEmergencyFollowUp && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {customer.id.slice(-6).toUpperCase()}</span>
                                                <span className="text-[10px] font-bold text-[#2bee2b] bg-[#2bee2b]/5 px-1.5 py-0.5 rounded tabular-nums border border-[#2bee2b]/10 text-green-700">{customer.customerPhone}</span>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-500 truncate uppercase leading-none">
                                                {customer.customerAddress || 'No Address Set'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setNewActivity({
                                                activityType: 'follow_up',
                                                userId: customer.customerId,
                                                personName: customer.customerName,
                                                personPhone: customer.customerPhone,
                                                personAddress: customer.customerAddress
                                            });
                                            setIsActivityModalOpen(true);
                                        }}
                                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#2bee2b]/10 hover:text-[#2bee2b] transition-all"
                                    >
                                        <span className="material-symbols-outlined">add_circle</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };


    const renderHistory = () => (
        <div className="space-y-3 animate-fade-in pb-32 font-['Plus_Jakarta_Sans']">
            <div className="flex items-center justify-between px-2 mb-4">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">Activity Timeline</h2>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                    {activities.length} Recorded
                </span>
            </div>

            {activities.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No activities logged</p>
                </div>
            ) : (
                activities.map(act => (
                    <div key={act.id} className="bg-white p-4 rounded-2xl border border-[#2bee2b]/10 shadow-sm group hover:border-[#2bee2b]/30 transition-all">
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${act.activityType === 'visit' ? 'bg-blue-50 text-blue-600' : 'bg-[#2bee2b]/10 text-[#2bee2b]'}`}>
                                {act.customerProfilePic ? (
                                    <img src={act.customerProfilePic} alt={act.personName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined">{act.activityType === 'visit' ? 'location_on' : 'person_check'}</span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between mb-1">
                                    <h6 className="font-bold text-slate-900 text-sm uppercase truncate pr-2">{act.personName}</h6>
                                    {act.convertedToCustomer && (
                                        <span className="bg-[#2bee2b] text-slate-900 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 shadow-sm">Verified Sale</span>
                                    )}
                                </div>

                                <p className="text-[10px] font-medium text-slate-400 mb-2 flex items-center gap-1.5 tabular-nums">
                                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                                    {new Date(act.timestamp).toLocaleDateString()} • {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>

                                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                    <p className="text-xs text-slate-600 font-medium italic leading-relaxed">"{act.notes}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );


    return (
        <div className="min-h-screen bg-[#f6f8f6] font-['Plus_Jakarta_Sans'] text-slate-900 overflow-x-hidden">
            {/* Top Navigation & Header */}
            <header className="bg-white border-b border-[#2bee2b]/10 sticky top-0 z-50">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <div
                        onClick={() => navigate('/')}
                        className="flex w-10 h-10 shrink-0 items-center justify-center rounded-full bg-[#2bee2b]/10 text-slate-900 cursor-pointer active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </div>
                    <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center font-['Plus_Jakarta_Sans']">Mother Best</h1>
                    <div className="flex w-10 items-center justify-end">
                        <button className="flex items-center justify-center rounded-full w-10 h-10 bg-[#2bee2b]/10 text-slate-900 active:scale-90 transition-all relative">
                            <span className="material-symbols-outlined">notifications</span>
                            {stats.emergencyFollowUps > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                    </div>
                </div>

            </header>

            {/* Main Content Area */}
            <main className="max-w-lg mx-auto p-4 md:pt-8">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'clients' && renderClients()}
                {activeTab === 'history' && renderHistory()}
            </main>

            {/* Bottom Actions & Navigation (Fixed) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#2bee2b]/10 z-50">
                <div className="max-w-lg mx-auto p-4">
                    <button
                        onClick={() => {
                            setNewActivity({ activityType: 'visit' });
                            setIsActivityModalOpen(true);
                        }}
                        className="w-full bg-[#2bee2b] text-slate-900 font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#2bee2b]/20 hover:scale-[0.98] transition-transform active:scale-95"
                    >
                        <span className="material-symbols-outlined">add_location_alt</span>
                        <span className="uppercase tracking-widest text-sm">Log New Visit</span>
                    </button>
                </div>

                {/* Bottom Tab Bar */}
                <nav className="flex justify-around items-center px-4 pb-4 max-w-lg mx-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-[#2bee2b] scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <span className="material-symbols-outlined">home</span>
                        <span className="text-[10px] font-bold">Home</span>
                    </button>
                    <button onClick={() => setActiveTab('clients')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'clients' ? 'text-[#2bee2b] scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <span className="material-symbols-outlined">group</span>
                        <span className="text-[10px] font-bold">Clients</span>
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-[#2bee2b] scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <span className="material-symbols-outlined">bar_chart</span>
                        <span className="text-[10px] font-bold">Reports</span>
                    </button>
                </nav>
            </div>


            {/* Branded Entry Modal - Matched to Stitch Design */}
            {isActivityModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] animate-fade-in">
                    <div className="w-full max-w-md bg-[#f8f6f6] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl border-t border-white flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center p-4 justify-between">
                            <button onClick={() => setIsActivityModalOpen(false)} className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-slate-700">arrow_back</span>
                            </button>
                            <h3 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 font-['Plus_Jakarta_Sans']">Log Activity</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-12 font-['Plus_Jakarta_Sans']">
                            {/* Segmented Control / Radio Toggles */}
                            <section className="space-y-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Activity Details</h2>
                                <div className="flex p-1 bg-slate-200/50 rounded-xl">
                                    <button
                                        onClick={() => {
                                            setNewActivity({ ...newActivity, activityType: 'visit', userId: '', personName: '', personPhone: '', personAddress: '' });
                                            setCustomerSearchTerm('');
                                        }}
                                        className={`flex grow items-center justify-center h-10 rounded-lg text-sm font-bold transition-all ${newActivity.activityType === 'visit' ? 'bg-white shadow-sm text-[#16a34a]' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        New Contact
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewActivity({ ...newActivity, activityType: 'follow_up' });
                                            setCustomerSearchTerm('');
                                        }}
                                        className={`flex grow items-center justify-center h-10 rounded-lg text-sm font-bold transition-all ${newActivity.activityType === 'follow_up' ? 'bg-white shadow-sm text-[#16a34a]' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Existing Client
                                    </button>
                                </div>
                            </section>

                            <section className="space-y-5">
                                {/* Existing Client Search */}
                                {newActivity.activityType === 'follow_up' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Select Client</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">group</span>
                                            <input
                                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-[#16a34a] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                                                placeholder="Search by name or phone..."
                                                type="text"
                                                value={customerSearchTerm}
                                                onChange={e => {
                                                    setCustomerSearchTerm(e.target.value);
                                                    setIsCustomerSearchOpen(true);
                                                }}
                                                onFocus={() => setIsCustomerSearchOpen(true)}
                                            />
                                            {isCustomerSearchOpen && customerSearchTerm && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                                    {followUps.filter(f => f.customerName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) || f.customerPhone?.includes(customerSearchTerm)).map(customer => (
                                                        <div key={customer.id} className="px-4 py-3 hover:bg-[#16a34a]/5 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0" onClick={() => {
                                                            setNewActivity({ ...newActivity, userId: customer.customerId, personName: customer.customerName, personPhone: customer.customerPhone, personAddress: customer.customerAddress });
                                                            setCustomerSearchTerm(customer.customerName);
                                                            setIsCustomerSearchOpen(false);
                                                        }}>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{customer.customerName}</p>
                                                                <p className="text-[10px] font-medium text-slate-400">{customer.customerPhone}</p>
                                                            </div>
                                                            <span className="material-symbols-outlined text-[#16a34a]">add</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-[#16a34a] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                                            placeholder="Enter full name"
                                            type="text"
                                            value={newActivity.personName}
                                            onChange={e => setNewActivity({ ...newActivity, personName: e.target.value })}
                                            disabled={newActivity.activityType === 'follow_up'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">call</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-[#16a34a] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                                            placeholder="+91 00000 00000"
                                            type="tel"
                                            value={newActivity.personPhone}
                                            onChange={e => setNewActivity({ ...newActivity, personPhone: e.target.value })}
                                            disabled={newActivity.activityType === 'follow_up'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Location</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">map</span>
                                        <input
                                            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-[#16a34a] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                                            placeholder="Detecting current location..."
                                            type="text"
                                            value={newActivity.personAddress}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setNewActivity({ ...newActivity, personAddress: val });
                                                if (val.length > 3) {
                                                    const results = await locationService.searchAddress(val);
                                                    setAddressSuggestions(results);
                                                } else {
                                                    setAddressSuggestions([]);
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const loc = await locationService.getCurrentLocation();
                                                    const rev = await locationService.reverseGeocode(loc.latitude, loc.longitude);
                                                    setNewActivity({ ...newActivity, personAddress: rev.fullAddress || `${loc.latitude}, ${loc.longitude}` });
                                                } catch (e: any) {
                                                    alert(e.message || 'Could not detect location. Please check your browser permissions.');
                                                }
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#16a34a] hover:bg-[#16a34a]/10 p-1 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">my_location</span>
                                        </button>

                                        {/* Address Suggestions Dropdown */}
                                        {addressSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-[110] overflow-hidden max-h-48 overflow-y-auto">
                                                {addressSuggestions.map((suggestion, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="px-4 py-3 hover:bg-[#16a34a]/5 cursor-pointer text-xs font-medium text-slate-700 border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            setNewActivity({ ...newActivity, personAddress: suggestion.display_name });
                                                            setAddressSuggestions([]);
                                                        }}
                                                    >
                                                        {suggestion.display_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Observation / Notes</label>
                                    <textarea
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:border-[#16a34a] outline-none transition-all placeholder:text-slate-400 text-sm font-medium min-h-[100px] resize-none"
                                        placeholder="Add any specific notes about the visit..."
                                        value={newActivity.notes}
                                        onChange={e => setNewActivity({ ...newActivity, notes: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a]">
                                            <span className="material-symbols-outlined">shopping_cart_checkout</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">Sale Closed</p>
                                            <p className="text-[10px] font-medium text-slate-500">Toggle if the deal was completed</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={newActivity.convertedToCustomer}
                                            onChange={e => setNewActivity({ ...newActivity, convertedToCustomer: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16a34a]"></div>
                                    </label>
                                </div>
                            </section>

                            <div className="pt-4">
                                <button
                                    onClick={handleLogActivity}
                                    className="w-full bg-[#16a34a] hover:bg-[#16a34a]/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#16a34a]/20 transition-all active:scale-[0.98]"
                                >
                                    Save Record
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SalesDashboard;
