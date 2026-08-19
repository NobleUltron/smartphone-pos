import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <style>{`
                .forgot-header {
                    margin-bottom: 24px;
                    text-align: center;
                }
                .forgot-header h2 {
                    font-size: 26px;
                    font-weight: 900;
                    color: #000000 !important;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }
                .forgot-header p {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1E293B !important;
                    line-height: 1.5;
                    margin: 0;
                }

                .form-group {
                    margin-bottom: 24px;
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
                    box-shadow: 0 8px 25px rgba(244, 63, 94, 0.35);
                }
                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(244, 63, 94, 0.45);
                }
                .btn-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    font-weight: 800;
                    color: #000000 !important;
                    text-decoration: none;
                    margin-top: 24px;
                    transition: color 0.2s ease;
                }
                .back-link:hover {
                    color: #F43F5E !important;
                }

                .status-msg {
                    padding: 14px 16px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    background: #ECFDF5;
                    border: 2px solid #10B981;
                    color: #065F46;
                    font-size: 14px;
                    font-weight: 800;
                    line-height: 1.4;
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
                    Reset Password
                </h2>
                <p className="text-sm font-bold mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: '#1E293B', fontWeight: 700 }}>
                    Forgot your password? Enter your email address below and we'll send you a password reset link.
                </p>
            </div>

            {status && <div className="status-msg">{status}</div>}

            <form onSubmit={submit}>
                <div className="form-group">
                    <label htmlFor="email" style={{ color: '#000000', fontWeight: 900 }}>Email Address</label>
                    <div className="input-wrapper">
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoFocus
                            placeholder="name@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <Mail size={18} className="input-icon" />
                    </div>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <button type="submit" className="btn-submit" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={18} className="spin-icon" />
                            Sending Reset Link...
                        </>
                    ) : (
                        <>
                            <KeyRound size={18} />
                            Send Password Reset Link
                        </>
                    )}
                </button>

                <div className="text-center">
                    <Link href={route('login')} className="back-link">
                        <ArrowLeft size={16} /> Back to Sign In
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
