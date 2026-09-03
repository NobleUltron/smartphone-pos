import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import { AlertTriangle, Trash2, X, ArrowLeftRight, Smartphone, Layers, CheckCircle } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function VoidConsignmentModal({ isOpen, onClose, item }) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!item) return null;

    const isSerialized = item.type === 'serialized';
    const itemName = isSerialized
        ? `${item.device_imei?.product?.brand?.name || item.deviceImei?.product?.brand?.name || ''} ${item.device_imei?.product?.model_name || item.deviceImei?.product?.model_name || 'Device'}`.trim()
        : `${item.product?.brand?.name || ''} ${item.product?.model_name || 'Accessory'}`.trim();

    const imeiOrSku = isSerialized
        ? `IMEI: ${item.device_imei?.imei || item.deviceImei?.imei || 'N/A'}`
        : `SKU: ${item.product?.sku || 'N/A'} • Qty: ${item.quantity}`;

    const dealerName = item.dealer?.name || 'Partner Dealer';
    const isInward = item.direction === 'inward';

    const handleConfirm = () => {
        setIsDeleting(true);
        router.delete(route('dealers.destroy-item', item.id), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                onClose();
            }
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Void Consignment Transaction
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Erase accidental record & roll back inventory
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-4 space-y-4 text-sm">
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        Are you sure you want to void this transaction? This will permanently delete the consignment entry and automatically restore your stock to avoid inventory discrepancies.
                    </p>

                    {/* Item Details Summary Card */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Partner Dealer</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{dealerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Item</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{itemName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Identifier</span>
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{imeiOrSku}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Partner Price</span>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                UGX {Number(item.dealer_price || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Rollback Explanatory Notice */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                        <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                            <span className="font-bold">Automated Stock Restoration:</span>
                            <p className="mt-0.5 text-[11px] leading-normal opacity-90">
                                {isInward
                                    ? 'This received intake will be safely deducted/removed from your active shop inventory.'
                                    : 'This item will be automatically returned to your shop active stock with status "In Stock".'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <Trash2 size={15} />
                        {isDeleting ? 'Voiding...' : 'Yes, Void & Restore Stock'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
