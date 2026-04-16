'use client';

import { useState, useEffect, useMemo } from 'react';
import { insforge } from '@/lib/insforge';
import { MenuItem, Order, OrderItem, Payment } from '@/lib/types';
import {
    ArrowLeft,
    LayoutDashboard,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Users,
    BarChart3,
    Edit3,
    Trash2,
    Plus,
    Save,
    X,
    Eye,
    EyeOff,
    Flame,
    ChefHat,
    Package,
    Clock,
    Award,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'orders'>('dashboard');
    const [orders, setOrders] = useState<(Order & { order_items?: OrderItem[] })[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Menu form
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState({ name: '', category: '', price: '', available: true });

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        const [ordersRes, paymentsRes, menuRes] = await Promise.all([
            insforge.database.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200),
            insforge.database.from('payments').select().order('time', { ascending: false }).limit(200),
            insforge.database.from('menu').select().order('category', { ascending: true }),
        ]);
        if (ordersRes.data) setOrders(ordersRes.data as (Order & { order_items?: OrderItem[] })[]);
        if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
        if (menuRes.data) setMenu(menuRes.data as MenuItem[]);
        setLoading(false);
    }

    // Analytics
    const todayOrders = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return orders.filter((o) => o.created_at.startsWith(today));
    }, [orders]);

    const todayRevenue = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return payments
            .filter((p) => p.time.startsWith(today))
            .reduce((sum, p) => sum + Number(p.amount), 0);
    }, [payments]);

    const totalRevenue = useMemo(() =>
        payments.reduce((sum, p) => sum + Number(p.amount), 0),
        [payments]
    );

    const topSellingItems = useMemo(() => {
        const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
        orders.forEach((o) => {
            o.order_items?.forEach((item) => {
                if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                itemCounts[item.name].quantity += item.quantity;
                itemCounts[item.name].revenue += item.price * item.quantity;
            });
        });
        return Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    }, [orders]);

    const paymentBreakdown = useMemo(() => {
        const breakdown = { cash: 0, upi: 0, card: 0 };
        payments.forEach((p) => {
            breakdown[p.method as keyof typeof breakdown] += Number(p.amount);
        });
        return breakdown;
    }, [payments]);

    // Menu CRUD
    async function saveMenuItem() {
        const data = {
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price) || 0,
            available: formData.available,
        };

        if (editingItem) {
            await insforge.database.from('menu').update(data).eq('id', editingItem.id);
        } else {
            await insforge.database.from('menu').insert(data);
        }

        setShowMenuForm(false);
        setEditingItem(null);
        setFormData({ name: '', category: '', price: '', available: true });
        fetchAll();
    }

    async function toggleAvailability(item: MenuItem) {
        await insforge.database.from('menu').update({ available: !item.available }).eq('id', item.id);
        fetchAll();
    }

    async function deleteMenuItem(id: number) {
        if (!confirm('Delete this menu item?')) return;
        await insforge.database.from('menu').delete().eq('id', id);
        fetchAll();
    }

    function startEditItem(item: MenuItem) {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            price: item.price.toString(),
            available: item.available,
        });
        setShowMenuForm(true);
    }

    const categories = [...new Set(menu.map((m) => m.category))];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--surface-dark)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--text-secondary)]">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--surface-dark)] overflow-hidden">
            {/* Header */}
            <header className="bg-[var(--surface-card)] border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <LayoutDashboard className="w-6 h-6 text-purple-500" />
                        <h1 className="text-lg font-bold">Admin Dashboard</h1>
                    </div>
                    <div className="flex gap-1 bg-[var(--surface-elevated)] rounded-xl p-1">
                        {(['dashboard', 'menu', 'orders'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'text-[var(--text-secondary)] hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 max-w-7xl mx-auto">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Today's Revenue",
                                    value: `₹${todayRevenue.toFixed(0)}`,
                                    icon: DollarSign,
                                    color: 'emerald',
                                    gradient: 'from-emerald-500 to-green-600',
                                },
                                {
                                    label: "Today's Orders",
                                    value: todayOrders.length.toString(),
                                    icon: ShoppingBag,
                                    color: 'blue',
                                    gradient: 'from-blue-500 to-indigo-600',
                                },
                                {
                                    label: 'Total Revenue',
                                    value: `₹${totalRevenue.toFixed(0)}`,
                                    icon: TrendingUp,
                                    color: 'purple',
                                    gradient: 'from-purple-500 to-pink-600',
                                },
                                {
                                    label: 'Menu Items',
                                    value: menu.filter(m => m.available).length + '/' + menu.length,
                                    icon: Package,
                                    color: 'amber',
                                    gradient: 'from-amber-500 to-orange-600',
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                                            <stat.icon className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-white">{stat.value}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Selling Items */}
                            <div className="bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <Award className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-bold">Top Selling Items</h3>
                                </div>
                                <div className="space-y-3">
                                    {topSellingItems.map((item, i) => {
                                        const maxQty = topSellingItems[0]?.quantity || 1;
                                        return (
                                            <div key={item.name} className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-[var(--text-muted)] w-5">{i + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-white">{item.name}</span>
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            {item.quantity} sold • ₹{item.revenue.toFixed(0)}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {topSellingItems.length === 0 && (
                                        <p className="text-sm text-[var(--text-muted)] text-center py-8">No sales data yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div className="bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    <h3 className="font-bold">Payment Breakdown</h3>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { method: 'Cash', amount: paymentBreakdown.cash, color: 'green', icon: '💵' },
                                        { method: 'UPI', amount: paymentBreakdown.upi, color: 'purple', icon: '📱' },
                                        { method: 'Card', amount: paymentBreakdown.card, color: 'blue', icon: '💳' },
                                    ].map(({ method, amount, color, icon }) => {
                                        const total = paymentBreakdown.cash + paymentBreakdown.upi + paymentBreakdown.card;
                                        const pct = total > 0 ? (amount / total) * 100 : 0;
                                        return (
                                            <div key={method}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-medium text-white flex items-center gap-2">
                                                        <span>{icon}</span> {method}
                                                    </span>
                                                    <span className="text-sm text-[var(--text-secondary)]">
                                                        ₹{amount.toFixed(0)} ({pct.toFixed(0)}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full bg-${color}-500 rounded-full transition-all duration-500`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Recent Orders */}
                                <div className="mt-8">
                                    <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Recent Orders
                                    </h4>
                                    <div className="space-y-2">
                                        {orders.slice(0, 5).map((order) => (
                                            <div key={order.id} className="flex items-center justify-between bg-[var(--surface-elevated)] rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-[var(--text-muted)]">#{order.id}</span>
                                                    <span className="text-sm text-white">Table {order.table_number}</span>
                                                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                                                </div>
                                                <span className="text-sm font-bold text-orange-400">₹{Number(order.total).toFixed(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Menu Tab */}
                {activeTab === 'menu' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Menu Management</h2>
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    setFormData({ name: '', category: '', price: '', available: true });
                                    setShowMenuForm(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Item
                            </button>
                        </div>

                        {categories.map((cat) => (
                            <div key={cat} className="mb-6">
                                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-purple-500 rounded-full" />
                                    {cat}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {menu
                                        .filter((m) => m.category === cat)
                                        .map((item) => (
                                            <div
                                                key={item.id}
                                                className={`bg-[var(--surface-card)] border rounded-xl p-4 flex items-center justify-between transition-all ${item.available ? 'border-[var(--border-color)]' : 'border-red-500/20 opacity-60'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-white">{item.name}</p>
                                                    <p className="text-sm font-bold text-orange-400">
                                                        {item.price > 0 ? `₹${item.price}` : 'Seasonal'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleAvailability(item)}
                                                        className={`p-2 rounded-lg transition-colors ${item.available
                                                                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                            }`}
                                                        title={item.available ? 'Disable' : 'Enable'}
                                                    >
                                                        {item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => startEditItem(item)}
                                                        className="p-2 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMenuItem(item.id)}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-xl font-bold mb-6">Order History</h2>
                        <div className="bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Order</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Table</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Source</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Items</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Total</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className="border-b border-[var(--border-color)] hover:bg-[var(--surface-elevated)] transition-colors">
                                                <td className="px-4 py-3 font-bold text-sm">#{order.id}</td>
                                                <td className="px-4 py-3 text-sm">{order.table_number}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${order.source === 'QR'
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                        {order.source}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                                    {order.order_items?.length || 0} items
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-sm text-orange-400">
                                                    ₹{Number(order.total).toFixed(0)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                                                    {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Item Form Modal */}
            {showMenuForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-[var(--surface-card)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[var(--border-color)] animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
                            <button onClick={() => setShowMenuForm(false)} className="text-[var(--text-muted)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-white outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Item name"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Category</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    list="categories"
                                    className="w-full px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-white outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Category"
                                />
                                <datalist id="categories">
                                    {categories.map((c) => (
                                        <option key={c} value={c} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Price (₹)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-white outline-none focus:border-purple-500 transition-colors"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">Available</label>
                                <button
                                    onClick={() => setFormData({ ...formData, available: !formData.available })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.available ? 'bg-green-500' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${formData.available ? 'left-6' : 'left-0.5'
                                            }`}
                                    />
                                </button>
                            </div>
                            <button
                                onClick={saveMenuItem}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {editingItem ? 'Update Item' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
