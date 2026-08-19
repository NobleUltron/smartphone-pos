import { Link } from '@inertiajs/react';
import { Smartphone, ShoppingCart, Wrench, Package, BarChart3, Users, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GuestLayout({ children }) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <>
            <style>{`
                :root {
                    --bg-dark-1: #0F172A;
                    --bg-dark-2: #111827;
                    --bg-dark-3: #1E293B;
                    --primary: #F43F5E;
                    --secondary: #EC4899;
                    --accent: #A855F7;
                    --text-dark: #111827;
                    --muted: #64748B;
                }

                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', 'Poppins', system-ui, -apple-system, sans-serif;
                    background-color: #F8FAFC;
                    -webkit-font-smoothing: antialiased;
                }

                .auth-container {
                    display: flex;
                    min-height: 100vh;
                    width: 100%;
                    overflow: hidden;
                }

                /* ================= LEFT SIDE (65%) ================= */
                .auth-hero {
                    flex: 0 0 65%;
                    background: linear-gradient(135deg, var(--bg-dark-1) 0%, var(--bg-dark-2) 50%, var(--bg-dark-3) 100%);
                    position: relative;
                    padding: 60px 80px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    color: white;
                    overflow: hidden;
                }

                /* Glowing Orbs */
                .glow-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(100px);
                    opacity: 0.4;
                    z-index: 0;
                    pointer-events: none;
                }
                .glow-1 {
                    width: 400px; height: 400px;
                    background: var(--primary);
                    top: -100px; left: -100px;
                }
                .glow-2 {
                    width: 500px; height: 500px;
                    background: var(--accent);
                    bottom: -150px; right: -100px;
                    opacity: 0.3;
                }

                .auth-hero-content {
                    position: relative;
                    z-index: 10;
                    max-width: 720px;
                }

                /* Branding */
                .brand {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 60px;
                    text-decoration: none;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .brand-icon {
                    width: 48px; height: 48px;
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    color: white;
                    box-shadow: 0 8px 32px rgba(244, 63, 94, 0.3);
                }
                .brand-text h2 {
                    margin: 0; font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.5px;
                }
                .brand-text p {
                    margin: 0; font-size: 13px; color: #94A3B8; font-weight: 500;
                }

                /* Typography */
                .hero-title {
                    font-size: clamp(40px, 5vw, 64px);
                    font-weight: 800;
                    line-height: 1.1;
                    letter-spacing: -1.5px;
                    color: white;
                    margin: 0 0 24px 0;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
                }
                .text-gradient {
                    background: linear-gradient(to right, var(--secondary), var(--accent));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: inline-block;
                }
                .hero-desc {
                    font-size: 18px;
                    line-height: 1.6;
                    color: #94A3B8;
                    max-width: 540px;
                    margin-bottom: 48px;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
                }

                /* Features */
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px 20px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                .feature-item:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-4px);
                    border-color: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                }
                .feature-icon-wrapper {
                    width: 40px; height: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    color: #E2E8F0;
                }
                .feature-text {
                    font-size: 15px; font-weight: 600; color: #E2E8F0;
                }

                /* ================= RIGHT SIDE (35%) ================= */
                .auth-form-wrapper {
                    flex: 0 0 35%;
                    background: #F8FAFC;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 40px;
                    position: relative;
                }
                .auth-form-card {
                    width: 100%;
                    max-width: 420px;
                    background: #FFFFFF !important;
                    border: 1px solid #E2E8F0 !important;
                    border-radius: 24px;
                    padding: 48px 40px;
                    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08);
                    opacity: 0;
                    transform: scale(0.95) translateY(10px);
                    animation: fadeScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
                    color: #0F172A !important;
                }

                .auth-mobile-brand {
                    display: none;
                    text-align: center;
                    margin-bottom: 32px;
                }
                .auth-mobile-brand .brand-icon {
                    margin: 0 auto 16px;
                }
                
                .auth-footer {
                    position: absolute;
                    bottom: 32px;
                    text-align: center;
                    width: 100%;
                    color: #64748B;
                    font-size: 13px;
                    opacity: 0.9;
                }

                /* Animations */
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeScale {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                /* Responsive */
                @media (max-width: 1200px) {
                    .auth-hero { flex: 0 0 55%; padding: 40px; }
                    .auth-form-wrapper { flex: 0 0 45%; }
                    .hero-title { font-size: 48px; }
                    .feature-grid { grid-template-columns: 1fr; }
                }

                @media (max-width: 900px) {
                    .auth-container { flex-direction: column; min-height: 100vh; }
                    .auth-hero { display: none; } /* Hide hero on mobile */
                    .auth-form-wrapper {
                        flex: 1;
                        width: 100%;
                        background: #F8FAFC;
                        padding: 24px 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .auth-form-card {
                        padding: 32px 20px;
                        background: #FFFFFF !important;
                        box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
                        border: 1px solid #E2E8F0 !important;
                        border-radius: 20px;
                        margin: auto 0;
                    }
                    .auth-mobile-brand { display: block; }
                    .auth-footer {
                        position: relative;
                        bottom: auto;
                        margin-top: 24px;
                    }
                }
            `}</style>

            <div className={`auth-container ${isLoaded ? 'loaded' : ''}`}>
                {/* Left Hero Section */}
                <div className="auth-hero">
                    <div className="glow-orb glow-1"></div>
                    <div className="glow-orb glow-2"></div>
                    
                    <div className="auth-hero-content">
                        <Link href="/" className="brand">
                            <div className="brand-icon">
                                <Smartphone size={24} strokeWidth={2.5} />
                            </div>
                            <div className="brand-text">
                                <h2>SmartPOS</h2>
                                <p>Phone Sales & Repair Management System</p>
                            </div>
                        </Link>

                        <h1 className="hero-title">
                            Your Smartphone Business,<br />
                            <span className="text-gradient">Simplified.</span>
                        </h1>

                        <p className="hero-desc">
                            Manage inventory, repairs, sales, customers, suppliers and analytics from one powerful platform designed for smartphone retailers.
                        </p>

                        <div className="feature-grid">
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Smartphone size={20} /></div>
                                <span className="feature-text">IMEI & Serial Tracking</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><ShoppingCart size={20} /></div>
                                <span className="feature-text">Fast Sales Processing</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Wrench size={20} /></div>
                                <span className="feature-text">Repair Management</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Package size={20} /></div>
                                <span className="feature-text">Inventory Control</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><BarChart3 size={20} /></div>
                                <span className="feature-text">Reports & Analytics</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrapper"><Users size={20} /></div>
                                <span className="feature-text">Customer Management</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Form Section */}
                <div className="auth-form-wrapper">
                    <div className="auth-form-card">
                        <div className="auth-mobile-brand">
                            <div className="brand-icon">
                                <Smartphone size={24} strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#111827' }}>SmartPOS</h2>
                            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Phone Sales & Repair Management</p>
                        </div>
                        {children}
                    </div>

                    <div className="auth-footer">
                        © {new Date().getFullYear()} SmartPOS Kampala<br />
                        <span style={{ fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block' }}>Version 1.0</span>
                    </div>
                </div>
            </div>
        </>
    );
}
