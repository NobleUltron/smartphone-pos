import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff, Loader2, KeyRound, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Set New Password" />

            <style>{`
                .reset-header {
                    margin-bottom: 24px;
                    text-align: center;
                }
                .reset-header h2 {
                    font-size: 26px;
                    font-weight: 900;
                    color: #000000 !important;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }
                .reset-header p {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1E293B !important;
                    line-height: 1.5;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 20px;
                }
                .form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 900;
                    color: #000000 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 8px;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-wrapper input {
                    width: 100%;
                    padding: 14px 16px 14px 44px;
                    border: 2px solid #334155 !important;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 700;
                    color: #000000 !important;
                    background: #FFFFFF !important;
                    transition: all 0.3s ease;
                    outline: none;
                    font-family: inherit;
                }
                .input-wrapper input::placeholder {
                    color: #64748B !important;
                    font-weight: 500;
                }
                .input-wrapper input:-webkit-autofill,
                .input-wrapper input:-webkit-autofill:hover, 
                .input-wrapper input:-webkit-autofill:focus, 
                .input-wrapper input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
                    -webkit-text-fill-color: #000000 !important;
                    caret-color: #000000 !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                .input-wrapper input:focus {
                    border-color: #F43F5E !important;
                    box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.2) !important;
                    background: #FFFFFF !important;
                }
                .input-icon {
                    position: absolute;
                    left: 16px;
                    color: #000000;
                    pointer-events: none;
                    transition: color 0.3s ease;
                }
                .input-wrapper input:focus + .input-icon,
                .input-wrapper input:not(:placeholder-shown) + .input-icon {
                    color: #F43F5E;
                }
                
                .toggle-password {
                    position: absolute;
                    right: 12px;
                    background: transparent;
                    border: none;
                    padding: 6px;
                    color: #000000;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }
                .toggle-password:hover {
                    color: #F43F5E;
                    background: #F1F5F9;
                }

                .btn-submit {
                    width: 100%;
                    padding: 15px 24px;
                    background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%) !important;
                    color: #FFFFFF !important;
                    border: none;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 25px rgba(244, 63, 94, 0.35) !important;
                    margin-top: 16px;
                }
                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 14px 30px rgba(244, 63, 94, 0.45) !important;
                }
                .btn-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spin-icon {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/25 ring-4 ring-rose-500/10">
                    <KeyRound size={30} />
                </div>
                <h2 className="text-2xl font-black tracking-tight" style={{ color: '#000000', fontWeight: 900 }}>
                    Set New Password
                </h2>
                <p className="text-sm font-bold mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: '#1E293B', fontWeight: 700 }}>
                    Please enter your new password below to reset your SmartPOS account security.
                </p>
            </div>

            <form onSubmit={submit}>
                <div className="form-group">
                    <label htmlFor="email" style={{ color: '#000000', fontWeight: 900 }}>Email Address</label>
                    <div className="input-wrapper">
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <Mail size={18} className="input-icon" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="form-group">
                    <label htmlFor="password" style={{ color: '#000000', fontWeight: 900 }}>New Password</label>
                    <div className="input-wrapper">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            onChange={(e) => setData('password', e.target.value)}
                            style={{ paddingRight: 48 }}
                            required
                        />
                        <Lock size={18} className="input-icon" />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="form-group">
                    <label htmlFor="password_confirmation" style={{ color: '#000000', fontWeight: 900 }}>Confirm New Password</label>
                    <div className="input-wrapper">
                        <input
                            id="password_confirmation"
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            style={{ paddingRight: 48 }}
                            required
                        />
                        <Lock size={18} className="input-icon" />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <button type="submit" className="btn-submit" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={18} className="spin-icon" />
                            Updating Password...
                        </>
                    ) : (
                        <>
                            <span>SET NEW PASSWORD</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>
        </GuestLayout>
    );
}
