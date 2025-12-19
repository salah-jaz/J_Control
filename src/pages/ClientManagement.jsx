import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, MapPin, Eye } from 'lucide-react';
import { getClients, saveClient, deleteClient } from '../services/db';
import ClientForm from '../components/ClientForm';

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search client companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                    />
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200 font-medium whitespace-nowrap"
                >
                    <Plus className="h-5 w-5" />
                    Add Client
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Company Name</th>
                                <th className="px-6 py-4 font-semibold">Contact Person</th>
                                <th className="px-6 py-4 font-semibold">Location</th>
                                <th className="px-6 py-4 font-semibold">Tax Info</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : filteredClients.length > 0 ? filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-gray-900 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                {client.company_logo ? (
                                                    <img src={client.company_logo} alt={client.company_name} className="h-10 w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <Building2 className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{client.company_name}</div>
                                                {client.website_url && (
                                                    <a href={client.website_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">
                                                        {client.website_url.replace(/^https?:\/\//, '')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-medium text-gray-900">{client.contact_person_name || 'N/A'}</div>
                                            {(client.email_address || client.mobile_number) && (
                                                <div className="flex flex-col text-xs text-gray-500">
                                                    {client.email_address && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email_address}</div>}
                                                    {client.mobile_number && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.mobile_number}</div>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {client.city || client.state ? (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span>{client.city}{client.city && client.state ? ', ' : ''}{client.state}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No address</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="text-xs">
                                            {client.gst_number && <div><span className="font-medium">GST:</span> {client.gst_number}</div>}
                                            {client.pan_number && <div><span className="font-medium">PAN:</span> {client.pan_number}</div>}
                                            {!client.gst_number && !client.pan_number && <span className="text-gray-400 italic">No tax info</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleView(client)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="View">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleEdit(client)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(client.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No client companies found. Get started by adding one!
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
