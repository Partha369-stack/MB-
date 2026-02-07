import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Package,
    ShoppingBag,
    Settings,
    LogOut,
    BarChart3,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    MoreVertical,
    ChevronRight,
    TrendingUp,
    ArrowUpRight,
    Filter,
    ChevronDown,
    Sparkles,
    UserPlus,
    Key,
    UserCircle,
    Info,
    Shield,
    Plus,
    Target,
    MapPin,
    Phone,
    History,
    Wallet,
    IndianRupee,
    Truck,
    AlertCircle
} from 'lucide-react';
import { Card, Button } from './components/Layout';
import { storageService } from './services/storageService';
import { Order, Product, User, Subscription, Authority, SalesTarget, SalesActivity, CODSettlement } from './types';
import { PRODUCTS } from './constants';

interface AdminDashboardProps {
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'products' | 'users' | 'authority' | 'sales_mgmt' | 'cod' | 'logistics'>('stats');
    const [orders, setOrders] = useState<Order[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [authorities, setAuthorities] = useState<Authority[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [newMemberData, setNewMemberData] = useState({
        userId: '',
        role: 'staff' as 'admin' | 'sales' | 'staff' | 'delivery',
        referralCode: ''
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
    const [salesTab, setSalesTab] = useState<'targets' | 'activities'>('targets');
    const [codSettlements, setCodSettlements] = useState<CODSettlement[]>([]);
    const [codView, setCodView] = useState<'pending' | 'settled'>('pending');
    const [deliveryTab, setDeliveryTab] = useState<'overview' | 'assignment' | 'cod' | 'customers'>('overview');
    const userSelectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setError(null);
            try {
                // Fetch orders
                const allOrders = await storageService.getAllOrders();
                setOrders(allOrders);

                // Fetch subscriptions
                const allSubs = await storageService.getAllSubscriptions();
                setSubscriptions(allSubs);

                // Fetch users from storageService (which returns [] on disconnect)
                const users = await storageService.getUsers() || [];
                setAllUsers(users);

                // Fetch authorities
                const auths = await storageService.getAuthorities();
                setAuthorities(auths);

                // Fetch sales targets
                const targets = storageService.getSalesTargets();
                setSalesTargets(targets);

                // Fetch sales activities
                const activities = storageService.getSalesActivities();
                setSalesActivities(activities.reverse());

                // Fetch COD settlements
                const settlements = storageService.getCODSettlements();
                setCodSettlements(settlements);
            } catch (error) {
                console.error("Error fetching admin data:", error);
            }
        };
        fetchData();
    }, []);



    useEffect(() => {
        setSearchQuery('');
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
                setIsUserSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const stats = [
        { label: 'Total Revenue', value: `₹${orders.reduce((acc, o) => acc + o.total, 0)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Active Orders', value: orders.filter(o => o.status === 'pending').length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Customers', value: allUsers.filter(u => u.role !== 'admin').length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Products', value: PRODUCTS.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];


    const renderStats = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-6 border-slate-100 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-3xl font-serif font-black text-slate-900 mt-1">{stat.value}</h3>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-serif text-2xl font-black">Recent Orders</h3>
                        <button className="text-[10px] font-black uppercase text-green-700 tracking-widest">View All</button>
                    </div>
                    <div className="space-y-6">
                        {orders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-100">
                                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">{order.id}</p>
                                        <p className="text-xs text-slate-400 font-medium">₹{order.total} • 2 items</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {orders.length === 0 && (
                            <div className="py-12 text-center text-slate-400 font-medium">
                                No orders yet today.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-8 border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-serif text-2xl font-black">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center p-6 rounded-3xl bg-green-50 text-green-700 border border-green-100 hover:bg-green-600 hover:text-white transition-all group">
                            <Package className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Product</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-6 rounded-3xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all group">
                            <Users className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">New User</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-6 rounded-3xl bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-600 hover:text-white transition-all group">
                            <BarChart3 className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Reports</span>
                        </button>
                        <button
                            onClick={handleResetData}
                            className="flex flex-col items-center justify-center p-6 rounded-3xl bg-red-50 text-red-700 border border-red-100 hover:bg-red-600 hover:text-white transition-all group"
                        >
                            <XCircle className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Clear Mock Data</span>
                        </button>
                    </div>
                </Card>
            </div>
        </div >
    );

    const renderOrders = () => (
        <div className="space-y-6 animate-fade-in">
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
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none h-11 px-4 rounded-xl text-xs">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                    <Button className="flex-1 md:flex-none h-11 px-4 rounded-xl text-xs">Export CSV</Button>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Products</th>
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
                                return (
                                    o.id.toLowerCase().includes(searchLower) ||
                                    o.userId.toLowerCase().includes(searchLower) ||
                                    (user?.name?.toLowerCase().includes(searchLower))
                                );
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium whitespace-nowrap">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.filter(o => {
                                    const user = allUsers.find(u => u.id === o.userId);
                                    const searchLower = searchQuery.toLowerCase();
                                    return (
                                        o.id.toLowerCase().includes(searchLower) ||
                                        o.userId.toLowerCase().includes(searchLower) ||
                                        (user?.name?.toLowerCase().includes(searchLower))
                                    );
                                }).map((order) => {
                                    const user = allUsers.find(u => u.id === order.userId);
                                    const assignedPerson = order.deliveryPersonId
                                        ? allUsers.find(u => u.id === order.deliveryPersonId)
                                        : null;

                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-900 text-[11px] whitespace-nowrap">#{order.id.slice(-6)}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900">{user?.name || 'Anonymous'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate w-32">{user?.phone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-0.5">
                                                    {order.items.map((item, idx) => (
                                                        <p key={idx} className="text-[11px] font-bold text-slate-600">
                                                            {item.product.name} <span className="text-slate-400">x{item.quantity}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                    {order.paymentMethod || 'COD'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-green-700 text-sm whitespace-nowrap">₹{order.total}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {assignedPerson ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">
                                                            {assignedPerson.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600">{assignedPerson.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">Not assigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-xs font-bold text-slate-900">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
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
    );

    const renderProducts = () => {
        const filteredProducts = PRODUCTS.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search products or categories..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-green-700 outline-none text-sm font-bold transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className="overflow-hidden border-slate-100 hover:shadow-lg transition-all group">
                            <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-white/20 shadow-sm">
                                    <span className="text-[10px] font-black text-green-700 uppercase">{product.category}</span>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-serif text-lg font-black text-slate-900">{product.name}</h4>
                                    <div className="text-right">
                                        <p className="font-black text-green-700">₹{product.price}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">per {product.unit}</p>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-4">{product.description}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 text-[10px] font-black uppercase h-9 rounded-xl">Edit</Button>
                                    <Button className="w-10 h-9 p-0 rounded-xl bg-slate-900">
                                        <MoreVertical className="w-4 h-4 mx-auto" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No products found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        const filteredUsers = allUsers.filter(u =>
            (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.phone?.toLowerCase().includes(searchQuery.toLowerCase()))
        ).reverse();

        return (
            <div className="space-y-6 animate-fade-in">
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
                </div>

                <Card className="overflow-hidden border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
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
                                                <p className="text-sm font-medium text-slate-700">{user.phone}</p>
                                                {user.phoneVerified && <span className="text-[8px] bg-blue-50 text-blue-600 px-1 rounded">Verified</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[12px] text-slate-800 font-bold max-w-xs">{user.address || 'No address'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.referredBy ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center text-[10px] font-black text-green-700">S</div>
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
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                </button>
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

    const handleAddMember = async () => {
        if (!newMemberData.userId) return;

        const user = allUsers.find(u => u.id === newMemberData.userId);
        if (!user) return;

        const newAuth: Authority = {
            id: 'AUTH-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            userId: user.id,
            userName: user.name || 'Unknown',
            role: newMemberData.role,
            permissions: newMemberData.role === 'admin' ?
                [{ resource: 'orders', action: 'all' }, { resource: 'products', action: 'all' }, { resource: 'users', action: 'all' }, { resource: 'authority', action: 'all' }] :
                newMemberData.role === 'delivery' ?
                    [{ resource: 'orders', action: 'write' }, { resource: 'products', action: 'read' }] :
                    [{ resource: 'orders', action: 'read' }, { resource: 'products', action: 'read' }],
            isActive: true,
            lastActive: new Date().toISOString(),
            referralCode: newMemberData.role === 'sales' ? (newMemberData.referralCode || 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase()) : undefined
        };

        await storageService.saveAuthority(newAuth);

        // Update user role to reflect their new authority - only if not already a staff member
        // If they have multiple roles, we keep one as the "primary" in the user object
        // for backward compatibility, but the UI will check all authorities.
        const updatedUser = {
            ...user,
            role: user.role === 'customer' ? newMemberData.role as any : user.role
        };
        await storageService.saveUser(updatedUser);

        // Refresh
        const auths = await storageService.getAuthorities();
        const users = await storageService.getUsers();
        setAuthorities(auths);
        setAllUsers(users);
        setIsMemberModalOpen(false);
        setNewMemberData({ userId: '', role: 'staff', referralCode: '' });
    };

    const renderAuthority = () => {
        const filteredAuths = authorities.filter(a =>
            (a.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.role.toLowerCase().includes(searchQuery.toLowerCase())) &&
            a.role !== 'staff'
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
                                                        .filter(u => !authorities.find(a => a.userId === u.id && a.role === newMemberData.role))
                                                        .filter(u =>
                                                            u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                            u.phone.includes(userSearchTerm)
                                                        )
                                                        .map(u => (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => {
                                                                    setNewMemberData({ ...newMemberData, userId: u.id });
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
                                                    {allUsers.filter(u => !authorities.find(a => a.userId === u.id && a.role === newMemberData.role)).filter(u => (u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.phone.includes(userSearchTerm))).length === 0 && (
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
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Access Level</label>
                                    <div className="flex bg-slate-50/50 p-1 rounded-xl gap-1 border border-slate-100">
                                        {[
                                            { id: 'admin', label: 'Admin' },
                                            { id: 'sales', label: 'Sales' },
                                            { id: 'delivery', label: 'Delivery' },
                                            { id: 'staff', label: 'Staff' }
                                        ].map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => setNewMemberData({ ...newMemberData, role: role.id as any })}
                                                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newMemberData.role === role.id
                                                    ? 'bg-slate-900 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                                            >
                                                {role.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newMemberData.role === 'sales' && (
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
                    </div>
                )}


                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Admin</p>
                        <p className="text-2xl font-serif font-black text-slate-900">{authorities.filter(a => a.role === 'admin').length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Sales Executives</p>
                        <p className="text-2xl font-serif font-black text-green-700">{authorities.filter(a => a.role === 'sales').length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Delivery Personnel</p>
                        <p className="text-2xl font-serif font-black text-blue-700">{authorities.filter(a => a.role === 'delivery').length}</p>
                    </Card>
                    <Card className="p-4 border-slate-100 bg-white">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Staff</p>
                        <p className="text-2xl font-serif font-black text-amber-700">{authorities.filter(a => a.isActive).length}</p>
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
                    <Button
                        onClick={() => setIsMemberModalOpen(true)}
                        className="w-full md:w-auto px-6 h-11 rounded-xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-green-100"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Member
                    </Button>
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
                                {filteredAuths.map((auth) => (
                                    <tr key={auth.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm overflow-hidden border border-slate-100 ${auth.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                    auth.role === 'sales' ? 'bg-green-100 text-green-700' :
                                                        auth.role === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {allUsers.find(u => u.id === auth.userId)?.profilePic ? (
                                                        <img
                                                            src={allUsers.find(u => u.id === auth.userId)?.profilePic}
                                                            className="w-full h-full object-cover"
                                                            alt="Profile"
                                                        />
                                                    ) : (
                                                        auth.userName.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{auth.userName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${auth.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                auth.role === 'sales' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    auth.role === 'delivery' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {auth.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {auth.role === 'sales' ? (
                                                <button
                                                    onClick={() => setViewingReferralsFor(auth.id)}
                                                    className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 bg-green-50 text-green-700 rounded-lg text-xs font-black border border-green-100 hover:bg-green-100 transition-colors"
                                                >
                                                    {allUsers.filter(u => u.referredBy === auth.userId).length}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                {auth.role === 'admin' ? 'Full Control' :
                                                    auth.role === 'sales' ? 'Sales Access' :
                                                        auth.role === 'delivery' ? 'Delivery Access' : 'View Only'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${auth.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${auth.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                {auth.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card >
            </div >
        );
    };

    const renderSalesManagement = () => {
        const salesExecutives = authorities.filter(a => a.role === 'sales');

        const handleSaveTarget = () => {
            if (!selectedSalesPerson || !newTargetData.targetVisits || !newTargetData.targetConversions || !newTargetData.endDate) {
                alert('Please fill all required fields');
                return;
            }

            const target: SalesTarget = {
                id: newTargetData.id || ('TRG-' + Math.random().toString(36).substr(2, 9).toUpperCase()),
                salesPersonId: selectedSalesPerson,
                targetVisits: Number(newTargetData.targetVisits),
                targetConversions: Number(newTargetData.targetConversions),
                currentVisits: newTargetData.currentVisits || 0,
                currentConversions: newTargetData.currentConversions || 0,
                startDate: newTargetData.startDate || new Date().toISOString(),
                endDate: new Date(newTargetData.endDate).toISOString(),
                instructions: newTargetData.instructions || '',
                status: (newTargetData.status as any) || 'active'
            };

            storageService.saveSalesTarget(target);

            // Update local state
            const exists = salesTargets.find(t => t.id === target.id);
            if (exists) {
                setSalesTargets(salesTargets.map(t => t.id === target.id ? target : t));
            } else {
                setSalesTargets([...salesTargets, target]);
            }

            setIsTargetModalOpen(false);
            setNewTargetData({
                targetVisits: 50,
                targetConversions: 15,
                instructions: '',
                endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
            });
        };

        return (
            <div className="space-y-6 animate-fade-in relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-slate-100 bg-white shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Sales Force</p>
                        <p className="text-3xl font-serif font-black text-slate-900">{salesExecutives.length}</p>
                    </Card>
                    <Card className="p-6 border-slate-100 bg-white shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Targets Set</p>
                        <p className="text-3xl font-serif font-black text-green-700">{salesTargets.length}</p>
                    </Card>
                    <Card className="p-6 border-slate-100 bg-white shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pending Performance</p>
                        <p className="text-3xl font-serif font-black text-amber-600">
                            {salesTargets.filter(t => t.status === 'active').length}
                        </p>
                    </Card>
                </div>

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
                </div>

                {salesTab === 'targets' && (
                    <>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                            <div>
                                <h3 className="text-xl font-serif font-black text-slate-900">Performance Tracking</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">Assign and monitor sales targets</p>
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
                                className="h-11 px-6 rounded-xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-green-100"
                            >
                                <Target className="w-4 h-4 mr-2" /> New Target
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {salesExecutives.length === 0 ? (
                                <Card className="col-span-2 py-20 text-center border-dashed border-2 border-slate-100">
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
                                salesExecutives.map(exec => {
                                    const activeTarget = salesTargets.find(t => t.salesPersonId === exec.userId && t.status === 'active');
                                    const user = allUsers.find(u => u.id === exec.userId);

                                    // Calculate activity-based progress
                                    const activities = salesActivities.filter(a => a.salesPersonId === exec.userId);
                                    const totalVisits = activities.filter(a => a.activityType === 'visit').length;
                                    const totalConversions = activities.filter(a => a.convertedToCustomer).length;

                                    const visitProgress = activeTarget ? (totalVisits / activeTarget.targetVisits) * 100 : 0;
                                    const conversionProgress = activeTarget ? (totalConversions / activeTarget.targetConversions) * 100 : 0;

                                    return (
                                        <Card key={exec.id} className="p-8 border-slate-100 hover:shadow-lg transition-all bg-white relative overflow-hidden group">
                                            <div className="flex items-center gap-5 mb-8">
                                                <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center font-black text-green-700 text-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-500">
                                                    {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : exec.userName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-serif text-xl font-black text-slate-900">{exec.userName}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CODE: {exec.referralCode || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {activeTarget ? (
                                                <div className="space-y-6">
                                                    {/* Visits Progress */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                            <span>Visits Completed</span>
                                                            <span className="text-slate-900">{totalVisits} / {activeTarget.targetVisits}</span>
                                                        </div>
                                                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                                            <div
                                                                className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                                                                style={{ width: `${Math.min(100, visitProgress)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* Conversions Progress */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                            <span>Conversions Achieved</span>
                                                            <span className="text-slate-900">{totalConversions} / {activeTarget.targetConversions}</span>
                                                        </div>
                                                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                                            <div
                                                                className="h-full bg-green-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(22,163,74,0.3)]"
                                                                style={{ width: `${Math.min(100, conversionProgress)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Info className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Instructions</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic line-clamp-2">
                                                            "{activeTarget.instructions}"
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                            Expires: {new Date(activeTarget.endDate).toLocaleDateString()}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            className="h-8 px-3 rounded-lg text-[9px] font-black"
                                                            onClick={() => {
                                                                setSelectedSalesPerson(exec.userId);
                                                                setNewTargetData({
                                                                    ...activeTarget,
                                                                    endDate: activeTarget.endDate.split('T')[0]
                                                                });
                                                                setIsTargetModalOpen(true);
                                                            }}
                                                        >
                                                            Edit Target
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">No Active Target</p>
                                                    <Button
                                                        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                                                        onClick={() => {
                                                            setSelectedSalesPerson(exec.userId);
                                                            setIsTargetModalOpen(true);
                                                        }}
                                                    >
                                                        Set Target
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </>
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

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#FDFCF9]">
            {/* Sidebar */}
            <aside className="w-full lg:w-72 bg-white border-r border-slate-100 p-6 flex flex-col fixed h-full z-10 lg:static">
                <div className="flex items-center gap-4 mb-10 px-2">
                    <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-2 border-green-50 shadow-md flex items-center justify-center shrink-0">
                        <img src="/logo.jpg" className="w-full h-full object-cover scale-110" alt="Logo" />
                    </div>
                    <span className="font-serif text-2xl font-black text-slate-900">Admin</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Dashboard</span>
                        {activeTab === 'stats' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'orders' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">All Orders</span>
                        {activeTab === 'orders' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'products' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Package className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Products</span>
                        {activeTab === 'products' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'users' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Users</span>
                        {activeTab === 'users' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('authority')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'authority' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Shield className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Authority</span>
                        {activeTab === 'authority' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('sales_mgmt')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'sales_mgmt' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Target className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Sales Force</span>
                        {activeTab === 'sales_mgmt' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('logistics')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'logistics' ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Truck className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Logistics</span>
                        {activeTab === 'logistics' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-50 space-y-2">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all font-black text-[11px] uppercase tracking-widest"
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

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 lg:ml-0 overflow-y-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="font-serif text-3xl font-black text-slate-900">
                            {activeTab === 'stats' && "Overview"}
                            {activeTab === 'orders' && "Order Management"}
                            {activeTab === 'products' && "Product Catalog"}
                            {activeTab === 'users' && "User Directory"}
                            {activeTab === 'authority' && "Access Control"}
                            {activeTab === 'sales_mgmt' && "Sales Management"}
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                            {activeTab === 'stats' && "System statistics & performance"}
                            {activeTab === 'orders' && "Manage & track all customer orders"}
                            {activeTab === 'products' && "Configure your product inventory"}
                            {activeTab === 'users' && "Manage your registered community"}
                            {activeTab === 'authority' && "Control system access & permissions"}
                            {activeTab === 'sales_mgmt' && "Assign targets & track executive performance"}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                            <Clock className="w-5 h-5" />
                        </button>
                        <div className="h-10 w-px bg-slate-100 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-black text-slate-900">Super Admin</p>
                                <p className="text-[10px] font-bold text-green-700">Online</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-black">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {activeTab === 'stats' && renderStats()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'products' && renderProducts()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'authority' && renderAuthority()}
                {activeTab === 'sales_mgmt' && renderSalesManagement()}
                {activeTab === 'logistics' && renderLogistics()}
            </main>
        </div>
    );

    function renderLogistics() {
        const deliveryStaff = allUsers.filter(u => u.role === 'delivery');
        const customers = allUsers.filter(u => u.role === 'customer');

        const handleAssignDeliveryPerson = async (customerId: string, deliveryPersonId: string | null) => {
            const updatedUsers = allUsers.map(u =>
                u.id === customerId
                    ? { ...u, assignedDeliveryPersonId: deliveryPersonId || undefined }
                    : u
            );
            setAllUsers(updatedUsers);

            // 1. Save updated user to storage
            const customer = updatedUsers.find(u => u.id === customerId);
            if (customer) {
                await storageService.saveUser(customer);
            }

            // 2. Automatically assign all existing PENDING orders of this customer
            const updatedOrders = orders.map(order => {
                if (order.userId === customerId && order.status === 'pending') {
                    return { ...order, deliveryPersonId: deliveryPersonId || undefined };
                }
                return order;
            });
            setOrders(updatedOrders);

            // Sync with storage
            const pendingOrders = updatedOrders.filter(o => o.userId === customerId && o.status === 'pending');
            for (const order of pendingOrders) {
                await storageService.saveOrder(order);
            }
        };

        // Calculate today's workload
        const today = new Date();
        const todayStr = today.toDateString();

        const todayOrders = orders.filter(o =>
            new Date(o.createdAt).toDateString() === todayStr && o.status === 'pending'
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
                settledBy: 'admin'
            };

            storageService.updateCODSettlement(settlement.id, updatedSettlement);
            setCodSettlements(prev => prev.map(s => s.id === settlement.id ? updatedSettlement : s));
        };

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Logistics Dashboard</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage fleet, customer routing, and settlements</p>
                    </div>

                    <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setDeliveryTab('overview')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${deliveryTab === 'overview'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setDeliveryTab('customers')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${deliveryTab === 'customers'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Customer Routing
                        </button>
                        <button
                            onClick={() => setDeliveryTab('assignment')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${deliveryTab === 'assignment'
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            Order Assignment
                        </button>
                        <button
                            onClick={() => setDeliveryTab('cod')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${deliveryTab === 'cod'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            COD Settlements
                        </button>
                    </div>
                </div>

                {deliveryTab === 'overview' ? (
                    <>

                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Fleet</p>
                                        <p className="text-3xl font-black text-slate-800">{deliveryStaff.length}</p>
                                    </div>
                                </div>
                                <div className="flex -space-x-2 overflow-hidden">
                                    {deliveryStaff.slice(0, 5).map((staff, i) => (
                                        <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center overflow-hidden">
                                            {staff.profilePic ? (
                                                <img src={staff.profilePic} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCircle className="w-full h-full text-slate-400" />
                                            )}
                                        </div>
                                    ))}
                                    {deliveryStaff.length > 5 && (
                                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 pl-1">
                                            +{deliveryStaff.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                                        <Package className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Today's Orders</p>
                                        <p className="text-3xl font-black text-slate-800">{todayOrders.length}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                                <p className="text-xs font-bold text-amber-600">Standard Delivery</p>
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Subscriptions</p>
                                        <p className="text-3xl font-black text-slate-800">{todaySubs.length}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                                <p className="text-xs font-bold text-purple-600">Recurring Dispatch</p>
                            </div>

                            {/* Holding Cash Card */}
                            <div
                                onClick={() => { setDeliveryTab('cod'); setCodView('pending'); }}
                                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-green-100 cursor-pointer hover:scale-[1.02] transition-transform"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <Wallet className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-green-100 font-bold text-xs uppercase tracking-wider">Holding Cash</p>
                                        <p className="text-3xl font-black">
                                            ₹{codSettlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div>
                                        <p className="text-xs font-bold text-green-50">View Settlements &rarr;</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Team Roster */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-slate-400" />
                                    Team Roster
                                </h3>
                                {deliveryStaff.length === 0 ? (
                                    <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center shadow-lg shadow-slate-50">
                                        <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">No delivery partners found</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-50 overflow-hidden divide-y divide-slate-50">
                                        {deliveryStaff.map(staff => {
                                            const codStats = storageService.getDeliveryPersonCODStats(staff.id);
                                            return (
                                                <div key={staff.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                                                            {staff.profilePic ? (
                                                                <img src={staff.profilePic} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <UserCircle className="w-full h-full text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{staff.name}</p>
                                                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {staff.phone}
                                                            </p>
                                                        </div>
                                                        <div className="ml-auto">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                                Active
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {codStats.totalPending > 0 && (
                                                        <div className="bg-amber-50 rounded-lg p-2 flex items-center justify-between text-xs">
                                                            <span className="text-amber-800 font-bold flex items-center gap-1">
                                                                <Wallet className="w-3 h-3" />
                                                                Holding Cash
                                                            </span>
                                                            <span className="font-black text-amber-700">₹{codStats.totalPending}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Today's Dispatch */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-slate-400" />
                                    Today's Dispatch
                                </h3>

                                {(todayOrders.length === 0 && todaySubs.length === 0) ? (
                                    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-lg shadow-slate-50">
                                        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                        <h4 className="text-xl font-bold text-slate-900 mb-1">No deliveries scheduled</h4>
                                        <p className="text-slate-500">You're all caught up for today!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {todayOrders.map(order => {
                                            const customer = allUsers.find(u => u.id === order.userId);
                                            return (
                                                <div key={order.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm border-l-4 border-l-amber-500">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                                                <Package className="w-5 h-5 text-amber-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm mb-0.5">Order #{order.id.slice(-4)}</p>
                                                                <p className="text-slate-500 text-xs font-medium mb-2">{customer?.name} • {customer?.address}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                                                        {order.paymentMethod}
                                                                    </span>
                                                                    <span className="px-2 py-1 bg-green-100 rounded-lg text-[10px] font-bold text-green-700">
                                                                        ₹{order.total}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                                                Pending
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {todaySubs.map(sub => {
                                            const customer = allUsers.find(u => u.id === sub.userId);
                                            return (
                                                <div key={sub.id} className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm border-l-4 border-l-purple-500">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm mb-0.5">Subscription Delivery</p>
                                                                <p className="text-slate-500 text-xs font-medium mb-2">{customer?.name} • {customer?.address}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 bg-purple-100 rounded-lg text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                                                                        Recurring
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                                                Scheduled
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : deliveryTab === 'customers' ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-black text-blue-900 text-sm mb-2">Customer Assignment Logic</h3>
                                    <ul className="text-xs text-blue-800 font-medium space-y-1">
                                        <li>• <strong>Permanent Assignments:</strong> Assigning a delivery person here links them to the customer for all current and future orders.</li>
                                        <li>• <strong>Instant Routing:</strong> When you assign someone, all their <strong>pending orders</strong> are immediately routed to that person.</li>
                                        <li>• <strong>Smart Filtering:</strong> Assigned customers' orders will bypass the manual assignment list.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {customers.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                                <UserCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold text-lg">No customers found</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Address</th>
                                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Assigned Driver</th>
                                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customers.map((customer) => {
                                                const assignedPerson = customer.assignedDeliveryPersonId
                                                    ? allUsers.find(u => u.id === customer.assignedDeliveryPersonId)
                                                    : null;

                                                return (
                                                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm overflow-hidden">
                                                                    {customer.profilePic ? <img src={customer.profilePic} className="w-full h-full object-cover" /> : customer.name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-900 text-sm">{customer.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">ID: {customer.id.slice(0, 8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-700">{customer.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm text-slate-600 font-medium max-w-xs truncate">{customer.address}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {assignedPerson ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-100">
                                                                    <Truck className="w-3 h-3" /> {assignedPerson.name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-medium italic">Unassigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select
                                                                value={customer.assignedDeliveryPersonId || ''}
                                                                onChange={(e) => handleAssignDeliveryPerson(customer.id, e.target.value || null)}
                                                                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-green-500 transition-all"
                                                            >
                                                                <option value="">-- Manual Routing --</option>
                                                                {deliveryStaff.map(dp => <option key={dp.id} value={dp.id}>{dp.name}</option>)}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : deliveryTab === 'assignment' ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* Info Banner */}
                        {deliveryStaff.length === 0 && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                                    <Truck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900 mb-1">No Delivery Personnel</p>
                                    <p className="text-xs text-amber-700">Add delivery staff in the Authority section to assign orders.</p>
                                </div>
                            </div>
                        )}

                        <Card className="overflow-hidden border-slate-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Products</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Assign To</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium whitespace-nowrap">
                                                    No orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map((order) => {
                                                const user = allUsers.find(u => u.id === order.userId);
                                                const assignedPerson = order.deliveryPersonId
                                                    ? allUsers.find(u => u.id === order.deliveryPersonId)
                                                    : null;

                                                const handleAssignDeliveryPerson = async (orderId: string, deliveryPersonId: string) => {
                                                    const updatedOrders = orders.map(o =>
                                                        o.id === orderId ? { ...o, deliveryPersonId } : o
                                                    );
                                                    setOrders(updatedOrders);

                                                    const orderToUpdate = updatedOrders.find(o => o.id === orderId);
                                                    if (orderToUpdate) {
                                                        await storageService.saveOrder(orderToUpdate);
                                                    }
                                                };

                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-black text-slate-900 text-[11px] whitespace-nowrap">#{order.id.slice(-6)}</td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-900">{user?.name || 'Anonymous'}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium truncate w-32">{user?.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-0.5">
                                                                {order.items.map((item, idx) => (
                                                                    <p key={idx} className="text-[11px] font-bold text-slate-600">
                                                                        {item.product.name} <span className="text-slate-400">x{item.quantity}</span>
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                                {order.paymentMethod || 'COD'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-green-700 text-sm whitespace-nowrap">₹{order.total}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {order.status === 'pending' ? (
                                                                <select
                                                                    value={order.deliveryPersonId || ''}
                                                                    onChange={(e) => handleAssignDeliveryPerson(order.id, e.target.value)}
                                                                    className={`text-[10px] font-bold px-3 py-2 rounded-lg border-2 outline-none transition-all cursor-pointer ${order.deliveryPersonId
                                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-green-500'
                                                                        }`}
                                                                >
                                                                    <option value="">Assign to...</option>
                                                                    {deliveryStaff.map(person => (
                                                                        <option key={person.id} value={person.id}>
                                                                            {person.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : assignedPerson ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">
                                                                        {assignedPerson.name?.charAt(0)}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-600">{assignedPerson.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 italic">Not assigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                                                                }`}>
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <p className="text-xs font-bold text-slate-900">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
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
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                            <button
                                onClick={() => setCodView('pending')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${codView === 'pending'
                                    ? 'bg-amber-100 text-amber-800 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                Pending Settlement
                            </button>
                            <button
                                onClick={() => setCodView('settled')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${codView === 'settled'
                                    ? 'bg-green-100 text-green-800 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                History
                            </button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-amber-100 font-bold text-xs uppercase tracking-wider">Total Pending</p>
                                        <p className="text-3xl font-black">₹{codSettlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                    <p className="text-xs font-medium text-amber-50">Cash currently held by delivery partners</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Settled Today</p>
                                        <p className="text-3xl font-black text-slate-800">
                                            ₹{codSettlements
                                                .filter(s => s.status === 'settled' && new Date(s.settledAt!).toDateString() === new Date().toDateString())
                                                .reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Collectors</p>
                                        <p className="text-3xl font-black text-slate-800">
                                            {new Set(codSettlements.filter(s => s.status === 'pending').map(s => s.deliveryPersonId)).size}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Person Groups */}
                        <div className="grid grid-cols-1 gap-6">
                            {Object.entries(groupedSettlements).length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-50">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Wallet className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">No {codView} settlements</h3>
                                    <p className="text-slate-500 font-medium">No cash collections found for this view</p>
                                </div>
                            ) : (
                                (Object.entries(groupedSettlements) as [string, typeof groupedSettlements[string]][]).map(([personId, data]) => (
                                    <div key={personId} className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-50 overflow-hidden">
                                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                                                    <UserCircle className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-800">{data.name}</h3>
                                                    <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                                                        ID: {personId.slice(0, 8)}
                                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                        {data.settlements.length} orders
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total {codView === 'pending' ? 'to Collect' : 'Settled'}</p>
                                                <p className={`text-2xl font-black ${codView === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                                                    ₹{data.total.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-slate-50">
                                            {data.settlements.map((settlement) => {
                                                const order = orders.find(o => o.id === settlement.orderId);
                                                const customer = order ? allUsers.find(u => u.id === order.userId) : null;

                                                return (
                                                    <div key={settlement.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${codView === 'pending' ? 'bg-amber-50' : 'bg-green-50'
                                                                }`}>
                                                                <IndianRupee className={`w-5 h-5 ${codView === 'pending' ? 'text-amber-600' : 'text-green-600'
                                                                    }`} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900">Order #{settlement.orderId.slice(-4)}</p>
                                                                    <span className="text-xs font-medium text-slate-400">•</span>
                                                                    <p className="text-sm font-medium text-slate-600">{customer?.name || 'Unknown Customer'}</p>
                                                                </div>
                                                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(settlement.collectedAt).toLocaleDateString()} at {new Date(settlement.collectedAt).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="font-black text-slate-900">₹{settlement.amount}</p>
                                                                {codView === 'settled' && settlement.settledAt && (
                                                                    <p className="text-xs font-bold text-green-600">
                                                                        Settled: {new Date(settlement.settledAt).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {codView === 'pending' && (
                                                                <button
                                                                    onClick={() => handleSettle(settlement)}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-green-200"
                                                                >
                                                                    Mark Settled
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

};

export default AdminDashboard;
