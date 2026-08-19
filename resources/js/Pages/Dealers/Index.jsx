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
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Dealers Directory</h3>
                    <div className="w-72">
                        <input
                            type="text"
                            placeholder="Search dealers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-sm border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Dealer Name</th>
                                <th className="px-6 py-4 font-semibold">Contact Info</th>
                                <th className="px-6 py-4 font-semibold text-center">Items Out</th>
                                <th className="px-6 py-4 font-semibold text-right">Value Out</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDealers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No dealers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDealers.map((dealer) => (
                                    <tr key={dealer.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{dealer.name}</div>
                                            {dealer.contact_person && (
                                                <div className="text-xs text-slate-500 mt-0.5">{dealer.contact_person}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {dealer.phone}
                                                </div>
                                                {dealer.address && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
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
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                            {dealer.pending_value > 0 ? formatCurrency(dealer.pending_value) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route('dealers.show', dealer.id)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Manage
                                                </Link>
                                                <button
                                                    onClick={() => openEditModal(dealer)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Dealer"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(dealer)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                <form onSubmit={submitForm} className="p-6">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">
                            {modalMode === 'add' ? 'Add New Dealer' : 'Edit Dealer'}
                        </h2>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company / Dealer Name *</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person (Optional)</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                value={data.contact_person}
                                onChange={e => setData('contact_person', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                required
                            />
                            {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address (Optional)</label>
                            <textarea
                                className="w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                rows="2"
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={processing}>
                            {modalMode === 'add' ? 'Save Dealer' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Dealer?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Are you sure you want to delete <strong>{dealerToDelete?.name}</strong>? This action cannot be undone.
                        </p>
                        
                        <div className="flex gap-3 w-full">
                            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1" onClick={submitDelete}>Delete</Button>
                        </div>
                    </div>
                </div>
            </Modal>
            
        </AuthenticatedLayout>
    );
}
