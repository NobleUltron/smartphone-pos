import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import Button from '@/Components/SaaS/Button';
import { User, CheckCircle2, Save } from 'lucide-react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
}) {
    const user = usePage().props.auth.user;

    const { data, setData, post, errors, processing, recentlySuccessful, reset } =
        useForm({
            name: user.name,
            email: user.email,
            photo: null,
            _method: 'patch',
        });

    const submit = (e) => {
        e.preventDefault();
        post(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('photo');
                const photoInput = document.getElementById('photo');
                if (photoInput) {
                    photoInput.value = '';
                }
            },
        });
    };

    return (
        <section>
            <header className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <User size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        Profile Information
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 leading-tight">
                        Update your account's profile information and email address.
                    </p>
                </div>
            </header>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label htmlFor="photo" className="saas-label">Profile Photo</label>
                    
                    <div className="mt-2 flex items-center gap-4">
                        <img 
                            src={data.photo ? URL.createObjectURL(data.photo) : user.profile_photo_url} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-full shadow-lg border-2 border-white object-cover bg-slate-100" 
                        />
                        <div className="flex-1">
                            <input
                                id="photo"
                                type="file"
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-colors cursor-pointer"
                                onChange={(e) => setData('photo', e.target.files[0])}
                                accept="image/*"
                            />
                            {errors.photo && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.photo}</p>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="saas-label">Full Name</label>
                        <input
                            id="name"
                            className="saas-input"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoComplete="name"
                        />
                        {errors.name && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="email" className="saas-label">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="saas-input"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                        />
                        {errors.email && <p className="mt-2 text-sm text-rose-500 font-medium">{errors.email}</p>}
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                        <p className="text-sm text-amber-800">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="ml-2 underline font-bold hover:text-amber-900 transition-colors"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                                <CheckCircle2 size={16} /> A new verification link has been sent to your email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <Button variant="primary" isLoading={processing} icon={Save}>
                        Save Profile
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
