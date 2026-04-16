'use client';

import Link from 'next/link';
import {
  Monitor,
  QrCode,
  ChefHat,
  Receipt,
  LayoutDashboard,
  UtensilsCrossed,
  ArrowRight,
  Flame
} from 'lucide-react';

const modules = [
  {
    title: 'POS Terminal',
    description: 'Staff ordering interface with search, cart, and billing',
    icon: Monitor,
    href: '/pos',
    gradient: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/20',
  },
  {
    title: 'QR Ordering',
    description: 'Customer self-service menu with QR code scanning',
    icon: QrCode,
    href: '/menu?table=1',
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/20',
  },
  {
    title: 'Kitchen Display',
    description: 'Real-time order management for kitchen staff',
    icon: ChefHat,
    href: '/kitchen',
    gradient: 'from-amber-500 to-yellow-500',
    shadow: 'shadow-amber-500/20',
  },
  {
    title: 'Billing',
    description: 'Invoice generation, payments, and receipt printing',
    icon: Receipt,
    href: '/billing',
    gradient: 'from-blue-500 to-indigo-500',
    shadow: 'shadow-blue-500/20',
  },
  {
    title: 'Admin Dashboard',
    description: 'Analytics, menu management, and revenue insights',
    icon: LayoutDashboard,
    href: '/admin',
    gradient: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/20',
  },
  {
    title: 'Table & QR Manager',
    description: 'Manage tables and generate QR codes for ordering',
    icon: UtensilsCrossed,
    href: '/admin/tables',
    gradient: 'from-cyan-500 to-blue-500',
    shadow: 'shadow-cyan-500/20',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--surface-dark)] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Flavour
              </span>
              <span className="text-white ml-2">Kitchen</span>
            </h1>
          </div>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Complete restaurant management system with POS, QR ordering, kitchen display, and analytics
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, i) => (
            <Link
              key={module.title}
              href={module.href}
              className={`group relative bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl p-6 hover:border-transparent transition-all duration-300 hover:shadow-xl ${module.shadow} animate-slideUp`}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{module.title}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{module.description}</p>
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-[var(--text-muted)]">
          <p>Powered by InsForge • Real-time sync across all stations</p>
        </div>
      </div>
    </div>
  );
}
