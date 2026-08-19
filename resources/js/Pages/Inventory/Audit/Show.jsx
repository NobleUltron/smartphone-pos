import React, { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Scan, CheckCircle, AlertTriangle, HelpCircle, FileText, Check, ArrowLeft, RefreshCcw, Volume2, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import Badge from '@/Components/SaaS/Badge';

export default function Show({ audit, unscannedDevices = [] }) {
    const [scanCode, setScanCode] = useState('');
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('found'); // 'found', 'unscanned', 'unmatched'
    const [itemsList, setItemsList] = useState(audit.items || []);
    const [unscannedList, setUnscannedList] = useState(unscannedDevices);
    const [scannedCount, setScannedCount] = useState(audit.total_scanned || 0);

    const inputRef = useRef(null);

    // Auto-focus barcode scanner input field on load and after scans
    useEffect(() => {
        if (inputRef.current && audit.status === 'In Progress') {
            inputRef.current.focus();
        }
    }, [audit.status]);

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        if (!scanCode.trim() || scanning) return;

        const codeToScan = scanCode.trim();
        setScanCode('');
        setScanning(true);

        try {
            const response = await axios.post(`/api/inventory/audits/${audit.id}/scan`, { code: codeToScan });
            const data = response.data;

            if (data.result === 'duplicate') {
                toast.error(data.message, { icon: '⚠️' });
            } else if (data.result === 'found') {
                toast.success(data.message, { icon: '✅' });
                setItemsList(prev => [data.item, ...prev]);
                setUnscannedList(prev => prev.filter(d => d.imei !== codeToScan));
                setScannedCount(prev => prev + 1);
            } else if (data.result === 'unmatched') {
                toast.error(data.message, { icon: '❓' });
                setItemsList(prev => [data.item, ...prev]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error processing scan input');
        } finally {
            setScanning(false);
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const [showCompleteModal, setShowCompleteModal] = useState(false);

    const submitFinalizeAudit = () => {
        setShowCompleteModal(false);
        router.post(route('inventory.audits.complete', audit.id));
    };

    const foundItems = itemsList.filter(i => i.status === 'Found');
    const unmatchedItems = itemsList.filter(i => i.status === 'Unmatched');
    const missingItems = itemsList.filter(i => i.status === 'Missing');

    const accuracyRate = audit.total_expected > 0 
        ? Math.min(100, Math.round((foundItems.length / audit.total_expected) * 100)) 
        : 100;

    return (
        <AuthenticatedLayout>
            <Head title={`Stock Audit: ${audit.audit_number}`} />

            <PageHeader
                title={audit.title}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Inventory', href: route('inventory.index') },
                    { label: 'Stock Audits', href: route('inventory.audits.index') },
                    { label: audit.audit_number }
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="glass" icon={ArrowLeft} onClick={() => router.visit(route('inventory.audits.index'))}>
                            Back to Audits
                        </Button>
                        {audit.status === 'Completed' && (
                            <a
                                href={route('inventory.audits.export', audit.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="saas-btn saas-btn-success flex items-center gap-2"
                            >
                                <FileText size={16} /> Export Discrepancy PDF
                            </a>
                        )}
                        {audit.status === 'In Progress' && (
                            <Button variant="primary" icon={CheckCircle} onClick={() => setShowCompleteModal(true)}>
                                Complete & Finalize Audit
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Audit Status Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xs bg-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30">
                                {audit.audit_number}
                            </span>
                            {audit.status === 'In Progress' ? (
                                <Badge variant="warning">Scanning Active</Badge>
                            ) : (
                                <Badge variant="success">Audit Finalized</Badge>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-white">Physical Inventory Verification Workspace</h2>
                        <p className="text-xs text-slate-400 mt-1">Auditor: {audit.user?.name} • Started: {dayjs(audit.started_at).format('DD MMM YYYY, HH:mm')}</p>
                    </div>

                    {/* Progress Bar & Accuracy Rate */}
                    <div className="lg:w-80 bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-slate-400 font-semibold">Verification Progress</span>
                            <span className="font-bold text-emerald-400">{foundItems.length} / {audit.total_expected} ({accuracyRate}%)</span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${accuracyRate}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Metrics Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expected Stock</p>
                        <h3 className="text-2xl font-black text-white">{audit.total_expected}</h3>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Scanned</p>
                        <h3 className="text-2xl font-black text-emerald-400">{foundItems.length}</h3>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unscanned / Missing</p>
                        <h3 className="text-2xl font-black text-rose-400">{audit.status === 'Completed' ? missingItems.length : unscannedList.length}</h3>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unmatched Barcodes</p>
                        <h3 className="text-2xl font-black text-amber-400">{unmatchedItems.length}</h3>
                    </div>
                </div>
            </div>

            {/* Barcode Scanner Input Box */}
            {audit.status === 'In Progress' && (
                <Card className="mb-8 border-2 border-indigo-500/30 bg-indigo-50/10">
                    <form onSubmit={handleScanSubmit} className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                                <Scan size={20} />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-11 pr-4 py-3.5 text-base font-mono rounded-xl border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 text-slate-900 bg-white"
                                placeholder="Scan device barcode / IMEI with scanner gun or type IMEI..."
                                value={scanCode}
                                onChange={e => setScanCode(e.target.value)}
                                disabled={scanning}
                            />
                        </div>
                        <Button variant="primary" type="submit" disabled={scanning || !scanCode.trim()} className="px-6 py-3.5">
                            Verify Scan
                        </Button>
                    </form>
                </Card>
            )}

            {/* Live Scan Results & Discrepancies Tabs */}
            <Card>
                <div className="flex border-b border-slate-200 mb-6 gap-6">
                    <button
                        onClick={() => setActiveTab('found')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'found' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <CheckCircle size={16} /> Verified Scanned ({foundItems.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('unscanned')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'unscanned' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <AlertTriangle size={16} /> {audit.status === 'Completed' ? `Logged Missing (${missingItems.length})` : `Unscanned / Missing (${unscannedList.length})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('unmatched')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'unmatched' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <HelpCircle size={16} /> Unmatched Scans ({unmatchedItems.length})
                    </button>
                </div>

                {/* Tab Content: Verified Scanned */}
                {activeTab === 'found' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Device / Model</th>
                                    <th className="px-6 py-3 font-semibold">IMEI Scanned</th>
                                    <th className="px-6 py-3 font-semibold">Scan Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Time Scanned</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {foundItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                            No devices scanned yet. Start scanning device barcodes above!
                                        </td>
                                    </tr>
                                ) : (
                                    foundItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-bold text-slate-900">
                                                {item.device_imei?.product?.brand?.name || ''} {item.device_imei?.product?.model_name || 'Product'}
                                            </td>
                                            <td className="px-6 py-3 font-mono text-indigo-600">
                                                {item.imei_scanned}
                                            </td>
                                            <td className="px-6 py-3">
                                                <Badge variant="success">Verified</Badge>
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs text-slate-500">
                                                {dayjs(item.scanned_at).format('HH:mm:ss')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab Content: Unscanned / Missing */}
                {activeTab === 'unscanned' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Expected Device & Model</th>
                                    <th className="px-6 py-3 font-semibold">DB IMEI</th>
                                    <th className="px-6 py-3 font-semibold">Current DB Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {audit.status === 'Completed' ? (
                                    missingItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                                🎉 All expected inventory items were successfully scanned and verified!
                                            </td>
                                        </tr>
                                    ) : (
                                        missingItems.map((item) => (
                                            <tr key={item.id} className="bg-rose-50/50 hover:bg-rose-50">
                                                <td className="px-6 py-3 font-bold text-slate-900">
                                                    {item.device_imei?.product?.brand?.name || ''} {item.device_imei?.product?.model_name || 'Product'}
                                                </td>
                                                <td className="px-6 py-3 font-mono text-rose-600 font-bold">
                                                    {item.imei_scanned}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Badge variant="danger">Logged Missing</Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                ) : (
                                    unscannedList.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                                🎉 All expected inventory items have been scanned!
                                            </td>
                                        </tr>
                                    ) : (
                                        unscannedList.map((device) => (
                                            <tr key={device.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-bold text-slate-900">
                                                    {device.product?.brand?.name || ''} {device.product?.model_name || 'Product'}
                                                </td>
                                                <td className="px-6 py-3 font-mono text-slate-600">
                                                    {device.imei}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Badge variant="warning">Awaiting Scan</Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab Content: Unmatched Scans */}
                {activeTab === 'unmatched' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Scanned Code / Barcode</th>
                                    <th className="px-6 py-3 font-semibold">Scan Note</th>
                                    <th className="px-6 py-3 font-semibold text-right">Time Scanned</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {unmatchedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                            No unmatched or unknown barcodes scanned.
                                        </td>
                                    </tr>
                                ) : (
                                    unmatchedItems.map((item) => (
                                        <tr key={item.id} className="bg-amber-50/40 hover:bg-amber-50">
                                            <td className="px-6 py-3 font-mono font-bold text-amber-700">
                                                {item.imei_scanned}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-600">
                                                {item.notes || 'Unrecorded barcode'}
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs text-slate-500">
                                                {dayjs(item.scanned_at).format('HH:mm:ss')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Custom Finalize Audit Confirmation Modal */}
            <Modal show={showCompleteModal} onClose={() => setShowCompleteModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Finalize Stock Audit Session</h3>
                            <p className="text-xs text-slate-500">Confirm inventory reconciliation for {audit.audit_number}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6 space-y-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">Are you sure you want to complete this physical stock audit?</p>
                        <p>
                            • Verified Items Scanned: <strong className="text-emerald-600">{foundItems.length}</strong>
                        </p>
                        <p>
                            • Unscanned Items: <strong className="text-rose-600">{unscannedList.length}</strong> {unscannedList.length > 0 ? '(will be logged as Missing)' : '(all items verified)'}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="danger" onClick={() => setShowCompleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" icon={CheckCircle} onClick={submitFinalizeAudit}>
                            Confirm & Finalize Audit
                        </Button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
