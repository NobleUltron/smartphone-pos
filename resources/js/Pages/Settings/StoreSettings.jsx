import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Store, Receipt as ReceiptIcon, Save, Plus, Trash2, CheckCircle, Barcode as BarcodeIcon, Database, Download, ShieldCheck, Lock } from 'lucide-react';
import Barcode from 'react-barcode';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import PageHeader from '@/Components/SaaS/PageHeader';
import Button from '@/Components/SaaS/Button';

export default function StoreSettings({ auth, settings }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        shop_name: settings?.shop_name || 'SmartPOS Kampala',
        shop_address: settings?.shop_address || '123 Kampala Road, Kampala',
        shop_phone: settings?.shop_phone || '+256 700 000 000',
        currency_symbol: settings?.currency_symbol || 'UGX',
        receipt_footer: settings?.receipt_footer || 'Thank you for shopping with us!',
        store_logo: null,
        terms_conditions: settings?.terms_conditions || [
            'Goods sold in good condition are not returnable.',
            'Retain this receipt for any warranty claims.',
            'Warranty does not cover physical or liquid damage.',
            'Software issues are not covered under warranty.'
        ],
        allow_cashier_discounts: settings?.allow_cashier_discounts ?? true,
        allow_cashier_price_overwrites: settings?.allow_cashier_price_overwrites ?? true,
        allow_cashier_dealer_intake: settings?.allow_cashier_dealer_intake ?? true,
    });

    const [newTerm, setNewTerm] = useState('');

    const handleAddTerm = () => {
        if (!newTerm.trim()) return;
        setData('terms_conditions', [...data.terms_conditions, newTerm.trim()]);
        setNewTerm('');
    };

    const handleRemoveTerm = (index) => {
        const updated = data.terms_conditions.filter((_, i) => i !== index);
        setData('terms_conditions', updated);
    };

    const handleTermChange = (index, value) => {
        const updated = [...data.terms_conditions];
        updated[index] = value;
        setData('terms_conditions', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/api/settings');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Store Settings" />
            
            <PageHeader 
                title="Store & Receipt Customization"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Store Settings' }]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                
                {/* Settings Form */}
                <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6" id="settingsForm">
                        <Card>
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                                <Store size={20} className="text-pink-500" /> Business Details
                            </h3>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="shrink-0 flex flex-col gap-2">
                                        <label className="saas-label">Store Logo</label>
                                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 relative group cursor-pointer hover:border-indigo-400 transition-colors">
                                            {data.store_logo ? (
                                                <img src={URL.createObjectURL(data.store_logo)} className="w-full h-full object-contain p-1" />
                                            ) : settings?.store_logo ? (
                                                <img src={settings.store_logo} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Store className="text-slate-300 w-10 h-10" />
                                            )}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => setData('store_logo', e.target.files[0])} />
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-end">
                                        <label className="saas-label">Shop Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.shop_name} 
                                            onChange={(e) => setData('shop_name', e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="saas-label">Phone Number</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.shop_phone} 
                                            onChange={(e) => setData('shop_phone', e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <label className="saas-label">Currency Symbol</label>
                                        <input 
                                            type="text" 
                                            className="saas-input" 
                                            value={data.currency_symbol} 
                                            onChange={(e) => setData('currency_symbol', e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="saas-label">Business Address</label>
                                    <input 
                                        type="text" 
                                        className="saas-input" 
                                        value={data.shop_address} 
                                        onChange={(e) => setData('shop_address', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                                <ReceiptIcon size={20} className="text-indigo-500" /> Thermal Receipt Customization
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="saas-label">Receipt Footer Note</label>
                                    <input 
                                        type="text" 
                                        className="saas-input" 
                                        value={data.receipt_footer} 
                                        onChange={(e) => setData('receipt_footer', e.target.value)} 
                                        placeholder="Thank you for shopping with us!"
                                    />
                                </div>

                                <div>
                                    <label className="saas-label mb-3">Terms & Conditions Rules</label>
                                    <div className="space-y-3 mb-4">
                                        {data.terms_conditions.map((term, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </span>
                                                <input 
                                                    type="text" 
                                                    className="saas-input flex-1" 
                                                    value={term} 
                                                    onChange={(e) => handleTermChange(index, e.target.value)} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveTerm(index)}
                                                    className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                                    title="Remove Rule"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            className="saas-input flex-1" 
                                            placeholder="Add new terms & conditions rule..." 
                                            value={newTerm} 
                                            onChange={(e) => setNewTerm(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTerm())}
                                        />
                                        <Button type="button" variant="secondary" onClick={handleAddTerm} icon={Plus}>
                                            Add Rule
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Cashier Permissions & Security Control */}
                        <Card>
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <ShieldCheck size={20} className="text-rose-500" /> Cashier Role Permissions & Security
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Fine-tune cashier capabilities to enforce security and prevent unauthorized discounts or price modifications.
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Custom Cashier Discounts</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to enter manual discounts during POS checkout.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_discounts}
                                        onChange={e => setData('allow_cashier_discounts', e.target.checked)}
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Item Price Overwrites</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to override selling prices on individual items.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_price_overwrites}
                                        onChange={e => setData('allow_cashier_price_overwrites', e.target.checked)}
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900">Allow Inward Dealer Stock Intake</span>
                                        <span className="block text-[11px] text-slate-500">Permit cashiers to receive items from partner dealers into shop inventory.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={data.allow_cashier_dealer_intake}
                                        onChange={e => setData('allow_cashier_dealer_intake', e.target.checked)}
                                    />
                                </label>
                            </div>
                        </Card>

                        <div className="flex items-center justify-end gap-4">
                            {recentlySuccessful && (
                                <span className="text-emerald-600 flex items-center gap-1.5 font-medium text-sm animate-fade-in">
                                    <CheckCircle size={16} /> Settings saved successfully!
                                </span>
                            )}
                            <Button type="submit" variant="primary" form="settingsForm" isLoading={processing} icon={Save}>
                                Save Store Settings
                            </Button>
                        </div>
                    </form>

                    {/* Database Backup & Data Protection Card */}
                    <Card>
                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Database size={20} className="text-indigo-600" /> Database Backup & Data Protection
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Download a complete 1-click offline backup of your system tables, transactions, inventory, and settings (.sql file) for offline recovery.
                        </p>
                        <a 
                            href="/settings/backup/download"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 transition-all"
                        >
                            <Download size={16} /> Download SQL Database Backup
                        </a>
                    </Card>
                </div>

                {/* Live Receipt Preview */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-4 ml-2">Live Receipt Preview</h4>
                        
                        <div 
                            className="rounded-2xl shadow-2xl p-6 mx-auto max-w-[360px] font-mono text-sm relative overflow-hidden transition-all duration-300"
                            style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' }}
                        >
                            {/* Receipt Top Edge decoration */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmMThmNmY2IiBwb2ludHM9IjAsMCA4LDAgNCw4Ii8+PC9zdmc+')] bg-repeat-x -mt-1"></div>
                            
                            <div className="text-center mb-5 pt-4 flex flex-col items-center">
                                {data.store_logo ? (
                                    <img src={URL.createObjectURL(data.store_logo)} alt="Store Logo Preview" className="max-w-[140px] max-h-[70px] object-contain mb-2" />
                                ) : settings?.store_logo ? (
                                    <img src={settings.store_logo} alt="Store Logo Preview" className="max-w-[140px] max-h-[70px] object-contain mb-2" />
                                ) : (
                                    <div className="w-10 h-10 border border-slate-900 flex items-center justify-center mb-2 rounded-lg">
                                        <Store size={20} style={{ color: '#0F172A' }} />
                                    </div>
                                )}
                                <h1 className="font-extrabold text-base leading-tight uppercase tracking-wider mb-1" style={{ color: '#0F172A' }}>
                                    {data.shop_name || 'SmartPOS Kampala'}
                                </h1>
                                <div className="text-xs leading-tight font-medium" style={{ color: '#475569' }}>
                                    <p>{data.shop_address || '123 Kampala Road'}</p>
                                    <p>Tel: {data.shop_phone || '+256 700 000 000'}</p>
                                </div>
                            </div>

                            <div className="border-b border-dashed border-slate-300 pb-3 mb-3 text-xs space-y-1.5" style={{ color: '#334155' }}>
                                <div className="flex justify-between"><span className="font-bold">Receipt #:</span> <span>1042</span></div>
                                <div className="flex justify-between"><span className="font-bold">Date:</span> <span>{new Date().toLocaleDateString()}</span></div>
                                <div className="flex justify-between"><span className="font-bold">Cashier:</span> <span>Demo Admin</span></div>
                            </div>

                            <table className="w-full text-xs mb-4">
                                <thead>
                                    <tr className="border-b border-dashed border-slate-300" style={{ color: '#64748B' }}>
                                        <th className="text-left pb-2 font-semibold uppercase tracking-wider">Item</th>
                                        <th className="text-right pb-2 font-semibold uppercase tracking-wider">Price</th>
                                    </tr>
                                </thead>
                                <tbody style={{ color: '#0F172A' }}>
                                    <tr>
                                        <td className="py-2 pr-2">
                                            <div className="font-bold text-xs">Apple iPhone 15 Pro</div>
                                            <div className="text-[10px] font-mono" style={{ color: '#64748B' }}>IMEI: 354892109845231</div>
                                        </td>
                                        <td className="py-2 text-right align-top font-bold text-xs">4,200,000</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between font-black text-sm mb-5" style={{ color: '#0F172A' }}>
                                <span>Total:</span>
                                <span>4,200,000 {data.currency_symbol}</span>
                            </div>

                            <div className="text-center border-t border-dashed border-slate-300 pt-4">
                                <p className="font-extrabold text-xs mb-3" style={{ color: '#0F172A' }}>
                                    {data.receipt_footer || 'Thank you for shopping with us!'}
                                </p>
                                
                                {data.terms_conditions?.length > 0 && (
                                    <div 
                                        className="rounded-xl p-3 text-left mb-4 border"
                                        style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                                    >
                                        <strong className="text-[10px] uppercase font-extrabold tracking-wider block mb-1.5" style={{ color: '#475569' }}>
                                            Terms & Conditions:
                                        </strong>
                                        <ol className="list-decimal pl-4 space-y-1 text-[11px] font-medium" style={{ color: '#334155' }}>
                                            {data.terms_conditions.map((term, i) => (
                                                <li key={i}>{term}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center pt-2">
                                <Barcode value="SALE-1042" width={1.2} height={40} fontSize={10} displayValue={true} />
                            </div>
                            
                            {/* Receipt Bottom Edge decoration */}
                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIGZpbGw9IiNmMThmNmY2IiBwb2ludHM9IjAsOCA4LDggNCwwIi8+PC9zdmc+')] bg-repeat-x -mb-1"></div>
                        </div>
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
