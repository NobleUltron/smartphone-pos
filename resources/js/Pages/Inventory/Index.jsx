import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Search, Plus, Pencil, Trash2, Smartphone, Printer, Package, Layers, AlertTriangle, DollarSign, Scan, FileSpreadsheet, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/SaaS/Card';
import Badge from '@/Components/SaaS/Badge';
import Button from '@/Components/SaaS/Button';
import PageHeader from '@/Components/SaaS/PageHeader';
import DataTable from '@/Components/SaaS/DataTable';
import LabelCard from '@/Components/SaaS/LabelCard';

export default function Inventory({ auth, products, allProducts = [], categories = [], brands = [], filters = {}, summary }) {
    // Add Category Modal State
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Add Brand Modal State
    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [newBrand, setNewBrand] = useState('');

    // Add Product Modal State
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ id: null, category_id: '', brand_id: '', model_name: '', type: 'serialized', sku: '', quantity: '', cost_price: '', selling_price: '' });

    const [showAddModal, setShowAddModal] = useState(false);
    const [productId, setProductId] = useState('');
    const [imei, setImei] = useState('');
    const [quantityToAdd, setQuantityToAdd] = useState('');
    const [condition, setCondition] = useState('Brand New');
    const [costPrice, setCostPrice] = useState('');
    const [storageCapacity, setStorageCapacity] = useState('');
    const [stockColor, setStockColor] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [loading, setLoading] = useState(false);

    // Edit Stock Modal State
    const [showEditStockModal, setShowEditStockModal] = useState(false);
    const [editingStock, setEditingStock] = useState(null);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category_id || 'all');
    const [selectedBrand, setSelectedBrand] = useState(filters.brand_id || 'all');
    const [selectedProduct, setSelectedProduct] = useState(filters.product_id || 'all');
    const [isInitialRender, setIsInitialRender] = useState(true);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewProduct, setViewProduct] = useState(null);
    const [imeisList, setImeisList] = useState([]);

    // Label Preview State
    const [showLabelPreview, setShowLabelPreview] = useState(false);
    const [previewLabelData, setPreviewLabelData] = useState(null);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

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

            router.get('/inventory', params, { preserveState: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, selectedBrand, selectedProduct]);

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
            setNewProduct({ id: null, category_id: '', brand_id: '', model_name: '', type: 'serialized', sku: '', quantity: '', cost_price: '', selling_price: '' });
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
                selling_price: sellingPrice
            });
            toast.success("Stock added successfully!");
            setShowAddModal(false);
            setImei('');
            setQuantityToAdd('');
            setCostPrice('');
            setStorageCapacity('');
            setStockColor('');
            setSellingPrice('');
            router.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error adding stock");
        }
        setLoading(false);
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
                        <Button variant="glass" className="text-xs" onClick={() => {
                            setIsEditingProduct(false);
                            setNewProduct({ id: null, category_id: '', brand_id: '', model_name: '' });
                            setShowAddProductModal(true);
                        }} icon={Plus}>Product Model</Button>
                        <Button variant="glass" className="text-xs" onClick={() => setShowAddBrandModal(true)} icon={Plus}>Brand</Button>
                        <Button variant="glass" className="text-xs" onClick={() => setShowAddCategoryModal(true)} icon={Plus}>Category</Button>
                    </>
                }
            />

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.0s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Product Lines</p>
                                <h3 className="text-3xl font-black text-slate-900">{summary.total_products || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Layers size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="primary">Database</Badge>
                            <span>SKUs/Models</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Units</p>
                                <h3 className="text-3xl font-black text-slate-900">{summary.total_stock_units || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Package size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="success">In Stock</Badge>
                            <span>Physical Items</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                                <h3 className="text-3xl font-black text-slate-900">{summary.low_stock_count || 0}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <AlertTriangle size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="danger">Critical</Badge>
                            <span>Below 5 Units</span>
                        </div>
                    </Card>

                    <Card className="animate-slide-up relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: '0.3s' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Inventory Value</p>
                                <h3 className="text-3xl font-black text-slate-900">
                                    {new Intl.NumberFormat('en-US').format(summary.inventory_value || 0)}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="success">Capital</Badge>
                            <span>Cost Price</span>
                        </div>
                    </Card>
                </div>
            )}

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
                    <div className="md:w-56">
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

                    {selectedCategory !== 'all' && (
                        <div className="md:w-56 flex items-center gap-2">
                            <select 
                                className="saas-input pl-4 w-full"
                                value={selectedBrand} 
                                onChange={(e) => {
                                    setSelectedBrand(e.target.value);
                                    setSelectedProduct('all');
                                }}
                            >
                                <option value="all">All Brands</option>
                                {allProducts
                                    ?.filter(p => p.category_id == selectedCategory)
                                    .map(p => p.brand)
                                    .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                            </select>
                            {selectedBrand !== 'all' && (
                                <button title="Delete Selected Brand" className="p-2 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleDeleteBrand(selectedBrand)}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {selectedCategory !== 'all' && selectedBrand !== 'all' && (
                        <div className="md:w-56">
                            <select 
                                className="saas-input pl-4"
                                value={selectedProduct} 
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="all">All Models</option>
                                {allProducts
                                    ?.filter(p => p.category_id == selectedCategory && p.brand_id == selectedBrand)
                                    .sort((a, b) => a.model_name.localeCompare(b.model_name))
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.model_name}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {(searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedProduct !== 'all') && (
                        <div>
                            <Button variant="outline" onClick={() => { 
                                setSearchQuery(''); 
                                setSelectedCategory('all'); 
                                setSelectedBrand('all');
                                setSelectedProduct('all');
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
                    headers={['Brand & Model', 'Category', 'In Stock', { label: 'Actions', className: '!text-center' }]}
                    isEmpty={!products.data || products.data.length === 0}
                    emptyState={
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-1">No products found</h3>
                            <p className="text-slate-500 max-w-sm">There are no products matching your search criteria, or your inventory is currently empty.</p>
                        </div>
                    }
                >
                    {products?.data && products.data.map((product) => (
                        <tr key={product.id}>
                            <td>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex justify-center items-center font-bold text-white shadow-sm bg-gradient-to-br from-slate-700 to-slate-900">
                                        {product.brand?.name ? product.brand.name.charAt(0) : 'P'}
                                    </div>
                                    <div className="font-bold text-slate-900">{product.brand?.name} {product.model_name}</div>
                                </div>
                            </td>
                            <td>
                                <Badge variant="neutral">{product.category?.name}</Badge>
                            </td>
                            <td>
                                <div className="flex flex-col gap-1.5 items-start">
                                    {product.type === 'bulk' ? (
                                        <Badge variant="success">Qty: {product.quantity || 0}</Badge>
                                    ) : (
                                        <>
                                            <Badge variant="success">In Stock: {product.stock_count || 0}</Badge>
                                            {(product.sold_count > 0 || product.defective_count > 0) && (
                                                <div className="flex gap-2 text-[11px] font-medium">
                                                    {product.sold_count > 0 && <span className="text-slate-500">Sold: {product.sold_count}</span>}
                                                    {product.sold_count > 0 && product.defective_count > 0 && <span className="text-slate-300">|</span>}
                                                    {product.defective_count > 0 && <span className="text-rose-500">Defective: {product.defective_count}</span>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                            <td className="text-center">
                                <div className="flex justify-center gap-2 items-center">
                                    <Button variant="outline" className="!py-1.5 !px-3 !text-xs text-rose-600 hover:!bg-rose-50 hover:!border-rose-200" onClick={() => { setProductId(product.id); setShowAddModal(true); }} icon={Plus}>
                                        Add Stock
                                    </Button>
                                    <button title="Edit Product Model" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" onClick={() => handleEditProduct(product)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button title="Delete Product Model" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleDeleteProductModel(product.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => handleViewStock(product)}>
                                        View Stock
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {/* Pagination Component */}
            {products.links && products.links.length > 3 && (
                <div className="flex justify-center mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <nav className="inline-flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        {products.links.map((link, k) => (
                            <Link 
                                key={k}
                                href={link.url || '#'}
                                className={`px-4 py-2 text-sm font-medium border-r border-slate-100 last:border-0 ${
                                    link.active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                                } ${link.url === null ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                </div>
            )}

            {/* --- Modals (Applying SaaS Forms) --- */}
            
            {/* Add Category Modal */}
            {showAddCategoryModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-slide-up">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Add New Category</h3>
                        <div className="saas-form-group">
                            <label className="saas-label">Category Name</label>
                            <input type="text" className="saas-input" placeholder="e.g. Smartphones" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setShowAddCategoryModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddCategorySubmit} isLoading={loading}>Save Category</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Brand Modal */}
            {showAddBrandModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-slide-up">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Add New Brand</h3>
                        <div className="saas-form-group">
                            <label className="saas-label">Brand Name</label>
                            <input type="text" className="saas-input" placeholder="e.g. Apple" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setShowAddBrandModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddBrandSubmit} isLoading={loading}>Save Brand</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add/Edit Product Modal */}
            {showAddProductModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-slide-up">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">{isEditingProduct ? 'Edit Product Model' : 'Add New Product Model'}</h3>
                        
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
                                    <label className="saas-label">SKU / Barcode</label>
                                    <input type="text" className="saas-input" placeholder="e.g. CHG-001" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-6">
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
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setShowAddProductModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddProductSubmit} isLoading={loading}>
                                {isEditingProduct ? 'Update Product' : 'Save Product'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Stock Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto py-10">
                    <Card className="w-full max-w-lg animate-slide-up">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Add New Stock</h3>
                        
                        <div className="space-y-4">
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
                                            <label className="saas-label">Cost Price (UGX)</label>
                                            <input type="number" className="saas-input" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="saas-label">Selling Price (UGX)</label>
                                            <input type="number" className="saas-input" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddSubmit} isLoading={loading}>Save Stock</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* View Stock Modal */}
            {showViewModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-5xl animate-slide-up flex flex-col max-h-[90vh]" noPadding>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl shrink-0">
                            <h3 className="text-lg font-bold text-slate-900">
                                Stock for {viewProduct?.brand?.name} {viewProduct?.model_name}
                            </h3>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowViewModal(false)}>
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        
                        {viewProduct?.type === 'bulk' ? (
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">SKU / Barcode</p>
                                        <p className="font-bold text-slate-900">{viewProduct.sku || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Current Quantity</p>
                                        <p className="font-bold text-slate-900">{viewProduct.quantity || 0}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Cost Price</p>
                                        <p className="font-bold text-slate-900">{Number(viewProduct.cost_price || 0).toLocaleString()} UGX</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Selling Price</p>
                                        <p className="font-bold text-slate-900">{Number(viewProduct.selling_price || 0).toLocaleString()} UGX</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button 
                                        className="btn btn-secondary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
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
                                                        subtitle: 'Accessory',
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
                        ) : (
                            <div className="overflow-y-auto p-0 flex-auto min-h-0">
                                <DataTable 
                                    headers={['IMEI', 'Storage', 'Color', 'Condition', 'Status', 'Selling Price', { label: 'Actions', className: '!text-center' }]}
                                    isEmpty={imeisList.length === 0}
                                    emptyState={<div className="p-8 text-center text-slate-500">No stock available for this model.</div>}
                                >
                                    {imeisList?.map(item => (
                                        <tr key={item.id}>
                                            <td className="font-medium text-slate-700">{item.imei}</td>
                                            <td>{item.storage_capacity}</td>
                                            <td>{item.color}</td>
                                            <td>{item.condition}</td>
                                            <td>
                                                <Badge variant={item.status === 'In Stock' ? 'success' : (item.status === 'Defective' ? 'danger' : (item.status === 'In Transit' ? 'info' : 'neutral'))}>
                                                    {item.status === 'Defective' ? '🛠️ Defective' : item.status}
                                                </Badge>
                                            </td>
                                            <td className="font-semibold">{Number(item.selling_price).toLocaleString()} UGX</td>
                                            <td className="text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Print Label" onClick={() => {
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
                                                    }}>
                                                        <Printer size={16} />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit" onClick={() => handleEditStockItem(item)}>
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete" onClick={() => handleDeleteStockItem(item.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </DataTable>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Edit Stock Modal */}
            {showEditStockModal && editingStock && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg animate-slide-up">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Edit Stock Item</h3>
                        
                        <div className="space-y-4">
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
                                    <option>Layaway</option>
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
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                            <Button variant="secondary" onClick={() => setShowEditStockModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateStockSubmit} isLoading={loading}>Update Stock</Button>
                        </div>
                    </Card>
                </div>
            )}

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

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <Card className="w-full max-w-md animate-slide-up !p-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex justify-center items-center shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{deleteConfirm.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{deleteConfirm.message}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-end gap-3 rounded-b-2xl">
                            <Button variant="secondary" onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}>
                                Cancel
                            </Button>
                            <Button variant="danger" className="!bg-rose-600 hover:!bg-rose-700 !text-white !border-rose-600" onClick={deleteConfirm.onConfirm}>
                                Yes, Delete
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
