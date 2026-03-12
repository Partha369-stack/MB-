import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Package,
    ShoppingBag,
    Settings,
    LogOut,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    MoreVertical,
    ChevronRight,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar,
    MapPin,
    Filter,
    History,
    Trash2,
    Edit3,
    PlusCircle,
    RotateCcw,
    Wallet,
    UserCircle,
    Key,
    Eye,
    ShoppingCart,
    Truck,
    Copy,
    Menu,
    Grid,
    Shield,
    Database,
    LayoutPanelLeft,
    ListFilter,
    UserPlus,
    FileText,
    Download,
    Upload,
    MoreHorizontal,
    RefreshCw,
    IndianRupee,
    Box,
    Star,
    MessageSquare,
    Bell,
    BarChart2,
    BarChart3,
    Briefcase,
    Zap,
    Heart,
    Hash,
    Mail,
    Phone,
    Info,
    ChevronDown,
    Sparkles,
    Plus,
    Target,
    AlertCircle,
    Edit2,
    AlertTriangle,
    ArrowRight,
    LayoutGrid,
    Navigation,
    Check,
    User as UserIcon,
    Moon,
    Sun,
    ShieldCheck
} from 'lucide-react';

import {
    AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';
import { Card, Button } from '../components/Layout';

import { NotificationBell } from '../components/NotificationBell';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { Order, Product, User, Subscription, Authority, SalesTarget, SalesActivity, CODSettlement, Permission } from '../types';
import { notifyOrderStatusChange, notifyDeliveryAssigned, notificationService } from '../services/notificationService';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import AdminSettingsPage from '../components/AdminSettingsPage';


interface AdminDashboardProps {
    user: User | null;
    onLogout: () => void;
    isStandaloneLogistic?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, isStandaloneLogistic }) => {
    const isPrimaryLogistic = user?.role === 'logistic' && user?.role !== 'admin';
    const storedTab = localStorage.getItem('adminActiveTab');
    const [activeTab, setActiveTab] = useState<'stats' | 'analytics' | 'orders' | 'products' | 'users' | 'authority' | 'sales_mgmt' | 'cod' | 'logistics' | 'settings'>(
        isStandaloneLogistic ? 'logistics' : (isPrimaryLogistic ? 'logistics' : (storedTab as any) || 'stats')
    );
    const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);


    const [orderTab, setOrderTab] = useState<'standard' | 'active_plans' | 'subscription_orders'>('standard');
    const [orders, setOrders] = useState<Order[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [authorities, setAuthorities] = useState<Authority[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDeliveryPerson, setFilterDeliveryPerson] = useState<string>('all');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newMemberData, setNewMemberData] = useState({
        userId: '',
        roles: ['sales'] as string[],
        referralCode: ''
    });
    const [newUserData, setNewUserData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        role: 'customer' as const,
        isActive: true,
        phoneVerified: false
    });
    const [viewingReferralsFor, setViewingReferralsFor] = useState<string | null>(null);
    const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [selectedSalesPerson, setSelectedSalesPerson] = useState<string | null>(null);
    const [newTargetData, setNewTargetData] = useState<Partial<SalesTarget>>({
        targetAmount: 10000,
        instructions: '',
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });
    const [salesActivities, setSalesActivities] = useState<SalesActivity[]>([]);
    const [salesTab, setSalesTab] = useState<'targets' | 'activities' | 'insights'>('targets');
    const [codSettlements, setCodSettlements] = useState<CODSettlement[]>([]);
    const [codView, setCodView] = useState<'pending' | 'settled'>('pending');
    const [deliveryTab, setDeliveryTab] = useState<'overview' | 'routing' | 'all' | 'cod'>('overview');
    const [selectedMissionOrder, setSelectedMissionOrder] = useState<Order | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [staffCODStats, setStaffCODStats] = useState<Record<string, any>>({});
    const [products, setProducts] = useState<Product[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
        name: '',
        price: 0,
        unit: 'kg',
        category: 'Laundry',
        description: '',
        imageUrl: '',
        isAvailable: true,
        stockQuantity: 0
    });
    const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try { return localStorage.getItem('admin_dark_mode') === 'true'; } catch { return false; }
    });
    const [primaryDeliveryDate, setPrimaryDeliveryDate] = useState<number>(() => {
        try { return parseInt(localStorage.getItem('admin_primary_delivery_date') || '5', 10); } catch { return 5; }
    });
    const [secondaryDeliveryDate, setSecondaryDeliveryDate] = useState<number>(() => {
        try { return parseInt(localStorage.getItem('admin_secondary_delivery_date') || '20', 10); } catch { return 20; }
    });
    const [avatarPresets, setAvatarPresets] = useState<{ id: string; url: string; isActive: boolean }[]>([]);
    const [isUploadingPreset, setIsUploadingPreset] = useState(false);
    const userSelectRef = useRef<HTMLDivElement>(null);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const next = !prev;
            try { localStorage.setItem('admin_dark_mode', String(next)); } catch { }
            return next;
        });
    };

    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [normalOrderAlert, setNormalOrderAlert] = useState(false);
    const [openUserMenuId, setOpenUserMenuId] = useState<string | null>(null);
    const [missionSearchQuery, setMissionSearchQuery] = useState('');
    const [missionBoardSearchQuery, setMissionBoardSearchQuery] = useState('');
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [subscriptionAlert, setSubscriptionAlert] = useState(false);
    const prevNormalCount = useRef(0);
    const prevSubCount = useRef(0);
    const [newOrderToast, setNewOrderToast] = useState<{
        orderId?: string;
        customerName?: string;
        amount?: number;
        visible: boolean;
    }>({ visible: false });
    const newOrderToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastOrderIdRef = useRef<string | null>(null);
    const initialLoadRef = useRef(true);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        const activeNormal = orders.filter(o => ['pending', 'assigned', 'out_for_delivery'].includes(o.status)).length;
        if (activeNormal > prevNormalCount.current && prevNormalCount.current > 0) {
            setNormalOrderAlert(true);
            setTimeout(() => setNormalOrderAlert(false), 8000);
        }
        prevNormalCount.current = activeNormal;
    }, [orders]);

    useEffect(() => {
        const activeSubs = subscriptions.filter(s => s.status === 'active').length;
        if (activeSubs > prevSubCount.current && prevSubCount.current > 0) {
            setSubscriptionAlert(true);
            setTimeout(() => setSubscriptionAlert(false), 8000);
        }
        prevSubCount.current = activeSubs;
    }, [subscriptions]);

    const RefreshButton = () => (
        <button
            onClick={handleRefresh}
            className={`p-2.5 h-11 w-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-green-700 hover:border-green-200 transition-all shadow-sm group ${isRefreshing ? 'animate-spin border-green-200 text-green-700' : ''}`}
            title="Refresh Data"
        >
            <RefreshCw className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
    );

    useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const generateReferralCode = (name: string) => {
        if (!name) return '';
        // Take up to 3 uppercase letters from the name
        const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
        // Calculate how many numbers we need to reach 5 characters
        const remainingLength = 5 - prefix.length;
        // Generate random numbers for the remaining length
        const numbers = Math.floor(Math.random() * Math.pow(10, remainingLength)).toString().padStart(remainingLength, '0');
        return prefix + numbers;
    };

    useEffect(() => {
        if (newMemberData.role === 'sales' && newMemberData.userId && !newMemberData.referralCode) {
            const user = allUsers.find(u => u.id === newMemberData.userId);
            if (user && user.name) {
                const code = generateReferralCode(user.name);
                setNewMemberData(prev => ({ ...prev, referralCode: code }));
            }
        } else if (newMemberData.role !== 'sales' && newMemberData.referralCode) {
            setNewMemberData(prev => ({ ...prev, referralCode: '' }));
        }
    }, [newMemberData.userId, newMemberData.role, allUsers]);

    const handleAuthError = (err: any) => {
        if (err.message?.includes('JWT expired')) {
            alert('Your session has expired. Please log in again to continue.');
            onLogout();
            return true;
        }
        return false;
    };

    const fetchData = async () => {
        setError(null);
        try {
            // Concurrent fetches for maximum efficiency
            const [ordersData, usersData, subsData, authsData, productsData, targetsData, activitiesData, settlementsData, presetsData] = await Promise.all([
                storageService.getAllOrders(),
                storageService.getUsers(),
                storageService.getAllSubscriptions(),
                storageService.getAuthorities(),
                storageService.getProducts(),
                storageService.getSalesTargets(),
                storageService.getSalesActivities(),
                storageService.getCODSettlements(),
                storageService.getAvatarPresets()
            ]);

            // Set primary states
            setOrders(ordersData);
            setAllUsers(usersData);
            setSubscriptions(subsData);
            setAuthorities(authsData);
            setProducts(productsData);
            setSalesTargets(targetsData);
            setSalesActivities([...activitiesData].reverse());
            setCodSettlements(settlementsData);
            setAvatarPresets(presetsData);

            // ─── Detect New Orders for Toast Notification ───────────────────
            if (ordersData.length > 0) {
                const latest = ordersData[0];
                // Trigger toast ONLY on brand new ID arrival after initial load
                if (!initialLoadRef.current && lastOrderIdRef.current && latest.id !== lastOrderIdRef.current) {
                    const customer = usersData.find(u => u.id === latest.userId);

                    setNewOrderToast({
                        orderId: latest.id,
                        customerName: customer?.name || 'Guest Customer',
                        amount: latest.total,
                        visible: true
                    });

                    // Clear old timer if any
                    if (newOrderToastTimer.current) clearTimeout(newOrderToastTimer.current);

                    // Auto-hide after 8 seconds
                    newOrderToastTimer.current = setTimeout(() => {
                        setNewOrderToast(prev => ({ ...prev, visible: false }));
                    }, 8000);
                }

                // Track latest for next check
                lastOrderIdRef.current = latest.id;
                initialLoadRef.current = false;
            }

            // --- Logistical Stats Calculations ---
            const deliveryStaff = usersData.filter(u =>
                u.role === 'delivery' ||
                authsData.some(a => a.userId === u.id && a.role === 'delivery' && a.isActive)
            );

            const statsMap: Record<string, any> = {};
            for (const staff of deliveryStaff) {
                statsMap[staff.id] = await storageService.getDeliveryPersonCODStats(staff.id);
            }
            setStaffCODStats(statsMap);
        } catch (error: any) {
            console.error("Error fetching admin data:", error);
            handleAuthError(error);
        }
    };

    const currentUserRoles = authorities.filter(a => a.userId === user?.id).map(a => a.role);
    const isAdmin = user?.role === 'admin' || currentUserRoles.includes('admin');
    const isSales = currentUserRoles.includes('sales');
    const isDelivery = currentUserRoles.includes('delivery');
    const isLogistic = currentUserRoles.includes('logistic');

    // Automatically set default tab for logistic users if they land on stats
    useEffect(() => {
        const userIsLogisticPrimary = user?.role === 'logistic';
        if ((userIsLogisticPrimary || isLogistic) && !isAdmin && activeTab === 'stats') {
            setActiveTab('logistics');
        }
    }, [isLogistic, isAdmin, activeTab, user?.role]);

    // Save active tab to localStorage so it persists across refreshes
    useEffect(() => {
        if (activeTab) {
            localStorage.setItem('adminActiveTab', activeTab);
        }
    }, [activeTab]);

    useEffect(() => {
        // Initial data load
        fetchData();

        // --- Real-time WebSocket Subscriptions (instant push) ---
        let _unsubOrders: (() => void) | null = null;
        let _unsubSubs: (() => void) | null = null;

        const setupRealtime = async () => {
            const tables = ['orders', 'subscriptions', 'profiles', 'products', 'authorities', 'sales_targets', 'sales_activities', 'cod_settlements', 'customer_follow_ups'];
            const unsubscribers = await Promise.all(
                tables.map(table =>
                    storageService.subscribeToRealtimeTable(table, () => {
                        console.log(`[Realtime] Update detected in ${table}`);
                        fetchData();
                    })
                )
            );

            // 🔴 INSTANT delivery status channel — zero-delay updates for Active Core
            const unsubDeliveryStatus = await storageService.subscribeToRealtimeTable(
                'delivery_status',
                (payload: any) => {
                    console.log('[Realtime] 🚀 Delivery status change received:', payload);
                    const { userId, isAvailable } = payload || {};
                    if (userId !== undefined && isAvailable !== undefined) {
                        // Instant in-place state update — no network round-trip
                        setAllUsers(prev => prev.map(u =>
                            u.id === userId ? { ...u, isAvailable } : u
                        ));
                    }
                    // Also do a full refetch to keep everything in sync
                    fetchData();
                }
            );

            return () => {
                unsubscribers.forEach(unsub => unsub());
                unsubDeliveryStatus();
            };
        };

        const cleanupPromise = setupRealtime();

        // --- Polling fallback (every 30 seconds) ---
        // Reduced frequency since we have full real-time coverage now
        const interval = setInterval(fetchData, 30000);

        return () => {
            clearInterval(interval);
            cleanupPromise.then(unsub => unsub());
            if (newOrderToastTimer.current) clearTimeout(newOrderToastTimer.current);
        };
    }, []);


    useEffect(() => {
        setSearchQuery('');
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
                setIsUserSelectOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setOpenUserMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const handleConfirmReturn = async (orderId: string) => {
        if (!window.confirm("Confirm that this returned order has been officially received at the warehouse?")) return;
        try {
            const orderToUpdate = orders.find(o => o.id === orderId);
            if (!orderToUpdate) return;

            const updatedOrder = { ...orderToUpdate, returnConfirmed: true };
            await storageService.saveOrder(updatedOrder);

            // Publish for real-time UI refresh on both ends
            storageService.publishOrderStatusUpdate(orderId, orderToUpdate.status, orderToUpdate.userId).catch(() => { });

            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));

            // Notify delivery person that their return was acknowledged
            if (orderToUpdate.deliveryPersonId) {
                notificationService.createNotification({
                    userId: orderToUpdate.deliveryPersonId,
                    title: '✅ Return Acknowledged',
                    message: `Admin officially confirmed receipt of the return for order #${orderId.toUpperCase()}. Your mission is fully reconciled.`,
                    type: 'system',
                    relatedId: orderId,
                    relatedType: 'order'
                }).catch(() => { });
            }
        } catch (err) {
            console.error("Confirmation failed:", err);
            alert("Failed to confirm return.");
            fetchData();
        }
    };

    const stats = [
        {
            label: 'Total Revenue',
            value: `₹${codSettlements.filter(s => s.status === 'settled').reduce((acc, s) => acc + s.amount, 0).toLocaleString('en-IN')}`,
            icon: IndianRupee,
            color: 'text-emerald-700',
            bg: 'from-emerald-500/10 to-emerald-500/5',
            accent: 'bg-emerald-500',
            description: 'Settled cash collection',
            trend: '+12.5%',
            gradient: 'from-emerald-500 to-teal-600'
        },
        {
            label: 'Active Orders',
            value: orders.filter(o => ['pending', 'assigned', 'out_for_delivery'].includes(o.status)).length + subscriptions.filter(s => s.status === 'active').length,
            split: {
                normal: orders.filter(o => ['pending', 'assigned', 'out_for_delivery'].includes(o.status)).length,
                subs: subscriptions.filter(s => s.status === 'active').length
            },
            icon: ShoppingBag,
            color: 'text-red-700',
            bg: 'from-red-500/10 to-red-500/5',
            accent: 'bg-red-500',
            description: 'Currently in progress',
            gradient: 'from-rose-500 to-red-600'
        },
        {
            label: 'Successful Orders',
            value: orders.filter(o => o.status === 'delivered').length.toLocaleString('en-IN'),
            icon: CheckCircle2,
            color: 'text-green-700',
            bg: 'from-green-500/10 to-green-500/5',
            accent: 'bg-green-500',
            description: 'Total orders delivered',
            trend: 'Overall',
            gradient: 'from-green-500 to-emerald-600'
        },
        {
            label: 'Total Customers',
            value: allUsers.filter(u => u.role !== 'admin').length.toLocaleString('en-IN'),
            icon: Users,
            color: 'text-blue-700',
            bg: 'from-blue-500/10 to-blue-500/5',
            accent: 'bg-blue-500',
            description: 'Registered users',
            trend: 'Active',
            gradient: 'from-blue-500 to-indigo-600'
        },
    ];


    const renderStats = () => {
        const getAnalyticsData = () => {
            let data: { name: string, revenue: number, customers: number }[] = [];
            const now = new Date();
            const customers = allUsers.filter(u => u.role === 'customer');

            if (dateFilter === 'day') {
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
                    const startTime = new Date(now.getTime() - (i + 1) * 4 * 60 * 60 * 1000);
                    const timeLabel = d.getHours() + ":00";
                    const rev = orders.filter(o => {
                        const od = new Date(o.createdAt);
                        return od > startTime && od <= d;
                    }).reduce((acc, o) => acc + o.total, 0);
                    const count = customers.filter(u => {
                        if (!u.createdAt) return false;
                        const cd = new Date(u.createdAt);
                        return cd > startTime && cd <= d;
                    }).length;
                    data.push({ name: timeLabel, revenue: rev, customers: count });
                }
            } else if (dateFilter === 'week') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const rev = orders.filter(o => {
                        const od = new Date(o.createdAt);
                        return od.toDateString() === d.toDateString();
                    }).reduce((acc, o) => acc + o.total, 0);
                    const count = customers.filter(u => {
                        if (!u.createdAt) return false;
                        const cd = new Date(u.createdAt);
                        return cd.toDateString() === d.toDateString();
                    }).length;
                    data.push({ name: label, revenue: rev, customers: count });
                }
            } else if (dateFilter === 'month') {
                for (let i = 3; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (i * 7));
                    const startTime = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
                    const label = `W${4 - i}`;
                    const rev = orders.filter(o => {
                        const od = new Date(o.createdAt);
                        return od > startTime && od <= d;
                    }).reduce((acc, o) => acc + o.total, 0);
                    const count = customers.filter(u => {
                        if (!u.createdAt) return false;
                        const cd = new Date(u.createdAt);
                        return cd > startTime && cd <= d;
                    }).length;
                    data.push({ name: label, revenue: rev, customers: count });
                }
            } else if (dateFilter === 'custom') {
                const s = new Date(startDate);
                const e = new Date(endDate);
                const diffDays = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
                const steps = Math.min(diffDays + 1, 7);
                const interval = Math.max(1, Math.floor(diffDays / steps));

                for (let i = 0; i < steps; i++) {
                    const d = new Date(s);
                    d.setDate(d.getDate() + (i * interval));
                    const nextD = new Date(d.getTime() + interval * 24 * 60 * 60 * 1000);
                    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const rev = orders.filter(o => {
                        const od = new Date(o.createdAt);
                        return od >= d && od < nextD;
                    }).reduce((acc, o) => acc + o.total, 0);
                    const count = customers.filter(u => {
                        if (!u.createdAt) return false;
                        const cd = new Date(u.createdAt);
                        return cd >= d && cd < nextD;
                    }).length;
                    data.push({ name: label, revenue: rev, customers: count });
                }
            }
            return data.map(d => ({ ...d, revenue: d.revenue || 0, customers: d.customers || 0 }));
        };

        const analyticsData = getAnalyticsData();
        const totalRev = analyticsData.reduce((acc, d) => acc + d.revenue, 0);
        const totalNewCustomers = analyticsData.reduce((acc, d) => acc + d.customers, 0);



        return (
            <div className="space-y-6 animate-fade-in">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <Card
                            key={i}
                            onClick={() => stat.label === 'Active Orders' && setActiveTab('orders')}
                            className={`group relative overflow-hidden border-none p-0 bg-white shadow-lg hover:shadow-xl transition-all duration-500 rounded-3xl
                        ${stat.label === 'Active Orders' ? 'cursor-pointer' : ''}
                        ${(stat.label === 'Active Orders' && (normalOrderAlert || subscriptionAlert)) ? 'ring-2 ring-amber-400/50 animate-pulse' : ''}`}
                        >
                            {/* Gradient Backdrop */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-40 group-hover:opacity-60 transition-opacity`} />

                            {/* ALERT SIGNAL INDICATOR */}
                            {stat.label === 'Active Orders' && (normalOrderAlert || subscriptionAlert) && (
                                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2 py-1 bg-amber-500 rounded-full shadow-lg shadow-amber-200 animate-bounce">
                                    <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">New</span>
                                </div>
                            )}

                            {/* Animated Glowing Orb */}
                            <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${stat.gradient} opacity-20 blur-3xl group-hover:scale-150 transition-transform duration-1000`} />

                            <div className="relative z-10 p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2.5 rounded-2xl bg-white shadow-md shadow-slate-100/50 ${stat.color} group-hover:scale-105 transition-all duration-500`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    {stat.trend && (
                                        <div className="px-1.5 py-0.5 rounded-lg bg-white/70 backdrop-blur-md border border-white/50 text-[8px] font-black tracking-wider text-slate-600">
                                            {stat.trend}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{stat.label}</p>
                                    <h3 className="text-2xl font-serif font-black text-slate-900 tracking-tight">{stat.value}</h3>
                                </div>

                                {stat.split ? (
                                    <div className="mt-5 space-y-3">
                                        <div className="space-y-2">
                                            {/* Primary Focus: Normal Orders */}
                                            <div className={`flex items-center justify-between p-2.5 rounded-xl transition-all border ${normalOrderAlert ? 'bg-red-50 border-red-200 scale-[1.02]' : 'bg-white border-red-100 shadow-sm'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${normalOrderAlert ? 'bg-red-500 animate-ping' : 'bg-red-600 shadow-sm'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${normalOrderAlert ? 'text-red-600' : 'text-slate-500'}`}>Standard</span>
                                                </div>
                                                <span className={`text-lg font-black ${normalOrderAlert ? 'text-red-700' : 'text-red-700'}`}>{stat.split.normal}</span>
                                            </div>

                                            {/* Low Focus: Subs */}
                                            <div className="flex items-center justify-between px-3 py-1 opacity-50 hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Subs</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-600">{stat.split.subs}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-3 border-t border-slate-100/50">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">{stat.description}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Performance Overview (Unified Analytics) - Shorter Height */}
                    <Card className="lg:col-span-2 p-0 border-slate-100 shadow-sm bg-white overflow-hidden relative min-h-[420px] flex flex-col">
                        <div className="p-6 border-b border-slate-50">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h3 className="font-serif text-lg font-black text-slate-800">Business Momentum</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-2.5 h-2.5 text-green-500" />
                                        Performance Matrix
                                    </p>
                                </div>
                                <div className="flex gap-6 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Revenue</p>
                                        <h4 className="text-lg font-serif font-black text-green-700">₹{totalRev.toLocaleString('en-IN')}</h4>
                                    </div>
                                    <div className="w-px h-full bg-slate-200" />
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">New Users</p>
                                        <h4 className="text-lg font-serif font-black text-blue-700">{totalNewCustomers}</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-lg w-fit">
                                {['day', 'week', 'month'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setDateFilter(f as any)}
                                        className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${dateFilter === f ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 w-full relative group flex flex-col justify-center py-6 px-6">
                            <div className="h-48 lg:h-56 w-full font-sans">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analyticsData}>
                                        <defs>
                                            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#15803d" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="custGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            hide={true}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-xl border border-slate-100 shadow-xl">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{label}</p>
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-[9px] font-black text-green-600 uppercase">Rev: ₹{payload[0].value?.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-[9px] font-black text-blue-600 uppercase">Users: {payload[1]?.value}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#15803d"
                                            strokeWidth={3}
                                            fill="url(#revGradient)"
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="customers"
                                            stroke="#1d4ed8"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            fill="url(#custGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>

                    {/* Recent Orders - Short & Fixed (No Scroll) */}
                    <Card className="lg:col-span-1 p-5 border-slate-100 shadow-sm bg-white flex flex-col h-full bg-gradient-to-b from-white to-slate-50/30">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-serif text-lg font-black text-slate-800">Recent Orders</h3>
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-green-700" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            {orders.filter(o => !(o.orderType === 'Subscription' || !!o.subscriptionId || o.id.startsWith('MBS'))).slice(0, 5).map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-green-100 transition-all group"
                                >
                                    <div className="min-w-0">
                                        <p className={`font-black text-[10px] truncate transition-colors uppercase tracking-wider ${order.orderType === 'Subscription' || order.subscriptionId ? 'text-purple-700 group-hover:text-purple-800' : 'text-slate-900 group-hover:text-green-700'}`}>{order.id.toUpperCase()}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">₹{order.total} • {new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${order.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    Empty Dataset
                                </div>
                            )}
                        </div>

                    </Card>
                </div>
            </div>
        );
    }
        ;

    const renderOrders = () => (
        <div className="h-full flex flex-col gap-6 animate-fade-in overflow-hidden">
            <div className="flex-none flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">

                <button
                    onClick={() => setOrderTab('standard')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderTab === 'standard'
                        ? 'bg-green-700 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    Order Management
                </button>
                <button
                    onClick={() => setOrderTab('active_plans')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderTab === 'active_plans'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    Active Plans
                </button>
                <button
                    onClick={() => setOrderTab('subscription_orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderTab === 'subscription_orders'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    Subscription Orders
                </button>
            </div>

            {orderTab === 'standard' ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search orders, IDs, or customers..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto relative">
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    className={`flex-1 md:flex-none h-11 px-4 rounded-xl text-xs ${filterStatus !== 'all' || filterDeliveryPerson !== 'all' ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    Filter {(filterStatus !== 'all' || filterDeliveryPerson !== 'all') && '(Active)'}
                                </Button>

                                {isFilterDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-4 animate-scale-in">
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter Orders</h4>
                                            <button
                                                onClick={() => {
                                                    setFilterStatus('all');
                                                    setFilterDeliveryPerson('all');
                                                }}
                                                className="text-[9px] font-black text-green-700 uppercase hover:underline"
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Status</label>
                                                <select
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                    className="w-full h-10 px-3 bg-slate-50 border-2 border-transparent focus:border-green-600 rounded-xl text-sm font-bold outline-none transition-all"
                                                >
                                                    <option value="all">All Statuses</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="assigned">Assigned</option>
                                                    <option value="out_for_delivery">Out for Delivery</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="attempted">Attempted</option>
                                                    <option value="returned">Returned</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Partner</label>
                                                <select
                                                    value={filterDeliveryPerson}
                                                    onChange={(e) => setFilterDeliveryPerson(e.target.value)}
                                                    className="w-full h-10 px-3 bg-slate-50 border-2 border-transparent focus:border-green-600 rounded-xl text-sm font-bold outline-none transition-all"
                                                >
                                                    <option value="all">All Partners</option>
                                                    {allUsers.filter(u => u.role === 'delivery').map(driver => (
                                                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full mt-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                            onClick={() => setIsFilterDropdownOpen(false)}
                                        >
                                            Apply Filters
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Button className="flex-1 md:flex-none h-11 px-4 rounded-xl text-xs">Export CSV</Button>
                        </div>
                    </div>

                    <Card className="border-slate-100 flex flex-col flex-1 overflow-hidden shadow-sm">

                        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Order & OTP</th>

                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.filter(o => {
                                        const user = allUsers.find(u => u.id === o.userId);
                                        const searchLower = searchQuery.toLowerCase();
                                        const matchesSearch = (
                                            o.id.toLowerCase().includes(searchLower) ||
                                            o.userId.toLowerCase().includes(searchLower) ||
                                            (user?.name?.toLowerCase().includes(searchLower))
                                        );
                                        const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
                                        const matchesDriver = filterDeliveryPerson === 'all' ||
                                            o.deliveryPersonId === filterDeliveryPerson ||
                                            (user?.assignedDeliveryPersonId === filterDeliveryPerson && !o.deliveryPersonId);

                                        return matchesSearch && matchesStatus && matchesDriver;
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium whitespace-nowrap">
                                                No orders match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.filter(o => {
                                            const user = allUsers.find(u => u.id === o.userId);
                                            const searchClean = searchQuery.toLowerCase().replace(/^#?mb-?/, '');
                                            const matchesSearch = (
                                                o.id.toLowerCase().includes(searchClean) ||
                                                o.userId.toLowerCase().includes(searchClean) ||
                                                (user?.name?.toLowerCase().includes(searchClean)) || (user?.phone?.toLowerCase().includes(searchClean))
                                            );
                                            const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
                                            const matchesDriver = filterDeliveryPerson === 'all' ||
                                                o.deliveryPersonId === filterDeliveryPerson ||
                                                (user?.assignedDeliveryPersonId === filterDeliveryPerson && !o.deliveryPersonId);

                                            return matchesSearch && matchesStatus && matchesDriver;
                                        }).map((order) => {
                                            const user = allUsers.find(u => u.id === order.userId);
                                            const assignedPerson = order.deliveryPersonId
                                                ? allUsers.find(u => u.id?.toLowerCase() === order.deliveryPersonId?.toLowerCase())
                                                : null;

                                            return (
                                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="mb-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.id.toUpperCase()); }}
                                                                className={`group flex flex-shrink-0 items-center justify-center gap-1.5 px-2 py-1 rounded ${order.orderType === 'Subscription' || order.subscriptionId ? 'bg-purple-700' : 'bg-slate-900'} hover:opacity-80 text-[8px] font-black text-white uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95 focus:ring-2 focus:ring-slate-400`}
                                                                title="Copy Mission ID"
                                                            >
                                                                {order.id.toUpperCase()}
                                                                <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        </div>
                                                        {(order.orderType === 'Subscription' || order.subscriptionId) && (
                                                            <div className="mb-2 flex items-center gap-1.5 px-2 py-0.5 bg-purple-100 border border-purple-200 rounded-md w-fit">
                                                                <RefreshCw className="w-2.5 h-2.5 text-purple-700 animate-spin-slow" />
                                                                <span className="text-[8px] font-black text-purple-800 uppercase tracking-widest">Subscription</span>
                                                            </div>
                                                        )}
                                                        {order.deliveryOTP && (
                                                            <div className="mt-1 flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md w-fit">
                                                                <Key className="w-2.5 h-2.5 text-blue-600" />
                                                                <span className="text-[9px] font-black text-blue-700 tracking-wider">Delivery OTP: {order.deliveryOTP}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-600 overflow-hidden shrink-0 border border-white shadow-sm">
                                                                {user?.profilePic ? (
                                                                    <img
                                                                        src={user.profilePic}
                                                                        alt={user.name}
                                                                        className="w-full h-full object-cover object-top"
                                                                    />
                                                                ) : (
                                                                    user?.name?.charAt(0) || '?'
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="text-sm font-bold text-slate-900">{user?.name || 'Anonymous'}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{user?.phone}</p>
                                                                {user?.address && (
                                                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight break-words max-w-[120px]">
                                                                        {user.address}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingOrder(order);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View Full Order
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                            {order.paymentMethod || 'COD'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-green-700 text-sm whitespace-nowrap">₹{order.total}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {(order.deliveryPersonId || user?.assignedDeliveryPersonId) ? (() => {
                                                            const driverId = (order.deliveryPersonId || user?.assignedDeliveryPersonId)?.toLowerCase();
                                                            const driver = allUsers.find(u => u.id?.toLowerCase() === driverId);
                                                            if (!driver) return <span className="text-[10px] text-slate-300 italic">Not assigned</span>;
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 overflow-hidden shrink-0 border border-white shadow-sm">
                                                                        {driver.profilePic ? (
                                                                            <img
                                                                                src={driver.profilePic}
                                                                                alt={driver.name}
                                                                                className="w-full h-full object-cover object-top"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                                    (e.target as HTMLImageElement).parentElement!.innerText = driver.name?.charAt(0) || '?';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            driver.name?.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-bold text-slate-600">{driver.name}</span>
                                                                        {!order.deliveryPersonId && user?.assignedDeliveryPersonId && (
                                                                            <span className="text-[8px] font-black text-green-600 uppercase">Auto-Routed</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })() : (
                                                            <span className="text-[10px] text-slate-300 italic">Not assigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg w-fit ${order.status === 'pending' || order.status === 'confirmed' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                                order.status === 'assigned' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                                                    order.status === 'out_for_delivery' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                                        order.status === 'delivered' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                                            ['attempted', 'returned', 'cancelled'].includes(order.status) ? 'bg-red-50 text-red-700 border border-red-100' :
                                                                                'bg-slate-50 text-slate-700 border border-slate-100'
                                                                }`}>
                                                                {['attempted', 'returned', 'cancelled'].includes(order.status) ? 'Returned' : order.status.replace(/_/g, ' ')}
                                                            </span>

                                                            {['attempted', 'returned', 'cancelled'].includes(order.status) && !order.returnConfirmed && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleConfirmReturn(order.id);
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700 transition-colors shadow-sm w-fit"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                    Confirm Return
                                                                </button>
                                                            )}

                                                            {['pending', 'confirmed', 'assigned'].includes(order.status) && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (order.status === "pending" && window.confirm("Confirm this order and dispatch to delivery team?")) {
                                                                                try {
                                                                                    const updatedOrder = { ...order, status: "confirmed" };
                                                                                    setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
                                                                                    await storageService.saveOrder(updatedOrder);
                                                                                    storageService.publishOrderStatusUpdate(order.id, "confirmed", order.userId).catch(() => { });
                                                                                    notifyOrderStatusChange(order.userId, order.id, "confirmed").catch(() => { });
                                                                                    alert("Order confirmed! Now visible to delivery partner.");
                                                                                } catch (err) {
                                                                                    console.error("Confirm error:", err);
                                                                                    alert("Failed to confirm: " + err.message);
                                                                                    fetchData();
                                                                                }
                                                                            } else if (window.confirm("Are you sure you want to cancel this order?")) {
                                                                                try {
                                                                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' as const } : o));
                                                                                    await storageService.saveOrder({ ...order, status: 'cancelled' as const });
                                                                                    // Notify customer via push notification
                                                                                    notifyOrderStatusChange(order.userId, order.id, 'cancelled').catch(() => { });
                                                                                    // Publish real-time event for instant customer UI update
                                                                                    storageService.publishOrderStatusUpdate(order.id, 'cancelled', order.userId).catch(() => { });
                                                                                } catch (err: any) {
                                                                                    console.error("Cancel error:", err);
                                                                                    alert(`Failed to cancel order: ${err.message || 'Unknown error'}`);
                                                                                    fetchData();
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="text-[8px] font-black uppercase px-2.5 py-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                                                                        >
                                                                            {order.status === 'pending' ? 'Confirm' : 'Cancel'}
                                                                        </button>
                                                                    </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="text-xs font-black text-indigo-700 uppercase tracking-tight">
                                                            {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Scheduled Delivery</p>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}

                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : orderTab === 'active_plans' ? (
                <div className="h-full flex flex-col gap-6 overflow-hidden">
                    <div className="flex-none flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search active plans..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        <Card className="border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recurrence</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {subscriptions.filter(s => {
                                            const user = allUsers.find(u => u.id === s.userId);
                                            const searchLower = searchQuery.toLowerCase();
                                            return (
                                                s.id.toLowerCase().includes(searchLower) ||
                                                (user?.name?.toLowerCase().includes(searchLower)) ||
                                                (user?.phone?.includes(searchLower))
                                            );
                                        }).reverse().length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">No active plans found.</td>
                                            </tr>
                                        ) : (
                                            subscriptions.filter(s => {
                                                const user = allUsers.find(u => u.id === s.userId);
                                                const searchLower = searchQuery.toLowerCase();
                                                return (
                                                    s.id.toLowerCase().includes(searchLower) ||
                                                    (user?.name?.toLowerCase().includes(searchLower)) ||
                                                    (user?.phone?.includes(searchLower))
                                                );
                                            }).reverse().map((sub) => {
                                                const customer = allUsers.find(u => u.id === sub.userId);
                                                return (
                                                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] font-black text-slate-900">{sub.id}</td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-900">{customer?.name || 'Unknown'}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{customer?.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-[11px] font-black text-purple-700 uppercase tracking-wider">{sub.frequency}</p>
                                                            <p className="text-[10px] font-bold text-slate-600">{sub.products.length} products</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-black text-slate-700">Day {sub.deliveryDate}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${sub.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                {sub.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <Button 
                                                                    variant="outline" 
                                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg"
                                                                    onClick={async () => {
                                                                        await storageService.updateSubscription({ id: sub.id, status: sub.status === 'active' ? 'paused' : 'active' });
                                                                        fetchData();
                                                                    }}
                                                                >
                                                                    {sub.status === 'active' ? 'Pause' : 'Activate'}
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col gap-6 overflow-hidden">
                    <div className="flex-none flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search subscription orders..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Today's date badge */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border border-purple-100 rounded-2xl shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">
                                    Today's Deliveries
                                </span>
                                <span className="text-[10px] font-bold text-purple-400">
                                    — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        <Card className="border-slate-100 shadow-sm overflow-hidden mb-8">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(() => {
                                            // Helper: check if a date string is today (IST-aware)
                                            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                                            const isToday = (dateStr: string) => {
                                                if (!dateStr) return false;
                                                return new Date(dateStr).toLocaleDateString('en-CA') === todayStr;
                                            };

                                            const todaySubOrders = orders
                                                .filter(o => (o.orderType === 'Subscription' || o.id.startsWith('MBS') || o.subscriptionId))
                                                .filter(o => isToday(o.deliveryDate))
                                                .filter(o => {
                                                    const user = allUsers.find(u => u.id === o.userId);
                                                    const searchLower = searchQuery.toLowerCase();
                                                    return (
                                                        !searchLower ||
                                                        o.id.toLowerCase().includes(searchLower) ||
                                                        o.userId.toLowerCase().includes(searchLower) ||
                                                        (user?.name?.toLowerCase().includes(searchLower))
                                                    );
                                                })
                                                .reverse();

                                            if (todaySubOrders.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-16 text-center">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                                                                    <span className="text-2xl">📦</span>
                                                                </div>
                                                                <p className="text-slate-500 font-bold text-sm">No subscription deliveries due today.</p>
                                                                <p className="text-slate-400 text-xs font-medium">Subscription orders scheduled for today will appear here.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return todaySubOrders.map((order) => {
                                                const user = allUsers.find(u => u.id === order.userId);
                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 bg-purple-700 text-white text-[9px] font-black rounded uppercase tracking-widest">{order.id}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-900">{user?.name || 'Unknown'}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{user?.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-black text-slate-900">₹{order.total}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                                                order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                                                                order.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-700' :
                                                                'bg-amber-50 text-amber-700'
                                                            }`}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-black text-purple-700">
                                                                {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100">
                                                                Due Today
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg"
                                                                        onClick={() => {
                                                                            setOrderTab('standard');
                                                                            setViewingOrder(order);
                                                                        }}
                                                                    >
                                                                        View detail
                                                                    </Button>

                                                                    {['pending', 'confirmed', 'assigned'].includes(order.status) && (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if (order.status === "pending" && window.confirm("Confirm this subscription delivery and dispatch to delivery team?")) {
                                                                                    try {
                                                                                        const updatedOrder = { ...order, status: "confirmed" as const };
                                                                                        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
                                                                                        await storageService.saveOrder(updatedOrder);
                                                                                        storageService.publishOrderStatusUpdate(order.id, "confirmed", order.userId).catch(() => { });
                                                                                        notifyOrderStatusChange(order.userId, order.id, "confirmed").catch(() => { });
                                                                                        alert("Subscription delivery confirmed!");
                                                                                    } catch (err: any) {
                                                                                        console.error("Confirm error:", err);
                                                                                        alert("Failed to confirm: " + err.message);
                                                                                        fetchData();
                                                                                    }
                                                                                } else if (window.confirm("Are you sure you want to cancel this delivery?")) {
                                                                                    try {
                                                                                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' as const } : o));
                                                                                        await storageService.saveOrder({ ...order, status: 'cancelled' as const });
                                                                                        notifyOrderStatusChange(order.userId, order.id, 'cancelled').catch(() => { });
                                                                                        storageService.publishOrderStatusUpdate(order.id, 'cancelled', order.userId).catch(() => { });
                                                                                    } catch (err: any) {
                                                                                        console.error("Cancel error:", err);
                                                                                        alert(`Failed to cancel: ${err.message || 'Unknown error'}`);
                                                                                        fetchData();
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="text-[8px] font-black uppercase px-2.5 py-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                                                                        >
                                                                            {order.status === 'pending' ? 'Confirm' : 'Cancel'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Viewing Order Popup Modal */}
            {viewingOrder && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300"
                    onClick={() => setViewingOrder(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white flex flex-col md:max-h-[85vh] animate-modal-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative p-10 pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-slate-950 flex items-center justify-center shadow-2xl shadow-slate-900/40 border border-white/10">
                                        <ShoppingBag className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-serif font-black text-slate-950 leading-none tracking-tight">Order Details</h3>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shadow-inner">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Active</span>
                                            </div>
                                        </div>
                                        <div className="mt-2.5">
                                            <div className="flex items-center gap-2 group/id">
                                                <div className={`${viewingOrder.orderType === 'Subscription' || viewingOrder.subscriptionId ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'} px-3 py-1.5 rounded-xl border flex items-center gap-3`}>
                                                    <p className={`text-sm font-black font-mono tracking-tight uppercase leading-none ${viewingOrder.orderType === 'Subscription' || viewingOrder.subscriptionId ? 'text-purple-900' : 'text-slate-900'}`}>
                                                        {viewingOrder.id.toUpperCase()}
                                                    </p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(viewingOrder.id.toUpperCase()); }}
                                                        className="text-slate-300 hover:text-slate-900 transition-colors"
                                                        title="Copy ID"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingOrder(null)}
                                    className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90 border border-slate-100 shadow-sm"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="px-8 pb-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                            {/* Top Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Detail Card */}
                                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                                {(allUsers.find(u => u.id === viewingOrder.userId))?.profilePic ? (
                                                    <img src={(allUsers.find(u => u.id === viewingOrder.userId))?.profilePic} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserCircle className="w-8 h-8 text-slate-200" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{(allUsers.find(u => u.id === viewingOrder.userId))?.name || 'Customer'}</p>
                                                <p className="text-xs text-slate-500">{(allUsers.find(u => u.id === viewingOrder.userId))?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                            <p className="text-xs text-slate-600 leading-relaxed">{(allUsers.find(u => u.id === viewingOrder.userId))?.address}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Order Status</p>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${viewingOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                    viewingOrder.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {viewingOrder.status.replace('_', ' ')}
                                                </span>
                                                <p className="text-xs font-bold text-indigo-600">₹{viewingOrder.total.toLocaleString()}</p>
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment</p>
                                                    <p className="text-xs font-bold text-slate-700">{viewingOrder.paymentMethod.toUpperCase()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Agent</p>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {viewingOrder.deliveryPersonId
                                                            ? allUsers.find(u => u.id === viewingOrder.deliveryPersonId)?.name || 'Unknown Agent'
                                                            : 'Unassigned'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="md:-ml-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items</p>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-2 font-bold text-slate-500">Product</th>
                                                    <th className="px-4 py-2 text-center font-bold text-slate-500">Qty</th>
                                                    <th className="px-4 py-2 text-right font-bold text-slate-500">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {viewingOrder.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-3 font-medium text-slate-700">{item.product.name}</td>
                                                        <td className="px-4 py-3 text-center text-slate-500">{item.quantity} {item.product.unit}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{((item.product?.price || 0) * item.quantity).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 font-bold border-t border-slate-100">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-3 text-right text-slate-500">Total Amount</td>
                                                    <td className="px-4 py-3 text-right text-indigo-600 text-sm">₹{viewingOrder.total.toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );




    const renderProducts = () => {
        const filteredProducts = products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-6 animate-fade-in relative h-full flex flex-col">
                {/* Product Modal */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <Card className="w-full max-w-lg p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto rounded-[2rem] border-none">
                            <h3 className="font-serif text-2xl font-black text-slate-900 mb-6">{editingProduct.id ? 'Edit Product' : 'Add New Product'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Product Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Premium Detergent"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 outline-none font-bold text-slate-900 transition-all"
                                        value={editingProduct.name}
                                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Price (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 outline-none font-bold text-slate-900 transition-all"
                                            value={editingProduct.price}
                                            onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Unit</label>
                                        <select
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 outline-none font-bold text-slate-900 appearance-none transition-all"
                                            value={editingProduct.unit}
                                            onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value as any })}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="litre">litre</option>
                                            <option value="unit">unit</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Category</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 outline-none font-bold text-slate-900 appearance-none transition-all"
                                        value={editingProduct.category}
                                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                    >
                                        <option value="Laundry">Laundry</option>
                                        <option value="Kitchen">Kitchen</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Bathroom">Bathroom</option>
                                        <option value="Floor">Floor</option>
                                        <option value="Special">Special</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Description</label>
                                    <textarea
                                        placeholder="Product description..."
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 outline-none font-bold text-slate-900 min-h-[100px] transition-all"
                                        value={editingProduct.description}
                                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Product Image</label>
                                    <div className="flex gap-4 items-center p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0 shadow-sm flex items-center justify-center relative border border-slate-100">
                                            {isUploadingProductImage && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            {editingProduct.imageUrl ? (
                                                <img src={editingProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setIsUploadingProductImage(true);
                                                    try {
                                                        const url = await storageService.uploadProductImage(file);
                                                        if (url) setEditingProduct(prev => ({ ...prev, imageUrl: url }));
                                                    } catch (err) {
                                                        alert("Failed to upload image.");
                                                    } finally {
                                                        setIsUploadingProductImage(false);
                                                    }
                                                }}
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-green-700 file:text-white cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <input
                                        type="checkbox"
                                        id="isAvailable"
                                        checked={editingProduct.isAvailable}
                                        onChange={e => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })}
                                        className="w-5 h-5 accent-green-600 rounded cursor-pointer"
                                    />
                                    <label htmlFor="isAvailable" className="font-bold text-slate-700 cursor-pointer select-none">Available for Purchase</label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={() => setIsProductModalOpen(false)}
                                        className="flex-1 h-12 rounded-xl bg-white border-2 border-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveProduct}
                                        className="flex-1 h-12 rounded-xl bg-green-700 text-white shadow-lg shadow-green-100 text-[10px] font-black uppercase tracking-widest hover:bg-green-800 transition-all font-bold"
                                    >
                                        {editingProduct.id ? 'Save Changes' : 'Create Product'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => {
                            setEditingProduct({ name: '', price: 0, unit: 'kg', category: 'Laundry', description: '', imageUrl: '', isAvailable: true, stockQuantity: 0 });
                            setIsProductModalOpen(true);
                        }}
                        className="h-11 px-6 rounded-xl bg-green-700 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-100 hover:bg-green-800 transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add New Product
                    </Button>
                </div>

                <Card className="border-slate-100 flex flex-col flex-1 overflow-hidden shadow-sm rounded-[2rem] border-none group/table">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Product Detail</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold">No products found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-all group/row">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-100 shrink-0 shadow-sm group-hover/row:scale-105 transition-transform">
                                                        <img
                                                            src={p.imageUrl || 'https://via.placeholder.com/100?text=Product'}
                                                            className="w-full h-full object-cover"
                                                            alt={p.name}
                                                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100?text=Product'; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 group-hover/row:text-green-700 transition-colors uppercase tracking-tight">{p.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">ID: {p.id.slice(-6).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-[0.1em] border border-blue-100">
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-green-700">₹{p.price}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">per {p.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${p.isAvailable ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {p.isAvailable ? 'In Stock' : 'Unavailable'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="outline"
                                                        className="h-9 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-green-50 hover:text-green-700 hover:border-green-100 transition-all"
                                                        onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                                                    </Button>
                                                    <Button
                                                        className="w-9 h-9 p-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                                        onClick={() => handleDeleteProduct(p.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mx-auto" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'sales' | 'delivery' | 'customer' | 'new-customer'>('all');

    const handleToggleUserStatus = async (user: User) => {
        try {
            const updatedUser = { ...user, isActive: !user.isActive };
            await storageService.saveUser(updatedUser);
            // Refresh list
            const users = await storageService.getUsers() || [];
            setAllUsers(users);
            setOpenUserMenuId(null);
        } catch (error) {
            console.error("Error toggling user status:", error);
            alert("Failed to update user status.");
        }
    };

    const handleDeleteUser = async (userId: string, role: string) => {
        if (window.confirm(`Are you sure you want to delete this user? This action cannot be undone.`)) {
            try {
                // If they have a role other than customer, we might want to be extra careful or remove authority first
                // But storageService.deleteUser handles profile deletion.
                // If we also want to ensure authority removal if it exists:
                if (role !== 'customer') {
                    await storageService.deleteAuthority(userId, role);
                }

                await storageService.deleteUser(userId);

                // Refresh list
                const users = await storageService.getUsers() || [];
                setAllUsers(users);
                const auths = await storageService.getAuthorities();
                setAuthorities(auths);
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user.");
            }
        }
    };

    const renderUsers = () => {
        const filteredUsers = allUsers.filter(u => {
            // Exclude admins from User Directory
            if (u.role === 'admin') return false;

            const matchesSearch = (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.phone?.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (userFilter === 'all') return true;

            const userAuths = authorities.filter(a => a.userId === u.id);
            const userRoles = userAuths.map(a => a.role);

            if (userFilter === 'sales') return userRoles.includes('sales');
            if (userFilter === 'delivery') return userRoles.includes('delivery');
            if (userFilter === 'customer') return userRoles.length === 0;
            if (userFilter === 'new-customer') return userRoles.length === 0 && !u.isActive;

            return true;
        }).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        return (
            <div className="h-full flex flex-col space-y-6 animate-fade-in relative">
                {/* User Filter Tabs */}
                {/* User Filter Dropdown */}
                <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-slate-50">
                    <div className="relative">
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value as any)}
                            className="appearance-none bg-white pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all cursor-pointer shadow-sm hover:border-slate-300"
                        >
                            <option value="all">All Users</option>
                            <option value="customer">Customers</option>
                            <option value="sales">Sales Team</option>
                            <option value="delivery">Delivery Staff</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users by name or phone/email..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button

                            onClick={() => {
                                setNewUserData({
                                    name: '',
                                    phone: '',
                                    email: '',
                                    address: '',
                                    role: 'customer',
                                    isActive: true,
                                    phoneVerified: false
                                });

                                setIsAddUserModalOpen(true);
                            }}
                            className="h-11 px-6 rounded-xl bg-green-700 text-xs font-black uppercase tracking-widest"
                        >
                            <UserPlus className="w-4 h-4 mr-2" /> Add Customer
                        </Button>
                    </div>
                </div>

                <Card className="flex-1 overflow-hidden border-slate-100 flex flex-col shadow-sm rounded-[2rem] border-none group/table">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Address</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Referred By</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs overflow-hidden border border-slate-100 ${user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'
                                                        }`}>
                                                        {user.profilePic ? (
                                                            <img
                                                                src={user.profilePic}
                                                                className="w-full h-full object-cover"
                                                                alt="Profile"
                                                            />
                                                        ) : (
                                                            user.name?.charAt(0).toUpperCase() || 'U'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{user.name || 'Anonymous User'}</p>
                                                        <p className={`text-[10px] uppercase tracking-widest font-black ${user.role === 'admin' ? 'text-purple-500' : 'text-slate-400'
                                                            }`}>
                                                            {user.role || 'customer'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{user.phone}</p>
                                                {user.email && <p className="text-[11px] font-medium text-slate-500 mb-1">{user.email}</p>}
                                                {user.phoneVerified && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Verified</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[12px] text-slate-800 font-bold max-w-xs">{user.address || 'No address'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.referredBy ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-[10px] font-black text-green-700 overflow-hidden border border-green-100">
                                                            {allUsers.find(u => u.id === user.referredBy)?.profilePic ? (
                                                                <img
                                                                    src={allUsers.find(u => u.id === user.referredBy)?.profilePic}
                                                                    className="w-full h-full object-cover"
                                                                    alt="Profile"
                                                                />
                                                            ) : (
                                                                allUsers.find(u => u.id === user.referredBy)?.name?.charAt(0).toUpperCase() || 'S'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold text-slate-900">
                                                                {allUsers.find(u => u.id === user.referredBy)?.name || 'Sales Staff'}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 font-black uppercase">Executive</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic font-medium">Direct</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {user.isActive ? 'Active' : 'Blocked'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 relative">
                                                <div ref={openUserMenuId === user.id ? userMenuRef : null}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenUserMenuId(openUserMenuId === user.id ? null : user.id);
                                                        }}
                                                        className={`p-2 rounded-lg transition-all border border-transparent hover:border-slate-200 ${openUserMenuId === user.id ? 'bg-slate-100 border-slate-200 text-slate-900' : 'hover:bg-white text-slate-400'}`}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {openUserMenuId === user.id && (
                                                        <div className="absolute right-6 top-14 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-[100] animate-scale-in">
                                                            <button
                                                                onClick={() => handleToggleUserStatus(user)}
                                                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.isActive ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-600">
                                                                    {user.isActive ? 'Block user' : 'Unblock user'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const handleResetData = async () => {
        if (window.confirm("Are you sure you want to clear all mock data (Orders, Users, Authorities, Sales Data)? This action cannot be undone. Product data will be preserved.")) {
            await storageService.resetAllMockData();
            // Refresh ALL data including sales
            setError(null);
            try {
                const allOrders = await storageService.getAllOrders();
                setOrders(allOrders);
                const users = await storageService.getUsers() || [];
                setAllUsers(users);
                const auths = await storageService.getAuthorities();
                setAuthorities(auths);
                // Refresh sales data
                const targets = storageService.getSalesTargets();
                setSalesTargets(targets);
                const activities = storageService.getSalesActivities();
                setSalesActivities(activities);
            } catch (error) {
                console.error("Error refreshing after reset:", error);
            }
        }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct.name || !editingProduct.price) {
            alert('Name and Price are required.');
            return;
        }

        try {
            await storageService.saveProduct(editingProduct);
            // Refresh
            const allProducts = await storageService.getProducts();
            setProducts(allProducts);
            setIsProductModalOpen(false);
            setEditingProduct({
                name: '',
                price: 0,
                unit: 'kg',
                category: 'Laundry',
                description: '',
                imageUrl: '',
                isAvailable: true,
                stockQuantity: 0
            });
            alert('Product saved successfully!');
        } catch (error: any) {
            console.error("Error saving product:", error);
            alert("Failed to save product: " + error.message);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await storageService.deleteProduct(id);
            // Refresh
            const allProducts = await storageService.getProducts();
            setProducts(allProducts);
            alert('Product deleted successfully');
        } catch (error: any) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product: " + error.message);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberData.userId) {
            alert("Please select a user first");
            return;
        }

        try {
            const user = allUsers.find(u => u.id === newMemberData.userId);
            if (!user) {
                alert("Selected user not found in the users list. Please try selecting again.");
                return;
            }

            const possibleRoles = ['sales', 'delivery', 'admin', 'logistic'] as const;

            // Determine referral code once (if sales is selected)
            const commonReferralCode = newMemberData.roles.includes('sales')
                ? (newMemberData.referralCode || generateReferralCode(user.name))
                : undefined;

            // Loop through all possible roles to Sync (Add selected, Remove unselected)
            for (const roleId of possibleRoles) {
                const shouldHaveRole = newMemberData.roles.includes(roleId);
                const hasRoleCurrently = authorities.some(a => a.userId === user.id && a.role === roleId);

                if (shouldHaveRole) {
                    // Add or Update Role
                    const permissions: Permission[] = roleId === 'admin' ?
                        [{ resource: 'orders', action: 'all' }, { resource: 'products', action: 'all' }, { resource: 'users', action: 'all' }, { resource: 'authority', action: 'all' }, { resource: 'stats', action: 'all' }] :
                        roleId === 'delivery' ?
                            [{ resource: 'orders', action: 'write' }, { resource: 'products', action: 'read' }, { resource: 'users', action: 'read' }] :
                            roleId === 'logistic' ?
                                [{ resource: 'orders', action: 'all' }, { resource: 'products', action: 'read' }, { resource: 'users', action: 'read' }, { resource: 'logistic', action: 'all' }] :
                                [{ resource: 'orders', action: 'write' }, { resource: 'products', action: 'read' }, { resource: 'users', action: 'read' }, { resource: 'stats', action: 'read' }]; // Sales default

                    const newAuth: Authority = {
                        id: 'AUTH-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                        userId: user.id,
                        userName: user.name || 'Unknown',
                        role: roleId,
                        permissions: permissions,
                        isActive: true, // Auto-activate on add
                        lastActive: new Date().toISOString(),
                        referralCode: commonReferralCode // Persist code across all role updates to ensure profile has it
                    };

                    await storageService.saveAuthority(newAuth);

                } else if (hasRoleCurrently) {
                    // Remove Role if unselected but currently exists
                    await storageService.deleteAuthority(user.id, roleId);
                }
            }

            // Refresh Data
            const auths = await storageService.getAuthorities();
            const users = await storageService.getUsers();

            setAuthorities(auths);
            setAllUsers(users);
            setIsMemberModalOpen(false);
            setNewMemberData({ userId: '', roles: ['sales'], referralCode: '' });

            alert("Member permissions updated successfully!");
        } catch (error: any) {
            console.error("Error adding/updating member:", error);
            alert("Failed to save member: " + (error.message || "Unknown error"));
        }
    };

    const handleAddUser = async () => {
        if (!newUserData.name || !newUserData.phone) {
            alert("Name and Phone are required.");
            return;
        }

        try {
            const newUser: User = {
                id: 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                name: newUserData.name,
                phone: newUserData.phone,
                email: newUserData.email,
                address: newUserData.address,
                role: newUserData.role,
                isActive: newUserData.isActive,
                phoneVerified: newUserData.phoneVerified,
                createdAt: new Date().toISOString()
            };

            await storageService.saveUser(newUser);

            // Refresh
            const users = await storageService.getUsers();
            setAllUsers(users);
            setIsAddUserModalOpen(false);
            setNewUserData({
                name: '',
                phone: '',
                email: '',
                address: '',
                role: 'customer',
                isActive: true,
                phoneVerified: false
            });
        } catch (error: any) {
            console.error("Error adding user:", error);
            setError(error.message);
        }
    };

    const renderAuthority = () => {
        // Group authorities by userId to show one row per user with all their roles
        const groupedAuths = authorities.reduce((acc, auth) => {
            // Group by userId, but filter out roles that shouldn't be here (like 'customer' if it's meant for team only)
            // However, the user said consolidate roles, so we should show all roles assigned.
            if (auth.role === 'customer' as any) return acc;

            const existing = acc.find(a => a.userId === auth.userId);
            if (existing) {
                // Add this role to the existing user entry
                existing.roles.push({
                    id: auth.id,
                    role: auth.role,
                    permissions: auth.permissions,
                    referralCode: auth.referralCode
                });
            } else {
                // Create new entry for this user
                acc.push({
                    userId: auth.userId,
                    userName: auth.userName,
                    isActive: auth.isActive,
                    lastActive: auth.lastActive,
                    roles: [{
                        id: auth.id,
                        role: auth.role,
                        permissions: auth.permissions,
                        referralCode: auth.referralCode
                    }]
                });
            }
            return acc;
        }, [] as Array<{
            userId: string;
            userName: string;
            isActive: boolean;
            lastActive?: string;
            roles: Array<{
                id: string;
                role: 'admin' | 'sales' | 'delivery' | 'logistic';
                permissions: Permission[];
                referralCode?: string;
            }>;
        }>);

        // Filter based on search query
        const filteredAuths = groupedAuths.filter(a =>
            a.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.roles.some(r => r.role.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        const renderReferralListModal = () => {
            if (!viewingReferralsFor) return null;
            const salesPerson = authorities.find(a => a.id === viewingReferralsFor);
            const referredUsers = allUsers.filter(u => u.referredBy === salesPerson?.userId);

            return (
                <div className="fixed inset-0 lg:left-72 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl p-8 shadow-2xl animate-scale-in max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="font-serif text-2xl font-black">Referral Network</h3>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
                                    Customers added by <span className="text-green-700">{salesPerson?.userName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingReferralsFor(null)}
                                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                            >
                                <Plus className="rotate-45" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {referredUsers.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">No referrals yet for this member.</p>
                                </div>
                            ) : (
                                referredUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-green-200 transition-all hover:shadow-md group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center font-black text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors overflow-hidden shadow-sm">
                                                {u.profilePic ? (
                                                    <img src={u.profilePic} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    u.name?.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{u.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{u.phone} • {u.village}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold">Customer ID: {u.id.slice(-6)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-fade-in relative">
                {renderReferralListModal()}
                {isMemberModalOpen && (
                    <div className="fixed inset-0 lg:left-72 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 uppercase-none">
                        <Card className="w-full max-w-md p-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] animate-scale-in rounded-[2rem] border-none overflow-hidden bg-white">
                            <div className="bg-[#FDFCF9] px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-serif text-xl font-black text-slate-900">Add Authority</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Access Management</p>
                                </div>
                                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-green-600" />
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Section 1: User Identity */}
                                <div ref={userSelectRef} className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Account Holder</label>
                                    <div className="relative">
                                        <div
                                            className={`w-full rounded-xl border-2 transition-all cursor-pointer flex items-center group overflow-hidden ${isUserSelectOpen ? 'border-green-600 bg-white shadow-lg shadow-green-900/5' : 'border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200'}`}
                                        >
                                            {isUserSelectOpen ? (
                                                <div className="flex-1 flex items-center px-3.5 h-[54px] bg-white">
                                                    <Search className="w-4 h-4 text-green-600 mr-3" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search member name or phone..."
                                                        className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                                                        value={userSearchTerm}
                                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <ChevronDown
                                                        onClick={(e) => { e.stopPropagation(); setIsUserSelectOpen(false); }}
                                                        className="w-4 h-4 text-green-600 rotate-180"
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => setIsUserSelectOpen(true)}
                                                    className="flex-1 flex items-center justify-between px-3.5 py-3"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        {newMemberData.userId ? (
                                                            <>
                                                                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden font-black text-[11px] text-green-700 shadow-sm">
                                                                    {allUsers.find(u => u.id === newMemberData.userId)?.profilePic ? (
                                                                        <img src={allUsers.find(u => u.id === newMemberData.userId)?.profilePic} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        allUsers.find(u => u.id === newMemberData.userId)?.name?.charAt(0)
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900 leading-tight">
                                                                        {allUsers.find(u => u.id === newMemberData.userId)?.name}
                                                                    </p>
                                                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                                        {allUsers.find(u => u.id === newMemberData.userId)?.phone}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-200">
                                                                    <Search className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-300 italic">Tap to search & select user...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>

                                        {isUserSelectOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.15)] border border-slate-100 z-[60] py-2 animate-fade-in-up flex flex-col overflow-hidden">
                                                <div className="max-h-[200px] overflow-y-auto px-1">
                                                    {allUsers
                                                        .filter(u =>
                                                            u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                            u.phone?.includes(userSearchTerm)
                                                        )
                                                        .map(u => (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => {
                                                                    const existingRoles = authorities.filter(a => a.userId === u.id).map(a => a.role);
                                                                    setNewMemberData({
                                                                        ...newMemberData,
                                                                        userId: u.id,
                                                                        roles: existingRoles.length > 0 ? existingRoles : ['sales']
                                                                    });
                                                                    setIsUserSelectOpen(false);
                                                                    setUserSearchTerm('');
                                                                }}
                                                                className={`mx-1 my-0.5 px-3 py-2.5 hover:bg-green-50 rounded-xl cursor-pointer flex items-center justify-between group transition-all duration-200 ${newMemberData.userId === u.id ? 'bg-green-50' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">
                                                                        {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-lg" alt="" /> : u.name?.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[13px] font-bold text-slate-900">{u.name}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ">{u.phone}</p>
                                                                    </div>
                                                                </div>
                                                                {newMemberData.userId === u.id && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                                            </div>
                                                        ))
                                                    }
                                                    {allUsers.filter(u => !authorities.find(a => a.userId === u.id && a.role === newMemberData.role)).filter(u => (u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.phone?.includes(userSearchTerm))).length === 0 && (
                                                        <div className="py-8 text-center">
                                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">No Results Found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Access Roles</label>
                                    <div className="flex bg-slate-50/50 p-1 rounded-xl gap-1 border border-slate-100">
                                        {[
                                            { id: 'admin', label: 'Admin' },
                                            { id: 'sales', label: 'Sales' },
                                            { id: 'logistic', label: 'Logistic' },
                                            { id: 'delivery', label: 'Delivery' }
                                        ].map(role => {
                                            const isSelected = newMemberData.roles.includes(role.id);
                                            return (
                                                <div
                                                    key={role.id}
                                                    onClick={() => {
                                                        const currentRoles = newMemberData.roles;
                                                        if (isSelected) {
                                                            setNewMemberData({ ...newMemberData, roles: currentRoles.filter(r => r !== role.id) });
                                                        } else {
                                                            setNewMemberData({ ...newMemberData, roles: [...currentRoles, role.id] });
                                                        }
                                                    }}
                                                    className={`flex-1 py-3 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${isSelected
                                                        ? 'bg-slate-900 text-white shadow-lg'
                                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                                                >
                                                    {isSelected ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-300"></div>}
                                                    {role.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {newMemberData.roles.includes('sales') && (
                                    <div className="animate-fade-in space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Referral Code</label>
                                        <div className="relative">
                                            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                            <input
                                                type="text"
                                                placeholder="UNIQUE CODE OR AUTO-GEN"
                                                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50/30 font-black text-[10px] outline-none focus:border-amber-500 focus:bg-white transition-all tracking-widest placeholder:text-slate-200"
                                                value={newMemberData.referralCode}
                                                onChange={(e) => setNewMemberData({ ...newMemberData, referralCode: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black border-2 border-slate-100 tracking-widest" onClick={() => setIsMemberModalOpen(false)}>Cancel</Button>
                                    <Button className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-green-100" onClick={handleAddMember}>Confirm</Button>
                                </div>
                            </div>
                        </Card>
                    </div >
                )}



                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Admin</p>
                        <p className="text-2xl font-serif font-black text-slate-900">{groupedAuths.filter(a => a.roles.some(r => r.role === 'admin')).length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Sales Executives</p>
                        <p className="text-2xl font-serif font-black text-green-700">{groupedAuths.filter(a => a.roles.some(r => r.role === 'sales')).length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Delivery Personnel</p>
                        <p className="text-2xl font-serif font-black text-blue-700">{groupedAuths.filter(a => a.roles.some(r => r.role === 'delivery')).length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Staff</p>
                        <p className="text-2xl font-serif font-black text-amber-700">{groupedAuths.filter(a => a.isActive).length}</p>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or role..."
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-green-700 outline-none text-sm font-bold transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button

                            onClick={() => {
                                setNewMemberData({
                                    userId: '',
                                    roles: ['sales'],
                                    referralCode: ''
                                });
                                setIsMemberModalOpen(true);
                            }}
                            className="w-full md:w-auto px-6 h-11 rounded-xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-green-100"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Member
                        </Button>
                    </div>
                </div>

                <Card className="overflow-hidden border-slate-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Team Member</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Access Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Customers</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Permissions</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredAuths.map((auth) => {
                                    const user = allUsers.find(u => u.id === auth.userId);
                                    const hasSalesRole = auth.roles.some(r => r.role === 'sales');
                                    const salesRole = auth.roles.find(r => r.role === 'sales');

                                    return (
                                        <tr key={auth.userId} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm overflow-hidden border border-slate-100 bg-gradient-to-br from-purple-100 to-green-100 text-slate-700">
                                                        {user?.profilePic ? (
                                                            <img
                                                                src={user.profilePic}
                                                                className="w-full h-full object-cover"
                                                                alt="Profile"
                                                            />
                                                        ) : (
                                                            auth.userName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{auth.userName}</p>
                                                        {user?.email && <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {auth.roles.map((roleData) => (
                                                        <span
                                                            key={roleData.id}
                                                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${roleData.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                roleData.role === 'sales' ? 'bg-green-50 text-green-600 border-green-100' :
                                                                    roleData.role === 'delivery' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                        roleData.role === 'logistic' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            'bg-slate-50 text-slate-500 border-slate-100'
                                                                }`}
                                                        >
                                                            {roleData.role}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-row gap-2 items-center justify-center">
                                                    {hasSalesRole && (
                                                        <button
                                                            onClick={() => setViewingReferralsFor(salesRole?.id || '')}
                                                            className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 bg-green-50 text-green-700 rounded-lg text-xs font-black border border-green-100 hover:bg-green-100 transition-colors"
                                                            title="Referred Customers"
                                                        >
                                                            {allUsers.filter(u => u.referredBy === auth.userId).length}
                                                        </button>
                                                    )}
                                                    {auth.roles.some(r => r.role === 'delivery') && (
                                                        <div
                                                            className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100"
                                                            title="Assigned Customers"
                                                        >
                                                            {allUsers.filter(u => u.assignedDeliveryPersonId === auth.userId).length}
                                                        </div>
                                                    )}
                                                    {!hasSalesRole && !auth.roles.some(r => r.role === 'delivery') && (
                                                        <span className="text-[10px] text-slate-300 font-bold">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    {auth.roles.map((roleData, idx) => (
                                                        <span key={idx} className="text-[10px] font-bold text-slate-500 uppercase">
                                                            {roleData.role === 'admin' ? 'Full Control' :
                                                                roleData.role === 'sales' ? 'Sales Access' :
                                                                    roleData.role === 'delivery' ? 'Delivery Access' : 'View Only'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${auth.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${auth.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                    {auth.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const existingRoles = auth.roles.map(r => r.role);
                                                            const salesRoleInfo = auth.roles.find(r => r.role === 'sales');
                                                            setNewMemberData({
                                                                userId: auth.userId,
                                                                roles: existingRoles,
                                                                referralCode: salesRoleInfo?.referralCode || ''
                                                            });
                                                            setIsMemberModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                                                        title="Edit Permissions"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Are you sure you want to remove ALL access for ${auth.userName}? This will revert them to a regular customer.`)) return;
                                                            try {
                                                                for (const r of auth.roles) {
                                                                    await storageService.deleteAuthority(auth.userId, r.role);
                                                                }
                                                                const allAuths = await storageService.getAuthorities();
                                                                setAuthorities(allAuths);
                                                                alert('User access removed successfully.');
                                                            } catch (error) {
                                                                console.error("Failed to delete member:", error);
                                                                alert("Failed to remove member.");
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                                                        title="Remove Access"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div >
                </Card >
            </div >
        );
    };

    const renderSalesManagement = () => {
        const salesExecutives = authorities.filter(a => a.role === 'sales');

        const handleSaveTarget = async () => {
            if (!selectedSalesPerson || !newTargetData.targetVisits || !newTargetData.targetConversions || !newTargetData.endDate) {
                alert('Please fill all required fields');
                return;
            }

            try {
                const executivesToAssign = selectedSalesPerson === 'all'
                    ? salesExecutives
                    : salesExecutives.filter(e => e.userId === selectedSalesPerson);

                const savePromises = [];

                for (const exec of executivesToAssign) {
                    const target: SalesTarget = {
                        id: (selectedSalesPerson === 'all' || !newTargetData.id)
                            ? ('TRG-' + Math.random().toString(36).substr(2, 9).toUpperCase())
                            : newTargetData.id!,
                        salesPersonId: exec.userId,
                        targetVisits: Number(newTargetData.targetVisits),
                        targetConversions: Number(newTargetData.targetConversions),
                        currentVisits: newTargetData.currentVisits || 0,
                        currentConversions: newTargetData.currentConversions || 0,
                        startDate: newTargetData.startDate || new Date().toISOString(),
                        endDate: new Date(newTargetData.endDate!).toISOString(),
                        instructions: newTargetData.instructions || '',
                        status: (newTargetData.status as any) || 'active'
                    };

                    savePromises.push(storageService.saveSalesTarget(target));
                }

                await Promise.all(savePromises);

                // Refresh data from server to get UUIDs and verified state
                await fetchData();

                setIsTargetModalOpen(false);
                setNewTargetData({
                    targetVisits: 50,
                    targetConversions: 15,
                    instructions: '',
                    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
                });

                alert('Sales targets successfully updated');
            } catch (err: any) {
                console.error("Error saving targets:", err);
                if (!handleAuthError(err)) {
                    alert('Failed to save targets: ' + (err.message || 'Unknown error'));
                }
            }
        };

        return (
            <div className="space-y-6 animate-fade-in relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-[2rem] border border-white flex items-center gap-5 shadow-sm group hover:shadow-xl transition-all duration-500">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Force</p>
                            <p className="text-3xl font-serif font-black text-slate-900">{salesExecutives.length}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-[2rem] border border-white flex items-center gap-5 shadow-sm group hover:shadow-xl transition-all duration-500">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 group-hover:rotate-6 transition-all">
                            <Target className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Goals</p>
                            <p className="text-3xl font-serif font-black text-slate-900">{salesTargets.length}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-[2rem] border border-white flex items-center gap-5 shadow-sm group hover:shadow-xl transition-all duration-500">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:rotate-6 transition-all">
                            <ArrowUpRight className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Velocity</p>
                            <p className="text-3xl font-serif font-black text-slate-900">
                                {salesTargets.filter(t => t.status === 'active').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl w-full sm:w-fit gap-2">
                        <button
                            onClick={() => setSalesTab('targets')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salesTab === 'targets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Target className="w-4 h-4" />
                            Performance Targets
                        </button>
                        <button
                            onClick={() => setSalesTab('activities')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salesTab === 'activities' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <History className="w-4 h-4" />
                            Activity Stream
                        </button>
                        <button
                            onClick={() => setSalesTab('insights')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salesTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Performance Insights
                        </button>
                    </div>
                </div>


                {salesTab === 'targets' && (
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-sm mb-2">
                            <div>
                                <h3 className="text-2xl font-serif font-black text-slate-900 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                                        <TrendingUp className="w-5 h-5 text-white animate-pulse" />
                                    </div>
                                    Growth Engine
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.3em] font-black">Velocity & Performance Tracking</p>
                            </div>
                            <Button
                                onClick={() => {
                                    if (salesExecutives.length > 0) {
                                        setSelectedSalesPerson(salesExecutives[0].userId);
                                        setIsTargetModalOpen(true);
                                    } else {
                                        alert("Add a Sales Member in Authority first.");
                                    }
                                }}
                                className="h-12 px-8 rounded-2xl uppercase text-[10px] font-black tracking-widest bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-200 group transition-all"
                            >
                                <Target className="w-4 h-4 mr-2 group-hover:rotate-45 transition-transform" /> Set New Objective
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {salesExecutives.length === 0 ? (
                                <Card className="py-20 text-center border-dashed border-2 border-slate-100 bg-white/50">
                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No Sales Staff Found</p>
                                    <Button
                                        variant="outline"
                                        className="mt-4 h-9 px-4 rounded-xl text-[10px] font-black"
                                        onClick={() => setActiveTab('authority')}
                                    >
                                        Go to Access Control
                                    </Button>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {salesExecutives.map((exec, idx) => {
                                        const activeTarget = salesTargets.find(t => t.salesPersonId === exec.userId && t.status === 'active');
                                        const user = allUsers.find(u => u.id === exec.userId);
                                        const currentVisits = activeTarget ? (activeTarget.currentVisits || 0) : 0;
                                        const currentConversions = activeTarget ? (activeTarget.currentConversions || 0) : 0;
                                        const visitProgress = activeTarget ? (currentVisits / activeTarget.targetVisits) * 100 : 0;
                                        const conversionProgress = activeTarget ? (currentConversions / activeTarget.targetConversions) * 100 : 0;

                                        return (
                                            <div
                                                key={exec.id}
                                                className="group bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 border border-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-700 relative overflow-hidden"
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                {/* Animated Background Glow */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-[15] transition-transform duration-1000 pointer-events-none blur-3xl" />

                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-900 border-4 border-white shadow-xl overflow-hidden shrink-0 group-hover:rotate-6 transition-all duration-500">
                                                            {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-serif text-xl font-black text-white">{exec.userName.charAt(0)}</div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-serif text-lg font-black text-slate-900 truncate">{exec.userName}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${activeTarget ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{activeTarget ? 'On Assignment' : 'Standby'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 flex-1">
                                                        {/* Target Progress Units */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-white transition-all duration-500">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Ratio</p>
                                                                <p className="text-sm font-serif font-black text-slate-900">{currentVisits}<span className="text-[10px] text-slate-300 ml-1">/ {activeTarget?.targetVisits || 0}</span></p>
                                                                <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-slate-900 rounded-full transition-all duration-1000 delay-300"
                                                                        style={{ width: `${Math.min(100, visitProgress)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-white transition-all duration-500">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Rate</p>
                                                                <p className="text-sm font-serif font-black text-slate-900">{currentConversions}<span className="text-[10px] text-slate-300 ml-1">/ {activeTarget?.targetConversions || 0}</span></p>
                                                                <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-green-500 rounded-full transition-all duration-1000 delay-500"
                                                                        style={{ width: `${Math.min(100, conversionProgress)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 flex gap-3 pt-6 border-t border-slate-50">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSalesPerson(exec.userId);
                                                                if (activeTarget) {
                                                                    setNewTargetData({
                                                                        ...activeTarget,
                                                                        endDate: activeTarget.endDate.split('T')[0]
                                                                    });
                                                                } else {
                                                                    setNewTargetData({
                                                                        targetVisits: 50,
                                                                        targetConversions: 15,
                                                                        instructions: '',
                                                                        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
                                                                    });
                                                                }
                                                                setIsTargetModalOpen(true);
                                                            }}
                                                            className="flex-1 h-12 rounded-2xl bg-white border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-500 shadow-sm"
                                                        >
                                                            {activeTarget ? 'Modify Goal' : 'Set Mission'}
                                                        </button>
                                                        <button
                                                            className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-white flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-500 group-hover:rotate-12"
                                                        >
                                                            <Sparkles className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {salesTab === 'activities' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card className="overflow-hidden border-slate-100 shadow-sm bg-white">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-serif font-black text-slate-900">Recent Field Activities</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time updates from sales force</p>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {salesActivities.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No activities recorded yet</p>
                                    </div>
                                ) : (
                                    salesActivities.map(act => {
                                        const exec = authorities.find(a => a.userId === act.salesPersonId);
                                        return (
                                            <div key={act.id} className="p-6 hover:bg-slate-50/50 transition-all flex gap-6">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${act.activityType === 'visit' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    act.activityType === 'call' ? 'bg-green-50 text-green-600 border-green-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {act.activityType === 'visit' ? <MapPin className="w-6 h-6" /> :
                                                        act.activityType === 'call' ? <Phone className="w-6 h-6" /> :
                                                            <ShoppingBag className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                                                {act.activityType.replace('_', ' ')} By <span className="text-green-700">{exec?.userName || 'Sales-1'}</span>
                                                            </p>
                                                            <div className="mt-1 space-y-0.5">
                                                                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                                                    Customer: {act.personName} • {act.personPhone}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" /> {act.personAddress || 'No address provided'}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                                                                    {new Date(act.timestamp).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest">
                                                            {act.id}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-50/80 p-4 rounded-2xl italic text-sm text-slate-600 border border-slate-100">
                                                        "{act.notes}"
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>
                )}


                {salesTab === 'insights' && (
                    <div className="animate-fade-in-up">
                        <Card className="p-8 border-slate-100 bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-serif font-black text-slate-900">Achievement Matrix</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.3em] font-black">Present vs Historical Success Rates</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-900" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Goals</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achievements</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={salesExecutives.map(exec => {
                                            const targets = salesTargets.filter(t => t.salesPersonId === exec.userId);
                                            const totalTarget = targets.reduce((sum, t) => sum + t.targetConversions, 0);
                                            const totalAchieved = targets.reduce((sum, t) => sum + (t.currentConversions || 0), 0);
                                            return {
                                                name: exec.userName.split(' ')[0],
                                                target: totalTarget,
                                                achieved: totalAchieved
                                            };
                                        })}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: 'none',
                                                borderRadius: '16px',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                                            }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        />
                                        <Bar
                                            dataKey="target"
                                            fill="#0f172a"
                                            radius={[6, 6, 0, 0]}
                                            barSize={30}
                                            animationDuration={1500}
                                        />
                                        <Bar
                                            dataKey="achieved"
                                            fill="#22c55e"
                                            radius={[6, 6, 0, 0]}
                                            barSize={30}
                                            animationDuration={2000}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                )}


                {/* New Target Modal */}
                {isTargetModalOpen && (
                    <div className="fixed inset-0 lg:left-72 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-0 shadow-2xl animate-scale-in border-none rounded-[2.5rem] overflow-hidden bg-white">
                            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
                                <div>
                                    <h3 className="font-serif text-xl font-black text-white">Target Assignment</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Growth & Goals</p>
                                </div>
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <Target className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Sales Person</label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all appearance-none"
                                        value={selectedSalesPerson || ''}
                                        onChange={(e) => setSelectedSalesPerson(e.target.value)}
                                    >
                                        <option value="">Select Executive</option>
                                        <option value="all" className="text-green-700 font-black">✨ ASSIGN TO ALL SALES PERSONS</option>
                                        {salesExecutives.map(exec => (
                                            <option key={exec.id} value={exec.userId}>{exec.userName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Target Visits</label>
                                        <input
                                            type="number"
                                            placeholder="e.g., 50"
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                            value={newTargetData.targetVisits}
                                            onChange={(e) => setNewTargetData({ ...newTargetData, targetVisits: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Target Conversions</label>
                                        <input
                                            type="number"
                                            placeholder="e.g., 15"
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                            value={newTargetData.targetConversions}
                                            onChange={(e) => setNewTargetData({ ...newTargetData, targetConversions: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Deadline</label>
                                    <input
                                        type="date"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                                        value={newTargetData.endDate}
                                        onChange={(e) => setNewTargetData({ ...newTargetData, endDate: e.target.value })}

                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Special Instructions</label>
                                    <textarea
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-medium text-slate-900 min-h-[120px] transition-all resize-none"
                                        placeholder="Add goals, Focus areas or reminders here..."
                                        value={newTargetData.instructions}
                                        onChange={(e) => setNewTargetData({ ...newTargetData, instructions: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <Button variant="outline" className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest" onClick={() => setIsTargetModalOpen(false)}>Cancel</Button>
                                    <Button className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-xl shadow-green-100" onClick={handleSaveTarget}>Assign Goal</Button>
                                </div>
                            </div>
                        </Card>
                    </div >
                )}
            </div >
        );
    };

    const renderSettings = () => {
        return (
            <div className="h-full space-y-6 animate-fade-in mx-auto max-w-5xl pt-2 pb-20 custom-scrollbar overflow-y-auto px-2">
                <div className="flex items-center gap-4 mb-8 border-b pb-6 border-slate-100">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black font-serif text-slate-900 leading-none mb-2">Platform Settings</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration & Preferences</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Preferences */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl font-black text-slate-900">General</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Maintenance Mode</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Disable Customer Orders</p>
                                </div>
                                <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer hover:bg-slate-300 transition-colors">
                                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm shadow-slate-300/50"></div>
                                </div>
                            </div>
                            <div className="border-t border-slate-50 pt-6 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Force Dark Mode</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Override User Theme</p>
                                </div>
                                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-inner shadow-green-700/50">
                                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm shadow-green-900/50"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Order Settings */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl font-black text-slate-900">Order Logic</h3>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block">Minimum Order Amount (₹)</label>
                                <input type="number" defaultValue="200" className="w-full h-12 bg-slate-50 border-2 border-transparent rounded-xl px-4 font-bold text-slate-900 focus:border-green-500 focus:bg-white transition-colors outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block">Delivery Radius (km)</label>
                                <input type="number" defaultValue="15" className="w-full h-12 bg-slate-50 border-2 border-transparent rounded-xl px-4 font-bold text-slate-900 focus:border-green-500 focus:bg-white transition-colors outline-none" />
                            </div>
                        </div>
                    </Card>

                    {/* Subscription & Routine Settings */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white md:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-xl font-black text-slate-900">Subscription Logistics</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dual Delivery Schedule</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Primary Dispatch</label>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-green-50 text-green-700 block border border-green-100">
                                        Day {primaryDeliveryDate}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="grid grid-cols-7 gap-2">
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                                            <div key={day} className="text-[8px] font-black text-slate-400 text-center uppercase tracking-widest mb-1">{day}</div>
                                        ))}
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <button
                                                key={`primary-${day}`}
                                                onClick={() => setPrimaryDeliveryDate(day)}
                                                disabled={secondaryDeliveryDate === day}
                                                className={`w-full aspect-square rounded-xl text-xs font-black transition-all ${primaryDeliveryDate === day
                                                    ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-110 relative z-10'
                                                    : secondaryDeliveryDate === day
                                                        ? 'bg-amber-100/50 text-amber-600 opacity-50 cursor-not-allowed'
                                                        : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700 border border-slate-100 hover:border-green-200 shadow-sm'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Secondary Dispatch</label>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 block border border-amber-100">
                                        Day {secondaryDeliveryDate}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="grid grid-cols-7 gap-2">
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                                            <div key={day} className="text-[8px] font-black text-slate-400 text-center uppercase tracking-widest mb-1">{day}</div>
                                        ))}
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <button
                                                key={`secondary-${day}`}
                                                onClick={() => setSecondaryDeliveryDate(day)}
                                                disabled={primaryDeliveryDate === day}
                                                className={`w-full aspect-square rounded-xl text-xs font-black transition-all ${secondaryDeliveryDate === day
                                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110 relative z-10'
                                                    : primaryDeliveryDate === day
                                                        ? 'bg-green-100/50 text-green-600 opacity-50 cursor-not-allowed'
                                                        : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-100 hover:border-amber-200 shadow-sm'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Notification Settings */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <h3 className="font-serif text-xl font-black text-slate-900">Alerts & Messaging</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">New Order Push Alerts</h4>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Browser Notifications</p>
                                </div>
                                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Customer SMS Updates</h4>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Twilio Integration</p>
                                </div>
                                <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer border border-slate-300">
                                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Avatar Presets Management */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white md:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <UserCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-xl font-black text-slate-900">Avatar Presets</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Quick selections for members</p>
                                </div>
                            </div>
                            <label className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-all shadow-lg active:scale-95 ${isUploadingPreset ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isUploadingPreset ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                {isUploadingPreset ? 'Uploading...' : 'Upload Preset'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setIsUploadingPreset(true);
                                            try {
                                                await storageService.uploadAvatarPreset(file);
                                                const updated = await storageService.getAvatarPresets();
                                                setAvatarPresets(updated);
                                            } catch (err: any) {
                                                console.error(err);
                                                alert(`Failed to upload preset: ${err.message || 'Unknown error'}`);
                                            } finally {
                                                setIsUploadingPreset(false);
                                                e.target.value = '';
                                            }
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
                            {avatarPresets.map((preset) => (
                                <div key={preset.id} className="relative group">
                                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-sm group-hover:border-orange-200 transition-all">
                                        <img src={preset.url} alt="Preset" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Delete this preset?')) {
                                                try {
                                                    await storageService.deleteAvatarPreset(preset.id, preset.url);
                                                    setAvatarPresets(prev => prev.filter(p => p.id !== preset.id));
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            }
                                        }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {avatarPresets.length === 0 && !isUploadingPreset && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                    <UserCircle className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-6">No presets uploaded yet. Add some to help new users choose their profile picture.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="pt-8 flex gap-4 border-t border-slate-100 pb-10">
                    <Button
                        className="h-12 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200"
                        onClick={() => {
                            try {
                                localStorage.setItem('admin_primary_delivery_date', primaryDeliveryDate.toString());
                                localStorage.setItem('admin_secondary_delivery_date', secondaryDeliveryDate.toString());
                            } catch (e) { }
                            alert('Configuration saved successfully!');
                        }}
                    >
                        Save Configuration
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                            setPrimaryDeliveryDate(5);
                            setSecondaryDeliveryDate(20);
                        }}
                    >
                        Reset Defaults
                    </Button>
                </div>
            </div>
        );
    };

    // FIXED: Use current logged-in user profile instead of finding any admin
    // Priority: user prop > allUsers match > storage fallback
    const currentUserProfile = user || allUsers.find(u => u.id === user?.id) || storageService.getUser();

    return (
        <div className={`flex min-h-screen relative admin-shell ${isDarkMode ? 'admin-dark' : 'admin-light'}`}>
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 admin-header border-b flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-3">
                    {(!isLogistic || isAdmin) && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 admin-text-muted hover:admin-bg-subtle rounded-xl transition-colors"
                        >
                            <MoreVertical className="w-6 h-6 rotate-90" />
                        </button>
                    )}
                    <div className="w-10 h-10 bg-white rounded-full overflow-hidden border admin-border shadow-sm flex items-center justify-center">
                        <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    {/* Dark Mode Toggle — Mobile */}
                    <button
                        onClick={toggleDarkMode}
                        className="w-9 h-9 rounded-xl admin-toggle-btn flex items-center justify-center transition-all"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode
                            ? <Sun className="w-4 h-4 text-amber-400" />
                            : <Moon className="w-4 h-4" />}
                    </button>
                    <div className="text-right">
                        <p className="text-[10px] font-black admin-text-primary leading-none">{currentUserProfile?.name?.split(' ')[0] || 'Admin'}</p>
                        <p className="text-[8px] font-bold text-green-600">Online</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-black overflow-hidden">
                        {currentUserProfile?.profilePic ? (
                            <img src={currentUserProfile.profilePic} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            currentUserProfile?.name?.charAt(0) || 'A'
                        )}
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Hidden for logistic-only users */}
            {(!isLogistic || isAdmin) && !isStandaloneLogistic && (
                <aside className={`w-72 admin-sidebar border-r p-6 flex flex-col fixed inset-y-0 left-0 z-[60] lg:z-10 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:static'} h-full lg:h-screen lg:sticky lg:top-0`}>
                    <div className="flex lg:hidden justify-end mb-4">
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 admin-text-muted">
                            <Plus className="w-6 h-6 rotate-45" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mb-10 px-2">
                        <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-md flex items-center justify-center shrink-0">
                            <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
                        </div>
                        <span className="font-serif text-2xl font-black admin-text-primary">Admin</span>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <button
                            onClick={() => {
                                setActiveTab('stats');
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Dashboard</span>
                            {activeTab === 'stats' && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>

                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => {
                                        setActiveTab('analytics');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'analytics' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Analytics</span>
                                    {activeTab === 'analytics' && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('orders');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'orders' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <ShoppingBag className="w-5 h-5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">All Orders</span>
                                    {activeTab === 'orders' && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('products');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'products' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <Package className="w-5 h-5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Products</span>
                                    {activeTab === 'products' && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('users');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'users' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <Users className="w-5 h-5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Users</span>
                                    {activeTab === 'users' && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('authority');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'authority' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <Shield className="w-5 h-5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Authority</span>
                                    {activeTab === 'authority' && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>
                            </>
                        )}

                        {(isAdmin || isSales) && (
                            <button
                                onClick={() => {
                                    setActiveTab('sales_mgmt');
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'sales_mgmt' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Target className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Sales Force</span>
                                {activeTab === 'sales_mgmt' && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </button>
                        )}

                        {(isAdmin || isLogistic) && (
                            <button
                                onClick={() => {
                                    setActiveTab('logistics');
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'logistics' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Truck className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Logistics</span>
                                {activeTab === 'logistics' && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setActiveTab('settings');
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <Settings className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>
                                {activeTab === 'settings' && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </button>
                        )}
                    </nav>

                    <div className="pt-6 admin-sidebar-footer space-y-2">
                        {/* Dark Mode Toggle — Sidebar */}
                        <button
                            onClick={toggleDarkMode}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${isDarkMode
                                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            <div className={`ml-auto w-10 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-amber-500' : 'bg-slate-200'
                                }`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isDarkMode ? 'left-5' : 'left-1'
                                    }`} />
                            </div>
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl admin-text-muted hover:admin-bg-subtle hover:admin-text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            View Website
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all font-black text-[11px] uppercase tracking-widest"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </aside>
            )}

            {/* Main Content - Full width for logistic-only users */}
            <main className={`flex-1 flex flex-col h-screen mt-16 lg:mt-0 overflow-hidden admin-main ${!isLogistic || isAdmin ? 'lg:ml-0' : 'lg:ml-0'}`}>
                <header className="flex-none p-4 md:p-6 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 admin-header">

                    <div>
                        <h1 className="font-serif text-3xl font-black text-slate-900">
                            {activeTab === 'stats' && "Overview"}
                            {activeTab === 'orders' && (orderTab === 'standard' ? "Order Management" : "Subscription Management")}
                            {activeTab === 'products' && "Product Catalog"}
                            {activeTab === 'users' && "User Directory"}
                            {activeTab === 'analytics' && "Business Intelligence"}
                            {activeTab === 'authority' && "Access Control"}
                            {activeTab === 'sales_mgmt' && "Sales Management"}
                            {activeTab === 'logistics' && "Logistics Overview"}
                            {activeTab === 'settings' && "App Settings"}
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                            {activeTab === 'stats' && "System statistics & performance"}
                            {activeTab === 'orders' && (orderTab === 'standard' ? "Manage & track all customer orders" : "Monitor recurring customer deliveries")}
                            {activeTab === 'products' && "Configure your product inventory"}
                            {activeTab === 'users' && "Manage your registered community"}
                            {activeTab === 'analytics' && "Deep insights into your business growth"}
                            {activeTab === 'authority' && "Control system access & permissions"}
                            {activeTab === 'sales_mgmt' && "Assign targets & track executive performance"}
                            {activeTab === 'logistics' && "Manage fleet, routing and orders"}
                            {activeTab === 'settings' && "Configure Razorpay payment gateway & platform credentials"}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <div className="flex items-center gap-1.5 mb-1 group/live">
                                <div className="relative">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-75" />
                                </div>
                                <span className="text-[8px] font-black text-green-600 uppercase tracking-[0.3em] font-mono leading-none">Live Connection</span>
                            </div>
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">{currentDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            <p className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-none font-mono">{currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                        </div>
                        <RefreshButton />
                        {/* Dark Mode Toggle — Desktop Header */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2.5 h-11 w-11 flex items-center justify-center rounded-xl admin-toggle-btn border transition-all shadow-sm"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode
                                ? <Sun className="w-5 h-5 text-amber-400" />
                                : <Moon className="w-5 h-5 admin-text-muted" />}
                        </button>
                        <div className="h-10 w-px admin-divider mx-2 hidden md:block"></div>

                        <div
                            className="flex items-center gap-3 pr-5 cursor-pointer group"
                            onClick={() => window.location.href = '/'}
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-black text-slate-900 group-hover:text-green-700 transition-colors">{currentUserProfile?.name || 'Super Admin'}</p>
                                <p className="text-[10px] font-bold text-green-700">Online</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-black overflow-hidden relative group-hover:scale-105 transition-transform">
                                {currentUserProfile?.profilePic ? (
                                    <img src={currentUserProfile.profilePic} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    currentUserProfile?.name?.charAt(0) || 'A'
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-fade-in mx-4 md:mx-6">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm font-bold text-red-700">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                            <Plus className="w-4 h-4 rotate-45" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 pt-0">
                    {activeTab === 'orders' ? (
                        renderOrders()
                    ) : (
                        <div className={`flex-1 ${['stats', 'products', 'users', 'logistics'].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} pr-1 -mr-1`}>
                            <div className={`max-w-[1600px] mx-auto space-y-6 ${['stats', 'products', 'users', 'logistics'].includes(activeTab) ? 'h-full flex flex-col' : ''}`}>
                                {activeTab === 'stats' && renderStats()}
                                {activeTab === 'analytics' && (
                                    <AnalyticsDashboard
                                        orders={orders}
                                        subscriptions={subscriptions}
                                        allUsers={allUsers}
                                        codSettlements={codSettlements}
                                        products={products}
                                    />
                                )}
                                {activeTab === 'products' && renderProducts()}
                                {activeTab === 'users' && renderUsers()}
                                {activeTab === 'authority' && renderAuthority()}
                                {activeTab === 'sales_mgmt' && renderSalesManagement()}
                                {activeTab === 'logistics' && renderLogistics()}
                                {activeTab === 'settings' && (
                                    <AdminSettingsPage
                                        insforgeUrl={import.meta.env.VITE_INSFORGE_URL || ''}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>


                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-0 shadow-2xl animate-scale-in rounded-[2rem] border-none overflow-hidden bg-white">
                            <div className="bg-[#FDFCF9] px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-serif text-xl font-black text-slate-900">Add New Customer</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Manual Registration</p>
                                </div>
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter customer name"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                        value={newUserData.name}
                                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="Enter phone number"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                        value={newUserData.phone}
                                        onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="Enter email address (optional)"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Address</label>
                                    <input
                                        type="text"
                                        placeholder="Enter village or area"
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-green-600 focus:bg-white outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                        value={newUserData.address}
                                        onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black border-2 border-slate-100 tracking-widest" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
                                    <Button className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-green-100" onClick={handleAddUser}>Create User</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </main>

            {/* ── REAL-TIME PREMIUM NEW ORDER TOAST ── */}
            {newOrderToast.visible && (
                <div
                    className="fixed bottom-8 right-8 z-[9999] group animate-toast-slide-in"
                    style={{ minWidth: '340px' }}
                >
                    <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

                        <div className="relative flex items-center gap-4">
                            <div className="relative shrink-0">
                                <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                                    <ShoppingBag className="w-7 h-7 text-green-400" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase text-green-400 tracking-[0.3em]">New Order Arrival</span>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <h4 className="text-white font-serif text-lg font-black truncate">
                                    {newOrderToast.customerName}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">₹{newOrderToast.amount}</span>
                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ID: {newOrderToast.orderId}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setNewOrderToast(p => ({ ...p, visible: false }))}
                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`

                /* ── Admin Shell Dark/Light Mode ─────────────────────── */
                .admin-shell.admin-light {
                    background-color: #FDFCF9;
                    color: #0f172a;
                }
                .admin-shell.admin-dark {
                    background-color: #0a0f1a;
                    color: #e2e8f0;
                }

                /* Sidebar */
                .admin-light .admin-sidebar  { background:#ffffff; border-color:#f1f5f9; }
                .admin-dark  .admin-sidebar  { background:#0f1629; border-color:#1e293b; }

                /* Main content background */
                .admin-light .admin-main { background:#FDFCF9; }
                .admin-dark  .admin-main { background:#0a0f1a; }

                /* Header strips */
                .admin-light .admin-header { background:rgba(255,255,255,0.85); border-color:#f1f5f9; }
                .admin-dark  .admin-header { background:rgba(15,22,41,0.92); border-color:#1e293b; }

                /* Text helpers */
                .admin-light .admin-text-primary { color:#0f172a; }
                .admin-dark  .admin-text-primary { color:#f1f5f9; }
                .admin-light .admin-text-muted   { color:#94a3b8; }
                .admin-dark  .admin-text-muted   { color:#64748b; }

                /* Subtle hover bg */
                .admin-light .hover\:admin-bg-subtle:hover { background:#f8fafc; }
                .admin-dark  .hover\:admin-bg-subtle:hover { background:#1e293b; }

                /* Toggle button */
                .admin-light .admin-toggle-btn { background:#f8fafc; border-color:#e2e8f0; color:#64748b; }
                .admin-light .admin-toggle-btn:hover { background:#f1f5f9; border-color:#cbd5e1; color:#0f172a; }
                .admin-dark  .admin-toggle-btn { background:#1e293b; border-color:#334155; color:#94a3b8; }
                .admin-dark  .admin-toggle-btn:hover { background:#273548; border-color:#475569; }

                /* Divider */
                .admin-light .admin-divider { background:#f1f5f9; }
                .admin-dark  .admin-divider { background:#1e293b; }

                /* Sidebar footer border */
                .admin-light .admin-sidebar-footer { border-top:1px solid #f8fafc; }
                .admin-dark  .admin-sidebar-footer { border-top:1px solid #1e293b; }

                /* Nav buttons in sidebar */
                .admin-light aside button.admin-nav-tab  { color:#94a3b8; }
                .admin-light aside button.admin-nav-tab:hover { background:#f8fafc; color:#0f172a; }
                .admin-dark  aside button               { color:#64748b; }
                .admin-dark  aside button:hover:not([class*="bg-green"]):not([class*="red"]):not([class*="amber"]) { background:#1e293b; color:#e2e8f0; }

                /* Cards in dark mode */
                .admin-dark .bg-white {
                    background-color: #131c30 !important;
                    border-color: #1e293b !important;
                    color: #e2e8f0;
                }
                .admin-dark .bg-\[\#FDFCF9\] { background-color:#0f1629 !important; }
                .admin-dark .bg-slate-50,
                .admin-dark .bg-slate-50\/50,
                .admin-dark .bg-slate-50\/30 { background-color:#1e293b !important; }
                .admin-dark .bg-slate-100 { background-color:#1e293b !important; }
                .admin-dark .border-slate-100 { border-color:#1e293b !important; }
                .admin-dark .border-slate-50  { border-color:#1a2440 !important; }
                .admin-dark .border-slate-200 { border-color:#334155 !important; }
                .admin-dark .text-slate-900 { color:#f1f5f9 !important; }
                .admin-dark .text-slate-800 { color:#e2e8f0 !important; }
                .admin-dark .text-slate-700 { color:#cbd5e1 !important; }
                .admin-dark .text-slate-600 { color:#94a3b8 !important; }
                .admin-dark .text-slate-500 { color:#64748b !important; }
                .admin-dark .text-slate-400 { color:#475569 !important; }
                .admin-dark .divide-slate-50>*+* { border-color:#1a2440 !important; }
                .admin-dark table thead tr  { background-color:#1e293b !important; }
                .admin-dark table tbody tr:hover { background-color:#1a2440 !important; }
                .admin-dark input, .admin-dark textarea, .admin-dark select {
                    background-color:#1e293b !important;
                    border-color:#334155 !important;
                    color:#f1f5f9 !important;
                }
                .admin-dark input::placeholder { color:#475569; }

                /* ── End Dark Mode ─────────────────────────────────── */

                @keyframes cardFlipUp {
                    0%   { opacity: 0; transform: perspective(900px) rotateX(-25deg) translateY(40px) scale(0.94); }
                    60%  { opacity: 1; transform: perspective(900px) rotateX(4deg)  translateY(-6px)  scale(1.01); }
                    100% { opacity: 1; transform: perspective(900px) rotateX(0deg)  translateY(0)     scale(1);    }
                }
                @keyframes liquidPulse {
                    0% { background-position: 0% 50%; opacity: 0.8; }
                    50% { background-position: 100% 50%; opacity: 1; }
                    100% { background-position: 0% 50%; opacity: 0.8; }
                }
                .animate-liquid-pulse {
                    background: linear-gradient(-45deg, rgba(239, 68, 68, 0.4), rgba(34, 197, 94, 0.4), rgba(59, 130, 246, 0.4));
                    background-size: 400% 400%;
                    animation: liquidPulse 8s ease infinite;
                }
                @keyframes bounce-smooth {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-smooth {
                    animation: bounce-smooth 4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
                }
                @keyframes toast-slide-in {
                    from { opacity: 0; transform: translateX(120%) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                .animate-toast-slide-in {
                    animation: toast-slide-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-modal-slide-up {
                    animation: modalSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </div >
    );

    function renderLogistics() {
        // All delivery staff (both active and inactive) — for the roster display
        const allDeliveryStaff = allUsers.filter(u =>
            u.role === 'delivery' || authorities.some(a => a.userId === u.id && a.role === 'delivery')
        ).sort((a, b) => {
            // Active first, then inactive
            if (a.isAvailable && !b.isAvailable) return -1;
            if (!a.isAvailable && b.isAvailable) return 1;
            return 0;
        });
        // Only active staff — used for order assignment dropdowns
        const deliveryStaff = allDeliveryStaff.filter(u => u.isAvailable === true);
        const customers = allUsers.filter(u =>
            u.role === 'customer' ||
            orders.some(o => o.userId === u.id)
        ).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        const handleAssignToCustomer = async (customerId: string, deliveryPersonId: string | null) => {
            const customerIdLower = customerId.toLowerCase();
            const driverIdLower = deliveryPersonId?.toLowerCase();

            // 1. Update user profile
            const updatedUsers = allUsers.map(u =>
                u.id?.toLowerCase() === customerIdLower
                    ? { ...u, assignedDeliveryPersonId: deliveryPersonId }
                    : u
            );
            setAllUsers(updatedUsers);

            const customer = updatedUsers.find(u => u.id?.toLowerCase() === customerIdLower);
            if (customer) {
                await storageService.saveUser(customer);
            }

            // 2. Automatically assign/unlink all relevant orders of this customer
            const updatedOrders = orders.map(order => {
                const isMatch = order.userId?.toLowerCase() === customerIdLower && (order.status === 'pending' || order.status === 'assigned');
                if (isMatch) {
                    const nextStatus = deliveryPersonId ? 'assigned' : 'pending';
                    return { ...order, deliveryPersonId: deliveryPersonId, status: nextStatus as any };
                }
                return order;
            });
            setOrders(updatedOrders);

            // Sync these matching orders to DB
            const affectedOrders = updatedOrders.filter(o => o.userId?.toLowerCase() === customerIdLower && (o.status === 'pending' || o.status === 'assigned'));
            for (const order of affectedOrders) {
                await storageService.saveOrder(order);
            }
            // Notify delivery person of new customer assignment
            if (deliveryPersonId) {
                const customerName = updatedUsers.find(u => u.id?.toLowerCase() === customerIdLower)?.name || 'A customer';
                notificationService.createNotification({
                    userId: deliveryPersonId,
                    title: '👥 Customer Assigned',
                    message: `${customerName} has been assigned to your route for future deliveries.`,
                    type: 'delivery',
                }).catch(() => { });
            }
        };

        const handleAssignToOrder = async (orderId: string, deliveryPersonId: string | null) => {
            const orderIdLower = orderId.toLowerCase();
            // CORRECT FLOW: Assigning a driver does NOT change status.
            // Status stays 'pending' until admin explicitly clicks "Confirm Order".
            const updatedOrders = orders.map(o => {
                if (o.id?.toLowerCase() === orderIdLower) {
                    return { ...o, deliveryPersonId: deliveryPersonId };
                }
                return o;
            });
            setOrders(updatedOrders);

            if (selectedMissionOrder && selectedMissionOrder.id.toLowerCase() === orderIdLower) {
                setSelectedMissionOrder(prev => prev ? { ...prev, deliveryPersonId: deliveryPersonId } : null);
            }

            const targetOrder = updatedOrders.find(o => o.id?.toLowerCase() === orderIdLower);
            if (targetOrder) {
                await storageService.saveOrder(targetOrder);
            }
        };

        // Calculate today's workload
        const today = new Date();
        const todayStr = today.toDateString();

        const todayOrders = orders.filter(o =>
            // Include all pending, confirmed, and assigned orders (workload) OR any order completed today (activity)
            ['pending', 'confirmed', 'assigned', 'out_for_delivery'].includes(o.status) || new Date(o.createdAt).toDateString() === todayStr
        );

        // Get active subscriptions for today
        const getNextDeliveryDate = (deliveryDate: number): Date => {
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            let targetMonth = currentMonth;
            let targetYear = currentYear;

            if (currentDay > deliveryDate) {
                targetMonth = currentMonth + 1;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear = currentYear + 1;
                }
            }

            return new Date(targetYear, targetMonth, deliveryDate);
        };

        const todaySubs = subscriptions.filter(s => {
            if (s.status !== 'active') return false;
            const nextDate = getNextDeliveryDate(s.deliveryDate);
            return nextDate.toDateString() === todayStr;
        });

        // COD Logic
        const filteredSettlements = codSettlements.filter(s => s.status === codView);
        const groupedSettlements = filteredSettlements.reduce((acc, settlement) => {
            const personId = settlement.deliveryPersonId;
            if (!acc[personId]) {
                acc[personId] = {
                    name: settlement.deliveryPersonName,
                    settlements: [],
                    total: 0
                };
            }
            acc[personId].settlements.push(settlement);
            acc[personId].total += settlement.amount;
            return acc;
        }, {} as Record<string, { name: string; settlements: CODSettlement[]; total: number }>);

        const handleSettle = (settlement: CODSettlement) => {
            const updatedSettlement: CODSettlement = {
                ...settlement,
                status: 'settled',
                settledAt: new Date().toISOString(),
                settledBy: user?.id || 'admin'
            };

            storageService.updateCODSettlement(settlement.id, updatedSettlement);
            setCodSettlements(prev => prev.map(s => s.id === settlement.id ? updatedSettlement : s));
            // Notify delivery person that their COD was settled
            notificationService.createNotification({
                userId: settlement.deliveryPersonId,
                title: '✅ COD Settled',
                message: `Admin settled your ₹${settlement.amount.toFixed(0)} COD collection for order #${settlement.orderId.toUpperCase()}.`,
                type: 'system',
                relatedId: settlement.orderId,
                relatedType: 'order',
            }).catch(() => { });
        };

        const handleSettleCOD = (staffId: string) => {
            const pending = codSettlements.filter(s => s.deliveryPersonId === staffId && s.status === 'pending');
            pending.forEach(s => handleSettle(s));
        };

        const handleConfirmOrder = async (orderId: string) => {
            const orderToConfirm = orders.find(o => o.id === orderId);
            if (!orderToConfirm) return;

            const customer = allUsers.find(u => u.id === orderToConfirm.userId);

            // Determine delivery person: use order's existing assignment, or fall back to customer's default
            const effectiveDeliveryPersonId = orderToConfirm.deliveryPersonId || customer?.assignedDeliveryPersonId || null;
            const deliveryPerson = effectiveDeliveryPersonId
                ? allUsers.find(u => u.id?.toLowerCase() === effectiveDeliveryPersonId.toLowerCase())
                : null;

            // 🚫 BLOCK: Cannot confirm without an assigned delivery person
            if (!effectiveDeliveryPersonId || !deliveryPerson) {
                alert('⚠️ Cannot confirm order — please assign a delivery driver first before confirming.');
                return;
            }

            // Use existing OTP or generate a new one ONLY if it doesn't exist
            const otp = orderToConfirm.deliveryOTP || Math.floor(1000 + Math.random() * 9000).toString();

            const updatedOrder = {
                ...orderToConfirm,
                status: 'confirmed' as const,
                deliveryPersonId: effectiveDeliveryPersonId ?? orderToConfirm.deliveryPersonId,
                deliveryOTP: otp
            };

            // Optimistic update
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));

            try {
                await storageService.saveOrder(updatedOrder);
                // Notify the customer
                await notifyOrderStatusChange(orderToConfirm.userId, orderId, 'confirmed').catch(() => { });
                // Publish real-time event for customer UI instant update
                storageService.publishOrderStatusUpdate(orderId, 'confirmed', orderToConfirm.userId).catch(() => { });
                // Notify the delivery person if assigned
                if (effectiveDeliveryPersonId && deliveryPerson) {
                    notifyDeliveryAssigned(effectiveDeliveryPersonId, orderId, customer?.name || 'Customer').catch(() => { });
                    notificationService.createNotification({
                        userId: effectiveDeliveryPersonId,
                        title: '📦 New Order Confirmed',
                        message: `Order #${orderId.toUpperCase()} for ${customer?.name || 'a customer'} has been confirmed by admin. Accept it from your dashboard.`,
                        type: 'delivery',
                        relatedId: orderId,
                        relatedType: 'order'
                    }).catch(() => { });
                }
            } catch (error) {
                console.error("Failed to confirm order:", error);
                alert('Failed to confirm order. Please try again.');
                fetchData();
            }
        };


        const handleSetOutForDelivery = async (orderId: string) => {
            if (!window.confirm('Mark this mission as Out for Delivery?')) return;

            const updatedOrders = orders.map(o => {
                if (o.id === orderId) {
                    return { ...o, status: 'out_for_delivery' as const };
                }
                return o;
            });
            setOrders(updatedOrders);

            const targetOrder = updatedOrders.find(o => o.id === orderId);
            if (targetOrder) {
                try {
                    await storageService.saveOrder(targetOrder);
                    await notifyOrderStatusChange(targetOrder.userId, orderId, 'out_for_delivery').catch(() => { });
                    // Publish real-time event for customer UI instant update
                    storageService.publishOrderStatusUpdate(orderId, 'out_for_delivery', targetOrder.userId).catch(() => { });
                } catch (error) {
                    console.error("Failed to update mission status:", error);
                    alert('Failed to update status.');
                    fetchData();
                }
            }
        };

        const handleReturnOrder = async (orderId: string) => {
            if (!window.confirm('Confirm collection of returned asset?')) return;

            const updatedOrders = orders.map(o => {
                if (o.id === orderId) {
                    return { ...o, status: 'returned' as any, returnConfirmed: true };
                }
                return o;
            });
            setOrders(updatedOrders);

            const targetOrder = updatedOrders.find(o => o.id === orderId);
            if (targetOrder) {
                try {
                    await storageService.saveOrder(targetOrder);
                    await notifyOrderStatusChange(targetOrder.userId, orderId, 'returned' as any).catch(() => { });
                    // Publish real-time event for customer UI instant update
                    storageService.publishOrderStatusUpdate(orderId, 'returned', targetOrder.userId).catch(() => { });
                } catch (error) {
                    console.error("Failed to collect return:", error);
                    alert('Failed to update status.');
                    fetchData();
                }
            }
        };

        const handleMarkAsDelivered = async (orderId: string) => {
            if (!window.confirm('Mark this order as Delivered?')) return;

            const updatedOrders = orders.map(o => {
                if (o.id === orderId) {
                    return { ...o, status: 'delivered' as const };
                }
                return o;
            });
            setOrders(updatedOrders);

            const targetOrder = updatedOrders.find(o => o.id === orderId);
            if (targetOrder) {
                try {
                    await storageService.saveOrder(targetOrder);
                    await notifyOrderStatusChange(targetOrder.userId, orderId, 'delivered').catch(() => { });
                    storageService.publishOrderStatusUpdate(orderId, 'delivered', targetOrder.userId).catch(() => { });
                } catch (error) {
                    console.error("Failed to update status:", error);
                    alert('Failed to update status.');
                    fetchData();
                }
            }
        };



        const staffCODStats = codSettlements.reduce((acc, s) => {
            if (!acc[s.deliveryPersonId]) {
                acc[s.deliveryPersonId] = { totalPending: 0, totalSettled: 0, pendingCount: 0 };
            }
            if (s.status === 'pending') {
                acc[s.deliveryPersonId].totalPending += s.amount;
                acc[s.deliveryPersonId].pendingCount += 1;
            } else {
                acc[s.deliveryPersonId].totalSettled += s.amount;
            }
            return acc;
        }, {} as Record<string, { totalPending: number; totalSettled: number; pendingCount: number }>);



        return (
            <div className={`animate-fade-in relative ${activeTab === 'logistics' ? 'h-full flex flex-col overflow-hidden pb-4 gap-4' : 'space-y-4'}`}>
                {/* Logistics Command Header - Title moved to main app header */}
                <div className="flex">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-fit gap-1 mb-2">
                        {[
                            { id: 'overview', icon: <Users className="w-4 h-4" />, label: 'Fleet' },
                            { id: 'routing', icon: <MapPin className="w-4 h-4" />, label: 'Routing' },
                            { id: 'all', icon: <History className="w-4 h-4" />, label: 'Orders History' },
                            { id: 'cod', icon: <Wallet className="w-4 h-4" />, label: 'Payments' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setDeliveryTab(tab.id as any)}
                                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all ${deliveryTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>


                {deliveryTab === 'overview' ? (
                    <div className="flex-1 flex flex-col overflow-hidden gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-500 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">Active Fleet</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Agents</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-3xl font-bold text-slate-900">{deliveryStaff.length}</p>
                                        <div className="flex -space-x-2">
                                            {deliveryStaff.slice(0, 3).map((staff, i) => (
                                                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                                    {staff.profilePic ? <img src={staff.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">{staff.name.charAt(0)}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-500 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider">Processing</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Orders</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-3xl font-bold text-slate-900">{orders.filter(o => ['pending', 'confirmed', 'assigned'].includes(o.status)).length}</p>
                                        <div className="flex-1 mx-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-500 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg uppercase tracking-wider">Scheduled</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Today's Subs</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-3xl font-bold text-slate-900">{todaySubs.length}</p>
                                        <div className="flex-1 mx-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full w-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => setDeliveryTab('cod')}
                                className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between hover:bg-slate-800 transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shadow-sm">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg uppercase tracking-wider">Payments</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Held Cash</p>
                                    <p className="text-2xl font-bold text-white">
                                        ₹{codSettlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 overflow-hidden">
                            {/* Team Roster - High Fidelity Fleet List */}
                            <div className="lg:col-span-3 space-y-6 overflow-y-auto custom-scrollbar h-full pr-2">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        Delivery Agents
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-400">{deliveryStaff.length} Online</span>
                                </div>

                                <div className="space-y-3">
                                    {deliveryStaff.length === 0 ? (
                                        <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs font-semibold text-slate-400">No agents online</p>
                                        </div>
                                    ) : (
                                        deliveryStaff.map((staff) => {
                                            const codStats = staffCODStats[staff.id] || { totalPending: 0 };
                                            return (
                                                <div
                                                    key={staff.id}
                                                    className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-500 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative group/avatar">
                                                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-white shadow-sm overflow-hidden shrink-0 transition-transform group-hover/avatar:scale-105">
                                                                {staff.profilePic ? <img src={staff.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">{staff.name.charAt(0)}</div>}
                                                            </div>
                                                            <div className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm">
                                                                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className="text-xs font-bold text-slate-900 truncate">{staff.name}</p>
                                                                <span className="flex items-center gap-1 text-[8px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                                                                    Online
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-medium text-slate-500 truncate">{staff.phone}</p>
                                                        </div>
                                                        {codStats.totalPending > 0 && (
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-bold text-amber-600">₹{codStats.totalPending}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Today's Dispatch - Mission Board */}
                            <div className="lg:col-span-9 flex flex-col h-full overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-900">Orders Board</h3>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search orders..."
                                            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-500 transition-all w-64"
                                            value={missionBoardSearchQuery}
                                            onChange={(e) => setMissionBoardSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                    {(orders.filter(o =>
                                        o.status !== 'delivered' &&
                                        !o.returnConfirmed && (
                                            !missionBoardSearchQuery.trim() ||
                                            (o.id && o.id.toLowerCase().includes(missionBoardSearchQuery.toLowerCase().trim())) ||
                                            (allUsers.find(u => u.id === o.userId)?.name || '').toLowerCase().includes(missionBoardSearchQuery.toLowerCase().trim())
                                        )
                                    ).length === 0 && todaySubs.length === 0) ? (
                                        <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-200">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Orders Found</p>
                                        </div>
                                    ) : (
                                        <>
                                            {orders
                                                .filter(o =>
                                                    o.status !== 'delivered' &&
                                                    !o.returnConfirmed && (
                                                        !missionBoardSearchQuery.trim() ||
                                                        (o.id && o.id.toLowerCase().includes(missionBoardSearchQuery.toLowerCase().trim())) ||
                                                        (allUsers.find(u => u.id === o.userId)?.name || '').toLowerCase().includes(missionBoardSearchQuery.toLowerCase().trim())
                                                    )
                                                )
                                                .sort((a, b) => {
                                                    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                                    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                                    return timeB - timeA;
                                                })
                                                .map((order) => {
                                                    const customer = allUsers.find(u => u.id === order.userId);
                                                    const assignedAgent = allDeliveryStaff.find(s => s.id === order.deliveryPersonId) ||
                                                        (customer?.assignedDeliveryPersonId ? allDeliveryStaff.find(s => s.id === customer.assignedDeliveryPersonId) : null);
                                                    const canConfirm = !!(order.deliveryPersonId || customer?.assignedDeliveryPersonId);
                                                    const orderIDFormatted = (order.id || '').toUpperCase();

                                                    return (
                                                        <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 transition-all group/card">
                                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                                                {/* 1. ID & Timestamp (2 cols) */}
                                                                <div className="lg:col-span-2">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Order ID</p>
                                                                    <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-100 inline-flex items-center gap-2">
                                                                        <p className="text-xs font-black text-slate-900 font-mono tracking-tight leading-none">{orderIDFormatted}</p>
                                                                        <button
                                                                            onClick={() => { navigator.clipboard.writeText(orderIDFormatted); }}
                                                                            className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                                            title="Copy ID"
                                                                        >
                                                                            <Copy className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                    {(order.orderType === 'Subscription' || order.subscriptionId) && (
                                                                        <div className="mt-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[8px] font-bold text-purple-700 uppercase tracking-wider w-fit">
                                                                            <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                                                            Subscription
                                                                        </div>
                                                                    )}
                                                                    {order.deliveryOTP && (
                                                                        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg w-fit">
                                                                            <Key className="w-3 h-3 text-blue-600" />
                                                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-tight">OTP: {order.deliveryOTP}</p>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Date N/A'}</p>

                                                                </div>

                                                                {/* 2. Customer Profile (2 cols) */}
                                                                <div className="lg:col-span-2 flex flex-col gap-1.5">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                            {customer?.profilePic ? <img src={customer.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users className="w-4 h-4" /></div>}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-slate-900 truncate leading-none">{customer?.name || 'Guest User'}</p>
                                                                            <p className="text-[9px] font-semibold text-slate-400 mt-1">{customer?.phone || 'No Phone'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* 3. Order Details (3 cols) */}
                                                                <div className="lg:col-span-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</p>
                                                                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/50">{(order.items || []).length}</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {(order.items || []).slice(0, 3).map((item, idx) => (
                                                                            <span key={idx} className="text-[10px] font-bold bg-white border border-slate-100 px-2 py-0.5 rounded text-slate-600 shadow-sm">
                                                                                {item.product?.name || 'Item'} × {item.quantity}
                                                                            </span>
                                                                        ))}
                                                                        {(order.items || []).length > 3 && (
                                                                            <span className="text-[10px] font-bold text-slate-400">+{(order.items || []).length - 3} more</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 4. Delivery Agent (1 col) */}
                                                                <div className="lg:col-span-1 flex flex-col gap-1 items-center text-center">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full text-left">Agent</p>
                                                                    {assignedAgent ? (
                                                                        <>
                                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shadow-sm">
                                                                                {assignedAgent.profilePic ? <img src={assignedAgent.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-indigo-300"><Truck className="w-4 h-4" /></div>}
                                                                            </div>
                                                                            <p className="text-[9px] font-bold text-slate-700 truncate w-full leading-tight">{assignedAgent.name}</p>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center opacity-40">
                                                                                <Truck className="w-4 h-4 text-slate-400" />
                                                                            </div>
                                                                            <p className="text-[9px] font-bold text-slate-400">None</p>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* 5. Total & Payment (1 col) */}
                                                                <div className="lg:col-span-1">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total</p>
                                                                    <p className="text-sm font-black text-slate-900 leading-none">₹{(order.total || 0).toLocaleString()}</p>
                                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2">{order.paymentMethod || 'COD'}</p>
                                                                </div>

                                                                {/* 6. Actions (3 cols) */}
                                                                <div className="lg:col-span-3 flex flex-col gap-2">
                                                                    <div className="flex items-center justify-start">
                                                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide border shadow-sm whitespace-nowrap ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                            order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                                order.status === 'confirmed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                                                    order.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                                        'bg-slate-50 text-slate-600 border-slate-100'
                                                                            }`}>
                                                                            {order.status.replace(/_/g, ' ')}
                                                                        </span>
                                                                    </div>
                                                                    {/* Row 2: Assign agent + Confirm/Return */}
                                                                    <div className="flex items-center gap-2">
                                                                        <select
                                                                            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                                                                            value={order.deliveryPersonId || ''}
                                                                            onChange={(e) => handleAssignToOrder(order.id, e.target.value)}
                                                                            disabled={order.status === 'delivered'}
                                                                        >
                                                                            <option value="">Agent</option>
                                                                            {deliveryStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                        </select>
                                                                        {order.status === 'pending' && canConfirm && (
                                                                            <button
                                                                                onClick={() => handleConfirmOrder(order.id)}
                                                                                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95`}
                                                                            >
                                                                                Confirm
                                                                            </button>
                                                                        )}
                                                                        {['returned', 'attempted', 'cancelled'].includes(order.status) && !order.returnConfirmed && (
                                                                            <button
                                                                                onClick={() => handleConfirmReturn(order.id)}
                                                                                className="shrink-0 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95"
                                                                            >
                                                                                Confirm Return
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                            {todaySubs.filter(sub => (
                                                !missionBoardSearchQuery ||
                                                (allUsers.find(u => u.id === sub.userId)?.name || '').toLowerCase().includes(missionBoardSearchQuery.toLowerCase())
                                            )).map((sub) => {
                                                const customer = allUsers.find(u => u.id === sub.userId);
                                                const assignedAgent = allDeliveryStaff.find(s => s.id?.toLowerCase() === customer?.assignedDeliveryPersonId?.toLowerCase());

                                                return (
                                                    <div key={sub.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500 hover:border-indigo-400 transition-all group/card">
                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                                            {/* 1. ID & Timestamp (2 cols) */}
                                                            <div className="lg:col-span-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sub ID</p>
                                                                <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-100 inline-flex items-center gap-2">
                                                                    <p className="text-sm font-black text-slate-900 font-mono tracking-tight leading-none">{sub.id}</p>
                                                                    <button
                                                                        onClick={() => { navigator.clipboard.writeText(sub.id); }}
                                                                        className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                                        title="Copy ID"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Recurring</p>
                                                            </div>

                                                            {/* 2. Customer Profile (2 cols) */}
                                                            <div className="lg:col-span-2 flex flex-col gap-1.5">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                        {customer?.profilePic ? <img src={customer.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users className="w-5 h-5" /></div>}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-slate-900 truncate leading-none">{customer?.name || 'Guest User'}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">{customer?.phone || 'No Phone'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3. Subscription Details (3 cols) */}
                                                            <div className="lg:col-span-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Details</p>
                                                                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/50">{(sub.items || []).length}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {(sub.items || []).slice(0, 2).map((item: any, idx: number) => (
                                                                        <span key={idx} className="text-[10px] font-bold bg-white border border-slate-100 px-2 py-0.5 rounded text-slate-600 shadow-sm">
                                                                            {item.product?.name || 'Item'} × {item.quantity}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* 4. Delivery Partner (2 cols) */}
                                                            <div className="lg:col-span-2 flex flex-col gap-1.5">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery</p>
                                                                {assignedAgent ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                            {assignedAgent.profilePic ? <img src={assignedAgent.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-indigo-300"><Truck className="w-5 h-5" /></div>}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-slate-900 truncate leading-none">{assignedAgent.name}</p>
                                                                            {!assignedAgent.isAvailable && (
                                                                                <p className="text-[9px] font-bold uppercase mt-1.5 text-slate-400">Offline</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-3 opacity-50">
                                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                                            <Truck className="w-5 h-5 text-slate-300" />
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Not Assigned</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 5. Total & Freq (1 col) */}
                                                            <div className="lg:col-span-1">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total</p>
                                                                <p className="text-sm font-black text-slate-900 leading-none">₹{(sub.total || 0).toLocaleString()}</p>
                                                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2">{sub.deliveryFrequency || 'Daily'}</p>
                                                            </div>

                                                            {/* 6. Control Section (2 cols) */}
                                                            <div className="lg:col-span-2 flex flex-col justify-center items-end gap-3 h-full">
                                                                <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                                                                    Recurring Plan
                                                                </span>
                                                                {orders.some(o => (o.subscriptionId === sub.id || o.id === sub.id) && new Date(o.createdAt).toDateString() === todayStr) ? (
                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Order Created</span>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!window.confirm(`Generate a delivery order for ${customer?.name || 'this customer'} today?`)) return;
                                                                            try {
                                                                                // Generate a new order for this subscription for today
                                                                                const newOrder: Omit<Order, 'id' | 'createdAt' | 'deliveryOTP'> = {
                                                                                    userId: sub.userId,
                                                                                    subscriptionId: sub.id,
                                                                                    items: sub.products.map((p: any) => ({
                                                                                        product: p,
                                                                                        quantity: p.quantity || 1,
                                                                                        price: p.price
                                                                                    })),
                                                                                    total: sub.total || sub.products.reduce((acc: number, p: any) => acc + (p.price * (p.quantity || 1)), 0),
                                                                                    status: 'confirmed',
                                                                                    paymentMethod: 'Online', // Subscriptions are usually prepaid
                                                                                    paymentStatus: 'paid',
                                                                                    orderType: 'Subscription',
                                                                                    deliveryDate: new Date().toISOString(),
                                                                                    deliveryPersonId: customer?.assignedDeliveryPersonId || null,
                                                                                    notes: `Auto-generated from plan ${sub.id}`
                                                                                };

                                                                                const saved = await storageService.saveOrder(newOrder);
                                                                                setOrders(prev => [saved, ...prev]);

                                                                                // Notify customer
                                                                                await notifyOrderStatusChange(sub.userId, saved.id, 'confirmed');

                                                                                // Notify driver if assigned
                                                                                if (saved.deliveryPersonId) {
                                                                                    notifyDeliveryAssigned(saved.deliveryPersonId, saved.id, customer?.name || 'Customer');
                                                                                }

                                                                                alert(`Successfully generated subscription order #${saved.id.toUpperCase()}`);
                                                                            } catch (err) {
                                                                                console.error("Failed to generate sub order:", err);
                                                                                alert("Generation failed.");
                                                                            }
                                                                        }}
                                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                                                                    >
                                                                        <PlusCircle className="w-4 h-4" />
                                                                        Generate Delivery
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-100 bg-slate-50 text-slate-400 shadow-sm">
                            <RefreshCw className="w-3 h-3 animate-spin-slow" />
                            <span className="text-[9px] font-bold tracking-widest uppercase">System synchronized</span>
                        </div>
                    </div>
                ) : deliveryTab === 'routing' ? (
                    <div className="space-y-6 animate-fade-in flex-1 overflow-hidden flex flex-col">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                            <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact / Address</th>
                                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Default Agent</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {customers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">No customers found in registry</td>
                                            </tr>
                                        ) : (
                                            customers.map((cust) => {
                                                const hasActiveOrder = orders.some(o => o.userId === cust.id && ['pending', 'confirmed', 'assigned', 'out_for_delivery'].includes(o.status));
                                                return (
                                                    <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                    {cust.profilePic ? <img src={cust.profilePic} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-slate-300" />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900">{cust.name || 'Anonymous User'}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5 group/cid">
                                                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-2">
                                                                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tight uppercase leading-none">MB-U-{cust.id.slice(-6).toUpperCase()}</p>
                                                                            <button
                                                                                onClick={() => { navigator.clipboard.writeText(cust.id); }}
                                                                                className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                                                title="Copy Full ID"
                                                                            >
                                                                                <Copy className="w-2.5 h-2.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {hasActiveOrder && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" title="Active Order" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-bold text-slate-700">{cust.phone || 'No Phone'}</p>
                                                                <p className="text-[11px] text-slate-500 truncate max-w-[250px]">{cust.address || 'Address not set'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {cust.assignedDeliveryPersonId ? (
                                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg w-fit">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{deliveryStaff.find(s => s.id === cust.assignedDeliveryPersonId)?.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg border-dashed italic">Not Assigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <select
                                                                value={cust.assignedDeliveryPersonId || ''}
                                                                onChange={(e) => handleAssignToCustomer(cust.id, e.target.value || null)}
                                                                className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none text-center"
                                                            >
                                                                <option value="">Assign Agent</option>
                                                                {deliveryStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                {cust.assignedDeliveryPersonId && <option value="">Remove Assignment</option>}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : deliveryTab === 'all' ? (
                    <div className="flex-1 flex flex-col overflow-hidden gap-6 animate-fade-in pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Orders History</h3>
                                <p className="text-xs text-slate-500 mt-1">Complete record of every logistical mission</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full lg:w-fit">
                                <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settled</p>
                                        <h4 className="text-lg font-bold text-slate-900">{orders.filter(o => o.status === 'delivered').length}</h4>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                        <RotateCcw className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returns</p>
                                        <h4 className="text-lg font-bold text-slate-900">{orders.filter(o => ['returned', 'attempted', 'cancelled'].includes(o.status)).length}</h4>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                                        <Box className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
                                        <h4 className="text-lg font-bold text-slate-900">{orders.length}</h4>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
                                        <h4 className="text-lg font-bold text-slate-900">₹{(orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)).toLocaleString()}</h4>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search complete history..."
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 transition-all text-sm font-medium"
                                    value={missionSearchQuery}
                                    onChange={(e) => setMissionSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {orders.filter(o =>
                                !missionSearchQuery.trim() ||
                                (o.id && o.id.toLowerCase().includes(missionSearchQuery.toLowerCase().trim())) ||
                                (allUsers.find(u => u.id === o.userId)?.name || '').toLowerCase().includes(missionSearchQuery.toLowerCase().trim())
                            ).length === 0 ? (
                                <div className="bg-slate-50 rounded-2xl p-16 text-center border border-dashed border-slate-200">
                                    <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Order Records Found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 pb-4">
                                    {orders
                                        .filter(o =>
                                            !missionSearchQuery.trim() ||
                                            (o.id && o.id.toLowerCase().includes(missionSearchQuery.toLowerCase().trim())) ||
                                            (allUsers.find(u => u.id === o.userId)?.name || '').toLowerCase().includes(missionSearchQuery.toLowerCase().trim())
                                        )
                                        .sort((a, b) => {
                                            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                            return timeB - timeA;
                                        })
                                        .map((order) => {
                                            const customer = allUsers.find(u => u.id === order.userId);
                                            const assignedDriver = allDeliveryStaff.find(s => s.id === order.deliveryPersonId) ||
                                                (customer?.assignedDeliveryPersonId ? allDeliveryStaff.find(s => s.id === customer.assignedDeliveryPersonId) : null);

                                            return (
                                                <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-500 transition-all group/card">
                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                                        {/* 1. ID & Date */}
                                                        <div className="lg:col-span-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mission ID</p>
                                                            <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-100 inline-flex items-center gap-2">
                                                                <p className="text-sm font-black text-slate-900 font-mono tracking-tight leading-none">{(order.id || '').toUpperCase()}</p>
                                                                <button
                                                                    onClick={() => { navigator.clipboard.writeText((order.id || '').toUpperCase()); }}
                                                                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                                    title="Copy ID"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Date N/A'}</p>
                                                        </div>

                                                        {/* 2. Customer Profile */}
                                                        <div className="lg:col-span-2 flex flex-col gap-1.5">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                    {customer?.profilePic ? <img src={customer.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users className="w-5 h-5" /></div>}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-slate-900 truncate leading-none">{customer?.name || 'Guest User'}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">{customer?.phone || 'No Phone'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 3. Order Details */}
                                                        <div className="lg:col-span-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</p>
                                                                <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/50">{(order.items || []).length}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(order.items || []).slice(0, 2).map((item, idx) => (
                                                                    <span key={idx} className="text-[10px] font-bold bg-white border border-slate-100 px-2 py-0.5 rounded text-slate-600 shadow-sm">
                                                                        {item.product?.name || 'Item'} × {item.quantity}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* 4. Delivery Agent */}
                                                        <div className="lg:col-span-2 flex flex-col gap-1.5">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</p>
                                                            {assignedDriver ? (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                        {assignedDriver.profilePic ? <img src={assignedDriver.profilePic} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-indigo-300"><Truck className="w-5 h-5" /></div>}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-slate-900 truncate leading-none">{assignedDriver.name}</p>
                                                                        <p className="text-[9px] font-bold uppercase mt-1.5 text-slate-400">{assignedDriver.isAvailable ? 'Online' : 'Offline'}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] font-bold text-slate-300 uppercase italic">Not Assigned</p>
                                                            )}
                                                        </div>

                                                        {/* 5. Cost & Status */}
                                                        <div className="lg:col-span-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount</p>
                                                            <p className="text-sm font-black text-slate-900 leading-none">₹{(order.total || 0).toLocaleString()}</p>
                                                        </div>

                                                        <div className="lg:col-span-2 flex flex-col gap-2">
                                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-dashed text-center ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                    ['returned', 'cancelled'].includes(order.status) ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                        'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                                }`}>
                                                                {order.status.replace('_', ' ')}
                                                            </span>
                                                            <button
                                                                onClick={() => setSelectedMissionOrder(order)}
                                                                className="w-full py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="w-3 h-3" /> View Detail
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : deliveryTab === 'cod' ? (
                    <div className="space-y-6 animate-fade-in flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {allDeliveryStaff.map((staff) => {
                                const stats = staffCODStats[staff.id] || { totalPending: 0, totalSettled: 0, pendingCount: 0 };
                                if (stats.totalPending === 0) return null;
                                return (
                                    <div key={staff.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 transition-all flex flex-col">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                {staff.profilePic ? <img src={staff.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 bg-slate-50">{staff.name.charAt(0)}</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 truncate">{staff.name}</h4>
                                                <div className="flex items-center gap-2 mt-1 group/aid">
                                                    <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-2">
                                                        <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tight uppercase leading-none">MB-A-{staff.id.slice(-6).toUpperCase()}</p>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(staff.id); }}
                                                            className="text-slate-300 hover:text-indigo-600 transition-colors"
                                                            title="Copy ID"
                                                        >
                                                            <Copy className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">{stats.pendingCount} Pending Collections</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total to Settle</p>
                                            <p className="text-2xl font-bold text-slate-900">₹{stats.totalPending.toLocaleString()}</p>
                                        </div>

                                        <button
                                            onClick={() => handleSettleCOD(staff.id)}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-auto"
                                        >
                                            <History className="w-4 h-4" />
                                            Settle Amount
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {(Object.values(staffCODStats) as { totalPending: number }[]).every(s => s.totalPending === 0) && (
                            <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-200 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">All Accounts Settled</h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">There are currently no pending cash collections from the delivery fleet.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-200 animate-fade-in">
                        <Box className="w-10 h-10 text-slate-200 mb-4" />
                        <h3 className="font-bold text-slate-900 text-sm mb-1">Module Not Selected</h3>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Please select a sub-tab to view details</p>
                    </div>
                )
                }
                {/* Order Detail Popup Modal */}
                {
                    selectedMissionOrder && (
                        <div
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300"
                            onClick={() => setSelectedMissionOrder(null)}
                        >
                            <div
                                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white flex flex-col md:max-h-[85vh] animate-modal-slide-up"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="relative p-10 pb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-[1.25rem] bg-slate-950 flex items-center justify-center shadow-2xl shadow-slate-900/40 border border-white/10">
                                                <ShoppingBag className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-serif font-black text-slate-950 leading-none tracking-tight">Order Details</h3>
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shadow-inner">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Active</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2.5">
                                                    <div className="flex items-center gap-2 group/id">
                                                        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-3">
                                                            <p className="text-sm font-black text-slate-900 font-mono tracking-tight uppercase leading-none">
                                                                {selectedMissionOrder.id.toUpperCase().startsWith('MB') ? selectedMissionOrder.id.toUpperCase() : `MB${selectedMissionOrder.id.toUpperCase()}`}
                                                            </p>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(selectedMissionOrder.id.toUpperCase()); }}
                                                                className="text-slate-300 hover:text-slate-900 transition-colors"
                                                                title="Copy ID"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedMissionOrder(null)}
                                            className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90 border border-slate-100 shadow-sm"
                                        >
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <div className="px-8 pb-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                                    {/* Top Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Customer Detail Card */}
                                        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                                        {(allUsers.find(u => u.id === selectedMissionOrder.userId))?.profilePic ? (
                                                            <img src={(allUsers.find(u => u.id === selectedMissionOrder.userId))?.profilePic} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserCircle className="w-8 h-8 text-slate-200" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{(allUsers.find(u => u.id === selectedMissionOrder.userId))?.name || 'Customer'}</p>
                                                        <p className="text-xs text-slate-500">{(allUsers.find(u => u.id === selectedMissionOrder.userId))?.phone}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                                    <p className="text-xs text-slate-600 leading-relaxed">{(allUsers.find(u => u.id === selectedMissionOrder.userId))?.address}</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Order Status</p>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedMissionOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                            selectedMissionOrder.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {selectedMissionOrder.status.replace('_', ' ')}
                                                        </span>
                                                        <p className="text-xs font-bold text-indigo-600">₹{selectedMissionOrder.total.toLocaleString()}</p>
                                                    </div>
                                                    <div className="pt-3 border-t border-slate-100">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</p>
                                                        <p className="text-xs font-bold text-slate-700">{selectedMissionOrder.paymentMethod.toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items</p>
                                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-2 font-bold text-slate-500">Product</th>
                                                            <th className="px-4 py-2 text-center font-bold text-slate-500">Qty</th>
                                                            <th className="px-4 py-2 text-right font-bold text-slate-500">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {selectedMissionOrder.items.map((item, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-3 font-medium text-slate-700">{item.product.name}</td>
                                                                <td className="px-4 py-3 text-center text-slate-500">{item.quantity} {item.product.unit}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{((item.product?.price || 0) * item.quantity).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 font-bold border-t border-slate-100">
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-3 text-right text-slate-500">Total Amount</td>
                                                            <td className="px-4 py-3 text-right text-indigo-600 text-sm">₹{selectedMissionOrder.total.toLocaleString()}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Agent Assignment */}
                                        <div className="bg-slate-900 p-6 rounded-xl text-white">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-slate-400" />
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Delivery Agent</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <select
                                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg py-2 px-4 text-sm font-medium outline-none focus:border-white/40 transition-all appearance-none text-white"
                                                    value={selectedMissionOrder.deliveryPersonId || ''}
                                                    onChange={(e) => handleAssignToOrder(selectedMissionOrder.id, e.target.value)}
                                                    disabled={selectedMissionOrder.status === 'delivered'}
                                                >
                                                    <option value="" className="bg-slate-900">Unassigned</option>
                                                    {deliveryStaff.map(s => (
                                                        <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                                                    ))}
                                                </select>
                                                {selectedMissionOrder.status === 'pending' && selectedMissionOrder.deliveryPersonId && (
                                                    <button
                                                        onClick={() => {
                                                            handleConfirmOrder(selectedMissionOrder.id);
                                                            setSelectedMissionOrder(null);
                                                        }}
                                                        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-bold transition-all text-white shadow-md active:scale-95"
                                                    >
                                                        Confirm Order
                                                    </button>
                                                )}
                                                {['returned', 'attempted', 'cancelled'].includes(selectedMissionOrder.status) && !selectedMissionOrder.returnConfirmed && (
                                                    <button
                                                        onClick={() => {
                                                            handleConfirmReturn(selectedMissionOrder.id);
                                                            setSelectedMissionOrder(null);
                                                        }}
                                                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm font-bold transition-all text-white shadow-md active:scale-95"
                                                    >
                                                        Confirm Return
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        );
    }
};

export default AdminDashboard;
