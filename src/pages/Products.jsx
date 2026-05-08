import { useState } from "react";
import { Plus, Eye, Edit2, Trash2, X, Package, ShoppingBag, AlertTriangle, Loader2, Filter, Activity, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "../hooks/useApiQueries";
import clsx from "clsx";
import { TableSkeleton } from "../components/Skeleton";
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";

const emptyForm = {
    name: "",
    price: "",
    type: "Service",
    description: "",
    status: "Active",
    start_date: "",
    end_date: "",
    enable_alert: false,
};

const isAlertActive = (item) => {
    if (!item.enable_alert || !item.end_date) return false;
    const endDate = new Date(item.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Alert if within 7 days (including overdue)
    return diffDays <= 7;
};

const tabs = ["Basic Info", "Details"];

export default function Products() {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [editId, setEditId] = useState(null);
    const [viewItem, setViewItem] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const { data: dataRecords = [], isLoading } = useProducts();
    const data = Array.isArray(dataRecords) ? dataRecords : [];
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();
    const deleteMutation = useDeleteProduct();

    const openAdd = () => {
        setForm(emptyForm);
        setErrors({});
        setEditId(null);
        setActiveTab(0);
        setIsSaving(false);
        setOpenForm(true);
    };

    const openEdit = (item) => {
        setForm(item);
        setEditId(item.id);
        setErrors({});
        setActiveTab(0);
        setIsSaving(false);
        setOpenForm(true);
    };

    const openViewModal = (item) => {
        setViewItem(item);
        setOpenView(true);
    };

    /* DELETE */
    const deleteItem = async (id) => {
        if (!window.confirm("Delete this product/service?")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Item deleted successfully");
        } catch (e) {
            console.error("Failed to delete", e);
            toast.error("Failed to delete");
        }
    };

    const validate = () => {
        const e = {};
        if (!form.name) e.name = "Name is required";
        if (!form.price) e.price = "Price is required";

        if (Object.keys(e).length > 0) {
            setErrors(e);
            const firstError = Object.values(e)[0];
            toast.error(Object.keys(e).length > 1 ? `Please fix validation errors. ${firstError}` : firstError);
            return false;
        }
        return true;
    };

    const saveItem = async () => {
        if (isSaving) return;
        if (!validate()) return;
        setIsSaving(true);
        try {
            if (editId) {
                await updateMutation.mutateAsync({ id: editId, data: form });
                toast.success("Item updated successfully");
            } else {
                await createMutation.mutateAsync(form);
                toast.success("Item added successfully");
            }
            setOpenForm(false);
        } catch (e) {
            console.error("Failed to save", e);
            setIsSaving(false);
            if (e.response && e.response.data && e.response.data.errors) {
                setErrors(e.response.data.errors);
                toast.error("Validation failed. Please check the form.");
            } else {
                toast.error("Failed to save");
            }
        }
    };

    const input = (name, type = "text", placeholder = "") => (
        <input
            type={type}
            placeholder={placeholder}
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            className={`input ${errors[name] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
        />
    );

    const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

    const filteredData = data.filter((item) => {
        const matchesSearch = !searchQuery || Object.values(item).some(
            (val) => val && val.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Background Strip */}
            <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-violet-50/50 to-transparent pointer-events-none" />

            <div className="relative p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header Section */}
                <PageHeader
                    title="Products & Services"
                    subtitle="Manage your products and services catalogue efficiently."
                    primaryAction={(
                        <button
                            onClick={openAdd}
                            className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
                            <Plus size={20} className="relative z-10" />
                            <span className="relative z-10">Add Item</span>
                        </button>
                    )}
                />

            <div className="sticky top-[88px] z-30 space-y-3">
                <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
                    <ToolbarSearch
                        placeholder="Search products by name or description..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />

                    <div className="flex flex-wrap items-center gap-2 pr-1 w-full lg:w-auto">
                        <FilterSelect
                            icon={Activity}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                                <option value="all">All Status</option>
                                <option value="Active">Active Only</option>
                                <option value="Inactive">Inactive Only</option>
                        </FilterSelect>

                        <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={clsx(
                                "h-10 px-3.5 border rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] group/adv shadow-sm text-[13px] font-bold",
                                showAdvancedFilters 
                                    ? "bg-violet-50 border-violet-200 text-violet-700" 
                                    : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-slate-50"
                            )}
                        >
                            <Filter size={16} className={clsx("transition-transform", showAdvancedFilters && "rotate-180")} />
                            Filters
                        </button>

                        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <ClearFiltersButton
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                    setTypeFilter("all");
                                }}
                            />
                        )}
                    </div>
                </div>

                {showAdvancedFilters && (
                    <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                        <FilterSelect
                            icon={Package}
                            value={typeFilter}
                            onChange={setTypeFilter}
                            minWidthClass="min-w-[160px]"
                        >
                                <option value="all">Project Type (Any)</option>
                                <option value="Product">Product</option>
                                <option value="Service">Service</option>
                        </FilterSelect>
                    </div>
                )}
            </div>

            <div className="card p-0 overflow-hidden">
                <TableSectionHeader title="Product Catalog" summary={`Showing ${filteredData.length} item${filteredData.length !== 1 ? 's' : ''}`} />
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <TableSkeleton rows={6} cols={5} />
                    ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-2">
                                        <EmptyState
                                            icon={Package}
                                            title="No items found"
                                            description="Add a product/service or adjust your filters."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                    {item.type === 'Product' ? <Package size={20} /> : <ShoppingBag size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 flex items-center gap-2">
                                                        {item.name}
                                                        {isAlertActive(item) && (
                                                            <div className="relative group/alert">
                                                                <AlertTriangle size={16} className="text-orange-500 animate-pulse" />
                                                                <div className="absolute left-1/2 -top-8 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/alert:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                    Expiring Soon
                                                                </div>
                                                            </div>
                                                        )}
                                                    </p>
                                                    <p className="text-slate-500 text-xs truncate max-w-[200px]">{item.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">₹{parseFloat(item.price).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                                                item.type === 'Product' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                                            )}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={clsx(
                                                    "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                                                    item.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                                                )}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <ActionIconButton onClick={() => openViewModal(item)} title="View" icon={Eye} tone="view" />
                                                <ActionIconButton onClick={() => openEdit(item)} title="Edit" icon={Edit2} tone="edit" />
                                                <ActionIconButton onClick={() => deleteItem(item.id)} title="Delete" icon={Trash2} tone="delete" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>

            {/* VIEW MODAL */}
            {openView && viewItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Item Details</h2>
                            <button onClick={() => setOpenView(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-violet-100 mb-2">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-violet-600 shadow-sm shrink-0">
                                    {viewItem.type === 'Product' ? <Package size={24} /> : <ShoppingBag size={24} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Price</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        ₹ {parseFloat(viewItem.price || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="label">Name</label>
                                <p className="font-medium text-lg">{viewItem.name}</p>
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <p className="text-gray-600">{viewItem.description || "No description"}</p>
                            </div>
                            <div>
                                <label className="label">Type</label>
                                <p>{viewItem.type}</p>
                            </div>
                            <div>
                                <p>{viewItem.status}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Start Date</label>
                                    <p>{viewItem.start_date || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="label">End Date</label>
                                    <p className="flex items-center gap-2">
                                        {viewItem.end_date || "N/A"}
                                        {viewItem.enable_alert && viewItem.end_date && (
                                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 flex items-center gap-1">
                                                <AlertTriangle size={12} /> Alert Enabled
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setOpenView(false)} className="btn-secondary">Close Details</button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL */}
            {openForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-[250ms]">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.98] duration-[250ms] border border-white/40 overflow-hidden">
                        
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-20">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.3)] animate-pulse-subtle">
                                    <Package className="h-5 w-5 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">
                                        {editId ? "Update Item Profile" : "Create New Catalog Entry"}
                                    </h3>
                                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                                        {editId ? `Editing ${form.name || "Item"}` : "Configure service/product offering parameters"}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setOpenForm(false)} 
                                className="h-10 w-10 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-sm border border-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                           <div className="space-y-8">
                                {/* Core Identity Section */}
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
                                        <h4 className="text-[14px] font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
                                            Core Parameters
                                        </h4>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-slate-700 ml-0.5">Service/Product Name <span className="text-rose-500 font-black ml-1">*</span></label>
                                        <div className="relative">
                                            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                className={clsx("input-premium pl-10", errors.name && "border-rose-400 ring-rose-100")}
                                                placeholder="Enter entry name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-slate-700 ml-0.5">Valuation / Price <span className="text-rose-500 font-black ml-1">*</span></label>
                                            <div className="relative">
                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-black text-slate-400">₹</div>
                                                <input
                                                    type="number"
                                                    value={form.price}
                                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                                    className={clsx("input-premium pl-10", errors.price && "border-rose-400 ring-rose-100")}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-slate-700 ml-0.5">Catalog Classification</label>
                                            <select
                                                className="input-premium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%201%201%201.06%201.06L6.53%208.81a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_1rem_center] bg-no-repeat"
                                                value={form.type}
                                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                            >
                                                <option>Service</option>
                                                <option>Product</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-slate-700 ml-0.5">Execution Details / Scope</label>
                                        <div className="relative">
                                            <textarea
                                                className="input-premium h-32 pt-3"
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                placeholder="Describe service parameters or technical scope..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* Lifecycle & Temporal Section */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
                                        <h4 className="text-[14px] font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                                            <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500"></div>
                                            Lifecycle & Temporal
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-slate-700 ml-0.5">Operational Status</label>
                                            <select
                                                className="input-premium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%201%201%201.06%201.06L6.53%208.81a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_1rem_center] bg-no-repeat"
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2.5 h-full mt-7 ml-1">
                                                <label className="relative inline-flex items-center cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={form.enable_alert} 
                                                        onChange={(e) => setForm({ ...form, enable_alert: e.target.checked })} 
                                                        className="sr-only peer" 
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                                                    <span className="ms-3 text-[13px] font-bold text-slate-700 select-none">Maturity Alerts</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pb-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-slate-700 ml-0.5">Deployment/Start Date</label>
                                            <div className="relative">
                                                <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={form.start_date}
                                                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                                    className="input-premium pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-slate-700 ml-0.5 text-rose-600">Maturity/End Date</label>
                                            <div className="relative">
                                                <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                                                <input
                                                    type="date"
                                                    value={form.end_date}
                                                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                                    className="input-premium pl-10 border-rose-100 bg-rose-50/10 focus:ring-rose-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                           </div>
                        </div>

                        {/* Premium Footer */}
                        <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 z-20">
                            <button 
                                type="button" 
                                onClick={() => setOpenForm(false)} 
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all duration-[250ms] shadow-sm active:scale-[0.98]"
                            >
                                Discard Changes
                            </button>
                            <button
                                type="button"
                                onClick={saveItem}
                                disabled={isSaving}
                                className={clsx(
                                    "px-8 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-xl text-[14px] font-medium shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_12px_24px_rgba(124,58,237,0.35)] transition-all duration-[250ms] hover:-translate-y-[2px] active:scale-[0.98] group flex items-center justify-center min-w-[150px]",
                                    isSaving && "opacity-60 grayscale cursor-not-allowed shadow-none hover:translate-y-0 active:scale-100"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Synchronizing...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 stroke-[2.5]" />
                                            Commit Entry
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
