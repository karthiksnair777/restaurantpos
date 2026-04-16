'use client';

import { useState, useEffect, useCallback } from 'react';
import { insforge } from '@/lib/insforge';
import { Order, OrderItem, OrderStatus } from '@/lib/types';
import {
    ChefHat,
    Clock,
    ArrowLeft,
    Flame,
    CheckCircle2,
    Timer,
    UtensilsCrossed,
    RefreshCcw,
    Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; bg: string; next?: OrderStatus; nextLabel?: string; nextColor?: string }> = {
    NEW: { label: 'NEW', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', next: 'ACCEPTED', nextLabel: 'Accept', nextColor: 'bg-purple-500' },
    ACCEPTED: { label: 'ACCEPTED', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', next: 'COOKING', nextLabel: 'Start Cooking', nextColor: 'bg-amber-500' },
    COOKING: { label: 'COOKING', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', next: 'READY', nextLabel: 'Mark Ready', nextColor: 'bg-green-500' },
    READY: { label: 'READY', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', next: 'SERVED', nextLabel: 'Served', nextColor: 'bg-gray-500' },
    SERVED: { label: 'SERVED', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' },
    CLOSED: { label: 'CLOSED', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
};

export default function KitchenPage() {
    const [orders, setOrders] = useState<(Order & { order_items: OrderItem[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'all'>('active');

    const fetchOrders = useCallback(async () => {
        let query = insforge.database
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });

        if (filter === 'active') {
            query = query.in('status', ['NEW', 'ACCEPTED', 'COOKING', 'READY']);
        }

        const { data } = await query.limit(50);
        if (data) setOrders(data as (Order & { order_items: OrderItem[] })[]);
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchOrders();

        // Setup realtime
        let connected = false;
        async function setupRealtime() {
            try {
                await insforge.realtime.connect();
                await insforge.realtime.subscribe('orders');
                connected = true;

                insforge.realtime.on('new_order', () => {
                    fetchOrders();
                    // Play notification sound
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIjqN0teleUMvVa3c5NCiZjZJm+Dt5beIUTpKlNfn4L+YZklMmdjj2rONZUtSn9ft3bmTb01Rkt/s4cSjfF1Ymdnl3LuYdlRWm9Pg1ayCZ1BTntbo2r2cfWJim9Xp3cSohG9co9bu4sqwjXpjpNXl2sKoi3Vhpdfp4tu+mIVrYKja6OHDqI55ZmWp2eTXuJJ6ZGSm2OXdxKiIcmJjp9no3sCkhnRqaavb6eLErI18bmus2ubi');
                        audio.volume = 0.3;
                        audio.play().catch(() => { });
                    } catch (e) { }
                });

                insforge.realtime.on('order_updated', () => {
                    fetchOrders();
                });
            } catch (e) {
                console.log('Realtime not available, using polling');
            }
        }

        setupRealtime();

        // Polling as fallback
        const interval = setInterval(fetchOrders, 5000);

        return () => {
            clearInterval(interval);
            if (connected) {
                insforge.realtime.unsubscribe('orders');
                insforge.realtime.disconnect();
            }
        };
    }, [fetchOrders]);

    async function updateStatus(orderId: number, newStatus: OrderStatus) {
        await insforge.database
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);
        fetchOrders();
    }

    const activeOrders = orders.filter((o) => ['NEW', 'ACCEPTED', 'COOKING', 'READY'].includes(o.status));
    const newCount = orders.filter((o) => o.status === 'NEW').length;
    const cookingCount = orders.filter((o) => o.status === 'COOKING').length;
    const readyCount = orders.filter((o) => o.status === 'READY').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0A0A0F]">
                <div className="flex flex-col items-center gap-4">
                    <ChefHat className="w-16 h-16 text-amber-500 animate-bounce" />
                    <p className="text-gray-400">Loading kitchen orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0A0A0F] overflow-hidden">
            {/* Header */}
            <header className="bg-[#12121A] border-b border-[#1E1E2E] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <ChefHat className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white">Kitchen Display</h1>
                                <p className="text-xs text-gray-500">Flavour Kitchen</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Status Counters */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-blue-400">{newCount} New</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-amber-400">{cookingCount} Cooking</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-xs font-bold text-green-400">{readyCount} Ready</span>
                            </div>
                        </div>
                        <button
                            onClick={fetchOrders}
                            className="p-2 bg-[#1E1E2E] rounded-lg hover:bg-[#2A2A3A] transition-colors group"
                        >
                            <RefreshCcw className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:rotate-180 transition-all duration-500" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Orders Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <UtensilsCrossed className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-xl font-bold">No Active Orders</p>
                        <p className="text-sm mt-1">Orders will appear here in real-time</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeOrders.map((order) => {
                            const config = statusConfig[order.status];
                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-2xl border-2 p-4 transition-all duration-300 animate-fadeIn ${config.bg} ${order.status === 'NEW' ? 'animate-pulse-glow' : ''
                                        }`}
                                >
                                    {/* Order Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-black text-white">#{order.id}</span>
                                            <span className={`status-badge status-${order.status.toLowerCase()}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">Table {order.table_number}</p>
                                            <p className="text-xs text-gray-500">{order.source}</p>
                                        </div>
                                    </div>

                                    {/* Timer */}
                                    <div className="flex items-center gap-1.5 mb-3 text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-xs">
                                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-1.5 mb-4">
                                        {order.order_items?.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2"
                                            >
                                                <span className="text-sm text-white font-medium">{item.name}</span>
                                                <span className="text-sm font-black text-amber-400">×{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Button */}
                                    {config.next && (
                                        <button
                                            onClick={() => updateStatus(order.id, config.next!)}
                                            className={`w-full py-3 ${config.nextColor} text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg`}
                                        >
                                            {config.next === 'ACCEPTED' && <CheckCircle2 className="w-5 h-5" />}
                                            {config.next === 'COOKING' && <Flame className="w-5 h-5" />}
                                            {config.next === 'READY' && <Timer className="w-5 h-5" />}
                                            {config.next === 'SERVED' && <UtensilsCrossed className="w-5 h-5" />}
                                            {config.nextLabel}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
