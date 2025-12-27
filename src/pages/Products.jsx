import { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, X, Package, Search, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../services/productService";
import clsx from "clsx";

const emptyForm = {
    name: "",
    price: "",
    type: "Service",
    description: "",
    status: "Active",
};

const tabs = ["Basic Info", "Details"];

export default function Products() {
    const [data, setData] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [openForm, setOpenForm] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [editId, setEditId] = useState(null);
    const [viewItem, setViewItem] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const records = await getProducts();
            setData(records);
        } catch (e) {
            console.error("Failed to load products", e);
        }
    };

    const openAdd = () => {
        setForm(emptyForm);
        setErrors({});
        setEditId(null);
        setActiveTab(0);
        setOpenForm(true);
    };

    const openEdit = (item) => {
        setForm(item);
        setEditId(item.id);
        setErrors({});
        setActiveTab(0);
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
            await deleteProduct(id);
            toast.success("Item deleted successfully");
            loadData();
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
        if (!validate()) return;
        try {
            if (editId) {
                await updateProduct(editId, form);
                toast.success("Item updated successfully");
            } else {
                await createProduct(form);
                toast.success("Item added successfully");
            }
            await loadData();
            setOpenForm(false);
        } catch (e) {
            console.error("Failed to save", e);
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

    const filteredData = data.filter((item) =>
        Object.values(item).some(
            (val) =>
                val &&
                val.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    return (
        <div className="p-6 lg:p-10 w-full mx-auto animate-fade-in space-y-8 overflow-hidden">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products & Services</h1>
                    <p className="text-slate-500 mt-1 text-lg">Manage your products and services catalogue.</p>
                </div>
                <button
                    onClick={openAdd}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
                >
                    <Plus size={20} />
                    Add Item
                </button>
            </div>

            {/* TABLE */}
            <div className="card p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800">Catalogue</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
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
                                    <td colSpan="5" className="p-12 text-center text-slate-400 italic">
                                        No items found
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
                                                    <p className="font-bold text-slate-900">{item.name}</p>
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
                                                <button
                                                    onClick={() => openViewModal(item)}
                                                    title="View"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    title="Edit"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    title="Delete"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                            <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-brand-100 mb-2">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                                    {viewItem.type === 'Product' ? <Package size={24} /> : <ShoppingBag size={24} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">Price</p>
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
                                <label className="label">Status</label>
                                <p>{viewItem.status}</p>
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
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                    {editId ? "Edit Item" : "Add Item"}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Manage product or service details.</p>
                            </div>
                            <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <label className="label">Name <Req /></label>
                                {input("name", "text", "Item Name")}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Price <Req /></label>
                                    {input("price", "number", "0.00")}
                                </div>
                                <div>
                                    <label className="label">Type</label>
                                    <select
                                        className="input"
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    >
                                        <option>Service</option>
                                        <option>Product</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    className="input h-32"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Description..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="label">Status</label>
                                <select
                                    className="input"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                >
                                    <option>Active</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white flex-shrink-0">
                            <button onClick={() => setOpenForm(false)} className="btn-secondary">Cancel</button>
                            <button
                                onClick={saveItem}
                                className="btn-primary"
                            >
                                Save Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
