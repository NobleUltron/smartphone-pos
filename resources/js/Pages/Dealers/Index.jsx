import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Handshake, Plus, X, Phone, MapPin, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';

export default function Index({ dealers }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [dealerToDelete, setDealerToDelete] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    const openAddModal = () => {
        setModalMode('add');
        setSelectedDealer(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (dealer) => {
        setModalMode('edit');
        setSelectedDealer(dealer);
        setData({
            name: dealer.name || '',
            contact_person: dealer.contact_person || '',
            phone: dealer.phone || '',
            email: dealer.email || '',
            address: dealer.address || '',
            notes: dealer.notes || ''
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const openDeleteModal = (dealer) => {
        setDealerToDelete(dealer);
        setIsDeleteModalOpen(true);
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (modalMode === 'add') {
            post(route('dealers.store'), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                }
            });
        } else {
            put(route('dealers.update', selectedDealer.id), {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                }
            });
        }
    };

    const submitDelete = () => {
        router.delete(route('dealers.destroy', dealerToDelete.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setDealerToDelete(null);
            }
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const filteredDealers = dealers.filter(dealer => 
        dealer.name.toLowerCase().includes(search.toLowerCase()) ||
        dealer.phone.includes(search)
    );

    return (
        <AuthenticatedLayout>
            <Head title="Dealers Directory" />

            <PageHeader 
                title="Dealers & Partners"
                breadcrumbs={[
                    { label: 'Home', href: '/' }, 
                    { label: 'Dealer Management', href: route('dealers.dashboard') },
                    { label: 'Directory' }
                ]}
                actions={
                    <Button variant="primary" onClick={openAddModal} icon={Plus}>Add Dealer</Button>
                }
            />

            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dealers Directory</h3>
                    <div className="w-full sm:w-72">
                        <input
                            type="text"
                            placeholder="Search dealers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Dealer Name</th>
                                <th className="px-6 py-4 font-semibold">Contact Info</th>
                                <th className="px-6 py-4 font-semibold text-center">Items Out</th>
                                <th className="px-6 py-4 font-semibold text-right">Value Out</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {filteredDealers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                        No dealers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDealers.map((dealer) => (
                                    <tr key={dealer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{dealer.name}</div>
                                            {dealer.contact_person && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dealer.contact_person}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {dealer.phone}
                                                </div>
                                                {dealer.address && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                                                        <MapPin size={12} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[200px]">{dealer.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {dealer.pending_items_count > 0 ? (
                                                <Badge variant="warning">{dealer.pending_items_count}</Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                            {dealer.pending_value > 0 ? formatCurrency(dealer.pending_value) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route('dealers.show', dealer.id)}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition-colors text-xs"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    onClick={() => openEditModal(dealer)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Edit Dealer"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(dealer)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Delete Dealer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add / Edit Dealer Modal */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Handshake size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {modalMode === 'add' ? 'Add New Dealer' : 'Edit Dealer'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {modalMode === 'add' ? 'Register a new consignment dealer partner' : 'Update dealer information and contact details'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={submitForm} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Company / Dealer Name *
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. Ash Gadgets, H@NT$ CYBER"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-rose-500 text-xs font-bold">{errors.name}</p>}
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Contact Person <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. Hamim Mugagga"
                                value={data.contact_person}
                                onChange={e => setData('contact_person', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Phone Number *
                            </label>
                            <input
                                type="text"
                                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="e.g. 0780000000"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                required
                            />
                            {errors.phone && <p className="text-rose-500 text-xs font-bold">{errors.phone}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Address <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                rows="2"
                                placeholder="e.g. Shop 14, Majestic Plaza, Kampala"
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                            ></textarea>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {modalMode === 'add' ? 'Save Dealer' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400 shadow-sm">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Dealer?</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{dealerToDelete?.name}</strong>? This action cannot be undone.
                        </p>
                        
                        <div className="flex items-center gap-2.5 w-full">
                            <button
                                type="button"
                                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all"
                                onClick={submitDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            
        </AuthenticatedLayout>
    );
}
