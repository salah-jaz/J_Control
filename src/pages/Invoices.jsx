import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Download, Trash2, Edit2, Upload, FileText, Landmark, User, Layers, Eye, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getInvoices, getClients, saveInvoice, deleteInvoice, getSettings } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';

import InvoiceView from '../components/InvoiceView';


const InvoiceForm = ({ isOpen, onClose, onSave, invoice }) => {
    const [clients, setClients] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [activeTab, setActiveTab] = useState('basic'); // basic, services, bank

    // Form State
    const [formData, setFormData] = useState({
        clientId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        gst: 0,
        discount: 0,
        bankAccountId: '',
        gpayNumber: '',
    });

    const [items, setItems] = useState([
        { sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }
    ]);
    const [qrCodeFile, setQrCodeFile] = useState(null);
    const [qrCodePreview, setQrCodePreview] = useState(null);

    // Load Initial Data
    useEffect(() => {
        const loadData = async () => {
            const [clientsData, banksData] = await Promise.all([
                getClients(),
                getBankAccounts()
            ]);
            setClients(clientsData);
            setBankAccounts(banksData);
        };
        loadData();
    }, []);

    // Load Invoice Data on Edit
    useEffect(() => {
        if (invoice && isOpen) {
            setFormData({
                clientId: invoice.client_id || invoice.clientId || '',
                date: typeof invoice.date === 'string' ? invoice.date.split('T')[0] : invoice.date,
                status: invoice.status || 'Pending',
                gst: parseFloat(invoice.gst || 0),
                discount: parseFloat(invoice.discount || 0),
                bankAccountId: invoice.bank_account_id || '',
                gpayNumber: invoice.gpay_number || '',
            });

            if (invoice.items && invoice.items.length > 0) {
                setItems(invoice.items.map((item, index) => ({
                    sNo: index + 1,
                    serviceName: item.service_name,
                    paymentStatus: item.payment_status || 'Pending',
                    amount: item.amount
                })));
            } else {
                // Fallback if no items (migration)
                if (invoice.amount && !invoice.items) {
                    setItems([{ sNo: 1, serviceName: 'Service', paymentStatus: 'Pending', amount: invoice.amount }]);
                } else {
                    setItems([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
                }
            }

            if (invoice.qr_code) {
                // Determine if full URL or relative path
                const API_BASE_URL = 'http://localhost:8000';
                const url = invoice.qr_code.startsWith('http')
                    ? invoice.qr_code
                    : `${API_BASE_URL}/storage/${invoice.qr_code}`;
                setQrCodePreview(url);
            } else {
                setQrCodePreview(null);
            }
            setQrCodeFile(null);
        } else if (!invoice && isOpen) {
            // Reset Form (New)
            setFormData({
                clientId: '',
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                gst: 0,
                discount: 0,
                bankAccountId: '',
                gpayNumber: '',
            });
            setItems([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
            setQrCodeFile(null);
            setQrCodePreview(null);
        }
        setActiveTab('basic');
    }, [invoice, isOpen]);

    // Calculations
    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const calculateGrandTotal = () => {
        const subtotal = calculateSubtotal();
        const gstAmount = subtotal * ((parseFloat(formData.gst) || 0) / 100);
        const discountAmount = parseFloat(formData.discount) || 0;
        return Math.max(0, subtotal + gstAmount - discountAmount);
    };

    // Item Handlers
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { sNo: items.length + 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sNo: i + 1 }));
            setItems(newItems);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setQrCodeFile(file);
            setQrCodePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.clientId) {
            toast.error("Please select a client");
            return;
        }
        if (items.some(i => !i.serviceName || !i.amount)) {
            toast.error("All service details (name and amount) are required");
            return;
        }

        const client = clients.find(c => c.id == formData.clientId);

        const data = new FormData();
        if (invoice?.id) data.append('id', invoice.id);
        data.append('client_id', formData.clientId);
        data.append('client_name', client ? client.company_name : '');
        data.append('date', formData.date);
        data.append('status', formData.status);
        data.append('gst', formData.gst);
        data.append('discount', formData.discount);

        data.append('bank_account_id', formData.bankAccountId);
        data.append('gpay_number', formData.gpayNumber);

        // Append Items
        items.forEach((item, index) => {
            data.append(`items[${index}][service_name]`, item.serviceName);
            data.append(`items[${index}][payment_status]`, item.paymentStatus);
            data.append(`items[${index}][amount]`, item.amount);
        });

        if (qrCodeFile) {
            data.append('qr_code', qrCodeFile);
        }

        try {
            await onSave(data);
            onClose();
        } catch (error) {
            console.error("Failed to save invoice", error);
            toast.error("Failed to save invoice.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h3>
                        <p className="text-sm text-slate-500 mt-1">Fill in the details below</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'basic' ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <User className="w-4 h-4" /> Basic Info
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'services' ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Layers className="w-4 h-4" /> Service Details
                    </button>
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'bank' ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Landmark className="w-4 h-4" /> Bank Details
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div>
                                <label className="label">Invoice ID</label>
                                <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-slate-500 font-medium">
                                    {invoice ? `INV-${invoice.id}` : 'Auto Generated'}
                                </div>
                            </div>
                            <div>
                                <label className="label">Client</label>
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="input"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Service Details Tab */}
                    {activeTab === 'services' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 w-16 text-center">S.No</th>
                                            <th className="px-4 py-3">Service</th>
                                            <th className="px-4 py-3">Payment Status</th>
                                            <th className="px-4 py-3">Amount (₹)</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-center text-gray-500">{item.sNo}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.serviceName}
                                                        onChange={(e) => handleItemChange(index, 'serviceName', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                        placeholder="Service Name"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={item.paymentStatus}
                                                        onChange={(e) => handleItemChange(index, 'paymentStatus', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Paid">Paid</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="text-red-500 hover:text-red-700 transition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition ml-1"
                            >
                                <Plus className="w-4 h-4" /> Add Service Detail
                            </button>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100 mt-4">
                                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Totals</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">GST %</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.gst}
                                            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                                            className="input"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Discount (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.discount}
                                            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                            className="input"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bank Details Tab */}
                    {activeTab === 'bank' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="label">Bank Account</label>
                                <select
                                    value={formData.bankAccountId}
                                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select Bank Account</option>
                                    {bankAccounts.map(b => (
                                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.accountName})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">GPay Number</label>
                                <input
                                    type="text"
                                    value={formData.gpayNumber}
                                    onChange={(e) => setFormData({ ...formData, gpayNumber: e.target.value })}
                                    className="input"
                                    placeholder="Enter GPay Number"
                                />
                            </div>
                            <div>
                                <label className="label">QR Upload (Optional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Upload className="w-8 h-8 mb-2" />
                                        <p className="text-sm font-medium">Click to upload QR Code</p>
                                        <p className="text-xs">PNG, JPG up to 5MB</p>
                                    </div>
                                    {qrCodePreview && (
                                        <div className="mt-4">
                                            <p className="text-xs text-green-600 font-medium mb-2">Preview:</p>
                                            <img src={qrCodePreview} alt="QR Preview" className="mx-auto h-32 object-contain border border-gray-200 rounded-lg p-1 bg-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Amount</p>
                        <p className="text-3xl font-bold text-brand-600">₹ {calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            type="button"
                            className="btn-primary shadow-lg shadow-brand-500/30"
                        >
                            {invoice ? 'Save Changes' : 'Create Invoice'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const fetchInvoices = async () => {
            const data = await getInvoices();
            setInvoices(data);
        };
        fetchInvoices();
    }, []);

    const handleSave = async (invoiceData) => {
        // invoiceData is FormData
        await saveInvoice(invoiceData);
        // Refresh list
        const data = await getInvoices();
        setInvoices(data);
    };

    const handleDelete = async (id) => {
        if (confirm("Confirm delete invoice?")) {
            try {
                await deleteInvoice(id);
                toast.success("Invoice deleted successfully");
                const data = await getInvoices();
                setInvoices(data);
            } catch (error) {
                toast.error("Failed to delete invoice");
            }
        }
    };

    const handleEdit = (invoice) => {
        setEditingInvoice(invoice);
        setIsFormOpen(true);
    };

    const handleView = (invoice) => {
        setViewingInvoice(invoice);
        setIsViewOpen(true);
    };

    const filteredInvoices = invoices.filter(inv =>
        filterStatus === 'All' ? true : inv.status === filterStatus
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
                    <p className="text-slate-500 mt-1 text-lg">Manage your billing and payments.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingInvoice(null);
                        setIsFormOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
                >
                    <Plus className="h-5 w-5" />
                    New Invoice
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                    {['All', 'Paid', 'Pending', 'Overdue'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                filterStatus === status
                                    ? "bg-brand-50 text-brand-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-gray-50"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card p-0 overflow-hidden min-h-[500px]">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800">Invoice History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Invoice ID</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Grand Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-900">#{inv.id}</td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{inv.client_name || inv.clientName}</td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{typeof inv.date === 'string' ? inv.date.split('T')[0] : inv.date}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        ₹{parseFloat(inv.grand_total || inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "badge",
                                            inv.status === 'Paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                inv.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-rose-50 text-rose-700 border-rose-100"
                                        )}>
                                            <span className={clsx(
                                                "w-1.5 h-1.5 rounded-full mr-1.5 inline-block",
                                                inv.status === 'Paid' ? 'bg-emerald-500' :
                                                    inv.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                                            )}></span>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleView(inv)}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                title="View/Print Invoice"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(inv)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Invoice"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic font-medium">
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

            <InvoiceView
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                invoice={viewingInvoice}
            />
        </div>
    );
};

export default Invoices;
