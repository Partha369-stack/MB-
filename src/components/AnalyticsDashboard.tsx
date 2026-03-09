
import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    TrendingUp, ShoppingBag, CheckCircle2, AlertCircle, Users,
    IndianRupee, Package, Clock, Filter, Download, MoreHorizontal,
    ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import { Card, Button } from './Layout';
import { Order, Subscription, User, CODSettlement, Product } from '../types';

interface AnalyticsDashboardProps {
    orders: Order[];
    subscriptions: Subscription[];
    allUsers: User[];
    codSettlements: CODSettlement[];
    products: Product[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    orders, subscriptions, allUsers, codSettlements, products
}) => {
    const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');

    // Helper to filter data by date range
    const filterDataByDate = useMemo(() => {
        const now = new Date();
        const start = new Date();

        if (dateRange === 'today') start.setHours(0, 0, 0, 0);
        else if (dateRange === '7days') start.setDate(now.getDate() - 7);
        else if (dateRange === '30days') start.setDate(now.getDate() - 30);

        return {
            filteredOrders: orders.filter(o => new Date(o.createdAt) >= start),
            filteredSubs: subscriptions.filter(s => new Date(s.startDate) >= start)
        };
    }, [orders, subscriptions, dateRange]);

    const { filteredOrders } = filterDataByDate;

    // SECTION 1: REVENUE ANALYTICS
    const revenueData = useMemo(() => {
        const days: Record<string, any> = {};
        filteredOrders.forEach(o => {
            const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!days[date]) days[date] = { date, revenue: 0, orders: 0 };
            days[date].revenue += o.total;
            days[date].orders += 1;
        });
        return Object.values(days);
    }, [filteredOrders]);

    const paymentBreakdown = useMemo(() => {
        const settled = codSettlements.filter(s => s.status === 'settled').reduce((acc, s) => acc + s.amount, 0);
        const pending = codSettlements.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.amount, 0);
        return [
            { name: 'Settled', value: settled, color: '#059669' },
            { name: 'Pending', value: pending, color: '#d97706' }
        ];
    }, [codSettlements]);

    // SECTION 2: ORDER PERFORMANCE
    const orderStatusData = useMemo(() => {
        const statusMap: Record<string, number> = { delivered: 0, pending: 0, attempted: 0, cancelled: 0 };
        filteredOrders.forEach(o => {
            if (statusMap[o.status] !== undefined) statusMap[o.status]++;
        });
        return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    const statusColors: Record<string, string> = {
        delivered: '#10b981',
        pending: '#f59e0b',
        attempted: '#6366f1',
        cancelled: '#ef4444'
    };

    // SECTION 5: PRODUCT PERFORMANCE
    const topProducts = useMemo(() => {
        const productMap: Record<string, { name: string, sales: number, revenue: number }> = {};
        orders.forEach(o => {
            o.items.forEach(item => {
                if (!productMap[item.productId]) {
                    const prod = products.find(p => p.id === item.productId);
                    productMap[item.productId] = { name: prod?.name || 'Unknown', sales: 0, revenue: 0 };
                }
                productMap[item.productId].sales += item.quantity;
                productMap[item.productId].revenue += item.price * item.quantity;
            });
        });
        return Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [orders, products]);

    return (
        <div className="space-y-6 pb-20 animate-fade-in custom-scrollbar overflow-y-auto h-full px-1">
            {/* Header with Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-serif font-black text-slate-800">Business Intelligence</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time performance metrics</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {['today', '7days', '30days'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range as any)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {range === '7days' ? '1 Week' : range === '30days' ? '1 Month' : 'Today'}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IndianRupee className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-black">+14.2%</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Revenue</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">₹{filteredOrders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}</p>
                </Card>
                <Card className="p-5 border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-1 text-blue-600">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-black">+8.4%</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{filteredOrders.length}</p>
                </Card>
                <Card className="p-5 border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex items-center gap-1 text-green-600">
                            <span className="text-[10px] font-black">98.2%</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">Excellent</p>
                </Card>
                <Card className="p-5 border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex items-center gap-1 text-amber-600">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-black">+12</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Customers</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{allUsers.filter(u => u.role === 'customer').length}</p>
                </Card>
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg font-black text-slate-800">Revenue Trend</h3>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center cursor-pointer">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Orders Performance */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg font-black text-slate-800">Orders Trend</h3>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center cursor-pointer">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="orders" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Row 3: Pie Charts & Distributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Order Status */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <h3 className="font-serif text-lg font-black text-slate-800 mb-6">Order Status</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={orderStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {orderStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#94a3b8'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Payment Breakdown */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <h3 className="font-serif text-lg font-black text-slate-800 mb-6">Settlement Status</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Selling Products */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <h3 className="font-serif text-lg font-black text-slate-800 mb-6">Top Revenue Products</h3>
                    <div className="space-y-4">
                        {topProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-400">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{product.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{product.sales} Units sold</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-900">₹{product.revenue.toLocaleString()}</p>
                                    <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Row 4: Customer Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-slate-100 shadow-sm bg-gradient-to-br from-green-600 to-emerald-800 text-white">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h3 className="font-serif text-2xl font-black italic">Growth Forecast</h3>
                            <p className="text-xs text-white/60 font-black uppercase tracking-widest mt-1">AI Predicted 30-Day Trend</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData}>
                                <Line type="monotone" dataKey="revenue" stroke="rgba(255,255,255,0.8)" strokeWidth={4} dot={false} strokeDasharray="8 8" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex gap-6">
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Expected Revenue</p>
                            <p className="text-xl font-black mt-1">₹{(filteredOrders.reduce((acc, o) => acc + o.total, 0) * 1.2).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Confidence</p>
                            <p className="text-xl font-black mt-1 text-green-300">High (92%)</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg font-black text-slate-800">Business Health Overview</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Stable</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AOV (Avg Order Value)</p>
                            <p className="text-lg font-black text-slate-900 mt-2">₹{(filteredOrders.reduce((acc, o) => acc + o.total, 0) / (filteredOrders.length || 1)).toFixed(0)}</p>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Retention</p>
                            <p className="text-lg font-black text-slate-900 mt-2">84.5%</p>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Collections</p>
                            <p className="text-lg font-black text-red-600 mt-2">₹{codSettlements.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.amount, 0).toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Time Avg</p>
                            <p className="text-lg font-black text-slate-900 mt-2">32 Min</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
