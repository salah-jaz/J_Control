import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Trash2, CheckCircle, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { getInvoices, getCustomers, saveInvoice, deleteInvoice } from '../services/db';
import clsx from 'clsx';

const InvoiceForm = ({ isOpen, onClose, onSave, invoice }) => {
    const [customers, setCustomers] = useState([]);
    const [formData, setFormData] = useState({
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'Pending',
        gst: 0,
        discount: 0
    });

    useEffect(() => {
        if (invoice && isOpen) {
            setFormData({
                customerId: invoice.customer_id || invoice.customerId || '',
                date: invoice.date,
                amount: invoice.amount,
                status: invoice.status,
                gst: invoice.gst || 0,
                discount: invoice.discount || 0
            });
        } else if (!invoice && isOpen) {
            setFormData({
                customerId: '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                status: 'Pending',
                gst: 0,
                discount: 0
            });
        }
    }, [invoice, isOpen]);

    useEffect(() => {
        const fetchCustomers = async () => {
            const data = await getCustomers();
            setCustomers(data);
        };
        fetchCustomers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Use loose equality (==) because API IDs are numbers but form values are strings
        const customer = customers.find(c => c.id == formData.customerId);
        if (!customer) {
            alert("Please select a valid customer");
            return;
        }

        try {
            await onSave({
                id: invoice ? invoice.id : null,
                customer_id: formData.customerId,
                customer_name: customer.name,
                date: formData.date,
                amount: parseFloat(formData.amount),
                status: formData.status,
                gst: parseFloat(formData.gst),
                discount: parseFloat(formData.discount)
            });
            onClose();
        } catch (error) {
            console.error("Failed to save invoice", error);
            alert("Failed to save invoice. Please check the console.");
        }
    };

    const calculateTotal = () => {
        const subtotal = parseFloat(formData.amount) || 0;
        const gstAmount = subtotal * ((parseFloat(formData.gst) || 0) / 100);
        const discountAmount = parseFloat(formData.discount) || 0;
        return Math.max(0, subtotal + gstAmount - discountAmount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-800">{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                            <select
                                required
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                            >
                                <option value="">Select a customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Financial Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.gst}
                                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.discount}
                                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div>
                            <p className="text-sm text-indigo-600 font-medium">Grand Total</p>
                            <p className="text-xs text-indigo-400">Includes GST & Discount</p>
                        </div>
                        <span className="text-2xl font-bold text-indigo-700">₹ {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition"
                        >
                            {invoice ? 'Save Changes' : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const fetchInvoices = async () => {
            const data = await getInvoices();
            setInvoices(data);
        };
        fetchInvoices();
    }, []);

    const handleSave = async (invoice) => {
        await saveInvoice(invoice);
        const data = await getInvoices();
        setInvoices(data);
    };

    const handleDelete = async (id) => {
        if (confirm("Confirm delete invoice?")) {
            await deleteInvoice(id);
            const data = await getInvoices();
            setInvoices(data);
        }
    };

    const handleEdit = (invoice) => {
        setEditingInvoice(invoice);
        setIsFormOpen(true);
    };

    const handleStatusChange = async (invoice, newStatus) => {
        const updatedInvoice = { ...invoice, status: newStatus };
        await saveInvoice(updatedInvoice);
        const data = await getInvoices();
        setInvoices(data);
    };

    const filteredInvoices = invoices.filter(inv =>
        filterStatus === 'All' ? true : inv.status === filterStatus
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {['All', 'Paid', 'Pending', 'Overdue'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                filterStatus === status
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => {
                        setEditingInvoice(null);
                        setIsFormOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200 font-medium whitespace-nowrap"
                >
                    <Plus className="h-5 w-5" />
                    New Invoice
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Invoice ID</th>
                                <th className="px-6 py-4 font-semibold">Client</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Amount</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-900">{inv.id}</td>
                                    <td className="px-6 py-4 text-gray-600">{inv.customer_name || inv.customerName}</td>
                                    <td className="px-6 py-4 text-gray-500">{typeof inv.date === 'string' ? inv.date.split('T')[0] : inv.date}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4">
                                        <div className="relative group/status inline-block">
                                            <select
                                                value={inv.status}
                                                onChange={(e) => handleStatusChange(inv, e.target.value)}
                                                className={clsx(
                                                    "appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-medium border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500",
                                                    inv.status === 'Paid' ? "bg-green-50 text-green-700 border-green-200" :
                                                        inv.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                )}
                                            >
                                                <option value="Paid">Paid</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-70">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(inv)}
                                                className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors"
                                                title="Edit Invoice"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                                title="Delete Invoice"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No invoices found matching your filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                invoice={editingInvoice}
                onSave={handleSave}
            />
        </div>
    );
};

export default Invoices;
