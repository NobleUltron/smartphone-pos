import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Search, Plus, Pencil, Trash2, Smartphone, Printer, Package, Layers, AlertTriangle, DollarSign, Scan, FileSpreadsheet, X, Wrench, MoreHorizontal, ChevronDown, Undo2, RotateCcw, Wallet, CreditCard, RefreshCw, Clock } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';
import DataTable from '@/Components/SaaS/DataTable';
import Pagination from '@/Components/SaaS/Pagination';
import LabelCard from '@/Components/SaaS/LabelCard';
import Modal from '@/Components/Modal';

export default function Inventory({ auth, products, allProducts = [], categories = [], brands = [], filters = {}, summary, partners = [], paymentAccounts = [], suppliers = [] }) {
    // Add Category Modal State
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Add Brand Modal State
    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [newBrand, setNewBrand] = useState('');

    // Add Product Modal State
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ id: null, category_id: '', brand_id: '', model_name: '', storage_capacity: '', type: 'serialized', sku: '', quantity: '', cost_price: '', selling_price: '' });

    const [showAddModal, setShowAddModal] = useState(false);
    const [productId, setProductId] = useState('');
    const [imei, setImei] = useState('');
    const [quantityToAdd, setQuantityToAdd] = useState('');
    const [condition, setCondition] = useState('Brand New');
    const [costPrice, setCostPrice] = useState('');
    const [storageCapacity, setStorageCapacity] = useState('');
    const [stockColor, setStockColor] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [partnerInvestorId, setPartnerInvestorId] = useState('');
    const [refurbCost, setRefurbCost] = useState('');
    const [refurbNotes, setRefurbNotes] = useState('');
    const [refurbAccountId, setRefurbAccountId] = useState('');
    const [loading, setLoading] = useState(false);

    // Edit Stock Modal State
    const [showEditStockModal, setShowEditStockModal] = useState(false);
    const [editingStock, setEditingStock] = useState(null);

    // Add Refurbishment / Repair Cost Modal State
    const [refurbDevice, setRefurbDevice] = useState(null);
    const [refurbForm, setRefurbForm] = useState({
        amount: '',
        description: '',
        payment_account_id: '',
        new_selling_price: '',
        new_condition: '',
        new_status: '',
    });

    // Return to Supplier Modal State
    const [returnDevice, setReturnDevice] = useState(null);
    const [returnForm, setReturnForm] = useState({
        supplier_id: '',
        resolution: 'refund',
        amount: '',
        payment_account_id: '',
        replacement_imei: '',
        replacement_product_id: '',
        replacement_storage: '',
        replacement_color: '',
        replacement_condition: 'Brand New',
        replacement_cost_price: '',
        replacement_selling_price: '',
        return_credit_value: '',
        difference_settlement: 'wallet',
        reason: '',
        notes: '',
    });
    const [receivingId, setReceivingId] = useState(null);

    // Bulk Return to Supplier Modal State
    const [bulkReturnProduct, setBulkReturnProduct] = useState(null);
    const [bulkReturnForm, setBulkReturnForm] = useState({
        supplier_id: '',
        quantity: 1,
        resolution: 'refund',
        amount: '',
        payment_account_id: '',
        reason: '',
        notes: '',
    });

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category_id || 'all');
    const [selectedBrand, setSelectedBrand] = useState(filters.brand_id || 'all');
    const [selectedProduct, setSelectedProduct] = useState(filters.product_id || 'all');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [stockStatus, setStockStatus] = useState(filters.stock_status || 'all');
    const [isInitialRender, setIsInitialRender] = useState(true);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewProduct, setViewProduct] = useState(null);
    const [imeisList, setImeisList] = useState([]);
    const [imeiSearch, setImeiSearch] = useState('');
    const [imeiStatusFilter, setImeiStatusFilter] = useState('all');
    const [imeiPage, setImeiPage] = useState(1);
    const [imeiPerPage, setImeiPerPage] = useState(10);

    useEffect(() => {
        setImeiPage(1);
    }, [imeiSearch, imeiStatusFilter, viewProduct?.id]);

    // Label Preview State
    const [showLabelPreview, setShowLabelPreview] = useState(false);
    const [previewLabelData, setPreviewLabelData] = useState(null);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef(null);

    useEffect(() => {
        if (!showMoreMenu) return;
        const handleClickOutside = (e) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoreMenu]);

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }

        const timer = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCategory && selectedCategory !== 'all') params.category_id = selectedCategory;
            if (selectedBrand && selectedBrand !== 'all') params.brand_id = selectedBrand;
            if (selectedProduct && selectedProduct !== 'all') params.product_id = selectedProduct;
            if (selectedType && selectedType !== 'all') params.type = selectedType;
            if (stockStatus && stockStatus !== 'all') params.stock_status = stockStatus;

            router.get('/inventory', params, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, selectedBrand, selectedProduct, selectedType, stockStatus]);

    const handleAddProductSubmit = async () => {
        if (!newProduct.category_id || !newProduct.brand_id || !newProduct.model_name) {
            return toast.error("Please fill all fields");
        }
        setLoading(true);
        try {
            if (isEditingProduct) {
                await axios.put(`/api/inventory/products/${newProduct.id}`, newProduct);
                toast.success("Product model updated successfully!");
            } else {
                await axios.post('/api/inventory/products', newProduct);
                toast.success("Product model added successfully!");
            }
            setShowAddProductModal(false);
            setNewProduct({ id: null, category_id: '', brand_id: '', model_name: '', storage_capacity: '', type: 'serialized', sku: '', quantity: '', cost_price: '', selling_price: '' });
            setIsEditingProduct(false);
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error saving product");
        }
        setLoading(false);
    };

    const handleEditProduct = (product) => {
        setNewProduct({
            id: product.id,
            category_id: product.category_id,
            brand_id: product.brand_id || '',
            model_name: product.model_name,
            storage_capacity: product.storage_capacity || '',
            type: product.type || 'serialized',
            sku: product.sku || '',
            quantity: product.quantity || '',
            cost_price: product.cost_price || '',
            selling_price: product.selling_price || ''
        });
        setIsEditingProduct(true);
        setShowAddProductModal(true);
    };

    const handleAddBrandSubmit = async () => {
        if (!newBrand) return toast.error("Please enter a brand name");
        setLoading(true);
        try {
            await axios.post('/api/inventory/brands', { name: newBrand });
            toast.success("Brand added successfully!");
            setShowAddBrandModal(false);
            setNewBrand('');
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error adding brand");
        }
        setLoading(false);
    };

    const handleAddCategorySubmit = async () => {
        if (!newCategory) return toast.error("Please enter a category name");
        setLoading(true);
        try {
            await axios.post('/api/inventory/categories', { name: newCategory });
            toast.success("Category added successfully!");
            setShowAddCategoryModal(false);
            setNewCategory('');
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error adding category");
        }
        setLoading(false);
    };

    const handleAddSubmit = async () => {
        const isBulk = allProducts?.find(p => p.id == productId)?.type === 'bulk';
        
        if (isBulk) {
            if (!productId || !quantityToAdd) return toast.error("Please specify product and quantity");
        } else {
            if (!productId || !imei || !costPrice || !storageCapacity || !stockColor || !sellingPrice) return toast.error("Please fill all fields");
        }
        
        setLoading(true);
        try {
            await axios.post('/api/inventory/stock', isBulk ? {
                product_id: productId,
                quantity: quantityToAdd,
                cost_price: costPrice,
                selling_price: sellingPrice
            } : {
                product_id: productId,
                imei,
                condition,
                cost_price: costPrice,
                storage_capacity: storageCapacity,
                color: stockColor,
                selling_price: sellingPrice,
                partner_investor_id: partnerInvestorId || null,
                refurbishment_cost: refurbCost ? parseFloat(refurbCost) : 0,
                refurbishment_notes: refurbNotes || null,
                refurbishment_account_id: refurbAccountId || null
            });
            toast.success("Stock added successfully!");
            setShowAddModal(false);
            setImei('');
            setQuantityToAdd('');
            setCostPrice('');
            setStorageCapacity('');
            setStockColor('');
            setSellingPrice('');
            setPartnerInvestorId('');
            setRefurbCost('');
            setRefurbNotes('');
            setRefurbAccountId('');
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error adding stock");
        }
        setLoading(false);
    };

    const openRefurbModal = (item) => {
        setRefurbDevice(item);
        setRefurbForm({
            amount: '',
            description: '',
            payment_account_id: paymentAccounts[0]?.id || '',
            new_selling_price: item.selling_price ?? '',
            new_condition: item.condition || 'Refurbished',
            new_status: item.status === 'Defective' ? 'In Stock' : item.status,
        });
    };

    const handleRefurbSubmit = async () => {
        if (!refurbDevice) return;
        const parsedAmount = parseFloat(refurbForm.amount);
        if (!parsedAmount || parsedAmount <= 0) {
            return toast.error("Please enter a repair cost greater than 0");
        }
        if (!refurbForm.description?.trim()) {
            return toast.error("Please describe the repair / parts (e.g. Replaced OLED screen)");
        }

        setLoading(true);
        try {
            const payload = {
                amount: parsedAmount,
                description: refurbForm.description.trim(),
                payment_account_id: refurbForm.payment_account_id || null,
                new_selling_price: refurbForm.new_selling_price !== '' ? parseFloat(refurbForm.new_selling_price) : null,
                new_condition: refurbForm.new_condition || null,
                new_status: refurbForm.new_status || null,
            };
            const res = await axios.post(`/api/inventory/stock/${refurbDevice.id}/refurbish`, payload);
            toast.success(res.data?.message || "Repair cost added to device cost basis!");
            setImeisList(imeisList.map(i => i.id === refurbDevice.id ? res.data.device : i));
            setRefurbDevice(null);
            router.reload({ only: ['summary', 'products', 'paymentAccounts'], preserveScroll: true });
        } catch (error) {
            toast.error(error.response?.data?.message || "Error recording refurbishment cost");
        }
        setLoading(false);
    };

    const openReturnModal = (item) => {
        setReturnDevice(item);
        setReturnForm({
            supplier_id: item.original_supplier_id || '',
            resolution: 'refund',
            amount: item.cost_price ?? '',
            payment_account_id: paymentAccounts[0]?.id || '',
            replacement_imei: '',
            replacement_product_id: item.product_id || viewProduct?.id || '',
            replacement_storage: item.storage_capacity || '',
            replacement_color: item.color || '',
            replacement_condition: item.condition || 'Brand New',
            replacement_cost_price: item.cost_price ?? '',
            replacement_selling_price: item.selling_price ?? '',
            return_credit_value: item.cost_price ?? '',
            difference_settlement: 'wallet',
            reason: '',
            notes: '',
        });
    };

    const handleReturnSubmit = async () => {
        if (!returnDevice) return;
        if (!returnForm.supplier_id) return toast.error('Please select a supplier');
        if (!returnForm.reason?.trim()) return toast.error('Please provide a reason for returning this device');
        if (returnForm.resolution === 'refund' && !returnForm.payment_account_id) {
            return toast.error('Please select the business wallet that received the refund');
        }
        if (returnForm.resolution === 'replacement') {
            if (!returnForm.replacement_imei?.trim()) {
                return toast.error('Please enter the replacement device IMEI');
            }
            const swapDiff = Number(returnForm.replacement_cost_price || 0) - Number(returnForm.return_credit_value || 0);
            if (swapDiff !== 0 && returnForm.difference_settlement === 'wallet' && !returnForm.payment_account_id) {
                return toast.error('Please select a business wallet for the price difference');
            }
        }

        setLoading(true);
        try {
            const isSwap = returnForm.resolution === 'replacement';
            const swapDiff = isSwap ? (Number(returnForm.replacement_cost_price || 0) - Number(returnForm.return_credit_value || 0)) : 0;
            const needsWallet = returnForm.resolution === 'refund' || (isSwap && swapDiff !== 0 && returnForm.difference_settlement === 'wallet');

            const payload = {
                supplier_id: returnForm.supplier_id,
                resolution: returnForm.resolution,
                amount: ['refund', 'supplier_credit'].includes(returnForm.resolution) ? parseFloat(returnForm.amount || 0) : 0,
                payment_account_id: needsWallet ? returnForm.payment_account_id : null,
                replacement_imei: isSwap ? returnForm.replacement_imei.trim() : null,
                replacement_product_id: isSwap && returnForm.replacement_product_id ? returnForm.replacement_product_id : null,
                replacement_storage: isSwap ? (returnForm.replacement_storage || null) : null,
                replacement_color: isSwap ? (returnForm.replacement_color || null) : null,
                replacement_condition: isSwap ? (returnForm.replacement_condition || null) : null,
                replacement_cost_price: isSwap && returnForm.replacement_cost_price !== '' ? parseFloat(returnForm.replacement_cost_price) : null,
                replacement_selling_price: isSwap && returnForm.replacement_selling_price !== '' ? parseFloat(returnForm.replacement_selling_price) : null,
                return_credit_value: isSwap && returnForm.return_credit_value !== '' ? parseFloat(returnForm.return_credit_value) : null,
                difference_settlement: isSwap && swapDiff !== 0 ? returnForm.difference_settlement : null,
                reason: returnForm.reason.trim(),
                notes: returnForm.notes?.trim() || null,
            };
            const res = await axios.post(`/api/inventory/stock/${returnDevice.id}/return-supplier`, payload);
            toast.success(res.data?.message || 'Device returned to supplier!');
            setImeisList(prev => {
                const updated = prev.map(i => i.id === returnDevice.id ? res.data.device : i);
                return (res.data.replacement_device && res.data.replacement_same_product)
                    ? [res.data.replacement_device, ...updated]
                    : updated;
            });
            setReturnDevice(null);
            router.reload({ only: ['summary', 'products', 'paymentAccounts', 'suppliers'], preserveScroll: true });
        } catch (error) {
            const errs = error.response?.data?.errors;
            const firstErr = errs ? Object.values(errs)[0]?.[0] : null;
            toast.error(firstErr || error.response?.data?.message || 'Error processing supplier return');
        }
        setLoading(false);
    };

    const openBulkReturnModal = (product) => {
        const unitCost = Number(product.cost_price || 0);
        setBulkReturnProduct(product);
        setBulkReturnForm({
            supplier_id: '',
            quantity: 1,
            resolution: 'refund',
            amount: unitCost,
            payment_account_id: paymentAccounts[0]?.id || '',
            reason: '',
            notes: '',
        });
    };

    const handleBulkReturnSubmit = async () => {
        if (!bulkReturnProduct) return;
        const qty = parseInt(bulkReturnForm.quantity, 10);
        if (!bulkReturnForm.supplier_id) return toast.error('Please select a supplier');
        if (!qty || qty < 1 || qty > Number(bulkReturnProduct.quantity || 0)) {
            return toast.error(`Quantity must be between 1 and ${bulkReturnProduct.quantity}`);
        }
        if (!bulkReturnForm.reason?.trim()) return toast.error('Please enter a reason for returning these items');
        if (bulkReturnForm.resolution === 'refund' && !bulkReturnForm.payment_account_id) {
            return toast.error('Please select the business wallet receiving the refund');
        }

        setLoading(true);
        try {
            const res = await axios.post(`/api/inventory/products/${bulkReturnProduct.id}/return-bulk-supplier`, {
                supplier_id: bulkReturnForm.supplier_id,
                quantity: qty,
                resolution: bulkReturnForm.resolution,
                amount: ['refund', 'supplier_credit'].includes(bulkReturnForm.resolution) ? parseFloat(bulkReturnForm.amount || 0) : 0,
                payment_account_id: bulkReturnForm.resolution === 'refund' ? bulkReturnForm.payment_account_id : null,
                reason: bulkReturnForm.reason.trim(),
                notes: bulkReturnForm.notes?.trim() || null,
            });
            toast.success(res.data?.message || 'Bulk return recorded!');
            if (res.data?.product && viewProduct?.id === res.data.product.id) {
                setViewProduct(res.data.product);
            }
            setBulkReturnProduct(null);
            router.reload({ only: ['summary', 'products', 'paymentAccounts', 'suppliers'], preserveScroll: true });
        } catch (error) {
            const errs = error.response?.data?.errors;
            const firstErr = errs ? Object.values(errs)[0]?.[0] : null;
            toast.error(firstErr || error.response?.data?.message || 'Error processing bulk return');
        }
        setLoading(false);
    };

    const handleReceiveFromSupplier = async (item) => {
        setReceivingId(item.id);
        try {
            const res = await axios.post(`/api/inventory/stock/${item.id}/receive-from-supplier`, {});
            toast.success(res.data?.message || 'Device received back into stock!');
            setImeisList(prev => prev.map(i => i.id === item.id ? res.data.device : i));
            router.reload({ only: ['summary', 'products'], preserveScroll: true });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error receiving device back from supplier');
        }
        setReceivingId(null);
    };

    const handleViewStock = async (product) => {
        setViewProduct(product);
        setShowViewModal(true);
        if (product.type === 'bulk') {
            setImeisList([]);
            return;
        }
        try {
            const res = await axios.get(`/api/inventory/${product.id}/stock`);
            setImeisList(res.data.imeis);
        } catch (error) {
            toast.error("Error fetching stock");
        }
    };

    const handleEditStockItem = (item) => {
        setEditingStock(item);
        setShowEditStockModal(true);
    };

    const handleUpdateStockSubmit = async () => {
        if (!editingStock.imei || !editingStock.cost_price || !editingStock.storage_capacity || !editingStock.color || !editingStock.selling_price) {
            return toast.error("Please fill all fields");
        }
        setLoading(true);
        try {
            const res = await axios.put(`/api/inventory/stock/${editingStock.id}`, editingStock);
            toast.success("Stock updated successfully!");
            setShowEditStockModal(false);
            setImeisList(imeisList.map(i => i.id === editingStock.id ? res.data.device : i));
            router.reload({ only: ['products', 'summary'] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Error updating stock");
        }
        setLoading(false);
    };

    const handleDeleteStockItem = (id) => {
        setDeleteConfirm({
            isOpen: true,
            title: "Delete Stock Item",
            message: "Are you sure you want to delete this stock item? This action cannot be undone.",
            onConfirm: async () => {
                setDeleteConfirm({ ...deleteConfirm, isOpen: false });
                try {
                    await axios.delete(`/api/inventory/stock/${id}`);
                    setImeisList(imeisList.filter(i => i.id !== id));
                    toast.success("Stock item deleted successfully!");
                    router.reload({ only: ['products', 'summary'] });
                } catch (error) {
                    toast.error(error.response?.data?.error || "Error deleting stock. It may be linked to a sale.");
                }
            }
        });
    };

    const handleDeleteProductModel = (id) => {
        setDeleteConfirm({
            isOpen: true,
            title: "Delete Product Model",
            message: "Are you sure you want to delete this product model? This action cannot be undone.",
            onConfirm: async () => {
                setDeleteConfirm({ ...deleteConfirm, isOpen: false });
                try {
                    await axios.delete(`/api/inventory/products/${id}`);
                    toast.success("Product model deleted successfully!");
                    router.reload();
                } catch (error) {
                    toast.error(error.response?.data?.error || "Cannot delete product model. It may have stock or sales linked to it.");
                }
            }
        });
    };

    const handleDeleteBrand = (id) => {
        setDeleteConfirm({
            isOpen: true,
            title: "Delete Brand",
            message: "Are you sure you want to delete this brand? This action cannot be undone.",
            onConfirm: async () => {
                setDeleteConfirm({ ...deleteConfirm, isOpen: false });
                try {
                    await axios.delete(`/api/inventory/brands/${id}`);
                    toast.success("Brand deleted successfully!");
                    setSelectedBrand('all');
                    router.reload();
                } catch (error) {
                    toast.error(error.response?.data?.error || "Cannot delete brand. It may have products linked to it.");
                }
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Inventory Management" />

            <PageHeader 
                title="Inventory Management"
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Inventory' }]}
                actions={
                    <>
                        <Button variant="primary" onClick={() => setShowAddModal(true)} icon={Plus}>Add Stock</Button>
                        <a 
                            href="/api/export/inventory"
                            className="saas-btn saas-btn-glass text-xs"
                            title="Export Full Inventory as Excel Spreadsheet"
                        >
                            <FileSpreadsheet size={15} /> Export Excel
                        </a>
                        <Button variant="glass" className="text-xs" onClick={() => router.visit(route('inventory.audits.index'))} icon={Scan}>Stock Audit</Button>
                        <div className="relative" ref={moreMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowMoreMenu((prev) => !prev)}
                                className="saas-btn saas-btn-glass text-xs flex items-center gap-1.5"
                            >
                                <MoreHorizontal size={15} />
                                <span>More</span>
                                <ChevronDown size={14} className={`transition-transform duration-150 ${showMoreMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showMoreMenu && (
                                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 text-left animate-fade-in">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMoreMenu(false);
                                            router.visit(route('inventory.labels.studio'));
                                        }}
                                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Printer size={15} className="text-indigo-500 shrink-0" />
                                        <span>IMEI Labels</span>
                                    </button>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMoreMenu(false);
                                            setIsEditingProduct(false);
                                            setNewProduct({ id: null, category_id: '', brand_id: '', model_name: '', type: 'serialized' });
                                            setShowAddProductModal(true);
                                        }}
                                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Plus size={15} className="text-slate-400 shrink-0" />
                                        <span>Add Product Model</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMoreMenu(false);
                                            setShowAddBrandModal(true);
                                        }}
                                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Plus size={15} className="text-slate-400 shrink-0" />
                                        <span>Add Brand</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMoreMenu(false);
                                            setShowAddCategoryModal(true);
                                        }}
                                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Plus size={15} className="text-slate-400 shrink-0" />
                                        <span>Add Category</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                }
            />

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <Card
                        onClick={() => setStockStatus('all')}
                        className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-blue-500/40 transition-all"
                        style={{ animationDelay: '0.0s' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Product Lines</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_products || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Layers size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="primary">Database</Badge>
                            <span>SKUs/Models</span>
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStockStatus('in_stock')}
                        className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-indigo-500/40 transition-all"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Units</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.total_stock_units || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Package size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="success">In Stock</Badge>
                            <span>Physical Items</span>
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStockStatus('low_stock')}
                        className="animate-slide-up relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-rose-500/40 transition-all"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{summary.low_stock_count || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                <AlertTriangle size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="danger">Critical</Badge>
                            <span>Below 5 Units</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Inventory Value</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                    {new Intl.NumberFormat('en-US').format(summary.inventory_value || 0)}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Badge variant="success">Capital</Badge>
                            <span>Cost Price (UGX)</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Aging / Slow-Moving Stock Alert Banner */}
            {Number(summary?.aging_30_units || 0) > 0 && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
                            <Clock size={18} />
                        </div>
                        <div className="text-xs sm:text-sm">
                            <span className="font-bold text-amber-900 dark:text-amber-200">
                                {summary.aging_30_units} phone{summary.aging_30_units === 1 ? '' : 's'} in stock 30+ days
                            </span>
                            <span className="text-amber-800 dark:text-amber-300/90">
                                {' '}— <strong>UGX {Number(summary.aging_30_value || 0).toLocaleString()}</strong> capital tied up
                                {Number(summary.aging_60_units || 0) > 0 && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                        {summary.aging_60_units} critical 60d+
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setStockStatus(stockStatus === 'aging_30' ? 'all' : 'aging_30')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                stockStatus === 'aging_30'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/60'
                            }`}
                        >
                            {stockStatus === 'aging_30' ? 'Showing 30d+ ✓' : 'Filter 30d+'}
                        </button>
                        {Number(summary.aging_60_units || 0) > 0 && (
                            <button
                                type="button"
                                onClick={() => setStockStatus(stockStatus === 'aging_60' ? 'all' : 'aging_60')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                    stockStatus === 'aging_60'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50'
                                }`}
                            >
                                {stockStatus === 'aging_60' ? 'Showing 60d+ ✓' : 'Critical 60d+'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Segmented Stock Status Tabs */}
            <div className="flex items-center overflow-x-auto pb-1 sm:pb-0 mb-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setStockStatus('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            stockStatus === 'all'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                        }`}
                    >
                        <span>All Products</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            stockStatus === 'all'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                        }`}>
                            {summary?.total_products || 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStockStatus('in_stock')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            stockStatus === 'in_stock'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>In Stock Only</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            stockStatus === 'in_stock'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                        }`}>
                            {summary?.in_stock_count ?? (summary?.total_stock_units || 0)}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStockStatus('low_stock')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            stockStatus === 'low_stock'
                                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                        <span>Low Stock (&lt; 5)</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            stockStatus === 'low_stock'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                        }`}>
                            {summary?.low_stock_count || 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStockStatus('out_of_stock')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            stockStatus === 'out_of_stock'
                                ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm ring-1 ring-rose-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span>Out of Stock</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            stockStatus === 'out_of_stock'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                        }`}>
                            {summary?.out_of_stock_count || 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStockStatus('aging_30')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            stockStatus === 'aging_30' || stockStatus === 'aging_60'
                                ? 'bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-400 shadow-sm ring-1 ring-orange-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50'
                        }`}
                    >
                        <Clock size={12} className="text-orange-500 shrink-0" />
                        <span>Slow-Moving (30d+)</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            stockStatus === 'aging_30' || stockStatus === 'aging_60'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                                : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                        }`}>
                            {summary?.aging_products_count || 0}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 saas-input-icon-wrapper relative">
                        <Search size={18} className="saas-input-icon" />
                        <input 
                            type="text" 
                            className="saas-input pr-10" 
                            placeholder="Search by model, brand, IMEI, SKU, storage, or color..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="md:w-44">
                        <select 
                            className="saas-input pl-4"
                            value={selectedType} 
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="serialized">Serialized (Phones)</option>
                            <option value="bulk">Bulk (Accessories)</option>
                        </select>
                    </div>

                    <div className="md:w-48">
                        <select 
                            className="saas-input pl-4"
                            value={selectedCategory} 
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedBrand('all');
                                setSelectedProduct('all');
                            }}
                        >
                            <option value="all">All Categories</option>
                            {categories?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:w-48 flex items-center gap-2">
                        <select 
                            className="saas-input pl-4 w-full"
                            value={selectedBrand} 
                            onChange={(e) => {
                                setSelectedBrand(e.target.value);
                                setSelectedProduct('all');
                            }}
                        >
                            <option value="all">All Brands</option>
                            {(selectedCategory === 'all'
                                ? brands
                                : allProducts
                                    ?.filter(p => p.category_id == selectedCategory)
                                    .map(p => p.brand)
                                    .filter(Boolean)
                                    .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                            )?.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        {selectedBrand !== 'all' && (
                            <button title="Delete Selected Brand" className="p-2 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors" onClick={() => handleDeleteBrand(selectedBrand)}>
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>

                    {selectedBrand !== 'all' && (
                        <div className="md:w-48">
                            <select 
                                className="saas-input pl-4"
                                value={selectedProduct} 
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="all">All Models</option>
                                {allProducts
                                    ?.filter(p => (selectedCategory === 'all' || p.category_id == selectedCategory) && p.brand_id == selectedBrand)
                                    .sort((a, b) => a.model_name.localeCompare(b.model_name))
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.model_name}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {(searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedProduct !== 'all' || selectedType !== 'all' || stockStatus !== 'all') && (
                        <div>
                            <Button variant="outline" onClick={() => { 
                                setSearchQuery(''); 
                                setSelectedCategory('all'); 
                                setSelectedBrand('all');
                                setSelectedProduct('all');
                                setSelectedType('all');
                                setStockStatus('all');
                            }}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Inventory Table */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <DataTable 
                    headers={['Brand & Model', 'Category', 'In Stock', 'Pricing & Value', { label: 'Actions', className: '!text-center' }]}
                    isEmpty={!products.data || products.data.length === 0}
                    emptyState={
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
                                {stockStatus === 'in_stock' 
                                    ? 'No in-stock products found' 
                                    : stockStatus === 'low_stock'
                                        ? 'No low stock products found'
                                        : stockStatus === 'out_of_stock'
                                            ? 'No out-of-stock products found'
                                            : 'No products found'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                {stockStatus !== 'all' || searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedType !== 'all'
                                    ? 'Try resetting or adjusting your active filters to view other inventory items.'
                                    : 'There are no products matching your search criteria, or your inventory is currently empty.'}
                            </p>
                            {(searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedProduct !== 'all' || selectedType !== 'all' || stockStatus !== 'all') && (
                                <div className="mt-4">
                                    <Button variant="outline" onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                        setSelectedBrand('all');
                                        setSelectedProduct('all');
                                        setSelectedType('all');
                                        setStockStatus('all');
                                    }}>
                                        Reset All Filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    }
                >
                    {products?.data && products.data.map((product) => {
                        const qty = product.type === 'bulk' ? Number(product.quantity || 0) : Number(product.stock_count || 0);
                        const stockBadgeVariant = qty <= 0 ? 'danger' : (qty < 5 ? 'warning' : 'success');
                        const bulkCostVal = Math.max(0, qty) * Number(product.cost_price || 0);
                        const serializedCostVal = Number(product.stock_cost_value || 0);
                        const minP = Number(product.min_selling_price || 0);
                        const maxP = Number(product.max_selling_price || 0);

                        return (
                        <tr key={product.id}>
                            <td>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex justify-center items-center font-bold text-white shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 shrink-0">
                                        {product.brand?.name ? product.brand.name.charAt(0) : 'P'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                            <span>{product.brand?.name} {product.model_name}</span>
                                            {product.storage_capacity && (
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    {product.storage_capacity}
                                                </span>
                                            )}
                                        </div>
                                        {product.sku && <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</div>}
                                    </div>
                                </div>
                            </td>
                            <td>
                                <Badge variant="neutral">{product.category?.name}</Badge>
                            </td>
                            <td>
                                <div className="flex flex-col gap-1.5 items-start">
                                    {product.type === 'bulk' ? (
                                        <Badge variant={stockBadgeVariant}>Qty: {qty}</Badge>
                                    ) : (
                                        <>
                                            <Badge variant={stockBadgeVariant}>In Stock: {qty}</Badge>
                                            {Number(product.aging_30_count || 0) > 0 && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    Number(product.aging_60_count || 0) > 0
                                                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                                }`}>
                                                    <Clock size={10} />
                                                    {product.aging_30_count} aging 30d+
                                                    {Number(product.aging_60_count || 0) > 0 ? ` (${product.aging_60_count} >60d)` : ''}
                                                </span>
                                            )}
                                            {(product.sold_count > 0 || product.defective_count > 0) && (
                                                <div className="flex gap-2 text-[11px] font-medium">
                                                    {product.sold_count > 0 && <span className="text-slate-500 dark:text-slate-400">Sold: {product.sold_count}</span>}
                                                    {product.sold_count > 0 && product.defective_count > 0 && <span className="text-slate-300 dark:text-slate-600">|</span>}
                                                    {product.defective_count > 0 && <span className="text-rose-500 dark:text-rose-400">Defective: {product.defective_count}</span>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                            <td>
                                {product.type === 'bulk' ? (
                                    <div className="text-xs space-y-0.5">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            UGX {Number(product.selling_price || 0).toLocaleString()}
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400">
                                            Cost Val: {bulkCostVal.toLocaleString()} UGX
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs space-y-0.5">
                                        {qty > 0 && minP > 0 ? (
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {minP === maxP
                                                    ? `UGX ${minP.toLocaleString()}`
                                                    : `UGX ${minP.toLocaleString()} – ${maxP.toLocaleString()}`}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 italic">No active units</div>
                                        )}
                                        {serializedCostVal > 0 && (
                                            <div className="text-slate-500 dark:text-slate-400">
                                                Cost Val: {serializedCostVal.toLocaleString()} UGX
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="text-center">
                                <div className="flex justify-center gap-2 items-center">
                                    <Button variant="outline" className="!py-1.5 !px-3 !text-xs text-rose-600 dark:text-rose-400 hover:!bg-rose-50 dark:hover:!bg-rose-950/50 hover:!border-rose-200 dark:hover:!border-rose-800" onClick={() => { setProductId(product.id); setShowAddModal(true); }} icon={Plus}>
                                        Add Stock
                                    </Button>
                                    <button title="Edit Product Model" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors" onClick={() => handleEditProduct(product)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button title="Delete Product Model" className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors" onClick={() => handleDeleteProductModel(product.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => { setImeiSearch(''); setImeiStatusFilter('all'); handleViewStock(product); }}>
                                        View Stock
                                    </Button>
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                </DataTable>
            </div>

            {/* Pagination Component */}
            <Pagination data={products} className="mt-6 animate-slide-up" />

            {/* --- Modals (Applying SaaS Forms) --- */}
            
            {/* Add Category Modal */}
            <Modal show={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} maxWidth="md">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Category</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Group products by device or accessory category</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowAddCategoryModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="saas-form-group !mb-0">
                            <label className="saas-label">Category Name</label>
                            <input type="text" className="saas-input" placeholder="e.g. Smartphones" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowAddCategoryModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddCategorySubmit} isLoading={loading}>Save Category</Button>
                    </div>
                </div>
            </Modal>

            {/* Add Brand Modal */}
            <Modal show={showAddBrandModal} onClose={() => setShowAddBrandModal(false)} maxWidth="md">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Brand</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Register a manufacturer or accessory brand</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowAddBrandModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="saas-form-group !mb-0">
                            <label className="saas-label">Brand Name</label>
                            <input type="text" className="saas-input" placeholder="e.g. Apple" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowAddBrandModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddBrandSubmit} isLoading={loading}>Save Brand</Button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Product Modal */}
            <Modal show={showAddProductModal} onClose={() => setShowAddProductModal(false)} maxWidth="md">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Package size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEditingProduct ? 'Edit Product Model' : 'Add New Product Model'}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{isEditingProduct ? 'Update catalog model details' : 'Add a smartphone model or bulk accessory to catalog'}</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowAddProductModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        
                        <div className="saas-form-group">
                            <label className="saas-label">Category</label>
                            <select className="saas-input pl-4" value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}>
                                <option value="">-- Choose Category --</option>
                                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="saas-form-group">
                            <label className="saas-label">Brand</label>
                            <select className="saas-input pl-4" value={newProduct.brand_id} onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}>
                                <option value="">-- Choose Brand --</option>
                                {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="saas-form-group">
                            <label className="saas-label">Model Name</label>
                            <input type="text" className="saas-input" placeholder="e.g. iPhone 15 Pro" value={newProduct.model_name} onChange={e => setNewProduct({...newProduct, model_name: e.target.value})} />
                        </div>
                        <div className="saas-form-group">
                            <label className="saas-label">Inventory Type</label>
                            <select className="saas-input pl-4" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
                                <option value="serialized">Serialized (Smartphones)</option>
                                <option value="bulk">Bulk (Accessories / Parts)</option>
                            </select>
                        </div>

                        {newProduct.type === 'bulk' && (
                            <>
                                <div className="saas-form-group">
                                    <label className="saas-label">
                                        Storage Capacity <span className="text-slate-400 font-normal">(Optional for Storage Devices & Memory)</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        className="saas-input" 
                                        placeholder="e.g. 256GB, 512GB, 1TB" 
                                        value={newProduct.storage_capacity || ''} 
                                        onChange={e => setNewProduct({...newProduct, storage_capacity: e.target.value})} 
                                    />
                                    {/* Quick Capacity Select Pills */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'].map(cap => (
                                            <button
                                                key={cap}
                                                type="button"
                                                onClick={() => setNewProduct({...newProduct, storage_capacity: cap})}
                                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                                                    newProduct.storage_capacity === cap
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {cap}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="saas-form-group">
                                    <label className="saas-label">SKU / Barcode</label>
                                    <input type="text" className="saas-input" placeholder="e.g. CHG-001" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="saas-label">Quantity</label>
                                        <input type="number" className="saas-input" placeholder="0" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="saas-label">Cost (UGX)</label>
                                        <input type="number" className="saas-input" placeholder="0" value={newProduct.cost_price} onChange={e => setNewProduct({...newProduct, cost_price: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="saas-label">Price (UGX)</label>
                                        <input type="number" className="saas-input" placeholder="0" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} />
                                    </div>
                                </div>
                            </>
                        )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3 shrink-0">
                            <Button variant="secondary" onClick={() => setShowAddProductModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddProductSubmit} isLoading={loading}>
                                {isEditingProduct ? 'Update Product' : 'Save Product'}
                            </Button>
                        </div>
                    </div>
            </Modal>

            {/* Add Stock Modal */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="lg">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Stock</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Scan IMEI unit or add bulk accessory inventory</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="saas-label">Select Product Model</label>
                                <select className="saas-input pl-4" value={productId} onChange={e => setProductId(e.target.value)}>
                                    <option value="">-- Choose Product --</option>
                                    {allProducts && allProducts?.map(p => <option key={p.id} value={p.id}>{p.brand?.name} {p.model_name}</option>)}
                                </select>
                            </div>
                            
                            {allProducts?.find(p => p.id == productId)?.type === 'bulk' ? (
                                <>
                                    <div>
                                        <label className="saas-label">Quantity to Add</label>
                                        <input type="number" className="saas-input" placeholder="e.g. 50" value={quantityToAdd} onChange={e => setQuantityToAdd(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="saas-label">New Cost Price (UGX) <span className="text-slate-400 font-normal">(Optional)</span></label>
                                            <input type="number" className="saas-input" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="saas-label">New Selling Price (UGX) <span className="text-slate-400 font-normal">(Optional)</span></label>
                                            <input type="number" className="saas-input" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="saas-label">Scan IMEI / Barcode</label>
                                        <input type="text" className="saas-input" placeholder="Scan barcode or enter IMEI" value={imei} onChange={e => setImei(e.target.value)} />
                                    </div>

                                    <div>
                                        <label className="saas-label">Condition</label>
                                        <select className="saas-input pl-4" value={condition} onChange={e => setCondition(e.target.value)}>
                                            <option>Brand New</option>
                                            <option>Refurbished</option>
                                            <option>Used Grade A</option>
                                            <option>Used Grade B</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="saas-label">Storage</label>
                                            <input type="text" className="saas-input" placeholder="e.g. 256GB" value={storageCapacity} onChange={e => setStorageCapacity(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="saas-label">Color</label>
                                            <input type="text" className="saas-input" placeholder="e.g. Titanium" value={stockColor} onChange={e => setStockColor(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="saas-label">Initial Buy Cost (UGX)</label>
                                            <input type="number" className="saas-input" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="saas-label">Selling Price (UGX)</label>
                                            <input type="number" className="saas-input" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="saas-label">Funded By (Capital Source)</label>
                                        <select className="saas-input pl-4" value={partnerInvestorId} onChange={e => setPartnerInvestorId(e.target.value)}>
                                            <option value="">Shop Own Capital (Default)</option>
                                            {partners.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.profit_share_percentage}% profit pool)</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                                <Wrench size={14} className="text-amber-600 dark:text-amber-400" />
                                                Initial Repair / Refurbishment <span className="font-normal text-amber-700 dark:text-amber-400/80">(Optional)</span>
                                            </span>
                                            {Number(refurbCost || 0) > 0 && (
                                                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                                                    Total Cost: {(Number(costPrice || 0) + Number(refurbCost || 0)).toLocaleString()} UGX
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">Repair Cost (UGX)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="saas-input"
                                                    placeholder="0"
                                                    value={refurbCost}
                                                    onChange={e => setRefurbCost(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">Repair Notes</label>
                                                <input
                                                    type="text"
                                                    className="saas-input"
                                                    placeholder="e.g. New screen / battery"
                                                    value={refurbNotes}
                                                    onChange={e => setRefurbNotes(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {Number(refurbCost || 0) > 0 && (
                                            <div>
                                                <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">Pay Repair From Wallet</label>
                                                <select
                                                    className="saas-input pl-4"
                                                    value={refurbAccountId}
                                                    onChange={e => setRefurbAccountId(e.target.value)}
                                                >
                                                    <option value="">Do not deduct from wallet (external / already paid)</option>
                                                    {paymentAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()} UGX)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3 shrink-0">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddSubmit} isLoading={loading}>Save Stock</Button>
                    </div>
                </div>
            </Modal>

            {/* View Stock Modal */}
            {showViewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-6xl animate-slide-up flex flex-col max-h-[90vh] overflow-hidden" noPadding>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                                    {(viewProduct?.brand?.name || viewProduct?.model_name || 'P').substring(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                        Stock for {viewProduct?.brand?.name} {viewProduct?.model_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {viewProduct?.type === 'bulk'
                                            ? `Bulk Accessory • SKU: ${viewProduct?.sku || 'N/A'}`
                                            : `${viewProduct?.category?.name || 'Serialized Device'} • ${imeisList.length} total unit${imeisList.length === 1 ? '' : 's'} logged`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {viewProduct?.type !== 'bulk' && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon={Plus}
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setProductId(String(viewProduct.id));
                                            setShowAddModal(true);
                                        }}
                                        className="whitespace-nowrap"
                                    >
                                        Add Unit
                                    </Button>
                                )}
                                <button
                                    type="button"
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => setShowViewModal(false)}
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        
                        {viewProduct?.type === 'bulk' ? (
                            <div className="p-6">
                                <div className={`grid gap-4 mb-4 ${viewProduct.storage_capacity ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                                    {viewProduct.storage_capacity && (
                                        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Storage Capacity</p>
                                            <p className="font-extrabold text-slate-900 dark:text-white text-base">{viewProduct.storage_capacity}</p>
                                        </div>
                                    )}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">SKU / Barcode</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{viewProduct.sku || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Quantity</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{viewProduct.quantity || 0}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Cost Price</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{Number(viewProduct.cost_price || 0).toLocaleString()} UGX</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Selling Price</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{Number(viewProduct.selling_price || 0).toLocaleString()} UGX</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-wrap justify-end gap-3">
                                    {Number(viewProduct.quantity || 0) > 0 && (
                                        <button
                                            type="button"
                                            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                                            onClick={() => openBulkReturnModal(viewProduct)}
                                        >
                                            <Undo2 size={16} /> Return to Supplier
                                        </button>
                                    )}
                                    <button 
                                        className="btn btn-secondary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                        onClick={() => {
                                            const qty = prompt("How many labels would you like to print?", "1");
                                            if (qty && !isNaN(qty) && parseInt(qty) > 0) {
                                                const brandName = viewProduct.brand ? viewProduct.brand.name + ' ' : '';
                                                setPreviewLabelData({
                                                    type: 'bulk',
                                                    id: viewProduct.id,
                                                    qty: parseInt(qty),
                                                    labelData: {
                                                        barcode: viewProduct.sku || ('PROD-' + String(viewProduct.id).padStart(6, '0')),
                                                        title: brandName + viewProduct.model_name,
                                                        subtitle: viewProduct.storage_capacity ? `${viewProduct.storage_capacity} Storage` : 'Accessory',
                                                        condition: 'Brand New',
                                                        price: viewProduct.selling_price
                                                    }
                                                });
                                                setShowLabelPreview(true);
                                            }
                                        }}
                                    >
                                        <Printer size={16} /> Print Labels
                                    </button>
                                </div>
                            </div>
                        ) : (() => {
                            const inStockItems = imeisList.filter(i => i.status === 'In Stock');
                            const soldCount = imeisList.filter(i => i.status === 'Sold').length;
                            const aging30Count = inStockItems.filter(i => Number(i.days_in_stock || 0) >= 30).length;
                            const activeStockCost = inStockItems.reduce((sum, i) => sum + Number(i.cost_price || 0), 0);
                            const activePotentialMargin = inStockItems.reduce((sum, i) => sum + Math.max(0, Number(i.selling_price || 0) - Number(i.cost_price || 0)), 0);

                            const filteredImeis = imeisList.filter(item => {
                                if (imeiStatusFilter === 'aging_30') {
                                    if (!(item.status === 'In Stock' && Number(item.days_in_stock || 0) >= 30)) return false;
                                } else if (imeiStatusFilter === 'aging_60') {
                                    if (!(item.status === 'In Stock' && Number(item.days_in_stock || 0) >= 60)) return false;
                                } else if (imeiStatusFilter !== 'all' && item.status !== imeiStatusFilter) {
                                    return false;
                                }
                                if (imeiSearch.trim()) {
                                    const q = imeiSearch.toLowerCase();
                                    return (item.imei || '').toLowerCase().includes(q)
                                        || (item.color || '').toLowerCase().includes(q)
                                        || (item.storage_capacity || '').toLowerCase().includes(q)
                                        || (item.condition || '').toLowerCase().includes(q)
                                        || (item.partner_investor?.name || '').toLowerCase().includes(q);
                                }
                                return true;
                            });

                            const paginatedImeis = filteredImeis.slice(
                                (imeiPage - 1) * imeiPerPage,
                                imeiPage * imeiPerPage
                            );

                            return (
                                <div className="flex flex-col flex-auto min-h-0 bg-slate-50/40 dark:bg-slate-950/30">
                                    {/* Mini KPI Strip + Filter Bar */}
                                    <div className="px-6 py-4 space-y-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">In Stock</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{inStockItems.length} <span className="text-xs font-medium text-slate-400">units</span></div>
                                            </div>
                                            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sold</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{soldCount} <span className="text-xs font-medium text-slate-400">units</span></div>
                                            </div>
                                            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Stock Cost</div>
                                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">UGX {activeStockCost.toLocaleString()}</div>
                                            </div>
                                            <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Est. Margin (In Stock)</div>
                                                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">+UGX {activePotentialMargin.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Segmented Status Tabs + Search + Full Status Dropdown */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                            <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70 w-fit">
                                                {[
                                                    { key: 'all', label: `All (${imeisList.length})` },
                                                    { key: 'In Stock', label: `In Stock (${inStockItems.length})` },
                                                    { key: 'Sold', label: `Sold (${soldCount})` },
                                                    ...(aging30Count > 0 ? [{ key: 'aging_30', label: `Aging 30d+ (${aging30Count})` }] : []),
                                                ].map(tab => (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => setImeiStatusFilter(tab.key)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                                            imeiStatusFilter === tab.key
                                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-lg">
                                                <div className="relative flex-1">
                                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search IMEI, storage, color, partner..."
                                                        value={imeiSearch}
                                                        onChange={(e) => setImeiSearch(e.target.value)}
                                                        className="saas-input !pl-9 !py-2 !text-xs w-full"
                                                    />
                                                    {imeiSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setImeiSearch('')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <select
                                                    value={imeiStatusFilter}
                                                    onChange={(e) => setImeiStatusFilter(e.target.value)}
                                                    className="saas-input !py-2 !text-xs sm:w-44"
                                                >
                                                    <option value="all">All Statuses ({imeisList.length})</option>
                                                    <option value="In Stock">In Stock ({inStockItems.length})</option>
                                                    <option value="aging_30">Aging 30d+ ({aging30Count})</option>
                                                    <option value="aging_60">Critical 60d+ ({inStockItems.filter(i => Number(i.days_in_stock || 0) >= 60).length})</option>
                                                    <option value="Sold">Sold ({soldCount})</option>
                                                    <option value="Defective">Defective ({imeisList.filter(i => i.status === 'Defective').length})</option>
                                                    <option value="At Supplier (Repair)">At Supplier (Repair) ({imeisList.filter(i => i.status === 'At Supplier (Repair)').length})</option>
                                                    <option value="Returned to Supplier">Returned to Supplier ({imeisList.filter(i => i.status === 'Returned to Supplier').length})</option>
                                                    <option value="Reserved">Reserved ({imeisList.filter(i => i.status === 'Reserved').length})</option>
                                                    <option value="Cancelled">Cancelled ({imeisList.filter(i => i.status === 'Cancelled').length})</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Consolidated 5-Column Zero-Scroll Table */}
                                    <div className="overflow-y-auto p-4 sm:p-5 flex-auto min-h-0 space-y-4">
                                        <DataTable
                                            headers={[
                                                'IMEI & Specs',
                                                'Status & Age',
                                                'Funded By',
                                                { label: 'Pricing & Margin', className: '!text-right' },
                                                { label: 'Actions', className: '!text-center' },
                                            ]}
                                            isEmpty={filteredImeis.length === 0}
                                            emptyState={
                                                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                                    <Smartphone size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                                    <p className="font-semibold text-slate-700 dark:text-slate-300">No matching stock units found.</p>
                                                </div>
                                            }
                                        >
                                            {paginatedImeis.map(item => {
                                                const cost = Number(item.cost_price || 0);
                                                const sell = Number(item.selling_price || 0);
                                                const margin = sell - cost;
                                                const days = Number(item.days_in_stock || 0);
                                                const ageBadgeCls = days >= 60
                                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                                    : days >= 30
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                        {/* IMEI & Specs */}
                                                        <td>
                                                            <div className="font-bold text-slate-900 dark:text-white font-mono text-xs tracking-wide">
                                                                {item.imei}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                {item.storage_capacity && (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                                                        {item.storage_capacity}
                                                                    </span>
                                                                )}
                                                                {item.color && <span>{item.color}</span>}
                                                                {item.condition && (
                                                                    <>
                                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                        <span>{item.condition}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Status & Age */}
                                                        <td>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <Badge variant={
                                                                    item.status === 'In Stock' ? 'success' :
                                                                    item.status === 'Defective' ? 'danger' :
                                                                    item.status === 'At Supplier (Repair)' ? 'warning' :
                                                                    (item.status === 'In Transit' || item.status === 'Returned to Supplier') ? 'info' : 'neutral'
                                                                }>
                                                                    {item.status === 'Defective' ? '🛠️ Defective' : item.status}
                                                                </Badge>
                                                                {item.status === 'In Stock' && (
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${ageBadgeCls}`} title={`In stock for ${days} day(s)`}>
                                                                        <Clock size={10} /> {days}d
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Funded By */}
                                                        <td>
                                                            {item.partner_investor ? (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                    {item.partner_investor.name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Shop</span>
                                                            )}
                                                        </td>

                                                        {/* Pricing & Margin */}
                                                        <td className="text-right">
                                                            <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                                                                UGX {sell.toLocaleString()}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                                                Cost: {cost.toLocaleString()}
                                                                <span className={`ml-1.5 font-bold ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                                    ({margin >= 0 ? '+' : ''}{margin.toLocaleString()})
                                                                </span>
                                                            </div>
                                                            {Number(item.refurbishment_cost || 0) > 0 && (
                                                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5" title={item.refurbishment_notes || ''}>
                                                                    Buy {Number(item.initial_cost_price ?? item.cost_price).toLocaleString()} + 🛠️ {Number(item.refurbishment_cost).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="text-center">
                                                            <div className="flex justify-center gap-1 items-center">
                                                                {(item.status === 'In Stock' || item.status === 'Defective') && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                                                        title="Return to Supplier (RMA / Refund / Swap)"
                                                                        onClick={() => openReturnModal(item)}
                                                                    >
                                                                        <Undo2 size={15} />
                                                                    </button>
                                                                )}
                                                                {item.status === 'At Supplier (Repair)' && (
                                                                    <button
                                                                        type="button"
                                                                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                        title="Receive Repaired Device Back into Stock"
                                                                        disabled={receivingId === item.id}
                                                                        onClick={() => handleReceiveFromSupplier(item)}
                                                                    >
                                                                        <RotateCcw size={13} /> {receivingId === item.id ? '...' : 'Receive Back'}
                                                                    </button>
                                                                )}
                                                                {item.status !== 'Sold' && item.status !== 'Returned to Supplier' && item.status !== 'Cancelled' && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                                                                        title="Add Repair / Refurbishment Cost"
                                                                        onClick={() => openRefurbModal(item)}
                                                                    >
                                                                        <Wrench size={15} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                                                    title="Print Label"
                                                                    onClick={() => {
                                                                        const brandName = viewProduct.brand ? viewProduct.brand.name + ' ' : '';
                                                                        setPreviewLabelData({
                                                                            type: 'imei',
                                                                            id: item.id,
                                                                            qty: 1,
                                                                            labelData: {
                                                                                barcode: item.imei,
                                                                                title: brandName + viewProduct.model_name,
                                                                                subtitle: item.storage_capacity + ' • ' + item.color,
                                                                                condition: item.condition,
                                                                                price: item.selling_price
                                                                            }
                                                                        });
                                                                        setShowLabelPreview(true);
                                                                    }}
                                                                >
                                                                    <Printer size={15} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                                                    title="Edit Unit"
                                                                    onClick={() => handleEditStockItem(item)}
                                                                >
                                                                    <Pencil size={15} />
                                                                </button>
                                                                <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                                                                <button
                                                                    type="button"
                                                                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                                                    title="Delete Unit"
                                                                    onClick={() => handleDeleteStockItem(item.id)}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </DataTable>

                                        {/* Modal Pagination */}
                                        <Pagination
                                            total={filteredImeis.length}
                                            currentPage={imeiPage}
                                            perPage={imeiPerPage}
                                            onPageChange={setImeiPage}
                                            onPerPageChange={setImeiPerPage}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </Card>
                </div>
            )}

            {/* Edit Stock Modal */}
            <Modal show={showEditStockModal && !!editingStock} onClose={() => setShowEditStockModal(false)} maxWidth="lg">
                {editingStock && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Pencil size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Stock Item</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">IMEI: {editingStock.imei}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowEditStockModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="saas-label">IMEI</label>
                                <input type="text" className="saas-input" value={editingStock.imei} onChange={e => setEditingStock({...editingStock, imei: e.target.value})} />
                            </div>
                            <div>
                                <label className="saas-label">Condition</label>
                                <select className="saas-input pl-4" value={editingStock.condition} onChange={e => setEditingStock({...editingStock, condition: e.target.value})}>
                                    <option>Brand New</option>
                                    <option>Refurbished</option>
                                    <option>Used Grade A</option>
                                    <option>Used Grade B</option>
                                </select>
                            </div>
                            <div>
                                <label className="saas-label">Status</label>
                                <select className="saas-input pl-4" value={editingStock.status} onChange={e => setEditingStock({...editingStock, status: e.target.value})}>
                                    <option>In Stock</option>
                                    <option>Sold</option>
                                    <option>Defective</option>
                                    <option>Reserved</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="saas-label">Storage</label>
                                    <input type="text" className="saas-input" value={editingStock.storage_capacity} onChange={e => setEditingStock({...editingStock, storage_capacity: e.target.value})} />
                                </div>
                                <div>
                                    <label className="saas-label">Color</label>
                                    <input type="text" className="saas-input" value={editingStock.color} onChange={e => setEditingStock({...editingStock, color: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="saas-label">Cost Price (UGX)</label>
                                    <input type="number" className="saas-input" value={editingStock.cost_price} onChange={e => setEditingStock({...editingStock, cost_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="saas-label">Selling Price (UGX)</label>
                                    <input type="number" className="saas-input" value={editingStock.selling_price} onChange={e => setEditingStock({...editingStock, selling_price: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="saas-label">Funded By (Capital Source)</label>
                                <select 
                                    className="saas-input pl-4" 
                                    value={editingStock.partner_investor_id || ''} 
                                    onChange={e => setEditingStock({...editingStock, partner_investor_id: e.target.value || null})}
                                >
                                    <option value="">Shop Own Capital</option>
                                    {partners.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.profit_share_percentage}% profit pool)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3 shrink-0">
                            <Button variant="secondary" onClick={() => setShowEditStockModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateStockSubmit} isLoading={loading}>Update Stock</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Label Preview Modal */}
            {showLabelPreview && previewLabelData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Label Preview</h3>
                            <button onClick={() => setShowLabelPreview(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                &times;
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-slate-50 flex items-center justify-center min-h-[300px]">
                            <div style={{ transform: 'scale(1.25)', transformOrigin: 'center center' }}>
                                <LabelCard labelData={previewLabelData.labelData} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3 justify-end items-center">
                            <span className="text-sm text-slate-500 mr-auto">
                                Quantity: {previewLabelData.qty}
                            </span>
                            <Button variant="secondary" onClick={() => setShowLabelPreview(false)}>Cancel</Button>
                            <a 
                                href={`/inventory/labels/print?type=${previewLabelData.type}&id=${previewLabelData.id}&qty=${previewLabelData.qty}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => setShowLabelPreview(false)}
                            >
                                <Printer size={16} /> Print {previewLabelData.qty > 1 ? 'Labels' : 'Label'}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Accessory Return to Supplier Modal */}
            {bulkReturnProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-lg animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                    <Undo2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Return Bulk Stock to Supplier</h3>
                                    <p className="text-xs text-slate-500">
                                        {bulkReturnProduct.brand?.name ? `${bulkReturnProduct.brand.name} ` : ''}{bulkReturnProduct.model_name} • In Stock: {bulkReturnProduct.quantity}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                                onClick={() => setBulkReturnProduct(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="saas-label">Supplier *</label>
                                    <select
                                        className="saas-input pl-4"
                                        value={bulkReturnForm.supplier_id}
                                        onChange={e => setBulkReturnForm({ ...bulkReturnForm, supplier_id: e.target.value })}
                                    >
                                        <option value="">-- Choose Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{Number(s.credit_balance || 0) > 0 ? ` (Credit: UGX ${Number(s.credit_balance).toLocaleString()})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="saas-label">Qty (Max {bulkReturnProduct.quantity}) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={bulkReturnProduct.quantity}
                                        className="saas-input font-bold"
                                        value={bulkReturnForm.quantity}
                                        onChange={e => {
                                            const q = Math.max(1, parseInt(e.target.value || '1', 10));
                                            const unitCost = Number(bulkReturnProduct.cost_price || 0);
                                            setBulkReturnForm({
                                                ...bulkReturnForm,
                                                quantity: e.target.value,
                                                amount: q * unitCost,
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="saas-label">Resolution *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'refund', label: 'Refund to Wallet', icon: Wallet },
                                        { id: 'supplier_credit', label: 'Supplier Credit', icon: CreditCard },
                                        { id: 'replacement', label: '1-for-1 Swap', icon: RefreshCw },
                                    ].map(opt => {
                                        const Icon = opt.icon;
                                        const active = bulkReturnForm.resolution === opt.id;
                                        return (
                                            <button
                                                type="button"
                                                key={opt.id}
                                                onClick={() => setBulkReturnForm({ ...bulkReturnForm, resolution: opt.id })}
                                                className={`text-left p-2.5 rounded-xl border transition-all ${
                                                    active
                                                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <Icon size={14} className={active ? 'text-indigo-600 dark:text-indigo-400 mb-1' : 'text-slate-400 mb-1'} />
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {['refund', 'supplier_credit'].includes(bulkReturnForm.resolution) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="saas-label">
                                            {bulkReturnForm.resolution === 'refund' ? 'Refund Amount (UGX) *' : 'Credit Amount (UGX) *'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="saas-input font-bold"
                                            value={bulkReturnForm.amount}
                                            onChange={e => setBulkReturnForm({ ...bulkReturnForm, amount: e.target.value })}
                                        />
                                    </div>
                                    {bulkReturnForm.resolution === 'refund' && (
                                        <div>
                                            <label className="saas-label">Business Wallet *</label>
                                            <select
                                                className="saas-input pl-3"
                                                value={bulkReturnForm.payment_account_id}
                                                onChange={e => setBulkReturnForm({ ...bulkReturnForm, payment_account_id: e.target.value })}
                                            >
                                                <option value="">-- Choose Wallet --</option>
                                                {paymentAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {bulkReturnForm.resolution === 'replacement' && (
                                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-300">
                                    Supplier replaces the defective units 1-for-1. Your stock quantity remains unchanged and the RMA is logged in the supplier's return history.
                                </div>
                            )}

                            <div>
                                <label className="saas-label">Reason / Fault Description *</label>
                                <input
                                    type="text"
                                    className="saas-input"
                                    placeholder="e.g. Defective charging batch / damaged packaging"
                                    value={bulkReturnForm.reason}
                                    onChange={e => setBulkReturnForm({ ...bulkReturnForm, reason: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="saas-label">Notes (Optional)</label>
                                <input
                                    type="text"
                                    className="saas-input"
                                    placeholder="e.g. Returned with receipt #..."
                                    value={bulkReturnForm.notes}
                                    onChange={e => setBulkReturnForm({ ...bulkReturnForm, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="secondary" onClick={() => setBulkReturnProduct(null)}>Cancel</Button>
                            <Button variant="primary" className="!bg-rose-600 hover:!bg-rose-700" onClick={handleBulkReturnSubmit} isLoading={loading}>
                                Confirm Bulk Return
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Return Device to Supplier Modal */}
            {returnDevice && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-xl animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                    <Undo2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Return Device to Supplier</h3>
                                    <p className="text-xs text-slate-500 font-mono">
                                        {viewProduct?.brand?.name} {viewProduct?.model_name} • IMEI: {returnDevice.imei}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                                onClick={() => setReturnDevice(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs mb-4">
                            <div>
                                <span className="text-slate-500">Specs:</span>{' '}
                                <strong className="text-slate-800 dark:text-white">{returnDevice.storage_capacity} • {returnDevice.color} • {returnDevice.condition}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500">Cost Basis:</span>{' '}
                                <strong className="text-indigo-700 dark:text-indigo-400">UGX {Number(returnDevice.cost_price || 0).toLocaleString()}</strong>
                            </div>
                            {returnDevice.partner_investor && (
                                <div className="w-full text-[11px] text-purple-700 dark:text-purple-300 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                                    Partner-Funded ({returnDevice.partner_investor.name}): Returning restores capital to partner pool; Replacement Swap carries partner funding to the new IMEI.
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <label className="saas-label !mb-0">Supplier *</label>
                                    {returnDevice.original_supplier_name ? (
                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                            Supplied by {returnDevice.original_supplier_name}
                                            {returnDevice.original_purchase_id ? ` (PO #${returnDevice.original_purchase_id})` : ''}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                            Select supplier manually (no linked PO)
                                        </span>
                                    )}
                                </div>
                                <select
                                    className="saas-input pl-4"
                                    value={returnForm.supplier_id}
                                    onChange={e => setReturnForm({ ...returnForm, supplier_id: e.target.value })}
                                >
                                    <option value="">-- Choose Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}{Number(s.credit_balance || 0) > 0 ? ` (Credit: UGX ${Number(s.credit_balance).toLocaleString()})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="saas-label">Resolution Type *</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {[
                                        { id: 'refund', label: 'Refund to Wallet', desc: 'Supplier refunds money to business wallet', icon: Wallet },
                                        { id: 'supplier_credit', label: 'Supplier Credit', desc: 'Keep value as credit for next purchase', icon: CreditCard },
                                        { id: 'replacement', label: 'Swap / Exchange', desc: 'Same or different phone + top-up / balance', icon: RefreshCw },
                                        { id: 'supplier_repair', label: 'Send for Repair', desc: 'Temporarily at supplier (receive back later)', icon: Wrench },
                                    ].map(opt => {
                                        const Icon = opt.icon;
                                        const active = returnForm.resolution === opt.id;
                                        return (
                                            <button
                                                type="button"
                                                key={opt.id}
                                                onClick={() => setReturnForm({ ...returnForm, resolution: opt.id })}
                                                className={`text-left p-3 rounded-xl border transition-all ${
                                                    active
                                                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <Icon size={15} className={active ? 'text-indigo-600 dark:text-indigo-400 mb-1' : 'text-slate-400 mb-1'} />
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {['refund', 'supplier_credit'].includes(returnForm.resolution) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="saas-label">
                                            {returnForm.resolution === 'refund' ? 'Refund Amount (UGX) *' : 'Credit Amount (UGX) *'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="saas-input"
                                            value={returnForm.amount}
                                            onChange={e => setReturnForm({ ...returnForm, amount: e.target.value })}
                                        />
                                    </div>
                                    {returnForm.resolution === 'refund' && (
                                        <div>
                                            <label className="saas-label">Credit Into Business Wallet *</label>
                                            <select
                                                className="saas-input pl-4"
                                                value={returnForm.payment_account_id}
                                                onChange={e => setReturnForm({ ...returnForm, payment_account_id: e.target.value })}
                                            >
                                                <option value="">-- Choose Wallet --</option>
                                                {paymentAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()} UGX)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {returnForm.resolution === 'replacement' && (() => {
                                const swapDiff = Number(returnForm.replacement_cost_price || 0) - Number(returnForm.return_credit_value || 0);
                                const selectedSup = suppliers.find(s => String(s.id) === String(returnForm.supplier_id));
                                const supCredit = Number(selectedSup?.credit_balance || 0);
                                const serializedProducts = (allProducts || []).filter(p => p.type !== 'bulk');

                                return (
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <RefreshCw size={14} className="text-indigo-500" />
                                            Incoming Replacement / Trade-In Device
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="saas-label">New Product Model *</label>
                                                <select
                                                    className="saas-input pl-3 text-sm"
                                                    value={returnForm.replacement_product_id}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_product_id: e.target.value })}
                                                >
                                                    {serializedProducts.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.brand?.name ? `${p.brand.name} ` : ''}{p.model_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="saas-label">New Device IMEI *</label>
                                                <input
                                                    type="text"
                                                    className="saas-input font-mono text-sm"
                                                    placeholder="Scan or type new IMEI..."
                                                    value={returnForm.replacement_imei}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_imei: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="saas-label">Storage</label>
                                                <input
                                                    type="text"
                                                    className="saas-input text-sm"
                                                    placeholder="e.g. 256GB"
                                                    value={returnForm.replacement_storage}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_storage: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="saas-label">Color</label>
                                                <input
                                                    type="text"
                                                    className="saas-input text-sm"
                                                    placeholder="e.g. Black"
                                                    value={returnForm.replacement_color}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_color: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="saas-label">Condition</label>
                                                <select
                                                    className="saas-input pl-3 text-sm"
                                                    value={returnForm.replacement_condition}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_condition: e.target.value })}
                                                >
                                                    <option>Brand New</option>
                                                    <option>Refurbished</option>
                                                    <option>Used Grade A</option>
                                                    <option>Used Grade B</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="saas-label">Returned Value (UGX)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="saas-input text-sm"
                                                    value={returnForm.return_credit_value}
                                                    onChange={e => setReturnForm({ ...returnForm, return_credit_value: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="saas-label">New Cost Price (UGX)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="saas-input text-sm font-bold"
                                                    value={returnForm.replacement_cost_price}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_cost_price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="saas-label">New Selling Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="saas-input text-sm"
                                                    value={returnForm.replacement_selling_price}
                                                    onChange={e => setReturnForm({ ...returnForm, replacement_selling_price: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {swapDiff === 0 ? (
                                            <div className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                                Even Swap — UGX 0 difference (no cash or credit movement).
                                            </div>
                                        ) : swapDiff > 0 ? (
                                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                                                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                                                    <span>Top-Up Payable to Supplier:</span>
                                                    <span className="text-sm font-black">UGX {swapDiff.toLocaleString()}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnForm({ ...returnForm, difference_settlement: 'wallet' })}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                            returnForm.difference_settlement === 'wallet'
                                                                ? 'border-amber-500 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500'
                                                                : 'border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        Pay From Wallet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnForm({ ...returnForm, difference_settlement: 'supplier_credit' })}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                            returnForm.difference_settlement === 'supplier_credit'
                                                                ? 'border-teal-500 bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
                                                                : 'border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        Use Credit ({supCredit.toLocaleString()})
                                                    </button>
                                                </div>
                                                {returnForm.difference_settlement === 'wallet' && (
                                                    <select
                                                        className="saas-input pl-3 text-sm"
                                                        value={returnForm.payment_account_id}
                                                        onChange={e => setReturnForm({ ...returnForm, payment_account_id: e.target.value })}
                                                    >
                                                        <option value="">-- Choose Business Wallet --</option>
                                                        {paymentAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()} UGX)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                                                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                                    <span>Balance Owed Back by Supplier:</span>
                                                    <span className="text-sm font-black">UGX {Math.abs(swapDiff).toLocaleString()}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnForm({ ...returnForm, difference_settlement: 'wallet' })}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                            returnForm.difference_settlement === 'wallet'
                                                                ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                                                                : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        Refund to Wallet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnForm({ ...returnForm, difference_settlement: 'supplier_credit' })}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                            returnForm.difference_settlement === 'supplier_credit'
                                                                ? 'border-teal-500 bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
                                                                : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        Leave as Supplier Credit
                                                    </button>
                                                </div>
                                                {returnForm.difference_settlement === 'wallet' && (
                                                    <select
                                                        className="saas-input pl-3 text-sm"
                                                        value={returnForm.payment_account_id}
                                                        onChange={e => setReturnForm({ ...returnForm, payment_account_id: e.target.value })}
                                                    >
                                                        <option value="">-- Choose Business Wallet --</option>
                                                        {paymentAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()} UGX)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {returnForm.resolution === 'supplier_repair' && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                                    Device will be marked <strong>At Supplier (Repair)</strong> so it cannot be sold while away. When the supplier returns it, click <strong>Receive Back</strong> on the IMEI row to restore it to <strong>In Stock</strong>.
                                </div>
                            )}

                            <div>
                                <label className="saas-label">Reason / Fault Description *</label>
                                <input
                                    type="text"
                                    className="saas-input"
                                    placeholder="e.g. Defective motherboard / dead Face ID out of box"
                                    value={returnForm.reason}
                                    onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="saas-label">Notes / RMA Reference (Optional)</label>
                                <input
                                    type="text"
                                    className="saas-input"
                                    placeholder="e.g. Handed to supplier rep John"
                                    value={returnForm.notes}
                                    onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="secondary" onClick={() => setReturnDevice(null)}>Cancel</Button>
                            <Button variant="primary" className="!bg-rose-600 hover:!bg-rose-700" onClick={handleReturnSubmit} isLoading={loading}>
                                Confirm Supplier Return
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Refurbishment / Repair Cost Modal */}
            <Modal show={!!refurbDevice} onClose={() => setRefurbDevice(null)} maxWidth="lg">
                {refurbDevice && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                    <Wrench size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Repair / Refurbishment Cost</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                        {viewProduct?.brand?.name} {viewProduct?.model_name} • IMEI: {refurbDevice.imei}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => setRefurbDevice(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-4">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Initial Buy</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                                    {Number(refurbDevice.initial_cost_price ?? refurbDevice.cost_price).toLocaleString()} UGX
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Prior Repairs</div>
                                <div className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                                    +{Number(refurbDevice.refurbishment_cost || 0).toLocaleString()} UGX
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Current Basis</div>
                                <div className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">
                                    {Number(refurbDevice.cost_price).toLocaleString()} UGX
                                </div>
                            </div>
                        </div>

                        {Number(refurbForm.amount || 0) > 0 && (
                            <div className="mb-4 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                <span>New Capitalized Cost Basis:</span>
                                <span className="text-sm font-black">
                                    UGX {(Number(refurbDevice.cost_price || 0) + Number(refurbForm.amount || 0)).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {refurbDevice.refurbishment_notes && (
                            <div className="mb-4">
                                <label className="saas-label">Previous Repair Log</label>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                    {refurbDevice.refurbishment_notes}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="saas-label">Repair / Parts Cost Added (UGX) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="saas-input"
                                    placeholder="e.g. 85000"
                                    value={refurbForm.amount}
                                    onChange={e => setRefurbForm({ ...refurbForm, amount: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="saas-label">Paid From Shop Wallet (Optional Treasury Outflow)</label>
                                <select
                                    className="saas-input pl-4"
                                    value={refurbForm.payment_account_id}
                                    onChange={e => setRefurbForm({ ...refurbForm, payment_account_id: e.target.value })}
                                >
                                    <option value="">Do not deduct from wallet (already paid / external)</option>
                                    {paymentAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} — Bal: UGX {Number(acc.current_balance).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Capitalized under <strong>Inventory Refurbishment</strong> (moves value from cash to stock cost basis without altering Net Worth).
                                </p>
                            </div>

                            <div>
                                <label className="saas-label">Repair Description / Parts Used *</label>
                                <input
                                    type="text"
                                    className="saas-input"
                                    placeholder="e.g. Replaced OLED Screen + Face ID flex"
                                    value={refurbForm.description}
                                    onChange={e => setRefurbForm({ ...refurbForm, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="saas-label">Selling Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="saas-input"
                                        value={refurbForm.new_selling_price}
                                        onChange={e => setRefurbForm({ ...refurbForm, new_selling_price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="saas-label">Condition</label>
                                    <select
                                        className="saas-input pl-3"
                                        value={refurbForm.new_condition}
                                        onChange={e => setRefurbForm({ ...refurbForm, new_condition: e.target.value })}
                                    >
                                        <option>Brand New</option>
                                        <option>Refurbished</option>
                                        <option>Used Grade A</option>
                                        <option>Used Grade B</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="saas-label">Status</label>
                                    <select
                                        className="saas-input pl-3"
                                        value={refurbForm.new_status}
                                        onChange={e => setRefurbForm({ ...refurbForm, new_status: e.target.value })}
                                    >
                                        <option value="In Stock">In Stock</option>
                                        <option value="Defective">Defective</option>
                                        <option value="In Transit">In Transit</option>
                                        <option value="Reserved">Reserved</option>
                                        <option value="With Dealer">With Dealer</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-end gap-3 shrink-0">
                            <Button variant="secondary" onClick={() => setRefurbDevice(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleRefurbSubmit} isLoading={loading}>
                                Capitalize Repair Cost
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            <Modal show={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} maxWidth="md">
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex justify-center items-center shrink-0">
                            <Trash2 size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{deleteConfirm.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{deleteConfirm.message}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/70 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}>
                            Cancel
                        </Button>
                        <Button variant="danger" className="!bg-rose-600 hover:!bg-rose-700 !text-white !border-rose-600" onClick={deleteConfirm.onConfirm}>
                            Yes, Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
