import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { 
    Wrench, Plus, Search, Filter, Printer, 
    Smartphone, User, Clock, CheckCircle2, 
    Truck, XCircle, AlertCircle, Eye, Trash2,
    DollarSign, Package, MessageSquare, FileSpreadsheet
} from 'lucide-react';
import PageHeader from '@/Components/SaaS/PageHeader';
import Button from '@/Components/SaaS/Button';
import Card from '@/Components/SaaS/Card';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/SaaS/Badge';
import Modal from '@/Components/Modal';
import RepairFormModal from './Partials/RepairFormModal';
import ViewRepairModal from './Partials/ViewRepairModal';
import toast from 'react-hot-toast';

export default function Index({ auth, repairs, filters, products, customers = [], technicians = [], stats = {} }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'All');
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewRepair, setViewRepair] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [repairToDelete, setRepairToDelete] = useState(null);

    // Keep viewRepair in sync with the latest repairs data (e.g. after adding parts)
    useEffect(() => {
        if (viewRepair) {
            const updated = repairs.data.find(r => r.id === viewRepair.id);
            if (updated) {
                setViewRepair(updated);
            }
        }
    }, [repairs]);

    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(route('repairs.index'), {
                search: searchTerm,
                status: statusFilter === 'All' ? '' : statusFilter
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter]);

    const formatWhatsAppNumber = (phone) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            return '256' + cleaned.substring(1);
        }
        if (cleaned.length === 9) {
            return '256' + cleaned;
        }
        return cleaned;
    };

    const getWhatsAppMessageText = (repair) => {
        const businessName = "SmartPOS Kampala";
        const balanceDue = Math.max(0, Number(repair.estimated_cost) - Number(repair.deposit));
        const cName = repair.customer?.name || repair.customer_name;

        if (repair.status === 'Pending') {
            return `Hello ${cName},

Thank you for choosing ${businessName}.

This is to confirm that we have successfully received your ${repair.device_model} for repair.

Ticket Number: ${repair.repair_code}
Current Status: 🟡 Pending

Our technical team will inspect your device shortly to properly diagnose the issue. We will keep you updated on the progress and notify you once the repair begins.

If you have any questions in the meantime, please feel free to reply to this message.

Thank you for trusting us with your device.`;
        }
        if (repair.status === 'In Progress') {
            return `Hello ${cName},

This is an update regarding your ${repair.device_model} repair at ${businessName}.

Ticket Number: ${repair.repair_code}
Current Status: 🔵 In Progress

Our technical team has officially begun working on your device. We are doing our absolute best to complete the repair efficiently while ensuring the highest quality of workmanship.

We will notify you immediately once the repair is successfully completed and ready for testing.

Thank you for your continued patience.`;
        }
        if (repair.status === 'Completed') {
            return `Hello ${cName},

Great news from ${businessName}! Your ${repair.device_model} has been successfully repaired and passed our quality checks.

Ticket Number: ${repair.repair_code}
Current Status: 🟢 Completed

Your device is now fully ready for collection at your earliest convenience.

Amount Due: UGX ${balanceDue.toLocaleString()}

Please remember to bring your repair ticket (or provide the ticket number) when you come to collect your device.

We look forward to seeing you soon!`;
        }
        if (repair.status === 'Delivered') {
            return `Hello ${cName},

Thank you for choosing ${businessName} for your device repair needs.

This message is to confirm that your ${repair.device_model} has been successfully collected.

Ticket Number: ${repair.repair_code}
Current Status: ✅ Delivered

We truly appreciate your business and trust in our services. If you experience any issues related to this repair or require any further assistance in the future, please do not hesitate to reach out.

Thank you once again, and we hope you have a great day!`;
        }
        if (repair.status === 'Cancelled') {
            return `Hello ${cName},

This is an update regarding your ${repair.device_model} repair at ${businessName}.

Ticket Number: ${repair.repair_code}
Current Status: ❌ Cancelled

Unfortunately, your repair request has been cancelled. This could be due to parts unavailability, specific repair constraints, or at your own request.

Your device is ready for collection at our store. If you made an initial deposit, our team will assist you with the refund process upon your arrival.

If you have any questions or need further clarification, please reply to this message.

Thank you.`;
        }

        return `Hello ${cName}, this is an update regarding your ${repair.device_model} repair (Ticket: ${repair.repair_code}). The current status is: ${repair.status}.`;
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending': return <Badge variant="warning" icon={Clock}>Pending</Badge>;
            case 'In Progress': return <Badge variant="primary" icon={Wrench}>In Progress</Badge>;
            case 'Completed': return <Badge variant="success" icon={CheckCircle2}>Completed</Badge>;
            case 'Delivered': return <Badge variant="default" icon={Truck}>Delivered</Badge>;
            case 'Cancelled': return <Badge variant="danger" icon={XCircle}>Cancelled</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const handleDelete = (repair) => {
        setRepairToDelete(repair);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!repairToDelete) return;
        router.delete(route('repairs.destroy', repairToDelete.id), {
            onSuccess: () => {
                setShowDeleteModal(false);
                setRepairToDelete(null);
                toast.success('Repair ticket deleted');
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Repairs Management" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <PageHeader 
                    title="Repairs Management" 
                    subtitle="Track customer device intakes, repair progress, parts usage, and financial settlements."
                    icon={Wrench}
                    actions={
                        <div className="flex items-center gap-3">
                            <a 
                                href="/api/export/repairs"
                                className="saas-btn saas-btn-success"
                                title="Export Repair Tickets as Excel Spreadsheet"
                            >
                                <FileSpreadsheet size={16} /> Export Excel
                            </a>
                            <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
                                New Repair Ticket
                            </Button>
                        </div>
                    }
                />

                {/* KPI Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Total Intake</h6>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.total || 0}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                                <Wrench size={20} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Badge variant="primary">Intake Total</Badge> Lifetime Tickets
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Pending Intake</h6>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.pending || 0}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                                <Clock size={20} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Badge variant="warning">Action Required</Badge> Awaiting Technician
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">In Progress</h6>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.in_progress || 0}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                                <Wrench size={20} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Badge variant="primary">Work In Progress</Badge> On Workbench
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Active Valuation</h6>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-xl font-bold text-slate-900">{Number(stats.total_value || 0).toLocaleString()}</h3>
                                    <span className="text-xs text-slate-500 font-medium">UGX</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                                <DollarSign size={20} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Badge variant="success">Repair Value</Badge> Estimated Total
                        </div>
                    </Card>
                </div>

                {/* Main Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    {/* Filters Header */}
                    <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <TextInput
                                type="text"
                                placeholder="Search by ticket code, customer name, phone, or model..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full bg-white text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter size={16} className="text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border-slate-200 rounded-xl text-sm focus:border-rose-500 focus:ring-rose-500 w-full sm:w-48 bg-white shadow-sm"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View (Desktop) */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3.5">Ticket</th>
                                    <th className="px-6 py-3.5">Customer</th>
                                    <th className="px-6 py-3.5">Device & Issue</th>
                                    <th className="px-6 py-3.5">Financial Balance</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 text-sm">
                                {repairs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                                                    <Wrench size={28} />
                                                </div>
                                                <p className="text-base font-semibold text-slate-900">No repair tickets found</p>
                                                <p className="text-xs text-slate-500 mt-1 max-w-sm">No tickets match your search criteria. Create a new intake ticket to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    repairs.data.map((repair) => {
                                        const estCost = Number(repair.estimated_cost) || 0;
                                        const deposit = Number(repair.deposit) || 0;
                                        const balanceDue = Math.max(0, estCost - deposit);
                                        const displayCustomerName = repair.customer?.name || repair.customer_name;
                                        const displayCustomerPhone = repair.customer?.phone || repair.customer_phone;

                                        return (
                                            <tr key={repair.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 font-medium">
                                                    <div className="font-bold text-slate-900 font-mono tracking-tight">{repair.repair_code}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={12} className="text-slate-400" />
                                                        {new Date(repair.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                        <User size={14} className="text-slate-400" />
                                                        {displayCustomerName}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{displayCustomerPhone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                        <Smartphone size={14} className="text-slate-400" />
                                                        {repair.device_model}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[220px] mt-0.5" title={repair.issue_description}>
                                                        {repair.issue_description}
                                                    </div>
                                                    {repair.parts && repair.parts.length > 0 && (
                                                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                                            <Package size={12} />
                                                            {repair.parts.length} {repair.parts.length === 1 ? 'part' : 'parts'} attached
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs space-y-1">
                                                    <div className="text-slate-600 dark:text-slate-400">
                                                        Cost: <span className="font-semibold text-slate-900 dark:text-white">UGX {estCost.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-slate-600 dark:text-slate-400">
                                                        Deposit: <span className="font-semibold text-emerald-600 dark:text-emerald-400">UGX {deposit.toLocaleString()}</span>
                                                    </div>
                                                    <div className="pt-1">
                                                        <span className={`inline-block font-bold px-2 py-0.5 rounded-md text-[11px] ${balanceDue > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>
                                                            {balanceDue > 0 ? `Due: UGX ${balanceDue.toLocaleString()}` : 'Paid in Full'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(repair.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a 
                                                            href={`https://wa.me/${formatWhatsAppNumber(displayCustomerPhone)}?text=${encodeURIComponent(getWhatsAppMessageText(repair))}`}
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="WhatsApp Customer"
                                                        >
                                                            <MessageSquare size={17} />
                                                        </a>
                                                        <a 
                                                            href={route('repairs.print', repair.id)} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Print Thermal Ticket"
                                                        >
                                                            <Printer size={17} />
                                                        </a>
                                                        <button 
                                                            onClick={() => setViewRepair(repair)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="View & Edit Ticket"
                                                        >
                                                            <Eye size={17} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(repair)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Ticket"
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="sm:hidden divide-y divide-slate-200/60">
                        {repairs.data.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Wrench size={32} className="mx-auto mb-2 text-slate-400" />
                                <p className="font-semibold text-slate-900">No repair tickets found</p>
                            </div>
                        ) : (
                            repairs.data.map((repair) => {
                                const estCost = Number(repair.estimated_cost) || 0;
                                const deposit = Number(repair.deposit) || 0;
                                const balanceDue = Math.max(0, estCost - deposit);
                                const displayCustomerName = repair.customer?.name || repair.customer_name;
                                const displayCustomerPhone = repair.customer?.phone || repair.customer_phone;

                                return (
                                    <div key={repair.id} className="p-4 space-y-2.5 bg-white">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 font-mono text-sm">{repair.repair_code}</span>
                                            {getStatusBadge(repair.status)}
                                        </div>
                                        <div className="text-xs text-slate-600 space-y-0.5">
                                            <p className="font-semibold text-slate-900 text-sm">{repair.brand} {repair.model_name}</p>
                                            <p className="text-slate-500">{displayCustomerName} • {displayCustomerPhone}</p>
                                            {repair.problem_description && (
                                                <p className="text-slate-500 italic text-[11px] truncate">"{repair.problem_description}"</p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                            <div>
                                                <span className="text-slate-400">Est. Cost: </span>
                                                <span className="font-bold text-slate-900">{estCost.toLocaleString()} UGX</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setViewRepair(repair)}
                                                    className="px-2.5 py-1.5 text-indigo-600 bg-indigo-50 rounded-lg font-bold text-xs flex items-center gap-1"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <a 
                                                    href={route('repairs.print', repair.id)} 
                                                    target="_blank" 
                                                    className="p-1.5 text-slate-600 bg-slate-100 rounded-lg"
                                                >
                                                    <Printer size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {repairs.links && repairs.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {repairs.links.map((link, k) => (
                                    <Link
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                            link.active 
                                                ? 'bg-rose-500 text-white shadow-sm' 
                                                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
                                        } ${!link.url && 'opacity-40 cursor-not-allowed'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <RepairFormModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                products={products}
                customers={customers}
                technicians={technicians}
            />

            {viewRepair && (
                <ViewRepairModal
                    repair={viewRepair}
                    products={products}
                    customers={customers}
                    technicians={technicians}
                    isOpen={!!viewRepair}
                    onClose={() => setViewRepair(null)}
                />
            )}

            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                            <Trash2 size={24} className="text-rose-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Delete Repair Ticket</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Are you sure you want to delete this repair ticket? This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            className="!bg-rose-600 hover:!bg-rose-700 !border-rose-600"
                            onClick={confirmDelete}
                        >
                            Delete Ticket
                        </Button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
