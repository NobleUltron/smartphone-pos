import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Wrench, CheckCircle2, Clock, Smartphone, User, ArrowRight, Activity, Wrench as WrenchIcon, Layers } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import PageHeader from '@/Components/SaaS/PageHeader';
import Button from '@/Components/SaaS/Button';
import ViewRepairModal from '@/Pages/Repairs/Partials/ViewRepairModal';

export default function TechnicianDashboard({ auth, technician, metrics = {}, activeRepairs = [], products = [], customers = [], technicians = [] }) {
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Keep selectedRepair in sync with the latest repairs data (e.g. after adding parts)
    React.useEffect(() => {
        if (selectedRepair) {
            const updated = activeRepairs.find(r => r.id === selectedRepair.id);
            if (updated) {
                setSelectedRepair(updated);
            }
        }
    }, [activeRepairs]);

    const handleViewRepair = (repair) => {
        setSelectedRepair(repair);
        setIsViewModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Pending': return 'warning';
            case 'In Progress': return 'primary';
            case 'Completed': return 'success';
            case 'Delivered': return 'success';
            case 'Cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Technician Workspace" />
            
            {/* Welcome Header */}
            <div className="mb-8 p-6 lg:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden animate-slide-up border border-slate-700/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-32 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mb-16 pointer-events-none"></div>
                
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none text-orange-300">
                    <WrenchIcon size={160} strokeWidth={1} />
                </div>
                
                <div className="flex items-center gap-5 z-10">
                    <div className="relative">
                        <img 
                            src={auth.user?.profile_photo_url} 
                            alt={auth.user?.name} 
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-2 border-white/20 shadow-xl object-cover ring-4 ring-orange-500/30"
                        />
                        <div className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-slate-900 shadow-sm flex items-center justify-center">
                            <span className="absolute w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl lg:text-3xl tracking-tight mb-1.5">
                            <span className="text-slate-400 font-medium">Technician Workspace,</span> <span className="font-black text-white">{technician?.name || 'Tech'}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-orange-100 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                                <Wrench size={12} /> {technician?.role || 'Technician'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 z-10 mt-4 md:mt-0">
                    <Link 
                        href="/repairs" 
                        className="group w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 focus:ring-2 focus:ring-white/50 outline-none"
                    >
                        <Layers size={18} className="transition-transform group-hover:scale-110" /> 
                        <span>View All Shop Repairs</span> 
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">My Active Repairs</p>
                            <h3 className="text-3xl font-black text-slate-900">{metrics?.active_repairs || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Activity size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Tickets currently assigned to you</p>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Completed Today</p>
                            <h3 className="text-3xl font-black text-slate-900">{metrics?.completed_today || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Devices you successfully fixed today</p>
                </Card>

                <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Lifetime</p>
                            <h3 className="text-3xl font-black text-slate-900">{metrics?.total_assigned || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Layers size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Total tickets ever assigned</p>
                </Card>
            </div>

            {/* My Active Repairs Table */}
            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Card noPadding className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                <Clock size={20} />
                            </div>
                            My Work Queue <span className="text-xs font-normal text-slate-500 ml-1">(Pending, In Progress &amp; Completed)</span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="saas-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>Ticket #</th>
                                    <th>Device</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Logged</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRepairs.map((repair, i) => (
                                    <tr key={repair.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <td>
                                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                {repair.repair_code}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                                <Smartphone size={14} className="text-slate-400" />
                                                {repair.device_model}
                                            </div>
                                            <div className="text-xs text-slate-500">Issue: {repair.issue_description?.substring(0, 30)}...</div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {repair.customer_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm text-slate-900">{repair.customer_name}</div>
                                                    <div className="text-xs text-slate-500">{repair.customer_phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={getStatusColor(repair.status)}>{repair.status}</Badge>
                                        </td>
                                        <td className="text-slate-500 text-sm">
                                            {new Date(repair.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="text-right">
                                            <Button 
                                                variant="primary" 
                                                onClick={() => handleViewRepair(repair)}
                                                className="!px-3 !py-1.5 text-sm"
                                            >
                                                Update Ticket
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {activeRepairs.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <CheckCircle2 size={48} className="mb-4 opacity-20 text-emerald-500" />
                                                <p className="text-lg font-medium text-slate-600">Your queue is clear!</p>
                                                <p className="text-sm">No active repairs are currently assigned to you.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Repair Modal */}
            <ViewRepairModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                repair={selectedRepair}
                products={products}
                customers={customers}
                technicians={technicians}
                onSuccess={() => {
                    setIsViewModalOpen(false);
                    router.reload();
                }}
            />
        </AuthenticatedLayout>
    );
}
