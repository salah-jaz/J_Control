import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2, X } from 'lucide-react';
import { getCustomers, saveCustomer, deleteCustomer } from '../services/db';
import clsx from 'clsx';

const CustomerModal = ({ isOpen, onClose, customer, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'Active'
    });

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        } else {
            setFormData({ name: '', email: '', phone: '', status: 'Active' });
        }
    }, [customer, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, id: customer ? customer.id : null });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{customer ? 'Edit Customer' : 'Add New Customer'}</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage customer details.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div>
                        <label className="label">Company Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div>
                        <label className="label">Email Address</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input"
                            placeholder="contact@company.com"
                        />
                    </div>
                    <div>
                        <label className="label">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="input"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                    <div>
                        <label className="label">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="input"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                        >
                            Save Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    useEffect(() => {
        const fetchCustomers = async () => {
            const data = await getCustomers();
            setCustomers(data);
        };
        fetchCustomers();
    }, []);

    const handleSave = async (customer) => {
        await saveCustomer(customer);
        const data = await getCustomers();
        setCustomers(data);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            await deleteCustomer(id);
            const data = await getCustomers();
            setCustomers(data);
        }
    };

    const openModal = (customer = null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Customers</h1>
                    <p className="text-slate-500 mt-1 text-base md:text-lg">Manage your client base and contacts.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 w-full sm:w-auto justify-center"
                >
                    <Plus className="h-5 w-5" />
                    New Customer
                </button>
            </div>

            <div className="card p-0 overflow-hidden min-h-[500px]">
                <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                    <h3 className="font-bold text-slate-800">Customer List</h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left min-w-[700px]">
                        <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Company Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-900 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg shadow-sm border border-brand-100">
                                                {customer.name.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{customer.name}</p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Building2 size={10} />
                                                    Corporate
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                {customer.email}
                                            </div>
                                            {customer.phone && (
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    {customer.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                                            customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                                        )}>
                                            <span className={clsx(
                                                "w-1.5 h-1.5 rounded-full mr-1.5",
                                                customer.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'
                                            )}></span>
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal(customer)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(customer.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">
                                        No customers found. Try adding one!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customer={editingCustomer}
                onSave={handleSave}
            />
        </div>
    );
};

export default Customers;
