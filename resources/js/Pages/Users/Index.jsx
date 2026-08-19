import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Users, Pencil, Trash2, Search, Plus, ShieldCheck, Mail, Lock, UserSquare, Wrench, RotateCcw, Filter } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/SaaS/PageHeader';
import Card from '@/Components/SaaS/Card';
import Button from '@/Components/SaaS/Button';
import Badge from '@/Components/SaaS/Badge';
import Modal from '@/Components/Modal';

export default function UsersIndex({ auth, users = {}, filters = {}, summary }) {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ 
        id: null, name: '', email: '', role: 'cashier', 
        phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '',
        hire_date: '', status: 'active', nin: '', next_of_kin_name: '', next_of_kin_phone: '',
        password: '', password_confirmation: '' 
    });
    const [loading, setLoading] = useState(false);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [isInitialRender, setIsInitialRender] = useState(true);

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            router.get('/users', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, roleFilter, statusFilter]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
        router.get('/users', {}, { preserveState: true, replace: true });
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
            } else {
                await axios.post('/api/users', formData);
            }
            setShowModal(false);
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error saving user");
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
            password_confirmation: ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
        try {
            await axios.delete(`/api/users/${user.id}`);
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error deleting user");
        }
    };

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
                                password: '', password_confirmation: '' 
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
                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Staff</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_staff || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="primary">System</Badge>
                            <span>Users</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cashiers</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.cashiers || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <UserSquare size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="success">Active</Badge>
                            <span>Point of Sale</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Technicians</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.technicians || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Wrench size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="warning">Repairs</Badge>
                            <span>Workshop</span>
                        </div>
                    </Card>
                </div>
            )}

            <Card noPadding className="animate-slide-up overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-col md:flex-row items-center gap-3 flex-1">
                        <div className="w-full md:w-72 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={16} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search staff name, email, phone..."
                                className="saas-input !pl-9 py-2 text-xs w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Role Filter Dropdown */}
                        <div className="w-full md:w-44">
                            <select
                                className="saas-input py-2 text-xs w-full cursor-pointer"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="cashier">Cashier</option>
                                <option value="technician">Technician</option>
                            </select>
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="w-full md:w-44">
                            <select
                                className="saas-input py-2 text-xs w-full cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                            <Button 
                                variant="secondary" 
                                className="!py-2 !px-3 text-xs" 
                                onClick={handleResetFilters}
                                icon={RotateCcw}
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Showing {users.data?.length || 0} of {users.total || users.data?.length || 0} staff members
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="saas-table w-full whitespace-nowrap">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Email & Contact</th>
                                <th>System Role</th>
                                <th>Status</th>
                                <th className="!text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data && users.data.map((user, i) => (
                                <tr key={user.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                <img 
                                                    src={user.profile_photo_url} 
                                                    alt={user.name} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                                <div className="text-xs text-slate-500">ID: #{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-slate-400" />
                                                {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-[10px]">📞</span>
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={16} className="text-slate-400" />
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
                                            <Button variant="secondary" onClick={() => handleEdit(user)} className="!px-3 !py-1.5 text-sm">
                                                <Pencil size={14} /> Edit
                                            </Button>
                                            {auth?.user?.id !== user.id && (
                                                <Button variant="danger" onClick={() => handleDelete(user)} className="!px-3 !py-1.5 text-sm">
                                                    <Trash2 size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.data && users.data.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users size={48} className="mb-4 opacity-20" />
                                            <p>No users found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {users.links && users.links.length > 3 && (
                    <div className="flex justify-center mt-6 p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <nav className="inline-flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                            {users.links.map((link, k) => (
                                <Link 
                                    key={k}
                                    href={link.url || '#'}
                                    className={`px-4 py-2 text-sm font-medium border-r border-slate-100 dark:border-slate-700 last:border-0 ${
                                        link.active ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    } ${link.url === null ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="4xl">
                <div className="p-6 overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            {isEditing ? 'Edit Staff Member' : 'Add New Staff'}
                        </h2>
                    </div>

                    <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Personal Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Personal Details</h4>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="saas-input w-full" 
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        placeholder="e.g. +256 700 123456"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">National ID Number (NIN)</label>
                                    <input 
                                        type="text" 
                                        className="saas-input w-full" 
                                        value={formData.nin} 
                                        onChange={e => setFormData({...formData, nin: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Physical Address</label>
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
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employment & Security</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">System Role</label>
                                        <select 
                                            className="saas-input w-full" 
                                            value={formData.role} 
                                            onChange={e => setFormData({...formData, role: e.target.value})}
                                            required
                                        >
                                            <option value="admin">Administrator</option>
                                            <option value="manager">Store Manager</option>
                                            <option value="cashier">Cashier</option>
                                            <option value="technician">Repair Technician</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                                        <select 
                                            className="saas-input w-full" 
                                            value={formData.status} 
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Hire Date</label>
                                    <input 
                                        type="date" 
                                        className="saas-input w-full" 
                                        value={formData.hire_date} 
                                        onChange={e => setFormData({...formData, hire_date: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="pt-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
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
                                    
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
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

                        {/* Emergency / Next of Kin Section */}
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Emergency & Next of Kin Info</h4>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.emergency_contact_name} 
                                            onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
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
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Next of Kin Name</label>
                                        <input 
                                            type="text" 
                                            className="saas-input w-full" 
                                            value={formData.next_of_kin_name} 
                                            onChange={e => setFormData({...formData, next_of_kin_name: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Next of Kin Phone</label>
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading} icon={Plus}>
                                {isEditing ? 'Save Changes' : 'Create Staff'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
