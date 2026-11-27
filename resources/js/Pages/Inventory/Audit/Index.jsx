import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Scan, Plus, CheckCircle, AlertTriangle, Clock, ArrowRight, ShieldCheck, FileText, Search, X, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import Modal from '@/Components/Modal';

export default function Index({ audits = {}, metrics = {} }) {
    const [showNewModal, setShowNewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [auditToDelete, setAuditToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        notes: ''
    });

    const handleCreateAudit = (e) => {
        e.preventDefault();
        post(route('inventory.audits.store'), {
            onSuccess: () => {
                setShowNewModal(false);
                reset();
            }
        });
    };

    const handleDeleteAudit = () => {
        if (!auditToDelete) return;
        setDeleting(true);
        router.delete(route('inventory.audits.destroy', auditToDelete.id), {
            onFinish: () => {
                setDeleting(false);
                setShowDeleteModal(false);
                setAuditToDelete(null);
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Physical Stock Audit Sessions" />

            <PageHeader
                title="Barcode Physical Stock Audit"
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Inventory', href: route('inventory.index') },
                    { label: 'Stock Audits' }
                ]}
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setShowNewModal(true)}>
                        Start Audit Session
                    </Button>
                }
            />

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Audit Sessions</p>
                            <h3 className="text-3xl font-black text-slate-900">{metrics.total_audits || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Scan size={24} />
                        </div>
                    </div>
                    <span className="text-xs text-slate-500">Physical stock count history</span>
                </Card>

                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Sessions</p>
                            <h3 className="text-3xl font-black text-amber-600">{metrics.active_audits || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                    </div>
                    <span className="text-xs text-slate-500">Currently open audit workspaces</span>
                </Card>

                <Card className="flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Missing Items Logged</p>
                            <h3 className="text-3xl font-black text-rose-600">{metrics.total_missing_logged || 0}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <span className="text-xs text-slate-500">Discrepancy count across audits</span>
                </Card>
            </div>

            {/* Audit History Desktop Table */}
            <div className="hidden md:block">
                <DataTable
                    headers={[
                        'Audit Ref & Title',
                        'Auditor',
                        { label: 'Expected', className: 'text-center' },
                        { label: 'Scanned', className: 'text-center' },
                        { label: 'Missing', className: 'text-center' },
                        'Status',
                        { label: 'Action', className: 'text-right' },
                    ]}
                    isEmpty={!audits.data || audits.data.length === 0}
                    emptyState={
                        <div className="py-12 text-center text-slate-400">
                            <Scan size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p>No stock audit sessions recorded yet. Click <strong>Start Audit Session</strong> to begin.</p>
                        </div>
                    }
                >
                    {audits.data?.map((audit) => (
                        <tr key={audit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td>
                                <div className="font-bold text-slate-900 dark:text-white">{audit.title}</div>
                                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{audit.audit_number}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">Started: {dayjs(audit.started_at).format('DD MMM YYYY, HH:mm')}</div>
                            </td>
                            <td className="font-medium text-slate-700 dark:text-slate-300">
                                {audit.user?.name || 'System'}
                            </td>
                            <td className="text-center font-bold text-slate-900 dark:text-white">
                                {audit.total_expected}
                            </td>
                            <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {audit.total_scanned}
                            </td>
                            <td className="text-center font-bold text-rose-600 dark:text-rose-400">
                                {audit.total_missing}
                            </td>
                            <td>
                                {audit.status === 'In Progress' ? (
                                    <Badge variant="warning">In Progress</Badge>
                                ) : audit.status === 'Completed' ? (
                                    <Badge variant="success">Completed</Badge>
                                ) : (
                                    <Badge variant="danger">Cancelled</Badge>
                                )}
                            </td>
                            <td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href={route('inventory.audits.show', audit.id)}
                                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                                    >
                                        {audit.status === 'In Progress' ? 'Resume Scan' : 'View Audit'} <ArrowRight size={14} />
                                    </Link>
                                    {audit.status === 'Completed' && (
                                        <a
                                            href={route('inventory.audits.export', audit.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                            title="Export PDF Report"
                                        >
                                            <FileText size={16} />
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setAuditToDelete(audit); setShowDeleteModal(true); }}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                        title="Delete Audit Session"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {/* Audit History Mobile Cards */}
            <Card noPadding className="md:hidden overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(!audits.data || audits.data.length === 0) ? (
                        <div className="py-10 text-center text-sm text-slate-400">No stock audit sessions recorded yet.</div>
                    ) : audits.data.map((audit) => (
                        <div key={audit.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{audit.title}</p>
                                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{audit.audit_number}</p>
                                    <p className="text-[11px] text-slate-400">{audit.user?.name || 'System'} • {dayjs(audit.started_at).format('DD MMM YYYY')}</p>
                                </div>
                                <Badge variant={audit.status === 'In Progress' ? 'warning' : audit.status === 'Completed' ? 'success' : 'danger'}>
                                    {audit.status}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div><span className="text-[10px] text-slate-400 block">Expected</span><span className="font-bold text-slate-900 dark:text-white">{audit.total_expected}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">Scanned</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{audit.total_scanned}</span></div>
                                <div><span className="text-[10px] text-slate-400 block">Missing</span><span className="font-bold text-rose-600 dark:text-rose-400">{audit.total_missing}</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={route('inventory.audits.show', audit.id)} className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1">
                                    {audit.status === 'In Progress' ? 'Resume Scan' : 'View Audit'} <ArrowRight size={13} />
                                </Link>
                                <button type="button" onClick={() => { setAuditToDelete(audit); setShowDeleteModal(true); }} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Pagination */}
            <Pagination data={audits} />

            {/* Start New Audit Modal */}
            <Modal show={showNewModal} onClose={() => setShowNewModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAudit} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Scan size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Start Physical Stock Audit</h3>
                                <p className="text-xs text-slate-500">Snapshots expected inventory and prepares barcode scanner workspace</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Audit Session Title *</label>
                            <input
                                type="text"
                                className="w-full text-sm rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="e.g. Weekly Shop Counter Audit"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                required
                            />
                            {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Session Notes (Optional)</label>
                            <textarea
                                className="w-full text-sm rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                rows="3"
                                placeholder="e.g. Auditing counter display showcase & backroom stock"
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setShowNewModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={processing}>
                            Launch Scanner Workspace
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Audit Confirmation Modal */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="md">
                {auditToDelete && (
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Delete Stock Audit Session</h3>
                                <p className="text-xs text-slate-500">Action cannot be undone</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6 space-y-1 text-xs text-slate-600">
                            <p className="font-semibold text-slate-900">Are you sure you want to delete this audit session?</p>
                            <p>Title: <strong className="text-slate-800">{auditToDelete.title}</strong></p>
                            <p>Ref: <strong className="font-mono text-indigo-600">{auditToDelete.audit_number}</strong></p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" icon={Trash2} onClick={handleDeleteAudit} disabled={deleting}>
                                Delete Session
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
