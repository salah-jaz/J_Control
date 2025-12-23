import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, MapPin, Eye } from 'lucide-react';
import { getClients, saveClient, deleteClient } from '../services/db';
import ClientForm from '../components/ClientForm';
import { useLocation } from 'react-router-dom';

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const location = useLocation();

    useEffect(() => {
        if (location.state && location.state.openForm) {
            setEditingClient(null);
            setIsViewMode(false);
            setIsFormOpen(true);

            // Clear state so it doesn't persist on refresh/reload
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const data = await getClients();
            // Ensure data is array
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching clients", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSave = async (clientData) => {
        try {
            await saveClient(clientData);
            await fetchClients();
            setIsFormOpen(false);
            setEditingClient(null);
            toast.success("Client saved successfully");
        } catch (error) {
            console.error("Failed to save client", error);
            toast.error("Failed to save client. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this client company?')) {
            try {
                await deleteClient(id);
                toast.success("Client deleted successfully");
                await fetchClients();
            } catch (error) {
                console.error("Failed to delete client", error);
                toast.error("Failed to delete client");
            }
        }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setIsViewMode(false);
        setIsFormOpen(true);
    };

    const handleView = (client) => {
        setEditingClient(client);
        setIsViewMode(true);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingClient(null);
        setIsViewMode(false);
        setIsFormOpen(true);
    };

    const filteredClients = clients.filter(c =>
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Client Management</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage your client companies and their business details.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search client companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10 h-11"
                    />
                </div>
                <button
                    onClick={handleAddNew}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 h-11"
                >
                    <Plus className="h-5 w-5" />
                    Add Client
                </button>
            </div>

            <div className="card p-0 overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Company Name</th>
                                <th className="px-6 py-4">Contact Person</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Tax Info</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 animate-pulse">
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : filteredClients.length > 0 ? filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 flex items-center justify-center shadow-sm">
                                                {client.company_logo ? (
                                                    <img src={client.company_logo} alt={client.company_name} className="h-10 w-10 rounded-xl object-cover" />
                                                ) : (
                                                    <Building2 className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{client.company_name}</div>
                                                {client.website_url && (
                                                    <a href={client.website_url} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:text-brand-700 font-medium">
                                                        {client.website_url.replace(/^https?:\/\//, '')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-semibold text-slate-700">{client.contact_person_name || 'N/A'}</div>
                                            {(client.email_address || client.mobile_number) && (
                                                <div className="flex flex-col text-xs text-gray-500 gap-0.5">
                                                    {client.email_address && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {client.email_address}</div>}
                                                    {client.mobile_number && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.mobile_number}</div>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {client.city || client.state ? (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{client.city}{client.city && client.state ? ', ' : ''}{client.state}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic text-xs">Not specified</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {client.gst_number && <span className="badge bg-purple-50 text-purple-700 border-purple-100">GST</span>}
                                            {client.pan_number && <span className="badge bg-blue-50 text-blue-700 border-blue-100">PAN</span>}
                                            {!client.gst_number && !client.pan_number && <span className="text-gray-400 text-xs italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleView(client)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" title="View">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Building2 className="h-12 w-12 mb-3 opacity-20" />
                                            <p className="text-lg font-medium text-gray-500">No clients found</p>
                                            <p className="text-sm">Get started by creating a new client.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ClientForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                client={editingClient}
                onSave={handleSave}
                readOnly={isViewMode}
            />
        </div>
    );
};

export default ClientManagement;
