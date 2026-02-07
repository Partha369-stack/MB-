
import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    UserCheck,
    BarChart3,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronRight,
    TrendingUp,
    Target,
    BookOpen,
    MessageSquare,
    Phone,
    MapPin,
    ArrowLeft,
    Plus,
    Calendar,
    Award,
    LogOut,
    ExternalLink,
    AlertTriangle,
    Bell,
    Eye,
    Activity,
    Menu,
    X
} from 'lucide-react';
import { Card, Button } from './components/Layout';
import { storageService } from './services/storageService';
import { User, SalesTarget, SalesActivity, CustomerFollowUp } from './types';

interface SalesDashboardProps {
    onLogout: () => void;
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ onLogout }) => {
    const [salesPerson, setSalesPerson] = useState<User | null>(storageService.getUser());
    const [targets, setTargets] = useState<SalesTarget[]>([]);
    const [activities, setActivities] = useState<SalesActivity[]>([]);
    const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'follow_ups' | 'activities'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<SalesActivity>>({
        activityType: 'visit',
        notes: '',
        personName: '',
        personPhone: '',
        personAddress: '',
        convertedToCustomer: false,
        userId: ''
    });
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    useEffect(() => {
        if (salesPerson) {
            loadData();
        }
    }, [salesPerson]);

    const loadData = async () => {
        if (!salesPerson) return;

        const allTargets = storageService.getSalesTargets(salesPerson.id);
        setTargets(allTargets);

        const allActivities = storageService.getSalesActivities(salesPerson.id);
        setActivities(allActivities.reverse());

        const followUpData = await storageService.getCustomerFollowUpData(salesPerson.id);
        setFollowUps(followUpData);
    };

    const activeTarget = targets.find(t => t.status === 'active');

    // Calculate statistics
    const stats = {
        totalVisits: activities.filter(a => a.activityType === 'visit').length,
        totalConversions: activities.filter(a => a.convertedToCustomer).length,
        totalFollowUps: activities.filter(a => a.activityType === 'follow_up').length,
        totalCustomers: followUps.length, // Actual customers referred by this salesperson
        emergencyFollowUps: followUps.filter(f => f.needsEmergencyFollowUp).length,
        visitProgress: activeTarget ? (activities.filter(a => a.activityType === 'visit').length / activeTarget.targetVisits) * 100 : 0,
        conversionProgress: activeTarget ? (activities.filter(a => a.convertedToCustomer).length / activeTarget.targetConversions) * 100 : 0
    };

    const handleLogActivity = () => {
        if (!newActivity.personName || !newActivity.personPhone || !newActivity.notes) {
            alert('Please fill all required fields');
            return;
        }

        const activity: SalesActivity = {
            id: 'ACT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            salesPersonId: salesPerson!.id,
            personName: newActivity.personName!,
            personPhone: newActivity.personPhone!,
            personAddress: newActivity.personAddress || '',
            activityType: newActivity.activityType as 'visit' | 'follow_up',
            convertedToCustomer: newActivity.convertedToCustomer || false,
            notes: newActivity.notes!,
            timestamp: new Date().toISOString(),
            userId: newActivity.userId
        };

        storageService.saveSalesActivity(activity);

        // Update target progress if there's an active target
        if (activeTarget) {
            const updatedTarget = { ...activeTarget };
            if (activity.activityType === 'visit') {
                updatedTarget.currentVisits = (updatedTarget.currentVisits || 0) + 1;
            }
            if (activity.convertedToCustomer) {
                updatedTarget.currentConversions = (updatedTarget.currentConversions || 0) + 1;
            }
            storageService.saveSalesTarget(updatedTarget);
        }

        setActivities([activity, ...activities]);
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
        setCustomerSearchTerm('');
        setIsCustomerSearchOpen(false);

        // Reload data
        loadData();
    };

    const handleFollowUpNow = (customer: CustomerFollowUp) => {
        setNewActivity({
            activityType: 'follow_up',
            personName: customer.customerName,
            personPhone: customer.customerPhone,
            personAddress: customer.customerAddress,
            notes: '',
            convertedToCustomer: false,
            userId: customer.customerId
        });
        setIsActivityModalOpen(true);
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Target Card */}
            {activeTarget ? (
                <Card className="p-8 border-none bg-gradient-to-br from-green-700 to-green-900 text-white shadow-2xl shadow-green-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-300 mb-2 block">Activity-Based Performance</span>
                                <h3 className="text-3xl font-serif font-black">Active Target</h3>
                            </div>
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Target className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            {/* Visits Progress */}
                            <div>
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-green-300 mb-4">
                                    <span>Visits Completed</span>
                                    <span>{activeTarget.currentVisits || 0} / {activeTarget.targetVisits}</span>
                                </div>
                                <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-1000"
                                        style={{ width: `${Math.min(100, stats.visitProgress)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Conversions Progress */}
                            <div>
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-green-300 mb-4">
                                    <span>Conversions Achieved</span>
                                    <span>{activeTarget.currentConversions || 0} / {activeTarget.targetConversions}</span>
                                </div>
                                <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-green-300 rounded-full shadow-[0_0_20px_rgba(134,239,172,0.6)] transition-all duration-1000"
                                        style={{ width: `${Math.min(100, stats.conversionProgress)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <BookOpen className="w-5 h-5 text-green-400" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Instructions</h4>
                            </div>
                            <p className="text-sm font-medium text-green-100 leading-relaxed italic">
                                "{activeTarget.instructions}"
                            </p>
                            <p className="text-[10px] font-bold text-green-400 mt-4 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Ends: {new Date(activeTarget.endDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="p-12 border-dashed border-2 border-slate-200 bg-slate-50 text-center">
                    <Award className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-xl font-serif font-black text-slate-900 mb-2">No Active Target</h3>
                    <p className="text-slate-400 text-sm font-medium">Wait for Admin to assign your next goal.</p>
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Total Visits", value: stats.totalVisits, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Total Customers", value: stats.totalCustomers, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Follow-Ups Done", value: stats.totalFollowUps, icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Emergency Follow-Ups", value: stats.emergencyFollowUps, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" }
                ].map((s, i) => (
                    <Card key={i} className="p-6 border-slate-100 hover:shadow-lg transition-all group">
                        <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-serif font-black text-slate-900">{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Emergency Follow-Ups Alert */}
            {stats.emergencyFollowUps > 0 && (
                <Card className="p-6 border-red-200 bg-red-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-base font-black text-red-900 uppercase tracking-tight">Urgent Action Required!</h4>
                            <p className="text-sm text-red-700 font-medium mt-1">
                                {stats.emergencyFollowUps} customer(s) haven't purchased in 30+ days. Check Follow-Ups tab for details.
                            </p>
                        </div>
                        <Button
                            className="h-10 rounded-xl bg-red-600"
                            onClick={() => setActiveTab('follow_ups')}
                        >
                            <Eye className="w-4 h-4 mr-2" /> View Now
                        </Button>
                    </div>
                </Card>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 gap-6 lg:gap-8">
                <Card className="p-6 md:p-8 border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-serif font-black text-slate-900">Recent Activities</h3>
                        <Button
                            variant="outline"
                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            onClick={() => setActiveTab('activities')}
                        >
                            View All
                        </Button>
                    </div>
                    <div className="space-y-6">
                        {activities.slice(0, 5).length === 0 ? (
                            <p className="text-center py-10 text-slate-400 font-medium italic">No activities logged yet.</p>
                        ) : (
                            activities.slice(0, 5).map(act => (
                                <div key={act.id} className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] ${act.activityType === 'visit' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                        }`}>
                                        {act.activityType === 'visit' ? 'V' : 'F'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">
                                            {act.activityType === 'visit' ? 'Visit' : 'Follow-Up'}
                                            <span className="text-slate-400 mx-2">•</span>
                                            <span className="text-green-700">{act.personName}</span>
                                            {act.convertedToCustomer && (
                                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded">
                                                    Converted
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">{act.notes}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">
                                            {new Date(act.timestamp).toLocaleDateString()} at {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                <Card className="p-8 border-slate-100 bg-slate-50/50">
                    <div className="text-center py-10">
                        <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-serif font-black text-slate-900 mb-2">Need Help?</h3>
                        <p className="text-slate-500 text-sm font-medium mb-8">Contact support for assistance with your targets.</p>
                        <Button
                            className="w-full h-12 rounded-2xl bg-slate-900 shadow-xl shadow-slate-900/10"
                            onClick={() => window.open('https://wa.me/917397022022')}
                        >
                            Contact Support
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderVisits = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-black text-slate-900">Track Your Visits</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">Log visits and conversions here</p>
                </div>
                <Button
                    className="h-12 rounded-2xl bg-green-700 shadow-xl shadow-green-900/10"
                    onClick={() => setIsActivityModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Log New Visit
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {activities.filter(a => a.activityType === 'visit').length === 0 ? (
                    <Card className="py-20 text-center border-dashed border-2 border-slate-100">
                        <MapPin className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No visits recorded yet</p>
                    </Card>
                ) : (
                    activities.filter(a => a.activityType === 'visit').map(act => (
                        <Card key={act.id} className="p-6 border-slate-100 hover:shadow-md transition-all">
                            <div className="flex gap-6">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border bg-blue-50 text-blue-600 border-blue-100">
                                    <MapPin className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                Visit to {act.personName}
                                                {act.convertedToCustomer && (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-lg">
                                                        ✓ Converted
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {act.personPhone} • {new Date(act.timestamp).toLocaleString()}
                                            </p>
                                            {act.personAddress && (
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {act.personAddress}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-3 py-1 rounded-lg uppercase tracking-widest">
                                            ID: {act.id}
                                        </span>
                                    </div>
                                    <p className="bg-slate-50/50 p-4 rounded-2xl italic text-sm text-slate-600 border border-slate-50 leading-relaxed">
                                        "{act.notes}"
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );

    const renderFollowUps = () => (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-serif font-black text-slate-900">Customer Follow-Ups</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Track customers who need attention</p>
            </div>

            {/* Emergency Follow-Ups */}
            {followUps.filter(f => f.needsEmergencyFollowUp).length > 0 && (
                <div>
                    <h3 className="text-lg font-black text-red-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Emergency Follow-Ups (30+ Days)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {followUps.filter(f => f.needsEmergencyFollowUp).map(customer => (
                            <Card key={customer.id} className="p-6 border-red-200 bg-red-50 hover:shadow-lg transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                                        {customer.customerName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-red-900 text-base">{customer.customerName}</h4>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs text-red-700 font-bold flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {customer.lastPurchaseDate
                                                    ? `${customer.daysSinceLastPurchase} days since last purchase`
                                                    : 'Never purchased'}
                                            </p>
                                        </div>
                                        <Button
                                            className="mt-4 h-9 rounded-xl bg-red-600 w-full"
                                            onClick={() => handleFollowUpNow(customer)}
                                        >
                                            <Phone className="w-3 h-3 mr-2" /> Follow Up Now
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Customers */}
            {followUps.filter(f => !f.needsEmergencyFollowUp).length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" /> Active Customers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {followUps.filter(f => !f.needsEmergencyFollowUp).map(customer => (
                            <Card key={customer.id} className="p-6 border-slate-100 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-black text-sm">
                                        {customer.customerName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{customer.customerName}</h4>
                                        <p className="text-[9px] text-slate-400 font-black uppercase">
                                            {customer.lastPurchaseDate
                                                ? `${customer.daysSinceLastPurchase} days ago`
                                                : 'No purchases'}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-600 rounded-full transition-all"
                                        style={{ width: `${Math.max(0, 100 - (customer.daysSinceLastPurchase / 30 * 100))}%` }}
                                    ></div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {followUps.length === 0 && (
                <Card className="py-20 text-center border-dashed border-2 border-slate-100">
                    <Users className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No customers to track yet</p>
                </Card>
            )}
        </div>
    );

    const renderActivities = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 gap-4">
                {activities.length === 0 ? (
                    <Card className="py-20 text-center border-dashed border-2 border-slate-100">
                        <Calendar className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No activities recorded in your log</p>
                    </Card>
                ) : (
                    activities.map(act => (
                        <Card key={act.id} className="p-6 border-slate-100 hover:shadow-md transition-all">
                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${act.activityType === 'visit'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-purple-50 text-purple-600 border-purple-100'
                                    }`}>
                                    {act.activityType === 'visit' ? <MapPin className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                                {act.activityType === 'visit' ? 'Field Visit' : 'Follow-Up Call'}
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {act.personName} • {act.personPhone} • {new Date(act.timestamp).toLocaleString()}
                                            </p>
                                            {act.personAddress && (
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {act.personAddress}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {act.convertedToCustomer && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-lg">
                                                    ✓ Converted
                                                </span>
                                            )}
                                            <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-3 py-1 rounded-lg uppercase tracking-widest">
                                                {act.id}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="bg-slate-50/50 p-4 rounded-2xl italic text-sm text-slate-600 border border-slate-50 leading-relaxed">
                                        "{act.notes}"
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#FDFCF9]">
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo.jpg" className="w-10 h-10 rounded-full object-cover" alt="Logo" />
                    <div>
                        <span className="block font-serif text-lg font-black text-slate-900">Sales</span>
                        <span className="text-[8px] font-black uppercase text-green-600 tracking-wider">Executive</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all"
                >
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`w-full lg:w-72 bg-white border-r border-slate-100 p-6 lg:p-8 flex flex-col fixed h-full z-40 lg:static transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-md flex items-center justify-center shrink-0">
                        <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
                    </div>
                    <div>
                        <span className="block font-serif text-2xl font-black text-slate-900 leading-none">Sales</span>
                        <span className="text-[9px] font-black uppercase text-green-600 tracking-[0.2em] mt-1 block">Executive</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'overview' ? 'bg-green-700 text-white shadow-xl shadow-green-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Dashboard</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('visits'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'visits' ? 'bg-green-700 text-white shadow-xl shadow-green-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <MapPin className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">My Visits</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('follow_ups'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative ${activeTab === 'follow_ups' ? 'bg-green-700 text-white shadow-xl shadow-green-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Follow-Ups</span>
                        {stats.emergencyFollowUps > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                {stats.emergencyFollowUps}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab('activities'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'activities' ? 'bg-green-700 text-white shadow-xl shadow-green-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Activity Log</span>
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-slate-400 hover:bg-slate-50 hover:text-slate-900 border-t border-slate-50 mt-4 pt-6"
                    >
                        <ExternalLink className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">View Website</span>
                    </button>
                </nav>

                <div className="pt-8 border-t border-slate-50 space-y-3">
                    <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                {salesPerson?.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{salesPerson?.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase">ID: {salesPerson?.id.slice(-6)}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black text-[11px] uppercase tracking-widest"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 pt-20 md:p-6 lg:p-14 lg:pt-14 overflow-y-auto">
                <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 lg:mb-12">
                    <div>
                        <h1 className="font-serif text-2xl md:text-3xl lg:text-5xl font-black text-slate-900">
                            {activeTab === 'overview' && "Performance Overview"}
                            {activeTab === 'visits' && "My Visits"}
                            {activeTab === 'follow_ups' && "Customer Follow-Ups"}
                            {activeTab === 'activities' && "Activity Timeline"}
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                            Activity-Based Sales Tracking
                        </p>
                    </div>
                </header>

                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'visits' && renderVisits()}
                {activeTab === 'follow_ups' && renderFollowUps()}
                {activeTab === 'activities' && renderActivities()}
            </main>

            {/* Activity Modal */}
            {isActivityModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-2xl p-6 md:p-8 shadow-2xl animate-scale-in border-none rounded-3xl md:rounded-[2.5rem] bg-white my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-serif font-black text-slate-900">Log New Activity</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Track Your Field Work</p>
                            </div>
                            <button
                                onClick={() => setIsActivityModalOpen(false)}
                                className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Activity Type */}
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Activity Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['visit', 'follow_up'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setNewActivity({
                                                    ...newActivity,
                                                    activityType: type,
                                                    // Clear fields if switching to follow-up to force selection, 
                                                    // but keep the person details if switching back to visit? 
                                                    // Actually, user wants follow-up to be different.
                                                    ...(type === 'follow_up' ? { userId: '', personName: '', personPhone: '', personAddress: '' } : {})
                                                });
                                                setCustomerSearchTerm('');
                                            }}
                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newActivity.activityType === type
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                                }`}
                                        >
                                            {type === 'visit' ? '🚶 New Visit' : '📞 Follow-Up'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newActivity.activityType === 'follow_up' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Select Customer to Follow Up *</label>
                                        <div
                                            onClick={() => setIsCustomerSearchOpen(!isCustomerSearchOpen)}
                                            className={`w-full h-14 px-4 rounded-2xl bg-slate-50 border-2 flex items-center justify-between cursor-pointer transition-all ${isCustomerSearchOpen ? 'border-green-600 bg-white shadow-lg' : 'border-transparent hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {newActivity.userId ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center font-black text-[10px] text-green-700">
                                                            {newActivity.personName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{newActivity.personName}</p>
                                                            <p className="text-[9px] font-bold text-slate-400">{newActivity.personPhone}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-slate-300 italic text-sm">
                                                        <Search className="w-4 h-4" />
                                                        <span>Select customer...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform ${isCustomerSearchOpen ? 'rotate-90' : ''}`} />
                                        </div>

                                        {isCustomerSearchOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden animate-fade-in-up">
                                                <div className="p-3 border-b border-slate-50">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search customer name or phone..."
                                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl outline-none text-xs font-bold"
                                                            value={customerSearchTerm}
                                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto">
                                                    {followUps
                                                        .filter(f =>
                                                            f.customerName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                                            f.customerPhone.includes(customerSearchTerm)
                                                        )
                                                        .map(customer => (
                                                            <div
                                                                key={customer.customerId}
                                                                onClick={() => {
                                                                    setNewActivity({
                                                                        ...newActivity,
                                                                        userId: customer.customerId,
                                                                        personName: customer.customerName,
                                                                        personPhone: customer.customerPhone,
                                                                        personAddress: customer.customerAddress
                                                                    });
                                                                    setIsCustomerSearchOpen(false);
                                                                }}
                                                                className="px-4 py-3 hover:bg-green-50 transition-all cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                                                                    {customer.customerName.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900">{customer.customerName}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400">{customer.customerPhone}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                    {followUps.length === 0 && (
                                                        <div className="p-8 text-center text-slate-400 text-[10px] font-black uppercase">No customers found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {newActivity.userId && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in">
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saved Address</span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-600">{newActivity.personAddress || 'No address on file'}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Person Name *</label>
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                                value={newActivity.personName}
                                                onChange={(e) => setNewActivity({ ...newActivity, personName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Phone Number *</label>
                                            <input
                                                type="tel"
                                                placeholder="Phone"
                                                className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                                value={newActivity.personPhone}
                                                onChange={(e) => setNewActivity({ ...newActivity, personPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Address</label>
                                        <input
                                            type="text"
                                            placeholder="Full Address"
                                            className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                            value={newActivity.personAddress}
                                            onChange={(e) => setNewActivity({ ...newActivity, personAddress: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Conversion Checkbox */}
                            <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newActivity.convertedToCustomer}
                                        onChange={(e) => setNewActivity({ ...newActivity, convertedToCustomer: e.target.checked })}
                                        className="w-6 h-6 rounded-lg border-2 border-green-300 text-green-600 focus:ring-2 focus:ring-green-500"
                                    />
                                    <div>
                                        <span className="text-sm font-black text-green-900 uppercase tracking-tight">Converted to Customer</span>
                                        <p className="text-xs text-green-700 font-medium">Check if this person became a customer</p>
                                    </div>
                                </label>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Detailed Notes *</label>
                                <textarea
                                    placeholder="Write details of the interaction..."
                                    className="w-full p-5 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-medium text-slate-900 min-h-[150px] transition-all resize-none"
                                    value={newActivity.notes}
                                    onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                                />
                            </div>

                            <Button
                                className="w-full h-14 rounded-2xl bg-green-700 shadow-2xl shadow-green-900/20 uppercase text-[11px] font-black tracking-[0.2em]"
                                onClick={handleLogActivity}
                            >
                                Save Activity Record
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SalesDashboard;
