'use client';

import { useState, useEffect } from 'react';
import { insforge } from '@/lib/insforge';
import { TableInfo } from '@/lib/types';
import {
    ArrowLeft,
    QrCode,
    Plus,
    Download,
    Copy,
    Check,
    Trash2,
    ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function TablesPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<number | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTableNumber, setNewTableNumber] = useState('');

    useEffect(() => {
        fetchTables();
    }, []);

    async function fetchTables() {
        const { data } = await insforge.database
            .from('tables')
            .select()
            .order('table_number', { ascending: true });
        if (data) setTables(data as TableInfo[]);
        setLoading(false);
    }

    async function addTable() {
        const num = parseInt(newTableNumber);
        if (!num) return;
        await insforge.database.from('tables').insert({
            table_number: num,
            qr_code: `/menu?table=${num}`,
        });
        setNewTableNumber('');
        setShowAddForm(false);
        fetchTables();
    }

    async function deleteTable(id: number) {
        if (!confirm('Delete this table?')) return;
        await insforge.database.from('tables').delete().eq('id', id);
        fetchTables();
    }

    function getFullUrl(table: TableInfo) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/menu?table=${table.table_number}`;
    }

    function copyUrl(table: TableInfo) {
        navigator.clipboard.writeText(getFullUrl(table));
        setCopied(table.id);
        setTimeout(() => setCopied(null), 2000);
    }

    function downloadQR(tableNumber: number) {
        const svg = document.querySelector(`#qr-${tableNumber} svg`) as SVGSVGElement;
        if (!svg) return;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const data = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            canvas.width = 400;
            canvas.height = 480;
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, 400, 480);
                ctx.drawImage(img, 50, 30, 300, 300);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 24px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Table ${tableNumber}`, 200, 380);
                ctx.font = '14px Inter, sans-serif';
                ctx.fillStyle = '#666666';
                ctx.fillText('Scan to order', 200, 410);
                ctx.fillText('Flavour Kitchen', 200, 440);
            }
            const link = document.createElement('a');
            link.download = `table-${tableNumber}-qr.png`;
            link.href = canvas.toDataURL();
            link.click();
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--surface-dark)]">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--surface-dark)]">
            <header className="bg-[var(--surface-card)] border-b border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <QrCode className="w-6 h-6 text-cyan-500" />
                        <h1 className="text-lg font-bold">Table & QR Manager</h1>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Table
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6">
                {showAddForm && (
                    <div className="mb-6 bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
                        <input
                            type="number"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value)}
                            placeholder="Table number"
                            className="flex-1 px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                        <button
                            onClick={addTable}
                            className="px-6 py-2.5 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map((table) => (
                        <div
                            key={table.id}
                            className="bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-6 text-center hover:shadow-xl hover:shadow-cyan-500/10 transition-all group"
                        >
                            <h3 className="text-xl font-black mb-4">Table {table.table_number}</h3>
                            <div
                                id={`qr-${table.table_number}`}
                                className="bg-white rounded-xl p-4 mx-auto w-fit mb-4"
                            >
                                <QRCodeSVG
                                    value={getFullUrl(table)}
                                    size={160}
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-4 truncate">
                                {getFullUrl(table)}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => copyUrl(table)}
                                    className="flex items-center gap-1 px-3 py-2 bg-[var(--surface-elevated)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    {copied === table.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied === table.id ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={() => downloadQR(table.table_number)}
                                    className="flex items-center gap-1 px-3 py-2 bg-cyan-500/10 rounded-lg text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                                >
                                    <Download className="w-3 h-3" />
                                    QR
                                </button>
                                <Link
                                    href={`/menu?table=${table.table_number}`}
                                    target="_blank"
                                    className="flex items-center gap-1 px-3 py-2 bg-[var(--surface-elevated)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View
                                </Link>
                                <button
                                    onClick={() => deleteTable(table.id)}
                                    className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
