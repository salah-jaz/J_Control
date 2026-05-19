import SlideOver from '../components/ui/SlideOver';
import PageHeader from '../components/ui/PageHeader';
import { TableSectionHeader, TablePagination } from '../components/ui/DataTableSection';
import { ToolbarSearch, ActionIconButton, EmptyState } from '../components/ui/DataTableSection';

const CustomerForm = ({ isOpen, onClose, customer, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'Active'
    });

    useEffect(() => {
        if (customer) setFormData(customer);
        else setFormData({ name: '', email: '', phone: '', status: 'Active' });
    }, [customer, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, id: customer ? customer.id : null });
        onClose();
    };

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={customer ? 'Edit Customer' : 'New Customer'}
            footer={(
                <div className="flex justify-end gap-2 w-full">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded hover:bg-indigo-700">
                        Save Customer
                    </button>
                </div>
            )}
        >
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[12px] font-bold text-slate-700">Company Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500"
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[12px] font-bold text-slate-700">Email Address</label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500"
                        placeholder="contact@company.com"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[12px] font-bold text-slate-700">Phone Number</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[12px] font-bold text-slate-700">Status</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500"
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>
        </SlideOver>
    );
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    useEffect(() => {
        const fetchCustomers = async () => {
            const data = await getCustomers();
            setCustomers(Array.isArray(data) ? data : []);
        };
        fetchCustomers();
    }, []);

    const handleSave = async (customer) => {
        await saveCustomer(customer);
        const data = await getCustomers();
        setCustomers(Array.isArray(data) ? data : []);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            await deleteCustomer(id);
            const data = await getCustomers();
            setCustomers(Array.isArray(data) ? data : []);
        }
    };

    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 space-y-6">
            <PageHeader
                title="Customers"
                subtitle="Manage your client base and contacts"
                primaryAction={(
                    <button
                        onClick={() => { setEditingCustomer(null); setIsFormOpen(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        <span>New Customer</span>
                    </button>
                )}
            />

            <div className="bg-white px-4 py-3 rounded-md border border-slate-200 flex items-center gap-3">
                <ToolbarSearch
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
            </div>

            <div className="card p-0 overflow-hidden">
                <TableSectionHeader
                    title="Customer Database"
                    summary={`${filteredCustomers.length} entries`}
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Contact</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                                                {(customer.name || 'C').substring(0, 1).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-900">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-medium text-slate-600">{customer.email}</span>
                                            <span className="text-[11px] text-slate-400 font-mono">{customer.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1.5",
                                            customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                        )}>
                                            <span className={clsx(
                                                "w-1 h-1 rounded-full",
                                                customer.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                                            )}></span>
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ActionIconButton onClick={() => { setEditingCustomer(customer); setIsFormOpen(true); }} title="Edit" icon={Edit2} tone="edit" />
                                            <ActionIconButton onClick={() => handleDelete(customer.id)} title="Delete" icon={Trash2} tone="delete" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12">
                                        <EmptyState
                                            icon={Building2}
                                            title="No customers found"
                                            description="Start by adding your first customer."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CustomerForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                customer={editingCustomer}
                onSave={handleSave}
            />
        </div>
    );
};

export default Customers;
