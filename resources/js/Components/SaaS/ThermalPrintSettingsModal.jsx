import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { Printer, Zap, Scissors, DollarSign, Check, Sliders } from 'lucide-react';
import ThermalPrintService from '@/Services/ThermalPrintService';
import toast from 'react-hot-toast';

export default function ThermalPrintSettingsModal({ show, onClose, onSaveSettings }) {
    const [paperWidth, setPaperWidth] = useState(localStorage.getItem('smartpos_paper_width') || '58mm');
    const [kickDrawer, setKickDrawer] = useState(localStorage.getItem('smartpos_kick_drawer') !== 'false');
    const [autoCut, setAutoCut] = useState(localStorage.getItem('smartpos_auto_cut') !== 'false');
    const [autoPrint, setAutoPrint] = useState(localStorage.getItem('smartpos_auto_print') === 'true');

    const handleSave = () => {
        localStorage.setItem('smartpos_paper_width', paperWidth);
        localStorage.setItem('smartpos_kick_drawer', kickDrawer);
        localStorage.setItem('smartpos_auto_cut', autoCut);
        localStorage.setItem('smartpos_auto_print', autoPrint);

        if (onSaveSettings) {
            onSaveSettings({ paperWidth, kickDrawer, autoCut, autoPrint });
        }
        toast.success('Thermal Printer & ESC/POS settings saved!');
        onClose();
    };

    const handleTestDrawer = () => {
        ThermalPrintService.triggerCashDrawer();
        toast.success('ESC/POS Drawer Kick Pulse sent!');
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6 font-sans">
                <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                            <Printer size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thermal & ESC/POS Printer</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure paper roll size, auto-cut & cash drawer pulse</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                </div>

                <div className="space-y-5">
                    {/* Paper Width Selection */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                            Paper Roll Width
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaperWidth('58mm')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                    paperWidth === '58mm'
                                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold shadow-sm'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <span className="text-sm font-extrabold">58mm Roll</span>
                                <span className="text-[10px] opacity-80 font-normal">32 Columns • Compact Receipt</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaperWidth('80mm')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                    paperWidth === '80mm'
                                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold shadow-sm'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <span className="text-sm font-extrabold">80mm Roll</span>
                                <span className="text-[10px] opacity-80 font-normal">48 Columns • Standard POS</span>
                            </button>
                        </div>
                    </div>

                    {/* Hardware Controls */}
                    <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Hardware Actions
                        </label>

                        {/* Cash Drawer Kick */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <DollarSign size={18} className="text-emerald-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Cash Drawer Kick Pulse</p>
                                    <p className="text-[10px] text-slate-500">Send ESC/POS signal to open drawer on print</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleTestDrawer}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                >
                                    Test Drawer
                                </button>
                                <input
                                    type="checkbox"
                                    checked={kickDrawer}
                                    onChange={(e) => setKickDrawer(e.target.checked)}
                                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                                />
                            </div>
                        </div>

                        {/* Auto Cut */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <Scissors size={18} className="text-indigo-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Auto Paper Cut</p>
                                    <p className="text-[10px] text-slate-500">Send ESC/POS partial cut signal at receipt end</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoCut}
                                onChange={(e) => setAutoCut(e.target.checked)}
                                className="rounded border-slate-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                            />
                        </div>

                        {/* Auto Print on Checkout */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <Zap size={18} className="text-amber-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Auto Print on Checkout</p>
                                    <p className="text-[10px] text-slate-500">Automatically open receipt print dialog after sale</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoPrint}
                                onChange={(e) => setAutoPrint(e.target.checked)}
                                className="rounded border-slate-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" icon={Check} onClick={handleSave}>Save ESC/POS Settings</Button>
                </div>
            </div>
        </Modal>
    );
}
