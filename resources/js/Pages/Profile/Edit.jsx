import { Head, Link, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import TwoFactorForm from './Partials/TwoFactorForm';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout>
            <Head title="Account Profile" />
            
            <PageHeader 
                title="Account Profile"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Profile' }]}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    <Card>
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </Card>

                    <Card>
                        <TwoFactorForm />
                    </Card>

                    <Card>
                        <UpdatePasswordForm />
                    </Card>

                    <Card className="border-rose-100 bg-rose-50/10">
                        <DeleteUserForm />
                    </Card>
                </div>

                {/* Sidebar Info Panel */}
                <div className="lg:col-span-4">
                    <Card className="sticky top-24">
                        <div className="text-center mb-6 pt-4">
                            <img 
                                src={auth.user.profile_photo_url} 
                                alt={auth.user.name} 
                                className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-[3px] border-indigo-100 shadow-md"
                            />
                            <h3 className="text-xl font-bold text-slate-900">{auth.user.name}</h3>
                            <p className="text-slate-500 text-sm mt-1">{auth.user.email}</p>
                            <span className="inline-block mt-3 px-3 py-1 bg-indigo-50 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-600">
                                {auth.user.role}
                            </span>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-4 mt-6">
                            <p className="text-sm text-slate-500 mb-2 flex justify-between">
                                <span>Status</span>
                                <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Active
                                </span>
                            </p>
                            <p className="text-sm text-slate-500 flex justify-between">
                                <span>Member Since</span>
                                <span className="text-slate-900 font-medium">
                                    {new Date(auth.user.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                </span>
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
