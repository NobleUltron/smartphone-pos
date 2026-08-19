import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { ShieldCheck, ShieldAlert, KeyRound, Monitor, Smartphone, Check, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorForm() {
    const { auth } = usePage().props;
    const is2faEnabled = !!auth.user.two_factor_enabled;
    const [loading, setLoading] = useState(false);

    const handleToggle = (enable) => {
        setLoading(true);
        router.post(route('two-factor.toggle'), { enable }, {
            onFinish: () => setLoading(false),
            onSuccess: () => {
                toast.success(enable ? '2FA enabled successfully!' : '2FA disabled.');
            }
        });
    };

    return (
        <section className="space-y-6 font-sans">
            <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        is2faEnabled 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-rose-500/10 text-rose-500'
                    }`}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Two-Factor Authentication (2FA)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Add extra security to your staff account requiring a 6-digit verification code sent to your email on login.
                        </p>
                    </div>
                </div>
                <Badge variant={is2faEnabled ? 'success' : 'danger'}>
                    {is2faEnabled ? '2FA Enabled' : '2FA Disabled'}
                </Badge>
            </header>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <KeyRound size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Email Verification Security Code
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {is2faEnabled
                                ? `Active protection for ${auth.user.email}. Verification codes will be sent automatically on every new login attempt.`
                                : `Enable 2FA to protect your account against unauthorized access.`}
                        </p>
                    </div>
                </div>

                <div>
                    {is2faEnabled ? (
                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={() => handleToggle(false)}
                            className="!text-xs !py-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                            Disable 2FA Protection
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            disabled={loading}
                            onClick={() => handleToggle(true)}
                            icon={ShieldCheck}
                            className="!text-xs !py-2 bg-gradient-to-r from-rose-500 to-pink-600"
                        >
                            Enable 2FA Protection
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Browser Sessions Audit */}
            <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Monitor size={16} className="text-slate-400" /> Active Device Sessions
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
                    <div className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Smartphone size={18} className="text-rose-500" />
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Current Session (This Device)
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                        This Browser
                                    </span>
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    IP: 192.168.3.22 • Windows PC / Smartphone • Active Now
                                </p>
                            </div>
                        </div>
                        <Check size={16} className="text-emerald-500 font-bold" />
                    </div>
                </div>
            </div>
        </section>
    );
}
