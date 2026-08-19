import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import Button from '@/Components/SaaS/Button';
import { Lock, Save, CheckCircle2 } from 'lucide-react';

export default function UpdatePasswordForm() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section>
            <header className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Lock size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        Update Password
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 leading-tight">
                        Ensure your account is using a long, random password to stay secure.
                    </p>
                </div>
            </header>

            <form onSubmit={updatePassword} className="space-y-6">
                <div>
                    <label htmlFor="current_password" className="saas-label">Current Password</label>
                    <input
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        type="password"
                        className="saas-input"
                        autoComplete="current-password"
                    />
                    {errors.current_password && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.current_password}</p>}
                </div>

                <div>
                    <label htmlFor="password" className="saas-label">New Password</label>
                    <input
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="saas-input"
                        autoComplete="new-password"
                    />
                    {errors.password && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.password}</p>}
                </div>

                <div>
                    <label htmlFor="password_confirmation" className="saas-label">Confirm Password</label>
                    <input
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        type="password"
                        className="saas-input"
                        autoComplete="new-password"
                    />
                    {errors.password_confirmation && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.password_confirmation}</p>}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <Button variant="primary" isLoading={processing} icon={Save}>
                        Save Password
                    </Button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in-out duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> Saved Successfully
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
