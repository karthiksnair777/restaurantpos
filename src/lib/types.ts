export interface MenuItem {
    id: number;
    name: string;
    category: string;
    price: number;
    available: boolean;
}

export type OrderStatus = 'NEW' | 'ACCEPTED' | 'COOKING' | 'READY' | 'SERVED' | 'CLOSED';
export type OrderSource = 'QR' | 'POS';
export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Order {
    id: number;
    table_number: number;
    source: OrderSource;
    status: OrderStatus;
    total: number;
    created_at: string;
    order_items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    order_id: number;
    menu_id: number;
    name: string;
    quantity: number;
    price: number;
}

export interface Payment {
    id: number;
    order_id: number;
    method: PaymentMethod;
    amount: number;
    time: string;
}

export interface TableInfo {
    id: number;
    table_number: number;
    qr_code: string;
}

export interface CartItem {
    menu_id: number;
    name: string;
    price: number;
    quantity: number;
}
