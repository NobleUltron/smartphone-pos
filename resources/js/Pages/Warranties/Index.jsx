import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, Search, RefreshCw, Wrench, CheckCircle, XCircle, AlertCircle, FileText, ClipboardList, CheckSquare, DollarSign } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';

export default function WarrantiesIndex({ auth, claims = {}, inStockDevices = [], filters = {}, summary }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Claims Search State
    const [claimSearchQuery, setClaimSearchQuery] = useState(filters.search || '');
    const [isInitialRender, setIsInitialRender] = useState(true);

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (claimSearchQuery) params.search = claimSearchQuery;

            router.get('/warranties', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [claimSearchQuery]);

    // Claim Creation Form
    const claimForm = useForm({
        sale_item_id: '',
        device_imei_id: '',
        customer_id: '',
        claim_type: 'Repair',
        issue_description: '',
        replacement_imei_id: '',
        device_disposition: 'defective',
        payment_method: 'Cash'
    });

    // Claim Update Form
    const updateForm = useForm({
        status: 'Pending',
        device_action: 'none',
        replacement_imei_id: '',
        resolution_notes: '',
        payment_method: 'Cash'
    });

    const handleLookup = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setSearchError('');
        setSearchResults(null);

        try {
            const res = await axios.post('/api/warranties/lookup', { query: searchQuery.trim() });
            setSearchResults(res.data.results);
        } catch (err) {
            setSearchError(err.response?.data?.error || 'No matching sale or warranty record found.');
        }
        setLoading(false);
    };

    const openClaimModal = (item) => {
        setSelectedDevice(item);
        claimForm.setData({
            sale_item_id: item.sale_item_id,
            device_imei_id: item.device.id,
            customer_id: item.customer ? item.customer.id : '',
            claim_type: 'Repair',
            issue_description: '',
            replacement_imei_id: '',
            device_disposition: 'defective',
            payment_method: 'Cash'
        });
        setShowClaimModal(true);
    };

    const handleClaimSubmit = (e) => {
        e.preventDefault();
        claimForm.post('/api/warranties', {
            onSuccess: () => {
                setShowClaimModal(false);
                setSelectedDevice(null);
                setSearchResults(null);
                setSearchQuery('');
            }
        });
    };

    const openUpdateModal = (claim) => {
        setSelectedClaim(claim);
        updateForm.setData({
            status: claim.status,
            device_action: 'none',
            replacement_imei_id: '',
            resolution_notes: claim.resolution_notes || '',
            payment_method: 'Cash'
        });
        setShowUpdateModal(true);
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        updateForm.put(`/api/warranties/${selectedClaim.id}`, {
            onSuccess: () => {
                setShowUpdateModal(false);
                setSelectedClaim(null);
            }
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending':
                return <Badge variant="warning" className="flex items-center gap-1 w-fit"><AlertCircle size={12} /> Pending</Badge>;
            case 'Approved':
                return <Badge variant="info" className="flex items-center gap-1 w-fit"><CheckCircle size={12} /> Approved</Badge>;
            case 'In Repair':
                return <Badge variant="primary" className="flex items-center gap-1 w-fit"><Wrench size={12} /> In Repair</Badge>;
            case 'Completed':
                return <Badge variant="success" className="flex items-center gap-1 w-fit"><CheckCircle size={12} /> Completed</Badge>;
            case 'Rejected':
                return <Badge variant="danger" className="flex items-center gap-1 w-fit"><XCircle size={12} /> Rejected</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Warranty & Returns" />
            
            <PageHeader 
                title="Warranty & Returns"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Warranty & Returns' }]}
            />

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Claims</p>
                                <h3 className="text-3xl font-black text-slate-900">{summary.active_claims || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <ClipboardList size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="warning">In Progress</Badge>
                            <span>Open</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resolved Claims</p>
                                <h3 className="text-3xl font-black text-slate-900">{summary.resolved_claims || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <CheckSquare size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="primary">Completed</Badge>
                            <span>Closed</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Claims</p>
                                <h3 className="text-3xl font-black text-slate-900">
                                    {summary.total_claims || 0}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="neutral">Historical</Badge>
                            <span>All Claims</span>
                        </div>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 mb-6">
                <Card className="animate-slide-up">
                    <form onSubmit={handleLookup} className="flex flex-col gap-4">
                        <label className="text-sm font-bold text-slate-900">
                            Scan Receipt Barcode or Enter IMEI Number
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Search size={20} />
                                </div>
                                <input 
                                    type="text" 
                                    className="saas-input !pl-11 !text-lg !py-3" 
                                    placeholder="e.g. SALE-1042 or 354892109845231" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button variant="primary" type="submit" className="!py-3 !px-6 text-base" isLoading={loading} icon={ShieldCheck}>
                                Verify Warranty
                            </Button>
                        </div>
                    </form>

                    {searchError && (
                        <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2">
                            <AlertCircle size={18} /> {searchError}
                        </div>
                    )}
                </Card>
            </div>

            {/* Search Results Display */}
            {searchResults && (
                <div className="mb-8 animate-slide-up">
                    <h5 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        Matching Device Sales <Badge variant="neutral">{searchResults.length}</Badge>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {searchResults.map((item, idx) => (
                            <Card key={idx} className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h5 className="font-bold text-lg text-slate-900 mb-1">
                                            {item.device.brand} {item.device.model}
                                        </h5>
                                        <div className="text-sm text-slate-500">
                                            IMEI: <span className="font-mono font-bold text-slate-700">{item.device.imei}</span>
                                        </div>
                                    </div>

                                    {item.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-200">
                                            <ShieldCheck size={16} /> Active ({item.days_remaining} days left)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold text-sm border border-rose-200">
                                            <ShieldAlert size={16} /> Expired ({Math.abs(item.days_remaining)} days ago)
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-sm mb-6 border border-slate-100">
                                    <div>
                                        <span className="text-slate-500 block mb-1">Receipt #</span> 
                                        <span className="font-bold text-slate-900">#{item.sale_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">Purchase Date</span> 
                                        <span className="font-bold text-slate-900">{item.purchase_date}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">Warranty Period</span> 
                                        <span className="font-bold text-slate-900">{item.warranty_months} Months</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">Expiration Date</span> 
                                        <span className="font-bold text-slate-900">{item.expiry_date}</span>
                                    </div>
                                    {item.customer && (
                                        <div className="col-span-2 pt-3 mt-1 border-t border-slate-200">
                                            <span className="text-slate-500 mr-2">Customer:</span> 
                                            <span className="font-bold text-slate-900">{item.customer.name} ({item.customer.phone})</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <span className="text-sm text-slate-500">Past claims: {item.past_claims_count}</span>
                                    <Button variant="secondary" onClick={() => openClaimModal(item)} icon={FileText} className="!py-2">
                                        Log Claim
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Claims Tracking Table */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Card noPadding className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <RefreshCw size={20} className="text-pink-500" /> Claims & Returns Log
                        </h3>
                        
                        <div className="relative w-full sm:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </div>
                            <input 
                                type="text" 
                                className="saas-input !pl-9 !py-2 !text-sm" 
                                placeholder="Search claims..." 
                                value={claimSearchQuery}
                                onChange={e => setClaimSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="saas-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>Claim ID</th>
                                    <th>Device</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Issue</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.data && claims.data.length > 0 ? claims.data.map(claim => (
                                    <tr key={claim.id}>
                                        <td className="font-bold text-slate-900">#{claim.id}</td>
                                        <td>
                                            <div className="font-bold text-slate-900">{claim.device_imei?.product?.brand?.name} {claim.device_imei?.product?.model_name}</div>
                                            <div className="text-sm text-slate-500 font-mono mt-0.5">{claim.device_imei?.imei}</div>
                                        </td>
                                        <td>
                                            {claim.customer ? (
                                                <div>
                                                    <div className="font-bold text-slate-900">{claim.customer.name}</div>
                                                    <div className="text-sm text-slate-500 mt-0.5">{claim.customer.phone}</div>
                                                </div>
                                            ) : <span className="text-slate-500 italic">Walk-in</span>}
                                        </td>
                                        <td>
                                            <Badge variant="neutral">{claim.claim_type}</Badge>
                                        </td>
                                        <td className="max-w-[220px]">
                                            <div className="truncate text-sm text-slate-900" title={claim.issue_description}>
                                                {claim.issue_description}
                                            </div>
                                            {claim.resolution_notes && (
                                                <div className="truncate text-xs text-slate-500 italic mt-1" title={claim.resolution_notes}>
                                                    {claim.resolution_notes}
                                                </div>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(claim.status)}</td>
                                        <td className="text-slate-500 text-sm">
                                            {new Date(claim.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="text-right">
                                            <Button variant="secondary" onClick={() => openUpdateModal(claim)} className="!py-1.5 !px-3 !text-xs">
                                                Update
                                            </Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12 text-slate-500">
                                            No warranty claims or returns logged yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {claims.links && claims.links.length > 3 && (
                        <div className="flex justify-center mt-6 p-6 border-t border-slate-100 bg-white">
                            <nav className="inline-flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                {claims.links.map((link, k) => (
                                    <Link 
                                        key={k}
                                        href={link.url || '#'}
                                        className={`px-4 py-2 text-sm font-medium border-r border-slate-100 last:border-0 ${
                                            link.active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                                        } ${link.url === null ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </Card>
            </div>

            {/* Log Claim Modal */}
            {showClaimModal && selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Log Warranty Claim</h3>
                            <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="claimForm" onSubmit={handleClaimSubmit} className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Device:</span>
                                        <span className="font-bold text-slate-900">{selectedDevice.device.brand} {selectedDevice.device.model}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">IMEI:</span>
                                        <span className="font-mono text-slate-900">{selectedDevice.device.imei}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Status:</span>
                                        <span className={`font-bold ${selectedDevice.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {selectedDevice.is_active ? 'Active Warranty' : 'Expired Warranty'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="saas-label">Claim Action Type</label>
                                    <select 
                                        className="saas-input"
                                        value={claimForm.data.claim_type}
                                        onChange={(e) => claimForm.setData('claim_type', e.target.value)}
                                    >
                                        <option value="Repair">Repair (Fix device defect under warranty)</option>
                                        <option value="Replacement">Replacement (Swap for new IMEI)</option>
                                        <option value="Refund">Refund (Process return & store refund)</option>
                                    </select>
                                </div>

                                {claimForm.data.claim_type === 'Replacement' && (
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                        <div>
                                            <label className="saas-label text-indigo-900">Select New Replacement Device (Optional)</label>
                                            <select 
                                                className="saas-input bg-white border-indigo-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                value={claimForm.data.replacement_imei_id}
                                                onChange={(e) => claimForm.setData('replacement_imei_id', e.target.value)}
                                            >
                                                <option value="">-- Swap Later (Leave Pending) --</option>
                                                {inStockDevices.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.product?.brand?.name} {d.product?.model_name} ({d.storage_capacity || ''} {d.color || ''}) - UGX {Number(d.selling_price).toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {claimForm.data.replacement_imei_id && (() => {
                                            const newDev = inStockDevices.find(d => d.id == claimForm.data.replacement_imei_id);
                                            const originalPrice = Number(selectedDevice.device.price);
                                            const newPrice = newDev ? Number(newDev.selling_price) : 0;
                                            const difference = newPrice - originalPrice;

                                            return (
                                                <div className="bg-white p-3 rounded-lg border border-indigo-100 text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Original Paid:</span>
                                                        <span className="font-bold text-slate-900">UGX {originalPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Replacement Price:</span>
                                                        <span className="font-bold text-slate-900">UGX {newPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-indigo-50 pt-2">
                                                        <span className="font-bold text-slate-700">Difference:</span>
                                                        {difference > 0 ? (
                                                            <span className="font-extrabold text-rose-600">+UGX {difference.toLocaleString()} (Upgrade Fee)</span>
                                                        ) : difference < 0 ? (
                                                            <span className="font-extrabold text-emerald-600">-UGX {Math.abs(difference).toLocaleString()} (Refund Due)</span>
                                                        ) : (
                                                            <span className="font-bold text-slate-500">Even Swap (No fee)</span>
                                                        )}
                                                    </div>
                                                    
                                                    {difference !== 0 && (
                                                        <div className="pt-2">
                                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                                                                {difference > 0 ? 'Collect Upgrade Fee Via' : 'Issue Refund Via'}
                                                            </label>
                                                            <select 
                                                                className="saas-input py-1.5 text-sm"
                                                                value={claimForm.data.payment_method}
                                                                onChange={(e) => claimForm.setData('payment_method', e.target.value)}
                                                            >
                                                                <option value="Cash">Cash</option>
                                                                <option value="MTN MoMo">MTN MoMo</option>
                                                                <option value="Airtel Money">Airtel Money</option>
                                                                <option value="Bank Transfer">Bank Transfer</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div>
                                    <label className="saas-label">Returned Device Inventory Status</label>
                                    <select 
                                        className="saas-input"
                                        value={claimForm.data.device_disposition}
                                        onChange={(e) => claimForm.setData('device_disposition', e.target.value)}
                                    >
                                        <option value="defective">Mark Defective / Damaged (Scrap stock)</option>
                                        <option value="restock">Return to In-Stock Inventory (Repaired / Resellable)</option>
                                        <option value="keep_sold">Keep Registered to Customer (In Repair)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="saas-label">Issue Description / Defect Details</label>
                                    <textarea 
                                        className="saas-input" 
                                        rows="3" 
                                        required
                                        placeholder="e.g. Screen flickering, battery drain, touch failure..."
                                        value={claimForm.data.issue_description}
                                        onChange={(e) => claimForm.setData('issue_description', e.target.value)}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <Button variant="danger" onClick={() => setShowClaimModal(false)}>Cancel</Button>
                            <Button variant="primary" form="claimForm" type="submit" isLoading={claimForm.processing}>
                                Submit Claim
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {showUpdateModal && selectedClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Update Claim #{selectedClaim.id}</h3>
                            <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="updateForm" onSubmit={handleUpdateSubmit} className="space-y-4">
                                <div>
                                    <label className="saas-label">Claim Status</label>
                                    <select 
                                        className="saas-input"
                                        value={updateForm.data.status}
                                        onChange={(e) => updateForm.setData('status', e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="In Repair">In Repair</option>
                                        <option value="Completed">Completed / Resolved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="saas-label">Device Disposition & Inventory Action</label>
                                    <select 
                                        className="saas-input"
                                        value={updateForm.data.device_action}
                                        onChange={(e) => updateForm.setData('device_action', e.target.value)}
                                    >
                                        <option value="none">-- No Change to Device Inventory --</option>
                                        <option value="hand_to_customer">Hand Repaired Device Back to Customer (Keep Sold)</option>
                                        <option value="restock">Restock Repaired Device back to In-Stock Inventory</option>
                                        <option value="issue_replacement">Assign & Issue Replacement Phone Now</option>
                                        <option value="mark_defective">Mark Device as Defective / Scrap</option>
                                    </select>
                                </div>

                                {updateForm.data.device_action === 'issue_replacement' && (
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                        <div>
                                            <label className="saas-label text-indigo-900">Select Replacement Phone from In-Stock</label>
                                            <select 
                                                className="saas-input bg-white border-indigo-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                value={updateForm.data.replacement_imei_id}
                                                onChange={(e) => updateForm.setData('replacement_imei_id', e.target.value)}
                                                required
                                            >
                                                <option value="">-- Choose In-Stock Replacement Phone --</option>
                                                {inStockDevices.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.product?.brand?.name} {d.product?.model_name} ({d.storage_capacity || ''} {d.color || ''}) - UGX {Number(d.selling_price).toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {updateForm.data.replacement_imei_id && (() => {
                                            const newDev = inStockDevices.find(d => d.id == updateForm.data.replacement_imei_id);
                                            const originalPrice = selectedClaim.sale_item ? Number(selectedClaim.sale_item.price) : 0;
                                            const newPrice = newDev ? Number(newDev.selling_price) : 0;
                                            const difference = newPrice - originalPrice;

                                            return (
                                                <div className="bg-white p-3 rounded-lg border border-indigo-100 text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Original Paid:</span>
                                                        <span className="font-bold text-slate-900">UGX {originalPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Replacement Price:</span>
                                                        <span className="font-bold text-slate-900">UGX {newPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-indigo-50 pt-2">
                                                        <span className="font-bold text-slate-700">Difference:</span>
                                                        {difference > 0 ? (
                                                            <span className="font-extrabold text-rose-600">+UGX {difference.toLocaleString()} (Upgrade Fee)</span>
                                                        ) : difference < 0 ? (
                                                            <span className="font-extrabold text-emerald-600">-UGX {Math.abs(difference).toLocaleString()} (Refund Due)</span>
                                                        ) : (
                                                            <span className="font-bold text-slate-500">Even Swap (No fee)</span>
                                                        )}
                                                    </div>
                                                    
                                                    {difference !== 0 && (
                                                        <div className="pt-2">
                                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                                                                {difference > 0 ? 'Collect Upgrade Fee Via' : 'Issue Refund Via'}
                                                            </label>
                                                            <select 
                                                                className="saas-input py-1.5 text-sm"
                                                                value={updateForm.data.payment_method}
                                                                onChange={(e) => updateForm.setData('payment_method', e.target.value)}
                                                            >
                                                                <option value="Cash">Cash</option>
                                                                <option value="MTN MoMo">MTN MoMo</option>
                                                                <option value="Airtel Money">Airtel Money</option>
                                                                <option value="Bank Transfer">Bank Transfer</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div>
                                    <label className="saas-label">Resolution & Technician Notes</label>
                                    <textarea 
                                        className="saas-input" 
                                        rows="3" 
                                        placeholder="Add notes on repair progress, replacement IMEI used, or reason for rejection..."
                                        value={updateForm.data.resolution_notes}
                                        onChange={(e) => updateForm.setData('resolution_notes', e.target.value)}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <Button variant="danger" onClick={() => setShowUpdateModal(false)}>Cancel</Button>
                            <Button variant="primary" form="updateForm" type="submit" isLoading={updateForm.processing}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
