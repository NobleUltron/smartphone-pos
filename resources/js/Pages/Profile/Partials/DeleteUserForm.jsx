import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Button from '@/Components/SaaS/Button';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteUserForm() {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section>
            <header className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <Trash2 size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-rose-700 leading-tight">
                        Delete Account
                    </h2>
                    <p className="mt-1 text-sm text-rose-600/80 leading-tight">
                        Once your account is deleted, all of its resources and data will be permanently deleted.
                    </p>
                </div>
            </header>

            <Button variant="danger" onClick={confirmUserDeletion} icon={Trash2}>
                Delete Account
            </Button>

            {confirmingUserDeletion && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-rose-500" />
                                Are you absolutely sure?
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                &times;
                            </button>
                        </div>
                        
                        <form onSubmit={deleteUser} className="p-6">
                            <p className="text-sm text-slate-600 mb-6">
                                Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account.
                            </p>

                            <div>
                                <label htmlFor="password" className="saas-label">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="saas-input"
                                    placeholder="Enter your password"
                                    autoFocus
                                />
                                {errors.password && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.password}</p>}
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="secondary" type="button" onClick={closeModal}>
                                    Cancel
                                </Button>
                                <Button variant="danger" type="submit" isLoading={processing} icon={Trash2}>
                                    Delete Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
