import { useState } from "react";
import { X, Package, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { createProduct } from "../services/productService";

export default function QuickProductForm({ isOpen, onClose, onSuccess, initialName = "" }) {
    const [form, setForm] = useState({
        name: initialName,
        price: "",
        type: "Service",
        description: "",
        status: "Active",
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) {
            toast.error("Name and Price are required");
            return;
        }

        setLoading(true);
        try {
            const newProduct = await createProduct(form);
            toast.success("Added successfully");
            onSuccess(newProduct);
            onClose();
            setForm({
                name: "",
                price: "",
                type: "Service",
                description: "",
                status: "Active",
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to add Item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800">New Service / Product</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Name</label>
                        <input
                            className="input w-full"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Web Design"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Price (₹)</label>
                            <input
                                type="number"
                                className="input w-full"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="label">Type</label>
                            <select
                                className="input w-full"
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            >
                                <option>Service</option>
                                <option>Product</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Description (Optional)</label>
                        <textarea
                            className="input w-full h-24 resize-none"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Short description..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1 flex justify-center items-center gap-2"
                        >
                            {loading ? "Saving..." : "Save & Add"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
