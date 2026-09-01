import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Smartphone, 
    ShoppingCart, 
    Wrench, 
    Users, 
    BarChart3, 
    Settings, 
    LogOut,
    Menu,
    X,
    Bell,
    ChevronDown,
    User,
    Receipt,
    ShieldCheck,
    AlertTriangle,
    UserSquare,
    Wallet,
    Package,
    Clock,
    Handshake,
    Sun,
    Moon,
    Landmark
} from 'lucide-react';
import Dropdown from '@/Components/Dropdown';
import { Toaster, toast } from 'react-hot-toast';
import { ThemeProvider, useTheme } from '@/Contexts/ThemeContext';
import OfflineStatusIndicator from '@/Components/OfflineStatusIndicator';
import PwaInstallPrompt from '@/Components/PwaInstallPrompt';

function LayoutInner({ children }) {
    const { isDark, toggleTheme } = useTheme();
    const { auth, errors, flash, notifications } = usePage().props;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const user = auth?.user;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (errors && errors.error) {
            toast.error(errors.error);
        }
        if (flash && flash.success) {
            toast.success(flash.success);
        }
        if (flash && flash.error) {
            toast.error(flash.error);
        }
    }, [errors, flash]);

    // Handle responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsMobile(true);
                setIsSidebarOpen(false);
            } else {
                setIsMobile(false);
                setIsSidebarOpen(true);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const userRole = (user?.role || 'cashier').toLowerCase();
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const isAdmin = userRole === 'admin';
    const isTechnician = userRole === 'technician';

    let dashboardLink = { name: 'Cashier Portal', href: route('cashier.index'), icon: LayoutDashboard, active: route().current('cashier.*') };
    if (isAdminOrManager) {
        dashboardLink = { name: 'Dashboard', href: route('dashboard'), icon: LayoutDashboard, active: route().current('dashboard') };
    } else if (isTechnician) {
        dashboardLink = { name: 'Technician Portal', href: route('technician.index'), icon: LayoutDashboard, active: route().current('technician.*') };
    }

    const navGroups = [
        {
            title: 'OPERATIONS',
            items: [
                dashboardLink,
                !isTechnician ? { name: 'POS Checkout', href: route('pos.index'), icon: ShoppingCart, active: route().current('pos.*') } : null,
                isAdminOrManager ? { name: 'Money & Accounts', href: route('accounts.index'), icon: Landmark, active: route().current('accounts.*') } : null,
                !isTechnician ? { name: 'Shift Management', href: route('cash-drawer.index'), icon: Wallet, active: route().current('cash-drawer.*') } : null,
                !isTechnician ? { name: 'Expenses', href: route('expenses.index'), icon: Receipt, active: route().current('expenses.*') } : null,
            ].filter(Boolean)
        },
        {
            title: 'INVENTORY & SALES',
            items: [
                isAdminOrManager ? { name: 'Inventory', href: route('inventory.index'), icon: Smartphone, active: route().current('inventory.*') } : null,
                !isTechnician ? { name: 'Issued Receipts', href: route('receipts.index'), icon: Receipt, active: route().current('receipts.*') } : null,
                !isTechnician ? { name: 'Layaways & Installments', href: route('layaways.index'), icon: Clock, active: route().current('layaways.*') } : null,
                isAdminOrManager ? { name: 'Suppliers', href: route('suppliers.index'), icon: Package, active: route().current('suppliers.*') || route().current('purchases.*') } : null,
            ].filter(Boolean)
        },
        {
            title: 'PARTNERS & CRM',
            items: [
                !isTechnician ? { name: 'Customers', href: route('customers.index'), icon: UserSquare, active: route().current('customers.*') } : null,
                !isTechnician ? { name: 'Dealer Management', href: route('dealers.dashboard'), icon: Handshake, active: route().current('dealers.*') } : null,
                { name: 'Repairs', href: route('repairs.index'), icon: Wrench, active: route().current('repairs.*') },
                !isTechnician ? { name: 'Warranty & Returns', href: route('warranties.index'), icon: ShieldCheck, active: route().current('warranties.*') } : null,
            ].filter(Boolean)
        },
        {
            title: 'MANAGEMENT & REPORTS',
            items: [
                isAdmin ? { name: 'Staff / Users', href: route('users.index'), icon: Users, active: route().current('users.*') } : null,
                isAdminOrManager ? { name: 'Business Reports', href: route('reports.index'), icon: BarChart3, active: route().current('reports.*') } : null,
                isAdminOrManager ? { name: 'Audit Trail Log', href: route('activity-logs.index'), icon: ShieldCheck, active: route().current('activity-logs.*') } : null,
            ].filter(Boolean)
        }
    ].filter(g => g.items.length > 0);

    // Role-based bottom mobile navigation items
    const mobileNavItems = [
        {
            name: isTechnician ? 'Workbench' : (isAdminOrManager ? 'Dashboard' : 'Cashier'),
            href: dashboardLink.href,
            icon: LayoutDashboard,
            active: dashboardLink.active
        },
        !isTechnician ? {
            name: 'POS',
            href: route('pos.index'),
            icon: ShoppingCart,
            active: route().current('pos.*')
        } : null,
        {
            name: 'Repairs',
            href: route('repairs.index'),
            icon: Wrench,
            active: route().current('repairs.*')
        },
        isAdminOrManager ? {
            name: 'Stock',
            href: route('inventory.index'),
            icon: Package,
            active: route().current('inventory.*')
        } : (!isTechnician ? {
            name: 'Drawer',
            href: route('cash-drawer.index'),
            icon: Wallet,
            active: route().current('cash-drawer.*')
        } : null),
        !isTechnician ? {
            name: 'Dealers',
            href: route('dealers.dashboard'),
            icon: Handshake,
            active: route().current('dealers.*')
        } : {
            name: 'Profile',
            href: route('profile.edit'),
            icon: User,
            active: route().current('profile.*')
        }
    ].filter(Boolean);

    return (
        <div className={`flex h-screen overflow-hidden font-sans ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'}`}>
            <Toaster position="top-right" toastOptions={{ className: 'font-sans' }} />
            
            {/* Mobile Sidebar Overlay */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-300 transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } flex flex-col shadow-2xl lg:shadow-none`}
            >
                {/* Sidebar Header / Logo */}
                <div className="flex items-center justify-between h-20 px-6 bg-[#111827]/50 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                            <Smartphone size={18} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-lg text-white tracking-tight">SmartPOS</span>
                    </Link>
                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Sidebar Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar space-y-6">
                    {navGroups.map((group, gIdx) => (
                        <div key={gIdx}>
                            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2.5 px-2">
                                {group.title}
                            </div>
                            <nav className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = item.active;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group ${
                                                isActive 
                                                    ? 'bg-gradient-to-r from-rose-500/15 to-transparent text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 w-1 h-6 bg-rose-500 rounded-r-full" />
                                            )}
                                            <item.icon 
                                                size={17} 
                                                className={isActive ? 'text-rose-500' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} 
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}

                    <div>
                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2.5 px-2">SYSTEM & ACCOUNT</div>
                        <nav className="space-y-1">
                            {isAdminOrManager && (
                                <Link href={route('settings.index')} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${route().current('settings.*') ? 'bg-gradient-to-r from-rose-500/15 to-transparent text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    {route().current('settings.*') && <div className="absolute left-0 w-1 h-6 bg-rose-500 rounded-r-full" />}
                                    <Settings size={17} className={route().current('settings.*') ? 'text-rose-500' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                                    Store Settings
                                </Link>
                            )}
                            <Link href={route('profile.edit')} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${route().current('profile.*') ? 'bg-gradient-to-r from-rose-500/15 to-transparent text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {route().current('profile.*') && <div className="absolute left-0 w-1 h-6 bg-rose-500 rounded-r-full" />}
                                <User size={17} className={route().current('profile.*') ? 'text-rose-500' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                                Account Profile
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/5 bg-[#111827]/30">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
                    >
                        <LogOut size={17} className="group-hover:text-rose-500 transition-colors" />
                        Log Out
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <PwaInstallPrompt />
                
                {/* Top Navbar */}
                <header className={`h-20 backdrop-blur-md border-b flex items-center justify-between px-4 sm:px-8 z-30 sticky top-0 transition-colors duration-200 ${isDark ? 'bg-[#0f172a]/95 border-slate-800/80' : 'bg-white/90 border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button 
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-xl transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        {!isTechnician && (
                            <Link 
                                href={route('pos.index')} 
                                className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                <ShoppingCart size={15} /> Quick Checkout
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5 z-50">
                        <OfflineStatusIndicator />

                        {/* Dark mode toggle */}
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className={`p-2 rounded-full transition-all duration-200 ${isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notifications Dropdown */}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className={`p-2 rounded-full transition-colors relative ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                                    <Bell size={20} />
                                    {usePage().props.notifications?.length > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
                                    )}
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content align="right" width="80" contentClasses="bg-[#0f172a] rounded-xl shadow-2xl border border-slate-800/80 overflow-hidden text-left font-sans">
                                <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                                    <span className="text-sm font-bold text-white tracking-tight">Notifications</span>
                                    {usePage().props.notifications?.length > 0 && (
                                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                            {usePage().props.notifications.length} New
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                                    {usePage().props.notifications?.length > 0 ? (
                                        usePage().props.notifications.map((n, i) => (
                                            <div key={i} className="p-4 text-xs hover:bg-white/5 transition-colors">
                                                <p className="font-bold text-white">{n.title}</p>
                                                <p className="text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                                <span className="text-[10px] text-slate-500 font-semibold block mt-2">{n.time}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-xs text-slate-400">
                                            <Bell size={24} className="mx-auto mb-2 text-slate-600" />
                                            No unread notifications
                                        </div>
                                    )}
                                </div>
                            </Dropdown.Content>
                        </Dropdown>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                        {/* User profile dropdown */}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                                    {user?.profile_photo_path ? (
                                        <img 
                                            src={user.profile_photo_url} 
                                            alt={user.name} 
                                            className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-purple-400/40"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white font-bold flex items-center justify-center text-base shadow-md">
                                            {user?.name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="text-left hidden md:block leading-tight">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{user?.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium mt-0.5">{userRole}</div>
                                    </div>
                                    <ChevronDown size={16} className="text-slate-400 hidden md:block ml-0.5" />
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content align="right" width="64" contentClasses="bg-[#0f172a] rounded-xl shadow-2xl border border-slate-800/80 overflow-hidden text-left font-sans">
                                {/* Header with Avatar, Name & Muted Email */}
                                <div className="px-5 py-4 border-b border-slate-800/80 flex items-center gap-3">
                                    {user?.profile_photo_path ? (
                                        <img 
                                            src={user.profile_photo_url} 
                                            alt={user.name} 
                                            className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-purple-400/40 shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white font-bold flex items-center justify-center text-base shadow-md shrink-0">
                                            {user?.name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-white tracking-tight truncate">{user?.name}</p>
                                        <p className="text-xs text-slate-400 font-normal mt-0.5 truncate">{user?.email}</p>
                                    </div>
                                </div>

                                {/* Profile Link */}
                                <div className="py-1">
                                    <Link 
                                        href={route('profile.edit')} 
                                        className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors"
                                    >
                                        <User size={18} className="text-slate-400" />
                                        <span>Profile</span>
                                    </Link>

                                    {isAdminOrManager && (
                                        <Link 
                                            href={route('settings.index')} 
                                            className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors border-t border-slate-800/60"
                                        >
                                            <Settings size={18} className="text-slate-400" />
                                            <span>Store Settings</span>
                                        </Link>
                                    )}
                                </div>

                                {/* Log Out Link */}
                                <div className="border-t border-slate-800/80 py-1">
                                    <Link 
                                        href={route('logout')} 
                                        method="post" 
                                        as="button" 
                                        className="flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold text-[#f87171] hover:bg-rose-500/10 transition-colors text-left"
                                    >
                                        <LogOut size={18} className="text-[#f87171]" />
                                        <span>Log Out</span>
                                    </Link>
                                </div>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 overflow-y-auto p-3 sm:p-8 pb-24 lg:pb-8 transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-[#F8FAFC]'}`}>
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation Bar */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-[#0f172a] backdrop-blur-xl px-1 py-2 flex items-center justify-around shadow-2xl text-slate-400">
                    {mobileNavItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={idx}
                                href={item.href}
                                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all ${
                                    item.active ? 'text-rose-500 font-bold' : 'hover:text-slate-200'
                                }`}
                            >
                                <Icon size={19} className={item.active ? 'text-rose-500 scale-110' : ''} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

export default function AuthenticatedLayout({ children }) {
    return (
        <ThemeProvider>
            <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
    );
}
