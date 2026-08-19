import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { ShieldCheck, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const [isResending, setIsResending] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('two-factor.verify'));
    };

    const handleResend = () => {
        setIsResending(true);
        router.post(route('two-factor.resend'), {}, {
            onFinish: () => setIsResending(false),
            onSuccess: () => toast.success('New 6-digit security code sent to your email!')
        });
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Security Verification" />

            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/25 ring-4 ring-rose-500/10">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black tracking-tight" style={{ color: '#000000', fontWeight: 900 }}>
                    Two-Factor Authentication
                </h2>
                <p className="text-sm font-bold mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: '#1E293B', fontWeight: 700 }}>
                    Enter the 6-digit security verification code sent to your registered email address.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-6 font-sans">
                <div>
                    <label className="text-xs font-black uppercase tracking-widest block mb-2 text-center" style={{ color: '#000000', fontWeight: 900 }}>
                        6-Digit Security Code
                    </label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" size={20} />
                        <input
                            id="code"
                            type="text"
                            name="code"
                            value={data.code}
                            maxLength={6}
                            className="w-full pl-12 pr-4 py-3.5 text-center text-2xl font-mono font-black tracking-[0.4em] rounded-2xl shadow-inner outline-none transition-all"
                            style={{
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                border: '2px solid #334155',
                            }}
                            autoFocus
                            onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            required
                        />
                    </div>
                    {errors.code && (
                        <p className="mt-2.5 text-xs font-extrabold text-rose-600 text-center bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl shadow-sm">
                            {errors.code}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing || data.code.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 text-white font-black text-sm rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 10px 25px rgba(244, 63, 94, 0.35)',
                    }}
                >
                    <span>VERIFY SECURITY CODE</span>
                    <ArrowRight size={18} />
                </button>

                <div className="text-center pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="text-xs font-black flex items-center gap-1.5 mx-auto transition-colors disabled:opacity-50 hover:underline cursor-pointer"
                        style={{ color: '#E11D48' }}
                    >
                        <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                        <span>Resend Code to Email</span>
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
