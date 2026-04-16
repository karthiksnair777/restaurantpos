'use client';

import { useState, useEffect, useRef } from 'react';
import { insforge } from '@/lib/insforge';
import { Order, OrderItem, Payment } from '@/lib/types';
import {
    ArrowLeft,
    Flame,
    Receipt,
    Search,
    Printer,
    Download,
    CreditCard,
    Banknote,
    Smartphone,
    Check,
    X,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface OrderWithDetails extends Order {
    order_items: OrderItem[];
    payments?: Payment[];
}

export default function BillingPage() {
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
    const billRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [filter]);

    async function fetchOrders() {
        let query = insforge.database
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (filter === 'unpaid') {
            query = query.in('status', ['READY', 'SERVED']);
        } else if (filter === 'paid') {
            query = query.eq('status', 'CLOSED');
        }

        const { data } = await query;
        if (data) {
            const ordersData = data as OrderWithDetails[];
            // Fetch payments for each order
            const orderIds = ordersData.map((o) => o.id);
            if (orderIds.length > 0) {
                const { data: payments } = await insforge.database
                    .from('payments')
                    .select()
                    .in('order_id', orderIds);
                if (payments) {
                    const paymentMap: Record<number, Payment[]> = {};
                    (payments as Payment[]).forEach((p) => {
                        if (!paymentMap[p.order_id]) paymentMap[p.order_id] = [];
                        paymentMap[p.order_id].push(p);
                    });
                    ordersData.forEach((o) => {
                        o.payments = paymentMap[o.id] || [];
                    });
                }
            }
            setOrders(ordersData);
        }
        setLoading(false);
    }

    const filteredOrders = orders.filter((o) => {
        if (!searchQuery) return true;
        return (
            o.id.toString().includes(searchQuery) ||
            o.table_number.toString().includes(searchQuery)
        );
    });

    async function processPayment(orderId: number, method: 'cash' | 'upi' | 'card', amount: number) {
        await insforge.database.from('payments').insert({
            order_id: orderId,
            method,
            amount,
        });

        await insforge.database
            .from('orders')
            .update({ status: 'CLOSED' })
            .eq('id', orderId);

        setShowPaymentModal(false);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
            const { data } = await insforge.database
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId)
                .single();
            if (data) {
                const { data: payments } = await insforge.database
                    .from('payments')
                    .select()
                    .eq('order_id', orderId);
                (data as OrderWithDetails).payments = (payments || []) as Payment[];
                setSelectedOrder(data as OrderWithDetails);
            }
        }
    }

    function printBill() {
        const printContent = billRef.current;
        if (!printContent) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
      <html>
        <head>
          <title>Bill #${selectedOrder?.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .text-sm { font-size: 12px; }
            .text-lg { font-size: 16px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
        win.document.close();
    }

    const isPaid = selectedOrder?.status === 'CLOSED' || (selectedOrder?.payments && selectedOrder.payments.length > 0);

    return (
        <div className="h-screen flex flex-col bg-[var(--surface-dark)] overflow-hidden">
            {/* Header */}
            <header className="bg-[var(--surface-card)] border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Receipt className="w-6 h-6 text-blue-500" />
                        <h1 className="text-lg font-bold">Billing</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['unpaid', 'paid', 'all'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === f
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Order List */}
                <div className="w-96 border-r border-[var(--border-color)] flex flex-col">
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by order # or table..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-white text-sm placeholder:text-[var(--text-muted)] outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                        {filteredOrders.map((order) => (
                            <button
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedOrder?.id === order.id
                                        ? 'bg-blue-500/10 border-blue-500/40'
                                        : 'bg-[var(--surface-card)] border-[var(--border-color)] hover:border-blue-500/30'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold">Order #{order.id}</span>
                                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">
                                        Table {order.table_number} • {order.source}
                                    </span>
                                    <span className="font-bold text-orange-400">₹{Number(order.total).toFixed(0)}</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                                </p>
                            </button>
                        ))}
                        {filteredOrders.length === 0 && (
                            <div className="text-center py-20 text-[var(--text-muted)]">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No orders found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bill Preview */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                    {selectedOrder ? (
                        <div className="w-full max-w-md">
                            {/* Bill Card */}
                            <div
                                ref={billRef}
                                className="bg-white text-gray-900 rounded-2xl p-8 shadow-2xl mb-6"
                            >
                                {/* Header */}
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black">🔥 Flavour Kitchen</h2>
                                    <p className="text-xs text-gray-400 mt-1">Premium Dining Experience</p>
                                    <div className="w-full h-px bg-gray-200 mt-4" />
                                </div>

                                {/* Order Info */}
                                <div className="flex justify-between text-sm mb-4">
                                    <div>
                                        <p className="text-gray-500">Order #</p>
                                        <p className="font-bold">{selectedOrder.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-500">Table</p>
                                        <p className="font-bold">{selectedOrder.table_number}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mb-4">
                                    <span>{format(new Date(selectedOrder.created_at), 'dd MMMM yyyy, hh:mm a')}</span>
                                    <span>{selectedOrder.source}</span>
                                </div>

                                <div className="w-full h-px bg-gray-200 mb-4" />

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                                        <span>Item</span>
                                        <div className="flex gap-6">
                                            <span>Qty</span>
                                            <span className="w-16 text-right">Amount</span>
                                        </div>
                                    </div>
                                    {selectedOrder.order_items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="flex-1">{item.name}</span>
                                            <div className="flex gap-6">
                                                <span className="text-center w-6">{item.quantity}</span>
                                                <span className="w-16 text-right font-medium">
                                                    ₹{(item.price * item.quantity).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full h-px bg-gray-200 my-4" />

                                {/* Totals */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-black">
                                        <span>Total</span>
                                        <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Payment Info */}
                                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                                    <>
                                        <div className="w-full h-px bg-gray-200 my-4" />
                                        <div className="space-y-1">
                                            {selectedOrder.payments.map((p) => (
                                                <div key={p.id} className="flex justify-between text-xs text-gray-500">
                                                    <span>Paid via {p.method.toUpperCase()}</span>
                                                    <span>₹{Number(p.amount).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-center gap-2 mt-3 text-green-600">
                                                <Check className="w-4 h-4" />
                                                <span className="text-sm font-bold">PAID</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="text-center mt-6 text-xs text-gray-300">
                                    Thank you for dining with us!
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {!isPaid && (
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        Accept Payment
                                    </button>
                                )}
                                <button
                                    onClick={printBill}
                                    className="px-4 py-3 bg-[var(--surface-card)] border border-[var(--border-color)] text-white font-bold rounded-xl hover:bg-[var(--surface-elevated)] transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    Print
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-[var(--text-muted)]">
                            <Receipt className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-bold">Select an order</p>
                            <p className="text-sm mt-1">Choose an order from the list to view or print the bill</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-[var(--surface-card)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[var(--border-color)] animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Accept Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-[var(--text-muted)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-center mb-6">
                            <p className="text-sm text-[var(--text-secondary)]">Order #{selectedOrder.id} • Table {selectedOrder.table_number}</p>
                            <p className="text-4xl font-black text-blue-400">₹{Number(selectedOrder.total).toFixed(2)}</p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { method: 'cash' as const, label: 'Cash', icon: Banknote, color: 'green' },
                                { method: 'upi' as const, label: 'UPI', icon: Smartphone, color: 'purple' },
                                { method: 'card' as const, label: 'Card', icon: CreditCard, color: 'blue' },
                            ].map(({ method, label, icon: Icon, color }) => (
                                <button
                                    key={method}
                                    onClick={() => processPayment(selectedOrder.id, method, Number(selectedOrder.total))}
                                    className={`w-full flex items-center gap-4 p-4 bg-[var(--surface-elevated)] rounded-xl hover:bg-${color}-500/10 border border-[var(--border-color)] transition-all`}
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                                        <Icon className={`w-6 h-6 text-${color}-400`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold">{label}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
