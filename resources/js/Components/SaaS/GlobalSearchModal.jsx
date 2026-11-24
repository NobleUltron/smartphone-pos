import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import {
    Search,
    X,
    Smartphone,
    Package,
    UserSquare,
    Receipt,
    Wrench,
    ArrowRight,
    Loader2,
    ShoppingCart,
    Landmark,
    TrendingUp,
    Clock,
    Wallet,
    BarChart3,
    Settings,
    Users,
    CornerDownLeft,
} from 'lucide-react';

export default function GlobalSearchModal({ isOpen, onClose }) {
    const { auth } = usePage().props;
    const role = (auth?.user?.role || 'cashier').toLowerCase();
    const isAdminOrManager = role === 'admin' || role === 'manager';
    const isTechnician = role === 'technician';
    const perms = auth?.permissions || {};
    const canManageAccounts = role === 'admin' || perms.manage_accounts === true;
    const canManageInventory = role === 'admin' || perms.manage_inventory === true;
    const canViewReports = role === 'admin' || perms.view_reports === true;

    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [results, setResults] = useState({
        imeis: [],
        products: [],
        customers: [],
        receipts: [],
        repairs: [],
    });

    const quickPages = useMemo(() => {
        const items = [
            !isTechnician && { id: 'nav-pos', group: 'Quick Jump', title: 'POS Checkout', subtitle: 'Process a new sale or layaway', url: '/pos', icon: ShoppingCart },
            canViewReports && { id: 'nav-zreport', group: 'Quick Jump', title: 'Daily Z-Report', subtitle: 'End-of-day owner brief & WhatsApp summary', url: '/reports/daily-z-report', icon: TrendingUp },
            canManageAccounts && { id: 'nav-accounts', group: 'Quick Jump', title: 'Money & Accounts', subtitle: 'Wallets, transfers, personal reserves', url: '/accounts', icon: Landmark },
            canManageAccounts && { id: 'nav-partners', group: 'Quick Jump', title: 'Partner & Family Capital', subtitle: 'Partner investment pools & payouts', url: '/accounts/partners', icon: Users },
            canManageInventory && { id: 'nav-inventory', group: 'Quick Jump', title: 'Inventory & IMEIs', subtitle: 'Manage phones, stock & pricing', url: '/inventory', icon: Smartphone },
            canManageInventory && { id: 'nav-labels', group: 'Quick Jump', title: 'IMEI Barcode Label Studio', subtitle: 'Print box & shelf stickers (A4 or 50×30mm)', url: '/inventory/labels', icon: Package },
            !isTechnician && { id: 'nav-receipts', group: 'Quick Jump', title: 'Issued Receipts', subtitle: 'Search, reprint, WhatsApp or refund', url: '/receipts', icon: Receipt },
            !isTechnician && { id: 'nav-layaways', group: 'Quick Jump', title: 'Layaways & Installments', subtitle: 'Collect balances & send reminders', url: '/layaways', icon: Clock },
            !isTechnician && { id: 'nav-drawer', group: 'Quick Jump', title: 'Shift Management', subtitle: 'Open/close cash drawer shifts', url: '/cash-drawer', icon: Wallet },
            { id: 'nav-repairs', group: 'Quick Jump', title: 'Repairs Workbench', subtitle: 'Track repair tickets & status updates', url: '/repairs', icon: Wrench },
            !isTechnician && { id: 'nav-customers', group: 'Quick Jump', title: 'Customers', subtitle: 'Customer directory & purchase history', url: '/customers', icon: UserSquare },
            canViewReports && { id: 'nav-reports', group: 'Quick Jump', title: 'Business Reports', subtitle: 'Sales analytics, P&L & brand margins', url: '/reports', icon: BarChart3 },
            canViewReports && { id: 'nav-pnl', group: 'Quick Jump', title: 'Profit & Loss Statement (P&L)', subtitle: 'Accountant / URA / Bank Loan PDF & Excel export', url: '/reports/profit-loss', icon: TrendingUp },
            isAdminOrManager && { id: 'nav-settings', group: 'Quick Jump', title: 'Store Settings', subtitle: 'Shop profile, logo, receipt terms', url: '/settings', icon: Settings },
        ].filter(Boolean);

        if (!query.trim()) return items;
        const q = query.trim().toLowerCase();
        return items.filter(
            (i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
        );
    }, [isAdminOrManager, isTechnician, query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 40);
        } else {
            setQuery('');
            setResults({ imeis: [], products: [], customers: [], receipts: [], repairs: [] });
        }
    }, [isOpen]);

    // Debounced API search
    useEffect(() => {
        if (!isOpen) return;
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults({ imeis: [], products: [], customers: [], receipts: [], repairs: [] });
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get('/api/global-search', { params: { q: trimmed } });
                if (!cancelled) {
                    setResults(res.data || { imeis: [], products: [], customers: [], receipts: [], repairs: [] });
                    setActiveIdx(0);
                }
            } catch {
                // Silent fail on transient search error
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 180);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, isOpen]);

    // Flatten selectable items for keyboard arrow navigation
    const flatItems = useMemo(() => {
        const list = [];
        const pushGroup = (items, group, icon) => {
            items.forEach((item) => list.push({ ...item, group, icon }));
        };

        if (query.trim().length >= 2) {
            pushGroup(results.imeis || [], 'Phones / IMEIs', Smartphone);
            pushGroup(results.customers || [], 'Customers', UserSquare);
            pushGroup(results.receipts || [], 'Receipts', Receipt);
            pushGroup(results.repairs || [], 'Repair Tickets', Wrench);
            pushGroup(results.products || [], 'Catalog / Products', Package);
            quickPages.slice(0, 4).forEach((p) => list.push(p));
        } else {
            quickPages.forEach((p) => list.push(p));
        }
        return list;
    }, [results, quickPages, query]);

    const handleSelect = (item) => {
        if (!item?.url) return;
        onClose();
        router.visit(item.url);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((prev) => (flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0));
        } else if (e.key === 'Enter' && flatItems[activeIdx]) {
            e.preventDefault();
            handleSelect(flatItems[activeIdx]);
        }
    };

    if (!isOpen) return null;

    // Group flatItems preserving exact index for keyboard highlight
    const grouped = [];
    flatItems.forEach((item, index) => {
        let g = grouped.find((grp) => grp.name === item.group);
        if (!g) {
            g = { name: item.group, items: [] };
            grouped.push(g);
        }
        g.items.push({ ...item, flatIndex: index });
    });

    const getBadgeStyle = (badge) => {
        const b = (badge || '').toLowerCase();
        if (b === 'in stock' || b === 'paid' || b === 'completed' || b === 'delivered') {
            return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
        }
        if (b === 'in transit' || b === 'partial' || b === 'in progress' || b === 'pending') {
            return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
        }
        if (b === 'sold' || b === 'refunded' || b === 'cancelled') {
            return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
        }
        return 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
                    {loading ? (
                        <Loader2 size={18} className="text-indigo-500 animate-spin shrink-0" />
                    ) : (
                        <Search size={18} className="text-slate-400 shrink-0" />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search IMEI, phone model, customer, receipt #, repair ticket..."
                        className="flex-1 bg-transparent border-0 p-0 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X size={15} />
                        </button>
                    )}
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">
                        ESC
                    </span>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
                    {grouped.length > 0 ? (
                        grouped.map((group) => (
                            <div key={group.name}>
                                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    {group.name}
                                </div>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const Icon = item.icon || ArrowRight;
                                        const isActive = item.flatIndex === activeIdx;
                                        return (
                                            <button
                                                key={`${group.name}-${item.id}`}
                                                type="button"
                                                onMouseEnter={() => setActiveIdx(item.flatIndex)}
                                                onClick={() => handleSelect(item)}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        isActive
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold truncate">{item.title}</div>
                                                        {item.subtitle && (
                                                            <div className={`text-[11px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                {item.subtitle}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.price > 0 && (
                                                        <span className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                            UGX {Number(item.price).toLocaleString()}
                                                        </span>
                                                    )}
                                                    {item.badge && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isActive ? 'bg-white/20 text-white' : getBadgeStyle(item.badge)
                                                        }`}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    <ArrowRight size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-xs font-medium">
                            {loading ? 'Searching...' : `No matches found for "${query}"`}
                        </div>
                    )}
                </div>

                {/* Footer Keyboard Hints */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono font-bold text-[10px] shadow-2xs">↑↓</span>
                            Navigate
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] inline-flex items-center shadow-2xs"><CornerDownLeft size={10} /></span>
                            Open
                        </span>
                    </div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">SmartPOS Command Search</span>
                </div>
            </div>
        </div>
    );
}
