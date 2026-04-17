'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuItem, CartItem, OrderStatus } from '@/lib/types';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    CreditCard,
    Banknote,
    Smartphone,
    ChefHat,
    Check,
    ArrowLeft,
    Flame,
    X,
    Receipt,
    Hash,
} from 'lucide-react';
import Link from 'next/link';

export default function POSPage() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrderId, setLastOrderId] = useState<number | null>(null);

    useEffect(() => {
        fetchMenu();
    }, []);

    async function fetchMenu() {
        const { data } = await supabase
            .from('menu')
            .select('*')
            .eq('available', true)
            .order('category', { ascending: true });
        if (data) setMenu(data as MenuItem[]);
        setLoading(false);
    }

    const categories = useMemo(() => {
        const cats = ['All', ...new Set(menu.map((item) => item.category))];
        return cats;
    }, [menu]);

    const filteredMenu = useMemo(() => {
        let items = menu;
        if (selectedCategory !== 'All') {
            items = items.filter((item) => item.category === selectedCategory);
        }
        if (searchQuery) {
            items = items.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return items;
    }, [menu, selectedCategory, searchQuery]);

    const addToCart = useCallback((item: MenuItem) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.menu_id === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.menu_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prev, { menu_id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    }, []);

    const updateQuantity = useCallback((menuId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((c) => (c.menu_id === menuId ? { ...c, quantity: c.quantity + delta } : c))
                .filter((c) => c.quantity > 0)
        );
    }, []);

    const removeFromCart = useCallback((menuId: number) => {
        setCart((prev) => prev.filter((c) => c.menu_id !== menuId));
    }, []);

    const cartTotal = useMemo(
        () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
        [cart]
    );

    async function placeOrder(paymentMethod: 'cash' | 'upi' | 'card') {
        if (cart.length === 0) return;

        // Create order
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                table_number: selectedTable,
                source: 'POS',
                status: 'NEW',
                total: cartTotal,
            })
            .select()
            .single();

        if (orderError || !orderData) {
            alert('Failed to create order');
            return;
        }

        const order = orderData as { id: number };

        // Insert order items
        const items = cart.map((c) => ({
            order_id: order.id,
            menu_id: c.menu_id,
            name: c.name,
            quantity: c.quantity,
            price: c.price,
        }));

        await supabase.from('order_items').insert(items);

        // Record payment
        await supabase.from('payments').insert({
            order_id: order.id,
            method: paymentMethod,
            amount: cartTotal,
        });

        // Send webhook for n8n
        try {
            await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'new_order',
                    order_id: order.id,
                    table_number: selectedTable,
                    source: 'POS',
                    total: cartTotal,
                    items: cart,
                    payment_method: paymentMethod,
                }),
            });
        } catch (e) {
            // Webhook is optional
        }

        setLastOrderId(order.id);
        setCart([]);
        setShowPayment(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--surface-dark)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--text-secondary)]">Loading menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--surface-dark)] overflow-hidden">
            {/* Top Bar */}
            <header className="flex items-center justify-between px-4 py-3 bg-[var(--surface-card)] border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Flame className="w-6 h-6 text-orange-500" />
                        <h1 className="text-lg font-bold">POS Terminal</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[var(--surface-elevated)] px-3 py-2 rounded-lg">
                        <Hash className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-[var(--text-secondary)]">Table</span>
                        <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(Number(e.target.value))}
                            className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
                        >
                            {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n} className="bg-[var(--surface-card)]">
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Menu Panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Search & Filter */}
                    <div className="p-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search menu items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--surface-card)] border border-[var(--border-color)] rounded-xl text-white placeholder:text-[var(--text-muted)] outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Menu Grid */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredMenu.map((item) => {
                                const inCart = cart.find((c) => c.menu_id === item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`relative bg-[var(--surface-card)] border rounded-xl p-3 text-left transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/50 group ${inCart ? 'border-orange-500/60 bg-orange-500/5' : 'border-[var(--border-color)]'
                                            }`}
                                    >
                                        {inCart && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                {inCart.quantity}
                                            </div>
                                        )}
                                        <p className="text-sm font-medium text-white leading-tight mb-2 group-hover:text-orange-400 transition-colors">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">{item.category}</p>
                                        <p className="text-sm font-bold text-orange-400">
                                            {item.price > 0 ? `₹${item.price}` : 'Seasonal'}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Cart Panel */}
                <div className="w-80 lg:w-96 bg-[var(--surface-card)] border-l border-[var(--border-color)] flex flex-col">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-orange-500" />
                                <h2 className="font-bold">Order</h2>
                                <span className="text-xs text-[var(--text-muted)]">Table {selectedTable}</span>
                            </div>
                            {cart.length > 0 && (
                                <button
                                    onClick={() => setCart([])}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {cart.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] px-6">
                            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm text-center">Tap menu items to add them to the order</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.menu_id}
                                        className="bg-[var(--surface-elevated)] rounded-lg p-3 flex items-center gap-3 animate-fadeIn"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                            <p className="text-xs text-orange-400">₹{item.price} × {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateQuantity(item.menu_id, -1)}
                                                className="w-7 h-7 rounded-md bg-[var(--surface-card)] flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.menu_id, 1)}
                                                className="w-7 h-7 rounded-md bg-[var(--surface-card)] flex items-center justify-center hover:bg-green-500/20 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.menu_id)}
                                                className="w-7 h-7 rounded-md bg-[var(--surface-card)] flex items-center justify-center hover:bg-red-500/20 text-red-400 transition-colors ml-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold text-white w-14 text-right">
                                            ₹{item.price * item.quantity}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-[var(--border-color)] space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Subtotal</span>
                                    <span className="font-bold">₹{cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg">
                                    <span className="font-bold">Total</span>
                                    <span className="font-black text-orange-400">₹{cartTotal.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => setShowPayment(true)}
                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <Receipt className="w-5 h-5" />
                                    Place Order & Pay
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-[var(--surface-card)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[var(--border-color)] animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Payment</h3>
                            <button onClick={() => setShowPayment(false)} className="text-[var(--text-muted)] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-center mb-6">
                            <p className="text-sm text-[var(--text-secondary)]">Total Amount</p>
                            <p className="text-4xl font-black text-orange-400">₹{cartTotal.toFixed(2)}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Table {selectedTable} • POS Order</p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => placeOrder('cash')}
                                className="w-full flex items-center gap-4 p-4 bg-[var(--surface-elevated)] rounded-xl hover:bg-green-500/10 hover:border-green-500/40 border border-[var(--border-color)] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <Banknote className="w-6 h-6 text-green-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">Cash</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Pay with cash</p>
                                </div>
                            </button>
                            <button
                                onClick={() => placeOrder('upi')}
                                className="w-full flex items-center gap-4 p-4 bg-[var(--surface-elevated)] rounded-xl hover:bg-purple-500/10 hover:border-purple-500/40 border border-[var(--border-color)] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <Smartphone className="w-6 h-6 text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">UPI</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Google Pay, PhonePe, etc.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => placeOrder('card')}
                                className="w-full flex items-center gap-4 p-4 bg-[var(--surface-elevated)] rounded-xl hover:bg-blue-500/10 hover:border-blue-500/40 border border-[var(--border-color)] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">Card</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Debit / Credit card</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-8 right-8 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl shadow-green-500/30 animate-slideUp flex items-center gap-3 z-50">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold">Order #{lastOrderId} Placed!</p>
                        <p className="text-sm text-green-100">Sent to kitchen</p>
                    </div>
                </div>
            )}
        </div>
    );
}
