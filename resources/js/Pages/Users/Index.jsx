import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Users, Pencil, Trash2, Search, Plus, ShieldCheck, Mail, Lock, UserSquare, Wrench, RotateCcw, AlertTriangle, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import Modal from '@/Components/Modal';

export default function UsersIndex({ auth, users = {}, filters = {}, summary, permissionDefinitions = [], roleDefaults = {} }) {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const resolveRolePermissions = (role, existing = null) => {
        const base = { ...(roleDefaults[role] || roleDefaults.cashier || {}) };
        if (existing && typeof existing === 'object') {
            Object.keys(base).forEach((k) => {
                if (Object.prototype.hasOwnProperty.call(existing, k)) {
                    base[k] = Boolean(existing[k]);
                }
            });
        }
        return base;
    };
    const [formData, setFormData] = useState({ 
        id: null, name: '', email: '', role: 'cashier', 
        phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '',
        hire_date: '', status: 'active', nin: '', next_of_kin_name: '', next_of_kin_phone: '',
        password: '', password_confirmation: '',
        commission_type: 'none', commission_rate: 0,
        permissions: resolveRolePermissions('cashier'),
    });
    const [loading, setLoading] = useState(false);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            router.get('/users', params, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter, statusFilter]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
        router.get('/users', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.role) return toast.error("Please fill required fields");
        if (!isEditing && !formData.password) return toast.error("Password is required for new users");
        if (formData.password && formData.password !== formData.password_confirmation) return toast.error("Passwords do not match");

        setLoading(true);
        try {
            if (isEditing) {
                await axios.put(`/api/users/${formData.id}`, formData);
                toast.success("Staff account updated successfully");
            } else {
                await axios.post('/api/users', formData);
                toast.success("Staff account created successfully");
            }
            setShowModal(false);
            router.reload({ preserveScroll: true });
        } catch (error) {
            const firstErr = error.response?.data?.errors ? Object.values(error.response.data.errors)[0]?.[0] : null;
            toast.error(firstErr || error.response?.data?.message || "Error saving user");
        }
        setLoading(false);
    };

    const handleEdit = (user) => {
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            address: user.address || '',
            emergency_contact_name: user.emergency_contact_name || '',
            emergency_contact_phone: user.emergency_contact_phone || '',
            hire_date: user.hire_date || '',
            status: user.status || 'active',
            nin: user.nin || '',
            next_of_kin_name: user.next_of_kin_name || '',
            next_of_kin_phone: user.next_of_kin_phone || '',
            password: '',
            password_confirmation: '',
            commission_type: user.commission_type || 'none',
            commission_rate: user.commission_rate ?? 0,
            permissions: resolveRolePermissions(user.role, user.permissions),
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/users/${deletingUser.id}`);
            toast.success("Staff account deleted successfully");
            setDeletingUser(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            toast.error(error.response?.data?.error || "Error deleting user");
        } finally {
            setIsDeleting(false);
        }
    };

    const isEditingSelf = isEditing && Number(formData.id) === Number(auth?.user?.id);

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin': return <Badge variant="danger">Admin</Badge>;
            case 'manager': return <Badge variant="primary">Manager</Badge>;
            case 'technician': return <Badge variant="warning">Technician</Badge>;
            default: return <Badge variant="secondary">Cashier</Badge>;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Staff Management" />
            
            <PageHeader 
                title="Staff Management"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Users' }]}
                actions={
                    <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ 
                                id: null, name: '', email: '', role: 'cashier', status: 'active',
                                phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '',
                                hire_date: '', nin: '', next_of_kin_name: '', next_of_kin_phone: '',
                                password: '', password_confirmation: '',
                                commission_type: 'none', commission_rate: 0,
                                permissions: resolveRolePermissions('cashier'),
                            });
                            setShowModal(true);
                        }}
                    >
                        Add Staff
                    </Button>
                }
            />

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card
                        className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all"
                        style={{ animationDelay: '0.0s' }}
                        onClick={() => setRoleFilter('all')}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Staff</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_staff || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="primary">System</Badge>
                            <span>Users</span>
                        </div>
                    </Card>

                    <Card
                        className={`animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all ${roleFilter === 'cashier' ? 'ring-2 ring-emerald-500' : 'hover:ring-2 hover:ring-emerald-400/50'}`}
                        style={{ animationDelay: '0.1s' }}
                        onClick={() => setRoleFilter(roleFilter === 'cashier' ? 'all' : 'cashier')}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cashiers</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.cashiers || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <UserSquare size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="success">Active</Badge>
                            <span>Point of Sale</span>
                        </div>
                    </Card>

                    <Card
                        className={`animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all ${roleFilter === 'technician' ? 'ring-2 ring-amber-500' : 'hover:ring-2 hover:ring-amber-400/50'}`}
                        style={{ animationDelay: '0.2s' }}
                        onClick={() => setRoleFilter(roleFilter === 'technician' ? 'all' : 'technician')}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Technicians</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.technicians || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Wrench size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="warning">Repairs</Badge>
                            <span>Workshop</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Standalone Search & Filter Bar */}
            <Card className="mb-6 animate-slide-up">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search staff name, email, phone..."
                            className="saas-input !pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-3">
                        <select
                            className="saas-input md:w-44 cursor-pointer"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                            <option value="technician">Technician</option>
                        </select>

                        <select
                            className="saas-input md:w-40 cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                            <Button variant="secondary" onClick={handleResetFilters} icon={RotateCcw}>
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Desktop Table */}
            <div className="hidden md:block animate-slide-up">
                <DataTable
                    headers={[
                        'Staff Member',
                        'Email & Contact',
                        'System Role',
                        'Status',
                        { label: 'Actions', className: 'text-center' },
                    ]}
                    isEmpty={!users.data || users.data.length === 0}
                    emptyState={
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <Users size={48} className="mb-3 opacity-30" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No users found matching your search.</p>
                        </div>
                    }
                >
                    {users.data?.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                        <img 
                                            src={user.profile_photo_url} 
                                            alt={user.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: #{user.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        {user.email}
                                    </div>
                                    {user.phone && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            {user.phone}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={15} className="text-slate-400" />
                                    {getRoleBadge(user.role)}
                                </div>
                            </td>
                            <td>
                                {user.status === 'active' ? (
                                    <Badge variant="success">Active</Badge>
                                ) : (
                                    <Badge variant="danger">Inactive</Badge>
                                )}
                            </td>
                            <td className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => handleEdit(user)} className="whitespace-nowrap">
                                        <Pencil size={14} className="mr-1.5" /> Edit
                                    </Button>
                                    {auth?.user?.id !== user.id && (
                                        <button
                                            type="button"
                                            onClick={() => setDeletingUser(user)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                            title="Delete Staff"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {/* Mobile Staff Cards */}
            <Card noPadding className="md:hidden overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.data && users.data.map(user => (
                        <div key={user.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                        <img src={user.profile_photo_url} alt={user.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                        {user.phone && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user.phone}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {getRoleBadge(user.role)}
                                    <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                                        {user.status === 'active' ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleEdit(user)}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
                                >
                                    <Pencil size={13} /> Edit Staff
                                </button>
                                {auth?.user?.id !== user.id && (
                                    <button
                                        type="button"
                                        onClick={() => setDeletingUser(user)}
                                        className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {users.data && users.data.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-400">No users found matching your search.</div>
                    )}
                </div>
            </Card>

            {/* Pagination */}
            <Pagination data={users} />

            {/* Add/Edit Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="4xl">
                <div className="p-6 overflow-y-auto max-h-[90vh] dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            {isEditing ? 'Edit Staff Member' : 'Add New Staff'}
                        </h2>
                        <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Personal Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Personal Details</h4>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="saas-input w-full" 
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        placeholder="e.g. +256 700 123456"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">National ID Number (NIN)</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.nin} 
                                        onChange={e => setFormData({...formData, nin: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
                                    <textarea 
                                        className="saas-input w-full resize-none" 
                                        rows="2"
                                        value={formData.address} 
                                        onChange={e => setFormData({...formData, address: e.target.value})} 
                                    ></textarea>
                                </div>
                            </div>

                            {/* Column 2: Employment Details & Security */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Employment & Security</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">System Role</label>
                                        <select 
                                            className="saas-input w-full disabled:opacity-60" 
                                            value={formData.role} 
                                            onChange={e => {
                                                const newRole = e.target.value;
                                                setFormData({
                                                    ...formData,
                                                    role: newRole,
                                                    permissions: resolveRolePermissions(newRole),
                                                });
                                            }}
                                            disabled={isEditingSelf}
                                            required
                                        >
                                            <option value="admin">Administrator</option>
                                            <option value="manager">Store Manager</option>
                                            <option value="cashier">Cashier</option>
                                            <option value="technician">Repair Technician</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                        <select 
                                            className="saas-input w-full disabled:opacity-60" 
                                            value={formData.status} 
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                            disabled={isEditingSelf}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                {isEditingSelf && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                        Your own admin role and active status are locked to prevent accidental lockout.
                                    </p>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hire Date</label>
                                    <input 
                                        type="date" 
                                        className="saas-input w-full" 
                                        value={formData.hire_date} 
                                        onChange={e => setFormData({...formData, hire_date: e.target.value})} 
                                    />
                                </div>

                                {/* Sales Commission Structure */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Commission</label>
                                        <select
                                            className="saas-input w-full"
                                            value={formData.commission_type || 'none'}
                                            onChange={e => setFormData({
                                                ...formData,
                                                commission_type: e.target.value,
                                                commission_rate: e.target.value === 'none' ? 0 : formData.commission_rate,
                                            })}
                                        >
                                            <option value="none">None (Salary Only)</option>
                                            <option value="per_phone">Fixed UGX / Phone Sold</option>
                                            <option value="profit_percent">% of Net Profit</option>
                                            <option value="revenue_percent">% of Sales Revenue</option>
                                        </select>
                                    </div>
                                    {formData.commission_type && formData.commission_type !== 'none' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                {formData.commission_type === 'per_phone' ? 'Rate (UGX / Phone)' : 'Commission Rate (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                className="saas-input w-full font-bold"
                                                placeholder={formData.commission_type === 'per_phone' ? 'e.g. 20000' : 'e.g. 5'}
                                                value={formData.commission_rate}
                                                onChange={e => setFormData({ ...formData, commission_rate: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pt-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" />
                                        {isEditing ? 'New Password (Optional)' : 'Password'}
                                    </label>
                                    <input 
                                        type="password" 
                                        className="saas-input w-full mb-3" 
                                        value={formData.password} 
                                        onChange={e => setFormData({...formData, password: e.target.value})} 
                                        required={!isEditing}
                                        placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
                                    />
                                    
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                                    <input 
                                        type="password" 
                                        className="saas-input w-full" 
                                        value={formData.password_confirmation} 
                                        onChange={e => setFormData({...formData, password_confirmation: e.target.value})} 
                                        required={!isEditing || formData.password.length > 0}
                                        placeholder="Confirm password"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Granular Staff Permissions Section */}
                        {permissionDefinitions.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                            <ShieldCheck size={14} className="text-indigo-500" /> Granular Permissions
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Fine-tune exactly what this staff member can view or perform.
                                        </p>
                                    </div>
                                    {formData.role !== 'admin' && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, permissions: resolveRolePermissions(formData.role) })}
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                                        >
                                            <RotateCcw size={12} /> Reset to Role Defaults
                                        </button>
                                    )}
                                </div>

                                {formData.role === 'admin' ? (
                                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                                        Administrators always have full, unrestricted access to all modules, cost prices, reports, and personal accounts.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {permissionDefinitions.map((perm) => {
                                            const enabled = Boolean(formData.permissions?.[perm.key]);
                                            return (
                                                <label
                                                    key={perm.key}
                                                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                        enabled
                                                            ? 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{perm.label}</div>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{perm.description}</div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={enabled}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            permissions: {
                                                                ...(formData.permissions || {}),
                                                                [perm.key]: e.target.checked,
                                                            },
                                                        })}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Emergency / Next of Kin Section */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Emergency & Next of Kin Info</h4>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.emergency_contact_name} 
                                            onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Phone</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.emergency_contact_phone} 
                                            onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Next of Kin Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.next_of_kin_name} 
                                            onChange={e => setFormData({...formData, next_of_kin_name: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Next of Kin Phone</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.next_of_kin_phone} 
                                            onChange={e => setFormData({...formData, next_of_kin_phone: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading} icon={Plus}>
                                {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Staff')}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Staff Confirmation Modal */}
            <Modal show={!!deletingUser} onClose={() => setDeletingUser(null)} maxWidth="sm">
                {deletingUser && (
                    <div className="p-6 text-center space-y-4 dark:bg-slate-900">
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Staff Account?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Permanently delete <strong className="text-slate-900 dark:text-white">{deletingUser.name}</strong>?
                                Staff with recorded sales, shifts, repairs, expenses, or invoices should be set to Inactive instead.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingUser(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={15} />
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
