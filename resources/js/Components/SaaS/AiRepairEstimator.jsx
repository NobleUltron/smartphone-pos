import React, { useState, useMemo } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import { Sparkles, Wrench, ShieldAlert, Clock, DollarSign, Check, Cpu, CheckCircle, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AiRepairEstimator({ show, onClose, brand, modelName, problemDescription, products = [], onApplyEstimate }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [estimation, setEstimation] = useState(null);

    // Clean device title formatted without duplication
    const displayDeviceTitle = useMemo(() => {
        const b = (brand || '').trim();
        const m = (modelName || '').trim();
        if (!b) return m || 'Smartphone';
        if (!m) return b;
        if (m.toLowerCase().startsWith(b.toLowerCase())) return m;
        return `${b} ${m}`;
    }, [brand, modelName]);

    // AI Smart Estimation Engine logic based on model & damage symptoms & inventory
    const generateEstimate = () => {
        setIsAnalyzing(true);
        setEstimation(null);

        setTimeout(() => {
            const desc = (problemDescription || '').toLowerCase();
            const deviceQuery = displayDeviceTitle.toLowerCase();

            // 1. Search Shop's Real Inventory Products first for an exact/partial match
            let matchedPart = null;
            if (Array.isArray(products) && products.length > 0) {
                matchedPart = products.find(p => {
                    const pName = (p.name || p.model_name || '').toLowerCase();
                    const matchesDesc = (desc.includes('back glass') && (pName.includes('back glass') || pName.includes('back cover') || pName.includes('rear glass'))) ||
                                        ((desc.includes('screen') || desc.includes('display')) && (pName.includes('screen') || pName.includes('display') || pName.includes('lcd'))) ||
                                        (desc.includes('battery') && pName.includes('battery')) ||
                                        (desc.includes('camera') && pName.includes('camera'));
                    
                    const matchesModel = deviceQuery.split(' ').some(token => token.length > 3 && pName.includes(token));
                    return matchesDesc && matchesModel;
                });

                // Fallback: search by symptom description match across inventory
                if (!matchedPart) {
                    matchedPart = products.find(p => {
                        const pName = (p.name || p.model_name || '').toLowerCase();
                        if (desc.includes('back glass') && (pName.includes('back glass') || pName.includes('back cover') || pName.includes('rear glass'))) return true;
                        if ((desc.includes('screen') || desc.includes('display')) && (pName.includes('screen') || pName.includes('display'))) return true;
                        if (desc.includes('battery') && pName.includes('battery')) return true;
                        return false;
                    });
                }
            }

            let basePartCost = matchedPart ? Number(matchedPart.selling_price || matchedPart.price || matchedPart.cost_price || 0) : 45000;
            let baseLaborFee = 30000;
            let estDuration = '45 mins';
            let riskLevel = 'Low';
            let complexityNotes = matchedPart 
                ? `Matched shop inventory item: "${matchedPart.name || matchedPart.model_name}".`
                : 'Standard component replacement.';

            // Specific repair category rules
            if (desc.includes('back glass') || desc.includes('back cover') || desc.includes('rear glass')) {
                if (!matchedPart) basePartCost = 80000; // Fallback back glass cost
                baseLaborFee = 35000;
                estDuration = '1 hour';
                riskLevel = 'Medium';
                complexityNotes = matchedPart 
                    ? `Shop Inventory Matched: ${matchedPart.name || matchedPart.model_name}. Back glass separation & adhesive installation.`
                    : 'Back glass laser separation and rear housing replacement.';
            } else if (desc.includes('screen') || desc.includes('display') || desc.includes('touch') || desc.includes('front glass')) {
                if (!matchedPart) {
                    if (deviceQuery.includes('iphone 13') || deviceQuery.includes('iphone 14') || deviceQuery.includes('iphone 15') || deviceQuery.includes('s23') || deviceQuery.includes('s24')) {
                        basePartCost = 280000;
                        baseLaborFee = 70000;
                        riskLevel = 'Medium';
                        complexityNotes = 'OLED display assembly replacement & True Tone IC transfer.';
                    } else {
                        basePartCost = 120000;
                        baseLaborFee = 45000;
                        complexityNotes = 'Full display digitizer assembly swap.';
                    }
                } else {
                    baseLaborFee = 50000;
                    riskLevel = 'Medium';
                }
                estDuration = '1 hour';
            } else if (desc.includes('battery') || desc.includes('charging') || desc.includes('port')) {
                if (!matchedPart) basePartCost = 45000;
                baseLaborFee = 25000;
                estDuration = '30 mins';
                complexityNotes = matchedPart ? `Shop Inventory Matched: ${matchedPart.name || matchedPart.model_name}. Battery flex installation.` : 'Battery & charging flex replacement.';
            }

            const total = basePartCost + baseLaborFee;

            setEstimation({
                partCost: basePartCost,
                laborFee: baseLaborFee,
                totalCost: total,
                duration: estDuration,
                riskLevel: riskLevel,
                notes: complexityNotes,
                inventoryMatched: !!matchedPart,
                matchedPartName: matchedPart ? (matchedPart.name || matchedPart.model_name) : null
            });

            setIsAnalyzing(false);
        }, 600);
    };

    React.useEffect(() => {
        if (show) {
            generateEstimate();
        }
    }, [show, brand, modelName, problemDescription]);

    const handleApply = () => {
        if (estimation && onApplyEstimate) {
            onApplyEstimate(estimation.totalCost, `[AI Estimate] ${estimation.notes} (Part: ${estimation.partCost.toLocaleString()} UGX, Labor: ${estimation.laborFee.toLocaleString()} UGX)`);
            toast.success('AI Repair Estimate applied to intake form!');
            onClose();
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6 font-sans">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">AI Repair Cost Estimator</h3>
                            <p className="text-[11px] text-slate-500">Smart diagnostics & shop inventory pricing engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>

                {isAnalyzing ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center text-indigo-500">
                            <Cpu size={22} />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Analyzing shop parts inventory & defect symptoms...</p>
                        <p className="text-[10px] text-slate-400">Searching shop database for exact component price</p>
                    </div>
                ) : estimation ? (
                    <div className="space-y-4">
                        {/* Device Info */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Device & Reported Problem</span>
                            <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{displayDeviceTitle}</span>
                            <p className="text-slate-500 italic mt-1 text-[11px]">"{problemDescription || 'General repair intake'}"</p>
                        </div>

                        {/* Inventory Match Badge if found */}
                        {estimation.inventoryMatched && (
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                                <PackageCheck size={16} className="text-emerald-500 shrink-0" />
                                <div>
                                    <span className="font-bold">Inventory Matched: </span>
                                    <span>{estimation.matchedPartName} ({estimation.partCost.toLocaleString()} UGX)</span>
                                </div>
                            </div>
                        )}

                        {/* Breakdown Cards */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Estimated Part Cost</span>
                                <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                                    {estimation.partCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">UGX</span>
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                                <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Labor / Workmanship</span>
                                <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                                    {estimation.laborFee.toLocaleString()} <span className="text-xs font-normal text-indigo-400">UGX</span>
                                </p>
                            </div>
                        </div>

                        {/* Recommended Total */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Recommended Quote</span>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {estimation.totalCost.toLocaleString()} <span className="text-xs font-bold text-emerald-500">UGX</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 block">Est. Duration</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                    <Clock size={12} className="text-indigo-500" /> {estimation.duration}
                                </span>
                            </div>
                        </div>

                        {/* Complexity & Risk */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-start gap-2.5">
                            <Wrench size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Repair Complexity</span>
                                    <Badge variant={estimation.riskLevel === 'High' ? 'danger' : (estimation.riskLevel === 'Medium' ? 'warning' : 'success')}>
                                        {estimation.riskLevel} Risk
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{estimation.notes}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="primary" 
                        icon={CheckCircle} 
                        disabled={isAnalyzing || !estimation}
                        onClick={handleApply}
                    >
                        Apply AI Estimate
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
