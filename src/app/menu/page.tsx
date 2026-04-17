'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MenuItem, CartItem } from '@/lib/types';
import {
    Search,
    Plus,
    Minus,
    ShoppingCart,
    Check,
    ChevronDown,
    X,
    Send,
    Flame,
    UtensilsCrossed,
} from 'lucide-react';

function MenuContent() {
    const searchParams = useSearchParams();
    const tableNumber = Number(searchParams.get('table')) || 1;
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
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

    const categories = useMemo(
        () => ['All', ...new Set(menu.map((i) => i.category))],
        [menu]
    );

    const filteredMenu = useMemo(() => {
        let items = menu;
        if (selectedCategory !== 'All')
            items = items.filter((i) => i.category === selectedCategory);
        if (searchQuery)
            items = items.filter((i) =>
                i.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        return items;
    }, [menu, selectedCategory, searchQuery]);

    const groupedMenu = useMemo(() => {
        const groups: Record<string, MenuItem[]> = {};
        filteredMenu.forEach((item) => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredMenu]);

    function addToCart(item: MenuItem) {
        setCart((prev) => {
            const existing = prev.find((c) => c.menu_id === item.id);
            if (existing)
                return prev.map((c) =>
                    c.menu_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            return [...prev, { menu_id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    }

    function updateQuantity(menuId: number, delta: number) {
        setCart((prev) =>
            prev
                .map((c) => (c.menu_id === menuId ? { ...c, quantity: c.quantity + delta } : c))
                .filter((c) => c.quantity > 0)
        );
    }

    const cartTotal = useMemo(
        () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
        [cart]
    );

    const cartCount = useMemo(
        () => cart.reduce((sum, c) => sum + c.quantity, 0),
        [cart]
    );

    async function placeOrder() {
        if (cart.length === 0) return;

        const { data: orderData, error } = await supabase
            .from('orders')
            .insert({
                table_number: tableNumber,
                source: 'QR',
                status: 'NEW',
                total: cartTotal,
            })
            .select()
            .single();

        if (error || !orderData) {
            alert('Failed to place order. Please try again.');
            return;
        }

        const order = orderData as { id: number };

        const items = cart.map((c) => ({
            order_id: order.id,
            menu_id: c.menu_id,
            name: c.name,
            quantity: c.quantity,
            price: c.price,
        }));

        await supabase.from('order_items').insert(items);

        // Webhook
        try {
            await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'new_order',
                    order_id: order.id,
                    table_number: tableNumber,
                    source: 'QR',
                    total: cartTotal,
                    items: cart,
                }),
            });
        } catch (e) { }

        setLastOrderId(order.id);
        setCart([]);
        setShowCart(false);
        setOrderPlaced(true);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading menu...</p>
                </div>
            </div>
        );
    }

    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
                <div className="text-center animate-slideUp max-w-sm">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Order Placed!</h1>
                    <p className="text-gray-500 mb-2">Order #{lastOrderId}</p>
                    <p className="text-gray-400 text-sm mb-8">
                        Your order has been sent to the kitchen. You&apos;ll be served shortly at Table {tableNumber}.
                    </p>
                    <button
                        onClick={() => {
                            setOrderPlaced(false);
                            setLastOrderId(null);
                        }}
                        className="px-8 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
                    >
                        Order More
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                                <Flame className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-gray-900">Flavour Kitchen</h1>
                                <p className="text-xs text-gray-400">Table {tableNumber}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                QR Order
                            </span>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-orange-400 transition-colors"
                        />
                    </div>
                </div>
                {/* Categories Scroll */}
                <div className="max-w-lg mx-auto px-4 pb-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Menu */}
            <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
                {Object.entries(groupedMenu).map(([category, items]) => (
                    <section key={category}>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full" />
                            {category}
                        </h2>
                        <div className="space-y-2">
                            {items.map((item) => {
                                const inCart = cart.find((c) => c.menu_id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-xl p-3 flex items-center justify-between border transition-all ${inCart ? 'border-orange-300 shadow-sm' : 'border-transparent'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm font-bold text-orange-500 mt-0.5">
                                                {item.price > 0 ? `₹${item.price}` : 'Seasonal Rate'}
                                            </p>
                                        </div>
                                        {inCart ? (
                                            <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-orange-500"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-6 text-center font-bold text-gray-900 text-sm">
                                                    {inCart.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-8 h-8 rounded-lg bg-orange-500 shadow-sm flex items-center justify-center text-white"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="px-4 py-2 bg-orange-50 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-100 transition-colors"
                                            >
                                                ADD
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </main>

            {/* Cart FAB */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8] to-transparent">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={() => setShowCart(true)}
                            className="w-full flex items-center justify-between bg-orange-500 text-white px-6 py-4 rounded-2xl shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart className="w-6 h-6" />
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-500 text-xs font-black rounded-full flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                </div>
                                <span className="font-bold">View Cart</span>
                            </div>
                            <span className="font-black text-lg">₹{cartTotal.toFixed(0)}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-slideUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-black text-gray-900">Your Order</h3>
                            <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto max-h-[50vh] space-y-3">
                            {cart.map((item) => (
                                <div key={item.menu_id} className="flex items-center justify-between py-2">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-400">₹{item.price} × {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(item.menu_id, -1)}
                                            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </button>
                                        <span className="w-5 text-center font-bold text-sm text-gray-900">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.menu_id, 1)}
                                            className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center"
                                        >
                                            <Plus className="w-3 h-3 text-orange-600" />
                                        </button>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 w-16 text-right">
                                        ₹{(item.price * item.quantity).toFixed(0)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t border-gray-100 space-y-4">
                            <div className="flex justify-between">
                                <span className="font-bold text-gray-900">Total</span>
                                <span className="font-black text-xl text-orange-500">₹{cartTotal.toFixed(0)}</span>
                            </div>
                            <button
                                onClick={placeOrder}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MenuPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <MenuContent />
        </Suspense>
    );
}
