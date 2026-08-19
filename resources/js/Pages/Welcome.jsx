import { Head, Link } from '@inertiajs/react';
import { Smartphone, Package, ShieldCheck, BarChart3, Zap, Users, ArrowRight, Sparkles, CreditCard, Clock, ChevronRight } from 'lucide-react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="SmartPOS Kampala — Smartphone Inventory & POS" />

            {/* Inline styles for the landing page only */}
            <style>{`
                .landing-page {
                    --primary: #0F172A;
                    --accent: #F43F5E;
                    --accent-dark: #E11D48;
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow-x: hidden;
                }
                .landing-page * { box-sizing: border-box; }

                /* Navbar */
                .lp-nav {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    background: rgba(255,255,255,0.8);
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                }
                .lp-nav-inner {
                    max-width: 1200px; margin: 0 auto;
                    padding: 16px 24px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .lp-logo {
                    display: flex; align-items: center; gap: 10px;
                    font-weight: 800; font-size: 20px; color: var(--primary);
                    text-decoration: none;
                }
                .lp-logo-icon {
                    width: 36px; height: 36px; border-radius: 10px;
                    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
                    display: flex; align-items: center; justify-content: center;
                    color: white; box-shadow: 0 4px 12px rgba(244,63,94,0.3);
                }
                .lp-nav-links { display: flex; gap: 8px; align-items: center; }
                .lp-nav-link {
                    text-decoration: none; font-weight: 500; font-size: 14px;
                    padding: 8px 18px; border-radius: 8px; transition: all 0.2s ease;
                }
                .lp-btn-ghost { color: #475569; }
                .lp-btn-ghost:hover { background: rgba(0,0,0,0.04); color: var(--primary); }
                .lp-btn-primary {
                    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
                    color: white !important;
                    box-shadow: 0 4px 12px rgba(244,63,94,0.25);
                    display: inline-flex; align-items: center; gap: 6px;
                }
                .lp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(244,63,94,0.35); }

                /* Hero */
                .lp-hero {
                    min-height: 100vh;
                    display: flex; align-items: center; justify-content: center;
                    padding: 120px 24px 80px;
                    position: relative;
                    background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #FFF1F2 100%);
                }
                .lp-hero::before {
                    content: ''; position: absolute; inset: 0;
                    background:
                        radial-gradient(circle at 20% 50%, rgba(244,63,94,0.06) 0%, transparent 50%),
                        radial-gradient(circle at 80% 30%, rgba(99,102,241,0.06) 0%, transparent 50%);
                    pointer-events: none;
                }
                .lp-hero-inner {
                    max-width: 1200px; width: 100%; margin: 0 auto;
                    display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
                    align-items: center; position: relative; z-index: 1;
                }
                .lp-hero-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.15);
                    border-radius: 100px; padding: 6px 16px;
                    font-size: 13px; font-weight: 600; color: var(--accent);
                    margin-bottom: 20px;
                }
                .lp-hero h1 {
                    font-size: clamp(36px, 5vw, 56px);
                    font-weight: 800; line-height: 1.1;
                    color: var(--primary); letter-spacing: -1.5px;
                    margin: 0 0 20px 0;
                }
                .lp-hero h1 span {
                    background: linear-gradient(135deg, var(--accent), #8B5CF6);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .lp-hero-desc {
                    font-size: 17px; line-height: 1.7; color: #64748B;
                    margin-bottom: 32px; max-width: 480px;
                }
                .lp-hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
                .lp-hero-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    font-weight: 600; font-size: 15px;
                    padding: 14px 28px; border-radius: 12px;
                    text-decoration: none; transition: all 0.3s ease; border: none; cursor: pointer;
                }
                .lp-hero-btn-fill {
                    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
                    color: white; box-shadow: 0 8px 25px rgba(244,63,94,0.3);
                }
                .lp-hero-btn-fill:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(244,63,94,0.4); }
                .lp-hero-btn-outline {
                    background: white; color: var(--primary);
                    border: 1.5px solid #E2E8F0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .lp-hero-btn-outline:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }

                /* Hero visual / phone mockup area */
                .lp-hero-visual {
                    position: relative; display: flex; align-items: center; justify-content: center;
                }
                .lp-dashboard-mock {
                    width: 100%; max-width: 480px;
                    background: white; border-radius: 20px;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.04);
                    border: 1px solid rgba(0,0,0,0.06);
                    overflow: hidden; position: relative;
                }
                .lp-mock-header {
                    background: linear-gradient(135deg, #0F172A, #1E293B);
                    padding: 20px 24px; color: white;
                }
                .lp-mock-header h4 { margin: 0; font-size: 14px; font-weight: 600; opacity: 0.7; }
                .lp-mock-header h2 { margin: 4px 0 0 0; font-size: 28px; font-weight: 800; }
                .lp-mock-body { padding: 20px 24px; }
                .lp-mock-stat-row { display: flex; gap: 12px; margin-bottom: 16px; }
                .lp-mock-stat {
                    flex: 1; padding: 14px;
                    background: #F8FAFC; border-radius: 12px; border: 1px solid #F1F5F9;
                }
                .lp-mock-stat small { font-size: 11px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .lp-mock-stat .val { font-size: 22px; font-weight: 800; color: var(--primary); margin-top: 4px; }
                .lp-mock-bar {
                    height: 8px; border-radius: 100px; margin-bottom: 8px;
                    background: #F1F5F9; overflow: hidden;
                }
                .lp-mock-bar-fill {
                    height: 100%; border-radius: 100px;
                    background: linear-gradient(90deg, var(--accent), #8B5CF6);
                }

                /* Floating decorators */
                .lp-float {
                    position: absolute; border-radius: 16px; padding: 12px 16px;
                    background: white; box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                    border: 1px solid rgba(0,0,0,0.04); font-size: 13px; font-weight: 600;
                    display: flex; align-items: center; gap: 10px;
                    animation: float 6s ease-in-out infinite;
                }
                .lp-float-1 { top: -10px; right: -20px; animation-delay: 0s; }
                .lp-float-2 { bottom: 40px; left: -30px; animation-delay: 2s; }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-12px); }
                }

                /* Features */
                .lp-features {
                    padding: 100px 24px;
                    background: white;
                }
                .lp-features-inner { max-width: 1200px; margin: 0 auto; }
                .lp-section-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(244,63,94,0.06); border: 1px solid rgba(244,63,94,0.12);
                    border-radius: 100px; padding: 6px 14px;
                    font-size: 12px; font-weight: 700; color: var(--accent);
                    text-transform: uppercase; letter-spacing: 1px;
                    margin-bottom: 16px;
                }
                .lp-section-title {
                    font-size: clamp(28px, 3.5vw, 40px);
                    font-weight: 800; color: var(--primary); letter-spacing: -1px;
                    margin: 0 0 12px 0; line-height: 1.15;
                }
                .lp-section-desc { font-size: 16px; color: #64748B; max-width: 540px; line-height: 1.6; margin-bottom: 48px; }
                .lp-features-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
                }
                .lp-feature-card {
                    padding: 32px 28px;
                    background: #F8FAFC; border: 1px solid #F1F5F9;
                    border-radius: 20px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .lp-feature-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.06);
                    border-color: rgba(244,63,94,0.15);
                    background: white;
                }
                .lp-feature-icon {
                    width: 48px; height: 48px; border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 20px;
                }
                .lp-feature-card h3 { font-size: 18px; font-weight: 700; color: var(--primary); margin: 0 0 10px 0; }
                .lp-feature-card p { font-size: 14px; color: #64748B; line-height: 1.65; margin: 0; }

                /* Stats bar */
                .lp-stats {
                    padding: 60px 24px;
                    background: linear-gradient(135deg, #0F172A, #1E293B);
                }
                .lp-stats-inner {
                    max-width: 1200px; margin: 0 auto;
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
                    text-align: center;
                }
                .lp-stat-item h3 {
                    font-size: 36px; font-weight: 800;
                    background: linear-gradient(135deg, #F43F5E, #8B5CF6);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    margin: 0 0 6px 0;
                }
                .lp-stat-item p { font-size: 14px; color: #94A3B8; margin: 0; font-weight: 500; }

                /* CTA */
                .lp-cta {
                    padding: 100px 24px;
                    background: linear-gradient(135deg, #FFF1F2 0%, #EEF2FF 100%);
                    text-align: center;
                }
                .lp-cta-inner { max-width: 640px; margin: 0 auto; }
                .lp-cta h2 {
                    font-size: clamp(28px, 3.5vw, 40px);
                    font-weight: 800; color: var(--primary); letter-spacing: -1px;
                    margin: 0 0 16px 0;
                }
                .lp-cta p { font-size: 16px; color: #64748B; margin-bottom: 32px; line-height: 1.6; }

                /* Footer */
                .lp-footer {
                    padding: 40px 24px;
                    background: white; border-top: 1px solid #F1F5F9;
                    text-align: center;
                }
                .lp-footer p { font-size: 13px; color: #94A3B8; margin: 0; }

                /* Responsive */
                @media (max-width: 991px) {
                    .lp-hero-inner { grid-template-columns: 1fr; text-align: center; }
                    .lp-hero-desc { margin-left: auto; margin-right: auto; }
                    .lp-hero-actions { justify-content: center; }
                    .lp-hero-visual { margin-top: 40px; }
                    .lp-float { display: none; }
                    .lp-features-grid { grid-template-columns: repeat(2, 1fr); }
                    .lp-stats-inner { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 600px) {
                    .lp-features-grid { grid-template-columns: 1fr; }
                    .lp-stats-inner { grid-template-columns: 1fr; }
                    .lp-hero-actions { flex-direction: column; align-items: center; }
                    .lp-hero-btn { width: 100%; justify-content: center; }
                    .lp-nav-links .lp-btn-ghost { display: none; }
                }
            `}</style>

            <div className="landing-page">
                {/* Navbar */}
                <nav className="lp-nav">
                    <div className="lp-nav-inner">
                        <a href="/" className="lp-logo">
                            <div className="lp-logo-icon">
                                <Smartphone size={18} />
                            </div>
                            SmartPOS
                        </a>
                        <div className="lp-nav-links">
                            {auth.user ? (
                                <Link href={route('dashboard')} className="lp-nav-link lp-btn-primary">
                                    Go to Dashboard <ChevronRight size={16} />
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="lp-nav-link lp-btn-ghost">
                                        Sign In
                                    </Link>
                                    <Link href={route('login')} className="lp-nav-link lp-btn-primary">
                                        Get Started <ArrowRight size={16} />
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="lp-hero">
                    <div className="lp-hero-inner">
                        <div>
                            <div className="lp-hero-badge">
                                <Sparkles size={14} /> Built for Smartphone Dealers
                            </div>
                            <h1>
                                Manage your<br />
                                smartphone<br />
                                business <span>effortlessly</span>
                            </h1>
                            <p className="lp-hero-desc">
                                SmartPOS is the all-in-one inventory tracking, point-of-sale, and layaway management system designed specifically for smartphone retailers in Kampala.
                            </p>
                            <div className="lp-hero-actions">
                                <Link href={route('login')} className="lp-hero-btn lp-hero-btn-fill">
                                    Start Selling <ArrowRight size={18} />
                                </Link>
                                <a href="#features" className="lp-hero-btn lp-hero-btn-outline">
                                    Explore Features
                                </a>
                            </div>
                        </div>
                        <div className="lp-hero-visual">
                            {/* Floating badges */}
                            <div className="lp-float lp-float-1">
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Zap size={16} />
                                </div>
                                <div>
                                    <div style={{ color: '#10B981', fontSize: 16, fontWeight: 800 }}>+12</div>
                                    <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500 }}>Sales Today</div>
                                </div>
                            </div>
                            <div className="lp-float lp-float-2">
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Package size={16} />
                                </div>
                                <div>
                                    <div style={{ color: '#6366F1', fontSize: 16, fontWeight: 800 }}>248</div>
                                    <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500 }}>In Stock</div>
                                </div>
                            </div>

                            {/* Dashboard mockup */}
                            <div className="lp-dashboard-mock">
                                <div className="lp-mock-header">
                                    <h4>Today's Revenue</h4>
                                    <h2>UGX 4,250,000</h2>
                                </div>
                                <div className="lp-mock-body">
                                    <div className="lp-mock-stat-row">
                                        <div className="lp-mock-stat">
                                            <small>Devices Sold</small>
                                            <div className="val">12</div>
                                        </div>
                                        <div className="lp-mock-stat">
                                            <small>Active Layaways</small>
                                            <div className="val">5</div>
                                        </div>
                                        <div className="lp-mock-stat">
                                            <small>In Stock</small>
                                            <div className="val">248</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sales Performance</div>
                                    <div className="lp-mock-bar"><div className="lp-mock-bar-fill" style={{ width: '78%' }}></div></div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 }}>Cash Collected</div>
                                    <div className="lp-mock-bar"><div className="lp-mock-bar-fill" style={{ width: '62%' }}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="lp-features" id="features">
                    <div className="lp-features-inner">
                        <div className="lp-section-badge">
                            <Zap size={12} /> Features
                        </div>
                        <h2 className="lp-section-title">Everything you need to<br />run your phone shop</h2>
                        <p className="lp-section-desc">
                            From tracking every IMEI to generating detailed shift reports, SmartPOS handles the complexity so you can focus on selling.
                        </p>

                        <div className="lp-features-grid">
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E' }}>
                                    <Package size={24} />
                                </div>
                                <h3>IMEI-Level Inventory</h3>
                                <p>Track every device by its unique IMEI number. Know exactly what's in stock, what's sold, and what's on layaway at all times.</p>
                            </div>
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                                    <Zap size={24} />
                                </div>
                                <h3>Lightning-Fast POS</h3>
                                <p>Scan barcodes, process payments, and print receipts in seconds. Supports cash, mobile money, and bank/card payments.</p>
                            </div>
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                                    <Clock size={24} />
                                </div>
                                <h3>Layaway Management</h3>
                                <p>Offer instalment plans to customers with automatic payment tracking. Get reminders on upcoming and overdue layaway payments.</p>
                            </div>
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B' }}>
                                    <BarChart3 size={24} />
                                </div>
                                <h3>Real-Time Reports</h3>
                                <p>Shift summaries, daily revenue, profit margins, and top-selling models. All the insights you need, beautifully visualised.</p>
                            </div>
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6' }}>
                                    <Users size={24} />
                                </div>
                                <h3>Multi-User & Roles</h3>
                                <p>Separate admin and cashier dashboards. Each cashier gets their own login with tracked sales and shift reports.</p>
                            </div>
                            <div className="lp-feature-card">
                                <div className="lp-feature-icon" style={{ background: 'rgba(14,165,233,0.08)', color: '#0EA5E9' }}>
                                    <ShieldCheck size={24} />
                                </div>
                                <h3>Secure & Reliable</h3>
                                <p>Built on enterprise-grade technology with role-based access, data integrity checks, and transaction safeguards.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Band */}
                <section className="lp-stats">
                    <div className="lp-stats-inner">
                        <div className="lp-stat-item">
                            <h3>500+</h3>
                            <p>Devices Tracked</p>
                        </div>
                        <div className="lp-stat-item">
                            <h3>99.9%</h3>
                            <p>Uptime Guarantee</p>
                        </div>
                        <div className="lp-stat-item">
                            <h3>3s</h3>
                            <p>Average Checkout</p>
                        </div>
                        <div className="lp-stat-item">
                            <h3>24/7</h3>
                            <p>Access Anywhere</p>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="lp-cta">
                    <div className="lp-cta-inner">
                        <div className="lp-section-badge" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            <Sparkles size={12} /> Get Started
                        </div>
                        <h2>Ready to modernize<br />your phone shop?</h2>
                        <p>
                            Join smartphone dealers across Kampala who have already streamlined their inventory and boosted their sales with SmartPOS.
                        </p>
                        <Link href={route('login')} className="lp-hero-btn lp-hero-btn-fill" style={{ textDecoration: 'none' }}>
                            Launch SmartPOS <ArrowRight size={18} />
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="lp-footer">
                    <p>&copy; {new Date().getFullYear()} SmartPOS Kampala. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
