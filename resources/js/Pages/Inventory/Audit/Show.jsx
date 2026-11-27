import React, { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Scan, CheckCircle, AlertTriangle, HelpCircle, FileText, Check, ArrowLeft, RefreshCcw, Volume2, VolumeX, ShieldCheck, Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import dayjs from 'dayjs';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Modal from '@/Components/Modal';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';

export default function Show({ audit, unscannedDevices = [] }) {
    const [scanCode, setScanCode] = useState('');
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('found'); // 'found', 'unscanned', 'unmatched'
    const [tabPage, setTabPage] = useState(1);
    const [tabPerPage, setTabPerPage] = useState(15);
    const [itemsList, setItemsList] = useState(audit.items || []);
    const [unscannedList, setUnscannedList] = useState(unscannedDevices);
    const [scannedCount, setScannedCount] = useState(audit.total_scanned || 0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');

    const inputRef = useRef(null);
    const scannerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const lastCameraScanRef = useRef({ code: '', time: 0 });
    const scanningRef = useRef(false);

    // Web Audio API Scanner Beeps (zero external audio files needed)
    const playBeep = (type = 'success') => {
        if (!soundEnabled || typeof window === 'undefined') return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const playTone = (freq, startOffset, duration, wave = 'sine', gainVal = 0.18) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = wave;
                osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
                gain.gain.setValueAtTime(gainVal, ctx.currentTime + startOffset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + startOffset);
                osc.stop(ctx.currentTime + startOffset + duration);
            };

            if (type === 'success') {
                playTone(920, 0, 0.08, 'sine', 0.2);
                playTone(1380, 0.09, 0.11, 'sine', 0.22);
            } else if (type === 'warning') {
                playTone(540, 0, 0.1, 'triangle', 0.18);
                playTone(540, 0.13, 0.1, 'triangle', 0.18);
            } else {
                playTone(220, 0, 0.28, 'sawtooth', 0.16);
            }
        } catch {
            // Ignore audio errors on restricted devices
        }
    };

    // Auto-focus barcode scanner input field on load and after scans
    useEffect(() => {
        if (inputRef.current && audit.status === 'In Progress' && !cameraActive) {
            inputRef.current.focus();
        }
    }, [audit.status, cameraActive]);

    const processScanCode = async (rawCode) => {
        const codeToScan = (rawCode || '').trim();
        if (!codeToScan || scanningRef.current) return;

        scanningRef.current = true;
        setScanning(true);

        try {
            const response = await axios.post(`/api/inventory/audits/${audit.id}/scan`, { code: codeToScan });
            const data = response.data;

            if (data.result === 'duplicate') {
                playBeep('warning');
                toast.error(data.message, { icon: '⚠️' });
            } else if (data.result === 'found') {
                playBeep('success');
                toast.success(data.message, { icon: '✅' });
                setItemsList(prev => [data.item, ...prev]);
                setUnscannedList(prev => prev.filter(d => d.imei !== codeToScan));
                setScannedCount(prev => prev + 1);
            } else if (data.result === 'unmatched') {
                playBeep('error');
                toast.error(data.message, { icon: '❓' });
                setItemsList(prev => [data.item, ...prev]);
            }
        } catch (error) {
            playBeep('error');
            toast.error(error.response?.data?.message || 'Error processing scan input');
        } finally {
            scanningRef.current = false;
            setScanning(false);
            if (inputRef.current && !cameraActive) inputRef.current.focus();
        }
    };

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        if (!scanCode.trim() || scanning) return;
        const code = scanCode.trim();
        setScanCode('');
        await processScanCode(code);
    };

    // Start / Stop Live Phone / Webcam Barcode Scanner
    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                // Ignore cleanup errors
            }
            scannerRef.current = null;
        }
        setCameraActive(false);
    };

    const toggleCamera = async () => {
        if (cameraActive) {
            await stopCamera();
            return;
        }
        setCameraError('');
        setCameraActive(true);
    };

    useEffect(() => {
        if (!cameraActive || audit.status !== 'In Progress') return;

        let cancelled = false;
        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode('audit-camera-reader', {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.QR_CODE,
                    ],
                    verbose: false,
                });
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 12,
                        qrbox: { width: 280, height: 110 },
                        aspectRatio: 1.777,
                    },
                    (decodedText) => {
                        const now = Date.now();
                        // 2-second cooldown on same barcode to prevent rapid duplicate fires
                        if (
                            lastCameraScanRef.current.code === decodedText &&
                            now - lastCameraScanRef.current.time < 2200
                        ) {
                            return;
                        }
                        lastCameraScanRef.current = { code: decodedText, time: now };
                        processScanCode(decodedText);
                    },
                    () => {}
                );
            } catch (err) {
                if (!cancelled) {
                    const msg = typeof err === 'string'
                        ? err
                        : (err?.message || 'Camera permission denied or no camera found. (Note: Mobile browsers require HTTPS or localhost.)');
                    setCameraError(msg);
                    setCameraActive(false);
                }
            }
        };

        // Wait a tick for #audit-camera-reader div to mount
        const t = setTimeout(startScanner, 80);
        return () => {
            cancelled = true;
            clearTimeout(t);
            stopCamera();
        };
    }, [cameraActive, audit.status]);

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

            {/* Barcode Scanner Input Box + Live Phone Camera Scanner */}
            {audit.status === 'In Progress' && (
                <Card className="mb-8 border-2 border-indigo-500/30 bg-indigo-50/10 space-y-4">
                    <form onSubmit={handleScanSubmit} className="flex flex-wrap gap-2.5 items-center">
                        <div className="relative flex-1 min-w-[220px]">
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
                        <Button variant="primary" type="submit" disabled={scanning || !scanCode.trim()} className="px-5 py-3.5">
                            Verify Scan
                        </Button>
                        <button
                            type="button"
                            onClick={toggleCamera}
                            className={`px-4 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                                cameraActive
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
                            <span>{cameraActive ? 'Stop Camera' : 'Phone Camera'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            title={soundEnabled ? 'Mute scanner beeps' : 'Enable scanner beeps'}
                            className={`p-3.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                                soundEnabled
                                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                        >
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </form>

                    {cameraError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
                            Camera Error: {cameraError}
                        </div>
                    )}

                    {cameraActive && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 p-3">
                            <div className="flex items-center justify-between text-xs text-slate-300 mb-2 px-1">
                                <span className="font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Point camera at IMEI barcode sticker (CODE128 / QR)
                                </span>
                                <span className="text-[11px] text-slate-400">Auto-beeps on match</span>
                            </div>
                            <div id="audit-camera-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" />
                        </div>
                    )}
                </Card>
            )}

            {/* Live Scan Results & Discrepancies Tabs */}
            <div className="space-y-4">
                <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('found'); setTabPage(1); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'found'
                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CheckCircle size={15} /> Verified Scanned ({foundItems.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('unscanned'); setTabPage(1); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'unscanned'
                                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <AlertTriangle size={15} /> {audit.status === 'Completed' ? `Logged Missing (${missingItems.length})` : `Unscanned / Missing (${unscannedList.length})`}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('unmatched'); setTabPage(1); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'unmatched'
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <HelpCircle size={15} /> Unmatched Scans ({unmatchedItems.length})
                    </button>
                </div>

                {/* Tab Content: Verified Scanned */}
                {activeTab === 'found' && (
                    <>
                        <DataTable
                            headers={[
                                'Device / Model',
                                'IMEI Scanned',
                                'Scan Status',
                                { label: 'Time Scanned', className: 'text-right' },
                            ]}
                            isEmpty={foundItems.length === 0}
                            emptyState={
                                <div className="py-10 text-center text-slate-400">
                                    No devices scanned yet. Start scanning device barcodes above!
                                </div>
                            }
                        >
                            {foundItems
                                .slice((tabPage - 1) * tabPerPage, tabPage * tabPerPage)
                                .map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="font-bold text-slate-900 dark:text-white">
                                            {item.device_imei?.product?.brand?.name || ''} {item.device_imei?.product?.model_name || 'Product'}
                                        </td>
                                        <td className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">
                                            {item.imei_scanned}
                                        </td>
                                        <td>
                                            <Badge variant="success">Verified</Badge>
                                        </td>
                                        <td className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            {dayjs(item.scanned_at).format('HH:mm:ss')}
                                        </td>
                                    </tr>
                                ))}
                        </DataTable>
                        <Pagination
                            total={foundItems.length}
                            currentPage={tabPage}
                            perPage={tabPerPage}
                            onPageChange={setTabPage}
                            onPerPageChange={setTabPerPage}
                        />
                    </>
                )}

                {/* Tab Content: Unscanned / Missing */}
                {activeTab === 'unscanned' && (() => {
                    const activeMissingList = audit.status === 'Completed' ? missingItems : unscannedList;
                    const sliced = activeMissingList.slice((tabPage - 1) * tabPerPage, tabPage * tabPerPage);
                    return (
                        <>
                            <DataTable
                                headers={[
                                    'Expected Device & Model',
                                    'DB IMEI',
                                    'Current DB Status',
                                ]}
                                isEmpty={activeMissingList.length === 0}
                                emptyState={
                                    <div className="py-10 text-center text-slate-400">
                                        🎉 All expected inventory items have been scanned and verified!
                                    </div>
                                }
                            >
                                {audit.status === 'Completed'
                                    ? sliced.map((item) => (
                                        <tr key={item.id} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
                                            <td className="font-bold text-slate-900 dark:text-white">
                                                {item.device_imei?.product?.brand?.name || ''} {item.device_imei?.product?.model_name || 'Product'}
                                            </td>
                                            <td className="font-mono text-rose-600 dark:text-rose-400 font-bold text-xs">
                                                {item.imei_scanned}
                                            </td>
                                            <td>
                                                <Badge variant="danger">Logged Missing</Badge>
                                            </td>
                                        </tr>
                                    ))
                                    : sliced.map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="font-bold text-slate-900 dark:text-white">
                                                {device.product?.brand?.name || ''} {device.product?.model_name || 'Product'}
                                            </td>
                                            <td className="font-mono text-slate-600 dark:text-slate-300 text-xs">
                                                {device.imei}
                                            </td>
                                            <td>
                                                <Badge variant="warning">Awaiting Scan</Badge>
                                            </td>
                                        </tr>
                                    ))}
                            </DataTable>
                            <Pagination
                                total={activeMissingList.length}
                                currentPage={tabPage}
                                perPage={tabPerPage}
                                onPageChange={setTabPage}
                                onPerPageChange={setTabPerPage}
                            />
                        </>
                    );
                })()}

                {/* Tab Content: Unmatched Scans */}
                {activeTab === 'unmatched' && (
                    <>
                        <DataTable
                            headers={[
                                'Scanned Code / Barcode',
                                'Scan Note',
                                { label: 'Time Scanned', className: 'text-right' },
                            ]}
                            isEmpty={unmatchedItems.length === 0}
                            emptyState={
                                <div className="py-10 text-center text-slate-400">
                                    No unmatched or unknown barcodes scanned.
                                </div>
                            }
                        >
                            {unmatchedItems
                                .slice((tabPage - 1) * tabPerPage, tabPage * tabPerPage)
                                .map((item) => (
                                    <tr key={item.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
                                        <td className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
                                            {item.imei_scanned}
                                        </td>
                                        <td className="text-xs text-slate-600 dark:text-slate-300">
                                            {item.notes || 'Unrecorded barcode'}
                                        </td>
                                        <td className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            {dayjs(item.scanned_at).format('HH:mm:ss')}
                                        </td>
                                    </tr>
                                ))}
                        </DataTable>
                        <Pagination
                            total={unmatchedItems.length}
                            currentPage={tabPage}
                            perPage={tabPerPage}
                            onPageChange={setTabPage}
                            onPerPageChange={setTabPerPage}
                        />
                    </>
                )}
            </div>

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
                        <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
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
