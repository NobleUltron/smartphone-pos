import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Sign In" />

            <style>{`
                .login-header {
                    margin-bottom: 32px;
                }
                .login-header h2 {
                    font-size: 28px;
                    font-weight: 800;
                    color: #0F172A !important;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }
                .login-header p {
                    font-size: 15px;
                    color: #64748B !important;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 24px;
                }
                .form-group label {
                    display: block;
                    font-size: 14px;
                    font-weight: 700;
                    color: #334155 !important;
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
                    border: 1.5px solid #CBD5E1 !important;
                    border-radius: 12px;
                    font-size: 15px;
                    color: #0F172A !important;
                    background: #FFFFFF !important;
                    transition: all 0.3s ease;
                    outline: none;
                    font-family: inherit;
                }
                .input-wrapper input::placeholder {
                    color: #94A3B8;
                }
                .input-wrapper input:-webkit-autofill,
                .input-wrapper input:-webkit-autofill:hover, 
                .input-wrapper input:-webkit-autofill:focus, 
                .input-wrapper input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
                    -webkit-text-fill-color: #0F172A !important;
                    caret-color: #0F172A !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                .input-wrapper input:focus {
                    border-color: #F43F5E !important;
                    box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.15) !important;
                    background: #FFFFFF !important;
                }
                .input-icon {
                    position: absolute;
                    left: 16px;
                    color: #64748B;
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
                    color: #64748B;
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

                .form-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }
                
                .checkbox-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none;
                }
                .checkbox-wrapper input[type="checkbox"] {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border: 2px solid #CBD5E1;
                    background: #FFFFFF;
                    border-radius: 6px;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s ease;
                }
                .checkbox-wrapper input[type="checkbox"]:checked {
                    background-color: #F43F5E;
                    border-color: #F43F5E;
                }
                .checkbox-wrapper input[type="checkbox"]:checked::after {
                    content: '';
                    position: absolute;
                    left: 5px;
                    top: 2px;
                    width: 4px;
                    height: 8px;
                    border: solid white;
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }
                .checkbox-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569 !important;
                }

                .forgot-link {
                    font-size: 14px;
                    font-weight: 700;
                    color: #F43F5E !important;
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                .forgot-link:hover {
                    color: #EC4899;
                }

                .btn-submit {
                    width: 100%;
                    padding: 14px 24px;
                    background: linear-gradient(135deg, var(--primary, #F43F5E), var(--accent, #A855F7));
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 8px 25px rgba(244, 63, 94, 0.25);
                }
                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(244, 63, 94, 0.35);
                }
                .btn-submit:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .spin-icon {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .status-msg {
                    padding: 12px 16px;
                    border-radius: 10px;
                    margin-bottom: 24px;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: #059669;
                    font-size: 14px;
                    font-weight: 500;
                }
            `}</style>

            <div className="login-header">
                <h2>Welcome Back</h2>
                <p>Sign in to continue to SmartPOS</p>
            </div>

            {status && <div className="status-msg">{status}</div>}

            <form onSubmit={submit}>
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-wrapper">
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoComplete="username"
                            autoFocus
                            placeholder="name@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <Mail size={18} className="input-icon" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-wrapper">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            onChange={(e) => setData('password', e.target.value)}
                            style={{ paddingRight: 48 }}
                        />
                        <Lock size={18} className="input-icon" />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="form-options">
                    <label className="checkbox-wrapper">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="checkbox-text">Remember me</span>
                    </label>

                    {canResetPassword && (
                        <Link href={route('password.request')} className="forgot-link">
                            Forgot Password?
                        </Link>
                    )}
                </div>

                <button type="submit" className="btn-submit" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={20} className="spin-icon" />
                            Signing in...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>
        </GuestLayout>
    );
}
